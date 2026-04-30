import React from 'react';
import { MembreEquipe } from '../types';
import { getCouleurProfil, getInitials, cn } from '../lib/utils';
import { renderAvatarIcon } from './AvatarCustomizerModal';

interface UserAvatarProps {
  user: MembreEquipe | null;
  className?: string;
  iconSize?: number; 
}

export const UserAvatar: React.FC<UserAvatarProps> = ({ user, className = '', iconSize = 20 }) => {
  if (!user) return <div className={cn("bg-gray-200 rounded-full flex items-center justify-center shrink-0", className)} />;

  const isPhoto = (user.avatarType === 'photo' && user.avatarUrl) || (!user.avatarType && user.avatarUrl);
  const isIcon = user.avatarType === 'icon';
  const bgColor = isPhoto ? 'transparent' : (user.avatarColor || getCouleurProfil(user.name || '', user.role || ''));

  return (
    <div 
      className={cn("rounded-full flex items-center justify-center text-white shrink-0 bg-cover bg-center", className)}
      style={{
        backgroundColor: bgColor,
        backgroundImage: isPhoto ? `url(${user.avatarUrl})` : 'none',
        color: '#fff'
      }}
    >
      {(!isPhoto && !isIcon) && (
        <span>{user.initiales || getInitials(user.name || '')}</span>
      )}
      {isIcon && (
        <div className="flex items-center justify-center text-white pointer-events-none">
          {renderAvatarIcon(user.avatarIcon, iconSize)}
        </div>
      )}
    </div>
  );
};
