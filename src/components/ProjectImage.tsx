import React, { useState, useEffect } from 'react';
import { Cpu } from 'lucide-react';

interface ProjectImageProps {
  src?: string | null;
  alt: string;
  className?: string;
  containerClassName?: string;
  fallbackCategory?: string;
}

export const ProjectImage: React.FC<ProjectImageProps> = ({
  src,
  alt,
  className = 'w-full h-full object-contain',
  containerClassName = 'w-full h-full',
  fallbackCategory,
}) => {
  const [hasError, setHasError] = useState(false);

  // Reset error state when src changes
  useEffect(() => {
    setHasError(false);
  }, [src]);

  const isInvalid = !src || typeof src !== 'string' || src.trim() === '' || hasError;

  if (isInvalid) {
    return (
      <div
        className={`bg-gradient-to-br from-slate-100 via-blue-50/40 to-indigo-50/50 flex flex-col items-center justify-center text-slate-400 p-2 select-none border border-slate-200/70 rounded-xl ${containerClassName}`}
        title={alt}
      >
        <div className="w-8 h-8 rounded-lg bg-white/90 shadow-2xs flex items-center justify-center text-blue-600 mb-1 border border-blue-100 shrink-0">
          <Cpu className="w-4 h-4" />
        </div>
        <span className="text-[9.5px] font-bold text-slate-600 uppercase tracking-wider text-center truncate max-w-full px-1">
          {fallbackCategory || 'Mining Rig'}
        </span>
      </div>
    );
  }

  return (
    <div className={`relative flex items-center justify-center overflow-hidden ${containerClassName}`}>
      <img
        src={src}
        alt={alt}
        referrerPolicy="no-referrer"
        onError={() => setHasError(true)}
        className={className}
      />
    </div>
  );
};

