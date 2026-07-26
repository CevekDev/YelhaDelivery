// =====================================================================
// Modèle de sections de la page d'accueil publique (éditeur libre).
//
// La page publique est toujours encadrée par le Hero (en tête) et le CTA
// final (en pied). Entre les deux, le restaurateur ordonne / masque des
// sections natives et ajoute des blocs de texte. Ce module est la source de
// vérité partagée entre le rendu public (home-view) et l'éditeur dashboard.
// =====================================================================

import type { HeroStyle } from '@/lib/templates';
import type { SiteSection, SiteSectionType } from '@/types/database';

export type { SiteSection, SiteSectionType };

/** Sections natives (non supprimables — pilotées par le contenu ailleurs). */
export const BUILTIN_SECTION_TYPES = ['highlights', 'about', 'menu', 'gallery'] as const;
export type BuiltinSectionType = (typeof BUILTIN_SECTION_TYPES)[number];

export const SECTION_LABELS: Record<SiteSectionType, string> = {
  highlights: 'Points forts',
  about: 'Notre histoire',
  menu: 'Aperçu du menu',
  gallery: 'Galerie photos',
  text: 'Bloc de texte',
};

export const SECTION_HINTS: Record<SiteSectionType, string> = {
  highlights: 'Vos 3 atouts (livraison, paiement, fraîcheur…).',
  about: 'Votre histoire — visible si vous avez rempli le texte « À propos ».',
  menu: 'Un aperçu de vos plats phares — visible si vous avez des plats.',
  gallery: 'Vos photos — visible si vous avez ajouté des images.',
  text: 'Un bloc libre : titre + texte, avec un bouton optionnel.',
};

/**
 * Ordre par défaut du corps propre à chaque template — c'est ce qui casse la
 * monotonie « même scroll partout ». Sert de point de départ à l'éditeur tant
 * que le restaurateur n'a pas personnalisé son agencement.
 */
export const DEFAULT_SECTION_ORDER: Record<HeroStyle, BuiltinSectionType[]> = {
  split: ['menu', 'about', 'highlights', 'gallery'], // Saveur — l'appétit d'abord
  centered: ['about', 'menu', 'highlights', 'gallery'], // Trattoria — l'histoire d'abord
  fullbleed: ['menu', 'about', 'gallery', 'highlights'], // Noir — la carte d'abord
  bold: ['menu', 'gallery', 'highlights', 'about'], // Urban — punchy, food-forward
  minimal: ['about', 'menu', 'gallery', 'highlights'], // Pure — éditorial posé
  pattern: ['about', 'menu', 'highlights', 'gallery'], // Riad — héritage puis carte
  magazine: ['gallery', 'menu', 'about', 'highlights'], // Cocon — visuel magazine d'abord
  editorial: ['menu', 'highlights', 'about', 'gallery'], // Audace — la carte d'abord, punchy
};

/** Agencement par défaut (toutes les sections natives visibles) pour un template. */
export function defaultLayout(heroStyle: HeroStyle): SiteSection[] {
  return DEFAULT_SECTION_ORDER[heroStyle].map((type) => ({ id: type, type, enabled: true }));
}

/**
 * Agencement effectif utilisé au rendu : l'agencement stocké s'il existe et
 * n'est pas vide, sinon l'ordre par défaut du template. On ne « corrige » pas
 * les choix du restaurateur au rendu (une section absente n'apparaît pas).
 */
export function resolveLayout(heroStyle: HeroStyle, layout?: SiteSection[] | null): SiteSection[] {
  return layout && layout.length > 0 ? layout : defaultLayout(heroStyle);
}

/**
 * Agencement pour l'ÉDITEUR : garantit que les 4 sections natives sont toujours
 * présentes (les manquantes sont ajoutées, masquées, à la fin) pour que le
 * restaurateur puisse toujours les réactiver. N'affecte pas le rendu public.
 */
export function editorLayout(heroStyle: HeroStyle, layout?: SiteSection[] | null): SiteSection[] {
  const base = resolveLayout(heroStyle, layout);
  const present = new Set(base.map((s) => s.type));
  const missing = BUILTIN_SECTION_TYPES.filter((t) => !present.has(t)).map(
    (type): SiteSection => ({ id: type, type, enabled: false }),
  );
  return [...base, ...missing];
}
