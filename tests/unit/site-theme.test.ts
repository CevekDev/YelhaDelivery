import { describe, it, expect } from 'vitest';
import {
  ACCENT_PRESETS,
  accentForeground,
  isValidAccent,
  siteCssVars,
} from '@/lib/site-theme';
import { getTemplate } from '@/lib/templates';

describe('site-theme', () => {
  it('isValidAccent : accepte la palette curatée, rejette le reste', () => {
    expect(isValidAccent(ACCENT_PRESETS[0]!.accent)).toBe(true);
    expect(isValidAccent(ACCENT_PRESETS[0]!.accent.toLowerCase())).toBe(true);
    expect(isValidAccent('#123456')).toBe(false); // hors palette
    expect(isValidAccent('red')).toBe(false);
    expect(isValidAccent('')).toBe(false);
    expect(isValidAccent('javascript:alert(1)')).toBe(false);
  });

  it('accentForeground : choisit le texte le plus contrasté', () => {
    expect(accentForeground('#000000')).toBe('#FFFFFF'); // sur noir → blanc
    expect(accentForeground('#FFFFFF')).toBe('#0A0A0A'); // sur blanc → noir
    // Toutes les couleurs de la palette donnent un texte lisible (hex valide)
    for (const p of ACCENT_PRESETS) {
      expect(['#FFFFFF', '#0A0A0A']).toContain(accentForeground(p.accent));
    }
  });

  it('siteCssVars : applique un accent valide, ignore un accent invalide', () => {
    const t = getTemplate(1); // Saveur, accent #FF5C1A
    const def = siteCssVars(t, {});
    expect(def['--site-accent']).toBe(t.palette.accent);

    const custom = siteCssVars(t, { accent: '#2563EB' }); // bleu (préset)
    expect(custom['--site-accent']).toBe('#2563EB');
    expect(custom['--site-accent-fg']).toBe('#FFFFFF');

    const bad = siteCssVars(t, { accent: '#123456' }); // hors palette → ignoré
    expect(bad['--site-accent']).toBe(t.palette.accent);
  });
});
