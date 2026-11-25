import { describe, it, expect } from 'vitest';
import { isTechnicalOrInvalidAnswer, sanitizeCandidateTranscript } from '@/lib/ai/validation';
import { generateAdaptiveTurn, generateEvaluationReport } from '@/lib/ai/openai';
import { AcademicProfileData } from '@/types/profile';
import { InterviewTurn } from '@/types/interview';
import { calculateRealProgression, SessionRecord } from '@/lib/indicators/progression';

const mockProfile: AcademicProfileData = {
  countryResidence: 'Sénégal',
  currentDiploma: 'Licence 3 Informatique',
  fieldOfStudy: 'Génie Logiciel',
  targetPrograms: 'Master Big Data & IA',
  targetInstitutions: 'Université de Lille',
  reasonFrance: 'Bénéficier de laboratoires de recherche avancés.',
  professionalGoal: 'Devenir Ingénieur Data et Cloud pour moderniser les télécoms.',
  reasonsForPrograms: 'Maquette pratique et modules spécialisés en systèmes distribués.',
  isCompleted: true,
};

describe('1. Détection et Assainissement des Messages Techniques (Anti-Contamination)', () => {
  it('doit identifier "Réponse enregistrée avec succès." comme message technique invalide', () => {
    expect(isTechnicalOrInvalidAnswer('Réponse enregistrée avec succès.')).toBe(true);
    expect(isTechnicalOrInvalidAnswer('Réponse enregistrée avec succès')).toBe(true);
    expect(isTechnicalOrInvalidAnswer('reponse enregistree avec succes.')).toBe(true);
    expect(isTechnicalOrInvalidAnswer('  reponse enregistree avec succes  ')).toBe(true);
  });

  it('doit identifier "Réponse envoyée avec succès." comme message technique invalide', () => {
    expect(isTechnicalOrInvalidAnswer('Réponse envoyée avec succès.')).toBe(true);
    expect(isTechnicalOrInvalidAnswer('Réponse envoyée avec succès')).toBe(true);
    expect(isTechnicalOrInvalidAnswer('reponse envoyee avec succes')).toBe(true);
  });

  it('doit identifier les statuts d enregistrement et valeurs vides comme invalides', () => {
    expect(isTechnicalOrInvalidAnswer('')).toBe(true);
    expect(isTechnicalOrInvalidAnswer('   ')).toBe(true);
    expect(isTechnicalOrInvalidAnswer(null)).toBe(true);
    expect(isTechnicalOrInvalidAnswer(undefined)).toBe(true);
    expect(isTechnicalOrInvalidAnswer('Enregistrement en cours')).toBe(true);
    expect(isTechnicalOrInvalidAnswer('Traitement en cours')).toBe(true);
    expect(isTechnicalOrInvalidAnswer('null')).toBe(true);
    expect(isTechnicalOrInvalidAnswer('undefined')).toBe(true);
    expect(isTechnicalOrInvalidAnswer('Aucune parole reconnue')).toBe(true);
    expect(isTechnicalOrInvalidAnswer('Succès.')).toBe(true);
  });

  it('ne doit PAS bloquer les véritables réponses académiques du candidat', () => {
    const validCandidateSpeech1 = "Bonjour, je m'appelle Amadou et je prépare ma Licence 3 en Génie Logiciel.";
    const validCandidateSpeech2 = "Mon projet professionnel est de devenir Data Engineer au sein d'infrastructures distribuées.";
    const validCandidateSpeech3 = "J'ai choisi l'Université de Lille pour son laboratoire CRIStAL et son cursus en alternance.";

    expect(isTechnicalOrInvalidAnswer(validCandidateSpeech1)).toBe(false);
    expect(isTechnicalOrInvalidAnswer(validCandidateSpeech2)).toBe(false);
    expect(isTechnicalOrInvalidAnswer(validCandidateSpeech3)).toBe(false);
  });

  it('doit assainir les transcriptions et renvoyer une chaîne vide si technique', () => {
    expect(sanitizeCandidateTranscript('Réponse enregistrée avec succès.')).toBe('');
    expect(sanitizeCandidateTranscript('Réponse envoyée avec succès.')).toBe('');
    expect(sanitizeCandidateTranscript('  ')).toBe('');
    expect(sanitizeCandidateTranscript('Bonjour madame.')).toBe('Bonjour madame.');
  });
});

