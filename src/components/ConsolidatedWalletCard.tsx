import React from 'react';

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
      <h2 className="text-[17px] font-bold text-[#0F172A] tracking-tight mb-2.5">
        Consolidated Dashboard
      </h2>

      <div className="bg-white rounded-2xl p-5 shadow-[0_4px_20px_-4px_rgba(15,23,42,0.06)] border border-slate-100 flex items-center justify-between">
        {/* Balance Display */}
        <div className="flex flex-col">
          <span className="text-[13px] font-medium text-slate-500 tracking-normal mb-1">
            Total Balance (UGX)
          </span>
          <span className="text-[22px] sm:text-[24px] font-extrabold text-[#0F172A] tracking-tight leading-none font-mono">
            UGX {formattedBalance}
          </span>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2.5">
          <button
            id="btn-deposit-main"
            onClick={onDeposit}
            className="bg-[#1657D9] hover:bg-blue-700 active:scale-95 text-white font-semibold text-[14px] px-4 py-2 rounded-xl transition-all shadow-xs"
          >
            Deposit
          </button>
          <button
            id="btn-withdraw-main"
            onClick={onWithdraw}
            className="bg-white hover:bg-slate-50 active:scale-95 text-[#1657D9] border border-[#1657D9] font-semibold text-[14px] px-4 py-2 rounded-xl transition-all"
          >
            Withdraw
          </button>
        </div>
      </div>
    </section>
  );
};
