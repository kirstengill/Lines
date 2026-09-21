import React, { useState, useEffect, useCallback } from 'react';
import {
  Users,
  Copy,
  Check,
  Share2,
  Sparkles,
  ShieldCheck,
  CheckCircle2,
  Clock,
  UserCheck,
  Percent,
  Zap,
  ArrowDownToLine,
  RefreshCw,
  AlertCircle,
  Coins,
  ArrowRight,
  Link2,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { UserProfile, ReferralPartner, ReferralSummary } from '../types';
import { supabaseAuth } from '../services/supabaseAuth';
import { systemSettingsService } from '../services/systemSettings';

interface ReferralViewProps {
  user: UserProfile | null;
  onOpenAuth?: () => void;
  onRefresh?: () => void | Promise<void>;
  onClaimSuccess?: () => void | Promise<void>;
}

export const ReferralView: React.FC<ReferralViewProps> = ({
  user,
  onOpenAuth,
  onRefresh,
  onClaimSuccess,
}) => {
  const [summary, setSummary] = useState<ReferralSummary | null>(null);
  const [referredUsers, setReferredUsers] = useState<ReferralPartner[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [isClaiming, setIsClaiming] = useState<boolean>(false);
  const [claimFeedback, setClaimFeedback] = useState<{
    type: 'success' | 'error' | 'info';
    message: string;
  } | null>(null);

  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [shareToast, setShareToast] = useState('');

  // Retroactive link inviter state
  const [inviterInput, setInviterInput] = useState('');
  const [isLinkingInviter, setIsLinkingInviter] = useState(false);
  const [inviterFeedback, setInviterFeedback] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);
  const [showLinkSection, setShowLinkSection] = useState(false);
  const [referralRate, setReferralRate] = useState<number>(() => systemSettingsService.getReferralPercentage());

  useEffect(() => {
    const unsub = systemSettingsService.subscribe((s) => {
      setReferralRate(s.referralPercentage);
    });
    return unsub;
  }, []);

  const referralCode = summary?.referralCode || user?.referralCode || '';

  const getReferralUrl = useCallback((): string => {
    if (!referralCode) return '';
    if (typeof window === 'undefined') return `https://fleetvest.app/?ref=${referralCode}`;
    const base = `${window.location.origin}${window.location.pathname}`;
    const cleanBase = base.endsWith('/') ? base.slice(0, -1) : base;
    return `${cleanBase}?ref=${referralCode}`;
  }, [referralCode]);

  const referralUrl = getReferralUrl();

  /**
   * Fetch fresh referral data strictly from Supabase RPCs and direct tables.
   * Supabase database is the single source of truth.
   */
  const loadReferralData = useCallback(async (isManualRefresh = false) => {
    if (isManualRefresh) {
      setIsRefreshing(true);
    } else {
      setIsLoading(true);
    }

    try {
      const [freshSummary, freshUsers] = await Promise.all([
        supabaseAuth.getReferralSummary(),
        supabaseAuth.getReferredUsers(),
      ]);

      setSummary(freshSummary);
      setReferredUsers(freshUsers);

      if (freshSummary && user) {
        user.referralCount = Math.max(freshSummary.totalReferrals, freshUsers.length);
        user.referralEarningsUGX = freshSummary.totalCommissionUGX;
      }
    } catch (err) {
      console.warn('Failed to load referral data from Supabase:', err);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [user]);

  // Load data on mount and whenever the active user changes
  useEffect(() => {
    loadReferralData();
  }, [loadReferralData, user?.id]);

  const handleManualRefresh = async () => {
    await loadReferralData(true);
    if (onRefresh) {
      await onRefresh();
    }
  };

  /**
   * Retroactively connect to an inviter if user registered without referral code
   */
  const handleLinkInviter = async (e: React.FormEvent) => {
    e.preventDefault();
    const clean = inviterInput.trim();
    if (!clean || isLinkingInviter) return;

    setIsLinkingInviter(true);
    setInviterFeedback(null);

    try {
      const res = await supabaseAuth.linkReferrer(clean);
      if (res.success) {
        setInviterFeedback({ type: 'success', message: res.message });
        setInviterInput('');
        try {
          confetti({ particleCount: 40, spread: 50 });
        } catch {}
        await loadReferralData(true);
        if (onRefresh) {
          await onRefresh();
        }
      } else {
        setInviterFeedback({ type: 'error', message: res.message });
      }
    } catch (err: any) {
      setInviterFeedback({
        type: 'error',
        message: err?.message || 'Failed to connect inviter code.',
      });
    } finally {
      setIsLinkingInviter(false);
    }
  };

  /**
   * Claim Available Referral Commission
   * Calls Supabase RPC claim_referral_commission() atomically.
   */
  const handleClaimCommission = async () => {
    const available = summary?.availableCommissionUGX ?? 0;
    if (available <= 0 || isClaiming) return;

    setIsClaiming(true);
    setClaimFeedback(null);

    try {
      const result = await supabaseAuth.claimReferralCommission();

      if (result.success) {
        // Confetti celebration
        try {
          confetti({
            particleCount: 70,
            spread: 60,
            origin: { y: 0.6 },
          });
        } catch {}

        setClaimFeedback({
          type: 'success',
          message:
            result.message ||
            `UGX ${(result.claimedUGX || available).toLocaleString()} commission was credited directly to your main wallet!`,
        });

        // Refresh referral state and wallet state from Supabase
        await loadReferralData(true);

        if (onClaimSuccess) {
          await onClaimSuccess();
        } else if (onRefresh) {
          await onRefresh();
        }
      } else {
        setClaimFeedback({
          type: 'error',
          message: result.error || 'Failed to claim commission. Please try again.',
        });
      }
    } catch (err: any) {
      setClaimFeedback({
        type: 'error',
        message: err?.message || 'A network error occurred while claiming.',
      });
    } finally {
      setIsClaiming(false);
    }
  };

  const handleCopyCode = async () => {
    try {
      await navigator.clipboard.writeText(referralCode);
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2000);
    } catch {
      setShareToast('Code copied: ' + referralCode);
      setTimeout(() => setShareToast(''), 2500);
    }
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(referralUrl);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    } catch {
      setShareToast('Invitation link copied!');
      setTimeout(() => setShareToast(''), 2500);
    }
  };

  const handleNativeShare = async () => {
    const shareData = {
      title: 'FleetVest — Transport & Logistics Investment',
      text: `Join FleetVest using my invitation code ${referralCode}. Start earning daily returns on fleet vehicles in Uganda (UGX)!`,
      url: referralUrl,
    };

    if (typeof navigator !== 'undefined' && navigator.share && navigator.canShare && navigator.canShare(shareData)) {
      try {
        await navigator.share(shareData);
        try {
          confetti({ particleCount: 40, spread: 50, origin: { y: 0.7 } });
        } catch {}
      } catch (err: any) {
        if (err.name !== 'AbortError') {
          handleCopyLink();
          setShareToast('Referral link copied to clipboard!');
          setTimeout(() => setShareToast(''), 2500);
        }
      }
    } else {
      await handleCopyLink();
      try {
        confetti({ particleCount: 30, spread: 45 });
      } catch {}
      setShareToast('Referral link copied! Share with your contacts.');
      setTimeout(() => setShareToast(''), 2500);
    }
  };

  const totalReferralsCount = Math.max(summary?.totalReferrals ?? 0, referredUsers.length, user?.referralCount ?? 0);
  const liveCommissionEarned = referredUsers.reduce((sum, u) => sum + (Number(u.commissionUGX) || 0), 0);
  const totalCommissionUGX = Math.max(summary?.totalCommissionUGX ?? 0, liveCommissionEarned, user?.referralEarningsUGX ?? 0);
  const claimedCommissionUGX = summary?.claimedCommissionUGX ?? 0;
  const availableCommissionUGX = Math.max(0, summary?.availableCommissionUGX ?? (totalCommissionUGX - claimedCommissionUGX));

  return (
    <div className="px-5 py-3 space-y-4 pb-10">
      {/* Toast Notification */}
      {shareToast && (
        <div className="fixed top-16 left-1/2 -translate-x-1/2 z-50 bg-slate-900 text-white px-4 py-2.5 rounded-2xl shadow-xl border border-slate-700 text-[12.5px] font-bold flex items-center gap-2 animate-in fade-in slide-in-from-top-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>{shareToast}</span>
        </div>
      )}

      {/* Program Header & Status Bar */}
      <div className="flex items-center justify-between px-1">
        <div>
          <span className="text-[11px] font-extrabold uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" /> Partner Commission Program
          </span>
          <h1 className="text-[20px] font-black text-white tracking-tight mt-0.5">
            Referral Network
          </h1>
        </div>

        <button
          id="btn-refresh-referrals"
          onClick={handleManualRefresh}
          disabled={isRefreshing || isLoading}
          className="px-3 py-1.5 bg-[#131722] border border-amber-500/30 hover:bg-[#1A202E] text-amber-300 rounded-xl text-[12px] font-bold flex items-center gap-1.5 shadow-2xs transition-all cursor-pointer disabled:opacity-60"
          title="Refresh Supabase referral data"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-amber-400' : 'text-amber-400/80'}`} />
          <span>{isRefreshing ? 'Syncing...' : 'Sync'}</span>
        </button>
      </div>

      {/* MAIN HERO CARD: Dynamic Deposit Commission Rule */}
      <div className="relative overflow-hidden rounded-3xl bg-[#131722] p-5 text-white shadow-md border border-amber-500/30">
        <div className="relative z-10 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-extrabold uppercase tracking-wider bg-amber-500/15 px-2.5 py-1 rounded-full text-amber-300 flex items-center gap-1 border border-amber-500/30">
              <Percent className="w-3 h-3 text-amber-400" /> {referralRate}% Commission Rate
            </span>
            <span className="text-[11px] font-mono font-bold text-amber-300 bg-amber-500/15 px-2 py-0.5 rounded-full border border-amber-500/30">
              Approved Deposits Only
            </span>
          </div>

          <div>
            <h2 className="text-[18px] font-black tracking-tight leading-snug text-white">
              Earn {referralRate}% Commission on Every Approved Deposit
            </h2>
            <p className="text-[12px] text-amber-200/70 mt-1 leading-relaxed">
              When a user joins with your code and their deposit is approved by admin, {referralRate}% commission is earned and stored in your Available Commission balance until you claim it into your main wallet.
            </p>
          </div>

          {/* Quick Metrics Grid */}
          <div className="grid grid-cols-2 gap-2.5 pt-1">
            <div className="bg-[#0D1017] rounded-2xl p-3 border border-amber-500/20">
              <span className="text-[11px] text-amber-200/60 font-medium block">
                Total Referrals
              </span>
              <span className="text-[20px] font-black text-white font-mono mt-0.5 block">
                {isLoading ? '...' : totalReferralsCount}
              </span>
              <span className="text-[10px] text-amber-200/50 mt-0.5 block">
                Registered Partners
              </span>
            </div>

            <div className="bg-[#0D1017] rounded-2xl p-3 border border-amber-500/20">
              <span className="text-[11px] text-amber-200/60 font-medium block">
                All-Time Commission
              </span>
              <span className="text-[17px] font-black text-amber-400 font-mono mt-0.5 block truncate">
                {isLoading ? '...' : `UGX ${totalCommissionUGX.toLocaleString()}`}
              </span>
              <span className="text-[10px] text-amber-200/50 mt-0.5 block">
                Total {referralRate}% Generated
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* SEPARATE COMMISSION & CLAIM CARD */}
      <div className="bg-[#131722] rounded-3xl p-5 border border-amber-500/25 shadow-sm space-y-4">
        <div className="flex items-start justify-between">
          <div>
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-amber-200/60 block">
              Available Referral Commission
            </span>
            <div className="text-[26px] font-black text-amber-400 font-mono mt-1 tracking-tight flex items-baseline gap-1.5">
              <span className="text-amber-500">UGX</span>
              <span>{isLoading ? '...' : availableCommissionUGX.toLocaleString()}</span>
            </div>
          </div>

          <span
            className={`text-[11px] font-bold px-2.5 py-1 rounded-full border ${
              availableCommissionUGX > 0
                ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                : 'bg-[#1C2230] text-slate-400 border-amber-500/20'
            }`}
          >
            {availableCommissionUGX > 0 ? 'Ready to Claim' : 'UGX 0 Pending'}
          </span>
        </div>

        {/* Claim Feedback Banner */}
        {claimFeedback && (
          <div
            className={`p-3.5 rounded-2xl text-[12.5px] font-bold flex items-start gap-2.5 animate-in fade-in duration-150 ${
              claimFeedback.type === 'success'
                ? 'bg-emerald-950/40 text-emerald-300 border border-emerald-500/30'
                : 'bg-rose-950/40 text-rose-300 border border-rose-500/30'
            }`}
          >
            {claimFeedback.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
            )}
            <div className="flex-1 leading-snug">{claimFeedback.message}</div>
          </div>
        )}

        {/* Claim Commission Button */}
        <div className="space-y-2">
          <button
            id="btn-claim-referral-commission"
            onClick={handleClaimCommission}
            disabled={isClaiming || availableCommissionUGX <= 0 || isLoading}
            className={`w-full py-3.5 px-4 rounded-2xl font-black text-[14px] flex items-center justify-center gap-2 transition-all shadow-md cursor-pointer ${
              availableCommissionUGX > 0 && !isClaiming
                ? 'bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-amber-500/20 active:scale-98'
                : 'bg-[#1C2230] text-slate-500 border border-amber-500/15 cursor-not-allowed shadow-none'
            }`}
          >
            {isClaiming ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin text-amber-400" />
                <span>Claiming Commission...</span>
              </>
            ) : availableCommissionUGX > 0 ? (
              <>
                <ArrowDownToLine className="w-4.5 h-4.5 text-slate-950" />
                <span>Claim Commission (UGX {availableCommissionUGX.toLocaleString()})</span>
              </>
            ) : (
              <>
                <Coins className="w-4.5 h-4.5 text-slate-500" />
                <span>No Commission Available to Claim</span>
              </>
            )}
          </button>

          <p className="text-[11.5px] text-amber-200/60 text-center leading-relaxed">
            Commission remains separate until claimed. Claiming atomically adds the exact amount to your active wallet balance.
          </p>
        </div>

        {/* Summary Details Footer */}
        <div className="pt-3 border-t border-amber-500/20 grid grid-cols-2 gap-2 text-[11.5px]">
          <div className="bg-[#0D1017] rounded-xl p-2.5 border border-amber-500/20">
            <span className="text-amber-200/60 block">Total Claimed</span>
            <span className="font-bold text-white font-mono mt-0.5 block">
              UGX {claimedCommissionUGX.toLocaleString()}
            </span>
          </div>
          <div className="bg-[#0D1017] rounded-xl p-2.5 border border-amber-500/20">
            <span className="text-amber-200/60 block">Commission Rate</span>
            <span className="font-bold text-amber-400 font-mono mt-0.5 block">
              20% on Approved Dep.
            </span>
          </div>
        </div>
      </div>

      {/* Referral Code & Share Link Box */}
      <div className="bg-[#131722] rounded-3xl p-5 border border-amber-500/25 shadow-sm space-y-4">
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-[12px] font-bold text-amber-200/80 uppercase tracking-wider">
              Your Exclusive Referral Code
            </label>
            <span className="text-[11px] text-amber-400 font-bold flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5" /> Verified Unique
            </span>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex-1 bg-[#0D1017] border border-amber-500/30 rounded-2xl px-4 py-3 font-mono font-black text-[16px] text-amber-300 tracking-wider">
              {referralCode}
            </div>
            <button
              id="btn-copy-referral-code"
              onClick={handleCopyCode}
              className={`px-4 py-3 rounded-2xl font-bold text-[12.5px] transition-all flex items-center gap-1.5 cursor-pointer shadow-xs ${
                copiedCode
                  ? 'bg-amber-400 text-slate-950'
                  : 'bg-amber-500 hover:bg-amber-400 text-slate-950'
              }`}
            >
              {copiedCode ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              <span>{copiedCode ? 'Copied' : 'Copy'}</span>
            </button>
          </div>
        </div>

        <div>
          <label className="text-[12px] font-bold text-amber-200/80 uppercase tracking-wider mb-1.5 block">
            Your Invitation Link
          </label>
          <div className="bg-[#0D1017] border border-amber-500/30 rounded-2xl p-3 text-[12px] text-amber-200/80 font-mono break-all leading-tight">
            {referralUrl}
          </div>

          <div className="grid grid-cols-2 gap-2.5 mt-2.5">
            <button
              id="btn-copy-referral-link"
              onClick={handleCopyLink}
              className={`py-3 rounded-2xl font-bold text-[13px] transition-all flex items-center justify-center gap-1.5 border cursor-pointer ${
                copiedLink
                  ? 'bg-amber-500/20 border-amber-500/40 text-amber-300'
                  : 'bg-[#0D1017] border-amber-500/30 hover:bg-[#1A202E] text-amber-300'
              }`}
            >
              {copiedLink ? <Check className="w-4 h-4 text-amber-400" /> : <Copy className="w-4 h-4 text-amber-400" />}
              <span>{copiedLink ? 'Link Copied' : 'Copy Link'}</span>
            </button>

            <button
              id="btn-share-referral"
              onClick={handleNativeShare}
              className="py-3 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-[13px] rounded-2xl transition-all shadow-md shadow-amber-500/20 flex items-center justify-center gap-1.5 cursor-pointer active:scale-98"
            >
              <Share2 className="w-4 h-4" />
              <span>Share Invite</span>
            </button>
          </div>
        </div>
      </div>

      {/* Link Inviter Card (Retroactive referral recovery) */}
      <div className="bg-[#131722] rounded-3xl p-4 border border-amber-500/25 shadow-sm space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center font-bold">
              <Link2 className="w-4 h-4" />
            </div>
            <div>
              <h4 className="text-[13px] font-black text-white leading-snug">
                {user?.referredBy && user.referredBy !== 'SC-SOLNOVA'
                  ? 'Your Linked Inviter'
                  : 'Joined Without a Referral Code?'}
              </h4>
              <p className="text-[11px] text-amber-200/60">
                {user?.referredBy && user.referredBy !== 'SC-SOLNOVA'
                  ? `Connected to Partner: ${user.referredBy}`
                  : 'Link your friend’s referral code to join their partner team'}
              </p>
            </div>
          </div>

          {(!user?.referredBy || user.referredBy === 'SC-SOLNOVA') && (
            <button
              onClick={() => setShowLinkSection(!showLinkSection)}
              className="px-2.5 py-1 text-amber-400 hover:text-amber-300 text-[11px] font-bold flex items-center gap-1 rounded-lg hover:bg-amber-500/10 transition-colors cursor-pointer"
            >
              <span>{showLinkSection ? 'Hide' : 'Link Now'}</span>
              {showLinkSection ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>
          )}
        </div>

        {showLinkSection && (!user?.referredBy || user.referredBy === 'SC-SOLNOVA') && (
          <form onSubmit={handleLinkInviter} className="pt-2 border-t border-amber-500/20 space-y-2">
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={inviterInput}
                onChange={(e) => setInviterInput(e.target.value.toUpperCase())}
                placeholder="Enter Inviter Code (e.g. FV-B35B2A)"
                className="flex-1 px-3 py-2 bg-[#0D1017] border border-amber-500/30 rounded-xl text-xs font-mono uppercase text-white focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-400"
              />
              <button
                type="submit"
                disabled={isLinkingInviter || !inviterInput.trim()}
                className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-xl text-xs font-bold transition-all disabled:opacity-50 cursor-pointer"
              >
                {isLinkingInviter ? 'Linking...' : 'Connect'}
              </button>
            </div>

            {inviterFeedback && (
              <div
                className={`p-2 rounded-lg text-[11px] font-medium flex items-center gap-1.5 ${
                  inviterFeedback.type === 'success'
                    ? 'bg-emerald-950/40 text-emerald-300 border border-emerald-500/30'
                    : 'bg-rose-950/40 text-rose-300 border border-rose-500/30'
                }`}
              >
                {inviterFeedback.type === 'success' ? (
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                ) : (
                  <AlertCircle className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                )}
                <span>{inviterFeedback.message}</span>
              </div>
            )}
          </form>
        )}
      </div>

      {/* REFERRED PARTNERS LIST (SUPABASE BACKEND INTEGRATION) */}
      <div className="bg-[#131722] rounded-3xl p-5 border border-amber-500/25 shadow-sm space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-[14.5px] font-extrabold text-white flex items-center gap-2">
            <UserCheck className="w-4 h-4 text-amber-400" /> Referred Partners ({referredUsers.length})
          </h3>
          <button
            onClick={handleManualRefresh}
            disabled={isRefreshing}
            className="text-[11px] font-bold text-amber-400 hover:text-amber-300 flex items-center gap-1 cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`w-3 h-3 ${isRefreshing ? 'animate-spin' : ''}`} />
            <span>{isRefreshing ? 'Refreshing...' : 'Live Sync'}</span>
          </button>
        </div>

        {isLoading ? (
          <div className="py-8 text-center space-y-2">
            <div className="w-6 h-6 border-2 border-amber-500/20 border-t-amber-400 rounded-full animate-spin mx-auto" />
            <p className="text-[12px] text-amber-200/60 font-medium">Loading referred partners...</p>
          </div>
        ) : referredUsers.length === 0 ? (
          <div className="text-center py-6 px-4 bg-[#0D1017] rounded-2xl border border-amber-500/20 space-y-2">
            <Users className="w-8 h-8 text-amber-400/60 mx-auto" />
            <p className="text-[13px] font-bold text-white">
              No referrals yet
            </p>
            <p className="text-[11.5px] text-amber-200/60 max-w-xs mx-auto">
              Share your invitation link above. Newly registered partners will appear here immediately, and {referralRate}% commission is earned when their deposits are approved.
            </p>
            <button
              onClick={handleNativeShare}
              className="mt-2 px-4 py-2 bg-amber-500 text-slate-950 rounded-xl text-[12px] font-bold shadow-xs hover:bg-amber-400 transition-colors cursor-pointer"
            >
              Share Referral Code
            </button>
          </div>
        ) : (
          <div className="divide-y divide-amber-500/10">
            {referredUsers.map((partner, index) => {
              const approvedDeposit = Number(partner.approvedDepositUGX ?? 0);
              const commissionEarned = Number(partner.commissionUGX ?? 0);
              const hasDeposit = approvedDeposit > 0;

              return (
                <div key={partner.id || index} className="py-3.5 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="text-[11px] font-bold font-mono text-amber-200/60 shrink-0 w-5 text-right">
                      #{index + 1}
                    </span>
                    <div className="w-9 h-9 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30 font-black text-xs flex items-center justify-center shrink-0">
                      {partner.username.charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <h4 className="text-[13px] font-bold text-white leading-snug truncate">
                        @{partner.username}
                        {partner.fullName && (
                          <span className="text-amber-200/60 font-normal ml-1">({partner.fullName})</span>
                        )}
                      </h4>
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-amber-200/60 mt-0.5">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3 text-amber-400" /> Joined {partner.registeredDate || 'Recently'}
                        </span>
                        <span>•</span>
                        <span className="text-amber-200/70">
                          {hasDeposit ? (
                            <>Approved Dep: <span className="font-semibold text-white font-mono">UGX {approvedDeposit.toLocaleString()}</span></>
                          ) : (
                            <span className="text-amber-200/40 italic">No approved deposit</span>
                          )}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    {commissionEarned > 0 ? (
                      <span className="text-[13px] font-mono font-black text-amber-400 block">
                        +UGX {commissionEarned.toLocaleString()}
                      </span>
                    ) : (
                      <span className="text-[12px] font-medium text-amber-200/40 block font-mono">
                        UGX 0
                      </span>
                    )}
                    <span
                      className={`text-[9.5px] font-extrabold uppercase tracking-wider px-1.5 py-0.5 rounded inline-block mt-0.5 ${
                        hasDeposit
                          ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                          : 'bg-[#1C2230] text-slate-400'
                      }`}
                    >
                      {hasDeposit ? `${referralRate}% Commission` : 'Awaiting Deposit'}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Dynamic Commission Calculation Examples */}
      <div className="bg-[#131722] rounded-3xl p-5 border border-amber-500/25 shadow-xs space-y-2">
        <h3 className="text-[14.5px] font-extrabold text-white flex items-center gap-2">
          <Percent className="w-4 h-4 text-amber-400" /> {referralRate}% Deposit Commission Formula
        </h3>
        <p className="text-[12.5px] text-amber-200/70 leading-relaxed">
          Commission is calculated exclusively on administrator-approved deposits. Pending or rejected requests generate zero commission.
        </p>
        <div className="grid grid-cols-3 gap-2 pt-1.5 text-center text-[11px]">
          <div className="bg-[#0D1017] rounded-xl p-2.5 border border-amber-500/20 shadow-2xs">
            <span className="text-amber-200/60 block">UGX 15,000 Dep</span>
            <span className="font-black text-amber-400 block mt-0.5 font-mono">+UGX {Math.round(15000 * (referralRate / 100)).toLocaleString()}</span>
          </div>
          <div className="bg-[#0D1017] rounded-xl p-2.5 border border-amber-500/20 shadow-2xs">
            <span className="text-amber-200/60 block">UGX 50,000 Dep</span>
            <span className="font-black text-amber-400 block mt-0.5 font-mono">+UGX {Math.round(50000 * (referralRate / 100)).toLocaleString()}</span>
          </div>
          <div className="bg-[#0D1017] rounded-xl p-2.5 border border-amber-500/20 shadow-2xs">
            <span className="text-amber-200/60 block">UGX 100,000 Dep</span>
            <span className="font-black text-amber-400 block mt-0.5 font-mono">+UGX {Math.round(100000 * (referralRate / 100)).toLocaleString()}</span>
          </div>
        </div>
      </div>

      {/* How It Works Steps */}
      <div className="bg-[#131722] rounded-3xl p-5 border border-amber-500/25 shadow-xs space-y-4">
        <h3 className="text-[14.5px] font-extrabold text-white flex items-center gap-2">
          <Zap className="w-4 h-4 text-amber-400" /> Step-by-Step Flow
        </h3>

        <div className="space-y-3.5">
          <div className="flex items-start gap-3">
            <div className="w-7 h-7 rounded-full bg-amber-500/20 border border-amber-500/30 text-amber-300 font-extrabold text-[12px] flex items-center justify-center shrink-0 mt-0.5">
              1
            </div>
            <div>
              <h4 className="text-[13px] font-bold text-white leading-snug">
                Share Link or Code
              </h4>
              <p className="text-[12px] text-amber-200/60 mt-0.5 leading-relaxed">
                Send your unique referral code or link to friends.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="w-7 h-7 rounded-full bg-amber-500/20 border border-amber-500/30 text-amber-300 font-extrabold text-[12px] flex items-center justify-center shrink-0 mt-0.5">
              2
            </div>
            <div>
              <h4 className="text-[13px] font-bold text-white leading-snug">
                Friend Registers
              </h4>
              <p className="text-[12px] text-amber-200/60 mt-0.5 leading-relaxed">
                Signing up connects your accounts in Supabase. They appear in your Referred Partners list immediately.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="w-7 h-7 rounded-full bg-amber-500/20 border border-amber-500/30 text-amber-300 font-extrabold text-[12px] flex items-center justify-center shrink-0 mt-0.5">
              3
            </div>
            <div>
              <h4 className="text-[13px] font-bold text-white leading-snug">
                Deposit Verification
              </h4>
              <p className="text-[12px] text-amber-200/60 mt-0.5 leading-relaxed">
                Your friend submits a deposit via MoMo. Once an administrator approves it, {referralRate}% commission becomes available.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="w-7 h-7 rounded-full bg-amber-500/20 border border-amber-500/30 text-amber-300 font-extrabold text-[12px] flex items-center justify-center shrink-0 mt-0.5">
              4
            </div>
            <div>
              <h4 className="text-[13px] font-bold text-white leading-snug">
                Claim Into Main Balance
              </h4>
              <p className="text-[12px] text-amber-200/60 mt-0.5 leading-relaxed">
                Tap &quot;Claim Commission&quot; above to transfer your available commission directly into your active wallet balance.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Footer Info */}
      <div className="text-center pt-2 text-[11px] text-slate-500">
        FleetVest Referral Program • Supabase Cloud Verified
      </div>
    </div>
  );
};
