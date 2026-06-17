import { describe, it, expect } from 'vitest';
import { TEMPLATES, getTemplate, templateCssVars } from '@/lib/templates';

describe('TEMPLATES registry', () => {
  it('has 8 templates with unique ids 1..8', () => {
    expect(TEMPLATES).toHaveLength(8);
    const ids = TEMPLATES.map((t) => t.id).sort((a, b) => a - b);
    expect(ids).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
  });

  it('every template has the required fields', () => {
    for (const t of TEMPLATES) {
      expect(t.key).toBeTruthy();
      expect(t.name).toBeTruthy();
      expect(t.heroStyle).toBeTruthy();
      expect(t.palette.bg).toMatch(/^#/);
      expect(t.palette.accent).toMatch(/^#/);
      expect(t.fonts.heading).toContain('var(--font');
    }
  });

  it('includes the editorial template (id 8 « Audace »)', () => {
    const t = getTemplate(8);
    expect(t.id).toBe(8);
    expect(t.heroStyle).toBe('editorial');
  });
});

describe('getTemplate', () => {
  it('returns the matching template', () => {
    expect(getTemplate(3).id).toBe(3);
  });
  it('falls back to the first template for invalid/null/undefined', () => {
    expect(getTemplate(999).id).toBe(1);
    expect(getTemplate(0).id).toBe(1);
    expect(getTemplate(null).id).toBe(1);
    expect(getTemplate(undefined).id).toBe(1);
  });
});

describe('templateCssVars', () => {
  it('maps palette + fonts to CSS variables', () => {
    const vars = templateCssVars(getTemplate(1));
    expect(vars['--site-bg']).toBeTruthy();
    expect(vars['--site-accent']).toBeTruthy();
    expect(vars['--font-site-heading']).toContain('var(--font');
    expect(vars['--site-radius']).toBeTruthy();
  });
});
