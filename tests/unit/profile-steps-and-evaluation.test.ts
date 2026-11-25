import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

// Mock de createServerSupabaseClient
vi.mock('@/lib/supabase/server', () => ({
  createServerSupabaseClient: vi.fn(),
}));

// Mock de openai
vi.mock('@/lib/ai/openai', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/ai/openai')>();
  return {
    ...actual,
    getOpenAIClient: vi.fn(),
  };
});

import { createServerSupabaseClient } from '@/lib/supabase/server';
import { getOpenAIClient, generateEvaluationReport } from '@/lib/ai/openai';
import { GET as getProfileRoute, POST as postProfileRoute } from '@/app/api/profile/route';
import { AcademicProfileData } from '@/types/profile';
import { InterviewTurn } from '@/types/interview';

describe('Audit et Finalisation des 4 Étapes du Profil et de l\'Évaluation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Isolation et Authentification Supabase (/api/profile)', () => {
    it('doit renvoyer HTTP 401 sur GET /api/profile si utilisateur non authentifié', async () => {
      (createServerSupabaseClient as any).mockResolvedValue({
        auth: {
          getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: new Error('Non connecté') }),
        },
      });

      const res = await getProfileRoute();
      expect(res.status).toBe(401);
      const json = await res.json();
      expect(json.error).toMatch(/Non authentifié/i);
    });

    it('doit renvoyer HTTP 401 sur POST /api/profile si utilisateur non authentifié', async () => {
      (createServerSupabaseClient as any).mockResolvedValue({
        auth: {
          getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: new Error('Non connecté') }),
        },
      });

      const req = new NextRequest('http://localhost:3000/api/profile', {
        method: 'POST',
        body: JSON.stringify({
          currentDiploma: 'Licence 3',
          fieldOfStudy: 'Informatique',
        }),
      });

      const res = await postProfileRoute(req);
      expect(res.status).toBe(401);
      const json = await res.json();
      expect(json.error).toMatch(/Non authentifié/i);
    });

    it('doit normaliser fidèlement les colonnes snake_case de Supabase en camelCase pour les 4 étapes', async () => {
      const mockDbRow = {
        id: 'prof-uuid-123',
        user_id: 'user-abc-456',
        country_residence: 'Sénégal',
        current_diploma: 'Licence 3 Informatique',
        field_of_study: 'Génie Logiciel',
        current_institution: 'Université Cheikh Anta Diop',
        target_programs: 'Master 1 MIAGE',
        target_institutions: 'Université Paris-Saclay',
        reasons_for_programs: 'Programme orienté ingénierie logicielle et gestion de projets.',
        reason_france: 'Excellence académique et insertion professionnelle internationale.',
        professional_goal: 'Devenir Lead Développeur Full-Stack et Chef de Projet SI.',
        strong_skills: 'TypeScript, Python, Docker',
        weaknesses_to_work: 'Synthétiser les réponses lors des relances serrées.',
        is_completed: true,
        created_at: '2026-01-01T10:00:00Z',
        updated_at: '2026-01-01T12:00:00Z',
      };

      (createServerSupabaseClient as any).mockResolvedValue({
        auth: {
          getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'user-abc-456' } }, error: null }),
        },
        from: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          abortSignal: vi.fn().mockReturnThis(),
          maybeSingle: vi.fn().mockResolvedValue({ data: mockDbRow, error: null }),
        }),
      });

      const res = await getProfileRoute();
      expect(res.status).toBe(200);
      const json = await res.json();

      expect(json.profile).toBeDefined();
      expect(json.profile.countryResidence).toBe('Sénégal');
      expect(json.profile.currentDiploma).toBe('Licence 3 Informatique');
      expect(json.profile.fieldOfStudy).toBe('Génie Logiciel');
      expect(json.profile.targetPrograms).toBe('Master 1 MIAGE');
      expect(json.profile.targetInstitutions).toBe('Université Paris-Saclay');
      expect(json.profile.reasonsForPrograms).toBe('Programme orienté ingénierie logicielle et gestion de projets.');
      expect(json.profile.reasonFrance).toBe('Excellence académique et insertion professionnelle internationale.');
      expect(json.profile.professionalGoal).toBe('Devenir Lead Développeur Full-Stack et Chef de Projet SI.');
      expect(json.profile.weaknessesToWork).toBe('Synthétiser les réponses lors des relances serrées.');
      expect(json.profile.isCompleted).toBe(true);
    });

    it('doit refuser la validation finale si les étapes obligatoires sont incomplètes', async () => {
      (createServerSupabaseClient as any).mockResolvedValue({
        auth: {
          getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'user-123' } }, error: null }),
        },
      });

      // Profil incomplet soumis avec isCompleted = true (ex: Étape 2 et 3 manquantes)
      const invalidFinalData = {
        countryResidence: 'Sénégal',
        currentDiploma: 'Licence 3 Informatique',
        fieldOfStudy: 'Génie Logiciel',
        targetPrograms: '', // Manquant
        targetInstitutions: '', // Manquant
        reasonsForPrograms: '', // Manquant
        isCompleted: true,
      };

      const req = new NextRequest('http://localhost:3000/api/profile', {
        method: 'POST',
        body: JSON.stringify(invalidFinalData),
      });

      const res = await postProfileRoute(req);
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.error).toMatch(/non conformes/i);
    });

    it('doit accepter la sauvegarde progressive d un brouillon incomplet (isCompleted = false)', async () => {
      const mockSavedRow = {
        id: 'draft-id',
        user_id: 'user-draft-1',
        country_residence: 'Sénégal',
        current_diploma: 'Licence 2 en cours',
        field_of_study: 'Mathématiques',
        target_programs: '',
        target_institutions: '',
        reason_france: '',
        professional_goal: '',
        is_completed: false,
      };

      (createServerSupabaseClient as any).mockResolvedValue({
        auth: {
          getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'user-draft-1' } }, error: null }),
        },
        from: vi.fn().mockReturnValue({
          upsert: vi.fn().mockReturnThis(),
          select: vi.fn().mockReturnThis(),
          abortSignal: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({ data: mockSavedRow, error: null }),
        }),
      });

      const draftPayload = {
        countryResidence: 'Sénégal',
        currentDiploma: 'Licence 2 en cours',
        fieldOfStudy: 'Mathématiques',
        isCompleted: false,
      };

      const req = new NextRequest('http://localhost:3000/api/profile', {
        method: 'POST',
        body: JSON.stringify(draftPayload),
      });

      const res = await postProfileRoute(req);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.message).toMatch(/Brouillon sauvegardé/i);
    });
  });

  describe('Évaluation Pédagogique et Déterminisme des Scores', () => {
    const fullProfile: AcademicProfileData = {
      countryResidence: 'Sénégal',
      currentDiploma: 'Licence 3 Informatique',
      fieldOfStudy: 'Génie Logiciel',
      currentInstitution: 'UCAD Dakar',
      targetPrograms: 'Master Informatique Big Data',
      targetInstitutions: 'Université de Lille',
      reasonsForPrograms: 'Programme de référence pour les systèmes distribués avec alternance.',
      reasonFrance: 'Recherche de laboratoires réputés et d un environnement international.',
      professionalGoal: 'Devenir Data Architect pour concevoir des plateformes cloud sécurisées.',
      strongSkills: 'Java, Python, SQL',
      weaknessesToWork: 'Aller plus vite à l essentiel.',
      isCompleted: true,
    };

    it('doit déclarer un état UNAVAILABLE sans note fictive si aucune réponse exploitable n est enregistrée', async () => {
      (getOpenAIClient as any).mockReturnValue(null);

      const emptyTurns: InterviewTurn[] = [
        {
          turnIndex: 1,
          aiQuestion: 'Présentez-vous',
          pedagogicalIntent: 'Intro',
          studentTranscript: '', // silence
          turnType: 'INITIAL',
          durationSeconds: 10,
          timestamp: new Date().toISOString(),
        },
        {
          turnIndex: 2,
          aiQuestion: 'Je n ai pas pu entendre votre réponse',
          pedagogicalIntent: 'Relance',
          studentTranscript: 'Réponse enregistrée avec succès.', // Message technique à rejeter
          turnType: 'FOLLOWUP',
          durationSeconds: 15,
          timestamp: new Date().toISOString(),
        },
      ];

      const report = await generateEvaluationReport(fullProfile, emptyTurns);

      expect(report.evaluationCompleteness).toBe('UNAVAILABLE');
      expect(report.overallScore).toBe(0);
      expect(report.isTechnicalIssue).toBe(true);
      expect(report.synthesisSummary).toMatch(/Données orales insuffisantes/i);
      
      // Tous les critères doivent être à 0, sans fausse réussite
      for (const criteria of report.scoresByCriteria) {
        expect(criteria.score).toBe(0);
      }
    });

    it('doit calculer un score déterministe rigoureux fondé sur les critères explicites (somme exacte = 100 max)', async () => {
      (getOpenAIClient as any).mockReturnValue(null);

      const realTurns: InterviewTurn[] = [
        {
          turnIndex: 1,
          aiQuestion: 'Pouvez-vous présenter votre parcours académique ?',
          pedagogicalIntent: 'Parcours',
          studentTranscript: 'Je suis diplômé d une licence 3 en informatique à l université UCAD avec mention bien.',
          turnType: 'INITIAL',
          durationSeconds: 40,
          timestamp: new Date().toISOString(),
        },
        {
          turnIndex: 2,
          aiQuestion: 'Pourquoi viser le Master Big Data à Lille ?',
          pedagogicalIntent: 'Justification formations',
          studentTranscript: 'Ce master dispose d un partenariat fort avec l Inria et me prépare au métier de Data Architect.',
          turnType: 'REGULAR',
          durationSeconds: 50,
          timestamp: new Date().toISOString(),
        },
      ];

      const report = await generateEvaluationReport(fullProfile, realTurns);

      expect(report.evaluationCompleteness).toBe('COMPLETE');
      expect(report.overallScore).toBeGreaterThan(0);
      expect(report.overallScore).toBeLessThanOrEqual(100);

      // Le score global doit être STRICTEMENT égal à la somme des 5 critères
      const sumCriteria = report.scoresByCriteria.reduce((sum, c) => sum + c.score, 0);
      expect(report.overallScore).toBe(sumCriteria);

      // Les maxScores doivent totaliser exactement 100 points
      const maxScoresSum = report.scoresByCriteria.reduce((sum, c) => sum + c.maxScore, 0);
      expect(maxScoresSum).toBe(100);

      // Les citations doivent être issues des transcriptions réelles de l'étudiant
      expect(report.strengths.length).toBeGreaterThan(0);
      expect(report.strengths[0].verbatimQuote).toMatch(/licence 3 en informatique|UCAD/i);
    });

    it('doit basculer avec résilience sur le calcul déterministe si OpenAI renvoie 429 (crédits épuisés)', async () => {
      // Simuler l'épuisement des crédits OpenAI (429 credit_balance_exhausted)
      const quotaExhaustedError = new Error('You exceeded your current quota, please check your plan and billing details.');
      (quotaExhaustedError as any).status = 429;
      (quotaExhaustedError as any).code = 'insufficient_quota';

      (getOpenAIClient as any).mockReturnValue({
        chat: {
          completions: {
            create: vi.fn().mockRejectedValue(quotaExhaustedError),
          },
        },
      });

      const realTurns: InterviewTurn[] = [
        {
          turnIndex: 1,
          aiQuestion: 'Parlez-moi de votre projet.',
          pedagogicalIntent: 'Projet',
          studentTranscript: 'Mon projet est de créer des infrastructures d analyse de données fiables pour le secteur financier.',
          turnType: 'REGULAR',
          durationSeconds: 45,
          timestamp: new Date().toISOString(),
        },
      ];

      // La fonction ne doit PAS crasher ni propager d exception 429 non gérée
      const report = await generateEvaluationReport(fullProfile, realTurns);

      expect(report).toBeDefined();
      expect(report.overallScore).toBeGreaterThan(0);
      expect(report.overallScore).toBeLessThanOrEqual(100);
      expect(report.scoresByCriteria).toHaveLength(5);
      expect(report.synthesisSummary).toBeDefined();
    });
  });
});
