'use server';

import { revalidatePath, revalidateTag } from 'next/cache';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { adminChangeUsernameSchema, adminChangePasswordSchema } from '@/lib/validators/auth';

export interface ActionResult {
  ok: boolean;
  error?: string;
  success?: string;
}

/** Récupère l'utilisateur connecté et vérifie qu'il est admin actif. */
async function requireAdminUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { supabase, user: null, profile: null };
  const { data: profile } = await supabase
    .from('profiles')
    .select('id, role, is_active, username')
    .eq('id', user.id)
    .maybeSingle<{ id: string; role: string; is_active: boolean; username: string | null }>();
  if (!profile || profile.role !== 'admin' || !profile.is_active) {
    return { supabase, user: null, profile: null };
  }
  return { supabase, user, profile };
}

export async function changeAdminUsernameAction(formData: FormData): Promise<ActionResult> {
  const { supabase, user, profile } = await requireAdminUser();
  if (!user || !profile) return { ok: false, error: 'Session admin invalide.' };

  const parsed = adminChangeUsernameSchema.safeParse({
    username: String(formData.get('username') ?? ''),
  });
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.flatten().fieldErrors.username?.[0] ?? 'Identifiant invalide.',
    };
  }
  const newUsername = parsed.data.username;
  if (newUsername === profile.username) {
    return { ok: false, error: 'C’est déjà votre identifiant actuel.' };
  }

  // Fonction SECURITY DEFINER : met à jour auth.users + identities + profiles.
  const { error } = await supabase.rpc('admin_set_username', { p_new_username: newUsername });
  if (error) {
    const msg = error.message.includes('déjà utilisé')
      ? 'Cet identifiant est déjà utilisé.'
      : 'Impossible de changer l’identifiant. Réessayez.';
    return { ok: false, error: msg };
  }

  return {
    ok: true,
    success: `Identifiant changé en « ${newUsername} ». Utilisez-le à la prochaine connexion.`,
  };
}

export async function changeAdminPasswordAction(formData: FormData): Promise<ActionResult> {
  const { supabase, user, profile } = await requireAdminUser();
  if (!user || !profile) return { ok: false, error: 'Session admin invalide.' };

  const parsed = adminChangePasswordSchema.safeParse({
    password: String(formData.get('password') ?? ''),
    confirm: String(formData.get('confirm') ?? ''),
  });
  if (!parsed.success) {
    const fe = parsed.error.flatten().fieldErrors;
    return { ok: false, error: fe.confirm?.[0] ?? fe.password?.[0] ?? 'Mot de passe invalide.' };
  }

  // Met à jour le mot de passe de l'utilisateur connecté via sa session.
  const { error } = await supabase.auth.updateUser({ password: parsed.data.password });
  if (error) {
    const msg = /at least|6 char|weak/i.test(error.message)
      ? 'Mot de passe trop court (min 6 caractères).'
      : 'Impossible de changer le mot de passe. Réessayez.';
    return { ok: false, error: msg };
  }

  return { ok: true, success: 'Mot de passe mis à jour.' };
}

// =====================================================================
// Configuration des abonnements (essai, remises, paiement)
// =====================================================================

const platformSettingsSchema = z.object({
  trial_days: z.coerce.number().int().min(0).max(365),
  discount_6m_percent: z.coerce.number().int().min(0).max(100),
  discount_12m_percent: z.coerce.number().int().min(0).max(100),
  whatsapp_number: z.string().trim().max(30),
  ccp_number: z.string().trim().max(50),
  ccp_name: z.string().trim().max(120),
  payment_note: z.string().trim().max(500),
});

export async function updatePlatformSettingsAction(formData: FormData): Promise<ActionResult> {
  const { supabase, user, profile } = await requireAdminUser();
  if (!user || !profile) return { ok: false, error: 'Session admin invalide.' };

  const parsed = platformSettingsSchema.safeParse({
    trial_days: formData.get('trial_days'),
    discount_6m_percent: formData.get('discount_6m_percent'),
    discount_12m_percent: formData.get('discount_12m_percent'),
    whatsapp_number: formData.get('whatsapp_number') ?? '',
    ccp_number: formData.get('ccp_number') ?? '',
    ccp_name: formData.get('ccp_name') ?? '',
    payment_note: formData.get('payment_note') ?? '',
  });
  if (!parsed.success) {
    return { ok: false, error: 'Valeurs invalides. Vérifiez les champs.' };
  }

  const { error } = await supabase
    .from('platform_settings')
    .update({ ...parsed.data, updated_at: new Date().toISOString() })
    .eq('id', 1);
  if (error) return { ok: false, error: 'Enregistrement impossible. Réessayez.' };

  revalidatePath('/admin/parametres');
  revalidateTag('subscription-plans'); // rafraîchit la grille tarifaire de la landing
  return { ok: true, success: 'Paramètres d’abonnement enregistrés.' };
}

const planUpdateSchema = z.object({
  id: z.string().trim().min(1).max(40),
  name: z.string().trim().min(1).max(60),
  monthly_price: z.coerce.number().min(0).max(1_000_000),
  description: z.string().trim().max(120),
  is_active: z.boolean(),
});

export async function updateSubscriptionPlanAction(formData: FormData): Promise<ActionResult> {
  const { supabase, user, profile } = await requireAdminUser();
  if (!user || !profile) return { ok: false, error: 'Session admin invalide.' };

  // Limite de livreurs : vide/"illimité" => null.
  const rawLimit = String(formData.get('driver_limit') ?? '').trim();
  let driverLimit: number | null = null;
  if (rawLimit !== '') {
    const n = Number(rawLimit);
    if (!Number.isInteger(n) || n < 0 || n > 1000) {
      return { ok: false, error: 'Limite de livreurs invalide.' };
    }
    driverLimit = n;
  }

  const parsed = planUpdateSchema.safeParse({
    id: formData.get('id'),
    name: formData.get('name'),
    monthly_price: formData.get('monthly_price'),
    description: formData.get('description') ?? '',
    is_active: formData.get('is_active') === 'on' || formData.get('is_active') === 'true',
  });
  if (!parsed.success) {
    return { ok: false, error: 'Valeurs invalides pour cette offre.' };
  }

  const { error } = await supabase
    .from('subscription_plans')
    .update({
      name: parsed.data.name,
      monthly_price: parsed.data.monthly_price,
      description: parsed.data.description,
      is_active: parsed.data.is_active,
      driver_limit: driverLimit,
      updated_at: new Date().toISOString(),
    })
    .eq('id', parsed.data.id);
  if (error) return { ok: false, error: 'Enregistrement impossible. Réessayez.' };

  revalidatePath('/admin/parametres');
  revalidatePath('/dashboard/abonnement');
  revalidateTag('subscription-plans'); // rafraîchit la grille tarifaire de la landing
  return { ok: true, success: `Offre « ${parsed.data.name} » enregistrée.` };
}