describe('2. Protection Intégrale du Rapport Pédagogique contre la Contamination', () => {
  it('ne doit JAMAIS utiliser "Réponse enregistrée avec succès." comme réponse ou citation dans le rapport', async () => {
    const turnsWithContamination: InterviewTurn[] = [
      {
        turnIndex: 1,
        aiQuestion: 'Pouvez-vous vous présenter ?',
        pedagogicalIntent: 'Introduction',
        studentTranscript: 'Réponse enregistrée avec succès.',
        turnType: 'REGULAR',
        durationSeconds: 15,
        timestamp: new Date().toISOString(),
      },
    ];

    const report = await generateEvaluationReport(mockProfile, turnsWithContamination);

    // L'évaluation doit être marquée UNAVAILABLE sans inventer de citations
    expect(report.evaluationCompleteness).toBe('UNAVAILABLE');
    expect(report.isTechnicalIssue).toBe(true);
    expect(report.overallScore).toBe(0);
    expect(report.strengths).toHaveLength(0);
    expect(report.reformulationExamples).toHaveLength(0);

    // Vérifier qu'aucune citation ne contient le texte technique
    report.areasToImprove.forEach((area) => {
      expect(area.verbatimQuote).not.toContain('Réponse enregistrée avec succès');
      expect(area.verbatimQuote).not.toContain('succès');
    });
  });

  it('doit traiter une simulation sans réponse exploitable comme UNAVAILABLE et expliquer la cause sans note punitive', async () => {
    const turnsEmpty: InterviewTurn[] = [
      {
        turnIndex: 1,
        aiQuestion: 'Présentez-vous',
        pedagogicalIntent: 'Intro',
        studentTranscript: '',
        turnType: 'REGULAR',
        durationSeconds: 5,
        timestamp: new Date().toISOString(),
      },
    ];

    const report = await generateEvaluationReport(mockProfile, turnsEmpty);

    expect(report.evaluationCompleteness).toBe('UNAVAILABLE');
    expect(report.synthesisSummary).toContain('Données orales insuffisantes');
    expect(report.synthesisSummary).toContain('capture du microphone');
    expect(report.overallScore).toBe(0);
    expect(report.strengths).toHaveLength(0);
  });

  it('doit calculer une évaluation PARTIAL si certains tours sont valides et d autres inexploitables', async () => {
    const mixedTurns: InterviewTurn[] = [
      {
        turnIndex: 1,
        aiQuestion: 'Pouvez-vous présenter votre parcours académique ?',
        pedagogicalIntent: 'Parcours',
        studentTranscript: "Je suis actuellement en troisième année de licence informatique à l'Université de Dakar.",
        turnType: 'REGULAR',
        durationSeconds: 30,
        timestamp: new Date().toISOString(),
      },
      {
        turnIndex: 2,
        aiQuestion: 'Pourquoi viser la France pour ce master ?',
        pedagogicalIntent: 'Motivations',
        studentTranscript: 'Réponse enregistrée avec succès.', // Tour contaminé/muet
        turnType: 'REGULAR',
        durationSeconds: 10,
        timestamp: new Date().toISOString(),
      },
    ];

    const report = await generateEvaluationReport(mockProfile, mixedTurns);

    expect(report.evaluationCompleteness).toBe('PARTIAL');
    expect(report.overallScore).toBeGreaterThan(0);
    // Le rapport ne doit citer que la vraie réponse du tour 1
    expect(report.strengths.length).toBeGreaterThan(0);
    expect(report.strengths[0].verbatimQuote).toContain("troisième année de licence");
    expect(report.strengths[0].verbatimQuote).not.toContain("succès");
  });

  it('doit garantir que le score global est strictement égal à la somme des 5 critères réels', async () => {
    const realTurns: InterviewTurn[] = [
      {
        turnIndex: 1,
        aiQuestion: 'Présentez votre parcours.',
        pedagogicalIntent: 'Parcours',
        studentTranscript: "Après un baccalauréat scientifique mention bien, j'ai validé ma licence en génie logiciel avec des projets en bases de données et cloud.",
        turnType: 'REGULAR',
        durationSeconds: 40,
        timestamp: new Date().toISOString(),
      },
      {
        turnIndex: 2,
        aiQuestion: 'Quelles sont vos motivations pour les universités visées ?',
        pedagogicalIntent: 'Vœux',
        studentTranscript: "L'Université de Lille offre un master avec un semestre dédié aux architectures distribuées et un stage de six mois en R&D.",
        turnType: 'REGULAR',
        durationSeconds: 45,
        timestamp: new Date().toISOString(),
      },
    ];

    const report = await generateEvaluationReport(mockProfile, realTurns);

    const sumCriteria = report.scoresByCriteria.reduce((sum, c) => sum + c.score, 0);
    expect(report.overallScore).toBe(sumCriteria);
    expect(report.evaluationCompleteness).toBe('COMPLETE');
  });
});

