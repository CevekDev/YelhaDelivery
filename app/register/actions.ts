'use server';

import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { createAdminClient, createClient } from '@/lib/supabase/server';
import { restaurateurRegisterSchema } from '@/lib/validators/register';
import { checkSignupRateLimit } from '@/lib/rate-limit';
import { sendRestaurateurWelcome } from '@/lib/emails/send';

export interface RegisterState {
  ok?: boolean;
  error?: string;
  fieldErrors?: Record<string, string | undefined>;
}

export async function registerRestaurateurAction(
  _prev: RegisterState | undefined,
  formData: FormData,
): Promise<RegisterState> {
  // 1. Rate limit anti-spam par IP : 3 inscriptions / heure
  const hdrs = await headers();
  const ip =
    hdrs.get('x-forwarded-for')?.split(',')[0]?.trim() || hdrs.get('x-real-ip') || 'unknown';
  const rl = checkSignupRateLimit(`signup:${ip}`);
  if (!rl.allowed) {
    return {
      error: `Trop d'inscriptions depuis cette adresse. Réessayez dans ${Math.ceil(rl.resetInSeconds / 60)} minutes.`,
    };
  }

  // 2. Validation
  const parsed = restaurateurRegisterSchema.safeParse({
    restaurant_name: formData.get('restaurant_name'),
    slug: formData.get('slug'),
    owner_full_name: formData.get('owner_full_name'),
    owner_email: formData.get('owner_email'),
    owner_phone: formData.get('owner_phone') ?? '',
    password: formData.get('password'),
    password_confirm: formData.get('password_confirm'),
    accept_terms: formData.get('accept_terms'),
  });

  if (!parsed.success) {
    const fe = parsed.error.flatten().fieldErrors;
    return {
      fieldErrors: Object.fromEntries(
        Object.entries(fe).map(([k, v]) => [k, Array.isArray(v) ? v[0] : undefined]),
      ),
    };
  }

  const admin = await createAdminClient();

  // 3. Vérifier unicité slug + email AVANT de créer quoi que ce soit
  const { data: slugTaken } = await admin
    .from('restaurants')
    .select('id')
    .eq('slug', parsed.data.slug)
    .maybeSingle();
  if (slugTaken) {
    return { fieldErrors: { slug: 'Cette URL est déjà utilisée. Choisissez-en une autre.' } };
  }

  // 4. Création atomique (avec rollback complet en cas d'échec)
  const { data: created, error: createErr } = await admin.auth.admin.createUser({
    email: parsed.data.owner_email,
    password: parsed.data.password,
    email_confirm: true,
    user_metadata: { role: 'restaurateur' },
  });
  if (createErr || !created.user) {
    // Supabase retourne un message spécifique si l'email existe déjà
    if (
      createErr?.message?.toLowerCase().includes('already') ||
      createErr?.message?.toLowerCase().includes('exists') ||
      createErr?.message?.toLowerCase().includes('duplicate')
    ) {
      return {
        fieldErrors: {
          owner_email: 'Un compte existe déjà avec cet email. Connectez-vous à la place.',
        },
      };
    }
    return { error: createErr?.message ?? 'Création du compte échouée.' };
  }

  const { error: profileErr } = await admin.from('profiles').insert({
    id: created.user.id,
    role: 'restaurateur',
    full_name: parsed.data.owner_full_name,
    phone: parsed.data.owner_phone || null,
    is_active: true,
  });
  if (profileErr) {
    await admin.auth.admin.deleteUser(created.user.id);
    return { error: profileErr.message };
  }

  // Restaurant créé en "active" — visible publiquement immédiatement (pas de modération).
  // Le restaurateur doit toujours cocher "Restaurant ouvert" dans /dashboard/parametres
  // pour commencer à recevoir des commandes.
  const { error: restErr } = await admin.from('restaurants').insert({
    owner_id: created.user.id,
    name: parsed.data.restaurant_name,
    slug: parsed.data.slug,
    phone: parsed.data.owner_phone || null,
    status: 'active',
    is_open: false,
    accept_orders: true,
  });
  if (restErr) {
    await admin.from('profiles').delete().eq('id', created.user.id);
    await admin.auth.admin.deleteUser(created.user.id);
    return { error: restErr.message };
  }

  // 5. Email de bienvenue (best-effort)
  void sendRestaurateurWelcome({
    to: parsed.data.owner_email,
    fullName: parsed.data.owner_full_name,
    restaurantName: parsed.data.restaurant_name,
    slug: parsed.data.slug,
  }).catch((e) => console.error('[emails] welcome failed', e));

  // 6. Auto-login : pose les cookies de session via le client SSR (anon)
  const supabase = await createClient();
  const { error: loginErr } = await supabase.auth.signInWithPassword({
    email: parsed.data.owner_email,
    password: parsed.data.password,
  });
  if (loginErr) {
    // Le compte est créé, mais la session n'a pas pu être posée. On redirige vers le login.
    redirect('/login?created=1');
  }

  redirect('/dashboard?welcome=1');
}
