CREATE OR REPLACE FUNCTION public.claim_reward(p_user_machine_id TEXT)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_machine RECORD;
  v_accrued NUMERIC;
  v_unclaimed NUMERIC;
  v_balance NUMERIC;
  v_tx_id TEXT;
  v_next_lock_until TIMESTAMPTZ;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF EXISTS (SELECT 1 FROM public.profiles WHERE id = v_uid AND status = 'blocked') THEN
    RAISE EXCEPTION 'Account is blocked';
  END IF;

  SELECT * INTO v_machine FROM public.user_machines
  WHERE id = p_user_machine_id AND user_id = v_uid FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Investment machine not found'; END IF;

  v_accrued := public.investment_accrued_ugx(v_machine.created_at, v_machine.daily_reward_ugx);

  UPDATE public.user_machines
  SET accrued_rewards_ugx = v_accrued, updated_at = now()
  WHERE id = p_user_machine_id;

  IF v_machine.lock_until IS NOT NULL AND now() < v_machine.lock_until THEN
    RETURN jsonb_build_object(
      'success', false,
      'claimed_ugx', 0,
      'reason', 'locked',
      'lock_until', v_machine.lock_until,
      'accrued_ugx', v_accrued,
      'message', 'Returns are locked until the investment lock period elapses.'
    );
  END IF;

  v_unclaimed := GREATEST(0, v_accrued - COALESCE(v_machine.total_mined_ugx, 0));
  IF v_unclaimed <= 0 THEN
    RETURN jsonb_build_object(
      'success', false,
      'claimed_ugx', 0,
      'reason', 'nothing_to_claim',
      'accrued_ugx', v_accrued
    );
  END IF;

  v_next_lock_until := now() + make_interval(days => GREATEST(COALESCE(v_machine.lock_days, 0), 0));

  UPDATE public.user_machines
  SET unclaimed_rewards_ugx = 0,
      total_mined_ugx = COALESCE(total_mined_ugx, 0) + v_unclaimed,
      last_claimed_at = now(),
      accrued_rewards_ugx = v_accrued,
      lock_until = v_next_lock_until,
      updated_at = now()
  WHERE id = p_user_machine_id;

  UPDATE public.wallets
  SET total_balance_ugx = total_balance_ugx + v_unclaimed, updated_at = now()
  WHERE user_id = v_uid RETURNING total_balance_ugx INTO v_balance;

  v_tx_id := 'tx_' || lower(substring(replace(gen_random_uuid()::text,'-','') from 1 for 18));
  INSERT INTO public.transactions (id, user_id, type, amount_ugx, currency, status,
    description, is_credit, timestamp, created_at)
  VALUES (v_tx_id, v_uid, 'reward', v_unclaimed, 'UGX', 'completed',
    'Reward claimed: ' || v_machine.title, true, now(), now());

  INSERT INTO public.notifications (id, user_id, title, message, read, type)
  VALUES ('notif_' || lower(substring(replace(gen_random_uuid()::text,'-','') from 1 for 18)),
    v_uid, 'Reward Credited',
    'UGX ' || v_unclaimed::text || ' reward has been credited to your wallet.', false, 'success');

  RETURN jsonb_build_object(
    'success', true,
    'claimed_ugx', v_unclaimed,
    'new_balance', v_balance,
    'transaction_id', v_tx_id,
    'accrued_ugx', v_accrued,
    'lock_until', v_next_lock_until
  );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.claim_reward(TEXT) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.claim_reward(TEXT) TO authenticated;
