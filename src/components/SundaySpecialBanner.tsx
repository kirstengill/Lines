import React from 'react';
import { ArrowUpRight, Network, Sparkles, TrendingUp, Users } from 'lucide-react';

interface SundaySpecialBannerProps {
  onJoinOffer?: () => void;
}

export const SundaySpecialBanner: React.FC<SundaySpecialBannerProps> = ({ onJoinOffer }) => {
  return (
    <section
      aria-label="Sunday Special referral commission offer"
      className="relative mx-5 mb-4 overflow-hidden rounded-[24px] border border-[#d7b36a]/45 bg-[#102a39] px-5 py-5 text-white shadow-[0_16px_36px_rgba(15,42,57,0.18)] sm:px-7 sm:py-6"
    >
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_78%_18%,rgba(239,190,91,0.26),transparent_34%),linear-gradient(118deg,#102a39_0%,#12384a_56%,#0c2532_100%)]" />
      <div className="pointer-events-none absolute -right-20 -top-24 h-64 w-64 rounded-full border border-[#f1c96f]/15" />
      <div className="pointer-events-none absolute -right-7 -top-11 h-44 w-44 rounded-full border border-[#f1c96f]/10" />

      <svg
        aria-hidden="true"
        className="pointer-events-none absolute bottom-0 right-0 h-full w-[58%] opacity-70"
        viewBox="0 0 360 190"
        fill="none"
        preserveAspectRatio="none"
      >
        <path d="M5 163C54 149 70 151 108 129C143 109 159 122 191 94C222 67 241 83 275 47C294 27 314 26 359 7" stroke="#eec768" strokeOpacity=".3" strokeWidth="1.5" />
        <path d="M5 176C57 162 82 166 119 145C157 124 169 137 205 108C235 84 253 93 288 62C313 40 327 43 359 28" stroke="#8de0bd" strokeOpacity=".18" strokeWidth="1" />
        <path d="M0 164L359 8V190H0V164Z" fill="url(#chartFill)" opacity=".45" />
        <defs>
          <linearGradient id="chartFill" x1="180" y1="0" x2="180" y2="190" gradientUnits="userSpaceOnUse">
            <stop stopColor="#eec768" stopOpacity=".24" />
            <stop offset="1" stopColor="#eec768" stopOpacity="0" />
          </linearGradient>
        </defs>
      </svg>

      <div className="relative z-10 flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between sm:gap-8">
        <div className="min-w-0">
          <div className="mb-3 flex items-center gap-2 text-[10px] font-extrabold uppercase tracking-[0.2em] text-[#f4d68a]">
            <Sparkles className="h-3.5 w-3.5" />
            <span>Sunday Special</span>
            <span className="h-1 w-1 rounded-full bg-[#f4d68a]/70" />
            <span className="text-white/55">Limited weekend offer</span>
          </div>

          <h2 className="font-sans text-[clamp(3.5rem,12vw,6.8rem)] font-black leading-[0.78] tracking-[-0.07em] text-[#f8d77e] [text-shadow:0_5px_24px_rgba(0,0,0,0.18)]">
            50%
          </h2>
          <p className="mt-3 text-[clamp(1.05rem,3vw,1.6rem)] font-extrabold uppercase leading-none tracking-[0.08em] text-white">
            Referral Commission
          </p>
          <p className="mt-2 max-w-[340px] text-[12px] leading-relaxed text-white/65 sm:text-[13px]">
            Refer friends and earn 50% commission.
          </p>
        </div>

        <div className="relative flex shrink-0 flex-col items-start gap-4 sm:items-end">
          <div className="flex items-center gap-2 text-white/70" aria-hidden="true">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-white/[0.06]">
              <Users className="h-4 w-4 text-[#f4d68a]" />
            </span>
            <Network className="h-4 w-4 text-white/30" />
            <span className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-white/[0.06]">
              <TrendingUp className="h-4 w-4 text-[#8de0bd]" />
            </span>
          </div>
          <button
            type="button"
            onClick={onJoinOffer}
            className="group inline-flex items-center gap-2 rounded-xl bg-[#f4d68a] px-4 py-3 text-[11px] font-black uppercase tracking-[0.1em] text-[#153344] shadow-[0_8px_20px_rgba(0,0,0,0.16)] transition-transform hover:-translate-y-0.5 active:translate-y-0"
          >
            <span>Join the Sunday Offer</span>
            <ArrowUpRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
          </button>
        </div>
      </div>
    </section>
  );
};