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
