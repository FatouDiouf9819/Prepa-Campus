'use client';

import React, { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { 
  GraduationCap, 
  Mail, 
  Lock, 
  ArrowRight, 
  Loader2, 
  AlertCircle, 
  CheckCircle2, 
  ShieldCheck, 
  Sparkles,
  Star,
  Check
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useLanguage } from '@/lib/i18n/LanguageContext';

function InscriptionForm() {
  const { language } = useLanguage();
  const router = useRouter();
  const searchParams = useSearchParams();
  const rawRedirect = searchParams.get('redirectTo') || '/dashboard';
  const redirectTo = (rawRedirect.startsWith('/') && !rawRedirect.startsWith('//')) ? rawRedirect : '/dashboard';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [currentUserEmail, setCurrentUserEmail] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [resendLoading, setResendLoading] = useState(false);
  const [resendStatus, setResendStatus] = useState<string | null>(null);

  const handleResendConfirmation = async () => {
    if (!email.trim()) return;
    setResendLoading(true);
    setResendStatus(null);
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
        setResendStatus(
          error.message.includes('rate_limit')
            ? (language === 'fr'
                ? 'Veuillez patienter quelques instants avant de redemander un e-mail.'
                : 'Please wait a few moments before requesting another email.')
            : error.message
        );
      } else {
        setResendStatus(
          language === 'fr'
            ? 'Un nouvel e-mail de confirmation vient de vous être envoyé. Vérifiez également vos Spams.'
            : 'A new confirmation email has been sent. Please check your Spam folder.'
        );
      }
    } catch {
      setResendStatus(
        language === 'fr'
          ? "Erreur lors de l'envoi de l'e-mail."
          : 'Failed to send email.'
      );
    } finally {
      setResendLoading(false);
    }
  };

  useEffect(() => {
    async function checkExistingSession() {
      try {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (user?.email) {
          setCurrentUserEmail(user.email);
        }
      } catch {
        // Ignorer
      }
    }
    checkExistingSession();
  }, []);

  const handleGoogleSignUp = async () => {
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
              ? "L'inscription avec Google n'est pas encore activée sur le projet Supabase (Authentication > Providers > Google). Vous pouvez créer un compte directement avec votre adresse e-mail ci-dessous."
              : "Google signup is not yet activated on Supabase (Authentication > Providers > Google). Please create an account using your email below."
          );
        } else {
          setErrorMessage(error.message);
        }
        setGoogleLoading(false);
      }
    } catch {
      setErrorMessage(
        language === 'fr'
          ? "Une erreur imprévue est survenue lors de l'inscription avec Google."
          : "An unexpected error occurred during Google sign-up."
      );
      setGoogleLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    if (password.length < 6) {
      setErrorMessage(
        language === 'fr' 
          ? 'Le mot de passe doit comporter au moins 6 caractères.' 
          : 'Password must be at least 6 characters.'
      );
      return;
    }

    if (password !== confirmPassword) {
      setErrorMessage(
        language === 'fr' 
          ? 'Les deux mots de passe ne correspondent pas.' 
          : 'Passwords do not match.'
      );
      return;
    }

    setLoading(true);

    try {
      const supabase = createClient();
      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(redirectTo)}`,
          data: {
            credits_balance: 1,
            has_welcome_credit: true,
          },
        },
      });

      if (error) {
        setErrorMessage(error.message);
        setLoading(false);
        return;
      }

      if (data.session) {
        // Initialisation immédiate du solde de 1 crédit offert
        try {
          await supabase.from('user_credits').insert({
            user_id: data.session.user.id,
            balance: 1,
          });
        } catch {
          // Tolérance si trigger Supabase ou déjà existant
        }
        try {
          localStorage.setItem('campus_france_credits_balance', '1');
        } catch {
          // Tolérance
        }

        // Connexion immédiate si confirmation d'email désactivée
        window.location.href = redirectTo;
        return;
      } else {
        // Confirmation d'email requise par le projet Supabase
        setSuccessMessage(
          language === 'fr'
            ? 'Votre compte a été créé avec succès ! Un e-mail de confirmation vient de vous être envoyé. Veuillez cliquer sur le lien reçu pour commencer votre première simulation.'
            : 'Account created successfully! A confirmation email has been sent to you. Please click the link received to begin your first simulation.'
        );
        setLoading(false);
      }
    } catch {
      setErrorMessage(
        language === 'fr'
          ? 'Une erreur imprévue est survenue lors de la création du compte.'
          : 'An unexpected error occurred during account creation.'
      );
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#05070E] flex flex-col justify-center py-8 sm:py-12 px-4 sm:px-6 lg:px-8 text-slate-100 font-sans relative">
      {/* Halo lumineux d'arrière-plan */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-4xl h-96 bg-gradient-to-b from-blue-600/15 to-transparent blur-3xl pointer-events-none -z-10" />

      <div className="sm:mx-auto sm:w-full sm:max-w-md relative z-10">
        {/* Logo PrépaCampus */}
        <Link href="/" className="flex items-center justify-center gap-2 mb-4 sm:mb-5 group">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[#0066FF] to-[#38BDF8] flex items-center justify-center text-white shadow-md shadow-blue-500/25 group-hover:scale-105 transition-transform">
            <GraduationCap className="w-5 h-5" />
          </div>
          <span className="font-extrabold text-white text-xl sm:text-2xl tracking-tight">
            Prépa<span className="text-[#38BDF8]">Campus</span>
          </span>
        </Link>

        {/* Titre & Sous-titre */}
        <div className="text-center">
          <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-blue-500/15 border border-blue-500/30 text-[#38BDF8] text-[11px] sm:text-xs font-semibold mb-2">
            <Sparkles className="w-3 h-3" />
            <span>1ère simulation d'entretien offerte</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
            {language === 'fr' ? 'Créer votre compte' : 'Create your account'}
          </h1>
          <p className="mt-1 text-xs text-slate-400 max-w-sm mx-auto">
            {language === 'fr'
              ? 'Préparez votre entretien Campus France avec le simulateur IA vocal.'
              : 'Prepare for your Campus France interview with the AI voice simulator.'}
          </p>
        </div>
      </div>

      <div className="mt-5 sm:mx-auto sm:w-full sm:max-w-md relative z-10">
        <div className="bg-[#0D121F] border border-white/10 rounded-2xl sm:rounded-3xl p-5 sm:p-7 shadow-2xl">
          {currentUserEmail && (
            <div className="mb-5 p-3 rounded-2xl bg-blue-950/40 border border-blue-800/40 text-xs text-blue-200 flex items-center justify-between gap-2 shadow-sm">
              <div className="flex items-center gap-2 min-w-0">
                <div className="w-2 h-2 rounded-full bg-emerald-400 shrink-0" />
                <span className="truncate text-xs font-medium">
                  {language === 'fr' 
                    ? `Connecté en tant que ${currentUserEmail}` 
                    : `Signed in as ${currentUserEmail}`}
                </span>
              </div>
              <Link
                href="/dashboard"
                className="px-3 py-1 rounded-lg bg-[#0066FF] hover:bg-[#0052CC] text-white font-semibold text-xs transition whitespace-nowrap shrink-0 shadow-sm"
              >
                {language === 'fr' ? 'Mon Dashboard →' : 'My Dashboard →'}
              </Link>
            </div>
          )}

          {errorMessage && (
            <div className="mb-5 p-3.5 rounded-2xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs sm:text-sm flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-400" />
              <span className="leading-relaxed">{errorMessage}</span>
            </div>
          )}

          {successMessage && (
            <div className="space-y-4">
              <div className="p-5 rounded-2xl bg-[#0D121F] border border-emerald-500/30 text-xs sm:text-sm space-y-3 shadow-lg">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
                    <Mail className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-white text-sm sm:text-base">
                      {language === 'fr' ? 'Vérifiez votre boîte e-mail' : 'Check your inbox'}
                    </h3>
                    <p className="text-slate-400 text-xs">
                      {language === 'fr' ? 'Lien de confirmation envoyé à :' : 'Confirmation link sent to:'}{' '}
                      <strong className="text-white font-semibold">{email}</strong>
                    </p>
                  </div>
                </div>

                <div className="p-3.5 rounded-xl bg-[#121827] border border-white/10 text-xs text-slate-300 space-y-2 leading-relaxed">
                  <p>
                    {language === 'fr'
                      ? 'Cliquez sur le lien reçu pour activer votre compte et débloquer immédiatement votre simulation offerte.'
                      : 'Click the link in the email to activate your account and access your free simulation.'}
                  </p>
                  <p className="text-amber-300/90 flex items-center gap-1.5 font-medium">
                    <span>⚠️</span>
                    <span>
                      {language === 'fr'
                        ? 'Pensez à vérifier votre dossier Spam / Courrier indésirable si vous ne le voyez pas dans les 2 minutes.'
                        : 'Be sure to check your Spam / Junk folder if you do not see it within 2 minutes.'}
                    </span>
                  </p>
                </div>

                {resendStatus && (
                  <p className="text-xs text-cyan-300 p-2.5 rounded-lg bg-blue-500/10 border border-blue-500/20">
                    {resendStatus}
                  </p>
                )}

                <div className="flex flex-col sm:flex-row items-center gap-2 pt-1">
                  <button
                    type="button"
                    onClick={handleResendConfirmation}
                    disabled={resendLoading}
                    className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 border border-white/15 text-white font-semibold text-xs transition active:scale-95 disabled:opacity-50 cursor-pointer"
                  >
                    {resendLoading ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>Envoi...</span>
                      </>
                    ) : (
                      <span>Renvoyer l&apos;e-mail</span>
                    )}
                  </button>

                  <Link
                    href={`/auth/connexion?redirectTo=${encodeURIComponent(redirectTo)}`}
                    className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-[#0066FF] hover:bg-[#0052CC] text-white font-bold text-xs shadow-md transition active:scale-95"
                  >
                    <span>{language === 'fr' ? 'Accéder à la connexion' : 'Go to login'}</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            </div>
          )}

          {!successMessage && (
            <>
              {/* Inscription 1-Clic Google */}
              <button
                type="button"
                onClick={handleGoogleSignUp}
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
                <span>{language === 'fr' ? 'Continuer avec Google (1 clic)' : 'Continue with Google (1 click)'}</span>
              </button>

              <div className="relative my-4">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-white/10" />
                </div>
                <div className="relative flex justify-center text-xs">
                  <span className="bg-[#0D121F] px-3 text-slate-400 font-medium uppercase tracking-wider text-[10px]">
                    {language === 'fr' ? 'ou par e-mail' : 'or with email'}
                  </span>
                </div>
              </div>

              <form onSubmit={handleRegister} className="space-y-3 sm:space-y-3.5">
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">
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
                      className="w-full pl-10 pr-3.5 py-2.5 sm:py-3 rounded-xl bg-[#121827] border border-white/15 text-white text-xs sm:text-sm focus:outline-none focus:bg-[#151C2D] focus:border-[#0066FF] focus:ring-2 focus:ring-blue-500/20 transition-all placeholder:text-slate-500 font-medium"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">
                    {language === 'fr' ? 'Mot de passe (6 caractères minimum)' : 'Password (minimum 6 characters)'}
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      type="password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full pl-10 pr-3.5 py-2.5 sm:py-3 rounded-xl bg-[#121827] border border-white/15 text-white text-xs sm:text-sm focus:outline-none focus:bg-[#151C2D] focus:border-[#0066FF] focus:ring-2 focus:ring-blue-500/20 transition-all placeholder:text-slate-500 font-medium"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">
                    {language === 'fr' ? 'Confirmer le mot de passe' : 'Confirm password'}
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      type="password"
                      required
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full pl-10 pr-3.5 py-2.5 sm:py-3 rounded-xl bg-[#121827] border border-white/15 text-white text-xs sm:text-sm focus:outline-none focus:bg-[#151C2D] focus:border-[#0066FF] focus:ring-2 focus:ring-blue-500/20 transition-all placeholder:text-slate-500 font-medium"
                    />
                  </div>
                </div>

                {/* Avantages inclus */}
                <div className="pt-0.5 pb-0.5 space-y-1">
                  <div className="flex items-center gap-2 text-[11px] text-slate-300">
                    <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    <span>Première simulation vocale offerte</span>
                  </div>
                  <div className="flex items-center gap-2 text-[11px] text-slate-300">
                    <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    <span>Questions officielles Campus France 2025</span>
                  </div>
                  <div className="flex items-center gap-2 text-[11px] text-slate-300">
                    <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    <span>Sans engagement ni carte bancaire</span>
                  </div>
                </div>

                {/* Bouton de soumission principal */}
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full mt-1.5 inline-flex items-center justify-center gap-2.5 px-6 py-3 rounded-xl bg-[#0066FF] hover:bg-[#0052CC] text-white font-bold text-xs sm:text-sm shadow-lg shadow-blue-500/30 hover:shadow-blue-500/40 transition-all hover:-translate-y-0.5 disabled:opacity-50 cursor-pointer"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>{language === 'fr' ? 'Création de votre compte...' : 'Creating your account...'}</span>
                    </>
                  ) : (
                    <>
                      <span>{language === 'fr' ? 'Créer mon compte gratuitement' : 'Create free account'}</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </form>
            </>
          )}

          {/* Lien vers Connexion */}
          <div className="mt-6 pt-5 border-t border-white/10 text-center">
            <p className="text-xs text-slate-400">
              {language === 'fr' ? 'Vous avez déjà un compte ? ' : 'Already have an account? '}
              <Link
                href={`/auth/connexion${redirectTo !== '/dashboard' ? `?redirectTo=${encodeURIComponent(redirectTo)}` : ''}`}
                className="text-[#38BDF8] hover:text-white font-bold hover:underline transition"
              >
                {language === 'fr' ? 'Se connecter' : 'Sign In'}
              </Link>
            </p>
          </div>
        </div>

        {/* Badges de confiance sous la boîte */}
        <div className="mt-6 flex items-center justify-center gap-6 text-[11px] text-slate-400">
          <div className="flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>Données protégées & RGPD</span>
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

export default function InscriptionPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#05070E] flex flex-col items-center justify-center text-[#38BDF8] gap-3">
        <Loader2 className="w-8 h-8 animate-spin" />
        <span className="text-xs font-medium text-slate-400">Chargement de la page...</span>
      </div>
    }>
      <InscriptionForm />
    </Suspense>
  );
}
