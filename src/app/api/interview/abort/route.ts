import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';

/**
 * POST /api/interview/abort
 * Clôture proprement une session interrompue par l'étudiant.
 * Si l'étudiant a répondu à moins de 3 questions (ou moins de 50 mots au total),
 * la session est marquée ABANDONED et son crédit de simulation lui est intégralement restitué.
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Non authentifié.' }, { status: 401 });
    }

    const body = await request.json();
    const { sessionId, turnsCount, totalWords } = body;

    if (!sessionId) {
      return NextResponse.json({ error: 'Identifiant de session manquant.' }, { status: 400 });
    }

    // Sessions locales ou mockées
    if (sessionId.startsWith('session_')) {
      return NextResponse.json({ success: true, refunded: true });
    }

    // 1. Vérifier la session en base de données
    const { data: sessionData, error: sessionError } = await supabase
      .from('interview_sessions')
      .select('id, user_id, status')
      .eq('id', sessionId)
      .maybeSingle();

    if (sessionError || !sessionData) {
      return NextResponse.json({ error: 'Session introuvable.' }, { status: 404 });
    }

    if (sessionData.user_id !== user.id) {
      return NextResponse.json({ error: 'Accès refusé.' }, { status: 403 });
    }

    // Si la session est déjà complétée
    if (sessionData.status === 'COMPLETED') {
      return NextResponse.json({ 
        success: true, 
        refunded: false, 
        message: 'Cette session a déjà été menée à son terme.' 
      });
    }

    const turns = typeof turnsCount === 'number' ? turnsCount : 0;
    const words = typeof totalWords === 'number' ? totalWords : 0;
    const isEligibleForRefund = (turns < 3 || words < 50) && sessionData.status !== 'ABANDONED';

    // Mettre à jour le statut de la session en ABANDONED
    await supabase
      .from('interview_sessions')
      .update({
        status: 'ABANDONED',
        ended_at: new Date().toISOString(),
      })
      .eq('id', sessionId);

    let refunded = false;
    let newBalance: number | null = null;

    if (isEligibleForRefund) {
      // 2. Restituer le crédit déduit au démarrage :
      // A. Via la RPC officielle PostgreSQL refund_user_credit
      try {
        await supabase.rpc('refund_user_credit', { p_user_id: user.id });
      } catch (rpcErr) {
        console.warn('[Abort Refund RPC Notice]:', rpcErr);
      }

      // B. Calcul du nouveau solde
      let currentBal = 0;
      try {
        const { data: cRow } = await supabase
          .from('user_credits')
          .select('balance')
          .eq('user_id', user.id)
          .maybeSingle();
        if (cRow && typeof cRow.balance === 'number') {
          currentBal = Math.max(currentBal, cRow.balance);
        }
      } catch {}

      if (typeof user.user_metadata?.credits_balance === 'number') {
        currentBal = Math.max(currentBal, user.user_metadata.credits_balance);
      } else if (typeof user.user_metadata?.credits === 'number') {
        currentBal = Math.max(currentBal, user.user_metadata.credits);
      }

      newBalance = currentBal + 1;

      // C. Synchroniser user_metadata dans Supabase Auth
      try {
        await supabase.auth.updateUser({
          data: {
            credits: newBalance,
            credits_balance: newBalance,
          },
        });
      } catch (authErr) {
        console.warn('[Abort Refund Metadata Notice]:', authErr);
      }

      // D. Mettre à jour PostgreSQL user_credits via client admin
      try {
        const { createAdminClient } = await import('@/lib/supabase/admin');
        const adminClient = createAdminClient();
        await adminClient
          .from('user_credits')
          .upsert({
            user_id: user.id,
            balance: newBalance,
            updated_at: new Date().toISOString(),
          });
      } catch {}

      refunded = true;
    }

    return NextResponse.json({
      success: true,
      refunded,
      newBalance,
      message: refunded
        ? "Votre simulation a été interrompue. Votre crédit a été intégralement préservé et restitué sur votre compte."
        : "Session interrompue.",
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Erreur lors de l\'annulation';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
