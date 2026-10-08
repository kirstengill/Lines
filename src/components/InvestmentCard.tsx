import React, { useEffect, useState } from 'react';
import { Machine } from '../types';
import { ProjectImage } from './ProjectImage';
import { Bike, Truck, Car, Layers, ArrowRight, Clock } from 'lucide-react';
import { calculateDailyReturn, resolveInvestedAmount } from '../utils/investmentReturns';
import { computeReturnStatus, getRemainingLockDays } from '../services/investmentStatus';

interface InvestmentCardProps {
  machine: Machine;
  onManage: (machine: Machine) => void;
  buttonVariant?: 'outline' | 'solid';
}

export const InvestmentCard: React.FC<InvestmentCardProps> = ({
  machine,
  onManage,
  buttonVariant = 'solid',
}) => {
  const [now, setNow] = useState(Date.now);

  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(interval);
  }, []);

  // Quote the return for the stake behind this asset, so a product the user
  // funded above its minimum never advertises the flat base figure.
  const investedAmountUGX = resolveInvestedAmount(machine.amountInvestedUGX, machine.minInvestUGX);
  const dailyReturnUGX = calculateDailyReturn(
    machine.dailyRewardUGX,
    investedAmountUGX,
    machine.minInvestUGX
  );
  const formattedReward = new Intl.NumberFormat('en-US').format(dailyReturnUGX);
  const formattedMinInvest = new Intl.NumberFormat('en-US').format(machine.minInvestUGX);
  const cycleText = machine.cyclePeriod || `${machine.cyclePeriodDays || 60} days`;
  const remainingLockDays = getRemainingLockDays(machine.lockUntil, now);
  const accumulatedReturnUGX = computeReturnStatus({
    createdAt: machine.investedAt,
    lockUntil: machine.lockUntil,
    dailyRewardUGX: machine.dailyRewardUGX,
    totalMinedUGX: machine.totalMinedUGX || 0,
    lastClaimedAt: machine.lastClaimedAt,
    now,
  }).unclaimedRewardsUGX;

  const getVehicleIcon = (title: string) => {
    const lower = title.toLowerCase();
    if (lower.includes('bike') || lower.includes('motorcycle')) return <Bike className="w-4 h-4 text-amber-400" />;
    if (lower.includes('van') || lower.includes('passenger')) return <Car className="w-4 h-4 text-amber-400" />;
    if (lower.includes('fleet') || lower.includes('multi')) return <Layers className="w-4 h-4 text-amber-400" />;
    return <Truck className="w-4 h-4 text-amber-400" />;
  };

  const isOutline = buttonVariant === 'outline';

  return (
    <div className="bg-[#131722] rounded-2xl p-4 shadow-sm border border-amber-500/20 mb-3.5 transition-all hover:border-amber-400/50 hover:shadow-[0_4px_20px_-4px_rgba(245,158,11,0.18)]">
      {/* Top section: Image + Details */}
      <div className="flex items-center gap-3.5">
        {/* Vehicle Photo Thumbnail */}
        <div className="relative w-[110px] h-[105px] shrink-0 bg-[#0D1017] rounded-xl overflow-hidden flex items-center justify-center border border-amber-500/25">
          <ProjectImage
            src={machine.image}
            alt={machine.title}
            fallbackCategory={machine.category}
            className="w-full h-full object-cover transition-transform duration-300 hover:scale-105"
          />
          <div className="absolute bottom-1 left-1 p-1 rounded-md bg-[#131722]/90 backdrop-blur-xs border border-amber-500/30 shadow-xs">
            {getVehicleIcon(machine.title)}
          </div>
        </div>

        {/* Content & Metrics */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-1">
            <h3 className="text-sm sm:text-base font-extrabold text-white leading-tight tracking-tight truncate">
              {machine.title}
            </h3>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/15 text-amber-300 border border-amber-500/30 shrink-0">
              Earning
            </span>
          </div>

          <p className="text-xs text-amber-200/60 font-normal leading-snug mt-0.5 truncate">
            {machine.subtitle || 'Transport & Logistics Asset'}
          </p>

          {/* Key Metrics Grid */}
          <div className="mt-2 space-y-1 text-xs">
            <div className="flex items-baseline justify-between">
              <span className="text-slate-400">Daily Return</span>
              <span
                className="font-black text-amber-400 font-mono"
                title={`Base quote UGX ${new Intl.NumberFormat('en-US').format(
                  machine.dailyRewardUGX
                )}/day from a UGX ${formattedMinInvest} stake — scaled to this asset's stake.`}
              >
                +UGX {formattedReward}
                <span className="text-[10px] text-amber-200/50 font-bold">/day</span>
              </span>
            </div>

            <div className="flex items-baseline justify-between">
              <span className="text-slate-400">Cycle Period</span>
              <span className="font-semibold text-slate-300 flex items-center gap-1 font-mono">
                <Clock className="w-3 h-3 text-amber-400/70" />
                {cycleText}
              </span>
            </div>

            <div className="flex items-baseline justify-between">
              <span className="text-slate-400">Investment</span>
              <span className="font-black text-white font-mono">
                UGX {formattedMinInvest}
              </span>
            </div>

            {machine.lockUntil && (
              <div className="flex items-baseline justify-between">
                <span className="text-slate-400">Returns unlock</span>
                <span className={`font-semibold font-mono ${remainingLockDays > 0 ? 'text-amber-300' : 'text-emerald-400'}`}>
                  {remainingLockDays > 0
                    ? `${remainingLockDays} ${remainingLockDays === 1 ? 'day' : 'days'} remaining`
                    : 'Unlocked'}
                </span>
              </div>
            )}

            {machine.lockUntil && (
              <div className="flex items-baseline justify-between">
                <span className="text-slate-400">
                  {remainingLockDays > 0 ? 'Accumulated return' : 'Return to claim'}
                </span>
                <span className="font-semibold font-mono text-emerald-400">
                  UGX {accumulatedReturnUGX.toLocaleString()}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Action Button */}
      <div className="mt-3.5 pt-2.5 border-t border-amber-500/15 flex items-center gap-2">
        <button
          id={`btn-manage-${machine.id}`}
          onClick={() => onManage(machine)}
          className={`w-full py-2.5 px-4 rounded-xl text-xs font-black transition-all text-center flex items-center justify-center gap-1.5 cursor-pointer ${
            isOutline
              ? 'border border-amber-500/50 text-amber-300 hover:bg-amber-500/10 active:scale-98'
              : 'bg-amber-500 hover:bg-amber-400 active:scale-98 text-slate-950 shadow-md shadow-amber-500/20'
          }`}
        >
          <span>View Fleet Asset</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};
