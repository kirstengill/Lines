import { createClient, SupabaseClient } from '@supabase/supabase-js';
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

const STORAGE_KEY_USER = 'sunrise_ds_current_user_v4';
// Removed hardcoded Supabase constants

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
        this.client = createClient(envUrl, envKey);
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
  }

  // Restore authenticated session from backend using session token
  public async restoreSession(): Promise<{ user: UserProfile | null; data: UserAccountData | null }> {
    if (!this.client) return { user: null, data: null };

    const { data: { session }, error } = await this.client.auth.getSession();
    if (error || !session) {
      this.currentUser = null;
      return { user: null, data: null };
    }

    const { data: profileData } = await this.client
      .from('profiles')
      .select('*')
      .eq('id', session.user.id)
      .single();

    if (!profileData) {
      this.currentUser = null;
      return { user: null, data: null };
    }

    this.currentUser = {
      id: profileData.id,
      username: profileData.username,
      fullName: profileData.full_name || '',
      phone: profileData.phone || '',
      role: profileData.role || 'user',
      status: profileData.status || 'active',
      referralCode: profileData.referral_code || '',
      createdAt: profileData.created_at,
    };

    if (this.currentUser.status === 'blocked') {
      return { user: this.currentUser, data: null };
    }

    const dataRes = await this.refreshUserData();
    return { user: this.currentUser, data: dataRes.data || null };
  }

  // ==================== AUTH METHODS ====================

  public async signInWithPassword(username: string, password: string): Promise<{
    user?: UserProfile;
    data?: UserAccountData;
    error?: string;
    isBlocked?: boolean;
  }> {
    if (!this.client) return { error: 'Supabase client not initialized' };

    const email = `${username.toLowerCase().replace(/[^a-z0-9_]/g, '_')}@sunrise-ds.supabase.internal`;

    const { data: authData, error: authError } = await this.client.auth.signInWithPassword({
      email,
      password
    });

    if (authError) {
      return { error: authError.message };
    }

    if (!authData.session) {
      return { error: 'No session created' };
    }

    const { data: profileData, error: profileError } = await this.client
      .from('profiles')
      .select('*')
      .eq('id', authData.user.id)
      .single();

    if (profileError || !profileData) {
      return { error: 'Failed to fetch user profile' };
    }

    const userProfile: UserProfile = {
      id: profileData.id,
      username: profileData.username,
      fullName: profileData.full_name || '',
      phone: profileData.phone || '',
      role: profileData.role || 'user',
      status: profileData.status || 'active',
      referralCode: profileData.referral_code || '',
      createdAt: profileData.created_at,
    };

    this.setCurrentUser(userProfile);

    if (userProfile.status === 'blocked') {
      return { error: 'Account is blocked', isBlocked: true, user: userProfile };
    }

    const dataRes = await this.refreshUserData();
    if (dataRes.data) {
      this.memoryUserData[userProfile.id] = dataRes.data;
    }

    return { user: userProfile, data: dataRes.data };
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
    if (!this.client) return { error: 'Supabase client not initialized' };

    const email = `${username.toLowerCase().replace(/[^a-z0-9_]/g, '_')}@sunrise-ds.supabase.internal`;

    const { data: authData, error: authError } = await this.client.auth.signUp({
      email,
      password,
      options: {
        data: {
          username,
          full_name: fullName || '',
          phone: phone || '',
          referral_code: referralCode || ''
        }
      }
    });

    if (authError) {
      return { error: authError.message };
    }

    if (!authData.user) {
      return { error: 'Failed to create user' };
    }

    let userProfile: UserProfile;
    const { data: profileData } = await this.client
      .from('profiles')
      .select('*')
      .eq('id', authData.user.id)
      .single();

    if (profileData) {
      userProfile = {
        id: profileData.id,
        username: profileData.username,
        fullName: profileData.full_name || '',
        phone: profileData.phone || '',
        role: profileData.role || 'user',
        status: profileData.status || 'active',
        referralCode: profileData.referral_code || '',
        createdAt: profileData.created_at,
      };
    } else {
      userProfile = {
        id: authData.user.id,
        username: username,
        fullName: fullName || '',
        phone: phone || '',
        role: 'user',
        status: 'active',
        referralCode: referralCode || '',
        createdAt: new Date().toISOString(),
      };
    }

    this.setCurrentUser(userProfile);

    const dataRes = await this.refreshUserData();
    const userData = dataRes.data || {
      wallet: INITIAL_WALLET,
      transactions: [],
      machines: [],
      adminTasks: [],
      notifications: [],
    };

    this.memoryUserData[userProfile.id] = userData;
    return { user: userProfile, data: userData };
  }

  public async signOut(): Promise<void> {
    if (this.client) {
      await this.client.auth.signOut();
    }
    this.setCurrentUser(null);
  }

  // ==================== STATE & SYNC ====================

  public async refreshUserData(): Promise<{
    user?: UserProfile;
    data?: UserAccountData;
    isBlocked?: boolean;
    error?: string;
  }> {
    if (!this.client || !this.currentUser) return { error: 'Not authenticated' };

    try {
      const userId = this.currentUser.id;

      const { data: walletData } = await this.client
        .from('wallets')
        .select('*')
        .eq('user_id', userId)
        .single();

      const { data: transactionsData } = await this.client
        .from('transactions')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      const { data: machinesData } = await this.client
        .from('user_machines')
        .select('*')
        .eq('user_id', userId);

      const wallet: WalletState = walletData ? {
        totalBalanceUGX: walletData.total_balance_ugx || 0,
        dailyPnlUGX: walletData.daily_pnl_ugx || 0,
        activeMachinesCount: walletData.active_machines_count || 0,
        pendingTasksCount: walletData.pending_tasks_count || 0
      } : INITIAL_WALLET;

      const transactions: Transaction[] = (transactionsData || []).map((t: any) => ({
        id: t.id,
        type: t.type,
        amountUGX: t.amount_ugx,
        status: t.status,
        date: new Date(t.created_at).toLocaleDateString(),
        description: t.description,
        isCredit: t.is_credit,
      }));

      const machines: Machine[] = (machinesData || []).map((m: any) => ({
        id: m.machine_id,
        title: m.title,
        category: m.category,
        image: m.image,
        dailyRewardUGX: m.daily_reward_ugx,
        status: m.status,
        estYearlyROI: m.est_yearly_roi,
        minInvestUGX: m.min_invest_ugx,
        amountInvestedUGX: m.amount_invested_ugx,
        hashrate: m.hashrate,
        powerSource: m.power_source,
        totalMinedUGX: m.total_mined_ugx,
        unclaimedRewardsUGX: m.unclaimed_rewards_ugx,
        isBoosted: m.is_boosted,
      }));

      const userData: UserAccountData = {
        wallet,
        transactions,
        machines,
        adminTasks: INITIAL_ADMIN_TASKS,
        notifications: INITIAL_NOTIFICATIONS,
      };

      this.memoryUserData[userId] = userData;

      return {
        user: this.currentUser,
        data: userData,
        isBlocked: this.currentUser.status === 'blocked',
      };
    } catch (err: any) {
      return { error: err.message || 'Failed to refresh state' };
    }
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
  }

  // ==================== ADMIN ACTIONS ====================

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
