import type { MetadataRoute } from 'next';
import { APP_URL } from '@/lib/seo';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      // Espaces privés / non-indexables (comptes, tunnel de commande, API).
      disallow: [
        '/admin',
        '/dashboard',
        '/livreur',
        '/api',
        '/login',
        '/register',
        '/r/*/checkout',
        '/r/*/confirmation',
        '/r/*/suivi',
      ],
    },
    sitemap: `${APP_URL}/sitemap.xml`,
    host: APP_URL,
  };
}
