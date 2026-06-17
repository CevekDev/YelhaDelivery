import { describe, it, expect } from 'vitest';
import { checkRateLimit, checkSignupRateLimit, resetRateLimit } from '@/lib/rate-limit';

// Sans UPSTASH_* en env, le limiteur utilise le repli en mémoire.

describe('checkRateLimit (login, repli mémoire)', () => {
  it('autorise jusqu’à 5 tentatives puis bloque la 6e', async () => {
    const key = `test:login:${Math.random()}`;
    for (let i = 0; i < 5; i++) {
      const r = await checkRateLimit(key);
      expect(r.allowed).toBe(true);
    }
    const blocked = await checkRateLimit(key);
    expect(blocked.allowed).toBe(false);
    expect(blocked.remaining).toBe(0);
    expect(blocked.resetInSeconds).toBeGreaterThan(0);
  });

  it('resetRateLimit réautorise après un succès', async () => {
    const key = `test:reset:${Math.random()}`;
    for (let i = 0; i < 6; i++) await checkRateLimit(key);
    expect((await checkRateLimit(key)).allowed).toBe(false);
    await resetRateLimit(key);
    expect((await checkRateLimit(key)).allowed).toBe(true);
  });
});

describe('checkSignupRateLimit (repli mémoire)', () => {
  it('autorise 3 tentatives puis bloque', async () => {
    const key = `test:signup:${Math.random()}`;
    for (let i = 0; i < 3; i++) {
      expect((await checkSignupRateLimit(key)).allowed).toBe(true);
    }
    expect((await checkSignupRateLimit(key)).allowed).toBe(false);
  });
});
