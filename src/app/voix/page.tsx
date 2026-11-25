'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { Volume2, Play, Pause, Sparkles, ArrowRight, ShieldCheck, Check, Smartphone } from 'lucide-react';

interface VoiceOption {
  id: string;
  title: string;
  subtitle: string;
  tag: string;
  audioSrc: string;
  description: string;
  accent: string;
  colorBadge: string;
  isRecommended?: boolean;
}

const VOICES: VoiceOption[] = [
  {
    id: 'alloy',
    title: 'Service Client Prestige (Orange)',
    subtitle: 'La voix studio posée que vous avez entendue sur ordinateur',
    tag: 'Recommandée & Active',
    audioSrc: '/voice-service-client-alloy.mp3',
    isRecommended: true,
    description: 'La véritable voix studio haute définition : posée, limpide, polie et mesurée. Fini la voix robotique automatique du téléphone, cette voix de qualité professionnelle est désormais celle qui parle sur votre mobile et sur ordinateur.',
    accent: 'Posée, mesurée & chaleureuse (Zéro cri)',
    colorBadge: 'from-amber-500/20 to-orange-500/20 border-orange-500/40 text-orange-400',
  },
  {
    id: 'sage',
    title: 'Annonce Cabine Aérienne (Air France)',
    subtitle: 'Style hôtesse de l\'air & vol long-courrier',
    tag: 'Annonce Aérienne',
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
    audioSrc: '/sample-nova.mp3',
    description: 'Une voix plus vive et tonique, pour ceux qui préfèrent une cadence un peu plus rapide.',
    accent: 'Rythmée & dynamique',
    colorBadge: 'from-cyan-500/20 to-sky-500/20 border-cyan-500/40 text-cyan-400',
  },
];

export default function VoicePreviewPage() {
  const [selectedVoiceId, setSelectedVoiceId] = useState<string>('alloy');
  const [playingId, setPlayingId] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Charger la préférence de l'utilisateur (par défaut 'alloy')
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('preferred_voice');
      if (saved && saved !== 'native' && VOICES.some((v) => v.id === saved)) {
        setSelectedVoiceId(saved);
      } else {
        setSelectedVoiceId('alloy');
        localStorage.setItem('preferred_voice', 'alloy');
      }
    }
  }, []);

  const stopAllAudio = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
  };

  const handlePlayVoice = (voice: VoiceOption) => {
    stopAllAudio();

    if (playingId === voice.id) {
      setPlayingId(null);
      return;
    }

    setPlayingId(voice.id);

    const audio = new Audio(voice.audioSrc);
    audioRef.current = audio;

    audio.onended = () => setPlayingId(null);
    audio.onerror = () => setPlayingId(null);

    audio.play().catch(() => setPlayingId(null));
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
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-orange-500/10 border border-orange-500/30 text-orange-400 text-xs font-semibold">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Studio Vocal Haute Définition</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            La voix officielle de votre examinatrice
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 max-w-md mx-auto leading-relaxed">
            Fini la voix robotique automatique du téléphone. Vous avez désormais exactement la même voix douce et professionnelle sur votre téléphone que sur ordinateur.
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
                    ? 'border-orange-500 shadow-lg shadow-orange-500/15 ring-1 ring-orange-500/40'
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
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-orange-500/20 text-orange-400 border border-orange-500/40 flex items-center gap-1">
                          <Check className="w-3 h-3" />
                          <span>Active sur votre téléphone</span>
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-300 leading-relaxed">{voice.description}</p>
                    <p className="text-[11px] text-slate-400 flex items-center gap-1 pt-0.5">
                      <Volume2 className="w-3.5 h-3.5 text-orange-400" />
                      <span>{voice.accent}</span>
                    </p>
                  </div>

                  {/* Bouton Écouter */}
                  <button
                    type="button"
                    onClick={() => handlePlayVoice(voice)}
                    className={`shrink-0 w-11 h-11 rounded-xl flex items-center justify-center transition active:scale-95 cursor-pointer shadow-md ${
                      isPlaying
                        ? 'bg-orange-500 text-slate-950 font-bold animate-pulse'
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
                    {isSelected ? 'Cette voix parle lors de tous vos entretiens.' : 'Cliquez pour activer cette voix.'}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleSelectVoice(voice.id)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition active:scale-95 cursor-pointer flex items-center gap-1.5 ${
                      isSelected
                        ? 'bg-orange-500/20 text-orange-300 border border-orange-500/40 cursor-default font-bold'
                        : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700'
                    }`}
                  >
                    {isSelected ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-orange-400" />
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
        <div className="p-4 rounded-xl bg-slate-900/90 border border-orange-500/30 flex items-center gap-3">
          <Smartphone className="w-5 h-5 text-orange-400 shrink-0" />
          <p className="text-xs text-slate-300 leading-relaxed">
            La voix <strong>Service Client Prestige (Orange)</strong> est active. C&apos;est le véritable fichier audio HD studio qui jouera directement sur les haut-parleurs de votre téléphone.
          </p>
        </div>

        {/* Bouton retour simulation */}
        <div className="text-center pt-2">
          <Link
            href="/entretien"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-500 hover:to-amber-500 text-white text-xs font-semibold shadow-lg shadow-orange-500/20 active:scale-95 transition"
          >
            <span>Démarrer l&apos;entretien sur mon téléphone</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </div>
  );
}
