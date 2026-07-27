'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { createAdminClient } from '@/lib/supabase/server';
import { requireRole } from '@/lib/auth';
import type { Restaurant, SubscriptionRequest } from '@/types/database';

export interface AdminSubResult {
  ok: boolean;
  error?: string;
}

/** Ajoute N mois calendaires à une date. */
function addMonths(date: Date, months: number): Date {
  const d = new Date(date);
  d.setMonth(d.getMonth() + months);
  return d;
}

/**
 * Valide une demande d'abonnement : active/prolonge l'abonnement du restaurant
 * et marque la demande comme approuvée. Les renouvellements s'empilent sur la
 * date d'expiration en cours si elle est future.
 */
export async function approveSubscriptionRequestAction(
  formData: FormData,
): Promise<AdminSubResult> {
  const { profile } = await requireRole('admin');
  const id = z.string().uuid().safeParse(formData.get('id'));
  if (!id.success) return { ok: false, error: 'Demande introuvable.' };

  const admin = await createAdminClient();

  const { data: request } = await admin
    .from('subscription_requests')
    .select('*')
    .eq('id', id.data)
    .maybeSingle<SubscriptionRequest>();
  if (!request) return { ok: false, error: 'Demande introuvable.' };
  if (request.status !== 'pending') {
    return { ok: false, error: 'Cette demande a déjà été traitée.' };
  }

  const { data: restaurant } = await admin
    .from('restaurants')
    .select('id, slug, subscription_expires_at, subscription_lifetime')
    .eq('id', request.restaurant_id)
    .maybeSingle<
      Pick<Restaurant, 'id' | 'slug' | 'subscription_expires_at' | 'subscription_lifetime'>
    >();
  if (!restaurant) return { ok: false, error: 'Restaurant introuvable.' };

  const now = new Date();
  const currentExpiry =
    !restaurant.subscription_lifetime && restaurant.subscription_expires_at
      ? new Date(restaurant.subscription_expires_at)
      : null;
  const base = currentExpiry && currentExpiry > now ? currentExpiry : now;
  const newExpiry = addMonths(base, request.months);

  const { error: restErr } = await admin
    .from('restaurants')
    .update({
      subscription_plan_id: request.plan_id,
      subscription_driver_limit: request.driver_limit,
      subscription_expires_at: newExpiry.toISOString(),
      subscription_lifetime: false,
    })
    .eq('id', restaurant.id);
  if (restErr) return { ok: false, error: 'Mise à jour du restaurant échouée.' };

  const { error: reqErr } = await admin
    .from('subscription_requests')
    .update({
      status: 'approved',
      reviewed_by: profile.id,
      reviewed_at: now.toISOString(),
    })
    .eq('id', request.id);
  if (reqErr) return { ok: false, error: 'Mise à jour de la demande échouée.' };

  revalidatePath('/admin/abonnements');
  revalidatePath('/dashboard');
  revalidatePath('/dashboard/abonnement');
  return { ok: true };
}

/** Refuse une demande d'abonnement avec un motif communiqué au restaurateur. */
export async function rejectSubscriptionRequestAction(
  formData: FormData,
): Promise<AdminSubResult> {
  const { profile } = await requireRole('admin');
  const parsed = z
    .object({
      id: z.string().uuid(),
      note: z.string().trim().max(500).optional(),
    })
    .safeParse({ id: formData.get('id'), note: formData.get('note') ?? undefined });
  if (!parsed.success) return { ok: false, error: 'Requête invalide.' };

  const admin = await createAdminClient();
  const { data: updated, error } = await admin
    .from('subscription_requests')
    .update({
      status: 'rejected',
      admin_note: parsed.data.note || 'Paiement non confirmé.',
      reviewed_by: profile.id,
      reviewed_at: new Date().toISOString(),
    })
    .eq('id', parsed.data.id)
    .eq('status', 'pending')
    .select('id')
    .maybeSingle();
  if (error || !updated) {
    return { ok: false, error: 'Impossible de refuser cette demande (déjà traitée ?).' };
  }

  revalidatePath('/admin/abonnements');
  revalidatePath('/dashboard/abonnement');
  return { ok: true };
}
