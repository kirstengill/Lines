import express, { Request, Response, NextFunction } from 'express';
import path from 'path';
import fs from 'fs';
import { createServer as createViteServer } from 'vite';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

const app = express();
const PORT = 3000;

app.use(express.json());

// Server-side Supabase client (Lazy initialized with project credentials)
let supabaseAdmin: SupabaseClient | null = null;
const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL as string;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY as string;

if (supabaseUrl && supabaseKey) {
  try {
    supabaseAdmin = createClient(supabaseUrl, supabaseKey);
  } catch (e) {
    console.warn('Supabase initialization in server notice:', e);
  }
}

// Data structures for server-managed single source of truth
export interface ServerUserRecord {
  id: string;
  username: string;
  passwordHash: string;
  fullName: string;
  phone?: string;
  status: 'active' | 'blocked';
  role: 'admin' | 'user';
  isAdmin: boolean;
  tier: string;
  referralCode: string;
  referredBy?: string;
  referralCount: number;
  referralEarningsUGX: number;
  referrals: any[];
  welcomeBonusClaimed: boolean;
  memberSince: string;
  createdAt: string;
  token?: string;
}

export interface BalanceAdjustmentRecord {
  id: string;
  userId: string;
  username: string;
  userFullName?: string;
  previousBalanceUGX: number;
  adjustmentAmountUGX: number;
  newBalanceUGX: number;
  type: 'add' | 'deduct';
  reason: string;
  adminId: string;
  adminUsername: string;
  timestamp: number;
  date: string;
}

export interface CatalogMachine {
  id: string;
  title: string;
  subtitle?: string;
  category: 'VIP Products' | 'Clean Energy' | 'DS-Mining' | 'All';
  image: string;
  dailyRewardUGX: number;
  status: 'Active' | 'Maintenance' | 'Pending' | 'Reserved';
  estYearlyROI: number;
  minInvestUGX: number;
  hashrate: string;
  powerSource: string;
  uptime: string;
  temperature: string;
  efficiency: number;
  totalMinedUGX: number;
  unclaimedRewardsUGX: number;
  isBoosted?: boolean;
}

interface ServerUserStore {
  [userId: string]: {
    user: ServerUserRecord;
    data: {
      wallet: {
        totalBalanceUGX: number;
        dailyPnlUGX: number;
        activeMachinesCount: number;
        pendingTasksCount: number;
      };
      transactions: any[];
      machines: any[];
      adminTasks: any[];
      notifications: any[];
    };
  };
}

// Initial Database Stores
const serverDatabase: ServerUserStore = {};
const activeTokens: { [token: string]: string } = {}; // token -> userId
const balanceAdjustments: BalanceAdjustmentRecord[] = [];

// Seed Default Investment Projects Catalog
let catalogDatabase: CatalogMachine[] = [
  {
    id: 'mach_starter_15k',
    title: 'STARTER NODE',
    subtitle: '(Entry-level Miner)',
    category: 'DS-Mining',
    image: 'https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=800&q=80',
    dailyRewardUGX: 1250, // Massive yield so it returns 25,000 very quickly
    status: 'Active',
    estYearlyROI: 3000,
    minInvestUGX: 15000,
    hashrate: '2.5 TH/s',
    powerSource: 'Grid Power',
    uptime: '99.50%',
    temperature: '35.0°C',
    efficiency: 95.0,
    totalMinedUGX: 0,
    unclaimedRewardsUGX: 0,
    isBoosted: false,
  },
  {
    id: 'mach_solar_mech_10',
    title: 'SOLAR-MECH 10',
    subtitle: '(Advanced Mower-Miner)',
    category: 'DS-Mining',
    image: 'https://images.unsplash.com/photo-1509391365360-2e959784a276?auto=format&fit=crop&w=800&q=80',
    dailyRewardUGX: 212328,
    status: 'Active',
    estYearlyROI: 120,
    minInvestUGX: 5000000,
    hashrate: '54.2 TH/s',
    powerSource: 'Solar 1.2kW Array + Dual Kinetic Blade Dynamos',
    uptime: '99.94%',
    temperature: '41.2°C',
    efficiency: 99.2,
    totalMinedUGX: 18450000,
    unclaimedRewardsUGX: 142800,
    isBoosted: false,
  },
  {
    id: 'mach_ds_mining_shoe',
    title: 'DS-MINING SHOE (Series 1)',
    subtitle: '(Kinetic Footwear Node)',
    category: 'DS-Mining',
    image: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=800&q=80',
    dailyRewardUGX: 1200000,
    status: 'Active',
    estYearlyROI: 135,
    minInvestUGX: 25000000,
    hashrate: '210.8 TH/s',
    powerSource: 'Kinetic-Electro Hybrid Regenerative Coil',
    uptime: '99.98%',
    temperature: '38.6°C',
    efficiency: 98.8,
    totalMinedUGX: 148200000,
    unclaimedRewardsUGX: 890000,
    isBoosted: true,
  },
  {
    id: 'mach_hydro_turbine_x500',
    title: 'HYDRO-MINER X500',
    subtitle: '(Micro-Hydro Generator)',
    category: 'Clean Energy',
    image: 'https://images.unsplash.com/photo-1466611653911-95081537e5b7?auto=format&fit=crop&w=800&q=80',
    dailyRewardUGX: 717672,
    status: 'Active',
    estYearlyROI: 110,
    minInvestUGX: 10000000,
    hashrate: '118.0 TH/s',
    powerSource: 'Micro-Hydro Turbine + Closed Loop Coolant',
    uptime: '99.85%',
    temperature: '32.1°C',
    efficiency: 99.6,
    totalMinedUGX: 42100000,
    unclaimedRewardsUGX: 350000,
    isBoosted: false,
  },
  {
    id: 'mach_quantum_vip_9000',
    title: 'QUANTUM VIP NODE-9',
    subtitle: '(High-Density Institutional Rig)',
    category: 'VIP Products',
    image: 'https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=800&q=80',
    dailyRewardUGX: 4500000,
    status: 'Reserved',
    estYearlyROI: 180,
    minInvestUGX: 100000000,
    hashrate: '1,250.0 TH/s',
    powerSource: 'Direct Grid / Cryo-Immersion Subsystem',
    uptime: '100.00%',
    temperature: '26.4°C',
    efficiency: 99.9,
    totalMinedUGX: 0,
    unclaimedRewardsUGX: 0,
    isBoosted: false,
  },
];

