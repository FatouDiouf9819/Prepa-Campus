'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { Navbar } from '@/components/navigation/Navbar';
import { 
  Clock, 
  Calendar,
  RotateCcw,
  Sparkles,
  Play,
  Trash2,
  GitCompare,
  BookOpen,
  Eye,
  Loader2,
  ArrowRight,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { 
  SessionRecord, 
  inferEvaluationCompleteness 
} from '@/lib/indicators/progression';
import { ProgressionChart } from '@/components/history/ProgressionChart';
import { CriteriaBadges } from '@/components/history/CriteriaBadges';
import { ScoreGauge } from '@/components/history/ScoreGauge';
import { ComparisonModal } from '@/components/history/ComparisonModal';
import { RevisionMemoModal } from '@/components/history/RevisionMemoModal';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import { MobileMoneyModal } from '@/components/payments/MobileMoneyModal';

/**
 * Données de démonstration interactives
 * Correspondant à la maquette haute fidélité pour une projection optimale
 */
const SAMPLE_DEMO_SESSIONS: SessionRecord[] = [
  {
    id: 'demo-session-3',
    status: 'COMPLETED',
    started_at: '2026-11-05T14:30:00Z',
    duration_seconds: 325,
    evaluation_reports: [
      {
        id: 'demo-report-3',
        overall_score: 84,
        synthesis_summary: 'Excellente prestation orale. Le projet professionnel est très précis et parfaitement aligné avec la maquette de formation.',
        evaluation_completeness: 'COMPLETE',
        created_at: '2026-11-05T14:35:00Z',
        scores_by_criteria: [
          { name: 'projet_pro', label: 'Projet', score: 18, maxScore: 20 },
          { name: 'aisance', label: 'Élocution', score: 17, maxScore: 20 },
          { name: 'connaissance_france', label: 'Logique', score: 16, maxScore: 20 },
          { name: 'argumentation', label: 'Motivation', score: 17, maxScore: 20 },
        ],
        strengths: [
          { criterion: 'Projet professionnel', verbatimQuote: 'Mon objectif est d\'intégrer un cabinet de conseil en cybersécurité à Paris...', feedback: 'Projet solide, argumenté et réaliste.' },
          { criterion: 'Aisance orale', verbatimQuote: 'J\'ai choisi cette université car elle offre un double diplôme...', feedback: 'Élocution fluide et réponses bien structurées.' },
        ],
        areas_to_improve: [
          { criterion: 'Finances', verbatimQuote: 'Mes parents financent tout.', feedback: 'Précisez le garant et l\'attestation de virement irrévocable (AVI).' },
        ],
        reformulation_examples: [
          {
            studentQuote: 'Je sais pas trop où je vais loger.',
            recommendedAnswer: 'J\'ai déjà entamé mes démarches sur la plateforme CROUS et pris contact avec la résidence étudiante.',
            explanation: 'Démontre une préparation logistique autonome et rassurante pour le consulat.'
          }
        ],
        revision_topics: ['Attestation de Virement Irrévocable (AVI)', 'Unités d\'enseignement du Master 1'],
      }
    ]
  },
  {
    id: 'demo-session-2',
    status: 'COMPLETED',
    started_at: '2026-10-30T10:15:00Z',
    duration_seconds: 298,
    evaluation_reports: [
      {
        id: 'demo-report-2',
        overall_score: 78,
        synthesis_summary: 'Bonne amélioration sur la fluidité. Des hésitations subsistent sur le détail des cours et les débouchés.',
        evaluation_completeness: 'COMPLETE',
        created_at: '2026-10-30T10:20:00Z',
        scores_by_criteria: [
          { name: 'projet_pro', label: 'Projet', score: 16, maxScore: 20 },
          { name: 'aisance', label: 'Élocution', score: 15, maxScore: 20 },
          { name: 'connaissance_france', label: 'Logique', score: 15, maxScore: 20 },
        ],
        strengths: [],
        areas_to_improve: [],
        reformulation_examples: [],
        revision_topics: [],
      }
    ]
  },
  {
    id: 'demo-session-1',
    status: 'COMPLETED',
    started_at: '2026-10-15T16:00:00Z',
    duration_seconds: 275,
    evaluation_reports: [
      {
        id: 'demo-report-1',
        overall_score: 58,
        synthesis_summary: 'Premier entraînement prometteur mais réponses trop courtes et manque de repères sur les universités choisies.',
        evaluation_completeness: 'COMPLETE',
        created_at: '2026-10-15T16:05:00Z',
        scores_by_criteria: [
          { name: 'projet_pro', label: 'Projet', score: 11, maxScore: 20 },
          { name: 'aisance', label: 'Élocution', score: 12, maxScore: 20 },
          { name: 'connaissance_france', label: 'Logique', score: 12, maxScore: 20 },
        ],
        strengths: [],
        areas_to_improve: [],
        reformulation_examples: [],
        revision_topics: [],
      }
    ]
  }
];

export default function HistoriquePage() {
  const { language } = useLanguage();
  const [realSessions, setRealSessions] = useState<SessionRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDemoMode, setIsDemoMode] = useState(false);
  const [selectedFilter, setSelectedFilter] = useState('ALL');

  const filterPills = [
    { id: 'ALL', label: language === 'fr' ? 'Toutes' : 'All' },
    { id: 'MOTIVATION', label: language === 'fr' ? 'Entretien officiel' : 'Official Interview' },
    { id: 'GRAND_ORAL', label: language === 'fr' ? 'Grand Oral' : 'Oral Defense' },
  ];
  
  // Modales
  const [isComparisonOpen, setIsComparisonOpen] = useState(false);
  const [isMemoOpen, setIsMemoOpen] = useState(false);
  const [comparisonTargetSessionId, setComparisonTargetSessionId] = useState<string | undefined>(undefined);

  // Suppression
  const [deletingSessionId, setDeletingSessionId] = useState<string | null>(null);
  const [sessionToDelete, setSessionToDelete] = useState<SessionRecord | null>(null);

  // Crédits et recharge
  const [creditsBalance, setCreditsBalance] = useState<number | null>(null);
  const [isCreditModalOpen, setIsCreditModalOpen] = useState(false);

  useEffect(() => {
    async function loadCredits() {
      try {
        const res = await fetch('/api/credits');
        if (res.ok) {
          const data = await res.json();
          if (typeof data.balance === 'number') {
            setCreditsBalance(data.balance);
            try {
              localStorage.setItem('campus_france_credits_balance', data.balance.toString());
            } catch {}
          }
        }
      } catch {
        try {
          const saved = localStorage.getItem('campus_france_credits_balance');
          if (saved !== null) setCreditsBalance(parseInt(saved, 10));
        } catch {}
      }
    }
    loadCredits();
  }, []);

  // État du carrousel horizontal (balayage d'un rapport à la fois sur mobile)
  const [activeCardIndex, setActiveCardIndex] = useState(0);
  const carouselRef = useRef<HTMLDivElement>(null);

  const handleScroll = () => {
    if (!carouselRef.current) return;
    const { scrollLeft, offsetWidth } = carouselRef.current;
    if (offsetWidth > 0) {
      const newIndex = Math.round(scrollLeft / offsetWidth);
      if (newIndex >= 0 && newIndex < currentSessions.length) {
        setActiveCardIndex(newIndex);
      }
    }
  };

  const scrollToIndex = (index: number) => {
    if (!carouselRef.current) return;
    const offsetWidth = carouselRef.current.offsetWidth;
    carouselRef.current.scrollTo({
      left: index * offsetWidth,
      behavior: 'smooth',
    });
    setActiveCardIndex(index);
  };

  const loadHistory = async () => {
    try {
      const res = await fetch('/api/interview/history');
      if (res.ok) {
        const data = await res.json();
        const serverSessions: SessionRecord[] = data.sessions || [];

        // Si aucune session serveur mais qu'un rapport existe en localStorage, l'intégrer uniquement s'il est complet
        if (serverSessions.length === 0 && typeof window !== 'undefined') {
          try {
            const savedReport = localStorage.getItem('campus_france_last_report');
            if (savedReport) {
              const parsed = JSON.parse(savedReport);
              if (parsed && typeof parsed.overallScore === 'number') {
                serverSessions.push({
                  id: parsed.sessionId || parsed.id || 'local-session-1',
                  status: 'COMPLETED',
                  duration_seconds: 300,
                  started_at: parsed.createdAt || new Date().toISOString(),
                  evaluation_reports: [
                    {
                      id: parsed.id || 'local-rep-1',
                      overall_score: parsed.overallScore,
                      scores_by_criteria: parsed.scoresByCriteria,
                      strengths: parsed.strengths,
                      areas_to_improve: parsed.areasToImprove,
                      reformulation_examples: parsed.reformulationExamples,
                      revision_topics: parsed.revisionTopics,
                      synthesis_summary: parsed.synthesisSummary,
                      evaluation_completeness: inferEvaluationCompleteness(parsed),
                      created_at: parsed.createdAt || new Date().toISOString(),
                    }
                  ]
                });
              }
            }
          } catch {
            // Ignorer
          }
        }

        setRealSessions(serverSessions);
      }
    } catch {
      // En cas d'erreur réseau
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadHistory();
  }, []);

  // Réinitialiser le carrousel lors du changement de filtre ou de mode
  useEffect(() => {
    setActiveCardIndex(0);
    if (carouselRef.current) {
      carouselRef.current.scrollTo({ left: 0, behavior: 'smooth' });
    }
  }, [selectedFilter, isDemoMode]);

  // Déterminer la liste des sessions affichées (Réelles ou Démo)
  const currentSessions = isDemoMode ? SAMPLE_DEMO_SESSIONS : realSessions;

  const handleDeleteSession = async (sessionId: string) => {
    if (isDemoMode) {
      setSessionToDelete(null);
      return;
    }

    setDeletingSessionId(sessionId);
    try {
      // Purge absolue des clés de cache localStorage pour empêcher toute réapparition
      if (typeof window !== 'undefined') {
        localStorage.removeItem('campus_france_last_report');
        localStorage.removeItem('campus_france_interview_session');
        localStorage.removeItem(`campus_france_report_${sessionId}`);
      }

      // Supprimer côté serveur
      await fetch(`/api/interview/history?sessionId=${encodeURIComponent(sessionId)}`, {
        method: 'DELETE',
      });

      // Toujours retirer immédiatement de la liste locale
      setRealSessions((prev) => prev.filter((s) => s.id !== sessionId));
      setSessionToDelete(null);
      setActiveCardIndex(0);
    } catch {
      // Nettoyage local garanti même en cas de coupure réseau
      setRealSessions((prev) => prev.filter((s) => s.id !== sessionId));
      setSessionToDelete(null);
      setActiveCardIndex(0);
    } finally {
      setDeletingSessionId(null);
    }
  };

  const formatDate = (isoString?: string) => {
    if (!isoString) return 'Date inconnue';
    try {
      const date = new Date(isoString);
      return date.toLocaleDateString('fr-FR', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      });
    } catch {
      return isoString;
    }
  };

  const formatDuration = (seconds?: number) => {
    if (!seconds || seconds <= 0) return '5m 00s';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs < 10 ? '0' : ''}${secs}s`;
  };

  const evaluatedSessionsCount = currentSessions.filter(
    (s) => s.evaluation_reports && s.evaluation_reports.length > 0
  ).length;

  return (
    <div className="min-h-screen bg-[#05070E] flex flex-col text-slate-100 font-sans">
      <Navbar />

      <main className="flex-1 max-w-lg w-full mx-auto px-4 py-8 space-y-5">
        {/* Titre Principal conforme au mockup smartphone */}
        <div className="flex items-center justify-between">
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
            {language === 'fr' ? 'Cockpit Pédagogique' : 'Learning Cockpit'}
          </h1>

          {/* Boutons d'actions rapides compacts */}
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setIsMemoOpen(true)}
              className="p-2.5 rounded-xl bg-[#0D121F] border border-white/10 hover:border-white/20 text-[#38BDF8] transition shadow-xs cursor-pointer"
              title={language === 'fr' ? 'Fiche Réflexe Jour J' : 'Interview Cheat Sheet'}
              aria-label="Fiche Réflexe"
            >
              <BookOpen className="w-4 h-4 text-[#38BDF8]" />
            </button>
            <Link
              href="/entretien/preparation"
              prefetch={true}
              className="p-2.5 rounded-xl bg-[#0066FF] hover:bg-[#0052CC] text-white transition shadow-md shadow-blue-500/25"
              title={language === 'fr' ? 'Nouvelle simulation' : 'New simulation'}
              aria-label="Nouvelle simulation"
            >
              <RotateCcw className="w-4 h-4 text-white" />
            </Link>
          </div>
        </div>

        {/* Bannière Mode Démonstration si activé */}
        {isDemoMode && (
          <div className="p-3.5 rounded-2xl bg-[#0D121F] border border-blue-500/30 text-[#38BDF8] text-xs flex items-center justify-between gap-3 shadow-xs">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-[#38BDF8] shrink-0" />
              <span className="font-bold text-[#38BDF8]">
                {language === 'fr' ? 'Mode Démonstration Actif' : 'Interactive Demo Mode Active'}
              </span>
            </div>
            <button
              onClick={() => setIsDemoMode(false)}
              className="px-3 py-1 rounded-xl bg-white/10 hover:bg-white/15 border border-white/10 text-white text-[11px] font-semibold transition cursor-pointer"
            >
              {language === 'fr' ? 'Mes données' : 'My data'}
            </button>
          </div>
        )}

        {/* 4 Métriques & Courbe de progression (Composant dédié haute fidélité) */}
        {!loading && currentSessions.length > 0 && evaluatedSessionsCount > 0 && (
          <ProgressionChart sessions={currentSessions} />
        )}

        {/* Barre de Filtres Horizontale conforme à la maquette */}
        {!loading && currentSessions.length > 0 && (
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1">
            {filterPills.map((pill) => {
              const isActive = selectedFilter === pill.id;
              return (
                <button
                  key={pill.id}
                  onClick={() => setSelectedFilter(pill.id)}
                  className={`px-4 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition cursor-pointer ${
                    isActive
                      ? 'bg-[#0066FF] text-white font-bold shadow-md shadow-blue-500/25'
                      : 'bg-[#0D121F] border border-white/10 text-slate-300 hover:text-white hover:border-white/20'
                  }`}
                >
                  {pill.label}
                </button>
              );
            })}
          </div>
        )}

        {/* Liste des Cartes de Simulations */}
        {loading ? (
          <div className="py-20 flex flex-col items-center justify-center text-[#38BDF8] gap-3">
            <Loader2 className="w-8 h-8 animate-spin" />
            <span className="text-xs text-slate-400">
              {language === 'fr' ? 'Chargement de votre cockpit...' : 'Loading your cockpit...'}
            </span>
          </div>
        ) : currentSessions.length === 0 ? (
          <div className="bg-[#0D121F] border border-white/10 rounded-3xl p-8 text-center shadow-lg space-y-6">
            <div className="w-12 h-12 rounded-2xl bg-blue-500/15 text-[#38BDF8] flex items-center justify-center mx-auto">
              <Sparkles className="w-6 h-6" />
            </div>
            
            <div className="space-y-1">
              <h2 className="text-lg font-bold text-white">
                {language === 'fr' ? 'Aucune simulation enregistrée' : 'No recorded sessions yet'}
              </h2>
              <p className="text-xs text-slate-400 max-w-xs mx-auto leading-relaxed">
                {language === 'fr' 
                  ? 'Votre cockpit s\'enrichira automatiquement dès votre premier entretien avec le simulateur IA.'
                  : 'Your cockpit will automatically update as soon as you complete your first AI voice interview.'}
              </p>
            </div>

            <div className="flex flex-col gap-2.5 pt-2">
              <Link
                href="/entretien/preparation"
                prefetch={true}
                className="w-full inline-flex items-center justify-center gap-2 py-3 rounded-xl bg-[#0066FF] hover:bg-[#0052CC] text-white font-bold text-xs shadow-lg shadow-blue-500/25 transition"
              >
                {language === 'fr' ? 'Lancer mon premier entretien' : 'Start my first interview'}
                <ArrowRight className="w-4 h-4" />
              </Link>

              <button
                onClick={() => setIsDemoMode(true)}
                className="w-full inline-flex items-center justify-center gap-2 py-2.5 rounded-xl bg-white/10 border border-white/10 hover:bg-white/15 text-white font-bold text-xs transition cursor-pointer"
              >
                <Eye className="w-4 h-4 text-[#38BDF8]" />
                {language === 'fr' ? 'Voir la démonstration interactive' : 'View interactive demo'}
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-3.5">
            {/* En-tête du carrousel avec navigation fluide */}
            <div className="flex items-center justify-between px-1">
              <span className="text-xs font-semibold text-neutral-300 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-cyan-400 shadow-[0_0_6px_#22d3ee]" />
                {language === 'fr' ? `Simulations (${currentSessions.length})` : `Simulations (${currentSessions.length})`}
              </span>

              {currentSessions.length > 1 && (
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => scrollToIndex(Math.max(0, activeCardIndex - 1))}
                    disabled={activeCardIndex === 0}
                    className={`p-1.5 rounded-xl border text-xs transition ${
                      activeCardIndex === 0
                        ? 'opacity-30 border-white/10 text-slate-600 cursor-not-allowed'
                        : 'border-white/10 bg-[#0D121F] text-[#38BDF8] hover:border-white/25 active:scale-95'
                    }`}
                    aria-label="Rapport précédent"
                  >
                    <ChevronLeft className="w-3.5 h-3.5" />
                  </button>

                  <span className="text-[11px] font-bold text-slate-400 px-1">
                    {activeCardIndex + 1} / {currentSessions.length}
                  </span>

                  <button
                    type="button"
                    onClick={() => scrollToIndex(Math.min(currentSessions.length - 1, activeCardIndex + 1))}
                    disabled={activeCardIndex === currentSessions.length - 1}
                    className={`p-1.5 rounded-xl border text-xs transition ${
                      activeCardIndex === currentSessions.length - 1
                        ? 'opacity-30 border-white/10 text-slate-600 cursor-not-allowed'
                        : 'border-white/10 bg-[#0D121F] text-[#38BDF8] hover:border-white/25 active:scale-95'
                    }`}
                    aria-label="Rapport suivant"
                  >
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </div>

            {/* Carrousel Horizontal Déplaçable avec Balayage (Swipe) */}
            <div
              ref={carouselRef}
              onScroll={handleScroll}
              className="flex gap-4 overflow-x-auto snap-x snap-mandatory scroll-smooth no-scrollbar pb-2 pt-1 -mx-4 px-4"
              style={{ WebkitOverflowScrolling: 'touch' }}
            >
              {currentSessions.map((session, index) => {
                const report = session.evaluation_reports && session.evaluation_reports[0];
                const score = report?.overall_score;
                const isCompleted = session.status === 'COMPLETED';
                const isAbandoned = session.status === 'ABANDONED';
                const startedTime = session.started_at ? new Date(session.started_at).getTime() : 0;
                const isExpired = Date.now() - startedTime > 10 * 60 * 1000;
                // Seule une session IN_PROGRESS commencée il y a moins de 10 min est considérée comme activement interrompue
                const isInterrupted = !isCompleted && !isAbandoned && !isExpired && session.status === 'IN_PROGRESS';
                const isDeadSession = !isCompleted && (isAbandoned || isExpired || session.status !== 'IN_PROGRESS');

                return (
                  <div
                    key={session.id}
                    className="w-full shrink-0 snap-center bg-[#0D121F] border border-white/10 rounded-3xl p-4 sm:p-5 shadow-xl space-y-4 transition"
                  >
                    {/* Header de la carte : Numéro du rapport + Statut */}
                    <div className="flex items-center justify-between pb-2 border-b border-white/10 text-xs">
                      <span className="font-bold text-white flex items-center gap-2">
                        <span className="w-5 h-5 rounded-lg bg-blue-500/15 text-[#38BDF8] font-extrabold text-[11px] flex items-center justify-center">
                          {index + 1}
                        </span>
                        Rapport d&apos;entretien #{index + 1}
                      </span>
                      <span className={`text-[11px] px-2.5 py-0.5 rounded-full font-semibold border ${
                        isCompleted
                          ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400'
                          : isInterrupted
                          ? 'bg-blue-500/15 border-blue-500/30 text-[#38BDF8]'
                          : 'bg-white/5 border-white/10 text-slate-400'
                      }`}>
                        {isCompleted ? 'Complet' : isInterrupted ? 'En cours' : 'Non complété'}
                      </span>
                    </div>

                    {/* Partie Supérieure : Jauge Radiale à Gauche + Stack Critères à Droite */}
                    <div className="flex items-center gap-4 sm:gap-5">
                      {/* Jauge radiale circulaire lumineuse */}
                      {typeof score === 'number' && (
                        <ScoreGauge score={score} />
                      )}

                      {/* Détail par critères avec barres dégradées cyan */}
                      <div className="flex-1 min-w-0">
                        {report?.scores_by_criteria && (
                          <CriteriaBadges criteria={report.scores_by_criteria.slice(0, 3)} />
                        )}
                      </div>
                    </div>

                    {/* Bouton Large Pleine Largeur : Voir le rapport ↗ ou Reprendre / Supprimer */}
                    {isInterrupted ? (
                      <div className="flex items-center gap-2">
                        {creditsBalance === null || creditsBalance <= 0 ? (
                          <button
                            type="button"
                            onClick={() => setIsCreditModalOpen(true)}
                            className="flex-1 py-3 px-3 rounded-xl bg-amber-600/80 hover:bg-amber-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-lg shadow-amber-500/20 transition active:scale-[0.99] cursor-pointer"
                          >
                            <Sparkles className="w-4 h-4 shrink-0" />
                            <span>{language === 'fr' ? 'Recharger pour reprendre' : 'Recharge to resume'}</span>
                          </button>
                        ) : (
                          <Link
                            href={`/entretien?sessionId=${session.id}`}
                            className="flex-1 py-3 px-3 rounded-xl bg-[#0066FF] hover:bg-[#0052CC] text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-lg shadow-blue-500/20 transition active:scale-[0.99]"
                          >
                            <Play className="w-4 h-4 shrink-0" />
                            <span>{language === 'fr' ? 'Reprendre' : 'Resume'}</span>
                          </Link>
                        )}
                        <button
                          type="button"
                          onClick={() => setSessionToDelete(session)}
                          className="px-3.5 py-3 rounded-xl bg-rose-950/40 border border-rose-800/40 hover:bg-rose-900/60 text-rose-300 font-semibold text-xs flex items-center gap-1.5 transition active:scale-95 cursor-pointer"
                          title={language === 'fr' ? 'Abandonner et supprimer cet entretien' : 'Discard and delete interview'}
                        >
                          <Trash2 className="w-4 h-4 shrink-0 text-rose-400" />
                          <span>{language === 'fr' ? 'Supprimer' : 'Delete'}</span>
                        </button>
                      </div>
                    ) : isDeadSession ? (
                      /* Session expirée ou abandonnée : nettoyage */
                      <div className="flex items-center justify-between gap-2 p-2 rounded-xl bg-[#121827] border border-white/10">
                        <span className="text-[11px] text-slate-400">
                          Session interrompue ou expirée
                        </span>
                        <button
                          type="button"
                          onClick={() => setSessionToDelete(session)}
                          className="px-3 py-1.5 rounded-lg bg-rose-950/40 border border-rose-800/40 hover:bg-rose-900/60 text-rose-300 font-semibold text-xs flex items-center gap-1.5 transition active:scale-95 cursor-pointer"
                          title={language === 'fr' ? 'Supprimer cet entretien' : 'Delete interview'}
                        >
                          <Trash2 className="w-3.5 h-3.5 text-rose-400" />
                          <span>{language === 'fr' ? 'Supprimer' : 'Delete'}</span>
                        </button>
                      </div>
                    ) : (
                      <Link
                        href={isDemoMode ? '#' : `/rapport/${session.id}`}
                        onClick={(e) => {
                          if (isDemoMode) {
                            e.preventDefault();
                            setIsComparisonOpen(true);
                          }
                        }}
                        className="w-full py-3.5 px-4 rounded-xl bg-[#0066FF] hover:bg-[#0052CC] text-white font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-blue-500/25 transition active:scale-[0.99]"
                      >
                        <span>Voir le rapport</span>
                        <span className="text-base font-bold">↗</span>
                      </Link>
                    )}

                    {/* Ligne d'informations & actions discrètes */}
                    <div className="flex items-center justify-between text-[11px] text-slate-400 pt-2 border-t border-white/10">
                      <div className="flex items-center gap-2">
                        <span className="flex items-center gap-1 font-medium text-slate-300">
                          <Calendar className="w-3.5 h-3.5 text-[#38BDF8]" />
                          {formatDate(session.started_at)}
                        </span>
                        <span>•</span>
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3 text-slate-500" />
                          {formatDuration(session.duration_seconds)}
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        {evaluatedSessionsCount >= 2 && report && (
                          <button
                            onClick={() => {
                              setComparisonTargetSessionId(session.id);
                              setIsComparisonOpen(true);
                            }}
                            className="p-1.5 rounded-lg hover:bg-white/10 text-slate-400 hover:text-[#38BDF8] transition cursor-pointer"
                            title="Comparer avec une autre simulation"
                          >
                            <GitCompare className="w-3.5 h-3.5" />
                          </button>
                        )}
                        <button
                          onClick={() => setSessionToDelete(session)}
                          className="p-1.5 rounded-lg hover:bg-rose-950/30 hover:text-rose-400 text-slate-500 transition cursor-pointer"
                          title="Supprimer la session"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Indicateur de pagination avec pastilles tactiles cliquables */}
            {currentSessions.length > 1 && (
              <div className="flex flex-col items-center gap-2 pt-1">
                <div className="flex items-center gap-2">
                  {currentSessions.map((_, idx) => (
                    <button
                      key={idx}
                      onClick={() => scrollToIndex(idx)}
                      className={`transition-all duration-300 rounded-full cursor-pointer ${
                        activeCardIndex === idx
                          ? 'w-6 h-2 bg-[#0066FF] shadow-[0_0_8px_#0066FF]'
                          : 'w-2 h-2 bg-slate-700 hover:bg-slate-600'
                      }`}
                      aria-label={`Aller au rapport ${idx + 1}`}
                    />
                  ))}
                </div>
                <p className="text-[11px] text-slate-400 font-medium">
                  👉 Glissez vers la gauche ou la droite pour voir les autres rapports
                </p>
              </div>
            )}
          </div>
        )}
      </main>

      {/* Feature C : Modale de Comparaison Avant / Après */}
      <ComparisonModal
        isOpen={isComparisonOpen}
        onClose={() => setIsComparisonOpen(false)}
        sessions={currentSessions}
        initialSessionBId={comparisonTargetSessionId}
      />

      {/* Feature E : Modale Fiche Réflexe Campus France */}
      <RevisionMemoModal
        isOpen={isMemoOpen}
        onClose={() => setIsMemoOpen(false)}
        sessions={currentSessions}
      />

      {/* Feature D : Boîte de dialogue de confirmation de suppression */}
      {sessionToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-[#0D121F] border border-white/10 rounded-3xl p-6 max-w-md w-full space-y-4 shadow-2xl">
            <div className="w-12 h-12 rounded-2xl bg-rose-500/15 border border-rose-500/20 text-rose-400 flex items-center justify-center">
              <Trash2 className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">
                Supprimer cette session ?
              </h3>
              <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                Êtes-vous sûr de vouloir supprimer la simulation du{' '}
                <strong className="text-white">{formatDate(sessionToDelete.started_at)}</strong> ? Cette action est irréversible.
              </p>
            </div>
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => setSessionToDelete(null)}
                disabled={deletingSessionId !== null}
                className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-xs font-semibold text-slate-200 transition cursor-pointer"
              >
                Annuler
              </button>
              <button
                onClick={() => handleDeleteSession(sessionToDelete.id)}
                disabled={deletingSessionId !== null}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-xs font-bold text-white transition shadow-md cursor-pointer"
              >
                {deletingSessionId ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    Suppression...
                  </>
                ) : (
                  'Supprimer définitivement'
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modale de recharge de crédits */}
      <MobileMoneyModal
        isOpen={isCreditModalOpen}
        onClose={() => setIsCreditModalOpen(false)}
        onPaymentSuccess={(newBal) => {
          setCreditsBalance(newBal);
          setIsCreditModalOpen(false);
        }}
      />

      <footer className="border-t border-white/10 py-6 text-center text-xs text-slate-500 bg-[#05070E]">
        <p>
          {language === 'fr' 
            ? 'PrépaCampus — Cockpit Pédagogique Mobile-First.' 
            : 'PrépaCampus — Learning Cockpit Mobile-First.'}
        </p>
      </footer>
    </div>
  );
}
