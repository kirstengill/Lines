import React from 'react';
import {
  LayoutDashboard,
  Store,
  Briefcase,
  Wallet,
  Users,
  Bell,
  Settings,
} from 'lucide-react';

export type NavTab =
  | 'home'
  | 'investments'
  | 'products'
  | 'referral'
  | 'wallet'
  | 'me'
  | 'settings';

interface BottomNavigationProps {
  activeTab: string;
  unreadNotificationsCount?: number;
  onSelectTab: (tab: any) => void;
  onOpenNotifications?: () => void;
}

export const BottomNavigation: React.FC<BottomNavigationProps> = ({
  activeTab,
  unreadNotificationsCount = 0,
  onSelectTab,
  onOpenNotifications,
}) => {
  const tabs = [
    {
      id: 'home',
      label: 'Home',
      icon: LayoutDashboard,
      action: () => onSelectTab('home'),
      active: activeTab === 'home',
    },
    {
      id: 'products',
      label: 'Marketplace',
      icon: Store,
      action: () => onSelectTab('products'),
      active: activeTab === 'products',
    },
    {
      id: 'investments',
      label: 'Portfolio',
      icon: Briefcase,
      action: () => onSelectTab('investments'),
      active: activeTab === 'investments',
    },
    {
      id: 'wallet',
      label: 'Wallet',
      icon: Wallet,
      action: () => onSelectTab('wallet'),
      active: activeTab === 'wallet',
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
      label: 'Alerts',
      icon: Bell,
      action: () => (onOpenNotifications ? onOpenNotifications() : onSelectTab('notifications')),
      badge: unreadNotificationsCount > 0 ? unreadNotificationsCount : undefined,
      active: false,
    },
    {
      id: 'me',
      label: 'Settings',
      icon: Settings,
      action: () => onSelectTab('me'),
      active: activeTab === 'me' || activeTab === 'profile',
    },
  ];

  return (
    <nav className="sticky bottom-0 w-full bg-[#0B0E14]/95 backdrop-blur-md border-t border-amber-500/20 px-1 py-1.5 flex items-center justify-around z-30 shadow-lg lg:hidden">
      {tabs.map((tab) => {
        const Icon = tab.icon;
        return (
          <button
            key={tab.id}
            id={`nav-tab-${tab.id}`}
            onClick={tab.action}
            className={`flex flex-col items-center justify-center flex-1 py-1 px-0.5 transition-all cursor-pointer relative ${
              tab.active ? 'text-amber-400' : 'text-slate-400 hover:text-amber-200'
            }`}
          >
            <div className="relative">
              <Icon className={`w-4.5 h-4.5 ${tab.active ? 'stroke-[2.5]' : 'stroke-[1.8]'}`} />
              {tab.badge !== undefined && (
                <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-amber-400 ring-2 ring-[#0B0E14]" />
              )}
            </div>
            <span className={`text-[10px] tracking-tight mt-0.5 truncate max-w-full ${tab.active ? 'font-bold text-amber-300' : 'font-medium text-slate-400'}`}>
              {tab.label}
            </span>
          </button>
        );
      })}
    </nav>
  );
};
