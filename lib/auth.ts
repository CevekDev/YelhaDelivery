import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { createClient } from '@/lib/supabase/server';
import { ADMIN_MANAGE_COOKIE } from '@/lib/constants';
import type { Profile, Restaurant, UserRole } from '@/types/database';

/**
 * Vérifie qu'un utilisateur est connecté et a le rôle attendu.
 * Redirige vers la page de login appropriée sinon.
 */
export async function requireRole(role: UserRole): Promise<{ profile: Profile; userId: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    const loginPath =
      role === 'admin' ? '/admin/login' : role === 'livreur' ? '/livreur/login' : '/login';
    redirect(loginPath);
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .maybeSingle<Profile>();

  if (!profile || !profile.is_active || profile.role !== role) {
    await supabase.auth.signOut();
    redirect('/login?error=acces_refuse');
  }

  return { profile, userId: user.id };
}

/**
 * Résout le restaurant du tableau de bord pour l'utilisateur courant, en tenant
 * compte du mode « admin gère un restaurant » :
 *   - restaurateur → son propre restaurant (peut être null pendant le setup) ;
 *   - admin avec le cookie ADMIN_MANAGE_COOKIE → le restaurant qu'il gère
 *     (redirige vers le panel admin si le cookie est absent/invalide).
 * L'admin garde sa session ; les écritures sont autorisées par les règles RLS
 * `is_admin()`. `managingAsAdmin` permet à l'UI d'afficher un bandeau dédié.
 */
async function resolveDashboardRestaurant(): Promise<{
  profile: Profile;
  restaurant: Restaurant | null;
  managingAsAdmin: boolean;
}> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .maybeSingle<Profile>();

  if (!profile || !profile.is_active) {
    await supabase.auth.signOut();
    redirect('/login?error=acces_refuse');
  }

  // Admin en mode « gestion d'un restaurant » (contexte porté par un cookie).
  if (profile.role === 'admin') {
    const manageId = (await cookies()).get(ADMIN_MANAGE_COOKIE)?.value;
    if (!manageId) redirect('/admin/restaurants');
    const { data: restaurant } = await supabase
      .from('restaurants')
      .select('*')
      .eq('id', manageId)
      .maybeSingle<Restaurant>();
    if (!restaurant) redirect('/admin/restaurants');
    return { profile, restaurant, managingAsAdmin: true };
  }

  if (profile.role !== 'restaurateur') redirect('/login?error=acces_refuse');

  const { data: restaurant } = await supabase
    .from('restaurants')
    .select('*')
    .eq('owner_id', profile.id)
    .maybeSingle<Restaurant>();
  return { profile, restaurant: restaurant ?? null, managingAsAdmin: false };
}

/**
 * Charge le restaurant du tableau de bord (restaurateur OU admin en gestion).
 * Redirige vers la page de paramètres si le restaurant n'existe pas encore.
 * À utiliser dans les pages/actions qui REQUIÈRENT un restaurant existant.
 */
export async function requireRestaurateur(): Promise<{
  profile: Profile;
  restaurant: Restaurant;
  managingAsAdmin: boolean;
}> {
  const { profile, restaurant, managingAsAdmin } = await resolveDashboardRestaurant();
  if (!restaurant) redirect('/dashboard/parametres?setup=1');
  return { profile, restaurant, managingAsAdmin };
}

/**
 * Variante non-redirectante : retourne `restaurant` à null si pas encore créé.
 * À utiliser dans la page Paramètres et les actions qui peuvent créer le resto.
 */
export async function getRestaurateurContext(): Promise<{
  profile: Profile;
  restaurant: Restaurant | null;
  managingAsAdmin: boolean;
}> {
  return resolveDashboardRestaurant();
}
