'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  Camera, 
  Mic, 
  CheckCircle2, 
  ShieldCheck, 
  Clock, 
  ArrowRight, 
  Edit3,
  Volume2,
  Sparkles,
  AlertCircle
} from 'lucide-react';
import { AcademicProfileData } from '@/types/profile';
import { JuryPersonality } from '@/types/interview';
import { isAcademicProfileComplete } from '@/lib/validations/profile';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import { MobileMoneyModal } from '@/components/payments/MobileMoneyModal';

export function PreparationScreen() {
  const { language } = useLanguage();
  const router = useRouter();
  const videoRef = useRef<HTMLVideoElement>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animFrameRef = useRef<number | null>(null);

  const [profile, setProfile] = useState<AcademicProfileData | null>(null);
  const [juryPersonality, setJuryPersonality] = useState<JuryPersonality>('STANDARD');
  const [hasCamera, setHasCamera] = useState<boolean | null>(null);
  const [hasMic, setHasMic] = useState<boolean | null>(null);
  const [audioLevel, setAudioLevel] = useState<number>(0);
  const [permissionError, setPermissionError] = useState<string | null>(null);
  const [isLaunching, setIsLaunching] = useState<boolean>(false);
  const [creditsBalance, setCreditsBalance] = useState<number | null>(null);
  const [isCreditModalOpen, setIsCreditModalOpen] = useState<boolean>(false);
  const [isAddingTestCredits, setIsAddingTestCredits] = useState<boolean>(false);

  const handleAddTestCredits = async () => {
    setIsAddingTestCredits(true);
    try {
      const res = await fetch('/api/credits', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: 10 }),
      });
      const data = await res.json();
      if (typeof data.balance === 'number') {
        setCreditsBalance(data.balance);
        try {
          localStorage.setItem('campus_france_credits_balance', data.balance.toString());
        } catch {
          // Ignorer
        }
      }
    } catch (err) {
      console.error('Erreur ajout crédits test:', err);
    } finally {
      setIsAddingTestCredits(false);
    }
  };

  // Charger le solde réel de crédits de l'utilisateur
  useEffect(() => {
    let mounted = true;
    async function loadCredits() {
      try {
        const res = await fetch('/api/credits');
        if (res.ok) {
          const data = await res.json();
          if (typeof data.balance === 'number' && mounted) {
            setCreditsBalance(data.balance);
            try {
              localStorage.setItem('campus_france_credits_balance', data.balance.toString());
            } catch {
              // Ignorer
            }
            return;
          }
        }
      } catch {
        // Repli local
      }

      try {
        const saved = localStorage.getItem('campus_france_credits_balance');
        if (saved !== null && mounted) {
          setCreditsBalance(parseInt(saved, 10));
        }
      } catch {
        // Ignorer
      }
    }

    loadCredits();
    return () => {
      mounted = false;
    };
  }, []);

  // Charger la personnalité jury enregistrée
  useEffect(() => {
    try {
      const saved = localStorage.getItem('campus_france_jury_personality');
      if (saved === 'BIENVEILLANT' || saved === 'STANDARD' || saved === 'CRASH_TEST') {
        setJuryPersonality(saved);
      }
    } catch {
      // Ignorer
    }
  }, []);

  // Charger le profil (priorité Supabase avec fallback localStorage)
  useEffect(() => {
    let mounted = true;

    async function loadProfile() {
      try {
        const res = await fetch('/api/profile');
        if (res.ok) {
          const data = await res.json();
          if (data?.profile && mounted) {
            setProfile(data.profile);
            try {
              localStorage.setItem('campus_france_profile_draft', JSON.stringify(data.profile));
            } catch {
              // Ignorer
            }
            return;
          }
        }
      } catch {
        // En cas de déconnexion réseau, utiliser le brouillon local
      }

      try {
        const savedDraft = localStorage.getItem('campus_france_profile_draft');
        if (savedDraft && mounted) {
          setProfile(JSON.parse(savedDraft));
          return;
        }
      } catch {
        // Ignorer
      }

      if (mounted) {
        setProfile(null);
      }
    }

    loadProfile();

    return () => {
      mounted = false;
    };
  }, []);

  // Initialisation des périphériques (Webcam & Micro)
  useEffect(() => {
    let mounted = true;

    async function initMedia() {
      setPermissionError(null);

      // 1. Initialiser le microphone (prioritaire)
      try {
        const audioStream = await navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
          },
        });

        if (!mounted) {
          audioStream.getTracks().forEach((t) => t.stop());
          return;
        }

        streamRef.current = audioStream;
        setHasMic(true);

        // Connecter l'analyseur audio pour le VU-mètre en direct
        try {
          const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
          if (AudioCtx) {
            const audioCtx = new AudioCtx();
            audioContextRef.current = audioCtx;

            const source = audioCtx.createMediaStreamSource(audioStream);
            const analyser = audioCtx.createAnalyser();
            analyser.fftSize = 64;
            source.connect(analyser);
            analyserRef.current = analyser;

            const dataArray = new Uint8Array(analyser.frequencyBinCount);

            const updateVolume = () => {
              if (!mounted) return;
              analyser.getByteFrequencyData(dataArray);
              let sum = 0;
              for (let i = 0; i < dataArray.length; i++) {
                sum += dataArray[i];
              }
              const average = sum / dataArray.length;
              setAudioLevel(Math.min(100, Math.round((average / 128) * 100)));
              animFrameRef.current = requestAnimationFrame(updateVolume);
            };

            updateVolume();
          }
        } catch {
          setAudioLevel(20);
        }
      } catch (err: unknown) {
        if (!mounted) return;
        console.warn('Microphone non disponible :', err);
        setHasMic(false);
        setPermissionError(
          "L'accès à votre microphone a été refusé. Veuillez l'autoriser dans votre navigateur ou utiliser le mode clavier de secours pendant l'entretien."
        );
      }

      // 2. Initialiser la caméra locale facultative
      try {
        const videoStream = await navigator.mediaDevices.getUserMedia({
          video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: 'user' },
        });

        if (!mounted) {
          videoStream.getTracks().forEach((t) => t.stop());
          return;
        }

        setHasCamera(true);
        if (videoRef.current) {
          videoRef.current.srcObject = videoStream;
        }
      } catch {
        // La caméra est facultative
        if (mounted) {
          setHasCamera(false);
        }
      }
    }

    initMedia();

    return () => {
      mounted = false;
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        audioContextRef.current.close().catch(() => {});
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
      }
    };
  }, []);

  const isProfileComplete = isAcademicProfileComplete(profile);

  const handleStartInterview = () => {
    if (!isProfileComplete) {
      router.push('/profil');
      return;
    }
    if (creditsBalance !== null && creditsBalance <= 0) {
      setIsCreditModalOpen(true);
      return;
    }
    if (isLaunching) return;
    setIsLaunching(true);
    try {
      localStorage.setItem('campus_france_jury_personality', juryPersonality);
    } catch {
      // Ignorer
    }
    // Naviguer vers la salle d'entretien
    router.push('/entretien');
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      {/* Alerte si le profil est incomplet */}
      {!isProfileComplete && (
        <div className="mb-6 p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-200 text-xs sm:text-sm flex items-start gap-3 shadow-lg">
          <AlertCircle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
          <div className="space-y-1.5 flex-1">
            <div className="font-bold text-white text-sm">
              {language === 'fr' ? 'Dossier académique requis avant simulation' : 'Academic profile required'}
            </div>
            <p className="text-slate-300 leading-relaxed text-xs">
              {language === 'fr' 
                ? "L'examinatrice IA calibre ses questions spécifiquement sur vos universités visées, vos diplômes et votre projet professionnel. Vous devez d'abord compléter votre dossier pour démarrer."
                : "The AI jury tailors questions directly to your target universities and career project. Please complete your academic dossier before starting."}
            </p>
            <div className="pt-1">
              <Link
                href="/profil"
                prefetch={true}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs transition"
              >
                <span>{language === 'fr' ? 'Compléter mon profil maintenant' : 'Complete my profile now'}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* En-tête */}
      <div className="mb-6">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-cyan-400 text-xs font-semibold mb-3">
          <Clock className="w-3.5 h-3.5" />
          Simulation Officielle : 5 Minutes Chrono
        </div>
        <h1 className="text-2xl sm:text-4xl font-extrabold text-white tracking-tight">
          Vérification Matérielle & Consignes d&apos;Entretien
        </h1>
        <p className="mt-2 text-sm sm:text-base text-slate-300">
          Avant d&apos;entrer dans la salle, vérifiez le bon fonctionnement de votre microphone et de votre webcam locale.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
        {/* Colonne Gauche : Aperçu Caméra et Micro */}
        <div className="md:col-span-7 space-y-4">
          {/* Cadre Caméra */}
          <div className="relative aspect-video bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden flex items-center justify-center shadow-xl">
            {hasCamera ? (
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover transform -scale-x-100"
              />
            ) : (
              <div className="text-center p-6 text-slate-500">
                <Camera className="w-12 h-12 mx-auto mb-2 opacity-40" />
                <p className="text-xs">
                  {permissionError || "Activation de la caméra locale..."}
                </p>
              </div>
            )}

            {/* Badge Live Local */}
            <div className="absolute top-3 left-3 bg-slate-950/80 backdrop-blur-md px-2.5 py-1 rounded-full border border-slate-700/60 flex items-center gap-1.5 text-[11px] text-cyan-400 font-medium">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              Retour Vidéo Local
            </div>
          </div>

          {/* Test du Microphone & VU-mètre */}
          <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-4 backdrop-blur-md">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-slate-200 flex items-center gap-1.5">
                <Mic className="w-4 h-4 text-cyan-400" /> Test du Microphone
              </span>
              <span className="text-xs text-slate-400 flex items-center gap-1">
                <Volume2 className="w-3.5 h-3.5" />
                {hasMic ? (
                  audioLevel > 10 ? (
                    <strong className="text-emerald-400">Voix détectée ({audioLevel}%)</strong>
                  ) : (
                    "Microphone connecté, parlez..."
                  )
                ) : (
                  "Microphone en attente..."
                )}
              </span>
            </div>

            {/* Jauge réactive de niveau audio */}
            <div className="w-full h-3 bg-slate-950 rounded-full overflow-hidden p-0.5 border border-slate-800">
              <div
                className={`h-full rounded-full transition-all duration-75 ${
                  audioLevel > 50
                    ? 'bg-gradient-to-r from-emerald-500 to-cyan-400'
                    : audioLevel > 15
                    ? 'bg-emerald-500'
                    : 'bg-slate-700'
                }`}
                style={{ width: `${Math.max(4, audioLevel)}%` }}
              />
            </div>
          </div>

          {/* Note sur la protection des données & Indépendance */}
          <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 text-xs text-slate-400 space-y-2">
            <div className="flex items-start gap-2.5">
              <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p>
                  <strong className="text-white">Sécurité & Confidentialité de votre Caméra :</strong> La caméra est allumée exclusivement pour vous placer dans les conditions réelles d&apos;un entretien. <strong>Aucune donnée vidéo n&apos;est enregistrée, collectée ou stockée</strong> dans nos bases de données. Tout le traitement reste 100% local sur votre navigateur.
                </p>
                <p className="text-[11px] text-slate-500">
                  PrépaCampus est une structure privée et indépendante d&apos;aide à la préparation et n&apos;est pas affiliée à l&apos;organisme Campus France.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Colonne Droite : Synthèse du profil & Règles de la simulation */}
        <div className="md:col-span-5 space-y-4">
          {/* Carte Profil Étudiant */}
          <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-5 backdrop-blur-md shadow-lg">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
                Dossier de candidature
              </h2>
              <Link
                href="/profil"
                className="text-cyan-400 hover:text-cyan-300 text-xs inline-flex items-center gap-1"
              >
                <Edit3 className="w-3 h-3" /> Modifier
              </Link>
            </div>

            <div className="space-y-2 text-xs">
              <div>
                <span className="text-slate-400 block text-[11px]">Diplôme / Filière :</span>
                <span className="text-white font-medium">
                  {profile?.currentDiploma || 'Licence'} — {profile?.fieldOfStudy || 'Général'}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block text-[11px]">Formations visées en France :</span>
                <span className="text-white font-medium">
                  {profile?.targetPrograms || 'Master non précisé'}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block text-[11px]">Établissements ciblés :</span>
                <span className="text-white font-medium">
                  {profile?.targetInstitutions || 'Universités françaises'}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block text-[11px]">Projet professionnel :</span>
                <span className="text-slate-200 italic line-clamp-2">
                  &ldquo;{profile?.professionalGoal || 'Projet à préciser'}&rdquo;
                </span>
              </div>
            </div>
          </div>

          {/* Sélection du Jury IA — Design épuré, sans surcharge */}
          <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-4 backdrop-blur-md">
            <div className="flex items-center justify-between mb-2.5">
              <span className="text-xs font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                Examinateur IA
              </span>
              <span className="text-[11px] text-slate-400">
                {juryPersonality === 'BIENVEILLANT' && 'Pédagogue & bienveillant'}
                {juryPersonality === 'STANDARD' && 'Officiel Campus France'}
                {juryPersonality === 'CRASH_TEST' && 'Crash-Test (Exigeant)'}
              </span>
            </div>
            <div className="grid grid-cols-3 gap-1.5 p-1 bg-slate-950/80 rounded-xl border border-slate-800/80">
              <button
                type="button"
                onClick={() => setJuryPersonality('BIENVEILLANT')}
                className={`py-2 px-1.5 text-xs font-medium rounded-lg transition-all text-center ${
                  juryPersonality === 'BIENVEILLANT'
                    ? 'bg-blue-600/30 border border-blue-500/50 text-cyan-300 shadow-sm'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
                }`}
              >
                Pédagogue
              </button>
              <button
                type="button"
                onClick={() => setJuryPersonality('STANDARD')}
                className={`py-2 px-1.5 text-xs font-medium rounded-lg transition-all text-center ${
                  juryPersonality === 'STANDARD'
                    ? 'bg-blue-600/30 border border-blue-500/50 text-cyan-300 shadow-sm'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
                }`}
              >
                Officiel
              </button>
              <button
                type="button"
                onClick={() => setJuryPersonality('CRASH_TEST')}
                className={`py-2 px-1.5 text-xs font-medium rounded-lg transition-all text-center ${
                  juryPersonality === 'CRASH_TEST'
                    ? 'bg-amber-500/20 border border-amber-500/40 text-amber-300 shadow-sm'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
                }`}
              >
                Crash-Test
              </button>
            </div>
          </div>

          {/* Consignes officielles de la simulation */}
          <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-5 backdrop-blur-md space-y-3">
            <h2 className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
              {language === 'fr' ? 'Déroulement de l\'épreuve' : 'Interview Guidelines'}
            </h2>
            <ul className="space-y-2 text-xs text-slate-300">
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
                <span>
                  <strong>{language === 'fr' ? 'Durée stricte : 5 minutes' : 'Strict duration: 5 minutes'}</strong>{' '}
                  {language === 'fr' ? '(chronomètre dégressif).' : '(countdown timer).'}
                </span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
                <span>
                  {language === 'fr' 
                    ? 'L\'IA pose une question à voix haute, puis vous écoute.' 
                    : 'The AI asks questions out loud, then listens to your answer.'}
                </span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
                <span>
                  <strong>{language === 'fr' ? 'Relances adaptatives' : 'Adaptive follow-ups'}</strong>{' '}
                  {language === 'fr' ? 'si une réponse est trop brève ou vague.' : 'if an answer is too brief or vague.'}
                </span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
                <span>
                  <strong>{language === 'fr' ? 'Rapport verbatim immédiat' : 'Instant verbatim report'}</strong>{' '}
                  {language === 'fr' ? 'généré dès la fin de l\'épreuve.' : 'generated immediately upon completion.'}
                </span>
              </li>
            </ul>
          </div>

          {/* Solde de crédits et alerte si épuisé */}
          {creditsBalance !== null && creditsBalance <= 0 ? (
            <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-200 text-xs flex items-start gap-3 shadow-lg">
              <AlertCircle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <div className="font-semibold text-white">
                  {language === 'fr' ? 'Crédits de simulation épuisés (0 restant)' : 'Simulation credits exhausted (0 left)'}
                </div>
                <p className="text-slate-300 leading-relaxed">
                  {language === 'fr' 
                    ? "Vous avez utilisé toutes vos simulations. Rechargez vos crédits pour pouvoir lancer cet entretien officiel de 5 minutes avec le jury IA."
                    : "You have used all your simulations. Top up your credits to start this 5-minute official interview with the AI jury."}
                </p>
              </div>
            </div>
          ) : creditsBalance !== null && (
            <div className="flex items-center justify-between px-2 py-1 text-xs text-slate-400">
              <span>{language === 'fr' ? 'Solde disponible :' : 'Available balance:'}</span>
              <span className="font-semibold text-cyan-400 bg-cyan-500/10 px-2.5 py-1 rounded-full border border-cyan-500/20">
                {creditsBalance} {creditsBalance > 1 ? (language === 'fr' ? 'simulations' : 'simulations') : (language === 'fr' ? 'simulation' : 'simulation')}
              </span>
            </div>
          )}

          {/* Bouton de lancement ou de rechargement */}
          {creditsBalance !== null && creditsBalance <= 0 ? (
            <div className="space-y-2.5">
              <button
                type="button"
                disabled={isAddingTestCredits}
                onClick={handleAddTestCredits}
                className="w-full inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-gradient-to-r from-emerald-600 via-teal-500 to-cyan-500 hover:from-emerald-500 hover:to-teal-400 disabled:opacity-50 text-white font-bold text-sm shadow-xl shadow-emerald-500/25 transition transform hover:-translate-y-0.5 active:scale-95 cursor-pointer"
              >
                <Sparkles className="w-4 h-4 text-emerald-100" />
                <span>
                  {isAddingTestCredits
                    ? (language === 'fr' ? 'Activation de 10 simulations en cours...' : 'Activating 10 simulations...')
                    : (language === 'fr' ? '🎁 Activer 10 simulations de test (Gratuit)' : '🎁 Activate 10 test simulations (Free)')}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setIsCreditModalOpen(true)}
                className="w-full inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700 text-slate-300 hover:text-white font-medium text-xs transition cursor-pointer"
              >
                <span>
                  {language === 'fr' ? 'Ou recharger par Mobile Money / Carte' : 'Or top up via Mobile Money / Card'}
                </span>
              </button>
            </div>
          ) : !isProfileComplete ? (
            <Link
              href="/profil"
              prefetch={true}
              className="w-full inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-gradient-to-r from-amber-600 to-orange-500 hover:from-amber-500 hover:to-orange-400 text-white font-bold text-sm shadow-xl shadow-amber-500/25 transition transform hover:-translate-y-0.5"
            >
              <AlertCircle className="w-4 h-4" />
              <span>{language === 'fr' ? 'Compléter mon dossier académique (Requis)' : 'Complete academic dossier (Required)'}</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          ) : (
            <button
              type="button"
              disabled={isLaunching}
              onClick={handleStartInterview}
              className="w-full inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold text-sm shadow-xl shadow-blue-500/25 transition transform hover:-translate-y-0.5"
            >
              <span>
                {isLaunching 
                  ? (language === 'fr' ? 'Connexion à la salle...' : 'Entering room...') 
                  : (language === 'fr' ? 'Lancer mon entretien (5 min chrono)' : 'Start voice interview (5 min timer)')}
              </span>
              <ArrowRight className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      <MobileMoneyModal
        isOpen={isCreditModalOpen}
        onClose={() => setIsCreditModalOpen(false)}
        onPaymentSuccess={(newBal) => {
          setCreditsBalance(newBal);
          setIsCreditModalOpen(false);
        }}
      />
    </div>
  );
}
