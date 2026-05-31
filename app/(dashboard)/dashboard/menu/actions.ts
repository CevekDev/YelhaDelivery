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

// ============================ Plats ============================

async function uploadImageIfPresent(
  restaurantId: string,
  formData: FormData,
): Promise<string | null | { error: string }> {
  const file = formData.get('image');
  if (!(file instanceof File) || file.size === 0) return null;
  const res = await uploadMenuImage(restaurantId, file);
  if ('error' in res) return res;
  return res.publicUrl;
}

const itemFormSchema = menuItemSchema.extend({
  // category_id arrive en string vide depuis le form -> null
});

function parseItemForm(formData: FormData) {
  const rawCategory = formData.get('category_id');
  const category_id = rawCategory && String(rawCategory).length > 0 ? String(rawCategory) : null;
  return menuItemSchema.safeParse({
    category_id,
    name: formData.get('name'),
    description: formData.get('description') ?? '',
    price: Number(formData.get('price')),
    is_available: formData.get('is_available') !== 'false',
    sort_order: Number(formData.get('sort_order') ?? 0),
  });
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

  const upload = await uploadImageIfPresent(restaurant.id, formData);
  if (upload && typeof upload === 'object' && 'error' in upload) {
    return { ok: false, error: upload.error };
  }

  const supabase = await createClient();
  const { error } = await supabase.from('menu_items').insert({
    restaurant_id: restaurant.id,
    ...parsed.data,
    description: parsed.data.description || null,
    image_url: typeof upload === 'string' ? upload : null,
  });
  if (error) return { ok: false, error: error.message };
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

  const upload = await uploadImageIfPresent(restaurant.id, formData);
  if (upload && typeof upload === 'object' && 'error' in upload) {
    return { ok: false, error: upload.error };
  }

  const supabase = await createClient();
  const patch: Record<string, unknown> = {
    ...parsed.data,
    description: parsed.data.description || null,
  };
  if (typeof upload === 'string') patch.image_url = upload;

  const { error } = await supabase
    .from('menu_items')
    .update(patch)
    .eq('id', id.data)
    .eq('restaurant_id', restaurant.id);
  if (error) return { ok: false, error: error.message };
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

// avoid unused import lint
void itemFormSchema;
