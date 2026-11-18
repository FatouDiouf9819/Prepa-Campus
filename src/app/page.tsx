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
  User, 
  Menu, 
  X, 
  Check, 
  ChevronRight, 
  ChevronDown, 
  LogOut, 
  LayoutDashboard, 
  Sparkles, 
  ShieldCheck, 
  Award, 
  Clock, 
  Globe2, 
  Play, 
  Volume2, 
  MessageSquare, 
  CheckCircle2 
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

export default function HomePage() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
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

  const handleSignOut = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    setIsAuthenticated(false);
  };

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
    <div className="min-h-screen bg-[#F8F9FE] text-slate-800 flex flex-col font-sans selection:bg-[#0066FF]/20 selection:text-[#0066FF]">
      
      {/* 1. Header Navigation Glassmorphism */}
      <header className="sticky top-0 z-50 bg-[#F8F9FE]/90 backdrop-blur-xl border-b border-blue-100/60 transition-all">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 sm:h-20 flex items-center justify-between">
          
          {/* Logo Prépa Campus */}
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-tr from-[#0066FF] to-[#38BDF8] flex items-center justify-center text-white shadow-md shadow-blue-500/25 group-hover:scale-105 transition-transform">
              <GraduationCap className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
            <div className="flex flex-col">
              <span className="text-lg sm:text-xl font-extrabold tracking-tight text-slate-900 leading-none">
                Prépa<span className="text-[#0066FF]">Campus</span>
              </span>
              <span className="text-[10px] text-slate-400 font-medium tracking-wide mt-0.5">
                RÉUSSITE CAMPUS FRANCE
              </span>
            </div>
          </Link>

          {/* Navigation Liens Desktop */}
          <nav className="hidden md:flex items-center gap-8 text-sm font-semibold text-slate-600">
            <Link href="/" className="relative text-slate-900 font-bold transition">
              Accueil
              <span className="absolute -bottom-1.5 left-0 right-0 h-0.5 bg-[#0066FF] rounded-full" />
            </Link>
            <a href="#simulateur" className="hover:text-[#0066FF] transition flex items-center gap-1.5">
              <span>Simulateur IA</span>
              <span className="px-1.5 py-0.5 text-[10px] font-bold bg-blue-100 text-[#0066FF] rounded-full">Nouveau</span>
            </a>
            <a href="#avantages" className="hover:text-[#0066FF] transition">
              Avantages
            </a>
            <a href="#comment-ca-marche" className="hover:text-[#0066FF] transition">
              Méthode
            </a>
            <a href="#temoignages" className="hover:text-[#0066FF] transition">
              Admis
            </a>
            <a href="#faq" className="hover:text-[#0066FF] transition">
              FAQ
            </a>
          </nav>

          {/* Actions Droite */}
          <div className="flex items-center gap-3">
            {isAuthenticated ? (
              <div className="flex items-center gap-2.5">
                <Link
                  href="/tableau-de-bord"
                  className="inline-flex items-center gap-2 bg-[#0066FF] hover:bg-[#0052CC] text-white text-xs sm:text-sm font-semibold px-4 sm:px-5 py-2.5 rounded-full shadow-md shadow-blue-500/20 transition-all hover:-translate-y-0.5"
                >
                  <LayoutDashboard className="w-4 h-4" />
                  <span>Mon tableau de bord</span>
                </Link>
                <button
                  onClick={handleSignOut}
                  title="Se déconnecter"
                  className="p-2 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-full transition"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2 sm:gap-3">
                <Link
                  href="/auth/connexion"
                  className="inline-flex items-center gap-1.5 border border-slate-200/90 bg-white/80 hover:bg-white text-slate-700 hover:text-slate-900 text-xs sm:text-sm font-semibold px-3.5 sm:px-4 py-2 rounded-full shadow-xs transition"
                >
                  <User className="w-3.5 h-3.5 text-slate-600" />
                  <span>Connexion</span>
                </Link>
                <Link
                  href="/auth/inscription"
                  className="inline-flex items-center gap-1.5 bg-[#0066FF] hover:bg-[#0052CC] text-white text-xs sm:text-sm font-semibold px-4 sm:px-5 py-2 sm:py-2.5 rounded-full shadow-md shadow-blue-500/25 hover:shadow-blue-500/35 transition-all hover:-translate-y-0.5"
                >
                  <span>Créer mon compte</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            )}

            {/* Menu Mobile Hamburger */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 text-slate-700 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition"
              aria-label="Ouvrir le menu"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>

        {/* Tiroir Mobile */}
        {mobileMenuOpen && (
          <div className="md:hidden bg-white/95 backdrop-blur-xl border-b border-slate-200 px-4 pt-3 pb-6 space-y-3 shadow-xl">
            <Link
              href="/"
              onClick={() => setMobileMenuOpen(false)}
              className="block py-2 text-sm text-[#0066FF] font-bold"
            >
              Accueil
            </Link>
            <a
              href="#simulateur"
              onClick={() => setMobileMenuOpen(false)}
              className="block py-2 text-sm text-slate-700 hover:text-slate-900 font-medium"
            >
              Simulateur IA
            </a>
            <a
              href="#avantages"
              onClick={() => setMobileMenuOpen(false)}
              className="block py-2 text-sm text-slate-700 hover:text-slate-900 font-medium"
            >
              Avantages
            </a>
            <a
              href="#comment-ca-marche"
              onClick={() => setMobileMenuOpen(false)}
              className="block py-2 text-sm text-slate-700 hover:text-slate-900 font-medium"
            >
              Comment ça marche
            </a>
            <a
              href="#temoignages"
              onClick={() => setMobileMenuOpen(false)}
              className="block py-2 text-sm text-slate-700 hover:text-slate-900 font-medium"
            >
              Témoignages
            </a>
            <a
              href="#faq"
              onClick={() => setMobileMenuOpen(false)}
              className="block py-2 text-sm text-slate-700 hover:text-slate-900 font-medium"
            >
              FAQ
            </a>
            <div className="pt-3 border-t border-slate-100 space-y-2">
              <Link
                href="/auth/connexion"
                onClick={() => setMobileMenuOpen(false)}
                className="w-full flex items-center justify-center gap-2 border border-slate-200 text-slate-700 text-sm font-semibold py-2.5 rounded-full hover:bg-slate-50 transition"
              >
                <User className="w-4 h-4" />
                <span>Se connecter</span>
              </Link>
              <Link
                href="/auth/inscription"
                onClick={() => setMobileMenuOpen(false)}
                className="w-full flex items-center justify-center gap-2 bg-[#0066FF] hover:bg-[#0052CC] text-white text-sm font-semibold py-2.5 rounded-full transition shadow-md shadow-blue-500/25"
              >
                <span>Créer mon compte</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        )}
      </header>

      {/* 2. HERO SECTION — COUVERTURE TOTALE (PLEIN ÉCRAN IMMERSIF) */}
      
      {/* VERSION MOBILE (< md) : Arrière-plan photo authentique couvrant 100% de la section */}
      <section className="md:hidden relative w-full overflow-hidden h-[460px] min-[400px]:h-[490px] flex items-center px-4 min-[390px]:px-5 py-6">
        
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
          {/* Dégradé doux de luminosité sur la gauche pour assurer un contraste parfait au texte */}
          <div className="absolute inset-y-0 left-0 w-[64%] min-[400px]:w-[60%] bg-gradient-to-r from-white via-white/95 sm:via-white/80 to-transparent z-10" />
        </div>

        {/* CALQUE 2 : Contenu textuel sur la gauche assis sur la zone dégagée */}
        <div className="relative z-20 w-[52%] min-[400px]:w-[48%] flex flex-col items-start">
          
          {/* Badge supérieur de réassurance */}
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[9px] min-[360px]:text-[9.5px] min-[400px]:text-[10px] font-semibold bg-white/95 backdrop-blur-md border border-blue-200/90 text-[#0066FF] shadow-xs mb-2.5">
            <span className="w-1.5 h-1.5 rounded-full bg-[#0066FF] animate-pulse" />
            <span>Votre réussite, notre priorité</span>
          </div>

          {/* Titre Principal percutant */}
          <h1 className="text-[19px] min-[360px]:text-[21px] min-[400px]:text-[23px] font-extrabold text-slate-900 tracking-tight leading-[1.14]">
            Réussis ton entretien <br />
            <span className="text-[#0066FF]">Campus France</span> <br />
            avec confiance.
          </h1>

          {/* Sous-titre soigné */}
          <p className="text-[10px] min-[360px]:text-[10.5px] min-[400px]:text-[11px] text-slate-600 leading-relaxed mt-2 font-normal">
            Entraînement pas à pas, feedbacks clairs et conseils personnalisés pour défendre votre projet d'études en France.
          </p>

          {/* Bouton CTA Premium */}
          <div className="mt-3.5">
            <Link
              href="/auth/inscription"
              className="inline-flex items-center gap-1.5 bg-[#0066FF] hover:bg-[#0052CC] text-white font-semibold text-[11px] min-[360px]:text-xs px-3.5 py-2.5 rounded-full shadow-lg shadow-blue-500/25 hover:shadow-blue-500/35 transition-all group whitespace-nowrap"
            >
              <span>Commencer ma préparation</span>
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
            </Link>
          </div>

          {/* Micro-preuve de confiance sous le bouton */}
          <div className="flex items-center gap-1.5 text-[9px] min-[360px]:text-[9.5px] text-slate-600 font-medium mt-2.5">
            <div className="w-3.5 h-3.5 rounded-full bg-blue-100 flex items-center justify-center text-[#0066FF] shrink-0">
              <Check className="w-2 h-2 stroke-[3]" />
            </div>
            <span>Simulation intelligente & feedbacks immédiats</span>
          </div>

        </div>

      </section>

      {/* VERSION DESKTOP (>= md) : Plein écran immersif avec éléments de crédibilité de classe mondiale */}
      <section className="hidden md:flex relative overflow-hidden w-full bg-[#EFF3FE] items-center min-h-[calc(100vh-80px)] py-12">
        
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
          {/* Dégradé doux de luminosité sur la gauche pour détacher la typographie avec un contraste parfait */}
          <div className="absolute inset-y-0 left-0 w-full sm:w-[60%] md:w-[50%] lg:w-[44%] bg-gradient-to-r from-white via-white/90 sm:via-white/70 to-transparent z-10" />
        </div>

        {/* CALQUE 2 : Contenu éditorial de prestige */}
        <div className="relative z-20 max-w-7xl mx-auto px-6 lg:px-8 w-full">
          <div className="w-[48%] lg:w-[43%] max-w-xl flex flex-col items-start">
            
            {/* Badge supérieur de réassurance avec puce vivante */}
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-semibold bg-white/95 backdrop-blur-md border border-blue-200/80 text-[#0066FF] shadow-xs mb-5">
              <span className="w-2 h-2 rounded-full bg-[#0066FF] animate-pulse" />
              <span>Simulateur Officiel IA • Session 2025 - 2026</span>
            </div>

            {/* Titre Principal percutant avec accentuation élégante */}
            <h1 className="text-4xl sm:text-5xl lg:text-[54px] font-black text-slate-900 tracking-tight leading-[1.12]">
              Réussis ton entretien <br />
              <span className="bg-gradient-to-r from-[#0066FF] via-[#0052CC] to-[#00B4D8] bg-clip-text text-transparent">
                Campus France
              </span> <br />
              avec confiance.
            </h1>

            {/* Sous-titre soigné et à forte valeur ajoutée */}
            <p className="text-base lg:text-lg text-slate-600 leading-relaxed mt-5 font-normal max-w-lg">
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
                className="inline-flex items-center gap-2 bg-white/80 hover:bg-white text-slate-800 font-semibold text-sm px-5 py-3.5 rounded-full border border-slate-200/90 shadow-xs hover:shadow-md transition-all"
              >
                <Play className="w-3.5 h-3.5 text-[#0066FF] fill-[#0066FF]" />
                <span>Voir la démonstration</span>
              </a>
            </div>

            {/* Preuves d'autorité et notation vérifiée */}
            <div className="mt-8 pt-6 border-t border-slate-200/70 flex items-center gap-6">
              <div className="flex -space-x-2">
                <div className="w-8 h-8 rounded-full border-2 border-white overflow-hidden relative shadow-xs">
                  <Image src="/avatar-ref-mamadou.png" alt="Mamadou" fill className="object-cover" />
                </div>
                <div className="w-8 h-8 rounded-full border-2 border-white overflow-hidden relative shadow-xs">
                  <Image src="/avatar-ref-aissatou-sow.png" alt="Aïssatou" fill className="object-cover" />
                </div>
                <div className="w-8 h-8 rounded-full border-2 border-white overflow-hidden relative shadow-xs">
                  <Image src="/avatar-ref-ibrahima.png" alt="Ibrahima" fill className="object-cover" />
                </div>
              </div>
              <div className="text-xs text-slate-600 font-medium">
                <div className="flex items-center gap-1 text-amber-500 font-bold">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                  ))}
                  <span className="text-slate-900 ml-1">4.9 / 5</span>
                </div>
                <p className="text-slate-500 mt-0.5">+1 500 étudiants admis en France avec succès</p>
              </div>
            </div>

          </div>
        </div>

        {/* Badge flottant d'excellence sur la photo */}
        <div className="hidden xl:flex items-center gap-3.5 bg-white/90 backdrop-blur-xl border border-white/80 p-4 rounded-2xl shadow-xl shadow-blue-500/10 absolute right-12 bottom-16 z-20">
          <div className="w-11 h-11 rounded-xl bg-gradient-to-tr from-[#0066FF] to-[#38BDF8] flex items-center justify-center text-white shrink-0 shadow-md shadow-blue-500/25">
            <Check className="w-6 h-6 stroke-[2.5]" />
          </div>
          <div>
            <div className="text-xs font-extrabold text-slate-900">Avis Favorable Décroché</div>
            <div className="text-[11px] text-[#0066FF] font-semibold">Admise à Sorbonne Université (Paris)</div>
          </div>
        </div>

      </section>

      {/* 2bis. LES 3 AVANTAGES CLÉS EN CARTES (Directement sous le Hero) */}
      <section className="relative z-30 -mt-6 sm:-mt-8 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5 sm:gap-6 bg-white/95 backdrop-blur-xl p-4 sm:p-6 rounded-2xl sm:rounded-3xl border border-slate-200/90 shadow-xl shadow-slate-900/5">
          
          <div className="flex items-center sm:items-start gap-3.5 p-2 rounded-xl hover:bg-slate-50/80 transition-colors">
            <div className="w-11 h-11 rounded-2xl bg-blue-50 border border-blue-100 flex items-center justify-center text-[#0066FF] shrink-0 shadow-xs">
              <Mic className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">S'entraîner comme en conditions réelles</h3>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">Simulez l'entretien Campus France avec notre IA intelligente.</p>
            </div>
          </div>

          <div className="flex items-center sm:items-start gap-3.5 p-2 rounded-xl hover:bg-slate-50/80 transition-colors">
            <div className="w-11 h-11 rounded-2xl bg-blue-50 border border-blue-100 flex items-center justify-center text-[#0066FF] shrink-0 shadow-xs">
              <TrendingUp className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">Recevoir des conseils pour s'améliorer</h3>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">Obtenez un feedback détaillé et stratégique sur vos réponses.</p>
            </div>
          </div>

          <div className="flex items-center sm:items-start gap-3.5 p-2 rounded-xl hover:bg-slate-50/80 transition-colors">
            <div className="w-11 h-11 rounded-2xl bg-blue-50 border border-blue-100 flex items-center justify-center text-[#0066FF] shrink-0 shadow-xs">
              <Trophy className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">Gagner en confiance</h3>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">Présentez votre projet d'études avec clarté, prestance et assurance.</p>
            </div>
          </div>

        </div>
      </section>

      {/* 3. BANDEAU DE STATISTIQUES & IMPACT MONDIAL (Autorité & Crédibilité) */}
      <section className="bg-white border-y border-slate-200/80 py-8 relative z-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center divide-x-0 md:divide-x divide-slate-100">
            
            <div className="flex flex-col items-center p-2">
              <span className="text-3xl sm:text-4xl font-extrabold text-[#0066FF] tracking-tight">98%</span>
              <span className="text-xs sm:text-sm font-semibold text-slate-900 mt-1">Taux de réussite officiel</span>
              <span className="text-[11px] text-slate-500">Avis favorable dès la 1ère tentative</span>
            </div>

            <div className="flex flex-col items-center p-2">
              <span className="text-3xl sm:text-4xl font-extrabold text-[#0066FF] tracking-tight">+1 500</span>
              <span className="text-xs sm:text-sm font-semibold text-slate-900 mt-1">Étudiants accompagnés</span>
              <span className="text-[11px] text-slate-500">Dans plus de 35 pays partenaires</span>
            </div>

            <div className="flex flex-col items-center p-2">
              <span className="text-3xl sm:text-4xl font-extrabold text-[#0066FF] tracking-tight">50+</span>
              <span className="text-xs sm:text-sm font-semibold text-slate-900 mt-1">Questions types décryptées</span>
              <span className="text-[11px] text-slate-500">Avec les réponses attendues</span>
            </div>

            <div className="flex flex-col items-center p-2">
              <span className="text-3xl sm:text-4xl font-extrabold text-[#0066FF] tracking-tight">&lt; 30s</span>
              <span className="text-xs sm:text-sm font-semibold text-slate-900 mt-1">Feedbacks IA instantanés</span>
              <span className="text-[11px] text-slate-500">Analyse détaillée et note sur 20</span>
            </div>

          </div>
        </div>
      </section>

      {/* 4. SHOWCASE INTERACTIF : Découvrez la simulation IA en action */}
      <section id="simulateur" className="py-14 sm:py-20 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
        
        <div className="text-center max-w-3xl mx-auto mb-10 sm:mb-14">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-blue-50 text-[#0066FF] border border-blue-100 mb-3">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Technologie d'évaluation exclusive</span>
          </div>
          <h2 className="text-2xl sm:text-4xl font-black text-slate-900 tracking-tight">
            Découvrez la puissance de l'entraînement par IA
          </h2>
          <p className="text-sm sm:text-base text-slate-600 mt-3 leading-relaxed">
            Exactement comme devant un conseiller Campus France : notre IA vous pose les vraies questions et vous montre immédiatement où vous excellez et où vous risquez le refus.
          </p>
        </div>

        {/* Console de Simulation Interactive */}
        <div className="bg-white rounded-3xl shadow-xl shadow-blue-500/5 border border-slate-200/80 overflow-hidden">
          
          {/* Header de la console */}
          <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between">
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
                <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center text-[#0066FF] shrink-0 font-bold text-sm shadow-xs">
                  CF
                </div>
                <div className="bg-blue-50/80 border border-blue-100/80 rounded-2xl p-4 sm:p-5 flex-1">
                  <span className="text-[11px] font-bold text-[#0066FF] tracking-wider uppercase block mb-1">
                    Question du conseiller
                  </span>
                  <p className="text-sm sm:text-base font-semibold text-slate-900 leading-snug">
                    « Pourquoi avoir choisi spécifiquement cette formation en France plutôt que de continuer dans votre pays d'origine ? »
                  </p>
                </div>
              </div>

              {/* Bulle Candidat */}
              <div className="flex items-start gap-3.5 pl-6 sm:pl-10">
                <div className="w-9 h-9 rounded-xl bg-slate-900 text-white flex items-center justify-center shrink-0 text-xs font-bold shadow-xs">
                  VOUS
                </div>
                <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 flex-1 shadow-xs">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[11px] font-semibold text-slate-500">Votre réponse enregistrée</span>
                    <div className="flex items-center gap-1.5 text-xs text-[#0066FF] font-medium bg-blue-50 px-2.5 py-0.5 rounded-full">
                      <Volume2 className="w-3.5 h-3.5" />
                      <span>Audio 0:42s</span>
                    </div>
                  </div>
                  <p className="text-xs sm:text-sm text-slate-700 leading-relaxed italic">
                    « Mon objectif est de devenir ingénieur cloud certifié. Cette formation à Sorbonne Université propose des partenariats industriels précis et des laboratoires de pointe inexistants dans mon pays actuel... »
                  </p>
                </div>
              </div>

            </div>

            {/* Colonne Droite : Rapport IA instantané */}
            <div className="lg:col-span-5 bg-gradient-to-br from-slate-900 to-[#0A1938] text-white p-6 sm:p-7 rounded-2xl shadow-lg border border-slate-800">
              <div className="flex items-center justify-between pb-4 border-b border-slate-800">
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
                  <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                    <div className="bg-emerald-400 h-full w-[95%] rounded-full" />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between font-semibold mb-1">
                    <span className="text-slate-300">Justification du choix de la France</span>
                    <span className="text-emerald-400">Très solide (90%)</span>
                  </div>
                  <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                    <div className="bg-emerald-400 h-full w-[90%] rounded-full" />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between font-semibold mb-1">
                    <span className="text-slate-300">Cohérence du projet de retour</span>
                    <span className="text-amber-400">À préciser (75%)</span>
                  </div>
                  <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
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
                  className="w-full flex items-center justify-center gap-2 bg-[#0066FF] hover:bg-[#0052CC] text-white text-xs font-bold py-3 rounded-xl transition shadow-md shadow-blue-500/25"
                >
                  <span>Tester mes propres réponses maintenant</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>

          </div>

        </div>

      </section>

      {/* 5. TROIS PILIERS D'EXCELLENCE ("Avantages" Bento Grid) */}
      <section id="avantages" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-16 w-full">
        
        <div className="text-center max-w-2xl mx-auto mb-10 sm:mb-12">
          <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Pourquoi choisir Prépa Campus ?
          </h2>
          <p className="text-xs sm:text-sm text-slate-600 mt-2">
            La seule plateforme conçue à 100% pour répondre aux exigences exactes des jurys Campus France.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          
          {/* Bento Card 1 */}
          <div className="bg-white rounded-3xl p-7 shadow-[0_8px_30px_rgba(0,102,255,0.04)] border border-blue-100/70 hover:border-blue-300 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 flex flex-col justify-between group">
            <div>
              <div className="w-12 h-12 rounded-2xl bg-blue-50 text-[#0066FF] flex items-center justify-center mb-5 group-hover:scale-110 transition-transform">
                <Mic className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 mb-2">
                Simulations Vocales en Conditions Réelles
              </h3>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                Pratiquez à voix haute ou à l'écrit face à une IA qui adopte les attitudes et les relances authentiques d'un examinateur officiel.
              </p>
            </div>
            <div className="mt-6 pt-4 border-t border-slate-100 flex items-center text-xs font-semibold text-[#0066FF]">
              <span>50+ questions officielles</span>
              <ChevronRight className="w-4 h-4 ml-1" />
            </div>
          </div>

          {/* Bento Card 2 */}
          <div className="bg-white rounded-3xl p-7 shadow-[0_8px_30px_rgba(0,102,255,0.04)] border border-blue-100/70 hover:border-blue-300 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 flex flex-col justify-between group">
            <div>
              <div className="w-12 h-12 rounded-2xl bg-blue-50 text-[#0066FF] flex items-center justify-center mb-5 group-hover:scale-110 transition-transform">
                <TrendingUp className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 mb-2">
                Détection Immédiate des Pièges Éliminatoires
              </h3>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                Identifiez avant l'heure vos réponses floues, vos incohérences de financement ou vos faiblesses d'orientation pour les corriger.
              </p>
            </div>
            <div className="mt-6 pt-4 border-t border-slate-100 flex items-center text-xs font-semibold text-[#0066FF]">
              <span>Feedbacks instantanés & note</span>
              <ChevronRight className="w-4 h-4 ml-1" />
            </div>
          </div>

          {/* Bento Card 3 */}
          <div className="bg-white rounded-3xl p-7 shadow-[0_8px_30px_rgba(0,102,255,0.04)] border border-blue-100/70 hover:border-blue-300 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 flex flex-col justify-between group">
            <div>
              <div className="w-12 h-12 rounded-2xl bg-blue-50 text-[#0066FF] flex items-center justify-center mb-5 group-hover:scale-110 transition-transform">
                <Trophy className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 mb-2">
                Assurance Maximale & Zéro Stress le Jour J
              </h3>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                Transformez l'appréhension en maîtrise totale. Sachez exactement quoi dire, comment le formuler et convainquez avec naturel.
              </p>
            </div>
            <div className="mt-6 pt-4 border-t border-slate-100 flex items-center text-xs font-semibold text-[#0066FF]">
              <span>98% d'avis favorables</span>
              <ChevronRight className="w-4 h-4 ml-1" />
            </div>
          </div>

        </div>
      </section>

      {/* 6. SECTION : Comment ça marche ? (Liste Déroulante Épurée & Élégante) */}
      <section id="comment-ca-marche" className="py-12 sm:py-20 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
        
        {/* En-tête de section */}
        <div className="text-center mb-10 sm:mb-14">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full text-xs font-semibold bg-blue-50 text-[#0066FF] border border-blue-100 mb-3">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Méthode Éprouvée</span>
          </div>
          <h2 className="text-2xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
            Comment ça marche ?
          </h2>
          <p className="text-sm sm:text-base text-slate-500 mt-2 font-normal">
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
                    ? 'bg-white border-blue-200/90 shadow-xl shadow-blue-500/5 ring-1 ring-blue-500/10'
                    : 'bg-white/70 hover:bg-white border-slate-200/80 shadow-xs hover:shadow-md'
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
                          : 'bg-slate-100 text-slate-600 group-hover:bg-blue-50 group-hover:text-[#0066FF]'
                      }`}
                    >
                      {step.num}
                    </div>

                    {/* Titre & résumé */}
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-blue-50 text-[#0066FF] border border-blue-100/60">
                          {step.badge}
                        </span>
                      </div>
                      <h3 className="text-sm sm:text-base font-bold text-slate-900 truncate sm:whitespace-normal group-hover:text-[#0066FF] transition-colors">
                        {step.title}
                      </h3>
                      {!isOpen && (
                        <p className="text-xs text-slate-500 mt-0.5 truncate hidden sm:block">
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
                        : 'bg-slate-50 text-slate-400 border-slate-200 group-hover:border-blue-200 group-hover:text-[#0066FF]'
                    }`}
                  >
                    <ChevronDown className="w-4 h-4 transition-transform" />
                  </div>
                </button>

                {/* Contenu Déroulant & Épuré */}
                {isOpen && (
                  <div className="px-5 sm:px-6 pb-6 pt-1 border-t border-slate-100 animate-fadeIn">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 pt-4">
                      
                      {/* Description détaillée & points clés */}
                      <div className="space-y-4 max-w-xl">
                        <p className="text-xs sm:text-sm text-slate-600 leading-relaxed font-normal">
                          {step.fullDesc}
                        </p>
                        
                        <div className="space-y-2 pt-1">
                          {step.keyPoints.map((point, pIdx) => (
                            <div key={pIdx} className="flex items-center gap-2.5 text-xs text-slate-700 font-medium">
                              <div className="w-4 h-4 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 border border-emerald-100">
                                <Check className="w-2.5 h-2.5 stroke-[3]" />
                              </div>
                              <span>{point}</span>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Visuel d'illustration de l'étape */}
                      <div className="relative w-20 h-20 sm:w-24 sm:h-24 bg-gradient-to-tr from-blue-50/80 to-slate-50 p-3 rounded-2xl border border-blue-100/60 shrink-0 self-center sm:self-start shadow-xs">
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

      {/* 7. SECTION : Témoignages & Étudiants Admis (Liste Déroulante Épurée & Élégante) */}
      <section id="temoignages" className="py-12 sm:py-20 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
        
        {/* En-tête de section */}
        <div className="text-center mb-10 sm:mb-14">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-600 border border-emerald-100 mb-3">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Réussites Vérifiées</span>
          </div>
          <h2 className="text-2xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
            Ils ont réussi leur entretien
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-2">
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
                    ? 'bg-white border-blue-200/90 shadow-xl shadow-blue-500/5 ring-1 ring-blue-500/10'
                    : 'bg-white/70 hover:bg-white border-slate-200/80 shadow-xs hover:shadow-md'
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
                    <div className="relative w-12 h-12 sm:w-14 sm:h-14 rounded-full overflow-hidden shrink-0 border-2 border-blue-100 shadow-xs">
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
                        <h3 className="text-sm sm:text-base font-bold text-slate-900 group-hover:text-[#0066FF] transition-colors">
                          {item.name}
                        </h3>
                        <span className="text-[10px] font-semibold text-slate-400 hidden sm:inline">• {item.city}</span>
                      </div>
                      <p className="text-xs font-semibold text-[#0066FF] truncate">
                        {item.admission}
                      </p>
                      {!isOpen && (
                        <p className="text-xs text-slate-500 mt-1 truncate italic hidden sm:block max-w-md">
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
                          : 'bg-slate-50 text-slate-400 border-slate-200 group-hover:border-blue-200 group-hover:text-[#0066FF]'
                      }`}
                    >
                      <ChevronDown className="w-4 h-4 transition-transform" />
                    </div>
                  </div>
                </button>

                {/* Contenu Déroulant & Épuré */}
                {isOpen && (
                  <div className="px-5 sm:px-6 pb-6 pt-2 border-t border-slate-100 animate-fadeIn">
                    <div className="pt-3 space-y-4">
                      {/* Citation complète */}
                      <p className="text-xs sm:text-sm text-slate-700 leading-relaxed font-normal bg-slate-50/80 p-4 rounded-2xl border border-slate-100 italic">
                        {item.fullQuote}
                      </p>

                      {/* Facteur clé de succès */}
                      <div className="flex items-center gap-2.5 text-xs text-slate-600 bg-blue-50/50 p-3 rounded-xl border border-blue-100/60">
                        <span className="font-bold text-[#0066FF] shrink-0">Point décisif :</span>
                        <span className="font-medium text-slate-700">{item.keyFactor}</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* 8. SECTION FAQ INTERACTIVE (Questions Fréquentes) */}
      <section id="faq" className="py-12 sm:py-20 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
        <div className="text-center mb-10 sm:mb-14">
          <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Foire Aux Questions
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-2">
            Tout ce que vous devez savoir pour aborder votre entretien en toute sérénité.
          </p>
        </div>

        <div className="space-y-3.5">
          {faqItems.map((item, idx) => (
            <div
              key={idx}
              className="bg-white rounded-2xl border border-slate-200/80 overflow-hidden shadow-xs transition-all"
            >
              <button
                onClick={() => setActiveFaq(activeFaq === idx ? null : idx)}
                className="w-full text-left p-5 sm:p-6 flex items-center justify-between gap-4 font-bold text-slate-900 hover:text-[#0066FF] transition text-sm sm:text-base"
              >
                <span>{item.q}</span>
                <ChevronDown
                  className={`w-5 h-5 text-slate-400 shrink-0 transition-transform duration-200 ${
                    activeFaq === idx ? 'rotate-180 text-[#0066FF]' : ''
                  }`}
                />
              </button>
              {activeFaq === idx && (
                <div className="px-5 sm:px-6 pb-6 pt-0 text-xs sm:text-sm text-slate-600 leading-relaxed border-t border-slate-100">
                  <p className="mt-3">{item.a}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* 9. BANNIÈRE CTA BLEU NUIT PRESTIGE */}
      <section className="py-8 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-16 w-full">
        <div className="bg-gradient-to-r from-[#07132D] via-[#0A1938] to-[#0A2558] text-white rounded-3xl p-8 sm:p-14 shadow-2xl relative overflow-hidden flex flex-col md:flex-row items-center justify-between gap-8 border border-blue-900/40">
          
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

    </div>
  );
}
