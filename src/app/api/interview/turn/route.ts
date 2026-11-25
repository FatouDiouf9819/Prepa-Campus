import { NextRequest, NextResponse } from 'next/server';
import { generateAdaptiveTurn } from '@/lib/ai/openai';
import { TIMEOUTS, createTimeoutSignal } from '@/config/timeouts';
import { AcademicProfileData } from '@/types/profile';
import { InterviewTurn, JuryPersonality } from '@/types/interview';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { isTechnicalOrInvalidAnswer } from '@/lib/ai/validation';

export const maxDuration = 60; // 60 secondes max pour les Serverless Functions Vercel
export const dynamic = 'force-dynamic';

/**
 * POST /api/interview/turn
 * Analyse la réponse de l'étudiant et génère le tour suivant (relance ciblée ou question suivante).
 * Contrôle rigoureusement la validité de la réponse et la limite des 5 minutes côté serveur.
 */
export async function POST(request: NextRequest) {
  const { cleanup } = createTimeoutSignal(TIMEOUTS.AI_TURN_GENERATION_MS);

  try {
    // 1. Contrôle d'authentification
    const supabase = await createServerSupabaseClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      cleanup();
      return NextResponse.json(
        { error: 'Non authentifié. Connexion requise.' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { 
      sessionId, 
      turnIndex, 
      currentQuestion,
      studentTranscript, 
      elapsedSeconds, 
      profile, 
      turnsHistory,
      juryPersonality,
    }: {
      sessionId: string;
      turnIndex: number;
      currentQuestion?: string;
      studentTranscript: string;
      elapsedSeconds: number;
      profile: AcademicProfileData;
      turnsHistory: InterviewTurn[];
      juryPersonality?: JuryPersonality;
    } = body;

    if (!profile) {
      cleanup();
      return NextResponse.json({ error: 'Profil manquant.' }, { status: 400 });
    }

    // Validation stricte du texte du candidat : rejeter tout message technique ou vide
    const trimmedTranscript = (studentTranscript || '').trim();
    if (!trimmedTranscript || isTechnicalOrInvalidAnswer(trimmedTranscript)) {
      cleanup();
      return NextResponse.json(
        { 
          error: "Votre réponse ne contient aucun texte exploitable. Veuillez réenregistrer votre réponse orale ou la saisir au clavier.",
          isTechnicalMessage: true
        },
        { status: 400 }
      );
    }


    // Contrôle strict de propriété de la session avant tout traitement IA
    if (sessionId && !sessionId.startsWith('session_')) {
      const { data: sessionData, error: sessionCheckError } = await supabase
        .from('interview_sessions')
        .select('id, user_id, status')
        .eq('id', sessionId)
        .maybeSingle();

      if (!sessionCheckError) {
        if (!sessionData || sessionData.user_id !== user.id) {
          cleanup();
          return NextResponse.json(
            { error: 'Accès refusé. Vous n\'êtes pas le propriétaire de cette session.' },
            { status: 403 }
          );
        }
        if (sessionData.status === 'COMPLETED') {
          cleanup();
          return NextResponse.json(
            { error: 'Cette session est déjà clôturée.' },
            { status: 400 }
          );
        }
      }
    }

    // Contrôle d'intégrité temporelle côté serveur
    const isOverTimeLimit = elapsedSeconds >= 300;

    if (isOverTimeLimit) {
      cleanup();
      return NextResponse.json({
        question: "Notre entretien de 5 minutes est à présent terminé. Je vous remercie pour vos réponses. Vos résultats et votre analyse détaillée sont en cours de préparation.",
        pedagogicalIntent: "Fin officielle du temps réglementaire de 5 minutes.",
        turnType: 'CONCLUSION',
        isConcluding: true,
      });
    }

    // Récupérer les axes d'amélioration passés et les questions antérieures pour renouveler l'échange
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

      const { data: previousSessions } = await supabase
        .from('interview_sessions')
        .select('id')
        .eq('user_id', user.id)
        .neq('id', sessionId || '')
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

    const adaptiveResult = await generateAdaptiveTurn(
      profile,
      turnsHistory || [],
      studentTranscript || '',
      elapsedSeconds || 0,
      pastAreasToImprove,
      pastSessionsQuestions,
      juryPersonality,
      currentQuestion
    );

    cleanup();

    // Persistance du tour dans la base de données
    if (sessionId && !sessionId.startsWith('session_')) {
      try {
        await supabase.from('interview_turns').insert({
          session_id: sessionId,
          turn_index: (turnIndex || 1) + 1,
          ai_question: adaptiveResult.question,
          pedagogical_intent: adaptiveResult.pedagogicalIntent,
          student_transcript: studentTranscript || '',
          is_followup: adaptiveResult.turnType === 'FOLLOWUP',
          duration_seconds: elapsedSeconds || 0,
        });
      } catch {
        // Ignorer si la table n'a pas encore été créée
      }
    }

    return NextResponse.json({
      success: true,
      sessionId,
      turnIndex: (turnIndex || 1) + 1,
      question: adaptiveResult.question,
      pedagogicalIntent: adaptiveResult.pedagogicalIntent,
      turnType: adaptiveResult.turnType,
      evaluationStatus: adaptiveResult.evaluationStatus,
      relevanceCategory: adaptiveResult.relevanceCategory,
      isConcluding: adaptiveResult.isConcluding,
    });
  } catch (err: unknown) {
    cleanup();
    console.error('[Interview Turn Error]', err);
    const message = err instanceof Error ? err.message : 'Erreur lors du traitement du tour de parole.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
