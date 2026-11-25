'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { 
  Trophy, 
  CheckCircle2, 
  AlertTriangle, 
  Sparkles, 
  BookOpen, 
  RotateCcw, 
  ShieldCheck, 
  Quote,
  ArrowRight,
  TrendingUp,
  Printer,
  Mic,
  Download,
  FileText
} from 'lucide-react';
import { EvaluationReport } from '@/types/interview';
import { inferEvaluationCompleteness, getCampusReadinessIndicator } from '@/lib/indicators/progression';
import { analyzeSpeechFluency } from '@/lib/indicators/speechAnalytics';
import { RevisionMemoModal } from '@/components/history/RevisionMemoModal';
import { printReportDocument, downloadReportHtml } from '@/lib/report/printReport';

interface ReportProps {
  report: EvaluationReport;
}

export function EvaluationReportView({ report }: ReportProps) {
  const [memoModalOpen, setMemoModalOpen] = useState(false);
  const completeness = report.evaluationCompleteness || inferEvaluationCompleteness(report);
  const isUnavailable = completeness === 'UNAVAILABLE';
  const readiness = getCampusReadinessIndicator(report.overallScore);

  const studentQuotes = [
    ...(report.strengths || []).map((s) => s.verbatimQuote || '').filter(Boolean),
    ...(report.areasToImprove || []).map((a) => a.verbatimQuote || '').filter(Boolean),
    ...(report.reformulationExamples || []).map((r) => r.studentQuote || '').filter(Boolean),
  ];

  // Calcul du temps d'élocution effectif basé sur le volume réel de mots exprimés
  // Standard officiel d'élocution française académique : 120-130 mots par minute
  const totalExtractedWords = studentQuotes.join(' ').split(/\s+/).filter(Boolean).length;
  const estimatedSpeakingSeconds = Math.max(15, Math.round((totalExtractedWords / 125) * 60));
  const speechAnalytics = analyzeSpeechFluency(studentQuotes, estimatedSpeakingSeconds);

  const getScoreColor = (score: number) => {
    if (score >= 75) return 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10';
    if (score >= 60) return 'text-cyan-400 border-cyan-500/30 bg-cyan-500/10';
    return 'text-amber-400 border-amber-500/30 bg-amber-500/10';
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-8">
      {/* Barre d'actions d'impression & téléchargement PDF rapide (masquée à l'impression) */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-4 rounded-2xl bg-slate-900/90 border border-slate-800 print:hidden shadow-xl backdrop-blur-md">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-blue-500/15 border border-blue-500/30 text-cyan-400 flex items-center justify-center font-bold text-xs">
            CF
          </div>
          <div>
            <span className="font-bold text-white text-xs sm:text-sm block">Bilan Officieux Campus France</span>
            <span className="text-[11px] text-slate-400">Prêt pour impression ou sauvegarde en PDF</span>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={() => downloadReportHtml(report)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white border border-slate-700 text-xs font-semibold transition active:scale-95 cursor-pointer shadow-sm"
            title="Télécharger le fichier complet pour consultation hors-ligne"
          >
            <Download className="w-3.5 h-3.5 text-cyan-400" />
            <span>Télécharger (Fichier)</span>
          </button>

          <button
            type="button"
            onClick={() => printReportDocument(report)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-blue-600 via-cyan-500 to-teal-400 hover:from-blue-500 hover:to-cyan-400 text-white text-xs font-bold transition shadow-md shadow-blue-500/20 active:scale-95 cursor-pointer"
            title="Imprimer ou enregistrer le bilan complet en PDF"
          >
            <Printer className="w-4 h-4" />
            <span>Imprimer mon Bilan (PDF)</span>
          </button>

          <button
            type="button"
            onClick={() => setMemoModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-neutral-900 hover:bg-neutral-800 border border-neutral-750 text-neutral-300 hover:text-white text-xs font-semibold transition active:scale-95 cursor-pointer"
            title="Consulter et imprimer la Fiche Réflexe résumée"
          >
            <FileText className="w-3.5 h-3.5 text-amber-400" />
            <span>Fiche Mémo</span>
          </button>
        </div>
      </div>

      {/* En-tête Bilan */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-6 sm:p-8 backdrop-blur-md shadow-2xl relative overflow-hidden">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 relative z-10">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-cyan-400 text-xs font-semibold mb-3">
              <Trophy className="w-3.5 h-3.5" />
              Bilan Pédagogique Officieux (Simulation 5 Minutes)
            </div>
            <h1 className="text-2xl sm:text-4xl font-extrabold text-white tracking-tight">
              Analyse Détaillée de votre Entretien
            </h1>
            <p className="mt-2 text-sm text-slate-300 max-w-2xl leading-relaxed">
              {report.synthesisSummary}
            </p>

            {/* Alerte déontologique en cas d'évaluation indisponible ou partielle */}
            {isUnavailable ? (
              <div className="mt-4 p-4 rounded-2xl bg-amber-950/40 border border-amber-500/40 text-amber-200 text-xs flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <strong className="block text-amber-300 font-semibold">
                    Évaluation indisponible — Données orales insuffisantes
                  </strong>
                  <p className="text-amber-200/90 leading-relaxed">
                    Aucune prise de parole exploitable n&apos;a été enregistrée durant cette simulation (microphone muet, accès refusé ou silence). Ce résultat ne reflète pas vos compétences académiques mais une absence d&apos;échanges oraux enregistrés.
                  </p>
                </div>
              </div>
            ) : completeness === 'PARTIAL' ? (
              <div className="mt-4 p-4 rounded-2xl bg-blue-950/40 border border-blue-500/40 text-cyan-200 text-xs flex items-start gap-3">
                <Sparkles className="w-5 h-5 text-cyan-400 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <strong className="block text-cyan-300 font-semibold">
                    Évaluation partielle
                  </strong>
                  <p className="text-cyan-200/90 leading-relaxed">
                    Ce bilan est fondé sur les réponses orales exploitables fournies. Certains tours n&apos;ont pas pu être pris en compte en raison d&apos;enregistrements inaudibles.
                  </p>
                </div>
              </div>
            ) : null}
          </div>

          {/* Campus Readiness Score™ */}
          <div className="flex flex-col items-center justify-center p-6 rounded-2xl bg-[#0e0e0e] border border-neutral-800 min-w-[190px] text-center shadow-lg">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
              Campus Readiness Score™
            </span>
            <div className="text-4xl sm:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-300">
              {isUnavailable ? '—' : report.overallScore}
              <span className="text-xl text-slate-500 font-normal">/100</span>
            </div>
            {isUnavailable ? (
              <span className="text-[11px] text-slate-500 font-medium mt-1">Données insuffisantes</span>
            ) : (
              <span className={`mt-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-semibold border ${readiness.badgeClass}`}>
                {readiness.label}
              </span>
            )}
          </div>
        </div>

        {/* Avertissement déontologique */}
        <div className="mt-6 pt-4 border-t border-slate-800/80 text-xs text-slate-400 flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-cyan-400 shrink-0" />
          <span>
            Ce score est exclusivement pédagogique et vise votre progression. Il ne constitue aucune décision officielle de Campus France.
          </span>
        </div>
      </div>

      {/* Analyse Vocale & Diction (Speech Analytics) */}
      {speechAnalytics.totalWords > 0 && (
        <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-4 sm:p-5 backdrop-blur-md shadow-md">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-blue-500/10 border border-blue-500/20 text-cyan-400 flex items-center justify-center shrink-0">
                <Mic className="w-4 h-4" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm sm:text-base font-bold text-white">Analyse Vocale & Diction</span>
                  <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${speechAnalytics.paceColorClass}`}>
                    {speechAnalytics.paceLabel} ({speechAnalytics.wordsPerMinute} mots/min)
                  </span>
                  <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold border ${speechAnalytics.fluencyColorClass}`}>
                    {speechAnalytics.fluencyBadge}
                  </span>
                </div>
                <p className="text-xs sm:text-sm text-slate-300 mt-1.5 leading-relaxed">
                  {speechAnalytics.feedback}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 5 Critères d'Évaluation */}
      <div>
        <h2 className="text-xl sm:text-2xl font-bold text-white mb-4 flex items-center gap-2.5">
          <TrendingUp className="w-5 h-5 text-cyan-400" />
          Évaluation Critère par Critère
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {report.scoresByCriteria.map((crit) => (
            <div
              key={crit.name}
              className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-5 backdrop-blur-md flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-medium text-slate-300 line-clamp-1">
                    {crit.label}
                  </span>
                  <span
                    className={`px-2 py-0.5 rounded-lg text-xs font-bold border ${
                      isUnavailable
                        ? 'text-amber-400 border-amber-500/30 bg-amber-500/10'
                        : getScoreColor((crit.score / crit.maxScore) * 100)
                    }`}
                  >
                    {isUnavailable ? `—/${crit.maxScore}` : `${crit.score}/${crit.maxScore}`}
                  </span>
                </div>

                <div className="w-full h-2 bg-slate-950 rounded-full overflow-hidden mb-3">
                  <div
                    className={`h-full rounded-full ${
                      isUnavailable ? 'bg-slate-800' : 'bg-gradient-to-r from-blue-500 to-cyan-400'
                    }`}
                    style={{ width: isUnavailable ? '0%' : `${(crit.score / crit.maxScore) * 100}%` }}
                  />
                </div>

                <p className="text-xs text-slate-400 leading-relaxed">
                  {crit.comment}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Deux Colonnes : Points Forts & Points à Travailler */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Points Forts (avec citations réelles) */}
        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 backdrop-blur-md space-y-4">
          <h2 className="text-base font-bold text-emerald-300 flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-400" />
            Points Forts Démontrés
          </h2>

          <div className="space-y-3">
            {report.strengths.map((s, idx) => (
              <div key={idx} className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 space-y-2">
                <span className="text-xs font-semibold text-cyan-400 block">{s.criterion}</span>
                {s.verbatimQuote && (
                  <div className="p-2.5 rounded-lg bg-slate-900/80 border border-slate-800/60 text-xs text-slate-300 italic flex items-start gap-2">
                    <Quote className="w-3.5 h-3.5 text-slate-500 shrink-0 mt-0.5" />
                    <span>&ldquo;{s.verbatimQuote}&rdquo;</span>
                  </div>
                )}
                <p className="text-xs text-slate-300 leading-relaxed">{s.feedback}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Axes d'Amélioration & Verbatim */}
        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 backdrop-blur-md space-y-4">
          <h2 className="text-base font-bold text-amber-300 flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-amber-400" />
            Points à Améliorer & Relances
          </h2>

          <div className="space-y-3">
            {report.areasToImprove.map((a, idx) => (
              <div key={idx} className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 space-y-2">
                <span className="text-xs font-semibold text-amber-400 block">{a.criterion}</span>
                {a.verbatimQuote && (
                  <div className="p-2.5 rounded-lg bg-slate-900/80 border border-slate-800/60 text-xs text-slate-300 italic flex items-start gap-2">
                    <Quote className="w-3.5 h-3.5 text-slate-500 shrink-0 mt-0.5" />
                    <span>&ldquo;{a.verbatimQuote}&rdquo;</span>
                  </div>
                )}
                <p className="text-xs text-slate-300 leading-relaxed">{a.feedback}</p>
                {a.suggestedReformulation && (
                  <div className="p-2.5 rounded-lg bg-blue-950/30 border border-blue-500/20 text-xs text-cyan-300">
                    <strong>Suggestion :</strong> {a.suggestedReformulation}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Exemples Concrets de Reformulation */}
      {report.reformulationExamples && report.reformulationExamples.length > 0 && (
        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 backdrop-blur-md space-y-4">
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-cyan-400" />
            Exemples de Reformulation Académique
          </h2>

          <div className="space-y-4">
            {report.reformulationExamples.map((ref, idx) => (
              <div key={idx} className="p-4 rounded-xl bg-slate-950/70 border border-slate-800/80 space-y-2">
                <span className="text-xs font-medium text-slate-400 uppercase tracking-wider block">
                  Contexte : {ref.originalContext}
                </span>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                  <div className="p-3 rounded-lg bg-rose-950/20 border border-rose-500/20 text-rose-300">
                    <strong className="block text-rose-400 mb-1">Votre réponse d&apos;origine :</strong>
                    &ldquo;{ref.studentQuote}&rdquo;
                  </div>
                  <div className="p-3 rounded-lg bg-emerald-950/20 border border-emerald-500/20 text-emerald-300">
                    <strong className="block text-emerald-400 mb-1">Reformulation recommandée :</strong>
                    &ldquo;{ref.recommendedAnswer}&rdquo;
                  </div>
                </div>
                <p className="text-xs text-slate-400 pt-1">
                  <em>{ref.explanation}</em>
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recommandations & Fiches de Révision */}
      {report.revisionTopics && report.revisionTopics.length > 0 && (
        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 backdrop-blur-md space-y-3">
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-cyan-400" />
            Thèmes à Réviser Prioritairement
          </h2>
          <ul className="space-y-2 text-xs sm:text-sm text-slate-300">
            {report.revisionTopics.map((topic, idx) => (
              <li key={idx} className="flex items-start gap-2.5">
                <ArrowRight className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
                <span>{topic}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Actions de fin (masquées à l'impression) */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 print:hidden">
        <Link
          href="/dashboard"
          className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl border border-neutral-800 text-neutral-300 hover:text-white hover:bg-neutral-900 text-xs sm:text-sm font-semibold transition"
        >
          Retour au Tableau de bord
        </Link>

        <div className="flex flex-wrap items-center gap-2.5 w-full sm:w-auto justify-end">
          <button
            type="button"
            onClick={() => downloadReportHtml(report)}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-4 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 hover:text-white text-xs sm:text-sm font-semibold transition shadow-sm cursor-pointer"
            title="Télécharger le fichier complet pour consultation hors-ligne"
          >
            <Download className="w-4 h-4 text-cyan-400" />
            <span>Télécharger (Fichier)</span>
          </button>

          <button
            type="button"
            onClick={() => printReportDocument(report)}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-gradient-to-r from-blue-600 via-cyan-500 to-teal-400 hover:from-blue-500 hover:to-cyan-400 text-white text-xs sm:text-sm font-bold shadow-lg shadow-blue-500/25 transition active:scale-95 cursor-pointer"
            title="Imprimer ou enregistrer le bilan complet en PDF"
          >
            <Printer className="w-4 h-4" />
            <span>Imprimer mon Bilan (PDF)</span>
          </button>

          <button
            type="button"
            onClick={() => setMemoModalOpen(true)}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-4 py-3 rounded-xl bg-neutral-900 hover:bg-neutral-850 border border-neutral-750 text-white text-xs sm:text-sm font-semibold transition shadow-sm hover:border-neutral-600 cursor-pointer"
          >
            <FileText className="w-4 h-4 text-amber-400" />
            <span>Fiche Mémo (PDF)</span>
          </button>

          <Link
            href="/entretien/preparation"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs sm:text-sm font-semibold shadow-lg shadow-emerald-600/25 transition"
          >
            <RotateCcw className="w-4 h-4" />
            Refaire une simulation
          </Link>
        </div>

        {/* Notice déontologique d'indépendance */}
        <p className="mt-6 text-center text-[11px] text-neutral-400 max-w-xl mx-auto leading-relaxed print:hidden">
          PrépaCampus est une plateforme indépendante d’entraînement pédagogique par intelligence artificielle. Elle n’est affiliée à aucun organisme d’État ni à l’agence Campus France.
        </p>
      </div>

      {/* Modal Mémo de Révision & Impression PDF */}
      <RevisionMemoModal
        isOpen={memoModalOpen}
        onClose={() => setMemoModalOpen(false)}
        sessions={[{
          id: report.sessionId,
          created_at: report.createdAt,
          duration_seconds: 300,
          status: 'COMPLETED',
          evaluation_reports: [{
            id: report.id,
            overall_score: report.overallScore,
            synthesis_summary: report.synthesisSummary,
            evaluation_completeness: report.evaluationCompleteness || 'COMPLETE',
            scores_by_criteria: report.scoresByCriteria,
            strengths: report.strengths,
            areas_to_improve: report.areasToImprove,
            reformulation_examples: report.reformulationExamples,
            revision_topics: report.revisionTopics,
            created_at: report.createdAt,
          }],
        }]}
      />
    </div>
  );
}
