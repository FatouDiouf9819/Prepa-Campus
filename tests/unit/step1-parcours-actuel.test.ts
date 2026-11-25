import { describe, it, expect } from 'vitest';
import {
  Step1Schema,
  DraftAcademicProfileSchema,
  CompleteAcademicProfileSchema,
  AcademicStatusEnum,
} from '@/lib/validations/profile';
import { AcademicProfileData } from '@/types/profile';

describe('Étape 1 : Parcours actuel (Audit, Validation et Rétro-compatibilité)', () => {
  describe('A. Validation des champs obligatoires et facultatifs', () => {
    it('doit valider un profil Étape 1 complet et valide', () => {
      const validStep1 = {
        countryResidence: 'Sénégal',
        academicStatus: 'STUDYING',
        currentDiploma: 'Licence 3 Informatique',
        fieldOfStudy: 'Génie Logiciel',
        currentInstitution: 'Université Cheikh Anta Diop (UCAD)',
        studyParticularities: 'Réorientation après une première année en Sciences Physiques.',
      };

      const result = Step1Schema.safeParse(validStep1);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.academicStatus).toBe('STUDYING');
        expect(result.data.studyParticularities).toBe('Réorientation après une première année en Sciences Physiques.');
      }
    });

    it('doit accepter l\'absence de champs facultatifs (currentInstitution, studyParticularities)', () => {
      const minimalStep1 = {
        countryResidence: 'Côte d\'Ivoire',
        currentDiploma: 'Baccalauréat Scientifique',
        fieldOfStudy: 'Mathématiques & Informatique',
      };

      const result = Step1Schema.safeParse(minimalStep1);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.academicStatus).toBe('STUDYING'); // Valeur par défaut
        expect(result.data.currentInstitution).toBeUndefined();
      }
    });

    it('doit échouer si le pays de résidence est manquant', () => {
      const invalid = {
        countryResidence: '',
        currentDiploma: 'Licence 3 Informatique',
        fieldOfStudy: 'Informatique',
      };
      const result = Step1Schema.safeParse(invalid);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues.some((i) => i.path.includes('countryResidence'))).toBe(true);
      }
    });

    it('doit échouer si le diplôme actuel est manquant ou vide', () => {
      const invalid = {
        countryResidence: 'Cameroun',
        currentDiploma: '',
        fieldOfStudy: 'Gestion',
      };
      const result = Step1Schema.safeParse(invalid);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues.some((i) => i.path.includes('currentDiploma'))).toBe(true);
      }
    });

    it('doit échouer si la filière est manquante ou vide', () => {
      const invalid = {
        countryResidence: 'Bénin',
        currentDiploma: 'Licence 2',
        fieldOfStudy: ' ',
      };
      // ' ' trimmed or min(2)
      const result = Step1Schema.safeParse({
        countryResidence: 'Bénin',
        currentDiploma: 'Licence 2',
        fieldOfStudy: '',
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues.some((i) => i.path.includes('fieldOfStudy'))).toBe(true);
      }
    });
  });

  describe('B. Statuts académiques supportés', () => {
    it('doit accepter l\'ensemble des situations académiques définies', () => {
      const statuses = ['STUDYING', 'GRADUATED', 'EMPLOYED_OR_INTERN', 'GAP_YEAR', 'REORIENTATION', 'OTHER'] as const;

      for (const status of statuses) {
        const data = {
          countryResidence: 'Maroc',
          academicStatus: status,
          currentDiploma: 'Master 1 Finance',
          fieldOfStudy: 'Banque et Finance',
        };
        const result = Step1Schema.safeParse(data);
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.academicStatus).toBe(status);
        }
      }
    });

    it('doit rejeter un statut académique inconnu dans le schéma strict', () => {
      const invalid = {
        countryResidence: 'Togo',
        academicStatus: 'UNKNOWN_STATUS_XYZ',
        currentDiploma: 'Licence 3',
        fieldOfStudy: 'Droit',
      };
      const result = Step1Schema.safeParse(invalid);
      expect(result.success).toBe(false);
    });
  });

  describe('C. Champ facultatif « Particularités du parcours »', () => {
    it('doit accepter un texte d\'explication valide jusqu\'à 500 caractères', () => {
      const validText = 'Année de césure effectuée en 2023 pour stage pré-professionnel en entreprise avant reprise du M1.';
      const result = Step1Schema.safeParse({
        countryResidence: 'Guinée',
        currentDiploma: 'Master 1 Réseaux',
        fieldOfStudy: 'Télécoms',
        studyParticularities: validText,
      });
      expect(result.success).toBe(true);
    });

    it('doit rejeter un texte de particularités dépassant 500 caractères', () => {
      const longText = 'A'.repeat(501);
      const result = Step1Schema.safeParse({
        countryResidence: 'Gabon',
        currentDiploma: 'Licence 3',
        fieldOfStudy: 'Biologie',
        studyParticularities: longText,
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues.some((i) => i.path.includes('studyParticularities'))).toBe(true);
      }
    });
  });

  describe('D. Mode Brouillon et Sauvegarde Progressive', () => {
    it('doit accepter un brouillon partiellement rempli sans bloquer l\'étudiant', () => {
      const partialDraft = {
        countryResidence: 'Mali',
        academicStatus: 'GAP_YEAR',
        // Diplôme et filière encore vides à ce stade
        currentDiploma: '',
        fieldOfStudy: '',
      };
      const result = DraftAcademicProfileSchema.safeParse(partialDraft);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.academicStatus).toBe('GAP_YEAR');
        expect(result.data.isCompleted).toBe(false);
      }
    });

    it('doit préserver les particularités du parcours dans le brouillon', () => {
      const draftWithNotes = {
        countryResidence: 'Sénégal',
        currentDiploma: 'Licence 2',
        studyParticularities: 'Retard de soutenance lié au calendrier universitaire.',
      };
      const result = DraftAcademicProfileSchema.safeParse(draftWithNotes);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.studyParticularities).toBe('Retard de soutenance lié au calendrier universitaire.');
      }
    });
  });

  describe('E. Rétro-compatibilité avec les anciens profils', () => {
    it('doit charger un ancien profil sans academicStatus ni studyParticularities sans régression', () => {
      const legacyProfile: Partial<AcademicProfileData> = {
        countryResidence: 'Sénégal',
        currentDiploma: 'Licence 3 Mathématiques',
        fieldOfStudy: 'Maths Appliquées',
        currentInstitution: 'UGB Saint-Louis',
        targetPrograms: 'Master 1 Data Science',
        targetInstitutions: 'Université Paris-Cité',
        reasonsForPrograms: 'Cette formation apporte une expertise avancée en modélisation stochastique.',
        reasonFrance: 'La France propose des formations de pointe en analyse de données et modélisation.',
        professionalGoal: 'Data Scientist dans le secteur de l\'assurance.',
        isCompleted: true,
      };

      const parsed = CompleteAcademicProfileSchema.safeParse(legacyProfile);
      expect(parsed.success).toBe(true);
      if (parsed.success) {
        // Le statut par défaut doit être STUDYING sans casser l'ancien profil
        expect(parsed.data.academicStatus).toBe('STUDYING');
        // studyParticularities doit être undefined ou vide sans bloquer
        expect(parsed.data.studyParticularities).toBeUndefined();
      }
    });
  });
});
