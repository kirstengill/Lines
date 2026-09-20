import React from 'react';

interface FleetVestLogoProps {
  className?: string;
  variant?: 'light' | 'dark'; // 'light' = white text for dark navy background, 'dark' = navy text for light background
  showTagline?: boolean;
  size?: 'sm' | 'md' | 'lg';
  onClick?: () => void;
}

export const FleetVestLogo: React.FC<FleetVestLogoProps> = ({
  className = '',
  variant = 'light',
  showTagline = false,
  size = 'md',
  onClick,
}) => {
  const isLight = variant === 'light';

  const iconSizes = {
    sm: 'w-7 h-7',
    md: 'w-8 h-8',
    lg: 'w-10 h-10',
  };

  const titleSizes = {
    sm: 'text-base',
    md: 'text-lg',
    lg: 'text-2xl',
  };

  return (
    <div
      onClick={onClick}
      className={`inline-flex items-center gap-2.5 select-none ${onClick ? 'cursor-pointer hover:opacity-90 transition-opacity' : ''} ${className}`}
    >
      {/* Dynamic F-Speed Transport Icon */}
      <div className={`relative shrink-0 flex items-center justify-center rounded-xl bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20 ${iconSizes[size]}`}>
        <svg
          viewBox="0 0 32 32"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="w-[68%] h-[68%] text-slate-950"
        >
          {/* Forward-sweeping dynamic F monogram */}
          <path
            d="M6 7H26L23 12H13.5L12 15H22L19.5 19H10L7 25H3L6 7Z"
            fill="currentColor"
          />
          <path
            d="M23 7L19.5 12H27L25 15H18L16 19H13L15 15H19L21 12H24L26 7H23Z"
            fill="#FDE68A"
            opacity="0.95"
          />
        </svg>
      </div>

      <div className="flex flex-col leading-tight">
        <div className={`font-black tracking-tight flex items-center font-sans ${titleSizes[size]} text-slate-100`}>
          <span>Fleet</span>
          <span className="text-amber-400">Vest</span>
        </div>
        {showTagline && (
          <span className="text-[10px] tracking-normal font-normal text-amber-200/60">
            Invest in the Infrastructure that Keeps Businesses Moving.
          </span>
        )}
      </div>
    </div>
  );
};
