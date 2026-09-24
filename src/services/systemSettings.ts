import { SystemSettings } from '../types';
import { getSupabaseClient } from './supabase';
import { apiClient } from './apiClient';

export const DEFAULT_SYSTEM_SETTINGS: SystemSettings = {
  referralPercentage: 20,
  minWithdrawUGX: 10000,
  minDepositUGX: 15000,
  withdrawalFeeRate: 0.15,
  welcomeBonusUGX: 4000,
  dailyRewardRate: 0.05,
  investmentLockDays: 60,
};

function mapRow(data: any): SystemSettings {
  return {
    referralPercentage: Number(data.referral_percentage ?? data.referralPercentage ?? DEFAULT_SYSTEM_SETTINGS.referralPercentage),
    minWithdrawUGX: Number(data.min_withdraw_ugx ?? data.minWithdrawUGX ?? DEFAULT_SYSTEM_SETTINGS.minWithdrawUGX),
    minDepositUGX: Number(data.min_deposit_ugx ?? data.minDepositUGX ?? DEFAULT_SYSTEM_SETTINGS.minDepositUGX),
    withdrawalFeeRate: Number(data.withdrawal_fee_rate ?? data.withdrawalFeeRate ?? DEFAULT_SYSTEM_SETTINGS.withdrawalFeeRate),
    welcomeBonusUGX: Number(data.welcome_bonus_ugx ?? data.welcomeBonusUGX ?? DEFAULT_SYSTEM_SETTINGS.welcomeBonusUGX),
    dailyRewardRate: Number(data.daily_reward_rate ?? data.dailyRewardRate ?? DEFAULT_SYSTEM_SETTINGS.dailyRewardRate),
    investmentLockDays: Number(data.investment_lock_days ?? data.investmentLockDays ?? DEFAULT_SYSTEM_SETTINGS.investmentLockDays),
    updatedAt: data.updated_at ?? data.updatedAt,
    updatedBy: data.updated_by ?? data.updatedBy,
  };
}

class SystemSettingsService {
  private currentSettings: SystemSettings = { ...DEFAULT_SYSTEM_SETTINGS };
  private listeners: Set<(settings: SystemSettings) => void> = new Set();

  public getSettings(): SystemSettings {
    return { ...this.currentSettings };
  }

  public getReferralPercentage(): number {
    return this.currentSettings.referralPercentage;
  }

  public getMinWithdrawUGX(): number {
    return this.currentSettings.minWithdrawUGX;
  }

  public getMinDepositUGX(): number {
    return this.currentSettings.minDepositUGX ?? DEFAULT_SYSTEM_SETTINGS.minDepositUGX!;
  }

  public getWithdrawalFeeRate(): number {
    return this.currentSettings.withdrawalFeeRate ?? DEFAULT_SYSTEM_SETTINGS.withdrawalFeeRate!;
  }

  public getWelcomeBonusUGX(): number {
    return this.currentSettings.welcomeBonusUGX ?? DEFAULT_SYSTEM_SETTINGS.welcomeBonusUGX!;
  }

  public getDailyRewardRate(): number {
    return this.currentSettings.dailyRewardRate ?? DEFAULT_SYSTEM_SETTINGS.dailyRewardRate!;
  }

  public getInvestmentLockDays(): number {
    return this.currentSettings.investmentLockDays;
  }

