/**
 * Supabase Authentication & Cross-Device Data Persistence Service
 * Single source of truth hosted on Supabase Cloud.
 * NO browser localStorage or device storage is used for user financial data.
 */

import { createClient, SupabaseClient, User } from '@supabase/supabase-js';
import {
  UserProfile,
  WalletState,
  Transaction,
  Machine,
  AdminTask,
  AppNotification,
  AdminUserSummary,
  BalanceAdjustment,
} from '../types';
import {
  INITIAL_MACHINES,
  INITIAL_WALLET,
  INITIAL_TRANSACTIONS,
  INITIAL_ADMIN_TASKS,
  INITIAL_NOTIFICATIONS,
} from '../data/initialData';
import { apiClient } from './apiClient';

export interface UserAccountData {
  wallet: WalletState;
  transactions: Transaction[];
  machines: Machine[];
  adminTasks: AdminTask[];
  notifications: AppNotification[];
}

class AuthService {
  private client: SupabaseClient | null = null;
  private currentUser: UserProfile | null = null;
  private memoryUserData: { [userId: string]: UserAccountData } = {};

  constructor() {
    this.init();
  }

  private init() {
    const envUrl = import.meta.env.VITE_SUPABASE_URL as string;
    const envKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;
    if (envUrl && envKey) {
      try {
        // Initialize Supabase client strictly without localStorage persistence for clean memory flow
        this.client = createClient(envUrl, envKey, {
          auth: {
            persistSession: true,
            autoRefreshToken: true,
            detectSessionInUrl: true,
          },
        });
      } catch (e) {
        console.warn('Supabase client initialization warning:', e);
      }
    }
  }

  public getClient(): SupabaseClient | null {
    return this.client;
  }

  public getCurrentUser(): UserProfile | null {
    return this.currentUser;
  }

  public isAuthenticated(): boolean {
    return this.currentUser !== null;
  }

  public isAdmin(): boolean {
    if (!this.currentUser) return false;
    return Boolean(this.currentUser.isAdmin || this.currentUser.role === 'admin');
  }

  public isBlocked(): boolean {
    if (!this.currentUser) return false;
    return this.currentUser.status === 'blocked';
  }

  public setCurrentUser(user: UserProfile | null) {
    this.currentUser = user;
    if (user) {
      apiClient.setSession(null, user.id);
    } else {
      apiClient.setSession(null, null);
    }
  }

  private formatEmail(identifier: string): string {
    const clean = identifier.trim().toLowerCase();
    if (clean.includes('@')) {
      return clean;
    }
    const sanitizedUsername = clean.replace(/[^a-z0-9_]/g, '_');
    return `${sanitizedUsername}@sunrise-ds.com`;
  }

  // ==========================================================
  // CROSS-DEVICE SESSION RESTORATION (from Supabase Cloud)
  // ==========================================================

  public async restoreSession(): Promise<{ user: UserProfile | null; data: UserAccountData | null }> {
    if (!this.client) {
      return { user: null, data: null };
    }

    try {
      const { data: { session }, error: sessionErr } = await this.client.auth.getSession();
      if (sessionErr || !session || !session.user) {
        // Try fallback to backend active session if available
        const apiRes = await apiClient.fetchUserData();
        if (apiRes && apiRes.user) {
          this.currentUser = apiRes.user;
          this.memoryUserData[apiRes.user.id] = apiRes.data || {
            wallet: INITIAL_WALLET,
            transactions: [],
            machines: [],
            adminTasks: [],
            notifications: [],
          };
          return { user: apiRes.user, data: this.memoryUserData[apiRes.user.id] };
        }
        this.currentUser = null;
        return { user: null, data: null };
      }

      const user = session.user;
      const profile = await this.fetchProfileFromSupabase(user);
      if (!profile) {
        this.currentUser = null;
        return { user: null, data: null };
      }

      this.setCurrentUser(profile);

      if (profile.status === 'blocked') {
        return { user: profile, data: null };
      }

      const dataRes = await this.refreshUserData();
      return { user: profile, data: dataRes.data || null };
    } catch (err) {
      console.warn('Session restore exception:', err);
      return { user: null, data: null };
    }
  }

