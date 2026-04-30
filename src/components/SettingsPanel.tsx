import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useAuth } from '../contexts/AuthContext';
import { Sparkles, Trash2, UserPlus, Users, X, KeySquare, UserCircle, Printer, HelpCircle, Smartphone, Wifi, CheckCircle2, Archive, GripVertical, AlertTriangle, ToggleLeft, ToggleRight, Eye, ChevronRight, Info, Languages, Copy, ExternalLink, Shield, Camera, Edit2 } from 'lucide-react';
import { Button, Input, Select, Label } from './ui/LightUI';
import { clearAllData, getStoredData, setStoredData } from '../lib/db';
import { motion, AnimatePresence, Reorder } from 'motion/react';
import { getInitials, getCouleurProfil, cn } from '../lib/utils';
import { MembreEquipe } from '../types';
import { usePersistentStorage } from '../hooks/usePersistentStorage';
import { useConfig } from '../contexts/ConfigContext';
import { useI18n } from '../lib/i18n';
import { APP_NAME, APP_VERSION, APP_AUTHOR, APP_DESCRIPTION, APP_LAST_UPDATE, APP_CONTACT, APP_CHANGELOG } from '../constants';

import { AvatarCustomizerModal, renderAvatarIcon } from './AvatarCustomizerModal';
import { UserAvatar } from './UserAvatar';

