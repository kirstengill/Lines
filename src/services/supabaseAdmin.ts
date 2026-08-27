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
  Machine,
} from '../types';
import { AVAILABLE_CATALOG } from '../data/initialData';

export interface SubmitTransactionInput {
  type: 'deposit' | 'withdraw';
  amountUGX: number;
  description?: string;
  paymentMethod?: string;
  recipientInfo?: string;
}

export const supabaseAdmin = {
  // ---------- USER SUBMITS DEPOSIT / WITHDRAW -> pending row in Supabase ----------
  async submitTransaction(input: SubmitTransactionInput): Promise<{ success: boolean; transaction?: Transaction; error?: string }> {
    const sb = getSupabaseClient();
    if (!sb) return { success: false, error: 'Database not configured' };

    try {
      const { data, error } = await sb.rpc('submit_transaction', {
        p_type: input.type,
        p_amount_ugx: input.amountUGX,
        p_description: input.description ?? null,
        p_payment_method: input.paymentMethod ?? null,
        p_recipient_info: input.recipientInfo ?? null,
      });

      if (!error && data) {
        const rawTs = Number(data.timestamp) || (data.created_at ? new Date(data.created_at).getTime() : Date.now());
        const dateStr = data.created_at
          ? new Date(data.created_at).toLocaleString()
          : new Date(rawTs).toLocaleString();

        return {
          success: true,
          transaction: {
            id: data.id,
            userId: data.user_id,
            type: data.type,
            amountUGX: Number(data.amount_ugx),
            currency: 'UGX',
            status: data.status || 'pending',
            date: dateStr,
            timestamp: rawTs,
            description: data.description || `${data.type.toUpperCase()} Request`,
            paymentMethod: data.payment_method,
            recipientInfo: data.recipient_info,
          },
        };
      }

      // Direct insert fallback if RPC not yet created in user's Supabase instance
      const { data: authData } = await sb.auth.getUser();
      let userId = authData?.user?.id;
      if (!userId) {
        const localUser = (await import('./supabaseAuth')).authService.getCurrentUser();
        userId = localUser?.id;
      }
      if (!userId) return { success: false, error: 'Not authenticated' };

      const txId = `tx_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      const now = new Date();
      const insertPayload = {
        id: txId,
        user_id: userId,
        type: input.type,
        amount_ugx: input.amountUGX,
        currency: 'UGX',
        status: 'pending',
        description: input.description || `${input.type.toUpperCase()} Request — UGX ${input.amountUGX.toLocaleString()}`,
        payment_method: input.paymentMethod || null,
        recipient_info: input.recipientInfo || null,
        timestamp: now.getTime(),
        created_at: now.toISOString(),
      };

      const { error: insertError } = await sb.from('transactions').insert(insertPayload);

      if (insertError) {
        return { success: false, error: translate(insertError.message) };
      }

      // Also insert into admin_tasks for visibility in Admin Dashboard
      try {
        await sb.from('admin_tasks').insert({
          id: `task_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
          user_id: userId,
          transaction_id: txId,
          title: `${input.type === 'deposit' ? 'Deposit Verification' : 'Withdrawal Review'}: UGX ${input.amountUGX.toLocaleString()}`,
          description: `User requested ${input.type} of UGX ${input.amountUGX.toLocaleString()} via ${input.paymentMethod || 'Mobile Money'}`,
          priority: 'high',
          category: input.type === 'deposit' ? 'Deposit Verification' : 'Withdrawal Review',
          type: input.type,
          status: 'pending',
          amount_ugx: input.amountUGX,
          created_at: now.toISOString(),
        });
      } catch {
        // non-blocking
      }

      return {
        success: true,
        transaction: {
          id: txId,
          userId,
          type: input.type,
          amountUGX: input.amountUGX,
          currency: 'UGX',
          status: 'pending',
          date: now.toLocaleString(),
          timestamp: now.getTime(),
          description: insertPayload.description,
          paymentMethod: input.paymentMethod,
          recipientInfo: input.recipientInfo,
        },
      };
    } catch (e: any) {
      return { success: false, error: e?.message || 'Transaction submission failed' };
    }
  },

  // ---------- ATOMIC INVESTMENT PURCHASE (Persisted to Supabase) ----------
  async buyInvestment(
    machineOrId: Partial<Machine> | string,
    amountUGX?: number
  ): Promise<{ success: boolean; investment?: any; newBalance?: number; error?: string }> {
    const sb = getSupabaseClient();
    if (!sb) return { success: false, error: 'Database not configured' };

    const machineObj: Partial<Machine> =
      typeof machineOrId === 'string'
        ? { id: machineOrId, minInvestUGX: amountUGX }
        : machineOrId;

    const cost = Number(machineObj.minInvestUGX || amountUGX || 0);
    if (!cost || cost <= 0) {
      return { success: false, error: 'Invalid investment machine amount.' };
    }

    try {
      // 1. Try atomic RPC first
      const { data: rpcData, error: rpcError } = await sb.rpc('buy_investment', {
        p_machine_id: machineObj.id || 'custom_node',
        p_title: machineObj.title || 'Investment Node',
        p_category: machineObj.category || 'DS-Mining',
        p_image: machineObj.image || 'https://images.unsplash.com/photo-1509391365360-2e959784a276?auto=format&fit=crop&w=800&q=80',
        p_amount_ugx: cost,
        p_daily_reward_ugx: Number(machineObj.dailyRewardUGX || 0),
        p_hashrate: machineObj.hashrate || '10.0 TH/s',
        p_power_source: machineObj.powerSource || 'Clean Energy Array',
        p_est_roi: Number(machineObj.estYearlyROI || 120),
      });

      if (!rpcError && rpcData?.success) {
        return {
          success: true,
          newBalance: Number(rpcData.new_balance),
          investment: {
            id: rpcData.user_machine_id,
            machineId: machineObj.id,
            title: machineObj.title,
            amountInvestedUGX: cost,
          },
        };
      }

      // 2. Direct fallback if RPC is not present
      const { data: authData } = await sb.auth.getUser();
      const userId = authData?.user?.id;
      if (!userId) return { success: false, error: 'Not authenticated' };

      // Check current wallet
      const { data: walletRow } = await sb
        .from('wallets')
        .select('*')
        .eq('user_id', userId)
        .single();

      const currentBalance = Number(walletRow?.total_balance_ugx ?? walletRow?.balance ?? 0);
      if (currentBalance < cost) {
        return {
          success: false,
          error: `Insufficient balance. Required: UGX ${cost.toLocaleString()}, Available: UGX ${currentBalance.toLocaleString()}.`,
        };
      }

      const newBalance = currentBalance - cost;
      const newActiveCount = Number(walletRow?.active_machines_count || 0) + 1;
      const newDailyPnl = Number(walletRow?.daily_pnl_ugx || 0) + Number(machineObj.dailyRewardUGX || 0);

      // Update wallet
      await sb
        .from('wallets')
        .update({
          total_balance_ugx: newBalance,
          daily_pnl_ugx: newDailyPnl,
          active_machines_count: newActiveCount,
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', userId);

      // Insert user machine
      const nodeMachineId = `node_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
      await sb.from('user_machines').insert({
        id: nodeMachineId,
        user_id: userId,
        machine_id: machineObj.id || 'custom_node',
        title: machineObj.title || 'Investment Node',
        category: machineObj.category || 'DS-Mining',
        image: machineObj.image || 'https://images.unsplash.com/photo-1509391365360-2e959784a276?auto=format&fit=crop&w=800&q=80',
        daily_reward_ugx: Number(machineObj.dailyRewardUGX || 0),
        status: 'Active',
        est_yearly_roi: Number(machineObj.estYearlyROI || 120),
        min_invest_ugx: cost,
        amount_invested_ugx: cost,
        hashrate: machineObj.hashrate || '10.0 TH/s',
        power_source: machineObj.powerSource || 'Clean Energy Array',
        total_mined_ugx: 0,
        unclaimed_rewards_ugx: 0,
        is_boosted: Boolean(machineObj.isBoosted),
      });

      // Insert transaction
      const txId = `tx_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
      await sb.from('transactions').insert({
        id: txId,
        user_id: userId,
        type: 'investment',
        amount_ugx: cost,
        currency: 'UGX',
        status: 'completed',
        description: `Deployed Investment Node: ${machineObj.title || 'Node'}`,
        timestamp: Date.now(),
        created_at: new Date().toISOString(),
      });

      // Insert notification
      await sb.from('notifications').insert({
        id: `notif_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        user_id: userId,
        title: 'Investment Activated',
        message: `Successfully deployed ${machineObj.title || 'Node'}. Earning daily UGX yield.`,
        read: false,
        type: 'success',
      });

      return {
        success: true,
        newBalance,
        investment: {
          id: nodeMachineId,
          machineId: machineObj.id,
          title: machineObj.title,
          amountInvestedUGX: cost,
        },
      };
    } catch (e: any) {
      console.error('[Supabase Admin] buyInvestment error:', e);
      return { success: false, error: e?.message || 'Investment failed.' };
    }
  },

  // ---------- CLAIM INVESTMENT YIELD ----------
  async claimInvestmentYield(userMachineId: string): Promise<{ success: boolean; claimedUGX?: number; newBalance?: number; error?: string }> {
    const sb = getSupabaseClient();
    if (!sb) return { success: false, error: 'Database not configured' };

    try {
      const { data: authData } = await sb.auth.getUser();
      const userId = authData?.user?.id;
      if (!userId) return { success: false, error: 'Not authenticated' };

      const { data: machineRow } = await sb
        .from('user_machines')
        .select('*')
        .eq('id', userMachineId)
        .eq('user_id', userId)
        .single();

      if (!machineRow) return { success: false, error: 'Investment machine not found' };

      const unclaimed = Number(machineRow.unclaimed_rewards_ugx || 0);
      if (unclaimed <= 0) return { success: false, error: 'No accumulated yield available to claim at this time.' };

      // Update machine
      const totalMined = Number(machineRow.total_mined_ugx || 0) + unclaimed;
      await sb
        .from('user_machines')
        .update({
          unclaimed_rewards_ugx: 0,
          total_mined_ugx: totalMined,
          updated_at: new Date().toISOString(),
        })
        .eq('id', userMachineId);

      // Credit wallet
      const { data: walletRow } = await sb.from('wallets').select('*').eq('user_id', userId).single();
      const currentBalance = Number(walletRow?.total_balance_ugx ?? walletRow?.balance ?? 0);
      const newBalance = currentBalance + unclaimed;

      await sb
        .from('wallets')
        .update({
          total_balance_ugx: newBalance,
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', userId);

      // Insert reward transaction
      await sb.from('transactions').insert({
        id: `tx_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        user_id: userId,
        type: 'reward',
        amount_ugx: unclaimed,
        currency: 'UGX',
        status: 'completed',
        description: `Mined Hash Yield Claimed: ${machineRow.title}`,
        timestamp: Date.now(),
        created_at: new Date().toISOString(),
      });

      return { success: true, claimedUGX: unclaimed, newBalance };
    } catch (e: any) {
      return { success: false, error: e?.message || 'Failed to claim yield' };
    }
  },

  // ---------- DYNAMIC PRODUCTS CATALOG (Stored in Supabase catalog_machines) ----------
  async fetchCatalogMachines(): Promise<{ machines: Machine[]; error?: string }> {
    const sb = getSupabaseClient();
    if (!sb) {
      return { machines: AVAILABLE_CATALOG };
    }

    try {
      const { data, error } = await sb
        .from('catalog_machines')
        .select('*')
        .order('min_invest_ugx', { ascending: true });

      if (error) {
        console.warn('[Supabase Admin] fetchCatalogMachines table notice:', error.message);
        return { machines: AVAILABLE_CATALOG, error: error.message };
      }

      if (!data || data.length === 0) {
        // Table exists but is unseeded — seed initial catalog into Supabase
        console.log('[Supabase Admin] Seeding initial catalog machines to Supabase table...');
        try {
          const seedPayload = AVAILABLE_CATALOG.map((m) => ({
            id: m.id,
            title: m.title,
            subtitle: m.subtitle || null,
            category: m.category,
            image: m.image,
            daily_reward_ugx: m.dailyRewardUGX,
            status: m.status || 'Active',
            est_yearly_roi: m.estYearlyROI || 120,
            min_invest_ugx: m.minInvestUGX,
            hashrate: m.hashrate || '10.0 TH/s',
            power_source: m.powerSource || 'Clean Energy',
            uptime: m.uptime || '99.9%',
            temperature: m.temperature || '36.0°C',
            efficiency: m.efficiency || 98.5,
            total_mined_ugx: m.totalMinedUGX || 0,
            unclaimed_rewards_ugx: m.unclaimedRewardsUGX || 0,
            is_boosted: Boolean(m.isBoosted),
          }));
          await sb.from('catalog_machines').upsert(seedPayload, { onConflict: 'id' });
        } catch (seedErr) {
          console.warn('[Supabase Admin] Seeding notice:', seedErr);
        }
        return { machines: AVAILABLE_CATALOG };
      }

      const mappedMachines: Machine[] = data.map((m: any) => ({
        id: m.id,
        title: m.title,
        subtitle: m.subtitle || undefined,
        category: m.category || 'DS-Mining',
        image: m.image,
        dailyRewardUGX: Number(m.daily_reward_ugx || m.dailyRewardUGX || 0),
        status: (m.status || 'Active') as Machine['status'],
        estYearlyROI: Number(m.est_yearly_roi || m.estYearlyROI || 0),
        minInvestUGX: Number(m.min_invest_ugx || m.minInvestUGX || 0),
        hashrate: m.hashrate || '10.0 TH/s',
        powerSource: m.power_source || m.powerSource || 'Clean Energy Array',
        uptime: m.uptime || '99.9%',
        temperature: m.temperature || '36.0°C',
        efficiency: Number(m.efficiency || 98.5),
        totalMinedUGX: Number(m.total_mined_ugx || m.totalMinedUGX || 0),
        unclaimedRewardsUGX: Number(m.unclaimed_rewards_ugx || m.unclaimedRewardsUGX || 0),
        isBoosted: Boolean(m.is_boosted || m.isBoosted),
      }));

      return { machines: mappedMachines };
    } catch (e: any) {
      console.error('[Supabase Admin] fetchCatalogMachines error:', e);
      return { machines: AVAILABLE_CATALOG, error: e?.message };
    }
  },

  async createCatalogMachine(machine: Partial<Machine>): Promise<{ success: boolean; machine?: Machine; error?: string }> {
    const sb = getSupabaseClient();
    if (!sb) return { success: false, error: 'Database not configured' };

    const machineId = machine.id || `mach_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const cost = Math.round(Number(machine.minInvestUGX || 0));

    if (!machine.title || !cost) {
      return { success: false, error: 'Project Title and Minimum Investment amount are required.' };
    }

    const payload = {
      id: machineId,
      title: machine.title.trim(),
      subtitle: machine.subtitle ? machine.subtitle.trim() : null,
      category: machine.category || 'DS-Mining',
      image: machine.image || 'https://images.unsplash.com/photo-1509391365360-2e959784a276?auto=format&fit=crop&w=800&q=80',
      daily_reward_ugx: Number(machine.dailyRewardUGX || 250000),
      status: machine.status || 'Active',
      est_yearly_roi: Number(machine.estYearlyROI || 120),
      min_invest_ugx: cost,
      hashrate: machine.hashrate || '50.0 TH/s',
      power_source: machine.powerSource || 'Clean Energy Array',
      uptime: machine.uptime || '99.9%',
      temperature: machine.temperature || '38.0°C',
      efficiency: Number(machine.efficiency || 99.0),
      total_mined_ugx: 0,
      unclaimed_rewards_ugx: 0,
      is_boosted: Boolean(machine.isBoosted),
    };

    try {
      const { error } = await sb.from('catalog_machines').insert(payload);
      if (error) return { success: false, error: translate(error.message) };

      const created: Machine = {
        id: payload.id,
        title: payload.title,
        subtitle: payload.subtitle || undefined,
        category: payload.category as any,
        image: payload.image,
        dailyRewardUGX: payload.daily_reward_ugx,
        status: payload.status as any,
        estYearlyROI: payload.est_yearly_roi,
        minInvestUGX: payload.min_invest_ugx,
        hashrate: payload.hashrate,
        powerSource: payload.power_source,
        uptime: payload.uptime,
        temperature: payload.temperature,
        efficiency: payload.efficiency,
        totalMinedUGX: 0,
        unclaimedRewardsUGX: 0,
        isBoosted: payload.is_boosted,
      };

      return { success: true, machine: created };
    } catch (e: any) {
      return { success: false, error: e?.message || 'Failed to create catalog product' };
    }
  },

  async updateCatalogMachine(id: string, machine: Partial<Machine>): Promise<{ success: boolean; machine?: Machine; error?: string }> {
    const sb = getSupabaseClient();
    if (!sb) return { success: false, error: 'Database not configured' };

    const updatePayload: any = {};
    if (machine.title !== undefined) updatePayload.title = machine.title.trim();
    if (machine.subtitle !== undefined) updatePayload.subtitle = machine.subtitle ? machine.subtitle.trim() : null;
    if (machine.category !== undefined) updatePayload.category = machine.category;
    if (machine.image !== undefined) updatePayload.image = machine.image;
    if (machine.dailyRewardUGX !== undefined) updatePayload.daily_reward_ugx = Number(machine.dailyRewardUGX);
    if (machine.status !== undefined) updatePayload.status = machine.status;
    if (machine.estYearlyROI !== undefined) updatePayload.est_yearly_roi = Number(machine.estYearlyROI);
    if (machine.minInvestUGX !== undefined) updatePayload.min_invest_ugx = Math.round(Number(machine.minInvestUGX));
    if (machine.hashrate !== undefined) updatePayload.hashrate = machine.hashrate;
    if (machine.powerSource !== undefined) updatePayload.power_source = machine.powerSource;
    if (machine.uptime !== undefined) updatePayload.uptime = machine.uptime;
    if (machine.temperature !== undefined) updatePayload.temperature = machine.temperature;
    if (machine.efficiency !== undefined) updatePayload.efficiency = Number(machine.efficiency);
    if (machine.isBoosted !== undefined) updatePayload.is_boosted = Boolean(machine.isBoosted);

    try {
      const { data, error } = await sb
        .from('catalog_machines')
        .update(updatePayload)
        .eq('id', id)
        .select()
        .single();

      if (error) return { success: false, error: translate(error.message) };

      const updated: Machine = {
        id: data.id,
        title: data.title,
        subtitle: data.subtitle || undefined,
        category: data.category,
        image: data.image,
        dailyRewardUGX: Number(data.daily_reward_ugx),
        status: data.status,
        estYearlyROI: Number(data.est_yearly_roi),
        minInvestUGX: Number(data.min_invest_ugx),
        hashrate: data.hashrate,
        powerSource: data.power_source,
        uptime: data.uptime,
        temperature: data.temperature,
        efficiency: Number(data.efficiency),
        totalMinedUGX: Number(data.total_mined_ugx || 0),
        unclaimedRewardsUGX: Number(data.unclaimed_rewards_ugx || 0),
        isBoosted: Boolean(data.is_boosted),
      };

      return { success: true, machine: updated };
    } catch (e: any) {
      return { success: false, error: e?.message || 'Failed to update catalog product' };
    }
  },

  async deleteCatalogMachine(id: string): Promise<{ success: boolean; error?: string }> {
    const sb = getSupabaseClient();
    if (!sb) return { success: false, error: 'Database not configured' };

    try {
      const { error } = await sb.from('catalog_machines').delete().eq('id', id);
      if (error) return { success: false, error: translate(error.message) };
      return { success: true };
    } catch (e: any) {
      return { success: false, error: e?.message || 'Failed to delete catalog product' };
    }
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
      // 1. Try security-definer RPC admin_all_transactions first
      const { data: rpcData, error: rpcError } = await sb.rpc('admin_all_transactions');
      if (!rpcError && rpcData) {
        return {
          transactions: rpcData.map((t: any) => ({
            id: t.id,
            userId: t.user_id,
            username: t.username || 'user',
            userFullName: t.user_full_name,
            type: t.type,
            amountUGX: Number(t.amount_ugx),
            currency: 'UGX' as const,
            status: (t.status || 'pending') as Transaction['status'],
            date: new Date(t.created_at || t.timestamp || Date.now()).toLocaleString(),
            timestamp: Number(t.timestamp) || (t.created_at ? new Date(t.created_at).getTime() : undefined),
            description: t.description || '',
            paymentMethod: t.payment_method || undefined,
            recipientInfo: t.recipient_info || undefined,
            txHash: t.tx_hash || undefined,
          })),
        };
      }

      // 2. Direct query on transactions table
      const { data, error } = await sb
        .from('transactions')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(1000);

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
            amountUGX: Number(t.amount_ugx || t.amount || 0),
            currency: 'UGX' as const,
            status: (t.status || 'pending') as Transaction['status'],
            date: new Date(t.created_at || t.timestamp || Date.now()).toLocaleString(),
            timestamp: Number(t.timestamp) || (t.created_at ? new Date(t.created_at).getTime() : undefined),
            description: t.description || '',
            paymentMethod: t.payment_method || undefined,
            recipientInfo: t.recipient_info || undefined,
            txHash: t.tx_hash || undefined,
          };
        }),
      };
    } catch (e: any) {
      console.warn('[Supabase Admin] fetchAllTransactions exception:', e);
      return this.fetchPendingTransactions();
    }
  },

  // ---------- ADMIN: APPROVE / REJECT ----------
  async approveTransaction(txId: string): Promise<{ success: boolean; newBalance?: number; error?: string }> {
    const sb = getSupabaseClient();
    if (!sb) return { success: false, error: 'Database not configured' };

    try {
      const { data, error } = await sb.rpc('admin_approve_transaction', { p_transaction_id: txId });
      if (!error) {
        return { success: true, newBalance: data === null ? undefined : Number(data) };
      }

      // Fallback: direct update if RPC is missing
      const { data: tx } = await sb.from('transactions').select('*').eq('id', txId).single();
      if (!tx || tx.status !== 'pending') return { success: true };

      await sb.from('transactions').update({ status: 'completed' }).eq('id', txId);

      // Update user wallet balance
      const amount = Number(tx.amount_ugx || tx.amount || 0);
      const { data: wallet } = await sb.from('wallets').select('*').eq('user_id', tx.user_id).single();
      const curBal = Number(wallet?.total_balance_ugx ?? wallet?.balance ?? 0);
      const newBal = tx.type === 'deposit' ? curBal + amount : curBal - amount;

      await sb.from('wallets').update({ total_balance_ugx: newBal, updated_at: new Date().toISOString() }).eq('user_id', tx.user_id);

      return { success: true, newBalance: newBal };
    } catch (e: any) {
      return { success: false, error: e?.message || 'Approval failed' };
    }
  },

  async rejectTransaction(txId: string): Promise<{ success: boolean; balance?: number; error?: string }> {
    const sb = getSupabaseClient();
    if (!sb) return { success: false, error: 'Database not configured' };

    try {
      const { data, error } = await sb.rpc('admin_reject_transaction', { p_transaction_id: txId });
      if (!error) {
        return { success: true, balance: data === null ? undefined : Number(data) };
      }

      // Fallback: direct update
      await sb.from('transactions').update({ status: 'rejected' }).eq('id', txId);
      return { success: true };
    } catch (e: any) {
      return { success: false, error: e?.message || 'Rejection failed' };
    }
  },

  // ---------- ADMIN: USERS (from Supabase Auth + profiles + wallets) ----------
  async fetchAdminUsers(): Promise<{ users: AdminUserSummary[]; error?: string }> {
    const sb = getSupabaseClient();
    if (!sb) return { users: [], error: 'Database not configured' };

    try {
      const { data, error } = await sb.rpc('admin_list_users');

      if (error) {
        console.warn('[Supabase Admin] admin_list_users RPC notice:', error.message);

        // Fallback: Direct select on profiles if RPC returned an authorization or naming error
        const { data: profileRows, error: profileErr } = await sb
          .from('profiles')
          .select('*')
          .order('created_at', { ascending: false });

        if (profileErr || !profileRows) {
          return { users: [], error: error.message || translate(error.message) };
        }

        // Fetch wallet balances for profiles
        const { data: walletRows } = await sb.from('wallets').select('user_id, balance, total_balance_ugx, active_machines_count');
        const walletMap = new Map<string, { balance: number; activeMachines: number }>();
        if (walletRows) {
          walletRows.forEach((w: any) => {
            walletMap.set(w.user_id, {
              balance: Number(w.balance ?? w.total_balance_ugx ?? 0),
              activeMachines: Number(w.active_machines_count ?? 0),
            });
          });
        }

        const fallbackUsers: AdminUserSummary[] = profileRows.map((p: any) => {
          const w = walletMap.get(p.id);
          const username = p.username || (p.email ? p.email.split('@')[0] : '') || (p.phone ? `user_${p.phone.slice(-4)}` : '') || 'user';
          const fullName = p.full_name || username || 'Unnamed User';
          const isAdmin = Boolean(p.is_admin);

          return {
            id: p.id,
            username,
            fullName,
            phone: p.phone || '',
            email: p.email || '',
            status: (p.status === 'blocked' ? 'blocked' : 'active') as 'active' | 'blocked',
            role: isAdmin ? ('admin' as const) : ('user' as const),
            isAdmin,
            tier: p.tier || 'Standard',
            memberSince: p.created_at ? new Date(p.created_at).toLocaleDateString() : '',
            createdAt: p.created_at,
            balanceUGX: w?.balance ?? 0,
            activeMachinesCount: w?.activeMachines ?? 0,
            transactionsCount: 0,
            referralCount: Number(p.referral_count) || 0,
            referralCode: p.referral_code || '',
          };
        });

        return { users: fallbackUsers };
      }

      const mappedUsers: AdminUserSummary[] = (data || []).map((u: any) => {
        const meta = u.raw_user_meta_data || {};
        const username =
          u.username ||
          meta.username ||
          (u.email ? u.email.split('@')[0] : '') ||
          (u.phone ? `user_${String(u.phone).replace(/[^0-9]/g, '').slice(-4)}` : '') ||
          'user';
        const fullName =
          u.full_name ||
          meta.full_name ||
          meta.name ||
          (u.username ? `@${u.username}` : '') ||
          (u.email ? u.email.split('@')[0] : '') ||
          'Unnamed User';
        const phone = u.phone || meta.phone || '';
        const email = u.email || meta.email || '';
        const status = u.status === 'blocked' ? 'blocked' : 'active';
        const isAdmin = Boolean(u.is_admin || meta.is_admin);

        return {
          id: String(u.id),
          username,
          fullName,
          phone,
          email,
          status,
          role: isAdmin ? ('admin' as const) : ('user' as const),
          isAdmin,
          tier: u.tier || 'Standard',
          memberSince: u.auth_created_at ? new Date(u.auth_created_at).toLocaleDateString() : '',
          createdAt: u.auth_created_at,
          balanceUGX: Number(u.balance_ugx) || 0,
          activeMachinesCount: Number(u.active_machines_count) || 0,
          transactionsCount: Number(u.transactions_count) || 0,
          referralCount: Number(u.referral_count) || 0,
          referralCode: u.referral_code || '',
        };
      });

      return { users: mappedUsers };
    } catch (e: any) {
      console.error('[Supabase Admin] fetchAdminUsers exception:', e);
      return { users: [], error: e?.message || 'Failed to fetch users from Supabase' };
    }
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

    try {
      const { data, error } = await sb.rpc('admin_adjust_balance', {
        p_user_id: userId,
        p_amount: adjustment.amountUGX,
        p_type: adjustment.type,
        p_reason: adjustment.reason,
      });

      if (!error && data) {
        const row = Array.isArray(data) ? data[0] : data;
        if (row && (row.new_balance !== undefined || row.newBalance !== undefined)) {
          return {
            success: true,
            previousBalance: Number(row.previous_balance ?? row.previousBalance ?? 0),
            newBalance: Number(row.new_balance ?? row.newBalance ?? 0),
          };
        }
      }

      console.warn('[Supabase Admin] admin_adjust_balance RPC returned notice or empty, executing direct balance adjustment fallback...', error?.message);

      // Direct fallback: Select user wallet, calculate new balance, and upsert
      const { data: walletData } = await sb
        .from('wallets')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();

      const currentBalance = Number(walletData?.total_balance_ugx ?? walletData?.balance ?? 0);
      const newBalance =
        adjustment.type === 'add'
          ? currentBalance + adjustment.amountUGX
          : Math.max(0, currentBalance - adjustment.amountUGX);

      if (adjustment.type === 'deduct' && adjustment.amountUGX > currentBalance) {
        return {
          success: false,
          error: `Cannot deduct UGX ${adjustment.amountUGX.toLocaleString()}. User balance is only UGX ${currentBalance.toLocaleString()}.`,
        };
      }

      // Upsert wallet balance
      const { error: walletUpdateErr } = await sb.from('wallets').upsert({
        user_id: userId,
        total_balance_ugx: newBalance,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'user_id' });

      if (walletUpdateErr) {
        console.warn('[Supabase Admin] Direct wallet update notice:', walletUpdateErr);
        // Try updating existing row
        await sb
          .from('wallets')
          .update({ total_balance_ugx: newBalance, updated_at: new Date().toISOString() })
          .eq('user_id', userId);
      }

      // Fetch user and admin details for the audit log
      const { data: userProfile } = await sb.from('profiles').select('username, full_name').eq('id', userId).maybeSingle();
      const { data: authAdmin } = await sb.auth.getUser();
      const adminId = authAdmin?.user?.id || 'admin';
      const adminUsername = authAdmin?.user?.user_metadata?.username || authAdmin?.user?.email?.split('@')[0] || 'Admin';

      const now = new Date();

      // Insert into balance_adjustments table
      try {
        await sb.from('balance_adjustments').insert({
          id: `adj_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
          user_id: userId,
          username: userProfile?.username || 'user',
          user_full_name: userProfile?.full_name || 'User',
          previous_balance_ugx: currentBalance,
          adjustment_amount_ugx: adjustment.amountUGX,
          new_balance_ugx: newBalance,
          type: adjustment.type,
          reason: adjustment.reason || 'Admin balance adjustment',
          admin_id: adminId,
          admin_username: adminUsername,
          timestamp: now.getTime(),
          date: now.toISOString().split('T')[0],
          created_at: now.toISOString(),
        });
      } catch (e) {
        console.warn('[Supabase Admin] balance_adjustments insert notice:', e);
      }

      // Insert completed transaction into transactions table
      try {
        await sb.from('transactions').insert({
          id: `tx_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
          user_id: userId,
          type: 'adjustment',
          amount_ugx: adjustment.amountUGX,
          currency: 'UGX',
          status: 'completed',
          description: `Admin Balance Adjustment (${adjustment.type === 'add' ? 'Credit' : 'Deduction'}): ${adjustment.reason || 'Manual balance update'}`,
          timestamp: now.getTime(),
          created_at: now.toISOString(),
        });
      } catch (e) {
        console.warn('[Supabase Admin] transactions table notice:', e);
      }

      // Insert notification for the user
      try {
        await sb.from('notifications').insert({
          id: `notif_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
          user_id: userId,
          title: adjustment.type === 'add' ? 'Funds Credited by Admin' : 'Funds Deducted by Admin',
          message: `Your wallet balance was ${adjustment.type === 'add' ? 'credited with UGX ' : 'deducted by UGX '} ${adjustment.amountUGX.toLocaleString()}. New balance: UGX ${newBalance.toLocaleString()}. Reason: ${adjustment.reason}`,
          read: false,
          type: adjustment.type === 'add' ? 'success' : 'info',
          created_at: now.toISOString(),
        });
      } catch (e) {
        console.warn('[Supabase Admin] notifications insert notice:', e);
      }

      return {
        success: true,
        previousBalance: currentBalance,
        newBalance: newBalance,
      };
    } catch (e: any) {
      console.error('[Supabase Admin] adjustUserBalance exception:', e);
      return { success: false, error: e?.message || 'Failed to adjust user balance' };
    }
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
