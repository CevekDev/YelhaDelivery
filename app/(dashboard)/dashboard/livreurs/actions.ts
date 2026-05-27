'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { createAdminClient, createClient } from '@/lib/supabase/server';
import { requireRestaurateur } from '@/lib/auth';
import { livreurCreateSchema } from '@/lib/validators/livreur';
import { sendLivreurCreated } from '@/lib/emails/send';

export interface LivreurResult {
  ok: boolean;
  error?: string;
  fieldErrors?: Record<string, string | undefined>;
}

/**
 * Crée un compte livreur. Les livreurs n'ont pas d'email dans l'UI,
 * mais Supabase Auth exige un email -> on en synthétise un :
 *   <username>@livreur.delivery.yelha.net
 * Le livreur se connectera ensuite via username/password (résolu côté login livreur).
 */
export async function createLivreurAction(formData: FormData): Promise<LivreurResult> {
  const { restaurant, profile } = await requireRestaurateur();

  const parsed = livreurCreateSchema.safeParse({
    username: formData.get('username'),
    password: formData.get('password'),
    full_name: formData.get('full_name'),
    phone: formData.get('phone') || '',
  });

  if (!parsed.success) {
    const fe = parsed.error.flatten().fieldErrors;
    return {
      ok: false,
      fieldErrors: {
        username: fe.username?.[0],
        password: fe.password?.[0],
        full_name: fe.full_name?.[0],
        phone: fe.phone?.[0],
      },
    };
  }

  const supabase = await createClient();

  // Empêche un doublon de username au sein du même restaurant (RLS le permet déjà
  // au niveau global via UNIQUE — on remonte un message clair).
  const { data: existing } = await supabase
    .from('profiles')
    .select('id')
    .eq('username', parsed.data.username)
    .maybeSingle();
  if (existing) {
    return { ok: false, fieldErrors: { username: 'Identifiant déjà utilisé' } };
  }

  const admin = await createAdminClient();
  const syntheticEmail = `${parsed.data.username}@livreur.delivery.yelha.net`;

  const { data: created, error: createErr } = await admin.auth.admin.createUser({
    email: syntheticEmail,
    password: parsed.data.password,
    email_confirm: true,
    user_metadata: { username: parsed.data.username, role: 'livreur' },
  });

  if (createErr || !created.user) {
    return { ok: false, error: createErr?.message ?? 'Création échouée' };
  }

  // Crée le profil livreur (service_role bypass RLS)
  const { error: profileErr } = await admin.from('profiles').insert({
    id: created.user.id,
    role: 'livreur',
    restaurant_id: restaurant.id,
    username: parsed.data.username,
    full_name: parsed.data.full_name,
    phone: parsed.data.phone || null,
    is_active: true,
  });

  if (profileErr) {
    // Rollback : supprimer l'utilisateur auth si le profil n'a pas pu être créé
    await admin.auth.admin.deleteUser(created.user.id);
    return { ok: false, error: profileErr.message };
  }

  // Email au propriétaire (best-effort, sans le mot de passe)
  try {
    const { data: ownerAuth } = await admin.auth.admin.getUserById(profile.id);
    const ownerEmail = ownerAuth?.user?.email;
    if (ownerEmail) {
      await sendLivreurCreated({
        to: ownerEmail,
        ownerFullName: profile.full_name ?? 'Restaurateur',
        restaurantName: restaurant.name,
        livreurFullName: parsed.data.full_name,
        username: parsed.data.username,
      });
    }
  } catch (e) {
    console.error('[emails] livreur creds failed', e);
  }

  revalidatePath('/dashboard/livreurs');
  return { ok: true };
}

export async function toggleLivreurAction(formData: FormData): Promise<LivreurResult> {
  const { restaurant } = await requireRestaurateur();
  const id = z.string().uuid().safeParse(formData.get('id'));
  const active = formData.get('is_active') === 'true';
  if (!id.success) return { ok: false, error: 'ID invalide' };

  const supabase = await createClient();
  // Vérification : le livreur appartient bien à ce restaurant
  const { data: target } = await supabase
    .from('profiles')
    .select('id, restaurant_id, role')
    .eq('id', id.data)
    .maybeSingle();
  if (!target || target.role !== 'livreur' || target.restaurant_id !== restaurant.id) {
    return { ok: false, error: 'Livreur introuvable' };
  }

  const admin = await createAdminClient();
  const { error } = await admin
    .from('profiles')
    .update({ is_active: !active })
    .eq('id', id.data);
  if (error) return { ok: false, error: error.message };
  revalidatePath('/dashboard/livreurs');
  return { ok: true };
}
