import React from 'react';
import { Home, BarChart2, Globe, Users, Wallet, User } from 'lucide-react';

export type NavTab = 'home' | 'investments' | 'products' | 'referral' | 'wallet' | 'me';

interface BottomNavigationProps {
  activeTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
}

export const BottomNavigation: React.FC<BottomNavigationProps> = ({
  activeTab,
  onSelectTab,
}) => {
  return (
    <nav className="sticky bottom-0 w-full bg-white/95 backdrop-blur-md border-t border-slate-200 px-2 py-2 flex items-center justify-around z-30 shadow-xs">
      {/* 1. Home */}
      <button
        id="nav-tab-home"
        onClick={() => onSelectTab('home')}
        className={`flex flex-col items-center justify-center flex-1 py-1 transition-all cursor-pointer ${
          activeTab === 'home' ? 'text-[#1657D9]' : 'text-slate-500 hover:text-slate-900'
        }`}
      >
        <Home className={`w-5 h-5 ${activeTab === 'home' ? 'stroke-[2.5]' : 'stroke-[1.8]'}`} />
        <span className="text-[10.5px] font-semibold mt-0.5">Home</span>
      </button>

      {/* 2. Investments */}
      <button
        id="nav-tab-investments"
        onClick={() => onSelectTab('investments')}
        className={`flex flex-col items-center justify-center flex-1 py-1 transition-all cursor-pointer ${
          activeTab === 'investments' ? 'text-[#1657D9]' : 'text-slate-500 hover:text-slate-900'
        }`}
      >
        <BarChart2 className={`w-5 h-5 ${activeTab === 'investments' ? 'stroke-[2.5]' : 'stroke-[1.8]'}`} />
        <span className="text-[10.5px] font-semibold mt-0.5">Invest</span>
      </button>

      {/* 3. Products */}
      <button
        id="nav-tab-products"
        onClick={() => onSelectTab('products')}
        className={`flex flex-col items-center justify-center flex-1 py-1 transition-all cursor-pointer ${
          activeTab === 'products' ? 'text-[#1657D9]' : 'text-slate-500 hover:text-slate-900'
        }`}
      >
        <Globe className={`w-5 h-5 ${activeTab === 'products' ? 'stroke-[2.5]' : 'stroke-[1.8]'}`} />
        <span className="text-[10.5px] font-semibold mt-0.5">Browse</span>
      </button>

      {/* 4. Referral (New Tab) */}
      <button
        id="nav-tab-referral"
        onClick={() => onSelectTab('referral')}
        className={`flex flex-col items-center justify-center flex-1 py-1 transition-all cursor-pointer ${
          activeTab === 'referral' ? 'text-[#1657D9]' : 'text-slate-500 hover:text-slate-900'
        }`}
      >
        <Users className={`w-5 h-5 ${activeTab === 'referral' ? 'stroke-[2.5]' : 'stroke-[1.8]'}`} />
        <div className="flex flex-col items-center leading-tight mt-0.5">
          <span className="text-[10px] font-bold text-[#16A34A] leading-none">Referral</span>
        </div>
      </button>

      {/* 5. Wallet */}
      <button
        id="nav-tab-wallet"
        onClick={() => onSelectTab('wallet')}
        className={`flex flex-col items-center justify-center flex-1 py-1 transition-all cursor-pointer ${
          activeTab === 'wallet' ? 'text-[#1657D9]' : 'text-slate-500 hover:text-slate-900'
        }`}
      >
        <Wallet className={`w-5 h-5 ${activeTab === 'wallet' ? 'stroke-[2.5]' : 'stroke-[1.8]'}`} />
        <span className="text-[10.5px] font-semibold mt-0.5">Wallet</span>
      </button>

      {/* 6. Me */}
      <button
        id="nav-tab-me"
        onClick={() => onSelectTab('me')}
        className={`flex flex-col items-center justify-center flex-1 py-1 transition-all cursor-pointer ${
          activeTab === 'me' ? 'text-[#1657D9]' : 'text-slate-500 hover:text-slate-900'
        }`}
      >
        <User className={`w-5 h-5 ${activeTab === 'me' ? 'stroke-[2.5]' : 'stroke-[1.8]'}`} />
        <span className="text-[10.5px] font-semibold mt-0.5">Me</span>
      </button>
    </nav>
  );
};
