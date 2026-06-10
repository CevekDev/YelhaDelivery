'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { requireRole } from '@/lib/auth';
import { uploadMenuImage } from '@/lib/storage/upload';
import { blogPostSchema, slugify } from '@/lib/validators/site';
import type { Restaurant } from '@/types/database';

export interface BlogResult {
  ok: boolean;
  error?: string;
  fieldErrors?: Record<string, string | undefined>;
}

async function loadOwnedRestaurant() {
  const { profile } = await requireRole('restaurateur');
  const supabase = await createClient();
  const { data: restaurant } = await supabase
    .from('restaurants')
    .select('id, slug')
    .eq('owner_id', profile.id)
    .maybeSingle<Pick<Restaurant, 'id' | 'slug'>>();
  return { profile, supabase, restaurant };
}

function parsePostForm(formData: FormData) {
  const title = String(formData.get('title') ?? '').trim();
  const rawSlug = String(formData.get('slug') ?? '').trim();
  const slug = rawSlug ? slugify(rawSlug) : slugify(title);
  return blogPostSchema.safeParse({
    title,
    slug,
    excerpt: formData.get('excerpt') ?? '',
    content: formData.get('content') ?? '',
    status: formData.get('status') === 'published' ? 'published' : 'draft',
  });
}

function fieldErrors(parsed: z.SafeParseError<unknown>): BlogResult {
  const fe = parsed.error.flatten().fieldErrors;
  return {
    ok: false,
    fieldErrors: Object.fromEntries(
      Object.entries(fe).map(([k, v]) => [k, Array.isArray(v) ? v[0] : undefined]),
    ),
  };
}

export async function createPostAction(formData: FormData): Promise<BlogResult> {
  const { supabase, restaurant } = await loadOwnedRestaurant();
  if (!restaurant) return { ok: false, error: 'Configurez d’abord votre restaurant.' };

  const parsed = parsePostForm(formData);
  if (!parsed.success) return fieldErrors(parsed);

  // Unicité du slug pour ce restaurant
  const { data: existing } = await supabase
    .from('blog_posts')
    .select('id')
    .eq('restaurant_id', restaurant.id)
    .eq('slug', parsed.data.slug)
    .maybeSingle();
  if (existing) return { ok: false, fieldErrors: { slug: 'Ce lien est déjà utilisé' } };

  let coverUrl: string | null = null;
  const coverFile = formData.get('cover_image');
  if (coverFile instanceof File && coverFile.size > 0) {
    const up = await uploadMenuImage(restaurant.id, coverFile);
    if ('error' in up) return { ok: false, error: up.error };
    coverUrl = up.publicUrl;
  }

  const { error } = await supabase.from('blog_posts').insert({
    restaurant_id: restaurant.id,
    title: parsed.data.title,
    slug: parsed.data.slug,
    excerpt: parsed.data.excerpt || null,
    content: parsed.data.content,
    status: parsed.data.status,
    cover_url: coverUrl,
    published_at: parsed.data.status === 'published' ? new Date().toISOString() : null,
  });
  if (error) return { ok: false, error: error.message };

  revalidatePath('/dashboard/site/blog');
  revalidatePath(`/r/${restaurant.slug}/blog`);
  return { ok: true };
}

export async function updatePostAction(postId: string, formData: FormData): Promise<BlogResult> {
  if (!z.string().uuid().safeParse(postId).success) return { ok: false, error: 'Article invalide' };
  const { supabase, restaurant } = await loadOwnedRestaurant();
  if (!restaurant) return { ok: false, error: 'Configurez d’abord votre restaurant.' };

  const parsed = parsePostForm(formData);
  if (!parsed.success) return fieldErrors(parsed);

  const { data: current } = await supabase
    .from('blog_posts')
    .select('id, status, published_at, cover_url')
    .eq('id', postId)
    .eq('restaurant_id', restaurant.id)
    .maybeSingle<{ id: string; status: string; published_at: string | null; cover_url: string | null }>();
  if (!current) return { ok: false, error: 'Article introuvable' };

  // Unicité du slug (hors lui-même)
  const { data: clash } = await supabase
    .from('blog_posts')
    .select('id')
    .eq('restaurant_id', restaurant.id)
    .eq('slug', parsed.data.slug)
    .neq('id', postId)
    .maybeSingle();
  if (clash) return { ok: false, fieldErrors: { slug: 'Ce lien est déjà utilisé' } };

  let coverUrl: string | null = current.cover_url;
  if (formData.get('remove_cover') === 'true') coverUrl = null;
  const coverFile = formData.get('cover_image');
  if (coverFile instanceof File && coverFile.size > 0) {
    const up = await uploadMenuImage(restaurant.id, coverFile);
    if ('error' in up) return { ok: false, error: up.error };
    coverUrl = up.publicUrl;
  }

  // published_at : posé à la première publication, conservé ensuite
  const publishedAt =
    parsed.data.status === 'published'
      ? current.published_at ?? new Date().toISOString()
      : null;

  const { error } = await supabase
    .from('blog_posts')
    .update({
      title: parsed.data.title,
      slug: parsed.data.slug,
      excerpt: parsed.data.excerpt || null,
      content: parsed.data.content,
      status: parsed.data.status,
      cover_url: coverUrl,
      published_at: publishedAt,
    })
    .eq('id', postId)
    .eq('restaurant_id', restaurant.id);
  if (error) return { ok: false, error: error.message };

  revalidatePath('/dashboard/site/blog');
  revalidatePath(`/r/${restaurant.slug}/blog`);
  revalidatePath(`/r/${restaurant.slug}/blog/${parsed.data.slug}`);
  return { ok: true };
}

export async function deletePostAction(postId: string): Promise<BlogResult> {
  if (!z.string().uuid().safeParse(postId).success) return { ok: false, error: 'Article invalide' };
  const { supabase, restaurant } = await loadOwnedRestaurant();
  if (!restaurant) return { ok: false, error: 'Restaurant introuvable' };

  const { error } = await supabase
    .from('blog_posts')
    .delete()
    .eq('id', postId)
    .eq('restaurant_id', restaurant.id);
  if (error) return { ok: false, error: error.message };

  revalidatePath('/dashboard/site/blog');
  revalidatePath(`/r/${restaurant.slug}/blog`);
  return { ok: true };
}
