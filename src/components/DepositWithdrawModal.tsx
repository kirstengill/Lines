import React, { useState, useEffect } from 'react';
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
  CheckCircle2,
  MessageCircle,
  ExternalLink,
  Gift,
  ShieldCheck,
  Percent
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { WHATSAPP_HELP_URL } from '../constants/links';
import { authService } from '../services/supabaseAuth';
import { systemSettingsService } from '../services/systemSettings';
import { SystemSettings } from '../types';

// Helper to calculate maximum receive amount after transaction fee from a given balance
export const calculateMaxWithdrawal = (balance: number, feeRate?: number): number => {
  if (balance <= 0) return 0;
  const rate = feeRate !== undefined ? feeRate : systemSettingsService.getWithdrawalFeeRate();
  let max = Math.floor(balance / (1 + rate));
  while (max > 0 && max + Math.round(max * rate) > balance) {
    max--;
  }
  return max;
};

// Deposit receiving line details
const DEPOSIT_PHONE = '0766495353';
const RECIPIENT_NAME = 'ELIX OWOMUZINYA';

interface DepositWithdrawModalProps {
  mode: 'deposit' | 'withdraw';
  onClose: () => void;
  balanceUGX: number;
  initialIsWelcomeBonus?: boolean;
  hasApprovedDeposit?: boolean;
  welcomeBonusClaimed?: boolean;
  onSwitchMode?: (mode: 'deposit' | 'withdraw') => void;
  onSuccess: (
    amountUGX: number,
    type: 'deposit' | 'withdraw',
    description: string,
    paymentMethod?: string,
    recipientInfo?: string
  ) => Promise<{ success: boolean; error?: string } | void> | void;
}

