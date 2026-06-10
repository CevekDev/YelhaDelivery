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
