import { z } from 'zod';

/**
 * Situation académique de l'étudiant.
 */
export const AcademicStatusEnum = z.enum([
  'STUDYING',
  'GRADUATED',
  'EMPLOYED_OR_INTERN',
  'GAP_YEAR',
  'REORIENTATION',
  'OTHER',
]);

/**
 * Schéma Zod Étape 1 : Situation actuelle et parcours académique.
 */
export const Step1Schema = z.object({
  countryResidence: z
    .string()
    .min(2, 'Le pays de résidence est obligatoire.')
    .max(100, 'Nom de pays trop long.'),
  academicStatus: AcademicStatusEnum.optional().default('STUDYING'),
  currentDiploma: z
    .string()
    .min(2, 'Veuillez préciser votre diplôme actuel ou le plus récent (ex. Licence 3, Baccalauréat, Master 1).')
    .max(120, 'Intitulé de diplôme trop long.'),
  fieldOfStudy: z
    .string()
    .min(2, 'Veuillez préciser votre filière ou domaine d\'études (ex. Informatique, Économie-Gestion, Droit).')
    .max(120, 'Filière trop longue.'),
  currentInstitution: z
    .string()
    .max(150, 'Nom d\'établissement trop long.')
    .optional()
    .or(z.literal('')),
  studyParticularities: z
    .string()
    .max(500, 'Les précisions sur le parcours ne doivent pas dépasser 500 caractères.')
    .optional()
    .or(z.literal('')),
});

/**
 * Schéma Zod pour un vœu individuel dans l'Étape 2.
 */
export const TargetWishSchema = z.object({
  id: z.string().min(1, 'Identifiant de vœu requis.'),
  programName: z
    .string()
    .trim()
    .min(2, "L'intitulé de la formation doit comporter au moins 2 caractères.")
    .max(250, 'Intitulé de formation trop long.'),
  institutionName: z
    .string()
    .trim()
    .min(2, "L'établissement ou université doit comporter au moins 2 caractères.")
    .max(250, 'Nom d\'établissement trop long.'),
  entryLevel: z.string().max(100).optional().or(z.literal('')),
  motivation: z.string().max(1500).optional().or(z.literal('')),
  status: z.enum(['DRAFT', 'SUBMITTED', 'ACCEPTED', 'REJECTED']).optional(),
});

/**
 * Schéma Zod tolérant pour un vœu dans un brouillon progressif.
 */
export const DraftTargetWishSchema = z.object({
  id: z.string().default(''),
  programName: z.string().max(250).optional().default(''),
  institutionName: z.string().max(250).optional().default(''),
  entryLevel: z.string().max(100).optional().default(''),
  motivation: z.string().max(1500).optional().default(''),
  status: z.enum(['DRAFT', 'SUBMITTED', 'ACCEPTED', 'REJECTED']).optional().default('DRAFT'),
});

/**
 * Schéma Zod Étape 2 : Formations et universités visées en France.
 * Supporte la liste dynamique de vœux ainsi que les champs dérivés pour la rétro-compatibilité.
 */
export const Step2Schema = z.object({
  targetWishes: z
    .array(TargetWishSchema)
    .min(1, 'Veuillez renseigner au moins un vœu de formation.')
    .max(10, 'Vous ne pouvez pas ajouter plus de 10 vœux.')
    .optional(),
  targetPrograms: z
    .string()
    .max(1500, 'Texte trop long.')
    .optional()
    .default(''),
  targetInstitutions: z
    .string()
    .max(1500, 'Texte trop long.')
    .optional()
    .default(''),
  reasonsForPrograms: z
    .string()
    .trim()
    .min(3, 'Veuillez expliquer brièvement vos choix de formations.')
    .max(1500, 'Explication trop longue (maximum 1500 caractères).')
    .optional()
    .or(z.literal('')),
});

/**
 * Schéma Zod Étape 3 : Projet professionnel et motifs du choix de la France.
 */
export const Step3Schema = z.object({
  reasonFrance: z
    .string()
    .trim()
    .min(3, 'Expliquez brièvement vos motivations pour poursuivre vos études en France.')
    .max(1500, 'Motivations trop longues (maximum 1500 caractères).'),
  professionalGoal: z
    .string()
    .trim()
    .min(3, 'Décrivez le métier visé ou votre projet de carrière après l\'obtention de votre diplôme.')
    .max(1500, 'Projet professionnel trop long (maximum 1500 caractères).'),
  strongSkills: z
    .string()
    .max(1000, 'Les compétences et expériences ne doivent pas dépasser 1000 caractères.')
    .optional()
    .or(z.literal('')),
});

