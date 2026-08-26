import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  Zap,
  Activity,
  Server,
  Cpu,
  RefreshCw,
  Check,
  X,
  AlertTriangle,
  ArrowLeft,
  Search,
  CheckCircle2,
  Clock,
  ArrowDownLeft,
  ArrowUpRight,
  Filter,
  Users,
  UserPlus,
  Edit2,
  Plus,
  Trash2,
  Lock,
  Unlock,
  DollarSign,
  FileText,
  Layers,
  Sparkles,
  Phone,
  Calendar,
  Mail,
  AlertCircle
} from 'lucide-react';
import confetti from 'canvas-confetti';
import {
  AdminTask,
  UserProfile,
  Transaction,
  Machine,
  AdminUserSummary,
  BalanceAdjustment,
} from '../types';
import { authService } from '../services/supabaseAuth';
import { apiClient } from '../services/apiClient';
import { getSupabaseClient } from '../services/supabase';

interface AdminDashboardViewProps {
  tasks: AdminTask[];
  currentUser: UserProfile | null;
  onApproveTask: (taskId: string) => void;
  onRejectTask: (taskId: string) => void;
  onBackToUserDashboard?: () => void;
  onTransactionApproved?: () => void;
}

type AdminSubTab = 'transactions' | 'users' | 'catalog' | 'audit' | 'cluster' | 'nodes' | 'tasks';

