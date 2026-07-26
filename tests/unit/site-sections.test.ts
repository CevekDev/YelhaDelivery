import { describe, it, expect } from 'vitest';
import {
  BUILTIN_SECTION_TYPES,
  defaultLayout,
  editorLayout,
  resolveLayout,
} from '@/lib/site-sections';
import type { SiteSection } from '@/types/database';

describe('site-sections', () => {
  it('defaultLayout : toutes les sections natives, activées, pour chaque style', () => {
    const l = defaultLayout('split');
    expect(l.map((s) => s.type).sort()).toEqual([...BUILTIN_SECTION_TYPES].sort());
    expect(l.every((s) => s.enabled)).toBe(true);
    // ids stables = type pour les sections natives
    expect(l.every((s) => s.id === s.type)).toBe(true);
  });

  it('resolveLayout : retombe sur le défaut du template si layout absent ou vide', () => {
    expect(resolveLayout('bold', undefined)).toEqual(defaultLayout('bold'));
    expect(resolveLayout('bold', null)).toEqual(defaultLayout('bold'));
    expect(resolveLayout('bold', [])).toEqual(defaultLayout('bold'));
  });

  it('resolveLayout : respecte l’agencement stocké tel quel', () => {
    const custom: SiteSection[] = [
      { id: 'menu', type: 'menu', enabled: true },
      { id: 'x1', type: 'text', enabled: true, title: 'Hello' },
      { id: 'about', type: 'about', enabled: false },
    ];
    expect(resolveLayout('minimal', custom)).toEqual(custom);
  });

  it('editorLayout : garantit toujours les 4 sections natives (réactivables)', () => {
    // agencement où 'gallery' et 'highlights' ont été retirés
    const partial: SiteSection[] = [
      { id: 'menu', type: 'menu', enabled: true },
      { id: 'about', type: 'about', enabled: true },
    ];
    const out = editorLayout('split', partial);
    for (const t of BUILTIN_SECTION_TYPES) {
      expect(out.some((s) => s.type === t)).toBe(true);
    }
    // les manquantes réapparaissent masquées, à la fin
    const missing = out.filter((s) => s.type === 'gallery' || s.type === 'highlights');
    expect(missing.every((s) => !s.enabled)).toBe(true);
  });

  it('editorLayout : conserve les blocs de texte personnalisés', () => {
    const withText: SiteSection[] = [
      { id: 'about', type: 'about', enabled: true },
      { id: 'menu', type: 'menu', enabled: true },
      { id: 'highlights', type: 'highlights', enabled: true },
      { id: 'gallery', type: 'gallery', enabled: true },
      { id: 'uuid-1', type: 'text', enabled: true, title: 'Promo' },
    ];
    const out = editorLayout('pattern', withText);
    expect(out.filter((s) => s.type === 'text')).toHaveLength(1);
    expect(out).toHaveLength(5); // rien ajouté, tout était présent
  });
});
