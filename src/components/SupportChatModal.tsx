import React, { useState } from 'react';
import { X, Send, Bot, User, Sparkles, HelpCircle } from 'lucide-react';
import { ChatMessage } from '../types';

interface SupportChatModalProps {
  onClose: () => void;
}

export const SupportChatModal: React.FC<SupportChatModalProps> = ({ onClose }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'm1',
      sender: 'support',
      text: 'Hello! Welcome to SolNova Capital — Solar Mining & Investment. How can I assist you with your mining plans, UGX reward payouts, or wallet today?',
      timestamp: 'Just now',
    },
  ]);
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);

  const quickQuestions = [
    'How do DS-Mining Shoe rewards work?',
    'When are daily UGX payouts settled?',
    'How to deposit via MTN / Airtel Mobile Money?',
    'What is the minimum investment for Solar-Mech 10?',
  ];

  const handleSend = (textToSend?: string) => {
    const text = textToSend || inputText;
    if (!text.trim()) return;

    const userMsg: ChatMessage = {
      id: `msg_${Date.now()}`,
      sender: 'user',
      text: text.trim(),
      timestamp: 'Just now',
    };

    setMessages((prev) => [...prev, userMsg]);
    if (!textToSend) setInputText('');
    setIsTyping(true);

    setTimeout(() => {
      let reply = "Our support team and DS-Algorithm have received your inquiry. All hardware rewards are calculated every block cycle and credited automatically to your Consolidated Wallet.";

      const lower = text.toLowerCase();
      if (lower.includes('shoe') || lower.includes('ds-mining shoe')) {
        reply = "The DS-MINING SHOE (Series 1) utilizes advanced kinetic-electro hybrid dynamos paired with ASIC micro-processors. It generates UGX 1,200,000 daily rewards with an estimated 135% yearly ROI!";
      } else if (lower.includes('solar') || lower.includes('mower')) {
        reply = "The SOLAR-MECH 10 combines autonomous solar panel arrays with dual kinetic mowers, generating UGX 212,328 per day with zero grid power costs.";
      } else if (lower.includes('payout') || lower.includes('settled') || lower.includes('ugx')) {
        reply = "Daily payouts are automatically aggregated at 00:00 UTC and distributed in UGX directly into your Consolidated Dashboard wallet. You can withdraw anytime to MTN/Airtel MoMo or USDT!";
      } else if (lower.includes('mtn') || lower.includes('airtel') || lower.includes('mobile money') || lower.includes('deposit')) {
        reply = "To deposit via Mobile Money, tap 'Deposit' in your Consolidated Dashboard, select UGX MoMo, and use Merchant code *165*3*991204# under Sunrise Capital DS Ltd.";
      }

      setMessages((prev) => [
        ...prev,
        {
          id: `msg_rep_${Date.now()}`,
          sender: 'support',
          text: reply,
          timestamp: 'Just now',
        },
      ]);
      setIsTyping(false);
    }, 700);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white rounded-3xl w-full max-w-md h-[550px] shadow-2xl border border-slate-100 flex flex-col animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-blue-600 to-[#1657D9] text-white rounded-t-3xl">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center backdrop-blur-xs">
              <Bot className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-[15px] font-bold leading-tight">
                SolNova Support Desk
              </h3>
              <p className="text-[11px] text-blue-100 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                24/7 AI Concierge Online
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-full hover:bg-white/20 transition-colors"
          >
            <X className="w-5 h-5 text-white" />
          </button>
        </div>

        {/* Message stream */}
        <div className="flex-1 p-4 overflow-y-auto space-y-3 bg-[#F8FAFC]">
          {messages.map((m) => (
            <div
              key={m.id}
              className={`flex items-start gap-2 ${
                m.sender === 'user' ? 'flex-row-reverse' : ''
              }`}
            >
              <div
                className={`w-7 h-7 rounded-full flex items-center justify-center text-xs shrink-0 ${
                  m.sender === 'user'
                    ? 'bg-blue-600 text-white'
                    : 'bg-white border border-slate-200 text-blue-600 shadow-xs'
                }`}
              >
                {m.sender === 'user' ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
              </div>
              <div
                className={`max-w-[80%] rounded-2xl p-3 text-[13px] leading-relaxed ${
                  m.sender === 'user'
                    ? 'bg-[#1657D9] text-white rounded-tr-xs'
                    : 'bg-white text-slate-800 border border-slate-200/80 shadow-xs rounded-tl-xs'
                }`}
              >
                {m.text}
              </div>
            </div>
          ))}

          {isTyping && (
            <div className="flex items-center gap-2 text-slate-400 text-xs pl-9">
              <span className="w-2 h-2 rounded-full bg-blue-500 animate-bounce"></span>
              <span className="w-2 h-2 rounded-full bg-blue-500 animate-bounce [animation-delay:0.2s]"></span>
              <span className="w-2 h-2 rounded-full bg-blue-500 animate-bounce [animation-delay:0.4s]"></span>
            </div>
          )}
        </div>

        {/* Quick prompt suggestions */}
        <div className="px-3 py-2 bg-slate-50 border-t border-slate-100 flex gap-1.5 overflow-x-auto no-scrollbar">
          {quickQuestions.map((q, idx) => (
            <button
              key={idx}
              onClick={() => handleSend(q)}
              className="text-[11px] whitespace-nowrap bg-white border border-slate-200 text-slate-700 hover:border-blue-300 hover:bg-blue-50/50 px-2.5 py-1 rounded-full shrink-0 transition-colors"
            >
              {q}
            </button>
          ))}
        </div>

        {/* Input bar */}
        <div className="p-3 bg-white border-t border-slate-100 flex items-center gap-2 rounded-b-3xl">
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            placeholder="Type your message or question..."
            className="flex-1 px-3.5 py-2 text-[13px] bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
          />
          <button
            onClick={() => handleSend()}
            disabled={!inputText.trim()}
            className="p-2 rounded-xl bg-[#1657D9] hover:bg-blue-700 disabled:opacity-50 text-white transition-colors cursor-pointer"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
