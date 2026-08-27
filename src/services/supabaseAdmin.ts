/**
 * Admin operations implemented directly against the Lines Supabase backend.
 * Every privileged operation goes through security-definer RPC functions
 * (supabase_admin_and_transactions.sql) which check public.profiles.is_admin
 * server-side. Normal users can never execute them (REVOKE FROM anon/public,
 * RLS denies direct table writes).
 */

import { getSupabaseClient } from './supabase';
import {
  Transaction,
  AdminUserSummary,
  BalanceAdjustment,
} from '../types';

export interface SubmitTransactionInput {
  type: 'deposit' | 'withdraw';
  amountUGX: number;
  description?: string;
  paymentMethod?: string;
  recipientInfo?: string;
}

export const supabaseAdmin = {
  // ---------- USER SUBMITS DEPOSIT / WITHDRAW -> pending row ----------
  async submitTransaction(input: SubmitTransactionInput): Promise<{ success: boolean; error?: string }> {
    const sb = getSupabaseClient();
    if (!sb) return { success: false, error: 'Database not configured' };

    const { error } = await sb.rpc('submit_transaction', {
      p_type: input.type,
      p_amount_ugx: input.amountUGX,
      p_description: input.description ?? null,
      p_payment_method: input.paymentMethod ?? null,
      p_recipient_info: input.recipientInfo ?? null,
    });

    if (error) return { success: false, error: translate(error.message) };
    return { success: true };
  },

  // ---------- ADMIN: PENDING TRANSACTIONS ----------
  async fetchPendingTransactions(): Promise<{ transactions: Transaction[]; error?: string }> {
    const sb = getSupabaseClient();
    if (!sb) return { transactions: [], error: 'Database not configured' };

    const { data, error } = await sb.rpc('admin_pending_transactions');
    if (error) return { transactions: [], error: translate(error.message) };

    return {
      transactions: (data || []).map((t: any) => ({
        id: t.id,
        userId: t.user_id,
        username: t.username,
        userFullName: t.user_full_name,
        type: t.type,
        amountUGX: Number(t.amount_ugx),
        currency: 'UGX' as const,
        status: t.status as Transaction['status'],
        date: new Date(t.created_at).toLocaleString(),
        timestamp: t.created_at ? new Date(t.created_at).getTime() : undefined,
        description: t.description || '',
        paymentMethod: t.payment_method || undefined,
        recipientInfo: t.recipient_info || undefined,
      })),
    };
  },

  // ---------- ADMIN: ALL TRANSACTIONS (WITH STATUSES & PROFILES) ----------
  async fetchAllTransactions(): Promise<{ transactions: Transaction[]; error?: string }> {
    const sb = getSupabaseClient();
    if (!sb) return { transactions: [], error: 'Database not configured' };

    try {
      const { data, error } = await sb
        .from('transactions')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(500);

      if (error) {
        // Fallback to pending transactions RPC if direct select is restricted
        return this.fetchPendingTransactions();
      }

      // Fetch user profile map to enrich with usernames and names
      const { data: profiles } = await sb.from('profiles').select('id, username, full_name');
      const profileMap = new Map<string, { username: string; full_name?: string }>();
      if (profiles) {
        profiles.forEach((p: any) => {
          profileMap.set(p.id, { username: p.username, full_name: p.full_name });
        });
      }

      return {
        transactions: (data || []).map((t: any) => {
          const profile = profileMap.get(t.user_id);
          return {
            id: t.id,
            userId: t.user_id,
            username: profile?.username || t.username || 'user',
            userFullName: profile?.full_name || t.user_full_name,
            type: t.type,
            amountUGX: Number(t.amount_ugx),
            currency: 'UGX' as const,
            status: (t.status || 'pending') as Transaction['status'],
            date: new Date(t.created_at || t.timestamp || Date.now()).toLocaleString(),
            timestamp: t.timestamp || (t.created_at ? new Date(t.created_at).getTime() : undefined),
            description: t.description || '',
            paymentMethod: t.payment_method || undefined,
            recipientInfo: t.recipient_info || undefined,
            txHash: t.tx_hash || undefined,
          };
        }),
      };
    } catch (e: any) {
      return this.fetchPendingTransactions();
    }
  },

  // ---------- ADMIN: APPROVE / REJECT ----------
  async approveTransaction(txId: string): Promise<{ success: boolean; newBalance?: number; error?: string }> {
    const sb = getSupabaseClient();
    if (!sb) return { success: false, error: 'Database not configured' };

    const { data, error } = await sb.rpc('admin_approve_transaction', { p_transaction_id: txId });
    if (error) return { success: false, error: translate(error.message) };

    if (data === null) {
      return { success: true, newBalance: undefined }; // already processed — idempotent no-op
    }
    return { success: true, newBalance: Number(data) };
  },

  async rejectTransaction(txId: string): Promise<{ success: boolean; balance?: number; error?: string }> {
    const sb = getSupabaseClient();
    if (!sb) return { success: false, error: 'Database not configured' };

    const { data, error } = await sb.rpc('admin_reject_transaction', { p_transaction_id: txId });
    if (error) return { success: false, error: translate(error.message) };
    return { success: true, balance: data === null ? undefined : Number(data) };
  },

  // ---------- ADMIN: USERS (from Supabase Auth + profiles + wallets) ----------
  async fetchAdminUsers(): Promise<{ users: AdminUserSummary[]; error?: string }> {
    const sb = getSupabaseClient();
    if (!sb) return { users: [], error: 'Database not configured' };

    const { data, error } = await sb.rpc('admin_list_users');
    if (error) return { users: [], error: translate(error.message) };

    return {
      users: (data || []).map((u: any) => {
        const meta = u.raw_user_meta_data || {};
        return {
          id: u.id,
          username: u.username,
          fullName: u.full_name || meta.full_name || meta.username || u.email?.split('@')[0] || '',
          phone: u.phone || '',
          email: u.email,
          status: (u.status === 'blocked' ? 'blocked' : 'active') as 'active' | 'blocked',
          role: u.is_admin ? ('admin' as const) : ('user' as const),
          isAdmin: u.is_admin === true,
          tier: u.tier || 'Standard',
          memberSince: u.auth_created_at ? new Date(u.auth_created_at).toLocaleDateString() : '',
          createdAt: u.auth_created_at,
          balanceUGX: Number(u.balance_ugx) || 0,
          activeMachinesCount: Number(u.active_machines_count) || 0,
          transactionsCount: Number(u.transactions_count) || 0,
          referralCount: u.referral_count || 0,
          referralCode: u.referral_code || '',
        } as AdminUserSummary & { email?: string };
      }),
    };
  },

  async updateAdminUser(
    userId: string,
    data: { username?: string; fullName?: string; phone?: string; status?: 'active' | 'blocked' }
  ): Promise<{ success: boolean; error?: string }> {
    const sb = getSupabaseClient();
    if (!sb) return { success: false, error: 'Database not configured' };

    const { error } = await sb.rpc('admin_update_user', {
      p_user_id: userId,
      p_username: data.username ?? null,
      p_full_name: data.fullName ?? null,
      p_phone: data.phone ?? null,
      p_status: data.status ?? null,
      p_full_name_meta: data.fullName ?? null,
    });
    if (error) return { success: false, error: translate(error.message) };
    return { success: true };
  },

  async adjustUserBalance(
    userId: string,
    adjustment: { amountUGX: number; type: 'add' | 'deduct'; reason: string }
  ): Promise<{ success: boolean; previousBalance?: number; newBalance?: number; error?: string }> {
    const sb = getSupabaseClient();
    if (!sb) return { success: false, error: 'Database not configured' };

    const { data, error } = await sb.rpc('admin_adjust_balance', {
      p_user_id: userId,
      p_amount: adjustment.amountUGX,
      p_type: adjustment.type,
      p_reason: adjustment.reason,
    });
    if (error) return { success: false, error: translate(error.message) };

    const row = Array.isArray(data) ? data[0] : data;
    return { success: true, previousBalance: Number(row?.previous_balance), newBalance: Number(row?.new_balance) };
  },

  // ---------- ADMIN: AUDIT LOG ----------
  async fetchBalanceAdjustments(): Promise<{ adjustments: BalanceAdjustment[]; error?: string }> {
    const sb = getSupabaseClient();
    if (!sb) return { adjustments: [], error: 'Database not configured' };

    const { data, error } = await sb
      .from('balance_adjustments')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(200);
    if (error) return { adjustments: [], error: translate(error.message) };

    return {
      adjustments: (data || []).map((a: any) => ({
        id: a.id,
        userId: a.user_id,
        username: a.username,
        userFullName: a.user_full_name || undefined,
        previousBalanceUGX: Number(a.previous_balance_ugx),
        adjustmentAmountUGX: Number(a.adjustment_amount_ugx),
        newBalanceUGX: Number(a.new_balance_ugx),
        type: a.type,
        reason: a.reason,
        adminId: a.admin_id,
        adminUsername: a.admin_username,
        timestamp: Number(a.timestamp) || 0,
        date: a.date || new Date(a.created_at).toLocaleDateString(),
      })),
    };
  },
};

function translate(msg: string): string {
  if (!msg) return 'Unknown database error';
  if (msg.includes('Admin access required')) return 'Admin access required.';
  if (msg.includes('Insufficient balance')) return msg.replace('{"message":', '').replace(/"/g, '');
  if (msg.includes('row-level security')) return 'Permission denied by database policy.';
  return msg;
}
