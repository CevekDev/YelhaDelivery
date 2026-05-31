/**
 * Rate limiter en mémoire — convient pour Phase 1 / dev / mono-instance.
 * Pour la production multi-instance (Vercel serverless), migrer vers Upstash Redis
 * dans une phase ultérieure (cf. README "Roadmap").
 *
 * Limite : 5 tentatives par fenêtre de 15 min, par clé (ex: email+ip).
 */

interface Bucket {
  count: number;
  resetAt: number;
}

const buckets = new Map<string, Bucket>();

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetInSeconds: number;
}

export interface RateLimitConfig {
  max: number;
  windowMs: number;
}

const LOGIN: RateLimitConfig = { max: 5, windowMs: 15 * 60 * 1000 };
const SIGNUP: RateLimitConfig = { max: 3, windowMs: 60 * 60 * 1000 };

function check(key: string, cfg: RateLimitConfig): RateLimitResult {
  const now = Date.now();
  const bucket = buckets.get(key);

  if (!bucket || bucket.resetAt < now) {
    buckets.set(key, { count: 1, resetAt: now + cfg.windowMs });
    return { allowed: true, remaining: cfg.max - 1, resetInSeconds: cfg.windowMs / 1000 };
  }

  if (bucket.count >= cfg.max) {
    return {
      allowed: false,
      remaining: 0,
      resetInSeconds: Math.ceil((bucket.resetAt - now) / 1000),
    };
  }

  bucket.count += 1;
  return {
    allowed: true,
    remaining: cfg.max - bucket.count,
    resetInSeconds: Math.ceil((bucket.resetAt - now) / 1000),
  };
}

export function checkRateLimit(key: string): RateLimitResult {
  return check(key, LOGIN);
}

export function checkSignupRateLimit(key: string): RateLimitResult {
  return check(key, SIGNUP);
}

/** Réinitialise un bucket (à appeler après une opération réussie). */
export function resetRateLimit(key: string): void {
  buckets.delete(key);
}

// Nettoyage périodique (évite la croissance illimitée)
if (typeof setInterval !== 'undefined') {
  setInterval(
    () => {
      const now = Date.now();
      for (const [key, bucket] of buckets.entries()) {
        if (bucket.resetAt < now) buckets.delete(key);
      }
    },
    5 * 60 * 1000,
  ).unref?.();
}
