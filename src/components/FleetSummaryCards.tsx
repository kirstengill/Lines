import React from 'react';
import { Wallet, TrendingUp, Truck, ArrowDownCircle, ArrowUpCircle } from 'lucide-react';

interface FleetSummaryCardsProps {
  balanceUGX: number;
  totalInvestedUGX: number;
  dailyEarningsUGX: number;
  activeAssetsCount: number;
  onDeposit: () => void;
  onWithdraw: () => void;
}

export const FleetSummaryCards: React.FC<FleetSummaryCardsProps> = ({
  balanceUGX,
  totalInvestedUGX,
  dailyEarningsUGX,
  activeAssetsCount,
  onDeposit,
  onWithdraw,
}) => {
  return (
    <div className="px-3 sm:px-5 mb-5">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
        {/* CARD 1: WALLET BALANCE */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200/90 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Wallet Balance
              </span>
              <div className="w-8 h-8 rounded-xl bg-blue-50 text-[#0066FF] flex items-center justify-center">
                <Wallet className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-2">
              <span className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                UGX {balanceUGX.toLocaleString()}
              </span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2 mt-4 pt-3 border-t border-slate-100">
            <button
              id="btn-summary-deposit"
              onClick={onDeposit}
              className="flex-1 py-2 px-3 rounded-xl bg-[#0066FF] hover:bg-blue-600 active:scale-95 text-white font-bold text-xs shadow-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <ArrowDownCircle className="w-3.5 h-3.5" />
              <span>Deposit</span>
            </button>
            <button
              id="btn-summary-withdraw"
              onClick={onWithdraw}
              className="flex-1 py-2 px-3 rounded-xl bg-slate-100 hover:bg-slate-200/80 active:scale-95 text-slate-800 font-bold text-xs border border-slate-200 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <ArrowUpCircle className="w-3.5 h-3.5 text-slate-600" />
              <span>Withdraw</span>
            </button>
          </div>
        </div>

        {/* CARD 2: TOTAL INVESTMENTS */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200/90 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Total Investments
              </span>
              <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                <Truck className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-2">
              <span className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                UGX {totalInvestedUGX.toLocaleString()}
              </span>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span>Active Fleet Units</span>
            <span className="font-bold text-slate-900 px-2 py-0.5 rounded-full bg-slate-100">
              {activeAssetsCount} {activeAssetsCount === 1 ? 'Asset' : 'Assets'}
            </span>
          </div>
        </div>

        {/* CARD 3: DAILY EARNINGS */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200/90 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Daily Earnings
              </span>
              <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <TrendingUp className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-2">
              <span className="text-2xl sm:text-3xl font-black text-emerald-600 tracking-tight">
                +UGX {dailyEarningsUGX.toLocaleString()}
              </span>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span>Projected Returns</span>
            <span className="font-bold text-emerald-600 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Accruing Daily
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
