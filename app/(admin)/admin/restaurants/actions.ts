'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { createAdminClient } from '@/lib/supabase/server';
import { requireRole } from '@/lib/auth';
import { slugSchema } from '@/lib/validators/common';
import { sendRestaurateurWelcome } from '@/lib/emails/send';

const createRestaurateurSchema = z.object({
  restaurant_name: z.string().trim().min(1).max(120),
  slug: slugSchema,
  owner_email: z.string().trim().email().max(254),
  owner_password: z.string().min(8).max(128),
  owner_full_name: z.string().trim().min(1).max(120),
});

export interface AdminActionResult {
  ok: boolean;
  error?: string;
  fieldErrors?: Record<string, string | undefined>;
}

export async function createRestaurateurAccountAction(
  formData: FormData,
): Promise<AdminActionResult> {
  await requireRole('admin');

  const parsed = createRestaurateurSchema.safeParse({
    restaurant_name: formData.get('restaurant_name'),
    slug: formData.get('slug'),
    owner_email: formData.get('owner_email'),
    owner_password: formData.get('owner_password'),
    owner_full_name: formData.get('owner_full_name'),
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

  const admin = await createAdminClient();

  // Vérifier unicité slug + email
  const [{ data: slugTaken }, { data: usersList }] = await Promise.all([
    admin.from('restaurants').select('id').eq('slug', parsed.data.slug).maybeSingle(),
    admin.auth.admin.listUsers({ page: 1, perPage: 1000 }),
  ]);
  if (slugTaken) return { ok: false, fieldErrors: { slug: 'Slug déjà utilisé' } };

  type AuthListUser = { id: string; email?: string | null };
  const emailExists = (usersList?.users as AuthListUser[] | undefined)?.some(
    (u) => u.email?.toLowerCase() === parsed.data.owner_email.toLowerCase(),
  );
  if (emailExists) return { ok: false, fieldErrors: { owner_email: 'Email déjà utilisé' } };

  // 1. Crée l'utilisateur auth
  const { data: created, error: createErr } = await admin.auth.admin.createUser({
    email: parsed.data.owner_email,
    password: parsed.data.owner_password,
    email_confirm: true,
    user_metadata: { role: 'restaurateur' },
  });
  if (createErr || !created.user) {
    return { ok: false, error: createErr?.message ?? 'Création échouée' };
  }

  // 2. Crée le profil
  const { error: profileErr } = await admin.from('profiles').upsert(
    {
      id: created.user.id,
      role: 'restaurateur',
      full_name: parsed.data.owner_full_name,
      is_active: true,
    },
    { onConflict: 'id' },
  );
  if (profileErr) {
    await admin.auth.admin.deleteUser(created.user.id);
    return { ok: false, error: profileErr.message };
  }

  // 3. Crée le restaurant
  const { data: restaurant, error: restErr } = await admin
    .from('restaurants')
    .insert({
      owner_id: created.user.id,
      name: parsed.data.restaurant_name,
      slug: parsed.data.slug,
      status: 'active',
      is_open: false,
      accept_orders: true,
    })
    .select('id')
    .single();

  if (restErr || !restaurant) {
    await admin.from('profiles').delete().eq('id', created.user.id);
    await admin.auth.admin.deleteUser(created.user.id);
    return { ok: false, error: restErr?.message ?? 'Création restaurant échouée' };
  }

  // 4. Email de bienvenue (best-effort, n'annule pas la création si l'email échoue)
  void sendRestaurateurWelcome({
    to: parsed.data.owner_email,
    fullName: parsed.data.owner_full_name,
    restaurantName: parsed.data.restaurant_name,
    slug: parsed.data.slug,
  }).catch((e) => console.error('[emails] welcome failed', e));

  revalidatePath('/admin/restaurants');
  redirect('/admin/restaurants');
}

export async function setRestaurantStatusAction(formData: FormData): Promise<AdminActionResult> {
  await requireRole('admin');
  const parsed = z
    .object({
      id: z.string().uuid(),
      status: z.enum(['active', 'suspended', 'pending']),
    })
    .safeParse({ id: formData.get('id'), status: formData.get('status') });
  if (!parsed.success) return { ok: false, error: 'Requête invalide' };

  const admin = await createAdminClient();
  const { error } = await admin
    .from('restaurants')
    .update({ status: parsed.data.status })
    .eq('id', parsed.data.id);
  if (error) return { ok: false, error: error.message };
  revalidatePath('/admin/restaurants');
  revalidatePath(`/admin/restaurants/${parsed.data.id}`);
  return { ok: true };
}
