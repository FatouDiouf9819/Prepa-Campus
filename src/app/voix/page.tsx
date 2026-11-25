'use client';

import React, { useState, useRef } from 'react';
import Link from 'next/link';
import { Volume2, Play, Pause, Sparkles, CheckCircle2, ArrowRight } from 'lucide-react';

interface VoiceOption {
  id: string;
  name: string;
  audioSrc: string;
  tag: string;
  description: string;
  pitch: string;
  color: string;
}

const VOICES: VoiceOption[] = [
  {
    id: 'coral',
    name: 'Coral (Recommandée)',
    audioSrc: '/test-voice-coral.mp3',
    tag: 'Très douce & ultra-féminine',
    description: 'Une voix lumineuse, mélodieuse, très chaleureuse et naturelle. Elle respire la bienveillance d\'une vraie examinatrice.',
    pitch: 'Douceur cristalline & articulation parfaite',
    color: 'from-emerald-500/20 to-teal-500/10 border-emerald-500/40 text-emerald-400',
  },
  {
    id: 'nova',
    name: 'Nova',
    audioSrc: '/test-voice-nova.mp3',
    tag: 'Dynamique & claire',
    description: 'Une voix énergique, jeune et dynamique, avec un rythme un peu plus vif.',
    pitch: 'Énergique & directe',
    color: 'from-cyan-500/20 to-blue-500/10 border-cyan-500/30 text-cyan-400',
  },
  {
    id: 'shimmer',
    name: 'Shimmer',
    audioSrc: '/test-voice-shimmer.mp3',
    tag: 'Plus posée & grave',
    description: 'Une voix plus mature et grave, très sérieuse.',
    pitch: 'Timbre plus bas & solennel',
    color: 'from-purple-500/20 to-indigo-500/10 border-purple-500/30 text-purple-400',
  },
];

export default function VoicePreviewPage() {
  const [playingId, setPlayingId] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const handlePlayVoice = (voice: VoiceOption) => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }

    if (playingId === voice.id) {
      setPlayingId(null);
      return;
    }

    const audio = new Audio(voice.audioSrc);
    audioRef.current = audio;
    setPlayingId(voice.id);

    audio.onended = () => {
      setPlayingId(null);
    };

    audio.onerror = () => {
      setPlayingId(null);
    };

    audio.play().catch(() => {
      setPlayingId(null);
    });
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-center p-4 sm:p-6">
      <div className="max-w-xl w-full space-y-6">
        {/* En-tête */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 text-xs font-semibold">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Studio Vocal Haute Définition</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            Quelle voix préférez-vous pour l&apos;examinatrice ?
          </h1>
          <p className="text-sm text-slate-400 max-w-md mx-auto">
            Écoutez chaque échantillon audio réel généré par OpenAI pour Prépa Campus et comparez la douceur et la féminité.
          </p>
        </div>

        {/* Liste des voix */}
        <div className="space-y-3.5">
          {VOICES.map((voice) => {
            const isPlaying = playingId === voice.id;
            return (
              <div
                key={voice.id}
                className={`p-4 sm:p-5 rounded-2xl bg-slate-900/90 border transition-all ${
                  isPlaying ? 'border-cyan-400 shadow-lg shadow-cyan-500/10' : 'border-slate-800 hover:border-slate-700'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-white text-base">{voice.name}</span>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border bg-gradient-to-r ${voice.color}`}>
                        {voice.tag}
                      </span>
                    </div>
                    <p className="text-xs text-slate-300 leading-relaxed">{voice.description}</p>
                    <p className="text-[11px] text-slate-400 flex items-center gap-1 pt-1">
                      <Volume2 className="w-3 h-3 text-slate-400" />
                      <span>{voice.pitch}</span>
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => handlePlayVoice(voice)}
                    className={`shrink-0 w-11 h-11 rounded-xl flex items-center justify-center transition active:scale-95 cursor-pointer shadow-md ${
                      isPlaying
                        ? 'bg-cyan-500 text-slate-950 font-bold animate-pulse'
                        : 'bg-slate-800 hover:bg-slate-700 text-white border border-slate-700'
                    }`}
                    aria-label={`Écouter la voix ${voice.name}`}
                  >
                    {isPlaying ? <Pause className="w-5 h-5 fill-current" /> : <Play className="w-5 h-5 fill-current ml-0.5" />}
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Phrase de confirmation */}
        <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center gap-3">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          <p className="text-xs text-emerald-300 leading-relaxed">
            La voix <strong>Coral</strong> est désormais activée par défaut en production pour sa douceur et son naturel féminin exceptionnel.
          </p>
        </div>

        {/* Bouton retour simulation */}
        <div className="text-center pt-2">
          <Link
            href="/entretien"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white text-xs font-semibold shadow-lg shadow-blue-500/20 active:scale-95 transition"
          >
            <span>Tester dans l&apos;entretien Campus France</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </div>
  );
}
