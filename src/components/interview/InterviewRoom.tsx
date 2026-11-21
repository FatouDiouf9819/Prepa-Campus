'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { 
  Mic, 
  MicOff, 
  Volume2, 
  Clock, 
  AlertCircle, 
  RotateCcw, 
  Keyboard, 
  Send, 
  PhoneOff,
  Sparkles,
  Bot,
  Camera,
  CameraOff,
  CheckCircle2,
  Edit3,
  RefreshCw,
  ShieldCheck,
  AlertTriangle,
  LayoutDashboard,
  User
} from 'lucide-react';
import { AcademicProfileData } from '@/types/profile';
import { InterviewTurn, InterviewStatus, JuryPersonality } from '@/types/interview';
import { isTechnicalOrInvalidAnswer } from '@/lib/ai/validation';
import { MobileMoneyModal } from '@/components/payments/MobileMoneyModal';
import { createClient } from '@/lib/supabase/client';

/**
 * Détecte le meilleur type MIME audio supporté par le navigateur (Chrome, Safari, Firefox, Edge).
 */
function getBestSupportedAudioMimeType(): string {
  if (typeof window === 'undefined' || typeof MediaRecorder === 'undefined') {
    return '';
  }

  const candidateTypes = [
    'audio/webm;codecs=opus',
    'audio/webm',
    'audio/mp4',
    'audio/aac',
    'audio/ogg;codecs=opus',
    'audio/wav',
    '', // fallback natif du navigateur
  ];

  for (const mime of candidateTypes) {
    if (!mime || MediaRecorder.isTypeSupported(mime)) {
      return mime;
    }
  }
  return '';
}

