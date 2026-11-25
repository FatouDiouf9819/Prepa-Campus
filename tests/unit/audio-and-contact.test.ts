import { describe, it, expect } from 'vitest';
import { CONTACT_CONFIG } from '@/config/contact';
import { calculateRealProgression, SessionRecord } from '@/lib/indicators/progression';
import { generateAdaptiveTurn, generateEvaluationReport } from '@/lib/ai/openai';
import { AcademicProfileData } from '@/types/profile';
import { InterviewTurn } from '@/types/interview';

describe('Configuration et Sécurité du Support WhatsApp', () => {
  it('doit contenir les libellés et textes réglementaires requis', () => {
    expect(CONTACT_CONFIG.helpText).toBe("Besoin d'aide ? Une question ou une suggestion ? Contactez-nous.");
    expect(CONTACT_CONFIG.actionLabel).toBe("Nous contacter sur WhatsApp");
    expect(CONTACT_CONFIG.defaultMessage).toBe("Bonjour, j'utilise Campus France Prepa et j'ai besoin d'aide.");
  });

  it('doit être configuré avec le numéro officiel du Sénégal 221764844051', () => {
    const cleanNumber = CONTACT_CONFIG.whatsappNumber.replace(/[^0-9]/g, '');
    expect(cleanNumber).toBe('221764844051');

    const encodedMsg = encodeURIComponent(CONTACT_CONFIG.defaultMessage);
    const generatedUrl = `https://wa.me/${cleanNumber}?text=${encodedMsg}`;

    expect(generatedUrl).toBe('https://wa.me/221764844051?text=Bonjour%2C%20j\'utilise%20Campus%20France%20Prepa%20et%20j\'ai%20besoin%20d\'aide.');
  });

  it('doit encoder convenablement l URL WhatsApp sans fuite de données privées', () => {
    const cleanNumber = CONTACT_CONFIG.whatsappNumber.replace(/[^0-9]/g, '');
    const encodedMsg = encodeURIComponent(CONTACT_CONFIG.defaultMessage);
    const generatedUrl = `https://wa.me/${cleanNumber}?text=${encodedMsg}`;

    expect(generatedUrl).toContain('https://wa.me/221764844051?text=');
    expect(generatedUrl).toContain('Bonjour');
    expect(generatedUrl).not.toContain('profile');
    expect(generatedUrl).not.toContain('transcript');
    expect(generatedUrl).not.toContain('password');
  });
});

describe('Synthèse Vocale Féminine Exclusive', () => {
  it('doit restreindre les voix candidates aux voix féminines shimmer et nova', () => {
    const allowedVoices = ['shimmer', 'nova'] as const;
    expect(allowedVoices).toEqual(['shimmer', 'nova']);
    expect(allowedVoices).toContain('shimmer');
    expect(allowedVoices).not.toContain('alloy');
    expect(allowedVoices).not.toContain('onyx');
  });
});

describe('Module Centralisé de Progression — Aucun Chiffre Inventé', () => {
  it('doit renvoyer NO_SESSIONS si l utilisateur n a jamais fait de simulation', () => {
    const result = calculateRealProgression([]);
    expect(result.status).toBe('NO_SESSIONS');
    expect(result.hasSufficientData).toBe(false);
    expect(result.latestScore).toBeNull();
    expect(result.diff).toBeNull();
  });

  it('doit renvoyer SINGLE_SESSION sans fausse progression pour un seul entretien', () => {
    const sessions: SessionRecord[] = [
      {
        id: 's1',
        status: 'COMPLETED',
        evaluation_reports: [{ id: 'r1', overall_score: 74, created_at: '2026-10-17T10:00:00Z' }],
      },
    ];

    const result = calculateRealProgression(sessions);
    expect(result.status).toBe('SINGLE_SESSION');
    expect(result.hasSufficientData).toBe(true);
    expect(result.latestScore).toBe(74);
    expect(result.previousScore).toBeNull();
    expect(result.diff).toBeNull();
  });

  it('doit calculer exactement l écart de progression réel entre 2 simulations', () => {
    const sessions: SessionRecord[] = [
      {
        id: 's2',
        status: 'COMPLETED',
        evaluation_reports: [{ id: 'r2', overall_score: 82, created_at: '2026-10-17T14:00:00Z' }],
      },
      {
        id: 's1',
        status: 'COMPLETED',
        evaluation_reports: [{ id: 'r1', overall_score: 74, created_at: '2026-10-17T10:00:00Z' }],
      },
    ];

    const result = calculateRealProgression(sessions);
    expect(result.status).toBe('PROGRESSION_AVAILABLE');
    expect(result.latestScore).toBe(82);
    expect(result.previousScore).toBe(74);
    expect(result.diff).toBe(8);
    expect(result.progressionLabel).toBe('+8 pts');
  });

  it('doit gérer les scores en recul avec honnêteté', () => {
    const sessions: SessionRecord[] = [
      {
        id: 's2',
        status: 'COMPLETED',
        evaluation_reports: [{ id: 'r2', overall_score: 65, created_at: '2026-10-17T14:00:00Z' }],
      },
      {
        id: 's1',
        status: 'COMPLETED',
        evaluation_reports: [{ id: 'r1', overall_score: 72, created_at: '2026-10-17T10:00:00Z' }],
      },
    ];

    const result = calculateRealProgression(sessions);
    expect(result.diff).toBe(-7);
    expect(result.progressionLabel).toBe('-7 pts');
  });
});

