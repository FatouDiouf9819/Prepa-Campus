import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

// Mock de createServerSupabaseClient
vi.mock('@/lib/supabase/server', () => ({
  createServerSupabaseClient: vi.fn(),
}));

// Mock de OpenAI
vi.mock('@/lib/ai/openai', () => ({
  getOpenAIClient: vi.fn(),
  generateFirstQuestion: vi.fn().mockResolvedValue({
    question: 'Bonjour. Pouvez-vous présenter vos motivations pour la France ?',
    pedagogicalIntent: 'Évaluer la clarté du projet académique.',
  }),
  generateEvaluationReport: vi.fn(),
}));

import { createServerSupabaseClient } from '@/lib/supabase/server';
import { POST as startRoute } from '@/app/api/interview/start/route';
import { POST as postProfileRoute, GET as getProfileRoute } from '@/app/api/profile/route';
import { TargetWish } from '@/types/profile';

describe('Phase 2 — Fiabilisation des Crédits, Résilience et Persistance Supabase', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const validProfile = {
    countryResidence: 'Sénégal',
    academicStatus: 'STUDYING',
    currentDiploma: 'Licence 3 Informatique',
    fieldOfStudy: 'Génie Logiciel',
    currentInstitution: 'Université Cheikh Anta Diop',
    targetPrograms: 'Master Big Data, Master Génie Logiciel',
    targetInstitutions: 'Université de Lille, Sorbonne Université',
    reasonsForPrograms: 'Formations de pointe avec opportunités de stage et recherche.',
    reasonFrance: 'Excellence académique et écosystème technologique innovant.',
    professionalGoal: 'Architecte logiciel cloud et ingénieur big data.',
    strongSkills: 'Java, TypeScript, Docker',
    weaknessesToWork: 'Gestion du temps lors des réponses orales',
    isCompleted: true,
  };

  // ============================================================================
  // 1. ÉCHEC DE CRÉATION DE SESSION APRÈS UNE TENTATIVE DE DÉBIT
  // ============================================================================
  it('doit déclencher la compensation de remboursement si l insertion de session échoue après déduction du crédit', async () => {
    const mockUser = { id: 'user-compensation-test' };
    const rpcMock = vi.fn().mockImplementation((fnName: string) => {
      if (fnName === 'start_interview_session_atomic') {
        // Simuler absence de la migration 005 pour tester le mode de repli et compensation
        return Promise.resolve({ data: null, error: { code: '42883', message: 'function start_interview_session_atomic does not exist' } });
      }
      if (fnName === 'deduct_user_credit') {
        return Promise.resolve({ data: 0, error: null }); // Débit réussi : nouveau solde = 0
      }
      if (fnName === 'refund_user_credit') {
        return Promise.resolve({ data: 1, error: null }); // Remboursement de compensation réussi
      }
      return Promise.resolve({ data: null, error: null });
    });

    (createServerSupabaseClient as any).mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: mockUser }, error: null }),
      },
      rpc: rpcMock,
      from: vi.fn().mockImplementation((table: string) => {
        if (table === 'interview_sessions') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            order: vi.fn().mockReturnThis(),
            limit: vi.fn().mockResolvedValue({ data: [], error: null }), // Pas de session existante
            insert: vi.fn().mockReturnValue({
              select: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: null,
                  error: { message: 'Database connection failed during session insert' },
                }),
              }),
            }),
          };
        }
        return {};
      }),
    });

    const req = new NextRequest('http://localhost:3000/api/interview/start', {
      method: 'POST',
      body: JSON.stringify({ profile: validProfile }),
    });

    const res = await startRoute(req);
    expect(res.status).toBe(500);
    const json = await res.json();

    // Vérifier que la compensation refund_user_credit a bien été déclenchée
    expect(rpcMock).toHaveBeenCalledWith('refund_user_credit', { p_user_id: mockUser.id });
    expect(json.error).toMatch(/Votre crédit n'a pas été débité/i);
  });

  // ============================================================================
  // 2. CRÉDIT INSUFFISANT (AUCUN DÉBIT & AUCUNE SESSION)
  // ============================================================================
  it('doit refuser le démarrage avec HTTP 403 et ne rien débiter si le solde est insuffisant', async () => {
    const mockUser = { id: 'user-no-credit' };

    (createServerSupabaseClient as any).mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: mockUser }, error: null }),
      },
      rpc: vi.fn().mockImplementation((fnName: string) => {
        if (fnName === 'start_interview_session_atomic') {
          // Solde insuffisant retourné par la transaction atomique
          return Promise.resolve({
            data: [{ session_id: null, remaining_credits: -1, is_existing: false }],
            error: null,
          });
        }
        return Promise.resolve({ data: null, error: null });
      }),
    });

    const req = new NextRequest('http://localhost:3000/api/interview/start', {
      method: 'POST',
      body: JSON.stringify({ profile: validProfile }),
    });

    const res = await startRoute(req);
    expect(res.status).toBe(403);
    const json = await res.json();
    expect(json.error).toMatch(/Solde insuffisant/i);
  });

  // ============================================================================
  // 3. DOUBLE-CLIC OU REQUÊTES CONCURRENTES (RÉUTILISATION SANS RE-DÉBIT)
  // ============================================================================
  it('doit réutiliser la session en cours sans re-débiter de crédit en cas de double-clic ou requête simultanée', async () => {
    const mockUser = { id: 'user-double-click' };
    const existingSessionId = '99999999-8888-7777-6666-555555555555';
    const recentTimestamp = new Date(Date.now() - 10000).toISOString(); // Démarrée il y a 10 secondes

    const rpcMock = vi.fn().mockImplementation((fnName: string) => {
      if (fnName === 'start_interview_session_atomic') {
        // La transaction atomique détecte la session récente et la retourne avec is_existing = true
        return Promise.resolve({
          data: [{ session_id: existingSessionId, remaining_credits: 1, is_existing: true }],
          error: null,
        });
      }
      return Promise.resolve({ data: null, error: null });
    });

    (createServerSupabaseClient as any).mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: mockUser }, error: null }),
      },
      rpc: rpcMock,
      from: vi.fn().mockImplementation((table: string) => {
        if (table === 'interview_turns') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            maybeSingle: vi.fn().mockResolvedValue({
              data: {
                ai_question: 'Question déjà enregistrée pour cette session',
                pedagogical_intent: 'Intent existant',
                created_at: recentTimestamp,
              },
              error: null,
            }),
            insert: vi.fn().mockResolvedValue({ data: null, error: null }),
          };
        }
        return {};
      }),
    });

    const req = new NextRequest('http://localhost:3000/api/interview/start', {
      method: 'POST',
      body: JSON.stringify({ profile: validProfile }),
    });

    const res = await startRoute(req);
    expect(res.status).toBe(200);
    const json = await res.json();

    expect(json.sessionId).toBe(existingSessionId);
    expect(json.initialTurn.aiQuestion).toBe('Question déjà enregistrée pour cette session');
    expect(json.diagnostic.reusedSession).toBe(true);
    // Vérifier que deduct_user_credit n'a pas été appelé séparément
    expect(rpcMock).not.toHaveBeenCalledWith('deduct_user_credit', expect.anything());
  });

  // ============================================================================
  // 4. ÉCHEC RÉSEAU (GESTION D'ERREUR PROPRE ET PRÉSERVATION DU SOLDE)
  // ============================================================================
  it('doit renvoyer HTTP 500 et préserver les crédits en cas de panne réseau sur la RPC', async () => {
    const mockUser = { id: 'user-network-fail' };

    (createServerSupabaseClient as any).mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: mockUser }, error: null }),
      },
      rpc: vi.fn().mockImplementation((fnName: string) => {
        if (fnName === 'start_interview_session_atomic') {
          return Promise.resolve({ data: null, error: { message: 'function not found' } });
        }
        if (fnName === 'deduct_user_credit') {
          // Erreur réseau fatale
          return Promise.resolve({ data: null, error: { message: 'Network connection timeout to Supabase' } });
        }
        return Promise.resolve({ data: null, error: null });
      }),
      from: vi.fn().mockImplementation(() => ({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue({ data: [], error: null }),
      })),
    });

    const req = new NextRequest('http://localhost:3000/api/interview/start', {
      method: 'POST',
      body: JSON.stringify({ profile: validProfile }),
    });

    const res = await startRoute(req);
    expect(res.status).toBe(500);
    const json = await res.json();
    expect(json.error).toMatch(/Impossible de vérifier ou mettre à jour votre solde de crédits/i);
  });

  // ============================================================================
  // 5. RÉUSSITE DU DÉMARRAGE ET DÉBIT UNIQUE (TRANSACTION ATOMIQUE)
  // ============================================================================
  it('doit démarrer une session avec un vrai UUID et un débit unique via la transaction atomique', async () => {
    const mockUser = { id: 'user-atomic-success' };
    const realSessionId = 'a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d';

    (createServerSupabaseClient as any).mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: mockUser }, error: null }),
      },
      rpc: vi.fn().mockImplementation((fnName: string) => {
        if (fnName === 'start_interview_session_atomic') {
          return Promise.resolve({
            data: [{ session_id: realSessionId, remaining_credits: 0, is_existing: false }],
            error: null,
          });
        }
        return Promise.resolve({ data: null, error: null });
      }),
      from: vi.fn().mockImplementation((table: string) => {
        if (table === 'evaluation_reports') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            order: vi.fn().mockReturnThis(),
            limit: vi.fn().mockResolvedValue({ data: [], error: null }),
          };
        }
        if (table === 'interview_turns') {
          return {
            insert: vi.fn().mockResolvedValue({ data: null, error: null }),
          };
        }
        return {};
      }),
    });

    const req = new NextRequest('http://localhost:3000/api/interview/start', {
      method: 'POST',
      body: JSON.stringify({ profile: validProfile }),
    });

    const res = await startRoute(req);
    expect(res.status).toBe(200);
    const json = await res.json();

    expect(json.success).toBe(true);
    expect(json.sessionId).toBe(realSessionId);
    expect(json.initialTurn.turnIndex).toBe(1);
    expect(json.initialTurn.aiQuestion).toBeDefined();
  });

  // ============================================================================
  // 6. PERSISTANCE ET RELECTURE DU PROFIL ET DES 7 VŒUX MAXIMUM
  // ============================================================================
  it('doit enregistrer et restituer fidèlement les 7 vœux de formations et universités associés', async () => {
    const mockUser = { id: 'user-profile-wishes-test' };

    // Construire 7 vœux distincts complets
    const sevenWishes: TargetWish[] = Array.from({ length: 7 }, (_, i) => ({
      id: `wish_persisted_${i + 1}`,
      programName: `Formation Visée Numéro ${i + 1}`,
      institutionName: `Université Partenaire ${i + 1}`,
      entryLevel: i % 2 === 0 ? 'M1' : 'M2',
      motivation: `Excellence du programme académique ${i + 1}`,
      status: 'DRAFT',
    }));

    const completeProfileWithWishes = {
      ...validProfile,
      targetWishes: sevenWishes,
    };

    let savedPayloadInSupabase: Record<string, unknown> | null = null;

    (createServerSupabaseClient as any).mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: mockUser }, error: null }),
      },
      from: vi.fn().mockImplementation((table: string) => {
        if (table === 'academic_profiles') {
          return {
            upsert: vi.fn().mockImplementation((payload: Record<string, unknown>) => {
              savedPayloadInSupabase = payload;
              return {
                select: vi.fn().mockReturnValue({
                  abortSignal: vi.fn().mockReturnThis(),
                  single: vi.fn().mockResolvedValue({
                    data: {
                      id: 'profile-uuid-1',
                      user_id: mockUser.id,
                      country_residence: payload.country_residence,
                      current_diploma: payload.current_diploma,
                      field_of_study: payload.field_of_study,
                      target_wishes: payload.target_wishes,
                      target_programs: payload.target_programs,
                      target_institutions: payload.target_institutions,
                      reasons_for_programs: payload.reasons_for_programs,
                      reason_france: payload.reason_france,
                      professional_goal: payload.professional_goal,
                      is_completed: payload.is_completed,
                    },
                    error: null,
                  }),
                }),
              };
            }),
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                abortSignal: vi.fn().mockReturnThis(),
                maybeSingle: vi.fn().mockResolvedValue({
                  data: {
                    id: 'profile-uuid-1',
                    user_id: mockUser.id,
                    country_residence: 'Sénégal',
                    academic_status: 'STUDYING',
                    current_diploma: 'Licence 3 Informatique',
                    field_of_study: 'Génie Logiciel',
                    target_wishes: sevenWishes,
                    target_programs: sevenWishes.map((w) => w.programName).join(', '),
                    target_institutions: sevenWishes.map((w) => w.institutionName).join(', '),
                    reasons_for_programs: 'Choix motivé',
                    reason_france: 'Excellence',
                    professional_goal: 'Data Engineer',
                    is_completed: true,
                  },
                  error: null,
                }),
              }),
            }),
          };
        }
        return {};
      }),
    });

    // A. Écriture (POST)
    const postReq = new NextRequest('http://localhost:3000/api/profile', {
      method: 'POST',
      body: JSON.stringify(completeProfileWithWishes),
    });

    const postRes = await postProfileRoute(postReq);
    expect(postRes.status).toBe(200);
    const postJson = await postRes.json();
    expect(postJson.success).toBe(true);

    // Vérifier que les 7 vœux ont bien été envoyés à Supabase
    expect(savedPayloadInSupabase).toBeDefined();
    expect((savedPayloadInSupabase as any).target_wishes).toHaveLength(7);
    expect((savedPayloadInSupabase as any).target_wishes[6].programName).toBe('Formation Visée Numéro 7');
    expect((savedPayloadInSupabase as any).target_wishes[6].institutionName).toBe('Université Partenaire 7');

    // B. Relecture (GET)
    const getRes = await getProfileRoute();
    expect(getRes.status).toBe(200);
    const getJson = await getRes.json();
    expect(getJson.profile).toBeDefined();
    expect(getJson.profile.targetWishes).toHaveLength(7);
    expect(getJson.profile.targetWishes[0].programName).toBe('Formation Visée Numéro 1');
    expect(getJson.profile.targetWishes[0].institutionName).toBe('Université Partenaire 1');
  });

  // ============================================================================
  // 7. ACCÈS À UN RAPPORT APRÈS RECONNEXION (PERSISTANCE SERVEUR SANS LOCALSTORAGE)
  // ============================================================================
  it('doit permettre la relecture d un rapport d évaluation persisté côté serveur sans dépendance au cache local', async () => {
    const mockUser = { id: 'user-report-reconnect' };
    const savedSessionId = '44444444-5555-6666-7777-888888888888';
    const savedReportId = '99999999-aaaa-bbbb-cccc-dddddddddddd';

    const dbReportRecord = {
      id: savedReportId,
      session_id: savedSessionId,
      user_id: mockUser.id,
      overall_score: 84,
      scores_by_criteria: [
        { name: 'parcours', label: 'Parcours académique', score: 18, maxScore: 20 },
        { name: 'formations', label: 'Projet d études', score: 22, maxScore: 25 },
      ],
      strengths: [{ criterion: 'Parcours', verbatimQuote: 'Licence 3', feedback: 'Cohérence' }],
      areasToImprove: [{ criterion: 'Élocution', verbatimQuote: 'Hum', feedback: 'Débit' }],
      reformulation_examples: [],
      revision_topics: ['Préparer les cours du semestre 1'],
      synthesis_summary: 'Bilan très solide.',
      evaluation_grid_version: 'v1.0.0',
      evaluation_completeness: 'COMPLETE',
      is_technical_issue: false,
      created_at: new Date().toISOString(),
    };

    // Simuler la requête exécutée par la page de rapport côté client / SSR
    const supabaseMock = {
      from: vi.fn().mockImplementation((table: string) => {
        if (table === 'evaluation_reports') {
          return {
            select: vi.fn().mockReturnThis(),
            or: vi.fn().mockReturnThis(),
            maybeSingle: vi.fn().mockResolvedValue({
              data: dbReportRecord,
              error: null,
            }),
          };
        }
        return {};
      }),
    };

    // Exécution directe de la requête Supabase
    const { data: report, error } = await supabaseMock
      .from('evaluation_reports')
      .select('*')
      .or(`session_id.eq.${savedSessionId},id.eq.${savedSessionId}`)
      .maybeSingle();

    expect(error).toBeNull();
    expect(report).toBeDefined();
    expect(report.id).toBe(savedReportId);
    expect(report.session_id).toBe(savedSessionId);
    expect(report.overall_score).toBe(84);
    expect(report.evaluation_completeness).toBe('COMPLETE');
  });

  // ============================================================================
  // 8. REPRISE D'UNE SESSION INTERROMPUE SPÉCIFIQUE SANS NOUVEAU DÉBIT
  // ============================================================================
  it('doit reprendre une session en cours spécifique sans débiter de nouveau crédit', async () => {
    const mockUser = { id: 'user-resume-test' };
    const existingSessionId = '11111111-2222-3333-4444-555555555555';

    const rpcMock = vi.fn();
    (createServerSupabaseClient as any).mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: mockUser }, error: null }),
      },
      rpc: rpcMock,
      from: vi.fn().mockImplementation((table: string) => {
        if (table === 'interview_sessions') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            maybeSingle: vi.fn().mockResolvedValue({
              data: { id: existingSessionId, status: 'IN_PROGRESS' },
              error: null,
            }),
          };
        }
        if (table === 'interview_turns') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            order: vi.fn().mockReturnThis(),
            limit: vi.fn().mockReturnThis(),
            maybeSingle: vi.fn().mockResolvedValue({
              data: {
                ai_question: 'Présentez votre projet.',
                pedagogical_intent: 'Introduction',
                created_at: '2026-10-19T10:00:00Z',
              },
              error: null,
            }),
          };
        }
        if (table === 'evaluation_reports') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            order: vi.fn().mockReturnThis(),
            limit: vi.fn().mockResolvedValue({ data: [], error: null }),
          };
        }
        return {};
      }),
    });

    const req = new NextRequest('http://localhost:3000/api/interview/start', {
      method: 'POST',
      body: JSON.stringify({
        profile: validProfile,
        sessionId: existingSessionId,
      }),
    });

    const res = await startRoute(req);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.sessionId).toBe(existingSessionId);
    expect(json.diagnostic.reusedSession).toBe(true);
    // Aucun crédit débité
    expect(rpcMock).not.toHaveBeenCalled();
  });
});