export const SettingsPanel = ({ onClose }: { onClose: () => void }) => {
  const { users, addUser, deleteUser, updateUserPin, currentUser, logout, updateUser, setUsers } = useAuth();
  const { isPersistent, estimate } = usePersistentStorage();
  const { exportConfig, importConfig } = useConfig();
  const { t, language, setLanguage } = useI18n();
  const panelRef = useRef<HTMLDivElement>(null);
  
  const [showAvatarCustomizer, setShowAvatarCustomizer] = useState(false);
  
  const [activeTab, setActiveTab] = useState<'profile' | 'about'>('profile');
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);
  const [versionCopied, setVersionCopied] = useState(false);
  const [isChangelogOpen, setIsChangelogOpen] = useState(false);

  // Huiles Config
  const [huilesConfig, setHuilesConfig] = useState(getStoredData('config_huiles', {
    seuilAttention: 20,
    seuilChangement: 23
  }));
  
  // New user form
  const [newName, setNewName] = useState('');
  const [newInitials, setNewInitials] = useState('');
  const [newPin, setNewPin] = useState('0000');
  const [newRole, setNewRole] = useState<'manager' | 'equipe'>('equipe');
  const [nameCollision, setNameCollision] = useState(false);

  // Editing user
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  
  // Change PIN form
  const [myNewPin, setMyNewPin] = useState('');
  const [myConfirmPin, setMyConfirmPin] = useState('');
  const [changePinError, setChangePinError] = useState('');
  const [changePinSuccess, setChangePinSuccess] = useState('');

  // Import JSON content
  const [jsonText, setJsonText] = useState('');
  const [showImportModal, setShowImportModal] = useState(false);

  useEffect(() => {
    if (newName) {
      const initials = getInitials(newName);
      setNewInitials(initials);
      
      const collision = users.some(u => u.initiales === initials && u.id !== editingUserId);
      setNameCollision(collision);
    } else {
      setNewInitials('');
      setNameCollision(false);
    }
  }, [newName, users, editingUserId]);

  // Fermer le panneau si on clique en dehors
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent | TouchEvent) => {
      // Ne pas fermer si la modal de personnalisation d'avatar ou importer est ouverte (elles sont en portal sur le body)
      if (showAvatarCustomizer || showImportModal || isResetModalOpen || isChangelogOpen) return;
      
      // Ne pas fermer si on clique sur un select/dropdown
      if ((event.target as Element).closest?.('[data-portal], .lucide')) return;

      if (panelRef.current && !panelRef.current.contains(event.target as Node)) {
        onClose();
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside, true);
    document.addEventListener('touchstart', handleClickOutside, true);
    
    return () => {
      document.removeEventListener('mousedown', handleClickOutside, true);
      document.removeEventListener('touchstart', handleClickOutside, true);
    };
  }, [onClose, showAvatarCustomizer, showImportModal, isResetModalOpen, isChangelogOpen]);

  const handleAddUser = () => {
    if (!newName || !newPin) return;
    if (newPin.length !== 4) {
      alert("Le code PIN doit contenir exactement 4 chiffres.");
      return;
    }
    addUser({ 
      name: newName, 
      initiales: newInitials, 
      role: newRole, 
      actif: true,
      pin: newPin
    });
    setNewName('');
    setNewPin('0000');
    setNewRole('equipe');
    setNewInitials('');
  };

  const handleToggleActif = (u: MembreEquipe) => {
    updateUser({ ...u, actif: !u.actif });
  };

  const handleUpdateUser = (u: MembreEquipe) => {
    updateUser(u);
    setEditingUserId(null);
  };

  const handleReset = async () => {
    await clearAllData();
    window.location.reload();
  };

  const handleFileImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const text = e.target?.result;
        if (typeof text === 'string') {
          if (importConfig(text)) {
            alert("Configuration importée avec succès !");
            window.location.reload();
          } else {
            alert("Erreur lors de l'importation. Le fichier est peut-être malformé.");
          }
        }
      };
      reader.readAsText(file);
    }
  };

  const handleManualImport = () => {
    if (!jsonText) return;
    if (importConfig(jsonText)) {
      alert("Configuration importée avec succès !");
      setShowImportModal(false);
      setJsonText('');
      window.location.reload();
    } else {
      alert("Erreur JSON invalide ou malformé.");
    }
  };

  const handleChangeMyPin = () => {
    setChangePinError('');
    setChangePinSuccess('');
    
    if (myNewPin.length !== 4) {
      setChangePinError("Le code PIN doit faire 4 chiffres.");
      return;
    }
    if (myNewPin !== myConfirmPin) {
      setChangePinError("Les codes postés ne correspondent pas.");
      return;
    }
    
    updateUserPin(currentUser!.id, myNewPin);
    setChangePinSuccess("Votre code PIN a été mis à jour avec succès.");
    setMyNewPin('');
    setMyConfirmPin('');
    
    setTimeout(() => {
      setChangePinSuccess('');
    }, 3000);
  };

  if (!currentUser) return null;

  const isCurrentManager = currentUser.role?.toLowerCase() === 'manager';

  return createPortal(
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[200] flex justify-end">
      <div ref={panelRef} className="bg-white w-full max-w-sm h-[100dvh] shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
        <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50 shrink-0">
          <h2 className="text-xl font-black text-gray-800 flex items-center gap-2">
            <UserCircle size={24} className="text-crousty-purple" /> {t('settings_title')}
          </h2>
          <button onClick={onClose} className="p-2 bg-white rounded-full text-gray-500 hover:text-gray-800 shadow-sm transition-transform active:scale-90">
            <X size={20} />
          </button>
        </div>

        <div className="flex border-b border-gray-100 shrink-0">
          <button 
            onClick={() => setActiveTab('profile')}
            className={cn(
              "flex-1 py-4 text-xs font-black uppercase tracking-widest transition-all",
              activeTab === 'profile' ? "text-crousty-purple border-b-2 border-crousty-purple bg-purple-50/30" : "text-gray-400 hover:text-gray-600"
            )}
          >
            {t('nav_profile')}
          </button>
          <button 
            onClick={() => setActiveTab('about')}
            className={cn(
              "flex-1 py-4 text-xs font-black uppercase tracking-widest transition-all",
              activeTab === 'about' ? "text-crousty-purple border-b-2 border-crousty-purple bg-purple-50/30" : "text-gray-400 hover:text-gray-600"
            )}
          >
            {t('settings_about')}
          </button>
        </div>

        <div className="flex-1 overflow-y-auto no-scrollbar">
          <AnimatePresence mode="wait">
            {activeTab === 'profile' ? (
              <motion.div 
                key="profile"
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                className="p-6 space-y-6"
              >
                {/* Language Selector */}
                <section className="p-4 bg-gray-50 rounded-2xl border border-gray-100">
                  <div className="flex items-center justify-between mb-3">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-gray-400 flex items-center gap-1.5">
                      <Languages size={12} /> {t('settings_language')}
                    </Label>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => setLanguage('fr')}
                      className={cn(
                        "py-2.5 rounded-xl text-xs font-black transition-all",
                        language === 'fr' ? "bg-crousty-purple text-white shadow-md shadow-crousty-purple/20" : "bg-white text-gray-400 border border-gray-100 hover:border-gray-200"
                      )}
                    >
                      🇫🇷 Français
                    </button>
                    <button
                      onClick={() => setLanguage('en')}
                      className={cn(
                        "py-2.5 rounded-xl text-xs font-black transition-all",
                        language === 'en' ? "bg-crousty-purple text-white shadow-md shadow-crousty-purple/20" : "bg-white text-gray-400 border border-gray-100 hover:border-gray-200"
                      )}
                    >
                      🇺🇸 English
                    </button>
                  </div>
                </section>

                {isCurrentManager && (
                  <section className="p-5 bg-gradient-to-br from-crousty-purple/5 to-crousty-pink/5 rounded-3xl border border-crousty-purple/10">
                    <h4 className="text-[10px] font-black uppercase tracking-widest text-crousty-purple/60 mb-4 px-1">{t('settings_advanced')}</h4>
                    <button
                      className="w-full flex items-center gap-3 p-4 bg-white rounded-2xl shadow-sm hover:shadow-md hover:scale-[1.02] active:scale-[0.98] transition-all border border-gray-100 group"
                      onClick={() => {
                        onClose();
                        window.dispatchEvent(new CustomEvent('open-customization-modal'));
                      }}
                    >
                      <div className="w-10 h-10 bg-crousty-purple/10 text-crousty-purple rounded-xl flex items-center justify-center shrink-0 group-hover:bg-crousty-purple group-hover:text-white transition-colors">
                        <Sparkles size={20} />
                      </div>
                      <div className="flex-1 text-left min-w-0">
                        <div className="font-black text-gray-800 text-sm truncate">{t('settings_personalize')}</div>
                        <div className="text-[10px] font-medium text-gray-400 mt-0.5 truncate">{t('settings_personalize_desc')}</div>
                      </div>
                      <ChevronRight size={20} className="text-gray-300" />
                    </button>
                  </section>
                )}

                <div className="bg-gradient-to-br from-white to-gray-50/50 p-8 rounded-[2.5rem] border border-gray-100 flex flex-col items-center justify-center relative overflow-hidden shadow-sm">
                  <div className="absolute top-0 right-0 p-8 opacity-[0.03] pointer-events-none scale-150 origin-top-right">
                    <UserCircle size={120} />
                  </div>
                  
                  <button 
                    onClick={() => setShowAvatarCustomizer(true)}
                    className="relative cursor-pointer group flex flex-col items-center outline-none mb-6"
                  >
                    <div className="relative">
                      <UserAvatar 
                        user={currentUser}
                        className="w-24 h-24 text-4xl shadow-xl ring-8 ring-white/80 group-hover:scale-105 transition-all duration-300"
                        iconSize={48}
                      />
                      <div className="absolute inset-0 bg-black/20 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 backdrop-blur-[2px]">
                        <Camera size={28} className="text-white drop-shadow-md" />
                      </div>
                      <div className="absolute -bottom-2 -right-2 w-10 h-10 bg-white rounded-full p-1 shadow-md">
                        <div className="w-full h-full bg-crousty-purple text-white rounded-full flex items-center justify-center">
                          <Edit2 size={16} />
                        </div>
                      </div>
                    </div>
                  </button>
                  
                  <div className="text-center space-y-1 mb-6">
                    <h3 className="font-black text-2xl text-gray-800 tracking-tight">{currentUser.name}</h3>
                    <div className="inline-flex items-center justify-center px-4 py-1.5 bg-crousty-purple/10 text-crousty-purple text-[10px] font-black uppercase tracking-[0.2em] rounded-full">
                      {currentUser.role}
                    </div>
                  </div>

                  <Button 
                    className="w-full h-12 rounded-2xl bg-gray-900 text-white font-black uppercase tracking-widest text-xs shadow-lg shadow-gray-900/20 hover:bg-black transition-all"
                    onClick={() => setShowAvatarCustomizer(true)}
                  >
                    Personnaliser le profil
                  </Button>
                  
                  {currentUser.avatarType === 'photo' && currentUser.avatarUrl && (
                    <button 
                      onClick={() => {
                        updateUser({ ...currentUser, avatarUrl: undefined, avatarType: 'monogram' });
                        window.dispatchEvent(new CustomEvent('crousty_toast', { detail: 'Photo de profil retirée' }));
                      }}
                      className="text-[10px] font-bold text-red-500 hover:text-red-600 mt-4 transition-colors"
                    >
                      Retirer la photo
                    </button>
                  )}
                </div>

                <div className="bg-white p-5 rounded-3xl border border-gray-100 space-y-4 shadow-sm">
                  <h3 className="font-black text-gray-800 flex items-center gap-2 mb-1 text-xs uppercase tracking-widest">
                    <KeySquare size={16} className="text-crousty-pink" /> 
                    {t('settings_change_pin')}
                  </h3>
                  <p className="text-[10px] font-medium text-gray-400 leading-relaxed">
                    {t('settings_pin_desc')}
                  </p>
                  
                  {changePinError && <motion.div initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} className="text-[10px] text-red-500 font-bold bg-red-50 p-2.5 rounded-xl border border-red-100">{changePinError}</motion.div>}
                  {changePinSuccess && <motion.div initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} className="text-[10px] text-green-600 font-bold bg-green-50 p-2.5 rounded-xl border border-green-100">{changePinSuccess}</motion.div>}
                  
                  <div className="space-y-3">
                    <div>
                      <Label className="text-[9px] font-black uppercase tracking-widest text-gray-400 mb-1 block px-1">{t('settings_new_pin')}</Label>
                      <Input 
                        type="password" 
                        inputMode="numeric" 
                        maxLength={4}
                        value={myNewPin} 
                        onChange={(e: any) => setMyNewPin(e.target.value.replace(/[^0-9]/g, '').slice(0, 4))} 
                        placeholder="••••" 
                        className="h-10 text-center text-lg font-black tracking-[0.5em] rounded-xl"
                      />
                    </div>
                    <div>
                      <Label className="text-[9px] font-black uppercase tracking-widest text-gray-400 mb-1 block px-1">{t('settings_confirm_pin')}</Label>
                      <Input 
                        type="password" 
                        inputMode="numeric" 
                        maxLength={4}
                        value={myConfirmPin} 
                        onChange={(e: any) => setMyConfirmPin(e.target.value.replace(/[^0-9]/g, '').slice(0, 4))} 
                        placeholder="••••" 
                        className="h-10 text-center text-lg font-black tracking-[0.5em] rounded-xl"
                      />
                    </div>
                    <Button onClick={handleChangeMyPin} className="w-full h-12 rounded-xl bg-crousty-purple font-black uppercase tracking-widest text-xs shadow-lg shadow-crousty-purple/10">
                      {t('btn_validate')}
                    </Button>
                  </div>
                </div>
                
                <Button variant="outline" className="w-full text-red-500 border-red-100 hover:bg-red-50 h-12 rounded-xl font-black uppercase tracking-[0.2em] text-[10px]" onClick={() => {
                  onClose();
                  logout();
                }}>
                  {t('nav_logout')}
                </Button>
              </motion.div>
            ) : (
              <motion.div 
                key="about"
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                className="p-6 space-y-6"
              >
                {/* Info Card */}
                <div className="bg-gradient-to-br from-gray-900 to-gray-800 p-6 rounded-3xl text-white relative overflow-hidden shadow-xl">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-crousty-pink/10 rounded-full -translate-y-16 translate-x-16 blur-3xl" />
                  <div className="relative z-10 flex flex-col items-center text-center">
                    <div className="w-16 h-16 bg-white/10 backdrop-blur-md rounded-2xl flex items-center justify-center mb-4 border border-white/20">
                      <Sparkles size={32} className="text-crousty-pink" />
                    </div>
                    <h3 className="text-2xl font-black tracking-tight">{APP_NAME}</h3>
                    <div className="mt-2 flex items-center gap-2">
                      <span className="text-[10px] bg-white/10 px-3 py-1 rounded-full font-black uppercase tracking-widest border border-white/10">V{APP_VERSION}</span>
                      <button 
                        onClick={() => {
                          navigator.clipboard.writeText(APP_VERSION);
                          setVersionCopied(true);
                          setTimeout(() => setVersionCopied(false), 2000);
                        }}
                        className="p-1.5 hover:bg-white/10 rounded-lg transition-colors"
                      >
                        {versionCopied ? <CheckCircle2 size={14} className="text-green-400" /> : <Copy size={14} className="text-white/40" />}
                      </button>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <section className="p-4 bg-white rounded-2xl border border-gray-100 shadow-sm space-y-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-blue-50 text-blue-500 rounded-lg flex items-center justify-center">
                        <Info size={18} />
                      </div>
                      <div className="flex-1">
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{t('about_version')}</p>
                        <p className="text-sm font-bold text-gray-700">{APP_VERSION}</p>
                      </div>
                      <Button variant="outline" onClick={() => setIsChangelogOpen(true)} className="h-8 rounded-lg text-[9px] font-black uppercase border-gray-100">
                        {t('about_whats_new')}
                      </Button>
                    </div>
                    
                    <p className="text-xs font-medium text-gray-500 leading-relaxed border-t border-gray-50 pt-3">
                      {APP_DESCRIPTION}
                    </p>
                  </section>

                  <section className="grid grid-cols-2 gap-3">
                    <div className="p-4 bg-white rounded-2xl border border-gray-100 shadow-sm">
                      <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">{t('about_author')}</p>
                      <p className="text-xs font-bold text-gray-700">{APP_AUTHOR}</p>
                    </div>
                    <div className="p-4 bg-white rounded-2xl border border-gray-100 shadow-sm">
                      <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">{t('about_updated')}</p>
                      <p className="text-xs font-bold text-gray-700">{APP_LAST_UPDATE}</p>
                    </div>
                  </section>

                  <div className="p-4 bg-green-50 rounded-2xl border border-green-100 flex items-center gap-3">
                    <div className="w-8 h-8 bg-green-100 text-green-600 rounded-lg flex items-center justify-center">
                      <Sparkles size={18} />
                    </div>
                    <div className="flex-1">
                      <p className="text-xs font-black text-green-700">{t('about_free')}</p>
                      <p className="text-[10px] font-bold text-green-600/80">{t('about_license')}</p>
                    </div>
                  </div>

                  <section className="p-4 bg-white rounded-2xl border border-gray-100 shadow-sm">
                     <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3">{t('about_tech')}</p>
                     <div className="flex flex-wrap gap-2">
                        {['React', 'Vite', 'Express', 'TypeScript', 'Tailwind', 'Dexie', 'Motion'].map(tech => (
                          <span key={tech} className="px-2 py-1 bg-gray-50 text-[10px] font-bold text-gray-500 rounded-md border border-gray-100">{tech}</span>
                        ))}
                     </div>
                  </section>

                  <button 
                    onClick={() => window.open(`mailto:${APP_CONTACT}`)}
                    className="w-full p-4 bg-white rounded-2xl border border-gray-100 shadow-sm flex items-center justify-between group hover:border-crousty-purple transition-all"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-purple-50 text-crousty-purple rounded-lg flex items-center justify-center group-hover:bg-crousty-purple group-hover:text-white transition-colors">
                        <HelpCircle size={18} />
                      </div>
                      <div className="text-left">
                        <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">{t('about_support')}</p>
                        <p className="text-xs font-bold text-gray-700">{APP_CONTACT}</p>
                      </div>
                    </div>
                    <ExternalLink size={14} className="text-gray-300 group-hover:text-crousty-purple transition-colors" />
                  </button>
                </div>

                <div className="text-center pt-4">
                  <p className="text-[9px] font-black text-gray-300 uppercase tracking-[0.4em]">Hartmann Hub © 2026</p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {isChangelogOpen && (
        <div className="fixed inset-0 z-[6000] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 sm:p-6" onClick={() => setIsChangelogOpen(false)}>
          <div className="bg-white rounded-3xl w-full max-w-lg overflow-hidden flex flex-col max-h-full" onClick={e => e.stopPropagation()}>
            <div className="p-4 sm:p-5 border-b border-gray-100 flex items-center justify-between bg-white shrink-0">
              <h3 className="text-lg sm:text-xl font-black text-gray-800 tracking-tight flex items-center gap-2">
                <Sparkles size={20} className="text-crousty-purple" />
                Notes de mise à jour
              </h3>
              <button 
                onClick={() => setIsChangelogOpen(false)}
                className="w-8 h-8 flex items-center justify-center bg-gray-100 text-gray-500 hover:bg-gray-200 hover:text-gray-800 rounded-full transition-colors"
                aria-label="close"
              >
                <X size={16} />
              </button>
            </div>
            
            <div className="p-4 sm:p-6 overflow-y-auto bg-gray-50/50 flex-1 space-y-6">
               {APP_CHANGELOG.map((release, i) => (
                 <div key={release.version} className="bg-white rounded-2xl p-4 sm:p-5 border border-gray-100 shadow-sm">
                   <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-2">
                         <span className="bg-purple-100 text-crousty-purple text-xs font-black px-2 py-1 rounded-lg">v{release.version}</span>
                         {i === 0 && <span className="text-[9px] font-black text-white bg-green-500 uppercase tracking-wider px-1.5 py-0.5 rounded">Nouveau</span>}
                      </div>
                      <span className="text-xs font-medium text-gray-500">{release.date}</span>
                   </div>
                   <ul className="space-y-3">
                      {release.changes.map((txt, j) => (
                         <li key={j} className="flex flex-col gap-1 text-sm text-gray-700">
                           <div className="flex items-start gap-2">
                              <CheckCircle2 size={16} className="text-green-500 shrink-0 mt-0.5" />
                              <span>{txt}</span>
                           </div>
                         </li>
                      ))}
                   </ul>
                 </div>
               ))}
            </div>
            <div className="p-4 border-t border-gray-100 bg-white shrink-0">
               <Button onClick={() => setIsChangelogOpen(false)} className="w-full h-12 bg-gray-100 text-gray-700 hover:bg-gray-200 font-black rounded-xl">Fermer</Button>
            </div>
          </div>
        </div>
      )}

      {showAvatarCustomizer && currentUser && (
        <AvatarCustomizerModal 
          user={currentUser}
          onClose={() => setShowAvatarCustomizer(false)}
          onSave={(updates) => {
            updateUser({ ...currentUser, ...updates });
            window.dispatchEvent(new CustomEvent('crousty_toast', { detail: 'Profil mis à jour' }));
          }}
        />
      )}

    </div>,
    document.body
  );
};
