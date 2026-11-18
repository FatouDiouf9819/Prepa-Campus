import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

/**
 * Client Supabase côté serveur pour les Server Components, Route Handlers et Server Actions.
 * Récupère le contexte utilisateur authentifié via les cookies de session.
 * Respecte rigoureusement les politiques RLS de PostgreSQL.
 * 
 * Utilise l'implémentation standard getAll() et setAll() de @supabase/ssr.
 */
export async function createServerSupabaseClient() {
  const cookieStore = cookies();

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder_anon_key';

  return createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          );
        } catch {
          // Gestion des cas où la méthode est appelée depuis un Server Component en lecture seule
        }
      },
    },
  });
}
