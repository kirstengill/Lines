import React from 'react';
import { Landmark, ArrowDownLeft, ArrowUpRight } from 'lucide-react';

interface ConsolidatedWalletCardProps {
  balanceUGX: number;
  onDeposit: () => void;
  onWithdraw: () => void;
}

export const ConsolidatedWalletCard: React.FC<ConsolidatedWalletCardProps> = ({
  balanceUGX,
  onDeposit,
  onWithdraw,
}) => {
  const formattedBalance = new Intl.NumberFormat('en-US').format(balanceUGX);

  return (
    <section className="px-5 mt-2 mb-4">
      <div className="flex items-center justify-between mb-2.5">
        <h2 className="text-[17px] font-extrabold text-amber-200/90 tracking-tight flex items-center gap-2">
          <span className="w-6 h-6 rounded-lg bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400">
            <Landmark className="w-3.5 h-3.5" />
          </span>
          Fleet Treasury
        </h2>
        <span className="text-[11px] font-bold text-amber-400/90 bg-amber-500/10 px-2.5 py-0.5 rounded-full border border-amber-500/25">
          UGX Sovereign Reserve
        </span>
      </div>

      <div className="bg-[#131722] rounded-2xl p-5 shadow-[0_4px_24px_-4px_rgba(245,158,11,0.12)] border border-amber-500/30 flex items-center justify-between">
        {/* Balance Display */}
        <div className="flex flex-col">
          <span className="text-[12.5px] font-semibold text-amber-200/60 tracking-normal mb-1">
            Total Capital Reserve (UGX)
          </span>
          <span className="text-[22px] sm:text-[24px] font-black text-amber-400 tracking-tight leading-none font-mono">
            UGX {formattedBalance}
          </span>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2.5">
          <button
            id="btn-deposit-main"
            onClick={onDeposit}
            className="bg-amber-500 hover:bg-amber-400 active:scale-95 text-slate-950 font-black text-[13.5px] px-4 py-2 rounded-xl transition-all shadow-md shadow-amber-500/20 flex items-center gap-1.5 cursor-pointer"
          >
            <ArrowDownLeft className="w-4 h-4 text-slate-950" />
            Deposit
          </button>
          <button
            id="btn-withdraw-main"
            onClick={onWithdraw}
            className="bg-[#1C2230] hover:bg-[#252D40] active:scale-95 text-amber-300 border border-amber-500/40 font-bold text-[13.5px] px-4 py-2 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <ArrowUpRight className="w-4 h-4 text-amber-400" />
            Withdraw
          </button>
        </div>
      </div>
    </section>
  );
};

