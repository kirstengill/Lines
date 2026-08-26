import React from 'react';
import { MessageSquareText } from 'lucide-react';

interface FloatingChatButtonProps {
  onClick: () => void;
  unreadCount?: number;
}

export const FloatingChatButton: React.FC<FloatingChatButtonProps> = ({
  onClick,
  unreadCount = 0,
}) => {
  return (
    <button
      id="btn-floating-chat"
      onClick={onClick}
      aria-label="Open Live Support & Assistant"
      className="absolute right-4 bottom-16 z-30 w-13 h-13 rounded-full bg-[#1657D9] text-white flex items-center justify-center shadow-[0_8px_20px_-2px_rgba(22,87,217,0.45)] hover:bg-blue-700 active:scale-90 transition-all cursor-pointer"
    >
      <MessageSquareText className="w-6 h-6" />
      {unreadCount > 0 && (
        <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center border-2 border-white">
          {unreadCount}
        </span>
      )}
    </button>
  );
};
