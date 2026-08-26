import React from 'react';

interface AnalyticsGridProps {
  dailyPnlUGX: number;
  activeMachinesCount: number;
}

export const AnalyticsGrid: React.FC<AnalyticsGridProps> = ({
  dailyPnlUGX,
  activeMachinesCount,
}) => {
  const formattedUGX = new Intl.NumberFormat('en-US').format(dailyPnlUGX);

  return (
    <section className="px-5 mb-4">
      <h2 className="text-[17px] font-bold text-[#0F172A] tracking-tight mb-2.5">
        Active Investments
      </h2>

      <div className="grid grid-cols-3 gap-2.5">
        {/* Card 1: Daily PnL */}
        <div className="bg-white rounded-2xl p-3 shadow-[0_2px_12px_-2px_rgba(15,23,42,0.05)] border border-slate-100 flex flex-col justify-between min-h-[82px]">
          <span className="text-[11.5px] font-medium text-slate-500 leading-tight">
            Daily Reward (UGX)
          </span>
          <div className="mt-1">
            <div className="text-[13px] font-bold text-[#16A34A] leading-tight tracking-tight">
              + UGX {formattedUGX}
            </div>
            <div className="text-[10px] font-semibold text-emerald-700 mt-0.5">
              Live Hash Payouts
            </div>
          </div>
        </div>

        {/* Card 2: Active Machines */}
        <div className="bg-white rounded-2xl p-3 shadow-[0_2px_12px_-2px_rgba(15,23,42,0.05)] border border-slate-100 flex flex-col justify-between min-h-[82px]">
          <span className="text-[11.5px] font-medium text-slate-500 leading-tight">
            Active Machines
          </span>
          <div className="text-[20px] font-extrabold text-[#0F172A] leading-none mt-2">
            {activeMachinesCount}
          </div>
        </div>

        {/* Card 3: Network Status */}
        <div className="bg-white rounded-2xl p-3 shadow-[0_2px_12px_-2px_rgba(15,23,42,0.05)] border border-slate-100 flex flex-col justify-between min-h-[82px]">
          <span className="text-[11.5px] font-medium text-slate-500 leading-tight">
            Network Status
          </span>
          <div className="text-[13px] font-bold text-[#0F172A] leading-tight mt-2 flex items-center gap-1">
            <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></span>
            <span className="text-emerald-700 font-bold">99.8% Online</span>
          </div>
        </div>
      </div>
    </section>
  );
};
