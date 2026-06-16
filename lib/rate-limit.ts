/**
 * Rate limiter distribué (Upstash Redis REST) avec repli en mémoire.
 *
 * Si UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN sont définis, le compteur
 * est partagé entre toutes les instances serverless (protection réelle en prod).
 * Sinon — ou en cas d'erreur réseau Upstash — on retombe sur un compteur en
 * mémoire (par instance), utile contre les rafales sur une instance chaude.
 *
 * Limite : 5 tentatives / 15 min (login), 3 / 60 min (signup), par clé (email+ip).
 */

const UP_URL = process.env.UPSTASH_REDIS_REST_URL;
const UP_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN;
const upstashEnabled = Boolean(UP_URL && UP_TOKEN);

async function upstashCmd<T>(...args: (string | number)[]): Promise<T | null> {
  try {
    const path = args.map((a) => encodeURIComponent(String(a))).join('/');
    const res = await fetch(`${UP_URL}/${path}`, {
      headers: { Authorization: `Bearer ${UP_TOKEN}` },
      cache: 'no-store',
    });
    if (!res.ok) return null;
    const json = (await res.json()) as { result: T };
    return json.result;
  } catch {
    return null;
  }
}

/** Compteur Upstash (fenêtre fixe). Renvoie null en cas d'erreur → repli mémoire. */
async function checkUpstash(key: string, cfg: RateLimitConfig): Promise<RateLimitResult | null> {
  const windowSec = Math.ceil(cfg.windowMs / 1000);
  const count = await upstashCmd<number>('INCR', key);
  if (count === null) return null;
  if (count === 1) await upstashCmd('EXPIRE', key, windowSec);
  let ttl = await upstashCmd<number>('TTL', key);
  if (ttl === null || ttl < 0) ttl = windowSec;
  if (count > cfg.max) return { allowed: false, remaining: 0, resetInSeconds: ttl };
  return { allowed: true, remaining: cfg.max - count, resetInSeconds: ttl };
}

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

export async function checkRateLimit(key: string): Promise<RateLimitResult> {
  if (upstashEnabled) {
    const r = await checkUpstash(key, LOGIN);
    if (r) return r;
  }
  return check(key, LOGIN);
}

export async function checkSignupRateLimit(key: string): Promise<RateLimitResult> {
  if (upstashEnabled) {
    const r = await checkUpstash(key, SIGNUP);
    if (r) return r;
  }
  return check(key, SIGNUP);
}

/** Réinitialise un compteur (à appeler après une opération réussie). */
export async function resetRateLimit(key: string): Promise<void> {
  if (upstashEnabled) await upstashCmd('DEL', key);
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
