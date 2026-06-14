-- ═══════════════════════════════════════════════════════════════════
-- SCRIPT DE RATTRAPAGE — migrations 108 a 113 (PRODUCTION)
-- Genere automatiquement le 2026-06-13. Concatenation, dans l'ordre, de :
--   108 item_extras_and_multi_images / 109 variants_reviews_cancel
--   110 is_open_overrides_hours / 111 item_types_offers
--   112 website_builder / 113 audit_security_fixes
-- A executer UNE FOIS dans le SQL Editor Supabase.
-- Enveloppe dans une transaction : TOUT-OU-RIEN (si une erreur survient,
-- rien n'est applique et on peut relancer proprement apres correction).
-- ═══════════════════════════════════════════════════════════════════

BEGIN;


-- ###################################################################
-- ## 20260108000000_item_extras_and_multi_images.sql
-- ###################################################################

-- ─────────────────────────────────────────────────────────────────
-- Migration 20260108 : suppléments liés aux plats + multi-images
-- ─────────────────────────────────────────────────────────────────

-- 1. Colonnes images supplémentaires sur menu_items
ALTER TABLE menu_items
  ADD COLUMN IF NOT EXISTS image_urls text[] NOT NULL DEFAULT '{}';

-- 2. Table de jonction plat ↔ suppléments disponibles
CREATE TABLE IF NOT EXISTS menu_item_extras (
  id             uuid        NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  menu_item_id   uuid        NOT NULL REFERENCES menu_items(id) ON DELETE CASCADE,
  extra_item_id  uuid        NOT NULL REFERENCES menu_items(id) ON DELETE CASCADE,
  sort_order     int         NOT NULL DEFAULT 0,
  created_at     timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT uq_item_extra UNIQUE (menu_item_id, extra_item_id),
  -- un extra ne peut pas être lié à lui-même
  CONSTRAINT no_self_extra CHECK (menu_item_id <> extra_item_id)
);

ALTER TABLE menu_item_extras ENABLE ROW LEVEL SECURITY;

-- Les restaurateurs gèrent les extras de leurs propres plats
CREATE POLICY "restaurateurs manage item extras"
  ON menu_item_extras FOR ALL
  USING (
    EXISTS (
      SELECT 1
      FROM menu_items mi
      JOIN profiles p ON p.restaurant_id = mi.restaurant_id
      WHERE mi.id = menu_item_extras.menu_item_id
        AND p.id = auth.uid()
        AND p.role IN ('restaurateur', 'admin')
    )
  );

-- Lecture publique (clients qui consultent le menu)
CREATE POLICY "public read item extras"
  ON menu_item_extras FOR SELECT
  USING (true);


-- ###################################################################
-- ## 20260109000000_variants_reviews_cancel.sql
-- ###################################################################

-- ═══════════════════════════════════════════════════════════════════
-- Migration 20260109 : variantes de plats + avis clients + raison annulation
-- ═══════════════════════════════════════════════════════════════════

-- ── 1. Raison d'annulation sur les commandes ──────────────────────
ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS cancellation_reason text;

-- ── 2. Variantes de plats (S/M/L, avec prix propre) ───────────────
CREATE TABLE IF NOT EXISTS menu_item_variants (
  id            uuid        NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  menu_item_id  uuid        NOT NULL REFERENCES menu_items(id) ON DELETE CASCADE,
  name          text        NOT NULL CHECK (char_length(trim(name)) BETWEEN 1 AND 60),
  price         numeric(10,2) NOT NULL CHECK (price >= 0),
  is_available  boolean     NOT NULL DEFAULT true,
  sort_order    int         NOT NULL DEFAULT 0,
  created_at    timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS menu_item_variants_item_idx ON menu_item_variants(menu_item_id);

ALTER TABLE menu_item_variants ENABLE ROW LEVEL SECURITY;

CREATE POLICY "restaurateurs manage variants"
  ON menu_item_variants FOR ALL
  USING (
    EXISTS (
      SELECT 1
      FROM menu_items mi
      JOIN profiles p ON p.restaurant_id = mi.restaurant_id
      WHERE mi.id = menu_item_variants.menu_item_id
        AND p.id = auth.uid()
        AND p.role IN ('restaurateur', 'admin')
    )
  );

CREATE POLICY "public read variants"
  ON menu_item_variants FOR SELECT USING (true);

-- ── 3. Avis clients ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS order_reviews (
  id            uuid        NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id      uuid        NOT NULL UNIQUE REFERENCES orders(id) ON DELETE CASCADE,
  restaurant_id uuid        NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  rating        int         NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment       text        CHECK (char_length(comment) <= 500),
  created_at    timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS order_reviews_restaurant_idx ON order_reviews(restaurant_id);

ALTER TABLE order_reviews ENABLE ROW LEVEL SECURITY;

-- Le client soumet l'avis en connaissant l'order_id (UUID = preuve suffisante)
CREATE POLICY "anyone submit review"
  ON order_reviews FOR INSERT
  WITH CHECK (true);

-- Lecture : restaurateur ou admin
CREATE POLICY "restaurateurs read reviews"
  ON order_reviews FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM restaurants r
      WHERE r.id = order_reviews.restaurant_id
        AND (r.owner_id = auth.uid() OR public.is_admin())
    )
    OR true  -- public peut aussi lire (pour affichage futur sur page resto)
  );

-- ── 4. Expose cancellation_reason dans get_public_order ──────────
-- DROP requis : le type de retour (colonnes) change vs migration 106.
-- CREATE OR REPLACE ne peut PAS modifier le type de retour d'une fonction
-- existante (erreur 42P13). On supprime d'abord, puis on recrée.
DROP FUNCTION IF EXISTS public.get_public_order(uuid);
CREATE OR REPLACE FUNCTION public.get_public_order(p_id uuid)
RETURNS TABLE (
  id                     uuid,
  order_number           text,
  restaurant_slug        text,
  restaurant_name        text,
  status                 text,
  customer_name          text,
  customer_phone         text,
  customer_address       text,
  subtotal               numeric,
  delivery_fee           numeric,
  discount_amount        numeric,
  promo_code             text,
  total                  numeric,
  created_at             timestamptz,
  estimated_delivery_time int,
  cancellation_reason    text
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    o.id,
    o.order_number,
    r.slug   AS restaurant_slug,
    r.name   AS restaurant_name,
    o.status::text,
    o.customer_name,
    o.customer_phone,
    o.customer_address,
    o.subtotal,
    o.delivery_fee,
    o.discount_amount,
    o.promo_code,
    o.total,
    o.created_at,
    o.estimated_delivery_time,
    o.cancellation_reason
  FROM orders o
  JOIN restaurants r ON r.id = o.restaurant_id
  WHERE o.id = p_id
  LIMIT 1;
$$;

-- ── 5. RPC place_order — supporte variant_id dans les items ──────
-- Chaque item du tableau p_items peut maintenant contenir :
--   { menu_item_id, quantity, variant_id? }
-- Si variant_id fourni → on utilise le prix de la variante.
-- Le nom dans order_items inclut le nom de la variante.

CREATE OR REPLACE FUNCTION public.place_order(
  p_restaurant_slug text,
  p_customer_name   text,
  p_customer_phone  text,
  p_customer_address text,
  p_notes           text,
  p_items           jsonb,
  p_promo_code      text DEFAULT NULL
)
RETURNS TABLE (order_id uuid, order_number text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_restaurant      restaurants%ROWTYPE;
  v_subtotal        numeric := 0;
  v_total           numeric := 0;
  v_delivery_fee    numeric := 0;
  v_discount        numeric := 0;
  v_applied_code    text    := NULL;
  v_order_id        uuid;
  v_order_number    text;
  v_item            jsonb;
  v_menu_item       menu_items%ROWTYPE;
  v_variant         menu_item_variants%ROWTYPE;
  v_unit_price      numeric;
  v_qty             int;
  v_line_subtotal   numeric;
  v_items_count     int;
  v_promo           promo_codes%ROWTYPE;
  v_variant_id      uuid;
  v_display_name    text;
BEGIN
  -- Validations de base
  IF p_customer_name IS NULL OR char_length(trim(p_customer_name)) < 2 THEN
    RAISE EXCEPTION 'Nom invalide';
  END IF;
  IF p_customer_phone !~ '^0[5-7][0-9]{8}$' THEN
    RAISE EXCEPTION 'Téléphone invalide';
  END IF;
  IF p_customer_address IS NULL OR char_length(trim(p_customer_address)) < 5 THEN
    RAISE EXCEPTION 'Adresse invalide';
  END IF;
  IF jsonb_typeof(p_items) <> 'array' THEN
    RAISE EXCEPTION 'Items invalides';
  END IF;
  SELECT count(*) INTO v_items_count FROM jsonb_array_elements(p_items);
  IF v_items_count = 0 OR v_items_count > 50 THEN
    RAISE EXCEPTION 'Nombre d''articles invalide';
  END IF;

  -- Récupérer le restaurant
  SELECT * INTO v_restaurant
  FROM restaurants
  WHERE slug = p_restaurant_slug
    AND status = 'active'
    AND is_open = true
    AND accept_orders = true
  LIMIT 1;
  IF v_restaurant.id IS NULL THEN
    RAISE EXCEPTION 'Restaurant indisponible';
  END IF;

  -- Vérifier les horaires
  IF NOT public.is_within_hours(v_restaurant.id) THEN
    RAISE EXCEPTION 'Restaurant fermé en ce moment';
  END IF;

  -- Calcul subtotal avec support des variantes
  v_subtotal := 0;
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items) LOOP
    v_qty := (v_item->>'quantity')::int;
    IF v_qty IS NULL OR v_qty < 1 OR v_qty > 100 THEN
      RAISE EXCEPTION 'Quantité invalide';
    END IF;

    SELECT * INTO v_menu_item
    FROM menu_items
    WHERE id = (v_item->>'menu_item_id')::uuid
      AND restaurant_id = v_restaurant.id
      AND is_available = true
    LIMIT 1;
    IF v_menu_item.id IS NULL THEN
      RAISE EXCEPTION 'Plat indisponible';
    END IF;

    -- Gestion de la variante
    v_variant_id := NULL;
    v_display_name := v_menu_item.name;

    IF v_item->>'variant_id' IS NOT NULL AND v_item->>'variant_id' <> 'null' THEN
      v_variant_id := (v_item->>'variant_id')::uuid;
      SELECT * INTO v_variant
      FROM menu_item_variants
      WHERE id = v_variant_id
        AND menu_item_id = v_menu_item.id
        AND is_available = true
      LIMIT 1;
      IF v_variant.id IS NULL THEN
        RAISE EXCEPTION 'Variante indisponible';
      END IF;
      v_unit_price   := v_variant.price;
      v_display_name := v_menu_item.name || ' (' || v_variant.name || ')';
    ELSE
      v_unit_price := COALESCE(v_menu_item.promo_price, v_menu_item.price);
    END IF;

    v_line_subtotal := v_unit_price * v_qty;
    v_subtotal      := v_subtotal + v_line_subtotal;
  END LOOP;

  IF v_subtotal < v_restaurant.min_order THEN
    RAISE EXCEPTION 'Montant minimum non atteint';
  END IF;

  -- Code promo
  IF p_promo_code IS NOT NULL AND char_length(trim(p_promo_code)) > 0 THEN
    SELECT * INTO v_promo
    FROM promo_codes
    WHERE restaurant_id = v_restaurant.id
      AND code = upper(trim(p_promo_code))
    LIMIT 1;
    IF v_promo.id IS NULL OR NOT v_promo.is_active THEN
      RAISE EXCEPTION 'Code promo invalide';
    END IF;
    IF v_promo.expires_at IS NOT NULL AND v_promo.expires_at < now() THEN
      RAISE EXCEPTION 'Code promo expiré';
    END IF;
    IF v_promo.max_uses IS NOT NULL AND v_promo.used_count >= v_promo.max_uses THEN
      RAISE EXCEPTION 'Code promo épuisé';
    END IF;
    IF v_subtotal < v_promo.min_order THEN
      RAISE EXCEPTION 'Commande minimum non atteinte pour ce code';
    END IF;
    IF v_promo.discount_type = 'percent' THEN
      v_discount := round(v_subtotal * v_promo.discount_value / 100, 2);
    ELSE
      v_discount := LEAST(v_promo.discount_value, v_subtotal);
    END IF;
    v_applied_code := upper(trim(p_promo_code));
    UPDATE promo_codes SET used_count = used_count + 1 WHERE id = v_promo.id;
  END IF;

  -- Livraison gratuite
  v_delivery_fee := v_restaurant.delivery_fee;
  IF v_restaurant.free_delivery_above IS NOT NULL AND v_subtotal >= v_restaurant.free_delivery_above THEN
    v_delivery_fee := 0;
  END IF;

  v_total := GREATEST(0, v_subtotal - v_discount) + v_delivery_fee;

  -- Créer la commande
  INSERT INTO orders (
    restaurant_id, customer_name, customer_phone, customer_address,
    notes, subtotal, delivery_fee, discount_amount, promo_code, total,
    estimated_delivery_time, status, payment_method
  )
  VALUES (
    v_restaurant.id, trim(p_customer_name), p_customer_phone, trim(p_customer_address),
    NULLIF(trim(COALESCE(p_notes, '')), ''),
    v_subtotal, v_delivery_fee, v_discount, v_applied_code, v_total,
    v_restaurant.estimated_delivery_time, 'pending', 'cash'
  )
  RETURNING orders.id, orders.order_number
  INTO v_order_id, v_order_number;

  -- Insérer les articles avec noms de variantes
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items) LOOP
    SELECT * INTO v_menu_item
    FROM menu_items
    WHERE id = (v_item->>'menu_item_id')::uuid
    LIMIT 1;

    v_qty          := (v_item->>'quantity')::int;
    v_variant_id   := NULL;
    v_display_name := v_menu_item.name;

    IF v_item->>'variant_id' IS NOT NULL AND v_item->>'variant_id' <> 'null' THEN
      v_variant_id := (v_item->>'variant_id')::uuid;
      SELECT * INTO v_variant
      FROM menu_item_variants WHERE id = v_variant_id LIMIT 1;
      v_unit_price   := v_variant.price;
      v_display_name := v_menu_item.name || ' (' || v_variant.name || ')';
    ELSE
      v_unit_price := COALESCE(v_menu_item.promo_price, v_menu_item.price);
    END IF;

    v_line_subtotal := v_unit_price * v_qty;

    INSERT INTO order_items (order_id, menu_item_id, item_name, item_price, quantity, subtotal)
    VALUES (v_order_id, v_menu_item.id, v_display_name, v_unit_price, v_qty, v_line_subtotal);
  END LOOP;

  RETURN QUERY SELECT v_order_id, v_order_number;
END;
$$;

-- ── 6. RPC publique pour soumettre un avis ────────────────────────
CREATE OR REPLACE FUNCTION public.submit_order_review(
  p_order_id uuid,
  p_rating   int,
  p_comment  text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_order orders%ROWTYPE;
BEGIN
  SELECT * INTO v_order FROM orders WHERE id = p_order_id LIMIT 1;
  IF v_order.id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'Commande introuvable');
  END IF;
  IF v_order.status <> 'delivered' THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'Commande non encore livrée');
  END IF;
  IF EXISTS (SELECT 1 FROM order_reviews WHERE order_id = p_order_id) THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'Avis déjà soumis');
  END IF;
  IF p_rating < 1 OR p_rating > 5 THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'Note invalide');
  END IF;

  INSERT INTO order_reviews (order_id, restaurant_id, rating, comment)
  VALUES (p_order_id, v_order.restaurant_id, p_rating, NULLIF(trim(COALESCE(p_comment, '')), ''));

  RETURN jsonb_build_object('ok', true);
