-- ==============================================================================
-- SCRIPT COMPLET D'INITIALISATION : PRÉPACAMPUS FRANCE (BASE DE DONNÉES SUPABASE)
-- Exécutez ce script dans le "SQL Editor" de votre tableau de bord Supabase
-- Projet : PrépaCampus (Entraînement officiel aux entretiens Campus France)
-- ==============================================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 1. TABLE DES PROFILS ACADÉMIQUES
CREATE TABLE IF NOT EXISTS public.academic_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  country_residence TEXT NOT NULL DEFAULT 'Sénégal',
  academic_status TEXT NOT NULL DEFAULT 'STUDYING',
  current_diploma TEXT NOT NULL DEFAULT '',
  field_of_study TEXT NOT NULL DEFAULT '',
  current_institution TEXT,
  study_particularities TEXT,
  target_wishes JSONB NOT NULL DEFAULT '[]'::jsonb,
  target_programs TEXT NOT NULL DEFAULT '',
  target_institutions TEXT NOT NULL DEFAULT '',
  reasons_for_programs TEXT,
  reason_france TEXT NOT NULL DEFAULT '',
  professional_goal TEXT NOT NULL DEFAULT '',
  strong_skills TEXT,
  weaknesses_to_work TEXT,
  is_completed BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_user_profile UNIQUE (user_id)
);

-- 2. TABLE DES CRÉDITS UTILISATEURS
CREATE TABLE IF NOT EXISTS public.user_credits (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  balance INT NOT NULL DEFAULT 1 CHECK (balance >= 0),
  has_premium_questions BOOLEAN NOT NULL DEFAULT FALSE,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE public.user_credits ADD COLUMN IF NOT EXISTS has_premium_questions BOOLEAN NOT NULL DEFAULT FALSE;

-- 3. TABLE DES SESSIONS D'ENTRETIEN
CREATE TABLE IF NOT EXISTS public.interview_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  profile_snapshot JSONB NOT NULL,
  status TEXT NOT NULL DEFAULT 'IN_PROGRESS' CHECK (status IN ('IN_PROGRESS', 'COMPLETED', 'ABANDONED', 'ERROR')),
  duration_seconds INT NOT NULL DEFAULT 0 CHECK (duration_seconds >= 0 AND duration_seconds <= 360),
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ended_at TIMESTAMPTZ
);

-- 4. TABLE DES TOURS DE PAROLE
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

-- 5. TABLE DES RAPPORTS PÉDAGOGIQUES D'ÉVALUATION
CREATE TABLE IF NOT EXISTS public.evaluation_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES public.interview_sessions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  overall_score NUMERIC(4,2) NOT NULL DEFAULT 0,
  scores_by_criteria JSONB NOT NULL,
  strengths JSONB NOT NULL,
  areas_to_improve JSONB NOT NULL,
  reformulation_examples JSONB NOT NULL,
  revision_topics JSONB NOT NULL,
  synthesis_summary TEXT NOT NULL,
  evaluation_grid_version TEXT NOT NULL DEFAULT 'v1.0.0',
  evaluation_completeness TEXT NOT NULL DEFAULT 'COMPLETE',
  is_technical_issue BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_session_report UNIQUE (session_id)
);

-- 6. TABLE DES MÉTRIQUES ET COÛTS
CREATE TABLE IF NOT EXISTS public.cost_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES public.interview_sessions(id) ON DELETE SET NULL,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  whisper_seconds NUMERIC(6,2) NOT NULL DEFAULT 0,
  tts_characters INT NOT NULL DEFAULT 0,
  estimated_cost_usd NUMERIC(8,4) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 7. TABLE DES TRANSACTIONS DE PAIEMENT (CARTE BANCAIRE & MOBILE MONEY)
CREATE TABLE IF NOT EXISTS public.payment_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  pack_id TEXT NOT NULL,
  amount_cfa INT NOT NULL DEFAULT 0,
  amount_eur INT NOT NULL DEFAULT 0,
  payment_method TEXT NOT NULL CHECK (payment_method IN ('credit_card', 'mobile_money', 'wave', 'orange_money', 'free_money', 'mtn_momo')),
  card_brand TEXT,
  card_last4 TEXT,
  card_holder TEXT,
  operator_id TEXT,
  phone_number TEXT,
  credits_added INT NOT NULL,
  status TEXT NOT NULL DEFAULT 'completed',
  reference TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- INDEX DE PERFORMANCE
