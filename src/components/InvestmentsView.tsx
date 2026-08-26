import React from 'react';
import { Machine } from '../types';
import { InvestmentCard } from './InvestmentCard';
import { Zap, Activity, Cpu, ArrowUpRight, Plus, Sparkles, Server, Clock, CheckCircle } from 'lucide-react';

interface InvestmentsViewProps {
  machines: Machine[];
  onManageMachine: (m: Machine) => void;
  onBrowseAvailable?: () => void;
}

export const InvestmentsView: React.FC<InvestmentsViewProps> = ({
  machines,
  onManageMachine,
  onBrowseAvailable,
}) => {
  // Only show active / owned machines
  const activeMachines = machines.filter(
    (m) => m.status === 'Active' || m.status === 'Maintenance'
  );
  const totalDailyUGX = activeMachines.reduce((sum, m) => sum + m.dailyRewardUGX, 0);
  const totalInvestedUGX = activeMachines.reduce((sum, m) => sum + m.minInvestUGX, 0);
  const totalUnclaimedUGX = activeMachines.reduce((sum, m) => sum + (m.unclaimedRewardsUGX || 0), 0);

  return (
    <div className="px-5 py-3 space-y-4 pb-8">
      {/* Overview Card */}
      <div className="bg-gradient-to-br from-[#0F172A] via-[#1E293B] to-[#0F172A] rounded-3xl p-5 text-white shadow-md relative overflow-hidden">
        <div className="flex items-center justify-between text-slate-300 text-[12px] mb-1">
          <span className="font-semibold uppercase tracking-wider text-[11px] text-blue-400">
            Active Investment Portfolio
          </span>
          <span className="flex items-center gap-1 text-emerald-400 font-semibold text-[11.5px] bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
            {activeMachines.length} Active Nodes
          </span>
        </div>
        <div className="text-[26px] font-black font-mono text-emerald-400 mb-0.5">
          + UGX {totalDailyUGX.toLocaleString()}
          <span className="text-[13px] font-normal text-slate-400 ml-1">/ day</span>
        </div>
        <div className="text-[12px] text-slate-400">
          Total Invested Capital: <span className="text-white font-mono font-bold">UGX {totalInvestedUGX.toLocaleString()}</span>
        </div>

        <div className="grid grid-cols-3 gap-2 mt-4 pt-3 border-t border-slate-700/60 text-center">
          <div className="bg-white/5 rounded-xl p-2">
            <span className="text-[10px] text-slate-400 block font-medium">Avg ROI</span>
            <span className="text-[13px] font-black text-white">128.3%</span>
          </div>
          <div className="bg-white/5 rounded-xl p-2">
            <span className="text-[10px] text-slate-400 block font-medium">Fleet Hash</span>
            <span className="text-[13px] font-black text-sky-400 font-mono">383.0 TH/s</span>
          </div>
          <div className="bg-white/5 rounded-xl p-2">
            <span className="text-[10px] text-slate-400 block font-medium">Uptime</span>
            <span className="text-[13px] font-black text-emerald-400 font-mono">99.92%</span>
          </div>
        </div>
      </div>

      {/* Active Investments List */}
      <div>
        <div className="flex items-center justify-between mb-3 px-1">
          <div>
            <h3 className="text-[16px] font-bold text-[#0F172A]">
              Your Active Nodes ({activeMachines.length})
            </h3>
            <p className="text-[11.5px] text-slate-500">
              Hardware units deployed and generating continuous yield
            </p>
          </div>
          {onBrowseAvailable && (
            <button
              onClick={onBrowseAvailable}
              className="text-[11.5px] font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1 cursor-pointer bg-blue-50 px-2.5 py-1 rounded-lg border border-blue-100"
            >
              <Plus className="w-3.5 h-3.5" /> New Node
            </button>
          )}
        </div>

        {activeMachines.length === 0 ? (
          <div className="bg-white rounded-3xl p-8 border border-slate-100 text-center space-y-3 shadow-xs">
            <div className="w-14 h-14 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mx-auto border border-blue-100">
              <Server className="w-7 h-7" />
            </div>
            <div>
              <h4 className="text-[15px] font-bold text-slate-900">
                No Active Investments Yet
              </h4>
              <p className="text-[12.5px] text-slate-500 max-w-xs mx-auto mt-1 leading-relaxed">
                You haven't activated any mining nodes or clean energy investments yet. Browse available opportunities to start earning daily yield in UGX.
              </p>
            </div>
            {onBrowseAvailable && (
              <button
                onClick={onBrowseAvailable}
                className="px-5 py-2.5 bg-[#1657D9] hover:bg-blue-700 text-white rounded-xl text-[13px] font-bold shadow-sm transition-all cursor-pointer inline-flex items-center gap-1.5"
              >
                <Sparkles className="w-4 h-4" /> Explore Available Investments
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {activeMachines.map((mach, index) => (
              <InvestmentCard
                key={mach.id}
                machine={mach}
                onManage={onManageMachine}
                buttonVariant={index % 2 === 0 ? 'outline' : 'solid'}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
