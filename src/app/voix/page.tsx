'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { Volume2, Play, Pause, Sparkles, ArrowRight, ShieldCheck, Check, Smartphone } from 'lucide-react';

interface VoiceOption {
  id: string;
  title: string;
  subtitle: string;
  tag: string;
  type: 'file' | 'native';
  audioSrc?: string;
  description: string;
  accent: string;
  colorBadge: string;
  isRecommended?: boolean;
}

const VOICES: VoiceOption[] = [
  {
    id: 'native',
    title: 'Voix Native du Téléphone (Recommandée)',
    subtitle: 'La voix authentique de votre smartphone (Siri / Amélie / Google)',
    tag: '100% Humaine & Naturelle',
    type: 'native',
    isRecommended: true,
    description: 'La véritable voix française intégrée à votre téléphone (Siri / Amélie). Ton posé, doux, calme, zéro accent synthétique et zéro agressivité : on dirait une vraie conseillère Campus France humaine en face de vous.',
    accent: 'Calme, bienveillante & 100% naturelle',
    colorBadge: 'from-emerald-500/20 to-teal-500/20 border-emerald-500/40 text-emerald-400',
  },
  {
    id: 'alloy',
    title: 'Service Client Prestige (Orange)',
    subtitle: 'Style standardiste d\'accueil & service client',
    tag: 'Orange & Téléphonie',
    type: 'file',
    audioSrc: '/voice-service-client-alloy.mp3',
    description: 'Une voix posée, limpide, polie et mesurée. Articulation exemplaire, zéro cri et zéro agressivité : le ton apaisant d\'un accueil client haut de gamme.',
    accent: 'Posée, mesurée & chaleureuse',
    colorBadge: 'from-amber-500/20 to-orange-500/20 border-orange-500/40 text-orange-400',
  },
  {
    id: 'sage',
    title: 'Annonce Cabine Aérienne (Air France)',
    subtitle: 'Style hôtesse de l\'air & vol long-courrier',
    tag: 'Annonce Aérienne',
    type: 'file',
    audioSrc: '/voice-avion-sage.mp3',
    description: 'Une voix feutrée, très douce et enveloppante. Elle reproduit la quiétude des annonces en cabine d\'avion : très calme, bienveillante et conçue pour détendre.',
    accent: 'Feutrée, zen & rassurante',
    colorBadge: 'from-blue-500/20 to-indigo-500/20 border-blue-500/40 text-blue-400',
  },
  {
    id: 'nova',
    title: 'Standardiste Dynamique (Nova)',
    subtitle: 'Style moderne et rythmé',
    tag: 'Moderne & Dynamique',
    type: 'file',
    audioSrc: '/sample-nova.mp3',
    description: 'Une voix plus vive et tonique, pour ceux qui préfèrent une cadence plus rapide.',
    accent: 'Rythmée & dynamique',
    colorBadge: 'from-cyan-500/20 to-sky-500/20 border-cyan-500/40 text-cyan-400',
  },
];

const TEST_PHRASE = "Bonjour et bienvenue à votre entretien officiel Campus France. Prenez le temps de vous installer, nous allons commencer dès que vous êtes prêt.";

