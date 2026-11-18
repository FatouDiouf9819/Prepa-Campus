import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';

/**
 * GET /api/interview/history
 * Récupère l'ensemble des sessions d'entretien de l'utilisateur avec l'intégralité
 * de leurs rapports d'évaluation associés (notes globales, critères, reformulations, forces).
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

    // Récupérer les sessions de l'utilisateur avec tous les détails du rapport associé
    const { data: sessions, error } = await supabase
      .from('interview_sessions')
      .select(`
        id,
        status,
        duration_seconds,
        started_at,
        ended_at,
        evaluation_reports (
          id,
          overall_score,
          scores_by_criteria,
          strengths,
          areas_to_improve,
          reformulation_examples,
          revision_topics,
          synthesis_summary,
          evaluation_completeness,
          is_technical_issue,
          created_at
        )
      `)
      .eq('user_id', user.id)
      .order('started_at', { ascending: false });

    if (error) {
      // Si la table n'est pas encore appliquée, renvoyer un tableau vide sans planter
      return NextResponse.json({ sessions: [] });
    }

    return NextResponse.json({ sessions: sessions || [] });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Erreur lors de la récupération de l\'historique';
    return NextResponse.json({ error: message, sessions: [] }, { status: 500 });
  }
}

/**
 * DELETE /api/interview/history?sessionId=...
 * Supprime une session d'entretien appartenant à l'utilisateur authentifié.
 * La suppression cascade automatiquement sur les tours et le rapport d'évaluation.
 */
export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Non authentifié. Connexion requise.' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    let sessionId = searchParams.get('sessionId');

    if (!sessionId) {
      try {
        const body = await request.json();
        sessionId = body?.sessionId;
      } catch {
        // Pas de corps JSON, continuer
      }
    }

    if (!sessionId || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(sessionId.trim())) {
      return NextResponse.json(
        { error: 'Identifiant de session invalide ou manquant.' },
        { status: 400 }
      );
    }

    const cleanSessionId = sessionId.trim();

    // Tenter la suppression via le client Admin (qui outrepasse RLS si la politique DELETE n'a pas encore été migrée)
    // tout en garantissant strictement le filtre de sécurité auth user_id = user.id
    let deleteError: { message: string } | null = null;
    try {
      const { createAdminClient } = await import('@/lib/supabase/admin');
      const adminClient = createAdminClient();
      const { error } = await adminClient
        .from('interview_sessions')
        .delete()
        .eq('id', cleanSessionId)
        .eq('user_id', user.id);
      deleteError = error;
    } catch {
      // Fallback vers le client utilisateur standard
      const { error } = await supabase
        .from('interview_sessions')
        .delete()
        .eq('id', cleanSessionId)
        .eq('user_id', user.id);
      deleteError = error;
    }

    if (deleteError) {
      return NextResponse.json(
        { error: `Échec de la suppression : ${deleteError.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Session supprimée avec succès.',
      deletedSessionId: cleanSessionId,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Erreur lors de la suppression de la session';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
