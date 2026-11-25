-- ==============================================================================
-- MIGRATION 001 : SCHÉMA INITIAL ET POLITIQUES ROW LEVEL SECURITY (RLS)
-- SaaS d'Entraînement aux Entretiens Campus France
-- ==============================================================================

-- 1. Table des profils académiques des étudiants
CREATE TABLE IF NOT EXISTS public.academic_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  country_residence TEXT NOT NULL DEFAULT 'Sénégal',
  current_diploma TEXT NOT NULL,
  field_of_study TEXT NOT NULL,
  current_institution TEXT,
  target_programs TEXT NOT NULL,
  target_institutions TEXT NOT NULL,
  reason_france TEXT NOT NULL,
  professional_goal TEXT NOT NULL,
  strong_skills TEXT,
  weaknesses_to_work TEXT,
  is_completed BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_user_profile UNIQUE (user_id)
);

-- 2. Table des crédits utilisateurs
CREATE TABLE IF NOT EXISTS public.user_credits (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  balance INT NOT NULL DEFAULT 1 CHECK (balance >= 0),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Table des sessions de simulation d'entretien
CREATE TABLE IF NOT EXISTS public.interview_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  profile_snapshot JSONB NOT NULL,
  status TEXT NOT NULL DEFAULT 'IN_PROGRESS' CHECK (status IN ('IN_PROGRESS', 'COMPLETED', 'ABANDONED', 'ERROR')),
  duration_seconds INT NOT NULL DEFAULT 0 CHECK (duration_seconds >= 0 AND duration_seconds <= 360),
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ended_at TIMESTAMPTZ
);

-- 4. Table des tours de parole (questions IA et réponses transcrites)
CREATE TABLE IF NOT EXISTS public.interview_turns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES public.interview_sessions(id) ON DELETE CASCADE,
  turn_index INT NOT NULL,
  ai_question TEXT NOT NULL,
  pedagogical_intent TEXT NOT NULL,
  student_transcript TEXT NOT NULL,
  is_followup BOOLEAN NOT NULL DEFAULT FALSE,
  duration_seconds INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. Table des rapports pédagogiques d'évaluation
CREATE TABLE IF NOT EXISTS public.evaluation_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES public.interview_sessions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  overall_score INT NOT NULL CHECK (overall_score BETWEEN 0 AND 100),
  scores_by_criteria JSONB NOT NULL,
  strengths JSONB NOT NULL,
  areas_to_improve JSONB NOT NULL,
  reformulation_examples JSONB NOT NULL,
  revision_topics JSONB NOT NULL,
  synthesis_summary TEXT NOT NULL,
  evaluation_grid_version TEXT NOT NULL DEFAULT 'v1.0.0',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_session_report UNIQUE (session_id)
);

-- 6. Table de suivi des coûts d'API (audits & gestion financière)
CREATE TABLE IF NOT EXISTS public.cost_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES public.interview_sessions(id) ON DELETE CASCADE,
  prompt_tokens INT NOT NULL DEFAULT 0,
  completion_tokens INT NOT NULL DEFAULT 0,
  whisper_seconds NUMERIC(6,2) NOT NULL DEFAULT 0,
  tts_characters INT NOT NULL DEFAULT 0,
  estimated_cost_usd NUMERIC(8,4) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ==============================================================================
-- ACTIVATION STRICTE DE ROW LEVEL SECURITY (RLS) SUR TOUTES LES TABLES
-- ==============================================================================

ALTER TABLE public.academic_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_credits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.interview_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.interview_turns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.evaluation_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cost_metrics ENABLE ROW LEVEL SECURITY;

-- ==============================================================================
-- INDEX DE PERFORMANCE SUR LES CLÉS ÉTRANGÈRES
-- ==============================================================================

CREATE INDEX IF NOT EXISTS idx_academic_profiles_user_id ON public.academic_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_interview_sessions_user_id ON public.interview_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_interview_turns_session_id ON public.interview_turns(session_id);
CREATE INDEX IF NOT EXISTS idx_evaluation_reports_user_id ON public.evaluation_reports(user_id);
CREATE INDEX IF NOT EXISTS idx_evaluation_reports_session_id ON public.evaluation_reports(session_id);
CREATE INDEX IF NOT EXISTS idx_cost_metrics_session_id ON public.cost_metrics(session_id);

-- ==============================================================================
-- POLITIQUES DE SÉCURITÉ PAR TABLE (ISOLATION STRICTE MULTI-TENANT & IDEMPOTENCE)
-- ==============================================================================

-- A. academic_profiles : Un étudiant ne peut voir, créer, modifier ou supprimer que son propre profil
DROP POLICY IF EXISTS "profil_select_own" ON public.academic_profiles;
CREATE POLICY "profil_select_own" ON public.academic_profiles
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "profil_insert_own" ON public.academic_profiles;
CREATE POLICY "profil_insert_own" ON public.academic_profiles
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "profil_update_own" ON public.academic_profiles;
CREATE POLICY "profil_update_own" ON public.academic_profiles
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "profil_delete_own" ON public.academic_profiles;
CREATE POLICY "profil_delete_own" ON public.academic_profiles
  FOR DELETE USING (auth.uid() = user_id);

