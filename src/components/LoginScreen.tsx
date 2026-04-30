import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronLeft, Search, LayoutGrid, List, X, Crown, ArrowRight, Smartphone, Shield } from 'lucide-react';
import { getInitials, getCouleurProfil, cn } from '../lib/utils';
import { useVirtualizer } from '@tanstack/react-virtual';
import { MembreEquipe } from '../types';
import { QRScanner } from './QRScanner';
import { HoneycombWatch } from './HoneycombWatch';
import { renderAvatarIcon } from './AvatarCustomizerModal';
import { UserAvatar } from './UserAvatar';

export const LoginScreen = () => {
  const { login, users } = useAuth();
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [view, setView] = useState<'bulles' | 'liste'>(() => (localStorage.getItem('profileViewMode') as any) || 'bulles');
  
  const [showQRScanner, setShowQRScanner] = useState(false);

  const enterOfflineMode = () => {
    setShowQRScanner(true);
  };
  
  const handleQRScan = (decodedText: string) => {
    setShowQRScanner(false);
    try {
      // Validate it's a valid URL with a session
      const url = new URL(decodedText);
      if (url.searchParams.has('session')) {
        window.location.href = url.toString();
        return;
      }
    } catch (e) {
      // Not a valid URL, ignore
    }
    alert("Le QR Code scanné n'est pas une session Crousty valide.");
  };

  const [bubbleSize, setBubbleSize] = useState(() => parseInt(localStorage.getItem('crousty-bulle-taille') || '72'));
  const [search, setSearch] = useState('');
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [autoSelectCount, setAutoSelectCount] = useState<number | null>(null);
  const [tapProfileId, setTapProfileId] = useState<string | null>(null);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [parentElem, setParentElem] = useState<HTMLDivElement | null>(null);

  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    localStorage.setItem('profileViewMode', view);
  }, [view]);

  useEffect(() => {
    localStorage.setItem('crousty-bulle-taille', bubbleSize.toString());
  }, [bubbleSize]);

  useEffect(() => {
    // Une fois monté, ce n'est plus le chargement initial (pour les animations)
    const t = setTimeout(() => setIsInitialLoad(false), 100);
    return () => clearTimeout(t);
  }, []);

  const filteredUsers = useMemo(() => {
    const term = (search || "").toLowerCase().trim();
    const activeOnes = users.filter(u => u.actif !== false); // Handle undefined as active
    
    if (!term) return activeOnes;
    return activeOnes.filter(u => 
      (u.name || "").toLowerCase().includes(term) || 
      (u.initiales || "").toLowerCase().includes(term)
    );
  }, [users, search]);

  const resetTeam = () => {
    localStorage.removeItem('crousty_users');
    window.location.reload();
  };

  useEffect(() => {
    if (filteredUsers.length === 1 && search.length > 0) {
      if (timerRef.current) clearInterval(timerRef.current);
      setAutoSelectCount(1);
      timerRef.current = setInterval(() => {
        setAutoSelectCount(prev => {
          if (prev === null) return null;
          if (prev <= 0) {
            setSelectedUserId(filteredUsers[0].id);
            setAutoSelectCount(null);
            return null;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      setAutoSelectCount(null);
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [filteredUsers, search]);

  const handleProfileTap = (u: MembreEquipe) => {
    setTapProfileId(u.id);
    setTimeout(() => {
      setSelectedUserId(u.id);
      setTapProfileId(null);
    }, 800);
  };

  const handleKeypad = (num: string) => {
    if (!selectedUserId) return;
    if (pin.length < 4) {
      const newPin = pin + num;
      setPin(newPin);
      if (newPin.length === 4) {
        if (login(selectedUserId, newPin)) {
          setError('');
        } else {
          setError('Code incorrect');
          setPin('');
        }
      }
    }
  };

  const handlePinch = (e: React.WheelEvent) => {
    if (e.ctrlKey) {
      e.preventDefault();
      setBubbleSize(prev => Math.min(100, Math.max(32, prev - e.deltaY * 0.1)));
    }
  };

  const selectedUser = users.find(u => u.id === selectedUserId);

  // Virtualizer for List View
  const rowVirtualizer = useVirtualizer({
    count: filteredUsers.length,
    getScrollElement: () => parentElem,
    estimateSize: () => 64,
    overscan: 5,
  });

  const getDynamicSize = () => {
    const count = filteredUsers.length;
    if (count <= 8) return { size: 90, cols: 4 };
    if (count <= 20) return { size: 72, cols: 5 };
    if (count <= 35) return { size: 56, cols: 6 };
    if (count <= 50) return { size: 44, cols: 7 };
    return { size: 36, cols: 8 };
  };

  const { size: autoSize, cols } = getDynamicSize();
  const currentSize = bubbleSize || autoSize;

  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");
  const presentLetters = Array.from(new Set(filteredUsers.map(u => (u.name?.[0] || "").toUpperCase()).filter(Boolean)));

  const scrollToLetter = (letter: string) => {
    const index = filteredUsers.findIndex(u => (u.name?.[0] || "").toUpperCase() === letter);
    if (index >= 0) {
      rowVirtualizer.scrollToIndex(index);
    }
  };

  const listContainer = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.04 }
    }
  };

  const listItem = {
    hidden: { opacity: 0, scaleX: 0.3, transformOrigin: 'left' },
    show: { opacity: 1, scaleX: 1, transition: { duration: 0.25, ease: 'easeOut' } }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center p-4 pt-safe select-none overflow-hidden touch-none relative" onWheel={handlePinch}>
      
      {/* Mobile Mode Button (Top Left) */}
      <div className="absolute top-4 left-4 z-50 md:hidden">
        <button 
          onClick={enterOfflineMode}
          className="flex items-center gap-2 px-4 py-3 bg-white shadow-xl shadow-crousty-purple/10 border border-purple-50 rounded-2xl text-crousty-purple font-black text-sm active:scale-95 transition-transform"
        >
          <Smartphone size={18} /> Prise de données
        </button>
      </div>

      <AnimatePresence mode="wait">
        {!selectedUserId ? (
          <motion.div 
            key="select"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="w-full max-w-5xl flex flex-col h-screen"
          >
            {/* Header section */}
            <div className="flex flex-col items-center mt-12 mb-10">
              <div className="w-20 h-20 bg-[var(--color-primary)] rounded-full flex items-center justify-center text-white font-black text-2xl shadow-xl shadow-[var(--color-primary)]/10 mb-6 ring-8 ring-white">
                <Shield size={32} />
              </div>
              <h1 className="text-4xl font-black text-gray-800 tracking-tighter mb-1">Accès Équipe</h1>
              <p className="text-gray-400 font-bold text-sm tracking-tight">Utilisez votre code PIN pour accéder</p>
            </div>

            {/* View Toggle & Search Minimal */}
            <div className="flex justify-between items-center mb-8 px-6">
              <div className="relative flex-1 max-w-xs">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300" size={18} />
                <input 
                  type="text"
                  placeholder="Rechercher..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full h-10 pl-11 pr-4 bg-white/50 border border-transparent rounded-full text-sm font-bold focus:bg-white focus:border-gray-100 transition-all outline-none"
                />
              </div>
              
              <div className="flex bg-white/60 p-1 rounded-full shadow-sm relative overflow-hidden">
                <button 
                  onClick={() => { setView('bulles'); setIsInitialLoad(false); }}
                  className={cn("p-2 rounded-full transition-all relative z-10", view === 'bulles' ? "bg-white text-[var(--color-primary)] shadow-sm" : "text-gray-300")}
                >
                  <motion.div animate={{ rotate: view === 'bulles' ? 0 : -180 }} transition={{ duration: 0.35, ease: "easeOut" }}>
                    <LayoutGrid size={18} />
                  </motion.div>
                </button>
                <button 
                  onClick={() => { setView('liste'); setIsInitialLoad(false); }}
                  className={cn("p-2 rounded-full transition-all relative z-10", view === 'liste' ? "bg-white text-[var(--color-primary)] shadow-sm" : "text-gray-300")}
                >
                  <motion.div animate={{ rotate: view === 'liste' ? 0 : 180 }} transition={{ duration: 0.35, ease: "easeOut" }}>
                    <List size={18} />
                  </motion.div>
                </button>
              </div>
            </div>

            {/* Content Area */}
            <div className="flex-1 overflow-hidden relative">
              <AnimatePresence mode="wait">
                {view === 'bulles' ? (
                  <motion.div 
                    key="bulles"
                    initial={isInitialLoad ? false : { opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0, transition: { duration: 0.15 } }}
                    style={{ height: "calc(100vh - 280px)" }}
                  >
                    <HoneycombWatch membres={filteredUsers} onSelect={handleProfileTap} animateEnter={!isInitialLoad} />
                    {filteredUsers.length === 0 && (
                      <div className="flex flex-col items-center justify-center h-full py-20 px-6 text-center">
                        <div className="text-gray-400 font-bold uppercase tracking-widest mb-4">Aucun profil trouvé</div>
                        <p className="text-gray-400 text-sm mb-8">Si vos données ont été perdues, vous pouvez réinitialiser l'équipe par défaut.</p>
                        <button 
                          onClick={resetTeam}
                          className="px-6 py-3 bg-red-50 text-red-500 rounded-2xl font-black text-sm hover:bg-red-100 transition-all border border-red-100"
                        >
                          RÉINITIALISER L'ÉQUIPE
                        </button>
                      </div>
                    )}
                  </motion.div>
                ) : (
                  <motion.div 
                    key="liste"
                    className="flex h-full px-6"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0, transition: { duration: 0.15 } }}
                  >
                    <div ref={setParentElem} className="flex-1 overflow-y-auto no-scrollbar pb-24">
                      <motion.div
                        variants={listContainer}
                        initial={isInitialLoad ? "show" : "hidden"}
                        animate="show"
                        style={{
                          height: `${rowVirtualizer.getTotalSize()}px`,
                          width: '100%',
                          position: 'relative',
                        }}
                      >
                        {rowVirtualizer.getVirtualItems().map((virtualRow) => {
                          const u = filteredUsers[virtualRow.index];
                          return (
                            <motion.div
                              key={virtualRow.key}
                              variants={listItem}
                              style={{
                                position: 'absolute',
                                top: 0,
                                left: 0,
                                width: '100%',
                                height: `${virtualRow.size}px`,
                                y: virtualRow.start,
                              }}
                              className="px-2"
                            >
                              <button
                                onClick={() => {
                                  setTapProfileId(u.id);
                                  setTimeout(() => setSelectedUserId(u.id), 200);
                                }}
                                className={cn(
                                  "w-full h-14 flex items-center justify-between px-4 bg-white rounded-2xl border border-gray-50 shadow-sm mb-2 active:bg-[var(--color-primary)] active:text-white transition-all group",
                                  tapProfileId === u.id && "bg-[var(--color-primary)] text-white scale-[0.98]"
                                  )}
                              >
                                <div className="flex items-center gap-4">
                                  <UserAvatar 
                                    user={u}
                                    className={cn(
                                      "w-10 h-10 text-sm border-2 border-white/50 transition-transform",
                                      tapProfileId === u.id && "scale-110"
                                    )}
                                    iconSize={20}
                                  />
                                  <div className="text-left">
                                    <div className="font-black text-base leading-tight truncate max-w-[200px]">{u.name}</div>
                                    <div className={cn("text-[10px] font-bold uppercase tracking-widest", tapProfileId === u.id ? "text-white/70" : "text-gray-400")}>
                                      {u.role === 'manager' ? '👑 Manager' : 'Équipe'}
                                    </div>
                                  </div>
                                </div>
                                <div className="flex items-center gap-2">
                                  <ArrowRight size={18} className="opacity-20 group-active:opacity-100" />
                                </div>
                              </button>
                            </motion.div>
                          );
                        })}
                        {filteredUsers.length === 0 && (
                          <div className="flex flex-col items-center justify-center py-20 px-6 text-center h-full">
                            <div className="text-gray-400 font-bold uppercase tracking-widest mb-4">Aucun profil trouvé</div>
                            <button 
                              onClick={resetTeam}
                              className="px-6 py-3 bg-red-50 text-red-500 rounded-2xl font-black text-sm hover:bg-red-100 transition-all border border-red-100"
                            >
                              RÉINITIALISER L'ÉQUIPE
                            </button>
                          </div>
                        )}
                      </motion.div>
                    </div>
                    {filteredUsers.length > 20 && (
                      <div className="w-8 flex flex-col justify-between py-2 text-[10px] font-black text-gray-300">
                        {alphabet.map(l => (
                          <button 
                            key={l} 
                            onClick={() => scrollToLetter(l)}
                            className={cn("hover:text-[var(--color-primary)] transition-colors", presentLetters.includes(l) ? "text-gray-400" : "text-gray-200 pointer-events-none")}
                          >
                            {l}
                          </button>
                        ))}
                      </div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        ) : (
          <motion.div 
            key="pin"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.1 }}
            className="w-full max-w-md bg-white p-8 rounded-[40px] shadow-2xl text-center relative mt-10 md:mt-20 border border-gray-100"
          >
            <button 
              onClick={() => { setSelectedUserId(null); setPin(''); setError(''); }}
              className="absolute left-6 top-6 w-10 h-10 bg-gray-50 text-gray-400 rounded-full flex items-center justify-center hover:text-gray-800 active:scale-95 transition-all"
            >
              <ChevronLeft size={24} />
            </button>

            <UserAvatar 
              user={selectedUser || null}
              className="w-20 h-20 text-3xl shadow-lg mx-auto mb-6 border-4 border-white"
              iconSize={40}
            />
            
            <h1 className="text-2xl font-black text-gray-800 mb-1">{selectedUser?.name}</h1>
            <p className="text-gray-500 mb-8 font-medium">Saisissez votre code PIN</p>

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

            <div className="grid grid-cols-3 gap-4 max-w-[280px] mx-auto">
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
          </motion.div>
        )}
      </AnimatePresence>
      <QRScanner 
        isOpen={showQRScanner}
        onClose={() => setShowQRScanner(false)}
        onScan={handleQRScan}
      />
    </div>
  );
};
