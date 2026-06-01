'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { requireRestaurateur } from '@/lib/auth';
import { menuCategorySchema, menuItemSchema } from '@/lib/validators/menu';
import { uploadMenuImage } from '@/lib/storage/upload';

export interface FormResult {
  ok: boolean;
  error?: string;
  fieldErrors?: Record<string, string | undefined>;
}

// ============================ Catégories ============================

export async function createCategoryAction(formData: FormData): Promise<FormResult> {
  const { restaurant } = await requireRestaurateur();
  const parsed = menuCategorySchema.safeParse({
    name: formData.get('name'),
    sort_order: Number(formData.get('sort_order') ?? 0),
    is_visible: formData.get('is_visible') !== 'false',
  });
  if (!parsed.success) {
    const fe = parsed.error.flatten().fieldErrors;
    return { ok: false, fieldErrors: { name: fe.name?.[0] } };
  }
  const supabase = await createClient();
  const { error } = await supabase
    .from('menu_categories')
    .insert({ ...parsed.data, restaurant_id: restaurant.id });
  if (error) return { ok: false, error: error.message };
  revalidatePath('/dashboard/menu');
  return { ok: true };
}

export async function deleteCategoryAction(formData: FormData): Promise<FormResult> {
  const { restaurant } = await requireRestaurateur();
  const id = z.string().uuid().safeParse(formData.get('id'));
  if (!id.success) return { ok: false, error: 'ID invalide' };
  const supabase = await createClient();
  const { error } = await supabase
    .from('menu_categories')
    .delete()
    .eq('id', id.data)
    .eq('restaurant_id', restaurant.id);
  if (error) return { ok: false, error: error.message };
  revalidatePath('/dashboard/menu');
  return { ok: true };
}

// ============================ Images ============================

async function uploadImageFile(
  restaurantId: string,
  file: File,
): Promise<string | { error: string }> {
  const res = await uploadMenuImage(restaurantId, file);
  if ('error' in res) return res;
  return res.publicUrl;
}

/** Upload la photo principale + jusqu'à 3 photos supplémentaires. */
async function uploadAllImages(
  restaurantId: string,
  formData: FormData,
): Promise<{ mainUrl: string | null; extraUrls: string[] } | { error: string }> {
  const mainFile = formData.get('image');
  let mainUrl: string | null = null;
  if (mainFile instanceof File && mainFile.size > 0) {
    const res = await uploadImageFile(restaurantId, mainFile);
    if (typeof res === 'object' && 'error' in res) return res;
    mainUrl = res;
  }

  const extraUrls: string[] = [];
  for (let i = 1; i <= 3; i++) {
    const file = formData.get(`image_${i}`);
    if (!(file instanceof File) || file.size === 0) continue;
    const res = await uploadImageFile(restaurantId, file);
    if (typeof res === 'object' && 'error' in res) return res;
    extraUrls.push(res);
  }

  return { mainUrl, extraUrls };
}

// ============================ Plats ============================

function parseItemForm(formData: FormData) {
  const rawCategory = formData.get('category_id');
  const category_id = rawCategory && String(rawCategory).length > 0 ? String(rawCategory) : null;

  const promoRaw = formData.get('promo_price');
  const promo_price =
    promoRaw && String(promoRaw).trim() !== '' ? Number(promoRaw) : null;

  return menuItemSchema.safeParse({
    category_id,
    name: formData.get('name'),
    description: formData.get('description') ?? '',
    price: Number(formData.get('price')),
    promo_price,
    is_extra: formData.get('is_extra') === 'true',
    is_available: formData.get('is_available') !== 'false',
    sort_order: Number(formData.get('sort_order') ?? 0),
  });
}

/** Récupère les IDs des extras cochés dans le formulaire. */
function parseLinkedExtraIds(formData: FormData): string[] {
  return formData.getAll('extra_ids[]').map(String).filter((v) => v.length > 0);
}

/** Synchronise la table menu_item_extras après création/mise à jour d'un plat. */
async function syncExtras(
  supabase: Awaited<ReturnType<typeof createClient>>,
  menuItemId: string,
  extraIds: string[],
) {
  // Supprime toutes les liaisons existantes pour ce plat
  await supabase.from('menu_item_extras').delete().eq('menu_item_id', menuItemId);

  if (extraIds.length === 0) return;

  const rows = extraIds.map((extra_item_id, i) => ({
    menu_item_id: menuItemId,
    extra_item_id,
    sort_order: i,
  }));
  await supabase.from('menu_item_extras').insert(rows);
}

