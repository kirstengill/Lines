import React from 'react';
import {
  LayoutDashboard,
  Briefcase,
  Store,
  Wallet,
  ArrowDownCircle,
  ArrowUpCircle,
  Users,
  Bell,
  Settings,
  Shield,
  LogOut,
  X,
} from 'lucide-react';
import { FleetVestLogo } from './FleetVestLogo';
import { UserProfile, AppNotification } from '../types';

export type SidebarNavItem =
  | 'home'
  | 'investments'
  | 'products'
  | 'wallet'
  | 'referral'
  | 'profile'
  | 'notifications'
  | 'deposit'
  | 'withdraw';

interface FleetSidebarProps {
  activeTab: string;
  user: UserProfile | null;
  notifications: AppNotification[];
  isOpenMobile?: boolean;
  onCloseMobile?: () => void;
  onSelectTab: (tab: any) => void;
  onOpenDeposit: () => void;
  onOpenWithdraw: () => void;
  onOpenNotifications: () => void;
  onOpenAdmin?: () => void;
  onLogout?: () => void;
}

export const FleetSidebar: React.FC<FleetSidebarProps> = ({
  activeTab,
  user,
  notifications,
  isOpenMobile = false,
  onCloseMobile,
  onSelectTab,
  onOpenDeposit,
  onOpenWithdraw,
  onOpenNotifications,
  onOpenAdmin,
  onLogout,
}) => {
  const unreadCount = notifications.filter((n) => !n.read).length;
  const isAdmin = Boolean(user?.isAdmin);

  const navItems = [
    {
      id: 'home',
      label: 'Dashboard',
      icon: LayoutDashboard,
      action: () => onSelectTab('home'),
      active: activeTab === 'home',
    },
    {
      id: 'investments',
      label: 'My Investments',
      icon: Briefcase,
      action: () => onSelectTab('investments'),
      active: activeTab === 'investments',
    },
    {
      id: 'products',
      label: 'Fleet Marketplace',
      icon: Store,
      action: () => onSelectTab('products'),
      active: activeTab === 'products',
    },
    {
      id: 'wallet',
      label: 'Wallet',
      icon: Wallet,
      action: () => onSelectTab('wallet'),
      active: activeTab === 'wallet',
    },
    {
      id: 'deposit',
      label: 'Deposits',
      icon: ArrowDownCircle,
      action: onOpenDeposit,
      active: false,
    },
    {
      id: 'withdraw',
      label: 'Withdrawals',
      icon: ArrowUpCircle,
      action: onOpenWithdraw,
      active: false,
    },
    {
      id: 'referral',
      label: 'Referrals',
      icon: Users,
      action: () => onSelectTab('referral'),
      active: activeTab === 'referral',
    },
    {
      id: 'notifications',
      label: 'Notifications',
      icon: Bell,
      action: onOpenNotifications,
      badge: unreadCount > 0 ? unreadCount : undefined,
      active: false,
    },
    {
      id: 'profile',
      label: 'Settings',
      icon: Settings,
      action: () => onSelectTab('profile'),
      active: activeTab === 'profile',
    },
  ];

  const sidebarContent = (
    <div className="flex flex-col h-full bg-[#0B192C] text-slate-300 w-64 border-r border-slate-800 select-none">
      {/* Brand Header */}
      <div className="p-5 flex items-center justify-between border-b border-slate-800/80">
        <FleetVestLogo variant="light" size="md" />
        {isOpenMobile && onCloseMobile && (
          <button
            onClick={onCloseMobile}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Nav List */}
      <div className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              id={`sidebar-link-${item.id}`}
              onClick={() => {
                item.action();
                if (isOpenMobile && onCloseMobile) onCloseMobile();
              }}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                item.active
                  ? 'bg-[#0066FF] text-white shadow-sm font-bold'
                  : 'hover:bg-slate-800/70 hover:text-white text-slate-400'
              }`}
            >
              <div className="flex items-center gap-3">
                <Icon className={`w-4 h-4 ${item.active ? 'text-white' : 'text-slate-400'}`} />
                <span>{item.label}</span>
              </div>
              {item.badge !== undefined && (
                <span className="px-1.5 py-0.5 text-[10px] font-bold rounded-full bg-blue-500 text-white">
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}

        {isAdmin && onOpenAdmin && (
          <button
            id="sidebar-link-admin"
            onClick={() => {
              onOpenAdmin();
              if (isOpenMobile && onCloseMobile) onCloseMobile();
            }}
            className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold text-amber-400 hover:bg-amber-400/10 transition-colors cursor-pointer mt-2"
          >
            <Shield className="w-4 h-4 text-amber-400" />
            <span>Admin Console</span>
          </button>
        )}
      </div>

      {/* User Info / Logout at bottom */}
      <div className="p-4 border-t border-slate-800/80 bg-slate-900/60">
        {user ? (
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-full bg-[#0066FF] text-white font-bold text-xs flex items-center justify-center shrink-0">
                {user.fullName ? user.fullName.charAt(0).toUpperCase() : 'U'}
              </div>
              <div className="min-w-0">
                <p className="text-xs font-bold text-white truncate">
                  {user.fullName || user.username}
                </p>
                <p className="text-[10px] text-slate-400 truncate">
                  {user.phone || `@${user.username}`}
                </p>
              </div>
            </div>

            {onLogout && (
              <button
                onClick={onLogout}
                title="Sign Out"
                className="p-1.5 rounded-lg text-slate-400 hover:text-red-400 hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <LogOut className="w-4 h-4" />
              </button>
            )}
          </div>
        ) : (
          <button
            onClick={() => onSelectTab('profile')}
            className="w-full py-2 px-3 rounded-lg bg-[#0066FF] hover:bg-blue-600 text-white text-xs font-bold transition-all text-center cursor-pointer"
          >
            Sign In / Register
          </button>
        )}
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Persistent Sidebar */}
      <aside className="hidden lg:flex shrink-0 h-screen sticky top-0 z-40">
        {sidebarContent}
      </aside>

      {/* Mobile Drawer (if opened) */}
      {isOpenMobile && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-2xs"
            onClick={onCloseMobile}
          />
          <div className="relative z-10 animate-slide-in-right">
            {sidebarContent}
          </div>
        </div>
      )}
    </>
  );
};
