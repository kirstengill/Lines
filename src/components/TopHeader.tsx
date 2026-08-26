import React from 'react';
import { Bell, User, LogIn } from 'lucide-react';
import { AppNotification, UserProfile } from '../types';

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
        {/* Custom Sunrise Chart Logo */}
        <div className="relative flex items-center justify-center w-9 h-9">
          {/* Sun Rays Arch */}
          <div className="absolute -top-1 w-7 h-3.5 border-t-2 border-r-2 border-l-2 border-amber-400 rounded-t-full flex items-center justify-center">
            <span className="w-1 h-1 bg-amber-400 rounded-full"></span>
          </div>
          {/* Sun Body */}
          <div className="w-5 h-5 bg-gradient-to-tr from-amber-400 to-amber-300 rounded-full shadow-xs mb-1"></div>
          {/* Rising Blue Bar Graph Overlay */}
          <div className="absolute bottom-0 flex items-end gap-0.5 z-10">
            <div className="w-1.5 h-3 bg-blue-700 rounded-t-xs"></div>
            <div className="w-1.5 h-4.5 bg-blue-600 rounded-t-xs"></div>
            <div className="w-1.5 h-6 bg-blue-500 rounded-t-xs"></div>
            {/* Arrow line */}
            <div className="w-1.5 h-7.5 bg-sky-400 rounded-t-xs"></div>
          </div>
        </div>

        <div className="flex flex-col">
          <h1 className="text-[17px] font-extrabold tracking-tight text-[#0F172A] leading-tight">
            Sunrise Capital - DS Platform
          </h1>
        </div>
      </div>

      {/* Action Icons */}
      <div className="flex items-center gap-1.5">
        {onOpenAuth && (
          <button
            onClick={onOpenAuth}
            className="p-1.5 text-slate-700 hover:text-slate-900 rounded-full hover:bg-slate-200/60 transition-colors flex items-center justify-center"
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
          className="relative p-1.5 text-slate-700 hover:text-slate-900 rounded-full hover:bg-slate-200/60 transition-colors"
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

