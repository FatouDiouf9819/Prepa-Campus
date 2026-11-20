'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { 
  GraduationCap, 
  Mic, 
  TrendingUp, 
  Trophy,
  ArrowRight, 
  Star, 
  Check, 
  ChevronRight, 
  ChevronDown, 
  LayoutDashboard, 
  Sparkles, 
  Play, 
  Volume2, 
  CheckCircle2,
  History,
  BookOpen,
  Zap,
  AlertCircle,
  FileText
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { Navbar } from '@/components/navigation/Navbar';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import { AcademicProfileData } from '@/types/profile';
import { isAcademicProfileComplete } from '@/lib/validations/profile';
import { MobileMoneyModal } from '@/components/payments/MobileMoneyModal';

export default function HomePage() {
  const { language, t } = useLanguage();
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [profile, setProfile] = useState<AcademicProfileData | null>(null);
  const [creditsBalance, setCreditsBalance] = useState<number>(1);
  const [rechargeModalOpen, setRechargeModalOpen] = useState(false);
  const [isAddingCredits, setIsAddingCredits] = useState(false);
  const [showPublicPresentation, setShowPublicPresentation] = useState(false);

  const [activeFaq, setActiveFaq] = useState<number | null>(0);
  const [activeStep, setActiveStep] = useState<number | null>(0);
  const [activeTestimonial, setActiveTestimonial] = useState<number | null>(0);
  const [activeTab, setActiveTab] = useState<'question' | 'feedback'>('feedback');

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      setIsAuthenticated(!!user);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setIsAuthenticated(!!session?.user);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!isAuthenticated) return;

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
        // Repli
      }
      try {
        const saved = localStorage.getItem('campus_france_credits_balance');
        if (saved !== null) {
          setCreditsBalance(parseInt(saved, 10));
        }
      } catch {
        // Ignorer
      }
    }

    async function loadProfile() {
      try {
        const res = await fetch('/api/profile');
        if (res.ok) {
          const data = await res.json();
          if (data && data.profile) {
            setProfile(data.profile);
            return;
          }
        }
      } catch {
        // Repli
      }
      try {
        const saved = localStorage.getItem('campus_france_profile_draft');
        if (saved) setProfile(JSON.parse(saved));
      } catch {
        // Ignorer
      }
    }

    loadCredits();
    loadProfile();
  }, [isAuthenticated]);

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

  const isProfileComplete = isAcademicProfileComplete(profile);

  const faqItems = [
    {
      q: "Quelles sont les questions les plus fréquemment posées lors de l'entretien ?",
      a: "L'entretien officiel Campus France évalue trois piliers majeurs : la clarté de votre projet d'études, la cohérence de votre projet professionnel (débouchés, secteurs visés), et vos motivations réelles pour choisir la France. Notre IA simule les 50+ questions types et leurs variantes posées par les conseillers."
    },
    {
      q: "Prépa Campus est-il adapté à mon pays (Sénégal, Cameroun, Côte d'Ivoire, Maroc, etc.) ?",
      a: "Absolument. La plateforme prend en compte les spécificités des espaces Campus France de plus de 35 pays partenaires (Afrique subsaharienne, Maghreb, Asie). Les critères d'évaluation et les exigences académiques restent harmonisés selon les standards officiels du Ministère de l'Enseignement Supérieur français."
    },
    {
      q: "Comment l'IA évalue-t-elle mes réponses orales et écrites ?",
      a: "Notre algorithme analyse instantanément la structure argumentative, la précision du vocabulaire, la cohérence financière, ainsi que la capacité à éviter les pièges éliminatoires (propos vagues, manque de justification du choix de formation). Vous recevez une note sur 20 et des axes d'amélioration précis."
    },
    {
      q: "Combien de simulations puis-je réaliser ?",
      a: "Vous pouvez vous entraîner en illimité 24h/24 et 7j/7 jusqu'au jour de votre convocation. Chaque session génère des questions renouvelées et adaptées à votre filière spécifique (Informatique, Gestion, Santé, Droit, Ingénierie, etc.)."
    }
  ];

  const stepsData = [
    {
      num: "01",
      badge: "Profil & Cursus",
      title: "Renseignez votre parcours et vos vœux d'études",
      shortDesc: "Indiquez votre filière, vos universités ciblées et vos ambitions de carrière en France.",
      fullDesc: "Notre système configure immédiatement un profil d'entretien sur-mesure. Vous précisez votre cursus d'origine (Licence, Master, BTS), vos universités ciblées en France (Sorbonne, Paris-Saclay, Lyon, etc.) et votre projet professionnel. L'IA adapte ses critères exactement selon les exigences de votre commission académique.",
      icon: "/step-icon-1.png",
      keyPoints: [
        "Alignement avec votre compte Pastel / Études en France",
        "Prise en compte de votre filière et niveau d'admission",
        "Définition de votre projet d'insertion professionnelle"
      ]
    },
    {
      num: "02",
      badge: "Immersion Réelle",
      title: "Simulez votre entretien en conditions réelles avec l'IA",
      shortDesc: "Répondez aux questions posées par l'IA et confrontez-vous aux scénarios réels.",
      fullDesc: "Vous êtes plongé dans les conditions réelles d'un entretien Campus France. L'IA pose les questions clés, relance sur les points sensibles (cohérence du projet, financement, retour au pays) et teste votre réactivité orale ou écrite avec un chronomètre réaliste.",
      icon: "/step-icon-2.png",
      keyPoints: [
        "Banque actualisée de 50+ questions types et variantes régionales",
        "Détection des pièges éliminatoires et relances en temps réel",
        "Mode oral (micro) ou écrit selon votre convenance"
      ]
    },
    {
      num: "03",
      badge: "Résultats & Avis Favorable",
      title: "Analysez vos feedbacks et décrochez votre avis favorable",
      shortDesc: "Appliquez les corrections personnalisées et présentez-vous serein et victorieux.",
      fullDesc: "En moins de 30 secondes, recevez votre bilan détaillé : note d'admissibilité sur 20, points forts, faiblesses éliminatoires identifiées, et reformulations stratégiques rédigées pour convaincre votre examinateur dès les premières minutes.",
      icon: "/step-icon-3.png",
      keyPoints: [
        "Note sur 20 basée sur la grille officielle des conseillers",
        "Reformulations stratégiques mot à mot de vos réponses",
        "Progression continue jusqu'à l'obtention de l'Avis Favorable"
      ]
    }
  ];

  const testimonialsData = [
    {
      name: "Mamadou Diallo",
      admission: "Admis à Sorbonne Université (Paris)",
      city: "Dakar, Sénégal",
      avatar: "/avatar-ref-mamadou.png",
      stars: 5,
      rating: "19/20 à l'entretien",
      shortQuote: "« Grâce aux simulations, j'ai tout de suite compris pourquoi mes premières réponses étaient trop vagues. »",
      fullQuote: "« Grâce aux simulations, j'ai tout de suite compris pourquoi mes premières réponses étaient trop vagues. Le jour de mon entretien à l'espace Campus France de Dakar, les questions du conseiller étaient exactement celles préparées sur la plateforme. J'ai défendu mon projet de Master Informatique avec assurance et j'ai décroché l'avis favorable direct sans la moindre hésitation ! »",
      keyFactor: "Structuration du projet professionnel et justification du choix de la Sorbonne."
    },
    {
      name: "Aïssatou Sow",
      admission: "Admise à Université Paris-Saclay",
      city: "Abidjan, Côte d'Ivoire",
      avatar: "/avatar-ref-aissatou-sow.png",
      stars: 5,
      rating: "Avis Favorable validé",
      shortQuote: "« Les conseils sur la cohérence financière et le projet professionnel m'ont littéralement sauvée. »",
      fullQuote: "« Les conseils sur la cohérence financière et le projet professionnel m'ont littéralement sauvée. J'avais du mal à expliquer mon plan de financement et l'IA m'a donné les tournures exactes attendues par les agents consulaires. Les retours sont instantanés et infiniment plus rigoureux qu'un accompagnement classique. Je recommande à 100% à tous les candidats. »",
      keyFactor: "Clarification du budget prévisionnel et logique de réinsertion professionnelle."
    },
    {
      name: "Ibrahima Ndiaye",
      admission: "Admis à INSA Lyon",
      city: "Douala, Cameroun",
      avatar: "/avatar-ref-ibrahima.png",
      stars: 5,
      rating: "18.5/20 évalué par l'IA",
      shortQuote: "« Une plateforme intuitive, ultra-performante et rassurante. En 3 entraînements, j'étais prêt. »",
      fullQuote: "« Une plateforme intuitive, ultra-performante et rassurante. En 3 entraînements, j'avais éliminé tous mes tics de langage et structuré mon projet d'ingénierie selon les standards des grandes écoles. Arrivé devant l'examinateur, je n'avais plus aucun stress car j'avais déjà vécu la scène plusieurs fois. Merci Prépa Campus ! »",
      keyFactor: "Maîtrise du discours technique et arguments de motivation pour l'INSA Lyon."
    }
  ];

  return (
    <div className="min-h-screen bg-[#05070E] text-slate-100 flex flex-col font-sans selection:bg-[#0066FF]/30 selection:text-white">
      
      {/* 1. Header Navigation Unifié avec Menu Mobile Plein Écran Dark */}
      <Navbar />

      {/* ESPACE CANDIDAT AUTHENTIFIÉ — HUB DE PRÉPARATION DARK */}
      {isAuthenticated && !showPublicPresentation ? (
        <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 space-y-8 animate-in fade-in duration-300">
          
          {/* 1. HERO PRÉPARATION CANDIDAT (La page noire préférée de l'étudiant) */}
          <section className="relative rounded-3xl p-6 sm:p-12 text-center overflow-hidden border border-white/10 bg-gradient-to-b from-[#0B132B]/70 via-[#070D1E]/80 to-[#05070E] shadow-2xl">
            {/* Lueur d'ambiance bleue */}
            <div className="absolute -top-32 left-1/2 -translate-x-1/2 w-[650px] h-[300px] bg-gradient-to-b from-[#0066FF]/25 via-[#38BDF8]/15 to-transparent blur-3xl pointer-events-none rounded-full" />

            <div className="relative z-10 max-w-3xl mx-auto flex flex-col items-center">
              {/* Badge supérieur */}
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-500/15 border border-blue-500/30 text-[#38BDF8] text-xs font-bold mb-5 shadow-xs">
                <Sparkles className="w-3.5 h-3.5 text-[#38BDF8]" />
                <span>{t('home.hero_badge')}</span>
              </div>

              {/* Titre Principal */}
              <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black text-white tracking-tight leading-tight">
                {t('home.hero_title')}{' '}
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#0066FF] via-[#38BDF8] to-cyan-400">
                  {t('home.hero_title_highlight')}
                </span>{' '}
                {t('home.hero_title_suffix')}
              </h1>

              {/* Sous-titre */}
              <p className="text-sm sm:text-base lg:text-lg text-slate-300 max-w-2xl mx-auto mt-4 leading-relaxed font-normal">
                {t('home.hero_subtitle')}
              </p>

              {/* Bouton d'action principal */}
              <div className="flex flex-col sm:flex-row items-center justify-center gap-3.5 sm:gap-4 mt-8 w-full max-w-md mx-auto">
                <Link
                  href={isProfileComplete ? "/entretien/preparation" : "/profil"}
                  prefetch={true}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2.5 px-8 py-4 rounded-2xl bg-gradient-to-r from-[#0066FF] to-[#0052CC] hover:from-[#0052CC] hover:to-[#0040A8] text-white font-extrabold text-sm sm:text-base shadow-xl shadow-blue-500/30 transition transform hover:-translate-y-0.5 active:scale-95 group cursor-pointer"
                >
                  <Play className="w-4 h-4 fill-current group-hover:scale-110 transition-transform" />
                  <span>{t('home.hero_cta')}</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>

                <Link
                  href="/dashboard"
                  prefetch={true}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-4 rounded-2xl bg-[#0D121F] hover:bg-[#121827] text-slate-200 hover:text-white border border-white/10 text-xs sm:text-sm font-bold shadow-md transition cursor-pointer"
                >
                  <LayoutDashboard className="w-4 h-4 text-[#38BDF8]" />
                  <span>Tableau de bord</span>
                </Link>
              </div>

              {/* Disclaimer d'indépendance discret */}
              <p className="text-[11px] text-slate-500 mt-5 max-w-xl">
                {t('home.disclaimer')}
              </p>
            </div>
          </section>

          {/* 2. STATUT CANDIDAT (Solde & Dossier Pastel) */}
          <div className="p-5 sm:p-6 rounded-3xl bg-[#0D121F] border border-white/10 shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-5">
            {/* Solde & Rechargement */}
            <div className="flex items-center gap-3 flex-wrap">
              <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-xs font-semibold">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-slate-300">
                  Solde de simulations :{' '}
                  <strong className="text-white font-bold">
                    {creditsBalance} {creditsBalance > 1 ? 'disponibles' : 'disponible'}
                  </strong>
                </span>
              </div>

              <button
                type="button"
                onClick={() => setRechargeModalOpen(true)}
                className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-[#0066FF] hover:bg-[#0052CC] text-white font-bold text-xs shadow-md shadow-blue-500/25 transition active:scale-95 cursor-pointer"
              >
                <Zap className="w-3.5 h-3.5" />
                <span>Recharger</span>
              </button>

              <button
                type="button"
                disabled={isAddingCredits}
                onClick={() => handleQuickAddCredits(10)}
                className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-emerald-500/15 border border-emerald-500/30 hover:bg-emerald-500/25 text-emerald-400 font-bold text-xs transition active:scale-95 cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>{isAddingCredits ? '...' : '+10 Gratuits'}</span>
              </button>
            </div>

            {/* Dossier Académique Stepper / Status */}
            <div className="flex items-center gap-3">
              {isProfileComplete ? (
                <div className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-xs font-semibold">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>Dossier académique complet</span>
                  <Link href="/profil" className="text-white hover:underline text-[11px] ml-1">
                    (Vérifier)
                  </Link>
                </div>
              ) : (
                <div className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-300 text-xs font-semibold">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>Dossier incomplet</span>
                  <Link href="/profil" className="text-white font-bold underline text-xs ml-1">
                    Compléter mon dossier →
                  </Link>
                </div>
              )}
            </div>
          </div>

          {/* 3. LES 4 ACTIONS ESSENTIELLES DU CANDIDAT */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            
            {/* Action 1 : Simulation */}
            <Link
              href={isProfileComplete ? "/entretien/preparation" : "/profil"}
              className="p-5 rounded-2xl bg-[#0D121F] border border-white/10 hover:border-blue-500/40 transition group flex flex-col justify-between"
            >
              <div className="space-y-3">
                <div className="w-10 h-10 rounded-xl bg-blue-500/15 border border-blue-500/30 flex items-center justify-center text-[#38BDF8] group-hover:scale-105 transition-transform">
                  <Mic className="w-5 h-5" />
                </div>
                <h3 className="text-base font-bold text-white group-hover:text-[#38BDF8] transition">
                  Simulation Vocale (5 min)
                </h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Entraînement en direct avec le jury IA, relances adaptées et chronomètre officiel.
                </p>
              </div>
              <div className="pt-4 mt-2 border-t border-white/5 flex items-center justify-between text-xs font-bold text-[#38BDF8]">
                <span>Lancer l&apos;entretien</span>
                <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
              </div>
            </Link>

            {/* Action 2 : 50 Questions types */}
            <Link
              href="/questions"
              className="p-5 rounded-2xl bg-[#0D121F] border border-white/10 hover:border-blue-500/40 transition group flex flex-col justify-between"
            >
              <div className="space-y-3">
                <div className="w-10 h-10 rounded-xl bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center text-cyan-400 group-hover:scale-105 transition-transform">
                  <BookOpen className="w-5 h-5" />
                </div>
                <h3 className="text-base font-bold text-white group-hover:text-cyan-400 transition">
                  50 Questions Types
                </h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Banque officielle des 50 questions posées par les conseillers et pièges décryptés.
                </p>
              </div>
              <div className="pt-4 mt-2 border-t border-white/5 flex items-center justify-between text-xs font-bold text-cyan-400">
                <span>Explorer les questions</span>
                <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
              </div>
            </Link>

            {/* Action 3 : Historique & Bilans */}
            <Link
              href="/historique"
              className="p-5 rounded-2xl bg-[#0D121F] border border-white/10 hover:border-blue-500/40 transition group flex flex-col justify-between"
            >
              <div className="space-y-3">
                <div className="w-10 h-10 rounded-xl bg-purple-500/15 border border-purple-500/30 flex items-center justify-center text-purple-400 group-hover:scale-105 transition-transform">
                  <History className="w-5 h-5" />
                </div>
                <h3 className="text-base font-bold text-white group-hover:text-purple-400 transition">
                  Historique & Bilans
                </h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Consultez vos bilans verbatim, notes consulaires sur 20 et conseils de progression.
                </p>
              </div>
              <div className="pt-4 mt-2 border-t border-white/5 flex items-center justify-between text-xs font-bold text-purple-400">
                <span>Voir mes rapports</span>
                <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
              </div>
            </Link>

            {/* Action 4 : Dossier Pastel */}
            <Link
              href="/profil"
              className="p-5 rounded-2xl bg-[#0D121F] border border-white/10 hover:border-blue-500/40 transition group flex flex-col justify-between"
            >
              <div className="space-y-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400 group-hover:scale-105 transition-transform">
                  <FileText className="w-5 h-5" />
                </div>
                <h3 className="text-base font-bold text-white group-hover:text-emerald-400 transition">
                  Mon Dossier Pastel
                </h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Renseignez vos universités, projet professionnel et correction intelligente d&apos;orthographe.
                </p>
              </div>
              <div className="pt-4 mt-2 border-t border-white/5 flex items-center justify-between text-xs font-bold text-emerald-400">
                <span>Modifier mon dossier</span>
                <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
              </div>
            </Link>

          </div>

          {/* 4. LES 3 PILIERS DE LA PRÉPARATION */}
          <section className="p-6 sm:p-8 rounded-3xl bg-[#0D121F] border border-white/10 space-y-6">
            <div className="text-center max-w-xl mx-auto">
              <h2 className="text-xl sm:text-2xl font-black text-white">
                {t('home.how_it_works')}
              </h2>
              <p className="text-xs text-slate-400 mt-1">
                La méthode recommandée pour décrocher votre avis favorable Campus France.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 rounded-2xl bg-white/5 border border-white/5 space-y-2">
                <span className="w-7 h-7 rounded-lg bg-blue-500/20 text-[#38BDF8] flex items-center justify-center text-xs font-bold">1</span>
                <h3 className="text-sm font-bold text-white">{t('home.pillar1_title')}</h3>
                <p className="text-xs text-slate-400 leading-relaxed">{t('home.pillar1_desc')}</p>
              </div>

              <div className="p-4 rounded-2xl bg-white/5 border border-white/5 space-y-2">
                <span className="w-7 h-7 rounded-lg bg-cyan-500/20 text-cyan-400 flex items-center justify-center text-xs font-bold">2</span>
                <h3 className="text-sm font-bold text-white">{t('home.pillar2_title')}</h3>
                <p className="text-xs text-slate-400 leading-relaxed">{t('home.pillar2_desc')}</p>
              </div>

              <div className="p-4 rounded-2xl bg-white/5 border border-white/5 space-y-2">
                <span className="w-7 h-7 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-xs font-bold">3</span>
                <h3 className="text-sm font-bold text-white">{t('home.pillar3_title')}</h3>
                <p className="text-xs text-slate-400 leading-relaxed">{t('home.pillar3_desc')}</p>
              </div>
            </div>
          </section>

          {/* 5. AVERTISSEMENTS & SÉCURITÉ */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs text-slate-400">
            <div className="p-4 rounded-2xl bg-[#0D121F] border border-white/5 space-y-1">
              <span className="font-bold text-slate-200 block">Avertissement & Indépendance</span>
              <p className="text-[11px] leading-relaxed text-slate-400">
                PrépaCampus est une structure privée et indépendante d&apos;aide et de simulation pédagogique pour préparer le vrai entretien. Nous ne travaillons pas avec Campus France et n&apos;avons aucune affiliation institutionnelle.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-[#0D121F] border border-white/5 space-y-1">
              <span className="font-bold text-slate-200 block">Sécurité & Confidentialité de la Caméra</span>
              <p className="text-[11px] leading-relaxed text-slate-400">
                La caméra est activée exclusivement pour vous placer en conditions réelles. Nous ne collectons aucune donnée vidéo : vos images ne sont jamais enregistrées ni stockées dans nos bases.
              </p>
            </div>
          </div>

          {/* 6. LIEN VERS LA PRÉSENTATION PUBLIQUE */}
          <div className="text-center pt-2 pb-6">
            <button
              type="button"
              onClick={() => setShowPublicPresentation(true)}
              className="inline-flex items-center gap-2 text-xs text-slate-500 hover:text-[#38BDF8] underline decoration-slate-700 underline-offset-4 transition cursor-pointer"
            >
              <span>Consulter la présentation publique de Prépa Campus</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

        </main>
      ) : (
        <>
          {showPublicPresentation && (
            <div className="bg-[#0D121F] border-b border-white/10 px-4 py-3 text-center text-xs text-slate-300 flex items-center justify-center gap-3">
              <span>Vous consultez actuellement la vitrine publique du simulateur.</span>
              <button
                type="button"
                onClick={() => setShowPublicPresentation(false)}
                className="text-[#38BDF8] font-bold hover:underline inline-flex items-center gap-1 cursor-pointer"
              >
                <span>← Revenir à mon espace de préparation</span>
              </button>
            </div>
          )}

      {/* 2. HERO SECTION — COUVERTURE TOTALE (PLEIN ÉCRAN IMMERSIF - DARK THEME) */}
      
      {/* VERSION MOBILE (< md) : Arrière-plan photo authentique couvrant 100% de la section */}
      <section className="md:hidden relative w-full overflow-hidden h-[460px] min-[400px]:h-[490px] flex items-center px-4 min-[390px]:px-5 py-6 bg-[#05070E]">
        
        {/* CALQUE 1 : L'arrière-plan de la photo couvre 100% de toute la section hero mobile */}
        <div className="absolute inset-0 z-0 pointer-events-none select-none">
          <Image
            src="/hero-authentic-paris-flipped-hd.jpg"
            alt="Étudiante à Paris devant la Tour Eiffel - Réussite Campus France"
            fill
            priority
            unoptimized
            className="object-cover object-[58%_center] select-none"
            sizes="100vw"
          />
          {/* Dégradé sombre pour assurer un contraste et une lisibilité parfaits */}
          <div className="absolute inset-y-0 left-0 w-[64%] min-[400px]:w-[60%] bg-gradient-to-r from-[#05070E] via-[#05070E]/95 sm:via-[#05070E]/80 to-transparent z-10" />
          {/* Dégradé bas pour fondre naturellement avec la suite de la page */}
          <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-[#05070E] to-transparent z-10" />
        </div>

        {/* CALQUE 2 : Contenu textuel sur la gauche assis sur la zone dégagée */}
        <div className="relative z-20 w-[52%] min-[400px]:w-[48%] flex flex-col items-start">
          
          {/* Badge supérieur de réassurance */}
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[9px] min-[360px]:text-[9.5px] min-[400px]:text-[10px] font-semibold bg-white/10 backdrop-blur-md border border-white/15 text-[#38BDF8] shadow-xs mb-2.5">
            <span className="w-1.5 h-1.5 rounded-full bg-[#38BDF8] animate-pulse" />
            <span>Votre réussite, notre priorité</span>
          </div>

          {/* Titre Principal percutant */}
          <h1 className="text-[19px] min-[360px]:text-[21px] min-[400px]:text-[23px] font-extrabold text-white tracking-tight leading-[1.14]">
            Réussis ton entretien <br />
            <span className="text-[#38BDF8]">Campus France</span> <br />
            avec confiance.
          </h1>

          {/* Sous-titre soigné */}
          <p className="text-[10px] min-[360px]:text-[10.5px] min-[400px]:text-[11px] text-slate-300 leading-relaxed mt-2 font-normal">
            Entraînement pas à pas, feedbacks clairs et conseils personnalisés pour défendre votre projet d'études en France.
          </p>

          {/* Bouton CTA Premium */}
          <div className="mt-3.5">
            <Link
              href="/auth/inscription"
              className="inline-flex items-center gap-1.5 bg-[#0066FF] hover:bg-[#0052CC] text-white font-semibold text-[11px] min-[360px]:text-xs px-3.5 py-2.5 rounded-full shadow-lg shadow-blue-500/30 hover:shadow-blue-500/40 transition-all group whitespace-nowrap"
            >
              <span>Commencer ma préparation</span>
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
            </Link>
          </div>

          {/* Micro-preuve de confiance sous le bouton */}
          <div className="flex items-center gap-1.5 text-[9px] min-[360px]:text-[9.5px] text-slate-300 font-medium mt-2.5">
            <div className="w-3.5 h-3.5 rounded-full bg-blue-500/20 border border-blue-500/30 flex items-center justify-center text-[#38BDF8] shrink-0">
              <Check className="w-2 h-2 stroke-[3]" />
            </div>
            <span>Simulation intelligente & feedbacks immédiats</span>
          </div>

        </div>

      </section>

      {/* VERSION DESKTOP (>= md) : Plein écran immersif avec éléments de crédibilité de classe mondiale */}
      <section className="hidden md:flex relative overflow-hidden w-full bg-[#05070E] items-center min-h-[620px] h-[calc(100vh-80px)] max-h-[840px] py-10">
        
        {/* CALQUE 1 : Arrière-plan photographique intégral couvrant 100% de la Hero Section */}
        <div className="absolute inset-0 z-0 pointer-events-none select-none">
          <Image
            src="/hero-authentic-paris-flipped-hd.jpg"
            alt="Étudiante internationale à Paris préparant ses cours devant la Tour Eiffel"
            fill
            priority
            unoptimized
            className="object-cover object-center select-none"
            sizes="100vw"
          />
          {/* Dégradé sombre pour détacher la typographie avec un contraste parfait */}
          <div className="absolute inset-y-0 left-0 w-full sm:w-[60%] md:w-[50%] lg:w-[44%] bg-gradient-to-r from-[#05070E] via-[#05070E]/95 sm:via-[#05070E]/75 to-transparent z-10" />
          {/* Dégradé bas pour fondre naturellement avec la suite de la page */}
          <div className="absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-[#05070E] via-[#05070E]/70 to-transparent z-10" />
        </div>

        {/* CALQUE 2 : Contenu éditorial de prestige */}
        <div className="relative z-20 max-w-7xl mx-auto px-6 lg:px-8 w-full">
          <div className="w-[48%] lg:w-[43%] max-w-xl flex flex-col items-start">
            
            {/* Badge supérieur de réassurance avec puce vivante */}
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-semibold bg-white/10 backdrop-blur-md border border-white/15 text-[#38BDF8] shadow-xs mb-5">
              <span className="w-2 h-2 rounded-full bg-[#38BDF8] animate-pulse" />
              <span>Simulateur Officiel IA • Session 2025 - 2026</span>
            </div>

            {/* Titre Principal percutant avec accentuation élégante */}
            <h1 className="text-4xl sm:text-5xl lg:text-[54px] font-black text-white tracking-tight leading-[1.12]">
              Réussis ton entretien <br />
              <span className="bg-gradient-to-r from-[#38BDF8] to-[#0066FF] bg-clip-text text-transparent">
                Campus France
              </span> <br />
              avec confiance.
            </h1>

            {/* Sous-titre soigné et à forte valeur ajoutée */}
            <p className="text-base lg:text-lg text-slate-300 leading-relaxed mt-5 font-normal max-w-lg">
              Entraînement pas à pas en conditions réelles, détection immédiate des pièges éliminatoires et feedbacks personnalisés pour décrocher votre avis favorable.
            </p>

            {/* Rangée de Boutons d'Action Premium */}
            <div className="mt-8 flex items-center gap-4 flex-wrap">
              <Link
                href="/auth/inscription"
                className="inline-flex items-center gap-2.5 bg-[#0066FF] hover:bg-[#0052CC] text-white font-bold text-base px-8 py-4 rounded-full shadow-xl shadow-blue-500/30 hover:shadow-blue-500/40 hover:-translate-y-0.5 transition-all group whitespace-nowrap"
              >
                <span>Commencer ma préparation</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </Link>
              <a
                href="#simulateur"
                className="inline-flex items-center gap-2 bg-white/10 hover:bg-white/15 text-white font-semibold text-sm px-5 py-3.5 rounded-full border border-white/15 backdrop-blur-md shadow-xs hover:shadow-md transition-all"
              >
                <Play className="w-3.5 h-3.5 text-[#38BDF8] fill-[#38BDF8]" />
                <span>Voir la démonstration</span>
              </a>
            </div>

            {/* Preuves d'autorité et notation vérifiée */}
            <div className="mt-8 pt-6 border-t border-white/10 flex items-center gap-6">
              <div className="flex -space-x-2">
                <div className="w-8 h-8 rounded-full border-2 border-[#05070E] overflow-hidden relative shadow-xs">
                  <Image src="/avatar-ref-mamadou.png" alt="Mamadou" fill className="object-cover" />
                </div>
                <div className="w-8 h-8 rounded-full border-2 border-[#05070E] overflow-hidden relative shadow-xs">
                  <Image src="/avatar-ref-aissatou-sow.png" alt="Aïssatou" fill className="object-cover" />
                </div>
                <div className="w-8 h-8 rounded-full border-2 border-[#05070E] overflow-hidden relative shadow-xs">
                  <Image src="/avatar-ref-ibrahima.png" alt="Ibrahima" fill className="object-cover" />
                </div>
              </div>
              <div className="text-xs text-slate-300 font-medium">
                <div className="flex items-center gap-1 text-amber-400 font-bold">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                  ))}
                  <span className="text-white ml-1">4.9 / 5</span>
                </div>
                <p className="text-slate-400 mt-0.5">+1 500 étudiants admis en France avec succès</p>
              </div>
            </div>

          </div>
        </div>

        {/* Badge flottant d'excellence sur la photo */}
        <div className="hidden xl:flex items-center gap-3.5 bg-[#0B0F19]/90 backdrop-blur-xl border border-white/15 p-4 rounded-2xl shadow-2xl absolute right-12 bottom-16 z-20">
          <div className="w-11 h-11 rounded-xl bg-gradient-to-tr from-[#0066FF] to-[#38BDF8] flex items-center justify-center text-white shrink-0 shadow-md shadow-blue-500/25">
            <Check className="w-6 h-6 stroke-[2.5]" />
          </div>
          <div>
            <div className="text-xs font-extrabold text-white">Avis Favorable Décroché</div>
            <div className="text-[11px] text-[#38BDF8] font-semibold">Admise à Sorbonne Université (Paris)</div>
          </div>
        </div>

      </section>

      {/* 2bis. LES 3 AVANTAGES CLÉS EN CARTES (Directement sous le Hero - Dark Theme) */}
      <section className="relative z-30 -mt-6 sm:-mt-8 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5 sm:gap-6 bg-[#0D121F]/90 backdrop-blur-xl p-4 sm:p-6 rounded-2xl sm:rounded-3xl border border-white/10 shadow-2xl shadow-black/50">
          
          <div className="flex items-center sm:items-start gap-3.5 p-2 rounded-xl hover:bg-white/5 transition-colors">
            <div className="w-11 h-11 rounded-2xl bg-blue-500/15 border border-blue-500/25 flex items-center justify-center text-[#38BDF8] shrink-0 shadow-xs">
              <Mic className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">S'entraîner comme en conditions réelles</h3>
              <p className="text-xs text-slate-400 mt-1 leading-relaxed">Simulez l'entretien Campus France avec notre IA intelligente.</p>
            </div>
          </div>

          <div className="flex items-center sm:items-start gap-3.5 p-2 rounded-xl hover:bg-white/5 transition-colors">
            <div className="w-11 h-11 rounded-2xl bg-blue-500/15 border border-blue-500/25 flex items-center justify-center text-[#38BDF8] shrink-0 shadow-xs">
              <TrendingUp className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">Recevoir des conseils pour s'améliorer</h3>
              <p className="text-xs text-slate-400 mt-1 leading-relaxed">Obtenez un feedback détaillé et stratégique sur vos réponses.</p>
            </div>
          </div>

          <div className="flex items-center sm:items-start gap-3.5 p-2 rounded-xl hover:bg-white/5 transition-colors">
            <div className="w-11 h-11 rounded-2xl bg-blue-500/15 border border-blue-500/25 flex items-center justify-center text-[#38BDF8] shrink-0 shadow-xs">
              <Trophy className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">Gagner en confiance</h3>
              <p className="text-xs text-slate-400 mt-1 leading-relaxed">Présentez votre projet d'études avec clarté, prestance et assurance.</p>
            </div>
          </div>

        </div>
      </section>

      {/* 4. SHOWCASE INTERACTIF : Découvrez la simulation IA en action (Dark Theme) */}
      <section id="simulateur" className="py-14 sm:py-20 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
        
        <div className="text-center max-w-3xl mx-auto mb-10 sm:mb-14">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-blue-500/15 text-[#38BDF8] border border-blue-500/25 mb-3">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Technologie d'évaluation exclusive</span>
          </div>
          <h2 className="text-2xl sm:text-4xl font-black text-white tracking-tight">
            Découvrez la puissance de l'entraînement par IA
          </h2>
          <p className="text-sm sm:text-base text-slate-400 mt-3 leading-relaxed">
            Exactement comme devant un conseiller Campus France : notre IA vous pose les vraies questions et vous montre immédiatement où vous excellez et où vous risquez le refus.
          </p>
        </div>

        {/* Console de Simulation Interactive */}
        <div className="bg-[#0A0E1A] rounded-3xl shadow-2xl shadow-blue-500/5 border border-white/10 overflow-hidden">
          
          {/* Header de la console */}
          <div className="bg-[#05070E] text-white px-6 py-4 flex items-center justify-between border-b border-white/10">
            <div className="flex items-center gap-3">
              <div className="flex gap-1.5">
                <span className="w-3 h-3 rounded-full bg-rose-500/80 inline-block" />
                <span className="w-3 h-3 rounded-full bg-amber-500/80 inline-block" />
                <span className="w-3 h-3 rounded-full bg-emerald-500/80 inline-block" />
              </div>
              <span className="text-xs font-mono text-slate-400 pl-2">Session n° 2841 • Entretien Simulation</span>
            </div>
            <div className="flex items-center gap-2 text-xs font-medium text-emerald-400 bg-emerald-950/60 px-3 py-1 rounded-full border border-emerald-500/30">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
              <span>Agent IA Campus France actif</span>
            </div>
          </div>

          {/* Corps de la démonstration */}
          <div className="p-6 sm:p-10 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            
            {/* Colonne Gauche : Question et réponse enregistrée */}
            <div className="lg:col-span-7 space-y-6">
              
              {/* Bulle Conseiller Campus France */}
              <div className="flex items-start gap-3.5">
                <div className="w-10 h-10 rounded-xl bg-blue-900/50 border border-blue-500/30 flex items-center justify-center text-[#38BDF8] shrink-0 font-bold text-sm shadow-xs">
                  CF
                </div>
                <div className="bg-blue-950/40 border border-blue-800/40 rounded-2xl p-4 sm:p-5 flex-1">
                  <span className="text-[11px] font-bold text-[#38BDF8] tracking-wider uppercase block mb-1">
                    Question du conseiller
                  </span>
                  <p className="text-sm sm:text-base font-semibold text-white leading-snug">
                    « Pourquoi avoir choisi spécifiquement cette formation en France plutôt que de continuer dans votre pays d'origine ? »
                  </p>
                </div>
              </div>

              {/* Bulle Candidat */}
              <div className="flex items-start gap-3.5 pl-6 sm:pl-10">
                <div className="w-9 h-9 rounded-xl bg-white/10 border border-white/15 text-white flex items-center justify-center shrink-0 text-xs font-bold shadow-xs">
                  VOUS
                </div>
                <div className="bg-[#121827] border border-white/10 rounded-2xl p-4 sm:p-5 flex-1 shadow-xs">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[11px] font-semibold text-slate-400">Votre réponse enregistrée</span>
                    <div className="flex items-center gap-1.5 text-xs text-[#38BDF8] font-medium bg-blue-500/15 border border-blue-500/25 px-2.5 py-0.5 rounded-full">
                      <Volume2 className="w-3.5 h-3.5" />
                      <span>Audio 0:42s</span>
                    </div>
                  </div>
                  <p className="text-xs sm:text-sm text-slate-200 leading-relaxed italic">
                    « Mon objectif est de devenir ingénieur cloud certifié. Cette formation à Sorbonne Université propose des partenariats industriels précis et des laboratoires de pointe inexistants dans mon pays actuel... »
                  </p>
                </div>
              </div>

            </div>

            {/* Colonne Droite : Rapport IA instantané */}
            <div className="lg:col-span-5 bg-gradient-to-br from-[#0B1020] to-[#050811] text-white p-6 sm:p-7 rounded-2xl shadow-lg border border-white/10">
              <div className="flex items-center justify-between pb-4 border-b border-white/10">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-[#38BDF8]" />
                  <span className="text-xs font-bold text-[#38BDF8] uppercase tracking-wider">Score Global IA</span>
                </div>
                <div className="text-2xl font-black text-emerald-400">
                  18.5 <span className="text-xs text-slate-400 font-normal">/ 20</span>
                </div>
              </div>

              <div className="space-y-3.5 my-5 text-xs">
                <div>
                  <div className="flex justify-between font-semibold mb-1">
                    <span className="text-slate-300">Clarté du projet d'études</span>
                    <span className="text-emerald-400">Excellente (95%)</span>
                  </div>
                  <div className="w-full bg-white/10 h-1.5 rounded-full overflow-hidden">
                    <div className="bg-emerald-400 h-full w-[95%] rounded-full" />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between font-semibold mb-1">
                    <span className="text-slate-300">Justification du choix de la France</span>
                    <span className="text-emerald-400">Très solide (90%)</span>
                  </div>
                  <div className="w-full bg-white/10 h-1.5 rounded-full overflow-hidden">
                    <div className="bg-emerald-400 h-full w-[90%] rounded-full" />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between font-semibold mb-1">
                    <span className="text-slate-300">Cohérence du projet de retour</span>
                    <span className="text-amber-400">À préciser (75%)</span>
                  </div>
                  <div className="w-full bg-white/10 h-1.5 rounded-full overflow-hidden">
                    <div className="bg-amber-400 h-full w-[75%] rounded-full" />
                  </div>
                </div>
              </div>

              <div className="bg-white/5 border border-white/10 rounded-xl p-3.5 text-xs text-slate-300">
                <p className="font-semibold text-[#38BDF8] mb-1">💡 Conseil stratégique de l'IA :</p>
                <p className="text-[11px] leading-relaxed text-slate-300">
                  Votre motivation est exemplaire. Pour obtenir un 20/20, nommez une entreprise spécifique où vous visez votre stage de fin d'études.
                </p>
              </div>

              <div className="mt-5">
                <Link
                  href="/auth/inscription"
                  className="w-full flex items-center justify-center gap-2 bg-[#0066FF] hover:bg-[#0052CC] text-white text-xs font-bold py-3 rounded-xl transition shadow-lg shadow-blue-500/30"
                >
                  <span>Tester mes propres réponses maintenant</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>

          </div>

        </div>

      </section>

      {/* 5. TROIS PILIERS D'EXCELLENCE ("Avantages" Bento Grid - Dark Theme) */}
      <section id="avantages" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-16 w-full">
        
        <div className="text-center max-w-2xl mx-auto mb-10 sm:mb-12">
          <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            Pourquoi choisir Prépa Campus ?
          </h2>
          <p className="text-xs sm:text-sm text-slate-400 mt-2">
            La seule plateforme conçue à 100% pour répondre aux exigences exactes des jurys Campus France.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          
          {/* Bento Card 1 */}
          <div className="bg-[#0D121F] rounded-3xl p-7 border border-white/10 hover:border-blue-500/40 hover:bg-[#111728] hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 flex flex-col justify-between group">
            <div>
              <div className="w-12 h-12 rounded-2xl bg-blue-500/15 border border-blue-500/25 text-[#38BDF8] flex items-center justify-center mb-5 group-hover:scale-110 transition-transform">
                <Mic className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-white mb-2">
                Simulations Vocales en Conditions Réelles
              </h3>
              <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
                Pratiquez à voix haute ou à l'écrit face à une IA qui adopte les attitudes et les relances authentiques d'un examinateur officiel.
              </p>
            </div>
            <div className="mt-6 pt-4 border-t border-white/10 flex items-center text-xs font-semibold text-[#38BDF8]">
              <span>50+ questions officielles</span>
              <ChevronRight className="w-4 h-4 ml-1" />
            </div>
          </div>

          {/* Bento Card 2 */}
          <div className="bg-[#0D121F] rounded-3xl p-7 border border-white/10 hover:border-blue-500/40 hover:bg-[#111728] hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 flex flex-col justify-between group">
            <div>
              <div className="w-12 h-12 rounded-2xl bg-blue-500/15 border border-blue-500/25 text-[#38BDF8] flex items-center justify-center mb-5 group-hover:scale-110 transition-transform">
                <TrendingUp className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-white mb-2">
                Détection Immédiate des Pièges Éliminatoires
              </h3>
              <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
                Identifiez avant l'heure vos réponses floues, vos incohérences de financement ou vos faiblesses d'orientation pour les corriger.
              </p>
            </div>
            <div className="mt-6 pt-4 border-t border-white/10 flex items-center text-xs font-semibold text-[#38BDF8]">
              <span>Feedbacks instantanés & note</span>
              <ChevronRight className="w-4 h-4 ml-1" />
            </div>
          </div>

          {/* Bento Card 3 */}
          <div className="bg-[#0D121F] rounded-3xl p-7 border border-white/10 hover:border-blue-500/40 hover:bg-[#111728] hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 flex flex-col justify-between group">
            <div>
              <div className="w-12 h-12 rounded-2xl bg-blue-500/15 border border-blue-500/25 text-[#38BDF8] flex items-center justify-center mb-5 group-hover:scale-110 transition-transform">
                <Trophy className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-white mb-2">
                Assurance Maximale & Zéro Stress le Jour J
              </h3>
              <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
                Transformez l'appréhension en maîtrise totale. Sachez exactement quoi dire, comment le formuler et convainquez avec naturel.
              </p>
            </div>
            <div className="mt-6 pt-4 border-t border-white/10 flex items-center text-xs font-semibold text-[#38BDF8]">
              <span>98% d'avis favorables</span>
              <ChevronRight className="w-4 h-4 ml-1" />
            </div>
          </div>

        </div>
      </section>

      {/* 6. SECTION : Comment ça marche ? (Liste Déroulante Épurée & Élégante - Dark Theme) */}
      <section id="comment-ca-marche" className="py-12 sm:py-20 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
        
        {/* En-tête de section */}
        <div className="text-center mb-10 sm:mb-14">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full text-xs font-semibold bg-blue-500/15 text-[#38BDF8] border border-blue-500/25 mb-3">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Méthode Éprouvée</span>
          </div>
          <h2 className="text-2xl sm:text-4xl font-extrabold text-white tracking-tight">
            Comment ça marche ?
          </h2>
          <p className="text-sm sm:text-base text-slate-400 mt-2 font-normal">
            En 3 étapes simples pour maximiser vos chances de réussite
          </p>
        </div>

        {/* Liste déroulante interactive des étapes */}
        <div className="space-y-4">
          {stepsData.map((step, idx) => {
            const isOpen = activeStep === idx;
            return (
              <div
                key={idx}
                className={`rounded-2xl sm:rounded-3xl border transition-all duration-300 overflow-hidden ${
                  isOpen
                    ? 'bg-[#0D121F] border-blue-500/40 shadow-xl shadow-blue-500/10 ring-1 ring-blue-500/20'
                    : 'bg-[#0D121F]/70 hover:bg-[#0D121F] border-white/10 shadow-xs hover:border-white/20'
                }`}
              >
                {/* Ligne d'en-tête cliquable */}
                <button
                  type="button"
                  onClick={() => setActiveStep(isOpen ? null : idx)}
                  className="w-full p-5 sm:p-6 text-left flex items-center justify-between gap-4 transition-colors group"
                >
                  <div className="flex items-center gap-4 sm:gap-5 min-w-0">
                    {/* Numéro d'étape élégant */}
                    <div
                      className={`w-10 h-10 sm:w-11 sm:h-11 rounded-xl flex items-center justify-center font-black text-sm shrink-0 transition-all ${
                        isOpen
                          ? 'bg-[#0066FF] text-white shadow-md shadow-blue-500/25 scale-105'
                          : 'bg-white/10 text-slate-300 group-hover:bg-blue-500/20 group-hover:text-[#38BDF8]'
                      }`}
                    >
                      {step.num}
                    </div>

                    {/* Titre & résumé */}
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-blue-500/15 text-[#38BDF8] border border-blue-500/30">
                          {step.badge}
                        </span>
                      </div>
                      <h3 className="text-sm sm:text-base font-bold text-white truncate sm:whitespace-normal group-hover:text-[#38BDF8] transition-colors">
                        {step.title}
                      </h3>
                      {!isOpen && (
                        <p className="text-xs text-slate-400 mt-0.5 truncate hidden sm:block">
                          {step.shortDesc}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Indicateur déroulant */}
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 border transition-all duration-300 ${
                      isOpen
                        ? 'bg-[#0066FF] text-white border-transparent rotate-180'
                        : 'bg-white/5 text-slate-400 border-white/10 group-hover:border-blue-500/30 group-hover:text-[#38BDF8]'
                    }`}
                  >
                    <ChevronDown className="w-4 h-4 transition-transform" />
                  </div>
                </button>

                {/* Contenu Déroulant & Épuré */}
                {isOpen && (
                  <div className="px-5 sm:px-6 pb-6 pt-1 border-t border-white/10 animate-fadeIn">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 pt-4">
                      
                      {/* Description détaillée & points clés */}
                      <div className="space-y-4 max-w-xl">
                        <p className="text-xs sm:text-sm text-slate-300 leading-relaxed font-normal">
                          {step.fullDesc}
                        </p>
                        
                        <div className="space-y-2 pt-1">
                          {step.keyPoints.map((point, pIdx) => (
                            <div key={pIdx} className="flex items-center gap-2.5 text-xs text-slate-200 font-medium">
                              <div className="w-4 h-4 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0 border border-emerald-500/30">
                                <Check className="w-2.5 h-2.5 stroke-[3]" />
                              </div>
                              <span>{point}</span>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Visuel d'illustration de l'étape */}
                      <div className="relative w-20 h-20 sm:w-24 sm:h-24 bg-[#131929] p-3 rounded-2xl border border-white/10 shrink-0 self-center sm:self-start shadow-xs">
                        <Image
                          src={step.icon}
                          alt={step.title}
                          fill
                          className="object-contain p-2"
                        />
                      </div>

                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* 7. SECTION : Témoignages & Étudiants Admis (Liste Déroulante Épurée & Élégante - Dark Theme) */}
      <section id="temoignages" className="py-12 sm:py-20 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
        
        {/* En-tête de section */}
        <div className="text-center mb-10 sm:mb-14">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/15 text-emerald-400 border border-emerald-500/25 mb-3">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Réussites Vérifiées</span>
          </div>
          <h2 className="text-2xl sm:text-4xl font-extrabold text-white tracking-tight">
            Ils ont réussi leur entretien
          </h2>
          <p className="text-xs sm:text-sm text-slate-400 mt-2">
            Rejoignez des centaines d'étudiants admis dans les universités françaises les plus prestigieuses.
          </p>
        </div>

        {/* Liste déroulante interactive des témoignages */}
        <div className="space-y-4">
          {testimonialsData.map((item, idx) => {
            const isOpen = activeTestimonial === idx;
            return (
              <div
                key={idx}
                className={`rounded-2xl sm:rounded-3xl border transition-all duration-300 overflow-hidden ${
                  isOpen
                    ? 'bg-[#0D121F] border-blue-500/40 shadow-xl shadow-blue-500/10 ring-1 ring-blue-500/20'
                    : 'bg-[#0D121F]/70 hover:bg-[#0D121F] border-white/10 shadow-xs hover:border-white/20'
                }`}
              >
                {/* Ligne d'en-tête cliquable */}
                <button
                  type="button"
                  onClick={() => setActiveTestimonial(isOpen ? null : idx)}
                  className="w-full p-5 sm:p-6 text-left flex items-center justify-between gap-4 transition-colors group"
                >
                  <div className="flex items-center gap-3.5 sm:gap-4 min-w-0">
                    {/* Avatar de l'étudiant */}
                    <div className="relative w-12 h-12 sm:w-14 sm:h-14 rounded-full overflow-hidden shrink-0 border-2 border-white/15 shadow-xs">
                      <Image
                        src={item.avatar}
                        alt={item.name}
                        fill
                        className="object-cover"
                      />
                    </div>

                    {/* Nom, Université & Étoiles */}
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <h3 className="text-sm sm:text-base font-bold text-white group-hover:text-[#38BDF8] transition-colors">
                          {item.name}
                        </h3>
                        <span className="text-[10px] font-semibold text-slate-400 hidden sm:inline">• {item.city}</span>
                      </div>
                      <p className="text-xs font-semibold text-[#38BDF8] truncate">
                        {item.admission}
                      </p>
                      {!isOpen && (
                        <p className="text-xs text-slate-400 mt-1 truncate italic hidden sm:block max-w-md">
                          {item.shortQuote}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Note & Chevron */}
                  <div className="flex items-center gap-3 shrink-0">
                    <div className="flex items-center gap-1 text-amber-400">
                      {[...Array(5)].map((_, i) => (
                        <Star key={i} className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                      ))}
                    </div>
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center border transition-all duration-300 ${
                        isOpen
                          ? 'bg-[#0066FF] text-white border-transparent rotate-180'
                          : 'bg-white/5 text-slate-400 border-white/10 group-hover:border-blue-500/30 group-hover:text-[#38BDF8]'
                      }`}
                    >
                      <ChevronDown className="w-4 h-4 transition-transform" />
                    </div>
                  </div>
                </button>

                {/* Contenu Déroulant & Épuré */}
                {isOpen && (
                  <div className="px-5 sm:px-6 pb-6 pt-2 border-t border-white/10 animate-fadeIn">
                    <div className="pt-3 space-y-4">
                      {/* Citation complète */}
                      <p className="text-xs sm:text-sm text-slate-200 leading-relaxed font-normal bg-[#121827] p-4 rounded-2xl border border-white/10 italic">
                        {item.fullQuote}
                      </p>

                      {/* Facteur clé de succès */}
                      <div className="flex items-center gap-2.5 text-xs text-slate-300 bg-blue-950/40 p-3 rounded-xl border border-blue-800/40">
                        <span className="font-bold text-[#38BDF8] shrink-0">Point décisif :</span>
                        <span className="font-medium text-slate-200">{item.keyFactor}</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* 8. SECTION FAQ INTERACTIVE (Questions Fréquentes - Dark Theme) */}
      <section id="faq" className="py-12 sm:py-20 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
        <div className="text-center mb-10 sm:mb-14">
          <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            Foire Aux Questions
          </h2>
          <p className="text-xs sm:text-sm text-slate-400 mt-2">
            Tout ce que vous devez savoir pour aborder votre entretien en toute sérénité.
          </p>
        </div>

        <div className="space-y-3.5">
          {faqItems.map((item, idx) => (
            <div
              key={idx}
              className="bg-[#0D121F] rounded-2xl border border-white/10 overflow-hidden shadow-xs transition-all hover:border-white/20"
            >
              <button
                onClick={() => setActiveFaq(activeFaq === idx ? null : idx)}
                className="w-full text-left p-5 sm:p-6 flex items-center justify-between gap-4 font-bold text-white hover:text-[#38BDF8] transition text-sm sm:text-base"
              >
                <span>{item.q}</span>
                <ChevronDown
                  className={`w-5 h-5 text-slate-400 shrink-0 transition-transform duration-200 ${
                    activeFaq === idx ? 'rotate-180 text-[#38BDF8]' : ''
                  }`}
                />
              </button>
              {activeFaq === idx && (
                <div className="px-5 sm:px-6 pb-6 pt-0 text-xs sm:text-sm text-slate-300 leading-relaxed border-t border-white/10">
                  <p className="mt-3">{item.a}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* 9. BANNIÈRE CTA BLEU NUIT PRESTIGE */}
      <section className="py-8 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-16 w-full">
        <div className="bg-gradient-to-r from-[#07132D] to-[#0A1938] text-white rounded-3xl p-8 sm:p-14 shadow-2xl relative overflow-hidden flex flex-col md:flex-row items-center justify-between gap-8 border border-blue-900/40">
          
          {/* Lueur d'arche bleue sur la droite */}
          <div className="absolute right-0 top-0 bottom-0 w-96 bg-gradient-to-l from-[#0066FF]/30 to-transparent pointer-events-none rounded-r-3xl" />
          <div className="absolute -left-20 -bottom-20 w-64 h-64 bg-[#0066FF]/20 rounded-full blur-3xl pointer-events-none" />

          {/* Côté Gauche : Icône Trophée & Texte d'ambition */}
          <div className="flex items-start sm:items-center gap-5 sm:gap-6 z-10">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-[#0066FF] to-[#38BDF8] flex items-center justify-center shrink-0 text-white shadow-lg shadow-blue-500/30">
              <Trophy className="w-8 h-8 text-white stroke-[1.5]" />
            </div>
            <div>
              <h3 className="text-xl sm:text-2xl lg:text-3xl font-black text-white tracking-tight leading-snug">
                Votre projet d'études mérite <br className="hidden sm:inline" />
                une préparation à la hauteur de vos <span className="text-[#38BDF8]">ambitions.</span>
              </h3>
              <p className="text-xs sm:text-sm text-slate-300 mt-2 font-normal">
                Ne laissez pas le stress décider de votre avenir. Commencez votre entraînement dès aujourd'hui.
              </p>
            </div>
          </div>

          {/* Côté Droit : Bouton Blanc avec texte sombre */}
          <div className="shrink-0 z-10 w-full md:w-auto">
            <Link
              href="/auth/inscription"
              className="w-full md:w-auto inline-flex items-center justify-center gap-2.5 bg-white hover:bg-slate-50 text-[#0A1938] font-black text-sm sm:text-base px-8 py-4 rounded-full shadow-2xl transition-all hover:scale-105"
            >
              <span>Commencer ma préparation</span>
              <ArrowRight className="w-4 h-4 text-[#0A1938]" />
            </Link>
          </div>

        </div>
      </section>

      {/* FOOTER OFFICIEL & MENTIONS LÉGALES */}
      <footer className="border-t border-white/10 py-10 bg-[#05070E] text-slate-400">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-b border-white/10 pb-6">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-[#0066FF] to-[#38BDF8] flex items-center justify-center text-white shadow-md">
                <GraduationCap className="w-4 h-4" />
              </div>
              <span className="font-extrabold text-white text-lg tracking-tight">
                Prépa<span className="text-[#38BDF8]">Campus</span>
              </span>
            </div>
            <div className="flex items-center gap-6 text-xs text-slate-400 flex-wrap justify-center">
              <Link href="/tarifs" className="hover:text-white transition">Tarifs & Formules</Link>
              <Link href="/questions" className="hover:text-white transition">50 Questions Types</Link>
              <Link href="/dashboard" className="hover:text-white transition">Espace Candidat</Link>
              <Link href="/auth/connexion" className="hover:text-white transition">Connexion</Link>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-[11px] text-slate-500 leading-relaxed">
            <div className="p-4 rounded-2xl bg-[#0D121F] border border-white/5 space-y-1.5">
              <span className="font-bold text-slate-300 block">Avertissement & Indépendance</span>
              <p>
                PrépaCampus est une structure privée et indépendante d&apos;aide et de simulation pédagogique pour préparer le vrai entretien. Nous ne travaillons pas avec Campus France et ne représentons aucune institution gouvernementale. « Campus France » est une marque déposée par ses ayants droit.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-[#0D121F] border border-white/5 space-y-1.5">
              <span className="font-bold text-slate-300 block">Confidentialité & Sécurité de la Caméra</span>
              <p>
                La caméra est allumée exclusivement pour vous placer dans les conditions réelles d&apos;immersion de l&apos;entretien officiel. Nous ne collectons aucune donnée vidéo. Vos images ne sont jamais enregistrées ni stockées dans nos bases de données et restent 100% locales sur votre appareil.
              </p>
            </div>
          </div>

          <div className="text-center text-[11px] text-slate-600 pt-2">
            © {new Date().getFullYear()} PrépaCampus • Plateforme indépendante d&apos;entraînement à la mobilité étudiante • Tous droits réservés.
          </div>
        </div>
      </footer>
        </>
      )}

      {/* MODAL DE RECHARGEMENT MOBILE MONEY */}
      <MobileMoneyModal
        isOpen={rechargeModalOpen}
        onClose={() => setRechargeModalOpen(false)}
        defaultPackId="pack_reussite"
        onPaymentSuccess={async () => {
          setRechargeModalOpen(false);
          const res = await fetch('/api/credits');
          if (res.ok) {
            const data = await res.json();
            if (typeof data.balance === 'number') {
              setCreditsBalance(data.balance);
            }
          }
        }}
      />

    </div>
  );
}