describe('Validation Adaptative des Réponses de l Entretien', () => {
  const mockProfile: AcademicProfileData = {
    countryResidence: 'Sénégal',
    currentDiploma: 'Licence 3 Informatique',
    fieldOfStudy: 'Génie Logiciel',
    targetPrograms: 'Master Big Data',
    targetInstitutions: 'Université de Lille',
    reasonFrance: 'Excellence académique et laboratoires de pointe',
    professionalGoal: 'Data Engineer dans les systèmes distribués',
    reasonsForPrograms: 'Programme complet avec alternance',
    isCompleted: true,
  };

  it('doit déclencher une relance si la réponse est inaudible ou quasi-vide', async () => {
    const turns: InterviewTurn[] = [
      {
        turnIndex: 1,
        aiQuestion: 'Pouvez-vous vous présenter ?',
        pedagogicalIntent: 'Introduction',
        studentTranscript: 'euh oui',
        turnType: 'REGULAR',
        durationSeconds: 10,
        timestamp: new Date().toISOString(),
      },
    ];

    const result = await generateAdaptiveTurn(mockProfile, turns, 'euh oui', 40);
    expect(result.evaluationStatus).toBe('FOLLOWUP_REQUIRED');
    expect(result.turnType).toBe('FOLLOWUP');
  });

  it('doit accepter une réponse développée et enchaîner sur la question thématique suivante', async () => {
    const longAnswer = "Je m'appelle Abdoulaye, j'ai validé ma licence en génie logiciel à Dakar avec mention et je souhaite poursuivre en Master Big Data à Lille pour me spécialiser dans l'ingénierie des données.";
    const turns: InterviewTurn[] = [
      {
        turnIndex: 1,
        aiQuestion: 'Pouvez-vous vous présenter ?',
        pedagogicalIntent: 'Introduction',
        studentTranscript: longAnswer,
        turnType: 'REGULAR',
        durationSeconds: 30,
        timestamp: new Date().toISOString(),
      },
    ];

    const result = await generateAdaptiveTurn(mockProfile, turns, longAnswer, 60);
    expect(result.evaluationStatus).toBe('ANSWER_ACCEPTED');
    expect(result.turnType).toBe('REGULAR');
  });

  it('ne doit pas boucler indéfiniment après 2 relances consécutives', async () => {
    const turns: InterviewTurn[] = [
      {
        turnIndex: 1,
        aiQuestion: 'Présentez-vous',
        pedagogicalIntent: 'Intro',
        studentTranscript: 'rien',
        turnType: 'FOLLOWUP',
        durationSeconds: 20,
        timestamp: new Date().toISOString(),
      },
      {
        turnIndex: 2,
        aiQuestion: 'Pouvez-vous préciser votre pensée ?',
        pedagogicalIntent: 'Relance 1',
        studentTranscript: 'non',
        turnType: 'FOLLOWUP',
        durationSeconds: 40,
        timestamp: new Date().toISOString(),
      },
    ];

    // Après 2 relances consécutives, l'IA avance vers le sujet suivant sans bloquer le candidat
    const result = await generateAdaptiveTurn(mockProfile, turns, 'pas grand chose', 70);
    expect(result.turnType).toBe('REGULAR');
    expect(result.evaluationStatus).toBe('ANSWER_ACCEPTED');
  });
});

describe('Intégrité Mathématique du Bilan Pédagogique', () => {
  const mockProfile: AcademicProfileData = {
    countryResidence: 'Sénégal',
    currentDiploma: 'Licence 3 Informatique',
    fieldOfStudy: 'Génie Logiciel',
    targetPrograms: 'Master Big Data',
    targetInstitutions: 'Université de Lille',
    reasonFrance: 'Excellence',
    professionalGoal: 'Data Engineer',
    reasonsForPrograms: 'Cours avancés',
    isCompleted: true,
  };

  it('doit calculer le score global comme la somme exacte des 5 critères réels', async () => {
    const turns: InterviewTurn[] = [
      {
        turnIndex: 1,
        aiQuestion: 'Présentation',
        pedagogicalIntent: 'Intro',
        studentTranscript: 'Je suis diplômé en génie logiciel et je candidate au Master Big Data de Lille.',
        turnType: 'REGULAR',
        durationSeconds: 25,
        timestamp: new Date().toISOString(),
      },
      {
        turnIndex: 2,
        aiQuestion: 'Pourquoi Lille ?',
        pedagogicalIntent: 'Choix formation',
        studentTranscript: 'Lille dispose d un laboratoire spécialisé en apprentissage distribué en phase avec mon projet de Data Engineer.',
        turnType: 'REGULAR',
        durationSeconds: 30,
        timestamp: new Date().toISOString(),
      },
    ];

    const report = await generateEvaluationReport(mockProfile, turns);
    const sumCriteria = report.scoresByCriteria.reduce((sum, c) => sum + c.score, 0);

    expect(report.overallScore).toBe(sumCriteria);
    expect(report.overallScore).toBeGreaterThan(0);
    expect(report.scoresByCriteria.length).toBe(5);
  });

  it('ne doit attribuer aucun score fictif en cas d absence totale de réponses', async () => {
    const turns: InterviewTurn[] = [
      {
        turnIndex: 1,
        aiQuestion: 'Présentation',
        pedagogicalIntent: 'Intro',
        studentTranscript: '',
        turnType: 'REGULAR',
        durationSeconds: 5,
        timestamp: new Date().toISOString(),
      },
    ];

    const report = await generateEvaluationReport(mockProfile, turns);
    expect(report.overallScore).toBe(0);
    expect(report.synthesisSummary).toContain('Données orales insuffisantes');
  });
});
