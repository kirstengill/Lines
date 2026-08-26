import React, { useState } from 'react';
import { X, ArrowDownLeft, ArrowUpRight, Copy, Check, Smartphone, CreditCard, ShieldAlert } from 'lucide-react';
import confetti from 'canvas-confetti';

interface DepositWithdrawModalProps {
  mode: 'deposit' | 'withdraw';
  onClose: () => void;
  balanceUGX: number;
  onSuccess: (amountUGX: number, type: 'deposit' | 'withdraw', description: string, paymentMethod?: string, recipientInfo?: string) => void;
}

export const DepositWithdrawModal: React.FC<DepositWithdrawModalProps> = ({
  mode,
  onClose,
  balanceUGX,
  onSuccess,
}) => {
  const [activeTab, setActiveTab] = useState<'mtn' | 'airtel' | 'bank'>('mtn');
  const [amountUGXStr, setAmountUGXStr] = useState<string>('500000');
  const [recipient, setRecipient] = useState<string>('0772 123 456 (MTN MoMo)');
  const [copied, setCopied] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const numUGX = parseFloat(amountUGXStr) || 0;

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleAction = () => {
    setErrorMessage('');
    if (numUGX <= 0) {
      setErrorMessage('Please enter a valid amount in UGX.');
      return;
    }

    // REQUIREMENT 6: Insufficient Withdrawal Balance validation
    if (mode === 'withdraw' && numUGX > balanceUGX) {
      setErrorMessage(`Insufficient Balance: Requested withdrawal amount of UGX ${numUGX.toLocaleString()} exceeds your available balance of UGX ${balanceUGX.toLocaleString()}.`);
      return;
    }

    setIsProcessing(true);
    setTimeout(() => {
      setIsProcessing(false);
      confetti({ particleCount: 50, spread: 45 });
      const channelName =
        activeTab === 'mtn'
          ? 'MTN Mobile Money'
          : activeTab === 'airtel'
          ? 'Airtel Money Uganda'
          : 'Stanbic Bank EFT';
      const desc =
        mode === 'deposit'
          ? `${channelName} Deposit Request`
          : `Payout Request to ${recipient}`;
      
      onSuccess(numUGX, mode, desc, channelName, mode === 'withdraw' ? recipient : undefined);
      onClose();
    }, 600);
  };


  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white rounded-3xl w-full max-w-md max-h-[92vh] overflow-y-auto shadow-2xl border border-slate-100 flex flex-col animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="p-5 border-b border-slate-100 flex items-center justify-between sticky top-0 bg-white/95 backdrop-blur-md z-10">
          <div className="flex items-center gap-2">
            <div
              className={`w-8 h-8 rounded-xl flex items-center justify-center ${
                mode === 'deposit' ? 'bg-blue-100 text-blue-600' : 'bg-emerald-100 text-emerald-600'
              }`}
            >
              {mode === 'deposit' ? <ArrowDownLeft className="w-5 h-5" /> : <ArrowUpRight className="w-5 h-5" />}
            </div>
            <div>
              <h3 className="text-[17px] font-extrabold text-[#0F172A] leading-tight">
                {mode === 'deposit' ? 'Deposit UGX' : 'Withdraw UGX'}
              </h3>
              <p className="text-[11px] text-slate-500 font-mono">
                Available: UGX {balanceUGX.toLocaleString()}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-4">
          {/* Method Selector */}
          <div>
            <label className="text-[12px] font-semibold text-slate-600 mb-1.5 block">
              Uganda Sovereign Payment Channel
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => {
                  setActiveTab('mtn');
                  if (mode === 'withdraw') setRecipient('0772 123 456 (MTN MoMo)');
                }}
                className={`p-2.5 rounded-xl border text-center transition-all cursor-pointer ${
                  activeTab === 'mtn'
                    ? 'border-[#1657D9] bg-yellow-50 text-[#0F172A] font-bold shadow-xs'
                    : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                <Smartphone className="w-4 h-4 mx-auto mb-1 text-amber-500" />
                <span className="text-[11px] block font-bold">MTN MoMo</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setActiveTab('airtel');
                  if (mode === 'withdraw') setRecipient('0750 987 654 (Airtel Money)');
                }}
                className={`p-2.5 rounded-xl border text-center transition-all cursor-pointer ${
                  activeTab === 'airtel'
                    ? 'border-[#1657D9] bg-red-50 text-[#0F172A] font-bold shadow-xs'
                    : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                <Smartphone className="w-4 h-4 mx-auto mb-1 text-red-500" />
                <span className="text-[11px] block font-bold">Airtel Money</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setActiveTab('bank');
                  if (mode === 'withdraw') setRecipient('Stanbic Bank - 9030018829104');
                }}
                className={`p-2.5 rounded-xl border text-center transition-all cursor-pointer ${
                  activeTab === 'bank'
                    ? 'border-[#1657D9] bg-blue-50/70 text-[#1657D9] font-bold shadow-xs'
                    : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                <CreditCard className="w-4 h-4 mx-auto mb-1 text-blue-600" />
                <span className="text-[11px] block font-bold">Bank Transfer</span>
              </button>
            </div>
          </div>

          {/* Amount Inputs */}
          <div>
            <label className="text-[12px] font-semibold text-slate-600 mb-1.5 flex items-center justify-between">
              <span>Amount (UGX)</span>
              <span className="text-[11px] font-medium text-emerald-600 font-mono">
                UGX {numUGX.toLocaleString()}
              </span>
            </label>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-xs">UGX</span>
              <input
                type="number"
                value={amountUGXStr}
                onChange={(e) => setAmountUGXStr(e.target.value)}
                placeholder="500000"
                className="w-full pl-12 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-bold text-[16px] focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-600 font-mono"
              />
            </div>

            {/* Quick preset buttons */}
            <div className="flex gap-2 mt-2">
              {[100000, 500000, 2000000, 10000000].map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => setAmountUGXStr(preset.toString())}
                  className="flex-1 py-1 text-[10.5px] font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition-colors"
                >
                  +{preset >= 1000000 ? `${preset / 1000000}M` : `${preset / 1000}k`}
                </button>
              ))}
            </div>
          </div>

          {/* Details / Instructions for Deposit vs Withdraw */}
          {mode === 'deposit' ? (
            <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200/80 space-y-3">
              {activeTab === 'mtn' && (
                <div>
                  <span className="text-[11px] font-bold text-slate-700 block uppercase">
                    MTN UGANDA DIRECT MERCHANT PAY CODE
                  </span>
                  <div className="flex items-center justify-between bg-white p-2.5 rounded-xl border border-slate-200 mt-1">
                    <span className="font-mono font-bold text-slate-900 text-[14px]">
                      *165*3*991204#
                    </span>
                    <button
                      onClick={() => handleCopy('*165*3*991204#')}
                      className="text-xs font-semibold text-blue-600 flex items-center gap-1 hover:text-blue-800"
                    >
                      {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                      {copied ? 'Copied' : 'Copy'}
                    </button>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1.5">
                    Merchant Name: <span className="font-semibold text-slate-700">SUNRISE CAPITAL DS LTD</span>. Instant automated account credit in UGX.
                  </p>
                </div>
              )}

              {activeTab === 'airtel' && (
                <div>
                  <span className="text-[11px] font-bold text-slate-700 block uppercase">
                    AIRTEL MONEY UGANDA MERCHANT CODE
                  </span>
                  <div className="flex items-center justify-between bg-white p-2.5 rounded-xl border border-slate-200 mt-1">
                    <span className="font-mono font-bold text-slate-900 text-[14px]">
                      *185*9*991204#
                    </span>
                    <button
                      onClick={() => handleCopy('*185*9*991204#')}
                      className="text-xs font-semibold text-blue-600 flex items-center gap-1 hover:text-blue-800"
                    >
                      {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                      {copied ? 'Copied' : 'Copy'}
                    </button>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1.5">
                    Merchant Code: <span className="font-semibold text-slate-700">991204</span> (Sunrise Capital DS). Instant UGX credit.
                  </p>
                </div>
              )}

              {activeTab === 'bank' && (
                <div className="text-[12px] text-slate-700 space-y-1">
                  <p className="font-bold text-slate-900">Stanbic Bank Uganda Limited</p>
                  <p className="text-slate-600 font-mono text-[11.5px]">Account: 9030018829104</p>
                  <p className="text-slate-600 font-mono text-[11.5px]">Account Name: Sunrise Capital DS Uganda Ltd</p>
                  <p className="text-slate-500 text-[11px]">Branch: Forest Mall Lugogo, Kampala</p>
                </div>
              )}

              {/* Requirement 1: Deposit Approval Notice */}
              <div className="bg-amber-50 rounded-xl p-3 border border-amber-200 flex items-start gap-2">
                <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <p className="text-[11px] text-amber-800 leading-snug">
                  <span className="font-bold">Approval System:</span> Deposit requests are submitted as <span className="font-semibold underline">Pending</span> and credited to your wallet balance after administrator review and verification.
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <div>
                <label className="text-[12px] font-semibold text-slate-600 mb-1.5 block">
                  Withdrawal Destination (Mobile Number / Bank Acct)
                </label>
                <input
                  type="text"
                  value={recipient}
                  onChange={(e) => setRecipient(e.target.value)}
                  placeholder="e.g. 0772 123 456 or Stanbic Acct"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-[13.5px] focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-600"
                />
              </div>

              {/* Requirement 2: Withdrawal Approval Notice */}
              <div className="bg-amber-50 rounded-xl p-3 border border-amber-200 flex items-start gap-2">
                <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <p className="text-[11px] text-amber-800 leading-snug">
                  <span className="font-bold">Approval Process:</span> Withdrawal requests are placed in <span className="font-semibold underline">Pending</span> status and deducted/dispatched to your account upon administrator authorization.
                </p>
              </div>
            </div>
          )}

          {errorMessage && (
            <div className="p-2.5 bg-red-50 text-red-700 text-[12px] rounded-xl font-medium border border-red-200">
              {errorMessage}
            </div>
          )}

          {/* Action Button */}
          <button
            onClick={handleAction}
            disabled={isProcessing}
            className={`w-full py-3 rounded-xl font-bold text-[14px] text-white shadow-md active:scale-98 transition-all cursor-pointer ${
              mode === 'deposit' ? 'bg-[#1657D9] hover:bg-blue-700' : 'bg-emerald-600 hover:bg-emerald-700'
            }`}
          >
            {isProcessing
              ? 'Processing Transaction...'
              : mode === 'deposit'
              ? `Confirm Deposit of UGX ${numUGX.toLocaleString()}`
              : `Submit Withdrawal of UGX ${numUGX.toLocaleString()}`}
          </button>
        </div>
      </div>
    </div>
  );
};
