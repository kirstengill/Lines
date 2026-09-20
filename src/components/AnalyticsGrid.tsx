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
      <h2 className="text-[17px] font-extrabold text-amber-200/90 tracking-tight mb-2.5">
        Active Investments
      </h2>

      <div className="grid grid-cols-3 gap-2.5">
        {/* Card 1: Daily PnL */}
        <div className="bg-[#131722] rounded-2xl p-3 shadow-sm border border-amber-500/20 flex flex-col justify-between min-h-[82px]">
          <span className="text-[11.5px] font-medium text-amber-200/60 leading-tight">
            Daily Return (UGX)
          </span>
          <div className="mt-1">
            <div className="text-[13px] font-black text-amber-400 leading-tight tracking-tight font-mono">
              + UGX {formattedUGX}
            </div>
            <div className="text-[10px] font-semibold text-emerald-400 mt-0.5">
              Live Fleet Returns
            </div>
          </div>
        </div>

        {/* Card 2: Active Machines */}
        <div className="bg-[#131722] rounded-2xl p-3 shadow-sm border border-amber-500/20 flex flex-col justify-between min-h-[82px]">
          <span className="text-[11.5px] font-medium text-amber-200/60 leading-tight">
            Active Fleet Units
          </span>
          <div className="text-[20px] font-black text-white leading-none mt-2 font-mono">
            {activeMachinesCount}
          </div>
        </div>

        {/* Card 3: Network Status */}
        <div className="bg-[#131722] rounded-2xl p-3 shadow-sm border border-amber-500/20 flex flex-col justify-between min-h-[82px]">
          <span className="text-[11.5px] font-medium text-amber-200/60 leading-tight">
            Fleet Status
          </span>
          <div className="text-[12.5px] font-bold text-white leading-tight mt-2 flex items-center gap-1">
            <span className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse"></span>
            <span className="text-emerald-400 font-bold text-[11.5px]">99.8% Active</span>
          </div>
        </div>
      </div>
    </section>
  );
};