CREATE INDEX IF NOT EXISTS idx_academic_profiles_user_id ON public.academic_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_interview_sessions_user_id ON public.interview_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_interview_turns_session_id ON public.interview_turns(session_id);
CREATE INDEX IF NOT EXISTS idx_evaluation_reports_user_id ON public.evaluation_reports(user_id);
CREATE INDEX IF NOT EXISTS idx_evaluation_reports_session_id ON public.evaluation_reports(session_id);
CREATE INDEX IF NOT EXISTS idx_payment_transactions_user_id ON public.payment_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_payment_transactions_reference ON public.payment_transactions(reference);

-- ACTIVATION ROW LEVEL SECURITY (RLS)
ALTER TABLE public.academic_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_credits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.interview_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.interview_turns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.evaluation_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cost_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_transactions ENABLE ROW LEVEL SECURITY;

-- POLITIQUES RLS ACADEMIC_PROFILES
DROP POLICY IF EXISTS "profil_select_own" ON public.academic_profiles;
CREATE POLICY "profil_select_own" ON public.academic_profiles FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "profil_insert_own" ON public.academic_profiles;
CREATE POLICY "profil_insert_own" ON public.academic_profiles FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "profil_update_own" ON public.academic_profiles;
CREATE POLICY "profil_update_own" ON public.academic_profiles FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "profil_delete_own" ON public.academic_profiles;
CREATE POLICY "profil_delete_own" ON public.academic_profiles FOR DELETE USING (auth.uid() = user_id);

-- POLITIQUES RLS USER_CREDITS
DROP POLICY IF EXISTS "credits_select_own" ON public.user_credits;
CREATE POLICY "credits_select_own" ON public.user_credits FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "credits_insert_own" ON public.user_credits;
CREATE POLICY "credits_insert_own" ON public.user_credits FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "credits_update_own" ON public.user_credits;
CREATE POLICY "credits_update_own" ON public.user_credits FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- POLITIQUES RLS PAYMENT_TRANSACTIONS
DROP POLICY IF EXISTS "transactions_select_own" ON public.payment_transactions;
CREATE POLICY "transactions_select_own" ON public.payment_transactions FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "transactions_insert_own" ON public.payment_transactions;
CREATE POLICY "transactions_insert_own" ON public.payment_transactions FOR INSERT WITH CHECK (auth.uid() = user_id);

-- POLITIQUES RLS INTERVIEW_SESSIONS
DROP POLICY IF EXISTS "session_select_own" ON public.interview_sessions;
CREATE POLICY "session_select_own" ON public.interview_sessions FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "session_insert_own" ON public.interview_sessions;
CREATE POLICY "session_insert_own" ON public.interview_sessions FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "session_update_own" ON public.interview_sessions;
CREATE POLICY "session_update_own" ON public.interview_sessions FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "session_delete_own" ON public.interview_sessions;
CREATE POLICY "session_delete_own" ON public.interview_sessions FOR DELETE USING (auth.uid() = user_id);

-- POLITIQUES RLS INTERVIEW_TURNS
DROP POLICY IF EXISTS "turns_select_own" ON public.interview_turns;
CREATE POLICY "turns_select_own" ON public.interview_turns FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.interview_sessions
    WHERE public.interview_sessions.id = public.interview_turns.session_id
    AND public.interview_sessions.user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "turns_insert_own" ON public.interview_turns;
CREATE POLICY "turns_insert_own" ON public.interview_turns FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.interview_sessions
    WHERE public.interview_sessions.id = public.interview_turns.session_id
    AND public.interview_sessions.user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "turns_delete_own" ON public.interview_turns;
CREATE POLICY "turns_delete_own" ON public.interview_turns FOR DELETE USING (
  EXISTS (
    SELECT 1 FROM public.interview_sessions
    WHERE public.interview_sessions.id = public.interview_turns.session_id
    AND public.interview_sessions.user_id = auth.uid()
  )
);

-- POLITIQUES RLS EVALUATION_REPORTS
DROP POLICY IF EXISTS "reports_select_own" ON public.evaluation_reports;
CREATE POLICY "reports_select_own" ON public.evaluation_reports FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "reports_insert_own" ON public.evaluation_reports;
CREATE POLICY "reports_insert_own" ON public.evaluation_reports FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "reports_update_own" ON public.evaluation_reports;
CREATE POLICY "reports_update_own" ON public.evaluation_reports FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "reports_delete_own" ON public.evaluation_reports;
CREATE POLICY "reports_delete_own" ON public.evaluation_reports FOR DELETE USING (auth.uid() = user_id);

