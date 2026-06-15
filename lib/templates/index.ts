// =====================================================================
// Registre des 7 templates de site web YelhaDelivery.
// Chaque template = une identité visuelle complète (palette, typographie,
// style de hero/cartes). Le rendu public applique ces tokens via des
// variables CSS (voir components/site/site-shell.tsx).
// =====================================================================

export type HeroStyle =
  | 'split' // image à droite, texte à gauche
  | 'centered' // texte centré sur fond doux
  | 'fullbleed' // image plein écran sombre
  | 'bold' // gros titre + bloc coloré
  | 'minimal' // typographie XXL, beaucoup de blanc
  | 'pattern' // fond à motif oriental
  | 'magazine' // mise en page éditoriale
  | 'editorial'; // hero sombre éditorial, typo massive, sans photo

export interface TemplatePalette {
  bg: string;
  surface: string;
  text: string;
  textMuted: string;
  accent: string;
  accentText: string;
  border: string;
  /** Fond de la barre de hero/footer (peut différer du bg). */
  heroBg: string;
  heroText: string;
}

export interface Template {
  id: number; // 1..7
  key: string;
  name: string;
  tagline: string;
  description: string;
  /** Idéal pour quel type de cuisine / ambiance. */
  bestFor: string;
  isDark: boolean;
  heroStyle: HeroStyle;
  /** Rayon des cartes/boutons (valeur CSS). */
  radius: string;
  fonts: {
    heading: string; // var(--font-*)
    body: string;
  };
  palette: TemplatePalette;
}

