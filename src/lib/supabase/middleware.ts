import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

/**
 * Met à jour la session utilisateur et rafraîchit les jetons d'authentification.
 * Ce middleware s'exécute sur chaque requête pour maintenir la session active
 * et sécuriser l'accès aux routes protégées (/dashboard, /profil, /entretien).
 * 
 * Utilise l'implémentation standard getAll() et setAll() de @supabase/ssr
 * afin de garantir que les cookies découpés (chunked cookies) ne soient jamais corrompus.
 */
export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder_anon_key';

  // Ne pas bloquer si les clés sont des placeholders en mode développement
  if (supabaseUrl.includes('placeholder')) {
    return response;
  }

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({
          request,
        });
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options)
        );
      },
    },
  });

  const { data: { user } } = await supabase.auth.getUser();

  // Protection des routes nécessitant une authentification
  const isProtectedRoute = 
    request.nextUrl.pathname.startsWith('/dashboard') ||
    request.nextUrl.pathname.startsWith('/profil') ||
    request.nextUrl.pathname.startsWith('/entretien') ||
    request.nextUrl.pathname.startsWith('/rapport') ||
    request.nextUrl.pathname.startsWith('/historique');

  if (isProtectedRoute && !user) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = '/auth/connexion';
    redirectUrl.searchParams.set('redirectTo', request.nextUrl.pathname);
    return NextResponse.redirect(redirectUrl);
  }

  return response;
}