export default function VoicePreviewPage() {
  const [selectedVoiceId, setSelectedVoiceId] = useState<string>('native');
  const [playingId, setPlayingId] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Charger la préférence de l'utilisateur au montage (par défaut 'native')
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('preferred_voice');
      if (saved && VOICES.some((v) => v.id === saved)) {
        setSelectedVoiceId(saved);
      } else {
        setSelectedVoiceId('native');
        localStorage.setItem('preferred_voice', 'native');
      }
    }
  }, []);

  const stopAllAudio = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      try {
        window.speechSynthesis.cancel();
      } catch {}
    }
  };

  const handlePlayVoice = (voice: VoiceOption) => {
    stopAllAudio();

    if (playingId === voice.id) {
      setPlayingId(null);
      return;
    }

    setPlayingId(voice.id);

    if (voice.type === 'native') {
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        const utterance = new SpeechSynthesisUtterance(TEST_PHRASE);
        utterance.lang = 'fr-FR';
        utterance.rate = 0.90;
        utterance.pitch = 1.0;

        const voices = window.speechSynthesis.getVoices();
        const frenchVoices = voices.filter((v) => v.lang.startsWith('fr'));
        const preferredFrench =
          frenchVoices.find((v) => /marie|amélie|amelie|audrey|aurélie|aurelie/i.test(v.name)) ||
          frenchVoices.find((v) => /google\s+français/i.test(v.name)) ||
          frenchVoices.find((v) => /hortense|denise|julie|virginie|céline|celine|female|femme/i.test(v.name)) ||
          frenchVoices.find((v) => !/thomas|nicolas|paul|claude|male|homme/i.test(v.name)) ||
          frenchVoices[0];

        if (preferredFrench) {
          utterance.voice = preferredFrench;
        }

        utterance.onend = () => setPlayingId(null);
        utterance.onerror = () => setPlayingId(null);

        window.speechSynthesis.speak(utterance);
      } else {
        setPlayingId(null);
      }
      return;
    }

    if (voice.audioSrc) {
      const audio = new Audio(voice.audioSrc);
      audioRef.current = audio;

      audio.onended = () => setPlayingId(null);
      audio.onerror = () => setPlayingId(null);

      audio.play().catch(() => setPlayingId(null));
    }
  };

  const handleSelectVoice = (voiceId: string) => {
    setSelectedVoiceId(voiceId);
    if (typeof window !== 'undefined') {
      localStorage.setItem('preferred_voice', voiceId);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-center p-4 sm:p-6">
      <div className="max-w-xl w-full space-y-6">
        {/* En-tête */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-semibold">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Studio Vocal Personnalisé</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            Choisissez la voix de votre examinatrice
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 max-w-md mx-auto leading-relaxed">
            La voix native de votre téléphone (Siri / Amélie) est activée par défaut pour un rendu doux, posé et 100% humain.
          </p>
        </div>

        {/* Liste des voix */}
        <div className="space-y-3.5">
          {VOICES.map((voice) => {
            const isPlaying = playingId === voice.id;
            const isSelected = selectedVoiceId === voice.id;

            return (
              <div
                key={voice.id}
                className={`p-4 sm:p-5 rounded-2xl bg-slate-900/90 border transition-all ${
                  isSelected
                    ? 'border-emerald-500 shadow-lg shadow-emerald-500/15 ring-1 ring-emerald-500/40'
                    : 'border-slate-800 hover:border-slate-700'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1.5 flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-bold text-white text-sm sm:text-base">{voice.title}</span>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border bg-gradient-to-r ${voice.colorBadge}`}>
                        {voice.tag}
                      </span>
                      {isSelected && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 flex items-center gap-1">
                          <Check className="w-3 h-3" />
                          <span>Active par défaut</span>
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-300 leading-relaxed">{voice.description}</p>
                    <p className="text-[11px] text-slate-400 flex items-center gap-1 pt-0.5">
                      {voice.type === 'native' ? (
                        <Smartphone className="w-3.5 h-3.5 text-emerald-400" />
                      ) : (
                        <Volume2 className="w-3.5 h-3.5 text-slate-400" />
                      )}
                      <span>{voice.accent}</span>
                    </p>
                  </div>

                  {/* Bouton Écouter */}
                  <button
                    type="button"
                    onClick={() => handlePlayVoice(voice)}
                    className={`shrink-0 w-11 h-11 rounded-xl flex items-center justify-center transition active:scale-95 cursor-pointer shadow-md ${
                      isPlaying
                        ? 'bg-emerald-500 text-slate-950 font-bold animate-pulse'
                        : 'bg-slate-800 hover:bg-slate-700 text-white border border-slate-700'
                    }`}
                    aria-label={`Écouter la voix ${voice.title}`}
                    title={isPlaying ? 'Arrêter la lecture' : 'Écouter un extrait'}
                  >
                    {isPlaying ? <Pause className="w-5 h-5 fill-current" /> : <Play className="w-5 h-5 fill-current ml-0.5" />}
                  </button>
                </div>

                {/* Bouton de sélection */}
                <div className="mt-3 pt-3 border-t border-slate-800/80 flex items-center justify-between">
                  <span className="text-[11px] text-slate-400">
                    {isSelected ? 'Cette voix est active pour vos simulations.' : 'Cliquez pour utiliser cette voix.'}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleSelectVoice(voice.id)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition active:scale-95 cursor-pointer flex items-center gap-1.5 ${
                      isSelected
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 cursor-default font-bold'
                        : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700'
                    }`}
                  >
                    {isSelected ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                        <span>Voix Sélectionnée</span>
                      </>
                    ) : (
                      <span>Choisir cette voix</span>
                    )}
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Bannière de confirmation */}
        <div className="p-4 rounded-xl bg-slate-900/90 border border-emerald-500/30 flex items-center gap-3">
          <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0" />
          <p className="text-xs text-slate-300 leading-relaxed">
            La voix <strong>Native du Téléphone (Siri / Amélie)</strong> est sélectionnée. Vos simulations utiliseront automatiquement cette voix chaleureuse et 100% humaine.
          </p>
        </div>

        {/* Bouton retour simulation */}
        <div className="text-center pt-2">
          <Link
            href="/entretien"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-semibold shadow-lg shadow-emerald-500/20 active:scale-95 transition"
          >
            <span>Démarrer la simulation avec cette voix</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </div>
  );
}
