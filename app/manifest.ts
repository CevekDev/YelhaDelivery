import type { MetadataRoute } from 'next';

const APP_NAME = process.env.NEXT_PUBLIC_APP_NAME || 'YelhaDelivery';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: APP_NAME,
    short_name: 'Yelha',
    description: 'Gérez et livrez vos commandes — restaurateurs et livreurs.',
    start_url: '/',
    scope: '/',
    display: 'standalone',
    background_color: '#ffffff',
    theme_color: '#FF5C1A',
    icons: [
      { src: '/icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' },
      { src: '/icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'maskable' },
    ],
  };
}
