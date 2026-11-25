import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  Step3Schema,
  DraftAcademicProfileSchema,
  CompleteAcademicProfileSchema,
} from '@/lib/validations/profile';
import { AcademicProfileData } from '@/types/profile';

const mockCreate = vi.fn();

vi.mock('openai', () => {
  return {
    default: vi.fn().mockImplementation(() => ({
      chat: {
        completions: {
          create: mockCreate,
        },
      },
    })),
  };
});

import { generateFirstQuestion, generateAdaptiveTurn } from '@/lib/ai/openai';

describe('Phase 1 : Étape 3 « Projet Professionnel » (Validation, Ergonomie et Contexte IA)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('A. Validation des champs de l\'Étape 3', () => {
    it('doit valider des données d\'étape 3 complètes et conformes', () => {
      const validData = {
        professionalGoal: 'Je souhaite devenir Ingénieur Cloud / DevOps pour concevoir des architectures résilientes.',
        reasonFrance: 'La France propose des formations d excellence combinant théorie pointue et projets industriels concrets.',
        strongSkills: 'Stage de 3 mois en Python chez Orange ; Certification AWS Cloud Practitioner ; Anglais B2.',
      };

      const result = Step3Schema.safeParse(validData);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.professionalGoal).toBe(validData.professionalGoal);
        expect(result.data.reasonFrance).toBe(validData.reasonFrance);
        expect(result.data.strongSkills).toBe(validData.strongSkills);
      }
    });

    it('doit accepter un champ strongSkills vide ou non renseigné (facultatif)', () => {
      const withoutSkills = {
        professionalGoal: 'Je vise un poste de consultant en cybersécurité au sein d un cabinet d audit.',
        reasonFrance: 'Les universités françaises offrent des laboratoires de recherche en cryptographie de premier plan.',
        strongSkills: '',
      };

      const result = Step3Schema.safeParse(withoutSkills);
      expect(result.success).toBe(true);

      const omittedSkills = {
        professionalGoal: 'Je vise un poste de consultant en cybersécurité au sein d un cabinet d audit.',
        reasonFrance: 'Les universités françaises offrent des laboratoires de recherche en cryptographie de premier plan.',
      };

      const resultOmitted = Step3Schema.safeParse(omittedSkills);
      expect(resultOmitted.success).toBe(true);
    });

    it('doit rejeter un projet professionnel trop court (< 25 caractères)', () => {
      const tooShortGoal = {
        professionalGoal: 'Je veux être ingénieur.', // 23 caractères
        reasonFrance: 'La France offre des formations de très haute qualité académique.',
      };

      const result = Step3Schema.safeParse(tooShortGoal);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues.some((i) => i.path.includes('professionalGoal'))).toBe(true);
      }
    });

    it('doit rejeter des motivations France trop courtes (< 20 caractères)', () => {
      const tooShortReason = {
        professionalGoal: 'Devenir Data Scientist spécialisé dans les modèles prédictifs pour la santé.',
        reasonFrance: 'Bonne formation.', // 16 caractères
      };

      const result = Step3Schema.safeParse(tooShortReason);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues.some((i) => i.path.includes('reasonFrance'))).toBe(true);
      }
    });

    it('doit rejeter des compétences clés dépassant 500 caractères', () => {
      const oversizedSkills = {
        professionalGoal: 'Devenir Chef de projet informatique dans le secteur bancaire et des télécoms.',
        reasonFrance: 'Approfondir mes compétences théoriques et pratiques dans un environnement international stimulant.',
        strongSkills: 'Compétence '.repeat(60), // > 600 caractères
      };

      const result = Step3Schema.safeParse(oversizedSkills);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues.some((i) => i.path.includes('strongSkills'))).toBe(true);
      }
    });
  });

  describe('B. Sauvegarde de Brouillon et Persistance', () => {
    it('doit sauvegarder un brouillon avec l\'étape 3 partiellement saisie', () => {
      const partialDraft = {
        countryResidence: 'Sénégal',
        currentDiploma: 'Licence 3',
        fieldOfStudy: 'Informatique',
        professionalGoal: 'Devenir DevOps', // Moins de 25 car., accepté en brouillon
        reasonFrance: '',
        strongSkills: 'Stage en cours chez Sonatel',
      };

      const result = DraftAcademicProfileSchema.safeParse(partialDraft);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.strongSkills).toBe('Stage en cours chez Sonatel');
        expect(result.data.isCompleted).toBe(false);
      }
    });

    it('doit valider l\'étape 3 dans le profil académique complet', () => {
      const completeProfile: Partial<AcademicProfileData> = {
        countryResidence: 'Sénégal',
        currentDiploma: 'Licence 3 Informatique',
        fieldOfStudy: 'Génie Logiciel',
        targetPrograms: 'Master Informatique Big Data',
        targetInstitutions: 'Université de Lille',
        reasonsForPrograms: 'Cette formation propose une spécialisation en architectures distribuées et IA.',
        reasonFrance: 'La France propose un écosystème de formation de premier ordre avec accès à l alternance.',
        professionalGoal: 'Devenir Ingénieur Cloud pour concevoir des infrastructures scalables et sécurisées.',
        strongSkills: 'AWS Certified Cloud Practitioner, Python, Docker',
        isCompleted: true,
      };

      const result = CompleteAcademicProfileSchema.safeParse(completeProfile);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.strongSkills).toBe('AWS Certified Cloud Practitioner, Python, Docker');
        expect(result.data.isCompleted).toBe(true);
      }
    });
  });

  describe('C. Transmission sécurisée des compétences à l\'IA de simulation', () => {
    beforeEach(() => {
      process.env.OPENAI_API_KEY = 'sk-mock-valid-key-for-test';
      mockCreate.mockReset();
    });

    it('doit inclure les compétences clés dans le prompt d\'ouverture UNIQUEMENT lorsqu\'elles sont renseignées', async () => {
      let capturedPrompt = '';
      mockCreate.mockImplementation(async ({ messages }) => {
        capturedPrompt = messages[0].content;
        return {
          choices: [
            {
              message: {
                content: JSON.stringify({
                  question: 'Bonjour. Présentez-vous en lien avec votre parcours.',
                  pedagogicalIntent: 'Accueil',
                }),
              },
            },
          ],
        };
      });

      const profileWithSkills: AcademicProfileData = {
        countryResidence: 'Sénégal',
        currentDiploma: 'Licence 3 Informatique',
        fieldOfStudy: 'Génie Logiciel',
        targetPrograms: 'Master Informatique',
        targetInstitutions: 'Université de Lille',
        reasonsForPrograms: 'Maquette orientée pratique.',
        reasonFrance: 'Laboratoires de pointe et renommée.',
        professionalGoal: 'Devenir Ingénieur DevOps dans le secteur télécoms.',
        strongSkills: 'Certification Kubernetes CKA et stage de 4 mois chez Orange.',
        isCompleted: true,
      };

      await generateFirstQuestion(profileWithSkills);

      expect(mockCreate).toHaveBeenCalledTimes(1);
      expect(capturedPrompt).toContain('Certification Kubernetes CKA et stage de 4 mois chez Orange.');
      expect(capturedPrompt).toContain('sans inventer');
    });

    it('ne doit PAS mentionner de compétences ou d\'atouts dans le prompt si strongSkills est vide', async () => {
      let capturedPrompt = '';
      mockCreate.mockImplementation(async ({ messages }) => {
        capturedPrompt = messages[0].content;
        return {
          choices: [
            {
              message: {
                content: JSON.stringify({
                  question: 'Bonjour. Pouvez-vous vous présenter ?',
                  pedagogicalIntent: 'Introduction',
                }),
              },
            },
          ],
        };
      });

      const profileWithoutSkills: AcademicProfileData = {
        countryResidence: 'Côte d\'Ivoire',
        currentDiploma: 'Licence 3 Économie',
        fieldOfStudy: 'Finance',
        targetPrograms: 'Master Finance de Marché',
        targetInstitutions: 'Université Paris-Dauphine',
        reasonsForPrograms: 'Excellence académique.',
        reasonFrance: 'Place financière européenne majeure.',
        professionalGoal: 'Analyste financier dans une banque d investissement.',
        strongSkills: '', // Vide
        isCompleted: true,
      };

      await generateFirstQuestion(profileWithoutSkills);

      expect(mockCreate).toHaveBeenCalledTimes(1);
      expect(capturedPrompt).not.toContain('Compétences, expériences ou atouts déclarés');
      expect(capturedPrompt).toContain('Ne JAMAIS inventer d\'expérience');
    });

    it('doit transmettre les compétences dans les relances adaptatives (generateAdaptiveTurn)', async () => {
      let capturedPrompt = '';
      mockCreate.mockImplementation(async ({ messages }) => {
        capturedPrompt = messages[0].content;
        return {
          choices: [
            {
              message: {
                content: JSON.stringify({
                  evaluationStatus: 'ANSWER_ACCEPTED',
                  turnType: 'REGULAR',
                  relevanceCategory: 'PERTINENT_DEVELOPPED',
                  nextQuestion: 'Quelles matières spécifiques avez-vous retenues ?',
                  pedagogicalIntent: 'Approfondissement',
                }),
              },
            },
          ],
        };
      });

      const profile: AcademicProfileData = {
        countryResidence: 'Cameroun',
        currentDiploma: 'Master 1 Biologie',
        fieldOfStudy: 'Biochimie',
        targetPrograms: 'Master 2 Biotechnologies',
        targetInstitutions: 'Université de Strasbourg',
        reasonsForPrograms: 'Laboratoires de pointe en génomique.',
        reasonFrance: 'Pôle d excellence pharmaceutique.',
        professionalGoal: 'Chercheur en biotechnologies médicales.',
        strongSkills: 'Projet de recherche sur les protéines recombinantes en laboratoire.',
        isCompleted: true,
      };

      await generateAdaptiveTurn(
        profile,
        [
          {
            turnIndex: 1,
            aiQuestion: 'Quelle est votre formation ?',
            pedagogicalIntent: 'Accueil',
            studentTranscript: 'Je suis titulaire d un M1 et j ai mené des expériences en biochimie.',
            turnType: 'INITIAL',
            durationSeconds: 30,
            timestamp: new Date().toISOString(),
          },
        ],
        'Je suis titulaire d un M1 et j ai mené des expériences en biochimie.',
        60
      );

      expect(mockCreate).toHaveBeenCalledTimes(1);
      expect(capturedPrompt).toContain('Projet de recherche sur les protéines recombinantes en laboratoire.');
      expect(capturedPrompt).toContain('sans présumer qu\'ils sont certifiés');
    });
  });
});
