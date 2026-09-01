import React, { useState } from 'react';
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
  containerClassName = '',
  fallbackCategory,
}) => {
  const [hasError, setHasError] = useState(false);
  const [loaded, setLoaded] = useState(false);

  // If no src, empty string, or failed to load, display a clean styled placeholder
  const isInvalid = !src || src.trim() === '' || hasError;

  if (isInvalid) {
    return (
      <div
        className={`bg-gradient-to-br from-slate-100 via-blue-50/50 to-indigo-50 flex flex-col items-center justify-center text-slate-400 p-2 select-none border border-slate-200/60 rounded-xl ${containerClassName}`}
        title={alt}
      >
        <div className="w-8 h-8 rounded-lg bg-white/90 shadow-2xs flex items-center justify-center text-blue-600 mb-1 border border-blue-100">
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
      {!loaded && (
        <div className="absolute inset-0 bg-slate-100 animate-pulse rounded-xl" />
      )}
      <img
        src={src}
        alt={alt}
        referrerPolicy="no-referrer"
        onError={() => setHasError(true)}
        onLoad={() => setLoaded(true)}
        className={`${className} ${!loaded ? 'opacity-0' : 'opacity-100 transition-opacity duration-200'}`}
      />
    </div>
  );
};
