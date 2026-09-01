import React from 'react';
import { Bell, LogIn, MessageCircle } from 'lucide-react';
import { AppNotification, UserProfile } from '../types';
import { WHATSAPP_HELP_URL } from '../constants/links';

interface TopHeaderProps {
  notifications: AppNotification[];
  user?: UserProfile | null;
  onOpenNotifications: () => void;
  onOpenAdmin: () => void;
  onOpenAuth?: () => void;
}

export const TopHeader: React.FC<TopHeaderProps> = ({
  notifications,
  user,
  onOpenNotifications,
  onOpenAuth,
}) => {
  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <header className="px-5 pt-3 pb-2 flex items-center justify-between bg-transparent">
      {/* Brand & Logo */}
      <div className="flex items-center gap-2.5">
        {/* SolNova brand mark: golden sun with energy bolt */}
        <div className="relative flex items-center justify-center w-9 h-9 rounded-xl bg-gradient-to-br from-[#312E81] via-[#1E40AF] to-[#2563EB] shadow-md shadow-indigo-500/25">
          <svg viewBox="0 0 24 24" className="w-5.5 h-5.5" aria-hidden="true">
            <defs>
              <linearGradient id="snSunHdr" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0" stopColor="#FDE68A" />
                <stop offset="1" stopColor="#F59E0B" />
              </linearGradient>
            </defs>
            <circle cx="12" cy="12" r="7.5" fill="none" stroke="#FBBF24" strokeOpacity="0.4" strokeWidth="1" />
            <circle cx="12" cy="12" r="4.8" fill="url(#snSunHdr)" />
            <path d="M12.9 7.5 l-3.1 5.1 h2.2 l-0.9 3.7 l3.1 -5.1 h-2.2 z" fill="#FFFBEB" />
          </svg>
        </div>

        <div className="flex flex-col">
          <h1 className="text-[17px] font-extrabold tracking-tight text-[#0F172A] leading-tight">
            SolNova Capital
          </h1>
          <span className="text-[9.5px] font-bold uppercase tracking-wider text-slate-400 leading-none mt-0.5">
            Solar Mining & Investment
          </span>
        </div>
      </div>

      {/* Action Icons */}
      <div className="flex items-center gap-1.5">
        {/* WhatsApp Help Option */}
        <a
          id="btn-whatsapp-header"
          href={WHATSAPP_HELP_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-700 border border-emerald-500/30 transition-all text-[11px] font-bold shadow-2xs active:scale-95"
          title="Direct WhatsApp Help & Support"
        >
          <MessageCircle className="w-3.5 h-3.5 text-emerald-600 fill-emerald-600/20" />
          <span className="hidden sm:inline">WhatsApp</span>
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
        </a>

        {onOpenAuth && (
          <button
            onClick={onOpenAuth}
            className="p-1.5 text-slate-700 hover:text-slate-900 rounded-full hover:bg-slate-200/60 transition-colors flex items-center justify-center cursor-pointer"
            title={user ? `Signed in as ${user.fullName}` : 'Sign In / Register'}
          >
            {user ? (
              <div className="w-6 h-6 rounded-full bg-blue-600 text-white font-bold text-[11px] flex items-center justify-center shadow-xs">
                {user.fullName ? user.fullName.charAt(0).toUpperCase() : 'U'}
              </div>
            ) : (
              <LogIn className="w-4 h-4 text-blue-600" />
            )}
          </button>
        )}

        <button
          id="btn-notifications"
          onClick={onOpenNotifications}
          aria-label="View notifications"
          className="relative p-1.5 text-slate-700 hover:text-slate-900 rounded-full hover:bg-slate-200/60 transition-colors cursor-pointer"
        >
          <Bell className="w-5 h-5" />
          {unreadCount > 0 && (
            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full ring-2 ring-white"></span>
          )}
        </button>
      </div>
    </header>
  );
};

