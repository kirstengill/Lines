import React, { useState } from 'react';
import { X, Check, AlertCircle, ShieldCheck, Wallet, Clock, Truck } from 'lucide-react';
import confetti from 'canvas-confetti';
import { Machine } from '../types';
import { ProjectImage } from './ProjectImage';

interface InvestmentPurchaseModalProps {
  machine: Machine | null;
  userBalanceUGX: number;
  onClose: () => void;
  onConfirmInvest: (machine: Machine, amountUGX: number) => Promise<boolean>;
  onOpenDeposit: () => void;
}

export const InvestmentPurchaseModal: React.FC<InvestmentPurchaseModalProps> = ({
  machine,
  userBalanceUGX,
  onClose,
  onConfirmInvest,
  onOpenDeposit,
}) => {
  if (!machine) return null;

  const [amountUGX, setAmountUGX] = useState<number>(machine.minInvestUGX);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const isInsufficient = userBalanceUGX < amountUGX;
  const cycleDays = machine.cyclePeriodDays || 60;
  const cycleText = machine.cyclePeriod || `${cycleDays} days`;
  const estDailyYield = Math.round((amountUGX / machine.minInvestUGX) * machine.dailyRewardUGX);
  const estTotalReturn = estDailyYield * cycleDays;

  const handleInvest = async () => {
    if (amountUGX < machine.minInvestUGX) {
      setErrorMessage(`Starting investment for this vehicle is UGX ${machine.minInvestUGX.toLocaleString()}`);
      return;
    }
    if (isInsufficient) {
      setErrorMessage('Insufficient wallet balance. Please deposit funds first.');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const success = await onConfirmInvest(machine, amountUGX);
      if (success) {
        confetti({ particleCount: 75, spread: 60, origin: { y: 0.6 } });
        onClose();
      }
    } catch (e: any) {
      setErrorMessage(e?.message || 'Failed to complete fleet investment.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white rounded-2xl w-full max-w-md max-h-[90vh] overflow-y-auto shadow-2xl border border-slate-200 flex flex-col animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between sticky top-0 bg-white/95 backdrop-blur-md z-10">
          <div>
            <span className="text-[11px] font-bold tracking-wider text-[#0066FF] uppercase">
              Fleet Asset Investment
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

        <div className="p-4 sm:p-5 space-y-4">
          {/* Machine Header */}
          <div className="bg-slate-50 rounded-2xl p-3 border border-slate-200/80 flex items-center gap-3">
            <div className="w-16 h-16 bg-white rounded-xl border border-slate-200 shrink-0 flex items-center justify-center overflow-hidden">
              <ProjectImage
                src={machine.image}
                alt={machine.title}
                fallbackCategory={machine.category}
                className="w-full h-full object-cover"
              />
            </div>
            <div className="flex-1 min-w-0">
              <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-blue-50 text-[#0066FF] border border-blue-100">
                {machine.category}
              </span>
              <p className="text-xs font-bold text-slate-900 mt-1 truncate">
                {machine.subtitle || 'Revenue-Generating Transport Asset'}
              </p>
              <p className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5">
                <Clock className="w-3 h-3 text-slate-400" /> Cycle: {cycleText}
              </p>
            </div>
          </div>

          {/* Amount Input */}
          <div>
            <div className="flex justify-between items-center mb-1">
              <label className="text-xs font-bold text-slate-800">
                Investment Amount (UGX)
              </label>
              <span className="text-[11px] text-slate-500">
                Starting: UGX {machine.minInvestUGX.toLocaleString()}
              </span>
            </div>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 font-bold text-slate-400 text-xs">
                UGX
              </span>
              <input
                type="number"
                value={amountUGX || ''}
                min={machine.minInvestUGX}
                step={5000}
                onChange={(e) => setAmountUGX(Number(e.target.value))}
                className="w-full pl-14 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold font-mono text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:bg-white transition-all"
              />
            </div>
          </div>

          {/* Wallet Balance Status */}
          <div className="bg-slate-50 rounded-xl p-3 border border-slate-200/80 flex items-center justify-between text-xs">
            <div className="flex items-center gap-2 text-slate-600">
              <Wallet className="w-4 h-4 text-[#0066FF]" />
              <span>Available Wallet Balance:</span>
            </div>
            <span className={`font-mono font-bold ${isInsufficient ? 'text-rose-600' : 'text-slate-900'}`}>
              UGX {userBalanceUGX.toLocaleString()}
            </span>
          </div>

          {/* Financial Projection Breakdown */}
          <div className="bg-[#0B192C] rounded-xl p-4 text-white space-y-2 text-xs">
            <div className="flex justify-between items-center text-slate-300">
              <span>Expected Daily Return:</span>
              <span className="font-mono font-bold text-emerald-400 text-sm">
                +UGX {estDailyYield.toLocaleString()} / day
              </span>
            </div>
            <div className="flex justify-between items-center text-slate-300">
              <span>Cycle Period:</span>
              <span className="font-bold text-sky-400">
                {cycleText}
              </span>
            </div>
            <div className="flex justify-between items-center text-slate-300">
              <span>Projected Cycle Earnings:</span>
              <span className="font-mono font-bold text-amber-400">
                UGX {estTotalReturn.toLocaleString()}
              </span>
            </div>
            <div className="flex justify-between items-center text-slate-400 text-[11px] pt-2 border-t border-slate-800">
              <span>Security & Assurance:</span>
              <span className="font-medium text-slate-200 flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5 text-blue-400" /> Insured Asset
              </span>
            </div>
          </div>

          {errorMessage && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Action Buttons */}
          <div className="space-y-2 pt-1">
            {isInsufficient ? (
              <div className="space-y-2">
                <button
                  onClick={() => {
                    onClose();
                    onOpenDeposit();
                  }}
                  className="w-full py-3 bg-[#0066FF] hover:bg-blue-600 text-white font-bold text-xs rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
                >
                  <Wallet className="w-4 h-4" /> Deposit UGX to Continue
                </button>
                <button
                  onClick={onClose}
                  className="w-full py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 font-semibold text-xs rounded-xl transition-all cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <button
                onClick={handleInvest}
                disabled={isSubmitting}
                className="w-full py-3 bg-[#0066FF] hover:bg-blue-600 active:scale-98 disabled:opacity-50 text-white font-bold text-xs rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer shadow-xs"
              >
                <Check className="w-4 h-4" />
                {isSubmitting
                  ? 'Deploying Fleet Unit...'
                  : `Confirm Investment (UGX ${amountUGX.toLocaleString()})`}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

