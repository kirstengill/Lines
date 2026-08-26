import React, { useState } from 'react';
import { Machine } from '../types';
import { AVAILABLE_CATALOG } from '../data/initialData';
import { CategoryPills, CategoryType } from './CategoryPills';
import { InvestmentCard } from './InvestmentCard';
import { Search, Sparkles } from 'lucide-react';

interface ProductsBrowseViewProps {
  machines: Machine[];
  catalog?: Machine[];
  onSelectMachine: (m: Machine) => void;
  onInvestInMachine: (m: Machine) => void;
}

export const ProductsBrowseView: React.FC<ProductsBrowseViewProps> = ({
  machines,
  catalog,
  onSelectMachine,
  onInvestInMachine,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<CategoryType>('All');
  const [searchQuery, setSearchQuery] = useState('');

  // Use dynamic catalog from server/Supabase, fallback to AVAILABLE_CATALOG or machines
  const catalogList = (catalog && catalog.length > 0)
    ? catalog
    : AVAILABLE_CATALOG.length > 0
    ? AVAILABLE_CATALOG
    : machines;

  const counts = {
    vip: catalogList.filter((m) => m.category === 'VIP Products').length,
    cleanEnergy: catalogList.filter((m) => m.category === 'Clean Energy').length,
    dsMining: catalogList.filter((m) => m.category === 'DS-Mining').length,
    all: catalogList.length,
  };

  const filteredMachines = catalogList.filter((m) => {
    const matchesCat =
      selectedCategory === 'All' ? true : m.category === selectedCategory;
    const matchesSearch =
      m.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (m.subtitle && m.subtitle.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesCat && matchesSearch;
  });

  return (
    <div className="space-y-3 pb-8">
      {/* Search Input */}
      <div className="px-5 pt-2">
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search mining rigs, shoes, solar equipment..."
            className="w-full pl-9 pr-4 py-2.5 bg-white border border-slate-200 rounded-2xl text-[13px] focus:outline-none focus:ring-2 focus:ring-blue-500/20 shadow-xs"
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
        <div className="flex items-center justify-between mb-2.5">
          <div>
            <h3 className="text-[16px] font-bold text-[#0F172A]">
              Available Investment Catalog ({filteredMachines.length})
            </h3>
            <p className="text-[11.5px] text-slate-500">
              Select any clean-energy node to deploy and earn daily UGX yields
            </p>
          </div>
          <span className="text-[11px] text-blue-600 font-semibold flex items-center gap-1 shrink-0 bg-blue-50 px-2 py-1 rounded-lg border border-blue-100">
            <Sparkles className="w-3 h-3" /> Live
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
