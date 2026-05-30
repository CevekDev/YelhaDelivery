import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import type { UserRole } from '@/types/database';

type CookieToSet = { name: string; value: string; options?: CookieOptions };

/**
 * Construit une redirection en transférant les cookies que Supabase a (re)définis,
 * sinon la session se "perd" entre redirections → boucle.
 */
function redirectWithCookies(source: NextResponse, location: URL): NextResponse {
  const res = NextResponse.redirect(location);
  source.cookies.getAll().forEach((c) => {
    res.cookies.set(c.name, c.value, c);
  });
  return res;
}

/**
 * Met à jour la session Supabase à chaque requête + applique la protection des routes
 * en fonction du rôle de l'utilisateur.
 */
export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: CookieToSet[]) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  // IMPORTANT : ne PAS exécuter de logique entre createServerClient et getUser
  // (https://supabase.com/docs/guides/auth/server-side/nextjs)
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;

  // Court-circuit : les chemins clairement publics ne déclenchent aucune logique d'auth.
  // Évite toute possibilité de redirection accidentelle.
  const isClearlyPublic =
    pathname === '/' ||
    pathname.startsWith('/r/') ||
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api/public') ||
    pathname === '/favicon.ico';

  if (isClearlyPublic && !user) {
    return response;
  }

  // Routes protégées par rôle
  const isLoginPage =
    pathname === '/login' || pathname === '/livreur/login' || pathname === '/admin/login';
  const requiresRestaurateur = pathname.startsWith('/dashboard');
  const requiresLivreur = pathname.startsWith('/livreur') && pathname !== '/livreur/login';
  const requiresAdmin = pathname.startsWith('/admin') && pathname !== '/admin/login';

  // 1. Pas connecté + tente une route protégée → vers la page de login appropriée
  if (!user && (requiresRestaurateur || requiresLivreur || requiresAdmin)) {
    const loginUrl = requiresAdmin
      ? '/admin/login'
      : requiresLivreur
        ? '/livreur/login'
        : '/login';
    const url = request.nextUrl.clone();
    url.pathname = loginUrl;
    url.searchParams.set('next', pathname);
    return redirectWithCookies(response, url);
  }

  // 2. Connecté + route protégée → vérifier le rôle
  if (user && (requiresRestaurateur || requiresLivreur || requiresAdmin)) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('role, is_active')
      .eq('id', user.id)
      .maybeSingle<{ role: UserRole; is_active: boolean }>();

    if (!profile || !profile.is_active) {
      await supabase.auth.signOut();
      const url = request.nextUrl.clone();
      url.pathname = '/login';
      url.searchParams.set('error', 'compte_inactif');
      return redirectWithCookies(response, url);
    }

    const roleAllowed =
      (requiresRestaurateur && profile.role === 'restaurateur') ||
      (requiresLivreur && profile.role === 'livreur') ||
      (requiresAdmin && profile.role === 'admin');

    if (!roleAllowed) {
      const url = request.nextUrl.clone();
      url.pathname = '/';
      url.searchParams.set('error', 'acces_refuse');
      return redirectWithCookies(response, url);
    }

    return response;
  }

  // 3. Connecté + sur une page de login → on l'envoie sur son dashboard
  if (user && isLoginPage) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .maybeSingle<{ role: UserRole }>();

    if (profile) {
      const url = request.nextUrl.clone();
      url.pathname =
        profile.role === 'admin'
          ? '/admin/dashboard'
          : profile.role === 'livreur'
            ? '/livreur/dashboard'
            : '/dashboard';
      return redirectWithCookies(response, url);
    }
  }

  // 4. Tous les autres cas (page de login sans session, route publique avec session, etc.)
  return response;
}
