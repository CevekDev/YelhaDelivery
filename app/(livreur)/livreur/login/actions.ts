'use server';

import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { usernameLoginSchema } from '@/lib/validators/auth';
import { checkRateLimit, resetRateLimit } from '@/lib/rate-limit';

export interface LivreurLoginState {
  error?: string;
  fieldErrors?: { username?: string; password?: string };
}

const SYNTH_DOMAIN = '@livreur.delivery.yelha.net';

export async function livreurLoginAction(
  _prev: LivreurLoginState | undefined,
  formData: FormData,
): Promise<LivreurLoginState> {
  const parsed = usernameLoginSchema.safeParse({
    username: String(formData.get('username') ?? ''),
    password: String(formData.get('password') ?? ''),
  });
  if (!parsed.success) {
    const fe = parsed.error.flatten().fieldErrors;
    return {
      fieldErrors: { username: fe.username?.[0], password: fe.password?.[0] },
    };
  }

  const hdrs = await headers();
  const ip =
    hdrs.get('x-forwarded-for')?.split(',')[0]?.trim() || hdrs.get('x-real-ip') || 'unknown';
  const rlKey = `login:livreur:${parsed.data.username}:${ip}`;
  const rl = checkRateLimit(rlKey);
  if (!rl.allowed) {
    return {
      error: `Trop de tentatives. Réessayez dans ${Math.ceil(rl.resetInSeconds / 60)} minutes.`,
    };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword({
    email: `${parsed.data.username}${SYNTH_DOMAIN}`,
    password: parsed.data.password,
  });

  if (error || !data.user) {
    return { error: 'Identifiant ou mot de passe incorrect.' };
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, is_active')
    .eq('id', data.user.id)
    .maybeSingle<{ role: string; is_active: boolean }>();

  if (!profile || profile.role !== 'livreur' || !profile.is_active) {
    await supabase.auth.signOut();
    return { error: 'Compte livreur introuvable ou désactivé.' };
  }

  resetRateLimit(rlKey);
  redirect('/livreur/dashboard');
}