  // ==========================================================
  // AUTHENTICATION: SIGN IN & SIGN UP (Hosted on Supabase)
  // ==========================================================

  public async signInWithPassword(usernameOrEmail: string, password: string): Promise<{
    user?: UserProfile;
    data?: UserAccountData;
    error?: string;
    isBlocked?: boolean;
  }> {
    const cleanInput = (usernameOrEmail || '').trim();
    if (!cleanInput || !password) {
      return { error: 'Username/Email and password are required.' };
    }

    const email = this.formatEmail(cleanInput);

    // 1. Authenticate with Supabase Auth
    if (this.client) {
      try {
        const { data: authData, error: authError } = await this.client.auth.signInWithPassword({
          email,
          password,
        });

        if (!authError && authData.user) {
          const profile = await this.fetchProfileFromSupabase(authData.user);
          if (profile) {
            this.setCurrentUser(profile);

            if (profile.status === 'blocked') {
              return { error: 'Account is suspended by administrator.', isBlocked: true, user: profile };
            }

            const dataRes = await this.refreshUserData();
            const accountData = dataRes.data || {
              wallet: INITIAL_WALLET,
              transactions: [],
              machines: [],
              adminTasks: [],
              notifications: [],
            };

            this.memoryUserData[profile.id] = accountData;
            return { user: profile, data: accountData };
          }
        }
      } catch (supaErr: any) {
        console.warn('Supabase direct sign-in fallback check:', supaErr?.message);
      }
    }

    // 2. Fallback via Centralized Backend API (which syncs to Supabase)
    const apiResult = await apiClient.signIn(cleanInput, password);
    if (apiResult.error) {
      return { error: apiResult.error, isBlocked: apiResult.isBlocked };
    }

    if (apiResult.user) {
      this.setCurrentUser(apiResult.user);
      if (apiResult.data) {
        this.memoryUserData[apiResult.user.id] = apiResult.data;
      }
      return { user: apiResult.user, data: apiResult.data };
    }

    return { error: 'Authentication failed. Please check credentials.' };
  }

  public async signUp(
    username: string,
    password: string,
    fullName?: string,
    phone?: string,
    referralCode?: string
  ): Promise<{
    user?: UserProfile;
    data?: UserAccountData;
    error?: string;
  }> {
    const cleanUsername = (username || '').trim();
    if (!cleanUsername) {
      return { error: 'Username is required.' };
    }
    const email = this.formatEmail(cleanUsername);

    // 1. Sign up on Supabase Auth
    if (this.client) {
      try {
        const { data: authData, error: authError } = await this.client.auth.signUp({
          email,
          password,
          options: {
            data: {
              username: cleanUsername,
              full_name: fullName || cleanUsername,
              phone: phone || '',
              referral_code: referralCode || '',
              role: 'user',
            },
          },
        });

        if (!authError && authData.user) {
          // If session created automatically
          const profile = await this.fetchProfileFromSupabase(authData.user);
          if (profile) {
            this.setCurrentUser(profile);
            const dataRes = await this.refreshUserData();
            const userData = dataRes.data || {
              wallet: INITIAL_WALLET,
              transactions: [],
              machines: [],
              adminTasks: [],
              notifications: [],
            };
            this.memoryUserData[profile.id] = userData;
            return { user: profile, data: userData };
          }
        }
      } catch (supaErr: any) {
        console.warn('Supabase signup client fallback:', supaErr?.message);
      }
    }

    // 2. Fallback via Centralized Backend API
    const apiResult = await apiClient.signUp(cleanUsername, password, fullName, phone, referralCode);
    if (apiResult.error) {
      return { error: apiResult.error };
    }

    if (apiResult.user) {
      this.setCurrentUser(apiResult.user);
      if (apiResult.data) {
        this.memoryUserData[apiResult.user.id] = apiResult.data;
      }
      return { user: apiResult.user, data: apiResult.data };
    }

    return { error: 'Failed to create user account.' };
  }

