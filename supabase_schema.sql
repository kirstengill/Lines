-- ==========================================================
-- SUNRISE CAPITAL DS PLATFORM - SUPABASE DATABASE SCHEMA
-- Execute this SQL script in Supabase Dashboard -> SQL Editor
-- ==========================================================

-- Enable UUID Extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. PROFILES TABLE
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    username TEXT UNIQUE NOT NULL,
    full_name TEXT,
    phone TEXT,
    role TEXT DEFAULT 'user' CHECK (role IN ('user', 'admin')),
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'blocked')),
    tier TEXT DEFAULT 'Standard',
    referral_code TEXT UNIQUE,
    referred_by TEXT,
    referral_count INTEGER DEFAULT 0,
    referral_earnings_ugx NUMERIC DEFAULT 0,
    welcome_bonus_claimed BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. WALLETS TABLE
CREATE TABLE IF NOT EXISTS public.wallets (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    total_balance_ugx NUMERIC DEFAULT 4000 NOT NULL,
    daily_pnl_ugx NUMERIC DEFAULT 0 NOT NULL,
    active_machines_count INTEGER DEFAULT 0 NOT NULL,
    pending_tasks_count INTEGER DEFAULT 0 NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. TRANSACTIONS TABLE
CREATE TABLE IF NOT EXISTS public.transactions (
    id TEXT PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('deposit', 'withdraw', 'reward', 'investment', 'transfer', 'bonus', 'adjustment')),
    amount_ugx NUMERIC NOT NULL,
    currency TEXT DEFAULT 'UGX' NOT NULL,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'rejected')),
    description TEXT,
    payment_method TEXT,
    recipient_info TEXT,
    tx_hash TEXT,
    is_credit BOOLEAN DEFAULT false,
    timestamp BIGINT,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 4. USER MACHINES / ACTIVE NODES TABLE
