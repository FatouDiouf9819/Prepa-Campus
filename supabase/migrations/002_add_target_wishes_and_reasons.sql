-- ==============================================================================
-- MIGRATION 002 : ÉVOLUTION DE L'ÉTAPE 2 — VŒUX DYNAMIQUES DE FORMATIONS
-- SaaS d'Entraînement aux Entretiens Campus France — PrépaCampus
-- ==============================================================================

-- 1. Ajout de la colonne optionnelle reasons_for_programs si elle n'existe pas
ALTER TABLE IF EXISTS public.academic_profiles
ADD COLUMN IF NOT EXISTS reasons_for_programs TEXT;

-- 2. Ajout de la colonne structurée target_wishes (JSONB) pour stocker les vœux avec métadonnées futures
ALTER TABLE IF EXISTS public.academic_profiles
ADD COLUMN IF NOT EXISTS target_wishes JSONB DEFAULT '[]'::jsonb;

-- Commentaire descriptif sur les nouvelles colonnes
COMMENT ON COLUMN public.academic_profiles.reasons_for_programs IS 'Motivations détaillées pour les formations spécifiques choisies';
COMMENT ON COLUMN public.academic_profiles.target_wishes IS 'Liste structurée des vœux de formations : [{ id, programName, institutionName, entryLevel?, motivation?, status? }]';