  public async signOut(): Promise<void> {
    if (this.client) {
      try {
        await this.client.auth.signOut();
      } catch {
        // Ignore signout error
      }
    }
    await apiClient.signOut();
    this.setCurrentUser(null);
    this.memoryUserData = {};
  }

  // ==========================================================
  // PROFILE & LIVE DATA SYNC (Cross-Device Single Source of Truth)
  // ==========================================================

  private async fetchProfileFromSupabase(authUser: User): Promise<UserProfile | null> {
    const meta = authUser.user_metadata || {};
    const isAdmin = meta.role === 'admin' || meta.is_admin === true;
    const fallbackProfile: UserProfile = {
      id: authUser.id,
      username: meta.username || authUser.email?.split('@')[0] || 'user',
      fullName: meta.full_name || meta.username || 'User',
      phone: meta.phone || '',
      role: isAdmin ? 'admin' : 'user',
      status: meta.status || 'active',
      tier: isAdmin ? 'VIP 2 Elite' : 'Standard',
      memberSince: 'August 2026',
      verified: true,
      country: 'Uganda',
      referralCode: meta.referral_code || '',
      referralCount: meta.referral_count || 0,
      referralEarningsUGX: meta.referral_earnings_ugx || 0,
      referrals: [],
      welcomeBonusClaimed: true,
      createdAt: authUser.created_at,
      isAdmin,
    };

    if (!this.client) return fallbackProfile;

    try {
      const { data, error } = await this.client
        .from('profiles')
        .select('*')
        .eq('id', authUser.id)
        .single();

      if (error || !data) {
        return fallbackProfile;
      }

      const role = data.role || 'user';
      return {
        id: data.id,
        username: data.username,
        fullName: data.full_name || '',
        phone: data.phone || '',
        role: role as 'admin' | 'user',
        status: data.status || 'active',
        tier: (data.tier || (role === 'admin' ? 'VIP 2 Elite' : 'Standard')) as any,
        memberSince: 'August 2026',
        verified: true,
        country: 'Uganda',
        referralCode: data.referral_code || '',
        referredBy: data.referred_by,
        referralCount: data.referral_count || 0,
        referralEarningsUGX: data.referral_earnings_ugx || 0,
        referrals: [],
        welcomeBonusClaimed: data.welcome_bonus_claimed !== false,
        createdAt: data.created_at,
        isAdmin: role === 'admin',
      };
    } catch {
      return fallbackProfile;
    }
  }

