'use client';

import React from 'react';
import { 
  X, 
  Printer, 
  FileText, 
  CheckCircle2, 
  AlertTriangle, 
  Quote, 
  ShieldCheck,
  Download
} from 'lucide-react';
import { SessionRecord, generateRevisionMemo } from '@/lib/indicators/progression';
import { printMemoDocument, downloadMemoHtml } from '@/lib/report/printReport';

interface RevisionMemoModalProps {
  isOpen: boolean;
  onClose: () => void;
  sessions: SessionRecord[];
}

export function RevisionMemoModal({ isOpen, onClose, sessions }: RevisionMemoModalProps) {
  if (!isOpen) return null;

  const memo = generateRevisionMemo(sessions);

  const handlePrint = () => {
    printMemoDocument(memo);
  };

  const handleDownload = () => {
    downloadMemoHtml(memo);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-slate-950/85 backdrop-blur-md overflow-y-auto print:p-0 print:bg-white print:static">
      <div className="relative w-full max-w-4xl bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl p-6 sm:p-8 space-y-6 max-h-[90vh] overflow-y-auto print:max-h-none print:overflow-visible print:border-none print:shadow-none print:p-6 print:bg-white print:text-black">
        {/* Barre d'action supérieure (masquée à l'impression) */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-4 print:hidden">
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-cyan-400" />
            <h2 className="text-base sm:text-lg font-extrabold text-white">
              Fiche Réflexe Campus France
            </h2>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleDownload}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium text-xs border border-slate-700 transition"
              title="Télécharger la fiche au format HTML autonome"
            >
              <Download className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Télécharger</span>
            </button>
            <button
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 text-white font-bold text-xs shadow-md transition"
            >
              <Printer className="w-4 h-4" />
              Imprimer / PDF
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition"
              aria-label="Fermer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* CONTENU IMPRIMABLE */}
        <div className="space-y-6 print:space-y-4">
          {/* En-tête officiel de la fiche */}
          <div className="border-b border-slate-800 print:border-slate-300 pb-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <span className="text-[10px] font-bold text-cyan-400 print:text-blue-700 uppercase tracking-widest block mb-1">
                  PrépaCampus • Fiche de Révision Pédagogique
                </span>
                <h1 className="text-xl sm:text-2xl font-black text-white print:text-slate-900">
                  Fiche Réflexe pour le Jour J
                </h1>
                <p className="text-xs text-slate-400 print:text-slate-600 mt-1">
                  Document de synthèse personnalisé basé sur vos entraînements oraux. À relire attentivement avant d&apos;entrer en entretien officiel.
                </p>
              </div>

              {/* Indicateur de préparation */}
              <div className="text-right shrink-0">
                <span className="text-[10px] uppercase tracking-wider text-slate-500 print:text-slate-600 font-semibold block">
                  Meilleur score
                </span>
                <span className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-300 print:text-blue-800">
                  {memo.highestScore !== null ? `${memo.highestScore}/100` : '—'}
                </span>
                <span className="text-[10px] text-slate-400 print:text-slate-500 block">
                  {memo.evaluatedCount} simulation{memo.evaluatedCount > 1 ? 's' : ''} analysée{memo.evaluatedCount > 1 ? 's' : ''}
                </span>
              </div>
            </div>
          </div>

          {/* Section 1 : Vos 3 Forces Acquises */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-xs font-bold text-emerald-400 print:text-emerald-700 uppercase tracking-wider">
              <CheckCircle2 className="w-4 h-4" />
              Vos Points Forts Confirmés (À capitaliser lors de l&apos;entretien)
            </div>
            {memo.strengths.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {memo.strengths.map((s, idx) => (
                  <div
                    key={idx}
                    className="p-3.5 rounded-xl bg-slate-950/80 border border-emerald-500/20 print:border-slate-300 print:bg-slate-50 text-xs space-y-1"
                  >
                    <span className="font-semibold text-emerald-300 print:text-emerald-800 block">
                      {s.criterion}
                    </span>
                    {s.quote && (
                      <p className="text-slate-400 print:text-slate-600 italic">
                        « {s.quote} »
                      </p>
                    )}
                    <p className="text-slate-300 print:text-slate-800">
                      {s.comment}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-slate-400 italic">
                Réalisez des simulations pour consolider vos points forts.
              </p>
            )}
          </div>

          {/* Section 2 : Vos Pièges & Points de Vigilance */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-xs font-bold text-amber-400 print:text-amber-700 uppercase tracking-wider">
              <AlertTriangle className="w-4 h-4" />
              Pièges & Points de Vigilance Identifiés
            </div>
            {memo.areasToImprove.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {memo.areasToImprove.map((a, idx) => (
                  <div
                    key={idx}
                    className="p-3.5 rounded-xl bg-slate-950/80 border border-amber-500/20 print:border-slate-300 print:bg-slate-50 text-xs space-y-1"
                  >
                    <span className="font-semibold text-amber-300 print:text-amber-800 block">
                      {a.criterion}
                    </span>
                    {a.quote && (
                      <p className="text-slate-400 print:text-slate-600 italic">
                        Piège relevé : « {a.quote} »
                      </p>
                    )}
                    <p className="text-slate-300 print:text-slate-800">
                      {a.comment}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-slate-400 italic">
                Aucun point critique relevé.
              </p>
            )}
          </div>

          {/* Section 3 : Meilleures Reformulations Déontologiques */}
          {memo.topReformulations.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-xs font-bold text-cyan-400 print:text-blue-700 uppercase tracking-wider">
                <Quote className="w-4 h-4" />
                Reformulations Clés Travaillées en Entraînement
              </div>
              <div className="space-y-2.5">
                {memo.topReformulations.map((r, idx) => (
                  <div
                    key={idx}
                    className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800 print:border-slate-300 print:bg-slate-50 text-xs space-y-1.5"
                  >
                    <p className="text-slate-400 print:text-slate-600 italic">
                      À éviter : « {r.quote} »
                    </p>
                    <div className="p-2.5 rounded-lg bg-blue-950/30 border border-blue-500/20 print:border-slate-300 print:bg-white text-cyan-200 print:text-slate-900 font-medium">
                      Formule conseillée : « {r.recommended} »
                    </div>
                    {r.explanation && (
                      <p className="text-[11px] text-slate-400 print:text-slate-600">
                        {r.explanation}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Section 4 : Règles d'Or Officielles le Jour de l'Entretien */}
          <div className="bg-slate-950/90 border border-cyan-500/30 print:border-slate-300 print:bg-slate-50 rounded-2xl p-4 space-y-3">
            <div className="flex items-center gap-2 text-xs font-bold text-white print:text-slate-900 uppercase tracking-wider">
              <ShieldCheck className="w-4 h-4 text-cyan-400 print:text-blue-700" />
              Les 4 Règles d&apos;Or du Candidat Campus France
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs text-slate-300 print:text-slate-800">
              <div className="flex items-start gap-2">
                <span className="w-5 h-5 rounded-full bg-cyan-500/20 text-cyan-300 print:bg-blue-100 print:text-blue-800 flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5">
                  1
                </span>
                <span>
                  <strong>Structurez vos réponses</strong> en 2 ou 3 points clairs (ex. « Premièrement... Deuxièmement... »).
                </span>
              </div>
              <div className="flex items-start gap-2">
                <span className="w-5 h-5 rounded-full bg-cyan-500/20 text-cyan-300 print:bg-blue-100 print:text-blue-800 flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5">
                  2
                </span>
                <span>
                  <strong>Liez toujours formation et métier</strong> : montrez en quoi la formation en France est indispensable à votre projet futur.
                </span>
              </div>
              <div className="flex items-start gap-2">
                <span className="w-5 h-5 rounded-full bg-cyan-500/20 text-cyan-300 print:bg-blue-100 print:text-blue-800 flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5">
                  3
                </span>
                <span>
                  <strong>Connaissez les maquettes de cours</strong> : citez 2 ou 3 matières clés et le nom du responsable pédagogique si possible.
                </span>
              </div>
              <div className="flex items-start gap-2">
                <span className="w-5 h-5 rounded-full bg-cyan-500/20 text-cyan-300 print:bg-blue-100 print:text-blue-800 flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5">
                  4
                </span>
                <span>
                  <strong>Restez serein et concis</strong> : 1 minute à 1 minute 30 par réponse est la durée idéale pour garder l&apos;attention de l&apos;examinateur.
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Pied de dialogue (masqué à l'impression) */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800 print:hidden">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-white transition"
          >
            Fermer
          </button>
          <button
            onClick={handleDownload}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs border border-slate-700 transition"
          >
            <Download className="w-4 h-4" />
            Télécharger le fichier
          </button>
          <button
            onClick={handlePrint}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 text-white font-bold text-xs shadow-md transition"
          >
            <Printer className="w-4 h-4" />
            Imprimer la fiche (PDF)
          </button>
        </div>
      </div>
    </div>
  );
}
