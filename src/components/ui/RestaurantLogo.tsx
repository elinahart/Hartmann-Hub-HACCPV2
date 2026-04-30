import React from 'react';
import * as LucideIcons from 'lucide-react';
import { useConfig } from '../../contexts/ConfigContext';
import { getInitials } from '../../lib/utils';
import { cn } from '../../lib/utils';
import { APP_NAME } from '../../constants';

interface RestaurantLogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showText?: boolean;
  interactive?: boolean;
  onClick?: (part: 'logo' | 'text' | 'monogram' | 'icon') => void;
}

export const RestaurantLogo = ({ className, size = 'md', showText = false, interactive = false, onClick }: RestaurantLogoProps) => {
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

  const renderLogoContent = () => {
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
    'flex items-center justify-center shrink-0 shadow-sm transition-all',
    identity.logoBackgroundStyle === 'round' ? 'rounded-full' : 
    identity.logoBackgroundStyle === 'square' ? 'rounded-xl' : 'rounded-none bg-transparent shadow-none',
    sizeClasses[size],
    className
  );

  const bgColor = identity.logoBackgroundColor || identity.couleurPrimaire;
  const textColor = identity.logoTextColor;

  return (
    <div className={cn("flex items-center gap-3", interactive && "cursor-pointer")}>
      <div 
        onClick={(e) => {
          if (interactive && onClick) {
            e.stopPropagation();
            onClick('logo');
          }
        }}
        className={cn(
          backgroundClasses,
          interactive && "hover:ring-4 hover:ring-crousty-pink/30 hover:scale-105 active:scale-95 transition-all outline-offset-4"
        )}
        style={{ 
          backgroundColor: identity.logoBackgroundStyle !== 'none' ? bgColor : 'transparent',
          color: textColor
        }}
      >
        {renderLogoContent()}
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
            "font-black text-crousty-dark leading-none truncate",
            size === 'sm' ? 'text-base' : size === 'md' ? 'text-lg' : 'text-2xl',
            interactive && "hover:text-crousty-pink hover:bg-crousty-pink/10 px-2 -mx-2 rounded-lg transition-all"
          )}
        >
          {identity.nom}
        </span>
      )}
    </div>
  );
};
