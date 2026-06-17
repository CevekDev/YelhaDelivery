import { describe, it, expect } from 'vitest';
import { restaurantMetadata, restaurantJsonLd } from '@/lib/seo';

const base = { name: 'El Bahia', slug: 'el-bahia-alger', city: 'Alger' };

describe('restaurantMetadata', () => {
  it('uses the name as title on home, prefixes "Menu —" on menu', () => {
    expect(restaurantMetadata(base, 'home').title).toBe('El Bahia');
    expect(restaurantMetadata(base, 'menu').title).toBe('Menu — El Bahia');
  });

  it('sets the canonical to the right path', () => {
    expect(restaurantMetadata(base, 'home').alternates?.canonical).toBe('/r/el-bahia-alger');
    expect(restaurantMetadata(base, 'menu').alternates?.canonical).toBe('/r/el-bahia-alger/menu');
  });

  it('falls back to a generated description when none provided', () => {
    const m = restaurantMetadata(base, 'home');
    expect(String(m.description)).toContain('El Bahia');
    expect(String(m.description)).toContain('Alger');
  });

  it('uses the provided description when present', () => {
    const m = restaurantMetadata({ ...base, description: 'Cuisine maison' }, 'home');
    expect(m.description).toBe('Cuisine maison');
  });

  it('picks the twitter card type based on cover image', () => {
    const card = (m: ReturnType<typeof restaurantMetadata>) =>
      (m.twitter as { card?: string } | undefined)?.card;
    expect(card(restaurantMetadata(base, 'home'))).toBe('summary');
    expect(card(restaurantMetadata({ ...base, coverUrl: 'https://x/y.jpg' }, 'home'))).toBe(
      'summary_large_image',
    );
  });

  it('fills openGraph url and siteName', () => {
    const og = restaurantMetadata(base, 'home').openGraph as { url?: string; siteName?: string };
    expect(og.url).toContain('/r/el-bahia-alger');
    expect(og.siteName).toBe('El Bahia');
  });
});

describe('restaurantJsonLd', () => {
  it('produces a schema.org Restaurant with menu link', () => {
    const ld = restaurantJsonLd({ ...base, phone: '0561234567' });
    expect(ld['@type']).toBe('Restaurant');
    expect(ld.name).toBe('El Bahia');
    expect(String(ld.url)).toContain('/r/el-bahia-alger');
    expect(String(ld.hasMenu)).toContain('/r/el-bahia-alger/menu');
    expect(ld.telephone).toBe('0561234567');
    expect(ld.priceRange).toBeTruthy();
  });

  it('includes a PostalAddress when city/address provided', () => {
    const ld = restaurantJsonLd({ ...base, address: '12 rue X' });
    expect((ld.address as { addressLocality?: string }).addressLocality).toBe('Alger');
  });

  it('omits address entirely when no city/address', () => {
    const ld = restaurantJsonLd({ name: 'X', slug: 'x' });
    expect(ld.address).toBeUndefined();
    expect(ld.telephone).toBeUndefined();
  });
});
