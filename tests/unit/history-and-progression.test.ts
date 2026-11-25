import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { GET, DELETE } from '@/app/api/interview/history/route';
import { 
  getTimelineData, 
  getGlobalProgressionStats, 
  compareTwoSessions, 
  generateRevisionMemo,
  SessionRecord 
} from '@/lib/indicators/progression';

// Mock Supabase Server Client
const mockGetUser = vi.fn();
const mockSelect = vi.fn();
const mockEq = vi.fn();
const mockOrder = vi.fn();
const mockDelete = vi.fn();

vi.mock('@/lib/supabase/server', () => ({
  createServerSupabaseClient: vi.fn(async () => ({
    auth: {
      getUser: mockGetUser,
    },
    from: vi.fn((table: string) => {
      if (table === 'interview_sessions') {
        return {
          select: mockSelect,
          delete: mockDelete,
        };
      }
      return {};
    }),
  })),
}));

describe('Historique et Cockpit Pédagogique (Features A à E)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Route API GET /api/interview/history', () => {
    it('doit renvoyer HTTP 401 si l utilisateur n est pas authentifié', async () => {
      mockGetUser.mockResolvedValueOnce({ data: { user: null }, error: { message: 'Non connecté' } });

      const response = await GET();
      expect(response.status).toBe(401);
      const json = await response.json();
      expect(json.error).toContain('Non authentifié');
    });

    it('doit récupérer les sessions avec les rapports enrichis pour l utilisateur connecté', async () => {
      mockGetUser.mockResolvedValueOnce({
        data: { user: { id: 'usr-123', email: 'test@campus.fr' } },
        error: null,
      });

      const fakeSessions = [
        {
          id: 'sess-1',
          status: 'COMPLETED',
          duration_seconds: 300,
          started_at: '2026-10-18T10:00:00Z',
          evaluation_reports: [
            {
              id: 'rep-1',
              overall_score: 75,
              scores_by_criteria: [
                { name: 'projet', label: 'Projet Pro', score: 16, maxScore: 20 },
              ],
              synthesis_summary: 'Très bonne prestation',
              evaluation_completeness: 'COMPLETE',
              created_at: '2026-10-18T10:05:00Z',
            },
          ],
        },
      ];

      mockOrder.mockResolvedValueOnce({ data: fakeSessions, error: null });
      mockEq.mockReturnValueOnce({ order: mockOrder });
      mockSelect.mockReturnValueOnce({ eq: mockEq });

      const response = await GET();
      expect(response.status).toBe(200);
      const json = await response.json();
      expect(json.sessions).toHaveLength(1);
      expect(json.sessions[0].evaluation_reports[0].overall_score).toBe(75);
    });

    it('doit renvoyer un tableau vide sans planter en cas d erreur de base de données', async () => {
      mockGetUser.mockResolvedValueOnce({
        data: { user: { id: 'usr-123' } },
        error: null,
      });

      mockOrder.mockResolvedValueOnce({ data: null, error: { message: 'Table non trouvée' } });
      mockEq.mockReturnValueOnce({ order: mockOrder });
      mockSelect.mockReturnValueOnce({ eq: mockEq });

      const response = await GET();
      expect(response.status).toBe(200);
      const json = await response.json();
      expect(json.sessions).toEqual([]);
    });
  });

  describe('Route API DELETE /api/interview/history', () => {
    it('doit renvoyer HTTP 401 si non authentifié lors d une suppression', async () => {
      mockGetUser.mockResolvedValueOnce({ data: { user: null }, error: { message: 'Unauthorized' } });

      const req = new NextRequest('http://localhost:3000/api/interview/history?sessionId=a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d', {
        method: 'DELETE',
      });

      const response = await DELETE(req);
      expect(response.status).toBe(401);
    });

    it('doit renvoyer HTTP 400 si l identifiant de session est invalide ou absent', async () => {
      mockGetUser.mockResolvedValueOnce({
        data: { user: { id: 'usr-123' } },
        error: null,
      });

      const req = new NextRequest('http://localhost:3000/api/interview/history?sessionId=not-a-valid-uuid', {
        method: 'DELETE',
      });

      const response = await DELETE(req);
      expect(response.status).toBe(400);
      const json = await response.json();
      expect(json.error).toContain('invalide');
    });

    it('doit supprimer la session avec succès si l identifiant UUID est valide', async () => {
      mockGetUser.mockResolvedValueOnce({
        data: { user: { id: 'usr-123' } },
        error: null,
      });

      const eqUser = vi.fn().mockResolvedValueOnce({ error: null });
      const eqId = vi.fn().mockReturnValueOnce({ eq: eqUser });
      mockDelete.mockReturnValueOnce({ eq: eqId });

      const validUuid = '12345678-1234-1234-1234-123456789abc';
      const req = new NextRequest(`http://localhost:3000/api/interview/history?sessionId=${validUuid}`, {
        method: 'DELETE',
      });

      const response = await DELETE(req);
      expect(response.status).toBe(200);
      const json = await response.json();
      expect(json.success).toBe(true);
      expect(json.deletedSessionId).toBe(validUuid);
    });
  });

  describe('Fonctions d analyse et de progression pédagogique', () => {
    const mockSessions: SessionRecord[] = [
      {
        id: 'sess-recent',
        status: 'COMPLETED',
        started_at: '2026-10-18T14:00:00Z',
        duration_seconds: 310,
        evaluation_reports: [
          {
            id: 'rep-recent',
            overall_score: 82,
            evaluation_completeness: 'COMPLETE',
            created_at: '2026-10-18T14:05:00Z',
            synthesis_summary: 'Belle progression et projet clair',
            scores_by_criteria: [
              { name: 'projet_pro', label: 'Projet Professionnel', score: 17, maxScore: 20 },
              { name: 'aisance', label: 'Aisance & Élocution', score: 16, maxScore: 20 },
            ],
            strengths: [
              { criterion: 'Projet', verbatimQuote: 'Mon objectif est de créer...', feedback: 'Très argumenté' },
            ],
            areas_to_improve: [
              { criterion: 'Finances', verbatimQuote: 'Mes parents financent tout', feedback: 'Préciser le montant' },
            ],
            reformulation_examples: [
              { studentQuote: 'Je sais pas', recommendedAnswer: 'D après mes recherches...', explanation: 'Plus pro' },
            ],
            revision_topics: ['Frais de scolarité', 'Débouchés professionnels'],
          },
        ],
      },
      {
        id: 'sess-technical-issue',
        status: 'COMPLETED',
        started_at: '2026-10-15T12:00:00Z',
        duration_seconds: 40,
        evaluation_reports: [
          {
            id: 'rep-tech',
            overall_score: 0,
            evaluation_completeness: 'UNAVAILABLE',
            synthesis_summary: 'Données orales insuffisantes - incident microphone',
          },
        ],
      },
      {
        id: 'sess-initial',
        status: 'COMPLETED',
        started_at: '2026-10-10T09:00:00Z',
        duration_seconds: 290,
        evaluation_reports: [
          {
            id: 'rep-initial',
            overall_score: 64,
            evaluation_completeness: 'COMPLETE',
            created_at: '2026-10-10T09:05:00Z',
            synthesis_summary: 'Bonne base mais hésitations',
            scores_by_criteria: [
              { name: 'projet_pro', label: 'Projet Professionnel', score: 13, maxScore: 20 },
              { name: 'aisance', label: 'Aisance & Élocution', score: 12, maxScore: 20 },
            ],
            strengths: [
              { criterion: 'Motivation', verbatimQuote: 'J aime la France', feedback: 'Enthousiasme réel' },
            ],
            areas_to_improve: [
              { criterion: 'Structure', verbatimQuote: 'Euh...', feedback: 'Structurer en points' },
            ],
            revision_topics: ['Structure des réponses'],
          },
        ],
      },
    ];

    it('getTimelineData doit extraire uniquement les sessions valides dans l ordre chronologique', () => {
      const timeline = getTimelineData(mockSessions);
      expect(timeline).toHaveLength(2); // La session technique 'UNAVAILABLE' est exclue
      expect(timeline[0].score).toBe(64); // Session initiale en 1er
      expect(timeline[1].score).toBe(82); // Session récente en 2ème
      expect(timeline[0].index).toBe(1);
      expect(timeline[1].index).toBe(2);
    });

    it('getGlobalProgressionStats doit calculer fidèlement les indicateurs réels', () => {
      const stats = getGlobalProgressionStats(mockSessions);
      expect(stats.totalSessions).toBe(3);
      expect(stats.evaluatedSessions).toBe(2);
      expect(stats.initialScore).toBe(64);
      expect(stats.latestScore).toBe(82);
      expect(stats.highestScore).toBe(82);
      expect(stats.totalProgression).toBe(18); // 82 - 64 = +18 pts
      expect(stats.averageScore).toBe(73); // (64 + 82) / 2 = 73
    });

    it('compareTwoSessions doit mesurer le différentiel global et critère par critère', () => {
      const comparison = compareTwoSessions(mockSessions[2], mockSessions[0]); // initial vs recent
      expect(comparison.scoreDiff).toBe(18); // +18
      expect(comparison.criteria).toHaveLength(2);

      const projetCrit = comparison.criteria.find((c) => c.name === 'projet_pro');
      expect(projetCrit).toBeDefined();
      expect(projetCrit?.scoreA).toBe(13);
      expect(projetCrit?.scoreB).toBe(17);
      expect(projetCrit?.diff).toBe(4); // +4 pts en Projet Pro
    });

    it('generateRevisionMemo doit consolider les forces et les reformulations sans inventer de données', () => {
      const memo = generateRevisionMemo(mockSessions);
      expect(memo.evaluatedCount).toBe(2);
      expect(memo.highestScore).toBe(82);
      expect(memo.strengths.length).toBeGreaterThan(0);
      expect(memo.areasToImprove.length).toBeGreaterThan(0);
      expect(memo.topReformulations).toHaveLength(1);
      expect(memo.recommendedTopics).toContain('Frais de scolarité');
    });
  });
});
