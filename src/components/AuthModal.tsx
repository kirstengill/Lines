import React, { useState } from 'react';
import { X, Lock, User, KeyRound, Check, Gift, Users } from 'lucide-react';
import { authService, UserAccountData } from '../services/supabaseAuth';
import { UserProfile } from '../types';

interface AuthModalProps {
  onClose: () => void;
  onAuthSuccess: (user: UserProfile, data?: UserAccountData) => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ onClose, onAuthSuccess }) => {
  const [tab, setTab] = useState<'signin' | 'signup'>('signin');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [referralCode, setReferralCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
      <div className="bg-white rounded-3xl w-full max-w-md overflow-hidden shadow-2xl border border-slate-100 flex flex-col animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-white">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center">
              <Lock className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-[17px] font-extrabold text-[#0F172A] leading-tight">
                Account Access
              </h3>
              <p className="text-[11px] text-slate-500">
                SolNova Capital · Solar Mining & Investment
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

        {/* Tab switch */}
        <div className="grid grid-cols-2 border-b border-slate-100 bg-slate-50/70 p-1 m-4 rounded-xl gap-1">
          <button
            onClick={() => {
              setTab('signin');
              setErrorMsg('');
            }}
            className={`py-2 text-[12px] font-bold rounded-lg transition-all cursor-pointer ${
              tab === 'signin'
                ? 'bg-white text-[#1657D9] shadow-xs'
                : 'text-slate-500 hover:text-slate-800'
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
                ? 'bg-white text-[#1657D9] shadow-xs'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            Sign Up (Get UGX 4,000)
          </button>
        </div>

        {/* Form */}
        <div className="px-5 pb-5">
          {errorMsg && (
            <div className="mb-3 p-2.5 bg-red-50 text-red-700 text-xs rounded-xl font-medium border border-red-200">
              {errorMsg}
            </div>
          )}
          {successMsg && (
            <div className="mb-3 p-2.5 bg-emerald-50 text-emerald-700 text-xs rounded-xl font-medium border border-emerald-200 flex items-center gap-1.5">
              <Check className="w-4 h-4" /> {successMsg}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-3">
            {tab === 'signup' && (
              <>
                <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-2.5 flex items-center gap-2">
                  <Gift className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span className="text-[11px] font-bold text-emerald-950">
                    UGX 4,000 Welcome Credit credited immediately upon registration.
                  </span>
                </div>
                <div>
                  <label className="text-[12px] font-semibold text-slate-700 mb-1 block">
                    Full Legal Name
                  </label>
                  <div className="relative">
                    <User className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      required
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="e.g. Sarah Namubiru"
                      className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
                    />
                  </div>
                </div>
              </>
            )}

            <div>
              <label className="text-[12px] font-semibold text-slate-700 mb-1 block">
                Username
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Enter your username"
                  className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
                />
              </div>
            </div>

            <div>
              <label className="text-[12px] font-semibold text-slate-700 mb-1 block">
                Password
              </label>
              <div className="relative">
                <KeyRound className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={tab === 'signup' ? 'Minimum 6 characters' : '••••••••••••'}
                  className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
                />
              </div>
            </div>

            {tab === 'signup' && (
              <div>
                <label className="text-[12px] font-semibold text-slate-700 mb-1 block">
                  Confirm Password
                </label>
                <div className="relative">
                  <KeyRound className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="password"
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Re-type your password"
                    className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
                  />
                </div>
              </div>
            )}

            {tab === 'signup' && (
              <div>
                <label className="text-[12px] font-semibold text-slate-700 mb-1 flex items-center gap-1">
                  <Users className="w-3.5 h-3.5 text-blue-600" /> Referral Code (Optional)
                </label>
                <input
                  type="text"
                  value={referralCode}
                  onChange={(e) => setReferralCode(e.target.value.toUpperCase())}
                  placeholder="e.g. SC-8F3K9P"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-mono uppercase focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 mt-2 bg-[#1657D9] hover:bg-blue-700 active:scale-98 text-white font-bold text-[14px] rounded-xl transition-all shadow-xs disabled:opacity-50 cursor-pointer"
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
