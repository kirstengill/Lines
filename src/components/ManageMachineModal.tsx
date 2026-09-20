import React, { useState, useEffect } from 'react';
import { X, ShieldCheck, ArrowUpRight, RotateCw, Truck, Clock, Activity, CheckCircle2 } from 'lucide-react';
import confetti from 'canvas-confetti';
import { Machine } from '../types';
import { ProjectImage } from './ProjectImage';

interface ManageMachineModalProps {
  machine: Machine | null;
  onClose: () => void;
  onClaimReward: (machineId: string, amountUGX: number) => void;
  onToggleBoost: (machineId: string) => void;
  onToggleStatus: (machineId: string) => void;
}

export const ManageMachineModal: React.FC<ManageMachineModalProps> = ({
  machine,
  onClose,
  onClaimReward,
  onToggleBoost,
  onToggleStatus,
}) => {
  if (!machine) return null;

  const [liveReward, setLiveReward] = useState(machine.unclaimedRewardsUGX || 0);
  const [isClaiming, setIsClaiming] = useState(false);

  // Simulate real-time returns streaming for active transport operations
  useEffect(() => {
    if (machine.status !== 'Active') return;
    const interval = setInterval(() => {
      setLiveReward((prev) => prev + Math.floor(Math.random() * 45 + 15));
    }, 1500);
    return () => clearInterval(interval);
  }, [machine.status]);

  const handleClaim = () => {
    if (liveReward <= 0) return;
    setIsClaiming(true);
    confetti({
      particleCount: 80,
      spread: 60,
      origin: { y: 0.6 },
    });
    setTimeout(() => {
      onClaimReward(machine.id, liveReward);
      setLiveReward(0);
      setIsClaiming(false);
    }, 600);
  };

  const formattedReward = new Intl.NumberFormat('en-US').format(machine.dailyRewardUGX);
  const formattedUnclaimed = new Intl.NumberFormat('en-US').format(liveReward);
  const cycleText = machine.cyclePeriod || `${machine.cyclePeriodDays || 60} days`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white rounded-2xl w-full max-w-md max-h-[90vh] overflow-y-auto shadow-2xl border border-slate-200 flex flex-col animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between sticky top-0 bg-white/95 backdrop-blur-md z-10">
          <div>
            <span className="text-[11px] font-semibold tracking-wider text-[#0066FF] uppercase">
              Fleet Asset Console
            </span>
            <h3 className="text-base sm:text-lg font-black text-[#0B192C] leading-tight">
              {machine.title}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 sm:p-5 space-y-4">
          {/* Asset visual banner */}
          <div className="bg-slate-50 rounded-2xl p-3.5 border border-slate-200/80 flex items-center gap-3.5">
            <div className="w-20 h-20 bg-white rounded-xl border border-slate-200 shadow-xs shrink-0 flex items-center justify-center overflow-hidden">
              <ProjectImage
                src={machine.image}
                alt={machine.title}
                fallbackCategory={machine.category}
                className="w-full h-full object-cover"
              />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                  {machine.status === 'Active' ? 'In Operation' : machine.status}
                </span>
                <span className="text-[11px] font-semibold text-slate-500">
                  {cycleText}
                </span>
              </div>
              <p className="text-xs font-bold text-slate-900 mt-1 truncate">
                {machine.subtitle || 'Revenue-Generating Transport Asset'}
              </p>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Daily Return: <strong className="text-emerald-600 font-bold">+UGX {formattedReward}</strong>
              </p>
            </div>
          </div>

          {/* Unclaimed Yield Box */}
          <div className="bg-[#0B192C] rounded-2xl p-4 text-white">
            <div className="flex items-center justify-between text-slate-300 text-xs mb-1">
              <span>Accumulated Fleet Returns</span>
              <span className="flex items-center gap-1 text-emerald-400 text-[11px]">
                <RotateCw className="w-3 h-3 animate-spin" /> Live Accruing
              </span>
            </div>
            <div className="text-2xl font-black font-mono text-emerald-400 mb-3">
              UGX {formattedUnclaimed}
            </div>
            <button
              onClick={handleClaim}
              disabled={isClaiming || liveReward <= 0}
              className="w-full bg-[#0066FF] hover:bg-blue-600 active:scale-98 disabled:opacity-50 text-white font-bold text-xs py-2.5 rounded-xl transition-all flex items-center justify-center gap-2 shadow-xs cursor-pointer"
            >
              <ArrowUpRight className="w-4 h-4" />
              {isClaiming ? 'Transferring...' : 'Claim to Main Wallet'}
            </button>
          </div>

          {/* Telemetry Grid */}
          <div className="grid grid-cols-2 gap-2.5">
            <div className="bg-slate-50 rounded-xl p-3 border border-slate-200/80">
              <div className="flex items-center gap-1.5 text-slate-500 text-[11px] font-medium">
                <Truck className="w-3.5 h-3.5 text-[#0066FF]" /> Asset Category
              </div>
              <div className="text-xs font-bold text-slate-900 mt-1 truncate">
                {machine.category}
              </div>
            </div>

            <div className="bg-slate-50 rounded-xl p-3 border border-slate-200/80">
              <div className="flex items-center gap-1.5 text-slate-500 text-[11px] font-medium">
                <Activity className="w-3.5 h-3.5 text-emerald-600" /> Operational Uptime
              </div>
              <div className="text-xs font-bold text-slate-900 mt-1">
                99.9% Fleet Active
              </div>
            </div>

            <div className="bg-slate-50 rounded-xl p-3 border border-slate-200/80">
              <div className="flex items-center gap-1.5 text-slate-500 text-[11px] font-medium">
                <Clock className="w-3.5 h-3.5 text-indigo-500" /> Cycle Period
              </div>
              <div className="text-xs font-bold text-slate-900 mt-1">
                {cycleText}
              </div>
            </div>

            <div className="bg-slate-50 rounded-xl p-3 border border-slate-200/80">
              <div className="flex items-center gap-1.5 text-slate-500 text-[11px] font-medium">
                <ShieldCheck className="w-3.5 h-3.5 text-blue-600" /> Asset Protection
              </div>
              <div className="text-xs font-bold text-emerald-600 mt-1 flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" /> Fully Insured
              </div>
            </div>
          </div>

          {/* Status Controls */}
          <div className="border-t border-slate-100 pt-3">
            <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-200/80">
              <div>
                <span className="text-xs font-bold text-slate-900 block">
                  Fleet Operational Status
                </span>
                <span className="text-[11px] text-slate-500">
                  Currently {machine.status === 'Active' ? 'Active & Generating Revenue' : 'Paused'}
                </span>
              </div>
              <button
                onClick={() => onToggleStatus(machine.id)}
                className="px-3 py-1.5 bg-white border border-slate-200 hover:bg-slate-100 text-xs font-semibold text-slate-700 rounded-lg transition-colors cursor-pointer"
              >
                {machine.status === 'Active' ? 'Pause Unit' : 'Resume Unit'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