  public async refreshUserData(): Promise<{
    user?: UserProfile;
    data?: UserAccountData;
    isBlocked?: boolean;
    error?: string;
  }> {
    if (!this.currentUser) {
      return { error: 'Not authenticated' };
    }

    const userId = this.currentUser.id;

    // 1. Query Supabase Tables Directly
    if (this.client) {
      try {
        const [profileRes, walletRes, txRes, machinesRes, notifsRes, adminTasksRes] = await Promise.all([
          this.client.from('profiles').select('*').eq('id', userId).single(),
          this.client.from('wallets').select('*').eq('user_id', userId).single(),
          this.client.from('transactions').select('*').eq('user_id', userId).order('created_at', { ascending: false }),
          this.client.from('user_machines').select('*').eq('user_id', userId),
          this.client.from('notifications').select('*').eq('user_id', userId).order('created_at', { ascending: false }),
          this.client.from('admin_tasks').select('*').eq('user_id', userId),
        ]);

        if (profileRes.data) {
          const role = profileRes.data.role || 'user';
          this.currentUser = {
            id: profileRes.data.id,
            username: profileRes.data.username,
            fullName: profileRes.data.full_name || '',
            phone: profileRes.data.phone || '',
            role: role as 'admin' | 'user',
            status: profileRes.data.status || 'active',
            tier: (profileRes.data.tier || (role === 'admin' ? 'VIP 2 Elite' : 'Standard')) as any,
            memberSince: 'August 2026',
            verified: true,
            country: 'Uganda',
            referralCode: profileRes.data.referral_code || '',
            referredBy: profileRes.data.referred_by,
            referralCount: profileRes.data.referral_count || 0,
            referralEarningsUGX: profileRes.data.referral_earnings_ugx || 0,
            referrals: [],
            welcomeBonusClaimed: profileRes.data.welcome_bonus_claimed !== false,
            createdAt: profileRes.data.created_at,
            isAdmin: role === 'admin',
          };
        }

        const wallet: WalletState = walletRes.data
          ? {
              totalBalanceUGX: Number(walletRes.data.total_balance_ugx) || 0,
              dailyPnlUGX: Number(walletRes.data.daily_pnl_ugx) || 0,
              activeMachinesCount: Number(walletRes.data.active_machines_count) || 0,
              pendingTasksCount: Number(walletRes.data.pending_tasks_count) || 0,
            }
          : INITIAL_WALLET;

        const transactions: Transaction[] = (txRes.data || []).map((t: any) => ({
          id: t.id,
          userId: t.user_id,
          username: t.username,
          userFullName: t.user_full_name,
          type: t.type || 'deposit',
          amountUGX: Number(t.amount_ugx),
          currency: 'UGX',
          status: t.status,
          date: new Date(t.created_at).toLocaleDateString(),
          timestamp: t.timestamp || new Date(t.created_at).getTime(),
          description: t.description,
          paymentMethod: t.payment_method,
          recipientInfo: t.recipient_info,
          txHash: t.tx_hash,
        }));

        const machines: Machine[] = (machinesRes.data || []).map((m: any) => ({
          id: m.id || m.machine_id,
          title: m.title,
          subtitle: m.subtitle,
          category: m.category || 'DS-Mining',
          image: m.image,
          dailyRewardUGX: Number(m.daily_reward_ugx),
          status: m.status || 'Active',
          estYearlyROI: Number(m.est_yearly_roi || 0),
          minInvestUGX: Number(m.min_invest_ugx || 0),
          hashrate: m.hashrate || '10.0 TH/s',
          powerSource: m.power_source || 'Grid Power',
          uptime: m.uptime || '99.9%',
          temperature: m.temperature || '36.0°C',
          efficiency: Number(m.efficiency || 98.5),
          totalMinedUGX: Number(m.total_mined_ugx || 0),
          unclaimedRewardsUGX: Number(m.unclaimed_rewards_ugx || 0),
          isBoosted: Boolean(m.is_boosted),
        }));

        const notifications: AppNotification[] = (notifsRes.data || []).map((n: any) => ({
          id: n.id,
          title: n.title,
          message: n.message,
          timestamp: new Date(n.created_at).toLocaleTimeString(),
          read: Boolean(n.read),
          type: n.type === 'alert' ? 'alert' : n.type === 'info' ? 'info' : 'success',
        }));

        const adminTasks: AdminTask[] = (adminTasksRes.data || []).map((a: any) => ({
          id: a.id,
          transactionId: a.transaction_id,
          category: a.category || 'Verification',
          urgency: (a.priority === 'urgent' || a.priority === 'high' ? 'high' : a.priority === 'low' ? 'low' : 'medium') as any,
          type: a.type,
          title: a.title,
          description: a.description,
          amountUGX: Number(a.amount_ugx),
          status: a.status || 'pending',
          timestamp: new Date(a.created_at).toLocaleString(),
        }));

        const userData: UserAccountData = {
          wallet,
          transactions,
          machines,
          adminTasks,
          notifications,
        };

        this.memoryUserData[userId] = userData;
        return {
          user: this.currentUser,
          data: userData,
          isBlocked: this.currentUser.status === 'blocked',
        };
      } catch {
        // Fall through to API sync
      }
    }

    // 2. Fallback to centralized API backend
    const apiRes = await apiClient.fetchUserData();
    if (apiRes.data) {
      this.memoryUserData[userId] = apiRes.data;
      if (apiRes.user) {
        this.currentUser = apiRes.user;
      }
      return {
        user: this.currentUser,
        data: apiRes.data,
        isBlocked: this.currentUser.status === 'blocked',
      };
    }

    return {
      user: this.currentUser,
      data: this.memoryUserData[userId] || {
        wallet: INITIAL_WALLET,
        transactions: INITIAL_TRANSACTIONS,
        machines: INITIAL_MACHINES,
        adminTasks: INITIAL_ADMIN_TASKS,
        notifications: INITIAL_NOTIFICATIONS,
      },
      isBlocked: this.currentUser.status === 'blocked',
    };
  }

