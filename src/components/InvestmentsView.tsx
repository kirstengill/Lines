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
      <div className="bg-[#0B192C] rounded-2xl p-5 sm:p-6 text-white shadow-md relative overflow-hidden border border-slate-800">
        <div className="flex items-center justify-between text-slate-300 text-xs mb-2">
          <span className="font-bold uppercase tracking-wider text-blue-400">
            Active Fleet Portfolio
          </span>
          <span className="flex items-center gap-1 text-emerald-400 font-bold text-xs bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-500/20">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
            {activeMachines.length} Active {activeMachines.length === 1 ? 'Asset' : 'Assets'}
          </span>
        </div>

        <div className="text-2xl sm:text-3xl font-black text-emerald-400 mb-1">
          +UGX {totalDailyUGX.toLocaleString()}
          <span className="text-xs sm:text-sm font-normal text-slate-400 ml-1.5">/ day</span>
        </div>

        <div className="text-xs text-slate-400">
          Total Invested Capital: <span className="text-white font-bold">UGX {totalInvestedUGX.toLocaleString()}</span>
        </div>

        <div className="grid grid-cols-3 gap-2 mt-4 pt-3.5 border-t border-slate-800 text-center">
          <div className="bg-white/5 rounded-xl p-2.5">
            <span className="text-[10px] text-slate-400 block font-semibold">Asset Status</span>
            <span className="text-xs sm:text-sm font-black text-emerald-400">100% Operational</span>
          </div>
          <div className="bg-white/5 rounded-xl p-2.5">
            <span className="text-[10px] text-slate-400 block font-semibold">Network</span>
            <span className="text-xs sm:text-sm font-black text-sky-400">Fleet Operations</span>
          </div>
          <div className="bg-white/5 rounded-xl p-2.5">
            <span className="text-[10px] text-slate-400 block font-semibold">Security</span>
            <span className="text-xs sm:text-sm font-black text-blue-400 flex items-center justify-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5" /> Insured
            </span>
          </div>
        </div>
      </div>

      {/* Active Investments List */}
      <div>
        <div className="flex items-center justify-between mb-3 px-1">
          <div>
            <h3 className="text-base font-extrabold text-[#0B192C]">
              Your Active Fleet Assets ({activeMachines.length})
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Working vehicles and transport units generating consistent revenue
            </p>
          </div>
          {onBrowseAvailable && (
            <button
              onClick={onBrowseAvailable}
              className="text-xs font-bold text-[#0066FF] hover:text-blue-700 flex items-center gap-1 cursor-pointer bg-blue-50 px-3 py-1.5 rounded-xl border border-blue-100"
            >
              <Plus className="w-3.5 h-3.5" /> Add Asset
            </button>
          )}
        </div>

        {activeMachines.length === 0 ? (
          <div className="bg-white rounded-2xl p-8 border border-slate-200/90 text-center space-y-3 shadow-xs">
            <div className="w-14 h-14 rounded-2xl bg-blue-50 text-[#0066FF] flex items-center justify-center mx-auto border border-blue-100">
              <Truck className="w-7 h-7" />
            </div>
            <div>
              <h4 className="text-sm sm:text-base font-bold text-slate-900">
                No Active Fleet Assets Yet
              </h4>
              <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1 leading-relaxed">
                You haven't invested in any transport vehicles or logistics units yet. Browse the fleet marketplace to start earning daily returns in UGX.
              </p>
            </div>
            {onBrowseAvailable && (
              <button
                onClick={onBrowseAvailable}
                className="px-5 py-2.5 bg-[#0066FF] hover:bg-blue-600 text-white rounded-xl text-xs font-bold shadow-xs transition-all cursor-pointer inline-flex items-center gap-1.5"
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

