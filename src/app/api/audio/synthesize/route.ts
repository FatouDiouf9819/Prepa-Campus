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

    const { text, voice: requestedVoiceBody } = await request.json();

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

    // Voix feutrée, douce, bienveillante et professionnelle (style Service Client Orange / Annonce Aérienne)
    const allowedVoices = ['alloy', 'sage', 'nova', 'shimmer'] as const;
    type AllowedVoice = typeof allowedVoices[number];

    let selectedVoice: AllowedVoice = 'alloy';
    if (requestedVoiceBody && allowedVoices.includes(requestedVoiceBody as AllowedVoice)) {
      selectedVoice = requestedVoiceBody as AllowedVoice;
    } else if (process.env.OPENAI_VOICE && allowedVoices.includes(process.env.OPENAI_VOICE as AllowedVoice)) {
      selectedVoice = process.env.OPENAI_VOICE as AllowedVoice;
    }

    // Aération subtile et suppression des points d'exclamation pour éliminer tout cri ou intonation agressive
    const humanizedText = text
      .replace(/!+/g, '.') // Élimine les montées criardes
      .replace(/Bonjour\s/i, 'Bonjour, ')
      .replace(/Très bien\s/i, 'Très bien, ')
      .replace(/D'accord\s/i, "D'accord, ")
      .replace(/Merci\s/i, 'Merci, ')
      .replace(/\s*;\s*/g, ', ')
      .replace(/\s*\?\s*/g, ' ? ')
      .trim();

    const speed = selectedVoice === 'sage' ? 0.88 : 0.90;

    const mp3Response = await openai.audio.speech.create({
      model: process.env.OPENAI_MODEL_TTS || 'tts-1-hd',
      voice: selectedVoice,
      input: humanizedText,
      speed, // Rythme très posé, calme et soigné
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
