import React from 'react';
import { Bell, ChevronRight, User as UserIcon, Shield } from 'lucide-react';
import { AppNotification, UserProfile } from '../types';
import { FleetVestLogo } from './FleetVestLogo';

interface TopHeaderProps {
  notifications: AppNotification[];
  user?: UserProfile | null;
  onOpenNotifications: () => void;
  onOpenAdmin: () => void;
  onOpenAuth?: () => void;
  onOpenProfile?: () => void;
}

export const TopHeader: React.FC<TopHeaderProps> = ({
  notifications,
  user,
  onOpenNotifications,
  onOpenAdmin,
  onOpenAuth,
  onOpenProfile,
}) => {
  const unreadCount = notifications.filter((n) => !n.read).length;
  const isAdmin = Boolean(user?.isAdmin);

  return (
    <header className="px-4 sm:px-6 pt-3.5 pb-2.5 flex items-center justify-between bg-[#0D1017]/90 backdrop-blur-md border-b border-amber-500/20 sticky top-0 z-30">
      {/* FleetVest Brand */}
      <FleetVestLogo variant="light" size="sm" />

      {/* Action Icons & Profile */}
      <div className="flex items-center gap-2">
        {isAdmin && (
          <button
            onClick={onOpenAdmin}
            id="btn-admin-console-header"
            className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-500/15 text-amber-300 hover:bg-amber-500/25 border border-amber-500/30 text-xs font-bold cursor-pointer transition-colors"
            title="Administrator Control Center"
          >
            <Shield className="w-3.5 h-3.5 text-amber-400" />
            <span className="hidden sm:inline">Admin</span>
          </button>
        )}

        {/* Notifications */}
        <button
          id="btn-notifications"
          onClick={onOpenNotifications}
          aria-label="View notifications"
          className="relative p-2 text-slate-300 hover:text-amber-300 rounded-full hover:bg-amber-500/10 transition-colors cursor-pointer"
        >
          <Bell className="w-5 h-5" />
          {unreadCount > 0 && (
            <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 bg-amber-400 rounded-full ring-2 ring-[#0D1017]"></span>
          )}
        </button>

        {/* User Profile Capsule */}
        {user ? (
          <button
            onClick={onOpenProfile || onOpenAuth}
            id="btn-header-profile"
            className="flex items-center gap-2 pl-1.5 pr-2.5 py-1 rounded-full bg-[#161B26] hover:bg-[#1E2433] transition-colors cursor-pointer border border-amber-500/25"
          >
            <div className="w-7 h-7 rounded-full bg-amber-500 text-slate-950 font-black text-xs flex items-center justify-center shadow-xs">
              {user.fullName ? user.fullName.charAt(0).toUpperCase() : <UserIcon className="w-3.5 h-3.5" />}
            </div>
            <span className="text-xs font-semibold text-slate-200 max-w-[100px] truncate hidden sm:inline">
              {user.fullName || user.username}
            </span>
            <ChevronRight className="w-3.5 h-3.5 text-amber-400/60" />
          </button>
        ) : (
          <button
            onClick={onOpenAuth}
            id="btn-header-signin"
            className="px-3 py-1.5 rounded-full bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-extrabold transition-all shadow-md shadow-amber-500/20 cursor-pointer"
          >
            Sign In
          </button>
        )}
      </div>
    </header>
  );
};


