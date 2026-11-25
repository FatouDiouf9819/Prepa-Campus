import { describe, it, expect } from 'vitest';
import { 
  generateFirstQuestion, 
  generateAdaptiveTurn, 
  generateEvaluationReport 
} from '@/lib/ai/openai';
import { AcademicProfileData } from '@/types/profile';
import { InterviewTurn } from '@/types/interview';

describe('Moteur d\'Entretien Vocal et Évaluation Pédagogique', () => {
  const mockProfile: AcademicProfileData = {
    countryResidence: 'Sénégal',
    currentDiploma: 'Licence 3 Informatique',
    fieldOfStudy: 'Génie Logiciel',
    currentInstitution: 'UCAD Dakar',
    targetPrograms: 'Master 1 Informatique Big Data',
    targetInstitutions: 'Université de Lille',
    reasonFrance: 'Accéder à des laboratoires de recherche de premier plan.',
    professionalGoal: 'Data Engineer dans les systèmes distribués.',
    reasonsForPrograms: 'Programme complet avec alternance en entreprise.',
    isCompleted: true,
  };

  it('doit générer une première question personnalisée basée sur la filière', async () => {
    const firstQ = await generateFirstQuestion(mockProfile);

    expect(firstQ.question).toBeDefined();
    expect(firstQ.question.length).toBeGreaterThan(15);
    expect(firstQ.pedagogicalIntent).toBeDefined();
    // Doit mentionner le parcours ou la filière
    expect(firstQ.question.toLowerCase()).toMatch(/parcours|génie logiciel|études/i);
  });

  it('doit déclencher une relance si la réponse est très courte (< 15 mots)', async () => {
    const history: InterviewTurn[] = [];
    const shortAnswer = 'Oui tout à fait.';

    const turn = await generateAdaptiveTurn(mockProfile, history, shortAnswer, 60);

    expect(turn.turnType).toBe('FOLLOWUP');
    expect(turn.isConcluding).toBe(false);
    expect(turn.question.toLowerCase()).toMatch(/préciser|arguments|bref|exemple/i);
  });

  it('doit forcer la conclusion si le temps écoulé atteint 300 secondes (5 minutes)', async () => {
    const history: InterviewTurn[] = [
      {
        turnIndex: 1,
        aiQuestion: 'Présentez-vous',
        pedagogicalIntent: 'Intro',
        studentTranscript: 'Je m appelle Amadou et j ai validé ma licence.',
        turnType: 'REGULAR',
        durationSeconds: 60,
        timestamp: new Date().toISOString(),
      },
    ];

    const turn = await generateAdaptiveTurn(mockProfile, history, 'Ma réponse longue...', 300);

    expect(turn.isConcluding).toBe(true);
    expect(turn.turnType).toBe('CONCLUSION');
  });

  it('doit générer un rapport pédagogique complet avec citations verbatim et reformulations', async () => {
    const turns: InterviewTurn[] = [
      {
        turnIndex: 1,
        aiQuestion: 'Pouvez-vous présenter votre parcours en Génie Logiciel ?',
        pedagogicalIntent: 'Intro',
        studentTranscript: 'Je suis titulaire d une licence en génie logiciel à l UCAD et je souhaite continuer en Big Data.',
        turnType: 'INITIAL',
        durationSeconds: 45,
        timestamp: new Date().toISOString(),
      },
      {
        turnIndex: 2,
        aiQuestion: 'Pourquoi avoir choisi le Master Big Data à l Université de Lille ?',
        pedagogicalIntent: 'Justification vœux',
        studentTranscript: 'Parce que c est une grande université.',
        turnType: 'REGULAR',
        durationSeconds: 50,
        timestamp: new Date().toISOString(),
      },
    ];

    const report = await generateEvaluationReport(mockProfile, turns);

    expect(report.overallScore).toBeGreaterThanOrEqual(0);
    expect(report.overallScore).toBeLessThanOrEqual(100);
    expect(report.scoresByCriteria).toHaveLength(5);

    // Vérifier les maxScore
    const totalMax = report.scoresByCriteria.reduce((sum, c) => sum + c.maxScore, 0);
    expect(totalMax).toBe(100);

    // Vérifier la présence de citations réelles
    expect(report.strengths.length).toBeGreaterThan(0);
    expect(report.strengths[0].verbatimQuote).toBeDefined();

    expect(report.areasToImprove.length).toBeGreaterThan(0);
    expect(report.areasToImprove[0].verbatimQuote).toBeDefined();

    // Vérifier la présence d'au moins une reformulation recommandée
    expect(report.reformulationExamples.length).toBeGreaterThan(0);
    expect(report.reformulationExamples[0].recommendedAnswer).toBeDefined();
    expect(report.reformulationExamples[0].explanation).toBeDefined();

    // Vérifier les thèmes de révision
    expect(report.revisionTopics.length).toBeGreaterThanOrEqual(3);
  });

  it('doit renouveler la formulation de la première question en fonction des questions des sessions passées (anti-répétition)', async () => {
    const q1 = await generateFirstQuestion(mockProfile, [], []);
    const q2 = await generateFirstQuestion(mockProfile, [], ['Question déjà posée session 1']);
    const q3 = await generateFirstQuestion(mockProfile, [], ['Question déjà posée session 1', 'Question déjà posée session 2']);

    expect(q1.question).toBeDefined();
    expect(q2.question).toBeDefined();
    expect(q3.question).toBeDefined();

    // En mode déterministe hors ligne, q1 et q2 doivent avoir des formulations distinctes grâce à la rotation
    expect(q1.question).not.toBe(q2.question);
  });

  it('doit adapter les relances thématiques en explorant différents vœux selon les sessions passées', async () => {
    const profileWithMultipleWishes: AcademicProfileData = {
      ...mockProfile,
      targetWishes: [
        { id: 'w1', programName: 'Master Big Data', institutionName: 'Univ Lille' },
        { id: 'w2', programName: 'Master Cloud Computing', institutionName: 'Univ Rennes' },
      ],
    };

    const history: InterviewTurn[] = [
      {
        turnIndex: 1,
        aiQuestion: 'Intro',
        pedagogicalIntent: 'Intro',
        studentTranscript: 'Je présente mon parcours académique en informatique avec plusieurs années de pratique.',
        turnType: 'INITIAL',
        durationSeconds: 40,
        timestamp: new Date().toISOString(),
      },
    ];

    // Session 1 : explore le premier vœu
    const turnSession1 = await generateAdaptiveTurn(
      profileWithMultipleWishes,
      history,
      'Je présente mon parcours académique en informatique avec plusieurs années de pratique.',
      50,
      [],
      []
    );

    // Session 2 : avec historique d'une question antérieure, explore le second vœu
    const turnSession2 = await generateAdaptiveTurn(
      profileWithMultipleWishes,
      history,
      'Je présente mon parcours académique en informatique avec plusieurs années de pratique.',
      50,
      [],
      ['Question antérieure sur Lille']
    );

    expect(turnSession1.question).toContain('Master Big Data');
    expect(turnSession2.question).toContain('Master Cloud Computing');
  });
});
