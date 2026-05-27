'use server';

import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { emailLoginSchema } from '@/lib/validators/auth';
import { checkRateLimit, resetRateLimit } from '@/lib/rate-limit';
import type { UserRole } from '@/types/database';

export interface LoginState {
  error?: string;
  fieldErrors?: { email?: string; password?: string };
}

export async function loginAction(
  _prev: LoginState | undefined,
  formData: FormData,
): Promise<LoginState> {
  const raw = {
    email: String(formData.get('email') ?? ''),
    password: String(formData.get('password') ?? ''),
  };

  const parsed = emailLoginSchema.safeParse(raw);
  if (!parsed.success) {
    const flat = parsed.error.flatten();
    return {
      fieldErrors: {
        email: flat.fieldErrors.email?.[0],
        password: flat.fieldErrors.password?.[0],
      },
    };
  }

  // Rate limit par email + IP (en-tête Vercel)
  const hdrs = await headers();
  const ip =
    hdrs.get('x-forwarded-for')?.split(',')[0]?.trim() || hdrs.get('x-real-ip') || 'unknown';
  const rlKey = `login:restaurateur:${parsed.data.email.toLowerCase()}:${ip}`;
  const rl = checkRateLimit(rlKey);
  if (!rl.allowed) {
    return {
      error: `Trop de tentatives. Réessayez dans ${Math.ceil(rl.resetInSeconds / 60)} minutes.`,
    };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword({
    email: parsed.data.email,
    password: parsed.data.password,
  });

  if (error || !data.user) {
    return { error: 'Email ou mot de passe incorrect.' };
  }

  // Vérifier le rôle
  const { data: profile } = await supabase
    .from('profiles')
    .select('role, is_active')
    .eq('id', data.user.id)
    .maybeSingle<{ role: UserRole; is_active: boolean }>();

  if (!profile || !profile.is_active) {
    await supabase.auth.signOut();
    return { error: 'Compte introuvable ou désactivé.' };
  }

  if (profile.role !== 'restaurateur') {
    await supabase.auth.signOut();
    return { error: 'Ce compte n’est pas un compte restaurateur.' };
  }

  resetRateLimit(rlKey);
  redirect('/dashboard');
}
