'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Navbar } from '@/components/navigation/Navbar';
import { MobileMoneyModal } from '@/components/payments/MobileMoneyModal';
import { PRICING_PACKS } from '@/config/pricing';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import { createClient } from '@/lib/supabase/client';
import { 
  CheckCircle2, 
  ArrowRight, 
  CreditCard, 
  HelpCircle,
  Sparkles,
  ShieldCheck,
  Smartphone,
  Lock,
  ChevronDown,
  MessageSquare,
  GraduationCap
} from 'lucide-react';

export default function TarifsPage() {
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedPackId, setSelectedPackId] = useState<string>('pack_reussite');
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(0);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const { language, t } = useLanguage();

  useEffect(() => {
    try {
      const supabase = createClient();
      supabase.auth.getUser().then(({ data }) => {
        if (data?.user) setIsLoggedIn(true);
      });
    } catch {
      // Ignorer
    }
  }, []);

  const handleOpenRecharge = (packId: string) => {
    setSelectedPackId(packId);
    setModalOpen(true);
  };

  const faqItems = [
    {
      q: t('pricing.q1_q'),
      a: t('pricing.q1_a'),
    },
    {
      q: t('pricing.q2_q'),
      a: t('pricing.q2_a'),
    },
    {
      q: t('pricing.q3_q'),
      a: t('pricing.q3_a'),
    },
    {
      q: t('pricing.q4_q'),
      a: t('pricing.q4_a'),
    },
  ];

  return (
    <div className="min-h-screen bg-[#05070E] flex flex-col text-slate-100 font-sans">
      <Navbar />

      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-16 space-y-10">
        {/* Barre de retour rapide vers la simulation pour les candidats */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-4 rounded-2xl bg-[#0D121F] border border-blue-500/30 shadow-lg">
          <div className="flex items-center gap-3 text-xs sm:text-sm text-slate-200">
            <span className="w-8 h-8 rounded-xl bg-blue-500/20 border border-blue-500/30 text-cyan-400 flex items-center justify-center shrink-0">
              <Sparkles className="w-4 h-4" />
            </span>
            <span>
              {language === 'fr' 
                ? 'Prêt à vous entraîner ou vous avez déjà vos simulations ?' 
                : 'Ready to practice or already have your simulations?'}
            </span>
          </div>
          <Link
            href="/entretien/preparation"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-[#0066FF] hover:bg-[#0052CC] text-white font-bold text-xs sm:text-sm shadow-md shadow-blue-500/30 transition active:scale-95"
          >
            <span>{language === 'fr' ? 'Retourner à la simulation' : 'Return to simulation'}</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        {/* En-tête Hero Épuré & Élégant */}
        <div className="text-center max-w-2xl mx-auto space-y-3">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-500/15 border border-blue-500/30 text-[#38BDF8] text-xs font-semibold">
            <Sparkles className="w-3.5 h-3.5" />
            <span>{language === 'fr' ? 'Formules d\'Entraînement Campus France' : 'Campus France Interview Packs'}</span>
          </div>

          <h1 className="text-2xl sm:text-4xl font-black text-white tracking-tight">
            {language === 'fr' ? 'Tarifs Clairs, Conçus pour Votre Réussite' : 'Simple Pricing Designed for Your Success'}
          </h1>

          <p className="text-xs sm:text-sm text-slate-400 leading-relaxed max-w-lg mx-auto">
            {language === 'fr' 
              ? 'Choisissez la formule adaptée à votre calendrier. Sans abonnement, vos simulations restent valables sans limite de temps.'
              : 'Choose the pack tailored to your timeline. No recurring subscription, your interview credits never expire.'}
          </p>
        </div>

        {/* Grille des 4 Formules */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 items-stretch">
          {PRICING_PACKS.map((pack) => {
            const isPopular = pack.popular;
            const isFree = pack.priceCFA === 0;

            const packName = language === 'en' && pack.nameEn ? pack.nameEn : pack.name;
            const packDesc = language === 'en' && pack.descriptionEn ? pack.descriptionEn : pack.description;
            const packBadge = language === 'en' && pack.badgeEn ? pack.badgeEn : pack.badge;
            const packFeatures = language === 'en' && pack.featuresEn ? pack.featuresEn : pack.features;

            return (
              <div
                key={pack.id}
                className={`rounded-3xl p-6 flex flex-col justify-between transition-all relative ${
                  isPopular
                    ? 'bg-[#0D121F] border-2 border-[#0066FF] shadow-2xl shadow-blue-500/10 scale-102 lg:-translate-y-1.5'
                    : 'bg-[#0D121F] border border-white/10 hover:border-white/20 shadow-sm'
                }`}
              >
                {packBadge && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <span
                      className={`text-[10px] font-extrabold uppercase tracking-wider px-3 py-1 rounded-full shadow-md ${
                        isPopular
                          ? 'bg-[#0066FF] text-white shadow-blue-500/25'
                          : 'bg-white/10 text-slate-200 border border-white/15'
                      }`}
                    >
                      {packBadge}
                    </span>
                  </div>
                )}

                <div>
                  <div className="text-base font-bold text-white mb-1">{packName}</div>
                  <p className="text-xs text-slate-400 min-h-[34px] leading-relaxed">{packDesc}</p>

                  <div className="my-5 pb-5 border-b border-white/10">
                    <div className="flex items-baseline gap-1.5">
                      <span className="text-3xl sm:text-4xl font-extrabold text-white">
                        {isFree ? '0' : pack.priceCFA.toLocaleString(language === 'fr' ? 'fr-FR' : 'en-US')}
                      </span>
                      <span className="text-xs font-bold text-slate-400">
                        {isFree ? t('pricing.cfa') : t('pricing.cfa')}
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-400 mt-1 font-medium">
                      {isFree ? t('pricing.no_commitment') : `${t('pricing.approx')} ${pack.priceEUR} €`}
                    </div>
                  </div>

                  <ul className="space-y-3 text-xs text-slate-300 mb-6">
                    {packFeatures.map((feature, idx) => (
                      <li key={idx} className="flex items-start gap-2.5">
                        <CheckCircle2 className={`w-4 h-4 shrink-0 mt-0.5 ${isPopular ? 'text-[#38BDF8]' : 'text-emerald-400'}`} />
                        <span className="leading-snug">{feature}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div>
                  {isFree ? (
                    isLoggedIn ? (
                      <Link
                        href="/entretien/preparation"
                        prefetch={true}
                        className="w-full inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition active:scale-95 shadow-md shadow-emerald-500/20"
                      >
                        <span>{language === 'fr' ? 'Lancer ma simulation' : 'Start my simulation'}</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </Link>
                    ) : (
                      <Link
                        href="/auth/inscription"
                        prefetch={true}
                        className="w-full inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-white/10 hover:bg-white/15 text-white font-bold text-xs border border-white/15 transition active:scale-95"
                      >
                        {t('pricing.create_account')}
                        <ArrowRight className="w-3.5 h-3.5" />
                      </Link>
                    )
                  ) : (
                    <button
                      type="button"
                      onClick={() => handleOpenRecharge(pack.id)}
                      className={`w-full inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-bold text-xs transition shadow-md active:scale-95 cursor-pointer ${
                        isPopular
                          ? 'bg-[#0066FF] hover:bg-[#0052CC] text-white shadow-blue-500/30'
                          : 'bg-white/10 hover:bg-white/15 text-white border border-white/15 shadow-xs'
                      }`}
                    >
                      <CreditCard className="w-3.5 h-3.5 text-current" />
                      <span>{t('pricing.recharge_btn')}</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Section Paiement Épurée */}
        <div className="p-6 sm:p-8 rounded-3xl bg-[#0D121F] border border-white/10 shadow-sm space-y-6">
          <div className="text-center max-w-xl mx-auto space-y-1.5">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-xs font-semibold">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span>{language === 'fr' ? 'Paiement Sécurisé & Activation Immédiate' : 'Secure Payment & Instant Access'}</span>
            </div>
            <h3 className="text-base sm:text-xl font-bold text-white">
              {language === 'fr' ? 'Moyens de Paiement Disponibles' : 'Accepted Payment Methods'}
            </h3>
            <p className="text-xs text-slate-400">
              {language === 'fr' 
                ? 'Réglez simplement par carte bancaire ou via votre opérateur Mobile Money habituel.' 
                : 'Pay conveniently by credit card or through your preferred local Mobile Money wallet.'}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
            {/* Bloc 1 : Cartes Bancaires */}
            <div className="p-4 sm:p-5 rounded-2xl bg-[#121827] border border-white/10 flex items-start gap-4">
              <span className="w-10 h-10 rounded-xl bg-blue-500/15 border border-blue-500/25 text-[#38BDF8] flex items-center justify-center shrink-0 mt-0.5">
                <CreditCard className="w-5 h-5" />
              </span>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <h4 className="text-xs sm:text-sm font-bold text-white">
                    {language === 'fr' ? 'Cartes Bancaires Internationales' : 'International Bank Cards'}
                  </h4>
                  <span className="px-2 py-0.5 rounded text-[9px] font-bold bg-white/10 text-slate-300 border border-white/15">
                    Visa • Mastercard
                  </span>
                </div>
                <p className="text-xs text-slate-400 leading-relaxed">
                  {language === 'fr'
                    ? 'Disponible au Sénégal, Côte d\'Ivoire, Cameroun, Bénin, France, Europe et dans le monde entier.'
                    : 'Available in Senegal, Ivory Coast, Cameroon, Benin, France, Europe, and worldwide.'}
                </p>
              </div>
            </div>

            {/* Bloc 2 : Mobile Money */}
            <div className="p-4 sm:p-5 rounded-2xl bg-[#121827] border border-white/10 flex items-start gap-4">
              <span className="w-10 h-10 rounded-xl bg-emerald-500/15 border border-emerald-500/25 text-emerald-400 flex items-center justify-center shrink-0 mt-0.5">
                <Smartphone className="w-5 h-5" />
              </span>
              <div className="space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <h4 className="text-xs sm:text-sm font-bold text-white">
                    {language === 'fr' ? 'Mobile Money & Portefeuilles' : 'Mobile Money & Wallets'}
                  </h4>
                  <span className="px-2 py-0.5 rounded text-[9px] font-bold bg-white/10 text-slate-300 border border-white/15">
                    Wave • Orange • MTN • Free • Moov
                  </span>
                </div>
                <p className="text-xs text-slate-400 leading-relaxed">
                  {language === 'fr'
                    ? 'Sénégal, Côte d\'Ivoire, Cameroun, Mali, Bénin, Togo, Guinée et zone UEMOA / CEMAC.'
                    : 'Senegal, Ivory Coast, Cameroon, Mali, Benin, Togo, Guinea, and WAEMU/CEMAC zones.'}
                </p>
              </div>
            </div>
          </div>

          <div className="text-center pt-1 text-xs text-slate-400 flex items-center justify-center gap-2">
            <Lock className="w-3.5 h-3.5 text-emerald-400" />
            <span>
              {language === 'fr' 
                ? 'Connexion sécurisée SSL 256 bits. Vos crédits sont activés immédiatement après validation.' 
                : '256-bit SSL encrypted checkout. Your credits are unlocked immediately after payment.'}
            </span>
          </div>
        </div>

        {/* Foire Aux Questions (FAQ) */}
        <div className="space-y-6 pt-2">
          <div className="text-center max-w-xl mx-auto space-y-2">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-500/15 border border-blue-500/30 text-[#38BDF8] text-xs font-semibold">
              <HelpCircle className="w-3.5 h-3.5" />
              <span>{t('pricing.faq_title')}</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
              {language === 'fr' ? 'Questions Fréquentes' : 'Frequently Asked Questions'}
            </h2>
            <p className="text-xs text-slate-400 leading-relaxed">
              {t('pricing.faq_subtitle')}
            </p>
          </div>

          {/* Accordéon épuré */}
          <div className="max-w-2xl w-full mx-auto space-y-2.5">
            {faqItems.map((item, idx) => {
              const isOpen = openFaqIndex === idx;
              return (
                <div
                  key={idx}
                  className={`rounded-2xl transition-all border ${
                    isOpen 
                      ? 'bg-[#0D121F] border-blue-500/40 shadow-md ring-1 ring-blue-500/20' 
                      : 'bg-[#0D121F] border-white/10 hover:border-white/20 shadow-xs'
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => setOpenFaqIndex(isOpen ? null : idx)}
                    className="w-full p-4 sm:p-5 flex items-center justify-between gap-3 text-left transition"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span className={`w-7 h-7 rounded-lg text-xs font-bold flex items-center justify-center shrink-0 ${
                        isOpen 
                          ? 'bg-[#0066FF] text-white shadow-xs' 
                          : 'bg-white/10 text-slate-300'
                      }`}>
                        0{idx + 1}
                      </span>
                      <h3 className="text-xs sm:text-sm font-bold text-white leading-snug">
                        {item.q}
                      </h3>
                    </div>

                    <span className={`shrink-0 transition-transform duration-200 text-slate-400 ${isOpen ? 'rotate-180 text-[#38BDF8]' : ''}`}>
                      <ChevronDown className="w-4 h-4" />
                    </span>
                  </button>

                  {isOpen && (
                    <div className="px-5 pb-5 pt-1 text-xs sm:text-sm text-slate-300 leading-relaxed border-t border-white/10">
                      <p className="pl-10">{item.a}</p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Bloc d'assistance direct épuré */}
          <div className="max-w-2xl mx-auto p-4 sm:p-5 rounded-2xl bg-[#0D121F] border border-white/10 flex flex-col sm:flex-row items-center justify-between gap-3.5 text-center sm:text-left shadow-xs">
            <div>
              <h4 className="text-xs sm:text-sm font-bold text-white">
                {language === 'fr' ? 'Une question sur votre préparation ?' : 'Have a question about your preparation?'}
              </h4>
              <p className="text-xs text-slate-400 mt-0.5">
                {language === 'fr' 
                  ? 'Notre équipe pédagogique est disponible pour vous accompagner.' 
                  : 'Our academic advisory team is available to assist you.'}
              </p>
            </div>
            <a
              href="mailto:contact@prepacampus.com"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white/10 hover:bg-white/15 border border-white/15 text-white text-xs font-semibold transition active:scale-95 whitespace-nowrap"
            >
              <MessageSquare className="w-3.5 h-3.5 text-[#38BDF8]" />
              <span>{language === 'fr' ? 'Contacter l\'équipe' : 'Contact Support'}</span>
            </a>
          </div>
        </div>
      </main>

      {/* Modal Recharges (Carte Bancaire & Mobile Money) */}
      <MobileMoneyModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        defaultPackId={selectedPackId}
      />

      {/* Pied de page sobre */}
      <footer className="border-t border-white/10 py-8 text-center text-xs text-slate-400 bg-[#05070E] space-y-3 mt-8">
        <div className="flex items-center justify-center gap-2 text-white font-bold text-sm">
          <div className="w-6 h-6 rounded-lg bg-gradient-to-tr from-[#0066FF] to-[#38BDF8] flex items-center justify-center text-white shadow-xs">
            <GraduationCap className="w-3.5 h-3.5" />
          </div>
          <span>Prépa<span className="text-[#38BDF8]">Campus</span></span>
        </div>

        <p className="max-w-md mx-auto text-[11px] text-slate-400 leading-relaxed px-4">
          {t('pricing.footer')}
        </p>

        <div className="flex items-center justify-center gap-4 text-[11px] text-slate-400 pt-1">
          <Link href="/tarifs" className="hover:text-white transition">
            {language === 'fr' ? 'Tarifs' : 'Pricing'}
          </Link>
          <span>•</span>
          <Link href="/questions" className="hover:text-white transition">
            {language === 'fr' ? 'Questions types' : 'Question Bank'}
          </Link>
          <span>•</span>
          <Link href="/dashboard" className="hover:text-white transition">
            {language === 'fr' ? 'Tableau de bord' : 'Dashboard'}
          </Link>
        </div>
      </footer>
    </div>
  );
}
