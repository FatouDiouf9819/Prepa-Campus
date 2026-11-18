import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';

/**
 * GET /api/credits
 * Récupère le solde réel de simulations de l'utilisateur connecté depuis Supabase.
 * Combine résilientement la table PostgreSQL user_credits et Supabase Auth user_metadata.
 */
export async function GET() {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Non authentifié. Connexion requise.' },
        { status: 401 }
      );
    }

    let dbBalance: number | null = null;

    // 1. Tenter la fonction RPC get_or_create_user_credits
    try {
      const { data: rpcBalance, error: rpcError } = await supabase.rpc('get_or_create_user_credits', {
        p_user_id: user.id,
      });

      if (!rpcError && typeof rpcBalance === 'number') {
        dbBalance = rpcBalance;
      }
    } catch {
      // Tolérance RPC
    }

    // 2. Requête directe sur la table user_credits
    if (dbBalance === null) {
      try {
        const { data: creditRow, error: tableError } = await supabase
          .from('user_credits')
          .select('balance')
          .eq('user_id', user.id)
          .maybeSingle();

        if (!tableError && creditRow && typeof creditRow.balance === 'number') {
          dbBalance = creditRow.balance;
        } else if (!creditRow && !tableError) {
          // Si l'utilisateur n'a pas encore de ligne, lui créer immédiatement 1 simulation offerte
          const { data: insertedRow } = await supabase
            .from('user_credits')
            .insert({ user_id: user.id, balance: 1 })
            .select('balance')
            .maybeSingle();

          if (insertedRow && typeof insertedRow.balance === 'number') {
            dbBalance = insertedRow.balance;
          }
        }
      } catch {
        // Tolérance table
      }
    }

    // 3. Repli résilient dans user_metadata (Supabase Auth)
    const metaBal = typeof user.user_metadata?.credits_balance === 'number'
      ? user.user_metadata.credits_balance
      : (typeof user.user_metadata?.credits === 'number' ? user.user_metadata.credits : null);

    // Solde effectif = valeur maximale entre DB et Auth Metadata
    let effectiveBalance = Math.max(dbBalance ?? 0, metaBal ?? 0);

    // Si ni DB ni Metadata n'ont encore de valeur enregistrée (nouveau compte)
    if (dbBalance === null && metaBal === null) {
      effectiveBalance = 1; // 1 simulation d'accueil offerte
    }

    const lastPack = user.user_metadata?.last_recharge_pack;
    const hasPremiumAccess = 
      lastPack === 'pack_reussite' || 
      lastPack === 'pack_intensif' || 
      Boolean(user.user_metadata?.has_premium_questions);

    return NextResponse.json({ 
      balance: effectiveBalance,
      hasPremiumAccess,
      lastPack: lastPack || null,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Erreur serveur';
    return NextResponse.json({ error: message, balance: 1, hasPremiumAccess: false }, { status: 500 });
  }
}

/**
 * POST /api/credits
 * Recharge instantanément le compte de l'utilisateur connecté avec des crédits de test (défaut +10 ou +20).
 * Met à jour à la fois la table PostgreSQL user_credits et les métadonnées auth.
 */
export async function POST(request: Request) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Non authentifié. Connexion requise.' },
        { status: 401 }
      );
    }

    let addAmount = 10;
    try {
      const body = await request.json();
      if (typeof body.amount === 'number' && body.amount > 0) {
        addAmount = Math.min(100, body.amount);
      }
    } catch {
      // montant par défaut : 10
    }

    // Récupérer le solde actuel combiné
    let currentBalance = 0;
    try {
      const { data: creditRow } = await supabase
        .from('user_credits')
        .select('balance')
        .eq('user_id', user.id)
        .maybeSingle();

      if (creditRow && typeof creditRow.balance === 'number') {
        currentBalance = Math.max(currentBalance, creditRow.balance);
      }
    } catch {
      // Tolérance
    }

    if (typeof user.user_metadata?.credits_balance === 'number') {
      currentBalance = Math.max(currentBalance, user.user_metadata.credits_balance);
    } else if (typeof user.user_metadata?.credits === 'number') {
      currentBalance = Math.max(currentBalance, user.user_metadata.credits);
    }

    const newBalance = Math.max(currentBalance, 0) + addAmount;

    // 1. Synchronisation prioritaire dans Supabase Auth user_metadata
    try {
      await supabase.auth.updateUser({
        data: {
          credits: newBalance,
          credits_balance: newBalance,
          has_premium_questions: true,
          last_recharge_date: new Date().toISOString(),
        },
      });
    } catch (metaErr) {
      console.warn('[Credits POST Auth Note]:', metaErr);
    }

    // 2. Initialiser et incrémenter la ligne DB via les RPCs SECURITY DEFINER
    try {
      await supabase.rpc('get_or_create_user_credits', { p_user_id: user.id });
      const refundCalls = Array.from({ length: Math.min(addAmount, 20) }, () =>
        supabase.rpc('refund_user_credit', { p_user_id: user.id })
      );
      await Promise.all(refundCalls);
    } catch {
      // Tolérance
    }

    // 3. Mise à jour dans PostgreSQL user_credits via client admin si disponible
    try {
      const { createAdminClient } = await import('@/lib/supabase/admin');
      const adminClient = createAdminClient();
      await adminClient
        .from('user_credits')
        .upsert({
          user_id: user.id,
          balance: newBalance,
          has_premium_questions: true,
          updated_at: new Date().toISOString(),
        });
    } catch {
      // Client admin non configuré en dev
    }

    return NextResponse.json({
      success: true,
      previousBalance: currentBalance,
      added: addAmount,
      balance: newBalance,
      hasPremiumAccess: true,
      message: `${addAmount} simulation(s) de test ajoutée(s) avec succès !`,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Erreur interne';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
