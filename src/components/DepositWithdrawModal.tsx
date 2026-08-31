import React, { useState } from 'react';
import {
  X,
  ArrowDownLeft,
  ArrowUpRight,
  Copy,
  Check,
  Smartphone,
  CreditCard,
  ShieldAlert,
  UserCheck,
  PhoneCall,
  CheckCircle2
} from 'lucide-react';
import confetti from 'canvas-confetti';

// Withdrawal rules
const MIN_WITHDRAWAL_UGX = 4000;
const WITHDRAWAL_FEE_RATE = 0.15; // 15% transaction fee

// Deposit receiving line details
const DEPOSIT_PHONE = '0766495353';
const RECIPIENT_NAME = 'ELIX OWOMUZINYA';

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
  const [amountUGXStr, setAmountUGXStr] = useState<string>('50000');
  const [recipient, setRecipient] = useState<string>('0772 123 456 (MTN MoMo)');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const numUGX = parseFloat(amountUGXStr) || 0;

  // Withdrawal fee breakdown: 15% is deducted from the requested amount.
  const withdrawalFeeUGX = mode === 'withdraw' ? Math.round(numUGX * WITHDRAWAL_FEE_RATE) : 0;
  const netWithdrawalUGX = mode === 'withdraw' ? numUGX - withdrawalFeeUGX : numUGX;

  const depositUssd =
    activeTab === 'airtel'
      ? `*185*1*1*${DEPOSIT_PHONE}*${numUGX || 'AMOUNT'}#`
      : `*165*1*1*${DEPOSIT_PHONE}*${numUGX || 'AMOUNT'}#`;

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleAction = () => {
    setErrorMessage('');
    if (numUGX <= 0) {
      setErrorMessage('Please enter a valid amount in UGX.');
      return;
    }

    // REQUIREMENT 6: Minimum withdrawal amount
    if (mode === 'withdraw' && numUGX < MIN_WITHDRAWAL_UGX) {
      setErrorMessage(`Minimum Withdrawal: The minimum withdrawal amount is UGX ${MIN_WITHDRAWAL_UGX.toLocaleString()}.`);
      return;
    }

    // REQUIREMENT 6: Insufficient Withdrawal Balance validation (total incl. 15% fee)
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
          ? `${channelName} Deposit (to ${RECIPIENT_NAME})`
          : `Payout Request to ${recipient}`;

      onSuccess(netWithdrawalUGX, mode, desc, channelName, mode === 'withdraw' ? recipient : `${RECIPIENT_NAME} (${DEPOSIT_PHONE})`);
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
              className={`w-8 h-8 rounded-xl flex items-center justify-center ${mode === 'deposit' ? 'bg-blue-100 text-blue-600' : 'bg-emerald-100 text-emerald-600'
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
            className="p-1.5 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-4">
          {/* Method Selector */}
          <div>
            <label className="text-[12px] font-semibold text-slate-600 mb-1.5 block">
              {mode === 'deposit' ? 'Select Your Mobile Money Network' : 'Uganda Sovereign Payment Channel'}
            </label>
            <div className={`grid gap-2 ${mode === 'deposit' ? 'grid-cols-2' : 'grid-cols-3'}`}>
              <button
                type="button"
                onClick={() => {
                  setActiveTab('mtn');
                  if (mode === 'withdraw') setRecipient('0772 123 456 (MTN MoMo)');
                }}
                className={`p-2.5 rounded-xl border text-center transition-all cursor-pointer ${activeTab === 'mtn'
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
                className={`p-2.5 rounded-xl border text-center transition-all cursor-pointer ${activeTab === 'airtel'
                  ? 'border-[#1657D9] bg-red-50 text-[#0F172A] font-bold shadow-xs'
                  : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
              >
                <Smartphone className="w-4 h-4 mx-auto mb-1 text-red-500" />
                <span className="text-[11px] block font-bold">Airtel Money</span>
              </button>

              {mode === 'withdraw' && (
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('bank');
                    setRecipient('Stanbic Bank - 9030018829104');
                  }}
                  className={`p-2.5 rounded-xl border text-center transition-all cursor-pointer ${activeTab === 'bank'
                    ? 'border-[#1657D9] bg-blue-50/70 text-[#1657D9] font-bold shadow-xs'
                    : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                >
                  <CreditCard className="w-4 h-4 mx-auto mb-1 text-blue-600" />
                  <span className="text-[11px] block font-bold">Bank Transfer</span>
                </button>
              )}
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
                placeholder="50000"
                className="w-full pl-12 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-bold text-[16px] focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-600 font-mono"
              />
            </div>

            {/* Withdrawal fee breakdown */}
            {mode === 'withdraw' && numUGX > 0 && (
              <div className="mt-2 bg-slate-50 border border-slate-200 rounded-xl p-2.5 space-y-1">
                <div className="flex items-center justify-between text-[11.5px]">
                  <span className="text-slate-600 font-medium">Withdrawal Amount</span>
                  <span className="font-mono font-bold text-slate-800">UGX {numUGX.toLocaleString()}</span>
                </div>
                <div className="flex items-center justify-between text-[11.5px]">
                  <span className="text-slate-600 font-medium">Transaction Fee (15%)</span>
                  <span className="font-mono font-bold text-red-600">- UGX {withdrawalFeeUGX.toLocaleString()}</span>
                </div>
                <div className="flex items-center justify-between text-[12px] border-t border-slate-200 pt-1">
                  <span className="text-slate-700 font-bold">You Receive</span>
                  <span className="font-mono font-bold text-emerald-600">UGX {netWithdrawalUGX.toLocaleString()}</span>
                </div>
              </div>
            )}

            {/* Quick preset buttons */}
            <div className="flex gap-2 mt-2">
              {[15000, 20000, 30000, 50000, 100000].map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => setAmountUGXStr(preset.toString())}
                  className="flex-1 py-1 text-[10.5px] font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition-colors cursor-pointer"
                >
                  +{preset >= 1000000 ? `${preset / 1000000}M` : `${preset / 1000}k`}
                </button>
              ))}
            </div>
          </div>

          {/* Details / Step-by-Step Instructions for Deposit vs Withdraw */}
          {mode === 'deposit' ? (
            <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200/80 space-y-3.5">
              {/* Recipient Card */}
              <div className="bg-gradient-to-br from-indigo-900 via-blue-900 to-slate-900 text-white rounded-2xl p-3.5 shadow-xs space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] uppercase font-bold tracking-wider text-blue-200 flex items-center gap-1">
                    <UserCheck className="w-3.5 h-3.5 text-amber-300" /> Authorized Recipient
                  </span>
                  <span className="text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2 py-0.5 rounded-full flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" /> Verified Name
                  </span>
                </div>

                <div className="flex items-center justify-between pt-1">
                  <div>
                    <span className="text-[10.5px] text-slate-300 block font-medium">Recipient Name</span>
                    <span className="text-[15px] font-black tracking-wide text-amber-300 block font-mono">
                      {RECIPIENT_NAME}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleCopy(RECIPIENT_NAME, 'name')}
                    className="p-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-[11px] font-bold flex items-center gap-1 transition-colors cursor-pointer"
                    title="Copy Name"
                  >
                    {copiedKey === 'name' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedKey === 'name' ? 'Copied' : 'Copy'}</span>
                  </button>
                </div>

                <div className="flex items-center justify-between border-t border-white/10 pt-2">
                  <div>
                    <span className="text-[10.5px] text-slate-300 block font-medium">MTN Phone Number</span>
                    <span className="text-[14px] font-black text-white font-mono block">
                      {DEPOSIT_PHONE}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleCopy(DEPOSIT_PHONE, 'phone')}
                    className="p-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-[11px] font-bold flex items-center gap-1 transition-colors cursor-pointer"
                    title="Copy Phone Number"
                  >
                    {copiedKey === 'phone' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedKey === 'phone' ? 'Copied' : 'Copy'}</span>
                  </button>
                </div>
              </div>

              {/* Quick Dial One-Tap Box */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[11px] font-bold text-slate-700 uppercase flex items-center gap-1">
                    <PhoneCall className="w-3.5 h-3.5 text-blue-600" /> Quick USSD Dial Code
                  </span>
                  <span className="text-[10px] text-slate-400 font-medium">Auto-fills amount</span>
                </div>
                <div className="flex items-center justify-between bg-white p-2.5 rounded-xl border border-slate-200 shadow-2xs">
                  <span className="font-mono font-bold text-slate-900 text-[13px] break-all">
                    {depositUssd}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleCopy(depositUssd, 'ussd')}
                    className="shrink-0 ml-2 px-2.5 py-1 rounded-lg bg-blue-50 hover:bg-blue-100 text-xs font-bold text-blue-600 flex items-center gap-1 transition-colors cursor-pointer"
                  >
                    {copiedKey === 'ussd' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedKey === 'ussd' ? 'Copied' : 'Copy'}</span>
                  </button>
                </div>
              </div>

              {/* Step-by-Step USSD Instructions */}
              <div className="space-y-2 pt-0.5">
                <span className="text-[11.5px] font-bold text-slate-800 block">
                  Step-by-Step USSD Guide ({activeTab === 'mtn' ? 'MTN MoMo' : 'Airtel Money'}):
                </span>

                <div className="space-y-2 text-[12px] text-slate-700 bg-white rounded-xl p-3 border border-slate-200 shadow-2xs">
                  <div className="flex items-start gap-2.5">
                    <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 font-extrabold text-[11px] flex items-center justify-center shrink-0 mt-0.5">
                      1
                    </span>
                    <div>
                      <span>Dial </span>
                      <strong className="font-mono bg-slate-100 px-1 py-0.5 rounded text-slate-900">
                        {activeTab === 'mtn' ? '*165#' : '*185#'}
                      </strong>
                      <span> on your mobile phone keypad.</span>
                    </div>
                  </div>

                  <div className="flex items-start gap-2.5">
                    <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 font-extrabold text-[11px] flex items-center justify-center shrink-0 mt-0.5">
                      2
                    </span>
                    <div>
                      <span>Select </span>
                      <strong className="font-semibold text-slate-900">1 (Send Money)</strong>
                      <span> → </span>
                      <strong className="font-semibold text-slate-900">
                        {activeTab === 'mtn' ? '1 (Mobile User)' : '1 (To Mobile / Other Networks)'}
                      </strong>.
                    </div>
                  </div>

                  <div className="flex items-start gap-2.5">
                    <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 font-extrabold text-[11px] flex items-center justify-center shrink-0 mt-0.5">
                      3
                    </span>
                    <div>
                      <span>Enter Recipient Number: </span>
                      <strong className="font-mono text-blue-700 bg-blue-50 px-1 py-0.5 rounded font-bold">
                        {DEPOSIT_PHONE}
                      </strong>
                    </div>
                  </div>

                  <div className="flex items-start gap-2.5">
                    <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 font-extrabold text-[11px] flex items-center justify-center shrink-0 mt-0.5">
                      4
                    </span>
                    <div>
                      <span>Enter Amount: </span>
                      <strong className="font-mono text-slate-900 font-bold">
                        UGX {numUGX.toLocaleString()}
                      </strong>
                    </div>
                  </div>

                  <div className="flex items-start gap-2.5">
                    <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 font-extrabold text-[11px] flex items-center justify-center shrink-0 mt-0.5">
                      5
                    </span>
                    <div>
                      <span>Confirm that the recipient name shows </span>
                      <strong className="text-amber-800 bg-amber-50 px-1 py-0.5 rounded font-extrabold">
                        {RECIPIENT_NAME}
                      </strong>
                      <span>, then enter your PIN to authorize.</span>
                    </div>
                  </div>

                  <div className="flex items-start gap-2.5 pt-0.5 border-t border-slate-100">
                    <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-700 font-extrabold text-[11px] flex items-center justify-center shrink-0 mt-0.5">
                      6
                    </span>
                    <div>
                      <span>After sending, tap the </span>
                      <strong className="text-blue-700 font-bold">Confirm Deposit</strong>
                      <span> button below to submit your request for fast approval!</span>
                    </div>
                  </div>
                </div>
              </div>

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
                  <span className="font-bold">Approval Process:</span> A <span className="font-semibold underline">15% transaction fee</span> is deducted from every withdrawal. Requests are placed in <span className="font-semibold underline">Pending</span> status and deducted/dispatched to your account upon administrator authorization.
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
            className={`w-full py-3 rounded-xl font-bold text-[14px] text-white shadow-md active:scale-98 transition-all cursor-pointer ${mode === 'deposit' ? 'bg-[#1657D9] hover:bg-blue-700' : 'bg-emerald-600 hover:bg-emerald-700'
              }`}
          >
            {isProcessing
              ? 'Processing Transaction...'
              : mode === 'deposit'
                ? `Confirm Deposit of UGX ${numUGX.toLocaleString()}`
                : `Submit Withdrawal of UGX ${netWithdrawalUGX.toLocaleString()}`}
          </button>
        </div>
      </div>
    </div>
  );
};

