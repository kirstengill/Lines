/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback } from 'react';
import { TopHeader } from './components/TopHeader';
import { ConsolidatedWalletCard } from './components/ConsolidatedWalletCard';
import { CategoryPills, CategoryType } from './components/CategoryPills';
import { AnalyticsGrid } from './components/AnalyticsGrid';
import { InvestmentCard } from './components/InvestmentCard';
import { BottomNavigation, NavTab } from './components/BottomNavigation';
import { FloatingChatButton } from './components/FloatingChatButton';
import { ManageMachineModal } from './components/ManageMachineModal';
import { InvestmentPurchaseModal } from './components/InvestmentPurchaseModal';
import { DepositWithdrawModal } from './components/DepositWithdrawModal';
import { AdminDashboardView } from './components/AdminDashboardView';
import { NotificationsDrawer } from './components/NotificationsDrawer';
import { SupportChatModal } from './components/SupportChatModal';
import { AuthModal } from './components/AuthModal';
import { AuthScreen } from './components/AuthScreen';
import { PageTransitionLoader } from './components/PageTransitionLoader';

import { InvestmentsView } from './components/InvestmentsView';
import { ProductsBrowseView } from './components/ProductsBrowseView';
import { WalletView } from './components/WalletView';
import { MeProfileView } from './components/MeProfileView';
import { ReferralView } from './components/ReferralView';

import {
  INITIAL_MACHINES,
  INITIAL_WALLET,
  INITIAL_TRANSACTIONS,
  INITIAL_ADMIN_TASKS,
  INITIAL_NOTIFICATIONS,
  AVAILABLE_CATALOG,
} from './data/initialData';
import { Machine, WalletState, Transaction, AdminTask, AppNotification, UserProfile } from './types';
import { authService, UserAccountData } from './services/supabaseAuth';
import { apiClient } from './services/apiClient';
import { Lock, AlertTriangle } from 'lucide-react';

