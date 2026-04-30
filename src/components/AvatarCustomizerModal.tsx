import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { User, Star, ChefHat, Store, Award, Coffee, Leaf, CheckCircle2, Shield, Heart, Zap, Crown, Key, Bell, Flame, Camera, Image as ImageIcon, Type, X, Check } from 'lucide-react';
import { MembreEquipe } from '../types';
import { Button } from './ui/LightUI';
import { motion, AnimatePresence } from 'motion/react';
import { getCouleurProfil } from '../lib/utils'; // if needed, we might use default colors

interface AvatarCustomizerModalProps {
  user: MembreEquipe;
  onSave: (updates: Partial<MembreEquipe>) => void;
  onClose: () => void;
}

const ICONS = [
  { id: 'user', icon: User },
  { id: 'star', icon: Star },
  { id: 'chefhat', icon: ChefHat },
  { id: 'store', icon: Store },
  { id: 'award', icon: Award },
  { id: 'coffee', icon: Coffee },
  { id: 'leaf', icon: Leaf },
  { id: 'check', icon: CheckCircle2 },
  { id: 'shield', icon: Shield },
  { id: 'heart', icon: Heart },
  { id: 'zap', icon: Zap },
  { id: 'crown', icon: Crown },
  { id: 'key', icon: Key },
  { id: 'bell', icon: Bell },
  { id: 'flame', icon: Flame },
];

const COLORS = [
  '#ef4444', // red
  '#f97316', // orange
  '#f59e0b', // amber
  '#84cc16', // lime
  '#10b981', // emerald
  '#06b6d4', // cyan
  '#3b82f6', // blue
  '#6366f1', // indigo
  '#8b5cf6', // violet
  '#d946ef', // fuchsia
  '#ec4899', // pink
  '#64748b', // slate
];

export const renderAvatarIcon = (iconId: string | undefined, size = 24) => {
  const IconDef = ICONS.find(i => i.id === iconId)?.icon || User;
  return <IconDef size={size} />;
};

