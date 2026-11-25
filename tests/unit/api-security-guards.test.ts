import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

// Mock de createServerSupabaseClient
vi.mock('@/lib/supabase/server', () => ({
  createServerSupabaseClient: vi.fn(),
}));

// Mock de openai
vi.mock('@/lib/ai/openai', () => ({
  getOpenAIClient: vi.fn(),
  generateFirstQuestion: vi.fn().mockResolvedValue({ question: 'Test Q', pedagogicalIntent: 'Test' }),
  generateAdaptiveTurn: vi.fn().mockResolvedValue({ question: 'Next Q', pedagogicalIntent: 'Test', turnType: 'REGULAR', isConcluding: false }),
  generateEvaluationReport: vi.fn().mockResolvedValue({ overallScore: 75, scoresByCriteria: [], strengths: [], areasToImprove: [] }),
}));

import { createServerSupabaseClient } from '@/lib/supabase/server';
import { getOpenAIClient } from '@/lib/ai/openai';
import { POST as startRoute } from '@/app/api/interview/start/route';
import { POST as turnRoute } from '@/app/api/interview/turn/route';
import { POST as reportRoute } from '@/app/api/interview/report/route';
import { POST as synthesizeRoute } from '@/app/api/audio/synthesize/route';
import { POST as transcribeRoute } from '@/app/api/audio/transcribe/route';

