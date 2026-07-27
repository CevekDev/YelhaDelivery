'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { createAdminClient } from '@/lib/supabase/server';
import { requireRestaurateur } from '@/lib/auth';
import { uploadPaymentProof } from '@/lib/storage/upload';
import {
  computePlanPrice,
  fetchPlatformSettings,
  fetchSubscriptionPlans,
  SUBSCRIPTION_PERIODS,
} from '@/lib/subscription';

export interface SubscriptionActionResult {
  ok: boolean;
  error?: string;
}

const requestSchema = z.object({
  plan_id: z.string().trim().min(1).max(40),
  months: z.coerce.number().int().refine((m) => (SUBSCRIPTION_PERIODS as readonly number[]).includes(m), {
    message: 'Durée invalide',
  }),
});

/**
 * Le restaurateur choisit une offre + une durée, joint une preuve de paiement
 * (virement CCP) → crée une demande « pending » que l'admin validera.
 */
export async function requestSubscriptionAction(
  formData: FormData,
): Promise<SubscriptionActionResult> {
  const { restaurant } = await requireRestaurateur();

  const parsed = requestSchema.safeParse({
    plan_id: formData.get('plan_id'),
    months: formData.get('months'),
  });
  if (!parsed.success) {
    return { ok: false, error: 'Requête invalide. Vérifiez l’offre et la durée choisies.' };
  }

  const admin = await createAdminClient();

  // Une seule demande en attente à la fois.
  const { data: existingPending } = await admin
    .from('subscription_requests')
    .select('id')
    .eq('restaurant_id', restaurant.id)
    .eq('status', 'pending')
    .maybeSingle();
  if (existingPending) {
    return {
      ok: false,
      error: 'Vous avez déjà une demande en attente de validation. Patientez ou contactez le support.',
    };
  }

  const [settings, plans] = await Promise.all([
    fetchPlatformSettings(admin),
    fetchSubscriptionPlans(admin),
  ]);
  const plan = plans.find((p) => p.id === parsed.data.plan_id && p.is_active);
  if (!plan) return { ok: false, error: 'Offre introuvable ou indisponible.' };

  // Preuve de paiement obligatoire.
  const proofFile = formData.get('proof');
  if (!(proofFile instanceof File) || proofFile.size === 0) {
    return { ok: false, error: 'Merci de joindre une capture de votre virement (preuve de paiement).' };
  }
  const upload = await uploadPaymentProof(restaurant.id, proofFile);
  if ('error' in upload) return { ok: false, error: upload.error };

  const quote = computePlanPrice(plan.monthly_price, parsed.data.months, settings);

  const { error } = await admin.from('subscription_requests').insert({
    restaurant_id: restaurant.id,
    plan_id: plan.id,
    plan_name: plan.name,
    months: parsed.data.months,
    monthly_price: plan.monthly_price,
    discount_percent: quote.discountPercent,
    total_price: quote.total,
    driver_limit: plan.driver_limit,
    proof_url: upload.publicUrl,
    status: 'pending',
  });
  if (error) return { ok: false, error: 'Impossible d’enregistrer la demande. Réessayez.' };

  revalidatePath('/dashboard/abonnement');
  revalidatePath('/dashboard');
  return { ok: true };
}

/** Le restaurateur peut annuler sa demande en attente (avant validation). */
export async function cancelSubscriptionRequestAction(
  formData: FormData,
): Promise<SubscriptionActionResult> {
  const { restaurant } = await requireRestaurateur();
  const id = z.string().uuid().safeParse(formData.get('id'));
  if (!id.success) return { ok: false, error: 'Demande introuvable.' };

  const admin = await createAdminClient();
  const { error } = await admin
    .from('subscription_requests')
    .delete()
    .eq('id', id.data)
    .eq('restaurant_id', restaurant.id)
    .eq('status', 'pending');
  if (error) return { ok: false, error: 'Annulation impossible.' };

  revalidatePath('/dashboard/abonnement');
  return { ok: true };
}
