import { describe, it, expect } from 'vitest';
import { algerianPhone, slugSchema, priceSchema } from '@/lib/validators/common';
import { emailLoginSchema, usernameLoginSchema } from '@/lib/validators/auth';
import { checkoutSchema } from '@/lib/validators/order';
import { menuItemSchema } from '@/lib/validators/menu';

describe('algerianPhone', () => {
  it.each([['0555123456'], ['0612345678'], ['0712345678']])('accepts %s', (n) => {
    expect(algerianPhone.safeParse(n).success).toBe(true);
  });

  it.each([
    ['055512345'], // trop court
    ['05551234567'], // trop long
    ['+213555123456'], // format intl
    ['0455123456'], // commence par 04
    ['abc'],
    [''],
  ])('rejects %s', (n) => {
    expect(algerianPhone.safeParse(n).success).toBe(false);
  });
});

describe('slugSchema', () => {
  it('accepts valid slugs', () => {
    expect(slugSchema.safeParse('el-bahia').success).toBe(true);
    expect(slugSchema.safeParse('foo123').success).toBe(true);
  });

  it('rejects spaces, consecutive dashes, leading dash, too short', () => {
    expect(slugSchema.safeParse('El Bahia').success).toBe(false);
    expect(slugSchema.safeParse('foo--bar').success).toBe(false);
    expect(slugSchema.safeParse('-foo').success).toBe(false);
    expect(slugSchema.safeParse('ab').success).toBe(false); // < 3
  });

  it('auto-lowercases uppercase input', () => {
    const res = slugSchema.safeParse('EL-BAHIA');
    expect(res.success).toBe(true);
    if (res.success) expect(res.data).toBe('el-bahia');
  });
});

describe('priceSchema', () => {
  it('accepts integers and 2-decimal floats', () => {
    expect(priceSchema.safeParse(0).success).toBe(true);
    expect(priceSchema.safeParse(1500).success).toBe(true);
    expect(priceSchema.safeParse(99.5).success).toBe(true);
    expect(priceSchema.safeParse(99.95).success).toBe(true);
  });

  it('rejects negatives and 3+ decimals', () => {
    expect(priceSchema.safeParse(-1).success).toBe(false);
    expect(priceSchema.safeParse(99.999).success).toBe(false);
  });

  it('rejects above max', () => {
    expect(priceSchema.safeParse(2_000_000).success).toBe(false);
  });
});

describe('emailLoginSchema', () => {
  it('accepts valid email + min length password', () => {
    expect(
      emailLoginSchema.safeParse({ email: 'a@b.co', password: 'longenough1' }).success,
    ).toBe(true);
  });
  it('rejects short password', () => {
    expect(
      emailLoginSchema.safeParse({ email: 'a@b.co', password: 'short' }).success,
    ).toBe(false);
  });
  it('rejects bad email', () => {
    expect(
      emailLoginSchema.safeParse({ email: 'not-an-email', password: 'longenough1' }).success,
    ).toBe(false);
  });
});

describe('usernameLoginSchema', () => {
  it('lowercases the username', () => {
    const res = usernameLoginSchema.safeParse({ username: 'Ahmed_22', password: 'pass12' });
    expect(res.success).toBe(true);
    if (res.success) expect(res.data.username).toBe('ahmed_22');
  });
  it('rejects special chars', () => {
    expect(
      usernameLoginSchema.safeParse({ username: 'ahmed!', password: 'pass12' }).success,
    ).toBe(false);
  });
});

describe('checkoutSchema', () => {
  const base = {
    customer_name: 'Ali',
    customer_phone: '0555123456',
    customer_address: '12 rue X, Alger',
    notes: '',
    items: [{ menu_item_id: '11111111-1111-1111-1111-111111111111', quantity: 2 }],
  };
  it('accepts a valid order', () => {
    expect(checkoutSchema.safeParse(base).success).toBe(true);
  });
  it('rejects empty cart', () => {
    expect(checkoutSchema.safeParse({ ...base, items: [] }).success).toBe(false);
  });
  it('rejects invalid phone', () => {
    expect(
      checkoutSchema.safeParse({ ...base, customer_phone: '0123' }).success,
    ).toBe(false);
  });
  it('rejects too short address', () => {
    expect(checkoutSchema.safeParse({ ...base, customer_address: 'a' }).success).toBe(false);
  });
});

describe('menuItemSchema', () => {
  it('accepts a valid item', () => {
    expect(
      menuItemSchema.safeParse({
        category_id: null,
        name: 'Couscous',
        description: '',
        price: 1200,
        is_available: true,
        sort_order: 0,
      }).success,
    ).toBe(true);
  });
  it('rejects negative price', () => {
    expect(
      menuItemSchema.safeParse({
        category_id: null,
        name: 'X',
        description: '',
        price: -1,
        is_available: true,
        sort_order: 0,
      }).success,
    ).toBe(false);
  });
});
