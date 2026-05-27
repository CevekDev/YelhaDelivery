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
const MAX_ATTEMPTS = 5;
const WINDOW_MS = 15 * 60 * 1000;

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetInSeconds: number;
}

export function checkRateLimit(key: string): RateLimitResult {
  const now = Date.now();
  const bucket = buckets.get(key);

  if (!bucket || bucket.resetAt < now) {
    buckets.set(key, { count: 1, resetAt: now + WINDOW_MS });
    return { allowed: true, remaining: MAX_ATTEMPTS - 1, resetInSeconds: WINDOW_MS / 1000 };
  }

  if (bucket.count >= MAX_ATTEMPTS) {
    return {
      allowed: false,
      remaining: 0,
      resetInSeconds: Math.ceil((bucket.resetAt - now) / 1000),
    };
  }

  bucket.count += 1;
  return {
    allowed: true,
    remaining: MAX_ATTEMPTS - bucket.count,
    resetInSeconds: Math.ceil((bucket.resetAt - now) / 1000),
  };
}

/** Réinitialise un bucket (à appeler après un login réussi). */
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
