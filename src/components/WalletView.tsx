import React, { useState } from 'react';
import { Transaction, WalletState, UserProfile } from '../types';
import { ArrowDownLeft, ArrowUpRight, History, ShieldCheck, Clock, CheckCircle2, XCircle } from 'lucide-react';
import { WelcomeBonusCard } from './WelcomeBonusCard';

interface WalletViewProps {
  wallet: WalletState;
  transactions: Transaction[];
  user?: UserProfile | null;
  onRefresh?: () => Promise<void> | void;
  onOpenDeposit: () => void;
  onOpenWithdraw: () => void;
  onOpenWithdrawWelcomeBonus?: () => void;
}

export const WalletView: React.FC<WalletViewProps> = ({
  wallet,
  transactions,
  user = null,
  onRefresh,
  onOpenDeposit,
  onOpenWithdraw,
  onOpenWithdrawWelcomeBonus,
}) => {
  const [filterType, setFilterType] = useState<string>('all');

  const pendingCount = transactions.filter((t) => t.status === 'pending').length;
  const hasApprovedDeposit = transactions.some(
    (t) => t.type === 'deposit' && (t.status === 'completed' || t.status === 'approved')
  );

  const filteredTx = transactions.filter((t) => {
    if (filterType === 'all') return true;
    if (filterType === 'pending') return t.status === 'pending';
    return t.type === filterType;
  });

  const formattedUGX = new Intl.NumberFormat('en-US').format(wallet.totalBalanceUGX);

  return (
    <div className="px-5 py-3 space-y-4 pb-6">
      {/* Wallet Balance Hero */}
      <div className="bg-[#0F172A] rounded-2xl p-5 text-white shadow-lg border border-slate-800">
        <div className="flex items-center justify-between mb-1">
          <span className="text-[12px] text-slate-400 font-medium block">
            Consolidated Available UGX Balance
          </span>
          {pendingCount > 0 && (
            <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 bg-amber-500/20 text-amber-300 rounded-full border border-amber-500/30">
              <Clock className="w-3 h-3 animate-pulse" />
              {pendingCount} Pending Approval
            </span>
          )}
        </div>

        <div className="text-[24px] sm:text-[28px] font-extrabold font-mono tracking-tight text-white mb-1">
          UGX {formattedUGX}
        </div>
        <div className="text-[12px] text-emerald-400 flex items-center gap-1.5 mb-4 font-medium">
          <ShieldCheck className="w-4 h-4 text-emerald-400" />
          Verified Sovereign Mining Balance & Yield Vault
        </div>

        {/* Action buttons */}
        <div className="grid grid-cols-2 gap-2.5 pt-3 border-t border-slate-800">
          <button
            onClick={onOpenDeposit}
            className="bg-[#1657D9] hover:bg-blue-600 active:scale-95 text-white font-semibold text-[13.5px] py-2.5 rounded-xl transition-all flex items-center justify-center gap-1.5 shadow-md cursor-pointer"
          >
            <ArrowDownLeft className="w-4 h-4" />
            Deposit UGX
          </button>
          <button
            onClick={onOpenWithdraw}
            className="bg-slate-800 hover:bg-slate-700 active:scale-95 text-white border border-slate-700 font-semibold text-[13.5px] py-2.5 rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <ArrowUpRight className="w-4 h-4 text-emerald-400" />
            Withdraw UGX
          </button>
        </div>
      </div>

      {/* Welcome Bonus Card (State-aware: Locked before deposit, Ready after deposit, Claimed) */}
      <WelcomeBonusCard
        user={user}
        hasApprovedDeposit={hasApprovedDeposit}
        welcomeBonusClaimed={user?.welcomeBonusClaimed}
        onClaimSuccess={onRefresh}
        onOpenDeposit={onOpenDeposit}
        onOpenWithdraw={onOpenWithdrawWelcomeBonus || onOpenWithdraw}
      />

      {/* Transaction History & Approval Ledger */}
      <div>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
          <h4 className="text-[15px] font-bold text-slate-900 flex items-center gap-1.5">
            <History className="w-4 h-4 text-slate-500" /> Transaction History & Approvals
          </h4>
          <div className="flex flex-wrap gap-1">
            {[
              { id: 'all', label: 'All' },
              { id: 'pending', label: `Pending (${pendingCount})` },
              { id: 'deposit', label: 'Deposits' },
              { id: 'withdraw', label: 'Withdrawals' },
              { id: 'investment', label: 'Investments' },
              { id: 'reward', label: 'Rewards' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setFilterType(tab.id)}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition-all cursor-pointer ${
                  filterType === tab.id
                    ? 'bg-blue-600 text-white font-bold shadow-xs'
                    : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          {filteredTx.length === 0 ? (
            <div className="bg-white rounded-xl p-8 border border-slate-100 text-center text-slate-400">
              <History className="w-8 h-8 mx-auto mb-2 opacity-40" />
              <p className="text-[13px] font-medium">No transactions found in this category.</p>
            </div>
          ) : (
            filteredTx.map((tx) => {
              const isPending = tx.status === 'pending';
              const isApproved = tx.status === 'approved' || tx.status === 'completed';
              const isRejected = tx.status === 'rejected';

              return (
                <div
                  key={tx.id}
                  className={`bg-white rounded-xl p-3.5 border transition-all ${
                    isPending
                      ? 'border-amber-200 bg-amber-50/20 shadow-xs'
                      : isRejected
                      ? 'border-red-200 bg-red-50/20 opacity-80'
                      : 'border-slate-100 shadow-xs'
                  } flex flex-col sm:flex-row sm:items-center justify-between gap-2`}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                        tx.type === 'reward'
                          ? 'bg-emerald-100 text-emerald-600'
                          : tx.type === 'deposit'
                          ? 'bg-blue-100 text-blue-600'
                          : tx.type === 'investment'
                          ? 'bg-purple-100 text-purple-600'
                          : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      {tx.type === 'reward' ? (
                        <ArrowDownLeft className="w-4 h-4" />
                      ) : tx.type === 'deposit' ? (
                        <ArrowDownLeft className="w-4 h-4" />
                      ) : tx.type === 'investment' ? (
                        <ArrowUpRight className="w-4 h-4" />
                      ) : (
                        <ArrowUpRight className="w-4 h-4" />
                      )}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h5 className="text-[13px] font-bold text-slate-900 leading-tight">
                          {tx.description}
                        </h5>
                      </div>
                      <div className="flex items-center gap-2 mt-0.5 text-[11px] text-slate-400">
                        <span>{tx.date}</span>
                        {tx.paymentMethod && <span>• {tx.paymentMethod}</span>}
                        {tx.recipientInfo && <span>• {tx.recipientInfo}</span>}
                      </div>
                    </div>
                  </div>

                  <div className="flex sm:flex-col items-center sm:items-end justify-between shrink-0 gap-1 pl-12 sm:pl-0">
                    <span
                      className={`text-[13px] font-mono font-bold ${
                        tx.type === 'withdraw' || tx.type === 'investment'
                          ? 'text-slate-800'
                          : 'text-emerald-600'
                      }`}
                    >
                      {tx.type === 'withdraw' || tx.type === 'investment' ? '-' : '+'} UGX{' '}
                      {tx.amountUGX.toLocaleString()}
                    </span>

                    {/* Status Badge */}
                    {isPending && (
                      <span className="inline-flex items-center gap-1 text-[10.5px] font-bold px-2 py-0.5 bg-amber-100 text-amber-800 rounded-md border border-amber-200">
                        <Clock className="w-3 h-3 text-amber-600" />
                        Pending Admin Approval
                      </span>
                    )}

                    {isApproved && (
                      <span className="inline-flex items-center gap-1 text-[10.5px] font-bold px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded-md border border-emerald-200">
                        <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                        {tx.status === 'approved' ? 'Approved' : 'Completed'}
                      </span>
                    )}

                    {isRejected && (
                      <span className="inline-flex items-center gap-1 text-[10.5px] font-bold px-2 py-0.5 bg-rose-100 text-rose-800 rounded-md border border-rose-200">
                        <XCircle className="w-3 h-3 text-rose-600" />
                        Rejected by Admin
                      </span>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};

