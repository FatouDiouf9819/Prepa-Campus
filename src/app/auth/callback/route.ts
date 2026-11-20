import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';

/**
 * Route de callback OAuth et vérification d'email Supabase Auth.
 */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const rawNext = searchParams.get('next') ?? '/';
  // Protection contre les redirections externes arbitraires (Open Redirect)
  const safeNext = (rawNext.startsWith('/') && !rawNext.startsWith('//')) ? rawNext : '/';

  if (code) {
    const supabase = await createServerSupabaseClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      // Garantir l'attribution immédiate du crédit de bienvenue (1 simulation offerte)
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          // 1. Tenter la RPC dédiée
          await supabase.rpc('get_or_create_user_credits', { p_user_id: user.id });

          // 2. Vérifier si la ligne existe dans user_credits
          const { data: creditRow } = await supabase
            .from('user_credits')
            .select('balance')
            .eq('user_id', user.id)
            .maybeSingle();

          if (!creditRow) {
            await supabase.from('user_credits').insert({
              user_id: user.id,
              balance: 1,
            });
          }
        }
      } catch (err) {
        console.warn('[Auth Callback] Erreur initialisation crédits offerts:', err);
      }

      return NextResponse.redirect(`${origin}${safeNext}`);
    }
  }

  return NextResponse.redirect(`${origin}/auth/connexion?error=auth_callback_failed`);
}
