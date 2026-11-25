'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Navbar } from '@/components/navigation/Navbar';
import { EvaluationReportView } from '@/components/report/EvaluationReportView';
import { EvaluationReport } from '@/types/interview';
import { Loader2 } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { inferEvaluationCompleteness } from '@/lib/indicators/progression';

export default function RapportPage() {
  const params = useParams();
  const router = useRouter();
  const sessionId = params.id as string;
  const [report, setReport] = useState<EvaluationReport | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchReport() {
      // 1. Chercher d'abord dans Supabase SI l'identifiant est un UUID valide
      const isUuid = typeof sessionId === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(sessionId.trim());

      if (isUuid) {
        try {
          const supabase = createClient();
          const { data: dbReport, error } = await supabase
            .from('evaluation_reports')
            .select('*')
            .or(`session_id.eq.${sessionId},id.eq.${sessionId}`)
            .maybeSingle();

          if (dbReport && !error) {
            const completeness = inferEvaluationCompleteness(dbReport);
            setReport({
              id: dbReport.id,
              sessionId: dbReport.session_id,
              overallScore: dbReport.overall_score,
              scoresByCriteria: dbReport.scores_by_criteria,
              strengths: dbReport.strengths,
              areasToImprove: dbReport.areas_to_improve,
              reformulationExamples: dbReport.reformulation_examples,
              revisionTopics: dbReport.revision_topics,
              synthesisSummary: dbReport.synthesis_summary,
              evaluationGridVersion: dbReport.evaluation_grid_version,
              evaluationCompleteness: completeness,
              isTechnicalIssue: dbReport.is_technical_issue ?? (completeness === 'UNAVAILABLE'),
              createdAt: dbReport.created_at,
            });
            setLoading(false);
            return;
          }
        } catch {
          // En cas d'indisponibilité de la base, poursuivre vers le cache local
        }
      }

      try {
        // 2. Fallback cache local : chercher le rapport par identifiant de session
        const specificReport = localStorage.getItem(`campus_france_report_${sessionId}`);
        if (specificReport) {
          const parsed = JSON.parse(specificReport);
          parsed.evaluationCompleteness = inferEvaluationCompleteness(parsed);
          setReport(parsed);
          setLoading(false);
          return;
        }

        // 3. Fallback dernier rapport généré localement
        const lastReport = localStorage.getItem('campus_france_last_report');
        if (lastReport) {
          const parsed = JSON.parse(lastReport);
          if (parsed && (parsed.id === sessionId || parsed.sessionId === sessionId)) {
            parsed.evaluationCompleteness = inferEvaluationCompleteness(parsed);
            setReport(parsed);
            setLoading(false);
            return;
          }
        }

        // Si aucun rapport réel n'est trouvé, ne PAS inventer de fausses données
        setReport(null);
        setLoading(false);
      } catch {
        setReport(null);
        setLoading(false);
      }
    }

    fetchReport();
  }, [sessionId, router]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#05070E] flex items-center justify-center text-[#38BDF8]">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  if (!report) {
    return (
      <div className="min-h-screen bg-[#05070E] flex flex-col justify-between text-slate-100 font-sans">
        <Navbar />
        <main className="flex-1 flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-[#0D121F] border border-white/10 rounded-3xl p-8 text-center space-y-5 shadow-2xl">
            <div className="w-12 h-12 mx-auto rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 font-bold">
              CF
            </div>
            <div className="space-y-2">
              <h1 className="text-xl font-bold text-white">Rapport Introuvable</h1>
              <p className="text-xs text-slate-400 leading-relaxed">
                Aucun rapport pédagogique enregistré n&apos;a été trouvé pour cette session. Les données sont créées automatiquement à la fin d&apos;une simulation d&apos;entretien.
              </p>
            </div>
            <div className="pt-2 flex flex-col gap-2.5">
              <button
                type="button"
                onClick={() => router.push('/entretien/preparation')}
                className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 text-white font-semibold text-xs transition shadow-lg shadow-blue-500/25"
              >
                Démarrer une simulation
              </button>
              <button
                type="button"
                onClick={() => router.push('/dashboard')}
                className="w-full py-2.5 px-4 rounded-xl bg-white/10 hover:bg-white/15 text-slate-300 text-xs font-medium transition"
              >
                Retour au Tableau de bord
              </button>
            </div>
          </div>
        </main>
        <footer className="border-t border-white/10 py-6 text-center text-xs text-slate-500 bg-[#05070E]">
          <p>PrépaCampus — Rapport pédagogique indépendant.</p>
        </footer>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#05070E] print:bg-white flex flex-col text-slate-100 print:text-slate-900 font-sans">
      <div className="print:hidden">
        <Navbar />
      </div>
      <main className="flex-1 py-4 print:py-0">
        <EvaluationReportView report={report} />
      </main>
      <footer className="border-t border-white/10 py-6 text-center text-xs text-slate-500 bg-[#05070E] print:hidden">
        <p>PrépaCampus — Rapport pédagogique indépendant.</p>
      </footer>
    </div>
  );
}

