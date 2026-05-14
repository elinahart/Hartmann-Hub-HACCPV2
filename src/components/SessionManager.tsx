import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Lock } from 'lucide-react';
import { cn } from '../lib/utils';
import { UserAvatar } from './UserAvatar';
import { motion, AnimatePresence } from 'motion/react';
import { useI18n } from '../lib/i18n';

// Configurations (Temps en millisecondes)
const IDLE_TIMEOUT = 10 * 60 * 1000; // 10 minutes d'inactivité
const BG_LOCK_TIMEOUT = 3 * 60 * 1000; // 3 minutes en arrière-plan
const BG_LOGOUT_TIMEOUT = 120 * 60 * 1000; // 2 heures (déconnexion complète)

export const SessionManager: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { currentUser, login, logout } = useAuth();
  const { t } = useI18n();
  const [isLocked, setIsLocked] = useState(() => {
    return window.sessionStorage.getItem('crousty_session_locked') === 'true';
  });
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');

  const lastInteraction = useRef<number>(Date.now());
  const backgroundTime = useRef<number | null>(null);

  const resetInteract = useCallback(() => {
    lastInteraction.current = Date.now();
  }, []);

  const lockSession = useCallback(() => {
    setIsLocked(true);
    window.sessionStorage.setItem('crousty_session_locked', 'true');
  }, []);

  const unlockSession = useCallback(() => {
    setIsLocked(false);
    window.sessionStorage.removeItem('crousty_session_locked');
  }, []);

  useEffect(() => {
    if (!currentUser) {
      if (isLocked) unlockSession();
      return;
    }

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        backgroundTime.current = Date.now();
      } else if (document.visibilityState === 'visible') {
        if (backgroundTime.current) {
          const timeSpent = Date.now() - backgroundTime.current;
          if (timeSpent >= BG_LOGOUT_TIMEOUT) {
            logout();
            window.sessionStorage.removeItem('crousty_session_locked');
          } else if (timeSpent >= BG_LOCK_TIMEOUT) {
            lockSession();
          }
          backgroundTime.current = null;
        }
        resetInteract();
      }
    };

    const interval = setInterval(() => {
      if (!isLocked && currentUser && document.visibilityState === 'visible') {
        if (Date.now() - lastInteraction.current >= IDLE_TIMEOUT) {
          lockSession();
        }
      }
    }, 10000);

    window.addEventListener('mousemove', resetInteract);
    window.addEventListener('keydown', resetInteract);
    window.addEventListener('touchstart', resetInteract, { passive: true });
    window.addEventListener('click', resetInteract);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.removeEventListener('mousemove', resetInteract);
      window.removeEventListener('keydown', resetInteract);
      window.removeEventListener('touchstart', resetInteract);
      window.removeEventListener('click', resetInteract);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      clearInterval(interval);
    };
  }, [currentUser, isLocked, logout, resetInteract, lockSession, unlockSession]);

  const handleKeypad = (num: string) => {
    if (!currentUser) return;
    if (pin.length < 4) {
      const newPin = pin + num;
      setPin(newPin);
      if (newPin.length === 4) {
        if (login(currentUser.id, newPin)) {
          setError('');
          unlockSession();
          setPin('');
          resetInteract();
        } else {
          setError('Code incorrect');
          setPin('');
        }
      }
    }
  };

  const handleSwitchUser = () => {
    unlockSession();
    setPin('');
    setError('');
    logout();
  };

  return (
    <>
      {children}
      <AnimatePresence>
        {isLocked && currentUser && (
          <div className="fixed inset-0 z-[99999] bg-slate-50/90 backdrop-blur-xl flex flex-col items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="w-full max-w-md bg-white p-8 rounded-[40px] shadow-2xl text-center relative border border-gray-100"
            >
              <div className="w-16 h-16 bg-crousty-purple/10 rounded-full flex items-center justify-center text-crousty-purple mx-auto mb-6">
                 <Lock size={32} />
              </div>

              <UserAvatar 
                user={currentUser}
                className="w-20 h-20 text-3xl shadow-lg mx-auto mb-4 border-4 border-white"
                iconSize={40}
              />
              
              <h1 className="text-2xl font-black text-gray-800 mb-1">{currentUser.name}</h1>
              <p className="text-gray-500 mb-8 font-medium">Session verrouillée. Saisissez votre code PIN.</p>

              <div className="flex justify-center gap-3 mb-10">
                {[0, 1, 2, 3].map((i) => (
                  <div 
                    key={i} 
                    className={cn(
                      "w-5 h-5 rounded-full transition-all duration-300",
                      pin.length > i ? "bg-[var(--color-primary)] scale-110 shadow-lg shadow-[var(--color-primary)]/30" : "bg-gray-100"
                    )} 
                  />
                ))}
              </div>

              {error && <div className="text-red-500 font-black mb-6 animate-shake text-sm">{error}</div>}

              <div className="grid grid-cols-3 gap-4 max-w-[280px] mx-auto mb-6">
                {['1','2','3','4','5','6','7','8','9','','0'].map((key, i) => (
                  key === '' ? <div key={`empty-${i}`} /> : (
                    <button
                      key={key}
                      onClick={() => handleKeypad(key)}
                      className="w-16 h-16 bg-gray-50 text-2xl font-black rounded-2xl mx-auto flex items-center justify-center active:bg-[var(--color-primary)] active:text-white active:scale-95 transition-all shadow-sm"
                    >
                      {key}
                    </button>
                  )
                ))}
                <button
                  onClick={() => setPin(pin.slice(0, -1))}
                  className="w-16 h-16 bg-gray-50 text-xs font-black rounded-2xl mx-auto flex items-center justify-center active:bg-gray-100 active:scale-95 transition-all text-gray-400"
                >
                  EFFACER
                </button>
              </div>

              <button 
                onClick={handleSwitchUser}
                className="text-gray-400 font-bold hover:text-gray-800 transition-colors text-sm underline underline-offset-4 mt-2"
              >
                Changer d'utilisateur
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
};