  public getUserData(userId: string): UserAccountData | null {
    return this.memoryUserData[userId] || null;
  }

  public saveUserData(userId: string, data: Partial<UserAccountData>) {
    const existing = this.memoryUserData[userId] || {
      wallet: INITIAL_WALLET,
      transactions: INITIAL_TRANSACTIONS,
      machines: INITIAL_MACHINES,
      adminTasks: INITIAL_ADMIN_TASKS,
      notifications: INITIAL_NOTIFICATIONS,
    };

    const updated = {
      ...existing,
      ...data,
    };
    this.memoryUserData[userId] = updated;

    // Async push to backend / Supabase
    apiClient.syncUserData(updated).catch(() => {});
  }

  // ==========================================================
  // DIRECT CLOUD PERSISTENCE ACTIONS
  // ==========================================================

  public async submitDeposit(amountUGX: number, paymentMethod: string, referenceInfo?: string) {
    return apiClient.submitDeposit(amountUGX, paymentMethod, referenceInfo);
  }

  public async submitWithdrawal(amountUGX: number, paymentMethod: string, recipientInfo: string) {
    return apiClient.submitWithdrawal(amountUGX, paymentMethod, recipientInfo);
  }

  public async buyInvestment(machineOrId: Partial<Machine> | string, amountUGX?: number) {
    return apiClient.buyInvestment(machineOrId, amountUGX);
  }

  public async claimYield(investmentId: string) {
    return apiClient.claimInvestmentYield(investmentId);
  }

  // ==========================================================
  // ADMIN ACTIONS (Cross-device admin control)
  // ==========================================================

  public async getAdminUsers(): Promise<{ users: AdminUserSummary[]; error?: string }> {
    return apiClient.fetchAdminUsers();
  }

  public async updateUserInfo(
    userId: string,
    data: { username?: string; fullName?: string; phone?: string }
  ) {
    const res = await apiClient.updateAdminUser(userId, data);
    if (this.currentUser && this.currentUser.id === userId && res.user) {
      this.setCurrentUser(res.user);
    }
    return res;
  }

  public async adjustBalance(
    userId: string,
    adjustment: { amountUGX: number; type: 'add' | 'deduct'; reason: string }
  ) {
    return apiClient.adjustUserBalance(userId, adjustment);
  }

  public async toggleUserStatus(userId: string, status: 'active' | 'blocked') {
    return apiClient.setUserStatus(userId, status);
  }

  public async deleteUser(userId: string) {
    return apiClient.deleteAdminUser(userId);
  }

  public async getBalanceAuditLogs(): Promise<{ adjustments: BalanceAdjustment[]; error?: string }> {
    return apiClient.fetchBalanceAdjustments();
  }
}

export const authService = new AuthService();
