import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { 
  getCampusReadinessIndicator 
} from '@/lib/indicators/progression';
import { 
  getJuryPromptGuideline, 
  generateFirstQuestion, 
  generateAdaptiveTurn 
} from '@/lib/ai/openai';
import { POST as startRoute } from '@/app/api/interview/start/route';
import { POST as turnRoute } from '@/app/api/interview/turn/route';
import { AcademicProfileData } from '@/types/profile';

// Mock Supabase
const mockGetUser = vi.fn();
const mockRpc = vi.fn();
const mockFrom = vi.fn();

vi.mock('@/lib/supabase/server', () => ({
  createServerSupabaseClient: vi.fn(() => ({
    auth: {
      getUser: mockGetUser,
    },
    rpc: mockRpc,
    from: mockFrom,
  })),
}));

const mockProfile: AcademicProfileData = {
  countryResidence: 'Sénégal',
  currentDiploma: 'Licence 3 Informatique',
  fieldOfStudy: 'Génie Logiciel',
  targetPrograms: 'Master Big Data',
  targetInstitutions: 'Université de Lille',
  reasonFrance: 'Laboratoires de renommée mondiale.',
  professionalGoal: 'Data Engineer',
  reasonsForPrograms: 'Programme de cours pointu.',
  isCompleted: true,
};

