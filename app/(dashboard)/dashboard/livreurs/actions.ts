'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { createAdminClient, createClient } from '@/lib/supabase/server';
import { requireRestaurateur } from '@/lib/auth';
import { livreurCreateSchema } from '@/lib/validators/livreur';
import { computeSubscriptionState, fetchPlatformSettings } from '@/lib/subscription';

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
  const { restaurant } = await requireRestaurateur();

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

  const admin = await createAdminClient();

  // Enforcement de la limite de livreurs selon l'offre d'abonnement.
  const settings = await fetchPlatformSettings(admin);
  const state = computeSubscriptionState(restaurant, settings);
  if (state.locked) {
    return {
      ok: false,
      error: 'Votre abonnement a expiré. Souscrivez une offre pour gérer vos livreurs.',
    };
  }
  const limit = state.driverLimit; // null = illimité
  if (limit !== null) {
    const { count: currentCount } = await admin
      .from('profiles')
      .select('id', { count: 'exact', head: true })
      .eq('restaurant_id', restaurant.id)
      .eq('role', 'livreur');
    if ((currentCount ?? 0) >= limit) {
      return {
        ok: false,
        error:
          limit === 0
            ? 'Votre offre ne permet pas d’ajouter de livreur. Choisissez une offre supérieure.'
            : `Votre offre est limitée à ${limit} livreur${limit > 1 ? 's' : ''}. Passez à une offre supérieure pour en ajouter davantage.`,
      };
    }
  }

  // Unicité GLOBALE du username : la contrainte SQL est globale, mais la RLS
  // masquerait les profils d'autres restaurants ou les admins. On vérifie donc
  // via le client admin (bypass RLS), sinon un doublon invisible remonterait en
  // erreur Postgres brute.
  const { data: existing } = await admin
    .from('profiles')
    .select('id')
    .eq('username', parsed.data.username)
    .maybeSingle();
  if (existing) {
    return { ok: false, fieldErrors: { username: 'Cet identifiant est déjà utilisé' } };
  }

  const syntheticEmail = `${parsed.data.username}@livreur.delivery.yelha.net`;

  const { data: created, error: createErr } = await admin.auth.admin.createUser({
    email: syntheticEmail,
    password: parsed.data.password,
    email_confirm: true,
    user_metadata: { username: parsed.data.username, role: 'livreur' },
  });

  if (createErr || !created.user) {
    if (createErr?.message && /already|exist|registered|duplicate/i.test(createErr.message)) {
      return { ok: false, fieldErrors: { username: 'Cet identifiant est déjà utilisé' } };
    }
    return { ok: false, error: createErr?.message ?? 'Création échouée' };
  }

  // Crée le profil livreur (service_role bypass RLS)
  const { error: profileErr } = await admin.from('profiles').upsert(
    {
      id: created.user.id,
      role: 'livreur',
      restaurant_id: restaurant.id,
      username: parsed.data.username,
      full_name: parsed.data.full_name,
      phone: parsed.data.phone || null,
      is_active: true,
    },
    { onConflict: 'id' },
  );

  if (profileErr) {
    // Rollback : supprimer l'utilisateur auth si le profil n'a pas pu être créé
    await admin.auth.admin.deleteUser(created.user.id);
    // Garde-fou (course entre la vérif et l'insert) : mappe la violation
    // d'unicité du username sur un message clair plutôt que l'erreur brute.
    if (profileErr.code === '23505' || /username/i.test(profileErr.message)) {
      return { ok: false, fieldErrors: { username: 'Cet identifiant est déjà utilisé' } };
    }
    return { ok: false, error: profileErr.message };
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