export async function createMenuItemAction(formData: FormData): Promise<FormResult> {
  const { restaurant } = await requireRestaurateur();
  const parsed = parseItemForm(formData);
  if (!parsed.success) {
    const fe = parsed.error.flatten().fieldErrors;
    return {
      ok: false,
      fieldErrors: {
        name: fe.name?.[0],
        price: fe.price?.[0],
        description: fe.description?.[0],
      },
    };
  }

  const uploads = await uploadAllImages(restaurant.id, formData);
  if ('error' in uploads) return { ok: false, error: uploads.error };

  const supabase = await createClient();
  const { data: newItem, error } = await supabase
    .from('menu_items')
    .insert({
      restaurant_id: restaurant.id,
      ...parsed.data,
      description: parsed.data.description || null,
      image_url: uploads.mainUrl ?? null,
      image_urls: uploads.extraUrls,
    })
    .select('id')
    .single();
  if (error) return { ok: false, error: error.message };

  // Si ce n'est pas un supplément lui-même, on lie les extras sélectionnés
  if (!parsed.data.is_extra) {
    const extraIds = parseLinkedExtraIds(formData);
    await syncExtras(supabase, newItem.id, extraIds);
  }

  revalidatePath('/dashboard/menu');
  redirect('/dashboard/menu');
}

export async function updateMenuItemAction(formData: FormData): Promise<FormResult> {
  const { restaurant } = await requireRestaurateur();
  const id = z.string().uuid().safeParse(formData.get('id'));
  if (!id.success) return { ok: false, error: 'ID invalide' };

  const parsed = parseItemForm(formData);
  if (!parsed.success) {
    const fe = parsed.error.flatten().fieldErrors;
    return {
      ok: false,
      fieldErrors: {
        name: fe.name?.[0],
        price: fe.price?.[0],
        description: fe.description?.[0],
      },
    };
  }

  const uploads = await uploadAllImages(restaurant.id, formData);
  if ('error' in uploads) return { ok: false, error: uploads.error };

  const supabase = await createClient();

  // Gestion des images supplémentaires existantes
  const keepUrlsRaw = formData.getAll('keep_image_url[]').map(String).filter(Boolean);

  const patch: Record<string, unknown> = {
    ...parsed.data,
    description: parsed.data.description || null,
    image_urls: [...keepUrlsRaw, ...uploads.extraUrls],
  };
  if (uploads.mainUrl) patch.image_url = uploads.mainUrl;

  const { error } = await supabase
    .from('menu_items')
    .update(patch)
    .eq('id', id.data)
    .eq('restaurant_id', restaurant.id);
  if (error) return { ok: false, error: error.message };

  // Sync extras
  if (!parsed.data.is_extra) {
    const extraIds = parseLinkedExtraIds(formData);
    await syncExtras(supabase, id.data, extraIds);
  }

  revalidatePath('/dashboard/menu');
  redirect('/dashboard/menu');
}

export async function deleteMenuItemAction(formData: FormData): Promise<FormResult> {
  const { restaurant } = await requireRestaurateur();
  const id = z.string().uuid().safeParse(formData.get('id'));
  if (!id.success) return { ok: false, error: 'ID invalide' };
  const supabase = await createClient();
  const { error } = await supabase
    .from('menu_items')
    .delete()
    .eq('id', id.data)
    .eq('restaurant_id', restaurant.id);
  if (error) return { ok: false, error: error.message };
  revalidatePath('/dashboard/menu');
  return { ok: true };
}

export async function toggleMenuItemAvailabilityAction(formData: FormData): Promise<FormResult> {
  const { restaurant } = await requireRestaurateur();
  const id = z.string().uuid().safeParse(formData.get('id'));
  const isAvailable = z.coerce.boolean().parse(formData.get('is_available') === 'true');
  if (!id.success) return { ok: false, error: 'ID invalide' };
  const supabase = await createClient();
  const { error } = await supabase
    .from('menu_items')
    .update({ is_available: !isAvailable })
    .eq('id', id.data)
    .eq('restaurant_id', restaurant.id);
  if (error) return { ok: false, error: error.message };
  revalidatePath('/dashboard/menu');
  return { ok: true };
}
