'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Navbar } from '@/components/navigation/Navbar';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import { 
  GraduationCap, 
  Mic, 
  FileText, 
  ArrowRight, 
  ShieldCheck, 
  CheckCircle2,
  CreditCard
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { isAcademicProfileComplete } from '@/lib/validations/profile';

export default function HomePage() {
  const { language, t } = useLanguage();
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [isProfileComplete, setIsProfileComplete] = useState<boolean>(false);

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

  return (
    <div className="min-h-screen bg-black flex flex-col text-slate-100 w-full overflow-x-hidden">
      <Navbar />

      <main className="flex-1 w-full overflow-x-hidden">
        {/* Hero Section */}
        <section className="relative overflow-hidden min-h-[calc(100dvh-3.5rem)] sm:min-h-[calc(100dvh-4rem)] flex flex-col justify-between items-center pt-8 pb-4 sm:pt-12 sm:pb-6 px-3 sm:px-6">
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
                href={
                  isAuthenticated
                    ? isProfileComplete
                      ? '/entretien/preparation'
                      : '/profil'
                    : '/auth/connexion'
                }
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

        {/* 3 Piliers de la méthode */}
        <section className="pt-8 pb-16 sm:pt-12 sm:pb-20 border-t border-neutral-900 bg-black">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-8 sm:mb-10">
              <h2 className="text-2xl sm:text-3xl font-bold text-white">{t('home.how_it_works')}</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-[#0e0e0e] border border-neutral-800 rounded-2xl p-6 relative group hover:border-neutral-700 transition">
                <div className="w-12 h-12 rounded-xl bg-cyan-500/10 text-cyan-400 flex items-center justify-center mb-4">
                  <GraduationCap className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-semibold text-white mb-2">{t('home.pillar1_title')}</h3>
                <p className="text-sm text-neutral-400 leading-relaxed">
                  {t('home.pillar1_desc')}
                </p>
              </div>

              <div className="bg-[#0e0e0e] border border-neutral-800 rounded-2xl p-6 relative group hover:border-neutral-700 transition">
                <div className="w-12 h-12 rounded-xl bg-cyan-500/10 text-cyan-400 flex items-center justify-center mb-4">
                  <Mic className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-semibold text-white mb-2">{t('home.pillar2_title')}</h3>
                <p className="text-sm text-neutral-400 leading-relaxed">
                  {t('home.pillar2_desc')}
                </p>
              </div>

              <div className="bg-[#0e0e0e] border border-neutral-800 rounded-2xl p-6 relative group hover:border-neutral-700 transition">
                <div className="w-12 h-12 rounded-xl bg-cyan-500/10 text-cyan-400 flex items-center justify-center mb-4">
                  <FileText className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-semibold text-white mb-2">{t('home.pillar3_title')}</h3>
                <p className="text-sm text-neutral-400 leading-relaxed">
                  {t('home.pillar3_desc')}
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Section Tarifs & Moyens de paiement (Cartes Bancaires + Mobile Money) */}
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
      </main>

      <footer className="border-t border-neutral-900 py-6 text-center text-xs text-neutral-500 bg-black">
        <p>{t('home.footer')}</p>
      </footer>
    </div>
  );
}
