import React from 'react';
import { UserProfile } from '../types';
import { WHATSAPP_HELP_URL } from '../constants/links';
import {
  ShieldCheck,
  LogOut,
  ChevronRight,
  HelpCircle,
  CheckCircle2,
  Users,
  Lock,
  Globe,
  FileText,
  MessageCircle,
  ExternalLink
} from 'lucide-react';

interface MeProfileViewProps {
  user: UserProfile | null;
  onOpenAuth: () => void;
  onSignOut: () => void;
  onOpenSupport: () => void;
  onNavigateToReferral?: () => void;
  onOpenAdmin?: () => void;
}

export const MeProfileView: React.FC<MeProfileViewProps> = ({
  user,
  onOpenAuth,
  onSignOut,
  onOpenSupport,
  onNavigateToReferral,
  onOpenAdmin,
}) => {
  const isAdmin = Boolean(user?.isAdmin || user?.role === 'admin');

  return (
    <div className="px-5 py-3 space-y-4 pb-6">
      {/* Profile Card */}
      <div className="bg-[#131722] rounded-2xl p-4 border border-amber-500/25 shadow-sm flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-13 h-13 rounded-2xl bg-amber-500 text-slate-950 flex items-center justify-center font-extrabold text-[18px] shadow-sm">
            {user?.fullName ? user.fullName.charAt(0).toUpperCase() : 'U'}
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <h3 className="text-[16px] font-extrabold text-white leading-tight">
                {user?.fullName || 'Investor'}
              </h3>
              <ShieldCheck className="w-4 h-4 text-amber-400" />
            </div>
            <p className="text-[12px] text-amber-200/60 font-mono">
              @{user?.username || 'investor'}
            </p>
            <div className="flex items-center gap-1.5 mt-1 flex-wrap">
              {isAdmin ? (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3 text-amber-400" /> Authorized Admin
                </span>
              ) : (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-300 border border-amber-500/25 flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3 text-amber-400" /> UGX 4,000 Bonus Active
                </span>
              )}
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#1C2230] text-slate-300 border border-amber-500/20">
                {user?.tier || 'Standard'}
              </span>
            </div>
          </div>
        </div>

        <button
          onClick={onOpenAuth}
          className="text-[12px] font-bold text-amber-300 hover:text-amber-200 px-3 py-1.5 rounded-xl border border-amber-500/40 bg-[#161B26] hover:bg-[#1E2433] transition-colors cursor-pointer"
        >
          Switch Account
        </button>
      </div>

      {/* Referral Program Banner */}
      <div className="bg-[#131722] rounded-2xl p-4 border border-amber-500/25 shadow-sm flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-500 text-slate-950 flex items-center justify-center shrink-0 shadow-xs font-bold">
            <Users className="w-5 h-5 text-slate-950" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <h4 className="text-[13.5px] font-bold text-white leading-tight">
                Referral Program
              </h4>
              <span className="text-[9.5px] font-bold uppercase tracking-wider bg-amber-500/20 text-amber-300 border border-amber-500/30 px-1.5 py-0.2 rounded-full">
                Code: {user?.referralCode || 'FV-FLEET'}
              </span>
            </div>
            <p className="text-[11px] text-amber-200/70 mt-0.5">
              {user?.referralCount
                ? `${user.referralCount} referrals • UGX ${(user.referralEarningsUGX || 0).toLocaleString()} earned`
                : 'Invite partners and earn 20% commission on every deposit they make'}
            </p>
          </div>
        </div>

        {onNavigateToReferral && (
          <button
            onClick={onNavigateToReferral}
            className="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-xl text-[11px] font-extrabold shadow-xs transition-colors cursor-pointer flex items-center gap-1 shrink-0"
          >
            <span>View</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Settings Options for Normal Users */}
      <div className="bg-[#131722] rounded-2xl border border-amber-500/20 shadow-sm divide-y divide-amber-500/10 overflow-hidden">
        {/* If user is an authenticated administrator, allow switching to the Admin Dashboard */}
        {isAdmin && onOpenAdmin && (
          <button
            onClick={onOpenAdmin}
            className="w-full px-4 py-3.5 flex items-center justify-between hover:bg-[#1A202E] transition-colors cursor-pointer text-left bg-amber-500/10"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center">
                <ShieldCheck className="w-4 h-4" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[13px] font-bold text-amber-300 block">
                    Admin Master Console
                  </span>
                  <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.2 rounded bg-amber-500 text-slate-950">
                    Root
                  </span>
                </div>
                <span className="text-[11px] text-amber-200/60">Pending deposits, withdrawals and fleet operations</span>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-amber-400" />
          </button>
        )}

        {onNavigateToReferral && (
          <button
            onClick={onNavigateToReferral}
            className="w-full px-4 py-3.5 flex items-center justify-between hover:bg-[#1A202E] transition-colors cursor-pointer text-left"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-amber-500/15 text-amber-400 border border-amber-500/25 flex items-center justify-center">
                <Users className="w-4 h-4" />
              </div>
              <div>
                <span className="text-[13px] font-bold text-white block">
                  My Referral Network & Links
                </span>
                <span className="text-[11px] text-amber-200/60">Share your link and earn UGX commissions</span>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-amber-400/60" />
          </button>
        )}

        <a
          id="btn-whatsapp-profile-option"
          href={WHATSAPP_HELP_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="w-full px-4 py-3.5 flex items-center justify-between hover:bg-emerald-950/20 transition-colors cursor-pointer text-left group"
        >
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center">
              <MessageCircle className="w-4 h-4 fill-emerald-500/20" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-[13px] font-bold text-white block">
                  Official WhatsApp Helpdesk
                </span>
                <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  Live
                </span>
              </div>
              <span className="text-[11px] text-emerald-300/80 font-medium">Direct support, verification & community</span>
            </div>
          </div>
          <ExternalLink className="w-4 h-4 text-emerald-400 group-hover:translate-x-0.5 transition-transform" />
        </a>

        <button
          onClick={onOpenSupport}
          className="w-full px-4 py-3.5 flex items-center justify-between hover:bg-[#1A202E] transition-colors cursor-pointer text-left"
        >
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-amber-500/15 text-amber-400 border border-amber-500/25 flex items-center justify-center">
              <HelpCircle className="w-4 h-4" />
            </div>
            <div>
              <span className="text-[13px] font-bold text-white block">
                Fleet Support Desk
              </span>
              <span className="text-[11px] text-amber-200/60">Direct technical and transaction support</span>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-amber-400/60" />
        </button>

        <div className="w-full px-4 py-3.5 flex items-center justify-between text-left">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-amber-500/15 text-amber-400 border border-amber-500/25 flex items-center justify-center">
              <Globe className="w-4 h-4" />
            </div>
            <div>
              <span className="text-[13px] font-bold text-white block">
                Operating Currency & Region
              </span>
              <span className="text-[11px] text-amber-200/60">Uganda (UGX Logistics Network)</span>
            </div>
          </div>
        </div>

        <button
          onClick={onSignOut}
          className="w-full px-4 py-3.5 flex items-center justify-between hover:bg-rose-950/20 transition-colors cursor-pointer text-left text-rose-400"
        >
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-rose-500/20 text-rose-400 border border-rose-500/30 flex items-center justify-center">
              <LogOut className="w-4 h-4" />
            </div>
            <span className="text-[13px] font-bold">Sign Out</span>
          </div>
          <ChevronRight className="w-4 h-4 text-rose-400/60" />
        </button>
      </div>

      {/* Footer Info */}
      <div className="text-center pt-2 text-[11px] text-slate-500">
        FleetVest • Asset-Backed Transport & Logistics Platform
      </div>
    </div>
  );
};
