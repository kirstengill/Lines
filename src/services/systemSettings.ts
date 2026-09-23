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

  public getWithdrawalFeeRate(): number {
    return this.currentSettings.withdrawalFeeRate ?? DEFAULT_SYSTEM_SETTINGS.withdrawalFeeRate!;
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

  public async fetchSettings(): Promise<SystemSettings> {
    const sb = getSupabaseClient();
    if (sb) {
      try {
        const { data, error } = await sb.rpc('get_platform_settings');
        if (!error && data) {
          this.currentSettings = mapRow(data);
          this.notify();
          return this.getSettings();
        }
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

    try {
      const res = await apiClient.fetchSystemSettings();
      if (res && !res.error && res.settings) {
        this.currentSettings = {
          ...DEFAULT_SYSTEM_SETTINGS,
          ...res.settings,
          investmentLockDays: Number(res.settings.investmentLockDays ?? DEFAULT_SYSTEM_SETTINGS.investmentLockDays),
        };
        this.notify();
        return this.getSettings();
      }
    } catch {
      // Keep existing
    }

    return this.getSettings();
  }

  public async updateSettings(
    newSettings: Partial<SystemSettings>
  ): Promise<{ success: boolean; settings: SystemSettings; error?: string }> {
    const sb = getSupabaseClient();
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
        return { success: false, settings: this.getSettings(), error: e?.message || 'Failed to update settings' };
      }
    }

    try {
      const res = await apiClient.updateSystemSettings(newSettings);
      if (res.error) {
        return { success: false, settings: this.getSettings(), error: res.error };
      }
      if (res.settings) {
        this.currentSettings = { ...DEFAULT_SYSTEM_SETTINGS, ...res.settings };
        this.notify();
      }
      return { success: !res.error, settings: this.getSettings(), error: res.error };
    } catch (e: any) {
      return { success: false, settings: this.getSettings(), error: e?.message || 'Failed to update settings' };
    }
  }
}

export const systemSettingsService = new SystemSettingsService();
