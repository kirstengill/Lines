-- FleetVest branding: purge the retired "Sunrise Capital DS" copy from user-facing
-- notifications and stop the signup trigger from producing it again.
-- Safe to re-run: guarded CREATE OR REPLACE + idempotent UPDATE.

-- ============================================================
-- 1. SIGNUP TRIGGER: rewrite the deployed branding in place.
--    The live function body is replaced only when the retired brand is still
--    present, so the deployed version's wallet/bonus behaviour is preserved.
--    (Canonical definition lives in supabase_fix.sql section 2.)
-- ============================================================
DO $$
DECLARE
  v_src TEXT;
  v_patched TEXT;
BEGIN
  SELECT p.prosrc INTO v_src
  FROM pg_proc p
  JOIN pg_namespace n ON n.oid = p.pronamespace
  WHERE n.nspname = 'public'
    AND p.proname = 'handle_new_user'
  ORDER BY p.oid
  LIMIT 1;

  IF v_src IS NULL THEN
    RAISE WARNING 'public.handle_new_user() not found - apply supabase_fix.sql section 2.';

  ELSIF v_src ~* 'sunrise[[:space:]]+capital' THEN
    v_patched := regexp_replace(v_src, 'sunrise[[:space:]]+capital([[:space:]]+ds)?', 'FleetVest', 'gi');

    EXECUTE format(
      'CREATE OR REPLACE FUNCTION public.handle_new_user()
         RETURNS TRIGGER
         LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
       AS $fleetvest$%s$fleetvest$',
      v_patched
    );
    RAISE NOTICE 'public.handle_new_user() branding patched to FleetVest.';

  ELSE
    RAISE NOTICE 'public.handle_new_user() already carries FleetVest branding.';
  END IF;
END $$;

-- ============================================================
-- 2. BACKFILL notifications already stored with the retired brand
-- ============================================================
UPDATE public.notifications
SET title   = regexp_replace(title,   'sunrise[[:space:]]+capital([[:space:]]+ds)?', 'FleetVest', 'gi'),
    message = regexp_replace(message, 'sunrise[[:space:]]+capital([[:space:]]+ds)?', 'FleetVest', 'gi')
WHERE title   ~* 'sunrise[[:space:]]+capital'
   OR message ~* 'sunrise[[:space:]]+capital';

-- ============================================================
-- 3. VERIFY: both queries must return zero rows
-- ============================================================
SELECT id, title, message FROM public.notifications
WHERE title   ~* 'sunrise[[:space:]]+capital'
   OR message ~* 'sunrise[[:space:]]+capital';

SELECT p.proname,
       p.prosrc ~* 'sunrise[[:space:]]+capital' AS still_has_retired_brand
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
  AND p.proname IN ('handle_new_user', 'handle_referral', 'claim_welcome_bonus');
