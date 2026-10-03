import React, { useEffect, useState } from 'react';
import { Gift, CheckCircle2, ArrowRight, Sparkles, Wallet } from 'lucide-react';
import { UserProfile } from '../types';
import { systemSettingsService } from '../services/systemSettings';

interface WelcomeBonusCardProps {
  user: UserProfile | null;
  onOpenDeposit?: () => void;
  onOpenWithdraw?: () => void;
  className?: string;
}

export const WelcomeBonusCard: React.FC<WelcomeBonusCardProps> = ({
  user,
  onOpenDeposit,
  onOpenWithdraw,
  className = '',
}) => {
  const [bonusUGX, setBonusUGX] = useState<number>(() => systemSettingsService.getWelcomeBonusUGX());

  useEffect(() => {
    return systemSettingsService.subscribe((s) => setBonusUGX(Number(s.welcomeBonusUGX) || 0));
  }, []);

  const bonusLabel = `UGX ${bonusUGX.toLocaleString()}`;

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
              Welcome Bonus Credited
            </h4>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 uppercase tracking-wide flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-emerald-400" />
              Credited
            </span>
          </div>
          <p className="text-[12px] text-slate-300 mt-0.5 leading-snug">
            {user?.username ? `@${user.username}, your` : 'Your'} {bonusLabel} welcome bonus was
            added to your wallet at sign up.
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        {onOpenWithdraw && (
          <button
            onClick={onOpenWithdraw}
            className="text-[12px] font-bold text-emerald-300 bg-emerald-500/20 hover:bg-emerald-500/30 px-3 py-1.5 rounded-xl border border-emerald-400/40 shadow-2xs flex items-center gap-1 cursor-pointer transition-all active:scale-95"
          >
            <Wallet className="w-3.5 h-3.5 text-emerald-400" />
            <span>Withdraw</span>
          </button>
        )}
        {onOpenDeposit && (
          <button
            id="btn-unlock-welcome-bonus-deposit"
            onClick={onOpenDeposit}
            className="text-[12px] font-bold text-slate-950 bg-emerald-400 hover:bg-emerald-300 px-3 py-1.5 rounded-xl flex items-center gap-1 cursor-pointer transition-all active:scale-95 shadow-2xs"
          >
            <Gift className="w-3.5 h-3.5" />
            <span>Invest It</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    </div>
  );
};