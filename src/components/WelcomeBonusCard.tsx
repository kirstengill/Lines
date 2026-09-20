import React, { useState } from 'react';
import {
  Gift,
  CheckCircle2,
  Lock,
  ArrowRight,
  ArrowUpRight,
  RefreshCw,
  AlertCircle,
  ShieldCheck,
  Percent,
  Wallet
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { UserProfile } from '../types';
import { authService } from '../services/supabaseAuth';

interface WelcomeBonusCardProps {
  user: UserProfile | null;
  hasApprovedDeposit: boolean;
  welcomeBonusClaimed?: boolean;
  onClaimSuccess?: () => void | Promise<void>;
  onOpenDeposit?: () => void;
  onOpenWithdraw?: () => void;
  className?: string;
}

export const WelcomeBonusCard: React.FC<WelcomeBonusCardProps> = ({
  user,
  hasApprovedDeposit,
  welcomeBonusClaimed: propClaimed,
  onClaimSuccess,
  onOpenDeposit,
  onOpenWithdraw,
  className = '',
}) => {
  const isClaimed = propClaimed ?? user?.welcomeBonusClaimed ?? false;
  const [isClaiming, setIsClaiming] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [justClaimed, setJustClaimed] = useState(false);

  // If user has claimed the welcome bonus
  if (isClaimed || justClaimed) {
    return (
      <div
        className={`bg-[#101A14] rounded-2xl p-4 border border-emerald-500/30 shadow-2xs flex items-center justify-between gap-3 ${className}`}
      >
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0 border border-emerald-500/30 shadow-2xs">
            <CheckCircle2 className="w-5 h-5 text-emerald-400" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h4 className="text-[13.5px] font-extrabold text-white leading-tight">
                Welcome Bonus Unlocked
              </h4>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 uppercase tracking-wide">
                0% Fee Active
              </span>
            </div>
            <p className="text-[12px] text-slate-300 mt-0.5 leading-snug">
              UGX 4,000 welcome credit is active in your account.
            </p>
          </div>
        </div>

        {onOpenWithdraw ? (
          <button
            onClick={onOpenWithdraw}
            className="text-[12px] font-bold text-emerald-300 bg-emerald-500/20 hover:bg-emerald-500/30 px-3 py-1.5 rounded-xl border border-emerald-400/40 shadow-2xs flex items-center gap-1 cursor-pointer transition-all active:scale-95"
          >
            <span>Withdraw (0% Fee)</span>
            <ArrowUpRight className="w-3.5 h-3.5 text-emerald-400" />
          </button>
        ) : (
          <span className="text-[13px] font-black font-mono text-emerald-400 shrink-0 bg-[#0E1712] px-2.5 py-1 rounded-xl border border-emerald-500/30 shadow-2xs">
            +UGX 4,000
          </span>
        )}
      </div>
    );
  }

  // Handler for claiming the welcome bonus to wallet
  const handleClaim = async () => {
    if (isClaiming) return;
    setIsClaiming(true);
    setErrorMessage(null);

    try {
      const res = await authService.claimWelcomeBonus();

      if (res.success) {
        setJustClaimed(true);
        try {
          confetti({
            particleCount: 65,
            spread: 60,
            origin: { y: 0.6 },
          });
        } catch {}

        if (onClaimSuccess) {
          await onClaimSuccess();
        }
      } else {
        setErrorMessage(res.error || 'Failed to claim welcome bonus. Please try again.');
        if (onClaimSuccess) {
          await onClaimSuccess();
        }
      }
    } catch (err: any) {
      setErrorMessage(err?.message || 'A network error occurred while claiming.');
    } finally {
      setIsClaiming(false);
    }
  };

  // State 2: Deposit is approved & bonus is ready to withdraw at 0% fee or claim
  if (hasApprovedDeposit) {
    return (
      <div
        className={`relative overflow-hidden rounded-2xl bg-[#1A150A] p-4.5 text-white shadow-xl border border-amber-500/50 ${className}`}
      >
        <div className="relative z-10 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[10.5px] font-black uppercase tracking-wider bg-amber-500/20 text-amber-300 px-2.5 py-1 rounded-full border border-amber-400/40 flex items-center gap-1.5 backdrop-blur-xs">
              <Gift className="w-3.5 h-3.5 text-amber-400" />
              Welcome Bonus Ready
            </span>
            <span className="text-[11px] font-bold text-emerald-300 bg-emerald-500/20 px-2.5 py-0.5 rounded-full border border-emerald-400/30 flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              0% Transaction Fee
            </span>
          </div>

          <div>
            <h3 className="text-[16.5px] font-black tracking-tight text-amber-300 flex items-center gap-2">
              <span>Withdraw UGX 4,000 Welcome Bonus</span>
            </h3>
            <p className="text-[12.5px] text-slate-300 mt-1 leading-snug">
              Your deposit has been approved! You can now withdraw your UGX 4,000 Welcome Bonus at <strong className="text-amber-400 font-bold">0% transaction fee</strong>, or claim it to your wallet.
            </p>
          </div>

          {errorMessage && (
            <div className="p-2.5 rounded-xl bg-rose-500/20 border border-rose-400/40 text-rose-100 text-[12px] flex items-center gap-2 font-medium">
              <AlertCircle className="w-4 h-4 text-rose-300 shrink-0" />
              <span className="flex-1">{errorMessage}</span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
            {/* Direct 0% Fee Withdrawal Action */}
            {onOpenWithdraw && (
              <button
                id="btn-withdraw-welcome-bonus-zero-fee"
                onClick={onOpenWithdraw}
                className="py-2.5 px-4 bg-amber-500 hover:bg-amber-400 active:scale-[0.99] text-slate-950 font-black text-[13px] rounded-xl transition-all shadow-md shadow-amber-500/20 flex items-center justify-center gap-2 cursor-pointer"
              >
                <ArrowUpRight className="w-4 h-4 text-slate-950" />
                <span>Withdraw UGX 4,000</span>
                <span className="text-[10px] font-black bg-slate-950/20 text-slate-950 px-1.5 py-0.5 rounded">
                  0% FEE
                </span>
              </button>
            )}

            {/* Claim to Wallet Balance Action */}
            <button
              id="btn-claim-welcome-bonus"
              onClick={handleClaim}
              disabled={isClaiming}
              className={`py-2.5 px-4 ${onOpenWithdraw ? 'bg-[#131722] hover:bg-[#1C2230] text-amber-300 border border-amber-500/40' : 'w-full bg-amber-500 hover:bg-amber-400 text-slate-950 font-black'} font-bold text-[13px] rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-75`}
            >
              {isClaiming ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin text-current" />
                  <span>Claiming to Wallet...</span>
                </>
              ) : (
                <>
                  <Wallet className="w-4 h-4 text-current" />
                  <span>Claim to Wallet</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // State 1: Before an approved deposit (Locked for newly registered users)
  return (
    <div
      className={`bg-[#131722] border border-amber-500/25 rounded-2xl p-4 shadow-sm flex items-center justify-between gap-3.5 ${className}`}
    >
      <div className="flex items-start gap-3 min-w-0">
        <div className="w-10 h-10 rounded-xl bg-[#0D1017] text-amber-400 border border-amber-500/30 flex items-center justify-center shrink-0 mt-0.5 shadow-2xs">
          <Lock className="w-5 h-5 text-amber-400" />
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h4 className="text-[13.5px] font-extrabold text-white leading-tight">
              UGX 4,000 Welcome Bonus
            </h4>
            <span className="text-[10px] font-extrabold text-amber-400 bg-amber-500/15 border border-amber-500/30 px-2 py-0.5 rounded-full uppercase tracking-wide">
              Locked
            </span>
          </div>
          <p className="text-[12px] text-slate-300 mt-0.5 leading-snug">
            Your UGX 4,000 bonus is locked. Make and complete your first deposit to unlock <strong className="text-amber-300 font-semibold">0% fee withdrawal</strong> to your mobile money or bank account.
          </p>
        </div>
      </div>

      {onOpenDeposit && (
        <button
          id="btn-unlock-welcome-bonus-deposit"
          onClick={onOpenDeposit}
          className="shrink-0 px-3.5 py-2 bg-amber-500 hover:bg-amber-400 active:scale-95 text-slate-950 font-black text-[12.5px] rounded-xl transition-all shadow-md shadow-amber-500/20 flex items-center gap-1.5 cursor-pointer"
        >
          <span>Deposit to Unlock</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  );
};
