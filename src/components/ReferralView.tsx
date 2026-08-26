import React, { useState } from 'react';
import {
  Users,
  Copy,
  Check,
  Share2,
  Gift,
  Award,
  Sparkles,
  ArrowRight,
  TrendingUp,
  ShieldCheck,
  ChevronRight,
  Zap,
  CheckCircle2,
  Clock,
  UserCheck
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { UserProfile } from '../types';

interface ReferralViewProps {
  user: UserProfile | null;
  onOpenAuth?: () => void;
}

export const ReferralView: React.FC<ReferralViewProps> = ({ user }) => {
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [shareToast, setShareToast] = useState('');

  const referralCode = user?.referralCode || 'SC-SUNRISE';

  // Construct dynamic referral URL based on the current window location
  const getReferralUrl = (): string => {
    if (typeof window === 'undefined') return `https://sunrisecapital.ug/?ref=${referralCode}`;
    const base = `${window.location.origin}${window.location.pathname}`;
    // Strip trailing slash if present
    const cleanBase = base.endsWith('/') ? base.slice(0, -1) : base;
    return `${cleanBase}?ref=${referralCode}`;
  };

  const referralUrl = getReferralUrl();

  const handleCopyCode = async () => {
    try {
      await navigator.clipboard.writeText(referralCode);
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2000);
    } catch (err) {
      // Fallback
    }
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(referralUrl);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    } catch (err) {
      // Fallback
    }
  };

  const handleNativeShare = async () => {
    const shareData = {
      title: 'Sunrise Capital - Clean Energy & DS Mining Platform',
      text: `Join Sunrise Capital with my invitation code ${referralCode} and claim your UGX 4,000 welcome credit immediately!`,
      url: referralUrl,
    };

    if (navigator.share && navigator.canShare && navigator.canShare(shareData)) {
      try {
        await navigator.share(shareData);
        confetti({ particleCount: 40, spread: 50, origin: { y: 0.7 } });
      } catch (err: any) {
        if (err.name !== 'AbortError') {
          // If share rejected or failed, fallback to copy
          handleCopyLink();
          setShareToast('Referral link copied to clipboard!');
          setTimeout(() => setShareToast(''), 2500);
        }
      }
    } else {
      // Fallback to clipboard
      await handleCopyLink();
      confetti({ particleCount: 30, spread: 45 });
      setShareToast('Referral link copied! Share with your contacts.');
      setTimeout(() => setShareToast(''), 2500);
    }
  };

  const referralCount = user?.referralCount || 0;
  const referralEarningsUGX = user?.referralEarningsUGX || 0;
  const referralsList = user?.referrals || [];

  return (
    <div className="px-5 py-3 space-y-4 pb-6">
      {/* Toast Notification */}
      {shareToast && (
        <div className="fixed top-16 left-1/2 -translate-x-1/2 z-50 bg-slate-900 text-white px-4 py-2.5 rounded-2xl shadow-xl border border-slate-700 text-[12.5px] font-bold flex items-center gap-2 animate-in fade-in slide-in-from-top-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>{shareToast}</span>
        </div>
      )}

      {/* Hero Card */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#1657D9] via-[#1E40AF] to-[#0F172A] p-5 text-white shadow-md">
        {/* Ambient background blur elements */}
        <div className="absolute -top-12 -right-12 w-36 h-36 bg-blue-400/20 rounded-full blur-2xl pointer-events-none" />
        <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-amber-400/15 rounded-full blur-2xl pointer-events-none" />

        <div className="relative z-10 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-extrabold uppercase tracking-wider bg-white/15 backdrop-blur-md px-2.5 py-1 rounded-full text-amber-300 flex items-center gap-1 border border-white/10">
              <Sparkles className="w-3 h-3 text-amber-300" /> Sovereign Partner Program
            </span>
            <span className="text-[11px] font-mono text-blue-200">
              Tier 1 Commission Active
            </span>
          </div>

          <div>
            <h2 className="text-[19px] font-black tracking-tight leading-tight">
              Invite Mining Partners, Earn Continuous UGX Yields
            </h2>
            <p className="text-[12.5px] text-blue-100/90 mt-1 leading-relaxed">
              Every invited member automatically receives <span className="font-bold text-white">UGX 4,000</span> welcome balance. You earn real-time referral rewards directly to your wallet.
            </p>
          </div>

          {/* Quick Metrics Grid */}
          <div className="grid grid-cols-2 gap-2.5 pt-1">
            <div className="bg-white/10 backdrop-blur-md rounded-2xl p-3 border border-white/10">
              <span className="text-[11px] text-blue-200 font-medium block">
                Total Partners Joined
              </span>
              <span className="text-[19px] font-black text-white font-mono mt-0.5 block">
                {referralCount}
              </span>
            </div>
            <div className="bg-white/10 backdrop-blur-md rounded-2xl p-3 border border-white/10">
              <span className="text-[11px] text-blue-200 font-medium block">
                Referral Yield Earned
              </span>
              <span className="text-[16px] font-black text-emerald-300 font-mono mt-0.5 block truncate">
                UGX {referralEarningsUGX.toLocaleString()}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Referral Code & Link Box */}
      <div className="bg-white rounded-3xl p-5 border border-slate-100 shadow-xs space-y-4">
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-[12px] font-bold text-slate-700 uppercase tracking-wider">
              Your Exclusive Referral Code
            </label>
            <span className="text-[11px] text-emerald-600 font-bold flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5" /> Verified Unique
            </span>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex-1 bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 font-mono font-black text-[16px] text-slate-900 tracking-wider">
              {referralCode}
            </div>
            <button
              id="btn-copy-referral-code"
              onClick={handleCopyCode}
              className={`px-4 py-3 rounded-2xl font-bold text-[12.5px] transition-all flex items-center gap-1.5 cursor-pointer shadow-xs ${
                copiedCode
                  ? 'bg-emerald-600 text-white'
                  : 'bg-[#1657D9] hover:bg-blue-700 text-white'
              }`}
            >
              {copiedCode ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              <span>{copiedCode ? 'Copied' : 'Copy'}</span>
            </button>
          </div>
        </div>

        <div>
          <label className="text-[12px] font-bold text-slate-700 uppercase tracking-wider mb-1.5 block">
            Your Invitation Link
          </label>
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3 text-[12px] text-slate-600 font-mono break-all leading-tight">
            {referralUrl}
          </div>
          
          <div className="grid grid-cols-2 gap-2.5 mt-2.5">
            <button
              id="btn-copy-referral-link"
              onClick={handleCopyLink}
              className={`py-3 rounded-2xl font-bold text-[13px] transition-all flex items-center justify-center gap-1.5 border cursor-pointer ${
                copiedLink
                  ? 'bg-emerald-50 border-emerald-300 text-emerald-700'
                  : 'bg-slate-50 border-slate-200 hover:bg-slate-100 text-slate-700'
              }`}
            >
              {copiedLink ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4 text-slate-500" />}
              <span>{copiedLink ? 'Link Copied' : 'Copy Link'}</span>
            </button>

            <button
              id="btn-share-referral"
              onClick={handleNativeShare}
              className="py-3 bg-gradient-to-r from-[#1657D9] to-[#2563EB] hover:from-blue-700 hover:to-blue-800 text-white font-extrabold text-[13px] rounded-2xl transition-all shadow-md shadow-blue-600/20 flex items-center justify-center gap-1.5 cursor-pointer active:scale-98"
            >
              <Share2 className="w-4 h-4" />
              <span>Share Invite</span>
            </button>
          </div>
        </div>
      </div>

      {/* How It Works Section */}
      <div className="bg-white rounded-3xl p-5 border border-slate-100 shadow-xs space-y-4">
        <h3 className="text-[14.5px] font-extrabold text-slate-900 flex items-center gap-2">
          <Zap className="w-4 h-4 text-amber-500" /> How the Referral Program Works
        </h3>

        <div className="space-y-3.5">
          {/* Step 1 */}
          <div className="flex items-start gap-3">
            <div className="w-7 h-7 rounded-full bg-blue-100 text-blue-700 font-extrabold text-[12px] flex items-center justify-center shrink-0 mt-0.5">
              1
            </div>
            <div>
              <h4 className="text-[13px] font-bold text-slate-900 leading-snug">
                Share Your Link or Code
              </h4>
              <p className="text-[12px] text-slate-500 mt-0.5 leading-relaxed">
                Send your unique referral link to prospective mining investors via WhatsApp, SMS, or Telegram.
              </p>
            </div>
          </div>

          {/* Step 2 */}
          <div className="flex items-start gap-3">
            <div className="w-7 h-7 rounded-full bg-emerald-100 text-emerald-700 font-extrabold text-[12px] flex items-center justify-center shrink-0 mt-0.5">
              2
            </div>
            <div>
              <h4 className="text-[13px] font-bold text-slate-900 leading-snug">
                Partner Claims UGX 4,000 Welcome Credit
              </h4>
              <p className="text-[12px] text-slate-500 mt-0.5 leading-relaxed">
                When your contact signs up with your link, their account is instantly linked to you and credited with UGX 4,000.
              </p>
            </div>
          </div>

          {/* Step 3 */}
          <div className="flex items-start gap-3">
            <div className="w-7 h-7 rounded-full bg-amber-100 text-amber-800 font-extrabold text-[12px] flex items-center justify-center shrink-0 mt-0.5">
              3
            </div>
            <div>
              <h4 className="text-[13px] font-bold text-slate-900 leading-snug">
                Earn Direct UGX Hash Rewards
              </h4>
              <p className="text-[12px] text-slate-500 mt-0.5 leading-relaxed">
                Receive instant UGX referral bonuses for every activated partner, deposited directly to your consolidated wallet.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Referred Partners List */}
      <div className="bg-white rounded-3xl p-5 border border-slate-100 shadow-xs space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-[14.5px] font-extrabold text-slate-900 flex items-center gap-2">
            <UserCheck className="w-4 h-4 text-emerald-600" /> Referred Partners ({referralsList.length})
          </h3>
          <span className="text-[11px] font-bold text-slate-400">
            Real-Time Sync
          </span>
        </div>

        {referralsList.length === 0 ? (
          <div className="text-center py-6 px-4 bg-slate-50 rounded-2xl border border-slate-200/70 space-y-2">
            <Users className="w-8 h-8 text-slate-400 mx-auto" />
            <p className="text-[13px] font-bold text-slate-700">
              No partners joined yet
            </p>
            <p className="text-[11.5px] text-slate-500 max-w-xs mx-auto">
              Share your link above to invite your first partner and begin earning sovereign mining bonuses.
            </p>
            <button
              onClick={handleNativeShare}
              className="mt-2 px-4 py-2 bg-[#1657D9] text-white rounded-xl text-[12px] font-bold shadow-xs hover:bg-blue-700 transition-colors cursor-pointer"
            >
              Share Referral Code
            </button>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {referralsList.map((partner) => (
              <div key={partner.id} className="py-3 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 font-bold text-xs flex items-center justify-center">
                    {partner.username.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <h4 className="text-[13px] font-bold text-slate-900 leading-snug">
                      @{partner.username}
                    </h4>
                    <span className="text-[11px] text-slate-400 flex items-center gap-1">
                      <Clock className="w-3 h-3" /> {partner.registeredDate}
                    </span>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-[12.5px] font-mono font-bold text-emerald-600 block">
                    +UGX {partner.rewardUGX.toLocaleString()}
                  </span>
                  <span className="text-[10px] font-bold uppercase tracking-wider bg-emerald-100 text-emerald-800 px-1.5 py-0.2 rounded">
                    {partner.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer Info */}
      <div className="text-center pt-2 text-[11px] text-slate-400">
        Sunrise Capital Partner Protocol • Uganda (UGX Sovereign)
      </div>
    </div>
  );
};
