'use server';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { requireRole } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { ADMIN_MANAGE_COOKIE } from '@/lib/constants';

/**
 * Un admin ouvre le tableau de bord d'un restaurant pour l'éditer. On pose un
 * cookie de contexte (httpOnly) puis on redirige vers /dashboard. L'admin garde
 * sa session ; ses écritures sont autorisées par les règles RLS `is_admin()`.
 */
export async function startManagingRestaurantAction(formData: FormData): Promise<void> {
  await requireRole('admin');
  const id = String(formData.get('id') ?? '').trim();
  if (!id) redirect('/admin/restaurants');

  const supabase = await createClient();
  const { data } = await supabase.from('restaurants').select('id').eq('id', id).maybeSingle();
  if (!data) redirect('/admin/restaurants');

  (await cookies()).set(ADMIN_MANAGE_COOKIE, id, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 60 * 60 * 4, // 4h : garde-fou, le contexte de gestion expire tout seul
  });

  redirect('/dashboard');
}

/** Quitte le mode gestion : supprime le cookie et revient au panel admin. */
export async function stopManagingRestaurantAction(): Promise<void> {
  await requireRole('admin');
  (await cookies()).delete(ADMIN_MANAGE_COOKIE);
  redirect('/admin/restaurants');
}
