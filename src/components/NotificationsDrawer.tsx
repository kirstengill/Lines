import React from 'react';
import { X, CheckCheck, Bell, CheckCircle2, AlertCircle, Info } from 'lucide-react';
import { AppNotification } from '../types';

interface NotificationsDrawerProps {
  notifications: AppNotification[];
  onClose: () => void;
  onMarkAllRead: () => void;
}

export const NotificationsDrawer: React.FC<NotificationsDrawerProps> = ({
  notifications,
  onClose,
  onMarkAllRead,
}) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white rounded-3xl w-full max-w-md max-h-[85vh] overflow-y-auto shadow-2xl border border-slate-100 flex flex-col animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="p-5 border-b border-slate-100 flex items-center justify-between sticky top-0 bg-white/95 backdrop-blur-md z-10">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center">
              <Bell className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-[17px] font-extrabold text-[#0F172A] leading-tight">
                Notifications
              </h3>
              <p className="text-[11px] text-slate-500">
                System and reward distribution logs
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

        {/* Action bar */}
        <div className="px-5 py-2.5 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
          <span className="text-[12px] font-medium text-slate-600">
            {notifications.length} alerts
          </span>
          <button
            onClick={onMarkAllRead}
            className="text-[12px] font-semibold text-blue-600 hover:text-blue-800 flex items-center gap-1"
          >
            <CheckCheck className="w-3.5 h-3.5" /> Mark all read
          </button>
        </div>

        {/* Feed */}
        <div className="p-5 space-y-3">
          {notifications.length === 0 ? (
            <div className="text-center py-8 text-slate-400 text-[13px]">
              No unread notifications
            </div>
          ) : (
            notifications.map((n) => (
              <div
                key={n.id}
                className={`p-3.5 rounded-2xl border transition-all ${
                  n.read
                    ? 'bg-slate-50/60 border-slate-200/80 text-slate-700'
                    : 'bg-blue-50/50 border-blue-200 text-slate-900 shadow-xs'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 shrink-0">
                    {n.type === 'success' && <CheckCircle2 className="w-4 h-4 text-emerald-600" />}
                    {n.type === 'alert' && <AlertCircle className="w-4 h-4 text-amber-600" />}
                    {n.type === 'info' && <Info className="w-4 h-4 text-blue-600" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1">
                      <h4 className="text-[13px] font-bold leading-tight">{n.title}</h4>
                      <span className="text-[10px] text-slate-400 font-medium shrink-0">
                        {n.timestamp}
                      </span>
                    </div>
                    <p className="text-[12px] text-slate-600 mt-1 leading-relaxed">
                      {n.message}
                    </p>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
