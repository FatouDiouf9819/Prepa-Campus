import { createClient } from '@supabase/supabase-js';

/**
 * Client Supabase d'Administration (Service Role).
 * 
 * ⚠️ RÈGLE DE SÉCURITÉ CRITIQUE :
 * Ce client dispose des droits administrateurs complets et contourne les politiques RLS.
 * Il ne doit JAMAIS être importé ni exécuté dans un composant client (navigateur).
 * Il est réservé aux tâches internes de facturation, à la gestion des crédits et aux webhooks sécurisés.
 */
export function createAdminClient() {
  if (typeof window !== 'undefined') {
    throw new Error('VIOLATION DE SÉCURITÉ : Le client Supabase Admin ne peut pas être exécuté côté client.');
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('CONFIGURATION MANQUANTE : NEXT_PUBLIC_SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY doivent être définis pour utiliser le client admin.');
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