export const DepositWithdrawModal: React.FC<DepositWithdrawModalProps> = ({
  mode,
  onClose,
  balanceUGX,
  initialIsWelcomeBonus = false,
  hasApprovedDeposit = false,
  welcomeBonusClaimed = false,
  onSwitchMode,
  onSuccess,
}) => {
  const currentUser = authService.getCurrentUser();
  const [systemSettings, setSystemSettings] = useState<SystemSettings>(() => systemSettingsService.getSettings());

  useEffect(() => {
    const unsub = systemSettingsService.subscribe((s) => setSystemSettings(s));
    return unsub;
  }, []);

  const minWithdrawalUGX = systemSettings.minWithdrawUGX;
  const withdrawalFeeRate = systemSettings.withdrawalFeeRate;

  const [activeTab, setActiveTab] = useState<'mtn' | 'airtel' | 'bank'>('mtn');
  const [isWelcomeBonus, setIsWelcomeBonus] = useState<boolean>(initialIsWelcomeBonus);

  const [amountUGXStr, setAmountUGXStr] = useState<string>(() => {
    if (initialIsWelcomeBonus) {
      return '4000';
    }
    if (mode === 'withdraw') {
      const currentMin = systemSettingsService.getMinWithdrawUGX();
      const currentFee = systemSettingsService.getWithdrawalFeeRate();
      const maxPossible = calculateMaxWithdrawal(balanceUGX, currentFee);
      if (maxPossible >= currentMin) {
        return Math.min(maxPossible, 50000).toString();
      }
      return currentMin.toString();
    }
    return '50000';
  });

  const [depositorPhone, setDepositorPhone] = useState<string>(() => currentUser?.phone || '');
  const [recipient, setRecipient] = useState<string>(() =>
    currentUser?.phone
      ? `${currentUser.phone} (${currentUser.username || 'Wallet'})`
      : '0772 123 456 (MTN MoMo)'
  );
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [submittedSuccess, setSubmittedSuccess] = useState(false);
  const [successInfo, setSuccessInfo] = useState<{
    amount: number;
    fee: number;
    totalDeduction: number;
    netAmount: number;
    channel: string;
    recipient: string;
    isWelcomeBonus?: boolean;
  } | null>(null);

  // If user switches welcome bonus toggle
  const handleToggleWelcomeBonus = (enable: boolean) => {
    setIsWelcomeBonus(enable);
    if (enable) {
      setAmountUGXStr('4000');
    }
  };

  const numUGX = parseFloat(amountUGXStr) || 0;

  // Effective balance includes the 4,000 welcome bonus if not yet credited into balance
  const effectiveAvailableBalance =
    mode === 'withdraw' && isWelcomeBonus && !welcomeBonusClaimed && hasApprovedDeposit
      ? balanceUGX + 4000
      : balanceUGX;

  // Fee calculation:
  // When isWelcomeBonus is true, 0% fee applies.
  // Otherwise standard fee applies (from settings).
  const requestedWithdrawalUGX = mode === 'withdraw' ? numUGX : 0;
  const withdrawalFeeUGX =
    mode === 'withdraw'
      ? isWelcomeBonus
        ? 0
        : Math.round(requestedWithdrawalUGX * withdrawalFeeRate)
      : 0;
  const totalDeductionUGX =
    mode === 'withdraw'
      ? requestedWithdrawalUGX + withdrawalFeeUGX
      : numUGX;
  const youReceiveUGX = requestedWithdrawalUGX;

  const depositUssd =
    activeTab === 'airtel'
      ? `*185*1*1*${DEPOSIT_PHONE}*${numUGX || 'AMOUNT'}#`
      : `*165*1*1*${DEPOSIT_PHONE}*${numUGX || 'AMOUNT'}#`;

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleAction = async () => {
    setErrorMessage('');
    if (numUGX <= 0) {
      setErrorMessage('Please enter a valid amount in UGX.');
      return;
    }

    if (mode === 'deposit') {
      const cleanPhone = depositorPhone.trim().replace(/\s+/g, '');
      if (!cleanPhone || cleanPhone.length < 9) {
        setErrorMessage('Please enter the phone number you are depositing from (minimum 9 digits).');
        return;
      }
    }

    // Minimum withdrawal amount & balance verification
    if (mode === 'withdraw') {
      if (requestedWithdrawalUGX < minWithdrawalUGX) {
        setErrorMessage(
          `Minimum Withdrawal: The minimum withdrawal amount is UGX ${minWithdrawalUGX.toLocaleString()}.`
        );
        return;
      }

      if (isWelcomeBonus) {
        if (!hasApprovedDeposit) {
          setErrorMessage('An approved deposit is required to unlock 0% fee Welcome Bonus withdrawal.');
          return;
        }
      } else {
        // Standard withdrawal balance validation
        if (totalDeductionUGX > balanceUGX) {
          setErrorMessage(
            `Insufficient balance. You need UGX ${totalDeductionUGX.toLocaleString()} including the ${Math.round(withdrawalFeeRate * 100)}% transaction fee.`
          );
          return;
        }
      }
    }

    setIsProcessing(true);
    try {
      // If user selected Welcome Bonus withdrawal and bonus is not yet claimed into wallet balance,
      // claim it first so wallet balance is funded
      if (mode === 'withdraw' && isWelcomeBonus && !welcomeBonusClaimed && hasApprovedDeposit) {
        const claimRes = await authService.claimWelcomeBonus();
        if (!claimRes.success && !claimRes.error?.toLowerCase().includes('already')) {
          setIsProcessing(false);
          setErrorMessage(claimRes.error || 'Failed to initialize welcome bonus for withdrawal.');
          return;
        }
      }

      const channelName =
        activeTab === 'mtn'
          ? 'MTN Mobile Money'
          : activeTab === 'airtel'
            ? 'Airtel Money Uganda'
            : 'Stanbic Bank EFT';

      const cleanSender = depositorPhone.trim();
      const desc =
        mode === 'deposit'
          ? `Deposit UGX ${numUGX.toLocaleString()} (Sender: ${cleanSender})`
          : isWelcomeBonus
            ? `Welcome Bonus Withdrawal (0% Fee) — UGX ${requestedWithdrawalUGX.toLocaleString()} (Receive: UGX ${requestedWithdrawalUGX.toLocaleString()} | 0% Fee)`
            : `Withdrawal of UGX ${requestedWithdrawalUGX.toLocaleString()} (Receive: UGX ${requestedWithdrawalUGX.toLocaleString()} | Fee: UGX ${withdrawalFeeUGX.toLocaleString()} | Total Deduction: UGX ${totalDeductionUGX.toLocaleString()})`;

      const referenceInfo =
        mode === 'deposit'
          ? `Sender: ${cleanSender} → To: ${RECIPIENT_NAME} (${DEPOSIT_PHONE})`
          : recipient;

      // Pass requested withdrawal amount (or deposit amount) directly to transaction handler
      const submissionAmount = mode === 'withdraw' ? requestedWithdrawalUGX : numUGX;
      const res = await onSuccess(submissionAmount, mode, desc, channelName, referenceInfo);
      setIsProcessing(false);

      if (res && res.success === false) {
        setErrorMessage(res.error || 'Transaction submission failed.');
        return;
      }

      try {
        confetti({ particleCount: 55, spread: 50, origin: { y: 0.6 } });
      } catch {}

      setSuccessInfo({
        amount: mode === 'withdraw' ? requestedWithdrawalUGX : numUGX,
        fee: withdrawalFeeUGX,
        totalDeduction: totalDeductionUGX,
        netAmount: mode === 'withdraw' ? requestedWithdrawalUGX : numUGX,
        channel: channelName,
        recipient: referenceInfo,
        isWelcomeBonus,
      });
      setSubmittedSuccess(true);
    } catch (err: any) {
      setIsProcessing(false);
      setErrorMessage(err?.message || 'Transaction submission failed.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs">
      <div className="bg-[#0D1017] text-white rounded-3xl w-full max-w-md max-h-[92vh] overflow-y-auto shadow-2xl border border-amber-500/30 flex flex-col animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="p-5 border-b border-amber-500/20 flex items-center justify-between sticky top-0 bg-[#0D1017]/95 backdrop-blur-md z-10">
          <div className="flex items-center gap-2">
            <div
              className={`w-8 h-8 rounded-xl flex items-center justify-center border ${
                mode === 'deposit'
                  ? 'bg-amber-500/20 text-amber-400 border-amber-500/30'
                  : isWelcomeBonus
                    ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                    : 'bg-amber-500/20 text-amber-400 border-amber-500/30'
              }`}
            >
              {mode === 'deposit' ? (
                <ArrowDownLeft className="w-5 h-5 text-amber-400" />
              ) : isWelcomeBonus ? (
                <Gift className="w-5 h-5 text-emerald-400" />
              ) : (
                <ArrowUpRight className="w-5 h-5 text-amber-400" />
              )}
            </div>
            <div>
              <h3 className="text-[17px] font-black text-white leading-tight">
                {mode === 'deposit'
                  ? 'Deposit UGX'
                  : isWelcomeBonus
                    ? 'Withdraw Welcome Bonus (0% Fee)'
                    : 'Withdraw UGX'}
              </h3>
              <p className="text-[11px] text-amber-200/70 font-mono">
                Available: UGX {effectiveAvailableBalance.toLocaleString()}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        {submittedSuccess && successInfo ? (
          <div className="p-6 space-y-5 text-center">
            <div className="w-16 h-16 mx-auto rounded-2xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shadow-sm">
              <CheckCircle2 className="w-9 h-9" />
            </div>

            <div>
              <h4 className="text-[18px] font-black text-white">
                {mode === 'withdraw'
                  ? successInfo.isWelcomeBonus
                    ? 'Welcome Bonus withdrawal submitted at 0% fee!'
                    : 'Withdrawal request submitted successfully.'
                  : 'Deposit request submitted successfully.'}
              </h4>
              <p className="text-[13px] font-bold text-amber-300 bg-amber-500/15 border border-amber-500/30 rounded-xl py-2 px-3 mt-2">
                {mode === 'withdraw'
                  ? 'Your withdrawal is pending admin approval and will be sent to your account.'
                  : 'Your deposit is pending administrator review and verification.'}
              </p>
            </div>

            <div className="bg-[#131722] border border-amber-500/20 rounded-2xl p-4 text-left space-y-2.5 text-[12.5px]">
              <div className="flex justify-between items-center text-slate-400">
                <span>Transaction Type</span>
                <span className="font-bold text-white">
                  {successInfo.isWelcomeBonus ? 'Welcome Bonus Withdrawal (0% Fee)' : 'Withdrawal'}
                </span>
              </div>
              {mode === 'withdraw' ? (
                <>
                  <div className="flex justify-between items-center text-slate-400">
                    <span>Withdrawal Amount</span>
                    <span className="font-bold text-amber-400 font-mono">
                      UGX {successInfo.amount.toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-slate-400">
                    <span>Transaction Fee</span>
                    {successInfo.isWelcomeBonus ? (
                      <span className="font-extrabold text-emerald-400 font-mono bg-emerald-500/20 px-2 py-0.5 rounded text-[11px] border border-emerald-500/30">
                        0% FEE (UGX 0)
                      </span>
                    ) : (
                      <span className="font-semibold text-amber-400 font-mono">
                        + UGX {successInfo.fee.toLocaleString()} (15%)
                      </span>
                    )}
                  </div>
                  <div className="flex justify-between items-center text-slate-300 font-bold border-t border-amber-500/15 pt-1.5">
                    <span>Total Wallet Deduction</span>
                    <span className="text-rose-400 font-mono">
                      UGX {successInfo.totalDeduction.toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-white font-bold bg-[#1A2518] p-2.5 rounded-xl border border-emerald-500/30 mt-1">
                    <span className="text-emerald-300">You Receive</span>
                    <span className="text-emerald-400 font-mono font-black text-[14px]">
                      UGX {successInfo.netAmount.toLocaleString()}
                    </span>
                  </div>
                </>
              ) : (
                <div className="flex justify-between items-center text-slate-400">
                  <span>Deposit Amount</span>
                  <span className="font-bold text-amber-400 font-mono">
                    UGX {successInfo.amount.toLocaleString()}
                  </span>
                </div>
              )}
              <div className="flex justify-between items-center text-slate-400">
                <span>Payment Channel</span>
                <span className="font-semibold text-white">{successInfo.channel}</span>
              </div>
              <div className="flex justify-between items-center text-slate-400">
                <span>Destination</span>
                <span className="font-mono text-[11.5px] text-slate-200 truncate max-w-[200px]">
                  {successInfo.recipient}
                </span>
              </div>
              <div className="flex justify-between items-center text-slate-400 border-t border-amber-500/15 pt-2">
                <span>Status</span>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse"></span>
                  Pending Admin Approval
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="w-full py-3 rounded-xl font-black text-[14px] text-slate-950 bg-amber-500 hover:bg-amber-400 shadow-md shadow-amber-500/20 active:scale-98 transition-all cursor-pointer"
            >
              Done & View Activity
            </button>
          </div>
        ) : (
          <div className="p-5 space-y-4">
            {/* Mode Toggle for Withdraw: Standard vs Welcome Bonus 0% Fee */}
            {mode === 'withdraw' && (
              hasApprovedDeposit ? (
                <div className="bg-[#131722] p-1 rounded-2xl border border-amber-500/25 shadow-2xs flex gap-1">
                  <button
                    type="button"
                    onClick={() => handleToggleWelcomeBonus(true)}
                    className={`flex-1 py-2 px-2.5 rounded-xl text-[12px] font-extrabold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                      isWelcomeBonus
                        ? 'bg-emerald-600 text-white shadow-sm'
                        : 'text-slate-400 hover:text-white hover:bg-white/5'
                    }`}
                  >
                    <Gift className="w-3.5 h-3.5" />
                    <span>Welcome Bonus (0% Fee)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleToggleWelcomeBonus(false)}
                    className={`flex-1 py-2 px-2.5 rounded-xl text-[12px] font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                      !isWelcomeBonus
                        ? 'bg-amber-500 text-slate-950 font-black shadow-sm'
                        : 'text-slate-400 hover:text-white hover:bg-white/5'
                    }`}
                  >
                    <span>Standard (15% Fee)</span>
                  </button>
                </div>
              ) : (
                <div className="bg-[#131722] border border-amber-500/25 rounded-2xl p-3 flex items-center justify-between gap-2.5">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="w-7 h-7 rounded-lg bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center shrink-0">
                      <Gift className="w-3.5 h-3.5" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[11.5px] font-bold text-white leading-tight">
                        UGX 4,000 Welcome Bonus Locked
                      </p>
                      <p className="text-[10.5px] text-slate-400 leading-tight truncate">
                        Complete your first deposit to unlock 0% fee withdrawal.
                      </p>
                    </div>
                  </div>
                  {onSwitchMode && (
                    <button
                      type="button"
                      onClick={() => onSwitchMode('deposit')}
                      className="shrink-0 text-[11px] font-bold text-amber-300 bg-amber-500/15 hover:bg-amber-500/25 px-2.5 py-1 rounded-lg border border-amber-500/30 cursor-pointer transition-colors"
                    >
                      Deposit Now
                    </button>
                  )}
                </div>
              )
            )}

            {/* Method Selector */}
            <div>
              <label className="text-[12px] font-semibold text-slate-300 mb-1.5 block">
                {mode === 'deposit'
                  ? 'Select Your Mobile Money Network'
                  : 'Uganda Sovereign Payment Channel'}
              </label>
              <div className={`grid gap-2 ${mode === 'deposit' ? 'grid-cols-2' : 'grid-cols-3'}`}>
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('mtn');
                    if (mode === 'withdraw') setRecipient('0772 123 456 (MTN MoMo)');
                  }}
                  className={`p-2.5 rounded-xl border text-center transition-all cursor-pointer ${
                    activeTab === 'mtn'
                      ? 'border-amber-500 bg-amber-500/15 text-amber-300 font-bold shadow-xs'
                      : 'border-slate-800 bg-[#131722] text-slate-400 hover:text-white hover:bg-[#1C2230]'
                  }`}
                >
                  <Smartphone className="w-4 h-4 mx-auto mb-1 text-amber-400" />
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
                      ? 'border-amber-500 bg-amber-500/15 text-amber-300 font-bold shadow-xs'
                      : 'border-slate-800 bg-[#131722] text-slate-400 hover:text-white hover:bg-[#1C2230]'
                  }`}
                >
                  <Smartphone className="w-4 h-4 mx-auto mb-1 text-red-400" />
                  <span className="text-[11px] block font-bold">Airtel Money</span>
                </button>

                {mode === 'withdraw' && (
                  <button
                    type="button"
                    onClick={() => {
                      setActiveTab('bank');
                      setRecipient('Stanbic Bank - 9030018829104');
                    }}
                    className={`p-2.5 rounded-xl border text-center transition-all cursor-pointer ${
                      activeTab === 'bank'
                        ? 'border-amber-500 bg-amber-500/15 text-amber-300 font-bold shadow-xs'
                        : 'border-slate-800 bg-[#131722] text-slate-400 hover:text-white hover:bg-[#1C2230]'
                    }`}
                  >
                    <CreditCard className="w-4 h-4 mx-auto mb-1 text-amber-400" />
                    <span className="text-[11px] block font-bold">Bank Transfer</span>
                  </button>
                )}
              </div>
            </div>

            {/* Amount Inputs */}
            <div>
              <label className="text-[12px] font-semibold text-slate-300 mb-1.5 flex items-center justify-between">
                <span>
                  {mode === 'deposit'
                    ? 'Amount (UGX)'
                    : isWelcomeBonus
                      ? 'Welcome Bonus Amount'
                      : 'Withdrawal Amount (You Receive)'}
                  {mode === 'withdraw' && !isWelcomeBonus && (
                    <span className="ml-1.5 text-[10.5px] font-bold text-amber-400 bg-amber-500/15 px-2 py-0.5 rounded-full border border-amber-500/30">
                      Min: UGX {minWithdrawalUGX.toLocaleString()}
                    </span>
                  )}
                </span>
                <span className="text-[11px] font-bold text-amber-400 font-mono">
                  UGX {numUGX.toLocaleString()}
                </span>
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-xs">
                  UGX
                </span>
                <input
                  type="number"
                  value={amountUGXStr}
                  disabled={isWelcomeBonus}
                  onChange={(e) => setAmountUGXStr(e.target.value)}
                  placeholder={mode === 'deposit' ? '50000' : minWithdrawalUGX.toString()}
                  className={`w-full pl-12 pr-4 py-2.5 rounded-xl font-bold text-[16px] focus:outline-none focus:ring-2 focus:ring-amber-500/30 font-mono ${
                    isWelcomeBonus
                      ? 'bg-emerald-950/40 border border-emerald-500/40 text-emerald-300 cursor-not-allowed'
                      : 'bg-[#131722] border border-amber-500/30 text-white focus:border-amber-400'
                  }`}
                />
              </div>

              {/* Withdrawal fee breakdown preview */}
              {mode === 'withdraw' && requestedWithdrawalUGX > 0 && (
                <div className="mt-2.5 bg-[#131722] border border-amber-500/25 rounded-2xl p-3.5 space-y-2">
                  <div className="flex items-center justify-between text-[12.5px]">
                    <span className="text-slate-400 font-medium">Withdrawal Amount</span>
                    <span className="font-mono font-bold text-white">
                      UGX {requestedWithdrawalUGX.toLocaleString()}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-[12.5px]">
                    <span className="text-slate-400 font-medium">Transaction Fee</span>
                    {isWelcomeBonus ? (
                      <span className="font-mono font-extrabold text-emerald-400 bg-emerald-500/20 px-2 py-0.5 rounded text-[11px] border border-emerald-500/30">
                        0% FEE (UGX 0)
                      </span>
                    ) : (
                      <span className="font-mono font-bold text-amber-400">
                        + UGX {withdrawalFeeUGX.toLocaleString()} (15%)
                      </span>
                    )}
                  </div>
                  <div className="flex items-center justify-between text-[12.5px] border-t border-amber-500/15 pt-1.5">
                    <span className="text-slate-300 font-bold">Total Wallet Deduction</span>
                    <span className="font-mono font-bold text-rose-400">
                      UGX {totalDeductionUGX.toLocaleString()}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-[13px] bg-[#1A2518] border border-emerald-500/30 rounded-xl px-3 py-2 mt-1">
                    <span className="text-emerald-300 font-bold">You Receive</span>
                    <span className="font-mono font-black text-emerald-400 text-[14px]">
                      UGX {youReceiveUGX.toLocaleString()}
                    </span>
                  </div>
                  {!isWelcomeBonus && totalDeductionUGX > balanceUGX && (
                    <div className="text-[11px] font-semibold text-rose-400 flex items-center gap-1.5 pt-1 border-t border-rose-500/20">
                      <ShieldAlert className="w-3.5 h-3.5 shrink-0 text-rose-400" />
                      <span>
                        Insufficient balance. You need UGX {totalDeductionUGX.toLocaleString()}{' '}
                        including the 15% transaction fee.
                      </span>
                    </div>
                  )}
                </div>
              )}

              {/* Quick preset buttons */}
              {!isWelcomeBonus && (
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {(mode === 'withdraw'
                    ? [10000, 20000, 50000, 100000, 200000]
                    : [15000, 20000, 30000, 50000, 100000]
                  ).map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setAmountUGXStr(preset.toString())}
                      className="flex-1 min-w-[50px] py-1 text-[11px] font-semibold bg-[#1C2230] hover:bg-[#252D40] text-amber-200/80 border border-amber-500/20 rounded-lg transition-colors cursor-pointer"
                    >
                      {preset >= 1000000 ? `${preset / 1000000}M` : `${preset / 1000}k`}
                    </button>
                  ))}
                  {mode === 'withdraw' && balanceUGX > 0 && (
                    <button
                      type="button"
                      onClick={() => {
                        const maxRec = calculateMaxWithdrawal(balanceUGX);
                        setAmountUGXStr(maxRec.toString());
                      }}
                      className="px-2.5 py-1 text-[11px] font-bold bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 rounded-lg transition-colors cursor-pointer border border-amber-500/35"
                      title="Select maximum amount you can receive after 15% fee"
                    >
                      Max ({calculateMaxWithdrawal(balanceUGX).toLocaleString()} UGX)
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Details / Step-by-Step Instructions for Deposit vs Withdraw */}
            {mode === 'deposit' ? (
              <div className="bg-[#131722] rounded-2xl p-4 border border-amber-500/25 space-y-3.5">
                {/* Depositor's Phone Number Input Field */}
                <div className="bg-[#0D1017] rounded-2xl p-3.5 border border-amber-500/30 shadow-2xs space-y-1.5">
                  <label className="text-[12px] font-bold text-slate-200 flex items-center justify-between">
                    <span className="flex items-center gap-1.5 text-amber-300">
                      <Smartphone className="w-4 h-4 text-amber-400" />
                      Your Phone Number (Depositing From) <span className="text-red-400">*</span>
                    </span>
                    <span className="text-[10.5px] font-bold text-amber-300 bg-amber-500/20 px-2 py-0.5 rounded-full border border-amber-500/30">
                      Required
                    </span>
                  </label>
                  <input
                    type="tel"
                    value={depositorPhone}
                    onChange={(e) => setDepositorPhone(e.target.value)}
                    placeholder="e.g. 0772 123 456 or 0766 000 000"
                    className="w-full px-3.5 py-2.5 bg-[#131722] border border-amber-500/30 rounded-xl text-white font-bold text-[14px] focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-400 font-mono tracking-wide placeholder:font-normal placeholder:text-slate-500"
                  />
                  <p className="text-[10.5px] text-slate-400 leading-tight">
                    Enter the phone number you are sending money from. This number is attached to
                    your deposit transaction so administrators can immediately match and credit your
                    balance.
                  </p>
                </div>

                {/* Recipient Card */}
                <div className="bg-[#0D1017] text-white rounded-2xl p-3.5 shadow-xs space-y-2 border border-amber-500/30">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] uppercase font-bold tracking-wider text-amber-300 flex items-center gap-1">
                      <UserCheck className="w-3.5 h-3.5 text-amber-400" /> Authorized Recipient
                    </span>
                    <span className="text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2 py-0.5 rounded-full flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" /> Verified Name
                    </span>
                  </div>

                  <div className="flex items-center justify-between pt-1">
                    <div>
                      <span className="text-[10.5px] text-slate-400 block font-medium">
                        Recipient Name
                      </span>
                      <span className="text-[15px] font-black tracking-wide text-amber-300 block font-mono">
                        {RECIPIENT_NAME}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleCopy(RECIPIENT_NAME, 'name')}
                      className="p-1.5 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 text-amber-300 text-[11px] font-bold flex items-center gap-1 transition-colors cursor-pointer"
                      title="Copy Name"
                    >
                      {copiedKey === 'name' ? (
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                      <span>{copiedKey === 'name' ? 'Copied' : 'Copy'}</span>
                    </button>
                  </div>

                  <div className="flex items-center justify-between border-t border-amber-500/15 pt-2">
                    <div>
                      <span className="text-[10.5px] text-slate-400 block font-medium">
                        MTN Phone Number
                      </span>
                      <span className="text-[14px] font-black text-white font-mono block">
                        {DEPOSIT_PHONE}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleCopy(DEPOSIT_PHONE, 'phone')}
                      className="p-1.5 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 text-amber-300 text-[11px] font-bold flex items-center gap-1 transition-colors cursor-pointer"
                      title="Copy Phone Number"
                    >
                      {copiedKey === 'phone' ? (
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                      <span>{copiedKey === 'phone' ? 'Copied' : 'Copy'}</span>
                    </button>
                  </div>
                </div>

                {/* Quick Dial One-Tap Box */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[11px] font-bold text-amber-300 uppercase flex items-center gap-1">
                      <PhoneCall className="w-3.5 h-3.5 text-amber-400" /> Quick USSD Dial Code
                    </span>
                    <span className="text-[10px] text-slate-400 font-medium">Auto-fills amount</span>
                  </div>
                  <div className="flex items-center justify-between bg-[#0D1017] p-2.5 rounded-xl border border-amber-500/30 shadow-2xs">
                    <span className="font-mono font-bold text-amber-300 text-[13px] break-all">
                      {depositUssd}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleCopy(depositUssd, 'ussd')}
                      className="shrink-0 ml-2 px-2.5 py-1 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-xs font-bold text-amber-300 flex items-center gap-1 transition-colors cursor-pointer"
                    >
                      {copiedKey === 'ussd' ? (
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                      <span>{copiedKey === 'ussd' ? 'Copied' : 'Copy'}</span>
                    </button>
                  </div>
                </div>

                {/* Step-by-Step USSD Instructions */}
                <div className="space-y-2 pt-0.5">
                  <span className="text-[11.5px] font-bold text-white block">
                    Step-by-Step USSD Guide ({activeTab === 'mtn' ? 'MTN MoMo' : 'Airtel Money'}):
                  </span>

                  <div className="space-y-2 text-[12px] text-slate-300 bg-[#0D1017] rounded-xl p-3 border border-amber-500/20 shadow-2xs">
                    <div className="flex items-start gap-2.5">
                      <span className="w-5 h-5 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-300 font-extrabold text-[11px] flex items-center justify-center shrink-0 mt-0.5">
                        1
                      </span>
                      <div>
                        <span>Dial </span>
                        <strong className="font-mono bg-[#1C2230] text-amber-300 px-1 py-0.5 rounded">
                          {activeTab === 'mtn' ? '*165#' : '*185#'}
                        </strong>
                        <span> on your mobile phone keypad.</span>
                      </div>
                    </div>

                    <div className="flex items-start gap-2.5">
                      <span className="w-5 h-5 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-300 font-extrabold text-[11px] flex items-center justify-center shrink-0 mt-0.5">
                        2
                      </span>
                      <div>
                        <span>Select </span>
                        <strong className="font-semibold text-white">1 (Send Money)</strong>
                        <span> → </span>
                        <strong className="font-semibold text-white">
                          {activeTab === 'mtn'
                            ? '1 (Mobile User)'
                            : '1 (To Mobile / Other Networks)'}
                        </strong>
                        .
                      </div>
                    </div>

                    <div className="flex items-start gap-2.5">
                      <span className="w-5 h-5 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-300 font-extrabold text-[11px] flex items-center justify-center shrink-0 mt-0.5">
                        3
                      </span>
                      <div>
                        <span>Enter Recipient Number: </span>
                        <strong className="font-mono text-amber-300 bg-amber-500/20 px-1 py-0.5 rounded font-bold">
                          {DEPOSIT_PHONE}
                        </strong>
                      </div>
                    </div>

                    <div className="flex items-start gap-2.5">
                      <span className="w-5 h-5 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-300 font-extrabold text-[11px] flex items-center justify-center shrink-0 mt-0.5">
                        4
                      </span>
                      <div>
                        <span>Enter Amount: </span>
                        <strong className="font-mono text-amber-300 font-bold">
                          UGX {numUGX.toLocaleString()}
                        </strong>
                      </div>
                    </div>

                    <div className="flex items-start gap-2.5">
                      <span className="w-5 h-5 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-300 font-extrabold text-[11px] flex items-center justify-center shrink-0 mt-0.5">
                        5
                      </span>
                      <div>
                        <span>Confirm that the recipient name shows </span>
                        <strong className="text-amber-300 bg-amber-500/20 px-1 py-0.5 rounded font-extrabold">
                          {RECIPIENT_NAME}
                        </strong>
                        <span>, then enter your PIN to authorize.</span>
                      </div>
                    </div>

                    <div className="flex items-start gap-2.5 pt-0.5 border-t border-amber-500/15">
                      <span className="w-5 h-5 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 font-extrabold text-[11px] flex items-center justify-center shrink-0 mt-0.5">
                        6
                      </span>
                      <div>
                        <span>After sending, tap the </span>
                        <strong className="text-amber-300 font-bold">Confirm Deposit</strong>
                        <span> button below to submit your request for fast approval!</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Deposit Approval Notice */}
                <div className="bg-amber-500/15 rounded-xl p-3 border border-amber-500/30 flex items-start gap-2">
                  <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                  <p className="text-[11px] text-amber-200 leading-snug">
                    <span className="font-bold">Approval System:</span> Deposit requests are
                    submitted as <span className="font-semibold underline">Pending</span> and
                    credited to your wallet balance after administrator review and verification.
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <div>
                  <label className="text-[12px] font-semibold text-slate-300 mb-1.5 block">
                    Withdrawal Destination (Mobile Number / Bank Acct)
                  </label>
                  <input
                    type="text"
                    value={recipient}
                    onChange={(e) => setRecipient(e.target.value)}
                    placeholder="e.g. 0772 123 456 or Stanbic Acct"
                    className="w-full px-3.5 py-2.5 bg-[#131722] border border-amber-500/30 rounded-xl text-white text-[13.5px] focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-400"
                  />
                </div>

                {/* Withdrawal Fee Notice */}
                {isWelcomeBonus ? (
                  <div className="bg-[#101A14] rounded-xl p-3 border border-emerald-500/30 flex items-start gap-2">
                    <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                    <p className="text-[11px] text-emerald-300 leading-snug">
                      <span className="font-bold">Welcome Bonus Benefit:</span> Your UGX 4,000
                      Welcome Bonus is processed with a{' '}
                      <span className="font-extrabold underline">0% transaction fee</span>. You
                      will receive the full UGX 4,000 upon administrator approval.
                    </p>
                  </div>
                ) : (
                  <div className="bg-amber-500/15 rounded-xl p-3 border border-amber-500/30 flex items-start gap-2">
                    <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                    <p className="text-[11px] text-amber-200 leading-snug">
                      <span className="font-bold">Fee & Approval Process:</span> A{' '}
                      <span className="font-semibold underline">15% transaction fee</span> is
                      added to standard withdrawals. The total wallet deduction will be processed
                      upon administrator review and approval.
                    </p>
                  </div>
                )}
              </div>
            )}

            {errorMessage && (
              <div className="p-2.5 bg-rose-500/20 text-rose-300 text-[12px] rounded-xl font-medium border border-rose-500/40">
                {errorMessage}
              </div>
            )}

            {/* Action Button */}
            <button
              onClick={handleAction}
              disabled={isProcessing}
              className={`w-full py-3 rounded-xl font-black text-[14px] shadow-md active:scale-98 transition-all cursor-pointer ${
                mode === 'deposit'
                  ? 'bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-amber-500/20'
                  : isWelcomeBonus
                    ? 'bg-emerald-600 hover:bg-emerald-500 text-white'
                    : 'bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-amber-500/20'
              }`}
            >
              {isProcessing
                ? 'Processing Transaction...'
                : mode === 'deposit'
                  ? `Confirm Deposit of UGX ${numUGX.toLocaleString()}`
                  : isWelcomeBonus
                    ? 'Submit Welcome Bonus Withdrawal (0% Fee)'
                    : `Submit Withdrawal of UGX ${requestedWithdrawalUGX.toLocaleString()}`}
            </button>

            {/* Quick WhatsApp Help */}
            <div className="text-center pt-1">
              <a
                id="link-deposit-whatsapp-help"
                href={WHATSAPP_HELP_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-[11.5px] font-bold text-amber-400 hover:text-amber-300 transition-colors"
              >
                <MessageCircle className="w-3.5 h-3.5 text-amber-400" />
                <span>
                  Need help with {mode === 'deposit' ? 'depositing' : 'withdrawing'}? Chat on WhatsApp
                </span>
                <ExternalLink className="w-3 h-3 text-amber-400" />
              </a>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
