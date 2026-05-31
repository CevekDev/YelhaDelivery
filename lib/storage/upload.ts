import 'server-only';
import { createClient } from '@/lib/supabase/server';
import { isR2Configured, r2Upload } from './r2';
import { ALLOWED_IMAGE_TYPES, MAX_IMAGE_BYTES } from '@/lib/validators/menu';

export interface ImageUploadResult {
  publicUrl: string;
  /** Provider effectivement utilisé — utile pour debug et migrations. */
  provider: 'r2' | 'supabase';
}

export type ImageUploadError = { error: string };

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

  const ext = file.type === 'image/jpeg' ? 'jpg' : file.type === 'image/png' ? 'png' : 'webp';
  const key = `${restaurantId}/menu/${crypto.randomUUID()}.${ext}`;
  const buffer = Buffer.from(await file.arrayBuffer());

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
