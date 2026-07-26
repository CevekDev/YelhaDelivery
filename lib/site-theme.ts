// =====================================================================
// Personnalisation de la couleur d'accent du site public.
//
// Le restaurateur choisit une couleur de marque parmi une palette CURATÉE
// (liste blanche) — jamais une couleur libre, pour garantir la lisibilité et
// la cohérence sur les 8 templates (clairs comme sombres). La couleur de texte
// posée SUR l'accent (boutons, badges) est recalculée automatiquement selon le
// contraste WCAG → toujours lisible. Le reste de la palette du template (fonds,
// typo, hero clair/sombre) est préservé : seule la couleur de marque change.
// =====================================================================

import type { Template } from '@/lib/templates';
import { templateCssVars } from '@/lib/templates';
import type { SiteConfig } from '@/types/database';

export interface AccentPreset {
  id: string;
  name: string;
  /** Hex vif ton moyen (~Tailwind 600) : lisible en fond ET en texte, clair/sombre. */
  accent: string;
}

/** Palette de marque curatée — les seules valeurs acceptées. */
export const ACCENT_PRESETS: AccentPreset[] = [
  { id: 'mandarine', name: 'Mandarine', accent: '#EA580C' },
  { id: 'rouge', name: 'Rouge', accent: '#DC2626' },
  { id: 'framboise', name: 'Framboise', accent: '#DB2777' },
  { id: 'violet', name: 'Violet', accent: '#7C3AED' },
  { id: 'indigo', name: 'Indigo', accent: '#4F46E5' },
  { id: 'bleu', name: 'Bleu', accent: '#2563EB' },
  { id: 'sarcelle', name: 'Sarcelle', accent: '#0D9488' },
  { id: 'vert', name: 'Vert', accent: '#059669' },
  { id: 'ambre', name: 'Ambre', accent: '#D97706' },
];

const ACCENT_SET = new Set(ACCENT_PRESETS.map((p) => p.accent.toUpperCase()));

/** Vrai si la couleur fait partie de la palette curatée (liste blanche). */
export function isValidAccent(hex: string): boolean {
  return typeof hex === 'string' && ACCENT_SET.has(hex.toUpperCase());
}

/** Luminance relative WCAG d'une couleur hex #rrggbb. */
function luminance(hex: string): number {
  const c = hex.replace('#', '');
  const toLin = (v: number) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  };
  const r = toLin(parseInt(c.slice(0, 2), 16));
  const g = toLin(parseInt(c.slice(2, 4), 16));
  const b = toLin(parseInt(c.slice(4, 6), 16));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** Blanc ou quasi-noir selon ce qui contraste le mieux avec l'accent. */
export function accentForeground(hex: string): string {
  if (!/^#[0-9a-fA-F]{6}$/.test(hex)) return '#FFFFFF';
  const L = luminance(hex);
  const contrastWhite = 1.05 / (L + 0.05);
  const contrastBlack = (L + 0.05) / 0.05;
  return contrastWhite >= contrastBlack ? '#FFFFFF' : '#0A0A0A';
}

/**
 * Variables CSS finales du site : celles du template, avec l'accent (et son
 * texte) remplacés si le restaurateur a choisi une couleur valide.
 */
export function siteCssVars(template: Template, config?: SiteConfig | null): Record<string, string> {
  const vars = templateCssVars(template);
  const accent = config?.accent;
  if (accent && isValidAccent(accent)) {
    vars['--site-accent'] = accent;
    vars['--site-accent-fg'] = accentForeground(accent);
  }
  return vars;
}
