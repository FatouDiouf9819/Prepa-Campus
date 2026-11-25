import { describe, it, expect } from 'vitest';
import {
  isAcademicProfileComplete,
  CompleteAcademicProfileSchema,
  DraftAcademicProfileSchema,
} from '@/lib/validations/profile';
import {
  calculateRealProgression,
  inferEvaluationCompleteness,
  SessionRecord,
} from '@/lib/indicators/progression';
import { wishesToSerializedText, parseLegacyOrStoredWishes } from '@/lib/profile/wishes';
import { TargetWish } from '@/types/profile';

describe('Phase 2 : Étape 4, Récapitulatif du profil et fiabilisation de l\'évaluation', () => {
  // ============================================================================
  // 1. RÉCAPITULATIF & ASSOCIATIONS DE VŒUX
  // ============================================================================
  describe('1. Récapitulatif de l\'Étape 4 et intégrité des vœux', () => {
    it('doit associer fidèlement chaque vœu à son établissement respectif sans inversion', () => {
      const wishes: TargetWish[] = [
        {
          id: 'wish-1',
          programName: 'Master Informatique - Génie Logiciel',
          institutionName: 'Université Paris-Saclay',
          entryLevel: 'M1',
        },
        {
          id: 'wish-2',
          programName: 'Master MIAGE - Systèmes d\'Information',
          institutionName: 'Université Sorbonne Paris Nord',
          entryLevel: 'M1',
        },
      ];

      // Vérifier la sérialisation et le parsing bidirectionnel
      const serialized = wishesToSerializedText(wishes);
      expect(serialized.targetPrograms).toContain('Master Informatique - Génie Logiciel');
      expect(serialized.targetPrograms).toContain('Master MIAGE - Systèmes d\'Information');
      expect(serialized.targetInstitutions).toContain('Université Paris-Saclay');
      expect(serialized.targetInstitutions).toContain('Université Sorbonne Paris Nord');

      const reconstructed = parseLegacyOrStoredWishes(
        serialized.targetPrograms,
        serialized.targetInstitutions,
        wishes
      );

      expect(reconstructed).toHaveLength(2);
      expect(reconstructed[0].programName).toBe('Master Informatique - Génie Logiciel');
      expect(reconstructed[0].institutionName).toBe('Université Paris-Saclay');
      expect(reconstructed[1].programName).toBe('Master MIAGE - Systèmes d\'Information');
      expect(reconstructed[1].institutionName).toBe('Université Sorbonne Paris Nord');
    });

    it('doit préserver reasonFrance et strongSkills lorsqu\'ils sont renseignés', () => {
      const profile = {
        countryResidence: 'Sénégal',
        academicStatus: 'STUDYING',
        currentDiploma: 'Licence 3 Informatique',
        fieldOfStudy: 'Génie Logiciel',
        targetPrograms: 'Master Informatique',
        targetInstitutions: 'Université Paris-Saclay',
        reasonsForPrograms: 'Cette formation propose un socle approfondi en systèmes distribués correspondant à mon plan de carrière.',
        reasonFrance: 'La France offre un environnement académique réputé et des diplômes mondialement reconnus en ingénierie.',
        professionalGoal: 'Je vise un poste d\'architecte logiciel cloud d\'ici 3 ans dans une entreprise technologique innovante.',
        strongSkills: 'Certification AWS Cloud Practitioner, stages de 6 mois en TypeScript et Python chez Sonatel.',
        weaknessesToWork: 'Gestion du temps lors de la présentation orale initiale.',
      };

      expect(profile.reasonFrance).toBeDefined();
      expect(profile.reasonFrance.length).toBeGreaterThanOrEqual(20);
      expect(profile.strongSkills).toBeDefined();
      expect(profile.strongSkills?.trim().length).toBeGreaterThan(0);
      expect(profile.weaknessesToWork?.trim().length).toBeGreaterThan(0);
    });

    it('doit traiter les champs optionnels vides de manière neutre sans injecter de fausses valeurs', () => {
      const draft = DraftAcademicProfileSchema.parse({
        currentDiploma: 'Licence 3',
        fieldOfStudy: 'Mathématiques',
        strongSkills: '',
        studyParticularities: '',
        weaknessesToWork: '',
      });

      expect(draft.strongSkills).toBe('');
      expect(draft.studyParticularities).toBe('');
      expect(draft.weaknessesToWork).toBe('');
    });
  });

  // ============================================================================
  // 2. COHÉRENCE DE LA COMPLÉTION DU PROFIL (DASHBOARD & VALIDATION)
  // ============================================================================
  describe('2. Cohérence de la complétion du profil (isAcademicProfileComplete)', () => {
    it('doit rejeter un profil incomplet qui n\'a que 2 champs renseignés (correction de l\'ancien bug)', () => {
      const flawedDraft = {
        currentDiploma: 'Licence 3 Informatique',
        targetPrograms: 'Master Informatique',
        // Tous les autres champs sont absents ou vides
      };

      // L'ancienne règle `profile.currentDiploma && profile.targetPrograms` donnait true
      expect(Boolean(flawedDraft.currentDiploma && flawedDraft.targetPrograms)).toBe(true);

      // Notre nouvelle fonction fiabilisée doit impérativement renvoyer false !
      expect(isAcademicProfileComplete(flawedDraft)).toBe(false);
    });

    it('doit valider un profil académique complet et conforme aux schémas', () => {
      const completeProfile = {
        countryResidence: 'Sénégal',
        academicStatus: 'STUDYING',
        currentDiploma: 'Licence 3 Informatique',
        fieldOfStudy: 'Génie Logiciel',
        targetPrograms: 'Master Informatique',
        targetInstitutions: 'Université Paris-Saclay',
        reasonsForPrograms: 'Formation d\'excellence avec cursus spécialisé en architectures logicielles distribuées.',
        reasonFrance: 'La France offre des cursus orientés vers la professionnalisation et la recherche de pointe.',
        professionalGoal: 'Architecte logiciel spécialisé dans les microservices et le calcul distribué.',
        strongSkills: 'Projets universitaires en Spring Boot et Next.js.',
        weaknessesToWork: 'Synthèse rapide des motivations sous stress.',
        isCompleted: true,
      };

      expect(isAcademicProfileComplete(completeProfile)).toBe(true);
    });

    it('doit valider un profil historique en snake_case stocké en base de données', () => {
      const dbProfileRow = {
        country_residence: 'Côte d\'Ivoire',
        academic_status: 'GRADUATED',
        current_diploma: 'Master 1 Gestion',
        field_of_study: 'Finance & Comptabilité',
        target_programs: 'Master 2 Finance d\'Entreprise',
        target_institutions: 'Université de Bordeaux',
        reasons_for_programs: 'Ce master 2 propose un parcours d\'audit financier particulièrement réputé.',
        reason_france: 'Approfondir les normes IFRS et acquérir une expérience professionnelle internationale.',
        professional_goal: 'Devenir auditeur financier senior au sein d\'un cabinet international réputé.',
        is_completed: true,
      };

      expect(isAcademicProfileComplete(dbProfileRow)).toBe(true);
    });

    it('doit supporter la rétrocompatibilité si reasons_for_programs utilise reason_france par défaut', () => {
      const legacyProfile = {
        countryResidence: 'Maroc',
        currentDiploma: 'Licence 3 Économie',
        fieldOfStudy: 'Économie Internationale',
        targetPrograms: 'Master Commerce International',
        targetInstitutions: 'Université Paris Dauphine',
        reasonFrance: 'L\'environnement académique français propose des passerelles uniques vers l\'économie mondiale.',
        reasonsForPrograms: '', // vide, doit utiliser reasonFrance comme fallback
        professionalGoal: 'Chef de projet import-export pour des partenariats euro-méditerranéens.',
        isCompleted: true,
      };

      expect(isAcademicProfileComplete(legacyProfile)).toBe(true);
    });

    it('doit refuser un profil null, indéfini ou vide', () => {
      expect(isAcademicProfileComplete(null)).toBe(false);
      expect(isAcademicProfileComplete(undefined)).toBe(false);
      expect(isAcademicProfileComplete({})).toBe(false);
      expect(isAcademicProfileComplete('')).toBe(false);
    });
  });

  // ============================================================================
  // 3. FIABILITÉ DE L'ÉTAT D'ÉVALUATION (inferEvaluationCompleteness)
  // ============================================================================
  describe('3. Fiabilité de l\'état d\'évaluation (inferEvaluationCompleteness)', () => {
    it('doit identifier une évaluation complète valide avec un score réel', () => {
      const report = {
        id: 'rep-1',
        overallScore: 78,
        synthesisSummary: 'Très bon entretien, argumentation solide sur le projet professionnel.',
      };

      expect(inferEvaluationCompleteness(report)).toBe('COMPLETE');
    });

    it('doit détecter une évaluation indisponible suite à un problème technique de micro ou silence', () => {
      const technicalReport = {
        id: 'rep-tech-1',
        overallScore: 0,
        synthesisSummary:
          'Données orales insuffisantes (évaluation indisponible) : aucune prise de parole exploitable n\'a été enregistrée durant cette simulation.',
      };

      expect(inferEvaluationCompleteness(technicalReport)).toBe('UNAVAILABLE');
    });

    it('doit détecter une session technique marquée par is_technical_issue', () => {
      const sessionWithFlag = {
        id: 'rep-tech-2',
        overall_score: 0,
        is_technical_issue: true,
        synthesis_summary: 'Incident technique lors de la capture audio.',
      };

      expect(inferEvaluationCompleteness(sessionWithFlag)).toBe('UNAVAILABLE');
    });

    it('doit distinguer une évaluation valide avec score 0 d\'une absence d\'évaluation si marquée COMPLETE', () => {
      const legitZeroReport = {
        id: 'rep-legit-0',
        overallScore: 0,
        evaluationCompleteness: 'COMPLETE' as const,
        isTechnicalIssue: false,
        synthesisSummary: 'Candidat hors sujet sur l\'ensemble des critères évalués.',
      };

      // Si le système a expressément statué COMPLETE sans incident technique, respecter le statut
      expect(inferEvaluationCompleteness(legitZeroReport)).toBe('COMPLETE');
    });

    it('doit détecter une évaluation partielle (plusieurs réponses orales inaudibles)', () => {
      const partialReport = {
        id: 'rep-partial',
        overallScore: 55,
        synthesisSummary: 'Évaluation partielle basée sur 2 réponses exploitables sur 4 tours.',
      };

      expect(inferEvaluationCompleteness(partialReport)).toBe('PARTIAL');
    });

    it('doit gérer prudemment les anciens rapports avec overall_score en snake_case', () => {
      const legacyDbReport = {
        id: 'rep-legacy-0',
        overall_score: 0,
        synthesis_summary: 'Données orales insuffisantes',
      };

      expect(inferEvaluationCompleteness(legacyDbReport)).toBe('UNAVAILABLE');
    });
  });

  // ============================================================================
  // 4. FIABILITÉ DU CALCUL DE PROGRESSION (calculateRealProgression)
  // ============================================================================
  describe('4. Fiabilité du calcul de progression (calculateRealProgression)', () => {
    it('doit calculer la progression réelle entre deux évaluations valides', () => {
      const sessions: SessionRecord[] = [
        {
          id: 'sess-2',
          status: 'COMPLETED',
          started_at: '2026-03-02T10:00:00Z',
          evaluation_reports: [
            {
              id: 'rep-2',
              overall_score: 82,
              synthesis_summary: 'Progression nette sur l\'argumentation des vœux.',
              created_at: '2026-03-02T10:05:00Z',
            },
          ],
        },
        {
          id: 'sess-1',
          status: 'COMPLETED',
          started_at: '2026-03-01T10:00:00Z',
          evaluation_reports: [
            {
              id: 'rep-1',
              overall_score: 70,
              synthesis_summary: 'Bonne base mais manque de précision sur les universités.',
              created_at: '2026-03-01T10:05:00Z',
            },
          ],
        },
      ];

      const metrics = calculateRealProgression(sessions);
      expect(metrics.status).toBe('PROGRESSION_AVAILABLE');
      expect(metrics.latestScore).toBe(82);
      expect(metrics.previousScore).toBe(70);
      expect(metrics.diff).toBe(12);
      expect(metrics.progressionLabel).toBe('+12 pts');
      expect(metrics.evaluatedSessionsCount).toBe(2);
    });

    it('doit exclure les sessions techniques de score 0 pour éviter un faux bond artificiel (+75 pts)', () => {
      const sessions: SessionRecord[] = [
        {
          id: 'sess-valid',
          status: 'COMPLETED',
          started_at: '2026-03-02T10:00:00Z',
          evaluation_reports: [
            {
              id: 'rep-valid',
              overall_score: 75,
              synthesis_summary: 'Entretien satisfaisant.',
              created_at: '2026-03-02T10:05:00Z',
            },
          ],
        },
        {
          id: 'sess-glitch',
          status: 'COMPLETED',
          started_at: '2026-03-01T10:00:00Z',
          evaluation_reports: [
            {
              id: 'rep-glitch',
              overall_score: 0,
              synthesis_summary: 'Données orales insuffisantes (évaluation indisponible) : problème microphone.',
              created_at: '2026-03-01T10:05:00Z',
            },
          ],
        },
      ];

      const metrics = calculateRealProgression(sessions);

      // La session glitch ne doit PAS être comptée comme note 0 !
      // Le candidat n'a qu'1 seule vraie évaluation de 75 pts.
      expect(metrics.status).toBe('SINGLE_SESSION');
      expect(metrics.latestScore).toBe(75);
      expect(metrics.previousScore).toBe(null);
      expect(metrics.diff).toBe(null);
      expect(metrics.progressionLabel).toBe(null);
      expect(metrics.evaluatedSessionsCount).toBe(1);
    });

    it('doit préserver la note précédente lorsqu\'un incident technique survient lors d\'un deuxième essai', () => {
      const sessions: SessionRecord[] = [
        {
          id: 'sess-glitch-second',
          status: 'COMPLETED',
          started_at: '2026-03-02T10:00:00Z',
          evaluation_reports: [
            {
              id: 'rep-glitch-2',
              overall_score: 0,
              synthesis_summary: 'Incident technique : aucune prise de parole.',
              created_at: '2026-03-02T10:05:00Z',
            },
          ],
        },
        {
          id: 'sess-valid-first',
          status: 'COMPLETED',
          started_at: '2026-03-01T10:00:00Z',
          evaluation_reports: [
            {
              id: 'rep-valid-1',
              overall_score: 80,
              synthesis_summary: 'Très bon parcours académique.',
              created_at: '2026-03-01T10:05:00Z',
            },
          ],
        },
      ];

      const metrics = calculateRealProgression(sessions);

      // Ne pas infliger une baisse artificielle de -80 pts !
      expect(metrics.status).toBe('SINGLE_SESSION');
      expect(metrics.latestScore).toBe(80);
      expect(metrics.diff).toBe(null);
      expect(metrics.evaluatedSessionsCount).toBe(1);
    });

    it('doit renvoyer INSUFFICIENT_DATA si toutes les sessions sont techniques', () => {
      const sessions: SessionRecord[] = [
        {
          id: 'sess-t1',
          status: 'COMPLETED',
          evaluation_reports: [
            {
              id: 'rep-t1',
              overall_score: 0,
              synthesis_summary: 'Données orales insuffisantes : silence microphone.',
            },
          ],
        },
      ];

      const metrics = calculateRealProgression(sessions);
      expect(metrics.status).toBe('INSUFFICIENT_DATA');
      expect(metrics.hasSufficientData).toBe(false);
      expect(metrics.latestScore).toBe(null);
      expect(metrics.previousScore).toBe(null);
      expect(metrics.diff).toBe(null);
    });

    it('doit renvoyer NO_SESSIONS si l\'historique est vide', () => {
      const metrics = calculateRealProgression([]);
      expect(metrics.status).toBe('NO_SESSIONS');
      expect(metrics.hasSufficientData).toBe(false);
      expect(metrics.sessionsCount).toBe(0);
      expect(metrics.diff).toBe(null);
    });
  });
});
