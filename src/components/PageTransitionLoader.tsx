import React, { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';

interface PageTransitionLoaderProps {
  isLoading: boolean;
  message?: string;
  onTimeout?: () => void;
}

export const PageTransitionLoader: React.FC<PageTransitionLoaderProps> = ({
  isLoading,
  message,
  onTimeout,
}) => {
  const [visible, setVisible] = useState(isLoading);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (isLoading) {
      setVisible(true);
      // Safety auto-dismissal after 2.5s to prevent stuck loading state
      timer = setTimeout(() => {
        setVisible(false);
        if (onTimeout) onTimeout();
      }, 2500);
    } else {
      // Graceful micro-delay before unmounting for smooth finish
      const exitTimer = setTimeout(() => {
        setVisible(false);
      }, 100);
      return () => clearTimeout(exitTimer);
    }
    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [isLoading, onTimeout]);

  if (!visible) return null;

  return (
    <div
      className={`fixed inset-x-0 top-0 z-50 pointer-events-none transition-opacity duration-150 ${
        isLoading ? 'opacity-100' : 'opacity-0'
      }`}
    >
      {/* 1. Top High-Precision Running Progress Indicator Bar */}
      <div className="h-[3px] w-full bg-slate-200/50 backdrop-blur-xs overflow-hidden relative shadow-xs">
        <div className="h-full bg-gradient-to-r from-blue-600 via-sky-400 to-indigo-600 animate-[pageProgress_0.75s_cubic-bezier(0.4,0,0.2,1)_infinite]" />
      </div>

      {/* 2. Soft Ambient Glow Line underneath */}
      <div className="h-[2px] bg-gradient-to-r from-transparent via-blue-500/30 to-transparent blur-[2px]" />

      {/* 3. Subtle floating micro-indicator chip */}
      <div className="flex justify-center mt-2.5">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-900/90 text-white backdrop-blur-md shadow-md border border-slate-700/50 text-[11px] font-semibold tracking-wide animate-page-fade-in">
          <Loader2 className="w-3 h-3 text-blue-400 animate-spin shrink-0" />
          <span>{message || 'Switching view...'}</span>
        </div>
      </div>
    </div>
  );
};