export default function App() {
  // Navigation State
  const [activeTab, setActiveTab] = useState<NavTab>('home');
  const [selectedCategory, setSelectedCategory] = useState<CategoryType>('DS-Mining');
  const [isPageLoading, setIsPageLoading] = useState<boolean>(false);
  const [pageLoadingMessage, setPageLoadingMessage] = useState<string>('Loading...');

  // Dynamic Catalog from backend
  const [catalogMachines, setCatalogMachines] = useState<Machine[]>(AVAILABLE_CATALOG);

  // URL referral detection
  const [initialReferralCode] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      try {
        const searchParams = new URLSearchParams(window.location.search);
        return searchParams.get('ref') || searchParams.get('referral') || '';
      } catch {
        return '';
      }
    }
    return '';
  });

  // User Authentication State
  const [isSessionLoading, setIsSessionLoading] = useState<boolean>(true);
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isAuthViewActive, setIsAuthViewActive] = useState<boolean>(false);

  // Check if current user is an authorized admin — ONLY via profiles.is_admin
  const isCurrentAdmin = Boolean(user && user.isAdmin === true);
  const isBlocked = Boolean(user && user.status === 'blocked');

  // Active View Mode: 'auth' | 'admin' | 'user'
  const [viewMode, setViewMode] = useState<'auth' | 'admin' | 'user'>('auth');

  // Application Data States
  const [machines, setMachines] = useState<Machine[]>([]);
  const [wallet, setWallet] = useState<WalletState>(INITIAL_WALLET);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [adminTasks, setAdminTasks] = useState<AdminTask[]>([]);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);

  // Modal States
  const [managedMachine, setManagedMachine] = useState<Machine | null>(null);
  const [investingMachine, setInvestingMachine] = useState<Machine | null>(null);
  const [depositWithdrawModal, setDepositWithdrawModal] = useState<{
    open: boolean;
    mode: 'deposit' | 'withdraw';
  }>({ open: false, mode: 'deposit' });
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [isSupportOpen, setIsSupportOpen] = useState(false);
  const [isAuthOpen, setIsAuthOpen] = useState(false);

  // Fetch dynamic catalog
  const loadCatalog = useCallback(async () => {
    try {
      const res = await apiClient.fetchCatalogMachines();
      if (res.machines && res.machines.length > 0) {
        setCatalogMachines(res.machines);
      }
    } catch {
      // Keep initial catalog
    }
  }, []);

  // Restore authenticated session on app boot
  useEffect(() => {
    let isMounted = true;
    async function restore() {
      setIsSessionLoading(true);
      try {
        const { user: restoredUser, data: restoredData } = await authService.restoreSession();
        if (isMounted) {
          if (restoredUser && restoredData) {
            setUser(restoredUser);
            setWallet(restoredData.wallet || INITIAL_WALLET);
            setTransactions(restoredData.transactions || []);
            setMachines(restoredData.machines || []);
            setAdminTasks(restoredData.adminTasks || []);
            setNotifications(restoredData.notifications || []);
            const isAdmin = Boolean(restoredUser.isAdmin === true);
            setViewMode(isAdmin ? 'admin' : 'user');
            setIsAuthViewActive(false);
          } else {
            setUser(null);
            setViewMode('auth');
            setIsAuthViewActive(true);
          }
        }
      } catch {
        if (isMounted) {
          setUser(null);
          setViewMode('auth');
          setIsAuthViewActive(true);
        }
      } finally {
        if (isMounted) {
          setIsSessionLoading(false);
        }
      }
    }

    restore();
    loadCatalog();

    return () => {
      isMounted = false;
    };
  }, [loadCatalog]);

  // Periodic background synchronization with central backend for cross-device updates
  useEffect(() => {
    if (!user?.id || isAuthViewActive || viewMode === 'auth') return;

    const interval = setInterval(async () => {
      try {
        const refreshed = await authService.refreshUserData();
        if (refreshed.user) {
          setUser(refreshed.user);
        }
        if (refreshed.data) {
          setWallet(refreshed.data.wallet || INITIAL_WALLET);
          setTransactions(refreshed.data.transactions || []);
          setMachines(refreshed.data.machines || []);
          setNotifications(refreshed.data.notifications || []);
          if (refreshed.data.adminTasks) {
            setAdminTasks(refreshed.data.adminTasks);
          }
        }
      } catch {
        // Silently handle transient connection errors
      }
    }, 4000);

    return () => clearInterval(interval);
  }, [user?.id, isAuthViewActive, viewMode]);

  // Page Transition Handler for smooth navigation
  const triggerPageTransition = (callback: () => void, message: string = 'Loading...') => {
    setPageLoadingMessage(message);
    setIsPageLoading(true);
    setTimeout(() => {
      callback();
      setTimeout(() => {
        setIsPageLoading(false);
      }, 140);
    }, 100);
  };

  const handleSelectTab = (tab: NavTab) => {
    if (tab === activeTab) return;
    const tabMessages: Record<NavTab, string> = {
      home: 'Loading Overview...',
      investments: 'Loading Active Nodes...',
      products: 'Browsing Products...',
      referral: 'Opening Referral Program...',
      wallet: 'Syncing Consolidated Ledger...',
      me: 'Loading Profile...',
    };
    triggerPageTransition(() => {
      setActiveTab(tab);
    }, tabMessages[tab] || 'Loading...');
  };

  // Category counts
  const counts = {
    vip: catalogMachines.filter((m) => m.category === 'VIP Products').length,
    cleanEnergy: catalogMachines.filter((m) => m.category === 'Clean Energy').length,
    dsMining: catalogMachines.filter((m) => m.category === 'DS-Mining').length,
    all: catalogMachines.length,
  };

  // Filtered Machines for Home Tab
  const homeFilteredMachines = catalogMachines.filter((m) => {
    if (selectedCategory === 'All') return true;
    return m.category === selectedCategory;
  });

  // Action Handlers
  const handleClaimReward = (machineId: string, amountUGX: number) => {
    if (isBlocked) {
      alert('Your account is currently restricted. Please contact support.');
      return;
    }
    setWallet((prev) => ({
      ...prev,
      totalBalanceUGX: prev.totalBalanceUGX + amountUGX,
    }));

    setMachines((prev) =>
      prev.map((m) =>
        m.id === machineId
          ? { ...m, unclaimedRewardsUGX: 0, totalMinedUGX: m.totalMinedUGX + amountUGX }
          : m
      )
    );

    const newTx: Transaction = {
      id: `tx_${Date.now()}`,
      type: 'reward',
      amountUGX: amountUGX,
      currency: 'UGX',
      date: 'Just now',
      status: 'completed',
      description: `Harvested Mining Yield (${machineId})`,
      txHash: `0x${Math.random().toString(16).substring(2, 10)}...ugx`,
    };
    setTransactions((prev) => [newTx, ...prev]);

    const newNotif: AppNotification = {
      id: `notif_${Date.now()}`,
      title: 'Harvest Successful',
      message: `Credited UGX ${amountUGX.toLocaleString()} to Consolidated Wallet.`,
      timestamp: 'Just now',
      read: false,
      type: 'success',
    };
    setNotifications((prev) => [newNotif, ...prev]);
  };

  const handleToggleBoost = (machineId: string) => {
    setMachines((prev) =>
      prev.map((m) => {
        if (m.id === machineId) {
          const isBoosted = !m.isBoosted;
          const boostFactor = isBoosted ? 1.15 : 1 / 1.15;
          return {
            ...m,
            isBoosted,
            dailyRewardUGX: Math.round(m.dailyRewardUGX * boostFactor),
          };
        }
        return m;
      })
    );
  };

  const handleToggleStatus = (machineId: string) => {
    setMachines((prev) =>
      prev.map((m) =>
        m.id === machineId
          ? { ...m, status: m.status === 'Active' ? 'Maintenance' : 'Active' }
          : m
      )
    );
  };

  const handleRefreshUserData = async () => {
    const refreshed = await authService.refreshUserData();
    if (refreshed.user) {
      setUser(refreshed.user);
    }
    if (refreshed.data) {
      setWallet(refreshed.data.wallet);
      setTransactions(refreshed.data.transactions);
      setNotifications(refreshed.data.notifications);
      setAdminTasks(refreshed.data.adminTasks || []);
      setMachines(refreshed.data.machines || []);
    }
    loadCatalog();
  };

  const handleDepositWithdrawSuccess = (
    amountUGX: number,
    type: 'deposit' | 'withdraw',
    description: string,
    paymentMethod?: string,
    recipientInfo?: string
  ) => {
    if (isBlocked) {
      alert('Your account is currently restricted. Please contact administrator.');
      return;
    }

    // 1. DO NOT ADD OR DEDUCT THE AMOUNT FROM THE USER'S BALANCE!
    // Available balance MUST remain unchanged while the transaction is pending.

    // 2. Create a pending transaction record
    const txId = `tx_${type}_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const newTx: Transaction = {
      id: txId,
      userId: user?.id,
      username: user?.username,
      userFullName: user?.fullName,
      type,
      amountUGX,
      currency: 'UGX',
      date: 'Just now',
      timestamp: Date.now(),
      status: 'pending', // Strictly pending until admin approval
      description: `${type === 'deposit' ? 'Deposit' : 'Withdrawal'} — UGX ${amountUGX.toLocaleString()} — Pending`,
      paymentMethod,
      recipientInfo,
      txHash: `0x${Math.random().toString(16).substring(2, 10)}...ugx`,
    };

    setTransactions((prev) => [newTx, ...prev]);

    // 3. User notification
    const newNotif: AppNotification = {
      id: `notif_${Date.now()}`,
      title: `${type === 'deposit' ? 'Deposit' : 'Withdrawal'} — UGX ${amountUGX.toLocaleString()} — Pending`,
      message: `Your ${type} request of UGX ${amountUGX.toLocaleString()} is pending administrator verification and approval. Balance will update upon authorization.`,
      timestamp: 'Just now',
      read: false,
      type: 'info',
    };
    setNotifications((prev) => [newNotif, ...prev]);

    // 4. Submit to backend API
    if (type === 'deposit') {
      apiClient
        .submitDeposit(amountUGX, paymentMethod || 'MTN Mobile Money', recipientInfo)
        .catch(() => {});
    } else {
      apiClient
        .submitWithdrawal(
          amountUGX,
          paymentMethod || 'MTN Mobile Money',
          recipientInfo || 'Mobile Wallet'
        )
        .catch(() => {});
    }
  };

  const handleConfirmInvest = async (machine: Machine, amountUGX: number): Promise<boolean> => {
    if (isBlocked) {
      alert('Your account is currently restricted. Please contact administrator.');
      return false;
    }

    // Deduct balance and register active machine
    setWallet((prev) => ({
      ...prev,
      totalBalanceUGX: Math.max(0, prev.totalBalanceUGX - amountUGX),
      activeMachinesCount: prev.activeMachinesCount + 1,
    }));

    const existingIndex = machines.findIndex((m) => m.id === machine.id);
    let updatedMachines: Machine[];
    if (existingIndex >= 0) {
      updatedMachines = machines.map((m) =>
        m.id === machine.id
          ? { ...m, status: 'Active' as const, minInvestUGX: amountUGX }
          : m
      );
    } else {
      const newActiveNode: Machine = {
        ...machine,
        id: `node_${Date.now()}`,
        status: 'Active',
        minInvestUGX: amountUGX,
        totalMinedUGX: 0,
        unclaimedRewardsUGX: 0,
      };
      updatedMachines = [newActiveNode, ...machines];
    }
    setMachines(updatedMachines);

    const newTx: Transaction = {
      id: `tx_${Date.now()}`,
      type: 'investment',
      amountUGX: amountUGX,
      currency: 'UGX',
      date: 'Just now',
      status: 'completed',
      description: `Deployed Investment Node: ${machine.title}`,
      txHash: `0x${Math.random().toString(16).substring(2, 10)}...ugx`,
    };
    setTransactions((prev) => [newTx, ...prev]);

    const newNotif: AppNotification = {
      id: `notif_${Date.now()}`,
      title: 'Investment Activated',
      message: `Successfully deployed ${machine.title}. Earning daily UGX yield.`,
      timestamp: 'Just now',
      read: false,
      type: 'success',
    };
    setNotifications((prev) => [newNotif, ...prev]);

    await apiClient.buyInvestment(machine.id, amountUGX).catch(() => {});
    return true;
  };

  const handleApproveAdminTask = async (taskId: string) => {
    const task = adminTasks.find((t) => t.id === taskId);
    if (task?.transactionId) {
      await apiClient.approveTransaction(task.transactionId).catch(() => {});
    }

    setAdminTasks((prev) =>
      prev.map((t) => (t.id === taskId ? { ...t, status: 'approved' } : t))
    );
    setWallet((prev) => ({
      ...prev,
      pendingTasksCount: Math.max(0, prev.pendingTasksCount - 1),
    }));

    await apiClient.approveAdminTask(taskId).catch(() => {});
    handleRefreshUserData();
  };

  const handleRejectAdminTask = async (taskId: string) => {
    const task = adminTasks.find((t) => t.id === taskId);
    if (task?.transactionId) {
      await apiClient.rejectTransaction(task.transactionId).catch(() => {});
    }

    setAdminTasks((prev) =>
      prev.map((t) => (t.id === taskId ? { ...t, status: 'rejected' } : t))
    );
    setWallet((prev) => ({
      ...prev,
      pendingTasksCount: Math.max(0, prev.pendingTasksCount - 1),
    }));

    await apiClient.rejectAdminTask(taskId).catch(() => {});
    handleRefreshUserData();
  };

  const handleMarkAllRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  const handleSignOut = async () => {
    triggerPageTransition(async () => {
      await authService.signOut();
      setUser(null);
      setViewMode('auth');
      setIsAuthViewActive(true);
      setActiveTab('home');
    }, 'Signing out...');
  };

  // Dedicated Auth Success handler with Role-Based Redirection
  const handleAuthSuccess = (authedUser: UserProfile, accountData?: UserAccountData) => {
    triggerPageTransition(() => {
      setUser(authedUser);
      setIsAuthViewActive(false);
      setIsAuthOpen(false);

      if (accountData) {
        setWallet(accountData.wallet);
        setTransactions(accountData.transactions);
        setMachines(accountData.machines);
        setAdminTasks(accountData.adminTasks);
        setNotifications(accountData.notifications);
      } else {
        const data = authService.getUserData(authedUser.id);
        if (data) {
          setWallet(data.wallet);
          setTransactions(data.transactions);
          setMachines(data.machines);
          setAdminTasks(data.adminTasks);
          setNotifications(data.notifications);
        }
      }

      const isAdminUser = Boolean(authedUser.isAdmin === true);
      if (isAdminUser) {
        setViewMode('admin');
      } else {
        setViewMode('user');
        setActiveTab('home');
      }
    }, 'Authorizing session...');
  };

  return (
    <div className="min-h-screen bg-[#EEF2F8] text-[#0F172A] flex flex-col items-center selection:bg-blue-600 selection:text-white">
      <div className="w-full max-w-2xl min-h-screen flex flex-col bg-[#F4F7FC] shadow-sm sm:border-x sm:border-slate-200/80 relative">
        {/* Lightweight Page-to-Page Loading Animation Bar */}
        <PageTransitionLoader
          isLoading={isPageLoading}
          message={pageLoadingMessage}
          onTimeout={() => setIsPageLoading(false)}
        />

        {/* Suspended Account Banner */}
        {isBlocked && (
          <div className="bg-red-600 text-white px-4 py-2.5 text-[12px] font-bold flex items-center justify-between gap-2 shadow-md">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-300 shrink-0" />
              <span>
                Account Restricted: Administrative privileges have placed this account under review.
              </span>
            </div>
            <button
              onClick={() => setIsSupportOpen(true)}
              className="bg-white/20 hover:bg-white/30 text-white px-2.5 py-1 rounded-lg text-[11px] font-bold cursor-pointer"
            >
              Contact Admin
            </button>
          </div>
        )}

        {/* VIEW 1: AUTH SCREEN OR SESSION LOADER */}
        {isSessionLoading ? (
          <div className="flex-1 flex flex-col items-center justify-center p-8 space-y-4 min-h-[60vh]">
            <div className="w-10 h-10 border-3 border-blue-600/20 border-t-blue-600 rounded-full animate-spin" />
            <p className="text-xs font-semibold text-slate-500 tracking-wide uppercase">
              Verifying sovereign session...
            </p>
          </div>
        ) : (viewMode === 'auth' || !user || isAuthViewActive) ? (
          <AuthScreen
            initialReferralCode={initialReferralCode}
            onAuthSuccess={handleAuthSuccess}
          />
        ) : viewMode === 'admin' ? (
          /* VIEW 2: DEDICATED ADMIN DASHBOARD (FOR AUTHENTICATED ADMINISTRATORS) */
          <div className="flex-1 flex flex-col animate-in fade-in duration-200">
            <AdminDashboardView
              currentUser={user}
              tasks={adminTasks}
              onApproveTask={handleApproveAdminTask}
              onRejectTask={handleRejectAdminTask}
              onBackToUserDashboard={() => {
                triggerPageTransition(() => {
                  setViewMode('user');
                  setActiveTab('home');
                }, 'Returning to Dashboard...');
              }}
              onTransactionApproved={handleRefreshUserData}
            />
          </div>
        ) : (
          /* VIEW 3: DEDICATED USER DASHBOARD */
          <>
            {/* User Top Header */}
            <TopHeader
              notifications={notifications}
              user={user}
              onOpenNotifications={() => setIsNotificationsOpen(true)}
              onOpenAdmin={() => {
                if (isCurrentAdmin) {
                  triggerPageTransition(() => setViewMode('admin'), 'Opening Administrator Console...');
                }
              }}
              onOpenAuth={() => {
                triggerPageTransition(() => {
                  setIsAuthViewActive(true);
                  setViewMode('auth');
                }, 'Switching account...');
              }}
            />

            {/* User Main View Switcher */}
            <main className="flex-1 pb-4">
              {activeTab === 'home' && (
                <div key="home" className="animate-page-fade-in">
                  {/* Consolidated Wallet Card */}
                  <ConsolidatedWalletCard
                    balanceUGX={wallet.totalBalanceUGX}
                    onDeposit={() => setDepositWithdrawModal({ open: true, mode: 'deposit' })}
                    onWithdraw={() => setDepositWithdrawModal({ open: true, mode: 'withdraw' })}
                  />

                  {/* Filter Pill Categories */}
                  <CategoryPills
                    selectedCategory={selectedCategory}
                    onSelectCategory={setSelectedCategory}
                    counts={counts}
                  />

                  {/* Clean User Analytics Quick Grid */}
                  <AnalyticsGrid
                    dailyPnlUGX={wallet.dailyPnlUGX}
                    activeMachinesCount={wallet.activeMachinesCount}
                  />

                  {/* Main Investment Feed */}
                  <div className="px-5 space-y-3">
                    {homeFilteredMachines.map((machine, index) => (
                      <InvestmentCard
                        key={machine.id}
                        machine={machine}
                        onManage={(m) => setInvestingMachine(m)}
                        buttonVariant={index === 0 ? 'outline' : 'solid'}
                      />
                    ))}
                  </div>
                </div>
              )}

              {activeTab === 'investments' && (
                <div key="investments" className="animate-page-fade-in">
                  <InvestmentsView
                    machines={machines}
                    onManageMachine={(m) => setManagedMachine(m)}
                    onBrowseAvailable={() => handleSelectTab('products')}
                  />
                </div>
              )}

              {activeTab === 'products' && (
                <div key="products" className="animate-page-fade-in">
                  <ProductsBrowseView
                    machines={machines}
                    catalog={catalogMachines}
                    onSelectMachine={(m) => setManagedMachine(m)}
                    onInvestInMachine={(m) => setInvestingMachine(m)}
                  />
                </div>
              )}

              {activeTab === 'referral' && (
                <div key="referral" className="animate-page-fade-in">
                  <ReferralView
                    user={user}
                    onOpenAuth={() => {
                      triggerPageTransition(() => {
                        setIsAuthViewActive(true);
                        setViewMode('auth');
                      }, 'Switching account...');
                    }}
                  />
                </div>
              )}

              {activeTab === 'wallet' && (
                <div key="wallet" className="animate-page-fade-in">
                  <WalletView
                    wallet={wallet}
                    transactions={transactions}
                    onOpenDeposit={() => setDepositWithdrawModal({ open: true, mode: 'deposit' })}
                    onOpenWithdraw={() => setDepositWithdrawModal({ open: true, mode: 'withdraw' })}
                  />
                </div>
              )}

              {activeTab === 'me' && (
                <div key="me" className="animate-page-fade-in">
                  <MeProfileView
                    user={user}
                    onOpenAuth={() => {
                      triggerPageTransition(() => {
                        setIsAuthViewActive(true);
                        setViewMode('auth');
                      }, 'Switching account...');
                    }}
                    onSignOut={handleSignOut}
                    onOpenSupport={() => setIsSupportOpen(true)}
                    onNavigateToReferral={() => handleSelectTab('referral')}
                    onOpenAdmin={
                      isCurrentAdmin
                        ? () => triggerPageTransition(() => setViewMode('admin'), 'Opening Administrator Console...')
                        : undefined
                    }
                  />
                </div>
              )}
            </main>

            {/* Floating Chat / Support Action Button */}
            <FloatingChatButton onClick={() => setIsSupportOpen(true)} />

            {/* Fixed Bottom Navigation */}
            <BottomNavigation activeTab={activeTab} onSelectTab={handleSelectTab} />
          </>
        )}

        {/* Modals & Drawers */}
        {managedMachine && (
          <ManageMachineModal
            machine={managedMachine}
            onClose={() => setManagedMachine(null)}
            onClaimReward={handleClaimReward}
            onToggleBoost={handleToggleBoost}
            onToggleStatus={handleToggleStatus}
          />
        )}

        {investingMachine && (
          <InvestmentPurchaseModal
            machine={investingMachine}
            userBalanceUGX={wallet.totalBalanceUGX}
            onClose={() => setInvestingMachine(null)}
            onConfirmInvest={handleConfirmInvest}
            onOpenDeposit={() => setDepositWithdrawModal({ open: true, mode: 'deposit' })}
          />
        )}

        {depositWithdrawModal.open && (
          <DepositWithdrawModal
            mode={depositWithdrawModal.mode}
            balanceUGX={wallet.totalBalanceUGX}
            onClose={() => setDepositWithdrawModal({ open: false, mode: 'deposit' })}
            onSuccess={handleDepositWithdrawSuccess}
          />
        )}

        {isNotificationsOpen && (
          <NotificationsDrawer
            notifications={notifications}
            onClose={() => setIsNotificationsOpen(false)}
            onMarkAllRead={handleMarkAllRead}
          />
        )}

        {isSupportOpen && (
          <SupportChatModal onClose={() => setIsSupportOpen(false)} />
        )}

        {isAuthOpen && (
          <AuthModal
            onClose={() => setIsAuthOpen(false)}
            onAuthSuccess={handleAuthSuccess}
          />
        )}
      </div>
    </div>
  );
}
