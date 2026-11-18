'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { 
  GraduationCap, 
  User, 
  LayoutDashboard, 
  History, 
  LogOut, 
  LogIn, 
  Menu, 
  X,
  Home,
  CreditCard,
  BookOpen
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { createPortal } from 'react-dom';
import { useLanguage } from '@/lib/i18n/LanguageContext';

export function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const { language, setLanguage, t } = useLanguage();
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  const [navigatingTo, setNavigatingTo] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Précharger proactivement les routes principales pour une navigation 100% instantanée sans escale
  useEffect(() => {
    router.prefetch('/');
    router.prefetch('/dashboard');
    router.prefetch('/profil');
    router.prefetch('/historique');
    router.prefetch('/tarifs');
    router.prefetch('/questions');
  }, [router]);

  useEffect(() => {
    const supabase = createClient();

    // Vérifier l'état initial
    supabase.auth.getUser().then(({ data: { user } }) => {
      setIsAuthenticated(!!user);
    });

    // Écouter les changements d'état (connexion/déconnexion)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setIsAuthenticated(!!session?.user);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // Bloquer le défilement de l'arrière-plan quand le menu mobile est ouvert
  useEffect(() => {
    if (mobileMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [mobileMenuOpen]);

  // Fermer le menu mobile et réinitialiser l'état de navigation dès que la route cible est active
  useEffect(() => {
    setMobileMenuOpen(false);
    setNavigatingTo(null);
  }, [pathname]);

  const handleSignOut = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    setIsAuthenticated(false);
    setMobileMenuOpen(false);
    router.push('/auth/connexion');
    router.refresh();
  };

  const navLinks = isAuthenticated
    ? [
        { href: '/', label: t('nav.home'), icon: Home },
        { href: '/dashboard', label: t('nav.dashboard'), icon: LayoutDashboard },
        { href: '/historique', label: t('nav.history'), icon: History },
        { href: '/questions', label: t('nav.questions'), icon: BookOpen },
        { href: '/tarifs', label: t('nav.pricing'), icon: CreditCard },
      ]
    : [
        { href: '/', label: t('nav.home'), icon: Home },
        { href: '/questions', label: t('nav.questions'), icon: BookOpen },
        { href: '/tarifs', label: t('nav.pricing'), icon: CreditCard },
      ];

  return (
    <>
      {/* Barre de progression fluide lors des changements de page */}
      {navigatingTo && (
        <div className="fixed top-0 left-0 right-0 h-0.5 bg-[#0066FF] z-[9999999] animate-pulse" />
      )}

      <header className="sticky top-0 z-40 w-full border-b border-blue-100/60 bg-[#F8F9FE]/95 backdrop-blur-md text-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-14 sm:h-16 flex items-center justify-between">
          {/* Logo & Marque */}
          <Link href="/" prefetch={true} className="flex items-center gap-2.5 group">
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-gradient-to-tr from-[#0066FF] to-[#38BDF8] flex items-center justify-center text-white shadow-md shadow-blue-500/25 group-hover:scale-105 transition-transform">
              <GraduationCap className="w-5 h-5 text-white" />
            </div>
            <div>
              <span className="font-extrabold text-slate-900 text-base tracking-tight block">
                Prépa<span className="text-[#0066FF]">Campus</span>
              </span>
              <span className="text-[10px] text-slate-400 block -mt-1 font-medium hidden sm:block">
                {t('nav.tagline')}
              </span>
            </div>
          </Link>

          {/* Liens Desktop avec préchargement instantané */}
          <nav className="hidden md:flex items-center gap-1 sm:gap-1.5">
            {navLinks.map((link) => {
              const isActive = pathname === link.href;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  prefetch={true}
                  onClick={() => {
                    if (pathname !== link.href) {
                      setNavigatingTo(link.href);
                    }
                  }}
                  className={`px-3 py-1.5 rounded-xl text-xs sm:text-sm font-semibold transition flex items-center gap-1.5 ${
                    isActive
                      ? 'bg-blue-50 text-[#0066FF] border border-blue-200/80 shadow-xs'
                      : 'text-slate-600 hover:text-[#0066FF] hover:bg-white/80'
                  }`}
                >
                  {link.icon && <link.icon className="w-4 h-4" />}
                  {link.label}
                </Link>
              );
            })}
          </nav>

          {/* Section Droite Desktop */}
          <div className="hidden md:flex items-center gap-2">
            {/* Sélecteur de Langue FR / EN */}
            <div className="flex items-center rounded-xl bg-slate-100/80 border border-slate-200/80 p-0.5 text-xs font-semibold mr-1">
              <button
                type="button"
                onClick={() => setLanguage('fr')}
                className={`px-2 py-1 rounded-lg transition text-[11px] font-bold ${
                  language === 'fr'
                    ? 'bg-white text-[#0066FF] shadow-xs'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
                title="Passer en Français"
              >
                🇫🇷 FR
              </button>
              <button
                type="button"
                onClick={() => setLanguage('en')}
                className={`px-2 py-1 rounded-lg transition text-[11px] font-bold ${
                  language === 'en'
                    ? 'bg-white text-[#0066FF] shadow-xs'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
                title="Switch to English"
              >
                🇬🇧 EN
              </button>
            </div>

            {isAuthenticated === true ? (
              <>
                <Link
                  href="/profil"
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-white border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 shadow-xs transition"
                >
                  <User className="w-3.5 h-3.5 text-[#0066FF]" />
                  {t('nav.profile')}
                </Link>
                <button
                  type="button"
                  onClick={handleSignOut}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white hover:bg-rose-50 text-slate-500 hover:text-rose-600 border border-slate-200 hover:border-rose-200 text-xs font-semibold shadow-xs transition"
                  title={t('nav.signout')}
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>{t('nav.signout')}</span>
                </button>
              </>
            ) : isAuthenticated === false ? (
              <>
                <Link
                  href="/auth/connexion"
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-white border border-slate-200 text-xs font-semibold text-slate-700 hover:text-slate-900 hover:bg-slate-50 shadow-xs transition"
                >
                  <LogIn className="w-3.5 h-3.5 text-slate-400" />
                  {t('nav.login')}
                </Link>
                <Link
                  href="/auth/inscription"
                  className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-[#0066FF] hover:bg-[#0052CC] text-white font-bold text-xs shadow-md shadow-blue-500/25 transition"
                >
                  {t('nav.start')}
                </Link>
              </>
            ) : null}
          </div>

          {/* Section Droite Mobile : Langue + Avatar / Connexion + Menu Hamburger */}
          <div className="flex md:hidden items-center gap-2">
            {/* Toggle FR / EN rapide sur mobile */}
            <div className="flex items-center rounded-lg bg-slate-100 border border-slate-200/80 p-0.5 text-[10px] font-bold">
              <button
                type="button"
                onClick={() => setLanguage('fr')}
                className={`px-2 py-0.5 rounded transition ${
                  language === 'fr'
                    ? 'bg-white text-[#0066FF] shadow-xs'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                FR
              </button>
              <button
                type="button"
                onClick={() => setLanguage('en')}
                className={`px-2 py-0.5 rounded transition ${
                  language === 'en'
                    ? 'bg-white text-[#0066FF] shadow-xs'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                EN
              </button>
            </div>

            {isAuthenticated ? (
              <Link href="/profil" className="relative group">
                <div className="w-8 h-8 rounded-full bg-white border border-slate-200 flex items-center justify-center text-xs font-bold text-slate-700 shadow-xs">
                  <User className="w-4 h-4 text-[#0066FF]" />
                </div>
                <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-white" />
              </Link>
            ) : (
              <Link
                href="/auth/connexion"
                className="text-xs font-bold text-[#0066FF] hover:text-[#0052CC] px-1.5 py-1"
              >
                {t('nav.login')}
              </Link>
            )}

            {/* Bouton Hamburger */}
            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              className="p-1.5 rounded-xl bg-white border border-slate-200 text-slate-700 hover:text-slate-900 transition shadow-xs focus:outline-none"
              aria-label="Ouvrir le menu"
            >
              <Menu className="w-5 h-5 text-slate-700" />
            </button>
          </div>
        </div>
      </header>

      {/* Menu Mobile Plein Écran (Attaché directement à document.body via Portal) */}
      {mounted && mobileMenuOpen && typeof document !== 'undefined' && createPortal(
        <div 
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            width: '100vw',
            height: '100dvh',
            backgroundColor: '#F8F9FE',
            zIndex: 999999,
          }}
          className="flex flex-col justify-between p-6 sm:p-8 overflow-y-auto text-slate-800 animate-in fade-in duration-200"
        >
          {/* En-tête du menu plein écran */}
          <div className="relative z-10 w-full max-w-[310px] mx-auto flex items-center justify-between pb-4 border-b border-slate-200/80">
            <Link 
              href="/" 
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center gap-2.5 group"
            >
              <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-[#0066FF] to-[#38BDF8] flex items-center justify-center text-white shadow-md shadow-blue-500/25 group-hover:scale-105 transition-transform">
                <GraduationCap className="w-4 h-4 text-white" />
              </div>
              <span className="font-extrabold text-slate-900 text-base tracking-tight">
                Prépa<span className="text-[#0066FF]">Campus</span>
              </span>
            </Link>

            <button
              type="button"
              onClick={() => setMobileMenuOpen(false)}
              className="p-1.5 rounded-xl bg-white border border-slate-200 text-slate-500 hover:text-slate-900 shadow-xs transition"
              aria-label="Fermer le menu"
            >
              <X className="w-4 h-4 text-slate-700" />
            </button>
          </div>

          {/* Corps de navigation */}
          <div className="relative z-10 flex-1 flex flex-col justify-center py-6 w-full max-w-[315px] mx-auto space-y-2.5">
            {navLinks.map((link) => {
              const isActive = pathname === link.href;
              const isTarget = navigatingTo === link.href;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  prefetch={true}
                  onClick={() => {
                    setMobileMenuOpen(false);
                    if (pathname !== link.href) {
                      setNavigatingTo(link.href);
                      setTimeout(() => setNavigatingTo(null), 800);
                    }
                  }}
                  className={`flex items-center justify-between px-5 py-3.5 rounded-2xl text-[15px] font-semibold transition active:scale-[0.98] ${
                    isActive
                      ? 'bg-blue-50 text-[#0066FF] border border-blue-200/90 shadow-sm'
                      : isTarget
                      ? 'bg-white text-[#0066FF] border border-[#0066FF] shadow-sm'
                      : 'text-slate-700 hover:bg-white hover:text-[#0066FF] border border-slate-200/80 bg-white/70 shadow-xs'
                  }`}
                >
                  <div className="flex items-center gap-3.5 pl-1">
                    {link.icon && <link.icon className="w-4 h-4 text-[#0066FF] shrink-0" />}
                    <span>{link.label}</span>
                  </div>
                  {isActive && (
                    <span className="w-2 h-2 rounded-full bg-[#0066FF] mr-1" />
                  )}
                  {isTarget && !isActive && (
                    <span className="w-3.5 h-3.5 border-2 border-[#0066FF] border-t-transparent rounded-full animate-spin mr-1" />
                  )}
                </Link>
              );
            })}
          </div>

          {/* Pied du menu */}
          <div className="relative z-10 w-full max-w-[315px] mx-auto pt-4 border-t border-slate-200/80">
            {isAuthenticated ? (
              <div className="grid grid-cols-2 gap-2.5">
                <Link
                  href="/profil"
                  prefetch={true}
                  onClick={() => {
                    setMobileMenuOpen(false);
                    if (pathname !== '/profil') {
                      setNavigatingTo('/profil');
                      setTimeout(() => setNavigatingTo(null), 800);
                    }
                  }}
                  className="inline-flex items-center justify-center gap-1.5 py-3 rounded-xl bg-white border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 shadow-xs transition"
                >
                  <User className="w-3.5 h-3.5 text-[#0066FF]" />
                  {t('nav.profile')}
                </Link>
                <button
                  type="button"
                  onClick={handleSignOut}
                  className="inline-flex items-center justify-center gap-1.5 py-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-600 text-xs font-semibold hover:bg-rose-100 transition"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  {t('nav.signout')}
                </button>
              </div>
            ) : (
              <div className="flex flex-col gap-2.5">
                <Link
                  href="/auth/connexion"
                  prefetch={true}
                  onClick={() => {
                    setMobileMenuOpen(false);
                    if (pathname !== '/auth/connexion') {
                      setNavigatingTo('/auth/connexion');
                      setTimeout(() => setNavigatingTo(null), 800);
                    }
                  }}
                  className="w-full text-center py-3 rounded-xl bg-white border border-slate-200 text-slate-700 text-xs font-bold hover:bg-slate-50 shadow-xs transition"
                >
                  {t('nav.login')}
                </Link>
                <Link
                  href="/auth/inscription"
                  prefetch={true}
                  onClick={() => {
                    setMobileMenuOpen(false);
                    if (pathname !== '/auth/inscription') {
                      setNavigatingTo('/auth/inscription');
                      setTimeout(() => setNavigatingTo(null), 800);
                    }
                  }}
                  className="w-full text-center py-3 rounded-xl bg-[#0066FF] hover:bg-[#0052CC] text-white text-xs font-bold shadow-md shadow-blue-500/25 transition"
                >
                  {t('nav.signup')}
                </Link>
              </div>
            )}
          </div>
        </div>,
        document.body
      )}
    </>
  );
}
