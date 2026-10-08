ALTER TABLE public.system_settings
  ALTER COLUMN welcome_bonus_ugx SET DEFAULT 5000;

UPDATE public.system_settings
SET welcome_bonus_ugx = 5000
WHERE id = 'global_config'
  AND welcome_bonus_ugx = 4000;

ALTER TABLE public.wallets
  ALTER COLUMN total_balance_ugx SET DEFAULT 5000;
