import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
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
 * Charge le restaurant du restaurateur connecté.
 * Redirige vers la page de paramètres si le restaurant n'existe pas encore.
 * À utiliser dans les pages qui REQUIÈRENT un restaurant existant.
 */
export async function requireRestaurateur(): Promise<{
  profile: Profile;
  restaurant: Restaurant;
}> {
  const { profile } = await requireRole('restaurateur');
  const supabase = await createClient();
  const { data: restaurant } = await supabase
    .from('restaurants')
    .select('*')
    .eq('owner_id', profile.id)
    .maybeSingle<Restaurant>();

  if (!restaurant) {
    redirect('/dashboard/parametres?setup=1');
  }

  return { profile, restaurant };
}

/**
 * Variante non-redirectante : retourne `restaurant` à null si pas encore créé.
 * À utiliser dans la page Paramètres uniquement.
 */
export async function getRestaurateurContext(): Promise<{
  profile: Profile;
  restaurant: Restaurant | null;
}> {
  const { profile } = await requireRole('restaurateur');
  const supabase = await createClient();
  const { data: restaurant } = await supabase
    .from('restaurants')
    .select('*')
    .eq('owner_id', profile.id)
    .maybeSingle<Restaurant>();
  return { profile, restaurant };
}
