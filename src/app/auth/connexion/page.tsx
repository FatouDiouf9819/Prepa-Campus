'use client';

import React, { useState, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { 
  GraduationCap, 
  Mail, 
  Lock, 
  Eye,
  EyeOff,
  ArrowRight, 
  Loader2, 
  AlertCircle, 
  CheckCircle2,
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
  const rawRedirect = searchParams.get('redirectTo') || '/';
  const redirectTo = (rawRedirect.startsWith('/') && !rawRedirect.startsWith('//')) ? rawRedirect : '/';

  const authCallbackError = searchParams.get('error');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [resendSuccess, setResendSuccess] = useState<string | null>(null);
  const [showResend, setShowResend] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(
    authCallbackError === 'auth_callback_failed'
      ? (language === 'fr'
          ? 'La connexion avec Google a échoué ou a été interrompue. Veuillez réessayer ou vous connecter par email.'
          : 'Google sign-in failed or was interrupted. Please try again or sign in with your email.')
      : null
  );

  const handleResendConfirmation = async () => {
    if (!email.trim()) return;
    setResendLoading(true);
    setResendSuccess(null);
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: email.trim(),
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(redirectTo)}`,
        },
      });

      if (error) {
        setErrorMessage(
          error.message.includes('rate_limit')
            ? (language === 'fr'
                ? 'Veuillez patienter quelques instants avant de redemander un e-mail.'
                : 'Please wait a moment before requesting another email.')
            : error.message
        );
      } else {
        setResendSuccess(
          language === 'fr'
            ? 'Un nouvel e-mail de confirmation vient de vous être envoyé. Vérifiez également vos Spams.'
            : 'A new confirmation email has been sent. Please also check your Spam folder.'
        );
      }
    } catch {
      setErrorMessage(
        language === 'fr'
          ? "Erreur lors de l'envoi de l'e-mail."
          : 'Failed to send confirmation email.'
      );
    } finally {
      setResendLoading(false);
    }
  };

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
        const isNotConfirmed = error.message?.toLowerCase().includes('email not confirmed');
        setShowResend(isNotConfirmed);
        setErrorMessage(
          isNotConfirmed
            ? (language === 'fr'
                ? "Votre adresse email n'est pas encore confirmée. Veuillez vérifier votre boîte de réception et vos courriers indésirables (Spams) pour cliquer sur le lien d'activation."
                : "Your email address has not been confirmed yet. Please check your inbox and spam folder to click the confirmation link.")
            : error.message === 'Invalid login credentials'
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
    <div className="min-h-screen bg-[#05070E] flex flex-col justify-center py-10 sm:py-16 px-4 sm:px-6 lg:px-8 text-slate-100 font-sans relative">
      {/* Halo lumineux d'arrière-plan */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-4xl h-96 bg-gradient-to-b from-blue-600/15 to-transparent blur-3xl pointer-events-none -z-10" />

      <div className="sm:mx-auto sm:w-full sm:max-w-md relative z-10">
        {/* Logo PrépaCampus */}
        <Link href="/" className="flex items-center justify-center gap-2.5 mb-6 group">
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-[#0066FF] to-[#38BDF8] flex items-center justify-center text-white shadow-lg shadow-blue-500/25 group-hover:scale-105 transition-transform">
            <GraduationCap className="w-6 h-6" />
          </div>
          <span className="font-extrabold text-white text-2xl tracking-tight">
            Prépa<span className="text-[#38BDF8]">Campus</span>
          </span>
        </Link>

        {/* Titre & Sous-titre */}
        <div className="text-center">
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
            {language === 'fr' ? 'Connexion candidat' : 'Candidate sign in'}
          </h1>
          <p className="mt-2 text-xs sm:text-sm text-slate-400 max-w-sm mx-auto">
            {language === 'fr' 
              ? 'Accédez à vos simulations d\'entretien et vos bilans personnalisés.'
              : 'Access your interview simulations and personalized feedback.'}
          </p>
        </div>
      </div>

      <div className="mt-7 sm:mx-auto sm:w-full sm:max-w-md relative z-10">
        <div className="bg-[#0D121F] border border-white/10 rounded-3xl p-6 sm:p-8 shadow-2xl">
          {errorMessage && (
            <div className="mb-5 p-3.5 rounded-2xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs sm:text-sm space-y-2.5">
              <div className="flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-400" />
                <span className="leading-relaxed">{errorMessage}</span>
              </div>
              {showResend && (
                <div className="pt-1 pl-6.5">
                  <button
                    type="button"
                    onClick={handleResendConfirmation}
                    disabled={resendLoading}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-500/20 hover:bg-blue-500/30 border border-blue-500/30 text-[#38BDF8] text-xs font-semibold transition active:scale-95 cursor-pointer disabled:opacity-50"
                  >
                    {resendLoading ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>Envoi en cours...</span>
                      </>
                    ) : (
                      <span>Renvoyer l&apos;e-mail de confirmation</span>
                    )}
                  </button>
                </div>
              )}
            </div>
          )}

          {resendSuccess && (
            <div className="mb-5 p-3.5 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-200 text-xs sm:text-sm flex items-start gap-2.5">
              <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-emerald-400" />
              <span className="leading-relaxed">{resendSuccess}</span>
            </div>
          )}

          {/* Connexion 1-Clic Google */}
          <button
            type="button"
            onClick={handleGoogleSignIn}
            disabled={googleLoading || loading}
            className="w-full flex items-center justify-center gap-3 px-4 py-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/15 text-white font-semibold text-xs sm:text-sm shadow-sm transition-all hover:border-white/25 disabled:opacity-50 group"
          >
            {googleLoading ? (
              <Loader2 className="w-4 h-4 animate-spin text-[#38BDF8]" />
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
              <div className="w-full border-t border-white/10" />
            </div>
            <div className="relative flex justify-center text-xs">
              <span className="bg-[#0D121F] px-3 text-slate-400 font-medium uppercase tracking-wider text-[10px]">
                {language === 'fr' ? 'ou avec votre email' : 'or with email'}
              </span>
            </div>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1.5">
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
                  className="w-full pl-10 pr-3.5 py-3 rounded-xl bg-[#121827] border border-white/15 text-white text-xs sm:text-sm focus:outline-none focus:bg-[#151C2D] focus:border-[#0066FF] focus:ring-2 focus:ring-blue-500/20 transition-all placeholder:text-slate-500 font-medium"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-bold text-slate-300">
                  {language === 'fr' ? 'Mot de passe' : 'Password'}
                </label>
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="text-[11px] text-slate-400 hover:text-[#38BDF8] flex items-center gap-1 transition-colors cursor-pointer select-none"
                >
                  {showPassword ? (
                    <>
                      <EyeOff className="w-3.5 h-3.5" />
                      <span>{language === 'fr' ? 'Masquer' : 'Hide'}</span>
                    </>
                  ) : (
                    <>
                      <Eye className="w-3.5 h-3.5" />
                      <span>{language === 'fr' ? 'Afficher' : 'Show'}</span>
                    </>
                  )}
                </button>
              </div>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-11 py-3 rounded-xl bg-[#121827] border border-white/15 text-white text-xs sm:text-sm focus:outline-none focus:bg-[#151C2D] focus:border-[#0066FF] focus:ring-2 focus:ring-blue-500/20 transition-all placeholder:text-slate-500 font-medium"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? (language === 'fr' ? 'Masquer le mot de passe' : 'Hide password') : (language === 'fr' ? 'Afficher le mot de passe' : 'Show password')}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white p-1 rounded-lg transition-colors cursor-pointer"
                >
                  {showPassword ? <EyeOff className="w-4 h-4 text-slate-300" /> : <Eye className="w-4 h-4 text-slate-400" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 inline-flex items-center justify-center gap-2.5 px-6 py-3.5 rounded-xl bg-[#0066FF] hover:bg-[#0052CC] text-white font-bold text-sm shadow-lg shadow-blue-500/30 hover:shadow-blue-500/40 transition-all hover:-translate-y-0.5 disabled:opacity-50 cursor-pointer"
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
          <div className="mt-6 pt-5 border-t border-white/10 text-center">
            <p className="text-xs text-slate-400">
              {language === 'fr' ? 'Pas encore de compte ? ' : "Don't have an account yet? "}
              <Link
                href={`/auth/inscription${redirectTo !== '/dashboard' ? `?redirectTo=${encodeURIComponent(redirectTo)}` : ''}`}
                className="text-[#38BDF8] hover:text-white font-bold hover:underline transition"
              >
                {language === 'fr' ? 'Créer mon compte (1ère simulation offerte)' : 'Create account (1st simulation free)'}
              </Link>
            </p>
          </div>
        </div>

        {/* Badges de confiance sous la boîte */}
        <div className="mt-6 flex items-center justify-center gap-6 text-[11px] text-slate-400">
          <div className="flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>Accès sécurisé 256-bit</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Star className="w-4 h-4 text-amber-400 fill-amber-400" />
            <span>4.9/5 satisfaction candidats</span>
          </div>
        </div>

        {/* Notice déontologique d'indépendance */}
        <p className="mt-4 text-center text-[10px] text-slate-400 max-w-sm mx-auto leading-relaxed">
          {language === 'fr' 
            ? "Plateforme pédagogique indépendante d'entraînement par IA. Non affiliée à l'organisme officiel Campus France."
            : "Independent pedagogical AI training platform. Not affiliated with the official Campus France agency."}
        </p>
      </div>
    </div>
  );
}

export default function ConnexionPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#05070E] flex flex-col items-center justify-center text-[#38BDF8] gap-3">
        <Loader2 className="w-8 h-8 animate-spin" />
        <span className="text-xs font-medium text-slate-400">Chargement de la page...</span>
      </div>
    }>
      <ConnexionForm />
    </Suspense>
  );
}
