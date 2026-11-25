-- ==============================================================================
-- MIGRATION 004 : FIABILISATION DES RAPPORTS D'ÉVALUATION ET GESTION DES INCIDENTS
-- SaaS d'Entraînement aux Entretiens Campus France — PrépaCampus
-- ==============================================================================

-- 1. Ajout de la colonne evaluation_completeness pour distinguer les évaluations complètes, partielles et indisponibles
ALTER TABLE IF EXISTS public.evaluation_reports
ADD COLUMN IF NOT EXISTS evaluation_completeness TEXT DEFAULT 'COMPLETE'
CHECK (evaluation_completeness IN ('COMPLETE', 'PARTIAL', 'UNAVAILABLE'));

-- 2. Ajout de la colonne booléenne is_technical_issue indiquant une interruption ou anomalie technique (ex. micro inaudible)
ALTER TABLE IF EXISTS public.evaluation_reports
ADD COLUMN IF NOT EXISTS is_technical_issue BOOLEAN DEFAULT FALSE;

-- 3. Index de performance pour les filtres et calculs de progression sur les rapports valides
CREATE INDEX IF NOT EXISTS idx_evaluation_reports_completeness 
ON public.evaluation_reports (evaluation_completeness);

-- 4. Commentaires descriptifs sur les colonnes
COMMENT ON COLUMN public.evaluation_reports.evaluation_completeness IS 'État de complétude pédagogique du rapport : COMPLETE, PARTIAL, ou UNAVAILABLE';
COMMENT ON COLUMN public.evaluation_reports.is_technical_issue IS 'Indicateur booléen signalant si la session a rencontré un problème technique (ex. absence de flux audio)';
