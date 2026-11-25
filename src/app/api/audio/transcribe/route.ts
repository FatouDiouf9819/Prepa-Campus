import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { getOpenAIClient } from '@/lib/ai/openai';
import { TIMEOUTS, createTimeoutSignal } from '@/config/timeouts';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { isTechnicalOrInvalidAnswer, sanitizeCandidateTranscript } from '@/lib/ai/validation';

const MAX_AUDIO_SIZE_BYTES = 25 * 1024 * 1024; // 25 Mo max (limite Whisper)

export const maxDuration = 60; // 60 secondes max pour les Serverless Functions Vercel
export const dynamic = 'force-dynamic';

/**
 * POST /api/audio/transcribe
 * Transcrit l'audio oral de l'étudiant via OpenAI Whisper.
 * Respect de la vie privée : le flux audio brut est traité en mémoire vive
 * puis immédiatement purgé. Aucun stockage sur disque.
 * RÈGLE ABSOLUE : Ne jamais renvoyer de message de statut technique comme fausse transcription.
 */
export async function POST(request: NextRequest) {
  const { cleanup } = createTimeoutSignal(TIMEOUTS.AUDIO_TRANSCRIPTION_MS);
  let rawClientFallback: string | null = null;

  try {
    // 1. Contrôle d'authentification obligatoire pour éviter tout abus externe
    const supabase = await createServerSupabaseClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      cleanup();
      return NextResponse.json(
        { error: 'Non authentifié. Connexion requise pour accéder à la transcription vocale.', transcript: '' },
        { status: 401 }
      );
    }

    const formData = await request.formData();
    const audioFile = formData.get('audio') as File | null;
    rawClientFallback = formData.get('fallbackTranscript') as string | null;
    const sanitizedFallback = sanitizeCandidateTranscript(rawClientFallback);

    if (!audioFile && !sanitizedFallback) {
      cleanup();
      return NextResponse.json(
        { error: 'Aucun enregistrement audio ou transcription reçue.', transcript: '' },
        { status: 400 }
      );
    }

    // 2. Limitation stricte de la taille du fichier audio
    if (audioFile && audioFile.size > MAX_AUDIO_SIZE_BYTES) {
      cleanup();
      return NextResponse.json(
        { error: 'Fichier audio trop volumineux. La taille maximale autorisée est de 25 Mo.', transcript: '' },
        { status: 413 }
      );
    }

    if (audioFile && audioFile.size < 100 && !sanitizedFallback) {
      cleanup();
      return NextResponse.json(
        { 
          error: 'Enregistrement audio vide ou trop court. Veuillez parler distinctement dans le microphone.',
          transcript: '',
          errorCode: 'AUDIO_EMPTY',
        },
        { status: 400 }
      );
    }

    const openai = getOpenAIClient();

    if (!openai) {
      cleanup();
      // Si la clé OpenAI n'est pas encore renseignée dans .env.local,
      // on utilise la transcription locale issue de l'API vocale du navigateur si disponible
      if (sanitizedFallback && sanitizedFallback.length > 0) {
        return NextResponse.json({
          transcript: sanitizedFallback,
          provider: 'web-speech-local',
          note: 'Clé OpenAI non configurée. Transcription vocale locale du navigateur utilisée.',
        });
      }

      // RÈGLE ABSOLUE : Si aucune parole n'a été reconnue, renvoyer une erreur explicite, JAMAIS un texte factice
      return NextResponse.json(
        {
          error: "Aucune parole reconnue. Le service distant n'est pas configuré et la reconnaissance vocale locale n'a capté aucun mot. Vous pouvez réenregistrer votre réponse ou la saisir au clavier.",
          transcript: '',
          provider: 'none',
        },
        { status: 422 }
      );
    }

    if (!audioFile) {
      cleanup();
      if (sanitizedFallback) {
        return NextResponse.json({
          transcript: sanitizedFallback,
          provider: 'fallback-text',
        });
      }
      return NextResponse.json(
        { error: 'Aucun fichier audio transmis.', transcript: '' },
        { status: 400 }
      );
    }

    // Préparation robuste du fichier uploadable compatible Node / Next.js et iOS Safari
    const audioBytes = await audioFile.arrayBuffer();
    const audioBuffer = Buffer.from(audioBytes);

    const mime = (audioFile.type || '').toLowerCase();
    let ext = 'webm';
    if (mime.includes('mp4') || mime.includes('m4a') || mime.includes('aac')) {
      ext = 'm4a';
    } else if (mime.includes('wav')) {
      ext = 'wav';
    } else if (mime.includes('mp3') || mime.includes('mpeg')) {
      ext = 'mp3';
    } else if (mime.includes('ogg')) {
      ext = 'ogg';
    } else if (audioFile.name && /\.(mp3|mp4|m4a|wav|webm|ogg)$/i.test(audioFile.name)) {
      ext = audioFile.name.split('.').pop()!.toLowerCase();
    }
    const safeFilename = `student_response_${Date.now()}.${ext}`;

    const uploadableFile = await OpenAI.toFile(
      audioBuffer,
      safeFilename,
      { type: audioFile.type || `audio/${ext}` }
    );

    // Appel à l'API Whisper d'OpenAI avec timeout adapté aux fichiers audio
    const transcription = await openai.audio.transcriptions.create(
      {
        file: uploadableFile,
        model: process.env.OPENAI_MODEL_STT || 'whisper-1',
        language: 'fr',
      },
      {
        timeout: TIMEOUTS.AUDIO_TRANSCRIPTION_MS,
        maxRetries: 0,
      }
    );

    cleanup();

    const whisperText = (transcription.text || '').trim();
    if (!whisperText || isTechnicalOrInvalidAnswer(whisperText)) {
      if (sanitizedFallback) {
        return NextResponse.json({
          transcript: sanitizedFallback,
          provider: 'fallback-on-empty-whisper',
        });
      }
      return NextResponse.json(
        {
          error: "Aucune parole distincte n'a été détectée dans l'enregistrement. Veuillez réenregistrer votre réponse ou utiliser le mode secours clavier.",
          transcript: '',
          errorCode: 'NO_SPEECH_DETECTED',
        },
        { status: 422 }
      );
    }

    return NextResponse.json({
      transcript: whisperText,
      provider: 'openai-whisper',
    });
  } catch (err: unknown) {
    cleanup();
    console.error('[Transcription Error]', err);
    // En cas d'indisponibilité momentanée de Whisper, tenter le fallback local s'il est valide
    const fallbackAfterError = sanitizeCandidateTranscript(rawClientFallback);
    if (fallbackAfterError && fallbackAfterError.length > 0) {
      return NextResponse.json({
        transcript: fallbackAfterError,
        provider: 'fallback-on-whisper-error',
      });
    }

    let userMessage = 'Erreur lors de la transcription audio.';
    let errorCode = 'TRANSCRIPTION_ERROR';
    let statusCode = 500;

    if (err instanceof Error) {
      const errStr = err.message.toLowerCase();
      const errObj = err as { status?: number; code?: string; type?: string; name?: string };

      if (
        errObj.status === 429 ||
        errObj.status === 402 ||
        errObj.code === 'credit_balance_exhausted' ||
        errObj.type === 'insufficient_quota' ||
        errStr.includes('429') ||
        errStr.includes('402') ||
        errStr.includes('credit') ||
        errStr.includes('quota')
      ) {
        const isTchavi = process.env.OPENAI_BASE_URL?.includes('tchavi');
        userMessage = isTchavi
          ? "Le solde de votre clé API Tchavi est insuffisant pour la transcription audio Whisper. Vous pouvez saisir votre réponse au clavier ci-dessous pour continuer, ou recharger sur tchavi.com."
          : "Votre compte OpenAI a épuisé ses crédits disponibles (erreur 429). Rechargez vos crédits sur platform.openai.com ou saisissez votre réponse au clavier ci-dessous.";
        errorCode = 'QUOTA_EXHAUSTED';
        statusCode = 429;
      } else if (
        errObj.status === 401 ||
        errStr.includes('401') ||
        errStr.includes('key') ||
        errStr.includes('unauthorized')
      ) {
        userMessage = "Clé API OpenAI non autorisée ou invalide. Vérifiez la clé dans .env.local.";
        errorCode = 'AUTH_ERROR';
        statusCode = 401;
      } else if (
        errObj.name === 'APIConnectionTimeoutError' ||
        errObj.name === 'TimeoutError' ||
        errStr.includes('timeout') ||
        errStr.includes('timed out') ||
        errStr.includes('expiration du delai') ||
        errStr.includes('expiration du délai')
      ) {
        userMessage = "Délai d'attente dépassé lors de la transcription audio. Veuillez réenregistrer votre réponse ou utiliser le mode clavier.";
        errorCode = 'TIMEOUT_ERROR';
        statusCode = 504;
      } else if (
        errStr.includes('network') ||
        errStr.includes('econnrefused') ||
        errStr.includes('enotfound') ||
        errStr.includes('fetch failed')
      ) {
        userMessage = "Erreur de connexion réseau lors de l'accès au service de transcription. Vérifiez votre connexion Internet ou saisissez votre réponse au clavier.";
        errorCode = 'NETWORK_ERROR';
        statusCode = 503;
      } else if (
        errObj.status === 400 ||
        errStr.includes('format') ||
        errStr.includes('corrupt') ||
        errStr.includes('unsupported')
      ) {
        userMessage = "Format de fichier audio invalide ou non supporté par le service de transcription. Réenregistrez votre réponse.";
        errorCode = 'AUDIO_FORMAT_ERROR';
        statusCode = 400;
      } else {
        userMessage = err.message;
      }
    }

    return NextResponse.json({ error: userMessage, errorCode, transcript: '' }, { status: statusCode });
  }
}


