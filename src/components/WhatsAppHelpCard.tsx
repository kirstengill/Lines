import React from 'react';
import { MessageCircle, ExternalLink, ShieldCheck, Zap } from 'lucide-react';
import { WHATSAPP_HELP_URL } from '../constants/links';

export const WhatsAppHelpCard: React.FC = () => {
  return (
    <div className="px-5 my-3">
      <a
        id="card-whatsapp-help"
        href={WHATSAPP_HELP_URL}
        target="_blank"
        rel="noopener noreferrer"
        className="group relative block overflow-hidden rounded-2xl bg-[#075E54] p-4 text-white shadow-md shadow-emerald-950/20 hover:bg-[#064e46] transition-all duration-200 active:scale-[0.99] border border-emerald-600/30"
      >
        <div className="relative z-10 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-white/15 backdrop-blur-xs flex items-center justify-center border border-white/20 shadow-xs shrink-0 group-hover:bg-white/25 transition-colors">
              <MessageCircle className="w-6 h-6 text-white fill-white/20" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-[14px] font-black tracking-tight text-white flex items-center gap-1">
                  Official WhatsApp Helpdesk
                </span>
                <span className="text-[9.5px] font-extrabold uppercase tracking-wider bg-white/20 text-white px-1.5 py-0.2 rounded-full border border-white/25">
                  24/7 Live
                </span>
              </div>
              <p className="text-[11.5px] text-emerald-100 font-medium leading-tight mt-0.5">
                Connect directly with support agents, verify deposits, & get instant fleet investment assistance.
              </p>
            </div>
          </div>

          <div className="shrink-0 flex items-center justify-center w-8 h-8 rounded-full bg-white text-emerald-800 shadow-xs group-hover:translate-x-0.5 transition-transform">
            <ExternalLink className="w-4 h-4" />
          </div>
        </div>
      </a>
    </div>
  );
};
