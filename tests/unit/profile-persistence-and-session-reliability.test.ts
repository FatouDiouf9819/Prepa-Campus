import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

// Mock de createServerSupabaseClient
vi.mock('@/lib/supabase/server', () => ({
  createServerSupabaseClient: vi.fn(),
}));

// Mock de openai
vi.mock('@/lib/ai/openai', () => ({
  getOpenAIClient: vi.fn(),
  generateFirstQuestion: vi.fn().mockResolvedValue({
    question: 'Bonjour, présentez votre parcours.',
    pedagogicalIntent: 'Présentation initiale.',
  }),
  generateAdaptiveTurn: vi.fn().mockResolvedValue({
    question: 'Question suivante',
    pedagogicalIntent: 'Approfondissement',
    turnType: 'REGULAR',
    isConcluding: false,
  }),
  generateEvaluationReport: vi.fn().mockResolvedValue({
    overallScore: 78,
    scoresByCriteria: [
      { name: 'parcours', label: 'Parcours', score: 16, maxScore: 20, comment: 'Bien' },
      { name: 'formations', label: 'Formations', score: 20, maxScore: 25, comment: 'Bien' },
      { name: 'projet_pro', label: 'Projet', score: 20, maxScore: 25, comment: 'Bien' },
      { name: 'argumentation', label: 'Argumentation', score: 15, maxScore: 20, comment: 'Bien' },
      { name: 'elocution', label: 'Élocution', score: 7, maxScore: 10, comment: 'Bien' },
    ],
    strengths: [{ criterion: 'Parcours', verbatimQuote: 'Licence 3', feedback: 'Clair' }],
    areasToImprove: [{ criterion: 'Élocution', verbatimQuote: 'Hmm', feedback: 'Fluidité' }],
    reformulationExamples: [],
    revisionTopics: ['Revoir les UE du semestre 1'],
    synthesisSummary: 'Simulation réussie.',
    evaluationGridVersion: 'v1.0.0',
    evaluationCompleteness: 'COMPLETE',
    isTechnicalIssue: false,
  }),
}));

import { createServerSupabaseClient } from '@/lib/supabase/server';
import { POST as postProfileRoute } from '@/app/api/profile/route';
import { POST as startRoute } from '@/app/api/interview/start/route';
import { POST as reportRoute } from '@/app/api/interview/report/route';

