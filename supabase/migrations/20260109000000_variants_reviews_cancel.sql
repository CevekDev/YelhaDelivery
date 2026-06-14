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
