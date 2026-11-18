'use client';

import React, { useState, useMemo, useEffect } from 'react';
import Link from 'next/link';
import { Navbar } from '@/components/navigation/Navbar';
import { 
  Search, 
  ChevronDown, 
  ChevronUp, 
  Target, 
  AlertTriangle, 
  CheckCircle2, 
  Sparkles,
  ArrowRight,
  Lock,
  Zap,
  Lightbulb,
  GraduationCap
} from 'lucide-react';
import { 
  OFFICIAL_QUESTIONS, 
  QuestionCategory, 
  OfficialQuestion 
} from '@/config/officialQuestions';
import { MobileMoneyModal } from '@/components/payments/MobileMoneyModal';
import { useLanguage } from '@/lib/i18n/LanguageContext';

export default function QuestionsLibraryPage() {
  const { language } = useLanguage();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<QuestionCategory | 'ALL'>('ALL');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [hasPremiumAccess, setHasPremiumAccess] = useState<boolean>(false);
  const [rechargeModalOpen, setRechargeModalOpen] = useState<boolean>(false);

  useEffect(() => {
    async function checkAccess() {
      try {
        const res = await fetch('/api/credits');
        if (res.ok) {
          const data = await res.json();
          if (data.hasPremiumAccess) {
            setHasPremiumAccess(true);
            try {
              localStorage.setItem('campus_france_premium_questions', 'true');
            } catch {
              // Ignorer
            }
            return;
          }
        }
      } catch {
        // Mode hors-ligne
      }

      try {
        const local = localStorage.getItem('campus_france_premium_questions');
        if (local === 'true') {
          setHasPremiumAccess(true);
        }
      } catch {
        // Ignorer
      }
    }

    checkAccess();
  }, []);

  const categories: Array<{ id: QuestionCategory | 'ALL'; label: string }> = [
    { id: 'ALL', label: language === 'fr' ? 'Toutes les questions' : 'All Questions' },
    { id: 'PROJET_PRO', label: language === 'fr' ? 'Projet Professionnel' : 'Career Project' },
    { id: 'CHOIX_FRANCE', label: language === 'fr' ? 'Pourquoi la France ?' : 'Why France?' },
    { id: 'PARCOURS_NOTES', label: language === 'fr' ? 'Parcours & Notes' : 'Academic Record' },
    { id: 'FINANCEMENT_LOGEMENT', label: language === 'fr' ? 'Budget & Logement' : 'Funding & Housing' },
    { id: 'PIEGES_AVENIR', label: language === 'fr' ? 'Questions Pièges' : 'Trap Questions' },
  ];

  const filteredQuestions = useMemo(() => {
    return OFFICIAL_QUESTIONS.filter((q) => {
      const matchCategory = selectedCategory === 'ALL' || q.category === selectedCategory;
      const matchQuery =
        searchQuery.trim() === '' ||
        q.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
        q.hiddenIntent.toLowerCase().includes(searchQuery.toLowerCase()) ||
        q.trapToAvoid.toLowerCase().includes(searchQuery.toLowerCase()) ||
        q.keyAdvice.toLowerCase().includes(searchQuery.toLowerCase());
      return matchCategory && matchQuery;
    });
  }, [searchQuery, selectedCategory]);

  const toggleExpand = (id: string) => {
    setExpandedId((prev) => (prev === id ? null : id));
  };

  return (
    <div className="min-h-screen bg-[#F8F9FE] flex flex-col text-slate-800 font-sans">
      <Navbar />

      <main className="flex-1 max-w-4xl w-full mx-auto px-4 sm:px-6 py-10 sm:py-14 space-y-6">
        {/* En-tête épuré et moderne */}
        <div className="text-center max-w-2xl mx-auto space-y-3">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 border border-blue-200/80 text-[#0066FF] text-xs font-semibold">
            <Sparkles className="w-3.5 h-3.5" />
            <span>{language === 'fr' ? 'Référentiel Consulaire Officiel 2025' : 'Official Consular Repository'}</span>
          </div>
          <h1 className="text-2xl sm:text-4xl font-black text-slate-900 tracking-tight">
            {language === 'fr' ? '50 Questions Types & Modèles' : '50 Essential Interview Questions'}
          </h1>
          <p className="text-xs sm:text-sm text-slate-600 leading-relaxed max-w-xl mx-auto">
            {language === 'fr' 
              ? 'Comprenez ce que le jury évalue réellement, déjouez les pièges éliminatoires et structurez vos réponses gagnantes.' 
              : 'Understand what examiners really evaluate, avoid disqualifying traps, and craft winning answers.'}
          </p>
        </div>

        {/* Bannière de statut d'accès épurée */}
        {hasPremiumAccess ? (
          <div className="p-4 sm:p-5 rounded-2xl bg-white border border-emerald-200 flex items-center justify-between gap-3 shadow-xs">
            <div className="flex items-center gap-3">
              <span className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                <CheckCircle2 className="w-5 h-5" />
              </span>
              <div className="text-xs">
                <span className="font-bold text-slate-900 block text-sm">
                  {language === 'fr' ? 'Accès Complet Débloqué' : 'Full Access Unlocked'}
                </span>
                <span className="text-slate-500 text-xs">
                  {language === 'fr' 
                    ? 'Vous bénéficiez de l\'intégralité des 50 questions, intentions cachées et argumentaires modèles.' 
                    : 'You have unlimited access to all 50 questions, jury insights, and model answers.'}
                </span>
              </div>
            </div>
            <span className="hidden sm:inline-flex px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 border border-emerald-200 text-emerald-700">
              {language === 'fr' ? 'Pack Actif' : 'Active Pack'}
            </span>
          </div>
        ) : (
          <div className="p-4 sm:p-5 rounded-2xl bg-white border border-slate-200/90 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm">
            <div className="flex items-center gap-3.5">
              <span className="w-10 h-10 rounded-2xl bg-blue-50 border border-blue-100 text-[#0066FF] flex items-center justify-center shrink-0">
                <Lock className="w-5 h-5" />
              </span>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-slate-900">
                    {language === 'fr' ? 'Aperçu Libre Disponible' : 'Free Preview Available'}
                  </span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-[#0066FF] border border-blue-200">
                    {language === 'fr' ? '2 questions offertes' : '2 free questions'}
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  {language === 'fr' 
                    ? 'Débloquez les 50 questions clés et réponses modèles avec le Pack Réussite ou Intensif.' 
                    : 'Unlock all 50 key questions and model answers with Success or Intensive Pack.'}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setRechargeModalOpen(true)}
              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-[#0066FF] hover:bg-[#0052CC] text-white font-bold text-xs shadow-md shadow-blue-500/25 transition whitespace-nowrap active:scale-95 cursor-pointer"
            >
              <Zap className="w-3.5 h-3.5" />
              <span>{language === 'fr' ? "Débloquer l'accès complet" : 'Unlock Full Access'}</span>
            </button>
          </div>
        )}

        {/* Barre de recherche & Filtres modernes */}
        <div className="space-y-3">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder={language === 'fr' ? 'Rechercher une question, un thème (projet, garant, notes, plan B...)' : 'Search a question or theme (career, budget, grades, plan B...)'}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:border-[#0066FF] focus:ring-4 focus:ring-blue-500/10 shadow-xs transition"
            />
          </div>

          {/* Onglets de filtrage horizontaux épurés */}
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-1">
            {categories.map((cat) => {
              const isActive = selectedCategory === cat.id;
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition cursor-pointer ${
                    isActive
                      ? 'bg-blue-50 border border-blue-200 text-[#0066FF] font-bold shadow-xs'
                      : 'bg-white border border-slate-200 text-slate-600 hover:text-[#0066FF] hover:border-slate-300'
                  }`}
                >
                  {cat.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Liste des questions */}
        <div className="space-y-2.5">
          {filteredQuestions.length === 0 ? (
            <div className="p-8 text-center rounded-2xl bg-white border border-slate-200 text-slate-500 text-xs">
              {language === 'fr' ? 'Aucune question ne correspond à votre recherche.' : 'No questions match your search.'}
            </div>
          ) : (
            filteredQuestions.map((q: OfficialQuestion, idx: number) => {
              const isExpanded = expandedId === q.id;
              const isSampleFreeQuestion = idx < 2;
              const isLockedForUser = !hasPremiumAccess && !isSampleFreeQuestion;

              return (
                <div
                  key={q.id}
                  className={`rounded-2xl transition-all border ${
                    isExpanded 
                      ? 'bg-white border-blue-200 shadow-md' 
                      : 'bg-white border-slate-200/90 hover:border-slate-300 shadow-xs'
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => toggleExpand(q.id)}
                    className="w-full p-4 sm:p-5 flex items-start justify-between gap-3 text-left transition"
                  >
                    <div className="flex items-start gap-3 min-w-0">
                      <span className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold shrink-0 mt-0.5 ${
                        isLockedForUser
                          ? 'bg-slate-100 text-slate-500 border border-slate-200'
                          : 'bg-blue-50 text-[#0066FF] border border-blue-100'
                      }`}>
                        {isLockedForUser ? <Lock className="w-3.5 h-3.5 text-slate-400" /> : String(idx + 1).padStart(2, '0')}
                      </span>

                      <div className="min-w-0">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">
                            {q.categoryLabel}
                          </span>
                          {isSampleFreeQuestion && !hasPremiumAccess && (
                            <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-emerald-50 text-emerald-600 border border-emerald-200">
                              {language === 'fr' ? 'Exemple Libre' : 'Free Preview'}
                            </span>
                          )}
                          {isLockedForUser && (
                            <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-slate-100 text-slate-500 border border-slate-200">
                              {language === 'fr' ? 'Pack Requis' : 'Pack Required'}
                            </span>
                          )}
                        </div>
                        <h2 className="text-xs sm:text-sm font-bold text-slate-900 leading-snug">
                          {q.question}
                        </h2>
                      </div>
                    </div>

                    <div className="text-slate-400 shrink-0 mt-1">
                      {isExpanded ? <ChevronUp className="w-4 h-4 text-[#0066FF]" /> : <ChevronDown className="w-4 h-4" />}
                    </div>
                  </button>

                  {isExpanded && (
                    isLockedForUser ? (
                      /* Paywall épuré, compact et élégant */
                      <div className="px-4 pb-4 pt-1 border-t border-slate-100">
                        <div className="p-4 sm:p-6 rounded-2xl bg-slate-50 border border-slate-200 text-center space-y-3">
                          <div className="w-10 h-10 rounded-2xl bg-blue-50 border border-blue-100 text-[#0066FF] mx-auto flex items-center justify-center">
                            <Lock className="w-5 h-5" />
                          </div>
                          <div className="max-w-md mx-auto space-y-1">
                            <h3 className="text-xs sm:text-sm font-bold text-slate-900">
                              {language === 'fr' ? 'Réponse Modèle & Analyse Piège Réservées' : 'Model Answer & Trap Analysis Reserved'}
                            </h3>
                            <p className="text-xs text-slate-500 leading-relaxed">
                              {language === 'fr' 
                                ? 'Cette question consulaire stratégique et son argumentation modèle sont débloquées avec le Pack Réussite ou Intensif.' 
                                : 'This consular question and winning answer template are unlocked with the Success or Intensive Pack.'}
                            </p>
                          </div>
                          <div className="flex flex-col sm:flex-row items-center justify-center gap-2.5 pt-1">
                            <button
                              type="button"
                              onClick={() => setRechargeModalOpen(true)}
                              className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-5 py-2.5 rounded-xl bg-[#0066FF] hover:bg-[#0052CC] text-white font-bold text-xs shadow-md shadow-blue-500/25 transition active:scale-95 cursor-pointer"
                            >
                              <Zap className="w-3.5 h-3.5" />
                              <span>{language === 'fr' ? 'Débloquer (5 000 F / ~7,5 €)' : 'Unlock (5,000 CFA)'}</span>
                            </button>
                            <Link
                              href="/tarifs"
                              className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 text-xs font-semibold shadow-xs transition"
                            >
                              {language === 'fr' ? 'Voir toutes les offres' : 'View all pricing packs'}
                            </Link>
                          </div>
                        </div>
                      </div>
                    ) : (
                      /* Contenu complet débloqué épuré */
                      <div className="px-4 pb-4 pt-1 border-t border-slate-100 space-y-2.5 text-xs">
                        {/* Intention du jury */}
                        <div className="p-3.5 rounded-xl bg-blue-50/70 border border-blue-100 space-y-1">
                          <div className="flex items-center gap-1.5 font-bold text-[#0066FF] text-[10px] uppercase tracking-wider">
                            <Target className="w-3.5 h-3.5" />
                            <span>{language === 'fr' ? 'Ce que le jury vérifie' : 'What the jury tests'}</span>
                          </div>
                          <p className="text-slate-700 text-xs leading-relaxed">
                            {q.hiddenIntent}
                          </p>
                        </div>

                        {/* Piège fréquent */}
                        <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 space-y-1">
                          <div className="flex items-center gap-1.5 font-bold text-rose-700 text-[10px] uppercase tracking-wider">
                            <AlertTriangle className="w-3.5 h-3.5 text-rose-500" />
                            <span>{language === 'fr' ? 'Le piège éliminatoire à éviter' : 'Disqualifying trap to avoid'}</span>
                          </div>
                          <p className="text-xs text-rose-900/90 leading-relaxed">
                            {q.trapToAvoid}
                          </p>
                        </div>

                        {/* Réponse recommandée */}
                        <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 space-y-1">
                          <div className="flex items-center gap-1.5 font-bold text-emerald-700 text-[10px] uppercase tracking-wider">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                            <span>{language === 'fr' ? 'Argumentation modèle recommandée' : 'Recommended model answer'}</span>
                          </div>
                          <p className="text-slate-800 text-xs italic leading-relaxed">
                            « {q.recommendedResponse} »
                          </p>
                        </div>

                        {/* Règle d'or */}
                        <div className="flex items-start gap-2 pt-1 px-1 text-xs text-slate-500">
                          <Lightbulb className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                          <span>
                            <strong className="text-slate-800 font-bold">{language === 'fr' ? 'Règle d\'or :' : 'Golden Rule:'}</strong> {q.keyAdvice}
                          </span>
                        </div>
                      </div>
                    )
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Appel à l'action simulation épuré */}
        <div className="p-6 sm:p-7 rounded-3xl bg-white border border-slate-200/90 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-5">
          <div className="text-center sm:text-left">
            <h2 className="text-base sm:text-lg font-bold text-slate-900">
              {language === 'fr' ? 'Prêt(e) à tester vos réponses à l\'oral ?' : 'Ready to practice your answers aloud?'}
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              {language === 'fr' 
                ? 'Passez une simulation de 5 minutes face à l\'examinatrice IA vocale avec rapport instantané.' 
                : 'Take a 5-minute practice interview with the Voice AI jury and get an instant report.'}
            </p>
          </div>
          <Link
            href="/entretien/preparation"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-[#0066FF] hover:bg-[#0052CC] text-white font-bold text-xs sm:text-sm shadow-md shadow-blue-500/25 transition whitespace-nowrap active:scale-95"
          >
            <span>{language === 'fr' ? 'Démarrer un entretien' : 'Start an interview'}</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </main>

      {/* Modale de paiement Mobile Money directe */}
      <MobileMoneyModal
        isOpen={rechargeModalOpen}
        onClose={() => setRechargeModalOpen(false)}
        defaultPackId="pack_reussite"
        onPaymentSuccess={() => {
          setHasPremiumAccess(true);
          try {
            localStorage.setItem('campus_france_premium_questions', 'true');
          } catch {
            // Ignorer
          }
        }}
      />
    </div>
  );
}
