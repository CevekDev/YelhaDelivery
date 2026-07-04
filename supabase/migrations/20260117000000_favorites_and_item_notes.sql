-- ═══════════════════════════════════════════════════════════════════
-- Migration 20260117 : favoris + note client par item
-- ═══════════════════════════════════════════════════════════════════
-- 1. menu_items.is_favorite : marquer les plats vedettes du restaurant
--    → affichés dans une section "Favoris" en tête du menu.
-- 2. order_items.note : note libre du client au restaurant pour un item
--    (allergies, cuisson, "sans oignon"…).
-- 3. place_order accepte désormais un champ `note` optionnel par item.
-- ═══════════════════════════════════════════════════════════════════

ALTER TABLE public.menu_items
  ADD COLUMN IF NOT EXISTS is_favorite boolean NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_menu_items_favorite
  ON public.menu_items (restaurant_id, sort_order)
  WHERE is_favorite = true AND is_available = true;

ALTER TABLE public.order_items
  ADD COLUMN IF NOT EXISTS note text
    CHECK (note IS NULL OR char_length(note) <= 500);

-- Refonte de place_order pour supporter le champ note par item.
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

  v_delivery_fee := v_restaurant.delivery_fee;
  IF v_restaurant.free_delivery_above IS NOT NULL AND v_subtotal >= v_restaurant.free_delivery_above THEN
    v_delivery_fee := 0;
  END IF;

  v_total := GREATEST(0, v_subtotal - v_discount) + v_delivery_fee;

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

    -- Note libre par item (500 chars max ; contrôlé par CHECK sur la colonne)
    v_item_note := NULLIF(trim(COALESCE(v_item->>'note', '')), '');
    IF v_item_note IS NOT NULL AND char_length(v_item_note) > 500 THEN
      v_item_note := substring(v_item_note from 1 for 500);
    END IF;

    INSERT INTO order_items (order_id, menu_item_id, item_name, item_price, quantity, subtotal, note)
    VALUES (v_order_id, v_menu_item.id, v_display_name, v_unit_price, v_qty, v_line_subtotal, v_item_note);
  END LOOP;

  RETURN QUERY SELECT v_order_id, v_order_number;
END;
$$;

GRANT EXECUTE ON FUNCTION public.place_order(text, text, text, text, text, jsonb, text) TO anon, authenticated;

-- Étend get_public_order_items pour renvoyer la note client par item.
DROP FUNCTION IF EXISTS public.get_public_order_items(uuid);
CREATE OR REPLACE FUNCTION public.get_public_order_items(p_order_id uuid)
RETURNS TABLE (
  id uuid,
  item_name text,
  item_price numeric,
  quantity int,
  subtotal numeric,
  note text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id, item_name, item_price, quantity, subtotal, note
  FROM public.order_items
  WHERE order_id = p_order_id
$$;
GRANT EXECUTE ON FUNCTION public.get_public_order_items(uuid) TO anon, authenticated;