CREATE TABLE IF NOT EXISTS public.user_machines (
    id TEXT PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    machine_id TEXT NOT NULL,
    title TEXT NOT NULL,
    category TEXT DEFAULT 'DS-Mining',
    image TEXT,
    daily_reward_ugx NUMERIC DEFAULT 0 NOT NULL,
    status TEXT DEFAULT 'Active' CHECK (status IN ('Active', 'Maintenance', 'Pending', 'Reserved')),
    est_yearly_roi NUMERIC DEFAULT 0,
    min_invest_ugx NUMERIC DEFAULT 0,
    amount_invested_ugx NUMERIC DEFAULT 0,
    hashrate TEXT,
    power_source TEXT,
    total_mined_ugx NUMERIC DEFAULT 0 NOT NULL,
    unclaimed_rewards_ugx NUMERIC DEFAULT 0 NOT NULL,
    is_boosted BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 5. CATALOG MACHINES TABLE
CREATE TABLE IF NOT EXISTS public.catalog_machines (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    subtitle TEXT,
    category TEXT NOT NULL CHECK (category IN ('VIP Products', 'Clean Energy', 'DS-Mining', 'All')),
    image TEXT NOT NULL,
    daily_reward_ugx NUMERIC NOT NULL,
    status TEXT DEFAULT 'Active' CHECK (status IN ('Active', 'Maintenance', 'Pending', 'Reserved')),
    est_yearly_roi NUMERIC DEFAULT 0,
    min_invest_ugx NUMERIC NOT NULL,
    hashrate TEXT,
    power_source TEXT,
    uptime TEXT DEFAULT '99.9%',
    temperature TEXT DEFAULT '36.0°C',
    efficiency NUMERIC DEFAULT 98.5,
    total_mined_ugx NUMERIC DEFAULT 0,
    unclaimed_rewards_ugx NUMERIC DEFAULT 0,
    is_boosted BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 6. BALANCE ADJUSTMENTS AUDIT TABLE
CREATE TABLE IF NOT EXISTS public.balance_adjustments (
    id TEXT PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    username TEXT NOT NULL,
    user_full_name TEXT,
    previous_balance_ugx NUMERIC NOT NULL,
    adjustment_amount_ugx NUMERIC NOT NULL,
    new_balance_ugx NUMERIC NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('add', 'deduct')),
    reason TEXT NOT NULL,
    admin_id TEXT NOT NULL,
    admin_username TEXT NOT NULL,
    timestamp BIGINT,
    date TEXT,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 7. ADMIN TASKS TABLE
CREATE TABLE IF NOT EXISTS public.admin_tasks (
    id TEXT PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    transaction_id TEXT,
    type TEXT NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    amount_ugx NUMERIC,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 8. NOTIFICATIONS TABLE
CREATE TABLE IF NOT EXISTS public.notifications (
    id TEXT PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    read BOOLEAN DEFAULT false NOT NULL,
    type TEXT DEFAULT 'info' CHECK (type IN ('info', 'success', 'warning', 'error')),
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- ==========================================================
-- AUTO-PROVISIONING TRIGGER: ON AUTH USER SIGNUP
-- Automatically creates profile and starting wallet
-- ==========================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
    new_username TEXT;
    new_fullname TEXT;
    new_phone TEXT;
    new_role TEXT;
    new_ref_code TEXT;
    new_referred_by TEXT;
BEGIN
    new_username := COALESCE(new.raw_user_meta_data->>'username', split_part(new.email, '@', 1));
    new_fullname := COALESCE(new.raw_user_meta_data->>'full_name', new_username);
    new_phone := COALESCE(new.raw_user_meta_data->>'phone', '');
    new_role := COALESCE(new.raw_user_meta_data->>'role', 'user');
    new_referred_by := new.raw_user_meta_data->>'referred_by';
    new_ref_code := COALESCE(new.raw_user_meta_data->>'referral_code', 'SC-' || upper(substring(md5(random()::text) from 1 for 6)));

    -- Insert Profile
    INSERT INTO public.profiles (
        id,
        username,
        full_name,
        phone,
        role,
        status,
        tier,
        referral_code,
        referred_by,
        welcome_bonus_claimed
    ) VALUES (
        new.id,
        new_username,
        new_fullname,
        new_phone,
        new_role,
        'active',
        CASE WHEN new_role = 'admin' THEN 'VIP 2 Elite' ELSE 'Standard' END,
        new_ref_code,
        new_referred_by,
        true
    ) ON CONFLICT (id) DO UPDATE SET
        username = EXCLUDED.username,
        full_name = EXCLUDED.full_name,
        updated_at = now();

    -- Insert Initial Wallet with UGX 4,000 Welcome Bonus
    INSERT INTO public.wallets (
        user_id,
        total_balance_ugx,
        daily_pnl_ugx,
        active_machines_count,
        pending_tasks_count
    ) VALUES (
        new.id,
        4000,
        0,
        0,
        0
    ) ON CONFLICT (user_id) DO NOTHING;

    -- Insert Initial Welcome Bonus Notification
    INSERT INTO public.notifications (
        id,
        user_id,
        title,
        message,
        read,
        type
    ) VALUES (
        'notif_welcome_' || new.id,
        new.id,
        'Welcome to Sunrise Capital DS',
        'Your registration was successful! UGX 4,000 welcome credit has been deposited to your account balance.',
        false,
        'success'
    ) ON CONFLICT DO NOTHING;

    RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger definition
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ==========================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ==========================================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_machines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.catalog_machines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.balance_adjustments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Profiles Policies
DROP POLICY IF EXISTS "Users can view all profiles" ON public.profiles;
CREATE POLICY "Users can view all profiles" ON public.profiles FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
CREATE POLICY "Users can update their own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- Wallets Policies
DROP POLICY IF EXISTS "Users can view their own wallet" ON public.wallets;
CREATE POLICY "Users can view their own wallet" ON public.wallets FOR SELECT USING (auth.uid() = user_id OR auth.jwt()->>'role' = 'service_role' OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

DROP POLICY IF EXISTS "Users can update their own wallet" ON public.wallets;
CREATE POLICY "Users can update their own wallet" ON public.wallets FOR ALL USING (auth.uid() = user_id OR auth.jwt()->>'role' = 'service_role' OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

-- Transactions Policies
DROP POLICY IF EXISTS "Users can view their own transactions" ON public.transactions;
CREATE POLICY "Users can view their own transactions" ON public.transactions FOR SELECT USING (auth.uid() = user_id OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

DROP POLICY IF EXISTS "Users can insert their own transactions" ON public.transactions;
CREATE POLICY "Users can insert their own transactions" ON public.transactions FOR INSERT WITH CHECK (auth.uid() = user_id OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

DROP POLICY IF EXISTS "Users or admins can update transactions" ON public.transactions;
CREATE POLICY "Users or admins can update transactions" ON public.transactions FOR UPDATE USING (auth.uid() = user_id OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

-- User Machines Policies
DROP POLICY IF EXISTS "Users can manage their own machines" ON public.user_machines;
CREATE POLICY "Users can manage their own machines" ON public.user_machines FOR ALL USING (auth.uid() = user_id OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

-- Catalog Machines Policies (Public read, admin write)
DROP POLICY IF EXISTS "Public can view catalog machines" ON public.catalog_machines;
CREATE POLICY "Public can view catalog machines" ON public.catalog_machines FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admins can manage catalog machines" ON public.catalog_machines;
CREATE POLICY "Admins can manage catalog machines" ON public.catalog_machines FOR ALL USING (true);

-- Notifications Policies
DROP POLICY IF EXISTS "Users can view and manage their own notifications" ON public.notifications;
CREATE POLICY "Users can view and manage their own notifications" ON public.notifications FOR ALL USING (auth.uid() = user_id OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

-- Admin Tasks Policies
DROP POLICY IF EXISTS "Admin tasks viewable by admins and owners" ON public.admin_tasks;
CREATE POLICY "Admin tasks viewable by admins and owners" ON public.admin_tasks FOR ALL USING (auth.uid() = user_id OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

-- Balance Adjustments Policies
DROP POLICY IF EXISTS "Balance adjustments viewable by owner or admin" ON public.balance_adjustments;
CREATE POLICY "Balance adjustments viewable by owner or admin" ON public.balance_adjustments FOR ALL USING (auth.uid() = user_id OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

-- ==========================================================
-- SEED INITIAL CATALOG MACHINES
-- ==========================================================
INSERT INTO public.catalog_machines (
    id, title, subtitle, category, image, daily_reward_ugx, status, est_yearly_roi,
    min_invest_ugx, hashrate, power_source, uptime, temperature, efficiency, total_mined_ugx, unclaimed_rewards_ugx, is_boosted
) VALUES
(
    'mach_starter_15k',
    'STARTER NODE',
    '(Entry-level Miner)',
    'DS-Mining',
    'https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=800&q=80',
    1250,
    'Active',
    3000,
    15000,
    '2.5 TH/s',
    'Grid Power',
    '99.50%',
    '35.0°C',
    95.0,
    0,
    0,
    false
),
(
    'mach_solar_mech_10',
    'SOLAR-MECH 10',
    '(Advanced Mower-Miner)',
    'DS-Mining',
    'https://images.unsplash.com/photo-1509391365360-2e959784a276?auto=format&fit=crop&w=800&q=80',
    212328,
    'Active',
    120,
    5000000,
    '54.2 TH/s',
    'Solar 1.2kW Array + Dual Kinetic Blade Dynamos',
    '99.94%',
    '41.2°C',
    99.2,
    18450000,
    142800,
    false
),
(
    'mach_ds_mining_shoe',
    'DS-MINING SHOE (Series 1)',
    '(Kinetic Footwear Node)',
    'DS-Mining',
    'https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=800&q=80',
    1200000,
    'Active',
    135,
    25000000,
    '210.8 TH/s',
    'Kinetic-Electro Hybrid Regenerative Coil',
    '99.98%',
    '38.6°C',
    98.8,
    148200000,
    890000,
    true
),
(
    'mach_hydro_turbine_x500',
    'HYDRO-MINER X500',
    '(Micro-Hydro Generator)',
    'Clean Energy',
    'https://images.unsplash.com/photo-1466611653911-95081537e5b7?auto=format&fit=crop&w=800&q=80',
    717672,
    'Active',
    110,
    10000000,
    '118.0 TH/s',
    'Micro-Hydro Turbine + Closed Loop Coolant',
    '99.85%',
    '32.1°C',
    99.6,
    42100000,
    350000,
    false
),
(
    'mach_quantum_vip_9000',
    'QUANTUM VIP NODE-9',
    '(High-Density Institutional Rig)',
    'VIP Products',
    'https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=800&q=80',
    4500000,
    'Reserved',
    180,
    100000000,
    '1,250.0 TH/s',
    'Direct Grid / Cryo-Immersion Subsystem',
    '100.00%',
    '26.4°C',
    99.9,
    0,
    0,
    false
)
ON CONFLICT (id) DO UPDATE SET
    title = EXCLUDED.title,
    daily_reward_ugx = EXCLUDED.daily_reward_ugx,
    min_invest_ugx = EXCLUDED.min_invest_ugx;
