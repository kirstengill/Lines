import React, { useState } from 'react';
import { X, ShieldCheck, ShieldAlert, CheckCircle, AlertTriangle, Play, RefreshCw, Cpu, Server, Check, Lock, LogIn } from 'lucide-react';
import confetti from 'canvas-confetti';
import { AdminTask, UserProfile } from '../types';

interface AdminPanelModalProps {
  tasks: AdminTask[];
  currentUser: UserProfile | null;
  onClose: () => void;
  onApproveTask: (taskId: string) => void;
  onRejectTask: (taskId: string) => void;
  onOpenAuth?: () => void;
}

export const AdminPanelModal: React.FC<AdminPanelModalProps> = ({
  tasks,
  currentUser,
  onClose,
  onApproveTask,
  onRejectTask,
  onOpenAuth,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'tasks' | 'cluster' | 'logs'>('tasks');
  const [rewardMultiplier, setRewardMultiplier] = useState<number>(1.0);
  const [systemSyncing, setSystemSyncing] = useState(false);

  const isAdmin = Boolean(currentUser?.isAdmin || currentUser?.role === 'admin');
  const pendingTasks = tasks.filter((t) => t.status === 'pending');

  const handleApprove = (taskId: string) => {
    confetti({ particleCount: 50, spread: 45 });
    onApproveTask(taskId);
  };

  const handleTriggerRebalance = () => {
    setSystemSyncing(true);
    setTimeout(() => setSystemSyncing(false), 1200);
  };

  // If user is not an authenticated Admin, display Supabase Access Denied screen
  if (!isAdmin) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
        <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl border border-slate-100 p-6 text-center space-y-4 animate-in zoom-in-95 duration-200">
          <div className="w-14 h-14 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center mx-auto shadow-xs">
            <Lock className="w-7 h-7 text-amber-600" />
          </div>

          <div>
            <span className="text-[10.5px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-900">
              Supabase Auth • RBAC Enforced
            </span>
            <h3 className="text-[18px] font-extrabold text-slate-900 mt-2">
              Admin Privileges Required
            </h3>
            <p className="text-[12.5px] text-slate-600 mt-2 leading-relaxed">
              Your authenticated Supabase session <span className="font-mono font-bold text-slate-900">@{currentUser?.username || 'investor'}</span> does not have Administrator privileges.
            </p>
          </div>

          <div className="bg-slate-50 rounded-2xl p-3.5 border border-slate-200/80 text-left text-[12px] space-y-1.5">
            <div className="flex items-center justify-between text-slate-500">
              <span>Account Role:</span>
              <span className="font-bold text-slate-900 capitalize">{currentUser?.role || 'Standard User'}</span>
            </div>
            <div className="flex items-center justify-between text-slate-500">
              <span>Admin Access:</span>
              <span className="font-bold text-red-600">Restricted</span>
            </div>
            <div className="flex items-center justify-between text-slate-500">
              <span>Auth Session ID:</span>
              <span className="font-mono text-[10px] text-slate-400 truncate max-w-[150px]">{currentUser?.id || 'session'}</span>
            </div>
          </div>

          <p className="text-[11.5px] text-slate-500 leading-snug">
            Platform multisig operations, hashrate multipliers, and withdrawal batch approvals are strictly limited to verified Administrator accounts.
          </p>

          <div className="flex gap-2.5 pt-2">
            <button
              onClick={onClose}
              className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-[13px] font-bold transition-colors cursor-pointer"
            >
              Back to Dashboard
            </button>
            {onOpenAuth && (
              <button
                onClick={() => {
                  onClose();
                  onOpenAuth();
                }}
                className="flex-1 py-2.5 bg-[#1657D9] hover:bg-blue-700 text-white rounded-xl text-[13px] font-bold transition-colors flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
              >
                <LogIn className="w-4 h-4" />
                Switch Account
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white rounded-3xl w-full max-w-md max-h-[92vh] overflow-y-auto shadow-2xl border border-slate-100 flex flex-col animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="p-5 border-b border-slate-100 flex items-center justify-between sticky top-0 bg-white/95 backdrop-blur-md z-10">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-[17px] font-extrabold text-[#0F172A] leading-tight flex items-center gap-1.5">
                Admin Console
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                  AUTHORIZED
                </span>
              </h3>
              <p className="text-[11px] text-slate-500">
                Supabase Admin: @{currentUser?.username}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Sub Navigation */}
        <div className="px-5 pt-3 pb-1 border-b border-slate-100 flex gap-2">
          <button
            onClick={() => setActiveSubTab('tasks')}
            className={`pb-2 text-[12.5px] font-semibold border-b-2 transition-all ${
              activeSubTab === 'tasks'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            Pending Tasks ({pendingTasks.length})
          </button>
          <button
            onClick={() => setActiveSubTab('cluster')}
            className={`pb-2 text-[12.5px] font-semibold border-b-2 transition-all ${
              activeSubTab === 'cluster'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            DS-Cluster Status
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-4">
          {activeSubTab === 'tasks' && (
            <div className="space-y-3">
              {tasks.length === 0 ? (
                <div className="text-center py-8 text-slate-400 text-[13px]">
                  No admin tasks currently logged.
                </div>
              ) : (
                tasks.map((task) => (
                  <div
                    key={task.id}
                    className={`rounded-2xl p-4 border transition-all ${
                      task.status === 'pending'
                        ? 'bg-amber-50/60 border-amber-200 shadow-xs'
                        : task.status === 'approved'
                        ? 'bg-slate-50 border-slate-200 opacity-80'
                        : 'bg-red-50 border-red-200'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-slate-200/80 text-slate-700">
                          {task.category}
                        </span>
                        <span className="text-[11px] text-slate-500">{task.timestamp}</span>
                      </div>
                      <span
                        className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
                          task.status === 'pending'
                            ? 'bg-amber-200 text-amber-900'
                            : task.status === 'approved'
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-red-100 text-red-800'
                        }`}
                      >
                        {task.status.toUpperCase()}
                      </span>
                    </div>

                    <h4 className="text-[13.5px] font-bold text-slate-900 leading-snug">
                      {task.title}
                    </h4>
                    <p className="text-[12px] text-slate-600 mt-1 leading-relaxed">
                      {task.description}
                    </p>

                    {task.amountUGX && (
                      <div className="mt-2 text-[12.5px] font-mono font-bold text-slate-800">
                        Amount: UGX {task.amountUGX.toLocaleString()}
                      </div>
                    )}

                    {task.status === 'pending' && (
                      <div className="flex items-center gap-2 mt-3 pt-2 border-t border-amber-200/60">
                        <button
                          onClick={() => handleApprove(task.id)}
                          className="flex-1 bg-[#1657D9] hover:bg-blue-700 text-white font-semibold text-[12px] py-1.5 px-3 rounded-lg transition-colors flex items-center justify-center gap-1 cursor-pointer"
                        >
                          <Check className="w-3.5 h-3.5" /> Approve & Execute
                        </button>
                        <button
                          onClick={() => onRejectTask(task.id)}
                          className="bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 font-semibold text-[12px] py-1.5 px-3 rounded-lg transition-colors cursor-pointer"
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

          {activeSubTab === 'cluster' && (
            <div className="space-y-4">
              <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200/80 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[13px] font-bold text-slate-900">
                    Platform Hash Yield Multiplier
                  </span>
                  <span className="font-mono font-bold text-blue-600 text-[14px]">
                    {rewardMultiplier.toFixed(1)}x
                  </span>
                </div>
                <input
                  type="range"
                  min="0.5"
                  max="2.0"
                  step="0.1"
                  value={rewardMultiplier}
                  onChange={(e) => setRewardMultiplier(parseFloat(e.target.value))}
                  className="w-full accent-blue-600"
                />
                <div className="flex justify-between text-[10px] text-slate-500 font-mono">
                  <span>0.5x (Safe)</span>
                  <span>1.0x (Standard)</span>
                  <span>2.0x (Hyper)</span>
                </div>
              </div>

              <div className="bg-[#0F172A] text-white rounded-2xl p-4 space-y-2">
                <div className="flex items-center justify-between text-[12px]">
                  <span className="text-slate-400">Total DS Network Hash</span>
                  <span className="font-mono font-bold text-emerald-400">1,842.5 TH/s</span>
                </div>
                <div className="flex items-center justify-between text-[12px]">
                  <span className="text-slate-400">Online Mining Rigs</span>
                  <span className="font-mono font-bold">148 Units</span>
                </div>
                <div className="flex items-center justify-between text-[12px]">
                  <span className="text-slate-400">Solar Yield Efficiency</span>
                  <span className="font-mono font-bold text-amber-400">99.4% Irradiance</span>
                </div>
              </div>

              <button
                onClick={handleTriggerRebalance}
                disabled={systemSyncing}
                className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-[13px] font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer"
              >
                <RefreshCw className={`w-4 h-4 ${systemSyncing ? 'animate-spin' : ''}`} />
                {systemSyncing ? 'Synchronizing Cluster...' : 'Sync DS-Mining Protocol Nodes'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