describe('Option B : Excellence Pédagogique (CRS™, 3 Jury IA & Mémo de Révision)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('1. Campus Readiness Score™ (CRS sur 100)', () => {
    it('doit attribuer READY (Prêt pour l\'entretien) pour un score supérieur ou égal à 75/100', () => {
      const crs85 = getCampusReadinessIndicator(85);
      expect(crs85.score).toBe(85);
      expect(crs85.level).toBe('READY');
      expect(crs85.label).toBe('Prêt pour l\'entretien consulaire');
      expect(crs85.badgeClass).toContain('emerald');

      const crs100 = getCampusReadinessIndicator(100);
      expect(crs100.score).toBe(100);
      expect(crs100.level).toBe('READY');
    });

    it('doit attribuer IMPROVEMENT_NEEDED (Ajustements recommandés) pour un score entre 60 et 74/100', () => {
      const crs70 = getCampusReadinessIndicator(70);
      expect(crs70.score).toBe(70);
      expect(crs70.level).toBe('IMPROVEMENT_NEEDED');
      expect(crs70.label).toBe('Ajustements recommandés');
      expect(crs70.badgeClass).toContain('cyan');
    });

    it('doit attribuer AT_RISK (Risque d\'incohérence) pour un score strictement inférieur à 60/100', () => {
      const crs42 = getCampusReadinessIndicator(42);
      expect(crs42.score).toBe(42);
      expect(crs42.level).toBe('AT_RISK');
      expect(crs42.label).toBe('Risque d\'incohérence détecté');
      expect(crs42.badgeClass).toContain('amber');
    });

    it('doit gérer proprement les scores nuls ou non définis sans planter', () => {
      const crsNull = getCampusReadinessIndicator(null);
      expect(crsNull.score).toBe(0);
      expect(crsNull.level).toBe('AT_RISK');
      expect(crsNull.label).toBe('En attente d\'évaluation');
    });
  });

  describe('2. Postures et Guidelines des 3 Personnalités de Jury IA', () => {
    it('doit générer une posture bienveillante et encourageante pour BIENVEILLANT', () => {
      const guideline = getJuryPromptGuideline('BIENVEILLANT');
      expect(guideline).toContain('PÉDAGOGUE ET BIENVEILLANTE');
      expect(guideline).toContain('chaleureux');
      expect(guideline).toContain('confiance');
    });

    it('doit générer une posture neutre et officielle pour STANDARD', () => {
      const guideline = getJuryPromptGuideline('STANDARD');
      expect(guideline).toContain('OFFICIELLE CAMPUS FRANCE');
      expect(guideline).toContain('neutre');
      expect(guideline).toContain('professionnel');
    });

    it('doit générer une posture pointilleuse et sans concession pour CRASH_TEST', () => {
      const guideline = getJuryPromptGuideline('CRASH_TEST');
      expect(guideline).toContain('CRASH-TEST');
      expect(guideline).toContain('incisif');
      expect(guideline).toContain('pointilleux');
    });
  });

  describe('3. Génération des Questions & Relances selon la Personnalité', () => {
    it('doit adapter la première question en mode BIENVEILLANT (moteur déterministe)', async () => {
      const res = await generateFirstQuestion(mockProfile, [], [], 'BIENVEILLANT');
      expect(res.question).toContain('Prenez tout votre temps');
      expect(res.pedagogicalIntent).toContain('bienveillante');
    });

    it('doit adapter la première question en mode CRASH_TEST (moteur déterministe)', async () => {
      const res = await generateFirstQuestion(mockProfile, [], [], 'CRASH_TEST');
      expect(res.question).toContain('Allons droit à l\'essentiel');
      expect(res.pedagogicalIntent).toContain('exigence');
    });

    it('doit adapter les relances en mode CRASH_TEST si la réponse est trop brève (5 à 11 mots)', async () => {
      const turn = await generateAdaptiveTurn(
        mockProfile,
        [{ turnIndex: 1, aiQuestion: 'Question 1', pedagogicalIntent: 'P1', studentTranscript: 'Oui.', turnType: 'REGULAR', durationSeconds: 15, timestamp: '' }],
        'Oui je pense que cette formation me convient parfaitement.',
        40,
        [],
        [],
        'CRASH_TEST'
      );
      expect(turn.turnType).toBe('FOLLOWUP');
      expect(turn.question).toContain('beaucoup trop succincte');
    });

    it('doit adapter les relances en mode BIENVEILLANT si la réponse est trop brève (5 à 11 mots)', async () => {
      const turn = await generateAdaptiveTurn(
        mockProfile,
        [{ turnIndex: 1, aiQuestion: 'Question 1', pedagogicalIntent: 'P1', studentTranscript: 'Oui.', turnType: 'REGULAR', durationSeconds: 15, timestamp: '' }],
        'Oui je pense que cette formation me convient parfaitement.',
        40,
        [],
        [],
        'BIENVEILLANT'
      );
      expect(turn.turnType).toBe('FOLLOWUP');
      expect(turn.question).toContain('C\'est un bon début');
    });
  });

  describe('4. Intégration API /api/interview/start & /api/interview/turn avec juryPersonality', () => {
    it('doit accepter juryPersonality dans /api/interview/start sans erreur', async () => {
      mockGetUser.mockResolvedValueOnce({
        data: { user: { id: 'user-option-b', email: 'test@prepa.fr' } },
        error: null,
      });

      mockRpc.mockResolvedValueOnce({
        data: [{ session_id: 'session-opt-b-1', is_existing: false, remaining_credits: 3 }],
        error: null,
      });

      mockFrom.mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        neq: vi.fn().mockReturnThis(),
        in: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue({ data: [] }),
        insert: vi.fn().mockResolvedValue({ data: null, error: null }),
        maybeSingle: vi.fn().mockResolvedValue({ data: null }),
      });

      const req = new NextRequest('http://localhost:3000/api/interview/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          profile: mockProfile,
          juryPersonality: 'CRASH_TEST',
        }),
      });

      const res = await startRoute(req);
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.initialTurn.aiQuestion).toContain('Allons droit à l\'essentiel');
    });

    it('doit accepter juryPersonality dans /api/interview/turn sans erreur', async () => {
      mockGetUser.mockResolvedValueOnce({
        data: { user: { id: 'user-option-b', email: 'test@prepa.fr' } },
        error: null,
      });

      mockFrom.mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        neq: vi.fn().mockReturnThis(),
        in: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue({ data: [] }),
        insert: vi.fn().mockResolvedValue({ data: null, error: null }),
        maybeSingle: vi.fn().mockResolvedValue({ data: { id: 'session-opt-b-1', user_id: 'user-option-b', status: 'IN_PROGRESS' } }),
      });

      const req = new NextRequest('http://localhost:3000/api/interview/turn', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: 'session-opt-b-1',
          turnIndex: 1,
          studentTranscript: 'Oui je pense que cette formation me convient parfaitement.',
          elapsedSeconds: 50,
          profile: mockProfile,
          turnsHistory: [],
          juryPersonality: 'BIENVEILLANT',
        }),
      });

      const res = await turnRoute(req);
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.turnType).toBe('FOLLOWUP');
      expect(data.question).toContain('C\'est un bon début');
    });
  });
});
