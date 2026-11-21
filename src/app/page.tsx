'use client';

import React, { useState, useEffect, useRef } from 'react';
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
  ChevronDown, 
  ChevronLeft,
  ChevronRight,
  Sparkles, 
  Play, 
  Volume2, 
  CheckCircle2, 
  ShieldCheck, 
  CreditCard,
  FileText
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { Navbar } from '@/components/navigation/Navbar';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import { isAcademicProfileComplete } from '@/lib/validations/profile';

export default function HomePage() {
  const { language, t } = useLanguage();
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [isProfileComplete, setIsProfileComplete] = useState<boolean>(false);
  const [showPublicPresentation, setShowPublicPresentation] = useState<boolean>(false);

  // États interactifs pour la landing page publique
  const [activeFaq, setActiveFaq] = useState<number | null>(0);
  const [activeTestimonial, setActiveTestimonial] = useState<number | null>(0);
  const [isPlayingAudio, setIsPlayingAudio] = useState<boolean>(false);

  // États et Références de carrousel mobile (swipe / slider tactile)
  const stepsScrollRef = useRef<HTMLDivElement>(null);
  const testimonialsScrollRef = useRef<HTMLDivElement>(null);
  const pillarsScrollRef = useRef<HTMLDivElement>(null);

  const [activeStepIdx, setActiveStepIdx] = useState<number>(0);
  const [activeTestimonialIdx, setActiveTestimonialIdx] = useState<number>(0);
  const [activePillarIdx, setActivePillarIdx] = useState<number>(0);

  const scrollToStepCard = (index: number) => {
    if (stepsScrollRef.current) {
      const container = stepsScrollRef.current;
      const child = container.children[index] as HTMLElement;
      if (child) {
        child.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
      }
    }
    setActiveStepIdx(index);
  };

  const scrollToTestimonialCard = (index: number) => {
    if (testimonialsScrollRef.current) {
      const container = testimonialsScrollRef.current;
      const child = container.children[index] as HTMLElement;
      if (child) {
        child.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
      }
    }
    setActiveTestimonialIdx(index);
  };

  const scrollToPillarCard = (index: number) => {
    if (pillarsScrollRef.current) {
      const container = pillarsScrollRef.current;
      const child = container.children[index] as HTMLElement;
      if (child) {
        child.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
      }
    }
    setActivePillarIdx(index);
  };

  const handleStepsScroll = () => {
    if (stepsScrollRef.current) {
      const container = stepsScrollRef.current;
      const scrollLeft = container.scrollLeft;
      const cardWidth = (container.children[0] as HTMLElement)?.offsetWidth || 300;
      const idx = Math.round(scrollLeft / (cardWidth + 16));
      if (idx >= 0 && idx < stepsData.length && idx !== activeStepIdx) {
        setActiveStepIdx(idx);
      }
    }
  };

  const handleTestimonialsScroll = () => {
    if (testimonialsScrollRef.current) {
      const container = testimonialsScrollRef.current;
      const scrollLeft = container.scrollLeft;
      const cardWidth = (container.children[0] as HTMLElement)?.offsetWidth || 300;
      const idx = Math.round(scrollLeft / (cardWidth + 16));
      if (idx >= 0 && idx < testimonialsData.length && idx !== activeTestimonialIdx) {
        setActiveTestimonialIdx(idx);
      }
    }
  };

  const handlePillarsScroll = () => {
    if (pillarsScrollRef.current) {
      const container = pillarsScrollRef.current;
      const scrollLeft = container.scrollLeft;
      const cardWidth = (container.children[0] as HTMLElement)?.offsetWidth || 300;
      const idx = Math.round(scrollLeft / (cardWidth + 16));
      if (idx >= 0 && idx < 3 && idx !== activePillarIdx) {
        setActivePillarIdx(idx);
      }
    }
  };

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      setIsAuthenticated(!!user);
      if (user) {
        fetch('/api/profile')
          .then(res => res.json())
          .then(data => {
            if (data?.profile) {
              setIsProfileComplete(isAcademicProfileComplete(data.profile));
            }
          })
          .catch(() => {});
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setIsAuthenticated(!!session?.user);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

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
      a: "Vous pouvez vous entraîner selon votre formule jusqu'au jour de votre convocation. Chaque session génère des questions renouvelées et adaptées à votre filière spécifique (Informatique, Gestion, Santé, Droit, Ingénierie, etc.)."
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
      fullDesc: "Vous êtes plongé dans les conditions réelles d'un entretien Campus France. L'IA pose les questions clés, relance sur les points sensibles (cohérence du projet, financement, retour au pays) et teste votre réactivité vocale avec un chronomètre réaliste.",
      icon: "/step-icon-2.png",
      keyPoints: [
        "Banque actualisée de 50 questions types officielles",
        "Détection des hésitations et relances en temps réel",
        "Entretien vocal interactif en conditions d'examen"
      ]
    },
    {
      num: "03",
      badge: "Résultats & Avis Favorable",
      title: "Analysez vos feedbacks et décrochez votre avis favorable",
      shortDesc: "Appliquez les corrections personnalisées et présentez-vous serein et victorieux.",
      fullDesc: "En moins de 30 secondes, recevez votre bilan détaillé : note d'admissibilité sur 100, points forts, axes d'amélioration identifiés, et reformulations stratégiques rédigées pour convaincre votre examinateur dès les premières minutes.",
      icon: "/step-icon-3.png",
      keyPoints: [
        "Note sur 100 basée sur la grille officielle des conseillers",
        "Bilan pédagogique verbatim de chaque réponse",
        "Recommandations ciblées jusqu'à l'Avis Favorable"
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
    <div className="min-h-screen bg-black text-slate-100 flex flex-col font-sans selection:bg-[#0066FF]/30 selection:text-white w-full overflow-x-hidden">
      
      {/* 1. Header Navigation Unifié */}
      <Navbar />

      {/* CAS 1 : UTILISATEUR CONNECTÉ — LA PAGE NOIRE DU SCREENSHOT (ESPACE PRÉPARATION) */}
      {isAuthenticated && !showPublicPresentation ? (
        <main className="flex-1 w-full overflow-x-hidden animate-in fade-in duration-300">
          
          {/* Bandeau discret de bascule vers la présentation si souhaité */}
          <div className="bg-neutral-950 border-b border-neutral-900 px-4 py-2 text-center">
            <button
              onClick={() => setShowPublicPresentation(true)}
              className="text-xs text-neutral-400 hover:text-cyan-400 transition inline-flex items-center gap-1.5 font-medium cursor-pointer"
            >
              <span>Voir la présentation publique détaillée du site</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Hero Section Noir Pur (Exactement comme le screenshot de Fatima) */}
          <section className="relative overflow-hidden min-h-[calc(100dvh-5.5rem)] sm:min-h-[calc(100dvh-6rem)] flex flex-col justify-between items-center pt-8 pb-4 sm:pt-12 sm:pb-6 px-3 sm:px-6">
            <div className="max-w-4xl mx-auto px-2 sm:px-6 lg:px-8 text-center flex flex-col items-center justify-center relative z-10 w-full flex-1 my-auto">
              {/* Badge supérieur */}
              <div className="inline-flex items-center justify-center gap-1.5 px-3 py-1 rounded-full bg-neutral-900/90 border border-neutral-800 text-cyan-400 text-xs font-semibold mb-5 sm:mb-6 mt-1 shadow-sm">
                <ShieldCheck className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                <span className="leading-none">{t('home.hero_badge')}</span>
              </div>

              {/* Titre principal */}
              <h1 className="text-xl sm:text-3xl md:text-5xl font-extrabold tracking-tight text-white leading-snug sm:leading-tight text-center max-w-2xl mx-auto px-1">
                {t('home.hero_title')} <br />
                <span className="bg-gradient-to-r from-blue-400 via-cyan-300 to-teal-300 bg-clip-text text-transparent">
                  {t('home.hero_title_highlight')}
                </span>{' '}
                {t('home.hero_title_suffix')}
              </h1>

              {/* Sous-titre */}
              <p className="mt-3.5 sm:mt-5 text-xs sm:text-base text-neutral-300 max-w-xl mx-auto text-center leading-relaxed px-2">
                {t('home.hero_subtitle')}
              </p>

              {/* Bouton CTA */}
              <div className="mt-6 sm:mt-8 flex justify-center w-full px-4">
                <Link
                  href={isProfileComplete ? '/entretien/preparation' : '/profil'}
                  prefetch={true}
                  className="inline-flex items-center justify-center gap-2.5 px-8 py-3.5 sm:px-9 sm:py-4 rounded-full bg-gradient-to-r from-blue-600 via-cyan-500 to-teal-400 hover:from-blue-500 hover:to-cyan-400 text-white font-bold text-sm sm:text-base shadow-xl shadow-cyan-500/20 transition-all duration-200 transform hover:-translate-y-0.5 active:scale-95 text-center cursor-pointer"
                >
                  <span>{t('home.hero_cta')}</span>
                  <ArrowRight className="w-4 h-4 shrink-0" />
                </Link>
              </div>
            </div>

            {/* Avertissement éthique officiel */}
            <div className="w-full max-w-xl mx-auto px-4 mt-3 mb-1">
              <div className="px-4 py-2.5 sm:py-3 rounded-2xl bg-[#0e0e0e] border border-neutral-850 text-center">
                <p className="text-xs text-neutral-400 text-center leading-relaxed">
                  {t('home.disclaimer')}
                </p>
              </div>
            </div>
          </section>

          {/* 3 Piliers de la méthode (Carrousel swipeable sur mobile, grille sur desktop) */}
          <section className="pt-8 pb-16 sm:pt-12 sm:pb-20 border-t border-neutral-900 bg-black">
            <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="text-center mb-6 sm:mb-10">
                <h2 className="text-2xl sm:text-3xl font-bold text-white">{t('home.how_it_works')}</h2>
                {/* Indication visuelle mobile de swipe */}
                <div className="flex md:hidden items-center justify-center gap-1.5 text-[11px] text-cyan-400/90 mt-2 font-medium">
                  <span>Glissez de droite à gauche pour défiler</span>
                  <ArrowRight className="w-3 h-3 animate-pulse" />
                </div>
              </div>

              <div 
                ref={pillarsScrollRef}
                onScroll={handlePillarsScroll}
                className="flex md:grid md:grid-cols-3 gap-4 sm:gap-6 overflow-x-auto md:overflow-x-visible snap-x snap-mandatory pb-4 pt-1 px-4 sm:px-0 -mx-4 sm:mx-0 scroll-smooth [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
              >
                <div className="w-[82vw] max-w-[320px] shrink-0 snap-center md:w-auto md:max-w-none bg-[#0e0e0e] border border-neutral-800 rounded-3xl p-6 relative group hover:border-neutral-700 transition shadow-lg flex flex-col justify-between">
                  <div>
                    <div className="w-12 h-12 rounded-2xl bg-cyan-500/10 text-cyan-400 flex items-center justify-center mb-4">
                      <GraduationCap className="w-6 h-6" />
                    </div>
                    <h3 className="text-base sm:text-lg font-semibold text-white mb-2">{t('home.pillar1_title')}</h3>
                    <p className="text-xs sm:text-sm text-neutral-400 leading-relaxed">
                      {t('home.pillar1_desc')}
                    </p>
                  </div>
                </div>

                <div className="w-[82vw] max-w-[320px] shrink-0 snap-center md:w-auto md:max-w-none bg-[#0e0e0e] border border-neutral-800 rounded-3xl p-6 relative group hover:border-neutral-700 transition shadow-lg flex flex-col justify-between">
                  <div>
                    <div className="w-12 h-12 rounded-xl bg-cyan-500/10 text-cyan-400 flex items-center justify-center mb-4">
                      <Mic className="w-6 h-6" />
                    </div>
                    <h3 className="text-base sm:text-lg font-semibold text-white mb-2">{t('home.pillar2_title')}</h3>
                    <p className="text-xs sm:text-sm text-neutral-400 leading-relaxed">
                      {t('home.pillar2_desc')}
                    </p>
                  </div>
                </div>

                <div className="w-[82vw] max-w-[320px] shrink-0 snap-center md:w-auto md:max-w-none bg-[#0e0e0e] border border-neutral-800 rounded-3xl p-6 relative group hover:border-neutral-700 transition shadow-lg flex flex-col justify-between">
                  <div>
                    <div className="w-12 h-12 rounded-xl bg-cyan-500/10 text-cyan-400 flex items-center justify-center mb-4">
                      <FileText className="w-6 h-6" />
                    </div>
                    <h3 className="text-base sm:text-lg font-semibold text-white mb-2">{t('home.pillar3_title')}</h3>
                    <p className="text-xs sm:text-sm text-neutral-400 leading-relaxed">
                      {t('home.pillar3_desc')}
                    </p>
                  </div>
                </div>
              </div>

              {/* Pagination Dots sur Mobile */}
              <div className="flex md:hidden items-center justify-center gap-2 mt-2">
                {[0, 1, 2].map((idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => scrollToPillarCard(idx)}
                    className={`transition-all duration-300 rounded-full cursor-pointer ${
                      activePillarIdx === idx
                        ? 'w-7 h-2 bg-gradient-to-r from-blue-500 to-cyan-400 shadow-md shadow-cyan-500/50'
                        : 'w-2 h-2 bg-neutral-700 hover:bg-neutral-600'
                    }`}
                    aria-label={`Aller au pilier ${idx + 1}`}
                  />
                ))}
              </div>
            </div>
          </section>

          {/* Section Tarifs & Moyens de paiement */}
          <section className="py-12 sm:py-16 border-t border-neutral-900 bg-black">
            <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="text-center mb-10 max-w-2xl mx-auto">
                <div className="inline-flex items-center justify-center gap-1.5 px-3 py-1 rounded-full bg-neutral-900/90 border border-neutral-800 text-cyan-400 text-xs font-semibold mb-3 shadow-sm whitespace-nowrap">
                  <CreditCard className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                  <span className="leading-none">{t('home.pricing_badge')}</span>
                </div>
                <h2 className="text-2xl sm:text-3xl font-bold text-white">{t('home.pricing_title')}</h2>
                <p className="text-xs sm:text-sm text-neutral-400 mt-2 leading-relaxed">
                  {t('home.pricing_desc')}
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto">
                {/* Pack Découverte */}
                <div className="bg-[#0e0e0e] border border-neutral-800 rounded-3xl p-6 flex flex-col justify-between">
                  <div>
                    <div className="text-xs font-bold text-neutral-400 uppercase tracking-wider mb-1">
                      {language === 'fr' ? 'Découverte' : 'Starter'}
                    </div>
                    <div className="text-2xl font-extrabold text-white mb-1">0 FCFA</div>
                    <p className="text-xs text-neutral-400 mb-4">{t('home.free_tag')}</p>
                    <ul className="text-xs text-neutral-300 space-y-2 mb-6">
                      <li className="flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                        <span>{t('home.free_feature1')}</span>
                      </li>
                      <li className="flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                        <span>{t('home.free_feature2')}</span>
                      </li>
                    </ul>
                  </div>
                  <Link
                    href="/tarifs"
                    className="w-full text-center py-2.5 rounded-xl bg-neutral-900 hover:bg-neutral-850 border border-neutral-750 text-xs font-semibold text-white transition cursor-pointer"
                  >
                    {t('home.free_cta')}
                  </Link>
                </div>

                {/* Pack Réussite */}
                <div className="bg-[#111111] border-2 border-cyan-400 rounded-3xl p-6 flex flex-col justify-between shadow-xl shadow-cyan-500/10 relative">
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full bg-cyan-400 text-black text-[10px] font-extrabold uppercase tracking-wider">
                    {language === 'fr' ? 'Recommandé' : 'Recommended'}
                  </span>
                  <div>
                    <div className="text-xs font-bold text-cyan-400 uppercase tracking-wider mb-1">
                      {language === 'fr' ? 'Pack Réussite' : 'Success Pack'}
                    </div>
                    <div className="text-2xl font-extrabold text-white mb-1">5 000 FCFA</div>
                    <p className="text-xs text-neutral-400 mb-4">{t('home.popular_tag')}</p>
                    <ul className="text-xs text-neutral-300 space-y-2 mb-6">
                      <li className="flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-cyan-400 shrink-0" />
                        <span>{t('home.popular_feature1')}</span>
                      </li>
                      <li className="flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-cyan-400 shrink-0" />
                        <span>{t('home.popular_feature2')}</span>
                      </li>
                      <li className="flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-cyan-400 shrink-0" />
                        <span>{t('home.popular_feature3')}</span>
                      </li>
                    </ul>
                  </div>
                  <Link
                    href="/tarifs"
                    className="w-full text-center py-2.5 rounded-xl bg-gradient-to-r from-blue-600 via-cyan-500 to-teal-400 hover:from-blue-500 hover:to-cyan-400 text-white font-bold text-xs shadow-md shadow-cyan-500/25 transition cursor-pointer"
                  >
                    {t('home.popular_cta')}
                  </Link>
                </div>

                {/* Pack Intensif */}
                <div className="bg-[#0e0e0e] border border-neutral-800 rounded-3xl p-6 flex flex-col justify-between">
                  <div>
                    <div className="text-xs font-bold text-neutral-400 uppercase tracking-wider mb-1">
                      {language === 'fr' ? 'Pack Intensif' : 'Intensive Pack'}
                    </div>
                    <div className="text-2xl font-extrabold text-white mb-1">9 000 FCFA</div>
                    <p className="text-xs text-neutral-400 mb-4">{t('home.intensive_tag')}</p>
                    <ul className="text-xs text-neutral-300 space-y-2 mb-6">
                      <li className="flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                        <span>{t('home.intensive_feature1')}</span>
                      </li>
                      <li className="flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                        <span>{t('home.intensive_feature2')}</span>
                      </li>
                      <li className="flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                        <span>{t('home.intensive_feature3')}</span>
                      </li>
                    </ul>
                  </div>
                  <Link
                    href="/tarifs"
                    className="w-full text-center py-2.5 rounded-xl bg-neutral-900 hover:bg-neutral-850 border border-neutral-750 text-xs font-semibold text-white transition cursor-pointer"
                  >
                    {t('home.intensive_cta')}
                  </Link>
                </div>
              </div>
            </div>
          </section>

          {/* Protection des données & Respect de la vie privée */}
          <section className="py-12 border-t border-neutral-900 bg-black">
            <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="p-6 rounded-2xl bg-[#0e0e0e] border border-neutral-800 flex flex-col sm:flex-row items-center gap-5">
                <div className="w-12 h-12 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center shrink-0">
                  <ShieldCheck className="w-6 h-6" />
                </div>
                <div className="text-sm text-neutral-300">
                  <h4 className="font-semibold text-white mb-1">{t('home.privacy_title')}</h4>
                  <p className="text-xs text-neutral-400 leading-relaxed">
                    {t('home.privacy_desc')}
                  </p>
                </div>
              </div>
            </div>
          </section>

          <footer className="border-t border-neutral-900 py-6 text-center text-xs text-neutral-500 bg-black">
            <p>{t('home.footer')}</p>
          </footer>
        </main>
      ) : (
        /* CAS 2 : VISITEUR (NON CONNECTÉ) OU CLIC SUR LE LIEN — LANDING PAGE DARK NOIR AVEC PHOTO DE LA FILLE */
        <main className="flex-1 w-full overflow-x-hidden animate-in fade-in duration-300 bg-black">
          
          {/* Si utilisateur connecté en mode présentation, bandeau pour revenir à son hub */}
          {isAuthenticated && (
            <div className="bg-neutral-950 border-b border-neutral-900 px-4 py-2 text-center sticky top-14 z-30">
              <button
                onClick={() => setShowPublicPresentation(false)}
                className="text-xs text-cyan-400 hover:text-white transition inline-flex items-center gap-1.5 font-bold cursor-pointer"
              >
                <span>← Retourner à mon espace de simulation</span>
              </button>
            </div>
          )}

          {/* HERO SECTION MOBILE (< md) : Photo authentique de la fille sur fond NOIR PUR */}
          <section className="md:hidden relative w-full overflow-hidden h-[470px] min-[400px]:h-[500px] flex items-center px-4 min-[390px]:px-5 py-6 bg-black">
            {/* L'arrière-plan photo de l'étudiante avec dégradé noir profond */}
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
              {/* Dégradé noir pur sur la gauche pour détacher le texte */}
              <div className="absolute inset-y-0 left-0 w-[66%] min-[400px]:w-[62%] bg-gradient-to-r from-black via-black/95 to-transparent z-10" />
              {/* Dégradé noir en bas pour fondre naturellement */}
              <div className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-black to-transparent z-10" />
            </div>

            {/* Contenu textuel sur la gauche */}
            <div className="relative z-20 w-[54%] min-[400px]:w-[50%] flex flex-col items-start">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[9.5px] font-semibold bg-neutral-900/90 border border-neutral-800 text-cyan-400 shadow-xs mb-2.5">
                <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
                <span>Votre réussite, notre priorité</span>
              </div>

              <h1 className="text-[19px] min-[360px]:text-[21px] min-[400px]:text-[23px] font-extrabold text-white tracking-tight leading-[1.14]">
                Réussis ton entretien <br />
                <span className="text-cyan-400">Campus France</span> <br />
                avec confiance.
              </h1>

              <p className="text-[10px] min-[360px]:text-[10.5px] min-[400px]:text-[11px] text-neutral-300 leading-relaxed mt-2 font-normal">
                Entraînement pas à pas, feedbacks clairs et conseils personnalisés pour défendre votre projet d&apos;études en France.
              </p>

              <div className="mt-3.5">
                <Link
                  href="/auth/inscription"
                  className="inline-flex items-center gap-1.5 bg-gradient-to-r from-blue-600 via-cyan-500 to-teal-400 hover:from-blue-500 hover:to-cyan-400 text-white font-bold text-[11px] min-[360px]:text-xs px-3.5 py-2.5 rounded-full shadow-lg shadow-cyan-500/25 transition-all group whitespace-nowrap cursor-pointer"
                >
                  <span>Commencer ma préparation</span>
                  <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                </Link>
              </div>

              <div className="flex items-center gap-1.5 text-[9px] min-[360px]:text-[9.5px] text-neutral-300 font-medium mt-2.5">
                <div className="w-3.5 h-3.5 rounded-full bg-cyan-500/20 border border-cyan-500/30 flex items-center justify-center text-cyan-400 shrink-0">
                  <Check className="w-2 h-2 stroke-[3]" />
                </div>
                <span>Simulation intelligente & feedbacks immédiats</span>
              </div>
            </div>
          </section>

          {/* HERO SECTION DESKTOP (>= md) : Plein écran immersif NOIR PUR avec photo de la fille */}
          <section className="hidden md:flex relative overflow-hidden w-full bg-black items-center min-h-[620px] h-[calc(100vh-80px)] max-h-[840px] py-10">
            {/* Arrière-plan photo couvrant 100% avec fondu NOIR PUR */}
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
              {/* Dégradé noir pur pour détacher la typographie avec un contraste parfait */}
              <div className="absolute inset-y-0 left-0 w-full sm:w-[60%] md:w-[52%] lg:w-[46%] bg-gradient-to-r from-black via-black/95 sm:via-black/85 to-transparent z-10" />
              {/* Dégradé noir en bas */}
              <div className="absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-black via-black/80 to-transparent z-10" />
            </div>

            {/* Contenu textuel */}
            <div className="relative z-20 max-w-7xl mx-auto px-6 lg:px-8 w-full">
              <div className="w-[48%] lg:w-[44%] max-w-xl flex flex-col items-start">
                
                <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-semibold bg-neutral-900/90 border border-neutral-800 text-cyan-400 shadow-xs mb-5">
                  <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
                  <span>Simulateur Officiel IA • Session 2025 - 2026</span>
                </div>

                <h1 className="text-4xl sm:text-5xl lg:text-[54px] font-black text-white tracking-tight leading-[1.12]">
                  Réussis ton entretien <br />
                  <span className="bg-gradient-to-r from-blue-400 via-cyan-300 to-teal-300 bg-clip-text text-transparent">
                    Campus France
                  </span> <br />
                  avec confiance.
                </h1>

                <p className="text-base lg:text-lg text-neutral-300 leading-relaxed mt-5 font-normal max-w-lg">
                  Entraînement pas à pas en conditions réelles, détection immédiate des pièges éliminatoires et feedbacks personnalisés pour décrocher votre avis favorable.
                </p>

                <div className="mt-8 flex items-center gap-4 flex-wrap">
                  <Link
                    href="/auth/inscription"
                    className="inline-flex items-center gap-2.5 bg-gradient-to-r from-blue-600 via-cyan-500 to-teal-400 hover:from-blue-500 hover:to-cyan-400 text-white font-bold text-base px-8 py-4 rounded-full shadow-xl shadow-cyan-500/25 hover:-translate-y-0.5 transition-all group whitespace-nowrap cursor-pointer"
                  >
                    <span>Commencer ma préparation</span>
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </Link>
                  <a
                    href="#simulateur"
                    className="inline-flex items-center gap-2 bg-neutral-900/90 hover:bg-neutral-800 text-white font-semibold text-sm px-5 py-3.5 rounded-full border border-neutral-800 shadow-xs hover:shadow-md transition-all cursor-pointer"
                  >
                    <Play className="w-3.5 h-3.5 text-cyan-400 fill-cyan-400" />
                    <span>Voir la démonstration</span>
                  </a>
                </div>

                {/* Preuves d'autorité */}
                <div className="mt-8 pt-6 border-t border-neutral-800 flex items-center gap-6">
                  <div className="flex -space-x-2">
                    <div className="w-8 h-8 rounded-full border-2 border-black overflow-hidden relative shadow-xs">
                      <Image src="/avatar-ref-mamadou.png" alt="Mamadou" fill className="object-cover" />
                    </div>
                    <div className="w-8 h-8 rounded-full border-2 border-black overflow-hidden relative shadow-xs">
                      <Image src="/avatar-ref-aissatou-sow.png" alt="Aïssatou" fill className="object-cover" />
                    </div>
                    <div className="w-8 h-8 rounded-full border-2 border-black overflow-hidden relative shadow-xs">
                      <Image src="/avatar-ref-ibrahima.png" alt="Ibrahima" fill className="object-cover" />
                    </div>
                  </div>
                  <div className="text-xs text-neutral-300 font-medium">
                    <div className="flex items-center gap-1 text-amber-400 font-bold">
                      {[...Array(5)].map((_, i) => (
                        <Star key={i} className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                      ))}
                      <span className="text-white ml-1">4.9 / 5</span>
                    </div>
                    <p className="text-neutral-400 mt-0.5">+1 500 étudiants admis en France avec succès</p>
                  </div>
                </div>

              </div>
            </div>

            {/* Badge flottant d'excellence sur la photo */}
            <div className="hidden xl:flex items-center gap-3.5 bg-neutral-950/95 border border-neutral-800 p-4 rounded-2xl shadow-2xl absolute right-12 bottom-16 z-20">
              <div className="w-11 h-11 rounded-xl bg-gradient-to-tr from-blue-600 to-cyan-400 flex items-center justify-center text-white shrink-0 shadow-md shadow-cyan-500/25">
                <Check className="w-6 h-6 stroke-[2.5]" />
              </div>
              <div>
                <div className="text-xs font-extrabold text-white">Avis Favorable Décroché</div>
                <div className="text-[11px] text-cyan-400 font-semibold">Admise à Sorbonne Université (Paris)</div>
              </div>
            </div>
          </section>

          {/* 3 AVANTAGES CLÉS EN CARTES (Fond noir pur) */}
          <section className="relative z-30 -mt-6 sm:-mt-8 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 mb-8">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6 bg-[#0a0a0a] p-4 sm:p-6 rounded-2xl sm:rounded-3xl border border-neutral-800 shadow-2xl">
              
              <div className="flex items-center sm:items-start gap-3.5 p-3 rounded-xl bg-[#111111] border border-neutral-800/80 hover:border-neutral-700 transition-colors">
                <div className="w-11 h-11 rounded-2xl bg-cyan-500/10 border border-cyan-500/25 flex items-center justify-center text-cyan-400 shrink-0 shadow-xs">
                  <Mic className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">S&apos;entraîner comme en conditions réelles</h3>
                  <p className="text-xs text-neutral-400 mt-1 leading-relaxed">Simulez l&apos;entretien Campus France avec notre IA vocale intelligente.</p>
                </div>
              </div>

              <div className="flex items-center sm:items-start gap-3.5 p-3 rounded-xl bg-[#111111] border border-neutral-800/80 hover:border-neutral-700 transition-colors">
                <div className="w-11 h-11 rounded-2xl bg-cyan-500/10 border border-cyan-500/25 flex items-center justify-center text-cyan-400 shrink-0 shadow-xs">
                  <TrendingUp className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Recevoir des conseils pour s&apos;améliorer</h3>
                  <p className="text-xs text-neutral-400 mt-1 leading-relaxed">Obtenez un feedback détaillé et stratégique sur vos réponses.</p>
                </div>
              </div>

              <div className="flex items-center sm:items-start gap-3.5 p-3 rounded-xl bg-[#111111] border border-neutral-800/80 hover:border-neutral-700 transition-colors">
                <div className="w-11 h-11 rounded-2xl bg-cyan-500/10 border border-cyan-500/25 flex items-center justify-center text-cyan-400 shrink-0 shadow-xs">
                  <Trophy className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Gagner en confiance</h3>
                  <p className="text-xs text-neutral-400 mt-1 leading-relaxed">Présentez votre projet d&apos;études avec clarté, prestance et assurance.</p>
                </div>
              </div>

            </div>
          </section>

          {/* SHOWCASE INTERACTIF : Découvrez la simulation IA en action */}
          <section id="simulateur" className="py-14 sm:py-20 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
            <div className="text-center max-w-3xl mx-auto mb-10 sm:mb-14">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-neutral-900 border border-neutral-800 text-cyan-400 mb-3">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Technologie d&apos;évaluation vocale exclusive</span>
              </div>
              <h2 className="text-2xl sm:text-4xl font-black text-white tracking-tight">
                Découvrez la puissance de l&apos;entraînement par IA
              </h2>
              <p className="text-sm sm:text-base text-neutral-400 mt-3 leading-relaxed">
                Exactement comme devant un conseiller Campus France : notre IA vous pose les vraies questions et vous montre immédiatement où vous excellez et où vous risquez le refus.
              </p>
            </div>

            {/* Console de Simulation Interactive Noir Pur */}
            <div className="bg-[#0a0a0a] rounded-3xl shadow-2xl border border-neutral-800 overflow-hidden">
              <div className="bg-black text-white px-6 py-4 flex items-center justify-between border-b border-neutral-800">
                <div className="flex items-center gap-3">
                  <div className="flex gap-1.5">
                    <span className="w-3 h-3 rounded-full bg-rose-500/80 inline-block" />
                    <span className="w-3 h-3 rounded-full bg-amber-500/80 inline-block" />
                    <span className="w-3 h-3 rounded-full bg-emerald-500/80 inline-block" />
                  </div>
                  <span className="text-xs font-mono text-neutral-400 pl-2">Session n° 2841 • Entretien Simulation</span>
                </div>
                <div className="flex items-center gap-2 text-xs font-medium text-emerald-400 bg-emerald-950/60 px-3 py-1 rounded-full border border-emerald-500/30">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                  <span>Agent IA Campus France actif</span>
                </div>
              </div>

              <div className="p-6 sm:p-10 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
                {/* Colonne Gauche : Question et réponse */}
                <div className="lg:col-span-7 space-y-6">
                  <div className="flex items-start gap-3.5">
                    <div className="w-10 h-10 rounded-xl bg-blue-900/50 border border-blue-500/30 flex items-center justify-center text-cyan-400 shrink-0 font-bold text-sm shadow-xs">
                      CF
                    </div>
                    <div className="bg-[#111111] border border-neutral-800 rounded-2xl p-4 sm:p-5 flex-1">
                      <span className="text-[11px] font-bold text-cyan-400 tracking-wider uppercase block mb-1">
                        Question du conseiller
                      </span>
                      <p className="text-sm sm:text-base font-semibold text-white leading-snug">
                        « Pourquoi avoir choisi spécifiquement cette formation en France plutôt que de continuer dans votre pays d&apos;origine ? »
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3.5 pl-6 sm:pl-10">
                    <div className="w-9 h-9 rounded-xl bg-neutral-900 border border-neutral-800 text-white flex items-center justify-center shrink-0 text-xs font-bold shadow-xs">
                      VOUS
                    </div>
                    <div className="bg-[#111111] border border-neutral-800 rounded-2xl p-4 sm:p-5 flex-1 shadow-xs">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[11px] font-semibold text-neutral-400">Votre réponse enregistrée</span>
                        <div className="flex items-center gap-1.5 text-xs text-cyan-400 font-medium bg-cyan-500/10 border border-cyan-500/20 px-2.5 py-0.5 rounded-full">
                          <Volume2 className="w-3.5 h-3.5" />
                          <span>Audio 0:42s</span>
                        </div>
                      </div>
                      <p className="text-xs sm:text-sm text-neutral-200 leading-relaxed italic">
                        « Mon objectif est de devenir ingénieur cloud certifié. Cette formation à Sorbonne Université propose des partenariats industriels précis et des laboratoires de pointe inexistants dans mon pays actuel... »
                      </p>
                    </div>
                  </div>
                </div>

                {/* Colonne Droite : Bilan instantané */}
                <div className="lg:col-span-5 bg-[#111111] text-white p-6 sm:p-7 rounded-2xl shadow-lg border border-neutral-800">
                  <div className="flex items-center justify-between pb-4 border-b border-neutral-800">
                    <div className="flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-cyan-400" />
                      <span className="text-xs font-bold text-cyan-400 uppercase tracking-wider">Score Global IA</span>
                    </div>
                    <div className="text-2xl font-black text-emerald-400">
                      18.5 <span className="text-xs text-neutral-400 font-normal">/ 20</span>
                    </div>
                  </div>

                  <div className="space-y-3.5 my-5 text-xs">
                    <div>
                      <div className="flex justify-between font-semibold mb-1">
                        <span className="text-neutral-300">Clarté du projet d&apos;études</span>
                        <span className="text-emerald-400">Excellente (95%)</span>
                      </div>
                      <div className="w-full bg-neutral-800 h-1.5 rounded-full overflow-hidden">
                        <div className="bg-emerald-400 h-full w-[95%] rounded-full" />
                      </div>
                    </div>

                    <div>
                      <div className="flex justify-between font-semibold mb-1">
                        <span className="text-neutral-300">Justification du choix de la France</span>
                        <span className="text-emerald-400">Très solide (90%)</span>
                      </div>
                      <div className="w-full bg-neutral-800 h-1.5 rounded-full overflow-hidden">
                        <div className="bg-emerald-400 h-full w-[90%] rounded-full" />
                      </div>
                    </div>

                    <div>
                      <div className="flex justify-between font-semibold mb-1">
                        <span className="text-neutral-300">Cohérence du projet de retour</span>
                        <span className="text-amber-400">À préciser (75%)</span>
                      </div>
                      <div className="w-full bg-neutral-800 h-1.5 rounded-full overflow-hidden">
                        <div className="bg-amber-400 h-full w-[75%] rounded-full" />
                      </div>
                    </div>
                  </div>

                  <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-3.5 text-xs text-neutral-300">
                    <p className="font-semibold text-cyan-400 mb-1">💡 Conseil stratégique de l&apos;IA :</p>
                    <p className="text-[11px] leading-relaxed text-neutral-300">
                      Votre motivation est exemplaire. Pour obtenir un 20/20, nommez une entreprise spécifique où vous visez votre stage de fin d&apos;études.
                    </p>
                  </div>

                  <div className="mt-5">
                    <Link
                      href="/auth/inscription"
                      className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-blue-600 via-cyan-500 to-teal-400 hover:from-blue-500 hover:to-cyan-400 text-white text-xs font-bold py-3 rounded-xl transition shadow-lg shadow-cyan-500/20 cursor-pointer"
                    >
                      <span>Tester mes propres réponses maintenant</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* LES 3 ÉTAPES VERS L'AVIS FAVORABLE (Carrousel tactile swipeable sur mobile, grille sur desktop) */}
          <section className="py-12 sm:py-20 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 w-full border-t border-neutral-900">
            <div className="text-center mb-6 sm:mb-14">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-neutral-900 border border-neutral-800 text-cyan-400 text-xs font-semibold mb-3 shadow-xs">
                <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                <span>Méthode Étape par Étape</span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                Comment ça marche ?
              </h2>
              <p className="text-xs sm:text-sm text-neutral-400 mt-2 max-w-xl mx-auto">
                Une méthode rodée en 3 étapes concrètes pour maximiser vos chances d&apos;admission.
              </p>
              {/* Indication visuelle mobile de swipe */}
              <div className="flex md:hidden items-center justify-center gap-1.5 text-[11px] text-cyan-400/90 mt-2.5 font-medium">
                <span>Glissez de droite à gauche</span>
                <ArrowRight className="w-3 h-3 animate-pulse" />
              </div>
            </div>

            {/* Conteneur Carrousel Mobile / Grille Desktop */}
            <div 
              ref={stepsScrollRef}
              onScroll={handleStepsScroll}
              className="flex md:grid md:grid-cols-3 gap-4 sm:gap-6 overflow-x-auto md:overflow-x-visible snap-x snap-mandatory pb-4 pt-1 px-4 sm:px-0 -mx-4 sm:mx-0 scroll-smooth [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
            >
              {stepsData.map((step, idx) => (
                <div 
                  key={idx} 
                  className="w-[84vw] max-w-[340px] shrink-0 snap-center md:w-auto md:max-w-none bg-[#0e0e0e] border border-neutral-800 hover:border-neutral-700 rounded-3xl p-6 sm:p-7 flex flex-col justify-between transition-all duration-200 shadow-xl"
                >
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <span className="text-2xl font-black text-cyan-400 font-mono">{step.num}</span>
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-neutral-900 text-neutral-300 border border-neutral-800">
                        {step.badge}
                      </span>
                    </div>
                    <h3 className="text-base font-bold text-white mb-2 leading-snug">{step.title}</h3>
                    <p className="text-xs text-neutral-400 leading-relaxed mb-4">{step.shortDesc}</p>
                    <ul className="text-[11px] text-neutral-300 space-y-2 mb-4">
                      {step.keyPoints.map((pt, pIdx) => (
                        <li key={pIdx} className="flex items-start gap-2">
                          <CheckCircle2 className="w-3.5 h-3.5 text-cyan-400 shrink-0 mt-0.5" />
                          <span className="leading-tight">{pt}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              ))}
            </div>

            {/* Pagination Dots & Navigation sur Mobile */}
            <div className="flex md:hidden flex-col items-center gap-2 mt-2">
              <div className="flex items-center justify-center gap-2">
                {stepsData.map((_, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => scrollToStepCard(idx)}
                    className={`transition-all duration-300 rounded-full cursor-pointer ${
                      activeStepIdx === idx
                        ? 'w-7 h-2 bg-gradient-to-r from-blue-500 to-cyan-400 shadow-md shadow-cyan-500/50'
                        : 'w-2 h-2 bg-neutral-700 hover:bg-neutral-600'
                    }`}
                    aria-label={`Aller à l'étape ${idx + 1}`}
                  />
                ))}
              </div>

              <div className="flex items-center justify-between w-full max-w-[280px] px-2 text-xs text-neutral-400">
                <button
                  type="button"
                  onClick={() => scrollToStepCard(Math.max(0, activeStepIdx - 1))}
                  disabled={activeStepIdx === 0}
                  className="inline-flex items-center gap-1 text-neutral-400 hover:text-white disabled:opacity-20 transition py-1 cursor-pointer"
                >
                  <ChevronLeft className="w-4 h-4" />
                  <span>Précédent</span>
                </button>
                <span className="text-[11px] font-mono text-neutral-500">
                  {activeStepIdx + 1} / {stepsData.length}
                </span>
                <button
                  type="button"
                  onClick={() => scrollToStepCard(Math.min(stepsData.length - 1, activeStepIdx + 1))}
                  disabled={activeStepIdx === stepsData.length - 1}
                  className="inline-flex items-center gap-1 text-neutral-400 hover:text-white disabled:opacity-20 transition py-1 cursor-pointer"
                >
                  <span>Suivant</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </section>

          {/* TÉMOIGNAGES ÉTUDIANTS (Carrousel tactile swipeable sur mobile, grille sur desktop) */}
          <section className="py-12 sm:py-20 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 w-full border-t border-neutral-900">
            <div className="text-center mb-6 sm:mb-14">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-neutral-900 border border-neutral-800 text-cyan-400 text-xs font-semibold mb-3 shadow-xs">
                <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                <span>Retours d&apos;Expérience Réels</span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                Ils ont décroché leur avis favorable
              </h2>
              <p className="text-xs sm:text-sm text-neutral-400 mt-2 max-w-xl mx-auto">
                Découvrez les retours d&apos;expérience des étudiants qui ont préparé leur entretien avec PrépaCampus.
              </p>
              {/* Indication visuelle mobile de swipe */}
              <div className="flex md:hidden items-center justify-center gap-1.5 text-[11px] text-cyan-400/90 mt-2.5 font-medium">
                <span>Glissez pour lire les avis</span>
                <ArrowRight className="w-3 h-3 animate-pulse" />
              </div>
            </div>

            {/* Conteneur Carrousel Mobile / Grille Desktop */}
            <div 
              ref={testimonialsScrollRef}
              onScroll={handleTestimonialsScroll}
              className="flex md:grid md:grid-cols-3 gap-4 sm:gap-6 overflow-x-auto md:overflow-x-visible snap-x snap-mandatory pb-4 pt-1 px-4 sm:px-0 -mx-4 sm:mx-0 scroll-smooth [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
            >
              {testimonialsData.map((item, idx) => (
                <div 
                  key={idx} 
                  className="w-[84vw] max-w-[340px] shrink-0 snap-center md:w-auto md:max-w-none bg-[#0e0e0e] border border-neutral-800 hover:border-neutral-700 rounded-3xl p-6 flex flex-col justify-between transition-all duration-200 shadow-xl"
                >
                  <div>
                    <div className="flex items-center gap-3.5 mb-4">
                      <div className="w-12 h-12 rounded-full overflow-hidden relative border border-cyan-500/30 shrink-0 shadow-md">
                        <Image src={item.avatar} alt={item.name} fill className="object-cover" />
                      </div>
                      <div className="min-w-0">
                        <h4 className="text-sm font-bold text-white truncate">{item.name}</h4>
                        <p className="text-[11px] text-cyan-400 font-medium truncate">{item.admission}</p>
                        <p className="text-[10px] text-neutral-500">{item.city}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 text-amber-400 mb-3">
                      {[...Array(item.stars)].map((_, i) => (
                        <Star key={i} className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                      ))}
                      <span className="text-[11px] text-neutral-400 ml-1.5 font-semibold">{item.rating}</span>
                    </div>
                    <p className="text-xs text-neutral-300 leading-relaxed italic mb-4">
                      {item.shortQuote}
                    </p>
                  </div>
                  <div className="pt-3 border-t border-neutral-850 text-[11px] text-neutral-400">
                    <span className="font-bold text-neutral-300">Point décisif : </span>
                    {item.keyFactor}
                  </div>
                </div>
              ))}
            </div>

            {/* Pagination Dots & Navigation sur Mobile */}
            <div className="flex md:hidden flex-col items-center gap-2 mt-2">
              <div className="flex items-center justify-center gap-2">
                {testimonialsData.map((_, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => scrollToTestimonialCard(idx)}
                    className={`transition-all duration-300 rounded-full cursor-pointer ${
                      activeTestimonialIdx === idx
                        ? 'w-7 h-2 bg-gradient-to-r from-blue-500 to-cyan-400 shadow-md shadow-cyan-500/50'
                        : 'w-2 h-2 bg-neutral-700 hover:bg-neutral-600'
                    }`}
                    aria-label={`Aller au témoignage ${idx + 1}`}
                  />
                ))}
              </div>

              <div className="flex items-center justify-between w-full max-w-[280px] px-2 text-xs text-neutral-400">
                <button
                  type="button"
                  onClick={() => scrollToTestimonialCard(Math.max(0, activeTestimonialIdx - 1))}
                  disabled={activeTestimonialIdx === 0}
                  className="inline-flex items-center gap-1 text-neutral-400 hover:text-white disabled:opacity-20 transition py-1 cursor-pointer"
                >
                  <ChevronLeft className="w-4 h-4" />
                  <span>Précédent</span>
                </button>
                <span className="text-[11px] font-mono text-neutral-500">
                  {activeTestimonialIdx + 1} / {testimonialsData.length}
                </span>
                <button
                  type="button"
                  onClick={() => scrollToTestimonialCard(Math.min(testimonialsData.length - 1, activeTestimonialIdx + 1))}
                  disabled={activeTestimonialIdx === testimonialsData.length - 1}
                  className="inline-flex items-center gap-1 text-neutral-400 hover:text-white disabled:opacity-20 transition py-1 cursor-pointer"
                >
                  <span>Suivant</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </section>

          {/* TARIFS & PACKS */}
          <section className="py-12 sm:py-20 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 w-full border-t border-neutral-900">
            <div className="text-center mb-10 max-w-2xl mx-auto">
              <div className="inline-flex items-center justify-center gap-1.5 px-3 py-1 rounded-full bg-neutral-900 border border-neutral-800 text-cyan-400 text-xs font-semibold mb-3">
                <CreditCard className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                <span>Tarifs & Moyens de paiement</span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-bold text-white">Tarifs clairs, sans abonnement</h2>
              <p className="text-xs sm:text-sm text-neutral-400 mt-2">
                Paiement sécurisé par Cartes Bancaires (Visa / Mastercard) et Mobile Money (Wave, Orange Money, MTN, Moov).
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto">
              {/* Pack Découverte */}
              <div className="bg-[#0e0e0e] border border-neutral-800 rounded-3xl p-6 flex flex-col justify-between">
                <div>
                  <div className="text-xs font-bold text-neutral-400 uppercase tracking-wider mb-1">
                    {language === 'fr' ? 'Découverte' : 'Starter'}
                  </div>
                  <div className="text-2xl font-extrabold text-white mb-1">0 FCFA</div>
                  <p className="text-xs text-neutral-400 mb-4">{t('home.free_tag')}</p>
                  <ul className="text-xs text-neutral-300 space-y-2 mb-6">
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                      <span>{t('home.free_feature1')}</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                      <span>{t('home.free_feature2')}</span>
                    </li>
                  </ul>
                </div>
                <Link
                  href="/auth/inscription"
                  className="w-full text-center py-2.5 rounded-xl bg-neutral-900 hover:bg-neutral-850 border border-neutral-750 text-xs font-semibold text-white transition cursor-pointer"
                >
                  {t('home.free_cta')}
                </Link>
              </div>

              {/* Pack Réussite */}
              <div className="bg-[#111111] border-2 border-cyan-400 rounded-3xl p-6 flex flex-col justify-between shadow-xl shadow-cyan-500/10 relative">
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full bg-cyan-400 text-black text-[10px] font-extrabold uppercase tracking-wider">
                  {language === 'fr' ? 'Recommandé' : 'Recommended'}
                </span>
                <div>
                  <div className="text-xs font-bold text-cyan-400 uppercase tracking-wider mb-1">
                    {language === 'fr' ? 'Pack Réussite' : 'Success Pack'}
                  </div>
                  <div className="text-2xl font-extrabold text-white mb-1">5 000 FCFA</div>
                  <p className="text-xs text-neutral-400 mb-4">{t('home.popular_tag')}</p>
                  <ul className="text-xs text-neutral-300 space-y-2 mb-6">
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-cyan-400 shrink-0" />
                      <span>{t('home.popular_feature1')}</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-cyan-400 shrink-0" />
                      <span>{t('home.popular_feature2')}</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-cyan-400 shrink-0" />
                      <span>{t('home.popular_feature3')}</span>
                    </li>
                  </ul>
                </div>
                <Link
                  href="/tarifs"
                  className="w-full text-center py-2.5 rounded-xl bg-gradient-to-r from-blue-600 via-cyan-500 to-teal-400 hover:from-blue-500 hover:to-cyan-400 text-white font-bold text-xs shadow-md shadow-cyan-500/25 transition cursor-pointer"
                >
                  {t('home.popular_cta')}
                </Link>
              </div>

              {/* Pack Intensif */}
              <div className="bg-[#0e0e0e] border border-neutral-800 rounded-3xl p-6 flex flex-col justify-between">
                <div>
                  <div className="text-xs font-bold text-neutral-400 uppercase tracking-wider mb-1">
                    {language === 'fr' ? 'Pack Intensif' : 'Intensive Pack'}
                  </div>
                  <div className="text-2xl font-extrabold text-white mb-1">9 000 FCFA</div>
                  <p className="text-xs text-neutral-400 mb-4">{t('home.intensive_tag')}</p>
                  <ul className="text-xs text-neutral-300 space-y-2 mb-6">
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                      <span>{t('home.intensive_feature1')}</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                      <span>{t('home.intensive_feature2')}</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                      <span>{t('home.intensive_feature3')}</span>
                    </li>
                  </ul>
                </div>
                <Link
                  href="/tarifs"
                  className="w-full text-center py-2.5 rounded-xl bg-neutral-900 hover:bg-neutral-850 border border-neutral-750 text-xs font-semibold text-white transition cursor-pointer"
                >
                  {t('home.intensive_cta')}
                </Link>
              </div>
            </div>
          </section>

          {/* SECTION FAQ INTERACTIVE */}
          <section id="faq" className="py-12 sm:py-20 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 w-full border-t border-neutral-900">
            <div className="text-center mb-10 sm:mb-14">
              <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                Foire Aux Questions
              </h2>
              <p className="text-xs sm:text-sm text-neutral-400 mt-2">
                Tout ce que vous devez savoir pour aborder votre entretien en toute sérénité.
              </p>
            </div>

            <div className="space-y-3.5">
              {faqItems.map((item, idx) => (
                <div
                  key={idx}
                  className="bg-[#0e0e0e] rounded-2xl border border-neutral-800 overflow-hidden shadow-xs transition-all hover:border-neutral-700"
                >
                  <button
                    onClick={() => setActiveFaq(activeFaq === idx ? null : idx)}
                    className="w-full text-left p-5 sm:p-6 flex items-center justify-between gap-4 font-bold text-white hover:text-cyan-400 transition text-sm sm:text-base cursor-pointer"
                  >
                    <span>{item.q}</span>
                    <ChevronDown
                      className={`w-5 h-5 text-neutral-400 shrink-0 transition-transform duration-200 ${
                        activeFaq === idx ? 'rotate-180 text-cyan-400' : ''
                      }`}
                    />
                  </button>
                  {activeFaq === idx && (
                    <div className="px-5 sm:px-6 pb-6 pt-0 text-xs sm:text-sm text-neutral-300 leading-relaxed border-t border-neutral-800">
                      <p className="mt-3">{item.a}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </section>

          {/* BANNIÈRE CTA PRESTIGE */}
          <section className="py-8 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 mb-16 w-full">
            <div className="bg-gradient-to-r from-neutral-950 via-[#061024] to-neutral-950 text-white rounded-3xl p-8 sm:p-14 shadow-2xl relative overflow-hidden flex flex-col md:flex-row items-center justify-between gap-8 border border-neutral-800">
              <div className="flex items-start sm:items-center gap-5 sm:gap-6 z-10">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-blue-600 to-cyan-400 flex items-center justify-center shrink-0 text-white shadow-lg shadow-cyan-500/25">
                  <Trophy className="w-8 h-8 text-white stroke-[1.5]" />
                </div>
                <div>
                  <h3 className="text-xl sm:text-2xl lg:text-3xl font-black text-white tracking-tight leading-snug">
                    Votre projet d&apos;études mérite <br className="hidden sm:inline" />
                    une préparation à la hauteur de vos <span className="text-cyan-400">ambitions.</span>
                  </h3>
                  <p className="text-xs sm:text-sm text-neutral-400 mt-2 font-normal">
                    Ne laissez pas le stress décider de votre avenir. Commencez votre entraînement dès aujourd&apos;hui.
                  </p>
                </div>
              </div>

              <div className="shrink-0 z-10 w-full md:w-auto">
                <Link
                  href="/auth/inscription"
                  className="w-full md:w-auto inline-flex items-center justify-center gap-2.5 bg-gradient-to-r from-blue-600 via-cyan-500 to-teal-400 hover:from-blue-500 hover:to-cyan-400 text-white font-bold text-sm sm:text-base px-8 py-4 rounded-full shadow-2xl transition-all hover:scale-105 cursor-pointer"
                >
                  <span>Commencer ma préparation</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            </div>
          </section>

          {/* FOOTER OFFICIEL & MENTIONS LÉGALES */}
          <footer className="border-t border-neutral-900 py-10 bg-black text-neutral-400">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-b border-neutral-900 pb-6">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-blue-600 to-cyan-400 flex items-center justify-center text-white shadow-md">
                    <Sparkles className="w-4 h-4" />
                  </div>
                  <span className="font-extrabold text-white text-lg tracking-tight">
                    Prépa<span className="text-cyan-400">Campus</span>
                  </span>
                </div>
                <div className="flex items-center gap-6 text-xs text-neutral-400 flex-wrap justify-center">
                  <Link href="/tarifs" className="hover:text-white transition">Tarifs & Formules</Link>
                  <Link href="/questions" className="hover:text-white transition">50 Questions Types</Link>
                  <Link href="/auth/connexion" className="hover:text-white transition">Connexion</Link>
                  <Link href="/auth/inscription" className="hover:text-white transition">Créer un compte</Link>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-[11px] text-neutral-500 leading-relaxed">
                <div className="p-4 rounded-2xl bg-[#0e0e0e] border border-neutral-800 space-y-1.5">
                  <span className="font-bold text-neutral-300 block">Avertissement & Indépendance</span>
                  <p>
                    PrépaCampus est une structure privée et indépendante d&apos;aide et de simulation pédagogique pour préparer le vrai entretien. Nous ne travaillons pas avec Campus France et ne représentons aucune institution gouvernementale. « Campus France » est une marque déposée par ses ayants droit.
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-[#0e0e0e] border border-neutral-800 space-y-1.5">
                  <span className="font-bold text-neutral-300 block">Confidentialité & Sécurité de la Caméra</span>
                  <p>
                    La caméra est allumée exclusivement pour vous placer dans les conditions réelles d&apos;immersion de l&apos;entretien officiel. Nous ne collectons aucune donnée vidéo. Vos images ne sont jamais enregistrées ni stockées dans nos bases de données et restent 100% locales sur votre appareil.
                  </p>
                </div>
              </div>

              <div className="text-center text-[11px] text-neutral-600 pt-2">
                © {new Date().getFullYear()} PrépaCampus • Plateforme indépendante d&apos;entraînement à la mobilité étudiante • Tous droits réservés.
              </div>
            </div>
          </footer>
        </main>
      )}
    </div>
  );
}
