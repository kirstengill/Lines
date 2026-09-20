import React from 'react';
import { Bike, Truck, Car, Layers, ArrowRight, Clock, PlusCircle } from 'lucide-react';
import { Machine, UserInvestment } from '../types';

interface ActiveFleetAssetsSectionProps {
  userInvestments: UserInvestment[] | Machine[];
  onViewAsset: (item: any) => void;
  onExploreMarketplace: () => void;
}

export const ActiveFleetAssetsSection: React.FC<ActiveFleetAssetsSectionProps> = ({
  userInvestments,
  onViewAsset,
  onExploreMarketplace,
}) => {
  const getVehicleIcon = (title: string) => {
    const lower = title.toLowerCase();
    if (lower.includes('bike') || lower.includes('motorcycle')) return <Bike className="w-4 h-4 text-[#0066FF]" />;
    if (lower.includes('van') || lower.includes('passenger')) return <Car className="w-4 h-4 text-[#0066FF]" />;
    if (lower.includes('fleet') || lower.includes('multi')) return <Layers className="w-4 h-4 text-[#0066FF]" />;
    return <Truck className="w-4 h-4 text-[#0066FF]" />;
  };

  return (
    <div className="px-3 sm:px-5 mb-6">
      <div className="flex items-center justify-between mb-3.5">
        <div className="flex items-center gap-2">
          <h2 className="text-base font-extrabold text-[#0B192C]">
            Active Fleet Assets
          </h2>
          <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-blue-50 text-[#0066FF]">
            {userInvestments.length}
          </span>
        </div>

        <button
          onClick={onExploreMarketplace}
          id="btn-active-assets-browse-more"
          className="text-xs font-bold text-[#0066FF] hover:text-blue-700 flex items-center gap-1 cursor-pointer"
        >
          <span>Browse Marketplace</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>

      {userInvestments.length === 0 ? (
        <div className="bg-white rounded-2xl p-6 border border-slate-200/90 text-center flex flex-col items-center justify-center">
          <div className="w-12 h-12 rounded-2xl bg-blue-50 text-[#0066FF] flex items-center justify-center mb-3">
            <Truck className="w-6 h-6" />
          </div>
          <h3 className="font-extrabold text-sm text-slate-800">
            No Active Fleet Assets Yet
          </h3>
          <p className="text-xs text-slate-500 mt-1 max-w-sm mb-4">
            Invest in revenue-generating delivery bikes, passenger vans, cargo trucks, or logistics fleets to start earning daily returns.
          </p>
          <button
            onClick={onExploreMarketplace}
            className="px-4 py-2 rounded-xl bg-[#0066FF] hover:bg-blue-600 text-white font-bold text-xs shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <PlusCircle className="w-3.5 h-3.5" />
            <span>Start Your First Fleet Investment</span>
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {userInvestments.map((item: any, idx: number) => {
            const amountInvested = item.amountInvestedUGX || item.minInvestUGX || 0;
            const daily = item.dailyRewardUGX || 0;
            const cycleText = item.cyclePeriod || item.period || `${item.cyclePeriodDays || 60} days`;

            return (
              <div
                key={item.id || idx}
                className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs hover:shadow-md transition-all flex items-center justify-between gap-3"
              >
                <div className="flex items-center gap-3.5 min-w-0">
                  {/* Photo / Icon thumbnail */}
                  <div className="relative w-14 h-14 rounded-xl overflow-hidden bg-slate-100 shrink-0 border border-slate-200">
                    {item.image ? (
                      <img
                        src={item.image}
                        alt={item.title}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-blue-50">
                        {getVehicleIcon(item.title)}
                      </div>
                    )}
                    <div className="absolute bottom-0.5 right-0.5 p-0.5 rounded bg-white/90">
                      {getVehicleIcon(item.title)}
                    </div>
                  </div>

                  {/* Title & Details */}
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <h4 className="font-extrabold text-sm text-[#0B192C] truncate">
                        {item.title}
                      </h4>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-600 border border-emerald-200 shrink-0">
                        Earning
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-slate-500 mt-1">
                      <span>
                        Invested: <strong className="text-slate-800 font-semibold">UGX {amountInvested.toLocaleString()}</strong>
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3 text-slate-400" />
                        <span>{cycleText}</span>
                      </span>
                      <span>
                        Daily: <strong className="text-emerald-600 font-bold">+UGX {daily.toLocaleString()}</strong>
                      </span>
                    </div>
                  </div>
                </div>

                {/* View button */}
                <button
                  id={`btn-view-asset-${item.id}`}
                  onClick={() => onViewAsset(item)}
                  className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-blue-50 hover:text-[#0066FF] hover:border-blue-200 border border-slate-200 text-xs font-bold text-slate-700 transition-all shrink-0 cursor-pointer flex items-center gap-1"
                >
                  <span>View</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
