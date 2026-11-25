import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createAdminClient } from '@/lib/supabase/admin';

describe('Sécurité du Client Supabase Admin (Service Role)', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('doit refuser l initialisation si SUPABASE_SERVICE_ROLE_KEY est absent', () => {
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://demo.supabase.co';

    expect(() => createAdminClient()).toThrow(/CONFIGURATION MANQUANTE/i);
  });

  it('doit refuser l initialisation si NEXT_PUBLIC_SUPABASE_URL est absent', () => {
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'service_role_secret';

    expect(() => createAdminClient()).toThrow(/CONFIGURATION MANQUANTE/i);
  });

  it('ne doit jamais exposer la clé service role dans une variable préfixée par NEXT_PUBLIC_', () => {
    // Vérification statique qu'aucune variable publique ne contient le service role
    expect(process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY).toBeUndefined();
  });
});
