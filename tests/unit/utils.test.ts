import { describe, it, expect } from 'vitest';
import { generateSlug, formatPrice } from '@/lib/utils';

describe('generateSlug', () => {
  it('lowercases and replaces spaces with hyphens', () => {
    expect(generateSlug('El Bahia Alger')).toBe('el-bahia-alger');
  });

  it('strips diacritics', () => {
    expect(generateSlug('Café résumé')).toBe('cafe-resume');
  });

  it('collapses consecutive separators', () => {
    expect(generateSlug('  Hello   World  ')).toBe('hello-world');
  });

  it('removes leading and trailing hyphens', () => {
    expect(generateSlug('---foo---')).toBe('foo');
  });

  it('rejects special characters', () => {
    expect(generateSlug('Resto @ 2024 !')).toBe('resto-2024');
  });

  it('handles empty string', () => {
    expect(generateSlug('')).toBe('');
  });
});

describe('formatPrice', () => {
  it('formats integer DZD without decimals', () => {
    const s = formatPrice(1200);
    expect(s).toContain('1');
    expect(s.toLowerCase()).toContain('da');
  });

  it('handles zero', () => {
    expect(formatPrice(0)).toBeTruthy();
  });

  it('handles decimals', () => {
    const s = formatPrice(99.5);
    expect(s).toBeTruthy();
  });
});
