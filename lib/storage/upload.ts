import 'server-only';
import { createAdminClient, createClient } from '@/lib/supabase/server';
import { isR2Configured, r2Delete, r2KeyFromUrl, r2Upload } from './r2';
import { ALLOWED_IMAGE_TYPES, MAX_IMAGE_BYTES } from '@/lib/validators/menu';

export interface ImageUploadResult {
  publicUrl: string;
  /** Provider effectivement utilisé — utile pour debug et migrations. */
  provider: 'r2' | 'supabase';
}

export type ImageUploadError = { error: string };

/**
 * Détecte le vrai type d'une image à partir de ses « magic bytes » (signature
 * binaire), indépendamment du `file.type` déclaré par le navigateur (falsifiable).
 * Retourne le type MIME réel, ou null si non reconnu.
 */
function detectImageType(buf: Buffer): 'image/jpeg' | 'image/png' | 'image/webp' | null {
  if (buf.length >= 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) {
    return 'image/jpeg';
  }
  if (
    buf.length >= 8 &&
    buf[0] === 0x89 &&
    buf[1] === 0x50 &&
    buf[2] === 0x4e &&
    buf[3] === 0x47 &&
    buf[4] === 0x0d &&
    buf[5] === 0x0a &&
    buf[6] === 0x1a &&
    buf[7] === 0x0a
  ) {
    return 'image/png';
  }
  // WebP : "RIFF"...."WEBP"
  if (
    buf.length >= 12 &&
    buf.toString('ascii', 0, 4) === 'RIFF' &&
    buf.toString('ascii', 8, 12) === 'WEBP'
  ) {
    return 'image/webp';
  }
  return null;
}

/**
 * Upload une image d'un plat. Utilise Cloudflare R2 si configuré, sinon Supabase Storage.
 * Valide la taille + le type avant upload.
 */
export async function uploadMenuImage(
  restaurantId: string,
  file: File,
): Promise<ImageUploadResult | ImageUploadError> {
  if (file.size > MAX_IMAGE_BYTES) return { error: 'Image trop volumineuse (max 5 Mo)' };
  if (!ALLOWED_IMAGE_TYPES.includes(file.type as (typeof ALLOWED_IMAGE_TYPES)[number])) {
    return { error: 'Type d’image non autorisé (jpg, png, webp uniquement)' };
  }

  const buffer = Buffer.from(await file.arrayBuffer());

  // Validation du CONTENU réel (magic bytes), pas seulement du type déclaré :
  // empêche l'upload d'un fichier malveillant déguisé en image.
  const realType = detectImageType(buffer);
  if (!realType || realType !== file.type) {
    return { error: 'Fichier image invalide ou corrompu (jpg, png, webp uniquement)' };
  }

  const ext = realType === 'image/jpeg' ? 'jpg' : realType === 'image/png' ? 'png' : 'webp';
  const key = `${restaurantId}/menu/${crypto.randomUUID()}.${ext}`;

  if (isR2Configured()) {
    try {
      const { publicUrl } = await r2Upload({ key, buffer, contentType: file.type });
      return { publicUrl, provider: 'r2' };
    } catch (e) {
      console.error('[upload] r2 failed, falling back to supabase', e);
      // fallthrough vers Supabase
    }
  }

  // Fallback Supabase Storage (bucket "restaurant-images")
  const supabase = await createClient();
  const { error } = await supabase.storage
    .from('restaurant-images')
    .upload(key, buffer, { contentType: file.type, upsert: false });
  if (error) return { error: `Upload échoué : ${error.message}` };

  const { data } = supabase.storage.from('restaurant-images').getPublicUrl(key);
  return { publicUrl: data.publicUrl, provider: 'supabase' };
}

// Marqueur d'une URL publique Supabase Storage → permet d'en extraire la clé.
const SUPABASE_PUBLIC_MARKER = '/storage/v1/object/public/restaurant-images/';

/**
 * Supprime des images du stockage (R2 et/ou Supabase) à partir de leurs URLs
 * publiques. Évite les images orphelines lors d'un remplacement/retrait.
 * Best-effort : ne lève jamais, ignore les URLs vides ou non reconnues.
 */
export async function deleteStoredImages(urls: (string | null | undefined)[]): Promise<void> {
  const r2Keys: string[] = [];
  const supabaseKeys: string[] = [];

  for (const url of urls) {
    if (!url) continue;
    const r2Key = r2KeyFromUrl(url);
    if (r2Key) {
      r2Keys.push(r2Key);
      continue;
    }
    const idx = url.indexOf(SUPABASE_PUBLIC_MARKER);
    if (idx >= 0) {
      supabaseKeys.push(decodeURIComponent(url.slice(idx + SUPABASE_PUBLIC_MARKER.length)));
    }
  }

  const tasks: Promise<unknown>[] = r2Keys.map((k) => r2Delete(k));
  if (supabaseKeys.length > 0) {
    tasks.push(
      (async () => {
        try {
          // Client admin : la suppression storage est fiable (pas de dépendance RLS).
          const admin = await createAdminClient();
          await admin.storage.from('restaurant-images').remove(supabaseKeys);
        } catch (e) {
          console.warn('[storage] suppression Supabase échouée', e);
        }
      })(),
    );
  }
  await Promise.all(tasks);
}

/** Supprime une seule image (best-effort). */
export async function deleteStoredImage(url: string | null | undefined): Promise<void> {
  await deleteStoredImages([url]);
}