export const AvatarCustomizerModal: React.FC<AvatarCustomizerModalProps> = ({ user, onSave, onClose }) => {
  const [activeTab, setActiveTab] = useState<'photo' | 'monogram' | 'icon'>(user.avatarType || (user.avatarUrl ? 'photo' : (user.avatarIcon ? 'icon' : 'monogram')));
  const [previewUrl, setPreviewUrl] = useState<string | undefined>(user.avatarUrl);
  const [selectedIcon, setSelectedIcon] = useState<string>(user.avatarIcon || 'user');
  const [selectedColor, setSelectedColor] = useState<string>(user.avatarColor || user.couleur || COLORS[6]);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        const { compressPhotoTLC } = await import('../lib/imageUtils');
        const base64 = await compressPhotoTLC(file, 150, 0.6);
        setPreviewUrl(base64);
        setActiveTab('photo');
      } catch (err) {
        console.error("Erreur compression avatar:", err);
      }
    }
  };

  const save = () => {
    onSave({
      avatarType: activeTab,
      avatarUrl: activeTab === 'photo' ? previewUrl : undefined,
      avatarIcon: activeTab === 'icon' ? selectedIcon : undefined,
      avatarColor: selectedColor,
      couleur: selectedColor // sync with existing generic color 
    });
    onClose();
  };

  return createPortal(
    <div className="fixed inset-0 z-[600] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-in fade-in duration-300">
      <div className="bg-white rounded-[2.5rem] w-full max-w-md shadow-2xl flex flex-col max-h-[90vh] overflow-hidden animate-in zoom-in-95 duration-300 border border-gray-100">
        <div className="p-6 pb-4 border-b border-gray-50 flex justify-between items-center shrink-0">
          <h3 className="font-black text-xl text-gray-800 tracking-tight">Personnaliser</h3>
          <button onClick={onClose} className="w-10 h-10 bg-gray-50 rounded-full flex items-center justify-center text-gray-400 hover:text-gray-800 hover:bg-gray-100 transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-8">
          {/* PREVIEW HERO */}
          <div className="flex flex-col items-center justify-center bg-gray-50/50 py-8 -mx-6 -mt-6 border-b border-gray-50">
            <div className="relative">
              <div 
                className="w-32 h-32 rounded-full flex items-center justify-center text-white font-black text-4xl shadow-xl ring-8 ring-white bg-cover bg-center transition-all duration-300"
                style={{
                  backgroundColor: activeTab === 'photo' && previewUrl ? 'transparent' : selectedColor,
                  backgroundImage: activeTab === 'photo' && previewUrl ? `url(${previewUrl})` : 'none'
                }}
              >
                {activeTab === 'monogram' && (user.initiales || user.name.charAt(0).toUpperCase())}
                {activeTab === 'icon' && renderAvatarIcon(selectedIcon, 56)}
              </div>
              <div className="absolute -bottom-3 -right-3 w-12 h-12 bg-white rounded-full p-1.5 shadow-md">
                <div className="w-full h-full bg-crousty-purple text-white rounded-full flex items-center justify-center">
                  <Star size={20} />
                </div>
              </div>
            </div>
            <div className="mt-8 text-center space-y-1">
              <h4 className="font-black text-xl text-gray-800">{user.name}</h4>
              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">Prévisualisation</span>
            </div>
          </div>

          {/* TYPE SELECTOR */}
          <div className="space-y-3">
             <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest pl-1">Style de profil</label>
             <div className="flex p-1 bg-gray-100/80 rounded-2xl">
               <button 
                 onClick={() => setActiveTab('monogram')}
                 className={`flex-1 py-3 px-3 rounded-xl text-xs font-bold transition-all ${activeTab === 'monogram' ? 'bg-white text-gray-900 shadow-sm scale-[1.02]' : 'text-gray-500 hover:text-gray-700'}`}
               >
                 Monogramme
               </button>
               <button 
                 onClick={() => setActiveTab('icon')}
                 className={`flex-1 py-3 px-3 rounded-xl text-xs font-bold transition-all ${activeTab === 'icon' ? 'bg-white text-gray-900 shadow-sm scale-[1.02]' : 'text-gray-500 hover:text-gray-700'}`}
               >
                 Icône
               </button>
               <button 
                 onClick={() => setActiveTab('photo')}
                 className={`flex-1 py-3 px-3 rounded-xl text-xs font-bold transition-all ${activeTab === 'photo' ? 'bg-white text-gray-900 shadow-sm scale-[1.02]' : 'text-gray-500 hover:text-gray-700'}`}
               >
                 Photo
               </button>
             </div>
          </div>

          <AnimatePresence mode="wait">
            {activeTab === 'photo' && (
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, height: 0 }}
                className="grid grid-cols-2 gap-3"
              >
                <label className="flex flex-col items-center justify-center p-5 border-2 border-dashed border-gray-200 rounded-2xl cursor-pointer hover:bg-gray-50 hover:border-crousty-purple/50 transition-colors group">
                  <Camera className="text-gray-300 group-hover:text-crousty-purple mb-3 transition-colors" size={28} />
                  <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest text-center">Prendre photo</span>
                  <input type="file" accept="image/*" capture="user" className="hidden" onChange={handleFileChange} />
                </label>
                <label className="flex flex-col items-center justify-center p-5 border-2 border-dashed border-gray-200 rounded-2xl cursor-pointer hover:bg-gray-50 hover:border-crousty-purple/50 transition-colors group">
                  <ImageIcon className="text-gray-300 group-hover:text-crousty-purple mb-3 transition-colors" size={28} />
                  <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest text-center">Choisir image</span>
                  <input type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
                </label>
              </motion.div>
            )}

            {activeTab === 'icon' && (
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, height: 0 }}
                className="space-y-3"
              >
                <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest pl-1">Choisissez une icône</label>
                <div className="grid grid-cols-5 gap-3">
                  {ICONS.map(ic => {
                    const IconDef = ic.icon;
                    const isSelected = selectedIcon === ic.id;
                    return (
                      <button
                        key={ic.id}
                        onClick={() => setSelectedIcon(ic.id)}
                        className={`aspect-square flex flex-col items-center justify-center rounded-2xl transition-all ${isSelected ? 'bg-crousty-purple text-white shadow-lg shadow-crousty-purple/30 scale-105' : 'bg-gray-50 text-gray-400 hover:bg-gray-100 hover:text-gray-600'}`}
                      >
                        <IconDef size={24} />
                      </button>
                    );
                  })}
                </div>
              </motion.div>
            )}

            {(activeTab === 'icon' || activeTab === 'monogram') && (
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, height: 0 }}
                className="space-y-4 pt-4 border-t border-gray-50"
              >
                <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest pl-1">Couleur d'accent</label>
                <div className="flex flex-wrap gap-3">
                  {COLORS.map(c => (
                    <button
                      key={c}
                      onClick={() => setSelectedColor(c)}
                      className={`w-10 h-10 rounded-2xl shadow-sm flex items-center justify-center transition-all ${selectedColor === c ? 'scale-110 ring-4 ring-offset-2 ring-gray-100' : 'hover:scale-110 hover:shadow-md'}`}
                      style={{ backgroundColor: c }}
                    >
                      {selectedColor === c && <Check size={18} className="text-white drop-shadow-md" strokeWidth={3} />}
                    </button>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="p-6 border-t border-gray-50 bg-white flex justify-end gap-3 shrink-0">
          <Button variant="outline" className="flex-1 h-14 rounded-2xl font-black uppercase tracking-widest text-[10px] border-gray-200 text-gray-500 hover:bg-gray-50" onClick={onClose}>Annuler</Button>
          <Button className="flex-[2] h-14 rounded-2xl bg-crousty-purple text-white font-black uppercase tracking-widest shadow-lg shadow-crousty-purple/20 hover:scale-[1.02]" onClick={save}>
            Enregistrer le profil
          </Button>
        </div>
      </div>
    </div>,
    document.body
  );
};
