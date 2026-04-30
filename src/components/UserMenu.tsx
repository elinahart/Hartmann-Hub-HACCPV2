import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useAuth } from '../contexts/AuthContext';
import { User, LogOut, Lock } from 'lucide-react';
import { getInitials, getCouleurProfil } from '../lib/utils';
import { UserAvatar } from './UserAvatar';

export const UserMenu = () => {
  const { currentUser, logout } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [position, setPosition] = useState({ top: 0, right: 0 });
  const buttonRef = useRef<HTMLButtonElement>(null);

  const handleOpen = () => {
    if (buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      setPosition({
        top: rect.bottom + 8,
        right: window.innerWidth - rect.right,
      });
    }
    setIsOpen(!isOpen);
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (!isOpen) return;
      if (!(event.target as Element).closest('[data-dropdown]')) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  if (!currentUser) return null;

  return (
    <>
      <button 
        ref={buttonRef}
        onClick={handleOpen}
        data-dropdown-trigger
        className="flex items-center gap-2 px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded-xl font-black text-gray-800 transition-colors shadow-sm active:scale-95 min-h-[40px]"
      >
        <UserAvatar 
          user={currentUser} 
          className="w-6 h-6 shadow-[inset_0_1px_3px_rgba(0,0,0,0.1)] -ml-1 text-[10px] font-bold object-cover" 
          iconSize={12} 
        />
        <span className="text-sm tracking-tight">{currentUser.name.split(' ')[0]}</span>
        <span className="text-[10px] text-gray-400">▼</span>
      </button>

      {isOpen && createPortal(
        <div 
          data-dropdown
          style={{
            position: 'fixed',
            top: position.top,
            right: position.right,
            zIndex: 9999,
          }}
          className="w-56 bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200"
        >
          <div className="p-4 bg-gray-50 border-b border-gray-100">
            <div className="text-xs text-gray-500 font-bold uppercase tracking-wider mb-1">Connecté en tant que</div>
            <div className="font-black text-gray-800">{currentUser.name}</div>
            <div className="text-xs text-crousty-purple font-medium mt-0.5" style={{color: 'var(--color-primary)'}}>{currentUser.role}</div>
          </div>
          <div className="p-2 flex flex-col gap-1">
            <button 
               onClick={() => { setIsOpen(false); logout(); }}
               className="flex items-center gap-2 p-3 text-sm font-bold text-gray-700 hover:bg-red-50 hover:text-red-700 rounded-xl transition-colors text-left w-full"
            >
              <LogOut size={16} />
              Changer de profil
            </button>
            <button 
               onClick={() => { setIsOpen(false); logout(); }}
               className="flex items-center gap-2 p-3 text-sm font-bold text-gray-700 hover:bg-gray-100 rounded-xl transition-colors text-left w-full"
            >
              <Lock size={16} />
              Verrouiller
            </button>
          </div>
        </div>,
        document.body
      )}
    </>
  );
};
