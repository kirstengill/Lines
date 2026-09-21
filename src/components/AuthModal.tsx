import React, { useState, useEffect } from 'react';
import { X, Lock, User, KeyRound, Check, Gift, Users, ShieldCheck } from 'lucide-react';
import { authService, UserAccountData, cleanReferralCode } from '../services/supabaseAuth';
import { UserProfile } from '../types';

interface AuthModalProps {
  onClose: () => void;
  onAuthSuccess: (user: UserProfile, data?: UserAccountData) => void;
  initialReferralCode?: string;
}

export const AuthModal: React.FC<AuthModalProps> = ({ onClose, onAuthSuccess, initialReferralCode }) => {
  const [tab, setTab] = useState<'signin' | 'signup'>(() => {
    if (initialReferralCode) return 'signup';
    if (typeof window !== 'undefined') {
      try {
        const search = new URLSearchParams(window.location.search);
        if (search.get('ref') || search.get('referral')) return 'signup';
      } catch {}
    }
    return 'signin';
  });

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [referralCode, setReferralCode] = useState(() => {
    if (initialReferralCode) return cleanReferralCode(initialReferralCode);
    if (typeof window !== 'undefined') {
      try {
        const search = new URLSearchParams(window.location.search);
        const urlRef = search.get('ref') || search.get('referral');
        if (urlRef) {
          const cleaned = cleanReferralCode(urlRef);
          if (cleaned) {
            localStorage.setItem('pending_referral_code', cleaned);
            return cleaned;
          }
        }
        const cached = localStorage.getItem('pending_referral_code');
        if (cached) return cleanReferralCode(cached);
      } catch {}
    }
    return '';
  });

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Sync if initialReferralCode changes
  useEffect(() => {
    if (initialReferralCode) {
      const clean = cleanReferralCode(initialReferralCode);
      if (clean) {
        setReferralCode(clean);
        setTab('signup');
        try {
          localStorage.setItem('pending_referral_code', clean);
        } catch {}
      }
    }
  }, [initialReferralCode]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    const cleanUsername = username.trim();
    if (!cleanUsername) {
      setErrorMsg('Username is required.');
      return;
    }

    if (tab === 'signin') {
      if (!password) {
        setErrorMsg('Password is required.');
        return;
      }
      setLoading(true);
      try {
        const res = await authService.signInWithPassword(cleanUsername, password);
        if (res.error) {
          setErrorMsg(res.error);
        } else {
          onAuthSuccess(res.user, res.data);
          onClose();
        }
      } catch (err: any) {
        setErrorMsg(err.message || 'Authentication failed');
      } finally {
        setLoading(false);
      }
    } else if (tab === 'signup') {
      if (cleanUsername.length < 3) {
        setErrorMsg('Username must be at least 3 characters.');
        return;
      }
      if (!password || password.length < 6) {
        setErrorMsg('Password must be at least 6 characters.');
        return;
      }
      if (password !== confirmPassword) {
        setErrorMsg('Passwords do not match. Please re-enter.');
        return;
      }
      setLoading(true);
      try {
        const res = await authService.signUp(
          cleanUsername,
          password,
          (fullName || cleanUsername).trim(),
          undefined,
          referralCode.trim()
        );
        if (res.error) {
          setErrorMsg(res.error);
        } else if (res.needsConfirmation) {
          setErrorMsg('Account created! Please confirm your account, then sign in.');
        } else {
          onAuthSuccess(res.user!, res.data);
          onClose();
        }
      } catch (err: any) {
        setErrorMsg(err.message || 'Authentication failed');
      } finally {
        setLoading(false);
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs animate-in fade-in">
      <div className="bg-[#131722] rounded-3xl w-full max-w-md overflow-hidden shadow-2xl border border-amber-500/25 flex flex-col animate-in zoom-in-95 duration-200 text-slate-100">
        {/* Header */}
        <div className="p-5 border-b border-amber-500/20 flex items-center justify-between bg-[#0D1017]">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-400 flex items-center justify-center">
              <Lock className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-[17px] font-extrabold text-amber-200 leading-tight">
                Account Access
              </h3>
              <p className="text-[11px] text-amber-200/60">
                FleetVest · Transport & Logistics Investment
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full text-slate-400 hover:text-amber-300 hover:bg-amber-500/10 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab switch */}
        <div className="grid grid-cols-2 border border-amber-500/20 bg-[#0D1017] p-1 m-4 rounded-xl gap-1">
          <button
            onClick={() => {
              setTab('signin');
              setErrorMsg('');
            }}
            className={`py-2 text-[12px] font-bold rounded-lg transition-all cursor-pointer ${
              tab === 'signin'
                ? 'bg-amber-500 text-slate-950 font-black shadow-md shadow-amber-500/20'
                : 'text-slate-400 hover:text-amber-200'
            }`}
          >
            Sign In
          </button>
          <button
            onClick={() => {
              setTab('signup');
              setErrorMsg('');
            }}
            className={`py-2 text-[12px] font-bold rounded-lg transition-all cursor-pointer ${
              tab === 'signup'
                ? 'bg-amber-500 text-slate-950 font-black shadow-md shadow-amber-500/20'
                : 'text-slate-400 hover:text-amber-200'
            }`}
          >
            Sign Up (UGX 4,000 Bonus)
          </button>
        </div>

        {/* Form */}
        <div className="px-5 pb-5">
          {errorMsg && (
            <div className="mb-3 p-2.5 bg-red-950/40 text-red-300 text-xs rounded-xl font-medium border border-red-500/40">
              {errorMsg}
            </div>
          )}
          {successMsg && (
            <div className="mb-3 p-2.5 bg-emerald-950/40 text-emerald-300 text-xs rounded-xl font-medium border border-emerald-500/40 flex items-center gap-1.5">
              <Check className="w-4 h-4" /> {successMsg}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-3">
            {tab === 'signup' && (
              <>
                <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-2.5 flex items-center gap-2">
                  <Gift className="w-4 h-4 text-amber-400 shrink-0" />
                  <span className="text-[11px] font-bold text-amber-200">
                    UGX 4,000 Welcome Bonus is reserved and unlocks with 0% fee upon your first approved deposit.
                  </span>
                </div>
                <div>
                  <label className="text-[12px] font-semibold text-amber-200/80 mb-1 block">
                    Full Legal Name
                  </label>
                  <div className="relative">
                    <User className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      required
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="e.g. Sarah Namubiru"
                      className="w-full pl-9 pr-3 py-2 bg-[#0D1017] border border-amber-500/25 rounded-xl text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                    />
                  </div>
                </div>
              </>
            )}

            <div>
              <label className="text-[12px] font-semibold text-amber-200/80 mb-1 block">
                Username
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Enter your username"
                  className="w-full pl-9 pr-3 py-2 bg-[#0D1017] border border-amber-500/25 rounded-xl text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                />
              </div>
            </div>

            <div>
              <label className="text-[12px] font-semibold text-amber-200/80 mb-1 block">
                Password
              </label>
              <div className="relative">
                <KeyRound className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={tab === 'signup' ? 'Minimum 6 characters' : '••••••••••••'}
                  className="w-full pl-9 pr-3 py-2 bg-[#0D1017] border border-amber-500/25 rounded-xl text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                />
              </div>
            </div>

            {tab === 'signup' && (
              <div>
                <label className="text-[12px] font-semibold text-amber-200/80 mb-1 block">
                  Confirm Password
                </label>
                <div className="relative">
                  <KeyRound className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="password"
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Re-type your password"
                    className="w-full pl-9 pr-3 py-2 bg-[#0D1017] border border-amber-500/25 rounded-xl text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                  />
                </div>
              </div>
            )}

            {tab === 'signup' && (
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-[12px] font-semibold text-amber-200/80 flex items-center gap-1">
                    <Users className="w-3.5 h-3.5 text-amber-400" /> Referral Code (Optional)
                  </label>
                  {referralCode && (
                    <span className="text-[10px] font-bold text-amber-300 bg-amber-500/20 px-1.5 py-0.5 rounded border border-amber-500/30 flex items-center gap-0.5">
                      <ShieldCheck className="w-3 h-3" /> Inviter Linked
                    </span>
                  )}
                </div>
                <input
                  type="text"
                  value={referralCode}
                  onChange={(e) => setReferralCode(cleanReferralCode(e.target.value) || e.target.value.toUpperCase())}
                  placeholder="e.g. FV-8F3K9P"
                  className="w-full px-3 py-2 bg-[#0D1017] border border-amber-500/25 rounded-xl text-sm font-mono uppercase text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                />
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 mt-2 bg-amber-500 hover:bg-amber-400 active:scale-98 text-slate-950 font-black text-[14px] rounded-xl transition-all shadow-md shadow-amber-500/20 disabled:opacity-50 cursor-pointer"
            >
              {loading
                ? 'Processing...'
                : tab === 'signin'
                ? 'Sign In to Dashboard'
                : 'Create Account & Claim UGX 4,000'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
