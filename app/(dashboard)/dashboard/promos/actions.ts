'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { requireRestaurateur } from '@/lib/auth';
import { promoCodeSchema } from '@/lib/validators/promo';

export interface PromoResult {
  ok: boolean;
  error?: string;
  fieldErrors?: Record<string, string | undefined>;
}

export async function createPromoAction(formData: FormData): Promise<PromoResult> {
  const { restaurant } = await requireRestaurateur();

  const rawExpires = formData.get('expires_at');
  const expires_at =
    rawExpires && String(rawExpires).trim() !== ''
      ? new Date(String(rawExpires) + 'T23:59:59').toISOString()
      : null;

  const rawMaxUses = formData.get('max_uses');
  const max_uses =
    rawMaxUses && String(rawMaxUses).trim() !== '' ? Number(rawMaxUses) : null;

  const parsed = promoCodeSchema.safeParse({
    code: formData.get('code'),
    discount_type: formData.get('discount_type'),
    discount_value: Number(formData.get('discount_value')),
    min_order: Number(formData.get('min_order') ?? 0),
    max_uses,
    expires_at,
    is_active: formData.get('is_active') !== 'false',
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
  const { error } = await supabase.from('promo_codes').insert({
    restaurant_id: restaurant.id,
    ...parsed.data,
    max_uses: parsed.data.max_uses ?? null,
    expires_at: parsed.data.expires_at ?? null,
  });
  if (error) {
    if (error.message.includes('duplicate key')) {
      return { ok: false, fieldErrors: { code: 'Ce code existe déjà' } };
    }
    return { ok: false, error: error.message };
  }
  revalidatePath('/dashboard/promos');
  return { ok: true };
}

export async function togglePromoAction(formData: FormData): Promise<PromoResult> {
  const { restaurant } = await requireRestaurateur();
  const id = z.string().uuid().safeParse(formData.get('id'));
  const active = formData.get('is_active') === 'true';
  if (!id.success) return { ok: false, error: 'ID invalide' };

  const supabase = await createClient();
  const { error } = await supabase
    .from('promo_codes')
    .update({ is_active: !active })
    .eq('id', id.data)
    .eq('restaurant_id', restaurant.id);
  if (error) return { ok: false, error: error.message };
  revalidatePath('/dashboard/promos');
  return { ok: true };
}

export async function deletePromoAction(formData: FormData): Promise<PromoResult> {
  const { restaurant } = await requireRestaurateur();
  const id = z.string().uuid().safeParse(formData.get('id'));
  if (!id.success) return { ok: false, error: 'ID invalide' };

  const supabase = await createClient();
  const { error } = await supabase
    .from('promo_codes')
    .delete()
    .eq('id', id.data)
    .eq('restaurant_id', restaurant.id);
  if (error) return { ok: false, error: error.message };
  revalidatePath('/dashboard/promos');
  return { ok: true };
}
