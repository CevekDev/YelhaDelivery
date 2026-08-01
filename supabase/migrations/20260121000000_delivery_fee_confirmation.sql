-- ═══════════════════════════════════════════════════════════════════
-- Migration 20260121 : frais de livraison fixés par le restaurateur
--                      + annulation par le client
-- ═══════════════════════════════════════════════════════════════════
-- Nouveau flux :
--   1. Le client passe commande SANS frais de livraison (« à confirmer »).
--      → place_order enregistre delivery_fee=0, total = sous-total − remise,
--        delivery_fee_set_at = NULL.
--   2. Quand la commande arrive, le restaurateur saisit le prix de livraison
--      (Server Action côté dashboard → UPDATE via RLS). delivery_fee_set_at
--      passe à now() et le total est recalculé.
--   3. Le client voit sur sa page de suivi le détail + le nouveau total. S'il
--      ne fait rien, la commande suit son cours. S'il annule (RPC ci-dessous),
--      la commande passe en 'cancelled' et le restaurateur est alerté.
-- Idempotent.
-- ═══════════════════════════════════════════════════════════════════

-- 1. Colonnes -------------------------------------------------------------
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS delivery_fee_set_at timestamptz,
  ADD COLUMN IF NOT EXISTS cancelled_by text
    CHECK (cancelled_by IS NULL OR cancelled_by IN ('customer', 'restaurant', 'admin'));

-- Backfill : les commandes déjà existantes ont eu leurs frais de livraison
-- appliqués à la création → on les marque « fixés » pour qu'elles s'affichent
-- normalement (et non « à confirmer »). Seules les NOUVELLES commandes (créées
-- par la version ci-dessous de place_order) démarrent avec set_at = NULL.
UPDATE public.orders
   SET delivery_fee_set_at = created_at
 WHERE delivery_fee_set_at IS NULL;

-- 2. place_order : livraison « à confirmer » ------------------------------
--    (identique à la version précédente, sauf le bloc frais de livraison /
--     total et l'absence d'estimation figée côté livraison.)
CREATE OR REPLACE FUNCTION public.place_order(
  p_restaurant_slug  text,
  p_customer_name    text,
  p_customer_phone   text,
  p_customer_address text,
  p_notes            text,
  p_items            jsonb,
  p_promo_code       text DEFAULT NULL::text
)
RETURNS TABLE(order_id uuid, order_number text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
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
  v_item_note       text;
BEGIN
  -- Validations
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

  -- Calcul subtotal
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

  -- Code promo (inchangé)
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

  -- ► Frais de livraison « à confirmer » : fixés plus tard par le restaurateur.
  --   La commande démarre donc SANS livraison ; total = sous-total − remise.
  v_delivery_fee := 0;
  v_total := GREATEST(0, v_subtotal - v_discount);

  INSERT INTO orders (
    restaurant_id, customer_name, customer_phone, customer_address,
    notes, subtotal, delivery_fee, discount_amount, promo_code, total,
    estimated_delivery_time, status, payment_method, delivery_fee_set_at
  )
  VALUES (
    v_restaurant.id, trim(p_customer_name), p_customer_phone, trim(p_customer_address),
    NULLIF(trim(COALESCE(p_notes, '')), ''),
    v_subtotal, v_delivery_fee, v_discount, v_applied_code, v_total,
    v_restaurant.estimated_delivery_time, 'pending', 'cash', NULL
  )
  RETURNING orders.id, orders.order_number
  INTO v_order_id, v_order_number;

  -- Insérer les articles avec note optionnelle par item
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

    v_item_note := NULLIF(trim(COALESCE(v_item->>'note', '')), '');
    IF v_item_note IS NOT NULL AND char_length(v_item_note) > 500 THEN
      v_item_note := substring(v_item_note from 1 for 500);
    END IF;

    INSERT INTO order_items (order_id, menu_item_id, item_name, item_price, quantity, subtotal, note)
    VALUES (v_order_id, v_menu_item.id, v_display_name, v_unit_price, v_qty, v_line_subtotal, v_item_note);
  END LOOP;

  RETURN QUERY SELECT v_order_id, v_order_number;
END;
$function$;

-- 3. get_public_order : expose delivery_fee_set_at ------------------------
--    Nouvelle colonne dans le TABLE de retour → DROP requis (CREATE OR REPLACE
--    ne peut pas changer le type de retour d'une fonction existante).
DROP FUNCTION IF EXISTS public.get_public_order(uuid);
CREATE OR REPLACE FUNCTION public.get_public_order(p_id uuid)
RETURNS TABLE(
  id uuid, order_number text, restaurant_slug text, restaurant_name text,
  status text, customer_name text, customer_phone text, customer_address text,
  subtotal numeric, delivery_fee numeric, discount_amount numeric, promo_code text,
  total numeric, created_at timestamptz, estimated_delivery_time integer,
  cancellation_reason text, delivery_fee_set_at timestamptz
)
LANGUAGE sql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
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
    o.cancellation_reason,
    o.delivery_fee_set_at
  FROM orders o
  JOIN restaurants r ON r.id = o.restaurant_id
  WHERE o.id = p_id
  LIMIT 1;
$function$;

-- 4. cancel_public_order : annulation par le client -----------------------
--    Le client n'est pas authentifié → SECURITY DEFINER. Toute personne
--    possédant l'UUID de la commande (présent dans son lien de suivi) peut
--    annuler, tant que la commande est encore 'pending' ou 'confirmed'.
--    Retourne owner_id + order_number pour permettre l'alerte push côté app.
CREATE OR REPLACE FUNCTION public.cancel_public_order(
  p_id     uuid,
  p_reason text DEFAULT NULL::text
)
RETURNS TABLE(ok boolean, owner_id uuid, order_number text, restaurant_id uuid)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_order  orders%ROWTYPE;
  v_owner  uuid;
  v_reason text;
BEGIN
  SELECT * INTO v_order FROM orders WHERE id = p_id LIMIT 1;
  IF v_order.id IS NULL THEN
    RETURN QUERY SELECT false, NULL::uuid, NULL::text, NULL::uuid;
    RETURN;
  END IF;

  -- Fenêtre d'annulation client : uniquement avant la préparation.
  IF v_order.status NOT IN ('pending', 'confirmed') THEN
    RETURN QUERY SELECT false, NULL::uuid, NULL::text, NULL::uuid;
    RETURN;
  END IF;

  v_reason := NULLIF(trim(COALESCE(p_reason, '')), '');
  IF v_reason IS NULL THEN
    v_reason := 'Annulée par le client';
  ELSIF char_length(v_reason) > 500 THEN
    v_reason := substring(v_reason from 1 for 500);
  END IF;

  UPDATE orders
     SET status              = 'cancelled',
         cancelled_by        = 'customer',
         cancellation_reason = v_reason,
         updated_at          = now()
   WHERE id = p_id;

  SELECT r.owner_id INTO v_owner FROM restaurants r WHERE r.id = v_order.restaurant_id;

  -- Notification in-app pour le restaurateur (best-effort).
  IF v_owner IS NOT NULL THEN
    INSERT INTO notifications (restaurant_id, user_id, title, body, type)
    VALUES (
      v_order.restaurant_id,
      v_owner,
      'Commande ' || v_order.order_number || ' annulée',
      v_order.customer_name || ' a annulé sa commande.',
      'order_cancelled'
    );
  END IF;

  RETURN QUERY SELECT true, v_owner, v_order.order_number, v_order.restaurant_id;
END;
$function$;

GRANT EXECUTE ON FUNCTION public.cancel_public_order(uuid, text) TO anon, authenticated;
