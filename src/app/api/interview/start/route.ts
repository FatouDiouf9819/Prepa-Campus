import { NextRequest, NextResponse } from 'next/server';
import { generateFirstQuestion } from '@/lib/ai/openai';
import { TIMEOUTS, createTimeoutSignal } from '@/config/timeouts';
import { AcademicProfileData } from '@/types/profile';
import { JuryPersonality } from '@/types/interview';
import { createServerSupabaseClient } from '@/lib/supabase/server';

/**
 * POST /api/interview/start
 * Démarre une session d'entretien de 5 minutes, vérifie les crédits,
 * persiste la session dans Supabase et génère la première question personnalisée.
 */
export async function POST(request: NextRequest) {
  const { cleanup } = createTimeoutSignal(TIMEOUTS.AI_TURN_GENERATION_MS);

  try {
    // 1. Contrôle strict d'authentification
    const supabase = await createServerSupabaseClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      cleanup();
      return NextResponse.json(
        { error: 'Non authentifié. Veuillez vous connecter pour lancer un entretien.' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const profile: AcademicProfileData = body.profile;
    const juryPersonality: JuryPersonality | undefined = body.juryPersonality;

    if (!profile || !profile.currentDiploma || !profile.targetPrograms) {
      cleanup();
      return NextResponse.json(
        { error: 'Profil académique incomplet. Veuillez compléter votre profil avant de lancer une simulation.' },
        { status: 400 }
      );
    }

    // 2. Initialisation fiabilisée de la session et des crédits
    let sessionId: string | null = null;
    let isExistingSession = false;

    // Calcul du solde effectif de l'étudiant (table user_credits ET user_metadata)
    let dbBalance: number | null = null;
    try {
      const { data: cRow } = await supabase
        .from('user_credits')
        .select('balance')
        .eq('user_id', user.id)
        .maybeSingle();
      if (cRow && typeof cRow.balance === 'number') {
        dbBalance = cRow.balance;
      }
    } catch {
      // Tolérance
    }

    const metaBalance = typeof user.user_metadata?.credits_balance === 'number'
      ? user.user_metadata.credits_balance
      : (typeof user.user_metadata?.credits === 'number' ? user.user_metadata.credits : null);

    // Si une reprise de session spécifique est demandée
    const requestedSessionId: string | undefined = body.sessionId;
    if (requestedSessionId && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(requestedSessionId.trim())) {
      try {
        const { data: requestedSession } = await supabase
          .from('interview_sessions')
          .select('id, status, started_at')
          .eq('id', requestedSessionId.trim())
          .eq('user_id', user.id)
          .maybeSingle();

        if (requestedSession && requestedSession.status === 'IN_PROGRESS') {
          const isExpired = requestedSession.started_at
            ? (Date.now() - new Date(requestedSession.started_at).getTime() > 10 * 60 * 1000)
            : false; // 10 minutes max pour une simulation de 5 min

          if (isExpired) {
            await supabase
              .from('interview_sessions')
              .update({ status: 'ABANDONED' })
              .eq('id', requestedSession.id);
          } else {
            const hasAnyCredit = (dbBalance !== null && dbBalance > 0) || (metaBalance !== null && metaBalance > 0);
            const isStrictlyZero = (dbBalance !== null && dbBalance <= 0) && (metaBalance === null || metaBalance <= 0);

            if (isStrictlyZero && !hasAnyCredit) {
              await supabase
                .from('interview_sessions')
                .update({ status: 'ABANDONED' })
                .eq('id', requestedSession.id);

              cleanup();
              return NextResponse.json(
                { error: 'Solde insuffisant. Vous avez 0 crédit de simulation. Veuillez recharger vos crédits pour reprendre ou démarrer un entretien.' },
                { status: 403 }
              );
            }

            sessionId = requestedSession.id;
            isExistingSession = true;
          }
        }
      } catch {
        // Poursuivre vers l'initialisation standard
      }
    }

    // A. Tenter d'abord la RPC atomique
    if (!sessionId) {
      const { data: atomicData, error: atomicError } = await supabase.rpc('start_interview_session_atomic', {
        p_user_id: user.id,
        p_profile_snapshot: profile,
      });

      if (!atomicError && atomicData === -1) {
        if (metaBalance !== null && metaBalance > 0) {
          // Repli vers débit metadata ci-dessous
        } else {
          cleanup();
          return NextResponse.json(
            { error: 'Solde insuffisant. Vous avez utilisé toutes vos simulations disponibles.' },
            { status: 403 }
          );
        }
      }

      if (!atomicError && atomicData && typeof atomicData === 'object') {
        const result = Array.isArray(atomicData) ? atomicData[0] : atomicData;
        if (result?.remaining_credits === -1 || (result?.session_id === null && result?.remaining_credits !== undefined)) {
          if (metaBalance !== null && metaBalance > 0) {
            // Repli vers débit metadata ci-dessous
          } else {
            cleanup();
            return NextResponse.json(
              { error: 'Solde insuffisant. Vous avez utilisé toutes vos simulations disponibles.' },
              { status: 403 }
            );
          }
        } else if (result?.session_id) {
          sessionId = result.session_id;
          isExistingSession = Boolean(result.is_existing);
        }
      }
    }

    // B. Mode de repli compatible (si la RPC atomique 005 n'est pas encore déployée ou si repli metadata requis)
    if (!sessionId) {
      // Protection anti-double clic / requêtes concurrentes : vérifier s'il existe une session récente IN_PROGRESS (< 2 minutes)
      try {
        const { data: existingSessions } = await supabase
          .from('interview_sessions')
          .select('id, started_at')
          .eq('user_id', user.id)
          .eq('status', 'IN_PROGRESS')
          .order('started_at', { ascending: false })
          .limit(1);

        if (existingSessions && existingSessions.length > 0) {
          const recentSession = existingSessions[0];
          const startedTime = new Date(recentSession.started_at).getTime();
          if (Date.now() - startedTime < 120000) {
            let checkBal: number | null = null;
            try {
              const { data: cRow } = await supabase.from('user_credits').select('balance').eq('user_id', user.id).maybeSingle();
              if (cRow && typeof cRow.balance === 'number') checkBal = cRow.balance;
            } catch {}

            const currentMeta = typeof user.user_metadata?.credits_balance === 'number' ? user.user_metadata.credits_balance : null;
            const hasCreds = (checkBal !== null && checkBal > 0) || (currentMeta !== null && currentMeta > 0);

            if (!hasCreds && checkBal !== null && checkBal <= 0) {
              await supabase.from('interview_sessions').update({ status: 'ABANDONED' }).eq('id', recentSession.id);
            } else {
              sessionId = recentSession.id;
              isExistingSession = true;
            }
          }
        }
      } catch {
        // Tolérance si table non accessible ou mock sans select
      }

      if (!sessionId) {
        let deductSuccess = false;

        // Si le solde en metadata est strictement positif, déduire depuis metadata
        if (metaBalance !== null && metaBalance > 0) {
          const newMetaBal = metaBalance - 1;
          try {
            await supabase.auth.updateUser({
              data: {
                credits: newMetaBal,
                credits_balance: newMetaBal,
              },
            });
          } catch (mErr) {
            console.warn('[Interview Start] Metadata update notice:', mErr);
          }
          deductSuccess = true;
        } else {
          // Débit via deduct_user_credit
          const { data: newBalance, error: rpcError } = await supabase.rpc('deduct_user_credit', { p_user_id: user.id });

          if (rpcError) {
            cleanup();
            console.error('[Credit RPC Error]', rpcError.message);
            return NextResponse.json(
              { error: "Impossible de vérifier ou mettre à jour votre solde de crédits. Veuillez réessayer." },
              { status: 500 }
            );
          }

          if (newBalance === -1) {
            cleanup();
            return NextResponse.json(
              { error: 'Solde insuffisant. Vous avez utilisé toutes vos simulations disponibles.' },
              { status: 403 }
            );
          }

          deductSuccess = true;
        }

        if (deductSuccess) {
          // Insertion de la session dans interview_sessions
          const { data: sessionRow, error: sessionInsertError } = await supabase
            .from('interview_sessions')
            .insert({
              user_id: user.id,
              profile_snapshot: profile,
              status: 'IN_PROGRESS',
              duration_seconds: 0,
              started_at: new Date().toISOString(),
            })
            .select('id')
            .single();

          if (sessionInsertError || !sessionRow?.id) {
            cleanup();
            console.error('[Session Insert Error]', sessionInsertError?.message);

            // Compensation immédiate : recréditer l'utilisateur
            try {
              await supabase.rpc('refund_user_credit', { p_user_id: user.id });
            } catch (refundErr) {
              console.error('[Credit Refund Failed]', refundErr);
            }

            return NextResponse.json(
              {
                error: "Impossible d'initialiser la session d'entretien sur le serveur. Votre crédit n'a pas été débité. Veuillez vérifier votre connexion et réessayer.",
                details: sessionInsertError?.message || 'Identifiant de session non généré.',
              },
              { status: 500 }
            );
          }

          sessionId = sessionRow.id;
        }
      }
    }

    if (!sessionId) {
      cleanup();
      return NextResponse.json(
        { error: "Échec de l'initialisation de la session d'entretien." },
        { status: 500 }
      );
    }

    // Récupérer les axes d'amélioration des bilans précédents pour continuité pédagogique
    let pastAreasToImprove: string[] = [];
    let pastSessionsQuestions: string[] = [];
    try {
      const { data: pastReports } = await supabase
        .from('evaluation_reports')
        .select('areas_to_improve')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1);

      if (pastReports && pastReports.length > 0 && Array.isArray(pastReports[0].areas_to_improve)) {
        pastAreasToImprove = pastReports[0].areas_to_improve
          .map((a: { criterion?: string; feedback?: string }) => a?.criterion || a?.feedback || '')
          .filter(Boolean);
      }

      // Récupérer les questions des sessions antérieures pour renouveler les questions d'une session à l'autre
      const { data: previousSessions } = await supabase
        .from('interview_sessions')
        .select('id')
        .eq('user_id', user.id)
        .neq('id', sessionId)
        .order('started_at', { ascending: false })
        .limit(5);

      if (previousSessions && previousSessions.length > 0) {
        const sessionIds = previousSessions.map((s: { id: string }) => s.id);
        const { data: turnsData } = await supabase
          .from('interview_turns')
          .select('ai_question')
          .in('session_id', sessionIds)
          .order('created_at', { ascending: false })
          .limit(20);

        if (turnsData && Array.isArray(turnsData)) {
          pastSessionsQuestions = turnsData
            .map((t: { ai_question?: string }) => t.ai_question?.trim() || '')
            .filter(Boolean);
        }
      }
    } catch {
      // Tolérance si table non accessible
    }

    // Si la session existait déjà (anti-double clic / réentrance), vérifier si le tour 1 a déjà été créé
    if (isExistingSession) {
      try {
        const { data: existingTurn } = await supabase
          .from('interview_turns')
          .select('ai_question, pedagogical_intent, created_at')
          .eq('session_id', sessionId)
          .eq('turn_index', 1)
          .maybeSingle();

        if (existingTurn?.ai_question) {
          cleanup();
          return NextResponse.json({
            success: true,
            sessionId,
            startedAt: existingTurn.created_at || new Date().toISOString(),
            maxDurationSeconds: 300,
            initialTurn: {
              turnIndex: 1,
              aiQuestion: existingTurn.ai_question,
              pedagogicalIntent: existingTurn.pedagogical_intent || 'Introduction',
              turnType: 'INITIAL',
            },
            diagnostic: {
              aiProvider: process.env.OPENAI_API_KEY ? 'openai-live' : 'pedagogical-engine-local',
              reusedSession: true,
            },
          });
        }
      } catch {
        // Poursuivre vers la génération normale si erreur de lecture du tour
      }
    }

    const startedAt = new Date().toISOString();
    const firstQuestion = await generateFirstQuestion(profile, pastAreasToImprove, pastSessionsQuestions, juryPersonality);
    cleanup();

    // 4. Enregistrement du premier tour
    try {
      await supabase.from('interview_turns').insert({
        session_id: sessionId,
        turn_index: 1,
        ai_question: firstQuestion.question,
        pedagogical_intent: firstQuestion.pedagogicalIntent,
        student_transcript: '',
        is_followup: false,
        duration_seconds: 0,
      });
    } catch {
      // Tolérance si la table turns n'est pas accessible
    }

    return NextResponse.json({
      success: true,
      sessionId,
      startedAt,
      maxDurationSeconds: 300, // 5 minutes strictes
      initialTurn: {
        turnIndex: 1,
        aiQuestion: firstQuestion.question,
        pedagogicalIntent: firstQuestion.pedagogicalIntent,
        turnType: 'INITIAL',
      },
      diagnostic: {
        aiProvider: process.env.OPENAI_API_KEY ? 'openai-live' : 'pedagogical-engine-local',
      },
    });
  } catch (err: unknown) {
    cleanup();
    const message = err instanceof Error ? err.message : 'Erreur lors du démarrage de l\'entretien.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
