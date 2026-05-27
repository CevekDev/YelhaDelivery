import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import type { UserRole } from '@/types/database';

type CookieToSet = { name: string; value: string; options?: CookieOptions };

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

  // Routes publiques (sans auth)
  const publicPaths = ['/', '/login', '/livreur/login', '/admin/login'];
  const isPublic =
    publicPaths.includes(pathname) ||
    pathname.startsWith('/r/') ||
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api/public') ||
    pathname === '/favicon.ico';

  // Routes protégées par rôle
  const requiresRestaurateur = pathname.startsWith('/dashboard');
  const requiresLivreur = pathname.startsWith('/livreur') && pathname !== '/livreur/login';
  const requiresAdmin = pathname.startsWith('/admin') && pathname !== '/admin/login';

  if (!user && (requiresRestaurateur || requiresLivreur || requiresAdmin)) {
    const loginUrl = requiresAdmin
      ? '/admin/login'
      : requiresLivreur
        ? '/livreur/login'
        : '/login';
    const url = request.nextUrl.clone();
    url.pathname = loginUrl;
    url.searchParams.set('next', pathname);
    return NextResponse.redirect(url);
  }

  if (user && (requiresRestaurateur || requiresLivreur || requiresAdmin)) {
    // Vérifier le rôle via la table profiles
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
      return NextResponse.redirect(url);
    }

    const roleAllowed =
      (requiresRestaurateur && profile.role === 'restaurateur') ||
      (requiresLivreur && profile.role === 'livreur') ||
      (requiresAdmin && profile.role === 'admin');

    if (!roleAllowed) {
      const url = request.nextUrl.clone();
      url.pathname = '/';
      url.searchParams.set('error', 'acces_refuse');
      return NextResponse.redirect(url);
    }
  }

  // Redirige les utilisateurs déjà connectés depuis les pages de login
  if (user && (pathname === '/login' || pathname === '/livreur/login' || pathname === '/admin/login')) {
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
      return NextResponse.redirect(url);
    }
  }

  // Mark unused to avoid lint warning (kept for future extension)
  void isPublic;

  return response;
}
