'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { requireRole } from '@/lib/auth';
import { uploadMenuImage, deleteStoredImages } from '@/lib/storage/upload';
import {
  siteSettingsSchema,
  siteContentSchema,
  siteLayoutSchema,
  siteAccentSchema,
} from '@/lib/validators/site';
import { revalidatePublicRestaurant } from '@/lib/public-data';
import type { Restaurant, SiteConfig, SiteSection } from '@/types/database';

export interface SiteResult {
  ok: boolean;
  error?: string;
  fieldErrors?: Record<string, string | undefined>;
}

async function loadOwnedRestaurant() {
  const { profile } = await requireRole('restaurateur');
  const supabase = await createClient();
  const { data: restaurant } = await supabase
    .from('restaurants')
    .select('*')
    .eq('owner_id', profile.id)
    .maybeSingle<Restaurant>();
  return { profile, supabase, restaurant };
}

/** Choix du template + activation des pages (accueil / blog). */
export async function updateSiteSettingsAction(formData: FormData): Promise<SiteResult> {
  const { supabase, restaurant, profile } = await loadOwnedRestaurant();
  if (!restaurant) return { ok: false, error: 'Configurez d’abord votre restaurant.' };

  const parsed = siteSettingsSchema.safeParse({
    template_id: formData.get('template_id'),
    home_enabled: formData.get('home_enabled') === 'true',
    blog_enabled: formData.get('blog_enabled') === 'true',
  });
  if (!parsed.success) return { ok: false, error: 'Paramètres invalides.' };

  const { error } = await supabase
    .from('restaurants')
    .update({
      template_id: parsed.data.template_id,
      home_enabled: parsed.data.home_enabled,
      blog_enabled: parsed.data.blog_enabled,
    })
    .eq('id', restaurant.id)
    .eq('owner_id', profile.id);
  if (error) return { ok: false, error: error.message };

  revalidatePublicRestaurant(restaurant.slug);
  revalidatePath('/dashboard/site');
  return { ok: true };
}

/** Contenu éditable de l'accueil + contact + galerie + image "à propos". */
export async function updateSiteContentAction(formData: FormData): Promise<SiteResult> {
  const { supabase, restaurant, profile } = await loadOwnedRestaurant();
  if (!restaurant) return { ok: false, error: 'Configurez d’abord votre restaurant.' };

  const parsed = siteContentSchema.safeParse({
    hero_title: formData.get('hero_title') ?? '',
    hero_subtitle: formData.get('hero_subtitle') ?? '',
    hero_cta: formData.get('hero_cta') ?? '',
    about_title: formData.get('about_title') ?? '',
    about_text: formData.get('about_text') ?? '',
    contact_intro: formData.get('contact_intro') ?? '',
    map_url: formData.get('map_url') ?? '',
    facebook: formData.get('facebook') ?? '',
    instagram: formData.get('instagram') ?? '',
    tiktok: formData.get('tiktok') ?? '',
    whatsapp: formData.get('whatsapp') ?? '',
  });

  if (!parsed.success) {
    const fe = parsed.error.flatten().fieldErrors;
    return {
      ok: false,
      fieldErrors: Object.fromEntries(
        Object.entries(fe).map(([k, v]) => [k, Array.isArray(v) ? v[0] : undefined]),
      ),
    };
  }

  const prev: SiteConfig = restaurant.site_config ?? {};
  const d = parsed.data;

  // Image "À propos"
  let aboutImageUrl: string | null | undefined = prev.about_image_url;
  if (formData.get('remove_about_image') === 'true') {
    aboutImageUrl = undefined;
  }
  const aboutFile = formData.get('about_image');
  if (aboutFile instanceof File && aboutFile.size > 0) {
    const up = await uploadMenuImage(restaurant.id, aboutFile);
    if ('error' in up) return { ok: false, error: up.error };
    aboutImageUrl = up.publicUrl;
  }

  // Galerie : on conserve l'existante sauf si "clear", puis on ajoute les nouvelles.
  let gallery: string[] = formData.get('clear_gallery') === 'true' ? [] : [...(prev.gallery ?? [])];
  const galleryFiles = formData.getAll('gallery_images').filter((f): f is File => f instanceof File && f.size > 0);
  for (const file of galleryFiles.slice(0, 8)) {
    const up = await uploadMenuImage(restaurant.id, file);
    if ('error' in up) return { ok: false, error: up.error };
    gallery.push(up.publicUrl);
  }
  gallery = gallery.slice(0, 8);

  const social = {
    facebook: d.facebook || undefined,
    instagram: d.instagram || undefined,
    tiktok: d.tiktok || undefined,
    whatsapp: d.whatsapp || undefined,
  };

  const config: SiteConfig = {
    ...prev,
    hero_title: d.hero_title || undefined,
    hero_subtitle: d.hero_subtitle || undefined,
    hero_cta: d.hero_cta || undefined,
    about_title: d.about_title || undefined,
    about_text: d.about_text || undefined,
    about_image_url: aboutImageUrl || undefined,
    contact_intro: d.contact_intro || undefined,
    map_url: d.map_url || undefined,
    social: Object.values(social).some(Boolean) ? social : undefined,
    gallery: gallery.length ? gallery : undefined,
    highlights: prev.highlights,
  };

  const { error } = await supabase
    .from('restaurants')
    .update({ site_config: config })
    .eq('id', restaurant.id)
    .eq('owner_id', profile.id);
  if (error) return { ok: false, error: error.message };

  // Supprime du stockage l'ancienne image « à propos » remplacée/retirée + les
  // photos de galerie qui ne sont plus référencées.
  const removedImages: (string | null | undefined)[] = [];
  if (prev.about_image_url && prev.about_image_url !== aboutImageUrl) {
    removedImages.push(prev.about_image_url);
  }
  for (const old of prev.gallery ?? []) {
    if (!gallery.includes(old)) removedImages.push(old);
  }
  await deleteStoredImages(removedImages);

  revalidatePublicRestaurant(restaurant.slug);
  revalidatePath('/dashboard/site');
  return { ok: true };
}

