-- Fleetvest: platform settings, investment lock period, audit trail, referral rate from DB.
-- Run in Supabase SQL Editor if the CLI is not used. Safe to re-run (IF NOT EXISTS / CREATE OR REPLACE).

-- ============================================================
-- 1. SYSTEM SETTINGS (single row)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.system_settings (
  id TEXT PRIMARY KEY DEFAULT 'global_config',
  referral_percentage NUMERIC NOT NULL DEFAULT 20,
  min_withdraw_ugx NUMERIC NOT NULL DEFAULT 10000,
  min_deposit_ugx NUMERIC NOT NULL DEFAULT 15000,
  withdrawal_fee_rate NUMERIC NOT NULL DEFAULT 0.15,
  welcome_bonus_ugx NUMERIC NOT NULL DEFAULT 4000,
  daily_reward_rate NUMERIC NOT NULL DEFAULT 0.05,
  investment_lock_days INTEGER NOT NULL DEFAULT 60,
  updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_by TEXT
);

INSERT INTO public.system_settings (id)
VALUES ('global_config')
ON CONFLICT (id) DO NOTHING;

ALTER TABLE public.system_settings
  ADD COLUMN IF NOT EXISTS investment_lock_days INTEGER NOT NULL DEFAULT 60;

ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "settings_select_auth" ON public.system_settings;
CREATE POLICY "settings_select_auth" ON public.system_settings
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "settings_no_client_write" ON public.system_settings;
-- No INSERT/UPDATE/DELETE policies for authenticated: writes only via SECURITY DEFINER RPCs.

-- ============================================================
-- 2. INVESTMENT LOCK COLUMNS (existing rows stay claimable)
-- ============================================================
ALTER TABLE public.user_machines
  ADD COLUMN IF NOT EXISTS lock_days INTEGER,
  ADD COLUMN IF NOT EXISTS lock_until TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS last_claimed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS accrued_rewards_ugx NUMERIC DEFAULT 0;

UPDATE public.user_machines
SET lock_days = 0,
    lock_until = created_at
WHERE lock_until IS NULL;

-- ============================================================
-- 3. TRANSACTION REVIEW METADATA
-- ============================================================
ALTER TABLE public.transactions
  ADD COLUMN IF NOT EXISTS reviewed_by UUID,
  ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMPTZ;