describe('Fiabilisation de la Persistance et Gestion des Sessions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ============================================================================
  // 1. GESTION DES ÉCHECS D'ÉCRITURE SUPABASE SUR /api/profile
  // ============================================================================
  describe('Sauvegarde du Profil (/api/profile) — Élimination des faux succès', () => {
    it('doit renvoyer HTTP 500 et une erreur explicite lorsque Supabase échoue lors de la persistance (pas de faux succès 200)', async () => {
      const mockUser = { id: 'user-db-error-1' };

      // Simuler un échec direct de l'upsert Supabase
      (createServerSupabaseClient as any).mockResolvedValue({
        auth: {
          getUser: vi.fn().mockResolvedValue({ data: { user: mockUser }, error: null }),
        },
        from: vi.fn().mockReturnValue({
          upsert: vi.fn().mockReturnThis(),
          select: vi.fn().mockReturnThis(),
          abortSignal: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({
            data: null,
            error: { message: 'Database connection failed: deadlock detected', code: '40P01' },
          }),
        }),
      });

      const payload = {
        countryResidence: 'Sénégal',
        currentDiploma: 'Licence 3 Informatique',
        fieldOfStudy: 'Génie Logiciel',
        targetPrograms: 'Master Informatique Big Data',
        targetInstitutions: 'Université de Lille',
        reasonsForPrograms: 'Cette formation associe enseignement théorique pointu et alternance professionnelle.',
        reasonFrance: 'La France offre un environnement académique réputé et des laboratoires de premier ordre.',
        professionalGoal: 'Devenir Lead Architect Cloud dans le secteur des technologies distribuées.',
        isCompleted: true,
      };

      const req = new NextRequest('http://localhost:3000/api/profile', {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      const res = await postProfileRoute(req);

      // Le serveur NE DOIT PAS renvoyer 200 avec succès simulé
      expect(res.status).toBe(500);
      const json = await res.json();
      expect(json.success).toBeUndefined();
      expect(json.error).toMatch(/Erreur lors de l'enregistrement de votre profil sur le serveur/i);
      expect(json.details).toContain('Database connection failed');
    });

    it('doit renvoyer HTTP 200 et persister target_wishes lorsque Supabase répond correctement', async () => {
      const mockUser = { id: 'user-success-1' };
      let capturedPayload: any = null;

      const mockSavedRow = {
        id: 'prof-uuid-1',
        user_id: mockUser.id,
        country_residence: 'Sénégal',
        current_diploma: 'Licence 3',
        field_of_study: 'Informatique',
        target_programs: 'Master Big Data',
        target_institutions: 'Université Paris-Saclay',
        target_wishes: [
          { id: 'w1', programName: 'Master Big Data', institutionName: 'Université Paris-Saclay' },
        ],
        reasons_for_programs: 'Formation d excellence.',
        reason_france: 'Excellence académique.',
        professional_goal: 'Devenir Ingénieur DevOps.',
        academic_status: 'STUDYING',
        is_completed: true,
      };

      (createServerSupabaseClient as any).mockResolvedValue({
        auth: {
          getUser: vi.fn().mockResolvedValue({ data: { user: mockUser }, error: null }),
        },
        from: vi.fn().mockReturnValue({
          upsert: vi.fn().mockImplementation((payload) => {
            capturedPayload = payload;
            return {
              select: vi.fn().mockReturnThis(),
              abortSignal: vi.fn().mockReturnThis(),
              single: vi.fn().mockResolvedValue({ data: mockSavedRow, error: null }),
            };
          }),
        }),
      });

      const payload = {
        countryResidence: 'Sénégal',
        currentDiploma: 'Licence 3',
        fieldOfStudy: 'Informatique',
        targetWishes: [
          { id: 'w1', programName: 'Master Big Data', institutionName: 'Université Paris-Saclay' },
        ],
        targetPrograms: 'Master Big Data',
        targetInstitutions: 'Université Paris-Saclay',
        reasonsForPrograms: 'Formation d excellence avec modules pratiques et spécialisation ciblée.',
        reasonFrance: 'Excellence académique et partenariats avec les entreprises technologiques.',
        professionalGoal: 'Devenir Ingénieur DevOps et automatiser les infrastructures distribuées.',
        isCompleted: true,
      };

      const req = new NextRequest('http://localhost:3000/api/profile', {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      const res = await postProfileRoute(req);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.profile.id).toBe('prof-uuid-1');

      // Vérifier que target_wishes est bien transmis à Supabase
      expect(capturedPayload).not.toBeNull();
      expect(capturedPayload.target_wishes).toBeDefined();
      expect(capturedPayload.target_wishes).toHaveLength(1);
      expect(capturedPayload.target_wishes[0].programName).toBe('Master Big Data');
    });

    it('doit basculer sur basePayload si PostgreSQL renvoie une erreur de colonne non migrée (code 42703)', async () => {
      const mockUser = { id: 'user-legacy-db' };
      let attemptCount = 0;

      const mockSavedRowBase = {
        id: 'prof-legacy-1',
        user_id: mockUser.id,
        country_residence: 'Sénégal',
        current_diploma: 'Licence 3',
        field_of_study: 'Informatique',
        target_programs: 'Master Informatique',
        target_institutions: 'Université de Bordeaux',
        reason_france: 'Recherche appliquée.',
        professional_goal: 'Consultant en cybersécurité.',
        is_completed: false,
      };

      (createServerSupabaseClient as any).mockResolvedValue({
        auth: {
          getUser: vi.fn().mockResolvedValue({ data: { user: mockUser }, error: null }),
        },
        from: vi.fn().mockReturnValue({
          upsert: vi.fn().mockImplementation((payload) => {
            attemptCount++;
            if (attemptCount === 1) {
              // Première tentative avec extendedPayload : simuler colonne inexistante
              return {
                select: vi.fn().mockReturnThis(),
                abortSignal: vi.fn().mockReturnThis(),
                single: vi.fn().mockResolvedValue({
                  data: null,
                  error: { code: '42703', message: 'column "target_wishes" does not exist' },
                }),
              };
            }
            // Deuxième tentative avec basePayload (schéma 001) : succès
            return {
              select: vi.fn().mockReturnThis(),
              abortSignal: vi.fn().mockReturnThis(),
              single: vi.fn().mockResolvedValue({ data: mockSavedRowBase, error: null }),
            };
          }),
        }),
      });

      const req = new NextRequest('http://localhost:3000/api/profile', {
        method: 'POST',
        body: JSON.stringify({
          countryResidence: 'Sénégal',
          currentDiploma: 'Licence 3',
          fieldOfStudy: 'Informatique',
          isCompleted: false,
        }),
      });

      const res = await postProfileRoute(req);
      expect(res.status).toBe(200);
      expect(attemptCount).toBe(2);
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.profile.id).toBe('prof-legacy-1');
    });
  });

  // ============================================================================
  // 2. CRÉATION DE SESSION SÉCURISÉE SUR /api/interview/start
  // ============================================================================
  describe('Démarrage de Simulation (/api/interview/start) — Intégrité des identifiants', () => {
    it('doit renvoyer HTTP 500 si la persistance de la session en base échoue (pas d identifiant session_ temporaire)', async () => {
      const mockUser = { id: 'user-session-fail-1' };

      (createServerSupabaseClient as any).mockResolvedValue({
        auth: {
          getUser: vi.fn().mockResolvedValue({ data: { user: mockUser }, error: null }),
        },
        rpc: vi.fn().mockResolvedValue({ data: 1, error: null }), // Crédit disponible
        from: vi.fn().mockReturnValue({
          insert: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: null,
                error: { message: 'relation "interview_sessions" does not exist or network failed' },
              }),
            }),
          }),
        }),
      });

      const req = new NextRequest('http://localhost:3000/api/interview/start', {
        method: 'POST',
        body: JSON.stringify({
          profile: {
            currentDiploma: 'Licence 3',
            targetPrograms: 'Master Big Data',
          },
        }),
      });

      const res = await startRoute(req);

      // Le serveur NE DOIT PAS renvoyer 200 avec sessionId="session_..."
      expect(res.status).toBe(500);
      const json = await res.json();
      expect(json.sessionId).toBeUndefined();
      expect(json.error).toMatch(/Impossible d'initialiser la session d'entretien sur le serveur/i);
    });

    it('doit renvoyer HTTP 200 avec le vrai UUID PostgreSQL lorsque l insertion de session réussit', async () => {
      const mockUser = { id: 'user-session-success-1' };
      const realSessionUuid = 'd3b07384-d113-4a87-b9c2-9e9d6e2e5a7b';

      (createServerSupabaseClient as any).mockResolvedValue({
        auth: {
          getUser: vi.fn().mockResolvedValue({ data: { user: mockUser }, error: null }),
        },
        rpc: vi.fn().mockResolvedValue({ data: 1, error: null }),
        from: vi.fn().mockImplementation((table: string) => {
          if (table === 'interview_sessions') {
            return {
              insert: vi.fn().mockReturnValue({
                select: vi.fn().mockReturnValue({
                  single: vi.fn().mockResolvedValue({
                    data: { id: realSessionUuid },
                    error: null,
                  }),
                }),
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
        body: JSON.stringify({
          profile: {
            currentDiploma: 'Licence 3 Informatique',
            targetPrograms: 'Master Miage',
          },
        }),
      });

      const res = await startRoute(req);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.sessionId).toBe(realSessionUuid);
      expect(json.sessionId).not.toMatch(/^session_/);
      expect(json.initialTurn).toBeDefined();
      expect(json.initialTurn.turnIndex).toBe(1);
    });
  });

  // ============================================================================
  // 3. PERSISTANCE ET SYNCHRONISATION DU RAPPORT SUR /api/interview/report
  // ============================================================================
  describe('Sauvegarde du Rapport (/api/interview/report) — Synchronisation des identifiants', () => {
    it('doit synchroniser l UUID de la base dans report.id et affecter report.sessionId', async () => {
      const mockUser = { id: 'user-report-sync-1' };
      const realSessionUuid = '7a2e4b6c-8d1f-40e3-b9a5-1c3d5e7f9a2b';
      const realReportUuid = '9f8e7d6c-5b4a-3210-fedc-ba9876543210';

      (createServerSupabaseClient as any).mockResolvedValue({
        auth: {
          getUser: vi.fn().mockResolvedValue({ data: { user: mockUser }, error: null }),
        },
        from: vi.fn().mockImplementation((table: string) => {
          if (table === 'interview_sessions') {
            return {
              select: vi.fn().mockReturnThis(),
              eq: vi.fn().mockReturnThis(),
              maybeSingle: vi.fn().mockResolvedValue({
                data: { id: realSessionUuid, user_id: mockUser.id },
                error: null,
              }),
              update: vi.fn().mockReturnValue({
                eq: vi.fn().mockResolvedValue({ data: null, error: null }),
              }),
            };
          }
          if (table === 'evaluation_reports') {
            return {
              upsert: vi.fn().mockReturnValue({
                select: vi.fn().mockReturnValue({
                  maybeSingle: vi.fn().mockResolvedValue({
                    data: { id: realReportUuid },
                    error: null,
                  }),
                }),
              }),
            };
          }
          return {};
        }),
      });

      const req = new NextRequest('http://localhost:3000/api/interview/report', {
        method: 'POST',
        body: JSON.stringify({
          sessionId: realSessionUuid,
          profile: { currentDiploma: 'L3', targetPrograms: 'M1' },
          turns: [
            {
              turnIndex: 1,
              aiQuestion: 'Q1',
              pedagogicalIntent: 'P1',
              studentTranscript: 'Réponse valide de l étudiant.',
              turnType: 'REGULAR',
              durationSeconds: 30,
              timestamp: new Date().toISOString(),
            },
          ],
        }),
      });

      const res = await reportRoute(req);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.report).toBeDefined();
      expect(json.report.id).toBe(realReportUuid);
      expect(json.report.sessionId).toBe(realSessionUuid);
    });
  });
});
