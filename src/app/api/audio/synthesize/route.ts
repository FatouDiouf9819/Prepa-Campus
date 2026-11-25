import { NextRequest, NextResponse } from 'next/server';
import { getOpenAIClient } from '@/lib/ai/openai';
import { createServerSupabaseClient } from '@/lib/supabase/server';

export const maxDuration = 60; // 60 secondes max pour les Serverless Functions Vercel
export const dynamic = 'force-dynamic';

/**
 * POST /api/audio/synthesize
 * Génère la synthèse vocale d'une question d'examinateur via OpenAI TTS.
 * Fallback : Si OpenAI n'est pas configuré, renvoie 204 pour déclencher la synthèse vocale locale du navigateur.
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Non authentifié. Connexion requise pour la synthèse vocale.' },
        { status: 401 }
      );
    }

    const { text } = await request.json();

    if (!text || typeof text !== 'string') {
      return NextResponse.json({ error: 'Texte requis pour la synthèse vocale.' }, { status: 400 });
    }

    if (text.length > 1000) {
      return NextResponse.json(
        { error: 'Texte trop volumineux pour la synthèse vocale (limite de 1000 caractères).' },
        { status: 400 }
      );
    }

    const openai = getOpenAIClient();

    if (!openai) {
      // Indique au client d'utiliser la synthèse vocale locale du navigateur (window.speechSynthesis)
      return new NextResponse(null, { status: 204 });
    }

    // Voix féminine naturelle, douce et professionnelle pour l'examinatrice Campus France
    const allowedVoices = ['coral', 'nova', 'shimmer', 'sage'] as const;
    const requestedVoice = process.env.OPENAI_VOICE as typeof allowedVoices[number];
    // 'coral' est la voix féminine par excellence : ultra-douce, lumineuse, très féminine et parfaitement naturelle
    const selectedVoice = allowedVoices.includes(requestedVoice) ? requestedVoice : 'coral';

    // Aération subtile du texte pour induire des respirations et pauses naturelles dans l'audio
    const humanizedText = text
      .replace(/Bonjour\s/i, 'Bonjour, ')
      .replace(/Très bien\s/i, 'Très bien, ')
      .replace(/D'accord\s/i, "D'accord, ")
      .replace(/Merci\s/i, 'Merci, ')
      .replace(/\s*;\s*/g, ', ')
      .replace(/\s*\?\s*/g, ' ? ')
      .trim();

    const mp3Response = await openai.audio.speech.create({
      model: process.env.OPENAI_MODEL_TTS || 'tts-1-hd',
      voice: selectedVoice,
      input: humanizedText,
      speed: 0.95, // Rythme naturel, fluide, posé et doux
    });

    const buffer = Buffer.from(await mp3Response.arrayBuffer());

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': 'audio/mpeg',
        'Content-Length': buffer.length.toString(),
      },
    });
  } catch (err: unknown) {
    console.error('[TTS Error]', err);
    // En cas d'erreur serveur, renvoyer 204 pour laisser le client utiliser la voix locale
    return new NextResponse(null, { status: 204 });
  }
}
