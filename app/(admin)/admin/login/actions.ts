'use server';

import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { emailLoginSchema } from '@/lib/validators/auth';
import { checkRateLimit, resetRateLimit } from '@/lib/rate-limit';

export interface AdminLoginState {
  error?: string;
  fieldErrors?: { email?: string; password?: string };
}

export async function adminLoginAction(
  _prev: AdminLoginState | undefined,
  formData: FormData,
): Promise<AdminLoginState> {
  const parsed = emailLoginSchema.safeParse({
    email: String(formData.get('email') ?? ''),
    password: String(formData.get('password') ?? ''),
  });
  if (!parsed.success) {
    const fe = parsed.error.flatten().fieldErrors;
    return { fieldErrors: { email: fe.email?.[0], password: fe.password?.[0] } };
  }

  const hdrs = await headers();
  const ip =
    hdrs.get('x-forwarded-for')?.split(',')[0]?.trim() || hdrs.get('x-real-ip') || 'unknown';
  const rlKey = `login:admin:${parsed.data.email.toLowerCase()}:${ip}`;
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

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, is_active')
    .eq('id', data.user.id)
    .maybeSingle<{ role: string; is_active: boolean }>();

  if (!profile || profile.role !== 'admin' || !profile.is_active) {
    await supabase.auth.signOut();
    return { error: 'Accès admin refusé.' };
  }

  resetRateLimit(rlKey);
  redirect('/admin/dashboard');
}
