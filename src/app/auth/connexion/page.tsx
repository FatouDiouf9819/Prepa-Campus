'use client';

import React, { useState, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { 
  GraduationCap, 
  Mail, 
  Lock, 
  ArrowRight, 
  Loader2, 
  AlertCircle, 
  ShieldCheck, 
  Sparkles,
  Star 
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useLanguage } from '@/lib/i18n/LanguageContext';

function ConnexionForm() {
  const { language } = useLanguage();
  const router = useRouter();
  const searchParams = useSearchParams();
  const rawRedirect = searchParams.get('redirectTo') || '/dashboard';
  const redirectTo = (rawRedirect.startsWith('/') && !rawRedirect.startsWith('//')) ? rawRedirect : '/dashboard';

  const authCallbackError = searchParams.get('error');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(
    authCallbackError === 'auth_callback_failed'
      ? (language === 'fr'
          ? 'La connexion avec Google a échoué ou a été interrompue. Veuillez réessayer ou vous connecter par email.'
          : 'Google sign-in failed or was interrupted. Please try again or sign in with your email.')
      : null
  );

  const handleGoogleSignIn = async () => {
    setGoogleLoading(true);
    setErrorMessage(null);
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(redirectTo)}`,
        },
      });

      if (error) {
        if (error.message.includes('not enabled') || error.message.includes('Unsupported provider')) {
          setErrorMessage(
            language === 'fr'
              ? "La connexion avec Google n'est pas encore activée sur le projet Supabase (Authentication > Providers > Google). Vous pouvez vous connecter directement par e-mail et mot de passe ci-dessous."
              : "Google sign-in is not yet activated on Supabase (Authentication > Providers > Google). Please sign in using email and password below."
          );
        } else {
          setErrorMessage(error.message);
        }
        setGoogleLoading(false);
      }
    } catch {
      setErrorMessage(
        language === 'fr'
          ? 'Une erreur imprévue est survenue lors de la connexion Google.'
          : 'An unexpected error occurred during Google sign-in.'
      );
      setGoogleLoading(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMessage(null);

    // Timeout de sécurité pour éviter tout blocage infini du bouton
    let isTimedOut = false;
    const safetyTimeout = setTimeout(() => {
      isTimedOut = true;
      setLoading(false);
      setErrorMessage(
        language === 'fr'
          ? 'La connexion prend plus de temps que prévu. Veuillez rafraîchir la page et réessayer.'
          : 'Sign in is taking longer than expected. Please refresh the page and try again.'
      );
    }, 12000);

    try {
      const supabase = createClient();
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      clearTimeout(safetyTimeout);
      if (isTimedOut) return;

      if (error) {
        setErrorMessage(
          error.message === 'Invalid login credentials'
            ? (language === 'fr'
                ? 'Identifiants incorrects. Vérifiez votre adresse email et votre mot de passe.'
                : 'Invalid login credentials. Please check your email and password.')
            : error.message
        );
        setLoading(false);
        return;
      }

      if (data?.user) {
        // Redirection directe par le navigateur pour garantir la transmission fluide des cookies HTTP
        window.location.href = redirectTo;
        return;
      }

      setLoading(false);
    } catch {
      clearTimeout(safetyTimeout);
      if (!isTimedOut) {
        setErrorMessage(
          language === 'fr'
            ? 'Une erreur imprévue est survenue lors de la connexion.'
            : 'An unexpected error occurred during sign-in.'
        );
        setLoading(false);
      }
    }
  };

  return (
    <div className="min-h-screen bg-[#F8F9FE] flex flex-col justify-center py-10 sm:py-16 px-4 sm:px-6 lg:px-8 text-slate-800 font-sans relative">
      {/* Halo lumineux d'arrière-plan */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-4xl h-96 bg-gradient-to-b from-blue-100/60 to-transparent blur-3xl pointer-events-none -z-10" />

      <div className="sm:mx-auto sm:w-full sm:max-w-md relative z-10">
        {/* Logo PrépaCampus */}
        <Link href="/" className="flex items-center justify-center gap-2.5 mb-6 group">
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-[#0066FF] to-[#38BDF8] flex items-center justify-center text-white shadow-lg shadow-blue-500/25 group-hover:scale-105 transition-transform">
            <GraduationCap className="w-6 h-6" />
          </div>
          <span className="font-extrabold text-slate-900 text-2xl tracking-tight">
            Prépa<span className="text-[#0066FF]">Campus</span>
          </span>
        </Link>

        {/* Titre & Sous-titre */}
        <div className="text-center">
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
            {language === 'fr' ? 'Connexion candidat' : 'Candidate sign in'}
          </h1>
          <p className="mt-2 text-xs sm:text-sm text-slate-500 max-w-sm mx-auto">
            {language === 'fr' 
              ? 'Accédez à vos simulations d\'entretien et vos bilans personnalisés.'
              : 'Access your interview simulations and personalized feedback.'}
          </p>
        </div>
      </div>

      <div className="mt-7 sm:mx-auto sm:w-full sm:max-w-md relative z-10">
        <div className="bg-white border border-slate-200/80 rounded-3xl p-6 sm:p-8 shadow-xl shadow-blue-500/5">
          {errorMessage && (
            <div className="mb-5 p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs sm:text-sm flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-500" />
              <span className="leading-relaxed">{errorMessage}</span>
            </div>
          )}

          {/* Connexion 1-Clic Google */}
          <button
            type="button"
            onClick={handleGoogleSignIn}
            disabled={googleLoading || loading}
            className="w-full flex items-center justify-center gap-3 px-4 py-3 rounded-xl bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 font-semibold text-xs sm:text-sm shadow-sm transition-all hover:border-slate-300 disabled:opacity-50 group"
          >
            {googleLoading ? (
              <Loader2 className="w-4 h-4 animate-spin text-[#0066FF]" />
            ) : (
              <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                />
              </svg>
            )}
            <span>{language === 'fr' ? 'Continuer avec Google' : 'Continue with Google'}</span>
          </button>

          <div className="relative my-5">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-200" />
            </div>
            <div className="relative flex justify-center text-xs">
              <span className="bg-white px-3 text-slate-400 font-medium uppercase tracking-wider text-[10px]">
                {language === 'fr' ? 'ou avec votre email' : 'or with email'}
              </span>
            </div>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                {language === 'fr' ? 'Adresse email' : 'Email address'}
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="etudiant@exemple.com"
                  className="w-full pl-10 pr-3.5 py-3 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 text-xs sm:text-sm focus:outline-none focus:bg-white focus:border-[#0066FF] focus:ring-4 focus:ring-blue-500/10 transition-all placeholder:text-slate-400 font-medium"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                {language === 'fr' ? 'Mot de passe' : 'Password'}
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-3.5 py-3 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 text-xs sm:text-sm focus:outline-none focus:bg-white focus:border-[#0066FF] focus:ring-4 focus:ring-blue-500/10 transition-all placeholder:text-slate-400 font-medium"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 inline-flex items-center justify-center gap-2.5 px-6 py-3.5 rounded-xl bg-[#0066FF] hover:bg-[#0052CC] text-white font-bold text-sm shadow-lg shadow-blue-500/25 hover:shadow-blue-500/35 transition-all hover:-translate-y-0.5 disabled:opacity-50 cursor-pointer"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>{language === 'fr' ? 'Connexion en cours...' : 'Signing in...'}</span>
                </>
              ) : (
                <>
                  <span>{language === 'fr' ? 'Se connecter' : 'Sign In'}</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Lien vers Inscription */}
          <div className="mt-6 pt-5 border-t border-slate-100 text-center">
            <p className="text-xs text-slate-500">
              {language === 'fr' ? 'Pas encore de compte ? ' : "Don't have an account yet? "}
              <Link
                href={`/auth/inscription${redirectTo !== '/dashboard' ? `?redirectTo=${encodeURIComponent(redirectTo)}` : ''}`}
                className="text-[#0066FF] hover:text-[#0052CC] font-bold hover:underline transition"
              >
                {language === 'fr' ? 'Créer mon compte (1ère simulation offerte)' : 'Create account (1st simulation free)'}
              </Link>
            </p>
          </div>
        </div>

        {/* Badges de confiance sous la boîte */}
        <div className="mt-6 flex items-center justify-center gap-6 text-[11px] text-slate-400">
          <div className="flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-emerald-500" />
            <span>Accès sécurisé 256-bit</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Star className="w-4 h-4 text-amber-400 fill-amber-400" />
            <span>4.9/5 satisfaction candidats</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ConnexionPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#F8F9FE] flex flex-col items-center justify-center text-[#0066FF] gap-3">
        <Loader2 className="w-8 h-8 animate-spin" />
        <span className="text-xs font-medium text-slate-500">Chargement de la page...</span>
      </div>
    }>
      <ConnexionForm />
    </Suspense>
  );
}