/**
 * Agencement libre de la page d'accueil : ordre + visibilité des sections et
 * blocs de texte. Normalise défensivement (dédup des sections natives, ids
 * uniques, nettoyage) pour garantir un rendu cohérent quoi qu'il arrive.
 */
export async function updateSiteLayoutAction(formData: FormData): Promise<SiteResult> {
  const { supabase, restaurant, profile } = await loadOwnedRestaurant();
  if (!restaurant) return { ok: false, error: 'Configurez d’abord votre restaurant.' };

  let raw: unknown;
  try {
    raw = JSON.parse(String(formData.get('layout') ?? '[]'));
  } catch {
    return { ok: false, error: 'Agencement illisible.' };
  }

  const parsed = siteLayoutSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, error: 'Agencement invalide.' };

  // Normalisation : sections natives uniques, ids uniques, blocs texte ≤ 8.
  const seenBuiltin = new Set<string>();
  const seenIds = new Set<string>();
  let textCount = 0;
  const layout: SiteSection[] = [];
  for (const s of parsed.data) {
    if (s.type === 'text') {
      if (textCount >= 8) continue;
      textCount++;
      let id = s.id;
      if (seenIds.has(id)) id = crypto.randomUUID();
      seenIds.add(id);
      const title = s.title?.trim() || undefined;
      const body = s.body?.trim() || undefined;
      layout.push({ id, type: 'text', enabled: s.enabled, title, body, cta: s.cta || undefined });
    } else {
      if (seenBuiltin.has(s.type)) continue; // pas de doublon de section native
      seenBuiltin.add(s.type);
      seenIds.add(s.type);
      layout.push({ id: s.type, type: s.type, enabled: s.enabled });
    }
  }

  const prev: SiteConfig = restaurant.site_config ?? {};
  const { error } = await supabase
    .from('restaurants')
    .update({ site_config: { ...prev, layout } })
    .eq('id', restaurant.id)
    .eq('owner_id', profile.id);
  if (error) return { ok: false, error: error.message };

  revalidatePublicRestaurant(restaurant.slug);
  revalidatePath('/dashboard/site');
  return { ok: true };
}

/**
 * Couleur d'accent (marque) du site. La valeur est validée contre la palette
 * curatée (liste blanche) → impossible de poser une couleur qui casse le rendu.
 * Vide = retour à la couleur par défaut du template.
 */
export async function updateSiteAccentAction(formData: FormData): Promise<SiteResult> {
  const { supabase, restaurant, profile } = await loadOwnedRestaurant();
  if (!restaurant) return { ok: false, error: 'Configurez d’abord votre restaurant.' };

  const parsed = siteAccentSchema.safeParse(formData.get('accent') ?? '');
  if (!parsed.success) return { ok: false, error: 'Couleur non autorisée.' };

  const prev: SiteConfig = restaurant.site_config ?? {};
  const { error } = await supabase
    .from('restaurants')
    .update({ site_config: { ...prev, accent: parsed.data || undefined } })
    .eq('id', restaurant.id)
    .eq('owner_id', profile.id);
  if (error) return { ok: false, error: error.message };

  revalidatePublicRestaurant(restaurant.slug);
  revalidatePath('/dashboard/site');
  return { ok: true };
}
