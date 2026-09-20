import React from 'react';

export type CategoryType =
  | 'All'
  | 'Urban Delivery'
  | 'Passenger Transport'
  | 'Freight & Cargo'
  | 'Fleet Operations'
  | string;

interface CategoryPillsProps {
  selectedCategory: string;
  onSelectCategory: (category: string) => void;
  counts?: Record<string, number>;
}

export const CategoryPills: React.FC<CategoryPillsProps> = ({
  selectedCategory,
  onSelectCategory,
  counts = {},
}) => {
  const categories: { key: string; label: string }[] = [
    { key: 'All', label: 'All Fleet' },
    { key: 'Urban Delivery', label: 'Urban Delivery' },
    { key: 'Passenger Transport', label: 'Passenger' },
    { key: 'Freight & Cargo', label: 'Freight & Cargo' },
    { key: 'Fleet Operations', label: 'Fleet Ops' },
  ];

  return (
    <div className="px-5 mb-4">
      <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1">
        {categories.map((cat) => {
          const isActive = selectedCategory === cat.key;
          const count = counts[cat.key];
          const displayLabel = count !== undefined ? `${cat.label} (${count})` : cat.label;

          return (
            <button
              key={cat.key}
              id={`pill-cat-${cat.key.toLowerCase().replace(/\s+/g, '-')}`}
              onClick={() => onSelectCategory(cat.key)}
              className={`whitespace-nowrap px-4 py-2 rounded-full text-[13px] font-semibold transition-all duration-200 shrink-0 cursor-pointer ${
                isActive
                  ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20 font-black'
                  : 'bg-[#131722] hover:bg-[#1A202E] text-slate-300 border border-amber-500/20'
              }`}
            >
              {displayLabel}
            </button>
          );
        })}
      </div>
    </div>
  );
};

