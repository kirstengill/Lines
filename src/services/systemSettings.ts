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
};

const STORAGE_KEY = 'sunrise_system_settings';

class SystemSettingsService {
  private currentSettings: SystemSettings = { ...DEFAULT_SYSTEM_SETTINGS };
  private listeners: Set<(settings: SystemSettings) => void> = new Set();

  constructor() {
    this.loadFromLocalStorage();
  }

  private loadFromLocalStorage(): void {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        this.currentSettings = {
          ...DEFAULT_SYSTEM_SETTINGS,
          ...parsed,
          referralPercentage: Number(parsed.referralPercentage) || DEFAULT_SYSTEM_SETTINGS.referralPercentage,
          minWithdrawUGX: Number(parsed.minWithdrawUGX) || DEFAULT_SYSTEM_SETTINGS.minWithdrawUGX,
          withdrawalFeeRate: Number(parsed.withdrawalFeeRate ?? DEFAULT_SYSTEM_SETTINGS.withdrawalFeeRate),
          welcomeBonusUGX: Number(parsed.welcomeBonusUGX ?? DEFAULT_SYSTEM_SETTINGS.welcomeBonusUGX),
          dailyRewardRate: Number(parsed.dailyRewardRate ?? DEFAULT_SYSTEM_SETTINGS.dailyRewardRate),
        };
      }
    } catch {
      this.currentSettings = { ...DEFAULT_SYSTEM_SETTINGS };
    }
  }

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
    return this.currentSettings.withdrawalFeeRate ?? 0.15;
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
        const { data, error } = await sb
          .from('system_settings')
          .select('*')
          .order('updated_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (!error && data) {
          this.currentSettings = {
            referralPercentage: Number(data.referral_percentage ?? data.referralPercentage ?? DEFAULT_SYSTEM_SETTINGS.referralPercentage),
            minWithdrawUGX: Number(data.min_withdraw_ugx ?? data.minWithdrawUGX ?? DEFAULT_SYSTEM_SETTINGS.minWithdrawUGX),
            minDepositUGX: Number(data.min_deposit_ugx ?? data.minDepositUGX ?? DEFAULT_SYSTEM_SETTINGS.minDepositUGX),
            withdrawalFeeRate: Number(data.withdrawal_fee_rate ?? data.withdrawalFeeRate ?? DEFAULT_SYSTEM_SETTINGS.withdrawalFeeRate),
            welcomeBonusUGX: Number(data.welcome_bonus_ugx ?? data.welcomeBonusUGX ?? DEFAULT_SYSTEM_SETTINGS.welcomeBonusUGX),
            dailyRewardRate: Number(data.daily_reward_rate ?? data.dailyRewardRate ?? DEFAULT_SYSTEM_SETTINGS.dailyRewardRate),
            updatedAt: data.updated_at,
            updatedBy: data.updated_by,
          };
          localStorage.setItem(STORAGE_KEY, JSON.stringify(this.currentSettings));
          this.notify();
          return this.getSettings();
        }
      } catch (e) {
        console.warn('Supabase system_settings table notice:', e);
      }
    }

    // Try mock server / API client fallback
    try {
      const res = await apiClient.fetchSystemSettings();
      if (res && !res.error && res.settings) {
        this.currentSettings = {
          ...DEFAULT_SYSTEM_SETTINGS,
          ...res.settings,
        };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(this.currentSettings));
        this.notify();
        return this.getSettings();
      }
    } catch {
      // Keep existing
    }

    return this.getSettings();
  }

  public async updateSettings(
    newSettings: Partial<SystemSettings>,
    adminUsername?: string
  ): Promise<{ success: boolean; settings: SystemSettings; error?: string }> {
    const updated: SystemSettings = {
      ...this.currentSettings,
      ...newSettings,
      referralPercentage: Math.max(1, Math.min(100, Number(newSettings.referralPercentage ?? this.currentSettings.referralPercentage))),
      minWithdrawUGX: Math.max(1000, Math.round(Number(newSettings.minWithdrawUGX ?? this.currentSettings.minWithdrawUGX))),
      withdrawalFeeRate: Number(newSettings.withdrawalFeeRate ?? this.currentSettings.withdrawalFeeRate),
      welcomeBonusUGX: Number(newSettings.welcomeBonusUGX ?? this.currentSettings.welcomeBonusUGX),
      dailyRewardRate: Number(newSettings.dailyRewardRate ?? this.currentSettings.dailyRewardRate),
      updatedAt: new Date().toISOString(),
      updatedBy: adminUsername || 'admin',
    };

    this.currentSettings = updated;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    this.notify();

    // 1. Persist to Supabase if available
    const sb = getSupabaseClient();
    if (sb) {
      try {
        await sb.from('system_settings').upsert({
          id: 'global_config',
          referral_percentage: updated.referralPercentage,
          min_withdraw_ugx: updated.minWithdrawUGX,
          min_deposit_ugx: updated.minDepositUGX || DEFAULT_SYSTEM_SETTINGS.minDepositUGX,
          withdrawal_fee_rate: updated.withdrawalFeeRate || DEFAULT_SYSTEM_SETTINGS.withdrawalFeeRate,
          welcome_bonus_ugx: updated.welcomeBonusUGX || DEFAULT_SYSTEM_SETTINGS.welcomeBonusUGX,
          daily_reward_rate: updated.dailyRewardRate || DEFAULT_SYSTEM_SETTINGS.dailyRewardRate,
          updated_at: updated.updatedAt,
          updated_by: updated.updatedBy,
        });
      } catch (e) {
        console.warn('Notice persisting to Supabase system_settings:', e);
      }
    }

    // 2. Persist to mock API server if running
    try {
      await apiClient.updateSystemSettings(updated);
    } catch (e) {
      console.warn('Notice persisting to API server settings:', e);
    }

    return { success: true, settings: updated };
  }
}

export const systemSettingsService = new SystemSettingsService();

