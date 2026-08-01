-- ═══════════════════════════════════════════════════════════════════
-- Migration 20260122 (bis) : cuisine_type + price_range sur restaurants
--
-- Champs éditables pour enrichir le JSON-LD (servesCuisine / priceRange
-- schema.org), qui étaient codés en dur ('Algérienne' / '$$'). NULL =
-- valeur par défaut dérivée du template choisi (cf. lib/templates
-- templateSeoDefaults + lib/seo restaurantJsonLd).
-- Idempotent.
-- ═══════════════════════════════════════════════════════════════════

ALTER TABLE public.restaurants
  ADD COLUMN IF NOT EXISTS cuisine_type text
    CHECK (cuisine_type IS NULL OR char_length(cuisine_type) <= 60),
  ADD COLUMN IF NOT EXISTS price_range text
    CHECK (price_range IS NULL OR price_range IN ('$', '$$', '$$$', '$$$$'));