END;
$$;

GRANT EXECUTE ON FUNCTION public.submit_order_review(uuid, int, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_public_order(uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.place_order(text, text, text, text, text, jsonb, text) TO anon, authenticated;


-- ###################################################################
-- ## 20260110000000_is_open_overrides_hours.sql
-- ###################################################################

-- ═══════════════════════════════════════════════════════════════════
-- Migration 20260110 : is_open prime sur les horaires planifiés
-- ═══════════════════════════════════════════════════════════════════
-- Le toggle is_open est un override manuel du restaurateur.
-- Il dit "je suis ouvert maintenant" et prime sur le planning horaire.
-- is_within_hours est conservé pour l'affichage informatif frontend,
-- mais ne bloque plus le placement de commande.

CREATE OR REPLACE FUNCTION public.place_order(
  p_restaurant_slug text,
  p_customer_name   text,
  p_customer_phone  text,
  p_customer_address text,
  p_notes           text,
  p_items           jsonb,
  p_promo_code      text DEFAULT NULL
)
RETURNS TABLE (order_id uuid, order_number text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_restaurant      restaurants%ROWTYPE;
  v_subtotal        numeric := 0;
  v_total           numeric := 0;
  v_delivery_fee    numeric := 0;
  v_discount        numeric := 0;
  v_applied_code    text    := NULL;
  v_order_id        uuid;
  v_order_number    text;
  v_item            jsonb;
  v_menu_item       menu_items%ROWTYPE;
  v_variant         menu_item_variants%ROWTYPE;
  v_unit_price      numeric;
  v_qty             int;
  v_line_subtotal   numeric;
  v_items_count     int;
  v_promo           promo_codes%ROWTYPE;
  v_variant_id      uuid;
  v_display_name    text;
BEGIN
  -- Validations de base
  IF p_customer_name IS NULL OR char_length(trim(p_customer_name)) < 2 THEN
    RAISE EXCEPTION 'Nom invalide';
  END IF;
  IF p_customer_phone !~ '^0[5-7][0-9]{8}$' THEN
    RAISE EXCEPTION 'Téléphone invalide';
  END IF;
  IF p_customer_address IS NULL OR char_length(trim(p_customer_address)) < 5 THEN
    RAISE EXCEPTION 'Adresse invalide';
  END IF;
  IF jsonb_typeof(p_items) <> 'array' THEN
    RAISE EXCEPTION 'Items invalides';
  END IF;
  SELECT count(*) INTO v_items_count FROM jsonb_array_elements(p_items);
  IF v_items_count = 0 OR v_items_count > 50 THEN
    RAISE EXCEPTION 'Nombre d''articles invalide';
  END IF;

  -- Récupérer le restaurant
  -- is_open = true signifie que le restaurateur a MANUELLEMENT ouvert son restaurant.
  -- Ce flag prime sur les horaires planifiés (is_within_hours est informatif).
  SELECT * INTO v_restaurant
  FROM restaurants
  WHERE slug = p_restaurant_slug
    AND status = 'active'
    AND is_open = true
    AND accept_orders = true
  LIMIT 1;
  IF v_restaurant.id IS NULL THEN
    RAISE EXCEPTION 'Restaurant indisponible';
  END IF;

  -- Calcul subtotal avec support des variantes
  v_subtotal := 0;
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items) LOOP
    v_qty := (v_item->>'quantity')::int;
    IF v_qty IS NULL OR v_qty < 1 OR v_qty > 100 THEN
      RAISE EXCEPTION 'Quantité invalide';
    END IF;

    SELECT * INTO v_menu_item
    FROM menu_items
    WHERE id = (v_item->>'menu_item_id')::uuid
      AND restaurant_id = v_restaurant.id
      AND is_available = true
    LIMIT 1;
    IF v_menu_item.id IS NULL THEN
      RAISE EXCEPTION 'Plat indisponible';
    END IF;

    -- Gestion de la variante
    v_variant_id := NULL;
    v_display_name := v_menu_item.name;

    IF v_item->>'variant_id' IS NOT NULL AND v_item->>'variant_id' <> 'null' THEN
      v_variant_id := (v_item->>'variant_id')::uuid;
      SELECT * INTO v_variant
      FROM menu_item_variants
      WHERE id = v_variant_id
        AND menu_item_id = v_menu_item.id
        AND is_available = true
      LIMIT 1;
      IF v_variant.id IS NULL THEN
        RAISE EXCEPTION 'Variante indisponible';
      END IF;
      v_unit_price   := v_variant.price;
      v_display_name := v_menu_item.name || ' (' || v_variant.name || ')';
    ELSE
      v_unit_price := COALESCE(v_menu_item.promo_price, v_menu_item.price);
    END IF;

    v_line_subtotal := v_unit_price * v_qty;
    v_subtotal      := v_subtotal + v_line_subtotal;
  END LOOP;

  IF v_subtotal < v_restaurant.min_order THEN
    RAISE EXCEPTION 'Montant minimum non atteint';
  END IF;

  -- Code promo
  IF p_promo_code IS NOT NULL AND char_length(trim(p_promo_code)) > 0 THEN
    SELECT * INTO v_promo
    FROM promo_codes
    WHERE restaurant_id = v_restaurant.id
      AND code = upper(trim(p_promo_code))
    LIMIT 1;
    IF v_promo.id IS NULL OR NOT v_promo.is_active THEN
      RAISE EXCEPTION 'Code promo invalide';
    END IF;
    IF v_promo.expires_at IS NOT NULL AND v_promo.expires_at < now() THEN
      RAISE EXCEPTION 'Code promo expiré';
    END IF;
    IF v_promo.max_uses IS NOT NULL AND v_promo.used_count >= v_promo.max_uses THEN
      RAISE EXCEPTION 'Code promo épuisé';
    END IF;
    IF v_subtotal < v_promo.min_order THEN
      RAISE EXCEPTION 'Commande minimum non atteinte pour ce code';
    END IF;
    IF v_promo.discount_type = 'percent' THEN
      v_discount := round(v_subtotal * v_promo.discount_value / 100, 2);
    ELSE
      v_discount := LEAST(v_promo.discount_value, v_subtotal);
    END IF;
    v_applied_code := upper(trim(p_promo_code));
    UPDATE promo_codes SET used_count = used_count + 1 WHERE id = v_promo.id;
  END IF;

  -- Livraison gratuite
  v_delivery_fee := v_restaurant.delivery_fee;
  IF v_restaurant.free_delivery_above IS NOT NULL AND v_subtotal >= v_restaurant.free_delivery_above THEN
    v_delivery_fee := 0;
  END IF;

  v_total := GREATEST(0, v_subtotal - v_discount) + v_delivery_fee;

  -- Créer la commande
  INSERT INTO orders (
    restaurant_id, customer_name, customer_phone, customer_address,
    notes, subtotal, delivery_fee, discount_amount, promo_code, total,
    estimated_delivery_time, status, payment_method
  )
  VALUES (
    v_restaurant.id, trim(p_customer_name), p_customer_phone, trim(p_customer_address),
    NULLIF(trim(COALESCE(p_notes, '')), ''),
    v_subtotal, v_delivery_fee, v_discount, v_applied_code, v_total,
    v_restaurant.estimated_delivery_time, 'pending', 'cash'
  )
  RETURNING orders.id, orders.order_number
  INTO v_order_id, v_order_number;

  -- Insérer les articles avec noms de variantes
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items) LOOP
    SELECT * INTO v_menu_item
    FROM menu_items
    WHERE id = (v_item->>'menu_item_id')::uuid
    LIMIT 1;

    v_qty          := (v_item->>'quantity')::int;
    v_variant_id   := NULL;
    v_display_name := v_menu_item.name;

    IF v_item->>'variant_id' IS NOT NULL AND v_item->>'variant_id' <> 'null' THEN
      v_variant_id := (v_item->>'variant_id')::uuid;
      SELECT * INTO v_variant
      FROM menu_item_variants WHERE id = v_variant_id LIMIT 1;
      v_unit_price   := v_variant.price;
      v_display_name := v_menu_item.name || ' (' || v_variant.name || ')';
    ELSE
      v_unit_price := COALESCE(v_menu_item.promo_price, v_menu_item.price);
    END IF;

    v_line_subtotal := v_unit_price * v_qty;

    INSERT INTO order_items (order_id, menu_item_id, item_name, item_price, quantity, subtotal)
    VALUES (v_order_id, v_menu_item.id, v_display_name, v_unit_price, v_qty, v_line_subtotal);
  END LOOP;

  RETURN QUERY SELECT v_order_id, v_order_number;
END;
$$;

GRANT EXECUTE ON FUNCTION public.place_order(text, text, text, text, text, jsonb, text) TO anon, authenticated;


-- ###################################################################
-- ## 20260111000000_item_types_offers.sql
-- ###################################################################

-- ═══════════════════════════════════════════════════════════════════
-- Migration 20260111 : item_type, offres du moment, suppléments gratuits
-- ═══════════════════════════════════════════════════════════════════
--
-- Nouveaux champs menu_items :
--   item_type        text  — 'dish' | 'sauce' | 'supplement' | 'offer'
--   offer_badge      text  — Ex: "1+1 gratuit", "Pack famille"
--   offer_description text — Description détaillée de l'offre
--
-- Nouveau champ menu_item_extras :
--   is_free  boolean — true = la sauce/le supplément est offert pour ce plat

-- ── menu_items ────────────────────────────────────────────────────
ALTER TABLE menu_items
  ADD COLUMN IF NOT EXISTS item_type text NOT NULL DEFAULT 'dish'
    CHECK (item_type IN ('dish', 'sauce', 'supplement', 'offer'));

ALTER TABLE menu_items
  ADD COLUMN IF NOT EXISTS offer_badge text,
  ADD COLUMN IF NOT EXISTS offer_description text;

-- Migrer les données existantes :
-- is_extra = true → item_type = 'sauce' (sauces/suppléments déjà créés)
UPDATE menu_items
   SET item_type = 'sauce'
 WHERE is_extra = true
   AND item_type = 'dish';

-- ── menu_item_extras ──────────────────────────────────────────────
ALTER TABLE menu_item_extras
  ADD COLUMN IF NOT EXISTS is_free boolean NOT NULL DEFAULT false;


-- ###################################################################
-- ## 20260112000000_website_builder.sql
-- ###################################################################

-- ─────────────────────────────────────────────────────────────────
-- Migration 20260112 : Constructeur de site web multi-pages
--   • template_id (1..7) + site_config (jsonb) + bascules de pages
--   • table blog_posts (CMS : articles rédigés par le restaurateur)
-- ─────────────────────────────────────────────────────────────────

-- 1. Colonnes "site web" sur restaurants
ALTER TABLE public.restaurants
  ADD COLUMN IF NOT EXISTS template_id  int     NOT NULL DEFAULT 1
    CHECK (template_id BETWEEN 1 AND 7),
  ADD COLUMN IF NOT EXISTS site_config  jsonb   NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS home_enabled boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS blog_enabled boolean NOT NULL DEFAULT false;

-- 2. Table des articles de blog (CMS)
CREATE TABLE IF NOT EXISTS public.blog_posts (
  id            uuid        NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  restaurant_id uuid        NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  title         text        NOT NULL CHECK (char_length(title) BETWEEN 2 AND 160),
  slug          text        NOT NULL CHECK (char_length(slug) BETWEEN 1 AND 160),
  excerpt       text        CHECK (excerpt IS NULL OR char_length(excerpt) <= 320),
  cover_url     text,
  content       text        NOT NULL DEFAULT '',
  status        text        NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published')),
  published_at  timestamptz,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT uq_blog_slug_per_restaurant UNIQUE (restaurant_id, slug)
);

CREATE INDEX IF NOT EXISTS idx_blog_posts_restaurant ON public.blog_posts(restaurant_id);
CREATE INDEX IF NOT EXISTS idx_blog_posts_published
  ON public.blog_posts(restaurant_id, published_at DESC)
  WHERE status = 'published';

ALTER TABLE public.blog_posts ENABLE ROW LEVEL SECURITY;

-- Les restaurateurs (et admins) gèrent les articles de leur restaurant
DROP POLICY IF EXISTS "restaurateurs manage blog posts" ON public.blog_posts;
CREATE POLICY "restaurateurs manage blog posts"
  ON public.blog_posts FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.restaurant_id = blog_posts.restaurant_id
        AND p.role IN ('restaurateur', 'admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.restaurant_id = blog_posts.restaurant_id
        AND p.role IN ('restaurateur', 'admin')
    )
  );

