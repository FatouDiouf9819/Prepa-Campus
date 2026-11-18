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

      <header className="sticky top-0 z-40 w-full border-b border-white/10 bg-[#05070E]/90 backdrop-blur-xl text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-14 sm:h-16 flex items-center justify-between">
          {/* Logo & Marque */}
          <Link href="/" prefetch={true} className="flex items-center gap-2.5 group">
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-gradient-to-tr from-[#0066FF] to-[#38BDF8] flex items-center justify-center text-white shadow-md shadow-blue-500/25 group-hover:scale-105 transition-transform">
              <GraduationCap className="w-5 h-5 text-white" />
            </div>
            <div>
              <span className="font-extrabold text-white text-base tracking-tight block">
                Prépa<span className="text-[#38BDF8]">Campus</span>
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
                      ? 'bg-blue-500/20 text-[#38BDF8] border border-blue-500/30 shadow-xs'
                      : 'text-slate-300 hover:text-white hover:bg-white/10'
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
            <div className="flex items-center rounded-xl bg-[#121827] border border-white/10 p-0.5 text-xs font-semibold mr-1">
              <button
                type="button"
                onClick={() => setLanguage('fr')}
                className={`px-2 py-1 rounded-lg transition text-[11px] font-bold ${
                  language === 'fr'
                    ? 'bg-[#0066FF] text-white shadow-xs'
                    : 'text-slate-400 hover:text-white'
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
                    ? 'bg-[#0066FF] text-white shadow-xs'
                    : 'text-slate-400 hover:text-white'
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
                  prefetch={true}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-white/5 border border-white/15 text-xs font-semibold text-slate-200 hover:bg-white/10 shadow-xs transition"
                >
                  <User className="w-3.5 h-3.5 text-[#38BDF8]" />
                  {t('nav.profile')}
                </Link>
                <button
                  type="button"
                  onClick={handleSignOut}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 hover:bg-rose-500/10 text-slate-400 hover:text-rose-400 border border-white/15 hover:border-rose-500/30 text-xs font-semibold shadow-xs transition"
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
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-white/5 border border-white/15 text-xs font-semibold text-slate-200 hover:text-white hover:bg-white/10 shadow-xs transition"
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
            <div className="flex items-center rounded-lg bg-[#121827] border border-white/10 p-0.5 text-[10px] font-bold">
              <button
                type="button"
                onClick={() => setLanguage('fr')}
                className={`px-2 py-0.5 rounded transition ${
                  language === 'fr'
                    ? 'bg-[#0066FF] text-white shadow-xs'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                FR
              </button>
              <button
                type="button"
                onClick={() => setLanguage('en')}
                className={`px-2 py-0.5 rounded transition ${
                  language === 'en'
                    ? 'bg-[#0066FF] text-white shadow-xs'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                EN
              </button>
            </div>

            {isAuthenticated ? (
              <Link href="/profil" className="relative group">
                <div className="w-8 h-8 rounded-full bg-white/10 border border-white/15 flex items-center justify-center text-xs font-bold text-white shadow-xs">
                  <User className="w-4 h-4 text-[#38BDF8]" />
                </div>
                <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-[#05070E]" />
              </Link>
            ) : (
              <Link
                href="/auth/connexion"
                className="text-xs font-bold text-[#38BDF8] hover:text-white px-1.5 py-1"
              >
                {t('nav.login')}
              </Link>
            )}

            {/* Bouton Hamburger */}
            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              className="p-1.5 rounded-xl bg-white/10 border border-white/15 text-white hover:bg-white/15 transition shadow-xs focus:outline-none"
              aria-label="Ouvrir le menu"
            >
              <Menu className="w-5 h-5 text-white" />
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
            backgroundColor: '#05070E',
            zIndex: 999999,
          }}
          className="flex flex-col justify-between p-6 sm:p-8 overflow-y-auto text-white animate-in fade-in duration-200"
        >
          {/* En-tête du menu plein écran */}
          <div className="relative z-10 w-full max-w-[310px] mx-auto flex items-center justify-between pb-4 border-b border-white/10">
            <Link 
              href="/" 
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center gap-2.5 group"
            >
              <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-[#0066FF] to-[#38BDF8] flex items-center justify-center text-white shadow-md shadow-blue-500/25 group-hover:scale-105 transition-transform">
                <GraduationCap className="w-4 h-4 text-white" />
              </div>
              <span className="font-extrabold text-white text-base tracking-tight">
                Prépa<span className="text-[#38BDF8]">Campus</span>
              </span>
            </Link>

            <button
              type="button"
              onClick={() => setMobileMenuOpen(false)}
              className="p-1.5 rounded-xl bg-white/10 border border-white/15 text-slate-300 hover:text-white shadow-xs transition"
              aria-label="Fermer le menu"
            >
              <X className="w-4 h-4 text-white" />
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
                      ? 'bg-blue-500/20 text-[#38BDF8] border border-blue-500/30 shadow-sm'
                      : isTarget
                      ? 'bg-[#0066FF] text-white border border-[#38BDF8] shadow-sm'
                      : 'text-slate-200 hover:bg-white/10 hover:text-white border border-white/10 bg-[#0D121F] shadow-xs'
                  }`}
                >
                  <div className="flex items-center gap-3.5 pl-1">
                    {link.icon && <link.icon className="w-4 h-4 text-[#38BDF8] shrink-0" />}
                    <span>{link.label}</span>
                  </div>
                  {isActive && (
                    <span className="w-2 h-2 rounded-full bg-[#38BDF8] mr-1" />
                  )}
                  {isTarget && !isActive && (
                    <span className="w-3.5 h-3.5 border-2 border-[#38BDF8] border-t-transparent rounded-full animate-spin mr-1" />
                  )}
                </Link>
              );
            })}
          </div>

          {/* Pied du menu */}
          <div className="relative z-10 w-full max-w-[315px] mx-auto pt-4 border-t border-white/10">
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
                  className="inline-flex items-center justify-center gap-1.5 py-3 rounded-xl bg-white/10 border border-white/15 text-xs font-semibold text-slate-200 hover:bg-white/15 shadow-xs transition"
                >
                  <User className="w-3.5 h-3.5 text-[#38BDF8]" />
                  {t('nav.profile')}
                </Link>
                <button
                  type="button"
                  onClick={handleSignOut}
                  className="inline-flex items-center justify-center gap-1.5 py-3 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-400 text-xs font-semibold hover:bg-rose-500/20 transition"
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
                  className="w-full text-center py-3 rounded-xl bg-white/10 border border-white/15 text-white text-xs font-bold hover:bg-white/15 shadow-xs transition"
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
