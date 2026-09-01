/**
 * Supabase Authentication & Cross-Device Data Persistence Service
 * Single source of truth hosted on Supabase Cloud.
 * NO browser localStorage or device storage is used for user financial data.
 */

import { createClient, SupabaseClient, User } from '@supabase/supabase-js';
import {
  UserProfile,
  ReferralPartner,
  WalletState,
  Transaction,
  Machine,
  AdminTask,
  AppNotification,
  AdminUserSummary,
  BalanceAdjustment,
} from '../types';
import { supabaseAdmin } from './supabaseAdmin';
import { getSupabaseClient } from './supabase';

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
  private accessToken: string | null = null;
  private memoryUserData: { [userId: string]: UserAccountData } = {};

  constructor() {
    this.init();
  }

  private init() {
    const envUrl = import.meta.env.VITE_SUPABASE_URL as string;
    const envKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;
    if (envUrl && envKey) {
      try {
        // Supabase Auth: session persisted + auto refreshed; restored at startup.
        this.client = createClient(envUrl, envKey, {
          auth: {
            persistSession: true,
            autoRefreshToken: true,
            detectSessionInUrl: true,
          },
        });

        // Keep the REST data client supplied with the current access token
        this.client.auth.onAuthStateChange((_event, session) => {
          if (session?.access_token) {
            this.accessToken = session.access_token;
            if (this.currentUser) {

            }
          }
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
    // Authoritative flag ONLY: public.profiles.is_admin
    if (!this.currentUser) return false;
    return this.currentUser.isAdmin === true;
  }

  public isBlocked(): boolean {
    if (!this.currentUser) return false;
    return this.currentUser.status === 'blocked';
  }

  public setCurrentUser(user: UserProfile | null, accessToken?: string | null) {
    this.currentUser = user;
    if (user) {
      // REST data endpoints receive the real Supabase Auth session token

    } else {

    }
  }

  private formatEmail(identifier: string): string {
    const clean = this.normalizeUsername(identifier);
    if (!clean) return '';
    if (clean.includes('@')) return clean;
    return `${clean}@sunrise-ds.com`;
  }

  /**
   * Map Supabase Auth errors to clear, user-facing messages.
   */
  private mapAuthError(error: any): string {
    const code = error?.code || '';
    const msg = (error?.message || '').toLowerCase();
    if (code === 'invalid_credentials' || msg.includes('invalid login credentials')) {
      return 'Invalid username or password.';
    }
    if (code === 'email_not_confirmed' || msg.includes('email not confirmed')) {
      return 'Your account has not been confirmed yet. Please confirm your account before signing in.';
    }
    if (msg.includes('rate limit')) {
      return 'Too many attempts. Please wait a moment and try again.';
    }
    return error?.message || 'Unable to sign in. Please try again.';
  }

  // ==========================================================
  // CROSS-DEVICE SESSION RESTORATION (from Supabase Cloud)
  // ==========================================================

  public async restoreSession(): Promise<{ user: UserProfile | null; data: UserAccountData | null; error?: string }> {
    if (!this.client) {
      return { user: null, data: null, error: 'Authentication service is not configured.' };
    }

    try {
      const { data: { session }, error: sessionErr } = await this.client.auth.getSession();
      if (sessionErr || !session || !session.user) {
        this.currentUser = null;
        return { user: null, data: null };
      }

      const user = session.user;
      const profile = await this.fetchProfileFromSupabase(user);
      if (!profile) {
        // No matching public.profiles row for this auth.uid(): refuse silently-broken sessions.
        console.warn('restoreSession: no profile row found for', user.id);
        await this.client.auth.signOut();
        this.currentUser = null;
        return { user: null, data: null, error: 'Signed-in account has no profile record. Please contact support.' };
      }

      this.setCurrentUser(profile, session.access_token);

      const dataRes = await this.refreshUserData();
      return { user: profile, data: dataRes.data || null };
    } catch (err) {
      console.warn('Session restore exception:', err);
      this.currentUser = null;
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
    if (!this.client) {
      return { error: 'Authentication service is not configured.' };
    }

    const cleanInput = (usernameOrEmail || '').trim();
    if (!cleanInput || !password) {
      return { error: 'Username/Email and password are required.' };
    }

    const email = this.formatEmail(cleanInput);

    // Single authentication path: Supabase Auth
    const { data: authData, error: authError } = await this.client.auth.signInWithPassword({
      email,
      password,
    });

    if (authError || !authData.user || !authData.session) {
      return { error: this.mapAuthError(authError) };
    }

    const profile = await this.fetchProfileFromSupabase(authData.user);
    if (!profile) {
      await this.client.auth.signOut();
      return { error: 'Signed in, but no profile record was found for your account. Please contact support.' };
    }

    if (profile.status === 'blocked') {
      await this.client.auth.signOut();
      this.currentUser = null;
      return { error: 'Your account has been suspended by an administrator.', isBlocked: true };
    }

    this.setCurrentUser(profile, authData.session.access_token);

    const dataRes = await this.refreshUserData();
    const accountData = dataRes.data || {
      wallet: { totalBalanceUGX: 0, dailyPnlUGX: 0, activeMachinesCount: 0, pendingTasksCount: 0 },
      transactions: [],
      machines: [],
      adminTasks: [],
      notifications: [],
    };

    this.memoryUserData[profile.id] = accountData;
    return { user: profile, data: accountData };
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
    needsConfirmation?: boolean;
  }> {
    if (!this.client) {
      return { error: 'Authentication service is not configured.' };
    }

    // Same normalization as sign-in: trim -> lowercase -> sanitize
    const cleanUsername = this.normalizeUsername(username);
    if (!cleanUsername) {
      return { error: 'Username is required.' };
    }
    const email = `${cleanUsername}@sunrise-ds.com`;

    // Single authentication path: Supabase Auth.
    // NEVER submit is_admin/role in metadata: new users are always normal users.
    const { data: authData, error: authError } = await this.client.auth.signUp({
      email,
      password,
      options: {
        data: {
          username: cleanUsername,
          full_name: (fullName || cleanUsername).trim(),
          phone: phone || '',
          referred_by: referralCode || '',
        },
      },
    });

    if (authError) {
      const msg = (authError.message || '').toLowerCase();
      if (msg.includes('already registered') || msg.includes('already exists')) {
        return { error: 'This username is already taken. Please choose another one.' };
      }
      if (authError.code === 'user_banned') {
        return { error: 'This account has been blocked.' };
      }
      return { error: authError.message || 'Sign up failed. Please try again.' };
    }

    if (!authData.user) {
      return { error: 'Failed to create user account.' };
    }

    // If email confirmation is enabled, no session is returned yet.
    if (!authData.session) {
      return {
        needsConfirmation: true,
        error:
          'Account created! Please confirm your account before signing in.',
      };
    }

    // Process referral (link profiles, credit referrer, record tx + notification).
    // Safe to call repeatedly: the DB function is idempotent per new user.
    if (referralCode && referralCode.trim()) {
      try {
        const refRes = await this.processReferral(referralCode);
        if (!refRes.applied && refRes.reason && refRes.reason !== 'no_code' && refRes.reason !== 'already_processed') {
          console.warn('Referral not applied:', refRes.reason);
        }
      } catch (e) {
        console.warn('Referral processing warning:', e);
      }
    }

    // Profile + wallet + welcome bonus are auto-created by the on_auth_user_created DB trigger.
    let profile = await this.fetchProfileFromSupabase(authData.user);
    if (!profile && this.client) {
      // Trigger may complete asynchronously; retry briefly.
      for (let i = 0; i < 5 && !profile; i++) {
        await new Promise((r) => setTimeout(r, 400));
        profile = await this.fetchProfileFromSupabase(authData.user);
      }
    }
    if (!profile) {
      await this.client.auth.signOut();
      return { error: 'Account created but the profile record could not be loaded. Please contact support.' };
    }

    this.setCurrentUser(profile, authData.session.access_token);

    const dataRes = await this.refreshUserData();
    const userData = dataRes.data || {
      wallet: { totalBalanceUGX: 0, dailyPnlUGX: 0, activeMachinesCount: 0, pendingTasksCount: 0 },
      transactions: [],
      machines: [],
      adminTasks: [],
      notifications: [],
    };
    this.memoryUserData[profile.id] = userData;
    return { user: profile, data: userData };
  }

  /**
   * Normalize a username exactly once, shared by sign-in and sign-up so the
   * same Auth email is generated in both flows.
   */
  private normalizeUsername(username: string): string {
    const clean = (username || '').trim().toLowerCase();
    if (!clean) return '';
    if (clean.includes('@')) return clean; // already an email
    return clean.replace(/[^a-z0-9_]/g, '_');
  }

  public async signOut(): Promise<void> {
    if (this.client) {
      try {
        await this.client.auth.signOut();
      } catch {
        // Ignore signout error
      }
    }

    this.currentUser = null;
    this.accessToken = null;
    this.memoryUserData = {};
  }

  // ==========================================================
  // PROFILE & LIVE DATA SYNC (Cross-Device Single Source of Truth)
  // ==========================================================

  private async fetchProfileFromSupabase(authUser: User): Promise<UserProfile | null> {
    if (!this.client) return null;

    try {
      // Identify the profile ONLY by auth.uid() — never by username.
      const { data, error } = await this.client
        .from('profiles')
        .select('*')
        .eq('id', authUser.id)
        .single();

      if (error || !data) {
        return null;
      }

      // Authoritative admin flag: public.profiles.is_admin.
      const isAdmin = data.is_admin === true;
      const status = typeof data.status === 'string' ? data.status : 'active';

      const referrals = await this.fetchReferrals(data.referral_code || '');

      return {
        id: data.id,
        username: data.username,
        fullName: data.full_name || '',
        phone: data.phone || '',
        role: isAdmin ? ('admin' as const) : ('user' as const),
        status,
        tier: (data.tier || 'Standard') as any,
        memberSince: 'August 2026',
        verified: true,
        country: 'Uganda',
        referralCode: data.referral_code || '',
        referredBy: data.referred_by,
        referralCount: data.referral_count || 0,
        referralEarningsUGX: data.referral_earnings_ugx || 0,
        referrals,
        welcomeBonusClaimed: data.welcome_bonus_claimed !== false,
        createdAt: data.created_at,
        isAdmin,
      };
    } catch {
      return null;
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
          // Authoritative admin flag: public.profiles.is_admin
          const isAdmin = profileRes.data.is_admin === true;
          const referrals = await this.fetchReferrals(profileRes.data.referral_code || '');
          this.currentUser = {
            id: profileRes.data.id,
            username: profileRes.data.username,
            fullName: profileRes.data.full_name || '',
            phone: profileRes.data.phone || '',
            role: isAdmin ? ('admin' as const) : ('user' as const),
            status: typeof profileRes.data.status === 'string' ? profileRes.data.status : 'active',
            tier: (profileRes.data.tier || 'Standard') as any,
            memberSince: 'August 2026',
            verified: true,
            country: 'Uganda',
            referralCode: profileRes.data.referral_code || '',
            referredBy: profileRes.data.referred_by,
            referralCount: profileRes.data.referral_count || 0,
            referralEarningsUGX: profileRes.data.referral_earnings_ugx || 0,
            referrals,
            welcomeBonusClaimed: profileRes.data.welcome_bonus_claimed !== false,
            createdAt: profileRes.data.created_at,
            isAdmin,
          };
        }

        // Keep the REST client supplied with the freshest Supabase Auth token
        try {
          const { data: { session } } = await this.client.auth.getSession();
          if (session?.access_token && this.currentUser) {
            this.accessToken = session.access_token;

          }
        } catch {
          // ignore
        }

        const wallet: WalletState = walletRes.data
          ? {
              totalBalanceUGX: Number(walletRes.data.total_balance_ugx) || 0,
              dailyPnlUGX: Number(walletRes.data.daily_pnl_ugx) || 0,
              activeMachinesCount: Number(walletRes.data.active_machines_count) || 0,
              pendingTasksCount: Number(walletRes.data.pending_tasks_count) || 0,
            }
          : { totalBalanceUGX: 0, dailyPnlUGX: 0, activeMachinesCount: 0, pendingTasksCount: 0 };

        const transactions: Transaction[] = (txRes.data || [])
          .map((t: any) => {
            const dateObj = t.timestamp
              ? new Date(t.timestamp)
              : (t.created_at ? new Date(t.created_at) : new Date());
            const dateStr = !isNaN(dateObj.getTime()) ? dateObj.toLocaleString() : new Date().toLocaleString();
            return {
              id: t.id,
              userId: t.user_id,
              username: t.username || this.currentUser?.username || 'user',
              userFullName: t.user_full_name || this.currentUser?.fullName || 'User',
              type: t.type || 'deposit',
              amountUGX: Number(t.amount_ugx || t.amount || 0),
              currency: 'UGX' as const,
              status: (t.status || 'pending') as Transaction['status'],
              date: dateStr,
              timestamp: t.timestamp ? String(t.timestamp) : (t.created_at ? String(t.created_at) : undefined),
              created_at: t.created_at || undefined,
              description: t.description || `${(t.type || 'Transaction').toUpperCase()} Request`,
              paymentMethod: t.payment_method || undefined,
              recipientInfo: t.recipient_info || undefined,
              txHash: t.tx_hash || undefined,
            };
          })
          .sort((a: Transaction, b: Transaction) => {
            const timeA = a.timestamp ? new Date(a.timestamp).getTime() : (a.created_at ? new Date(a.created_at).getTime() : 0);
            const timeB = b.timestamp ? new Date(b.timestamp).getTime() : (b.created_at ? new Date(b.created_at).getTime() : 0);
            return timeB - timeA;
          });

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
      } catch (e) {
        console.warn('refreshUserData failed:', e);
      }
    }

    return {
      user: this.currentUser,
      data: this.memoryUserData[userId] || null,
      isBlocked: this.currentUser.status === 'blocked',
    };
  }

  public getUserData(userId: string): UserAccountData | null {
    return this.memoryUserData[userId] || null;
  }

  public saveUserData(userId: string, data: Partial<UserAccountData>) {
    const existing = this.memoryUserData[userId] || {
      wallet: { totalBalanceUGX: 0, dailyPnlUGX: 0, activeMachinesCount: 0, pendingTasksCount: 0 },
      transactions: [],
      machines: [],
      adminTasks: [],
      notifications: [],
    };

    const updated = {
      ...existing,
      ...data,
    };
    this.memoryUserData[userId] = updated;

    // Supabase is the single source of truth. No in-memory/REST sync fallback.
    // All financial mutations go through Supabase RPCs; this cache is display-only.
  }

  // ==========================================================
  // REFERRAL PROCESSING (called once after signup)
  // ==========================================================

  /**
   * Load the referred-users list from Supabase: profiles whose referred_by
   * matches this user's referral code. Per-user 20% commission is loaded
   * from actual approved deposit commission transactions in Supabase.
   */
  private async fetchReferrals(referralCode: string): Promise<ReferralPartner[]> {
    if (!this.client || !referralCode) return [];
    try {
      const { data: profiles, error } = await this.client
        .from('profiles')
        .select('id, username, full_name, created_at, status')
        .eq('referred_by', referralCode)
        .order('created_at', { ascending: false });
      if (error || !profiles) return [];

      // Fetch commission transactions for this user from Supabase
      let commTxs: any[] = [];
      if (this.currentUser?.id) {
        const { data: txData } = await this.client
          .from('transactions')
          .select('amount_ugx, description')
          .eq('user_id', this.currentUser.id)
          .eq('status', 'completed')
          .in('type', ['bonus', 'reward']);
        commTxs = txData || [];
      }

      return profiles.map((r: any) => {
        const partnerUsername = (r.username || '').toLowerCase();
        // Match commission transactions mentioning this partner
        const earnedFromPartner = commTxs
          .filter((tx) => (tx.description || '').toLowerCase().includes(`@${partnerUsername}`))
          .reduce((sum, tx) => sum + (Number(tx.amount_ugx) || 0), 0);

        return {
          id: r.id,
          username: r.username || 'user',
          fullName: r.full_name || undefined,
          registeredDate: r.created_at
            ? new Date(r.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
            : '',
          status: earnedFromPartner > 0 ? ('active' as const) : ('pending' as const),
          rewardUGX: earnedFromPartner > 0 ? earnedFromPartner : undefined,
        };
      });
    } catch {
      return [];
    }
  }

  public async processReferral(referralCode: string): Promise<{ applied: boolean; reason?: string; error?: string }> {
    const sb = this.client;
    if (!sb) return { applied: false, error: 'Database not configured' };
    if (!referralCode || !referralCode.trim()) return { applied: false, reason: 'no_code' };
    try {
      const { data, error } = await sb.rpc('process_referral', { p_referral_code: referralCode.trim() });
      if (error) return { applied: false, error: error.message };
      return {
        applied: Boolean(data?.applied),
        reason: data?.reason || undefined,
      };
    } catch (e: any) {
      return { applied: false, error: e?.message || 'Referral processing failed' };
    }
  }

  // ==========================================================
  // DIRECT CLOUD PERSISTENCE ACTIONS
  // ==========================================================

  public async submitDeposit(amountUGX: number, paymentMethod: string, referenceInfo?: string, description?: string) {
    const numericAmount = Number(amountUGX);
    const res = await supabaseAdmin.submitTransaction({
      type: 'deposit',
      amountUGX: numericAmount,
      description: description || `Deposit — UGX ${numericAmount.toLocaleString()} — Pending`,
      paymentMethod,
      recipientInfo: referenceInfo ?? undefined,
    });

    if (res.success && res.transaction && this.currentUser) {
      const uid = this.currentUser.id;
      if (this.memoryUserData[uid]) {
        this.memoryUserData[uid].transactions = [
          res.transaction,
          ...this.memoryUserData[uid].transactions.filter((t) => t.id !== res.transaction!.id),
        ];
      }
    }
    return res;
  }

  public async submitWithdrawal(
    amountUGX: number,
    paymentMethod: string,
    recipientInfo: string,
    description?: string
  ) {
    const res = await supabaseAdmin.submitTransaction({
      type: 'withdraw',
      amountUGX,
      description: description || `Withdrawal — UGX ${amountUGX.toLocaleString()} — Pending`,
      paymentMethod,
      recipientInfo,
    });

    if (res.success && res.transaction && this.currentUser) {
      const uid = this.currentUser.id;
      if (this.memoryUserData[uid]) {
        this.memoryUserData[uid].transactions = [
          res.transaction,
          ...this.memoryUserData[uid].transactions.filter((t) => t.id !== res.transaction!.id),
        ];
      }
    }
    return res;
  }

  public async buyInvestment(machineOrId: Partial<Machine> | string, amountUGX?: number) {
    return supabaseAdmin.buyInvestment(machineOrId, amountUGX);
  }

  public async claimYield(investmentId: string) {
    return supabaseAdmin.claimInvestmentYield(investmentId);
  }

  public async uploadProjectImage(file: File): Promise<{ publicUrl?: string; error?: string }> {
    return supabaseAdmin.uploadProjectImage(file);
  }

  public async fetchCatalogMachines(): Promise<{ machines: Machine[]; error?: string }> {
    return supabaseAdmin.fetchCatalogMachines();
  }

  public async createCatalogMachine(machine: Partial<Machine>): Promise<{ success: boolean; machine?: Machine; error?: string }> {
    return supabaseAdmin.createCatalogMachine(machine);
  }

  public async updateCatalogMachine(id: string, machine: Partial<Machine>): Promise<{ success: boolean; machine?: Machine; error?: string }> {
    return supabaseAdmin.updateCatalogMachine(id, machine);
  }

  public async deleteCatalogMachine(id: string): Promise<{ success: boolean; error?: string }> {
    return supabaseAdmin.deleteCatalogMachine(id);
  }

  public async fetchPendingTransactions() {
    return supabaseAdmin.fetchPendingTransactions();
  }

  public async fetchAllTransactions() {
    return supabaseAdmin.fetchAllTransactions();
  }

  public async approveTransaction(txId: string) {
    return supabaseAdmin.approveTransaction(txId);
  }

  public async rejectTransaction(txId: string) {
    return supabaseAdmin.rejectTransaction(txId);
  }

  // ==========================================================
  // ADMIN ACTIONS (Cross-device admin control via Supabase RPCs)
  // ==========================================================

  public async getAdminUsers(): Promise<{ users: AdminUserSummary[]; error?: string }> {
    return supabaseAdmin.fetchAdminUsers();
  }

  public async updateUserInfo(
    userId: string,
    data: { username?: string; fullName?: string; phone?: string; status?: 'active' | 'blocked' }
  ) {
    const res = await supabaseAdmin.updateAdminUser(userId, data);
    // Keep the locally signed-in user in sync when the admin edits THEIR OWN account
    if (res.success && this.currentUser && this.currentUser.id === userId && data.fullName !== undefined) {
      this.currentUser = { ...this.currentUser, fullName: data.fullName, phone: data.phone ?? this.currentUser.phone };
    }
    return res;
  }

  public async adjustBalance(
    userId: string,
    adjustment: { amountUGX: number; type: 'add' | 'deduct'; reason: string }
  ) {
    const res = await supabaseAdmin.adjustUserBalance(userId, adjustment);
    if (res.success && res.newBalance !== undefined) {
      if (this.memoryUserData[userId]) {
        this.memoryUserData[userId].wallet.totalBalanceUGX = res.newBalance;
      }
    }
    return res;
  }

  public async toggleUserStatus(userId: string, status: 'active' | 'blocked') {
    return supabaseAdmin.updateAdminUser(userId, { status });
  }

  public async deleteUser(userId: string) {
    const sb = getSupabaseClient();
    if (!sb) return { success: false, error: 'Database not configured' };
    if (!this.isAdmin()) return { success: false, error: 'Admin access required' };

    // Clean up user-owned rows first (FK references), then the auth user's profile.
    try {
      await sb.from('transactions').delete().eq('user_id', userId);
      await sb.from('notifications').delete().eq('user_id', userId);
      await sb.from('user_machines').delete().eq('user_id', userId);
      await sb.from('balance_adjustments').delete().eq('user_id', userId);
      await sb.from('wallets').delete().eq('user_id', userId);
      await sb.from('profiles').delete().eq('id', userId);
      return { success: true, message: 'User profile removed.' };
    } catch (e: any) {
      return { success: false, error: e?.message || 'Failed to delete user' };
    }
  }

  public async getBalanceAuditLogs(): Promise<{ adjustments: BalanceAdjustment[]; error?: string }> {
    return supabaseAdmin.fetchBalanceAdjustments();
  }
}

export const authService = new AuthService();
