import type { Metadata } from 'next';

/** URL de base canonique de la plateforme (sans slash final). Source unique
 *  de vérité partagée par le layout racine, le sitemap et les metadata. */
export const APP_URL = (
  process.env.NEXT_PUBLIC_APP_URL || 'https://yelha-delivery.vercel.app'
).replace(/\/$/, '');

export interface RestaurantSeo {
  name: string;
  description?: string | null;
  slug: string;
  city?: string | null;
  address?: string | null;
  phone?: string | null;
  coverUrl?: string | null;
}

/** Métadonnées riches (titre, description, Open Graph, Twitter) pour une page resto. */
export function restaurantMetadata(r: RestaurantSeo, page: 'home' | 'menu' = 'home'): Metadata {
  const path = page === 'menu' ? `/r/${r.slug}/menu` : `/r/${r.slug}`;
  const url = `${APP_URL}${path}`;
  const title = page === 'menu' ? `Menu — ${r.name}` : r.name;
  const description =
    r.description ||
    `Commandez en ligne chez ${r.name}${r.city ? ` à ${r.city}` : ''}. Livraison à domicile, paiement à la livraison.`;
  const images = r.coverUrl ? [{ url: r.coverUrl }] : undefined;

  return {
    title,
    description,
    metadataBase: new URL(APP_URL),
    alternates: { canonical: path },
    openGraph: {
      title,
      description,
      url,
      siteName: r.name,
      locale: 'fr_FR',
      type: 'website',
      ...(images ? { images } : {}),
    },
    twitter: {
      card: images ? 'summary_large_image' : 'summary',
      title,
      description,
      ...(images ? { images: images.map((i) => i.url) } : {}),
    },
  };
}

/** Horaire brut (aligné sur la table opening_hours). */
export interface SeoOpeningHour {
  day_of_week: number; // 1=Lun .. 7=Dim (ISO)
  opens_at: string; // 'HH:MM:SS'
  closes_at: string;
  is_closed: boolean;
}

const SCHEMA_DAYS = [
  '', // index 0 inutilisé (jours ISO 1..7)
  'https://schema.org/Monday',
  'https://schema.org/Tuesday',
  'https://schema.org/Wednesday',
  'https://schema.org/Thursday',
  'https://schema.org/Friday',
  'https://schema.org/Saturday',
  'https://schema.org/Sunday',
];

// Caractères à neutraliser avant injection dans une balise <script> : `<` et `>`
// (évasion de la balise) et `&` (entités). Les valeurs (name, description…) sont
// saisies par le restaurateur, donc non fiables — sans échappement c'est un XSS stocké.
const JSONLD_ESCAPES: Record<string, string> = {
  '<': '\\u003c',
  '>': '\\u003e',
  '&': '\\u0026',
};

/**
 * Sérialise un objet en JSON sûr pour injection dans `<script type="application/ld+json">`.
 * `JSON.stringify` seul n'échappe pas `<`, ce qui permettrait à un nom de restaurant
 * du type `</script><script>…` de s'exécuter chez tous les visiteurs.
 */
export function serializeJsonLd(data: Record<string, unknown>): string {
  return JSON.stringify(data).replace(/[<>&]/g, (c) => JSONLD_ESCAPES[c]!);
}

/** Données structurées schema.org Restaurant (JSON-LD) pour le référencement. */
export function restaurantJsonLd(
  r: RestaurantSeo,
  opts?: { openingHours?: SeoOpeningHour[]; ratingValue?: number | null; reviewCount?: number },
): Record<string, unknown> {
  const path = `/r/${r.slug}`;

  const openingHoursSpecification = (opts?.openingHours ?? [])
    .filter((h) => !h.is_closed && h.opens_at && h.closes_at)
    .map((h) => ({
      '@type': 'OpeningHoursSpecification',
      dayOfWeek: SCHEMA_DAYS[h.day_of_week],
      opens: h.opens_at.slice(0, 5),
      closes: h.closes_at.slice(0, 5),
    }))
    .filter((s) => s.dayOfWeek);

  return {
    '@context': 'https://schema.org',
    '@type': 'Restaurant',
    name: r.name,
    url: `${APP_URL}${path}`,
    hasMenu: `${APP_URL}${path}/menu`,
    servesCuisine: 'Algérienne',
    priceRange: '$$',
    ...(r.description ? { description: r.description } : {}),
    ...(r.phone ? { telephone: r.phone } : {}),
    ...(r.coverUrl ? { image: r.coverUrl } : {}),
    ...(openingHoursSpecification.length > 0 ? { openingHoursSpecification } : {}),
    ...(opts?.ratingValue != null && (opts.reviewCount ?? 0) > 0
      ? {
          aggregateRating: {
            '@type': 'AggregateRating',
            ratingValue: opts.ratingValue,
            reviewCount: opts.reviewCount,
          },
        }
      : {}),
    ...(r.address || r.city
      ? {
          address: {
            '@type': 'PostalAddress',
            ...(r.address ? { streetAddress: r.address } : {}),
            ...(r.city ? { addressLocality: r.city } : {}),
            addressCountry: 'DZ',
          },
        }
      : {}),
  };
}
