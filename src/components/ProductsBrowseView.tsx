import React, { useState } from 'react';
import { Machine } from '../types';
import { AVAILABLE_CATALOG } from '../data/initialData';
import { CategoryPills } from './CategoryPills';
import { InvestmentCard } from './InvestmentCard';
import { Search, Truck, Layers } from 'lucide-react';

interface ProductsBrowseViewProps {
  machines: Machine[];
  catalog?: Machine[];
  onSelectMachine: (m: Machine) => void;
  onInvestInMachine: (m: Machine) => void;
}

export const ProductsBrowseView: React.FC<ProductsBrowseViewProps> = ({
  machines,
  catalog,
  onInvestInMachine,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState('');

  // Use dynamic catalog from server/Supabase, fallback to AVAILABLE_CATALOG or machines
  const catalogList = (catalog && catalog.length > 0)
    ? catalog
    : AVAILABLE_CATALOG.length > 0
    ? AVAILABLE_CATALOG
    : machines;

  const counts: Record<string, number> = {
    'All': catalogList.length,
    'Urban Delivery': catalogList.filter((m) => m.category === 'Urban Delivery').length,
    'Passenger Transport': catalogList.filter((m) => m.category === 'Passenger Transport').length,
    'Freight & Cargo': catalogList.filter((m) => m.category === 'Freight & Cargo').length,
    'Fleet Operations': catalogList.filter((m) => m.category === 'Fleet Operations').length,
  };

  const filteredMachines = catalogList.filter((m) => {
    const matchesCat =
      selectedCategory === 'All' ? true : m.category === selectedCategory;
    const matchesSearch =
      m.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (m.subtitle && m.subtitle.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (m.vehicleType && m.vehicleType.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesCat && matchesSearch;
  });

  return (
    <div className="space-y-4 pb-12 pt-2">
      {/* Header Bar */}
      <div className="px-5">
        <h2 className="text-xl sm:text-2xl font-black text-amber-200/90 tracking-tight">
          Fleet Marketplace
        </h2>
        <p className="text-xs sm:text-sm text-amber-200/60 mt-0.5">
          Select a revenue-generating vehicle or logistics unit to invest and earn daily UGX yields.
        </p>
      </div>

      {/* Search Input */}
      <div className="px-5">
        <div className="relative">
          <Search className="w-4 h-4 text-amber-400/70 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search delivery bikes, passenger vans, cargo trucks, fleets..."
            className="w-full pl-9 pr-4 py-2.5 bg-[#131722] border border-amber-500/25 rounded-xl text-xs sm:text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-400 shadow-xs transition-colors"
          />
        </div>
      </div>

      {/* Category Pills */}
      <CategoryPills
        selectedCategory={selectedCategory}
        onSelectCategory={setSelectedCategory}
        counts={counts}
      />

      {/* Catalog List */}
      <div className="px-5">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-amber-200/60 uppercase tracking-wider">
              Available Units ({filteredMachines.length})
            </span>
          </div>
          <span className="text-xs text-amber-300 font-bold flex items-center gap-1 shrink-0 bg-amber-500/15 px-2.5 py-1 rounded-full border border-amber-500/30">
            <Truck className="w-3 h-3 text-amber-400" /> Real Logistics
          </span>
        </div>

        <div className="space-y-3">
          {filteredMachines.map((machine, index) => (
            <InvestmentCard
              key={machine.id}
              machine={machine}
              onManage={(m) => onInvestInMachine(m)}
              buttonVariant={index % 2 === 0 ? 'solid' : 'outline'}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