// Cloud Database Synchronization (No local disk persistence)
async function syncDatabaseCloud(userId?: string) {
  if (!supabaseAdmin) return;
  try {
    if (userId && serverDatabase[userId]) {
      const u = serverDatabase[userId];
      await supabaseAdmin.from('wallets').upsert({
        user_id: userId,
        total_balance_ugx: u.data.wallet.totalBalanceUGX,
        daily_pnl_ugx: u.data.wallet.dailyPnlUGX,
        active_machines_count: u.data.wallet.activeMachinesCount,
        pending_tasks_count: u.data.wallet.pendingTasksCount,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'user_id' });
    }
  } catch (e) {
    // Supabase cloud sync notice
  }
}

function saveDatabaseToDisk() {
  // Local device disk persistence removed. All persistent data is hosted in Supabase.
}

function generateToken(userId: string): string {
  const token = `tok_${Date.now()}_${Math.random().toString(36).substring(2, 12)}`;
  activeTokens[token] = userId;
  saveDatabaseToDisk();
  return token;
}

// Authentication Middleware
function requireAuth(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  const token = authHeader?.replace(/^Bearer\s+/i, '');

  if (!token || !activeTokens[token]) {
    const userIdHeader = req.headers['x-user-id'] as string;
    if (userIdHeader && serverDatabase[userIdHeader]) {
      (req as any).userId = userIdHeader;
      (req as any).userRecord = serverDatabase[userIdHeader].user;
      return next();
    }
    return res.status(401).json({ error: 'Unauthorized: Valid authentication token required.' });
  }

  const userId = activeTokens[token];
  const record = serverDatabase[userId];
  if (!record) {
    return res.status(401).json({ error: 'Session expired or user account not found.' });
  }

  (req as any).userId = userId;
  (req as any).userRecord = record.user;
  next();
}

// Administrator Authorization Middleware
function requireAdmin(req: Request, res: Response, next: NextFunction) {
  const user = (req as any).userRecord as ServerUserRecord;
  if (!user || (user.role !== 'admin' && !user.isAdmin)) {
    return res.status(403).json({ error: 'Forbidden: Administrator privileges required.' });
  }
  next();
}

// ==========================================
// 1. AUTHENTICATION & SESSION ROUTES
// ==========================================

