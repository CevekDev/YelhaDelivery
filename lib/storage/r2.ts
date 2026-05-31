import 'server-only';
import { PutObjectCommand, DeleteObjectCommand, S3Client } from '@aws-sdk/client-s3';

/**
 * Client Cloudflare R2 (compatible S3).
 * Renvoie null si les variables d'environnement R2_* ne sont pas configurées,
 * permettant un fallback gracieux vers Supabase Storage.
 */
let _client: S3Client | null = null;

function getR2Config() {
  const accountId = process.env.R2_ACCOUNT_ID;
  const accessKeyId = process.env.R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
  const bucket = process.env.R2_BUCKET;
  const publicBase = process.env.R2_PUBLIC_URL; // ex: https://images.yelha.net  ou  https://pub-xxxxx.r2.dev

  if (!accountId || !accessKeyId || !secretAccessKey || !bucket || !publicBase) {
    return null;
  }
  return { accountId, accessKeyId, secretAccessKey, bucket, publicBase };
}

export function isR2Configured(): boolean {
  return getR2Config() !== null;
}

function getClient(): { client: S3Client; bucket: string; publicBase: string } | null {
  const cfg = getR2Config();
  if (!cfg) return null;

  if (!_client) {
    _client = new S3Client({
      region: 'auto',
      endpoint: `https://${cfg.accountId}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: cfg.accessKeyId,
        secretAccessKey: cfg.secretAccessKey,
      },
    });
  }

  return { client: _client, bucket: cfg.bucket, publicBase: cfg.publicBase.replace(/\/$/, '') };
}

export interface UploadResult {
  publicUrl: string;
  key: string;
}

/**
 * Upload un buffer sur R2 et renvoie l'URL publique.
 * `key` doit inclure le chemin complet (ex: "restaurant-id/menu/uuid.jpg").
 */
export async function r2Upload(opts: {
  key: string;
  buffer: Buffer;
  contentType: string;
  cacheControl?: string;
}): Promise<UploadResult> {
  const ctx = getClient();
  if (!ctx) throw new Error('R2 not configured');

  await ctx.client.send(
    new PutObjectCommand({
      Bucket: ctx.bucket,
      Key: opts.key,
      Body: opts.buffer,
      ContentType: opts.contentType,
      CacheControl: opts.cacheControl ?? 'public, max-age=31536000, immutable',
    }),
  );

  return {
    publicUrl: `${ctx.publicBase}/${opts.key}`,
    key: opts.key,
  };
}

/** Supprime un objet R2 par sa clé. No-op silencieuse si non configuré ou erreur. */
export async function r2Delete(key: string): Promise<void> {
  const ctx = getClient();
  if (!ctx) return;
  try {
    await ctx.client.send(new DeleteObjectCommand({ Bucket: ctx.bucket, Key: key }));
  } catch (e) {
    console.warn('[r2] delete failed', e);
  }
}

/** Extrait la clé R2 depuis une URL publique (utile pour supprimer une ancienne image). */
export function r2KeyFromUrl(url: string): string | null {
  const ctx = getClient();
  if (!ctx) return null;
  if (!url.startsWith(ctx.publicBase + '/')) return null;
  return url.slice(ctx.publicBase.length + 1);
}