-- B. user_credits : L'étudiant peut uniquement CONSULTER son solde.
-- Toute modification (décrémentation/crédit) est réservée au SERVICE_ROLE ou aux fonctions SECURITY DEFINER.
DROP POLICY IF EXISTS "credits_select_own" ON public.user_credits;
CREATE POLICY "credits_select_own" ON public.user_credits
  FOR SELECT USING (auth.uid() = user_id);

-- C. interview_sessions : Accès limité aux sessions de l'utilisateur connecté
DROP POLICY IF EXISTS "session_select_own" ON public.interview_sessions;
CREATE POLICY "session_select_own" ON public.interview_sessions
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "session_insert_own" ON public.interview_sessions;
CREATE POLICY "session_insert_own" ON public.interview_sessions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "session_update_own" ON public.interview_sessions;
CREATE POLICY "session_update_own" ON public.interview_sessions
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "session_delete_own" ON public.interview_sessions;
CREATE POLICY "session_delete_own" ON public.interview_sessions
  FOR DELETE USING (auth.uid() = user_id);

-- D. interview_turns : Accès conditionné à l'appartenance de la session parente
DROP POLICY IF EXISTS "turns_select_own" ON public.interview_turns;
CREATE POLICY "turns_select_own" ON public.interview_turns
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.interview_sessions
      WHERE public.interview_sessions.id = public.interview_turns.session_id
      AND public.interview_sessions.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "turns_insert_own" ON public.interview_turns;
CREATE POLICY "turns_insert_own" ON public.interview_turns
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.interview_sessions
      WHERE public.interview_sessions.id = public.interview_turns.session_id
      AND public.interview_sessions.user_id = auth.uid()
    )
  );

-- E. evaluation_reports : L'étudiant accède uniquement à ses propres rapports
DROP POLICY IF EXISTS "reports_select_own" ON public.evaluation_reports;
CREATE POLICY "reports_select_own" ON public.evaluation_reports
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "reports_insert_own" ON public.evaluation_reports;
CREATE POLICY "reports_insert_own" ON public.evaluation_reports
  FOR INSERT WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM public.interview_sessions
      WHERE public.interview_sessions.id = public.evaluation_reports.session_id
      AND public.interview_sessions.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "reports_update_own" ON public.evaluation_reports;
CREATE POLICY "reports_update_own" ON public.evaluation_reports
  FOR UPDATE USING (auth.uid() = user_id)
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM public.interview_sessions
      WHERE public.interview_sessions.id = public.evaluation_reports.session_id
      AND public.interview_sessions.user_id = auth.uid()
    )
  );

-- F. cost_metrics : Données sensibles d'audit réservées à l'administration via service_role
-- (Pas de politique SELECT publique : seul le service role serveur peut y accéder).

-- ==============================================================================
-- FONCTIONS SÉCURISÉES POUR LA GESTION ATOMIQUE DES CRÉDITS
-- ==============================================================================

-- 1. Récupérer ou initialiser le solde d'un utilisateur (1 simulation de bienvenue)
CREATE OR REPLACE FUNCTION public.get_or_create_user_credits(p_user_id UUID)
RETURNS INT AS $$
DECLARE
  v_balance INT;
BEGIN
  -- Sécurité : un utilisateur authentifié ne peut pas inspecter le solde d'un tiers
  IF auth.uid() IS NOT NULL AND auth.uid() != p_user_id THEN
    RAISE EXCEPTION 'Opération non autorisée sur un autre compte.';
  END IF;

  SELECT balance INTO v_balance FROM public.user_credits WHERE user_id = p_user_id;
  IF v_balance IS NULL THEN
    INSERT INTO public.user_credits (user_id, balance)
    VALUES (p_user_id, 1)
    ON CONFLICT (user_id) DO NOTHING;
    SELECT balance INTO v_balance FROM public.user_credits WHERE user_id = p_user_id;
  END IF;
  RETURN COALESCE(v_balance, 0);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

-- 2. Déduire un crédit de façon atomique côté serveur (retourne le nouveau solde ou -1 si insuffisant)
CREATE OR REPLACE FUNCTION public.deduct_user_credit(p_user_id UUID)
RETURNS INT AS $$
DECLARE
  v_new_balance INT;
BEGIN
  -- Sécurité : un utilisateur authentifié ne peut pas déduire les crédits d'un tiers
  IF auth.uid() IS NOT NULL AND auth.uid() != p_user_id THEN
    RAISE EXCEPTION 'Opération non autorisée sur un autre compte.';
  END IF;

  -- Garantir l'existence du solde initial
  PERFORM public.get_or_create_user_credits(p_user_id);

  UPDATE public.user_credits
  SET balance = balance - 1,
      updated_at = NOW()
  WHERE user_id = p_user_id AND balance > 0
  RETURNING balance INTO v_new_balance;

  IF v_new_balance IS NULL THEN
    RETURN -1; -- Solde insuffisant (0 crédit restant)
  END IF;

  RETURN v_new_balance;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

-- Restriction des privilèges d'exécution aux rôles autorisés uniquement
REVOKE ALL ON FUNCTION public.get_or_create_user_credits(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_or_create_user_credits(UUID) TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.deduct_user_credit(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.deduct_user_credit(UUID) TO authenticated, service_role;

-- ==============================================================================
-- TRIGGER POUR LA CRÉATION DU SOLDE INITIAL DE CRÉDITS (1 simulation offerte)
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.user_credits (user_id, balance)
  VALUES (new.id, 1)
  ON CONFLICT (user_id) DO NOTHING;
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC;
