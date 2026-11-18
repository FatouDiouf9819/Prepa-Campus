'use client';

import React, { useState } from 'react';
import { 
  X, 
  ArrowRight, 
  TrendingUp, 
  Trophy, 
  CheckCircle2, 
  AlertTriangle, 
  Sparkles,
  Quote
} from 'lucide-react';
import { 
  SessionRecord, 
  compareTwoSessions, 
  SessionComparisonResult 
} from '@/lib/indicators/progression';

interface ComparisonModalProps {
  isOpen: boolean;
  onClose: () => void;
  sessions: SessionRecord[];
  initialSessionAId?: string;
  initialSessionBId?: string;
}

export function ComparisonModal({
  isOpen,
  onClose,
  sessions,
  initialSessionAId,
  initialSessionBId,
}: ComparisonModalProps) {
  // Filtrer les sessions évaluées avec un rapport
  const evaluatedSessions = sessions.filter(
    (s) => s.evaluation_reports && s.evaluation_reports.length > 0
  );

  const defaultA =
    initialSessionAId ||
    (evaluatedSessions.length > 1
      ? evaluatedSessions[evaluatedSessions.length - 1].id // Plus ancienne
      : evaluatedSessions[0]?.id || '');

  const defaultB =
    initialSessionBId || (evaluatedSessions[0]?.id || ''); // Plus récente

  const [sessionAId, setSessionAId] = useState<string>(defaultA);
  const [sessionBId, setSessionBId] = useState<string>(defaultB);

  if (!isOpen) return null;

  const sessionA = evaluatedSessions.find((s) => s.id === sessionAId);
  const sessionB = evaluatedSessions.find((s) => s.id === sessionBId);

  const comparison: SessionComparisonResult | null =
    sessionA && sessionB ? compareTwoSessions(sessionA, sessionB) : null;

  const formatDate = (isoString?: string) => {
    if (!isoString) return 'Date inconnue';
    try {
      return new Date(isoString).toLocaleDateString('fr-FR', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      });
    } catch {
      return isoString;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-slate-950/80 backdrop-blur-md overflow-y-auto">
      <div className="relative w-full max-w-4xl bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl p-6 sm:p-8 space-y-6 max-h-[90vh] overflow-y-auto">
        {/* En-tête */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 flex items-center justify-center shrink-0">
              <TrendingUp className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-extrabold text-white">
                Comparateur Pédagogique Avant / Après
              </h2>
              <p className="text-xs text-slate-400">
                Mesurez avec précision vos progrès entre deux simulations d&apos;entretien.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition"
            aria-label="Fermer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Sélecteurs des deux sessions à comparer */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">
              Simulation de Référence (Session A)
            </label>
            <select
              value={sessionAId}
              onChange={(e) => setSessionAId(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-xs sm:text-sm text-slate-200 focus:outline-none focus:border-cyan-500"
            >
              {evaluatedSessions.map((s, idx) => {
                const rep = s.evaluation_reports?.[0];
                const score = rep?.overall_score;
                return (
                  <option key={s.id} value={s.id}>
                    Session #{evaluatedSessions.length - idx} • {formatDate(s.started_at)} ({score !== undefined ? `${score}/100` : 'Non noté'})
                  </option>
                );
              })}
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">
              Simulation Récente / Cible (Session B)
            </label>
            <select
              value={sessionBId}
              onChange={(e) => setSessionBId(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-xs sm:text-sm text-slate-200 focus:outline-none focus:border-cyan-500"
            >
              {evaluatedSessions.map((s, idx) => {
                const rep = s.evaluation_reports?.[0];
                const score = rep?.overall_score;
                return (
                  <option key={s.id} value={s.id}>
                    Session #{evaluatedSessions.length - idx} • {formatDate(s.started_at)} ({score !== undefined ? `${score}/100` : 'Non noté'})
                  </option>
                );
              })}
            </select>
          </div>
        </div>

        {/* Résultat de la Comparaison */}
        {comparison && (
          <div className="space-y-6">
            {/* Bannière Score Global */}
            <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-5 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-6 text-center sm:text-left">
                <div>
                  <span className="text-[11px] font-semibold text-slate-400 block mb-0.5">
                    Session A ({formatDate(comparison.sessionA.date)})
                  </span>
                  <span className="text-2xl sm:text-3xl font-extrabold text-slate-300">
                    {comparison.sessionA.score !== null ? `${comparison.sessionA.score}/100` : '—'}
                  </span>
                </div>

                <ArrowRight className="w-5 h-5 text-slate-600 hidden sm:block" />

                <div>
                  <span className="text-[11px] font-semibold text-cyan-400 block mb-0.5">
                    Session B ({formatDate(comparison.sessionB.date)})
                  </span>
                  <span className="text-2xl sm:text-3xl font-extrabold text-white">
                    {comparison.sessionB.score !== null ? `${comparison.sessionB.score}/100` : '—'}
                  </span>
                </div>
              </div>

              {comparison.scoreDiff !== null && (
                <div
                  className={`px-4 py-2.5 rounded-xl border flex items-center gap-2 ${
                    comparison.scoreDiff > 0
                      ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30'
                      : comparison.scoreDiff < 0
                      ? 'bg-amber-500/10 text-amber-300 border-amber-500/30'
                      : 'bg-slate-800 text-slate-300 border-slate-700'
                  }`}
                >
                  <Trophy className="w-5 h-5" />
                  <div>
                    <span className="text-[10px] font-semibold uppercase tracking-wider block">
                      Évolution Globale
                    </span>
                    <span className="text-base sm:text-lg font-black">
                      {comparison.scoreDiff > 0 ? `+${comparison.scoreDiff} points` : `${comparison.scoreDiff} points`}
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Comparaison Critère par Critère */}
            {comparison.criteria.length > 0 && (
              <div className="space-y-3">
                <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                  <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                  Progression par Critère Campus France
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {comparison.criteria.map((crit) => {
                    const diff = crit.diff;
                    return (
                      <div
                        key={crit.name}
                        className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-3.5 flex items-center justify-between gap-3"
                      >
                        <div className="min-w-0">
                          <span className="text-xs font-semibold text-white block truncate" title={crit.label}>
                            {crit.label}
                          </span>
                          <span className="text-[11px] text-slate-400">
                            {crit.scoreA !== null ? `${crit.scoreA}/${crit.maxScore}` : '—'} ➔{' '}
                            <strong className="text-slate-200">
                              {crit.scoreB !== null ? `${crit.scoreB}/${crit.maxScore}` : '—'}
                            </strong>
                          </span>
                        </div>

                        {diff !== null && (
                          <span
                            className={`text-xs font-bold px-2 py-1 rounded-lg shrink-0 ${
                              diff > 0
                                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                : diff < 0
                                ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                                : 'bg-slate-800 text-slate-400'
                            }`}
                          >
                            {diff > 0 ? `+${diff}` : diff}
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Forces & Reformulations acquises en Session B */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
              {/* Forces Session B */}
              {comparison.strengthsB.length > 0 && (
                <div className="bg-emerald-950/20 border border-emerald-500/20 rounded-2xl p-4 space-y-2">
                  <div className="flex items-center gap-2 text-emerald-400 text-xs font-bold">
                    <CheckCircle2 className="w-4 h-4" />
                    Points forts confirmés en Session B
                  </div>
                  <ul className="space-y-1.5 text-xs text-slate-300">
                    {comparison.strengthsB.slice(0, 3).map((s, idx) => (
                      <li key={idx} className="flex items-start gap-1.5">
                        <span className="text-emerald-400 mt-0.5">•</span>
                        <span>{s.feedback || s.verbatimQuote}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Axes de progrès Session B */}
              {comparison.areasToImproveB.length > 0 && (
                <div className="bg-amber-950/20 border border-amber-500/20 rounded-2xl p-4 space-y-2">
                  <div className="flex items-center gap-2 text-amber-400 text-xs font-bold">
                    <AlertTriangle className="w-4 h-4" />
                    Axes restants à perfectionner
                  </div>
                  <ul className="space-y-1.5 text-xs text-slate-300">
                    {comparison.areasToImproveB.slice(0, 3).map((a, idx) => (
                      <li key={idx} className="flex items-start gap-1.5">
                        <span className="text-amber-400 mt-0.5">•</span>
                        <span>{a.feedback || a.verbatimQuote}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            {/* Meilleure reformulation de la Session B */}
            {comparison.reformulationsB.length > 0 && comparison.reformulationsB[0]?.recommendedAnswer && (
              <div className="bg-slate-950 border border-cyan-500/30 rounded-2xl p-4 space-y-2">
                <div className="flex items-center gap-2 text-cyan-400 text-xs font-bold">
                  <Quote className="w-4 h-4" />
                  Exemple de reformulation travaillée (Session B)
                </div>
                {comparison.reformulationsB[0].studentQuote && (
                  <p className="text-xs text-slate-400 italic">
                    « {comparison.reformulationsB[0].studentQuote} »
                  </p>
                )}
                <div className="p-3 rounded-xl bg-cyan-950/30 border border-cyan-500/20 text-xs text-cyan-200">
                  <strong className="block text-cyan-300 font-semibold mb-1">
                    Formulation recommandée le jour de l&apos;entretien :
                  </strong>
                  « {comparison.reformulationsB[0].recommendedAnswer} »
                </div>
              </div>
            )}
          </div>
        )}

        {/* Pied de dialogue */}
        <div className="flex justify-end pt-4 border-t border-slate-800">
          <button
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-white transition"
          >
            Fermer le comparateur
          </button>
        </div>
      </div>
    </div>
  );
}