-- ============================================================
-- 4. ADMIN AUDIT LOG
-- ============================================================
CREATE TABLE IF NOT EXISTS public.admin_audit_log (
  id TEXT PRIMARY KEY,
  admin_id UUID NOT NULL,
  admin_username TEXT,
  action_type TEXT NOT NULL,
  target_type TEXT,
  target_id TEXT,
  old_value JSONB,
  new_value JSONB,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS admin_audit_log_created_at_idx ON public.admin_audit_log (created_at DESC);
CREATE INDEX IF NOT EXISTS admin_audit_log_admin_id_idx ON public.admin_audit_log (admin_id);
CREATE INDEX IF NOT EXISTS user_machines_user_id_idx ON public.user_machines (user_id);
CREATE INDEX IF NOT EXISTS transactions_user_status_idx ON public.transactions (user_id, status);

ALTER TABLE public.admin_audit_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "audit_admin_select" ON public.admin_audit_log;
CREATE POLICY "audit_admin_select" ON public.admin_audit_log
  FOR SELECT TO authenticated
  USING (public.is_admin());

CREATE OR REPLACE FUNCTION public.write_admin_audit(
  p_action TEXT,
  p_target_type TEXT,
  p_target_id TEXT,
  p_old JSONB DEFAULT NULL,
  p_new JSONB DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_name TEXT;
BEGIN
  IF v_uid IS NULL THEN RETURN; END IF;
  SELECT username INTO v_name FROM public.profiles WHERE id = v_uid;
  INSERT INTO public.admin_audit_log (id, admin_id, admin_username, action_type, target_type, target_id, old_value, new_value)
  VALUES (
    'aud_' || lower(substring(replace(gen_random_uuid()::text, '-', '') from 1 for 18)),
    v_uid, v_name, p_action, p_target_type, p_target_id, p_old, p_new
  );
END;
$$;

-- ============================================================
-- 5. SETTINGS HELPERS
-- ============================================================
CREATE OR REPLACE FUNCTION public.get_platform_settings()
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_row public.system_settings;
BEGIN
  SELECT * INTO v_row FROM public.system_settings WHERE id = 'global_config';
  IF NOT FOUND THEN
    INSERT INTO public.system_settings (id) VALUES ('global_config') RETURNING * INTO v_row;
  END IF;
  RETURN jsonb_build_object(
    'referral_percentage', v_row.referral_percentage,
    'min_withdraw_ugx', v_row.min_withdraw_ugx,
    'min_deposit_ugx', v_row.min_deposit_ugx,
    'withdrawal_fee_rate', v_row.withdrawal_fee_rate,
    'welcome_bonus_ugx', v_row.welcome_bonus_ugx,
    'daily_reward_rate', v_row.daily_reward_rate,
    'investment_lock_days', v_row.investment_lock_days,
    'updated_at', v_row.updated_at,
    'updated_by', v_row.updated_by
  );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.get_platform_settings() FROM anon, public;
GRANT EXECUTE ON FUNCTION public.get_platform_settings() TO authenticated;

CREATE OR REPLACE FUNCTION public.referral_rate()
RETURNS NUMERIC
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT COALESCE((SELECT referral_percentage FROM public.system_settings WHERE id = 'global_config'), 20) / 100.0;
$$;

CREATE OR REPLACE FUNCTION public.admin_update_system_settings(
  p_referral_percentage NUMERIC DEFAULT NULL,
  p_min_withdraw_ugx NUMERIC DEFAULT NULL,
  p_min_deposit_ugx NUMERIC DEFAULT NULL,
  p_withdrawal_fee_rate NUMERIC DEFAULT NULL,
  p_welcome_bonus_ugx NUMERIC DEFAULT NULL,
  p_daily_reward_rate NUMERIC DEFAULT NULL,
  p_investment_lock_days INTEGER DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_old public.system_settings;
  v_new public.system_settings;
BEGIN
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'Admin access required'; END IF;

  SELECT * INTO v_old FROM public.system_settings WHERE id = 'global_config' FOR UPDATE;
  IF NOT FOUND THEN
    INSERT INTO public.system_settings (id) VALUES ('global_config');
    SELECT * INTO v_old FROM public.system_settings WHERE id = 'global_config' FOR UPDATE;
  END IF;

  UPDATE public.system_settings
  SET
    referral_percentage = COALESCE(GREATEST(0, LEAST(100, p_referral_percentage)), referral_percentage),
    min_withdraw_ugx = COALESCE(GREATEST(0, p_min_withdraw_ugx), min_withdraw_ugx),
    min_deposit_ugx = COALESCE(GREATEST(0, p_min_deposit_ugx), min_deposit_ugx),
    withdrawal_fee_rate = COALESCE(GREATEST(0, LEAST(0.5, p_withdrawal_fee_rate)), withdrawal_fee_rate),
    welcome_bonus_ugx = COALESCE(GREATEST(0, p_welcome_bonus_ugx), welcome_bonus_ugx),
    daily_reward_rate = COALESCE(GREATEST(0, p_daily_reward_rate), daily_reward_rate),
    investment_lock_days = COALESCE(GREATEST(0, p_investment_lock_days), investment_lock_days),
    updated_at = now(),
    updated_by = (SELECT username FROM public.profiles WHERE id = auth.uid())
  WHERE id = 'global_config'
  RETURNING * INTO v_new;

  PERFORM public.write_admin_audit(
    'settings_update',
    'system_settings',
    'global_config',
    to_jsonb(v_old),
    to_jsonb(v_new)
  );

  RETURN public.get_platform_settings();
END;
$$;

REVOKE EXECUTE ON FUNCTION public.admin_update_system_settings(NUMERIC,NUMERIC,NUMERIC,NUMERIC,NUMERIC,NUMERIC,INTEGER) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.admin_update_system_settings(NUMERIC,NUMERIC,NUMERIC,NUMERIC,NUMERIC,NUMERIC,INTEGER) TO authenticated;

-- ============================================================
-- 6. SUBMIT TRANSACTION — enforce min withdrawal from settings
-- ============================================================
CREATE OR REPLACE FUNCTION public.submit_transaction(
  p_type TEXT,
  p_amount_ugx NUMERIC,
  p_description TEXT DEFAULT NULL,
  p_payment_method TEXT DEFAULT NULL,
  p_recipient_info TEXT DEFAULT NULL
)
RETURNS public.transactions
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_id TEXT;
  v_uid UUID := auth.uid();
  v_wallet public.wallets;
  v_res public.transactions;
  v_min NUMERIC;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF EXISTS (SELECT 1 FROM public.profiles WHERE id = v_uid AND status = 'blocked') THEN
    RAISE EXCEPTION 'Account is blocked';
  END IF;
  IF p_type NOT IN ('deposit','withdraw') THEN RAISE EXCEPTION 'Invalid transaction type'; END IF;
  IF p_amount_ugx IS NULL OR p_amount_ugx <= 0 THEN RAISE EXCEPTION 'Amount must be greater than zero'; END IF;

  SELECT * INTO v_wallet FROM public.wallets WHERE user_id = v_uid FOR UPDATE;
  IF p_type = 'withdraw' THEN
    IF NOT FOUND THEN RAISE EXCEPTION 'Wallet not found'; END IF;
    SELECT COALESCE(min_withdraw_ugx, 10000) INTO v_min FROM public.system_settings WHERE id = 'global_config';
    IF v_min IS NULL THEN v_min := 10000; END IF;
    IF p_amount_ugx < v_min THEN
      RAISE EXCEPTION 'Minimum withdrawal is UGX %', v_min;
    END IF;
    IF p_amount_ugx > v_wallet.total_balance_ugx THEN
      RAISE EXCEPTION 'Insufficient balance: requested %, available %', p_amount_ugx, v_wallet.total_balance_ugx;
    END IF;
  END IF;

  v_id := 'tx_' || lower(substring(replace(gen_random_uuid()::text,'-','') from 1 for 18));

  INSERT INTO public.transactions (id, user_id, type, amount_ugx, currency, status,
    description, payment_method, recipient_info, timestamp, created_at)
  VALUES (v_id, v_uid, p_type, p_amount_ugx, 'UGX', 'pending',
    COALESCE(p_description, p_type || ' Request — UGX ' || p_amount_ugx::text),
    p_payment_method, p_recipient_info,
    now(), now())
  RETURNING * INTO v_res;

  INSERT INTO public.notifications (id, user_id, title, message, read, type)
  VALUES ('notif_submit_' || v_id, v_uid,
    CASE WHEN p_type='deposit' THEN 'Deposit Submitted (Pending)' ELSE 'Withdrawal Submitted (Pending)' END,
    CASE WHEN p_type='deposit'
      THEN 'Your deposit of UGX ' || p_amount_ugx::text || ' is pending approval.'
      ELSE 'Your withdrawal of UGX ' || p_amount_ugx::text || ' is pending approval.'
    END, false, 'info')
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.admin_tasks (id, user_id, transaction_id, title, description,
    priority, type, status, amount_ugx, created_at)
  VALUES ('task_' || lower(substring(replace(gen_random_uuid()::text,'-','') from 1 for 18)),
    v_uid, v_id,
    CASE WHEN p_type='deposit' THEN 'Deposit Verification: UGX ' || p_amount_ugx::text
         ELSE 'Withdrawal Review: UGX ' || p_amount_ugx::text END,
    'User requested ' || p_type || ' of UGX ' || p_amount_ugx::text || COALESCE(' via ' || p_payment_method,''),
    'high', p_type, 'pending', p_amount_ugx, now())
  ON CONFLICT DO NOTHING;

  RETURN v_res;
END;
$$;

-- ============================================================
-- 7. APPROVE / REJECT — idempotent, audit, reviewed_by
-- ============================================================
CREATE OR REPLACE FUNCTION public.admin_approve_transaction(p_transaction_id TEXT)
RETURNS NUMERIC
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_uid UUID;
  v_type TEXT;
  v_amount NUMERIC;
  v_status TEXT;
  v_balance NUMERIC;
BEGIN
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'Admin access required'; END IF;

  SELECT user_id, type, amount_ugx, status INTO v_uid, v_type, v_amount, v_status
  FROM public.transactions
  WHERE id = p_transaction_id
  FOR UPDATE;

  IF NOT FOUND THEN RAISE EXCEPTION 'Transaction not found'; END IF;
  IF v_status IS DISTINCT FROM 'pending' THEN
    RAISE EXCEPTION 'Transaction has already been %', v_status;
  END IF;

  UPDATE public.transactions
  SET status = 'completed',
      reviewed_by = auth.uid(),
      reviewed_at = now()
  WHERE id = p_transaction_id;

  SELECT total_balance_ugx INTO v_balance FROM public.wallets
  WHERE user_id = v_uid FOR UPDATE;

  IF v_type = 'deposit' THEN
    UPDATE public.wallets
    SET total_balance_ugx = total_balance_ugx + v_amount, updated_at = now()
    WHERE user_id = v_uid
    RETURNING total_balance_ugx INTO v_balance;
  ELSIF v_type = 'withdraw' THEN
    IF v_amount > COALESCE(v_balance, 0) THEN
      RAISE EXCEPTION 'Insufficient balance for withdrawal approval';
    END IF;
    UPDATE public.wallets
    SET total_balance_ugx = total_balance_ugx - v_amount, updated_at = now()
    WHERE user_id = v_uid
    RETURNING total_balance_ugx INTO v_balance;
  END IF;

  UPDATE public.admin_tasks SET status = 'approved'
  WHERE transaction_id = p_transaction_id AND status = 'pending';

  INSERT INTO public.notifications (id, user_id, title, message, read, type)
  VALUES (
    'notif_txappr_' || p_transaction_id, v_uid,
    CASE WHEN v_type = 'deposit' THEN 'Deposit Approved' ELSE 'Withdrawal Approved' END,
    CASE WHEN v_type = 'deposit'
      THEN 'Your deposit of UGX ' || v_amount::text || ' has been approved and credited to your balance.'
      ELSE 'Your withdrawal of UGX ' || v_amount::text || ' has been approved and settled.'
    END,
    false, 'success'
  ) ON CONFLICT (id) DO NOTHING;

  PERFORM public.write_admin_audit(
    CASE WHEN v_type = 'deposit' THEN 'deposit_approve' ELSE 'withdrawal_approve' END,
    'transaction', p_transaction_id,
    jsonb_build_object('status', 'pending', 'amount_ugx', v_amount, 'user_id', v_uid),
    jsonb_build_object('status', 'completed', 'new_balance', v_balance)
  );

  RETURN v_balance;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_reject_transaction(p_transaction_id TEXT)
RETURNS NUMERIC
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_uid UUID;
  v_amount NUMERIC;
  v_type TEXT;
  v_status TEXT;
  v_balance NUMERIC;
BEGIN
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'Admin access required'; END IF;

  SELECT user_id, amount_ugx, type, status INTO v_uid, v_amount, v_type, v_status
  FROM public.transactions
  WHERE id = p_transaction_id
  FOR UPDATE;

  IF NOT FOUND THEN RAISE EXCEPTION 'Transaction not found'; END IF;
  IF v_status IS DISTINCT FROM 'pending' THEN
    RAISE EXCEPTION 'Transaction has already been %', v_status;
  END IF;

  UPDATE public.transactions
  SET status = 'rejected', reviewed_by = auth.uid(), reviewed_at = now()
  WHERE id = p_transaction_id;

  SELECT total_balance_ugx INTO v_balance FROM public.wallets WHERE user_id = v_uid;

  UPDATE public.admin_tasks SET status = 'rejected'
  WHERE transaction_id = p_transaction_id AND status = 'pending';

  INSERT INTO public.notifications (id, user_id, title, message, read, type)
  VALUES (
    'notif_txrej_' || p_transaction_id, v_uid,
    'Transaction Rejected',
    'Your request of UGX ' || v_amount::text || ' was rejected by an administrator. Your balance was not changed.',
    false, 'warning'
  ) ON CONFLICT (id) DO NOTHING;

  PERFORM public.write_admin_audit(
    CASE WHEN v_type = 'deposit' THEN 'deposit_reject' ELSE 'withdrawal_reject' END,
    'transaction', p_transaction_id,
    jsonb_build_object('status', 'pending', 'amount_ugx', v_amount, 'user_id', v_uid),
    jsonb_build_object('status', 'rejected')
  );

  RETURN v_balance;
END;
$$;

-- ============================================================
-- 8. BUY INVESTMENT — snapshot lock period from settings
-- ============================================================
CREATE OR REPLACE FUNCTION public.buy_investment(
  p_machine_id TEXT, p_title TEXT, p_category TEXT, p_image TEXT,
  p_amount_ugx NUMERIC, p_daily_reward_ugx NUMERIC,
  p_hashrate TEXT DEFAULT '10.0 TH/s', p_power_source TEXT DEFAULT 'Clean Energy Array',
  p_est_roi NUMERIC DEFAULT 120)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_balance NUMERIC; v_user_machine_id TEXT; v_tx_id TEXT;
  v_catalog RECORD;
  v_lock_days INTEGER := 60;
  v_lock_until TIMESTAMPTZ;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF p_amount_ugx IS NULL OR p_amount_ugx <= 0 THEN RAISE EXCEPTION 'Amount must be positive'; END IF;
  IF EXISTS (SELECT 1 FROM public.profiles WHERE id = v_uid AND status='blocked') THEN
    RAISE EXCEPTION 'Account is blocked. Investment purchases are disabled.';
  END IF;

  SELECT * INTO v_catalog FROM public.catalog_machines WHERE id = p_machine_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Investment product not found in catalog'; END IF;
  IF p_amount_ugx < v_catalog.min_invest_ugx THEN
    RAISE EXCEPTION 'Minimum investment for % is UGX %', v_catalog.title, v_catalog.min_invest_ugx;
  END IF;

  SELECT COALESCE(investment_lock_days, 60) INTO v_lock_days
  FROM public.system_settings WHERE id = 'global_config';
  IF v_lock_days IS NULL THEN v_lock_days := 60; END IF;
  v_lock_until := now() + make_interval(days => v_lock_days);

  SELECT total_balance_ugx INTO v_balance FROM public.wallets WHERE user_id = v_uid FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Wallet not found'; END IF;
  IF p_amount_ugx > v_balance THEN
    RAISE EXCEPTION 'Insufficient balance: requires %, available %', p_amount_ugx, v_balance;
  END IF;

  UPDATE public.wallets
  SET total_balance_ugx = total_balance_ugx - p_amount_ugx,
      active_machines_count = active_machines_count + 1,
      updated_at = now()
  WHERE user_id = v_uid RETURNING total_balance_ugx INTO v_balance;

  v_user_machine_id := 'node_' || lower(substring(replace(gen_random_uuid()::text,'-','') from 1 for 16));
  INSERT INTO public.user_machines (id, user_id, machine_id, title, category, image,
    daily_reward_ugx, status, est_yearly_roi, min_invest_ugx, amount_invested_ugx,
    hashrate, power_source, total_mined_ugx, unclaimed_rewards_ugx, is_boosted,
    lock_days, lock_until, accrued_rewards_ugx, created_at, updated_at)
  VALUES (v_user_machine_id, v_uid, p_machine_id,
    COALESCE(NULLIF(p_title,''), v_catalog.title), COALESCE(p_category, v_catalog.category),
    COALESCE(NULLIF(p_image,''), v_catalog.image),
    COALESCE(p_daily_reward_ugx, v_catalog.daily_reward_ugx), 'Active',
    COALESCE(p_est_roi, v_catalog.est_yearly_roi), p_amount_ugx, p_amount_ugx,
    COALESCE(p_hashrate, v_catalog.hashrate), COALESCE(p_power_source, v_catalog.power_source),
    0, 0, false, v_lock_days, v_lock_until, 0, now(), now());

  v_tx_id := 'tx_' || lower(substring(replace(gen_random_uuid()::text,'-','') from 1 for 18));
  INSERT INTO public.transactions (id, user_id, type, amount_ugx, currency, status,
    description, is_credit, timestamp, created_at)
  VALUES (v_tx_id, v_uid, 'investment', p_amount_ugx, 'UGX', 'completed',
    'Fleetvest investment: ' || COALESCE(NULLIF(p_title,''), v_catalog.title), false,
    now(), now());

  INSERT INTO public.notifications (id, user_id, title, message, read, type)
  VALUES ('notif_' || lower(substring(replace(gen_random_uuid()::text,'-','') from 1 for 18)),
    v_uid, 'Investment Created',
    'Your investment of UGX ' || p_amount_ugx::text || ' in ' || COALESCE(NULLIF(p_title,''), v_catalog.title)
      || ' is locked for ' || v_lock_days::text || ' days. Returns accrue during the lock and become claimable afterward.',
    false, 'success');

  RETURN jsonb_build_object('success', true, 'new_balance', v_balance,
    'user_machine_id', v_user_machine_id, 'transaction_id', v_tx_id,
    'lock_until', v_lock_until, 'lock_days', v_lock_days);
END;
$$;

-- ============================================================
-- 9. CLAIM REWARD — server time, lock enforced, idempotent
-- ============================================================
CREATE OR REPLACE FUNCTION public.investment_accrued_ugx(p_created_at TIMESTAMPTZ, p_daily NUMERIC)
RETURNS NUMERIC
LANGUAGE sql IMMUTABLE
AS $$
  SELECT ROUND(
    GREATEST(0, FLOOR(EXTRACT(EPOCH FROM (now() - p_created_at)) / 86400))
    * COALESCE(p_daily, 0)
  );
$$;

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

  UPDATE public.user_machines
  SET unclaimed_rewards_ugx = 0,
      total_mined_ugx = COALESCE(total_mined_ugx, 0) + v_unclaimed,
      last_claimed_at = now(),
      accrued_rewards_ugx = v_accrued,
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
    'accrued_ugx', v_accrued
  );
END;
$$;

-- ============================================================
-- 10. REFERRAL FUNCTIONS — percentage from settings
-- ============================================================
CREATE OR REPLACE FUNCTION public.process_referral(p_referral_code TEXT)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_referrer_id UUID;
  v_referrer_username TEXT;
  v_new_username TEXT;
  v_pct NUMERIC;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF p_referral_code IS NULL OR btrim(p_referral_code) = '' THEN
    RETURN jsonb_build_object('applied', false, 'reason', 'no_code');
  END IF;

  SELECT id, username INTO v_referrer_id, v_referrer_username
  FROM public.profiles
  WHERE lower(referral_code) = lower(btrim(p_referral_code))
    AND id <> v_uid
  LIMIT 1;

  IF v_referrer_id IS NULL THEN
    RETURN jsonb_build_object('applied', false, 'reason', 'invalid_or_self_code');
  END IF;

  UPDATE public.profiles
  SET referred_by = btrim(p_referral_code), updated_at = now()
  WHERE id = v_uid AND (referred_by IS NULL OR referred_by = '');

  SELECT username INTO v_new_username FROM public.profiles WHERE id = v_uid;

  UPDATE public.profiles
  SET referral_count = (SELECT COUNT(*) FROM public.profiles WHERE lower(referred_by) = lower(btrim(p_referral_code))),
      updated_at = now()
  WHERE id = v_referrer_id;

  SELECT COALESCE(referral_percentage, 20) INTO v_pct FROM public.system_settings WHERE id = 'global_config';

  INSERT INTO public.notifications (id, user_id, title, message, read, type)
  VALUES ('notif_refjoin_' || v_uid::text, v_referrer_id,
          'New Referral Joined',
          'A new partner (@' || COALESCE(v_new_username, 'partner') || ') registered using your referral code. You will earn '
            || COALESCE(v_pct, 20)::text || '% commission once their deposit is approved.',
          false, 'info')
  ON CONFLICT (id) DO NOTHING;

  RETURN jsonb_build_object('applied', true, 'referrer_id', v_referrer_id);
END;
$$;

CREATE OR REPLACE FUNCTION public.get_referral_summary()
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_ref_code TEXT;
  v_total_referrals INTEGER := 0;
  v_total_approved_deposits NUMERIC := 0;
  v_total_commission NUMERIC := 0;
  v_claimed_commission NUMERIC := 0;
  v_available_commission NUMERIC := 0;
  v_rate NUMERIC;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  v_rate := public.referral_rate();

  SELECT referral_code INTO v_ref_code FROM public.profiles WHERE id = v_uid;
  IF v_ref_code IS NULL OR v_ref_code = '' THEN
    RETURN jsonb_build_object(
      'total_referrals', 0,
      'available_commission_ugx', 0,
      'total_commission_ugx', 0,
      'claimed_commission_ugx', 0,
      'referral_code', '',
      'referral_percentage', v_rate * 100
    );
  END IF;

  SELECT COUNT(*) INTO v_total_referrals
  FROM public.profiles
  WHERE lower(referred_by) = lower(v_ref_code) AND id <> v_uid;

  SELECT COALESCE(SUM(t.amount_ugx), 0) INTO v_total_approved_deposits
  FROM public.transactions t
  INNER JOIN public.profiles p ON p.id = t.user_id
  WHERE lower(p.referred_by) = lower(v_ref_code)
    AND p.id <> v_uid
    AND t.type = 'deposit'
    AND t.status IN ('completed', 'approved');

  v_total_commission := ROUND(v_total_approved_deposits * v_rate);

  SELECT COALESCE(SUM(amount_ugx), 0) INTO v_claimed_commission
  FROM public.transactions
  WHERE user_id = v_uid
    AND status = 'completed'
    AND type IN ('bonus', 'reward')
    AND (
      id LIKE 'tx_claim_ref_%'
      OR id LIKE 'tx_refcomm_%'
      OR description ILIKE '%referral commission%'
    );

  v_available_commission := GREATEST(0, v_total_commission - v_claimed_commission);

  UPDATE public.profiles
  SET referral_count = v_total_referrals,
      referral_earnings_ugx = v_total_commission,
      updated_at = now()
  WHERE id = v_uid;

  RETURN jsonb_build_object(
    'total_referrals', v_total_referrals,
    'available_commission_ugx', v_available_commission,
    'total_commission_ugx', v_total_commission,
    'claimed_commission_ugx', v_claimed_commission,
    'referral_code', v_ref_code,
    'referral_percentage', v_rate * 100
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.get_referred_users()
RETURNS TABLE (
  id TEXT,
  username TEXT,
  full_name TEXT,
  registered_date TEXT,
  approved_deposit_ugx NUMERIC,
  commission_ugx NUMERIC,
  status TEXT,
  commission_status TEXT
)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_ref_code TEXT;
  v_rate NUMERIC;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  v_rate := public.referral_rate();

  SELECT referral_code INTO v_ref_code FROM public.profiles WHERE id = v_uid;
  IF v_ref_code IS NULL OR v_ref_code = '' THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT
    p.id::text,
    COALESCE(p.username, 'user') AS username,
    COALESCE(p.full_name, '') AS full_name,
    to_char(p.created_at, 'DD Mon YYYY') AS registered_date,
    COALESCE(SUM(CASE WHEN t.type = 'deposit' AND t.status IN ('completed','approved') THEN t.amount_ugx ELSE 0 END), 0) AS approved_deposit_ugx,
    ROUND(COALESCE(SUM(CASE WHEN t.type = 'deposit' AND t.status IN ('completed','approved') THEN t.amount_ugx ELSE 0 END), 0) * v_rate) AS commission_ugx,
    CASE
      WHEN COALESCE(SUM(CASE WHEN t.type = 'deposit' AND t.status IN ('completed','approved') THEN t.amount_ugx ELSE 0 END), 0) > 0 THEN 'active'
      ELSE 'pending'
    END AS status,
    CASE
      WHEN COALESCE(SUM(CASE WHEN t.type = 'deposit' AND t.status IN ('completed','approved') THEN t.amount_ugx ELSE 0 END), 0) > 0 THEN 'approved'
      ELSE 'no_approved_deposit'
    END AS commission_status
  FROM public.profiles p
  LEFT JOIN public.transactions t ON t.user_id = p.id
  WHERE lower(p.referred_by) = lower(v_ref_code)
    AND p.id <> v_uid
  GROUP BY p.id, p.username, p.full_name, p.created_at
  ORDER BY p.created_at DESC;
END;
$$;

CREATE OR REPLACE FUNCTION public.claim_referral_commission()
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_ref_code TEXT;
  v_total_approved_deposits NUMERIC := 0;
  v_total_commission NUMERIC := 0;
  v_claimed_commission NUMERIC := 0;
  v_available NUMERIC := 0;
  v_wallet_bal NUMERIC := 0;
  v_new_balance NUMERIC := 0;
  v_tx_id TEXT;
  v_rate NUMERIC;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  v_rate := public.referral_rate();

  SELECT total_balance_ugx INTO v_wallet_bal FROM public.wallets WHERE user_id = v_uid FOR UPDATE;
  IF NOT FOUND THEN
    INSERT INTO public.wallets (user_id, total_balance_ugx) VALUES (v_uid, 0) RETURNING total_balance_ugx INTO v_wallet_bal;
  END IF;

  SELECT referral_code INTO v_ref_code FROM public.profiles WHERE id = v_uid;
  IF v_ref_code IS NULL OR v_ref_code = '' THEN
    RETURN jsonb_build_object('success', false, 'claimed_ugx', 0, 'reason', 'no_referral_code', 'message', 'No referral code configured');
  END IF;

  SELECT COALESCE(SUM(t.amount_ugx), 0) INTO v_total_approved_deposits
  FROM public.transactions t
  INNER JOIN public.profiles p ON p.id = t.user_id
  WHERE lower(p.referred_by) = lower(v_ref_code)
    AND p.id <> v_uid
    AND t.type = 'deposit'
    AND t.status IN ('completed', 'approved');

  v_total_commission := ROUND(v_total_approved_deposits * v_rate);

  SELECT COALESCE(SUM(amount_ugx), 0) INTO v_claimed_commission
  FROM public.transactions
  WHERE user_id = v_uid
    AND status = 'completed'
    AND type IN ('bonus', 'reward')
    AND (
      id LIKE 'tx_claim_ref_%'
      OR id LIKE 'tx_refcomm_%'
      OR description ILIKE '%referral commission%'
    );

  v_available := GREATEST(0, v_total_commission - v_claimed_commission);

  IF v_available <= 0 THEN
    RETURN jsonb_build_object(
      'success', false,
      'claimed_ugx', 0,
      'reason', 'no_commission_available',
      'message', 'No referral commission available to claim at this time.'
    );
  END IF;

  v_new_balance := v_wallet_bal + v_available;
  UPDATE public.wallets
  SET total_balance_ugx = v_new_balance, updated_at = now()
  WHERE user_id = v_uid;

  v_tx_id := 'tx_claim_ref_' || lower(substring(replace(gen_random_uuid()::text,'-','') from 1 for 16));
  INSERT INTO public.transactions (id, user_id, type, amount_ugx, currency, status, description, is_credit, timestamp, created_at)
  VALUES (v_tx_id, v_uid, 'bonus', v_available, 'UGX', 'completed',
    'Claimed Referral Commission', true, now(), now());

  RETURN jsonb_build_object(
    'success', true,
    'claimed_ugx', v_available,
    'new_balance', v_new_balance,
    'transaction_id', v_tx_id
  );
END;
$$;

-- ============================================================
-- 11. ADMIN USER STATUS + DELETE + USER LEDGER + AUDIT LIST
-- ============================================================
CREATE OR REPLACE FUNCTION public.admin_set_user_status(p_user_id UUID, p_status TEXT)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_old TEXT;
BEGIN
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'Admin access required'; END IF;
  IF p_status NOT IN ('active', 'blocked') THEN RAISE EXCEPTION 'Invalid status'; END IF;
  IF p_user_id = auth.uid() THEN RAISE EXCEPTION 'Cannot change your own account status'; END IF;

  SELECT status INTO v_old FROM public.profiles WHERE id = p_user_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'User not found'; END IF;

  UPDATE public.profiles SET status = p_status, updated_at = now() WHERE id = p_user_id;

  PERFORM public.write_admin_audit(
    CASE WHEN p_status = 'blocked' THEN 'user_block' ELSE 'user_unblock' END,
    'user', p_user_id::text,
    jsonb_build_object('status', v_old),
    jsonb_build_object('status', p_status)
  );

  RETURN jsonb_build_object('success', true, 'status', p_status);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.admin_set_user_status(UUID, TEXT) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.admin_set_user_status(UUID, TEXT) TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_delete_user(p_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_username TEXT;
BEGIN
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'Admin access required'; END IF;
  IF p_user_id = auth.uid() THEN RAISE EXCEPTION 'Cannot delete your own administrator account'; END IF;

  SELECT username INTO v_username FROM public.profiles WHERE id = p_user_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'User not found'; END IF;

  DELETE FROM public.notifications WHERE user_id = p_user_id;
  DELETE FROM public.admin_tasks WHERE user_id = p_user_id;
  DELETE FROM public.user_machines WHERE user_id = p_user_id;
  DELETE FROM public.transactions WHERE user_id = p_user_id;
  DELETE FROM public.balance_adjustments WHERE user_id = p_user_id;
  DELETE FROM public.wallets WHERE user_id = p_user_id;
  DELETE FROM public.profiles WHERE id = p_user_id;

  PERFORM public.write_admin_audit(
    'user_delete', 'user', p_user_id::text,
    jsonb_build_object('username', v_username),
    NULL
  );

  RETURN jsonb_build_object('success', true, 'username', v_username);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.admin_delete_user(UUID) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.admin_delete_user(UUID) TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_user_ledger(p_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_profile JSONB;
  v_wallet JSONB;
  v_txs JSONB;
  v_machines JSONB;
BEGIN
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'Admin access required'; END IF;

  SELECT to_jsonb(p) INTO v_profile FROM public.profiles p WHERE p.id = p_user_id;
  IF v_profile IS NULL THEN RAISE EXCEPTION 'User not found'; END IF;

  SELECT to_jsonb(w) INTO v_wallet FROM public.wallets w WHERE w.user_id = p_user_id;

  SELECT COALESCE(jsonb_agg(to_jsonb(t) ORDER BY t.created_at DESC), '[]'::jsonb)
  INTO v_txs FROM public.transactions t WHERE t.user_id = p_user_id;

  SELECT COALESCE(jsonb_agg(to_jsonb(m) ORDER BY m.created_at DESC), '[]'::jsonb)
  INTO v_machines FROM public.user_machines m WHERE m.user_id = p_user_id;

  RETURN jsonb_build_object(
    'profile', v_profile,
    'wallet', v_wallet,
    'transactions', v_txs,
    'investments', v_machines
  );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.admin_user_ledger(UUID) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.admin_user_ledger(UUID) TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_list_audit_logs()
RETURNS SETOF public.admin_audit_log
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'Admin access required'; END IF;
  RETURN QUERY SELECT * FROM public.admin_audit_log ORDER BY created_at DESC LIMIT 500;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.admin_list_audit_logs() FROM anon, public;
GRANT EXECUTE ON FUNCTION public.admin_list_audit_logs() TO authenticated;

-- Welcome bonus amount from settings
CREATE OR REPLACE FUNCTION public.claim_welcome_bonus()
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_already_claimed BOOLEAN := false;
  v_has_approved_deposit BOOLEAN := false;
  v_bonus_amount NUMERIC := 4000;
  v_new_balance NUMERIC := 0;
  v_tx_id TEXT;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;

  SELECT COALESCE(welcome_bonus_ugx, 4000) INTO v_bonus_amount
  FROM public.system_settings WHERE id = 'global_config';

  SELECT COALESCE(welcome_bonus_claimed, false) INTO v_already_claimed
  FROM public.profiles WHERE id = v_uid;

  IF v_already_claimed IS TRUE THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Welcome bonus has already been claimed for this account.',
      'code', 'ALREADY_CLAIMED'
    );
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM public.transactions
    WHERE user_id = v_uid
      AND type = 'deposit'
      AND status IN ('completed', 'approved')
  ) INTO v_has_approved_deposit;

  IF NOT v_has_approved_deposit THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'An approved deposit is required to unlock your Welcome Bonus.',
      'code', 'DEPOSIT_REQUIRED'
    );
  END IF;

  UPDATE public.profiles
  SET welcome_bonus_claimed = true, updated_at = now()
  WHERE id = v_uid AND COALESCE(welcome_bonus_claimed, false) = false;
  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Welcome bonus has already been claimed for this account.',
      'code', 'ALREADY_CLAIMED'
    );
  END IF;

  UPDATE public.wallets
  SET total_balance_ugx = total_balance_ugx + v_bonus_amount, updated_at = now()
  WHERE user_id = v_uid
  RETURNING total_balance_ugx INTO v_new_balance;

  IF NOT FOUND THEN
    INSERT INTO public.wallets (user_id, total_balance_ugx)
    VALUES (v_uid, v_bonus_amount)
    RETURNING total_balance_ugx INTO v_new_balance;
  END IF;

  v_tx_id := 'tx_welcome_' || v_uid::text;
  INSERT INTO public.transactions (
    id, user_id, type, amount_ugx, currency, status,
    description, is_credit, timestamp, created_at
  ) VALUES (
    v_tx_id, v_uid, 'bonus', v_bonus_amount, 'UGX', 'completed',
    'Welcome Bonus claimed', true,
    round(extract(epoch from now()) * 1000)::bigint, now()
  ) ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.notifications (
    id, user_id, title, message, read, type, created_at
  ) VALUES (
    'notif_welcome_' || v_uid::text, v_uid,
    'Welcome Bonus Claimed',
    'UGX ' || v_bonus_amount::text || ' Welcome Bonus has been credited to your wallet.',
    false, 'success', now()
  ) ON CONFLICT (id) DO NOTHING;

  RETURN jsonb_build_object(
    'success', true,
    'claimed_ugx', v_bonus_amount,
    'new_balance', v_new_balance,
    'message', 'Welcome Bonus claimed.'
  );
END;
$$;
