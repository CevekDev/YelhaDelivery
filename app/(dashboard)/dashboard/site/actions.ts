'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { requireRole } from '@/lib/auth';
import { uploadMenuImage } from '@/lib/storage/upload';
import { siteSettingsSchema, siteContentSchema } from '@/lib/validators/site';
import type { Restaurant, SiteConfig } from '@/types/database';

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

  revalidatePath('/dashboard/site');
  return { ok: true };
}
