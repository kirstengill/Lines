-- ============================================================
-- Sunrise Capital — Investment plan correction (amounts + daily rewards)
-- Run this ONCE in the Supabase Dashboard > SQL Editor.
--
-- Business schedule: higher plans earn progressively better daily rates.
--   15,000  ->  3,500 /day  (23.3%)
--   20,000  ->  4,300 /day  (21.5%)
--   30,000  ->  6,750 /day  (22.5%)
--   50,000  -> 11,500 /day  (23.0%)
--  100,000  -> 24,000 /day  (24.0%)
-- est_yearly_roi = daily_reward * 365 / min_invest * 100 (consistent with daily).
-- ============================================================

UPDATE public.catalog_machines SET
  min_invest_ugx = 15000,
  daily_reward_ugx = 3500,
  est_yearly_roi = 8517,
  total_mined_ugx = 0,
  unclaimed_rewards_ugx = 0
WHERE id = 'mach_starter_15k';

UPDATE public.catalog_machines SET
  min_invest_ugx = 20000,
  daily_reward_ugx = 4300,
  est_yearly_roi = 7848,
  total_mined_ugx = 0,
  unclaimed_rewards_ugx = 0
WHERE id = 'mach_solar_mech_10';

UPDATE public.catalog_machines SET
  min_invest_ugx = 30000,
  daily_reward_ugx = 6750,
  est_yearly_roi = 8213,
  total_mined_ugx = 0,
  unclaimed_rewards_ugx = 0
WHERE id = 'mach_ds_mining_shoe';

UPDATE public.catalog_machines SET
  min_invest_ugx = 50000,
  daily_reward_ugx = 11500,
  est_yearly_roi = 8395,
  total_mined_ugx = 0,
  unclaimed_rewards_ugx = 0
WHERE id = 'mach_hydro_turbine_x500';

UPDATE public.catalog_machines SET
  min_invest_ugx = 100000,
  daily_reward_ugx = 24000,
  est_yearly_roi = 8760,
  total_mined_ugx = 0,
  unclaimed_rewards_ugx = 0
WHERE id = 'mach_quantum_vip_9000';

SELECT id, title, min_invest_ugx, daily_reward_ugx, est_yearly_roi
FROM public.catalog_machines ORDER BY min_invest_ugx ASC;
