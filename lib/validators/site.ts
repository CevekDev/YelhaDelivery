import { z } from 'zod';
import { isValidAccent } from '@/lib/site-theme';

/** Génère un slug à partir d'un titre (accents retirés, espaces → tirets). */
export function slugify(input: string): string {
  return input
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '') // accents
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}

const optionalText = (max: number) => z.string().trim().max(max).optional().or(z.literal(''));
const optionalUrl = z.string().trim().url('URL invalide').max(500).optional().or(z.literal(''));

/** Vrai si l'URL est un lien Google Maps en https (google.com/.cc, goo.gl, maps.app.goo.gl). */
export function isGoogleMapsUrl(v: string): boolean {
  try {
    const u = new URL(v);
    if (u.protocol !== 'https:') return false;
    const h = u.hostname.toLowerCase();
    return (
      h === 'goo.gl' ||
      h.endsWith('.goo.gl') ||
      h === 'google.com' ||
      h.endsWith('.google.com') ||
      /(^|\.)google\.[a-z.]+$/.test(h)
    );
  } catch {
    return false;
  }
}

/** Lien Google Maps optionnel (vide autorisé). */
const optionalMapUrl = z
  .string()
  .trim()
  .max(500)
  .optional()
  .or(z.literal(''))
  .refine((v) => !v || isGoogleMapsUrl(v), 'Entrez un lien Google Maps valide (https://…google…).');

/** Sélection d'un template (1..7) + bascules de pages. */
export const siteSettingsSchema = z.object({
  template_id: z.coerce.number().int().min(1).max(8),
  home_enabled: z.boolean(),
  blog_enabled: z.boolean(),
});
export type SiteSettingsInput = z.infer<typeof siteSettingsSchema>;

/** Contenu éditable de la page d'accueil + contact (site_config). */
export const siteContentSchema = z.object({
  hero_title: optionalText(120),
  hero_subtitle: optionalText(300),
  hero_cta: optionalText(40),
  about_title: optionalText(120),
  about_text: optionalText(2000),
  contact_intro: optionalText(500),
  map_url: optionalMapUrl,
  facebook: optionalUrl,
  instagram: optionalUrl,
  tiktok: optionalUrl,
  whatsapp: optionalUrl,
});
export type SiteContentInput = z.infer<typeof siteContentSchema>;

/** Une section de l'agencement libre de la page d'accueil. */
export const siteSectionSchema = z.object({
  id: z.string().trim().min(1).max(64),
  type: z.enum(['about', 'menu', 'highlights', 'gallery', 'text']),
  enabled: z.boolean(),
  title: z.string().trim().max(120).optional(),
  body: z.string().trim().max(2000).optional(),
  cta: z.boolean().optional(),
});

/** Agencement complet (≤ 24 sections). Nettoyé/normalisé côté action. */
export const siteLayoutSchema = z.array(siteSectionSchema).max(24);
export type SiteSectionInput = z.infer<typeof siteSectionSchema>;

/** Couleur d'accent : vide (= défaut du template) ou une couleur de la palette curatée. */
export const siteAccentSchema = z
  .string()
  .trim()
  .refine((v) => v === '' || isValidAccent(v), 'Couleur non autorisée');

/** Article de blog. */
export const blogPostSchema = z.object({
  title: z.string().trim().min(2, 'Titre trop court').max(160),
  slug: z
    .string()
    .trim()
    .toLowerCase()
    .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, 'Slug invalide')
    .min(1)
    .max(160),
  excerpt: z.string().trim().max(320).optional().or(z.literal('')),
  content: z.string().trim().min(1, 'Le contenu ne peut pas être vide').max(50_000),
  status: z.enum(['draft', 'published']),
});
export type BlogPostInput = z.infer<typeof blogPostSchema>;
