-- ==============================================================================
-- MIGRATION 003 : ÉVOLUTION DE L'ÉTAPE 1 — PARCOURS ACTUEL & SITUATION ACADÉMIQUE
-- SaaS d'Entraînement aux Entretiens Campus France — PrépaCampus
-- ==============================================================================

-- 1. Ajout de la situation académique actuelle (STUDYING, GRADUATED, EMPLOYED_OR_INTERN, GAP_YEAR, REORIENTATION, OTHER)
ALTER TABLE IF EXISTS public.academic_profiles
ADD COLUMN IF NOT EXISTS academic_status TEXT DEFAULT 'STUDYING';

-- 2. Ajout du champ facultatif pour les particularités du cursus (interruption, réorientation, etc.)
ALTER TABLE IF EXISTS public.academic_profiles
ADD COLUMN IF NOT EXISTS study_particularities TEXT DEFAULT NULL;

-- 3. Commentaires descriptifs sur les colonnes
COMMENT ON COLUMN public.academic_profiles.academic_status IS 'Situation académique actuelle (STUDYING, GRADUATED, EMPLOYED_OR_INTERN, GAP_YEAR, REORIENTATION, OTHER)';
COMMENT ON COLUMN public.academic_profiles.study_particularities IS 'Précision ou particularité sur le parcours (césure, réorientation, retard de soutenance...)';
