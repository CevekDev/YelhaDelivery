import type { MetadataRoute } from 'next';
import { createClient } from '@/lib/supabase/server';
import { APP_URL } from '@/lib/seo';

export const dynamic = 'force-dynamic';

interface RestoRow {
  slug: string;
  updated_at: string | null;
  home_enabled: boolean;
  blog_enabled: boolean;
}

interface PostRow {
  slug: string;
  updated_at: string | null;
  published_at: string | null;
  restaurant: { slug: string } | { slug: string }[] | null;
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const supabase = await createClient();

  const [{ data: restaurants }, { data: posts }] = await Promise.all([
    supabase
      .from('restaurants')
      .select('slug, updated_at, home_enabled, blog_enabled')
      .eq('status', 'active')
      .returns<RestoRow[]>(),
    supabase
      .from('blog_posts')
      .select('slug, updated_at, published_at, restaurant:restaurants(slug)')
      .eq('status', 'published')
      .returns<PostRow[]>(),
  ]);

  const now = new Date();

  const entries: MetadataRoute.Sitemap = [
    { url: APP_URL, lastModified: now, changeFrequency: 'daily', priority: 1 },
    { url: `${APP_URL}/cgu`, lastModified: now, changeFrequency: 'yearly', priority: 0.1 },
  ];

  for (const r of restaurants ?? []) {
    const base = `${APP_URL}/r/${r.slug}`;
    const last = r.updated_at ? new Date(r.updated_at) : now;
    if (r.home_enabled) {
      entries.push({ url: base, lastModified: last, changeFrequency: 'weekly', priority: 0.8 });
    }
    // Le menu est toujours accessible et le plus important pour le SEO.
    entries.push({ url: `${base}/menu`, lastModified: last, changeFrequency: 'daily', priority: 0.9 });
    entries.push({ url: `${base}/contact`, lastModified: last, changeFrequency: 'monthly', priority: 0.4 });
    if (r.blog_enabled) {
      entries.push({ url: `${base}/blog`, lastModified: last, changeFrequency: 'weekly', priority: 0.5 });
    }
  }

  for (const p of posts ?? []) {
    const restoSlug = Array.isArray(p.restaurant) ? p.restaurant[0]?.slug : p.restaurant?.slug;
    if (!restoSlug) continue;
    entries.push({
      url: `${APP_URL}/r/${restoSlug}/blog/${p.slug}`,
      lastModified: new Date(p.updated_at ?? p.published_at ?? now),
      changeFrequency: 'monthly',
      priority: 0.6,
    });
  }

  return entries;
}
