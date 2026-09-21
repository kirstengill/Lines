import React from 'react';
import { Machine } from '../types';
import { InvestmentCard } from './InvestmentCard';
import { Truck, Plus, ArrowRight, ShieldCheck, Clock } from 'lucide-react';

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
  // Only show active / owned fleet assets
  const activeMachines = machines.filter(
    (m) => m.status === 'Active' || m.status === 'Maintenance'
  );
  const totalDailyUGX = activeMachines.reduce((sum, m) => sum + m.dailyRewardUGX, 0);
  const totalInvestedUGX = activeMachines.reduce((sum, m) => sum + m.minInvestUGX, 0);

  return (
    <div className="px-3 sm:px-5 py-3 space-y-4 pb-12">
      {/* Overview Card */}
      <div className="bg-[#131722] rounded-2xl p-5 sm:p-6 text-white shadow-md relative overflow-hidden border border-amber-500/30">
        <div className="flex items-center justify-between text-slate-300 text-xs mb-2">
          <span className="font-bold uppercase tracking-wider text-amber-400">
            Active Fleet Portfolio
          </span>
          <span className="flex items-center gap-1 text-amber-300 font-bold text-xs bg-amber-500/15 px-2.5 py-1 rounded-full border border-amber-500/30">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse"></span>
            {activeMachines.length} Active {activeMachines.length === 1 ? 'Asset' : 'Assets'}
          </span>
        </div>

        <div className="text-2xl sm:text-3xl font-black text-amber-400 mb-1 font-mono">
          +UGX {totalDailyUGX.toLocaleString()}
          <span className="text-xs sm:text-sm font-normal text-amber-200/60 ml-1.5">/ day</span>
        </div>

        <div className="text-xs text-slate-400">
          Total Invested Capital: <span className="text-white font-bold font-mono">UGX {totalInvestedUGX.toLocaleString()}</span>
        </div>

        <div className="grid grid-cols-3 gap-2 mt-4 pt-3.5 border-t border-amber-500/20 text-center">
          <div className="bg-[#0D1017] rounded-xl p-2.5 border border-amber-500/20">
            <span className="text-[10px] text-amber-200/60 block font-semibold">Asset Status</span>
            <span className="text-xs sm:text-sm font-black text-emerald-400">100% Operational</span>
          </div>
          <div className="bg-[#0D1017] rounded-xl p-2.5 border border-amber-500/20">
            <span className="text-[10px] text-amber-200/60 block font-semibold">Network</span>
            <span className="text-xs sm:text-sm font-black text-amber-300">Fleet Operations</span>
          </div>
          <div className="bg-[#0D1017] rounded-xl p-2.5 border border-amber-500/20">
            <span className="text-[10px] text-amber-200/60 block font-semibold">Security</span>
            <span className="text-xs sm:text-sm font-black text-amber-400 flex items-center justify-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-amber-400" /> Insured
            </span>
          </div>
        </div>
      </div>

      {/* Active Investments List */}
      <div>
        <div className="flex items-center justify-between mb-3 px-1">
          <div>
            <h3 className="text-base font-extrabold text-amber-200/90 tracking-tight">
              Your Active Fleet Assets ({activeMachines.length})
            </h3>
            <p className="text-xs text-amber-200/60 mt-0.5">
              Working vehicles and transport units generating consistent revenue
            </p>
          </div>
          {onBrowseAvailable && (
            <button
              onClick={onBrowseAvailable}
              className="text-xs font-bold text-slate-950 bg-amber-500 hover:bg-amber-400 flex items-center gap-1 cursor-pointer px-3 py-1.5 rounded-xl shadow-xs transition-colors"
            >
              <Plus className="w-3.5 h-3.5" /> Add Asset
            </button>
          )}
        </div>

        {activeMachines.length === 0 ? (
          <div className="bg-[#131722] rounded-2xl p-8 border border-amber-500/20 text-center space-y-3 shadow-xs">
            <div className="w-14 h-14 rounded-2xl bg-amber-500/15 text-amber-400 flex items-center justify-center mx-auto border border-amber-500/30">
              <Truck className="w-7 h-7" />
            </div>
            <div>
              <h4 className="text-sm sm:text-base font-bold text-white">
                No Active Fleet Assets Yet
              </h4>
              <p className="text-xs text-amber-200/60 max-w-sm mx-auto mt-1 leading-relaxed">
                You haven't invested in any transport vehicles or logistics units yet. Browse the fleet marketplace to start earning daily returns in UGX.
              </p>
            </div>
            {onBrowseAvailable && (
              <button
                onClick={onBrowseAvailable}
                className="px-5 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-xl text-xs font-black shadow-md shadow-amber-500/20 transition-all cursor-pointer inline-flex items-center gap-1.5"
              >
                <span>Browse Fleet Marketplace</span>
                <ArrowRight className="w-3.5 h-3.5" />
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

