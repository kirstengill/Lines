import React from 'react';
import { Machine } from '../types';

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
  const formattedReward = new Intl.NumberFormat('en-US').format(machine.dailyRewardUGX);
  const formattedMinInvest = new Intl.NumberFormat('en-US').format(machine.minInvestUGX);

  const isOutline = buttonVariant === 'outline';

  return (
    <div className="bg-white rounded-2xl p-4 shadow-[0_4px_20px_-4px_rgba(15,23,42,0.06)] border border-slate-100 mb-3.5 transition-all hover:shadow-[0_8px_24px_-4px_rgba(15,23,42,0.1)]">
      {/* Top section: Image + Details */}
      <div className="flex items-center gap-3">
        {/* Hardware Render Thumbnail */}
        <div className="w-[110px] h-[105px] shrink-0 bg-slate-50 rounded-xl overflow-hidden flex items-center justify-center p-1 border border-slate-100">
          <img
            src={machine.image}
            alt={machine.title}
            referrerPolicy="no-referrer"
            className="w-full h-full object-contain mix-blend-multiply transition-transform duration-300 hover:scale-105"
          />
        </div>

        {/* Content & Metrics */}
        <div className="flex-1 min-w-0">
          <h3 className="text-[15px] font-bold text-[#0F172A] leading-tight tracking-tight truncate">
            {machine.title}
          </h3>
          {machine.subtitle && (
            <p className="text-[12px] font-normal text-slate-700 leading-snug mb-1 truncate">
              {machine.subtitle}
            </p>
          )}

          {/* Key Metrics Grid */}
          <div className="mt-1 space-y-1 text-[12px]">
            {/* Row 1: Reward & Status */}
            <div className="flex items-baseline justify-between">
              <div>
                <span className="text-[11px] text-slate-500 block">
                  {machine.subtitle ? 'Daily Mining Reward' : 'Daily Rewards'}
                </span>
                <span className="font-bold text-[#0F172A] text-[12.5px]">
                  UGX {formattedReward}
                </span>
              </div>
              <div className="text-right">
                <span className="text-[11px] text-slate-500 block">Status</span>
                <span className="font-bold text-[#16A34A] text-[12.5px]">
                  {machine.status}
                </span>
              </div>
            </div>

            {/* Row 2: ROI & Min Invest */}
            <div className="flex items-baseline justify-between pt-0.5">
              <div>
                <span className="text-[11px] text-slate-500 block">Est. Yearly ROI</span>
                <span className="font-bold text-[#0F172A] text-[12.5px]">
                  {machine.estYearlyROI}%
                </span>
              </div>
              <div className="text-right">
                <span className="text-[11px] text-slate-500 block">Minimum Invest</span>
                <span className="font-bold text-[#0F172A] text-[12.5px]">
                  UGX {formattedMinInvest}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Action Button */}
      <div className="mt-3">
        {isOutline ? (
          <button
            id={`btn-manage-${machine.id}`}
            onClick={() => onManage(machine)}
            className="w-full py-2 px-4 rounded-xl border border-[#1657D9] text-[#1657D9] hover:bg-blue-50/70 active:scale-98 font-semibold text-[13.5px] transition-all text-center"
          >
            Manage Investment
          </button>
        ) : (
          <button
            id={`btn-manage-${machine.id}`}
            onClick={() => onManage(machine)}
            className="w-full py-2 px-4 rounded-xl bg-[#1657D9] hover:bg-blue-700 active:scale-98 text-white font-semibold text-[13.5px] shadow-xs transition-all text-center"
          >
            Manage Investment
          </button>
        )}
      </div>
    </div>
  );
};