-- Lecture publique : seulement les articles publiés de restaurants actifs
DROP POLICY IF EXISTS "public read published blog posts" ON public.blog_posts;
CREATE POLICY "public read published blog posts"
  ON public.blog_posts FOR SELECT
  USING (
    status = 'published'
    AND EXISTS (
      SELECT 1 FROM public.restaurants r
      WHERE r.id = blog_posts.restaurant_id
        AND r.status = 'active'
    )
  );

-- Maintient updated_at à jour
CREATE OR REPLACE FUNCTION public.touch_blog_posts_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_blog_posts_updated_at ON public.blog_posts;
CREATE TRIGGER trg_blog_posts_updated_at
  BEFORE UPDATE ON public.blog_posts
  FOR EACH ROW EXECUTE FUNCTION public.touch_blog_posts_updated_at();


-- ###################################################################
-- ## 20260113000000_audit_security_fixes.sql
-- ###################################################################

-- ═══════════════════════════════════════════════════════════════════
-- Migration 20260113 : correctifs d'audit (sécurité + intégrité)
--
--   1. RLS basée sur le PROPRIÉTAIRE pour extras / variantes / blog
--      (les anciennes politiques gataient sur profiles.restaurant_id,
--       qui n'est rempli que pour les LIVREURS — donc les restaurateurs
--       étaient bloqués et les livreurs autorisés. Bug + faille.)
--   2. order_reviews : suppression du « OR true » (lecture publique de
--      tous les commentaires + order_id). Remplacé par un RPC d'agrégat.
--   3. save_opening_hours : remplacement atomique des horaires (évite de
--      tout effacer si l'insert échoue).
-- ═══════════════════════════════════════════════════════════════════

-- ── 1a. menu_item_extras — gestion par le propriétaire du restaurant ──
DROP POLICY IF EXISTS "restaurateurs manage item extras" ON public.menu_item_extras;
CREATE POLICY "restaurateurs manage item extras"
  ON public.menu_item_extras FOR ALL
  USING (
    EXISTS (
      SELECT 1
      FROM public.menu_items mi
      JOIN public.restaurants r ON r.id = mi.restaurant_id
      WHERE mi.id = menu_item_extras.menu_item_id
        AND (r.owner_id = auth.uid() OR public.is_admin())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.menu_items mi
      JOIN public.restaurants r ON r.id = mi.restaurant_id
      WHERE mi.id = menu_item_extras.menu_item_id
        AND (r.owner_id = auth.uid() OR public.is_admin())
    )
  );

-- ── 1b. menu_item_variants — idem ─────────────────────────────────────
DROP POLICY IF EXISTS "restaurateurs manage variants" ON public.menu_item_variants;
CREATE POLICY "restaurateurs manage variants"
  ON public.menu_item_variants FOR ALL
  USING (
    EXISTS (
      SELECT 1
      FROM public.menu_items mi
      JOIN public.restaurants r ON r.id = mi.restaurant_id
      WHERE mi.id = menu_item_variants.menu_item_id
        AND (r.owner_id = auth.uid() OR public.is_admin())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.menu_items mi
      JOIN public.restaurants r ON r.id = mi.restaurant_id
      WHERE mi.id = menu_item_variants.menu_item_id
        AND (r.owner_id = auth.uid() OR public.is_admin())
    )
  );

-- ── 1c. blog_posts — gestion par le propriétaire du restaurant ────────
DROP POLICY IF EXISTS "restaurateurs manage blog posts" ON public.blog_posts;
CREATE POLICY "restaurateurs manage blog posts"
  ON public.blog_posts FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.restaurants r
      WHERE r.id = blog_posts.restaurant_id
        AND (r.owner_id = auth.uid() OR public.is_admin())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.restaurants r
      WHERE r.id = blog_posts.restaurant_id
        AND (r.owner_id = auth.uid() OR public.is_admin())
    )
  );

