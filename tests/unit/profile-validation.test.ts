import { describe, it, expect } from 'vitest';
import {
  Step1Schema,
  Step2Schema,
  Step3Schema,
  CompleteAcademicProfileSchema,
  DraftAcademicProfileSchema,
} from '@/lib/validations/profile';

describe('Validation Zod du Profil Académique', () => {
  describe('Étape 1 : Situation actuelle & Parcours', () => {
    it('doit échouer si le diplôme actuel est manquant ou vide', () => {
      const invalidData = {
        countryResidence: 'Sénégal',
        currentDiploma: '',
        fieldOfStudy: 'Informatique',
      };
      const result = Step1Schema.safeParse(invalidData);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].path).toContain('currentDiploma');
      }
    });

    it('doit réussir avec un diplôme et une filière valides', () => {
      const validData = {
        countryResidence: 'Sénégal',
        currentDiploma: 'Licence 3 Informatique',
        fieldOfStudy: 'Génie Logiciel',
        currentInstitution: 'UCAD Dakar',
      };
      const result = Step1Schema.safeParse(validData);
      expect(result.success).toBe(true);
    });
  });

  describe('Étape 2 : Vœux et Formations en France', () => {
    it('doit rejeter une justification de formation trop courte (< 20 caractères)', () => {
      const shortReason = {
        targetPrograms: 'Master Informatique',
        targetInstitutions: 'Université de Lille',
        reasonsForPrograms: 'Bonne formation.', // Seulement 16 caractères
      };
      const result = Step2Schema.safeParse(shortReason);
      expect(result.success).toBe(false);
    });

    it('doit valider une justification détaillée de formation', () => {
      const validReason = {
        targetPrograms: 'Master 1 Informatique parcours Big Data',
        targetInstitutions: 'Université de Lille, Université Paris-Saclay',
        reasonsForPrograms:
          'Cette formation propose des cours approfondis en architectures distribuées et en machine learning appliqués aux télécoms.',
      };
      const result = Step2Schema.safeParse(validReason);
      expect(result.success).toBe(true);
    });
  });

  describe('Étape 3 : Projet Professionnel & Choix de la France', () => {
    it('doit exiger un projet professionnel détaillé (>= 25 caractères)', () => {
      const shortGoal = {
        reasonFrance: 'Pour la qualité des universités et les partenariats.',
        professionalGoal: 'Trouver un travail.',
      };
      const result = Step3Schema.safeParse(shortGoal);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].path).toContain('professionalGoal');
      }
    });

    it('doit accepter un projet professionnel cohérent et bien motivé', () => {
      const validGoal = {
        reasonFrance:
          'Bénéficier de laboratoires de pointe et de l alternance avec les entreprises leaders européennes.',
        professionalGoal:
          'Devenir Ingénieur Cloud et DevOps afin de piloter des infrastructures résilientes de grande envergure.',
        strongSkills: 'Python, Docker, certification AWS Cloud Practitioner',
      };
      const result = Step3Schema.safeParse(validGoal);
      expect(result.success).toBe(true);
    });
  });

  describe('Profil Complet vs Brouillon', () => {
    it('doit valider un profil intégralement renseigné', () => {
      const fullProfile = {
        countryResidence: 'Sénégal',
        currentDiploma: 'Licence 3 Mathématiques-Informatique',
        fieldOfStudy: 'Sciences et Technologies',
        currentInstitution: 'Université Gaston Berger',
        targetPrograms: 'Master MIAGE',
        targetInstitutions: 'Université Paris Dauphine',
        reasonsForPrograms:
          'La double compétence en informatique et management des systèmes d information correspond parfaitement à mes attentes.',
        reasonFrance:
          'Le réseau d anciens et les stages professionnalisants facilitent l insertion dans des projets de transformation numérique.',
        professionalGoal:
          'Consultant en Systèmes d Information spécialisé dans les architectures cloud et la gouvernance de données.',
        strongSkills: 'SQL, Java, Gestion de projet agile',
        weaknessesToWork: 'Rendre mon argumentation plus synthétique lors des relances.',
        isCompleted: true,
      };

      const result = CompleteAcademicProfileSchema.safeParse(fullProfile);
      expect(result.success).toBe(true);
    });

    it('doit permettre la sauvegarde progressive d un brouillon partiel sans lever d erreur bloquante', () => {
      const partialDraft = {
        countryResidence: 'Sénégal',
        currentDiploma: 'Licence en cours',
        fieldOfStudy: '',
        targetPrograms: '',
        isCompleted: false,
      };

      const result = DraftAcademicProfileSchema.safeParse(partialDraft);
      expect(result.success).toBe(true);
    });
  });
});
