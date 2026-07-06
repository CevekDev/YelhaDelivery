'use server';

import { createClient, createAdminClient } from '@/lib/supabase/server';
import { adminChangeUsernameSchema, adminChangePasswordSchema } from '@/lib/validators/auth';

const ADMIN_SYNTH_DOMAIN = '@admin.yelha.net';

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
  if (!user) return { supabase, user: null as null, profile: null };
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
  const { user, profile } = await requireAdminUser();
  if (!user || !profile) return { ok: false, error: 'Session admin invalide.' };

  const parsed = adminChangeUsernameSchema.safeParse({
    username: String(formData.get('username') ?? ''),
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.flatten().fieldErrors.username?.[0] ?? 'Identifiant invalide.' };
  }
  const newUsername = parsed.data.username;
  if (newUsername === profile.username) {
    return { ok: false, error: 'C’est déjà votre identifiant actuel.' };
  }

  const admin = await createAdminClient();

  // Unicité côté profils
  const { data: taken } = await admin
    .from('profiles')
    .select('id')
    .eq('username', newUsername)
    .neq('id', user.id)
    .maybeSingle();
  if (taken) return { ok: false, error: 'Cet identifiant est déjà utilisé.' };

  const newEmail = `${newUsername}${ADMIN_SYNTH_DOMAIN}`;

  // Met à jour l'email d'auth (synthétique) sans flow de confirmation.
  const { error: authErr } = await admin.auth.admin.updateUserById(user.id, {
    email: newEmail,
    email_confirm: true,
  });
  if (authErr) {
    return { ok: false, error: 'Impossible de mettre à jour l’identifiant. Réessayez.' };
  }

  const { error: profErr } = await admin
    .from('profiles')
    .update({ username: newUsername })
    .eq('id', user.id);
  if (profErr) {
    // rollback best-effort de l'email
    await admin.auth.admin.updateUserById(user.id, {
      email: `${profile.username}${ADMIN_SYNTH_DOMAIN}`,
      email_confirm: true,
    });
    return { ok: false, error: 'Impossible de mettre à jour le profil. Réessayez.' };
  }

  return { ok: true, success: `Identifiant changé en « ${newUsername} ». Utilisez-le à la prochaine connexion.` };
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

  // Mise à jour du mot de passe de l'utilisateur connecté (via sa session).
  const { error } = await supabase.auth.updateUser({ password: parsed.data.password });
  if (error) {
    return { ok: false, error: 'Impossible de changer le mot de passe. Réessayez.' };
  }

  return { ok: true, success: 'Mot de passe mis à jour.' };
}
