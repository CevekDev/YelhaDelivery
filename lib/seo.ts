import type { Metadata } from 'next';

const APP_URL = (process.env.NEXT_PUBLIC_APP_URL || 'https://yelha-delivery.vercel.app').replace(
  /\/$/,
  '',
);

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

/** Données structurées schema.org Restaurant (JSON-LD) pour le référencement. */
export function restaurantJsonLd(r: RestaurantSeo): Record<string, unknown> {
  const path = `/r/${r.slug}`;
  return {
    '@context': 'https://schema.org',
    '@type': 'Restaurant',
    name: r.name,
    url: `${APP_URL}${path}`,
    hasMenu: `${APP_URL}${path}/menu`,
    priceRange: '$$',
    ...(r.description ? { description: r.description } : {}),
    ...(r.phone ? { telephone: r.phone } : {}),
    ...(r.coverUrl ? { image: r.coverUrl } : {}),
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
