'use server';

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
