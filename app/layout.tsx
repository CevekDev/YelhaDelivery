import type { Metadata } from 'next';
import { Plus_Jakarta_Sans } from 'next/font/google';
import './globals.css';

const jakarta = Plus_Jakarta_Sans({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-jakarta',
  weight: ['400', '500', '600', '700', '800'],
});

export const metadata: Metadata = {
  title: {
    default: 'YelhaDelivery — Livraison pour restaurants en Algérie',
    template: '%s — YelhaDelivery',
  },
  description:
    'Plateforme de gestion de livraison pour restaurants algériens. Menu en ligne, commandes en temps réel, livreurs intégrés.',
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || 'https://delivery.yelha.net'),
  openGraph: {
    type: 'website',
    locale: 'fr_DZ',
    siteName: 'YelhaDelivery',
  },
  robots: { index: true, follow: true },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" className={jakarta.variable}>
      <body className="min-h-screen bg-background text-foreground antialiased">{children}</body>
    </html>
  );
}
