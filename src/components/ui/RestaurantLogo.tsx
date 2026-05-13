import React from 'react';
import * as LucideIcons from 'lucide-react';
import { useConfig } from '../../contexts/ConfigContext';
import { getInitials, darken } from '../../lib/utils';
import { cn } from '../../lib/utils';
import { APP_NAME } from '../../constants';

interface RestaurantLogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showText?: boolean;
  interactive?: boolean;
  onClick?: (part: 'logo' | 'text' | 'monogram' | 'icon') => void;
  layout?: 'horizontal' | 'vertical';
}

export const RestaurantLogo = ({ 
  className, 
  size = 'md', 
  showText = false, 
  interactive = false, 
  onClick,
  layout = 'horizontal'
}: RestaurantLogoProps) => {
  const { config } = useConfig();
  const identity = config.restaurant;

  if (!identity) return null;

  const IconComponent = (LucideIcons as any)[identity.logoIcon || 'ChefHat'] || LucideIcons.ChefHat;

  const sizeClasses = {
    sm: 'w-8 h-8 text-xs',
    md: 'w-10 h-10 text-sm',
    lg: 'w-16 h-16 text-xl',
    xl: 'w-24 h-24 text-3xl',
  };

  const iconSizes = {
    sm: 16,
    md: 20,
    lg: 32,
    xl: 48,
  };

  const initials = identity.logoText || getInitials(identity.nom || APP_NAME);
  const fullText = identity.logoText || identity.nom || APP_NAME;

  const isDefaultLogo = identity.brandingMode === 'default' || (!identity.brandingMode && identity.logoIcon === 'Thermometer');

  const renderLogoContent = () => {
    if (isDefaultLogo) {
      const Icon = LucideIcons['Thermometer'];
      return (
        <div className="relative flex items-center justify-center">
          {/* Effet de lueur derrière l'icône */}
          <div className="absolute inset-0 bg-white/40 blur-md rounded-full scale-150 animate-pulse" />
          <Icon 
            size={iconSizes[size]} 
            strokeWidth={2.5}
            className="relative z-10 text-white drop-shadow-[0_0_12px_rgba(255,255,255,0.9)]" 
          />
        </div>
      );
    }
    const handleInnerClick = (e: React.MouseEvent, part: 'monogram' | 'icon') => {
      if (interactive && onClick) {
        e.stopPropagation();
        onClick(part);
      }
    };

    switch (identity.logoMode) {
      case 'text':
        return <span onClick={(e) => handleInnerClick(e, 'monogram')} className="font-black uppercase tracking-tighter whitespace-nowrap hover:scale-110 transition-transform">{fullText.slice(0, 10)}</span>;
      case 'initials':
        return <span onClick={(e) => handleInnerClick(e, 'monogram')} className="font-black uppercase hover:scale-110 transition-transform">{initials.slice(0, 2)}</span>;
      case 'icon':
        return <div onClick={(e) => handleInnerClick(e, 'icon')} className="hover:scale-110 transition-transform"><IconComponent size={iconSizes[size]} /></div>;
      case 'icon+text':
      case 'icon+initials':
        return (
          <div className="flex items-center gap-1">
            <div onClick={(e) => handleInnerClick(e, 'icon')} className="hover:scale-110 transition-transform">
              <IconComponent size={iconSizes[size] * 0.8} />
            </div>
            <span onClick={(e) => handleInnerClick(e, 'monogram')} className="font-black uppercase text-[0.7em] hover:scale-110 transition-transform">
              {identity.logoMode === 'icon+text' ? initials : initials.slice(0, 2)}
            </span>
          </div>
        );
      default:
        return <span onClick={(e) => handleInnerClick(e, 'monogram')} className="font-black uppercase hover:scale-110 transition-transform">{initials.slice(0, 2)}</span>;
    }
  };

  const backgroundClasses = cn(
    'flex items-center justify-center shrink-0 shadow-lg transition-all relative group',
    'after:absolute after:inset-0 after:rounded-full after:bg-white/10 after:opacity-0 hover:after:opacity-100 after:transition-opacity',
    identity.logoBackgroundStyle === 'round' ? 'rounded-full' : 
    identity.logoBackgroundStyle === 'square' ? 'rounded-xl' : 'rounded-none bg-transparent shadow-none',
    sizeClasses[size],
    className
  );

  const bgColor = identity.logoBackgroundColor || identity.couleurPrimaire;
  const textColor = identity.logoTextColor;

  const cosmicBg = isDefaultLogo 
    ? 'linear-gradient(135deg, #1A0B2E 0%, #7c3aed 40%, #ec4899 70%, #f43f5e 100%)'
    : `linear-gradient(135deg, ${bgColor}, ${darken(bgColor, 0.2)})`;

  return (
    <div className={cn(
      "flex items-center shrink-0", 
      layout === 'vertical' ? 'flex-col gap-2' : 'gap-3',
      interactive && "cursor-pointer",
      className
    )}>
      <div 
        onClick={(e) => {
          if (interactive && onClick) {
            e.stopPropagation();
            onClick('logo');
          }
        }}
        className={cn(
          backgroundClasses,
          interactive && "hover:ring-4 hover:ring-crousty-pink/30 hover:scale-110 active:scale-95 transition-all outline-offset-4",
          isDefaultLogo && "overflow-hidden ring-2 ring-white/30 shadow-[0_0_25px_rgba(124,58,237,0.6)] border-none"
        )}
        style={{ 
          color: textColor,
          background: identity.logoBackgroundStyle !== 'none' ? cosmicBg : 'transparent'
        }}
      >
        {isDefaultLogo && (
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            {/* Étoiles et Gaz nébuleux */}
            <div className="absolute top-[-20%] left-[-20%] w-[140%] h-[140%] bg-[radial-gradient(circle_at_30%_30%,rgba(124,58,237,0.4)_0%,transparent_60%)]" />
            <div className="absolute top-[20%] right-[-10%] w-[100%] h-[100%] bg-[radial-gradient(circle_at_center,rgba(236,72,153,0.3)_0%,transparent_50%)]" />
            <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/stardust.png')] opacity-30 mix-blend-screen" />
            
            {/* Étoiles fixes scintillantes */}
            <div className="absolute top-1/4 left-1/4 w-0.5 h-0.5 bg-white rounded-full animate-pulse shadow-[0_0_4px_white]" />
            <div className="absolute top-2/3 right-1/3 w-0.5 h-0.5 bg-white rounded-full animate-pulse [animation-delay:1s] shadow-[0_0_4px_white]" />
            <div className="absolute bottom-1/4 right-1/4 w-1 h-1 bg-white rounded-full animate-pulse [animation-delay:0.5s] shadow-[0_0_5px_white]" />
          </div>
        )}
        <div className={cn("relative z-10", isDefaultLogo && "flex items-center justify-center")}>
          {renderLogoContent()}
          {identity.logoBackgroundStyle !== 'none' && !isDefaultLogo && (
            <div className="absolute -inset-1 bg-white/20 blur-sm rounded-full opacity-0 group-hover:opacity-100 transition-opacity" />
          )}
        </div>
      </div>
      {showText && (
        <span 
          onClick={(e) => {
            if (interactive && onClick) {
              e.stopPropagation();
              onClick('text');
            }
          }}
          className={cn(
            "font-black leading-none truncate uppercase tracking-[0.15em]",
            layout === 'vertical' 
              ? cn("text-[10px] font-black mt-1", isDefaultLogo ? "text-gray-400 drop-shadow-[0_0_5px_rgba(255,255,255,0.3)]" : "text-gray-500") 
              : "text-gray-900",
            layout !== 'vertical' && (size === 'sm' ? 'text-base' : size === 'md' ? 'text-lg' : 'text-2xl'),
            interactive && !isDefaultLogo && "hover:text-crousty-pink hover:bg-crousty-pink/10 px-2 -mx-2 rounded-lg transition-all"
          )}
        >
          {identity.nom}
        </span>
      )}
    </div>
  );
};
