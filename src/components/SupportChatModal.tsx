import React, { useState } from 'react';
import { X, Send, Bot, User, Sparkles, HelpCircle, MessageCircle, ExternalLink } from 'lucide-react';
import { ChatMessage } from '../types';
import { WHATSAPP_HELP_URL } from '../constants/links';

interface SupportChatModalProps {
  onClose: () => void;
}

export const SupportChatModal: React.FC<SupportChatModalProps> = ({ onClose }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'm1',
      sender: 'support',
      text: 'Hello! Welcome to SolNova Capital — Solar Mining & Investment. How can I assist you with investment plans, MTN MoMo deposits (0766495353 - ELIX OWOMUZINYA), withdrawals, referral earnings, or WhatsApp support today?',
      timestamp: 'Just now',
    },
  ]);
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);

  const quickQuestions = [
    'Chat with WhatsApp Helpdesk',
    'What are the investment plans & daily earnings?',
    'How do I deposit via USSD (0766495353 - ELIX OWOMUZINYA)?',
    'What is the minimum withdrawal & 15% fee?',
    'How does the 15% referral bonus work?',
    'How do I harvest/claim daily mining yields?',
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
      let reply = "Our support team is here to assist! You can ask about our solar mining investment plans (starting from UGX 15,000), MTN MoMo deposits to 0766495353, withdrawals (min UGX 4,000), or join our official WhatsApp Helpdesk & Community.";

      const lower = text.toLowerCase();

      if (lower.includes('whatsapp') || lower.includes('chat') || lower.includes('human') || lower.includes('agent') || lower.includes('desk') || lower.includes('group')) {
        reply = "You can contact our live support desk and community on WhatsApp anytime!\n\n" +
          "Official WhatsApp Help & Community Link:\n" +
          WHATSAPP_HELP_URL + "\n\n" +
          "Tap the 'Join WhatsApp Helpdesk' banner at the top of this modal to open WhatsApp directly.";
      } else if (lower.includes('plan') || lower.includes('tier') || lower.includes('catalog') || lower.includes('invest') || lower.includes('cost') || lower.includes('price')) {
        reply = "Here is our current SolNova Solar Mining catalog:\n\n" +
          "• Starter Plan: UGX 15,000 → UGX 3,500/day\n" +
          "• Solar-Mech 10: UGX 20,000 → UGX 4,300/day\n" +
          "• DS-Mining Shoe: UGX 30,000 → UGX 6,750/day\n" +
          "• Clean Hydro Turbine X500: UGX 50,000 → UGX 11,500/day\n" +
          "• Quantum Grid VIP-9000: UGX 100,000 → UGX 24,000/day\n\n" +
          "Each active node earns daily yields that you can harvest directly to your wallet!";
      } else if (lower.includes('starter')) {
        reply = "The Starter Plan (Solar Miner Mini) costs UGX 15,000 and generates UGX 3,500 daily rewards (est. 8,517% annual ROI). It is the perfect entry-level solar mining node!";
      } else if (lower.includes('solar-mech') || lower.includes('mech 10') || lower.includes('mower')) {
        reply = "The Solar-Mech 10 costs UGX 20,000 and generates UGX 4,300 daily rewards with dual kinetic mowers and zero grid power costs.";
      } else if (lower.includes('shoe') || lower.includes('ds-mining shoe')) {
        reply = "The DS-Mining Shoe (Series 1) costs UGX 30,000 and generates UGX 6,750 daily rewards using kinetic-electro hybrid dynamos paired with ASIC processors.";
      } else if (lower.includes('hydro') || lower.includes('turbine')) {
        reply = "The Clean Hydro Turbine X500 costs UGX 50,000 and generates UGX 11,500 daily rewards (118.0 TH/s hashrate).";
      } else if (lower.includes('quantum') || lower.includes('vip')) {
        reply = "The Quantum Grid VIP-9000 costs UGX 100,000 and generates UGX 24,000 daily rewards (1,250.0 TH/s institutional hashrate).";
      } else if (lower.includes('deposit') || lower.includes('mtn') || lower.includes('airtel') || lower.includes('momo') || lower.includes('pay') || lower.includes('phone') || lower.includes('number') || lower.includes('0766495353') || lower.includes('elix') || lower.includes('owomuzinya')) {
        reply = "Step-by-Step Deposit Instructions:\n\n" +
          "1. Dial *165# (MTN) or *185# (Airtel) on your phone.\n" +
          "2. Select 1 (Send Money) → 1 (To Mobile User).\n" +
          "3. Enter Recipient Number: 0766495353\n" +
          "4. Enter your Deposit Amount in UGX.\n" +
          "5. Confirm recipient name shows ELIX OWOMUZINYA and enter your PIN.\n" +
          "6. Return to the app and tap 'Confirm Deposit' to submit your request for fast approval!\n\n" +
          "• Quick MTN USSD: *165*1*1*0766495353*[AMOUNT]#\n" +
          "• Quick Airtel USSD: *185*1*1*0766495353*[AMOUNT]#";
      } else if (lower.includes('withdraw') || lower.includes('cash out') || lower.includes('fee') || lower.includes('minimum')) {
        reply = "Withdrawal Guidelines:\n\n" +
          "• Minimum Withdrawal: UGX 4,000.\n" +
          "• Transaction Fee: 15% standard processing fee.\n" +
          "• Channels: MTN MoMo, Airtel Money, or Stanbic Bank.\n" +
          "• Approvals: Requests are processed by administrators and dispatched directly to your mobile money or bank account.";
      } else if (lower.includes('referral') || lower.includes('invite') || lower.includes('commission') || lower.includes('bonus') || lower.includes('friend')) {
        reply = "SolNova Referral Program:\n\n" +
          "• You earn 20% commission on every approved deposit made by users who register using your referral link/code!\n" +
          "• Registration links accounts; rewards are generated as soon as the referred user's deposit is approved by the admin.\n" +
          "• Example: If your friend deposits UGX 100,000 and it is approved, you receive UGX 20,000 directly into your wallet.\n" +
          "• All new users also get a UGX 4,000 welcome bonus upon signup.";
      } else if (lower.includes('harvest') || lower.includes('claim') || lower.includes('reward') || lower.includes('yield') || lower.includes('payout')) {
        reply = "Daily yields accumulate continuously on your active mining nodes. Simply tap the 'Harvest' or 'Claim' button on any active machine in your Dashboard or Machines tab to credit the UGX directly into your Consolidated Wallet!";
      } else if (lower.includes('bank') || lower.includes('stanbic')) {
        reply = "Bank Transfer Details (Withdrawals):\n• Bank: Stanbic Bank Uganda Limited\n• Account Number: 9030018829104\n• Account Name: SolNova Capital Uganda Ltd\n• Branch: Forest Mall Lugogo, Kampala\n\nNote: Deposits are processed via MTN MoMo and Airtel Money to 0766495353.";
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
    }, 600);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white rounded-3xl w-full max-w-md h-[560px] shadow-2xl border border-slate-100 flex flex-col animate-in fade-in zoom-in-95 duration-200">
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
                24/7 AI & WhatsApp Concierge
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-full hover:bg-white/20 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5 text-white" />
          </button>
        </div>

        {/* Direct WhatsApp Callout Banner */}
        <div className="bg-emerald-50 px-4 py-2.5 border-b border-emerald-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-full bg-[#25D366] text-white flex items-center justify-center shrink-0 shadow-2xs">
              <MessageCircle className="w-4 h-4 fill-white/20" />
            </div>
            <div>
              <span className="text-[12px] font-extrabold text-emerald-900 block leading-tight">
                WhatsApp Support & Community
              </span>
              <span className="text-[10px] text-emerald-700">Instant direct assistance</span>
            </div>
          </div>
          <a
            id="btn-whatsapp-chat-modal"
            href={WHATSAPP_HELP_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="px-3 py-1 bg-[#25D366] hover:bg-[#20bd5a] text-white text-[11px] font-bold rounded-lg shadow-2xs flex items-center gap-1 active:scale-95 transition-all"
          >
            <span>Open</span>
            <ExternalLink className="w-3 h-3" />
          </a>
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
                className={`max-w-[80%] rounded-2xl p-3 text-[13px] leading-relaxed whitespace-pre-line ${
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
              className="text-[11px] whitespace-nowrap bg-white border border-slate-200 text-slate-700 hover:border-blue-300 hover:bg-blue-50/50 px-2.5 py-1 rounded-full shrink-0 transition-colors cursor-pointer"
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