export const TEMPLATES: Template[] = [
  {
    id: 1,
    key: 'saveur',
    name: 'Saveur',
    tagline: 'Moderne & chaleureux',
    description:
      'Un design épuré et énergique, idéal pour fast-food, burgers et cuisine du quotidien.',
    bestFor: 'Fast-food, burgers, tacos, pizza',
    isDark: false,
    heroStyle: 'split',
    radius: '1rem',
    fonts: { heading: 'var(--font-space)', body: 'var(--font-dmsans)' },
    palette: {
      bg: '#FFFFFF',
      surface: '#F7F6F3',
      text: '#14110F',
      textMuted: '#6B6660',
      accent: '#FF5C1A',
      accentText: '#FFFFFF',
      border: '#ECE9E4',
      heroBg: '#14110F',
      heroText: '#FFFFFF',
    },
  },
  {
    id: 2,
    key: 'trattoria',
    name: 'Trattoria',
    tagline: 'Rustique & authentique',
    description:
      'Ambiance familiale et chaleureuse avec des serif élégants, parfaite pour la cuisine traditionnelle.',
    bestFor: 'Pizzeria, cuisine italienne, traditionnelle',
    isDark: false,
    heroStyle: 'centered',
    radius: '0.5rem',
    fonts: { heading: 'var(--font-playfair)', body: 'var(--font-lora)' },
    palette: {
      bg: '#FBF6EE',
      surface: '#FFFFFF',
      text: '#2E1A12',
      textMuted: '#7A5E4E',
      accent: '#B5462F',
      accentText: '#FFFFFF',
      border: '#E8DCCB',
      heroBg: '#2E1A12',
      heroText: '#FBF6EE',
    },
  },
  {
    id: 3,
    key: 'noir',
    name: 'Noir',
    tagline: 'Gastronomique & raffiné',
    description:
      'Élégance sombre et touches dorées pour une expérience haut de gamme et mémorable.',
    bestFor: 'Restaurant gastronomique, fine dining, sushi',
    isDark: true,
    heroStyle: 'fullbleed',
    radius: '0rem',
    fonts: { heading: 'var(--font-playfair)', body: 'var(--font-inter)' },
    palette: {
      bg: '#0E0E0F',
      surface: '#18181B',
      text: '#F4F1EA',
      textMuted: '#A7A29A',
      accent: '#C8A24B',
      accentText: '#0E0E0F',
      border: '#2A2A2E',
      heroBg: '#0E0E0F',
      heroText: '#F4F1EA',
    },
  },
  {
    id: 4,
    key: 'urban',
    name: 'Urban',
    tagline: 'Street food & audacieux',
    description:
      'Des contrastes francs et une énergie pop pour marquer les esprits et attirer une clientèle jeune.',
    bestFor: 'Street food, food truck, snack, tacos',
    isDark: true,
    heroStyle: 'bold',
    radius: '1.25rem',
    fonts: { heading: 'var(--font-poppins)', body: 'var(--font-poppins)' },
    palette: {
      bg: '#0B0B0B',
      surface: '#161616',
      text: '#FFFFFF',
      textMuted: '#9A9A9A',
      accent: '#D7FF3E',
      accentText: '#0B0B0B',
      border: '#262626',
      heroBg: '#0B0B0B',
      heroText: '#FFFFFF',
    },
  },
  {
    id: 5,
    key: 'pure',
    name: 'Pure',
    tagline: 'Minimaliste & chic',
    description:
      'Noir et blanc, beaucoup d’espace, typographie soignée. Le luxe de la simplicité.',
    bestFor: 'Café branché, healthy, poke, brunch',
    isDark: false,
    heroStyle: 'minimal',
    radius: '0rem',
    fonts: { heading: 'var(--font-inter)', body: 'var(--font-inter)' },
    palette: {
      bg: '#FFFFFF',
      surface: '#FAFAFA',
      text: '#0A0A0A',
      textMuted: '#737373',
      accent: '#0A0A0A',
      accentText: '#FFFFFF',
      border: '#E5E5E5',
      heroBg: '#FAFAFA',
      heroText: '#0A0A0A',
    },
  },
  {
    id: 6,
    key: 'riad',
    name: 'Riad',
    tagline: 'Oriental & généreux',
    description:
      'Vert profond, or et motifs, pour mettre en valeur une cuisine orientale et traditionnelle.',
    bestFor: 'Cuisine algérienne, orientale, grillades',
    isDark: false,
    heroStyle: 'pattern',
    radius: '0.75rem',
    fonts: { heading: 'var(--font-marcellus)', body: 'var(--font-dmsans)' },
    palette: {
      bg: '#F6F1E7',
      surface: '#FFFFFF',
      text: '#15302A',
      textMuted: '#5E6F66',
      accent: '#1E6E5C',
      accentText: '#FFFFFF',
      border: '#E2D8C3',
      heroBg: '#15302A',
      heroText: '#F6F1E7',
    },
  },
  {
    id: 7,
    key: 'cocon',
    name: 'Cocon',
    tagline: 'Cosy & gourmand',
    description:
      'Tons pastel, courbes douces et serif gourmand : une atmosphère réconfortante de café-bistrot.',
    bestFor: 'Café, salon de thé, pâtisserie, brunch',
    isDark: false,
    heroStyle: 'magazine',
    radius: '1.5rem',
    fonts: { heading: 'var(--font-fraunces)', body: 'var(--font-dmsans)' },
    palette: {
      bg: '#FDF7F4',
      surface: '#FFFFFF',
      text: '#3B2A2A',
      textMuted: '#8A7370',
      accent: '#E07A5F',
      accentText: '#FFFFFF',
      border: '#F0E2DC',
      heroBg: '#3B2A2A',
      heroText: '#FDF7F4',
    },
  },
  {
    id: 8,
    key: 'audace',
    name: 'Audace',
    tagline: 'Éditorial & street',
    description:
      'Hero sombre à typographie massive, badges et marquee. Conçu pour avoir du caractère même sans photos.',
    bestFor: 'Fast-food, fried chicken, street food, snack',
    isDark: true,
    heroStyle: 'editorial',
    radius: '0.5rem',
    fonts: { heading: 'var(--font-poppins)', body: 'var(--font-dmsans)' },
    palette: {
      bg: '#131110',
      surface: '#1E1B19',
      text: '#FFF8F2',
      textMuted: '#B8B2A8',
      accent: '#FF5C1A',
      accentText: '#131110',
      border: '#2E2A26',
      heroBg: '#131110',
      heroText: '#FFF8F2',
    },
  },
];

export function getTemplate(id: number | null | undefined): Template {
  return TEMPLATES.find((t) => t.id === id) ?? TEMPLATES[0]!;
}

/** Variables CSS à appliquer sur le conteneur racine du site. */
export function templateCssVars(t: Template): Record<string, string> {
  return {
    '--site-bg': t.palette.bg,
    '--site-surface': t.palette.surface,
    '--site-text': t.palette.text,
    '--site-muted': t.palette.textMuted,
    '--site-accent': t.palette.accent,
    '--site-accent-fg': t.palette.accentText,
    '--site-border': t.palette.border,
    '--site-hero-bg': t.palette.heroBg,
    '--site-hero-fg': t.palette.heroText,
    '--site-radius': t.radius,
    '--font-site-heading': t.fonts.heading,
    '--font-site-body': t.fonts.body,
  };
}