export function InterviewRoom() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const requestedSessionId = searchParams?.get('sessionId') || '';

  // Références médias & audio
  const videoRef = useRef<HTMLVideoElement>(null);
  const audioStreamRef = useRef<MediaStream | null>(null);
  const videoStreamRef = useRef<MediaStream | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const audioElementRef = useRef<HTMLAudioElement | null>(null);
  const speechRecognitionRef = useRef<any>(null); // eslint-disable-line @typescript-eslint/no-explicit-any
  const cachedVoicesRef = useRef<SpeechSynthesisVoice[]>([]);
  const accumulatedTranscriptRef = useRef<string>('');
  const isSubmittingTurnRef = useRef<boolean>(false);
  const isRecordingRef = useRef<boolean>(false);
  const isAiSpeakingCancelledRef = useRef<boolean>(false);
  const ttsAbortControllerRef = useRef<AbortController | null>(null);

  // Arrêt immédiat et inconditionnel de toutes les voix et audios de l'IA (sans aucun déclenchement de fallback d'erreur)
  const stopAllAiSpeech = useCallback(() => {
    isAiSpeakingCancelledRef.current = true;

    // 1. Avorter immédiatement toute requête de synthèse audio OpenAI en cours
    if (ttsAbortControllerRef.current) {
      try {
        ttsAbortControllerRef.current.abort();
      } catch {}
      ttsAbortControllerRef.current = null;
    }

    // 2. Stopper et réinitialiser l'élément audio HTML5 en supprimant TOUS les écouteurs pour éviter que onerror ne déclenche le WebSpeech fallback
    if (audioElementRef.current) {
      try {
        const audio = audioElementRef.current;
        audio.onended = null;
        audio.onerror = null;
        audio.onplay = null;
        audio.onpause = null;
        audio.pause();
        audio.currentTime = 0;
        audio.removeAttribute('src');
        audio.load();
      } catch {}
      audioElementRef.current = null;
    }

    // 3. Stopper et vider définitivement la file d'attente de synthèse vocale locale
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      try {
        window.speechSynthesis.cancel();
        setTimeout(() => {
          try {
            window.speechSynthesis.cancel();
          } catch {}
        }, 50);
      } catch {}
    }

    setIsAiPlaying(false);
  }, []);

  // Précharger les voix dès le montage pour éviter toute voix masculine par défaut
  useEffect(() => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      const updateVoices = () => {
        const v = window.speechSynthesis.getVoices();
        if (v && v.length > 0) {
          cachedVoicesRef.current = v;
        }
      };
      updateVoices();
      window.speechSynthesis.onvoiceschanged = updateVoices;
    }
  }, []);

  // Analyseur audio (VU-mètre en direct)
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animFrameRef = useRef<number | null>(null);

  // Profil et session
  const [profile, setProfile] = useState<AcademicProfileData | null>(null);
  const [juryPersonality, setJuryPersonality] = useState<JuryPersonality>('STANDARD');
  const [sessionId, setSessionId] = useState<string>('');
  const [status, setStatus] = useState<InterviewStatus>('PERMISSION_CHECK');
  const [currentTurnIndex, setCurrentTurnIndex] = useState<number>(1);
  const [currentQuestion, setCurrentQuestion] = useState<string>('');
  const [pedagogicalIntent, setPedagogicalIntent] = useState<string>('');
  const [turnsHistory, setTurnsHistory] = useState<InterviewTurn[]>([]);

  // Charger la personnalité jury
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
  
  // Chronomètre de 5 minutes (300 secondes) synchronisé avec la prise de parole de l'IA
  const [timeRemaining, setTimeRemaining] = useState<number>(300);
  const [isTimerStarted, setIsTimerStarted] = useState<boolean>(false);
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Transcription & Parole
  const [liveTranscript, setLiveTranscript] = useState<string>('');
  const [candidateDraftAnswer, setCandidateDraftAnswer] = useState<string>('');
  const [audioLevel, setAudioLevel] = useState<number>(0);
  const [isCameraActive, setIsCameraActive] = useState<boolean>(true);
  const [hasMicrophonePermission, setHasMicrophonePermission] = useState<boolean | null>(null);

  // Saisie de secours clavier & messages
  const [isTextFallbackOpen, setIsTextFallbackOpen] = useState<boolean>(false);
  const [manualTextAnswer, setManualTextAnswer] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isAiPlaying, setIsAiPlaying] = useState<boolean>(false);
  // États gestion crédits et fin d'entretien
  const [hasCreditError, setHasCreditError] = useState<boolean>(false);
  const [isCreditModalOpen, setIsCreditModalOpen] = useState<boolean>(false);
  const [isActivatingFreeCredits, setIsActivatingFreeCredits] = useState<boolean>(false);
  // Verrou anti-double démarrage / concurrence
  const hasStartedSessionRef = useRef<boolean>(false);

  const handleActivateFreeCreditsInRoom = async () => {
    setIsActivatingFreeCredits(true);
    try {
      const res = await fetch('/api/credits', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: 10 }),
      });
      const data = await res.json();
      if (typeof data.balance === 'number') {
        try {
          localStorage.setItem('campus_france_credits_balance', data.balance.toString());
        } catch {
          // Ignorer
        }
        setHasCreditError(false);
        setStatus('PERMISSION_CHECK');
        hasStartedSessionRef.current = false;
        if (typeof window !== 'undefined') {
          window.location.reload();
        }
      }
    } catch {
      // Ignorer
    } finally {
      setIsActivatingFreeCredits(false);
    }
  };

  // 1. Initialiser le profil académique (Priorité Supabase serveur avec fallback localStorage)
  useEffect(() => {
    let mounted = true;

    async function loadProfile() {
      // Tenter d'abord la récupération du profil réel sauvegardé sur Supabase
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
        // En cas de coupure réseau, basculer sur le stockage local
      }

      // Repli sur le stockage local
      try {
        const saved = localStorage.getItem('campus_france_profile_draft');
        if (saved && mounted) {
          setProfile(JSON.parse(saved));
          return;
        }
      } catch {
        // Ignorer
      }

      // Repli par défaut minimal
      if (mounted) {
        setProfile({
          countryResidence: 'Sénégal',
          currentDiploma: 'Licence 3 Informatique',
          fieldOfStudy: 'Génie Logiciel',
          targetPrograms: 'Master Informatique Big Data',
          targetInstitutions: 'Université de Lille',
          reasonFrance: 'Approfondir mes compétences dans des laboratoires de référence.',
          professionalGoal: 'Devenir Data Engineer pour concevoir des architectures distribuées.',
          reasonsForPrograms: 'Maquette pédagogique axée sur la pratique et l\'alternance.',
          isCompleted: true,
        });
      }
    }

    loadProfile();

    return () => {
      mounted = false;
    };
  }, []);

  // 2. Initialiser le microphone et la webcam de manière découplée
  useEffect(() => {
    let mounted = true;

    async function initMedia() {
      // A. Microphone (prioritaire)
      try {
        if (!navigator?.mediaDevices?.getUserMedia) {
          if (mounted) {
            setHasMicrophonePermission(false);
            if (typeof window !== 'undefined' && !window.isSecureContext) {
              setErrorMessage(
                "Connexion non sécurisée détectée. Sur smartphone, Chrome et Safari exigent une connexion HTTPS pour activer le micro. Utilisez le lien sécurisé."
              );
            } else {
              setErrorMessage("Accès microphone non disponible sur ce navigateur.");
            }
          }
          return;
        }

        let audioStream: MediaStream;
        try {
          audioStream = await navigator.mediaDevices.getUserMedia({
            audio: {
              echoCancellation: true,
              noiseSuppression: true,
              autoGainControl: true,
            },
          });
        } catch {
          // Fallback avec contraintes allégées pour les navigateurs mobiles
          audioStream = await navigator.mediaDevices.getUserMedia({ audio: true });
        }

        if (!mounted) {
          audioStream.getTracks().forEach((t) => t.stop());
          return;
        }

        audioStreamRef.current = audioStream;
        setHasMicrophonePermission(true);

        // Analyseur de volume sonore (VU-mètre en direct)
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
            const updateLevel = () => {
              if (!mounted) return;
              analyser.getByteFrequencyData(dataArray);
              let sum = 0;
              for (let i = 0; i < dataArray.length; i++) {
                sum += dataArray[i];
              }
              const avg = sum / dataArray.length;
              setAudioLevel(Math.min(100, Math.round((avg / 128) * 100)));
              animFrameRef.current = requestAnimationFrame(updateLevel);
            };
            updateLevel();
          }
        } catch {
          // L'analyseur visuel est facultatif
        }
      } catch (audioErr) {
        if (!mounted) return;
        console.warn('Accès microphone non disponible :', audioErr);
        setHasMicrophonePermission(false);
        setErrorMessage(
          "Microphone non détecté ou accès refusé. Cliquez sur 'Autoriser le micro' ou utilisez le mode secours clavier."
        );
      }

      // B. Webcam locale facultative
      try {
        const videoStream = await navigator.mediaDevices.getUserMedia({
          video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: 'user' },
        });

        if (!mounted) {
          videoStream.getTracks().forEach((t) => t.stop());
          return;
        }

        videoStreamRef.current = videoStream;
        setIsCameraActive(true);
        if (videoRef.current) {
          videoRef.current.srcObject = videoStream;
        }
      } catch {
        // La caméra est facultative : ne pas bloquer l'entretien
        setIsCameraActive(false);
      }
    }

    initMedia();

    return () => {
      mounted = false;
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        audioContextRef.current.close().catch(() => {});
      }
      if (audioStreamRef.current) {
        audioStreamRef.current.getTracks().forEach((t) => t.stop());
      }
      if (videoStreamRef.current) {
        videoStreamRef.current.getTracks().forEach((t) => t.stop());
      }
    };
  }, []);

  // Décompte du chronomètre de 5 minutes (300 secondes) - Démarre exactement dès que l'IA commence à parler
  useEffect(() => {
    if (
      !isTimerStarted ||
      status === 'COMPLETED' || 
      status === 'GENERATING_REPORT' || 
      status === 'CREDIT_BLOCKED' || 
      status === 'ABORTED_INSUFFICIENT_DATA' ||
      hasCreditError
    ) {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
        timerIntervalRef.current = null;
      }
      return;
    }

    if (!timerIntervalRef.current) {
      timerIntervalRef.current = setInterval(() => {
        setTimeRemaining((prev) => {
          if (prev <= 1) {
            if (timerIntervalRef.current) {
              clearInterval(timerIntervalRef.current);
              timerIntervalRef.current = null;
            }
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }

    return () => {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
        timerIntervalRef.current = null;
      }
    };
  }, [isTimerStarted, status, hasCreditError]);

  // Détection de fin de temps réglementaire (5 minutes)
  useEffect(() => {
    if (timeRemaining === 0 && status !== 'COMPLETED' && status !== 'GENERATING_REPORT' && status !== 'ABORTED_INSUFFICIENT_DATA') {
      const validTurns = turnsHistory.filter(t => t.studentTranscript && !isTechnicalOrInvalidAnswer(t.studentTranscript));
      if (validTurns.length < 2) {
        setStatus('ABORTED_INSUFFICIENT_DATA');
      } else {
        handleFinalConclusion();
      }
    }
  }, [timeRemaining, status, turnsHistory]);

  // Démarrer l'enregistrement de l'étudiant
  const startStudentRecording = useCallback(async () => {
    isRecordingRef.current = true;
    setStatus('STUDENT_RECORDING');
    setLiveTranscript('');
    setCandidateDraftAnswer('');
    accumulatedTranscriptRef.current = '';
    audioChunksRef.current = [];
    setErrorMessage(null);

    // Reprendre l'AudioContext si suspendu par les politiques du navigateur
    if (audioContextRef.current && audioContextRef.current.state === 'suspended') {
      audioContextRef.current.resume().catch(() => {});
    }

    // Récupérer le flux audio si pas encore acquis (interaction mobile)
    let activeStream = audioStreamRef.current;
    if (!activeStream || activeStream.getAudioTracks().length === 0) {
      if (typeof navigator !== 'undefined' && navigator.mediaDevices?.getUserMedia) {
        try {
          try {
            activeStream = await navigator.mediaDevices.getUserMedia({
              audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
            });
          } catch {
            activeStream = await navigator.mediaDevices.getUserMedia({ audio: true });
          }
          audioStreamRef.current = activeStream;
          setHasMicrophonePermission(true);
        } catch (streamErr) {
          console.warn('Impossible d’activer le micro :', streamErr);
          setHasMicrophonePermission(false);
          setErrorMessage("Accès microphone requis. Veuillez cliquer sur 'Autoriser le micro' pour parler.");
        }
      }
    }

    // 1. Initialiser le MediaRecorder sur le flux audio PUR
    if (activeStream && activeStream.getAudioTracks().length > 0) {
      try {
        const pureAudioStream = new MediaStream(activeStream.getAudioTracks());
        const mimeType = getBestSupportedAudioMimeType();
        const options: MediaRecorderOptions = mimeType ? { mimeType } : {};

        const recorder = new MediaRecorder(pureAudioStream, options);
        mediaRecorderRef.current = recorder;

        recorder.ondataavailable = (event: BlobEvent) => {
          if (event.data && event.data.size > 0) {
            audioChunksRef.current.push(event.data);
          }
        };

        // Envoi régulier des tranches audio (fallback sans timeslice si rejeté par Safari/iOS)
        try {
          recorder.start(250);
        } catch {
          recorder.start();
        }
      } catch (err) {
        console.warn('Erreur démarrage MediaRecorder :', err);
      }
    }

    // 2. Transcription Web Speech en direct côté client (feedback visuel immédiat si disponible)
    if (typeof window !== 'undefined') {
      const SpeechRecognition =
        (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition; // eslint-disable-line @typescript-eslint/no-explicit-any

      if (SpeechRecognition) {
        try {
          if (speechRecognitionRef.current) {
            try {
              speechRecognitionRef.current.abort();
            } catch {}
          }

          const recognition = new SpeechRecognition();
          recognition.lang = 'fr-FR';
          recognition.continuous = true;
          recognition.interimResults = true;

          recognition.onresult = (event: any) => { // eslint-disable-line @typescript-eslint/no-explicit-any
            let transcript = '';
            for (let i = 0; i < event.results.length; i++) {
              transcript += event.results[i][0].transcript + ' ';
            }
            const clean = transcript.trim();
            accumulatedTranscriptRef.current = clean;
            setLiveTranscript(clean);
          };

          recognition.onerror = () => {
            // Ignorer l'erreur non-bloquante de Web Speech
          };

          // Gestion des courtes pauses de réflexion : si le navigateur coupe après un silence, redémarrer tant que l'enregistrement est actif
          recognition.onend = () => {
            if (isRecordingRef.current) {
              try {
                recognition.start();
              } catch {}
            }
          };

          recognition.start();
          speechRecognitionRef.current = recognition;
        } catch {
          // Web Speech non disponible ou déjà actif
        }
      }
    }
  }, []);


  // Fallback vocal local avec sélection d'une voix féminine française naturelle, posée et articulée
  const fallbackWebSpeech = useCallback((text: string, onEnd: () => void) => {
    // Si l'utilisateur a arrêté l'entretien ou a coupé la voix, NE JAMAIS parler
    if (isAiSpeakingCancelledRef.current) {
      onEnd();
      return;
    }

    if (!text || !text.trim() || hasCreditError || status === 'CREDIT_BLOCKED') {
      onEnd();
      return;
    }

    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();

      // Aération du texte pour forcer des pauses naturelles dans la synthèse locale
      const relaxedText = text
        .replace(/Bonjour\s/i, 'Bonjour, ')
        .replace(/Très bien\s/i, 'Très bien, ')
        .replace(/D'accord\s/i, "D'accord, ")
        .replace(/\s*;\s*/g, ', ')
        .replace(/\s*\?\s*/g, ' ? ');

      const utterance = new SpeechSynthesisUtterance(relaxedText);
      utterance.lang = 'fr-FR';
      utterance.rate = 0.88; // Rythme posé, calme et distinct (au lieu de 0.98 qui précipitait l'élocution)
      utterance.pitch = 1.0; // Hauteur de voix naturelle, douce et posée

      // Sélection prioritaire d'une voix féminine naturelle et douce
      const availableVoices = cachedVoicesRef.current.length > 0
        ? cachedVoicesRef.current
        : window.speechSynthesis.getVoices();

      const frenchVoices = availableVoices.filter((v) => v.lang.startsWith('fr'));
      const femaleFrenchVoice =
        frenchVoices.find((v) => /google\s+français/i.test(v.name)) ||
        frenchVoices.find((v) =>
          /audrey|aurélie|aurelie|amélie|amelie|marie|hortense|denise|julie|virginie|céline|celine|female|femme/i.test(v.name)
        ) ||
        frenchVoices.find((v) => !/thomas|nicolas|paul|claude|male|homme|daniel|david|antoine/i.test(v.name)) ||
        frenchVoices[0];

      if (femaleFrenchVoice) {
        utterance.voice = femaleFrenchVoice;
      }

      let hasEnded = false;
      const safeEnd = () => {
        if (!hasEnded) {
          hasEnded = true;
          onEnd();
        }
      };

      utterance.onstart = () => {
        setIsTimerStarted(true);
      };

      utterance.onend = safeEnd;
      utterance.onerror = safeEnd;

      // Timeout de sécurité mobile si la synthèse vocale est gelée par l'OS sans interaction
      const wordsCount = relaxedText.split(/\s+/).length;
      const estimatedDurationMs = Math.max(3000, Math.min(12000, wordsCount * 450));
      setTimeout(safeEnd, estimatedDurationMs + 1500);

      window.speechSynthesis.speak(utterance);
    } else {
      onEnd();
    }
  }, [hasCreditError, status]);

  // Synthèse vocale de la question de l'IA (voix féminine française naturelle)
  const speakQuestion = useCallback(async (textToSpeak: string) => {
    if (!textToSpeak || !textToSpeak.trim() || hasCreditError || status === 'CREDIT_BLOCKED') {
      return;
    }

    // Réinitialiser le verrou d'annulation pour cette nouvelle prise de parole légitime
    isAiSpeakingCancelledRef.current = false;

    // Annuler toute requête audio OpenAI précédente encore en vol
    if (ttsAbortControllerRef.current) {
      try {
        ttsAbortControllerRef.current.abort();
      } catch {}
    }
    const abortController = new AbortController();
    ttsAbortControllerRef.current = abortController;

    setIsAiPlaying(true);
    setStatus('AI_SPEAKING');

    const triggerReadyAfterSpeech = () => {
      setIsTimerStarted(true);
      setIsAiPlaying(false);
      startStudentRecording();
    };

    try {
      const res = await fetch('/api/audio/synthesize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: textToSpeak }),
        signal: abortController.signal,
      });

      if (isAiSpeakingCancelledRef.current) {
        return;
      }

      if (res.status === 200) {
        const audioBlob = await res.blob();
        if (isAiSpeakingCancelledRef.current) {
          return;
        }

        const audioUrl = URL.createObjectURL(audioBlob);
        const audio = new Audio(audioUrl);
        audioElementRef.current = audio;

        // Déclencher le minuteur exactement dès que le son commence à sortir des haut-parleurs
        audio.onplay = () => {
          setIsTimerStarted(true);
        };

        audio.onended = () => {
          URL.revokeObjectURL(audioUrl);
          if (!isAiSpeakingCancelledRef.current) {
            triggerReadyAfterSpeech();
          }
        };

        audio.onerror = () => {
          // NE JAMAIS déclencher le fallback local si l'arrêt a été demandé par l'utilisateur !
          if (isAiSpeakingCancelledRef.current) {
            return;
          }
          fallbackWebSpeech(textToSpeak, triggerReadyAfterSpeech);
        };

        try {
          await audio.play();
          setIsTimerStarted(true);
          return;
        } catch (playErr) {
          console.warn('Autoplay audio bloqué sur mobile par le navigateur :', playErr);
          // Si l'autoplay est bloqué par iOS/Chrome mobile, on donne immédiatement la main au candidat
          if (!isAiSpeakingCancelledRef.current) {
            triggerReadyAfterSpeech();
          }
          return;
        }
      }
    } catch {
      // Ignorer si la requête a été volontairement avortée
    }

    if (!isAiSpeakingCancelledRef.current) {
      fallbackWebSpeech(textToSpeak, triggerReadyAfterSpeech);
    }
  }, [startStudentRecording, fallbackWebSpeech, hasCreditError, status]);

  // Arrêter l'enregistrement et transcrire la réponse pour vérification
  const handleStopRecordingAndTranscribe = async () => {
    isRecordingRef.current = false;
    // 1. Arrêter la reconnaissance vocale Web Speech
    if (speechRecognitionRef.current) {
      try {
        speechRecognitionRef.current.stop();
      } catch {}
    }

    // Forcer la capture immédiate des données audio en tampon
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      try {
        mediaRecorderRef.current.requestData();
      } catch {}
    }

    // 2. Attendre que le MediaRecorder termine et délivre tous les chunks (délai ultra-court pour fluidité maximale)
    let finalAudioBlob: Blob | null = null;

    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      try {
        finalAudioBlob = await new Promise<Blob | null>((resolve) => {
          const recorder = mediaRecorderRef.current;
          if (!recorder) {
            resolve(null);
            return;
          }

          // Timeout de sécurité réduit à 350ms pour réactivité instantanée
          const timeoutId = setTimeout(() => {
            if (audioChunksRef.current.length > 0) {
              const mime = recorder.mimeType || 'audio/webm';
              resolve(new Blob(audioChunksRef.current, { type: mime }));
            } else {
              resolve(null);
            }
          }, 350);

          recorder.onstop = () => {
            clearTimeout(timeoutId);
            if (audioChunksRef.current.length > 0) {
              const mime = recorder.mimeType || 'audio/webm';
              resolve(new Blob(audioChunksRef.current, { type: mime }));
            } else {
              resolve(null);
            }
          };

          recorder.stop();
        });
      } catch (err) {
        console.warn('Erreur fermeture MediaRecorder :', err);
      }
    } else if (audioChunksRef.current.length > 0) {
      finalAudioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
    }

    // Récupérer le texte capté en direct par Web Speech
    const liveText = accumulatedTranscriptRef.current.trim() || liveTranscript.trim();
    let recognizedText = liveText;
    let apiErrorMessage: string | null = null;

    // Si on a déjà du texte en direct, basculer DIRECTEMENT sur l'écran de relecture sans temps d'attente
    if (liveText && !isTechnicalOrInvalidAnswer(liveText)) {
      setCandidateDraftAnswer(liveText);
      setStatus('REVIEW_RESPONSE');
    } else {
      setStatus('TRANSCRIBING');
    }

    // 3. Envoyer l'audio à Whisper si disponible pour affiner
    if (finalAudioBlob && finalAudioBlob.size > 150) {
      try {
        const formData = new FormData();
        const extension = finalAudioBlob.type.includes('mp4') ? 'mp4' : 'webm';
        formData.append('audio', finalAudioBlob, `student_response.${extension}`);
        formData.append('fallbackTranscript', recognizedText || '');

        const transcribeRes = await fetch('/api/audio/transcribe', {
          method: 'POST',
          body: formData,
        });

        if (transcribeRes.ok) {
          const transData = await transcribeRes.json();
          if (transData.transcript && !isTechnicalOrInvalidAnswer(transData.transcript)) {
            recognizedText = transData.transcript.trim();
            // Mettre à jour avec la transcription Whisper plus soignée
            setCandidateDraftAnswer(recognizedText);
            setErrorMessage(null);
          }
        } else {
          const errData = await transcribeRes.json().catch(() => null);
          if (transcribeRes.status === 401) {
            apiErrorMessage = errData?.error || "Non authentifié. Connexion requise.";
          } else if (errData?.error) {
            apiErrorMessage = errData.error;
          }
        }
      } catch (err) {
        console.warn('[Transcription API Fallback]', err);
      }
    }

    // 4. Fallback si aucune parole n'a été captée
    if (!recognizedText || isTechnicalOrInvalidAnswer(recognizedText)) {
      setCandidateDraftAnswer('');
      setErrorMessage(
        apiErrorMessage ||
        "Aucune parole reconnue. Saisissez votre réponse ci-dessous ou réenregistrez."
      );
    }

    setStatus('REVIEW_RESPONSE');
  };


  // Valider et envoyer la réponse confirmée à l'examinatrice IA
  const handleSubmitConfirmedAnswer = async (finalText: string) => {
    // Verrou anti-double clic pour éviter toute question posée en double
    if (isSubmittingTurnRef.current) return;
    isSubmittingTurnRef.current = true;

    const studentResponse = finalText.trim();

    if (!studentResponse || isTechnicalOrInvalidAnswer(studentResponse)) {
      setErrorMessage("Veuillez saisir ou enregistrer une réponse explicite avant d'envoyer.");
      isSubmittingTurnRef.current = false;
      return;
    }

    // Envoyer au moteur d'entretien adaptatif
    setStatus('AI_EVALUATING');
    try {
      const turnRes = await fetch('/api/interview/turn', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          turnIndex: currentTurnIndex,
          currentQuestion, // Transmettre la question exacte à laquelle la candidate vient de répondre
          studentTranscript: studentResponse,
          elapsedSeconds: 300 - timeRemaining,
          profile,
          turnsHistory: turnsHistory,
          juryPersonality,
        }),
      });

      const turnData = await turnRes.json();

      if (!turnRes.ok) {
        // En cas d'erreur serveur : préserver le texte rédigé/transcrit par l'étudiant !
        setErrorMessage(
          turnData.error ||
          "Une erreur est survenue lors de l'envoi de votre réponse. Votre texte a été conservé, vous pouvez réessayer."
        );
        setCandidateDraftAnswer(studentResponse);
        setStatus('REVIEW_RESPONSE');
        isSubmittingTurnRef.current = false;
        return;
      }

      // Enregistrer le tour validé dans l'historique
      const newTurn: InterviewTurn = {
        turnIndex: currentTurnIndex,
        aiQuestion: currentQuestion,
        pedagogicalIntent,
        studentTranscript: studentResponse,
        turnType: turnData.turnType || 'REGULAR',
        durationSeconds: 300 - timeRemaining,
        timestamp: new Date().toISOString(),
      };

      const updatedHistory = [...turnsHistory, newTurn];
      setTurnsHistory(updatedHistory);
      setManualTextAnswer('');
      setCandidateDraftAnswer('');
      setErrorMessage(null);
      isSubmittingTurnRef.current = false;

      if (turnData.isConcluding || timeRemaining <= 30) {
        handleFinalConclusion(updatedHistory);
      } else {
        setCurrentTurnIndex((prev) => prev + 1);
        setCurrentQuestion(turnData.question);
        setPedagogicalIntent(turnData.pedagogicalIntent || "Évaluation en cours");
        setStatus('AI_SPEAKING');
        speakQuestion(turnData.question);
      }
    } catch {
      // En cas de coupure réseau : préserver la réponse sans perte de données
      isSubmittingTurnRef.current = false;
      setErrorMessage("Problème de connexion réseau. Votre réponse a été conservée, vous pouvez retenter l'envoi.");
      setCandidateDraftAnswer(studentResponse);
      setStatus('REVIEW_RESPONSE');
    }
  };


  // Clôture et génération du rapport final
  const handleFinalConclusion = async (finalTurns?: InterviewTurn[]) => {
    stopAllAiSpeech();
    setStatus('GENERATING_REPORT');
    const turnsToAnalyze = finalTurns || turnsHistory;

    try {
      const res = await fetch('/api/interview/report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          profile,
          turns: turnsToAnalyze,
        }),
      });

      const data = await res.json();
      if (res.status === 422 || data.insufficientData) {
        setStatus('ABORTED_INSUFFICIENT_DATA');
        return;
      }

      if (data.report) {
        localStorage.setItem(`campus_france_report_${sessionId}`, JSON.stringify(data.report));
        localStorage.setItem('campus_france_last_report', JSON.stringify(data.report));
        setStatus('COMPLETED');
        router.push(`/rapport/${sessionId}`);
      } else {
        router.push('/dashboard');
      }
    } catch (err) {
      console.error('Erreur rapport :', err);
      router.push('/dashboard');
    }
  };

  // Terminaison immédiate et inconditionnelle de l'entretien (dès que l'étudiant clique sur "Terminer")
  const handleTerminateInterview = async () => {
    // 1. Coupe absolument tout le son, la voix IA, le chronomètre et les périphériques
    stopAllAiSpeech();
    setIsTimerStarted(false);

    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }
    if (audioStreamRef.current) {
      audioStreamRef.current.getTracks().forEach((t) => t.stop());
      audioStreamRef.current = null;
    }
    if (videoStreamRef.current) {
      videoStreamRef.current.getTracks().forEach((t) => t.stop());
      videoStreamRef.current = null;
    }
    if (speechRecognitionRef.current) {
      try {
        speechRecognitionRef.current.abort();
      } catch {}
      speechRecognitionRef.current = null;
    }

    // 2. Récupérer l'éventuelle réponse en cours de parole ou texte
    const finalTurns = [...turnsHistory];
    const draft = candidateDraftAnswer.trim() || accumulatedTranscriptRef.current.trim() || manualTextAnswer.trim();
    if (draft && !isTechnicalOrInvalidAnswer(draft)) {
      finalTurns.push({
        turnIndex: currentTurnIndex,
        aiQuestion: currentQuestion,
        pedagogicalIntent,
        studentTranscript: draft,
        turnType: 'REGULAR',
        durationSeconds: 300 - timeRemaining,
        timestamp: new Date().toISOString(),
      });
    }

    // Filtrer les vraies réponses académiques (exclure salutations vides ou bruits)
    const validAcademicTurns = finalTurns.filter(
      (t) => t.studentTranscript && t.studentTranscript.trim() && !isTechnicalOrInvalidAnswer(t.studentTranscript)
    );
    const totalRecordedWords = validAcademicTurns.reduce(
      (acc, t) => acc + t.studentTranscript.split(/\s+/).filter(Boolean).length,
      0
    );

    // Contrôle strict : au moins 2 questions répondues avec du contenu substantiel pour générer un bilan
    const isSubstantialInterview = validAcademicTurns.length >= 2 && totalRecordedWords >= 25;

    if (!isSubstantialInterview) {
      // Marquer la session en base comme ABANDONED pour préserver les crédits
      try {
        if (sessionId && !sessionId.startsWith('session_')) {
          const supabase = createClient();
          await supabase
            .from('interview_sessions')
            .update({ status: 'ABANDONED', ended_at: new Date().toISOString() })
            .eq('id', sessionId);
        }
      } catch (err) {
        console.warn('Erreur mise à jour session abandonnée :', err);
      }

      // Afficher immédiatement l'écran de notification clair
      setStatus('ABORTED_INSUFFICIENT_DATA');
      return;
    }

    // Si la session contient assez de réponses réelles, générer le bilan
    await handleFinalConclusion(finalTurns);
  };

  // Démarrer la session au montage avec verrou anti-double appel / concurrence
  useEffect(() => {
    async function startSession() {
      if (!profile || hasStartedSessionRef.current) return;
      hasStartedSessionRef.current = true;

      try {
        const res = await fetch('/api/interview/start', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            profile, 
            juryPersonality,
            sessionId: requestedSessionId || undefined,
          }),
        });

        const data = await res.json();
        if (data.success) {
          setSessionId(data.sessionId);
          setCurrentQuestion(data.initialTurn.aiQuestion);
          setPedagogicalIntent(data.initialTurn.pedagogicalIntent);
          speakQuestion(data.initialTurn.aiQuestion);
        } else {
          hasStartedSessionRef.current = false;
          const isCreditIssue = res.status === 403 || 
            (data.error && (
              data.error.toLowerCase().includes('solde') || 
              data.error.toLowerCase().includes('crédit') ||
              data.error.toLowerCase().includes('credit') ||
              data.error.toLowerCase().includes('simulations disponibles')
            ));

          if (isCreditIssue) {
            setHasCreditError(true);
            setStatus('CREDIT_BLOCKED');
            if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
            if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
              window.speechSynthesis.cancel();
            }
            if (audioElementRef.current) {
              audioElementRef.current.pause();
            }
            if (audioStreamRef.current) {
              audioStreamRef.current.getTracks().forEach((t) => t.stop());
            }
            if (videoStreamRef.current) {
              videoStreamRef.current.getTracks().forEach((t) => t.stop());
            }
          }
          setErrorMessage(data.error || 'Erreur lors du démarrage.');
        }
      } catch {
        hasStartedSessionRef.current = false;
        setErrorMessage('Impossible de contacter le serveur.');
      }
    }

    startSession();
  }, [profile]); // eslint-disable-line react-hooks/exhaustive-deps

  // Basculer la webcam locale (l'étudiant peut couper/rallumer sa caméra à tout moment sans couper son micro)
  const toggleCamera = async () => {
    if (isCameraActive) {
      // 1. Couper la caméra locale (arrête les pistes matérielles pour couper le voyant vert de la caméra)
      if (videoStreamRef.current) {
        videoStreamRef.current.getTracks().forEach((track) => track.stop());
        videoStreamRef.current = null;
      }
      if (videoRef.current) {
        videoRef.current.srcObject = null;
      }
      setIsCameraActive(false);
    } else {
      // 2. Rallumer la caméra locale
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: 'user' },
        });
        videoStreamRef.current = stream;
        setIsCameraActive(true);
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      } catch (err) {
        console.warn('Impossible de réactiver la caméra :', err);
        setIsCameraActive(false);
      }
    }
  };

  // Reconnecter le flux vidéo dès que la caméra est active et le nœud DOM vidéo est monté
  useEffect(() => {
    if (isCameraActive && videoStreamRef.current && videoRef.current) {
      videoRef.current.srcObject = videoStreamRef.current;
    }
  }, [isCameraActive]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  // Écran d'alerte et blocage immédiat si l'utilisateur n'a plus de crédits
  if (hasCreditError || status === 'CREDIT_BLOCKED') {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-center p-4">
        <div className="max-w-md w-full bg-slate-900/90 border border-amber-500/30 rounded-3xl p-6 sm:p-8 backdrop-blur-md shadow-2xl text-center space-y-5">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 shadow-inner">
            <Sparkles className="w-8 h-8" />
          </div>

          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-white mb-2">
              Crédits de simulation épuisés
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
              {errorMessage || "Vous avez utilisé toutes vos simulations d'entretien disponibles. Rechargez votre compte pour démarrer cette simulation avec l'examinateur IA."}
            </p>
          </div>

          <div className="p-3.5 rounded-2xl bg-slate-950/80 border border-slate-800 text-xs text-slate-400 text-left space-y-1">
            <div className="text-cyan-400 font-semibold flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5" />
              Accès garanti & sans expiration
            </div>
            <p>
              Rechargez par Carte Bancaire ou Mobile Money (Wave, Orange, MTN). Vos crédits sont activés instantanément.
            </p>
          </div>

          <div className="flex flex-col gap-2.5 pt-1">
            <button
              type="button"
              disabled={isActivatingFreeCredits}
              onClick={handleActivateFreeCreditsInRoom}
              className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-emerald-600 via-teal-500 to-cyan-500 hover:from-emerald-500 hover:to-teal-400 disabled:opacity-50 text-white font-bold text-sm shadow-xl shadow-emerald-500/25 transition active:scale-95 flex items-center justify-center gap-2 cursor-pointer"
            >
              <Sparkles className="w-4 h-4 text-emerald-100" />
              <span>
                {isActivatingFreeCredits
                  ? 'Activation en cours...'
                  : '🎁 Activer 10 simulations gratuites (Test)'}
              </span>
            </button>
            <button
              type="button"
              onClick={() => setIsCreditModalOpen(true)}
              className="w-full py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs border border-slate-700 transition active:scale-95"
            >
              Recharger par Mobile Money / Carte
            </button>
            <button
              type="button"
              onClick={() => router.push('/dashboard')}
              className="w-full py-2 px-4 rounded-xl text-slate-400 hover:text-slate-300 font-medium text-xs transition"
            >
              Retourner au tableau de bord
            </button>
          </div>
        </div>

        <MobileMoneyModal
          isOpen={isCreditModalOpen}
          onClose={() => setIsCreditModalOpen(false)}
          onPaymentSuccess={() => {
            setIsCreditModalOpen(false);
            setHasCreditError(false);
            setStatus('PERMISSION_CHECK');
            hasStartedSessionRef.current = false;
            if (typeof window !== 'undefined') {
              window.location.reload();
            }
          }}
        />
      </div>
    );
  }

  // Écran d'arrêt immédiat avec notification claire si l'étudiant a quitté avant de répondre à assez de questions
  if (status === 'ABORTED_INSUFFICIENT_DATA') {
    return (
      <div className="min-h-screen bg-[#05070E] text-slate-100 flex flex-col justify-between p-4 sm:p-8">
        <div className="max-w-lg w-full mx-auto my-auto bg-slate-900/90 border border-slate-800 rounded-3xl p-6 sm:p-8 backdrop-blur-md shadow-2xl space-y-6 text-center animate-in fade-in duration-300">
          <div className="w-16 h-16 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400 mx-auto shadow-lg shadow-amber-500/10">
            <PhoneOff className="w-8 h-8" />
          </div>

          <div>
            <span className="inline-block px-3 py-1 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20 mb-3">
              Simulation terminée
            </span>
            <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
              Entretien interrompu
            </h2>
            <p className="text-sm text-slate-300 mt-3 leading-relaxed">
              Vous avez mis fin à la simulation avant d&apos;avoir répondu à suffisamment de questions.
            </p>
            <div className="mt-3 text-xs text-slate-300 leading-relaxed bg-slate-950/70 p-4 rounded-xl border border-slate-800 text-left space-y-1.5">
              <p className="font-semibold text-amber-300 flex items-center gap-1.5">
                <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
                <span>Aucun rapport d&apos;évaluation n&apos;a été généré</span>
              </p>
              <p className="text-slate-400">
                L&apos;examinatrice ne dispose pas d&apos;assez d&apos;informations orales (au moins 2 réponses de fond requises) pour noter rigoureusement votre prestation et formuler des axes d&apos;amélioration sans rien inventer.
              </p>
            </div>
          </div>

          <div className="p-3.5 rounded-2xl bg-emerald-950/40 border border-emerald-500/30 flex items-center gap-3 text-left">
            <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0" />
            <div className="text-xs text-emerald-200">
              <span className="font-bold text-white block">Solde préservé</span>
              Aucun crédit de simulation n&apos;a été débité de votre compte. Votre solde reste intact.
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
            <button
              type="button"
              onClick={() => {
                if (typeof window !== 'undefined') {
                  window.location.reload();
                }
              }}
              className="w-full sm:flex-1 py-3.5 px-4 rounded-xl bg-gradient-to-r from-blue-600 via-cyan-500 to-teal-400 hover:from-blue-500 hover:to-cyan-400 text-white font-bold text-xs sm:text-sm shadow-xl shadow-cyan-500/20 transition flex items-center justify-center gap-2 active:scale-95 cursor-pointer"
            >
              <RotateCcw className="w-4 h-4" />
              <span>Recommencer la simulation</span>
            </button>

            <Link
              href="/dashboard"
              className="w-full sm:flex-1 py-3.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white font-semibold text-xs sm:text-sm border border-slate-700 transition flex items-center justify-center gap-2 cursor-pointer"
            >
              <LayoutDashboard className="w-4 h-4" />
              <span>Tableau de bord</span>
            </Link>
          </div>

          <div className="text-center pt-1">
            <Link href="/" className="text-xs text-slate-400 hover:text-cyan-400 transition">
              Retourner à l&apos;accueil
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between">
      {/* Barre supérieure : Chronomètre & Statut */}
      <header className="border-b border-slate-800/80 bg-slate-900/80 backdrop-blur-md px-3 sm:px-4 py-2.5 sm:py-3 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
          <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white font-bold text-xs shadow-md shadow-blue-500/20 shrink-0">
            CF
          </div>
          <div className="min-w-0">
            <h1 className="text-xs sm:text-sm font-semibold text-white truncate">
              Entretien Campus France
            </h1>
            <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
              <span className="text-[10px] text-cyan-400 font-medium">
                Tour {currentTurnIndex} • {pedagogicalIntent || "Évaluation"}
              </span>
              <span className={`px-1.5 py-0.5 rounded text-[9px] font-semibold uppercase tracking-wider ${
                juryPersonality === 'CRASH_TEST'
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                  : juryPersonality === 'BIENVEILLANT'
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                  : 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
              }`}>
                {juryPersonality === 'CRASH_TEST' ? 'Crash-Test' : juryPersonality === 'BIENVEILLANT' ? 'Pédagogue' : 'Officiel'}
              </span>
            </div>
          </div>
        </div>

        {/* Chronomètre dégressif, Contrôle Caméra & Bouton Terminer */}
        <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
          {/* Bouton rapide d'activation / coupure de la caméra */}
          <button
            type="button"
            onClick={toggleCamera}
            className={`px-2.5 py-1.5 sm:px-3 sm:py-1.5 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition active:scale-95 cursor-pointer shadow-sm ${
              isCameraActive
                ? 'bg-slate-900 border-slate-700 text-slate-300 hover:text-white hover:bg-slate-800'
                : 'bg-rose-500/15 border-rose-500/30 text-rose-300 hover:bg-rose-500/25'
            }`}
            title={isCameraActive ? "Couper la caméra (mode vocal seul)" : "Allumer la caméra"}
          >
            {isCameraActive ? (
              <>
                <Camera className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-cyan-400 shrink-0" />
                <span className="hidden sm:inline text-xs">Caméra ON</span>
              </>
            ) : (
              <>
                <CameraOff className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-rose-400 shrink-0" />
                <span className="hidden sm:inline text-xs">Caméra OFF</span>
              </>
            )}
          </button>

          <div
            className={`px-2.5 py-1.5 sm:px-3 rounded-xl border flex items-center gap-1.5 sm:gap-2 font-mono font-bold text-xs sm:text-sm ${
              timeRemaining < 60
                ? 'bg-rose-950/60 border-rose-500/50 text-rose-300 animate-pulse'
                : 'bg-slate-950 border-slate-700 text-cyan-300'
            }`}
          >
            <Clock className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-cyan-400" />
            <span>{formatTime(timeRemaining)}</span>
          </div>

          <button
            type="button"
            onClick={handleTerminateInterview}
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 sm:px-3 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 text-rose-300 hover:text-rose-200 border border-rose-500/30 text-xs font-semibold transition active:scale-95 shadow-sm cursor-pointer"
            title="Arrêter ou terminer immédiatement l'entretien"
          >
            <PhoneOff className="w-3.5 h-3.5 text-rose-400 shrink-0" />
            <span>Terminer</span>
          </button>
        </div>
      </header>

      {/* Corps Principal : Caméra locale & Zone Question-Réponse */}
      <main className="flex-1 max-w-5xl w-full mx-auto p-4 sm:p-6 flex flex-col justify-center gap-6">
        {errorMessage && (
          <div className="p-4 rounded-xl bg-rose-950/40 border border-rose-500/40 text-rose-300 text-xs flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 shadow-lg">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
              <span>{errorMessage}</span>
            </div>
            {hasMicrophonePermission === false && (
              <button
                type="button"
                onClick={async () => {
                  if (typeof navigator !== 'undefined' && navigator.mediaDevices?.getUserMedia) {
                    try {
                      let stream: MediaStream;
                      try {
                        stream = await navigator.mediaDevices.getUserMedia({
                          audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
                        });
                      } catch {
                        stream = await navigator.mediaDevices.getUserMedia({ audio: true });
                      }
                      audioStreamRef.current = stream;
                      setHasMicrophonePermission(true);
                      setErrorMessage(null);
                    } catch {
                      alert("Veuillez autoriser l'accès au microphone dans les réglages de votre navigateur.");
                    }
                  } else {
                    alert("Accès microphone impossible sur connexion non sécurisée. Ouvrez le lien sécurisé HTTPS.");
                  }
                }}
                className="self-start sm:self-auto shrink-0 px-3.5 py-1.5 rounded-lg bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-bold text-xs shadow-md transition active:scale-95 flex items-center gap-1.5"
              >
                <Mic className="w-3.5 h-3.5" />
                <span>Autoriser le micro</span>
              </button>
            )}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
          {/* Colonne Caméra Locale & Indicateur Micro */}
          <div className="md:col-span-5 flex flex-col items-center">
            <div className={`relative w-full aspect-video sm:aspect-square max-w-sm bg-slate-900 rounded-3xl overflow-hidden shadow-2xl flex items-center justify-center transition-all duration-200 ${
              status === 'STUDENT_RECORDING' && audioLevel > 6
                ? 'border-2 border-emerald-400 shadow-[0_0_30px_rgba(16,185,129,0.35)]'
                : status === 'STUDENT_RECORDING'
                ? 'border border-cyan-500/50 shadow-[0_0_20px_rgba(6,182,212,0.15)]'
                : 'border border-slate-800'
            }`}>
              {isCameraActive ? (
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-cover transform -scale-x-100"
                />
              ) : (
                <div className="flex flex-col items-center justify-center p-6 text-center gap-3 w-full h-full bg-slate-950/90">
                  <div className={`relative w-16 h-16 sm:w-20 sm:h-20 rounded-full flex items-center justify-center transition-all duration-200 ${
                    status === 'STUDENT_RECORDING' && audioLevel > 6
                      ? 'bg-emerald-500/20 border-2 border-emerald-400 text-emerald-300 scale-105 shadow-[0_0_25px_rgba(16,185,129,0.4)]'
                      : 'bg-slate-800/80 border border-slate-700 text-slate-300'
                  }`}>
                    <User className="w-8 h-8 sm:w-10 sm:h-10 text-cyan-400" />
                    {status === 'STUDENT_RECORDING' && audioLevel > 6 && (
                      <span className="absolute inset-0 rounded-full border-2 border-emerald-400 animate-ping opacity-75" />
                    )}
                  </div>
                  <div>
                    <span className="text-xs font-semibold text-white block">
                      {profile?.fieldOfStudy ? `Candidat • ${profile.fieldOfStudy}` : 'Candidat'}
                    </span>
                    <span className="text-[11px] text-slate-400 block mt-0.5">
                      Caméra coupée • Micro toujours actif
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={toggleCamera}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-cyan-500/15 hover:bg-cyan-500/25 border border-cyan-500/30 text-cyan-300 text-xs font-semibold transition active:scale-95 cursor-pointer shadow-xs"
                  >
                    <Camera className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Allumer ma caméra</span>
                  </button>
                </div>
              )}

              {/* Bouton de bascule de la webcam locale */}
              <button
                type="button"
                onClick={toggleCamera}
                className="absolute top-3 right-3 p-2 rounded-xl bg-slate-950/85 hover:bg-slate-800 text-slate-300 border border-slate-700/60 backdrop-blur-md transition cursor-pointer shadow-md active:scale-95 z-20"
                title={isCameraActive ? "Couper la caméra (mode vocal seul)" : "Allumer la caméra"}
              >
                {isCameraActive ? <Camera className="w-4 h-4 text-cyan-400" /> : <CameraOff className="w-4 h-4 text-rose-400" />}
              </button>

              {/* Indicateur de micro & VU-mètre en direct */}
              <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between">
                <div className={`backdrop-blur-md px-3 py-1.5 rounded-full text-[11px] font-medium border flex items-center gap-2 transition-all ${
                  status === 'STUDENT_RECORDING' && audioLevel > 6
                    ? 'bg-emerald-950/90 border-emerald-500/60 text-emerald-300 shadow-md shadow-emerald-500/20'
                    : status === 'STUDENT_RECORDING'
                    ? 'bg-slate-950/85 border-cyan-500/40 text-cyan-300'
                    : 'bg-slate-950/85 border-slate-700/60 text-slate-200'
                }`}>
                  <span
                    className={`w-2.5 h-2.5 rounded-full ${
                      status === 'STUDENT_RECORDING' && audioLevel > 6
                        ? 'bg-emerald-400 animate-ping'
                        : status === 'STUDENT_RECORDING'
                        ? 'bg-emerald-400 animate-pulse'
                        : 'bg-slate-500'
                    }`}
                  />
                  <span>
                    {status === 'STUDENT_RECORDING'
                      ? audioLevel > 6
                        ? 'Vous parlez...'
                        : 'Micro ouvert'
                      : status === 'REVIEW_RESPONSE'
                      ? 'Réponse prête'
                      : 'Micro en attente'}
                  </span>

                  {/* VU-mètre dynamique réactif à la voix réelle */}
                  {status === 'STUDENT_RECORDING' && hasMicrophonePermission && (
                    <div className="flex items-end gap-0.5 h-3.5 ml-1">
                      {[0.8, 1.4, 2.0, 1.5, 0.9].map((m, i) => (
                        <span
                          key={i}
                          className={`w-1 rounded-full transition-all duration-75 ${
                            audioLevel > 6 ? 'bg-emerald-400' : 'bg-slate-600'
                          }`}
                          style={{ height: `${Math.max(20, Math.min(100, (audioLevel || 10) * m))}%` }}
                        />
                      ))}
                    </div>
                  )}
                </div>

                <span className="bg-slate-950/80 backdrop-blur-md px-2.5 py-1 rounded-full text-[11px] font-medium border border-slate-700/60 text-slate-400">
                  {profile?.currentDiploma || 'Candidat'}
                </span>
              </div>
            </div>

            {/* Note rassurante de sécurité caméra */}
            <div className="flex items-center gap-2 mt-2 px-3 py-1.5 rounded-xl bg-slate-900/60 border border-slate-800 text-[11px] text-slate-400">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <span>Caméra locale d&apos;immersion • Aucun flux vidéo enregistré</span>
            </div>
          </div>

          {/* Colonne Dialogue & État de l'IA */}
          <div className="md:col-span-7 flex flex-col gap-4">
            {/* Carte Question de l'examinatrice */}
            <div className="bg-slate-900/80 border border-slate-800/90 rounded-2xl p-6 backdrop-blur-md shadow-xl relative overflow-hidden">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2 text-sm font-semibold text-cyan-400">
                  <Bot className="w-4 h-4" />
                  <span>Question de l&apos;examinatrice Campus France</span>
                </div>

                {isAiPlaying && (
                  <span className="inline-flex items-center gap-1.5 text-xs text-cyan-300 font-medium animate-pulse">
                    <Volume2 className="w-3.5 h-3.5" /> L&apos;examinatrice parle...
                  </span>
                )}
              </div>

              <p className="text-xl sm:text-2xl font-bold text-white tracking-tight leading-relaxed">
                {currentQuestion || "Initialisation de votre première question..."}
              </p>

              {/* Bouton pour réécouter ou répondre tout de suite */}
              <div className="mt-4 flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  disabled={!currentQuestion || isAiPlaying}
                  onClick={() => {
                    if (currentQuestion) {
                      speakQuestion(currentQuestion);
                    }
                  }}
                  className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-cyan-300 disabled:opacity-30 disabled:cursor-not-allowed transition"
                >
                  <RotateCcw className="w-3.5 h-3.5" /> Réécouter la question
                </button>

                {isAiPlaying && (
                  <button
                    type="button"
                    onClick={() => {
                      if (audioElementRef.current) audioElementRef.current.pause();
                      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
                        window.speechSynthesis.cancel();
                      }
                      setIsAiPlaying(false);
                      startStudentRecording();
                    }}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-blue-600/20 hover:bg-blue-600/30 text-cyan-300 border border-blue-500/30 text-xs font-medium transition"
                  >
                    Répondre maintenant
                  </button>
                )}
              </div>
            </div>

            {/* Carte Réponse du candidat avec 3 modes : Enregistrement, Relecture/Correction, Secours Clavier */}
            <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-5 backdrop-blur-md">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                  <Mic className="w-3.5 h-3.5 text-cyan-400" />
                  {status === 'REVIEW_RESPONSE' ? 'Vérification de votre réponse' : 'Votre Réponse au Microphone'}
                </span>

                <button
                  type="button"
                  onClick={() => setIsTextFallbackOpen(!isTextFallbackOpen)}
                  className="text-[11px] text-cyan-400 hover:underline flex items-center gap-1"
                >
                  <Keyboard className="w-3 h-3" />
                  {isTextFallbackOpen ? "Fermer le clavier" : "Mode secours clavier"}
                </button>
              </div>

              {/* A. Mode Secours Clavier */}
              {isTextFallbackOpen ? (
                <div className="space-y-2 mt-2">
                  <textarea
                    rows={3}
                    placeholder="Saisissez votre réponse ici si vous préférez écrire..."
                    value={manualTextAnswer}
                    onChange={(e) => setManualTextAnswer(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400"
                  />
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] text-slate-500">
                      {manualTextAnswer.length} caractères
                    </span>
                    <button
                      type="button"
                      disabled={!manualTextAnswer.trim()}
                      onClick={() => handleSubmitConfirmedAnswer(manualTextAnswer)}
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 disabled:opacity-40 text-white text-xs font-semibold transition shadow-md"
                    >
                      <Send className="w-3 h-3" /> Envoyer ma réponse écrite
                    </button>
                  </div>
                </div>
              ) : status === 'REVIEW_RESPONSE' ? (
                /* B. Étape de Relecture et Correction du Texte Transcrit */
                <div className="space-y-3 mt-1">
                  <div className="flex items-center justify-between text-[11px] text-slate-400">
                    {candidateDraftAnswer.trim() ? (
                      <span className="inline-flex items-center gap-1 text-emerald-400 font-medium">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Audio transcrit — Relisez et ajustez votre réponse avant envoi
                      </span>
                    ) : errorMessage && (errorMessage.includes('crédit') || errorMessage.includes('429') || errorMessage.includes('OpenAI')) ? (
                      <span className="inline-flex items-center gap-1 text-amber-400 font-medium">
                        <AlertCircle className="w-3.5 h-3.5" />
                        Service de transcription indisponible (crédits épuisés) — Saisissez votre réponse au clavier
                      </span>
                    ) : errorMessage && (errorMessage.includes('délai') || errorMessage.includes('timeout') || errorMessage.includes('réseau')) ? (
                      <span className="inline-flex items-center gap-1 text-amber-400 font-medium">
                        <AlertCircle className="w-3.5 h-3.5" />
                        Délai de transcription dépassé — Saisissez votre réponse ci-dessous ou réenregistrez
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-amber-400 font-medium">
                        <AlertCircle className="w-3.5 h-3.5" />
                        Aucune parole reconnue — Saisissez votre réponse ci-dessous ou réenregistrez
                      </span>
                    )}
                    <span className="flex items-center gap-1 text-cyan-400">
                      <Edit3 className="w-3 h-3" /> Modifiable
                    </span>
                  </div>

                  <textarea
                    rows={3}
                    value={candidateDraftAnswer}
                    onChange={(e) => setCandidateDraftAnswer(e.target.value)}
                    className="w-full bg-slate-950/90 border border-cyan-500/40 focus:border-cyan-400 rounded-xl p-3 text-xs sm:text-sm text-white leading-relaxed focus:outline-none transition shadow-inner placeholder-slate-500"
                    placeholder="Votre réponse transcrite apparaît ici. Vous pouvez également la saisir ou la corriger directement au clavier..."
                  />

                  <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                    <button
                      type="button"
                      onClick={startStudentRecording}
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium transition"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      Réenregistrer
                    </button>

                    <button
                      type="button"
                      disabled={!candidateDraftAnswer.trim() || isTechnicalOrInvalidAnswer(candidateDraftAnswer)}
                      onClick={() => handleSubmitConfirmedAnswer(candidateDraftAnswer)}
                      className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold text-xs sm:text-sm shadow-lg shadow-blue-500/25 transition transform hover:-translate-y-0.5"
                    >
                      <Send className="w-4 h-4" />
                      Valider et envoyer à l&apos;examinatrice
                    </button>
                  </div>
                </div>
              ) : (

                /* C. Mode Enregistrement Vocal Direct avec Micro qui bouillonne & Ondes sonores */
                <div className="bg-slate-950/80 border border-slate-800/90 rounded-2xl p-4 sm:p-5 text-slate-200 space-y-4 shadow-inner">
                  {status === 'STUDENT_RECORDING' ? (
                    <div className="space-y-3.5">
                      {/* En-tête : Micro qui bouillonne & Ondes de voix réactives */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-3.5 rounded-xl bg-slate-900/90 border border-emerald-500/30 shadow-lg relative overflow-hidden">
                        {/* Effet de halo / lueur en fond quand l'utilisateur parle */}
                        <div
                          className={`absolute inset-0 bg-gradient-to-r from-emerald-500/15 via-teal-500/10 to-transparent transition-opacity duration-150 pointer-events-none ${
                            audioLevel > 6 ? 'opacity-100' : 'opacity-20'
                          }`}
                        />

                        {/* Le micro qui bouillonne (Animation concentrique) */}
                        <div className="flex items-center gap-3.5 relative z-10">
                          <div className="relative flex items-center justify-center shrink-0 w-12 h-12">
                            {/* Vague 1 d'expansion (bouillonnement réactif) */}
                            <span
                              className={`absolute inset-0 rounded-full transition-all duration-200 ${
                                audioLevel > 6
                                  ? 'bg-emerald-400/40 animate-ping'
                                  : 'bg-cyan-500/20 animate-pulse'
                              }`}
                            />
                            {/* Vague 2 d'expansion halo */}
                            <span
                              className={`absolute inset-1 rounded-full transition-all duration-150 ${
                                audioLevel > 6
                                  ? 'bg-emerald-500/30 scale-125'
                                  : 'bg-cyan-500/15 scale-100'
                              }`}
                            />
                            {/* Cercle central du microphone */}
                            <div
                              className={`relative w-10 h-10 rounded-full flex items-center justify-center text-white transition-all duration-150 shadow-md ${
                                audioLevel > 6
                                  ? 'bg-gradient-to-tr from-emerald-500 to-teal-400 shadow-emerald-500/50 scale-110'
                                  : 'bg-gradient-to-tr from-blue-600 to-cyan-500 shadow-cyan-500/30'
                              }`}
                            >
                              <Mic className="w-5 h-5 text-white animate-pulse" />
                            </div>
                          </div>

                          <div>
                            <div className="flex items-center gap-2">
                              <span
                                className={`w-2.5 h-2.5 rounded-full ${
                                  audioLevel > 6
                                    ? 'bg-emerald-400 animate-ping'
                                    : 'bg-emerald-400 animate-pulse'
                                }`}
                              />
                              <h4 className="text-xs sm:text-sm font-bold text-white tracking-tight">
                                {audioLevel > 6
                                  ? "Voix détectée • L'examinatrice vous écoute..."
                                  : "Microphone ouvert • Parlez naturellement..."}
                              </h4>
                            </div>
                            <p className="text-[11px] text-slate-400 mt-0.5">
                              {audioLevel > 6
                                ? "Vos paroles sont captées en direct par l'intelligence artificielle."
                                : "Exprimez vos arguments à voix haute et posée."}
                            </p>
                          </div>
                        </div>

                        {/* Ondes sonores / Égaliseur réactif (VU-mètre vibrant) */}
                        <div className="flex items-center gap-1.5 self-center sm:self-auto h-8 px-3 py-1 bg-slate-950/80 rounded-xl border border-white/10 shrink-0 relative z-10">
                          {[0.5, 0.9, 1.4, 2.0, 2.5, 1.9, 1.3, 0.8, 0.5].map((mult, idx) => {
                            const barHeight = Math.max(15, Math.min(100, Math.round((audioLevel || 8) * mult)));
                            return (
                              <span
                                key={idx}
                                className={`w-1 rounded-full transition-all duration-75 ${
                                  audioLevel > 6
                                    ? 'bg-gradient-to-t from-emerald-500 via-teal-400 to-cyan-300 shadow-xs shadow-emerald-400/50'
                                    : 'bg-slate-700'
                                }`}
                                style={{ height: `${barHeight}%` }}
                              />
                            );
                          })}
                        </div>
                      </div>

                      {/* Boîte de transcription en direct */}
                      <div className="min-h-[55px] max-h-[110px] overflow-y-auto bg-slate-900/60 border border-slate-800 rounded-xl p-3 text-xs sm:text-sm leading-relaxed">
                        {liveTranscript ? (
                          <div className="space-y-1">
                            <span className="text-[10px] uppercase font-bold tracking-wider text-cyan-400 flex items-center gap-1">
                              <Sparkles className="w-3 h-3" /> Retranscription en direct :
                            </span>
                            <p className="italic text-white font-medium">&ldquo;{liveTranscript}&rdquo;</p>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2 text-slate-500 text-xs italic">
                            <span>Commencez à parler, vos phrases s&apos;afficheront ici en direct...</span>
                          </div>
                        )}
                      </div>
                    </div>
                  ) : status === 'TRANSCRIBING' ? (
                    <div className="py-6 flex flex-col items-center justify-center gap-3 text-center">
                      <div className="w-12 h-12 rounded-2xl bg-cyan-500/15 border border-cyan-500/30 text-cyan-400 flex items-center justify-center">
                        <Sparkles className="w-6 h-6 animate-spin text-cyan-400" />
                      </div>
                      <div>
                        <div className="text-sm font-bold text-white">Analyse et transcription de votre voix...</div>
                        <p className="text-xs text-slate-400 mt-0.5">Préparation du texte pour relecture avant envoi au jury.</p>
                      </div>
                    </div>
                  ) : (
                    <div className="py-4 text-center text-slate-500 text-xs">
                      Écoutez attentivement la question de l&apos;examinatrice avant de répondre...
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Actions de contrôle vocal pendant l'enregistrement */}
            {status === 'STUDENT_RECORDING' && !isTextFallbackOpen && (
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-1">
                <span className="text-[11px] text-slate-400 text-center sm:text-left">
                  Prenez le temps d&apos;argumenter votre projet d&apos;études et professionnel.
                </span>

                <button
                  type="button"
                  onClick={handleStopRecordingAndTranscribe}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-emerald-600 via-teal-500 to-cyan-500 hover:from-emerald-500 hover:to-teal-400 text-white font-bold text-xs sm:text-sm shadow-xl shadow-emerald-500/25 transition transform hover:-translate-y-0.5 active:scale-95 cursor-pointer"
                >
                  <span className="w-2.5 h-2.5 rounded-full bg-white animate-pulse" />
                  <MicOff className="w-4 h-4" />
                  <span>Arrêter et relire ma réponse</span>
                </button>
              </div>
            )}

            {/* Indicateur d'évaluation IA */}
            {status === 'AI_EVALUATING' && (
              <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-cyan-300 text-xs font-medium">
                <Sparkles className="w-4 h-4 animate-spin text-cyan-400" />
                L&apos;examinatrice analyse votre réponse et prépare la suite...
              </div>
            )}
          </div>
        </div>

        {/* Raccourci pour terminer l'entretien anticipé (très pratique sur smartphone) */}
        <div className="flex justify-center -mt-2">
          <button
            type="button"
            onClick={handleTerminateInterview}
            className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-rose-300 py-1.5 px-3 rounded-lg hover:bg-rose-500/10 transition active:scale-95 cursor-pointer"
          >
            <PhoneOff className="w-3.5 h-3.5 text-rose-400/80" />
            <span>Terminer l&apos;entretien</span>
          </button>
        </div>
      </main>

      {/* Barre inférieure */}
      <footer className="border-t border-slate-900 bg-slate-950 px-4 py-2 text-center text-[10px] text-slate-500">
        Simulateur indépendant PrépaCampus • Non affilié à l&apos;organisme Campus France • Caméra locale sans aucun enregistrement vidéo.
      </footer>
    </div>
  );
}