export const AdminDashboardView: React.FC<AdminDashboardViewProps> = ({
  tasks,
  currentUser,
  onApproveTask,
  onRejectTask,
  onBackToUserDashboard,
  onTransactionApproved,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<AdminSubTab>('transactions');
  const [rewardMultiplier, setRewardMultiplier] = useState<number>(1.0);
  const [systemSyncing, setSystemSyncing] = useState(false);

  // Pending Transactions State
  const [pendingTransactions, setPendingTransactions] = useState<Transaction[]>([]);
  const [txLoading, setTxLoading] = useState(false);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [txFilter, setTxFilter] = useState<'all' | 'deposit' | 'withdraw'>('all');
  const [txSearchQuery, setTxSearchQuery] = useState('');

  // User Management State
  const [usersList, setUsersList] = useState<AdminUserSummary[]>([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [userSearchQuery, setUserSearchQuery] = useState('');
  const [userStatusFilter, setUserStatusFilter] = useState<'all' | 'active' | 'blocked' | 'admin'>('all');

  // User Management Modals
  const [editingUser, setEditingUser] = useState<AdminUserSummary | null>(null);
  const [editUsername, setEditUsername] = useState('');
  const [editFullName, setEditFullName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editUserLoading, setEditUserLoading] = useState(false);
  const [editUserError, setEditUserError] = useState('');

  const [adjustingUser, setAdjustingUser] = useState<AdminUserSummary | null>(null);
  const [adjustAmount, setAdjustAmount] = useState<string>('');
  const [adjustType, setAdjustType] = useState<'add' | 'deduct'>('add');
  const [adjustReason, setAdjustReason] = useState<string>('');
  const [adjustLoading, setAdjustLoading] = useState(false);
  const [adjustError, setAdjustError] = useState('');

  const [deletingUser, setDeletingUser] = useState<AdminUserSummary | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const [statusConfirmUser, setStatusConfirmUser] = useState<{ user: AdminUserSummary; targetStatus: 'active' | 'blocked' } | null>(null);
  const [statusLoading, setStatusLoading] = useState(false);

  // Projects / Catalog Management State
  const [catalogProjects, setCatalogProjects] = useState<Machine[]>([]);
  const [catalogLoading, setCatalogLoading] = useState(false);
  const [editingProject, setEditingProject] = useState<Partial<Machine> | null>(null);
  const [isCreatingProject, setIsCreatingProject] = useState(false);
  const [projectFormError, setProjectFormError] = useState('');
  const [projectFormLoading, setProjectFormLoading] = useState(false);

  // Audit Logs State
  const [auditLogs, setAuditLogs] = useState<BalanceAdjustment[]>([]);
  const [auditLoading, setAuditLoading] = useState(false);

  // Toast / Status Message
  const [toastMessage, setToastMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);

  const showToast = (text: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 4000);
  };

  const isAuthorizedAdmin = Boolean(
    currentUser && (currentUser.isAdmin === true || currentUser.role === 'admin')
  );

  // 1. Fetch Pending Transactions (from Supabase via RPC)
  const loadPendingTransactions = async () => {
    setTxLoading(true);
    try {
      const res = await authService.fetchPendingTransactions();
      if (res.transactions) {
        setPendingTransactions(res.transactions);
        if (res.error) console.warn('Pending transactions:', res.error);
      }
    } catch (e) {
      console.warn('Failed to load pending transactions', e);
    } finally {
      setTxLoading(false);
    }
  };

  // 2. Fetch Users List
  const loadUsersList = async () => {
    setUsersLoading(true);
    try {
      const res = await authService.getAdminUsers();
      if (res.users) {
        setUsersList(res.users);
      }
    } catch (e) {
      console.warn('Failed to load users list', e);
    } finally {
      setUsersLoading(false);
    }
  };

  // 3. Fetch Catalog Projects (direct from Supabase)
  const loadCatalogProjects = async () => {
    setCatalogLoading(true);
    try {
      const sb = getSupabaseClient();
      if (sb) {
        const { data } = await sb.from('catalog_machines').select('*').order('created_at', { ascending: false });
        if (data && data.length > 0) {
          setCatalogProjects(data.map((m: any) => ({
            id: m.id,
            title: m.title,
            subtitle: m.subtitle,
            category: m.category || 'DS-Mining',
            image: m.image,
            dailyRewardUGX: Number(m.daily_reward_ugx),
            status: m.status || 'Active',
            estYearlyROI: Number(m.est_yearly_roi || 0),
            minInvestUGX: Number(m.min_invest_ugx || 0),
            hashrate: m.hashrate || '10.0 TH/s',
            powerSource: m.power_source || 'Grid Power',
            uptime: m.uptime || '99.9%',
            temperature: m.temperature || '36.0°C',
            efficiency: Number(m.efficiency || 98.5),
            totalMinedUGX: Number(m.total_mined_ugx || 0),
            unclaimedRewardsUGX: Number(m.unclaimed_rewards_ugx || 0),
            isBoosted: Boolean(m.is_boosted),
          })));
        }
      }
    } catch (e) {
      console.warn('Failed to load catalog projects', e);
    } finally {
      setCatalogLoading(false);
    }
  };

  // 4. Fetch Audit Logs
  const loadAuditLogs = async () => {
    setAuditLoading(true);
    try {
      const res = await authService.getBalanceAuditLogs();
      if (res.adjustments) {
        setAuditLogs(res.adjustments);
      }
    } catch (e) {
      console.warn('Failed to load audit logs', e);
    } finally {
      setAuditLoading(false);
    }
  };

  useEffect(() => {
    if (isAuthorizedAdmin) {
      loadPendingTransactions();
      loadUsersList();
      loadCatalogProjects();
      loadAuditLogs();
    }
  }, [isAuthorizedAdmin]);

  // Handle Approve Transaction (Supabase RPC — atomic, idempotent)
  const handleApproveTransaction = async (tx: Transaction) => {
    setActionLoadingId(tx.id);
    try {
      const res = await authService.approveTransaction(tx.id);
      if (res.error) {
        showToast(res.error, 'error');
      } else {
        confetti({ particleCount: 50, spread: 60 });
        showToast(`Transaction approved: UGX ${tx.amountUGX.toLocaleString()} credited/settled successfully.`);
        await loadPendingTransactions();
        await loadUsersList();
        if (onTransactionApproved) {
          onTransactionApproved();
        }
      }
    } catch (err: any) {
      showToast(err.message || 'Approval failed.', 'error');
    } finally {
      setActionLoadingId(null);
    }
  };

  // Handle Reject Transaction (Supabase RPC — balance untouched)
  const handleRejectTransaction = async (tx: Transaction) => {
    setActionLoadingId(tx.id);
    try {
      const res = await authService.rejectTransaction(tx.id);
      if (res.error) {
        showToast(res.error, 'error');
      } else {
        showToast(`Transaction for UGX ${tx.amountUGX.toLocaleString()} rejected.`, 'info');
        await loadPendingTransactions();
        if (onTransactionApproved) {
          onTransactionApproved();
        }
      }
    } catch (err: any) {
      showToast(err.message || 'Rejection failed.', 'error');
    } finally {
      setActionLoadingId(null);
    }
  };

  // Handle Edit User
  const handleOpenEditUser = (u: AdminUserSummary) => {
    setEditingUser(u);
    setEditUsername(u.username);
    setEditFullName(u.fullName || '');
    setEditPhone(u.phone || '');
    setEditUserError('');
  };

  const handleSaveEditUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;
    setEditUserError('');
    setEditUserLoading(true);

    try {
      const res = await authService.updateUserInfo(editingUser.id, {
        username: editUsername.trim(),
        fullName: editFullName.trim(),
        phone: editPhone.trim(),
      });

      if (res.error) {
        setEditUserError(res.error);
      } else {
        showToast(`User @${editUsername} profile updated successfully.`);
        setEditingUser(null);
        await loadUsersList();
      }
    } catch (err: any) {
      setEditUserError(err.message || 'Failed to update user.');
    } finally {
      setEditUserLoading(false);
    }
  };

  // Handle Adjust Balance
  const handleOpenAdjustBalance = (u: AdminUserSummary) => {
    setAdjustingUser(u);
    setAdjustAmount('');
    setAdjustType('add');
    setAdjustReason('');
    setAdjustError('');
  };

  const handleSaveAdjustBalance = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adjustingUser) return;
    setAdjustError('');

    const numAmount = parseInt(adjustAmount.replace(/,/g, ''), 10);
    if (!numAmount || numAmount <= 0) {
      setAdjustError('Please enter a valid positive UGX amount.');
      return;
    }

    if (adjustType === 'deduct' && numAmount > adjustingUser.balanceUGX) {
      setAdjustError(`Cannot deduct UGX ${numAmount.toLocaleString()}. User balance is only UGX ${adjustingUser.balanceUGX.toLocaleString()}.`);
      return;
    }

    setAdjustLoading(true);
    try {
      const res = await authService.adjustBalance(adjustingUser.id, {
        amountUGX: numAmount,
        type: adjustType,
        reason: adjustReason.trim() || 'Admin balance adjustment',
      });

      if (res.error) {
        setAdjustError(res.error);
      } else {
        confetti({ particleCount: 40, spread: 50 });
        showToast(
          `Balance adjusted: ${adjustType === 'add' ? '+' : '-'}UGX ${numAmount.toLocaleString()} for @${adjustingUser.username}. New Balance: UGX ${res.newBalance.toLocaleString()}`
        );
        setAdjustingUser(null);
        await loadUsersList();
        await loadAuditLogs();
        if (onTransactionApproved) {
          onTransactionApproved();
        }
      }
    } catch (err: any) {
      setAdjustError(err.message || 'Balance adjustment failed.');
    } finally {
      setAdjustLoading(false);
    }
  };

  // Handle Block / Unblock User
  const handleConfirmStatusChange = async () => {
    if (!statusConfirmUser) return;
    setStatusLoading(true);

    try {
      const res = await authService.toggleUserStatus(
        statusConfirmUser.user.id,
        statusConfirmUser.targetStatus
      );

      if (res.error) {
        showToast(res.error, 'error');
      } else {
        showToast(
          `User @${statusConfirmUser.user.username} is now ${statusConfirmUser.targetStatus.toUpperCase()}.`
        );
        setStatusConfirmUser(null);
        await loadUsersList();
      }
    } catch (err: any) {
      showToast(err.message || 'Failed to update user status.', 'error');
    } finally {
      setStatusLoading(false);
    }
  };

  // Handle Delete User
  const handleConfirmDeleteUser = async () => {
    if (!deletingUser) return;
    setDeleteLoading(true);

    try {
      const res = await authService.deleteUser(deletingUser.id);
      if (res.error) {
        showToast(res.error, 'error');
      } else {
        showToast(`Account @${deletingUser.username} safely deleted.`, 'info');
        setDeletingUser(null);
        await loadUsersList();
      }
    } catch (err: any) {
      showToast(err.message || 'Delete operation failed.', 'error');
    } finally {
      setDeleteLoading(false);
    }
  };

  // Handle Save Project (Create / Edit)
  const handleSaveProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProject) return;
    setProjectFormError('');

    if (!editingProject.title || !editingProject.minInvestUGX) {
      setProjectFormError('Project Title and Minimum Investment amount are required.');
      return;
    }

    setProjectFormLoading(true);
    try {
      if (isCreatingProject) {
        const res = await apiClient.createCatalogMachine(editingProject);
        if (res.error) {
          setProjectFormError(res.error);
        } else {
          showToast(`New Project "${editingProject.title}" added to investment catalog.`);
          setEditingProject(null);
          setIsCreatingProject(false);
          await loadCatalogProjects();
        }
      } else if (editingProject.id) {
        const res = await apiClient.updateCatalogMachine(editingProject.id, editingProject);
        if (res.error) {
          setProjectFormError(res.error);
        } else {
          showToast(`Project "${editingProject.title}" updated successfully.`);
          setEditingProject(null);
          await loadCatalogProjects();
        }
      }
    } catch (err: any) {
      setProjectFormError(err.message || 'Failed to save project.');
    } finally {
      setProjectFormLoading(false);
    }
  };

  const handleDeleteProject = async (proj: Machine) => {
    if (!window.confirm(`Are you sure you want to remove project "${proj.title}" from the active catalog?`)) {
      return;
    }
    try {
      const res = await apiClient.deleteCatalogMachine(proj.id);
      if (res.error) {
        showToast(res.error, 'error');
      } else {
        showToast(`Project "${proj.title}" removed from catalog.`, 'info');
        await loadCatalogProjects();
      }
    } catch (err: any) {
      showToast(err.message || 'Failed to delete project.', 'error');
    }
  };

  const handleApprove = (taskId: string) => {
    confetti({ particleCount: 50, spread: 45 });
    onApproveTask(taskId);
    showToast('Task approved successfully.');
  };

  const handleTriggerRebalance = () => {
    setSystemSyncing(true);
    setTimeout(() => {
      setSystemSyncing(false);
      showToast(`Hash multiplier applied: ${rewardMultiplier.toFixed(1)}x across sovereign cluster nodes.`);
    }, 1000);
  };

  // Filtered Transactions
  const filteredTransactions = pendingTransactions.filter((tx) => {
    const matchesFilter =
      txFilter === 'all' ? true : tx.type === txFilter;
    const matchesSearch =
      tx.id.toLowerCase().includes(txSearchQuery.toLowerCase()) ||
      (tx.username && tx.username.toLowerCase().includes(txSearchQuery.toLowerCase())) ||
      (tx.description && tx.description.toLowerCase().includes(txSearchQuery.toLowerCase())) ||
      (tx.recipientInfo && tx.recipientInfo.toLowerCase().includes(txSearchQuery.toLowerCase())) ||
      tx.amountUGX.toString().includes(txSearchQuery);
    return matchesFilter && matchesSearch;
  });

  // Filtered Users (search also matches the Auth email)
  const filteredUsers = usersList.filter((u: any) => {
    const matchesSearch =
      u.username?.toLowerCase().includes(userSearchQuery.toLowerCase()) ||
      u.fullName?.toLowerCase().includes(userSearchQuery.toLowerCase()) ||
      (u.phone && u.phone.toLowerCase().includes(userSearchQuery.toLowerCase())) ||
      (u.email && u.email.toLowerCase().includes(userSearchQuery.toLowerCase())) ||
      u.id?.toLowerCase().includes(userSearchQuery.toLowerCase());

    const matchesStatus =
      userStatusFilter === 'all'
        ? true
        : userStatusFilter === 'active'
        ? u.status === 'active'
        : userStatusFilter === 'blocked'
        ? u.status === 'blocked'
        : userStatusFilter === 'admin'
        ? u.isAdmin || u.role === 'admin'
        : true;

    return matchesSearch && matchesStatus;
  });

  const pendingTasksCount = tasks.filter((t) => t.status === 'pending').length;

  return (
    <div className="px-5 py-4 space-y-4 pb-12">
      {/* Toast Alert */}
      {toastMessage && (
        <div
          className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-2xl shadow-xl border flex items-center gap-2.5 text-[13px] font-bold animate-in fade-in slide-in-from-top-2 duration-200 ${
            toastMessage.type === 'success'
              ? 'bg-emerald-900 text-white border-emerald-700'
              : toastMessage.type === 'error'
              ? 'bg-red-900 text-white border-red-700'
              : 'bg-slate-900 text-white border-slate-700'
          }`}
        >
          {toastMessage.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          ) : toastMessage.type === 'error' ? (
            <AlertCircle className="w-4 h-4 text-red-400" />
          ) : (
            <Sparkles className="w-4 h-4 text-blue-400" />
          )}
          <span>{toastMessage.text}</span>
        </div>
      )}

      {/* ADMIN TOP CONTROL BAR */}
      <div className="bg-[#0F172A] rounded-3xl p-5 text-white shadow-xl border border-slate-800 relative overflow-hidden">
        <div className="absolute right-0 top-0 w-64 h-64 bg-gradient-to-bl from-blue-600/20 via-indigo-600/10 to-transparent rounded-full blur-2xl pointer-events-none" />

        <div className="flex items-center justify-between relative z-10">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-blue-600/30 border border-blue-400/40 flex items-center justify-center text-blue-400">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-[17px] font-black text-white leading-none">
                  ADMINISTRATION HUB
                </h2>
                <span className="text-[9.5px] font-mono font-bold bg-blue-500/20 text-blue-300 px-2 py-0.5 rounded-full border border-blue-400/30">
                  SUPABASE CLOUD
                </span>
              </div>
              <p className="text-[11.5px] text-slate-400 mt-1">
                Signed in as <span className="font-bold text-white">@{currentUser?.username || 'admin'}</span> • Full Root Controls
              </p>
            </div>
          </div>

          {onBackToUserDashboard && (
            <button
              onClick={onBackToUserDashboard}
              className="bg-white/10 hover:bg-white/20 active:scale-98 text-white px-3.5 py-1.5 rounded-xl text-[12px] font-bold transition-all flex items-center gap-1.5 cursor-pointer border border-white/10"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> Investor View
            </button>
          )}
        </div>

        {/* Global Metric Badges */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mt-4 pt-3 border-t border-slate-800/80 text-[12px]">
          <div className="bg-slate-800/50 rounded-2xl p-2.5 border border-slate-700/50">
            <span className="text-[10px] uppercase font-bold text-slate-400 block">Pending Review</span>
            <span className="text-[16px] font-mono font-black text-amber-400">
              {pendingTransactions.length + pendingTasksCount}
            </span>
          </div>
          <div className="bg-slate-800/50 rounded-2xl p-2.5 border border-slate-700/50">
            <span className="text-[10px] uppercase font-bold text-slate-400 block">Registered Users</span>
            <span className="text-[16px] font-mono font-black text-blue-400">
              {usersList.length || 2}
            </span>
          </div>
          <div className="bg-slate-800/50 rounded-2xl p-2.5 border border-slate-700/50">
            <span className="text-[10px] uppercase font-bold text-slate-400 block">Catalog Projects</span>
            <span className="text-[16px] font-mono font-black text-emerald-400">
              {catalogProjects.length || 4} Active
            </span>
          </div>
          <div className="bg-slate-800/50 rounded-2xl p-2.5 border border-slate-700/50">
            <span className="text-[10px] uppercase font-bold text-slate-400 block">Global Yield</span>
            <span className="text-[16px] font-mono font-black text-purple-400">
              {rewardMultiplier.toFixed(1)}x Multiplier
            </span>
          </div>
        </div>
      </div>

      {/* SUB-NAVIGATION TABS */}
      <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none">
        <button
          onClick={() => setActiveSubTab('transactions')}
          className={`flex items-center gap-1.5 px-3.5 py-2 rounded-2xl text-[12px] font-bold shrink-0 transition-all cursor-pointer ${
            activeSubTab === 'transactions'
              ? 'bg-[#1657D9] text-white shadow-xs'
              : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-200'
          }`}
        >
          <ArrowDownLeft className="w-3.5 h-3.5" />
          <span>Pending Transactions</span>
          {pendingTransactions.length > 0 && (
            <span className="bg-amber-400 text-slate-950 px-1.5 py-0.2 rounded-full text-[10px] font-black">
              {pendingTransactions.length}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveSubTab('users')}
          className={`flex items-center gap-1.5 px-3.5 py-2 rounded-2xl text-[12px] font-bold shrink-0 transition-all cursor-pointer ${
            activeSubTab === 'users'
              ? 'bg-[#1657D9] text-white shadow-xs'
              : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-200'
          }`}
        >
          <Users className="w-3.5 h-3.5" />
          <span>User Management</span>
          <span className="bg-slate-100 text-slate-700 px-1.5 py-0.2 rounded-full text-[10px] font-bold">
            {usersList.length}
          </span>
        </button>

        <button
          onClick={() => setActiveSubTab('catalog')}
          className={`flex items-center gap-1.5 px-3.5 py-2 rounded-2xl text-[12px] font-bold shrink-0 transition-all cursor-pointer ${
            activeSubTab === 'catalog'
              ? 'bg-[#1657D9] text-white shadow-xs'
              : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-200'
          }`}
        >
          <Layers className="w-3.5 h-3.5" />
          <span>Projects Catalog</span>
        </button>

        <button
          onClick={() => setActiveSubTab('audit')}
          className={`flex items-center gap-1.5 px-3.5 py-2 rounded-2xl text-[12px] font-bold shrink-0 transition-all cursor-pointer ${
            activeSubTab === 'audit'
              ? 'bg-[#1657D9] text-white shadow-xs'
              : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-200'
          }`}
        >
          <FileText className="w-3.5 h-3.5" />
          <span>Balance Audit Log</span>
        </button>

        <button
          onClick={() => setActiveSubTab('cluster')}
          className={`flex items-center gap-1.5 px-3.5 py-2 rounded-2xl text-[12px] font-bold shrink-0 transition-all cursor-pointer ${
            activeSubTab === 'cluster'
              ? 'bg-[#1657D9] text-white shadow-xs'
              : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-200'
          }`}
        >
          <Zap className="w-3.5 h-3.5" />
          <span>Yield Multiplier</span>
        </button>

        <button
          onClick={() => setActiveSubTab('nodes')}
          className={`flex items-center gap-1.5 px-3.5 py-2 rounded-2xl text-[12px] font-bold shrink-0 transition-all cursor-pointer ${
            activeSubTab === 'nodes'
              ? 'bg-[#1657D9] text-white shadow-xs'
              : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-200'
          }`}
        >
          <Server className="w-3.5 h-3.5" />
          <span>Node Clusters</span>
        </button>

        <button
          onClick={() => setActiveSubTab('tasks')}
          className={`flex items-center gap-1.5 px-3.5 py-2 rounded-2xl text-[12px] font-bold shrink-0 transition-all cursor-pointer ${
            activeSubTab === 'tasks'
              ? 'bg-[#1657D9] text-white shadow-xs'
              : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-200'
          }`}
        >
          <Activity className="w-3.5 h-3.5" />
          <span>Multisig Tasks</span>
          {pendingTasksCount > 0 && (
            <span className="bg-amber-400 text-slate-950 px-1.5 py-0.2 rounded-full text-[10px] font-black">
              {pendingTasksCount}
            </span>
          )}
        </button>
      </div>

      {/* ==========================================
          TAB 1: PENDING TRANSACTIONS (DEPOSITS & WITHDRAWALS)
          ========================================== */}
      {activeSubTab === 'transactions' && (
        <div className="space-y-3">
          {/* Filter & Search Bar */}
          <div className="bg-white p-3 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col sm:flex-row gap-2.5 items-stretch sm:items-center justify-between">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search by User, Tx ID, recipient or amount..."
                value={txSearchQuery}
                onChange={(e) => setTxSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-[12px] focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              />
            </div>

            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setTxFilter('all')}
                className={`px-3 py-1.5 rounded-xl text-[11.5px] font-bold transition-colors cursor-pointer ${
                  txFilter === 'all' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                All ({pendingTransactions.length})
              </button>
              <button
                onClick={() => setTxFilter('deposit')}
                className={`px-3 py-1.5 rounded-xl text-[11.5px] font-bold transition-colors cursor-pointer ${
                  txFilter === 'deposit' ? 'bg-emerald-600 text-white' : 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100'
                }`}
              >
                Deposits ({pendingTransactions.filter((t) => t.type === 'deposit').length})
              </button>
              <button
                onClick={() => setTxFilter('withdraw')}
                className={`px-3 py-1.5 rounded-xl text-[11.5px] font-bold transition-colors cursor-pointer ${
                  txFilter === 'withdraw' ? 'bg-blue-600 text-white' : 'bg-blue-50 text-blue-800 hover:bg-blue-100'
                }`}
              >
                Withdrawals ({pendingTransactions.filter((t) => t.type === 'withdraw').length})
              </button>
              <button
                onClick={loadPendingTransactions}
                className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors"
                title="Refresh Pending Transactions"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${txLoading ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>

          {/* List of Pending Transactions */}
          {txLoading ? (
            <div className="bg-white rounded-3xl p-8 text-center text-slate-500 border border-slate-100">
              <RefreshCw className="w-6 h-6 animate-spin mx-auto text-blue-600 mb-2" />
              <p className="text-[13px] font-bold">Checking pending transaction ledger...</p>
            </div>
          ) : filteredTransactions.length === 0 ? (
            <div className="bg-white rounded-3xl p-8 text-center border border-slate-100 shadow-xs space-y-2">
              <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto" />
              <h4 className="text-[14px] font-bold text-slate-900">All Transactions Processed</h4>
              <p className="text-[12px] text-slate-500 max-w-sm mx-auto">
                There are currently zero pending deposit or withdrawal requests waiting for administrative review.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredTransactions.map((tx) => {
                const isDeposit = tx.type === 'deposit';
                const isProcessing = actionLoadingId === tx.id;

                return (
                  <div
                    key={tx.id}
                    className="bg-white rounded-3xl p-4 sm:p-5 border border-slate-200/80 shadow-xs space-y-3 hover:border-slate-300 transition-all"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2.5">
                        <div
                          className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 ${
                            isDeposit
                              ? 'bg-emerald-100 text-emerald-700'
                              : 'bg-blue-100 text-blue-700'
                          }`}
                        >
                          {isDeposit ? (
                            <ArrowDownLeft className="w-5 h-5" />
                          ) : (
                            <ArrowUpRight className="w-5 h-5" />
                          )}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span
                              className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                                isDeposit
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : 'bg-blue-100 text-blue-800'
                              }`}
                            >
                              {isDeposit ? 'Deposit Request' : 'Withdrawal Request'}
                            </span>
                            <span className="text-[11px] font-mono text-slate-400">
                              {tx.date || 'Just now'}
                            </span>
                          </div>
                          <h4 className="text-[14px] font-extrabold text-slate-900 mt-0.5">
                            {tx.description || `${isDeposit ? 'Deposit' : 'Withdrawal'} via ${tx.paymentMethod || 'Mobile Money'}`}
                          </h4>
                          <p className="text-[12px] text-slate-600">
                            Requested by: <span className="font-bold text-slate-900">{tx.userFullName || 'Investor'}</span>{' '}
                            <span className="font-mono text-slate-500">(@{tx.username || 'user'})</span>
                          </p>
                        </div>
                      </div>

                      <div className="text-right">
                        <span className="text-[10px] font-bold uppercase text-slate-400 block">
                          Amount (UGX)
                        </span>
                        <span
                          className={`text-[16px] sm:text-[18px] font-mono font-black ${
                            isDeposit ? 'text-emerald-600' : 'text-slate-900'
                          }`}
                        >
                          UGX {tx.amountUGX.toLocaleString()}
                        </span>
                      </div>
                    </div>

                    {/* Transaction Details Box */}
                    <div className="bg-slate-50 rounded-2xl p-3 border border-slate-100 text-[12px] grid grid-cols-1 sm:grid-cols-3 gap-2">
                      <div>
                        <span className="text-slate-400 block text-[10.5px]">Payment Channel</span>
                        <span className="font-bold text-slate-800">{tx.paymentMethod || 'MTN / Airtel'}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[10.5px]">Reference / Recipient</span>
                        <span className="font-mono font-bold text-slate-800 truncate block">
                          {tx.recipientInfo || 'Sunrise Treasury'}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[10.5px]">Transaction ID</span>
                        <span className="font-mono text-[11px] text-slate-600 truncate block">{tx.id}</span>
                      </div>
                    </div>

                    {/* Action Controls */}
                    <div className="flex items-center gap-2 pt-1 border-t border-slate-100">
                      <button
                        onClick={() => handleApproveTransaction(tx)}
                        disabled={isProcessing}
                        className="flex-1 bg-emerald-600 hover:bg-emerald-700 active:scale-98 text-white font-bold text-[12.5px] py-2.5 px-4 rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-xs disabled:opacity-50"
                      >
                        {isProcessing ? (
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Check className="w-4 h-4" />
                        )}
                        {isDeposit ? 'Approve & Credit Balance' : 'Approve & Settle Payout'}
                      </button>

                      <button
                        onClick={() => handleRejectTransaction(tx)}
                        disabled={isProcessing}
                        className="bg-slate-100 hover:bg-red-50 hover:text-red-700 text-slate-700 font-bold text-[12.5px] py-2.5 px-4 rounded-xl transition-colors cursor-pointer disabled:opacity-50"
                      >
                        Reject
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ==========================================
          TAB 2: USER MANAGEMENT
          ========================================== */}
      {activeSubTab === 'users' && (
        <div className="space-y-3">
          {/* User Search & Filter Header */}
          <div className="bg-white p-3.5 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col sm:flex-row gap-2.5 items-stretch sm:items-center justify-between">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search registered users by username, full name, phone..."
                value={userSearchQuery}
                onChange={(e) => setUserSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-[12px] focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              />
            </div>

            <div className="flex items-center gap-1.5 flex-wrap">
              <button
                onClick={() => setUserStatusFilter('all')}
                className={`px-3 py-1.5 rounded-xl text-[11.5px] font-bold transition-colors cursor-pointer ${
                  userStatusFilter === 'all' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                All ({usersList.length})
              </button>
              <button
                onClick={() => setUserStatusFilter('active')}
                className={`px-3 py-1.5 rounded-xl text-[11.5px] font-bold transition-colors cursor-pointer ${
                  userStatusFilter === 'active' ? 'bg-emerald-600 text-white' : 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100'
                }`}
              >
                Active ({usersList.filter((u) => u.status === 'active').length})
              </button>
              <button
                onClick={() => setUserStatusFilter('blocked')}
                className={`px-3 py-1.5 rounded-xl text-[11.5px] font-bold transition-colors cursor-pointer ${
                  userStatusFilter === 'blocked' ? 'bg-red-600 text-white' : 'bg-red-50 text-red-800 hover:bg-red-100'
                }`}
              >
                Blocked ({usersList.filter((u) => u.status === 'blocked').length})
              </button>
              <button
                onClick={() => setUserStatusFilter('admin')}
                className={`px-3 py-1.5 rounded-xl text-[11.5px] font-bold transition-colors cursor-pointer ${
                  userStatusFilter === 'admin' ? 'bg-blue-600 text-white' : 'bg-blue-50 text-blue-800 hover:bg-blue-100'
                }`}
              >
                Admins ({usersList.filter((u) => u.isAdmin || u.role === 'admin').length})
              </button>
              <button
                onClick={loadUsersList}
                className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors"
                title="Refresh Users List"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${usersLoading ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>

          {/* User List Cards */}
          {usersLoading ? (
            <div className="bg-white rounded-3xl p-8 text-center text-slate-500 border border-slate-100">
              <RefreshCw className="w-6 h-6 animate-spin mx-auto text-blue-600 mb-2" />
              <p className="text-[13px] font-bold">Loading users from Supabase ledger...</p>
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="bg-white rounded-3xl p-8 text-center border border-slate-100 shadow-xs">
              <Users className="w-10 h-10 text-slate-300 mx-auto mb-2" />
              <p className="text-[13px] font-bold text-slate-700">No matching users found.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredUsers.map((u) => {
                const isBlocked = u.status === 'blocked';
                const isAdmin = u.isAdmin || u.role === 'admin';

                return (
                  <div
                    key={u.id}
                    className={`bg-white rounded-3xl p-4 sm:p-5 border transition-all ${
                      isBlocked
                        ? 'border-red-200 bg-red-50/20'
                        : 'border-slate-200/80 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-12 h-12 rounded-2xl flex items-center justify-center font-bold text-[16px] text-white shrink-0 shadow-xs ${
                            isAdmin
                              ? 'bg-gradient-to-tr from-blue-600 to-indigo-600'
                              : isBlocked
                              ? 'bg-red-600'
                              : 'bg-gradient-to-tr from-slate-700 to-slate-900'
                          }`}
                        >
                          {u.fullName ? u.fullName.charAt(0).toUpperCase() : u.username.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <h4 className="text-[15px] font-black text-slate-900 leading-tight">
                              {u.fullName || u.username}
                            </h4>
                            <span className="font-mono text-[12px] text-slate-500 font-bold">
                              @{u.username}
                            </span>
                            {isAdmin && (
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-900 border border-blue-200 flex items-center gap-1">
                                <ShieldCheck className="w-3 h-3 text-blue-600" /> Admin
                              </span>
                            )}
                            <span
                              className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                isBlocked
                                  ? 'bg-red-100 text-red-900 border border-red-200'
                                  : 'bg-emerald-100 text-emerald-900 border border-emerald-200'
                              }`}
                            >
                              {isBlocked ? 'SUSPENDED / BLOCKED' : 'ACTIVE'}
                            </span>
                          </div>

                          <div className="flex items-center gap-3 text-[11.5px] text-slate-500 mt-1 flex-wrap">
                            {(u as any).email && (
                              <span className="flex items-center gap-1 font-medium text-slate-600">
                                <Mail className="w-3 h-3 text-slate-400" /> {(u as any).email}
                              </span>
                            )}
                            {u.phone && (
                              <span className="flex items-center gap-1">
                                <Phone className="w-3 h-3 text-slate-400" /> {u.phone}
                              </span>
                            )}
                            <span className="flex items-center gap-1">
                              <Calendar className="w-3 h-3 text-slate-400" /> Member: {u.memberSince || 'August 2026'}
                            </span>
                            <span className="font-mono text-[10px] text-slate-400 truncate max-w-[140px]">
                              ID: {u.id}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Balance & Stats block */}
                      <div className="flex sm:flex-col items-center sm:items-end justify-between border-t sm:border-t-0 pt-2 sm:pt-0 border-slate-100">
                        <span className="text-[10px] uppercase font-bold text-slate-400">Available Balance</span>
                        <span className="text-[17px] font-mono font-black text-slate-900">
                          UGX {u.balanceUGX.toLocaleString()}
                        </span>
                        <span className="text-[11px] text-slate-500 mt-0.5">
                          {u.activeMachinesCount} Nodes • {u.transactionsCount} Transactions
                        </span>
                      </div>
                    </div>

                    {/* Action Bar */}
                    <div className="flex items-center gap-2 mt-3 pt-3 border-t border-slate-100 flex-wrap">
                      <button
                        onClick={() => handleOpenEditUser(u)}
                        className="bg-slate-100 hover:bg-slate-200 text-slate-800 px-3 py-1.5 rounded-xl text-[12px] font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                      >
                        <Edit2 className="w-3.5 h-3.5" /> Edit Info
                      </button>

                      <button
                        onClick={() => handleOpenAdjustBalance(u)}
                        className="bg-blue-50 hover:bg-blue-100 text-blue-700 px-3 py-1.5 rounded-xl text-[12px] font-bold flex items-center gap-1.5 transition-colors cursor-pointer border border-blue-200/80"
                      >
                        <DollarSign className="w-3.5 h-3.5" /> Adjust Balance
                      </button>

                      <button
                        onClick={() =>
                          setStatusConfirmUser({
                            user: u,
                            targetStatus: isBlocked ? 'active' : 'blocked',
                          })
                        }
                        className={`px-3 py-1.5 rounded-xl text-[12px] font-bold flex items-center gap-1.5 transition-colors cursor-pointer ${
                          isBlocked
                            ? 'bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200'
                            : 'bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200'
                        }`}
                      >
                        {isBlocked ? (
                          <>
                            <Unlock className="w-3.5 h-3.5 text-emerald-600" /> Unblock Account
                          </>
                        ) : (
                          <>
                            <Lock className="w-3.5 h-3.5 text-amber-600" /> Block Account
                          </>
                        )}
                      </button>

                      {u.id !== currentUser?.id && (
                        <button
                          onClick={() => setDeletingUser(u)}
                          className="bg-red-50 hover:bg-red-100 text-red-700 px-3 py-1.5 rounded-xl text-[12px] font-bold flex items-center gap-1.5 transition-colors cursor-pointer border border-red-200 ml-auto"
                        >
                          <Trash2 className="w-3.5 h-3.5" /> Delete User
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ==========================================
          TAB 3: PROJECTS / MACHINE CATALOG MANAGEMENT
          ========================================== */}
      {activeSubTab === 'catalog' && (
        <div className="space-y-3">
          {/* Header & Add Button */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between">
            <div>
              <h3 className="text-[15px] font-extrabold text-slate-900">
                Investment Projects Catalog ({catalogProjects.length})
              </h3>
              <p className="text-[11.5px] text-slate-500">
                Manage hardware mining rigs, clean energy generators, and VIP nodes available for investment.
              </p>
            </div>
            <button
              onClick={() => {
                setIsCreatingProject(true);
                setEditingProject({
                  title: '',
                  subtitle: '',
                  category: 'DS-Mining',
                  dailyRewardUGX: 250000,
                  minInvestUGX: 5000000,
                  estYearlyROI: 120,
                  hashrate: '60.0 TH/s',
                  powerSource: 'Solar / Hybrid Dynamo',
                  status: 'Active',
                  image: 'https://images.unsplash.com/photo-1509391365360-2e959784a276?auto=format&fit=crop&w=800&q=80',
                });
                setProjectFormError('');
              }}
              className="bg-[#1657D9] hover:bg-blue-700 text-white font-bold text-[12.5px] px-3.5 py-2 rounded-xl flex items-center gap-1.5 transition-all shadow-xs cursor-pointer"
            >
              <Plus className="w-4 h-4" /> Add New Project
            </button>
          </div>

          {/* Catalog Projects List */}
          {catalogLoading ? (
            <div className="bg-white rounded-3xl p-8 text-center text-slate-500 border border-slate-100">
              <RefreshCw className="w-6 h-6 animate-spin mx-auto text-blue-600 mb-2" />
              <p className="text-[13px] font-bold">Loading investment catalog...</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {catalogProjects.map((proj) => (
                <div
                  key={proj.id}
                  className="bg-white rounded-3xl overflow-hidden border border-slate-200/80 shadow-xs flex flex-col justify-between"
                >
                  <div className="p-4 space-y-3">
                    <div className="flex gap-3">
                      <img
                        src={proj.image}
                        alt={proj.title}
                        referrerPolicy="no-referrer"
                        className="w-16 h-16 rounded-2xl object-cover border border-slate-100 shrink-0"
                      />
                      <div>
                        <span className="text-[9.5px] font-bold uppercase tracking-wider bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full">
                          {proj.category}
                        </span>
                        <h4 className="text-[14px] font-extrabold text-slate-900 mt-1">
                          {proj.title}
                        </h4>
                        <p className="text-[11px] text-slate-500">{proj.subtitle || proj.powerSource}</p>
                      </div>
                    </div>

                    <div className="bg-slate-50 rounded-2xl p-3 text-[12px] grid grid-cols-2 gap-2 border border-slate-100">
                      <div>
                        <span className="text-slate-400 block text-[10.5px]">Min Investment</span>
                        <span className="font-mono font-bold text-slate-900">
                          UGX {proj.minInvestUGX.toLocaleString()}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[10.5px]">Daily Reward</span>
                        <span className="font-mono font-bold text-emerald-600">
                          +UGX {proj.dailyRewardUGX.toLocaleString()}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[10.5px]">Yearly ROI</span>
                        <span className="font-bold text-blue-600">{proj.estYearlyROI}%</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[10.5px]">Hashrate</span>
                        <span className="font-mono font-bold text-slate-700">{proj.hashrate}</span>
                      </div>
                    </div>
                  </div>

                  <div className="p-3 bg-slate-50/70 border-t border-slate-100 flex items-center justify-between gap-2">
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        proj.status === 'Active'
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-amber-100 text-amber-800'
                      }`}
                    >
                      Status: {proj.status}
                    </span>

                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => {
                          setIsCreatingProject(false);
                          setEditingProject(proj);
                          setProjectFormError('');
                        }}
                        className="bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 font-bold text-[11.5px] px-3 py-1.5 rounded-xl flex items-center gap-1 transition-colors cursor-pointer"
                      >
                        <Edit2 className="w-3 h-3" /> Edit
                      </button>
                      <button
                        onClick={() => handleDeleteProject(proj)}
                        className="bg-red-50 hover:bg-red-100 border border-red-200 text-red-700 font-bold text-[11.5px] px-2.5 py-1.5 rounded-xl flex items-center gap-1 transition-colors cursor-pointer"
                        title="Delete project"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ==========================================
          TAB 4: BALANCE ADJUSTMENTS AUDIT LOG
          ========================================== */}
      {activeSubTab === 'audit' && (
        <div className="space-y-3">
          <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between">
            <div>
              <h3 className="text-[15px] font-extrabold text-slate-900">
                Administrative Balance Audit Trail
              </h3>
              <p className="text-[11.5px] text-slate-500">
                Immutable records of every manual fund allocation or deduction performed by administrators.
              </p>
            </div>
            <button
              onClick={loadAuditLogs}
              className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors"
              title="Refresh Audit Logs"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${auditLoading ? 'animate-spin' : ''}`} />
            </button>
          </div>

          {auditLoading ? (
            <div className="bg-white rounded-3xl p-8 text-center text-slate-500 border border-slate-100">
              <RefreshCw className="w-6 h-6 animate-spin mx-auto text-blue-600 mb-2" />
              <p className="text-[13px] font-bold">Loading audit records...</p>
            </div>
          ) : auditLogs.length === 0 ? (
            <div className="bg-white rounded-3xl p-8 text-center border border-slate-100 shadow-xs">
              <FileText className="w-10 h-10 text-slate-300 mx-auto mb-2" />
              <p className="text-[13px] font-bold text-slate-700">No balance adjustments recorded yet.</p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {auditLogs.map((log) => {
                const isAdd = log.type === 'add';
                return (
                  <div
                    key={log.id}
                    className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span
                          className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${
                            isAdd ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'
                          }`}
                        >
                          {isAdd ? '+ ADDED FUNDS' : '- DEDUCTED FUNDS'}
                        </span>
                        <span className="text-[12px] font-extrabold text-slate-900">
                          @{log.username} ({log.userFullName || 'User'})
                        </span>
                        <span className="text-[11px] font-mono text-slate-400">
                          {log.date}
                        </span>
                      </div>

                      <p className="text-[12px] text-slate-600">
                        Reason: <span className="font-semibold text-slate-800">{log.reason}</span>
                      </p>
                      <p className="text-[11px] text-slate-400">
                        Authorized by Admin: <span className="font-bold text-slate-700">@{log.adminUsername}</span>
                      </p>
                    </div>

                    <div className="text-right bg-slate-50 sm:bg-transparent p-2.5 sm:p-0 rounded-xl sm:rounded-none">
                      <span
                        className={`text-[15px] font-mono font-black ${
                          isAdd ? 'text-emerald-600' : 'text-red-600'
                        }`}
                      >
                        {isAdd ? '+' : '-'}UGX {Math.abs(log.adjustmentAmountUGX).toLocaleString()}
                      </span>
                      <div className="text-[11px] font-mono text-slate-500">
                        UGX {log.previousBalanceUGX.toLocaleString()} → UGX {log.newBalanceUGX.toLocaleString()}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ==========================================
          TAB 5: CLUSTER MULTIPLIER
          ========================================== */}
      {activeSubTab === 'cluster' && (
        <div className="bg-white rounded-3xl p-5 border border-slate-100 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-[14px] font-extrabold text-slate-900 flex items-center gap-2">
              <Zap className="w-4 h-4 text-amber-500" /> Platform Hash Multiplier
            </h3>
            <span className="font-mono font-black text-blue-600 text-[16px]">
              {rewardMultiplier.toFixed(1)}x
            </span>
          </div>
          <p className="text-[12px] text-slate-500 leading-relaxed">
            Adjust the universal mining hash multiplier for all synchronized DS-Hardware clusters across the Uganda sovereign grid.
          </p>

          <input
            type="range"
            min="0.5"
            max="2.0"
            step="0.1"
            value={rewardMultiplier}
            onChange={(e) => setRewardMultiplier(parseFloat(e.target.value))}
            className="w-full accent-blue-600 cursor-pointer"
          />

          <div className="flex justify-between text-[11px] text-slate-500 font-mono">
            <span>0.5x (Safe)</span>
            <span>1.0x (Standard)</span>
            <span>2.0x (Hyper Yield)</span>
          </div>

          <div className="bg-slate-50 rounded-2xl p-3 border border-slate-200/80 space-y-1.5 text-[12px]">
            <div className="flex justify-between text-slate-600">
              <span>Target Hardware:</span>
              <span className="font-bold text-slate-900">Solar-Mech, DS-Shoe & Hydro</span>
            </div>
            <div className="flex justify-between text-slate-600">
              <span>Consensus Engine:</span>
              <span className="font-bold text-emerald-600">DS Hybrid Proof-of-Yield</span>
            </div>
          </div>

          <button
            onClick={handleTriggerRebalance}
            disabled={systemSyncing}
            className="w-full py-3 bg-[#1657D9] hover:bg-blue-700 text-white rounded-2xl text-[13px] font-bold flex items-center justify-center gap-2 transition-all cursor-pointer shadow-xs disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${systemSyncing ? 'animate-spin' : ''}`} />
            {systemSyncing ? 'Synchronizing Cluster Nodes...' : 'Apply Multiplier & Sync Nodes'}
          </button>
        </div>
      )}

      {/* ==========================================
          TAB 6: NODE CLUSTERS
          ========================================== */}
      {activeSubTab === 'nodes' && (
        <div className="space-y-3">
          <div className="bg-white rounded-3xl p-5 border border-slate-100 shadow-xs space-y-3">
            <h3 className="text-[14px] font-extrabold text-slate-900 flex items-center gap-2">
              <Server className="w-4 h-4 text-blue-600" /> Active Rigs & Subsystems
            </h3>

            <div className="divide-y divide-slate-100">
              <div className="py-2.5 flex items-center justify-between">
                <div>
                  <h4 className="text-[13px] font-bold text-slate-900">Cluster Alpha (Jinja Solar Farm)</h4>
                  <span className="text-[11px] text-slate-400 font-mono">64 Units • 99.9% Uptime</span>
                </div>
                <span className="text-[10.5px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                  OPTIMAL
                </span>
              </div>

              <div className="py-2.5 flex items-center justify-between">
                <div>
                  <h4 className="text-[13px] font-bold text-slate-900">Cluster Beta (Victoria Hydro Dam)</h4>
                  <span className="text-[11px] text-slate-400 font-mono">42 Units • 99.8% Uptime</span>
                </div>
                <span className="text-[10.5px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                  OPTIMAL
                </span>
              </div>

              <div className="py-2.5 flex items-center justify-between">
                <div>
                  <h4 className="text-[13px] font-bold text-slate-900">Cluster Gamma (Kampala Kinetic)</h4>
                  <span className="text-[11px] text-slate-400 font-mono">42 Units • 98.9% Uptime</span>
                </div>
                <span className="text-[10.5px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                  OPTIMAL
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ==========================================
          TAB 7: MULTISIG TASKS
          ========================================== */}
      {activeSubTab === 'tasks' && (
        <div className="space-y-3">
          {tasks.length === 0 ? (
            <div className="bg-white rounded-3xl p-8 text-center text-slate-500 border border-slate-100">
              <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
              <p className="text-[13px] font-bold">All Multisig queue tasks resolved.</p>
            </div>
          ) : (
            tasks.map((task) => (
              <div
                key={task.id}
                className="bg-white rounded-3xl p-4 sm:p-5 border border-slate-100 shadow-xs space-y-2"
              >
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-blue-100 text-blue-800">
                    {task.category || 'System Action'}
                  </span>
                  <span className="text-[11px] text-slate-400 font-mono">{task.timestamp}</span>
                </div>

                <h4 className="text-[13.5px] font-bold text-slate-900 leading-snug">
                  {task.title}
                </h4>
                <p className="text-[12px] text-slate-600 mt-1 leading-relaxed">
                  {task.description}
                </p>

                {task.amountUGX && (
                  <div className="mt-2 text-[13px] font-mono font-black text-slate-900">
                    Amount: UGX {task.amountUGX.toLocaleString()}
                  </div>
                )}

                {task.status === 'pending' && (
                  <div className="flex items-center gap-2 mt-3 pt-2.5 border-t border-slate-100">
                    <button
                      onClick={() => handleApprove(task.id)}
                      className="flex-1 bg-[#1657D9] hover:bg-blue-700 active:scale-98 text-white font-bold text-[12px] py-2 px-3 rounded-xl transition-all flex items-center justify-center gap-1 cursor-pointer shadow-xs"
                    >
                      <Check className="w-3.5 h-3.5" /> Approve & Sign
                    </button>
                    <button
                      onClick={() => onRejectTask(task.id)}
                      className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-[12px] py-2 px-3 rounded-xl transition-colors cursor-pointer"
                    >
                      Reject
                    </button>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      )}

      {/* ==========================================
          MODALS FOR USER & PROJECT MANAGEMENT
          ========================================== */}

      {/* 1. EDIT USER MODAL */}
      {editingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl border border-slate-100 p-6 space-y-4 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center font-bold text-[13px]">
                  <Edit2 className="w-4 h-4" />
                </div>
                <h3 className="text-[16px] font-extrabold text-slate-900">
                  Edit User Profile
                </h3>
              </div>
              <button
                onClick={() => setEditingUser(null)}
                className="p-1.5 rounded-xl text-slate-400 hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {editUserError && (
              <div className="p-3 rounded-xl bg-red-50 text-red-700 text-[12px] font-semibold border border-red-200">
                {editUserError}
              </div>
            )}

            <form onSubmit={handleSaveEditUser} className="space-y-3.5">
              <div>
                <label className="block text-[12px] font-bold text-slate-700 mb-1">
                  Username
                </label>
                <input
                  type="text"
                  value={editUsername}
                  onChange={(e) => setEditUsername(e.target.value)}
                  required
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-[13px] font-mono focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
              </div>

              <div>
                <label className="block text-[12px] font-bold text-slate-700 mb-1">
                  Full Name
                </label>
                <input
                  type="text"
                  value={editFullName}
                  onChange={(e) => setEditFullName(e.target.value)}
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-[13px] focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
              </div>

              <div>
                <label className="block text-[12px] font-bold text-slate-700 mb-1">
                  Phone Number
                </label>
                <input
                  type="tel"
                  placeholder="+256 700 000 000"
                  value={editPhone}
                  onChange={(e) => setEditPhone(e.target.value)}
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-[13px] focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingUser(null)}
                  className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-[12.5px] rounded-xl transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={editUserLoading}
                  className="flex-1 py-2.5 bg-[#1657D9] hover:bg-blue-700 text-white font-bold text-[12.5px] rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-xs disabled:opacity-50"
                >
                  {editUserLoading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 2. ADJUST BALANCE MODAL */}
      {adjustingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl border border-slate-100 p-6 space-y-4 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
                  <DollarSign className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-[16px] font-extrabold text-slate-900 leading-tight">
                    Adjust User Balance
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Target: @{adjustingUser.username} ({adjustingUser.fullName || 'User'})
                  </p>
                </div>
              </div>
              <button
                onClick={() => setAdjustingUser(null)}
                className="p-1.5 rounded-xl text-slate-400 hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Current Balance Box */}
            <div className="bg-slate-50 rounded-2xl p-3 border border-slate-200/80 flex items-center justify-between">
              <span className="text-[12px] font-bold text-slate-600">Current User Balance:</span>
              <span className="text-[15px] font-mono font-black text-slate-900">
                UGX {adjustingUser.balanceUGX.toLocaleString()}
              </span>
            </div>

            {adjustError && (
              <div className="p-3 rounded-xl bg-red-50 text-red-700 text-[12px] font-semibold border border-red-200">
                {adjustError}
              </div>
            )}

            <form onSubmit={handleSaveAdjustBalance} className="space-y-3.5">
              {/* Type Selection (Add vs Deduct) */}
              <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 rounded-2xl">
                <button
                  type="button"
                  onClick={() => setAdjustType('add')}
                  className={`py-2 rounded-xl text-[12px] font-bold transition-all cursor-pointer ${
                    adjustType === 'add'
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  + Add Funds
                </button>
                <button
                  type="button"
                  onClick={() => setAdjustType('deduct')}
                  className={`py-2 rounded-xl text-[12px] font-bold transition-all cursor-pointer ${
                    adjustType === 'deduct'
                      ? 'bg-red-600 text-white shadow-xs'
                      : 'text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  - Deduct Funds
                </button>
              </div>

              <div>
                <label className="block text-[12px] font-bold text-slate-700 mb-1">
                  Adjustment Amount (UGX)
                </label>
                <input
                  type="number"
                  placeholder="e.g. 50000"
                  value={adjustAmount}
                  onChange={(e) => setAdjustAmount(e.target.value)}
                  required
                  min="1"
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-[14px] font-mono font-bold focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
              </div>

              <div>
                <label className="block text-[12px] font-bold text-slate-700 mb-1">
                  Audit Reason / Description
                </label>
                <input
                  type="text"
                  placeholder="e.g. Mobile Money merchant manual deposit settlement"
                  value={adjustReason}
                  onChange={(e) => setAdjustReason(e.target.value)}
                  required
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-[12.5px] focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
              </div>

              {/* Real-time Resulting Balance Preview */}
              {adjustAmount && !isNaN(Number(adjustAmount)) && Number(adjustAmount) > 0 && (
                <div className="bg-blue-50/70 rounded-2xl p-3 border border-blue-200/80 text-[12px] flex items-center justify-between">
                  <span className="text-blue-900 font-bold">Resulting Balance:</span>
                  <span className="font-mono font-black text-blue-900 text-[14px]">
                    UGX{' '}
                    {(
                      adjustType === 'add'
                        ? adjustingUser.balanceUGX + Number(adjustAmount)
                        : Math.max(0, adjustingUser.balanceUGX - Number(adjustAmount))
                    ).toLocaleString()}
                  </span>
                </div>
              )}

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setAdjustingUser(null)}
                  className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-[12.5px] rounded-xl transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={adjustLoading}
                  className={`flex-1 py-2.5 font-bold text-[12.5px] rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-xs text-white disabled:opacity-50 ${
                    adjustType === 'add' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-red-600 hover:bg-red-700'
                  }`}
                >
                  {adjustLoading ? (
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    `Confirm ${adjustType === 'add' ? 'Credit' : 'Deduction'}`
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 3. BLOCK / UNBLOCK CONFIRMATION MODAL */}
      {statusConfirmUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-3xl w-full max-w-sm shadow-2xl border border-slate-100 p-6 space-y-4 text-center animate-in zoom-in-95 duration-200">
            <div
              className={`w-14 h-14 rounded-2xl flex items-center justify-center mx-auto ${
                statusConfirmUser.targetStatus === 'blocked'
                  ? 'bg-amber-100 text-amber-600'
                  : 'bg-emerald-100 text-emerald-600'
              }`}
            >
              {statusConfirmUser.targetStatus === 'blocked' ? (
                <Lock className="w-7 h-7" />
              ) : (
                <Unlock className="w-7 h-7" />
              )}
            </div>

            <div>
              <h3 className="text-[17px] font-extrabold text-slate-900">
                {statusConfirmUser.targetStatus === 'blocked' ? 'Block User Account?' : 'Unblock User Account?'}
              </h3>
              <p className="text-[12.5px] text-slate-600 mt-1 leading-relaxed">
                {statusConfirmUser.targetStatus === 'blocked'
                  ? `Suspending @${statusConfirmUser.user.username} will immediately restrict their ability to deposit, withdraw, or invest, while keeping historical ledgers intact.`
                  : `Unblocking @${statusConfirmUser.user.username} will restore full active trading, deposit, and investment privileges.`}
              </p>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setStatusConfirmUser(null)}
                className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-[12.5px] rounded-xl transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmStatusChange}
                disabled={statusLoading}
                className={`flex-1 py-2.5 text-white font-bold text-[12.5px] rounded-xl transition-all cursor-pointer shadow-xs disabled:opacity-50 ${
                  statusConfirmUser.targetStatus === 'blocked'
                    ? 'bg-amber-600 hover:bg-amber-700'
                    : 'bg-emerald-600 hover:bg-emerald-700'
                }`}
              >
                {statusLoading ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin mx-auto" />
                ) : statusConfirmUser.targetStatus === 'blocked' ? (
                  'Yes, Block User'
                ) : (
                  'Yes, Unblock'
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 4. DELETE USER CONFIRMATION MODAL */}
      {deletingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-3xl w-full max-w-sm shadow-2xl border border-slate-100 p-6 space-y-4 text-center animate-in zoom-in-95 duration-200">
            <div className="w-14 h-14 rounded-2xl bg-red-100 text-red-600 flex items-center justify-center mx-auto">
              <Trash2 className="w-7 h-7" />
            </div>

            <div>
              <h3 className="text-[17px] font-extrabold text-slate-900">
                Delete Account @{deletingUser.username}?
              </h3>
              <p className="text-[12.5px] text-slate-600 mt-1 leading-relaxed">
                This will safely deactivate the account and revoke all active Supabase sessions for <span className="font-bold text-slate-900">{deletingUser.fullName || deletingUser.username}</span>.
              </p>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setDeletingUser(null)}
                className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-[12.5px] rounded-xl transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteUser}
                disabled={deleteLoading}
                className="flex-1 py-2.5 bg-red-600 hover:bg-red-700 text-white font-bold text-[12.5px] rounded-xl transition-all cursor-pointer shadow-xs disabled:opacity-50"
              >
                {deleteLoading ? <RefreshCw className="w-3.5 h-3.5 animate-spin mx-auto" /> : 'Confirm Deletion'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 5. CREATE / EDIT PROJECT MODAL */}
      {editingProject && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-3xl w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-2xl border border-slate-100 p-6 space-y-4 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center font-bold">
                  <Layers className="w-4 h-4" />
                </div>
                <h3 className="text-[16px] font-extrabold text-slate-900">
                  {isCreatingProject ? 'Add New Investment Project' : `Edit "${editingProject.title}"`}
                </h3>
              </div>
              <button
                onClick={() => {
                  setEditingProject(null);
                  setIsCreatingProject(false);
                }}
                className="p-1.5 rounded-xl text-slate-400 hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {projectFormError && (
              <div className="p-3 rounded-xl bg-red-50 text-red-700 text-[12px] font-semibold border border-red-200">
                {projectFormError}
              </div>
            )}

            <form onSubmit={handleSaveProject} className="space-y-3.5">
              <div>
                <label className="block text-[12px] font-bold text-slate-700 mb-1">
                  Project Title
                </label>
                <input
                  type="text"
                  placeholder="e.g. SOLAR-MECH 20"
                  value={editingProject.title || ''}
                  onChange={(e) => setEditingProject({ ...editingProject, title: e.target.value })}
                  required
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-[13px] focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
              </div>

              <div>
                <label className="block text-[12px] font-bold text-slate-700 mb-1">
                  Subtitle / Subsystem
                </label>
                <input
                  type="text"
                  placeholder="e.g. (Dual-Core Autonomous Miner)"
                  value={editingProject.subtitle || ''}
                  onChange={(e) => setEditingProject({ ...editingProject, subtitle: e.target.value })}
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-[13px] focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[12px] font-bold text-slate-700 mb-1">
                    Category
                  </label>
                  <select
                    value={editingProject.category || 'DS-Mining'}
                    onChange={(e) =>
                      setEditingProject({
                        ...editingProject,
                        category: e.target.value as any,
                      })
                    }
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-[13px] focus:outline-none focus:ring-2 focus:ring-blue-500/20 cursor-pointer"
                  >
                    <option value="DS-Mining">DS-Mining</option>
                    <option value="Clean Energy">Clean Energy</option>
                    <option value="VIP Products">VIP Products</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[12px] font-bold text-slate-700 mb-1">
                    Status
                  </label>
                  <select
                    value={editingProject.status || 'Active'}
                    onChange={(e) =>
                      setEditingProject({
                        ...editingProject,
                        status: e.target.value as any,
                      })
                    }
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-[13px] focus:outline-none focus:ring-2 focus:ring-blue-500/20 cursor-pointer"
                  >
                    <option value="Active">Active</option>
                    <option value="Maintenance">Maintenance</option>
                    <option value="Reserved">Reserved</option>
                    <option value="Pending">Pending</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[12px] font-bold text-slate-700 mb-1">
                    Min Investment (UGX)
                  </label>
                  <input
                    type="number"
                    placeholder="e.g. 5000000"
                    value={editingProject.minInvestUGX || ''}
                    onChange={(e) =>
                      setEditingProject({
                        ...editingProject,
                        minInvestUGX: Number(e.target.value),
                      })
                    }
                    required
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-[13px] font-mono focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  />
                </div>

                <div>
                  <label className="block text-[12px] font-bold text-slate-700 mb-1">
                    Daily Reward (UGX)
                  </label>
                  <input
                    type="number"
                    placeholder="e.g. 212328"
                    value={editingProject.dailyRewardUGX || ''}
                    onChange={(e) =>
                      setEditingProject({
                        ...editingProject,
                        dailyRewardUGX: Number(e.target.value),
                      })
                    }
                    required
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-[13px] font-mono focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[12px] font-bold text-slate-700 mb-1">
                    Estimated Yearly ROI (%)
                  </label>
                  <input
                    type="number"
                    placeholder="e.g. 120"
                    value={editingProject.estYearlyROI || ''}
                    onChange={(e) =>
                      setEditingProject({
                        ...editingProject,
                        estYearlyROI: Number(e.target.value),
                      })
                    }
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-[13px] focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  />
                </div>

                <div>
                  <label className="block text-[12px] font-bold text-slate-700 mb-1">
                    Hashrate
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. 54.2 TH/s"
                    value={editingProject.hashrate || ''}
                    onChange={(e) =>
                      setEditingProject({
                        ...editingProject,
                        hashrate: e.target.value,
                      })
                    }
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-[13px] focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[12px] font-bold text-slate-700 mb-1">
                  Power Source / Hardware Spec
                </label>
                <input
                  type="text"
                  placeholder="e.g. Solar 1.2kW Array + Dual Dynamos"
                  value={editingProject.powerSource || ''}
                  onChange={(e) =>
                    setEditingProject({
                      ...editingProject,
                      powerSource: e.target.value,
                    })
                  }
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-[13px] focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
              </div>

              <div>
                <label className="block text-[12px] font-bold text-slate-700 mb-1">
                  Image URL
                </label>
                <input
                  type="url"
                  placeholder="https://images.unsplash.com/..."
                  value={editingProject.image || ''}
                  onChange={(e) => setEditingProject({ ...editingProject, image: e.target.value })}
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-[12.5px] font-mono focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setEditingProject(null);
                    setIsCreatingProject(false);
                  }}
                  className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-[12.5px] rounded-xl transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={projectFormLoading}
                  className="flex-1 py-2.5 bg-[#1657D9] hover:bg-blue-700 text-white font-bold text-[12.5px] rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-xs disabled:opacity-50"
                >
                  {projectFormLoading ? (
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  ) : isCreatingProject ? (
                    'Create Project'
                  ) : (
                    'Save Project'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
