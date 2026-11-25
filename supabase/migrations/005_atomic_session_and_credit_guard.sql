-- ==============================================================================
-- MIGRATION 005 (PROPOSÉE LOCALEMENT) : DÉMARRAGE ATOMIQUE ET GARANTIE DES CRÉDITS
-- SaaS d'Entraînement aux Entretiens Campus France — PrépaCampus
-- ==============================================================================

-- 1. Fonction RPC atomique : Débit de crédit et création de session dans la même transaction PostgreSQL
-- Garantit qu'un crédit n'est JAMAIS perdu si la session échoue à s'insérer,
-- et protège contre les doubles-clics et requêtes concurrentes.
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
  -- A. Contrôle d'identité strict (anti-usurpation multi-tenant)
  IF auth.uid() IS NOT NULL AND auth.uid() != p_user_id THEN
    RAISE EXCEPTION 'Opération non autorisée sur un autre compte.';
  END IF;

  -- B. Protection anti-double clic / requêtes concurrentes :
  -- Si une session 'IN_PROGRESS' a été démarrée il y a moins de 2 minutes pour cet utilisateur,
  -- la réutiliser sans débiter de crédit supplémentaire.
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

  -- C. Débit atomique du crédit
  v_new_balance := public.deduct_user_credit(p_user_id);

  IF v_new_balance = -1 THEN
    -- Solde insuffisant : aucun crédit débité, aucune session créée
    RETURN QUERY SELECT NULL::UUID, -1, FALSE;
    RETURN;
  END IF;

  -- D. Création de la session dans la même transaction PostgreSQL
  -- Si une contrainte ou erreur survient ici, PostgreSQL annule (rollback) toute la transaction,
  -- rétablissant automatiquement le solde de crédit.
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

-- 2. Fonction RPC de compensation / remboursement sécurisé
-- Permet de recréditer l'utilisateur si un incident fatal survient après le débit
CREATE OR REPLACE FUNCTION public.refund_user_credit(p_user_id UUID)
RETURNS INT AS $$
DECLARE
  v_refunded_balance INT;
BEGIN
  -- Contrôle d'identité strict
  IF auth.uid() IS NOT NULL AND auth.uid() != p_user_id THEN
    RAISE EXCEPTION 'Opération non autorisée sur un autre compte.';
  END IF;

  UPDATE public.user_credits
  SET balance = balance + 1,
      updated_at = NOW()
  WHERE user_id = p_user_id
  RETURNING balance INTO v_refunded_balance;

  RETURN COALESCE(v_refunded_balance, 0);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

-- 3. Restriction des privilèges d'accès
REVOKE ALL ON FUNCTION public.start_interview_session_atomic(UUID, JSONB) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.start_interview_session_atomic(UUID, JSONB) TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.refund_user_credit(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.refund_user_credit(UUID) TO authenticated, service_role;