-- ── 2. order_reviews — lecture restreinte au propriétaire / admin ─────
-- L'affichage public de la note moyenne passe désormais par get_restaurant_rating().
DROP POLICY IF EXISTS "restaurateurs read reviews" ON public.order_reviews;
CREATE POLICY "restaurateurs read reviews"
  ON public.order_reviews FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.restaurants r
      WHERE r.id = order_reviews.restaurant_id
        AND (r.owner_id = auth.uid() OR public.is_admin())
    )
  );

-- Agrégat public : note moyenne + nombre d'avis, sans exposer les lignes.
CREATE OR REPLACE FUNCTION public.get_restaurant_rating(p_restaurant_id uuid)
RETURNS TABLE (avg_rating numeric, review_count int)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    round(avg(rating)::numeric, 1) AS avg_rating,
    count(*)::int                  AS review_count
  FROM order_reviews
  WHERE restaurant_id = p_restaurant_id;
$$;

GRANT EXECUTE ON FUNCTION public.get_restaurant_rating(uuid) TO anon, authenticated;

-- ── 3. save_opening_hours — remplacement atomique avec contrôle d'accès ──
-- p_rows : tableau JSON [{ day_of_week, opens_at 'HH:MM:SS', closes_at 'HH:MM:SS' }]
-- (uniquement les jours ouverts ; les jours fermés sont simplement absents).
CREATE OR REPLACE FUNCTION public.save_opening_hours(
  p_restaurant_id uuid,
  p_rows          jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row jsonb;
BEGIN
  -- Contrôle d'accès : seul le propriétaire (ou un admin) peut modifier.
  IF NOT EXISTS (
    SELECT 1 FROM restaurants r
    WHERE r.id = p_restaurant_id
      AND (r.owner_id = auth.uid() OR public.is_admin())
  ) THEN
    RAISE EXCEPTION 'Accès refusé';
  END IF;

  IF jsonb_typeof(p_rows) <> 'array' THEN
    RAISE EXCEPTION 'Format invalide';
  END IF;

  -- delete + insert dans la même transaction (corps de fonction = atomique).
  DELETE FROM opening_hours WHERE restaurant_id = p_restaurant_id;

  FOR v_row IN SELECT * FROM jsonb_array_elements(p_rows) LOOP
    INSERT INTO opening_hours (restaurant_id, day_of_week, opens_at, closes_at, is_closed)
    VALUES (
      p_restaurant_id,
      (v_row->>'day_of_week')::int,
      (v_row->>'opens_at')::time,
      (v_row->>'closes_at')::time,
      false
    );
  END LOOP;
END;
$$;

GRANT EXECUTE ON FUNCTION public.save_opening_hours(uuid, jsonb) TO authenticated;

-- Fin des changements de schema : on valide TOUT ici.
COMMIT;


-- ═══════════════════════════════════════════════════════════════════
-- Suivi des migrations (bookkeeping) — HORS transaction, volontairement :
-- meme si cet INSERT echoue (schema de _migrations different), le schema
-- ci-dessus est deja valide. Une erreur ici est sans gravite.
-- ═══════════════════════════════════════════════════════════════════
INSERT INTO public._migrations (filename) VALUES
  ('20260108000000_item_extras_and_multi_images.sql'),
  ('20260109000000_variants_reviews_cancel.sql'),
  ('20260110000000_is_open_overrides_hours.sql'),
  ('20260111000000_item_types_offers.sql'),
  ('20260112000000_website_builder.sql'),
  ('20260113000000_audit_security_fixes.sql')
ON CONFLICT DO NOTHING;

