import React from 'react';
import { TicoMascot, TICO_VIEWBOX } from './TicoMascot';

// Scale the original uniformly; never redraw or squeeze it into a square.
function TicoRobotIcon({ iconSize }: { iconSize: number }) {
  return (
    <TicoMascot
      width={iconSize * TICO_VIEWBOX.width / TICO_VIEWBOX.height}
      height={iconSize}
      preserveAspectRatio="xMidYMid meet"
      className="shrink-0"
    />
  );
}

interface TicoLogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'hero';
  showPoweredBy?: boolean;
  variant?: 'horizontal' | 'stacked' | 'icon-only';
  /** Uniform scale for the complete logo lockup. */
  scale?: number;
}

export const TicoLogo: React.FC<TicoLogoProps> = ({
  className = '',
  size = 'md',
  showPoweredBy = true,
  variant = 'horizontal',
  scale = 1
}) => {
  if (variant === 'icon-only') {
    const iconDim = size === 'sm' ? 28 : size === 'md' ? 38 : size === 'lg' ? 48 : 64;
    return (
      <div className={`inline-flex items-center justify-center ${className}`}>
        <TicoRobotIcon iconSize={iconDim} />
      </div>
    );
  }

  if (variant === 'stacked') {
    const iconDim = size === 'sm' ? 44 : size === 'md' ? 64 : size === 'lg' ? 84 : 110;
    return (
      <div className={`flex flex-col items-center text-center group select-none ${className}`}>
        <TicoRobotIcon iconSize={iconDim} />
        <div className="mt-3">
          <span className="font-['Outfit'] font-black tracking-tight text-slate-900 text-3xl leading-none">
            TICO
          </span>
          {showPoweredBy && (
            <p className="font-['Plus_Jakarta_Sans'] text-[10px] sm:text-[11px] font-bold tracking-[0.24em] text-slate-600 mt-1 uppercase">
              POWERED BY TICTAC AGENCY
            </p>
          )}
        </div>
      </div>
    );
  }

  // Horizontal layout (default for Navbars and headers)
  const iconDim = size === 'sm' ? 38 : size === 'md' ? 60 : size === 'lg' ? 72 : 88;
  const titleSize = size === 'sm' ? 'text-lg' : size === 'md' ? 'text-2xl' : 'text-3xl';
  const subtitleSize = size === 'sm' ? 'text-[8.5px]' : size === 'md' ? 'text-[10px]' : 'text-xs';

  return (
    <div
      className={`inline-flex items-center gap-3 group select-none ${className}`}
      style={{ zoom: scale }}
    >
      {/* Optical alignment with the visible lettering, above its font baseline. */}
      <div className="flex shrink-0 items-center" style={{ transform: `translateY(-${iconDim * 0.13}px)` }}>
        <TicoRobotIcon iconSize={iconDim} />
      </div>
      <div className="flex flex-col justify-center">
        <div className="flex items-center gap-1.5">
          <span className={`font-['Outfit'] font-black tracking-tight text-slate-900 ${titleSize} leading-none`}>
            TICO
          </span>
        </div>
        {showPoweredBy && (
          <span className={`font-['Plus_Jakarta_Sans'] ${subtitleSize} font-bold tracking-[0.22em] text-slate-600 mt-0.5 uppercase`}>
            POWERED BY TICTAC AGENCY
          </span>
        )}
      </div>
    </div>
  );
};

