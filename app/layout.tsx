import type { Metadata } from 'next';
import { DM_Sans, Syne } from 'next/font/google';
import './globals.css';

const dmSans = DM_Sans({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-dm-sans',
});

const syne = Syne({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-syne',
  weight: ['600', '700', '800'],
});

export const metadata: Metadata = {
  title: {
    default: 'YelhaDms — Livraison pour restaurants en Algérie',
    template: '%s — YelhaDms',
  },
  description:
    'Plateforme de gestion de livraison pour restaurants algériens. Menu en ligne, commandes en temps réel, livreurs intégrés.',
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || 'https://delivery.yelha.net'),
  openGraph: {
    type: 'website',
    locale: 'fr_DZ',
    siteName: 'YelhaDms',
  },
  robots: { index: true, follow: true },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" className={`${dmSans.variable} ${syne.variable}`}>
      <body className="min-h-screen bg-background text-foreground antialiased">{children}</body>
    </html>
  );
}