  public subscribe(listener: (settings: SystemSettings) => void): () => void {
    this.listeners.add(listener);
    listener(this.getSettings());
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify(): void {
    const s = this.getSettings();
    this.listeners.forEach((fn) => {
      try {
        fn(s);
      } catch (e) {
        console.error('Error notifying settings listener:', e);
      }
    });
  }

  public async fetchSettings(forceRefresh: boolean = false): Promise<SystemSettings> {
    // If we already have settings and not forcing refresh, return current
    if (!forceRefresh && this.currentSettings.referralPercentage !== DEFAULT_SYSTEM_SETTINGS.referralPercentage) {
      return this.getSettings();
    }
    
    const sb = getSupabaseClient();
    if (sb) {
      try {
        // Try RPC first
        const { data, error } = await sb.rpc('get_platform_settings');
        if (!error && data) {
          this.currentSettings = mapRow(data);
          this.notify();
          return this.getSettings();
        }
        // Fallback to direct table query
        const tableRes = await sb
          .from('system_settings')
          .select('*')
          .eq('id', 'global_config')
          .maybeSingle();
        if (!tableRes.error && tableRes.data) {
          this.currentSettings = mapRow(tableRes.data);
          this.notify();
          return this.getSettings();
        }
      } catch (e) {
        console.warn('system_settings fetch notice:', e);
      }
    }

    // Fallback to API endpoint
    try {
      const res = await apiClient.fetchSystemSettings();
      if (res && !res.error && res.settings) {
        this.currentSettings = {
          ...DEFAULT_SYSTEM_SETTINGS,
          ...res.settings,
          referralPercentage: Number(res.settings.referralPercentage ?? DEFAULT_SYSTEM_SETTINGS.referralPercentage),
          minWithdrawUGX: Number(res.settings.minWithdrawUGX ?? DEFAULT_SYSTEM_SETTINGS.minWithdrawUGX),
          minDepositUGX: Number(res.settings.minDepositUGX ?? DEFAULT_SYSTEM_SETTINGS.minDepositUGX),
          withdrawalFeeRate: Number(res.settings.withdrawalFeeRate ?? DEFAULT_SYSTEM_SETTINGS.withdrawalFeeRate),
          welcomeBonusUGX: Number(res.settings.welcomeBonusUGX ?? DEFAULT_SYSTEM_SETTINGS.welcomeBonusUGX),
          dailyRewardRate: Number(res.settings.dailyRewardRate ?? DEFAULT_SYSTEM_SETTINGS.dailyRewardRate),
          investmentLockDays: Number(res.settings.investmentLockDays ?? DEFAULT_SYSTEM_SETTINGS.investmentLockDays),
          updatedAt: res.settings.updatedAt,
          updatedBy: res.settings.updatedBy,
        };
        this.notify();
        return this.getSettings();
      }
    } catch {
      // Keep existing
    }

    return this.getSettings();
  }

  public async refreshSettings(): Promise<void> {
    await this.fetchSettings(true);
  }

  public async updateSettings(
    newSettings: Partial<SystemSettings>
  ): Promise<{ success: boolean; settings: SystemSettings; error?: string }> {
    const sb = getSupabaseClient();
    
    // Try Supabase RPC first (preferred method)
    if (sb) {
      try {
        const { data, error } = await sb.rpc('admin_update_system_settings', {
          p_referral_percentage: newSettings.referralPercentage ?? null,
          p_min_withdraw_ugx: newSettings.minWithdrawUGX ?? null,
          p_min_deposit_ugx: newSettings.minDepositUGX ?? null,
          p_withdrawal_fee_rate: newSettings.withdrawalFeeRate ?? null,
          p_welcome_bonus_ugx: newSettings.welcomeBonusUGX ?? null,
          p_daily_reward_rate: newSettings.dailyRewardRate ?? null,
          p_investment_lock_days: newSettings.investmentLockDays ?? null,
        });
        if (error) {
          return { success: false, settings: this.getSettings(), error: error.message };
        }
        if (data) {
          this.currentSettings = mapRow(data);
          this.notify();
          return { success: true, settings: this.getSettings() };
        }
      } catch (e: any) {
        console.warn('Supabase RPC update failed, trying API fallback:', e?.message);
      }
    }

    // Fallback to API endpoint
    try {
      const res = await apiClient.updateSystemSettings(newSettings);
      if (res.error) {
        return { success: false, settings: this.getSettings(), error: res.error };
      }
      if (res.settings) {
        // Map the API response to our internal format
        this.currentSettings = {
          ...this.currentSettings,
          ...res.settings,
          referralPercentage: Number(res.settings.referralPercentage ?? this.currentSettings.referralPercentage),
          minWithdrawUGX: Number(res.settings.minWithdrawUGX ?? this.currentSettings.minWithdrawUGX),
          minDepositUGX: Number(res.settings.minDepositUGX ?? this.currentSettings.minDepositUGX),
          withdrawalFeeRate: Number(res.settings.withdrawalFeeRate ?? this.currentSettings.withdrawalFeeRate),
          welcomeBonusUGX: Number(res.settings.welcomeBonusUGX ?? this.currentSettings.welcomeBonusUGX),
          dailyRewardRate: Number(res.settings.dailyRewardRate ?? this.currentSettings.dailyRewardRate),
          investmentLockDays: Number(res.settings.investmentLockDays ?? this.currentSettings.investmentLockDays),
          updatedAt: res.settings.updatedAt ?? this.currentSettings.updatedAt,
          updatedBy: res.settings.updatedBy ?? this.currentSettings.updatedBy,
        };
        this.notify();
      }
      return { success: !res.error, settings: this.getSettings(), error: res.error };
    } catch (e: any) {
      return { success: false, settings: this.getSettings(), error: e?.message || 'Failed to update settings' };
    }
  }
}

export const systemSettingsService = new SystemSettingsService();
