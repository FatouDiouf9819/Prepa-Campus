import { createBrowserClient } from '@supabase/ssr';

/**
 * Client Supabase côté navigateur.
 * Utilise la clé publique anonyme (NEXT_PUBLIC_SUPABASE_ANON_KEY).
 * Toutes les requêtes effectuées via ce client sont soumises à 100%
 * aux politiques de sécurité Row Level Security (RLS) définies dans PostgreSQL.
 */
export function createClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder_anon_key';

  return createBrowserClient(supabaseUrl, supabaseAnonKey);
}
