import React from 'react';
import {
  Bike,
  Truck,
  Car,
  Layers,
  ShieldCheck,
  TrendingUp,
  Eye,
  CheckCircle2,
  ArrowRight,
  Clock,
  Sparkles,
} from 'lucide-react';
import { FLEET_IMAGES } from '../constants/fleetAssets';
import { Machine } from '../types';
import { FleetVestLogo } from './FleetVestLogo';

interface FleetLandingSectionProps {
  catalog: Machine[];
  onStartInvesting: () => void;
  onInvestInMachine: (machine: Machine) => void;
  onLearnMore?: () => void;
}

export const FleetLandingSection: React.FC<FleetLandingSectionProps> = ({
  catalog,
  onStartInvesting,
  onInvestInMachine,
  onLearnMore,
}) => {
  const getProductIcon = (title: string) => {
    const lower = title.toLowerCase();
    if (lower.includes('bike') || lower.includes('motorcycle')) {
      return <Bike className="w-5 h-5 text-amber-400" />;
    }
    if (lower.includes('van') || lower.includes('passenger')) {
      return <Car className="w-5 h-5 text-amber-400" />;
    }
    if (lower.includes('fleet') || lower.includes('multi')) {
      return <Layers className="w-5 h-5 text-amber-400" />;
    }
    return <Truck className="w-5 h-5 text-amber-400" />;
  };

  const scrollToProducts = () => {
    const el = document.getElementById('fleet-products-section');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    } else if (onLearnMore) {
      onLearnMore();
    }
  };

  return (
    <div className="w-full">
      {/* 1. HERO SECTION */}
      <section className="relative overflow-hidden rounded-2xl mx-3 sm:mx-5 mt-2 bg-[#0B0D14] text-white shadow-xl min-h-[460px] sm:min-h-[500px] flex items-center border border-amber-500/25">
        {/* Background Commercial Vehicle Photo */}
        <div className="absolute inset-0">
          <img
            src={FLEET_IMAGES.hero}
            alt="FleetVest Commercial Logistics Fleet on Highway"
            className="w-full h-full object-cover object-center scale-105 transform motion-safe:transition-transform duration-1000"
          />
          {/* Deep Obsidian/Gold Overlay */}
          <div className="absolute inset-0 bg-[#0B0D14]/85" />
        </div>

        {/* Hero Content */}
        <div className="relative z-10 max-w-2xl px-6 py-12 sm:px-10 sm:py-16 flex flex-col items-start text-left">
          {/* Brand Emblem Pill */}
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/15 backdrop-blur-md border border-amber-500/30 text-xs font-bold text-amber-300 mb-5">
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
            <span>Transport & Logistics Asset Investing</span>
          </div>

          <h1 className="text-3xl sm:text-5xl font-black tracking-tight text-white leading-[1.15] mb-4">
            Fueling Growth Through <span className="text-amber-400">Mobility</span>
          </h1>

          <p className="text-sm sm:text-base text-slate-200 leading-relaxed font-normal mb-8 max-w-xl">
            FleetVest connects you with revenue-generating transport and logistics assets. Invest in vehicles, fleets and delivery units, and earn consistent returns over time.
          </p>

          {/* Action CTAs */}
          <div className="flex flex-wrap items-center gap-3">
            <button
              id="btn-hero-start-investing"
              onClick={onStartInvesting}
              className="px-6 py-3.5 rounded-xl bg-amber-500 hover:bg-amber-400 active:scale-95 text-slate-950 font-black text-sm shadow-[0_4px_16px_rgba(245,158,11,0.35)] transition-all cursor-pointer flex items-center gap-2"
            >
              <span>Start Investing</span>
              <ArrowRight className="w-4 h-4 text-slate-950" />
            </button>

            <button
              id="btn-hero-learn-more"
              onClick={scrollToProducts}
              className="px-5 py-3.5 rounded-xl bg-white/10 hover:bg-white/20 active:scale-95 text-white border border-white/25 font-semibold text-sm backdrop-blur-xs transition-all cursor-pointer"
            >
              Learn More
            </button>
          </div>
        </div>
      </section>

      {/* 2. FOUR PILLARS VALUE STRIP */}
      <section className="px-3 sm:px-5 mt-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5 sm:gap-3">
          <div className="p-3.5 sm:p-4 rounded-xl bg-[#131722] border border-amber-500/20 shadow-xs flex flex-col gap-1.5">
            <div className="w-8 h-8 rounded-lg bg-amber-500/15 text-amber-400 flex items-center justify-center border border-amber-500/25">
              <Truck className="w-4 h-4" />
            </div>
            <h3 className="font-extrabold text-white text-xs sm:text-sm">Real Assets</h3>
            <p className="text-[11px] text-slate-400 leading-snug">
              Invest in working vehicles and logistics units.
            </p>
          </div>

          <div className="p-3.5 sm:p-4 rounded-xl bg-[#131722] border border-amber-500/20 shadow-xs flex flex-col gap-1.5">
            <div className="w-8 h-8 rounded-lg bg-amber-500/15 text-amber-400 flex items-center justify-center border border-amber-500/25">
              <Eye className="w-4 h-4" />
            </div>
            <h3 className="font-extrabold text-white text-xs sm:text-sm">Transparent</h3>
            <p className="text-[11px] text-slate-400 leading-snug">
              Track performance and earnings in real-time.
            </p>
          </div>

          <div className="p-3.5 sm:p-4 rounded-xl bg-[#131722] border border-amber-500/20 shadow-xs flex flex-col gap-1.5">
            <div className="w-8 h-8 rounded-lg bg-amber-500/15 text-amber-400 flex items-center justify-center border border-amber-500/25">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <h3 className="font-extrabold text-white text-xs sm:text-sm">Secure</h3>
            <p className="text-[11px] text-slate-400 leading-snug">
              Your investment and asset safety is our priority.
            </p>
          </div>

          <div className="p-3.5 sm:p-4 rounded-xl bg-[#131722] border border-amber-500/20 shadow-xs flex flex-col gap-1.5">
            <div className="w-8 h-8 rounded-lg bg-amber-500/15 text-amber-400 flex items-center justify-center border border-amber-500/25">
              <TrendingUp className="w-4 h-4" />
            </div>
            <h3 className="font-extrabold text-white text-xs sm:text-sm">Steady Returns</h3>
            <p className="text-[11px] text-slate-400 leading-snug">
              Predictable daily returns built for growth.
            </p>
          </div>
        </div>
      </section>

      {/* 3. OUR FLEET INVESTMENT PRODUCTS */}
      <section id="fleet-products-section" className="px-3 sm:px-5 mt-8 sm:mt-10">
        <div className="text-center max-w-xl mx-auto mb-6">
          <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
            Our Fleet Investment Products
          </h2>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Choose an asset, invest, and be part of a growing transport network.
          </p>
        </div>

        {/* 4 Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {catalog.map((product) => {
            const cycleText = product.cyclePeriod || `${product.cyclePeriodDays || 60} days`;
            const minInvestFormatted = `UGX ${product.minInvestUGX.toLocaleString()}`;
            const dailyRewardFormatted = `UGX ${product.dailyRewardUGX.toLocaleString()}+`;

            return (
              <div
                key={product.id}
                className="bg-[#131722] rounded-2xl border border-amber-500/20 shadow-xs hover:border-amber-400/50 hover:shadow-[0_4px_20px_-4px_rgba(245,158,11,0.2)] transition-all overflow-hidden flex flex-col justify-between group"
              >
                <div>
                  {/* Vehicle Image */}
                  <div className="relative h-44 sm:h-40 w-full overflow-hidden bg-[#0D1017]">
                    <img
                      src={product.image}
                      alt={product.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                    {/* Badge */}
                    <div className="absolute top-2.5 right-2.5 px-2.5 py-1 rounded-full bg-black/70 backdrop-blur-xs text-amber-300 text-[11px] font-bold flex items-center gap-1 border border-amber-500/30">
                      <Clock className="w-3 h-3 text-amber-400" />
                      <span>{cycleText}</span>
                    </div>

                    <div className="absolute bottom-2.5 left-2.5 w-8 h-8 rounded-xl bg-[#131722]/95 backdrop-blur-xs border border-amber-500/30 flex items-center justify-center shadow-xs">
                      {getProductIcon(product.title)}
                    </div>
                  </div>

                  {/* Body Content */}
                  <div className="p-4">
                    <h3 className="text-base font-extrabold text-white">
                      {product.title}
                    </h3>
                    <p className="text-xs text-amber-200/60 mt-0.5 line-clamp-1">
                      {product.subtitle || 'Transport & Logistics Asset'}
                    </p>

                    {/* Stats List */}
                    <div className="mt-4 space-y-2 pt-3 border-t border-amber-500/15">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-slate-400">Starting Investment</span>
                        <span className="font-extrabold text-white font-mono">{minInvestFormatted}</span>
                      </div>

                      <div className="flex items-center justify-between text-xs">
                        <span className="text-slate-400">Daily Return</span>
                        <span className="font-extrabold text-amber-400 font-mono">{dailyRewardFormatted}</span>
                      </div>

                      <div className="flex items-center justify-between text-xs">
                        <span className="text-slate-400">Cycle Period</span>
                        <span className="font-semibold text-slate-300 font-mono">{cycleText}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Card CTA */}
                <div className="p-4 pt-0">
                  <button
                    id={`btn-invest-${product.id}`}
                    onClick={() => onInvestInMachine(product)}
                    className="w-full py-2.5 px-4 rounded-xl bg-amber-500 hover:bg-amber-400 active:scale-98 text-slate-950 font-black text-xs shadow-md shadow-amber-500/20 transition-all cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <span>Invest Now</span>
                    <ArrowRight className="w-3.5 h-3.5 text-slate-950" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* 4. HIGHWAY FOOTER BANNER */}
      <section className="relative overflow-hidden rounded-2xl mx-3 sm:mx-5 my-8 sm:my-10 bg-[#0B0D14] text-white shadow-md min-h-[190px] flex items-center justify-center text-center border border-amber-500/25">
        {/* Background Image */}
        <div className="absolute inset-0">
          <img
            src={FLEET_IMAGES.footerBanner}
            alt="Open Highway Landscape"
            className="w-full h-full object-cover object-center"
          />
          <div className="absolute inset-0 bg-[#0B0D14]/85 backdrop-blur-3xs" />
        </div>

        {/* Content */}
        <div className="relative z-10 max-w-lg px-6 py-8 flex flex-col items-center">
          <h3 className="text-lg sm:text-2xl font-black text-amber-300 tracking-tight mb-2">
            Together We Keep the World Moving
          </h3>
          <p className="text-xs sm:text-sm text-slate-300 leading-relaxed font-normal">
            More than an investment — it's a contribution to a stronger economy.
          </p>
        </div>
      </section>
    </div>
  );
};