describe('Sécurité et Verrouillage des Routes API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('doit rejeter /api/interview/start avec HTTP 401 si utilisateur non connecté', async () => {
    (createServerSupabaseClient as any).mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: new Error('Session expirée') }),
      },
    });

    const req = new NextRequest('http://localhost:3000/api/interview/start', {
      method: 'POST',
      body: JSON.stringify({ profile: { currentDiploma: 'L3', targetPrograms: 'Master' } }),
    });

    const res = await startRoute(req);
    expect(res.status).toBe(401);
    const json = await res.json();
    expect(json.error).toMatch(/Non authentifié/i);
  });

  it('doit rejeter /api/interview/turn avec HTTP 401 si utilisateur non connecté', async () => {
    (createServerSupabaseClient as any).mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: null }),
      },
    });

    const req = new NextRequest('http://localhost:3000/api/interview/turn', {
      method: 'POST',
      body: JSON.stringify({ sessionId: 'test', profile: {}, studentTranscript: 'Oui' }),
    });

    const res = await turnRoute(req);
    expect(res.status).toBe(401);
  });

  it('doit rejeter /api/interview/report avec HTTP 401 si utilisateur non connecté', async () => {
    (createServerSupabaseClient as any).mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: null }),
      },
    });

    const req = new NextRequest('http://localhost:3000/api/interview/report', {
      method: 'POST',
      body: JSON.stringify({ profile: { currentDiploma: 'L3', targetPrograms: 'M1' }, turns: [{ turnIndex: 1, aiQuestion: 'Q', pedagogicalIntent: 'P', studentTranscript: 'R', turnType: 'REGULAR', durationSeconds: 30, timestamp: '' }] }),
    });

    const res = await reportRoute(req);
    expect(res.status).toBe(401);
  });

  it('doit rejeter /api/audio/synthesize avec HTTP 401 si utilisateur non connecté', async () => {
    (createServerSupabaseClient as any).mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: null }),
      },
    });

    const req = new NextRequest('http://localhost:3000/api/audio/synthesize', {
      method: 'POST',
      body: JSON.stringify({ text: 'Bonjour' }),
    });

    const res = await synthesizeRoute(req);
    expect(res.status).toBe(401);
  });

  it('doit rejeter /api/audio/transcribe si le fichier audio dépasse 25 Mo', async () => {
    (createServerSupabaseClient as any).mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'user-123' } }, error: null }),
      },
    });

    // Créer un faux blob audio de taille excessive (> 25 Mo)
    const largeBlob = new Blob([new Uint8Array(26 * 1024 * 1024)], { type: 'audio/webm' });
    const formData = new FormData();
    formData.append('audio', largeBlob, 'large_recording.webm');

    const req = new NextRequest('http://localhost:3000/api/audio/transcribe', {
      method: 'POST',
      body: formData,
    });

    const res = await transcribeRoute(req);
    expect(res.status).toBe(413);
    const json = await res.json();
    expect(json.error).toMatch(/trop volumineux/i);
  });

  it('doit rejeter /api/audio/transcribe avec HTTP 400 et AUDIO_EMPTY si le fichier fait moins de 100 octets', async () => {
    (createServerSupabaseClient as any).mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'user-123' } }, error: null }),
      },
    });

    const tinyBlob = new Blob([new Uint8Array(50)], { type: 'audio/webm' });
    const formData = new FormData();
    formData.append('audio', tinyBlob, 'tiny.webm');

    const req = new NextRequest('http://localhost:3000/api/audio/transcribe', {
      method: 'POST',
      body: formData,
    });

    const res = await transcribeRoute(req);
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.errorCode).toBe('AUDIO_EMPTY');
    expect(json.error).toMatch(/vide ou trop court/i);
  });

  it('doit renvoyer HTTP 429 et QUOTA_EXHAUSTED lorsque les crédits OpenAI sont épuisés', async () => {
    (createServerSupabaseClient as any).mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'user-123' } }, error: null }),
      },
    });

    const quotaError = new Error('You have no credits remaining. Add credits to continue using the API.');
    (quotaError as any).status = 429;
    (quotaError as any).code = 'credit_balance_exhausted';
    (quotaError as any).type = 'insufficient_quota';

    (getOpenAIClient as any).mockReturnValue({
      audio: {
        transcriptions: {
          create: vi.fn().mockRejectedValue(quotaError),
        },
      },
    });

    const audioBlob = new Blob([new Uint8Array(1000)], { type: 'audio/webm' });
    const formData = new FormData();
    formData.append('audio', audioBlob, 'speech.webm');

    const req = new NextRequest('http://localhost:3000/api/audio/transcribe', {
      method: 'POST',
      body: formData,
    });

    const res = await transcribeRoute(req);
    expect(res.status).toBe(429);
    const json = await res.json();
    expect(json.errorCode).toBe('QUOTA_EXHAUSTED');
    expect(json.error).toMatch(/crédits disponibles/i);
    expect(json.transcript).toBe('');
  });

  it('doit renvoyer HTTP 504 et TIMEOUT_ERROR en cas de dépassement de délai Whisper', async () => {
    (createServerSupabaseClient as any).mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'user-123' } }, error: null }),
      },
    });

    const timeoutError = new Error('Request timed out.');
    timeoutError.name = 'APIConnectionTimeoutError';

    (getOpenAIClient as any).mockReturnValue({
      audio: {
        transcriptions: {
          create: vi.fn().mockRejectedValue(timeoutError),
        },
      },
    });

    const audioBlob = new Blob([new Uint8Array(1000)], { type: 'audio/webm' });
    const formData = new FormData();
    formData.append('audio', audioBlob, 'speech.webm');

    const req = new NextRequest('http://localhost:3000/api/audio/transcribe', {
      method: 'POST',
      body: formData,
    });

    const res = await transcribeRoute(req);
    expect(res.status).toBe(504);
    const json = await res.json();
    expect(json.errorCode).toBe('TIMEOUT_ERROR');
    expect(json.error).toMatch(/Délai d'attente dépassé/i);
    expect(json.transcript).toBe('');
  });

  it('doit renvoyer HTTP 401 et AUTH_ERROR en cas de clé API OpenAI invalide', async () => {
    (createServerSupabaseClient as any).mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'user-123' } }, error: null }),
      },
    });

    const authError = new Error('Incorrect API key provided.');
    (authError as any).status = 401;

    (getOpenAIClient as any).mockReturnValue({
      audio: {
        transcriptions: {
          create: vi.fn().mockRejectedValue(authError),
        },
      },
    });

    const audioBlob = new Blob([new Uint8Array(1000)], { type: 'audio/webm' });
    const formData = new FormData();
    formData.append('audio', audioBlob, 'speech.webm');

    const req = new NextRequest('http://localhost:3000/api/audio/transcribe', {
      method: 'POST',
      body: formData,
    });

    const res = await transcribeRoute(req);
    expect(res.status).toBe(401);
    const json = await res.json();
    expect(json.errorCode).toBe('AUTH_ERROR');
    expect(json.error).toMatch(/Clé API OpenAI non autorisée/i);
    expect(json.transcript).toBe('');
  });

  it('doit refuser le démarrage de simulation avec HTTP 403 si solde de crédit est insuffisant', async () => {
    (createServerSupabaseClient as any).mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'user-no-credit' } }, error: null }),
      },
      rpc: vi.fn().mockResolvedValue({ data: -1, error: null }), // -1 = Solde insuffisant
    });

    const req = new NextRequest('http://localhost:3000/api/interview/start', {
      method: 'POST',
      body: JSON.stringify({
        profile: {
          currentDiploma: 'Licence Informatique',
          targetPrograms: 'Master Big Data',
        },
      }),
    });

    const res = await startRoute(req);
    expect(res.status).toBe(403);
    const json = await res.json();
    expect(json.error).toMatch(/Solde insuffisant/i);
  });

  it('doit refuser /api/interview/turn avec HTTP 403 si la session appartient à un tiers', async () => {
    (createServerSupabaseClient as any).mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'user-connected' } }, error: null }),
      },
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({
          data: { id: 'session-uuid-1', user_id: 'user-different', status: 'IN_PROGRESS' },
          error: null,
        }),
      }),
    });

    const req = new NextRequest('http://localhost:3000/api/interview/turn', {
      method: 'POST',
      body: JSON.stringify({
        sessionId: 'session-uuid-1',
        turnIndex: 1,
        studentTranscript: 'Ma réponse',
        elapsedSeconds: 60,
        profile: { currentDiploma: 'L3' },
      }),
    });

    const res = await turnRoute(req);
    expect(res.status).toBe(403);
    const json = await res.json();
    expect(json.error).toMatch(/Accès refusé/i);
  });

  it('doit refuser /api/interview/report avec HTTP 403 si la session appartient à un tiers', async () => {
    (createServerSupabaseClient as any).mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'user-connected' } }, error: null }),
      },
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({
          data: { id: 'session-uuid-1', user_id: 'user-different' },
          error: null,
        }),
      }),
    });

    const req = new NextRequest('http://localhost:3000/api/interview/report', {
      method: 'POST',
      body: JSON.stringify({
        sessionId: 'session-uuid-1',
        profile: { currentDiploma: 'L3', targetPrograms: 'M1' },
        turns: [{ turnIndex: 1, aiQuestion: 'Q', pedagogicalIntent: 'P', studentTranscript: 'R', turnType: 'REGULAR', durationSeconds: 30, timestamp: '' }],
      }),
    });

    const res = await reportRoute(req);
    expect(res.status).toBe(403);
    const json = await res.json();
    expect(json.error).toMatch(/Accès refusé/i);
  });

  it('doit refuser /api/audio/synthesize avec HTTP 400 si le texte dépasse 1000 caractères (anti-abus)', async () => {
    (createServerSupabaseClient as any).mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'user-connected' } }, error: null }),
      },
    });

    const longText = 'A'.repeat(1001);
    const req = new NextRequest('http://localhost:3000/api/audio/synthesize', {
      method: 'POST',
      body: JSON.stringify({ text: longText }),
    });

    const res = await synthesizeRoute(req);
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toMatch(/trop volumineux/i);
  });

  it('doit refuser /api/interview/turn avec HTTP 403 si la session est filtrée par RLS (null)', async () => {
    (createServerSupabaseClient as any).mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'user-connected' } }, error: null }),
      },
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({
          data: null, // Masqué par RLS car session d'un tiers
          error: null,
        }),
      }),
    });

    const req = new NextRequest('http://localhost:3000/api/interview/turn', {
      method: 'POST',
      body: JSON.stringify({
        sessionId: 'session-foreign-uuid',
        turnIndex: 1,
        studentTranscript: 'Ma réponse',
        elapsedSeconds: 60,
        profile: { currentDiploma: 'L3' },
      }),
    });

    const res = await turnRoute(req);
    expect(res.status).toBe(403);
    const json = await res.json();
    expect(json.error).toMatch(/Accès refusé/i);
  });

  it('doit refuser /api/interview/report avec HTTP 403 si la session est filtrée par RLS (null)', async () => {
    (createServerSupabaseClient as any).mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'user-connected' } }, error: null }),
      },
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({
          data: null, // Masqué par RLS car session d'un tiers
          error: null,
        }),
      }),
    });

    const req = new NextRequest('http://localhost:3000/api/interview/report', {
      method: 'POST',
      body: JSON.stringify({
        sessionId: 'session-foreign-uuid',
        profile: { currentDiploma: 'L3', targetPrograms: 'M1' },
        turns: [{ turnIndex: 1, aiQuestion: 'Q', pedagogicalIntent: 'P', studentTranscript: 'R', turnType: 'REGULAR', durationSeconds: 30, timestamp: '' }],
      }),
    });

    const res = await reportRoute(req);
    expect(res.status).toBe(403);
    const json = await res.json();
    expect(json.error).toMatch(/Accès refusé/i);
  });
});

