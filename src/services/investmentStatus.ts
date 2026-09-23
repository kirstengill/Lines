import { Machine } from '../types';

export function computeReturnStatus(input: {
  createdAt?: string | null;
  lockUntil?: string | null;
  dailyRewardUGX: number;
  totalMinedUGX: number;
  lastClaimedAt?: string | null;
}): {
  accruedRewardsUGX: number;
  unclaimedRewardsUGX: number;
  returnStatus: NonNullable<Machine['returnStatus']>;
} {
  const created = input.createdAt ? new Date(input.createdAt).getTime() : Date.now();
  const days = Math.max(0, Math.floor((Date.now() - created) / 86400000));
  const accruedRewardsUGX = Math.round(days * (input.dailyRewardUGX || 0));
  const unclaimedRewardsUGX = Math.max(0, accruedRewardsUGX - (input.totalMinedUGX || 0));
  const lockUntilMs = input.lockUntil ? new Date(input.lockUntil).getTime() : 0;
  const locked = Boolean(lockUntilMs && Date.now() < lockUntilMs);

  let returnStatus: NonNullable<Machine['returnStatus']> = 'accruing';
  if (locked) {
    returnStatus = 'locked';
  } else if (unclaimedRewardsUGX > 0) {
    returnStatus = 'claimable';
  } else if ((input.totalMinedUGX || 0) > 0 || input.lastClaimedAt) {
    returnStatus = 'claimed';
  }

  return { accruedRewardsUGX, unclaimedRewardsUGX, returnStatus };
}

export function mapUserMachineRow(m: any): Machine {
  const dailyRewardUGX = Number(m.daily_reward_ugx || m.dailyRewardUGX || 0);
  const totalMinedUGX = Number(m.total_mined_ugx || m.totalMinedUGX || 0);
  const createdAt = m.created_at || m.investedAt || m.invested_date;
  const lockUntil = m.lock_until || m.lockUntil;
  const lastClaimedAt = m.last_claimed_at || m.lastClaimedAt;
  const computed = computeReturnStatus({
    createdAt,
    lockUntil,
    dailyRewardUGX,
    totalMinedUGX,
    lastClaimedAt,
  });

  return {
    id: m.id || m.machine_id,
    title: m.title,
    subtitle: m.subtitle,
    category: m.category || 'Urban Delivery',
    image: m.image,
    dailyRewardUGX,
    status: m.status || 'Active',
    estYearlyROI: Number(m.est_yearly_roi || 0),
    minInvestUGX: Number(m.amount_invested_ugx || m.min_invest_ugx || m.minInvestUGX || 0),
    cyclePeriodDays: Number(m.lock_days || m.cyclePeriodDays || 0) || undefined,
    cyclePeriod: m.lock_days ? `${m.lock_days} days lock` : m.cyclePeriod,
    hashrate: m.hashrate,
    powerSource: m.power_source || m.powerSource,
    totalMinedUGX,
    unclaimedRewardsUGX: computed.returnStatus === 'locked' ? 0 : computed.unclaimedRewardsUGX,
    isBoosted: Boolean(m.is_boosted),
    lockDays: m.lock_days != null ? Number(m.lock_days) : undefined,
    lockUntil: lockUntil ? String(lockUntil) : undefined,
    investedAt: createdAt ? String(createdAt) : undefined,
    accruedRewardsUGX: computed.accruedRewardsUGX,
    lastClaimedAt: lastClaimedAt ? String(lastClaimedAt) : undefined,
    returnStatus: computed.returnStatus,
  };
}