/**
 * Schéma Zod Étape 4 : Auto-évaluation et difficultés à travailler.
 */
export const Step4Schema = z.object({
  weaknessesToWork: z
    .string()
    .max(500, 'Remarques trop longues.')
    .optional()
    .or(z.literal('')),
});

/**
 * Schéma complet du Profil Académique (requis pour valider le profil et débloquer les simulations).
 */
export const CompleteAcademicProfileSchema = Step1Schema
  .merge(Step2Schema)
  .merge(Step3Schema)
  .merge(Step4Schema)
  .extend({
    isCompleted: z.boolean().default(true),
  });

/**
 * Schéma partiel de brouillon (permet la sauvegarde progressive étape par étape sans bloquer l'étudiant).
 */
export const DraftAcademicProfileSchema = z.object({
  countryResidence: z.string().optional().default('Sénégal'),
  academicStatus: z.string().optional().default('STUDYING'),
  currentDiploma: z.string().optional().default(''),
  fieldOfStudy: z.string().optional().default(''),
  currentInstitution: z.string().optional().default(''),
  studyParticularities: z.string().optional().default(''),
  targetWishes: z.array(DraftTargetWishSchema).optional().default([]),
  targetPrograms: z.string().optional().default(''),
  targetInstitutions: z.string().optional().default(''),
  reasonsForPrograms: z.string().optional().default(''),
  reasonFrance: z.string().optional().default(''),
  professionalGoal: z.string().optional().default(''),
  strongSkills: z.string().optional().default(''),
  weaknessesToWork: z.string().optional().default(''),
  isCompleted: z.boolean().default(false),
});

export type CompleteAcademicProfileInput = z.infer<typeof CompleteAcademicProfileSchema>;
export type DraftAcademicProfileInput = z.infer<typeof DraftAcademicProfileSchema>;

/**
 * Vérifie si un profil académique est véritablement complet selon les règles de validation du système.
 * Un profil est complet s'il a été explicitement validé (isCompleted === true) avec les données obligatoires,
 * ou si l'ensemble des champs requis des étapes 1, 2 et 3 respectent le schéma complet.
 * Supporte les structures camelCase et snake_case, et préserve les profils validés existants.
 */
export function isAcademicProfileComplete(profile: unknown): boolean {
  if (!profile || typeof profile !== 'object') return false;
  const p = profile as Record<string, unknown>;

  // Récupération tolérante des champs (camelCase ou snake_case)
  const countryResidence = (p.countryResidence ?? p.country_residence ?? '').toString().trim();
  const currentDiploma = (p.currentDiploma ?? p.current_diploma ?? '').toString().trim();
  const fieldOfStudy = (p.fieldOfStudy ?? p.field_of_study ?? '').toString().trim();
  const targetPrograms = (p.targetPrograms ?? p.target_programs ?? '').toString().trim();
  const targetInstitutions = (p.targetInstitutions ?? p.target_institutions ?? '').toString().trim();
  // Fallback rétro-compatible pour reasonsForPrograms sur reasonFrance (gère chaînes vides)
  const rawReasons = (p.reasonsForPrograms ?? p.reasons_for_programs ?? '').toString().trim();
  const rawReasonFrance = (p.reasonFrance ?? p.reason_france ?? '').toString().trim();
  const reasonsForPrograms = rawReasons || rawReasonFrance;
  const reasonFrance = rawReasonFrance;
  const professionalGoal = (p.professionalGoal ?? p.professional_goal ?? '').toString().trim();
  const isCompleted = Boolean(p.isCompleted ?? p.is_completed);

  // Vérification de la présence effective des données minimales obligatoires
  const hasStep1 =
    countryResidence.length >= 2 &&
    currentDiploma.length >= 2 &&
    fieldOfStudy.length >= 2;

  const rawWishes = Array.isArray(p.targetWishes) ? p.targetWishes : [];
  const hasValidWishes = rawWishes.some(
    (w: any) => (w?.programName && w.programName.trim().length >= 2) || (w?.institutionName && w.institutionName.trim().length >= 2)
  );

  const hasStep2 =
    hasValidWishes ||
    targetPrograms.length >= 2 ||
    reasonsForPrograms.length >= 3;

  const hasStep3 =
    professionalGoal.length >= 3 &&
    reasonFrance.length >= 3;

  // Si le profil est déjà validé et enregistré comme complet
  if (isCompleted) {
    return true;
  }

  // Si non encore marqué comme validé, vérifier la présence des 3 étapes
  return hasStep1 && hasStep2 && hasStep3;
}
