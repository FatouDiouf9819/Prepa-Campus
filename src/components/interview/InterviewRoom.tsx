'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
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
  RefreshCw
} from 'lucide-react';
import { AcademicProfileData } from '@/types/profile';
import { InterviewTurn, InterviewStatus, JuryPersonality } from '@/types/interview';
import { isTechnicalOrInvalidAnswer } from '@/lib/ai/validation';
import { MobileMoneyModal } from '@/components/payments/MobileMoneyModal';

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
  
  // Chronomètre de 5 minutes (300 secondes)
  const [timeRemaining, setTimeRemaining] = useState<number>(300);
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
  // États gestion crédits et fin prématurée d'entretien
  const [hasCreditError, setHasCreditError] = useState<boolean>(false);
  const [isCreditModalOpen, setIsCreditModalOpen] = useState<boolean>(false);
  const [isEndConfirmOpen, setIsEndConfirmOpen] = useState<boolean>(false);
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

  // Décompte du chronomètre de 5 minutes (300 secondes)
  useEffect(() => {
    if (status === 'COMPLETED' || status === 'GENERATING_REPORT' || status === 'CREDIT_BLOCKED' || hasCreditError) {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
      return;
    }

    if (status !== 'PERMISSION_CHECK' && status !== 'READY_TO_START') {
      timerIntervalRef.current = setInterval(() => {
        setTimeRemaining((prev) => {
          if (prev <= 1) {
            clearInterval(timerIntervalRef.current!);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }

    return () => {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    };
  }, [status, hasCreditError]);

  // Détection de fin de temps réglementaire
  useEffect(() => {
    if (timeRemaining === 0 && status !== 'COMPLETED' && status !== 'GENERATING_REPORT') {
      handleFinalConclusion();
    }
  }, [timeRemaining, status]); // eslint-disable-line react-hooks/exhaustive-deps

  // Démarrer l'enregistrement de l'étudiant
  const startStudentRecording = useCallback(async () => {
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

    setIsAiPlaying(true);
    setStatus('AI_SPEAKING');

    const triggerReadyAfterSpeech = () => {
      setIsAiPlaying(false);
      startStudentRecording();
    };

    try {
      const res = await fetch('/api/audio/synthesize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: textToSpeak }),
      });

      if (res.status === 200) {
        const audioBlob = await res.blob();
        const audioUrl = URL.createObjectURL(audioBlob);
        const audio = new Audio(audioUrl);
        audioElementRef.current = audio;

        audio.onended = () => {
          URL.revokeObjectURL(audioUrl);
          triggerReadyAfterSpeech();
        };

        audio.onerror = () => {
          fallbackWebSpeech(textToSpeak, triggerReadyAfterSpeech);
        };

        try {
          await audio.play();
          return;
        } catch (playErr) {
          console.warn('Autoplay audio bloqué sur mobile par le navigateur :', playErr);
          // Si l'autoplay est bloqué par iOS/Chrome mobile, on donne immédiatement la main au candidat
          triggerReadyAfterSpeech();
          return;
        }
      }
    } catch {
      // Fallback vers la synthèse locale
    }

    fallbackWebSpeech(textToSpeak, triggerReadyAfterSpeech);
  }, [startStudentRecording, fallbackWebSpeech, hasCreditError, status]);

  // Arrêter l'enregistrement et transcrire la réponse pour vérification
  const handleStopRecordingAndTranscribe = async () => {
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

  // Clôture prématurée demandée par l'étudiant (avant la fin des 5 minutes)
  const handleEarlyTerminationWithDraft = async () => {
    setIsEndConfirmOpen(false);
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

    if (finalTurns.length > 0) {
      await handleFinalConclusion(finalTurns);
    } else {
      if (audioStreamRef.current) audioStreamRef.current.getTracks().forEach((t) => t.stop());
      if (videoStreamRef.current) videoStreamRef.current.getTracks().forEach((t) => t.stop());
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
      router.push('/dashboard');
    }
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

  // Basculer la webcam locale
  const toggleCamera = () => {
    if (videoStreamRef.current) {
      const videoTrack = videoStreamRef.current.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setIsCameraActive(videoTrack.enabled);
      }
    }
  };

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

        {/* Chronomètre dégressif & Bouton Terminer (visible sur Mobile et Desktop) */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
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
            onClick={() => setIsEndConfirmOpen(true)}
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 sm:px-3 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 text-rose-300 hover:text-rose-200 border border-rose-500/30 text-xs font-semibold transition active:scale-95 shadow-sm"
            title="Arrêter ou terminer l'entretien avant les 5 minutes"
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
            <div className="relative w-full aspect-video sm:aspect-square max-w-sm bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl flex items-center justify-center">
              {isCameraActive ? (
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-cover transform -scale-x-100"
                />
              ) : (
                <div className="flex flex-col items-center justify-center p-6 text-center text-slate-500 gap-2">
                  <CameraOff className="w-10 h-10 stroke-[1.5]" />
                  <span className="text-xs">Caméra désactivée (mode audio pur)</span>
                </div>
              )}

              {/* Bouton de bascule de la webcam locale */}
              <button
                type="button"
                onClick={toggleCamera}
                className="absolute top-3 right-3 p-2 rounded-xl bg-slate-950/80 hover:bg-slate-800 text-slate-300 border border-slate-700/60 backdrop-blur-md transition"
                title={isCameraActive ? "Désactiver la caméra" : "Activer la caméra"}
              >
                {isCameraActive ? <Camera className="w-4 h-4 text-cyan-400" /> : <CameraOff className="w-4 h-4 text-slate-400" />}
              </button>

              {/* Indicateur de micro & VU-mètre en direct */}
              <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between">
                <div className="bg-slate-950/85 backdrop-blur-md px-3 py-1.5 rounded-full text-[11px] font-medium border border-slate-700/60 flex items-center gap-2 text-slate-200">
                  <span
                    className={`w-2.5 h-2.5 rounded-full ${
                      status === 'STUDENT_RECORDING'
                        ? 'bg-emerald-400 animate-pulse'
                        : 'bg-slate-500'
                    }`}
                  />
                  <span>
                    {status === 'STUDENT_RECORDING'
                      ? 'Micro ouvert'
                      : status === 'REVIEW_RESPONSE'
                      ? 'Réponse prête'
                      : 'Micro en attente'}
                  </span>

                  {/* VU-mètre dynamique réactif à la voix réelle */}
                  {status === 'STUDENT_RECORDING' && hasMicrophonePermission && (
                    <div className="flex items-end gap-0.5 h-3 ml-1">
                      <span
                        className="w-1 bg-emerald-400 rounded-full transition-all duration-75"
                        style={{ height: `${Math.max(20, Math.min(100, audioLevel * 1.5))}%` }}
                      />
                      <span
                        className="w-1 bg-emerald-400 rounded-full transition-all duration-75"
                        style={{ height: `${Math.max(20, Math.min(100, audioLevel * 1.8))}%` }}
                      />
                      <span
                        className="w-1 bg-teal-400 rounded-full transition-all duration-75"
                        style={{ height: `${Math.max(20, Math.min(100, audioLevel * 1.2))}%` }}
                      />
                    </div>
                  )}
                </div>

                <span className="bg-slate-950/80 backdrop-blur-md px-2.5 py-1 rounded-full text-[11px] font-medium border border-slate-700/60 text-slate-400">
                  {profile?.currentDiploma || 'Candidat'}
                </span>
              </div>
            </div>
          </div>

          {/* Colonne Dialogue & État de l'IA */}
          <div className="md:col-span-7 flex flex-col gap-4">
            {/* Carte Question de l'examinatrice */}
            <div className="bg-slate-900/80 border border-slate-800/90 rounded-2xl p-6 backdrop-blur-md shadow-xl relative overflow-hidden">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2 text-xs font-semibold text-cyan-400">
                  <Bot className="w-4 h-4" />
                  <span>Question de l&apos;examinatrice Campus France</span>
                </div>

                {isAiPlaying && (
                  <span className="inline-flex items-center gap-1.5 text-[11px] text-cyan-300 font-medium animate-pulse">
                    <Volume2 className="w-3.5 h-3.5" /> L&apos;examinatrice parle...
                  </span>
                )}
              </div>

              <p className="text-base sm:text-lg text-white font-medium leading-relaxed">
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

                /* C. Mode Enregistrement Vocal Direct */
                <div className="min-h-[75px] max-h-[130px] overflow-y-auto bg-slate-950/70 border border-slate-800/80 rounded-xl p-3 text-xs sm:text-sm text-slate-200 leading-relaxed">
                  {liveTranscript ? (
                    <span className="italic text-white">&ldquo;{liveTranscript}&rdquo;</span>
                  ) : status === 'STUDENT_RECORDING' ? (
                    <div className="text-slate-400 flex flex-col gap-1">
                      <div className="flex items-center gap-2 text-emerald-400 font-medium">
                        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                        Microphone ouvert — Parlez naturellement...
                      </div>
                      <p className="text-[11px] text-slate-500">
                        Votre voix est captée. Une fois terminé, cliquez sur &laquo; Arrêter et relire &raquo; pour vérifier votre transcription.
                      </p>
                    </div>
                  ) : status === 'TRANSCRIBING' ? (
                    <div className="text-cyan-300 flex items-center gap-2">
                      <Sparkles className="w-4 h-4 animate-spin text-cyan-400" />
                      <span>Transcription de votre voix par l&apos;IA en cours...</span>
                    </div>
                  ) : (
                    <span className="text-slate-500">Écoutez attentivement la question de l&apos;examinatrice...</span>
                  )}
                </div>
              )}
            </div>

            {/* Actions de contrôle vocal pendant l'enregistrement */}
            {status === 'STUDENT_RECORDING' && !isTextFallbackOpen && (
              <div className="flex items-center justify-between gap-3 pt-1">
                <span className="text-[11px] text-slate-400">
                  Prenez le temps d&apos;argumenter votre projet.
                </span>

                <button
                  type="button"
                  onClick={handleStopRecordingAndTranscribe}
                  className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white font-bold text-xs sm:text-sm shadow-xl shadow-emerald-500/25 transition transform hover:-translate-y-0.5"
                >
                  <MicOff className="w-4 h-4" />
                  Arrêter et relire ma réponse
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
            onClick={() => setIsEndConfirmOpen(true)}
            className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-rose-300 py-1.5 px-3 rounded-lg hover:bg-rose-500/10 transition active:scale-95"
          >
            <PhoneOff className="w-3.5 h-3.5 text-rose-400/80" />
            Terminer l&apos;entretien avant les 5 min
          </button>
        </div>
      </main>

      {/* Barre inférieure */}
      <footer className="border-t border-slate-900 bg-slate-950 px-4 py-2 text-center text-[10px] text-slate-500">
        Simulation d&apos;entretien Campus France • 5 minutes réglementaires • Traitement vocal éphémère et confidentiel.
      </footer>

      {/* Modal de confirmation d'arrêt d'entretien */}
      {isEndConfirmOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-500/15 border border-rose-500/30 flex items-center justify-center text-rose-400 shrink-0">
                <PhoneOff className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Terminer l&apos;entretien ?</h3>
                <p className="text-xs text-cyan-400 font-mono font-medium">Temps restant : {formatTime(timeRemaining)}</p>
              </div>
            </div>

            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
              {turnsHistory.length > 0 || candidateDraftAnswer.trim() || manualTextAnswer.trim()
                ? "Vous pouvez clôturer l'entretien dès maintenant sans attendre la fin des 5 minutes. Votre bilan d'évaluation complet sera immédiatement calculé à partir de vos réponses enregistrées."
                : "Vous n'avez pas encore validé de réponse. Si vous quittez maintenant, aucun bilan pédagogique ne sera généré."}
            </p>

            <div className="flex flex-col gap-2.5 pt-2">
              {(turnsHistory.length > 0 || candidateDraftAnswer.trim() || manualTextAnswer.trim()) && (
                <button
                  type="button"
                  onClick={handleEarlyTerminationWithDraft}
                  className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs sm:text-sm shadow-lg shadow-emerald-600/20 transition flex items-center justify-center gap-2 active:scale-95"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  Terminer et générer mon bilan ({turnsHistory.length + (candidateDraftAnswer.trim() || manualTextAnswer.trim() ? 1 : 0)} question{(turnsHistory.length + (candidateDraftAnswer.trim() || manualTextAnswer.trim() ? 1 : 0)) > 1 ? 's' : ''})
                </button>
              )}

              <button
                type="button"
                onClick={() => {
                  setIsEndConfirmOpen(false);
                  if (audioStreamRef.current) audioStreamRef.current.getTracks().forEach((t) => t.stop());
                  if (videoStreamRef.current) videoStreamRef.current.getTracks().forEach((t) => t.stop());
                  if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
                    window.speechSynthesis.cancel();
                  }
                  router.push('/dashboard');
                }}
                className="w-full py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs sm:text-sm border border-slate-700 transition"
              >
                Quitter vers le tableau de bord
              </button>

              <button
                type="button"
                onClick={() => setIsEndConfirmOpen(false)}
                className="w-full py-2 px-4 rounded-xl text-slate-400 hover:text-white font-medium text-xs sm:text-sm transition hover:bg-slate-800/50"
              >
                Continuer l&apos;entretien
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