-- FONCTIONS RPC

-- 1. Fonction RPC : Solde initial ou actuel (SECURITY DEFINER)
CREATE OR REPLACE FUNCTION public.get_or_create_user_credits(p_user_id UUID)
RETURNS INT AS $$
DECLARE
  v_balance INT;
BEGIN
  IF auth.uid() IS NOT NULL AND auth.uid() != p_user_id THEN
    RAISE EXCEPTION 'Non autorisé.';
  END IF;

  INSERT INTO public.user_credits (user_id, balance)
  VALUES (p_user_id, 1)
  ON CONFLICT (user_id) DO NOTHING;

  SELECT balance INTO v_balance FROM public.user_credits WHERE user_id = p_user_id;
  RETURN COALESCE(v_balance, 0);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

-- 2. Fonction RPC : Débit de crédit (SECURITY DEFINER)
CREATE OR REPLACE FUNCTION public.deduct_user_credit(p_user_id UUID)
RETURNS INT AS $$
DECLARE
  v_new_balance INT;
BEGIN
  IF auth.uid() IS NOT NULL AND auth.uid() != p_user_id THEN
    RAISE EXCEPTION 'Non autorisé.';
  END IF;

  UPDATE public.user_credits
  SET balance = balance - 1,
      updated_at = NOW()
  WHERE user_id = p_user_id AND balance > 0
  RETURNING balance INTO v_new_balance;

  IF NOT FOUND THEN
    RETURN -1;
  END IF;

  RETURN v_new_balance;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

-- 3. Fonction RPC : Remboursement de crédit (SECURITY DEFINER)
CREATE OR REPLACE FUNCTION public.refund_user_credit(p_user_id UUID)
RETURNS INT AS $$
DECLARE
  v_refunded_balance INT;
BEGIN
  IF auth.uid() IS NOT NULL AND auth.uid() != p_user_id THEN
    RAISE EXCEPTION 'Non autorisé.';
  END IF;

  UPDATE public.user_credits
  SET balance = balance + 1,
      updated_at = NOW()
  WHERE user_id = p_user_id
  RETURNING balance INTO v_refunded_balance;

  RETURN COALESCE(v_refunded_balance, 0);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

-- 4. Fonction RPC atomique : Débit et initialisation de session
CREATE OR REPLACE FUNCTION public.start_interview_session_atomic(
  p_user_id UUID,
  p_profile_snapshot JSONB
)
RETURNS TABLE (
  session_id UUID,
  remaining_credits INT,
  is_existing BOOLEAN
) AS $$
DECLARE
  v_new_balance INT;
  v_session_id UUID;
  v_existing_id UUID;
  v_current_balance INT;
BEGIN
  IF auth.uid() IS NOT NULL AND auth.uid() != p_user_id THEN
    RAISE EXCEPTION 'Non autorisé.';
  END IF;

  -- Protection anti double-clic (< 2 min)
  SELECT id INTO v_existing_id
  FROM public.interview_sessions
  WHERE user_id = p_user_id
    AND status = 'IN_PROGRESS'
    AND started_at > (NOW() - INTERVAL '2 minutes')
  ORDER BY started_at DESC
  LIMIT 1;

  IF v_existing_id IS NOT NULL THEN
    SELECT COALESCE(balance, 0) INTO v_current_balance
    FROM public.user_credits
    WHERE user_id = p_user_id;

    RETURN QUERY SELECT v_existing_id, v_current_balance, TRUE;
    RETURN;
  END IF;

  -- Débit atomique
  v_new_balance := public.deduct_user_credit(p_user_id);

  IF v_new_balance = -1 THEN
    RETURN QUERY SELECT NULL::UUID, -1, FALSE;
    RETURN;
  END IF;

  -- Création de session
  INSERT INTO public.interview_sessions (
    user_id,
    profile_snapshot,
    status,
    duration_seconds,
    started_at
  ) VALUES (
    p_user_id,
    p_profile_snapshot,
    'IN_PROGRESS',
    0,
    NOW()
  )
  RETURNING id INTO v_session_id;

  RETURN QUERY SELECT v_session_id, v_new_balance, FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;
