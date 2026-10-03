-- FleetVest: credit the Welcome Bonus straight into the wallet at signup.
-- Aligns public.handle_new_user() with the credit-at-signup model already used by
-- supabase_schema.sql, supabase_fix.sql section 13 and the Express fallback, so the
-- bonus no longer waits for a deposit + claim.
-- Requires 20260923_fleetvest_lock_settings_audit.sql (public.system_settings).
-- Safe to re-run: CREATE OR REPLACE + idempotent backfill.

-- ============================================================
-- 1. SIGNUP TRIGGER: profile + funded wallet + bonus ledger + notification
-- ============================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_username TEXT;
  v_fullname TEXT;
  v_phone TEXT;
  v_ref_code TEXT;
  v_referred_by TEXT;
  v_bonus NUMERIC;
BEGIN
  v_username := COALESCE(new.raw_user_meta_data->>'username', split_part(new.email, '@', 1));
  v_fullname := COALESCE(NULLIF(new.raw_user_meta_data->>'full_name',''), v_username);
  v_phone    := COALESCE(new.raw_user_meta_data->>'phone', '');
  v_referred_by := NULLIF(new.raw_user_meta_data->>'referred_by','');
  v_ref_code := COALESCE(NULLIF(new.raw_user_meta_data->>'referral_code',''),
                         'SC-' || upper(substring(md5(random()::text || new.id::text) from 1 for 6)));

  SELECT COALESCE((SELECT welcome_bonus_ugx FROM public.system_settings WHERE id = 'global_config'), 4000)
    INTO v_bonus;

  -- Profile: bonus is credited immediately, so it starts as already claimed
  INSERT INTO public.profiles (id, username, full_name, phone, role, status, tier,
                               referral_code, referred_by, welcome_bonus_claimed, is_admin)
  VALUES (new.id, v_username, v_fullname, v_phone, 'user', 'active', 'Standard',
          v_ref_code, v_referred_by, true, false)
  ON CONFLICT (id) DO UPDATE SET
    username = EXCLUDED.username,
    full_name = EXCLUDED.full_name,
    updated_at = now();

  -- Wallet funded with the welcome bonus
  INSERT INTO public.wallets (user_id, total_balance_ugx, daily_pnl_ugx,
                              active_machines_count, pending_tasks_count)
  VALUES (new.id, v_bonus, 0, 0, 0)
  ON CONFLICT (user_id) DO NOTHING;

  -- Bonus ledger entry
  INSERT INTO public.transactions (id, user_id, type, amount_ugx, currency, status,
                                   description, is_credit, timestamp, created_at)
  VALUES ('tx_welcome_' || new.id::text, new.id, 'bonus', v_bonus, 'UGX', 'completed',
          'Welcome Signup Bonus — UGX ' || v_bonus::text || ' credited to your wallet', true,
          round(extract(epoch from now()) * 1000)::bigint, now())
  ON CONFLICT (id) DO NOTHING;

  -- Welcome notification
  INSERT INTO public.notifications (id, user_id, title, message, read, type)
  VALUES ('notif_welcome_' || new.id::text, new.id,
          'Welcome to FleetVest',
          'Your registration was successful! UGX ' || v_bonus::text
            || ' welcome bonus has been credited to your wallet balance.',
          false, 'success')
  ON CONFLICT (id) DO UPDATE SET
    title = EXCLUDED.title,
    message = EXCLUDED.message,
    type = EXCLUDED.type;

  RETURN new;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================================
-- 2. BACKFILL accounts that signed up before this change and never
--    received the bonus (no tx_welcome_ row, still unclaimed)
-- ============================================================
DO $$
DECLARE
  v_bonus NUMERIC;
  r RECORD;
BEGIN
  SELECT COALESCE(welcome_bonus_ugx, 4000) INTO v_bonus
  FROM public.system_settings WHERE id = 'global_config';
  v_bonus := COALESCE(v_bonus, 4000);

  FOR r IN
    SELECT p.id
    FROM public.profiles p
    WHERE COALESCE(p.welcome_bonus_claimed, false) = false
      AND NOT EXISTS (
        SELECT 1 FROM public.transactions t WHERE t.id = 'tx_welcome_' || p.id::text
      )
  LOOP
    INSERT INTO public.wallets (user_id, total_balance_ugx, daily_pnl_ugx,
                                active_machines_count, pending_tasks_count)
    VALUES (r.id, v_bonus, 0, 0, 0)
    ON CONFLICT (user_id) DO UPDATE SET
      total_balance_ugx = public.wallets.total_balance_ugx + v_bonus,
      updated_at = now();

    INSERT INTO public.transactions (id, user_id, type, amount_ugx, currency, status,
                                     description, is_credit, timestamp, created_at)
    VALUES ('tx_welcome_' || r.id::text, r.id, 'bonus', v_bonus, 'UGX', 'completed',
            'Welcome Signup Bonus — UGX ' || v_bonus::text || ' credited to your wallet', true,
            round(extract(epoch from now()) * 1000)::bigint, now())
    ON CONFLICT (id) DO NOTHING;

    INSERT INTO public.notifications (id, user_id, title, message, read, type)
    VALUES ('notif_welcome_' || r.id::text, r.id,
            'Welcome to FleetVest',
            'Your registration was successful! UGX ' || v_bonus::text
              || ' welcome bonus has been credited to your wallet balance.',
            false, 'success')
    ON CONFLICT (id) DO UPDATE SET
      title = EXCLUDED.title,
      message = EXCLUDED.message,
      type = EXCLUDED.type;

    UPDATE public.profiles
    SET welcome_bonus_claimed = true, updated_at = now()
    WHERE id = r.id;
  END LOOP;
END $$;

-- ============================================================
-- 3. VERIFY: both queries must return zero rows
-- ============================================================
SELECT p.id, p.welcome_bonus_claimed
FROM public.profiles p
WHERE COALESCE(p.welcome_bonus_claimed, false) = false
   OR NOT EXISTS (SELECT 1 FROM public.transactions t WHERE t.id = 'tx_welcome_' || p.id::text);

SELECT w.user_id, w.total_balance_ugx
FROM public.wallets w
WHERE EXISTS (SELECT 1 FROM public.transactions t WHERE t.id = 'tx_welcome_' || w.user_id::text)
  AND COALESCE(w.total_balance_ugx, 0) = 0;