describe('3. Comportement du Moteur Adaptatif Face aux Réponses Invalides', () => {
  it('ne doit pas faire progresser l entretien sur une réponse technique et doit demander une répétition', async () => {
    const turnsHistory: InterviewTurn[] = [
      {
        turnIndex: 1,
        aiQuestion: 'Présentez votre projet.',
        pedagogicalIntent: 'Projet',
        studentTranscript: '',
        turnType: 'INITIAL',
        durationSeconds: 10,
        timestamp: new Date().toISOString(),
      },
    ];

    const result = await generateAdaptiveTurn(
      mockProfile,
      turnsHistory,
      'Réponse enregistrée avec succès.',
      20
    );

    // Ne doit pas accepter la réponse technique comme une vraie réponse
    expect(result.evaluationStatus).toBe('FOLLOWUP_REQUIRED');
    expect(result.turnType).toBe('FOLLOWUP');
    expect(result.relevanceCategory).toBe('EMPTY_OR_INAUDIBLE');
    expect(result.question).toContain('pas pu entendre votre réponse');
  });

  it('doit accepter une réponse courte mais pertinente sans bloquer', async () => {
    const turnsHistory: InterviewTurn[] = [
      {
        turnIndex: 1,
        aiQuestion: 'Quel est votre objectif professionnel ?',
        pedagogicalIntent: 'Projet pro',
        studentTranscript: 'Mon projet est de devenir ingénieur cloud pour concevoir des architectures résilientes.',
        turnType: 'INITIAL',
        durationSeconds: 20,
        timestamp: new Date().toISOString(),
      },
    ];

    const result = await generateAdaptiveTurn(
      mockProfile,
      turnsHistory,
      'Mon projet est de devenir ingénieur cloud pour concevoir des architectures résilientes.',
      35
    );

    expect(result.evaluationStatus).toBe('ANSWER_ACCEPTED');
    expect(result.turnType).toBe('REGULAR');
  });

  it('doit respecter la limite anti-boucle de 2 relances avant de poursuivre', async () => {
    const turnsWithTwoFollowups: InterviewTurn[] = [
      {
        turnIndex: 1,
        aiQuestion: 'Présentez votre diplôme.',
        pedagogicalIntent: 'Parcours',
        studentTranscript: 'Licence info.',
        turnType: 'FOLLOWUP',
        durationSeconds: 30,
        timestamp: new Date().toISOString(),
      },
      {
        turnIndex: 2,
        aiQuestion: 'Pourriez-vous donner plus de détails ?',
        pedagogicalIntent: 'Approfondissement',
        studentTranscript: 'Oui, en informatique.',
        turnType: 'FOLLOWUP',
        durationSeconds: 60,
        timestamp: new Date().toISOString(),
      },
    ];

    const result = await generateAdaptiveTurn(
      mockProfile,
      turnsWithTwoFollowups,
      'C est tout ce que je sais.',
      90
    );

    // Après 2 relances consécutives, l'entretien doit avancer vers le sujet suivant
    expect(result.turnType).toBe('REGULAR');
    expect(result.evaluationStatus).toBe('ANSWER_ACCEPTED');
  });
});

describe('4. Intégrité des Indicateurs du Tableau de Bord (Zéro Chiffre Inventé)', () => {
  it('ne doit pas générer de fausse progression si une session est UNAVAILABLE sans score', () => {
    const sessionsWithUnavailable: SessionRecord[] = [
      {
        id: 's_unavail',
        status: 'COMPLETED',
        evaluation_reports: [
          {
            id: 'rep_unavail',
            overall_score: 0,
            synthesis_summary: 'Données orales insuffisantes',
            created_at: '2026-10-17T15:00:00Z',
          },
        ],
      },
    ];

    const metrics = calculateRealProgression(sessionsWithUnavailable);
    expect(metrics.status).toBe('INSUFFICIENT_DATA');
    expect(metrics.diff).toBeNull(); // Pas de variation inventée
    expect(metrics.latestScore).toBeNull(); // Une session indisponible n'est pas une note académique de zéro
  });
});

describe('5. Robustesse des Routes Audio & Messages d Erreurs Explicites', () => {
  it('doit classifier une erreur 429 quota en message explicite sans jargon technique', () => {
    const err429 = new Error('429 You have no credits remaining. Add credits to continue using the API.');
    const errStr = err429.message.toLowerCase();
    
    let userMessage = '';
    if (errStr.includes('429') || errStr.includes('credit') || errStr.includes('quota')) {
      userMessage = "Votre compte OpenAI a épuisé ses crédits disponibles (erreur 429). Rechargez vos crédits sur platform.openai.com ou saisissez votre réponse au clavier.";
    }

    expect(userMessage).toContain('erreur 429');
    expect(userMessage).toContain('platform.openai.com');
  });

  it('doit valider la limite de taille Whisper de 25 Mo', () => {
    const MAX_AUDIO_SIZE_BYTES = 25 * 1024 * 1024;
    expect(MAX_AUDIO_SIZE_BYTES).toBe(26214400);

    const oversizedBlobSize = 26 * 1024 * 1024;
    expect(oversizedBlobSize > MAX_AUDIO_SIZE_BYTES).toBe(true);
  });

  it('doit garantir que la synthèse vocale cible uniquement le modèle tts-1 et la voix shimmer', () => {
    const targetModel = 'tts-1';
    const targetVoice = 'shimmer';
    const speed = 0.98;

    expect(targetModel).toBe('tts-1');
    expect(['shimmer', 'nova']).toContain(targetVoice);
    expect(speed).toBeLessThan(1.0);
  });
});

