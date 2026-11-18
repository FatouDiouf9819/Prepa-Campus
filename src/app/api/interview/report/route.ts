import { NextRequest, NextResponse } from 'next/server';
import { generateEvaluationReport } from '@/lib/ai/openai';
import { TIMEOUTS, createTimeoutSignal } from '@/config/timeouts';
import { AcademicProfileData } from '@/types/profile';
import { InterviewTurn } from '@/types/interview';
import { createServerSupabaseClient } from '@/lib/supabase/server';

/**
 * POST /api/interview/report
 * Génère le bilan pédagogique approfondi après l'entretien de 5 minutes
 * et enregistre le rapport dans la table Supabase evaluation_reports.
 */
export async function POST(request: NextRequest) {
  const { cleanup } = createTimeoutSignal(TIMEOUTS.FINAL_REPORT_GENERATION_MS);

  try {
    // 1. Contrôle d'authentification obligatoire
    const supabase = await createServerSupabaseClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      cleanup();
      return NextResponse.json(
        { error: 'Non authentifié. Connexion requise pour générer votre bilan.' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { 
      profile, 
      turns,
      sessionId
    }: { 
      profile: AcademicProfileData; 
      turns: InterviewTurn[];
      sessionId?: string;
    } = body;

    if (!profile || !turns || turns.length === 0) {
      cleanup();
      return NextResponse.json(
        { error: 'Données insuffisantes pour générer le rapport.' },
        { status: 400 }
      );
    }

    // Contrôle strict de propriété de la session avant calcul du rapport
    if (sessionId && !sessionId.startsWith('session_')) {
      const { data: sessionData, error: sessionCheckError } = await supabase
        .from('interview_sessions')
        .select('id, user_id')
        .eq('id', sessionId)
        .maybeSingle();

      if (!sessionCheckError && (!sessionData || sessionData.user_id !== user.id)) {
        cleanup();
        return NextResponse.json(
          { error: 'Accès refusé. Vous n\'êtes pas le propriétaire de cette session.' },
          { status: 403 }
        );
      }
    }

    const report = await generateEvaluationReport(profile, turns);
    cleanup();

    // 2. Persistance réelle du rapport dans Supabase (table evaluation_reports)
    if (sessionId && !sessionId.startsWith('session_')) {
      try {
        const payloadWithStatus = {
          session_id: sessionId,
          user_id: user.id,
          overall_score: report.overallScore,
          scores_by_criteria: report.scoresByCriteria,
          strengths: report.strengths,
          areas_to_improve: report.areasToImprove,
          reformulation_examples: report.reformulationExamples,
          revision_topics: report.revisionTopics,
          synthesis_summary: report.synthesisSummary,
          evaluation_grid_version: report.evaluationGridVersion || 'v1.0.0',
          evaluation_completeness: report.evaluationCompleteness || 'COMPLETE',
          is_technical_issue: report.isTechnicalIssue ?? false,
        };

        let { data: savedReport, error: upsertError } = await supabase
          .from('evaluation_reports')
          .upsert(payloadWithStatus, { onConflict: 'session_id' })
          .select('id')
          .maybeSingle();

        // Si une colonne n'existe pas encore sur la base distante non migrée (PostgREST PGRST204 ou code 42703)
        if (upsertError) {
          console.warn('[Supabase Report Save with Status Warning, falling back to legacy schema]', upsertError.message);
          const legacyPayload = {
            session_id: sessionId,
            user_id: user.id,
            overall_score: report.overallScore,
            scores_by_criteria: report.scoresByCriteria,
            strengths: report.strengths,
            areas_to_improve: report.areasToImprove,
            reformulation_examples: report.reformulationExamples,
            revision_topics: report.revisionTopics,
            synthesis_summary: report.synthesisSummary,
            evaluation_grid_version: report.evaluationGridVersion || 'v1.0.0',
          };
          const fallback = await supabase
            .from('evaluation_reports')
            .upsert(legacyPayload, { onConflict: 'session_id' })
            .select('id')
            .maybeSingle();
          savedReport = fallback.data;
          upsertError = fallback.error;
        }

        if (savedReport?.id) {
          report.id = savedReport.id;
        }
        report.sessionId = sessionId;

        // Mettre à jour le statut de la session en 'COMPLETED'
        await supabase.from('interview_sessions').update({
          status: 'COMPLETED',
          ended_at: new Date().toISOString(),
        }).eq('id', sessionId);
      } catch (err) {
        console.warn('[Supabase Report Save Warning]', err);
      }
    }

    return NextResponse.json({
      success: true,
      report,
    });
  } catch (err: unknown) {
    cleanup();
    console.error('[Evaluation Report Error]', err);
    const message = err instanceof Error ? err.message : 'Erreur lors de la génération du rapport.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
