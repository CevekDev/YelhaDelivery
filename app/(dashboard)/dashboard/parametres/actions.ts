'use server';

import { revalidatePath } from 'next/cache';
import { createAdminClient, createClient } from '@/lib/supabase/server';
import { requireRole } from '@/lib/auth';
import { restaurantUpdateSchema } from '@/lib/validators/restaurant';
import { uploadMenuImage } from '@/lib/storage/upload';

export interface SettingsResult {
  ok: boolean;
  error?: string;
  fieldErrors?: Record<string, string | undefined>;
}

export async function updateRestaurantAction(formData: FormData): Promise<SettingsResult> {
  const { profile } = await requireRole('restaurateur');

  const freeDeliveryRaw = formData.get('free_delivery_above');
  const freeDelivery =
    freeDeliveryRaw && String(freeDeliveryRaw).trim() !== '' ? Number(freeDeliveryRaw) : undefined;

  const parsed = restaurantUpdateSchema.safeParse({
    name: formData.get('name'),
    slug: formData.get('slug'),
    description: formData.get('description') ?? '',
    address: formData.get('address') ?? '',
    city: formData.get('city') ?? '',
    phone: formData.get('phone') || '',
    delivery_fee: Number(formData.get('delivery_fee')),
    min_order: Number(formData.get('min_order')),
    estimated_delivery_time: Number(formData.get('estimated_delivery_time')),
    is_open: formData.get('is_open') === 'true',
    accept_orders: formData.get('accept_orders') === 'true',
    banner_text: formData.get('banner_text') ?? '',
    free_delivery_above: freeDelivery && freeDelivery > 0 ? freeDelivery : undefined,
  });

  if (!parsed.success) {
    const fe = parsed.error.flatten().fieldErrors;
    return {
      ok: false,
      fieldErrors: Object.fromEntries(
        Object.entries(fe).map(([k, v]) => [k, Array.isArray(v) ? v[0] : undefined]),
      ),
    };
  }

  const supabase = await createClient();
  const { data: existing } = await supabase
    .from('restaurants')
    .select('id, slug')
    .eq('owner_id', profile.id)
    .maybeSingle<{ id: string; slug: string }>();

  // Slug unicité (vérification explicite -> message clair)
  if (!existing || existing.slug !== parsed.data.slug) {
    const { data: slugTaken } = await supabase
      .from('restaurants')
      .select('id')
      .eq('slug', parsed.data.slug)
      .maybeSingle();
    if (slugTaken && (!existing || slugTaken.id !== existing.id)) {
      return { ok: false, fieldErrors: { slug: 'Ce slug est déjà utilisé' } };
    }
  }

  // Upload bannière si présente
  let bannerImageUrl: string | null | undefined;
  const bannerFile = formData.get('banner_image');
  if (bannerFile instanceof File && bannerFile.size > 0 && existing) {
    const up = await uploadMenuImage(existing.id, bannerFile);
    if ('error' in up) return { ok: false, error: up.error };
    bannerImageUrl = up.publicUrl;
  }

  const removeBanner = formData.get('remove_banner_image') === 'true';

  const payload: Record<string, unknown> = {
    ...parsed.data,
    description: parsed.data.description || null,
    address: parsed.data.address || null,
    city: parsed.data.city || null,
    phone: parsed.data.phone || null,
    banner_text: parsed.data.banner_text || null,
    free_delivery_above: parsed.data.free_delivery_above ?? null,
  };
  if (removeBanner) payload.banner_image_url = null;
  else if (bannerImageUrl !== undefined) payload.banner_image_url = bannerImageUrl;

  if (existing) {
    const { error } = await supabase
      .from('restaurants')
      .update(payload)
      .eq('id', existing.id)
      .eq('owner_id', profile.id);
    if (error) return { ok: false, error: error.message };
  } else {
    // Premier setup : on doit créer le restaurant via admin (RLS insert restreint aux admins)
    const admin = await createAdminClient();
    const { error } = await admin.from('restaurants').insert({ ...payload, owner_id: profile.id });
    if (error) return { ok: false, error: error.message };
  }

  revalidatePath('/dashboard');
  revalidatePath('/dashboard/parametres');
  return { ok: true };
}

export async function toggleOpenAction(formData: FormData): Promise<SettingsResult> {
  const { profile } = await requireRole('restaurateur');
  const isOpen = formData.get('is_open') === 'true';
  const supabase = await createClient();
  const { error } = await supabase
    .from('restaurants')
    .update({ is_open: !isOpen })
    .eq('owner_id', profile.id);
  if (error) return { ok: false, error: error.message };
  revalidatePath('/dashboard');
  revalidatePath('/dashboard/parametres');
  return { ok: true };
}
