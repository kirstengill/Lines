import React, { useState } from 'react';
import { X, Check, AlertCircle, ArrowUpRight, ShieldCheck, Zap, Wallet, Sparkles } from 'lucide-react';
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
  const estDailyYield = Math.round((amountUGX / machine.minInvestUGX) * machine.dailyRewardUGX);
  const estAnnualYield = Math.round((amountUGX * machine.estYearlyROI) / 100);

  const handleInvest = async () => {
    if (amountUGX < machine.minInvestUGX) {
      setErrorMessage(`Minimum investment for this hardware is UGX ${machine.minInvestUGX.toLocaleString()}`);
      return;
    }
    if (isInsufficient) {
      setErrorMessage('Insufficient consolidated wallet balance. Please top up your balance first.');
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
      setErrorMessage(e?.message || 'Failed to complete investment.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white rounded-3xl w-full max-w-md max-h-[90vh] overflow-y-auto shadow-2xl border border-slate-100 flex flex-col animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="p-5 border-b border-slate-100 flex items-center justify-between sticky top-0 bg-white/95 backdrop-blur-md z-10">
          <div>
            <span className="text-[11px] font-bold tracking-wider text-blue-600 uppercase">
              New Investment Order
            </span>
            <h3 className="text-[17px] font-extrabold text-[#0F172A] leading-tight">
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

        <div className="p-5 space-y-4">
          {/* Machine Header */}
          <div className="bg-slate-50 rounded-2xl p-3.5 border border-slate-100 flex items-center gap-3">
            <div className="w-16 h-16 bg-white rounded-xl p-1 border border-slate-200 shrink-0 flex items-center justify-center overflow-hidden">
              <ProjectImage
                src={machine.image}
                alt={machine.title}
                fallbackCategory={machine.category}
                className="w-full h-full object-contain mix-blend-multiply"
              />
            </div>
            <div className="flex-1 min-w-0">
              <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-blue-100 text-blue-800">
                {machine.category}
              </span>
              <p className="text-[13px] font-bold text-slate-900 mt-1 truncate">
                {machine.subtitle || machine.powerSource}
              </p>
              <p className="text-[11.5px] text-slate-500 font-mono">
                Telemetry Hash: {machine.hashrate}
              </p>
            </div>
          </div>

          {/* Amount Input */}
          <div>
            <div className="flex justify-between items-center mb-1">
              <label className="text-[12.5px] font-bold text-slate-800">
                Investment Amount (UGX)
              </label>
              <span className="text-[11px] text-slate-500">
                Min: UGX {machine.minInvestUGX.toLocaleString()}
              </span>
            </div>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 font-bold text-slate-400 text-[13px]">
                UGX
              </span>
              <input
                type="number"
                value={amountUGX || ''}
                min={machine.minInvestUGX}
                step={5000}
                onChange={(e) => setAmountUGX(Number(e.target.value))}
                className="w-full pl-14 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-[14px] font-bold font-mono text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:bg-white transition-all"
              />
            </div>
          </div>

          {/* Wallet Balance Status */}
          <div className="bg-slate-50 rounded-2xl p-3 border border-slate-100 flex items-center justify-between text-[12px]">
            <div className="flex items-center gap-2 text-slate-600">
              <Wallet className="w-4 h-4 text-blue-600" />
              <span>Available Wallet Balance:</span>
            </div>
            <span className={`font-mono font-bold ${isInsufficient ? 'text-rose-600' : 'text-slate-900'}`}>
              UGX {userBalanceUGX.toLocaleString()}
            </span>
          </div>

          {/* Financial Projection Breakdown */}
          <div className="bg-gradient-to-br from-[#0F172A] to-[#1E293B] rounded-2xl p-4 text-white space-y-2 text-[12px]">
            <div className="flex justify-between items-center text-slate-300">
              <span>Expected Daily Yield:</span>
              <span className="font-mono font-bold text-emerald-400 text-[13.5px]">
                + UGX {estDailyYield.toLocaleString()} / day
              </span>
            </div>
            <div className="flex justify-between items-center text-slate-300">
              <span>Estimated Yearly ROI:</span>
              <span className="font-mono font-bold text-sky-400">
                {machine.estYearlyROI}%
              </span>
            </div>
            <div className="flex justify-between items-center text-slate-300">
              <span>Projected 1-Yr Return:</span>
              <span className="font-mono font-bold text-amber-400">
                UGX {estAnnualYield.toLocaleString()}
              </span>
            </div>
            <div className="flex justify-between items-center text-slate-400 text-[11px] pt-1.5 border-t border-slate-700/60">
              <span>Node Contract Term:</span>
              <span className="font-medium text-slate-200">365 Days Continuous</span>
            </div>
          </div>

          {errorMessage && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-[12px] flex items-center gap-2">
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
                  className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[13px] rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-sm"
                >
                  <Wallet className="w-4 h-4" /> Top Up Balance to Continue (Deposit UGX)
                </button>
                <button
                  onClick={onClose}
                  className="w-full py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 font-semibold text-[12px] rounded-xl transition-all cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <button
                onClick={handleInvest}
                disabled={isSubmitting}
                className="w-full py-3 bg-[#1657D9] hover:bg-blue-700 active:scale-98 disabled:opacity-50 text-white font-bold text-[13.5px] rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer shadow-md"
              >
                <Check className="w-4 h-4" />
                {isSubmitting
                  ? 'Activating Mining Node...'
                  : `Confirm Investment (UGX ${amountUGX.toLocaleString()})`}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
