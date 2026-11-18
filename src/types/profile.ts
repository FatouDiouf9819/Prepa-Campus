/**
 * Types TypeScript du profil académique de l'étudiant Campus France.
 */

export const MAX_TARGET_WISHES = 7;

/**
 * Structure d'un vœu de formation individuel Campus France.
 */
export interface TargetWish {
  id: string; // Identifiant stable (ex: 'wish_1710000000_abc')
  programName: string; // Formation souhaitée (ex: 'Master MIAGE')
  institutionName: string; // Université ou établissement (ex: 'Université Paris-Saclay')
  entryLevel?: string; // Niveau d'entrée visé (ex: L3, M1, M2)
  motivation?: string; // Motivation spécifique à ce vœu
  status?: 'DRAFT' | 'SUBMITTED' | 'ACCEPTED' | 'REJECTED'; // Statut candidature
}

export type AcademicStatus =
  | 'STUDYING' // Études ou diplôme actuellement en cours
  | 'GRADUATED' // Diplôme déjà obtenu (en recherche ou transition)
  | 'EMPLOYED_OR_INTERN' // En stage ou activité professionnelle
  | 'GAP_YEAR' // Césure ou interruption d'études
  | 'REORIENTATION' // En réorientation
  | 'OTHER'; // Autre situation académique

export interface AcademicProfileData {
  id?: string;
  userId?: string;
  
  // Étape 1 : Parcours actuel & Situation académique
  countryResidence: string;
  academicStatus?: AcademicStatus | string;
  currentDiploma: string;
  fieldOfStudy: string;
  currentInstitution?: string;
  studyParticularities?: string;
  
  // Étape 2 : Formations & Établissements visés en France
  targetWishes?: TargetWish[];
  targetPrograms: string;
  targetInstitutions: string;
  reasonsForPrograms: string;
  
  // Étape 3 : Projet professionnel & Choix de la France
  reasonFrance: string;
  professionalGoal: string;
  strongSkills?: string;
  
  // Étape 4 : Auto-évaluation & Points d'entraînement
  weaknessesToWork?: string;
  
  // Métadonnées
  isCompleted: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export type ProfileStep = 1 | 2 | 3 | 4;

export interface ProfileStepConfig {
  step: ProfileStep;
  title: string;
  shortTitle: string;
  description: string;
}
