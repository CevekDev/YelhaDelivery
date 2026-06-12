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

  const offerBadgeRaw = formData.get('offer_badge');
  const offer_badge = offerBadgeRaw && String(offerBadgeRaw).trim() !== '' ? String(offerBadgeRaw).trim() : null;

  const offerDescRaw = formData.get('offer_description');
  const offer_description = offerDescRaw && String(offerDescRaw).trim() !== '' ? String(offerDescRaw).trim() : null;

  const item_type = (formData.get('item_type') as string) || 'dish';

  return menuItemSchema.safeParse({
    category_id,
    name: formData.get('name'),
    description: formData.get('description') ?? '',
    price: Number(formData.get('price')),
    promo_price,
    item_type,
    is_available: formData.get('is_available') !== 'false',
    sort_order: Number(formData.get('sort_order') ?? 0),
    offer_badge,
    offer_description,
  });
}

/** Récupère les extras liés avec leur flag is_free depuis le formulaire. */
function parseLinkedExtras(formData: FormData): Array<{ id: string; is_free: boolean }> {
  return formData
    .getAll('extra_ids[]')
    .map(String)
    .filter((v) => v.length > 0)
    .map((id) => ({
      id,
      is_free: formData.get(`extra_is_free_${id}`) === 'true',
    }));
}

/** Parse les variantes soumises (prix invalides/négatifs ignorés). */
function parseVariants(formData: FormData): Array<{ id?: string; name: string; price: number }> {
  const count = Number(formData.get('variant_count') ?? 0);
  const result: Array<{ id?: string; name: string; price: number }> = [];
  for (let i = 0; i < count; i++) {
    const name = String(formData.get(`variant_name_${i}`) ?? '').trim();
    const price = Number(formData.get(`variant_price_${i}`) ?? 0);
    if (!name) continue;
    if (!Number.isFinite(price) || price < 0) continue;
    const idRaw = formData.get(`variant_id_${i}`);
    result.push({ id: idRaw ? String(idRaw) : undefined, name, price });
  }
  return result;
}

/** Synchronise menu_item_variants (delete + reinsert). */
async function syncVariants(
  supabase: Awaited<ReturnType<typeof createClient>>,
  menuItemId: string,
  variants: Array<{ id?: string; name: string; price: number }>,
): Promise<{ error?: string }> {
  const { error: delErr } = await supabase
    .from('menu_item_variants')
    .delete()
    .eq('menu_item_id', menuItemId);
  if (delErr) return { error: delErr.message };
  if (variants.length === 0) return {};
  const { error } = await supabase.from('menu_item_variants').insert(
    variants.map((v, i) => ({
      menu_item_id: menuItemId,
      name: v.name,
      price: v.price,
      sort_order: i,
    })),
  );
  return error ? { error: error.message } : {};
}

/** Synchronise la table menu_item_extras (avec is_free) après création/mise à jour d'un plat. */
async function syncExtras(
  supabase: Awaited<ReturnType<typeof createClient>>,
  menuItemId: string,
  extras: Array<{ id: string; is_free: boolean }>,
): Promise<{ error?: string }> {
  const { error: delErr } = await supabase
    .from('menu_item_extras')
    .delete()
    .eq('menu_item_id', menuItemId);
  if (delErr) return { error: delErr.message };
  if (extras.length === 0) return {};
  const rows = extras.map((e, i) => ({
    menu_item_id: menuItemId,
    extra_item_id: e.id,
    sort_order: i,
    is_free: e.is_free,
  }));
  const { error } = await supabase.from('menu_item_extras').insert(rows);
  return error ? { error: error.message } : {};
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

  // is_extra dérivé de item_type
  const is_extra = parsed.data.item_type === 'sauce' || parsed.data.item_type === 'supplement';

  const supabase = await createClient();
  const { data: newItem, error } = await supabase
    .from('menu_items')
    .insert({
      restaurant_id: restaurant.id,
      ...parsed.data,
      is_extra,
      description: parsed.data.description || null,
      image_url: uploads.mainUrl ?? null,
      image_urls: uploads.extraUrls,
    })
    .select('id')
    .single();
  if (error) return { ok: false, error: error.message };

  // Extras + variantes uniquement pour les plats et offres
  if (!is_extra) {
    const ex = await syncExtras(supabase, newItem.id, parseLinkedExtras(formData));
    if (ex.error) return { ok: false, error: ex.error };
    const va = await syncVariants(supabase, newItem.id, parseVariants(formData));
    if (va.error) return { ok: false, error: va.error };
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

  // is_extra dérivé de item_type
  const is_extra = parsed.data.item_type === 'sauce' || parsed.data.item_type === 'supplement';

  const supabase = await createClient();

  // Gestion des images supplémentaires existantes
  const keepUrlsRaw = formData.getAll('keep_image_url[]').map(String).filter(Boolean);

  const patch: Record<string, unknown> = {
    ...parsed.data,
    is_extra,
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

  if (!is_extra) {
    const ex = await syncExtras(supabase, id.data, parseLinkedExtras(formData));
    if (ex.error) return { ok: false, error: ex.error };
    const va = await syncVariants(supabase, id.data, parseVariants(formData));
    if (va.error) return { ok: false, error: va.error };
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
