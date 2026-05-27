import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';

type CookieToSet = { name: string; value: string; options?: CookieOptions };

/**
 * Client Supabase pour les Server Components, Server Actions et Route Handlers.
 * Lie automatiquement la session de l'utilisateur via les cookies Next.js.
 */
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet: CookieToSet[]) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // Appelé depuis un Server Component : Next.js ne permet pas d'écrire les cookies ici.
            // Le middleware s'en charge.
          }
        },
      },
    },
  );
}

/**
 * Client Supabase service_role — bypass RLS. À n'utiliser QUE côté serveur,
 * jamais dans un composant client. Réservé aux opérations admin (création
 * de profils, gestion utilisateurs).
 */
export async function createAdminClient() {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY manquant');
  }
  const { createClient: createSb } = await import('@supabase/supabase-js');
  return createSb(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
