'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Navbar } from '@/components/navigation/Navbar';
import { 
  GraduationCap, 
  Mic, 
  FileText, 
  ArrowRight, 
  CheckCircle2, 
  Clock, 
  AlertCircle,
  TrendingUp,
  History,
  Zap,
  Sparkles,
  CreditCard
} from 'lucide-react';
import { AcademicProfileData } from '@/types/profile';
import { EvaluationReport } from '@/types/interview';
import { calculateRealProgression, inferEvaluationCompleteness } from '@/lib/indicators/progression';
import { isAcademicProfileComplete } from '@/lib/validations/profile';
import { MobileMoneyModal } from '@/components/payments/MobileMoneyModal';
import { CountdownTargetCard } from '@/components/dashboard/CountdownTargetCard';
import { useLanguage } from '@/lib/i18n/LanguageContext';

export default function DashboardPage() {
  const { language } = useLanguage();
  const [profile, setProfile] = useState<AcademicProfileData | null>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('campus_france_profile_draft');
        if (saved) return JSON.parse(saved);
      } catch {
        // Ignorer
      }
    }
    return null;
  });
  const [lastReport, setLastReport] = useState<EvaluationReport | null>(null);
  const [creditsBalance, setCreditsBalance] = useState<number>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('campus_france_credits_balance');
        if (saved) {
          const num = parseInt(saved, 10);
          if (!isNaN(num)) return num;
        }
      } catch {
        // Ignorer
      }
    }
    return 1;
  });
  const [rechargeModalOpen, setRechargeModalOpen] = useState(false);
  const [isAddingCredits, setIsAddingCredits] = useState(false);
  const [sessionsCount, setSessionsCount] = useState<number>(0);

  const handleQuickAddCredits = async (amount: number = 10) => {
    setIsAddingCredits(true);
    try {
      const res = await fetch('/api/credits', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount }),
      });
      const data = await res.json();
      if (typeof data.balance === 'number') {
        setCreditsBalance(data.balance);
        try {
          localStorage.setItem('campus_france_credits_balance', data.balance.toString());
        } catch {
          // Ignorer
        }
      }
    } catch {
      // Ignorer
    } finally {
      setIsAddingCredits(false);
    }
  };
  const [scoreProgression, setScoreProgression] = useState<{
    diff: number;
    previousScore: number;
    latestScore: number;
  } | null>(null);

  useEffect(() => {
    // 1. Récupérer le solde de crédits réel depuis l'API et synchroniser avec le stockage local
    async function loadCredits() {
      try {
        const res = await fetch('/api/credits');
        if (res.ok) {
          const data = await res.json();
          if (typeof data.balance === 'number') {
            setCreditsBalance(data.balance);
            try {
              localStorage.setItem('campus_france_credits_balance', data.balance.toString());
            } catch {
              // Ignorer
            }
            return;
          }
        }
      } catch {
        // Ignorer en mode hors-ligne
      }

      try {
        const localSaved = localStorage.getItem('campus_france_credits_balance');
        if (localSaved) {
          const localNum = parseInt(localSaved, 10);
          if (!isNaN(localNum)) {
            setCreditsBalance(localNum);
          }
        }
      } catch {
        // Ignorer
      }
    }

    // 2. Récupérer le profil académique
    async function loadProfile() {
      try {
        const res = await fetch('/api/profile');
        if (res.ok) {
          const data = await res.json();
          if (data.profile) {
            const p = data.profile;
            setProfile({
              countryResidence: p.countryResidence ?? p.country_residence ?? 'Sénégal',
              academicStatus: p.academicStatus ?? p.academic_status ?? 'STUDYING',
              currentDiploma: p.currentDiploma ?? p.current_diploma ?? '',
              fieldOfStudy: p.fieldOfStudy ?? p.field_of_study ?? '',
              currentInstitution: p.currentInstitution ?? p.current_institution ?? '',
              targetWishes: p.targetWishes ?? p.target_wishes ?? [],
              targetPrograms: p.targetPrograms ?? p.target_programs ?? '',
              targetInstitutions: p.targetInstitutions ?? p.target_institutions ?? '',
              reasonsForPrograms: p.reasonsForPrograms ?? p.reasons_for_programs ?? '',
              reasonFrance: p.reasonFrance ?? p.reason_france ?? '',
              professionalGoal: p.professionalGoal ?? p.professional_goal ?? '',
              strongSkills: p.strongSkills ?? p.strong_skills ?? '',
              weaknessesToWork: p.weaknessesToWork ?? p.weaknesses_to_work ?? '',
              isCompleted: Boolean(p.isCompleted ?? p.is_completed),
            });
            return;
          }
        }
      } catch {
        // Fallback sur le brouillon local
      }

      try {
        const savedProfile = localStorage.getItem('campus_france_profile_draft');
        if (savedProfile) {
          setProfile(JSON.parse(savedProfile));
        }
      } catch {
        // Ignorer
      }
    }

    // 3. Récupérer l'historique et calculer la progression
    async function loadLastReport() {
      try {
        const res = await fetch('/api/interview/history');
        if (res.ok) {
          const data = await res.json();
          const sessions = data.sessions || [];
          setSessionsCount(sessions.length);

          const metrics = calculateRealProgression(sessions);
          if (
            metrics.status === 'PROGRESSION_AVAILABLE' &&
            metrics.diff !== null &&
            metrics.previousScore !== null &&
            metrics.latestScore !== null
          ) {
            setScoreProgression({
              diff: metrics.diff,
              previousScore: metrics.previousScore,
              latestScore: metrics.latestScore,
            });
          } else {
            setScoreProgression(null);
          }

          if (sessions.length === 0) {
            setLastReport(null);
            return;
          }

          const sessionWithReport = sessions.find(
            (s: { evaluation_reports?: Array<{ id: string; overall_score: number; synthesis_summary: string; created_at: string }> }) =>
              s.evaluation_reports && s.evaluation_reports.length > 0
          );

          if (sessionWithReport && sessionWithReport.evaluation_reports?.[0]) {
            const firstRep = sessionWithReport.evaluation_reports[0];
            const completeness = inferEvaluationCompleteness(firstRep);
            setLastReport({
              id: firstRep.id,
              sessionId: sessionWithReport.id,
              overallScore: firstRep.overall_score,
              scoresByCriteria: [],
              strengths: [],
              areasToImprove: [],
              reformulationExamples: [],
              revisionTopics: [],
              synthesisSummary: firstRep.synthesis_summary,
              evaluationGridVersion: 'v1.0.0',
              evaluationCompleteness: completeness,
              isTechnicalIssue: completeness === 'UNAVAILABLE',
              createdAt: firstRep.created_at,
            });
            return;
          } else {
            // Aucune session évaluée existante
            setLastReport(null);
            return;
          }
        }
      } catch {
        // Fallback local uniquement si déconnecté / erreur réseau
      }

      try {
        const savedReport = localStorage.getItem('campus_france_last_report');
        if (savedReport) {
          const parsed = JSON.parse(savedReport);
          if (parsed && typeof parsed.overallScore === 'number') {
            parsed.evaluationCompleteness = inferEvaluationCompleteness(parsed);
            setLastReport(parsed);
          }
        }
      } catch {
        // Ignorer
      }
    }

    loadCredits();
    loadProfile();
    loadLastReport();
  }, []);

  const isProfileComplete = isAcademicProfileComplete(profile);

  return (
    <div className="min-h-screen bg-[#05070E] flex flex-col text-slate-100 font-sans">
      <Navbar />

      <main className="flex-1 max-w-5xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-14 space-y-6">
        {/* En-tête structuré & épuré */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/10">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-500/15 border border-blue-500/30 text-[#38BDF8] text-xs font-semibold mb-2">
              <Sparkles className="w-3.5 h-3.5" />
              <span>{language === 'fr' ? 'Espace Candidat' : 'Candidate Space'}</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              {language === 'fr' ? 'Tableau de Bord' : 'Dashboard'}
            </h1>
            <p className="text-xs sm:text-sm text-slate-400 mt-0.5">
              {language === 'fr' 
                ? 'Préparez votre entretien Campus France avec le simulateur IA vocal.' 
                : 'Practice your Campus France interview with the adaptive Voice AI jury.'}
            </p>
          </div>

          {/* Solde & Rechargement rapide */}
          <div className="flex items-center gap-2.5 self-start sm:self-auto flex-wrap">
            <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#0D121F] border border-white/10 shadow-xs text-xs">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
              <span className="text-slate-300">
                {language === 'fr' ? 'Solde :' : 'Balance:'}{' '}
                <strong className="text-white font-bold">
                  {creditsBalance} {creditsBalance > 1 ? 'simulations' : 'simulation'}
                </strong>
              </span>
            </div>
            <button
              type="button"
              onClick={() => setRechargeModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#0066FF] hover:bg-[#0052CC] text-white font-bold text-xs shadow-lg shadow-blue-500/25 transition active:scale-95 cursor-pointer"
            >
              <Zap className="w-3.5 h-3.5" />
              <span>{language === 'fr' ? 'Recharger' : 'Top up'}</span>
            </button>
            <button
              type="button"
              disabled={isAddingCredits}
              onClick={() => handleQuickAddCredits(10)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-500/15 border border-emerald-500/30 hover:bg-emerald-500/25 text-emerald-400 font-bold text-xs transition active:scale-95 cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
              <span>{isAddingCredits ? '...' : (language === 'fr' ? '+10 Gratuits' : '+10 Free')}</span>
            </button>
          </div>
        </div>

        {/* Bannière de recharge de test gratuite */}
        {creditsBalance <= 1 && (
          <div className="p-4 sm:p-5 rounded-3xl bg-[#0D121F] border border-emerald-500/30 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs">
            <div className="flex items-start sm:items-center gap-3.5">
              <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 flex items-center justify-center shrink-0">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <p className="font-bold text-white text-sm">
                  {language === 'fr' ? 'Crédits de simulation faibles' : 'Low simulation credits'}
                </p>
                <p className="text-slate-400 text-xs mt-0.5">
                  {language === 'fr'
                    ? `Vous disposez actuellement de ${creditsBalance} simulation. Pour vos tests et répétitions, activez 20 simulations gratuites en 1 clic.`
                    : `You currently have ${creditsBalance} simulation. For your testing and rehearsal, activate 20 free simulations in 1 click.`}
                </p>
              </div>
            </div>
            <button
              type="button"
              disabled={isAddingCredits}
              onClick={() => handleQuickAddCredits(20)}
              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md shadow-emerald-500/20 transition active:scale-95 shrink-0 cursor-pointer"
            >
              <Sparkles className="w-4 h-4" />
              <span>{isAddingCredits ? 'Ajout...' : (language === 'fr' ? '🎁 +20 Simulations Gratuites' : '🎁 +20 Free Simulations')}</span>
            </button>
          </div>
        )}

        {/* 3 Cartes Métriques Synthétiques & Élégantes */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* Métrique 1 : Crédits */}
          <div className="bg-[#0D121F] border border-white/10 rounded-3xl p-5 flex items-center justify-between shadow-sm">
            <div>
              <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                {language === 'fr' ? 'Simulations restantes' : 'Remaining Credits'}
              </div>
              <div className="text-2xl font-black text-white mt-1">{creditsBalance}</div>
              <div className="text-xs text-slate-400 mt-0.5">
                {language === 'fr' ? 'Sans date d\'expiration' : 'No expiration date'}
              </div>
            </div>
            <div className="flex flex-col items-end gap-1.5">
              <div className="w-10 h-10 rounded-2xl bg-blue-500/15 border border-blue-500/30 text-[#38BDF8] flex items-center justify-center shrink-0">
                <Zap className="w-5 h-5" />
              </div>
              <button
                type="button"
                disabled={isAddingCredits}
                onClick={() => handleQuickAddCredits(10)}
                className="text-xs text-emerald-400 hover:text-emerald-300 font-bold underline flex items-center gap-1 cursor-pointer"
              >
                <Sparkles className="w-3 h-3" />
                <span>{isAddingCredits ? '...' : (language === 'fr' ? '+10 Gratuits' : '+10 Free')}</span>
              </button>
            </div>
          </div>

          {/* Métrique 2 : Sessions Réalisées */}
          <div className="bg-[#0D121F] border border-white/10 rounded-3xl p-5 flex items-center justify-between shadow-sm">
            <div>
              <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                {language === 'fr' ? 'Entretiens Réalisés' : 'Completed Sessions'}
              </div>
              <div className="text-2xl font-black text-white mt-1">{sessionsCount}</div>
              <div className="text-xs text-slate-400 mt-0.5">
                {lastReport ? (
                  <>Score récent : <span className="text-[#38BDF8] font-bold">{lastReport.overallScore}/100</span></>
                ) : (
                  language === 'fr' ? 'Aucune simulation passée' : 'No sessions completed'
                )}
              </div>
            </div>
            <div className="w-10 h-10 rounded-2xl bg-blue-500/15 border border-blue-500/30 text-[#38BDF8] flex items-center justify-center shrink-0">
              <History className="w-5 h-5" />
            </div>
          </div>

          {/* Métrique 3 : Statut Dossier */}
          <div className="bg-[#0D121F] border border-white/10 rounded-3xl p-5 flex items-center justify-between shadow-sm">
            <div>
              <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                {language === 'fr' ? 'Statut Dossier' : 'Profile Status'}
              </div>
              <div className="text-sm font-bold text-white mt-2 flex items-center gap-1.5">
                {isProfileComplete ? (
                  <span className="inline-flex items-center gap-1 text-emerald-400">
                    <CheckCircle2 className="w-4 h-4" /> {language === 'fr' ? 'Complet & Configuré' : 'Complete & Ready'}
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-amber-400">
                    <AlertCircle className="w-4 h-4" /> {language === 'fr' ? 'À Compléter' : 'To Complete'}
                  </span>
                )}
              </div>
              <div className="text-xs text-slate-400 mt-0.5">
                {profile?.fieldOfStudy || (language === 'fr' ? 'Filière non renseignée' : 'Unspecified field')}
              </div>
            </div>
            <div className="w-10 h-10 rounded-2xl bg-blue-500/15 border border-blue-500/30 text-[#38BDF8] flex items-center justify-center shrink-0">
              <GraduationCap className="w-5 h-5" />
            </div>
          </div>
        </div>

        {/* Compte à Rebours Objectif Jour J */}
        <CountdownTargetCard />

        {/* 2 Colonnes Principales : Profil & Simulation Vocale */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-5 items-stretch">
          {/* Colonne 1 : Mon Dossier Académique */}
          <div className="md:col-span-6 bg-[#0D121F] border border-white/10 rounded-3xl p-6 flex flex-col justify-between shadow-sm">
            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-blue-500/15 border border-blue-500/30 text-[#38BDF8] flex items-center justify-center">
                    <GraduationCap className="w-5 h-5" />
                  </div>
                  <h2 className="text-base font-bold text-white">
                    {language === 'fr' ? 'Mon Dossier Académique' : 'Academic Profile'}
                  </h2>
                </div>
                {isProfileComplete ? (
                  <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-xs font-bold">
                    {language === 'fr' ? 'Configuré' : 'Configured'}
                  </span>
                ) : (
                  <span className="px-2.5 py-0.5 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-400 text-xs font-bold">
                    {language === 'fr' ? 'Incomplet' : 'Incomplete'}
                  </span>
                )}
              </div>

              <p className="text-xs text-slate-400 leading-relaxed mb-4">
                {language === 'fr'
                  ? "L'IA calibre les questions et relances sur les formations et universités renseignées."
                  : "The AI personalizes questions and follow-ups based on your registered academic background."}
              </p>

              {profile ? (
                <div className="p-4 rounded-2xl bg-[#121827] border border-white/10 text-xs space-y-2">
                  <div className="text-slate-300">
                    <span className="text-slate-400 block text-[11px] font-medium">
                      {language === 'fr' ? 'Diplôme actuel & Spécialité :' : 'Current Diploma & Field:'}
                    </span>
                    <strong className="text-white font-bold">
                      {profile.currentDiploma || (language === 'fr' ? 'Non précisé' : 'Unspecified')} ({profile.fieldOfStudy || (language === 'fr' ? 'Général' : 'General')})
                    </strong>
                  </div>
                  <div className="text-slate-300">
                    <span className="text-slate-400 block text-[11px] font-medium">
                      {language === 'fr' ? 'Formations ciblées en France :' : 'Targeted Programs in France:'}
                    </span>
                    <strong className="text-white font-bold">
                      {profile.targetPrograms || (language === 'fr' ? 'Formations non renseignées' : 'No programs registered')}
                    </strong>
                  </div>
                </div>
              ) : (
                <div className="p-4 rounded-2xl bg-[#121827] border border-white/10 text-xs text-slate-400">
                  {language === 'fr' ? 'Aucun profil enregistré pour le moment.' : 'No profile saved yet.'}
                </div>
              )}
            </div>

            <div className="mt-5 pt-4 border-t border-white/10">
              <Link
                href="/profil"
                prefetch={true}
                className="inline-flex items-center gap-1.5 text-xs font-bold text-[#38BDF8] hover:text-[#0066FF] transition"
              >
                <span>
                  {isProfileComplete 
                    ? (language === 'fr' ? 'Mettre à jour mon dossier' : 'Update my academic dossier')
                    : (language === 'fr' ? 'Compléter mon dossier' : 'Complete my academic dossier')}
                </span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>

          {/* Colonne 2 : Simulation Vocale IA (Carte Hero) */}
          <div className="md:col-span-6 bg-[#0D121F] border-2 border-[#0066FF] rounded-3xl p-6 flex flex-col justify-between shadow-xl shadow-blue-500/10 relative overflow-hidden">
            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-blue-500/15 border border-blue-500/30 text-[#38BDF8] flex items-center justify-center">
                    <Mic className="w-5 h-5" />
                  </div>
                  <h2 className="text-base font-bold text-white">
                    {language === 'fr' ? 'Simulation Vocale en Direct' : 'Live Voice Simulation'}
                  </h2>
                </div>
                <span className="px-2.5 py-0.5 rounded-full bg-blue-500/15 border border-blue-500/30 text-[#38BDF8] text-xs font-bold flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5" />
                  <span>5 Min</span>
                </span>
              </div>

              <p className="text-xs text-slate-300 leading-relaxed mb-4">
                {language === 'fr'
                  ? "Passez l'entretien oral face à l'examinateur IA. Votre micro et webcam locale vous placent en conditions réelles."
                  : "Take the oral interview with the AI examiner. Practice answering out loud under real consular pressure."}
              </p>

              <ul className="text-xs text-slate-300 space-y-2.5 mb-6">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-[#38BDF8] shrink-0" />
                  <span>{language === 'fr' ? 'Questions orales adaptées à vos vœux' : 'Adaptive questions tailored to your choices'}</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-[#38BDF8] shrink-0" />
                  <span>{language === 'fr' ? 'Chrono consulaire officiel et relances' : 'Real-time timer and follow-up prompts'}</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-[#38BDF8] shrink-0" />
                  <span>{language === 'fr' ? 'Bilan verbatim complet et pistes de reformulation' : 'Instant verbatim score and reformulations'}</span>
                </li>
              </ul>
            </div>

            <div>
              {isProfileComplete ? (
                <Link
                  href="/entretien/preparation"
                  prefetch={true}
                  className="w-full inline-flex items-center justify-center gap-2 py-3.5 px-4 rounded-xl bg-[#0066FF] hover:bg-[#0052CC] text-white font-bold text-xs sm:text-sm shadow-lg shadow-blue-500/25 transition active:scale-[0.98]"
                >
                  <span>{language === 'fr' ? 'Démarrer ma simulation (5 min)' : 'Start voice simulation (5 min)'}</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>
              ) : (
                <Link
                  href="/profil"
                  prefetch={true}
                  className="w-full inline-flex items-center justify-center gap-2 py-3.5 px-4 rounded-xl bg-gradient-to-r from-amber-600 to-orange-500 hover:from-amber-500 hover:to-orange-400 text-white font-bold text-xs sm:text-sm shadow-lg shadow-amber-500/25 transition active:scale-[0.98]"
                >
                  <AlertCircle className="w-4 h-4" />
                  <span>{language === 'fr' ? 'Compléter mon dossier pour démarrer (Requis)' : 'Complete dossier to start (Required)'}</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>
              )}
            </div>
          </div>
        </div>

        {/* Dernier Rapport d'Évaluation (Si disponible) */}
        {lastReport && (
          <div className="bg-[#0D121F] border border-white/10 rounded-3xl p-6 shadow-sm">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-3">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 flex items-center justify-center shrink-0">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-white">
                    {language === 'fr' ? 'Dernier Bilan Pédagogique' : 'Latest Evaluation Report'}
                  </h2>
                  <span className="text-xs text-slate-400">
                    {language === 'fr' ? 'Score :' : 'Score:'}{' '}
                    <strong className="text-[#38BDF8] font-bold">{lastReport.overallScore}/100</strong>
                  </span>
                </div>
              </div>

              <Link
                href={`/rapport/${lastReport.sessionId || lastReport.id}`}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-xs font-bold text-white border border-white/10 transition shadow-xs"
              >
                <span>{language === 'fr' ? 'Consulter le rapport complet' : 'View full report'}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed bg-[#121827] p-4 rounded-2xl border border-white/10 line-clamp-2">
              {lastReport.synthesisSummary}
            </p>
          </div>
        )}

        {/* Section Suivi de Progression Multi-Entretiens (Si disponible) */}
        {scoreProgression && (
          <div className="bg-[#0D121F] border border-white/10 rounded-3xl p-6 shadow-sm">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-blue-500/15 border border-blue-500/30 text-[#38BDF8] flex items-center justify-center shrink-0">
                  <TrendingUp className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-white">
                    {language === 'fr' ? 'Évolution de votre Performance' : 'Performance Progression'}
                  </h2>
                  <span className="text-xs text-slate-400">
                    {language === 'fr' ? 'Comparaison entre vos deux dernières simulations' : 'Comparison between last two simulations'}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2.5">
                <span className={`px-3 py-1 rounded-full font-bold text-xs flex items-center gap-1 ${
                  scoreProgression.diff >= 0
                    ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                    : 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
                }`}>
                  <TrendingUp className="w-3.5 h-3.5" />
                  <span>{scoreProgression.diff > 0 ? `+${scoreProgression.diff} pts` : `${scoreProgression.diff} pts`}</span>
                </span>

                <Link
                  href="/historique"
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-xs font-bold text-white border border-white/10 transition shadow-xs"
                >
                  <History className="w-3.5 h-3.5 text-[#38BDF8]" />
                  <span>{language === 'fr' ? `Historique (${sessionsCount})` : `History (${sessionsCount})`}</span>
                </Link>
              </div>
            </div>
          </div>
        )}

        {/* Footer simple et discret pour recharges rapides */}
        <div className="pt-2 text-center">
          <Link
            href="/tarifs"
            className="inline-flex items-center gap-2 text-xs font-semibold text-slate-400 hover:text-[#38BDF8] transition"
          >
            <CreditCard className="w-3.5 h-3.5" />
            <span>
              {language === 'fr' 
                ? 'Besoin de recharger ? Voir tous les packs par Carte Bancaire & Mobile Money' 
                : 'Need more credits? View all packs with Credit Card & Mobile Money'}
            </span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </main>

      {/* Modal Recharges */}
      <MobileMoneyModal
        isOpen={rechargeModalOpen}
        onClose={() => setRechargeModalOpen(false)}
        defaultPackId="pack_reussite"
        onPaymentSuccess={(newBalance) => setCreditsBalance(newBalance)}
      />

      <footer className="border-t border-white/10 py-6 text-center text-xs text-slate-500 bg-[#05070E]">
        <p>
          {language === 'fr' 
            ? 'PrépaCampus — Entraînement pédagogique indépendant aux entretiens Campus France.' 
            : 'PrépaCampus — Independent pedagogical preparation for Campus France interviews.'}
        </p>
      </footer>
    </div>
  );
}
