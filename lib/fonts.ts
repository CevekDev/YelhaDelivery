// =====================================================================
// Polices des templates de site web.
// Chaque template (lib/templates) référence l'une de ces variables CSS.
// Les variables sont injectées sur <html> (voir app/layout.tsx) afin que
// n'importe quelle page publique puisse les utiliser.
// =====================================================================
import {
  Space_Grotesk,
  Playfair_Display,
  Lora,
  Poppins,
  Marcellus,
  Fraunces,
  DM_Sans,
  Inter,
} from 'next/font/google';

const spaceGrotesk = Space_Grotesk({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-space',
  weight: ['400', '500', '600', '700'],
});

const playfair = Playfair_Display({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-playfair',
  weight: ['400', '500', '600', '700', '800', '900'],
});

const lora = Lora({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-lora',
  weight: ['400', '500', '600', '700'],
});

const poppins = Poppins({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-poppins',
  weight: ['400', '500', '600', '700', '800', '900'],
});

const marcellus = Marcellus({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-marcellus',
  weight: ['400'],
});

const fraunces = Fraunces({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-fraunces',
  weight: ['400', '500', '600', '700', '900'],
});

const dmSans = DM_Sans({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-dmsans',
  weight: ['400', '500', '600', '700'],
});

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
  weight: ['400', '500', '600', '700', '800'],
});

/** Toutes les variables de police à coller sur <html>. */
export const siteFontVariables = [
  spaceGrotesk.variable,
  playfair.variable,
  lora.variable,
  poppins.variable,
  marcellus.variable,
  fraunces.variable,
  dmSans.variable,
  inter.variable,
].join(' ');