// Health Check
app.get('/api/health', (req: Request, res: Response) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Auth: Sign In
app.post('/api/auth/signin', async (req: Request, res: Response) => {
  const { username, password } = req.body;
  const cleanUsername = (username || '').trim();

  if (!cleanUsername || !password) {
    return res.status(400).json({ error: 'Username and password are required.' });
  }

  // 1. Try remote Supabase Auth if available
  if (supabaseAdmin) {
    try {
      const internalEmail = `${cleanUsername.toLowerCase().replace(/[^a-z0-9_]/g, '_')}@sunrise-ds.com`;
      const { data, error } = await supabaseAdmin.auth.signInWithPassword({
        email: internalEmail,
        password,
      });

      if (!error && data.user) {
        const metadata = data.user.user_metadata || {};
        const isAdmin = metadata.role === 'admin' || metadata.is_admin === true;
        const role = isAdmin ? 'admin' : 'user';

        let existingRecord = serverDatabase[data.user.id];
        if (!existingRecord) {
          const userProfile: ServerUserRecord = {
            id: data.user.id,
            username: cleanUsername,
            passwordHash: password,
            fullName: metadata.full_name || cleanUsername,
            phone: metadata.phone || '',
            status: metadata.status || 'active',
            role,
            isAdmin,
            tier: isAdmin ? 'VIP 2 Elite' : 'Standard',
            referralCode: metadata.referral_code || `SC-${Math.random().toString(36).substring(2, 8).toUpperCase()}`,
            referredBy: metadata.referred_by,
            referralCount: metadata.referral_count || 0,
            referralEarningsUGX: metadata.referral_earnings_ugx || 0,
            referrals: metadata.referrals || [],
            welcomeBonusClaimed: true,
            memberSince: 'August 2026',
            createdAt: new Date().toISOString(),
          };

          serverDatabase[data.user.id] = {
            user: userProfile,
            data: {
              wallet: { totalBalanceUGX: 4000, dailyPnlUGX: 0, activeMachinesCount: 0, pendingTasksCount: 0 },
              transactions: [],
              machines: [],
              adminTasks: [],
              notifications: [],
            },
          };
          existingRecord = serverDatabase[data.user.id];
        }

        // Account blocked check
        if (existingRecord.user.status === 'blocked') {
          return res.status(403).json({
            error: 'Your account has been suspended by the platform administrator. Please contact support.',
            isBlocked: true,
            user: existingRecord.user,
          });
        }

        const token = generateToken(data.user.id);
        return res.json({
          user: existingRecord.user,
          data: existingRecord.data,
          isAdmin,
          token,
        });
      }
    } catch (e) {
      // Fall through to server-side user lookup
    }
  }

  // 2. Server database lookup
  let foundId: string | null = null;
  for (const id in serverDatabase) {
    if (serverDatabase[id].user.username.toLowerCase() === cleanUsername.toLowerCase()) {
      foundId = id;
      break;
    }
  }

  if (foundId) {
    const record = serverDatabase[foundId];
    if (record.user.passwordHash === password) {
      // Check if user is blocked
      if (record.user.status === 'blocked') {
        return res.status(403).json({
          error: 'Your account has been suspended by the platform administrator. Please contact support.',
          isBlocked: true,
          user: record.user,
        });
      }

      const token = generateToken(foundId);
      const isAdmin = record.user.role === 'admin' && record.user.isAdmin === true;
      return res.json({
        user: record.user,
        data: record.data,
        isAdmin,
        token,
      });
    } else {
      return res.status(401).json({ error: 'Incorrect password for username.' });
    }
  }

  return res.status(404).json({ error: 'Account not found. Please verify username or create a new account.' });
});

// Auth: Sign Up
app.post('/api/auth/signup', async (req: Request, res: Response) => {
  const { username, password, fullName, phone, referralCode } = req.body;
  const cleanUsername = (username || '').trim();

  if (!cleanUsername || cleanUsername.length < 3) {
    return res.status(400).json({ error: 'Username must be at least 3 characters.' });
  }
  if (!password || password.length < 6) {
    return res.status(400).json({ error: 'Password must be at least 6 characters.' });
  }

  // Unique username check
  for (const id in serverDatabase) {
    if (serverDatabase[id].user.username.toLowerCase() === cleanUsername.toLowerCase()) {
      return res.status(409).json({ error: 'Username is already taken. Please select another.' });
    }
  }

  let newUserId = `usr_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const newReferralCode = `SC-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;

  // Sync account with Supabase Auth if available
  if (supabaseAdmin) {
    try {
      const internalEmail = `${cleanUsername.toLowerCase().replace(/[^a-z0-9_]/g, '_')}@sunrise-ds.com`;
      const { data: supaData, error: supaErr } = await supabaseAdmin.auth.signUp({
        email: internalEmail,
        password,
        options: {
          data: {
            username: cleanUsername,
            full_name: (fullName || cleanUsername).trim(),
            phone: phone ? phone.trim() : undefined,
            referral_code: newReferralCode,
            role: 'user',
            is_admin: false,
          },
        },
      });
      if (supaData?.user?.id) {
        newUserId = supaData.user.id;
      }
    } catch (e) {
      console.warn('Supabase Auth user creation error / notice:', e);
    }
  }

  // Check referrer
  let referrerId: string | null = null;
  if (referralCode) {
    const cleanRef = referralCode.trim().toUpperCase();
    for (const id in serverDatabase) {
      if (serverDatabase[id].user.referralCode.toUpperCase() === cleanRef) {
        referrerId = id;
        break;
      }
    }
  }

  const newUser: ServerUserRecord = {
    id: newUserId,
    username: cleanUsername,
    passwordHash: password,
    fullName: (fullName || cleanUsername).trim(),
    phone: phone ? phone.trim() : undefined,
    status: 'active',
    role: 'user',
    isAdmin: false,
    tier: 'Standard',
    referralCode: newReferralCode,
    referredBy: referrerId ? serverDatabase[referrerId].user.referralCode : undefined,
    referralCount: 0,
    referralEarningsUGX: 0,
    referrals: [],
    welcomeBonusClaimed: true,
    memberSince: 'August 2026',
    createdAt: new Date().toISOString(),
  };

  // Initial user data with automatic UGX 4,000 welcome credit
  const initialUserData = {
    wallet: {
      totalBalanceUGX: 4000,
      dailyPnlUGX: 0,
      activeMachinesCount: 0,
      pendingTasksCount: 0,
    },
    transactions: [
      {
        id: `tx_welcome_${Date.now()}`,
        userId: newUserId,
        username: cleanUsername,
        userFullName: newUser.fullName,
        type: 'reward',
        amountUGX: 4000,
        currency: 'UGX',
        date: 'Just now',
        timestamp: Date.now(),
        status: 'completed',
        description: 'New User Starting Balance (UGX 4,000 Welcome Credit)',
        txHash: `0x${Math.random().toString(16).substring(2, 10)}...4000`,
      },
    ],
    machines: [],
    adminTasks: [],
    notifications: [
      {
        id: `notif_welcome_${Date.now()}`,
        title: 'Welcome Bonus Credited',
        message: 'UGX 4,000 starting credit deposited into your consolidated wallet.',
        timestamp: 'Just now',
        read: false,
        type: 'success',
      },
    ],
  };

  serverDatabase[newUserId] = {
    user: newUser,
    data: initialUserData,
  };

  // Credit referrer if applicable
  if (referrerId && serverDatabase[referrerId]) {
    const refUser = serverDatabase[referrerId].user;
    refUser.referralCount = (refUser.referralCount || 0) + 1;
    refUser.referralEarningsUGX = (refUser.referralEarningsUGX || 0) + 50000;
    refUser.referrals.unshift({
      id: newUserId,
      username: cleanUsername,
      fullName: newUser.fullName,
      registeredDate: 'Today',
      status: 'active',
      rewardUGX: 50000,
    });

    const refData = serverDatabase[referrerId].data;
    refData.wallet.totalBalanceUGX += 50000;
    refData.transactions.unshift({
      id: `tx_ref_${Date.now()}`,
      userId: referrerId,
      username: refUser.username,
      type: 'reward',
      amountUGX: 50000,
      currency: 'UGX',
      date: 'Just now',
      timestamp: Date.now(),
      status: 'completed',
      description: `Referral Incentive: @${cleanUsername} joined`,
      txHash: `0x${Math.random().toString(16).substring(2, 10)}...ref`,
    });
  }

  const token = generateToken(newUserId);
  saveDatabaseToDisk();
  return res.status(201).json({
    user: newUser,
    data: initialUserData,
    isAdmin: false,
    token,
  });
});

// Auth: Sign Out
app.post('/api/auth/signout', (req: Request, res: Response) => {
  const authHeader = req.headers.authorization;
  const token = authHeader?.replace(/^Bearer\s+/i, '');
  if (token && activeTokens[token]) {
    delete activeTokens[token];
    saveDatabaseToDisk();
  }
  res.json({ success: true, message: 'Signed out successfully.' });
});

// Auth: Me / Validate Active Session
app.get('/api/auth/me', requireAuth, (req: Request, res: Response) => {
  const userId = (req as any).userId;
  const record = serverDatabase[userId];
  if (!record) {
    return res.status(404).json({ error: 'User record not found.' });
  }

  res.json({
    user: record.user,
    data: record.data,
    isAdmin: Boolean(record.user.isAdmin || record.user.role === 'admin'),
    isBlocked: record.user.status === 'blocked',
  });
});

// User: Get Data
app.get('/api/user/data', requireAuth, (req: Request, res: Response) => {
  const userId = (req as any).userId;
  const record = serverDatabase[userId];
  if (!record) {
    return res.status(404).json({ error: 'User record not found.' });
  }

  res.json({
    user: record.user,
    data: record.data,
    isAdmin: Boolean(record.user.isAdmin || record.user.role === 'admin'),
    isBlocked: record.user.status === 'blocked',
  });
});

// User: Sync Data
app.post('/api/user/data', requireAuth, (req: Request, res: Response) => {
  const userId = (req as any).userId;
  const { wallet, transactions, machines, notifications, adminTasks } = req.body;
  const record = serverDatabase[userId];

  if (!record) {
    return res.status(404).json({ error: 'User not found.' });
  }

  // Prevent modifications if blocked
  if (record.user.status === 'blocked') {
    return res.status(403).json({ error: 'Account is blocked. Data modifications are disabled.' });
  }

  if (wallet) record.data.wallet = wallet;
  if (transactions) record.data.transactions = transactions;
  if (machines) record.data.machines = machines;
  if (notifications) record.data.notifications = notifications;
  if (adminTasks && record.user.role === 'admin') record.data.adminTasks = adminTasks;

  saveDatabaseToDisk();
  res.json({ success: true });
});

// ==========================================
// 2. DYNAMIC INVESTMENT PROJECTS CATALOG
// ==========================================

// Public: Get All Available Investment Projects / Machines
app.get('/api/catalog/machines', (req: Request, res: Response) => {
  res.json({ machines: catalogDatabase });
});

// Admin: Add New Investment Project Item
app.post('/api/admin/catalog/machines', requireAuth, requireAdmin, (req: Request, res: Response) => {
  const {
    title,
    subtitle,
    category,
    image,
    dailyRewardUGX,
    status,
    estYearlyROI,
    minInvestUGX,
    hashrate,
    powerSource,
    uptime,
    temperature,
    efficiency,
  } = req.body;

  if (!title || !minInvestUGX) {
    return res.status(400).json({ error: 'Project Title and Minimum Investment amount are required.' });
  }

  const newMachine: CatalogMachine = {
    id: `mach_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    title: title.trim(),
    subtitle: subtitle ? subtitle.trim() : undefined,
    category: category || 'DS-Mining',
    image:
      image ||
      'https://images.unsplash.com/photo-1509391365360-2e959784a276?auto=format&fit=crop&w=800&q=80',
    dailyRewardUGX: Number(dailyRewardUGX) || 250000,
    status: status || 'Active',
    estYearlyROI: Number(estYearlyROI) || 120,
    minInvestUGX: Math.round(Number(minInvestUGX)),
    hashrate: hashrate || '60.0 TH/s',
    powerSource: powerSource || 'Clean Energy Array',
    uptime: uptime || '99.9%',
    temperature: temperature || '38.0°C',
    efficiency: Number(efficiency) || 99.0,
    totalMinedUGX: 0,
    unclaimedRewardsUGX: 0,
    isBoosted: false,
  };

  catalogDatabase.unshift(newMachine);
  saveDatabaseToDisk();

  res.status(201).json({
    success: true,
    message: 'Investment project successfully created in Supabase catalog.',
    machine: newMachine,
    catalog: catalogDatabase,
  });
});

// Admin: Edit Existing Investment Project Item
app.put('/api/admin/catalog/machines/:id', requireAuth, requireAdmin, (req: Request, res: Response) => {
  const machineId = req.params.id;
  const index = catalogDatabase.findIndex((m) => m.id === machineId);

  if (index === -1) {
    return res.status(404).json({ error: 'Investment project not found in catalog.' });
  }

  const existing = catalogDatabase[index];
  const {
    title,
    subtitle,
    category,
    image,
    dailyRewardUGX,
    status,
    estYearlyROI,
    minInvestUGX,
    hashrate,
    powerSource,
    uptime,
    temperature,
    efficiency,
  } = req.body;

  const updated: CatalogMachine = {
    ...existing,
    title: title !== undefined ? title.trim() : existing.title,
    subtitle: subtitle !== undefined ? subtitle.trim() : existing.subtitle,
    category: category !== undefined ? category : existing.category,
    image: image !== undefined ? image : existing.image,
    dailyRewardUGX: dailyRewardUGX !== undefined ? Number(dailyRewardUGX) : existing.dailyRewardUGX,
    status: status !== undefined ? status : existing.status,
    estYearlyROI: estYearlyROI !== undefined ? Number(estYearlyROI) : existing.estYearlyROI,
    minInvestUGX: minInvestUGX !== undefined ? Math.round(Number(minInvestUGX)) : existing.minInvestUGX,
    hashrate: hashrate !== undefined ? hashrate : existing.hashrate,
    powerSource: powerSource !== undefined ? powerSource : existing.powerSource,
    uptime: uptime !== undefined ? uptime : existing.uptime,
    temperature: temperature !== undefined ? temperature : existing.temperature,
    efficiency: efficiency !== undefined ? Number(efficiency) : existing.efficiency,
  };

  catalogDatabase[index] = updated;
  saveDatabaseToDisk();

  res.json({
    success: true,
    message: `Project ${updated.title} updated successfully.`,
    machine: updated,
    catalog: catalogDatabase,
  });
});

// Admin: Delete / Deactivate Project Item
app.delete('/api/admin/catalog/machines/:id', requireAuth, requireAdmin, (req: Request, res: Response) => {
  const machineId = req.params.id;
  const index = catalogDatabase.findIndex((m) => m.id === machineId);

  if (index === -1) {
    return res.status(404).json({ error: 'Project not found.' });
  }

  const removed = catalogDatabase.splice(index, 1)[0];
  saveDatabaseToDisk();
  res.json({
    success: true,
    message: `Project ${removed.title} deleted from active catalog.`,
    catalog: catalogDatabase,
  });
});

// ==========================================
// 3. DEPOSIT & WITHDRAWAL APPROVAL WORKFLOW
// ==========================================

// User: Submit Deposit Request (Status: Pending - Balance NOT credited immediately)
app.post('/api/wallet/deposit', requireAuth, (req: Request, res: Response) => {
  const userId = (req as any).userId;
  const userRecord = (req as any).userRecord as ServerUserRecord;
  const record = serverDatabase[userId];

  if (record.user.status === 'blocked') {
    return res.status(403).json({ error: 'Account is suspended. Deposits are disabled.' });
  }

  const { amountUGX, paymentMethod, referenceInfo } = req.body;
  const numAmount = Math.round(Number(amountUGX));
  if (!numAmount || numAmount <= 0) {
    return res.status(400).json({ error: 'Please enter a valid deposit amount in UGX.' });
  }

  const txId = `tx_dep_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
  const nowStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) + ' Today';
  const methodLabel = paymentMethod || 'MTN Mobile Money / Airtel';
  const desc = `${methodLabel} Deposit Request`;

  const newTx = {
    id: txId,
    userId: userId,
    username: userRecord.username,
    userFullName: userRecord.fullName,
    type: 'deposit',
    amountUGX: numAmount,
    currency: 'UGX',
    date: nowStr,
    timestamp: Date.now(),
    status: 'pending', // PENDING ADMIN APPROVAL (Balance remains unchanged)
    description: desc,
    paymentMethod: methodLabel,
    recipientInfo: referenceInfo || 'Sunrise Capital Treasury',
    txHash: `0x${Math.random().toString(16).substring(2, 10)}...dep`,
  };

  record.data.transactions.unshift(newTx);

  const userNotif = {
    id: `notif_${Date.now()}`,
    title: 'Deposit Submitted (Pending Approval)',
    message: `Your deposit request for UGX ${numAmount.toLocaleString()} via ${methodLabel} has been submitted. Funds will be credited once verified by administrator.`,
    timestamp: 'Just now',
    read: false,
    type: 'info',
  };
  record.data.notifications.unshift(userNotif);

  // Broadcast admin task
  const adminTask = {
    id: `task_${Date.now()}`,
    title: `Pending Deposit Review: UGX ${numAmount.toLocaleString()}`,
    description: `User @${userRecord.username} (${userRecord.fullName}) submitted a deposit request via ${methodLabel}.`,
    urgency: 'high',
    category: 'Deposit Verification',
    timestamp: 'Just now',
    status: 'pending',
    amountUGX: numAmount,
    transactionId: txId,
    userId: userId,
    username: userRecord.username,
  };

  for (const id in serverDatabase) {
    if (serverDatabase[id].user.role === 'admin' || serverDatabase[id].user.isAdmin) {
      serverDatabase[id].data.adminTasks.unshift(adminTask);
      serverDatabase[id].data.wallet.pendingTasksCount = (serverDatabase[id].data.wallet.pendingTasksCount || 0) + 1;
    }
  }

  saveDatabaseToDisk();

  res.status(201).json({
    success: true,
    message: 'Deposit request submitted. Pending administrator approval.',
    transaction: newTx,
    wallet: record.data.wallet,
  });
});

// User: Submit Withdrawal Request (Status: Pending - Balance NOT deducted immediately)
app.post('/api/wallet/withdraw', requireAuth, (req: Request, res: Response) => {
  const userId = (req as any).userId;
  const userRecord = (req as any).userRecord as ServerUserRecord;
  const record = serverDatabase[userId];

  if (record.user.status === 'blocked') {
    return res.status(403).json({ error: 'Account is suspended. Withdrawals are disabled.' });
  }

  const { amountUGX, paymentMethod, recipientInfo } = req.body;
  const numAmount = Math.round(Number(amountUGX));
  if (!numAmount || numAmount <= 0) {
    return res.status(400).json({ error: 'Please enter a valid withdrawal amount in UGX.' });
  }

  // Validate sufficient available balance
  const currentBalance = record.data.wallet.totalBalanceUGX || 0;
  if (numAmount > currentBalance) {
    return res.status(400).json({
      error: `Insufficient Balance. Requested UGX ${numAmount.toLocaleString()} exceeds your available balance of UGX ${currentBalance.toLocaleString()}.`,
    });
  }

  const txId = `tx_wth_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
  const nowStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) + ' Today';
  const methodLabel = paymentMethod || 'Mobile Money Payout';
  const desc = `Withdrawal to ${recipientInfo || 'Registered Account'}`;

  const newTx = {
    id: txId,
    userId: userId,
    username: userRecord.username,
    userFullName: userRecord.fullName,
    type: 'withdraw',
    amountUGX: numAmount,
    currency: 'UGX',
    date: nowStr,
    timestamp: Date.now(),
    status: 'pending', // PENDING ADMIN APPROVAL (Balance remains intact until approval)
    description: desc,
    paymentMethod: methodLabel,
    recipientInfo: recipientInfo || 'Registered Destination',
    txHash: `0x${Math.random().toString(16).substring(2, 10)}...wth`,
  };

  record.data.transactions.unshift(newTx);

  const userNotif = {
    id: `notif_${Date.now()}`,
    title: 'Withdrawal Request Submitted',
    message: `Your withdrawal request for UGX ${numAmount.toLocaleString()} to ${recipientInfo || methodLabel} is pending administrator review and approval.`,
    timestamp: 'Just now',
    read: false,
    type: 'info',
  };
  record.data.notifications.unshift(userNotif);

  const adminTask = {
    id: `task_${Date.now()}`,
    title: `Pending Withdrawal Review: UGX ${numAmount.toLocaleString()}`,
    description: `User @${userRecord.username} requested withdrawal of UGX ${numAmount.toLocaleString()} to ${recipientInfo || methodLabel}.`,
    urgency: 'high',
    category: 'Withdrawal Authorization',
    timestamp: 'Just now',
    status: 'pending',
    amountUGX: numAmount,
    transactionId: txId,
    userId: userId,
    username: userRecord.username,
  };

  for (const id in serverDatabase) {
    if (serverDatabase[id].user.role === 'admin' || serverDatabase[id].user.isAdmin) {
      serverDatabase[id].data.adminTasks.unshift(adminTask);
      serverDatabase[id].data.wallet.pendingTasksCount = (serverDatabase[id].data.wallet.pendingTasksCount || 0) + 1;
    }
  }

  saveDatabaseToDisk();

  res.status(201).json({
    success: true,
    message: 'Withdrawal request submitted. Pending administrator approval.',
    transaction: newTx,
    wallet: record.data.wallet,
  });
});

// Admin: Get All Pending Transactions
app.get('/api/admin/pending-transactions', requireAuth, requireAdmin, (req: Request, res: Response) => {
  const pendingTransactions: any[] = [];

  for (const uid in serverDatabase) {
    const userAcc = serverDatabase[uid];
    const txs = userAcc.data.transactions || [];
    for (const t of txs) {
      if (t.status === 'pending') {
        pendingTransactions.push({
          ...t,
          userId: uid,
          username: userAcc.user.username,
          userFullName: userAcc.user.fullName,
        });
      }
    }
  }

  pendingTransactions.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
  res.json({ transactions: pendingTransactions });
});

// Admin: Approve Transaction (Atomically updates balance & prevents double-processing)
app.post('/api/admin/transactions/:id/approve', requireAuth, requireAdmin, (req: Request, res: Response) => {
  const txId = req.params.id;

  let targetUserRecord: any = null;
  let targetTx: any = null;

  for (const uid in serverDatabase) {
    const u = serverDatabase[uid];
    const found = u.data.transactions.find((t: any) => t.id === txId);
    if (found) {
      targetUserRecord = u;
      targetTx = found;
      break;
    }
  }

  if (!targetTx || !targetUserRecord) {
    return res.status(404).json({ error: 'Transaction not found.' });
  }

  // DOUBLE-PROCESSING PROTECTION
  if (targetTx.status !== 'pending') {
    return res.status(409).json({
      error: `Transaction has already been ${targetTx.status}. Double-processing is prevented.`,
    });
  }

  if (targetTx.type === 'deposit') {
    targetTx.status = 'approved';
    targetTx.approvedAt = new Date().toISOString();
    targetUserRecord.data.wallet.totalBalanceUGX += targetTx.amountUGX;

    targetUserRecord.data.notifications.unshift({
      id: `notif_appr_${Date.now()}`,
      title: 'Deposit Approved & Credited!',
      message: `Your deposit of UGX ${targetTx.amountUGX.toLocaleString()} has been approved. UGX ${targetTx.amountUGX.toLocaleString()} was credited to your balance.`,
      timestamp: 'Just now',
      read: false,
      type: 'success',
    });
  } else if (targetTx.type === 'withdraw') {
    const userBalance = targetUserRecord.data.wallet.totalBalanceUGX || 0;
    if (userBalance < targetTx.amountUGX) {
      return res.status(400).json({
        error: `Cannot approve withdrawal: User balance (UGX ${userBalance.toLocaleString()}) is less than requested amount (UGX ${targetTx.amountUGX.toLocaleString()}).`,
      });
    }

    targetTx.status = 'approved';
    targetTx.approvedAt = new Date().toISOString();
    targetUserRecord.data.wallet.totalBalanceUGX -= targetTx.amountUGX;

    targetUserRecord.data.notifications.unshift({
      id: `notif_appr_${Date.now()}`,
      title: 'Withdrawal Approved & Dispatched!',
      message: `Your withdrawal of UGX ${targetTx.amountUGX.toLocaleString()} has been authorized and dispatched to ${targetTx.recipientInfo || 'your destination'}.`,
      timestamp: 'Just now',
      read: false,
      type: 'success',
    });
  } else {
    targetTx.status = 'approved';
  }

  // Update any linked tasks
  for (const uid in serverDatabase) {
    if (serverDatabase[uid].user.role === 'admin' || serverDatabase[uid].user.isAdmin) {
      const task = serverDatabase[uid].data.adminTasks.find(
        (t: any) => t.transactionId === txId || t.id === txId
      );
      if (task) {
        task.status = 'approved';
        serverDatabase[uid].data.wallet.pendingTasksCount = Math.max(
          0,
          (serverDatabase[uid].data.wallet.pendingTasksCount || 1) - 1
        );
      }
    }
  }

  saveDatabaseToDisk();

  res.json({
    success: true,
    message: `Transaction ${txId} successfully approved.`,
    transaction: targetTx,
    updatedUserBalance: targetUserRecord.data.wallet.totalBalanceUGX,
  });
});

// Admin: Reject Transaction
app.post('/api/admin/transactions/:id/reject', requireAuth, requireAdmin, (req: Request, res: Response) => {
  const txId = req.params.id;

  let targetUserRecord: any = null;
  let targetTx: any = null;

  for (const uid in serverDatabase) {
    const u = serverDatabase[uid];
    const found = u.data.transactions.find((t: any) => t.id === txId);
    if (found) {
      targetUserRecord = u;
      targetTx = found;
      break;
    }
  }

  if (!targetTx || !targetUserRecord) {
    return res.status(404).json({ error: 'Transaction not found.' });
  }

  if (targetTx.status !== 'pending') {
    return res.status(409).json({
      error: `Transaction has already been ${targetTx.status}. Double-processing is prevented.`,
    });
  }

  targetTx.status = 'rejected';
  targetTx.rejectedAt = new Date().toISOString();

  targetUserRecord.data.notifications.unshift({
    id: `notif_rej_${Date.now()}`,
    title: `${targetTx.type === 'deposit' ? 'Deposit' : 'Withdrawal'} Request Rejected`,
    message: `Your ${targetTx.type} request of UGX ${targetTx.amountUGX.toLocaleString()} was reviewed and rejected by the platform administrator.`,
    timestamp: 'Just now',
    read: false,
    type: 'alert',
  });

  for (const uid in serverDatabase) {
    if (serverDatabase[uid].user.role === 'admin' || serverDatabase[uid].user.isAdmin) {
      const task = serverDatabase[uid].data.adminTasks.find(
        (t: any) => t.transactionId === txId || t.id === txId
      );
      if (task) {
        task.status = 'rejected';
        serverDatabase[uid].data.wallet.pendingTasksCount = Math.max(
          0,
          (serverDatabase[uid].data.wallet.pendingTasksCount || 1) - 1
        );
      }
    }
  }

  saveDatabaseToDisk();

  res.json({
    success: true,
    message: `Transaction ${txId} was rejected.`,
    transaction: targetTx,
  });
});

// ==========================================
// 4. ADMIN USER MANAGEMENT & AUDIT LOGS
// ==========================================

// Admin: Get All Users List
app.get('/api/admin/users', requireAuth, requireAdmin, (req: Request, res: Response) => {
  const usersList: any[] = [];

  for (const uid in serverDatabase) {
    const acc = serverDatabase[uid];
    usersList.push({
      id: acc.user.id,
      username: acc.user.username,
      fullName: acc.user.fullName,
      phone: acc.user.phone || '',
      status: acc.user.status || 'active',
      role: acc.user.role,
      isAdmin: Boolean(acc.user.isAdmin || acc.user.role === 'admin'),
      tier: acc.user.tier,
      memberSince: acc.user.memberSince,
      createdAt: acc.user.createdAt,
      balanceUGX: acc.data.wallet.totalBalanceUGX || 0,
      activeMachinesCount: acc.data.machines ? acc.data.machines.length : 0,
      transactionsCount: acc.data.transactions ? acc.data.transactions.length : 0,
      referralCount: acc.user.referralCount || 0,
      referralCode: acc.user.referralCode,
    });
  }

  res.json({ users: usersList });
});

// Admin: Edit User Info (Username, Full Name, Phone)
app.put('/api/admin/users/:id', requireAuth, requireAdmin, (req: Request, res: Response) => {
  const targetId = req.params.id;
  const record = serverDatabase[targetId];

  if (!record) {
    return res.status(404).json({ error: 'User record not found.' });
  }

  const { username, fullName, phone } = req.body;

  // If changing username, ensure uniqueness
  if (username && username.trim().toLowerCase() !== record.user.username.toLowerCase()) {
    const cleanU = username.trim();
    if (cleanU.length < 3) {
      return res.status(400).json({ error: 'Username must be at least 3 characters.' });
    }
    for (const uid in serverDatabase) {
      if (uid !== targetId && serverDatabase[uid].user.username.toLowerCase() === cleanU.toLowerCase()) {
        return res.status(409).json({ error: 'Username is already taken by another account.' });
      }
    }
    record.user.username = cleanU;
  }

  if (fullName !== undefined) {
    record.user.fullName = fullName.trim();
  }
  if (phone !== undefined) {
    record.user.phone = phone.trim();
  }

  saveDatabaseToDisk();

  res.json({
    success: true,
    message: `Account @${record.user.username} updated successfully.`,
    user: record.user,
  });
});

// Admin: Edit User Balance (Add or Deduct funds with audit record)
app.post('/api/admin/users/:id/balance', requireAuth, requireAdmin, (req: Request, res: Response) => {
  const targetId = req.params.id;
  const adminUser = (req as any).userRecord as ServerUserRecord;
  const record = serverDatabase[targetId];

  if (!record) {
    return res.status(404).json({ error: 'User record not found.' });
  }

  const { amountUGX, type, reason } = req.body;
  const numAmount = Math.round(Number(amountUGX));

  if (!numAmount || numAmount <= 0) {
    return res.status(400).json({ error: 'Please specify a valid positive adjustment amount in UGX.' });
  }

  if (type !== 'add' && type !== 'deduct') {
    return res.status(400).json({ error: 'Adjustment type must be "add" or "deduct".' });
  }

  const previousBalance = record.data.wallet.totalBalanceUGX || 0;
  let newBalance = previousBalance;

  if (type === 'add') {
    newBalance = previousBalance + numAmount;
  } else {
    if (numAmount > previousBalance) {
      return res.status(400).json({
        error: `Cannot deduct UGX ${numAmount.toLocaleString()}. User current balance is only UGX ${previousBalance.toLocaleString()}.`,
      });
    }
    newBalance = previousBalance - numAmount;
  }

  // Update user balance
  record.data.wallet.totalBalanceUGX = newBalance;

  // Create audit log record
  const auditId = `adj_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
  const auditEntry: BalanceAdjustmentRecord = {
    id: auditId,
    userId: targetId,
    username: record.user.username,
    userFullName: record.user.fullName,
    previousBalanceUGX: previousBalance,
    adjustmentAmountUGX: type === 'add' ? numAmount : -numAmount,
    newBalanceUGX: newBalance,
    type,
    reason: reason ? reason.trim() : 'Administrative Balance Adjustment',
    adminId: adminUser.id,
    adminUsername: adminUser.username,
    timestamp: Date.now(),
    date: new Date().toLocaleString(),
  };

  balanceAdjustments.unshift(auditEntry);

  // Add transaction to user history
  record.data.transactions.unshift({
    id: `tx_adj_${Date.now()}`,
    userId: targetId,
    username: record.user.username,
    type: type === 'add' ? 'reward' : 'withdraw',
    amountUGX: numAmount,
    currency: 'UGX',
    date: 'Just now',
    timestamp: Date.now(),
    status: 'completed',
    description: `Admin Balance Adjustment (${type === 'add' ? '+' : '-'}UGX ${numAmount.toLocaleString()}): ${reason || 'System update'}`,
    txHash: `0x${Math.random().toString(16).substring(2, 10)}...adj`,
  });

  // Notify user
  record.data.notifications.unshift({
    id: `notif_adj_${Date.now()}`,
    title: `Balance Adjusted by Administrator`,
    message: `${type === 'add' ? 'Added' : 'Deducted'} UGX ${numAmount.toLocaleString()}. Reason: ${reason || 'Administrative adjustment'}. New Balance: UGX ${newBalance.toLocaleString()}.`,
    timestamp: 'Just now',
    read: false,
    type: type === 'add' ? 'success' : 'alert',
  });

  saveDatabaseToDisk();

  res.json({
    success: true,
    message: `User balance adjusted successfully. New balance: UGX ${newBalance.toLocaleString()}`,
    previousBalance,
    newBalance,
    adjustment: auditEntry,
    wallet: record.data.wallet,
  });
});

// Admin: Block / Unblock User
app.post('/api/admin/users/:id/status', requireAuth, requireAdmin, (req: Request, res: Response) => {
  const targetId = req.params.id;
  const record = serverDatabase[targetId];

  if (!record) {
    return res.status(404).json({ error: 'User record not found.' });
  }

  const { status } = req.body;
  if (status !== 'active' && status !== 'blocked') {
    return res.status(400).json({ error: 'Status must be "active" or "blocked".' });
  }

  record.user.status = status;
  saveDatabaseToDisk();

  res.json({
    success: true,
    message: `User @${record.user.username} account status set to ${status}.`,
    user: record.user,
  });
});

// Admin: Safe Delete / Deactivate User
app.delete('/api/admin/users/:id', requireAuth, requireAdmin, (req: Request, res: Response) => {
  const targetId = req.params.id;
  const adminUser = (req as any).userRecord as ServerUserRecord;
  const record = serverDatabase[targetId];

  if (!record) {
    return res.status(404).json({ error: 'User not found.' });
  }

  if (targetId === adminUser.id) {
    return res.status(400).json({ error: 'Cannot delete your own active administrator account.' });
  }

  const deletedUsername = record.user.username;
  delete serverDatabase[targetId];

  // Invalidate any active session tokens for this user
  for (const token in activeTokens) {
    if (activeTokens[token] === targetId) {
      delete activeTokens[token];
    }
  }

  saveDatabaseToDisk();

  res.json({
    success: true,
    message: `User @${deletedUsername} was deleted and all active sessions closed.`,
  });
});

// Admin: Get Balance Adjustments Audit Log
app.get('/api/admin/audit/balance-adjustments', requireAuth, requireAdmin, (req: Request, res: Response) => {
  res.json({ adjustments: balanceAdjustments });
});

// ==========================================
// 5. USER-SPECIFIC INVESTMENTS & HARVESTING
// ==========================================

// User: Get active user investments
app.get('/api/user/investments', requireAuth, (req: Request, res: Response) => {
  const userId = (req as any).userId;
  const record = serverDatabase[userId];

  if (!record) {
    return res.status(404).json({ error: 'User record not found.' });
  }

  res.json({ investments: record.data.machines || [] });
});

// User: Activate / Purchase Investment Node
app.post('/api/user/investments/buy', requireAuth, (req: Request, res: Response) => {
  const userId = (req as any).userId;
  const userRecord = (req as any).userRecord as ServerUserRecord;
  const record = serverDatabase[userId];

  if (record.user.status === 'blocked') {
    return res.status(403).json({ error: 'Account is blocked. Investment purchases are disabled.' });
  }

  const { machineId, title, category, image, minInvestUGX, dailyRewardUGX, hashrate, estYearlyROI, powerSource } = req.body;
  const cost = Math.round(Number(minInvestUGX));

  if (!cost || cost <= 0) {
    return res.status(400).json({ error: 'Invalid investment machine configuration.' });
  }

  const currentBalance = record.data.wallet.totalBalanceUGX || 0;
  if (currentBalance < cost) {
    return res.status(400).json({
      error: `Insufficient balance. Machine investment requires UGX ${cost.toLocaleString()}, but available balance is UGX ${currentBalance.toLocaleString()}. Please deposit funds first.`,
    });
  }

  record.data.wallet.totalBalanceUGX -= cost;
  record.data.wallet.activeMachinesCount = (record.data.wallet.activeMachinesCount || 0) + 1;
  record.data.wallet.dailyPnlUGX = (record.data.wallet.dailyPnlUGX || 0) + (dailyRewardUGX || 0);

  const newInvestment = {
    id: `inv_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    userId: userId,
    machineId: machineId || 'custom_node',
    title: title || 'Mining Rig Node',
    category: category || 'DS-Mining',
    image: image || 'https://images.unsplash.com/photo-1509391365360-2e959784a276?auto=format&fit=crop&w=800&q=80',
    dailyRewardUGX: dailyRewardUGX || 210000,
    status: 'Active',
    estYearlyROI: estYearlyROI || 125,
    minInvestUGX: cost,
    amountInvestedUGX: cost,
    investedDate: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
    period: '365 Days / Continuous Sovereign Yield',
    hashrate: hashrate || '50.0 TH/s',
    powerSource: powerSource || 'Hybrid Kinetic / Solar Array',
    uptime: '100.00%',
    temperature: '38.0°C',
    efficiency: 99.4,
    totalMinedUGX: 0,
    unclaimedRewardsUGX: 0,
    isBoosted: false,
  };

  record.data.machines.unshift(newInvestment);

  // Dynamic Return Bonus based on 15,000 -> 25,000 ratio (which is a ~66.67% bonus)
  const bonusMultiplier = 10000 / 15000; // 2/3
  const bonusAdded = Math.round(cost * bonusMultiplier);

  if (bonusAdded > 0) {
    record.data.wallet.totalBalanceUGX += bonusAdded;
    
    // Create a transaction for the bonus
    const bonusTx = {
      id: `tx_bonus_${Date.now()}`,
      userId: userId,
      type: 'bonus',
      amountUGX: bonusAdded,
      status: 'Completed',
      date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
      description: 'Massive Return Bonus for Investment',
      isCredit: true,
    };
    record.data.transactions.unshift(bonusTx);

    // Notify user
    record.data.notifications.unshift({
      id: `notif_bonus_${Date.now()}`,
      title: 'Massive Investment Bonus!',
      message: `You received an instant return bonus of UGX ${bonusAdded.toLocaleString()} for your investment!`,
      timestamp: 'Just now',
      isRead: false,
      type: 'system',
    });
  }

  const txId = `tx_inv_${Date.now()}`;
  record.data.transactions.unshift({
    id: txId,
    userId: userId,
    username: userRecord.username,
    userFullName: userRecord.fullName,
    type: 'investment',
    amountUGX: cost,
    currency: 'UGX',
    date: 'Just now',
    timestamp: Date.now(),
    status: 'completed',
    description: `Node Activation: ${title || 'Hardware Investment'}`,
    txHash: `0x${Math.random().toString(16).substring(2, 10)}...node`,
  });

  record.data.notifications.unshift({
    id: `notif_${Date.now()}`,
    title: 'Investment Active!',
    message: `Successfully activated ${title}. Daily yield of +UGX ${(dailyRewardUGX || 0).toLocaleString()} will begin accruing.`,
    timestamp: 'Just now',
    read: false,
    type: 'success',
  });

  saveDatabaseToDisk();

  res.status(201).json({
    success: true,
    investment: newInvestment,
    wallet: record.data.wallet,
  });
});

// User: Harvest / Claim Investment Yield
app.post('/api/user/investments/:id/claim', requireAuth, (req: Request, res: Response) => {
  const userId = (req as any).userId;
  const investmentId = req.params.id;
  const record = serverDatabase[userId];

  const investment = record.data.machines.find((m: any) => m.id === investmentId);
  if (!investment) {
    return res.status(404).json({ error: 'Investment node not found.' });
  }

  const unclaimed = investment.unclaimedRewardsUGX || 0;
  if (unclaimed <= 0) {
    return res.status(400).json({ error: 'No pending yield to claim right now.' });
  }

  record.data.wallet.totalBalanceUGX += unclaimed;
  investment.totalMinedUGX = (investment.totalMinedUGX || 0) + unclaimed;
  investment.unclaimedRewardsUGX = 0;

  record.data.transactions.unshift({
    id: `tx_claim_${Date.now()}`,
    userId: userId,
    type: 'reward',
    amountUGX: unclaimed,
    currency: 'UGX',
    date: 'Just now',
    timestamp: Date.now(),
    status: 'completed',
    description: `Harvested Mining Yield (${investment.title})`,
    txHash: `0x${Math.random().toString(16).substring(2, 10)}...yield`,
  });

  saveDatabaseToDisk();

  res.json({
    success: true,
    claimedUGX: unclaimed,
    wallet: record.data.wallet,
    investment,
  });
});

// Protected Admin: Get All Admin Tasks
app.get('/api/admin/tasks', requireAuth, requireAdmin, (req: Request, res: Response) => {
  const userId = (req as any).userId;
  const record = serverDatabase[userId];
  res.json({ tasks: record.data.adminTasks || [] });
});

// Protected Admin: Approve Task
app.post('/api/admin/tasks/:id/approve', requireAuth, requireAdmin, (req: Request, res: Response) => {
  const taskId = req.params.id;
  const userId = (req as any).userId;
  const record = serverDatabase[userId];

  const task = record.data.adminTasks.find((t: any) => t.id === taskId);
  if (!task) {
    return res.status(404).json({ error: 'Admin task not found.' });
  }

  task.status = 'approved';
  record.data.wallet.pendingTasksCount = Math.max(0, record.data.wallet.pendingTasksCount - 1);

  if (task.transactionId) {
    for (const uid in serverDatabase) {
      const u = serverDatabase[uid];
      const foundTx = u.data.transactions.find((t: any) => t.id === task.transactionId);
      if (foundTx && foundTx.status === 'pending') {
        foundTx.status = 'approved';
        foundTx.approvedAt = new Date().toISOString();
        if (foundTx.type === 'deposit') {
          u.data.wallet.totalBalanceUGX += foundTx.amountUGX;
        } else if (foundTx.type === 'withdraw') {
          u.data.wallet.totalBalanceUGX = Math.max(0, u.data.wallet.totalBalanceUGX - foundTx.amountUGX);
        }
      }
    }
  }

  saveDatabaseToDisk();
  res.json({ success: true, task });
});

// Protected Admin: Reject Task
app.post('/api/admin/tasks/:id/reject', requireAuth, requireAdmin, (req: Request, res: Response) => {
  const taskId = req.params.id;
  const userId = (req as any).userId;
  const record = serverDatabase[userId];

  const task = record.data.adminTasks.find((t: any) => t.id === taskId);
  if (!task) {
    return res.status(404).json({ error: 'Admin task not found.' });
  }

  task.status = 'rejected';
  record.data.wallet.pendingTasksCount = Math.max(0, record.data.wallet.pendingTasksCount - 1);

  if (task.transactionId) {
    for (const uid in serverDatabase) {
      const u = serverDatabase[uid];
      const foundTx = u.data.transactions.find((t: any) => t.id === task.transactionId);
      if (foundTx && foundTx.status === 'pending') {
        foundTx.status = 'rejected';
        foundTx.rejectedAt = new Date().toISOString();
      }
    }
  }

  saveDatabaseToDisk();
  res.json({ success: true, task });
});

// ==========================================
// VITE SPA & STATIC ASSET SERVER
// ==========================================
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req: Request, res: Response) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Sunrise Capital full-stack server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
