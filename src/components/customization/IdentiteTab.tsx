import React, { useState } from 'react';
import { useConfig } from '../../contexts/ConfigContext';
import { Label, Input } from '../ui/LightUI';
import { Check, X, Edit2, RotateCcw, Layout, Type, User, ChefHat, Pizza, Utensils, Coffee, Sandwich, PieChart, Star, Flame, Droplet, Smartphone, Package, Sparkles } from 'lucide-react';
import { RestaurantLogo } from '../ui/RestaurantLogo';
import { cn } from '../../lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import { useI18n } from '../../lib/i18n';

const palettes = [
  { 
    nom: "Hartmann (défaut)",
    primaire: "#004696",
    secondaire: "#00A9E0"
  },
  { 
    nom: "Océan",
    primaire: "#0EA5E9",
    secondaire: "#0F4C81"
  },
  { 
    nom: "Forêt",
    primaire: "#16A34A",
    secondaire: "#166534"
  },
  { 
    nom: "Soleil",
    primaire: "#F59E0B",
    secondaire: "#B45309"
  },
  { 
    nom: "Corail",
    primaire: "#EF4444",
    secondaire: "#B91C1C"
  },
  { 
    nom: "Ardoise",
    primaire: "#6366F1",
    secondaire: "#4338CA"
  },
  { 
    nom: "Minuit",
    primaire: "#8B5CF6",
    secondaire: "#1E1B4B"
  },
  { 
    nom: "Nuit",
    primaire: "#64748B",
    secondaire: "#1E293B"
  },
];

const availableIcons = [
  { name: 'ChefHat', icon: ChefHat },
  { name: 'Pizza', icon: Pizza },
  { name: 'Utensils', icon: Utensils },
  { name: 'Coffee', icon: Coffee },
  { name: 'Sandwich', icon: Sandwich },
  { name: 'Star', icon: Star },
  { name: 'Flame', icon: Flame },
  { name: 'Droplet', icon: Droplet },
  { name: 'Smartphone', icon: Smartphone },
  { name: 'Package', icon: Package },
  { name: 'Sparkles', icon: Sparkles },
  { name: 'PieChart', icon: PieChart }
];

export const IdentiteTab = () => {
  const { config, updateConfig } = useConfig();
  const { t } = useI18n();
  const scrollContainerRef = React.useRef<HTMLDivElement>(null);
  
  const [editingPart, setEditingPart] = useState<string | null>(null);
  const [editingText, setEditingText] = useState('');

  const currentPrimary = config.restaurant?.couleurPrimaire || '#E91E8C';
  const currentSecondary = config.restaurant?.couleurSecondaire || '#7B2FBE';
  const identity = config.restaurant;

  const scrollToSection = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      // Ajouter un petit effet de flash
      element.classList.add('ring-4', 'ring-crousty-pink/50');
      setTimeout(() => {
        element.classList.remove('ring-4', 'ring-crousty-pink/50');
      }, 2000);
    }
  };

  const updateIdentity = (updates: any) => {
    const newRestaurant = {
      ...config.restaurant,
      ...updates
    };

    updateConfig({
      restaurant: newRestaurant
    });
  };

  const handleEditClick = (part: string) => {
    if (part === 'text') {
      setEditingText(config.restaurant?.nom || '');
    }
    setEditingPart(editingPart === part ? null : part);
  };

  const handleTextSubmit = () => {
    updateIdentity({ nom: editingText });
    setEditingPart(null);
  };

  const isPaletteSelected = (p: typeof palettes[0]) => {
    return p.primaire.toLowerCase() === (currentPrimary || '').toLowerCase() && 
           p.secondaire.toLowerCase() === (currentSecondary || '').toLowerCase();
  };

  const handlePaletteSelect = (p: any) => {
    updateIdentity({
      couleurPrimaire: p.primaire,
      couleurSecondaire: p.secondaire
    });
  };

  const handleColorChange = (key: string, value: string) => {
    // Basic hex validation
    let color = value;
    if (!value.startsWith('#') && (value.length === 3 || value.length === 6)) {
      color = '#' + value;
    }
    updateIdentity({ [key]: color });
  };

  const resetToDefault = () => {
    handlePaletteSelect({ primaire: "#E91E8C", secondaire: "#7B2FBE" });
  };

  return (
    <div className="space-y-8 pb-20 max-w-7xl mx-auto px-4 md:px-6">
      {/* HEADER SECTION */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 animate-in fade-in slide-in-from-top-4 duration-500">
        <div>
          <h2 className="text-3xl font-black text-gray-900 tracking-tight">{t('settings_personalize')}</h2>
          <p className="text-gray-500 font-medium">{t('settings_personalize_desc')}</p>
        </div>
        <button
          onClick={resetToDefault}
          className="px-5 py-2.5 bg-gray-50 hover:bg-red-50 text-gray-400 hover:text-red-500 rounded-2xl transition-all flex items-center gap-2 group w-fit"
        >
          <RotateCcw size={16} className="group-hover:rotate-[-45deg] transition-transform" />
          <span className="text-xs font-black uppercase tracking-widest">{t('btn_reset')}</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* COLONNE GAUCHE: INFOS & LOGO (7/12) */}
        <div className="lg:col-span-12 xl:col-span-7 space-y-8">
          
          {/* 1. INFOS GÉNÉRALES */}
          <section className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-xl shadow-gray-200/20 space-y-8 animate-in fade-in slide-in-from-left-4 duration-500">
            <h3 className="text-xl font-black text-gray-800 flex items-center gap-2">
              <span className="w-2 h-8 bg-blue-500 rounded-full"></span>
              {t('identity_base_info')}
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-widest text-gray-400">{t('identity_resto_name')}</Label>
                <Input
                  value={identity.nom || ''}
                  onChange={(e) => updateIdentity({ nom: e.target.value })}
                  placeholder="Ex: Hartmann Hub"
                  className="font-black h-14 rounded-2xl border-gray-100 bg-gray-50/50 focus:bg-white focus:ring-4 focus:ring-blue-500/10 transition-all text-lg"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-widest text-gray-400">{t('identity_city')}</Label>
                <Input
                  value={identity.ville || ''}
                  onChange={(e) => updateIdentity({ ville: e.target.value })}
                  placeholder="Ex: Strasbourg"
                  className="font-black h-14 rounded-2xl border-gray-100 bg-gray-50/50 focus:bg-white focus:ring-4 focus:ring-blue-500/10 transition-all text-lg"
                />
              </div>
            </div>
          </section>

          {/* 2. BRANDING / LOGO LAB */}
          <section className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-xl shadow-gray-200/20 space-y-8 animate-in fade-in slide-in-from-left-4 duration-500 delay-75">
            <h3 className="text-xl font-black text-gray-800 flex items-center gap-2">
              <span className="w-2 h-8 bg-purple-500 rounded-full"></span>
              Branding & Signature
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
               <div className="space-y-6">
                  <div className="bg-gray-50 p-6 rounded-[2rem] border border-gray-100 flex flex-col items-center justify-center min-h-[160px] relative">
                     <div className="absolute top-4 left-6 text-[9px] font-black text-gray-300 uppercase tracking-widest leading-none">Aperçu</div>
                     <RestaurantLogo 
                        size="xl" 
                        showText 
                        interactive={false}
                      />
                  </div>

                  <div className="space-y-4">
                    <div className="space-y-1">
                      <Label className="text-[10px] font-black uppercase tracking-widest text-gray-400">{t('identity_monogram_text')}</Label>
                      <Input 
                        value={identity.logoText || ''}
                        onChange={(e) => updateIdentity({ logoText: e.target.value })}
                        placeholder={identity.nom ? identity.nom.substring(0, 1).toUpperCase() : "Auto"}
                        className="font-black h-12 rounded-xl border-gray-200 bg-white"
                      />
                    </div>
                    <p className="text-[10px] font-bold text-gray-400 leading-relaxed italic">
                      {t('identity_monogram_hint')}
                    </p>
                  </div>
               </div>

               <div className="space-y-6">
                  <div className="space-y-4">
                     <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Forme du badge</p>
                     <div className="flex gap-2">
                       {['round', 'square', 'none'].map(shape => (
                         <button 
                          key={shape}
                          onClick={() => updateIdentity({ logoBackgroundStyle: shape })}
                          className={cn(
                             "flex-1 h-12 rounded-xl border-2 text-[10px] font-black uppercase transition-all",
                             identity.logoBackgroundStyle === shape ? "border-blue-500 bg-blue-50 text-blue-600 shadow-sm" : "bg-gray-50 border-transparent text-gray-300"
                          )}
                         >
                            {shape === 'round' ? t('identity_shape_round') : shape === 'square' ? t('identity_shape_square') : t('identity_shape_free')}
                         </button>
                       ))}
                     </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label className="text-[10px] font-black uppercase tracking-widest text-gray-400">{t('identity_bg')}</Label>
                        <div className="flex items-center gap-3 bg-gray-50 p-2 rounded-xl border border-gray-100">
                          <input type="color" value={identity.logoBackgroundColor || currentPrimary} onChange={(e) => updateIdentity({ logoBackgroundColor: e.target.value })} className="w-8 h-8 rounded-lg cursor-pointer border-none p-0" />
                          <span className="text-[10px] font-mono font-bold text-gray-400">{(identity.logoBackgroundColor || currentPrimary).toUpperCase()}</span>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label className="text-[10px] font-black uppercase tracking-widest text-gray-400">{t('identity_content')}</Label>
                        <div className="flex items-center gap-3 bg-gray-50 p-2 rounded-xl border border-gray-100">
                          <input type="color" value={identity.logoTextColor || '#FFFFFF'} onChange={(e) => updateIdentity({ logoTextColor: e.target.value })} className="w-8 h-8 rounded-lg cursor-pointer border-none p-0" />
                          <span className="text-[10px] font-mono font-bold text-gray-400">{(identity.logoTextColor || '#FFFFFF').toUpperCase()}</span>
                        </div>
                      </div>
                  </div>

                  <div className="space-y-4">
                     <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Type de logo</p>
                     <div className="flex gap-2 p-1 bg-gray-50 rounded-xl border border-gray-100">
                        <button 
                          onClick={() => updateIdentity({ logoMode: 'text' })}
                          className={cn(
                            "flex-1 py-2 rounded-lg text-[10px] font-black uppercase transition-all",
                            identity.logoMode === 'text' || !identity.logoMode ? "bg-white shadow-sm text-blue-600" : "text-gray-400 hover:text-gray-600"
                          )}
                        >
                          Monogramme
                        </button>
                        <button 
                          onClick={() => updateIdentity({ logoMode: 'icon' })}
                          className={cn(
                            "flex-1 py-2 rounded-lg text-[10px] font-black uppercase transition-all",
                            identity.logoMode === 'icon' ? "bg-white shadow-sm text-blue-600" : "text-gray-400 hover:text-gray-600"
                          )}
                        >
                          Icône
                        </button>
                     </div>

                     <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{t('identity_brand_icon')}</p>
                     <div className="grid grid-cols-6 gap-2">
                       {availableIcons.map(item => (
                         <button 
                           key={item.name}
                           onClick={() => updateIdentity({ logoIcon: item.name, logoMode: 'icon' })}
                           className={cn(
                             "h-10 flex items-center justify-center rounded-xl transition-all",
                             identity.logoIcon === item.name ? "bg-blue-600 text-white shadow-md scale-105" : "bg-gray-100 text-gray-400 hover:bg-gray-200"
                           )}
                         >
                           <item.icon size={16} />
                         </button>
                       ))}
                     </div>
                  </div>
               </div>
            </div>
          </section>
        </div>

        {/* COLONNE DROITE: COULEURS (5/12) */}
        <section className="lg:col-span-12 xl:col-span-5 h-fit bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-xl shadow-gray-200/20 space-y-8 animate-in fade-in slide-in-from-right-4 duration-500 delay-150">
          <h3 className="text-xl font-black text-gray-800 flex items-center gap-2">
            <span className="w-2 h-8 bg-green-500 rounded-full"></span>
            {t('identity_ui_colors')}
          </h3>

          <div className="space-y-8">
            <div className="space-y-4">
              <Label className="text-[10px] font-black uppercase tracking-widest text-gray-400">{t('identity_palette_predefined')}</Label>
              <div className="flex flex-wrap gap-4">
                {palettes.map((p) => {
                  const active = isPaletteSelected(p);
                  return (
                    <button
                      key={p.nom}
                      onClick={() => handlePaletteSelect(p)}
                      className={cn(
                        "flex items-center justify-center w-12 h-12 rounded-full border-2 transition-all hover:scale-110 group relative shrink-0 overflow-hidden",
                        active 
                          ? 'border-gray-900 bg-gray-900 shadow-lg ring-2 ring-gray-900/10' 
                          : 'border-gray-100 bg-white hover:border-gray-300'
                      )}
                    >
                      <div className="w-8 h-8 rounded-full overflow-hidden shadow-inner rotate-45 flex shrink-0 border border-black/5">
                         <div className="w-1/2 h-full" style={{ backgroundColor: p.primaire }} />
                         <div className="w-1/2 h-full" style={{ backgroundColor: p.secondaire }} />
                      </div>
                      {active && (
                         <div className="absolute inset-0 flex items-center justify-center bg-gray-900/10 pointer-events-none">
                            <div className="bg-green-500 w-4 h-4 rounded-full border-2 border-white flex items-center justify-center shadow-sm">
                               <Check size={8} className="text-white" strokeWidth={4} />
                            </div>
                         </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="space-y-4 pt-6 border-t border-gray-50">
              <div className="space-y-3">
                <Label className="text-[10px] font-black uppercase tracking-widest text-gray-400">{t('identity_primary_color')}</Label>
                <div className="flex items-center gap-4 bg-gray-50 p-4 rounded-2xl border border-gray-100 hover:bg-white hover:shadow-md transition-all group">
                  <div className="relative w-12 h-12 rounded-xl shadow-inner border border-white overflow-hidden" style={{ backgroundColor: currentPrimary }}>
                    <input type="color" value={currentPrimary} onChange={(e) => handleColorChange('couleurPrimaire', e.target.value)} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
                  </div>
                  <Input
                    value={currentPrimary.toUpperCase()}
                    onChange={(e) => handleColorChange('couleurPrimaire', e.target.value)}
                    className="font-mono font-black text-sm border-none bg-transparent shadow-none h-auto p-0 tracking-[0.2em] flex-1"
                  />
                </div>
              </div>

              <div className="space-y-3">
                <Label className="text-[10px] font-black uppercase tracking-widest text-gray-400">{t('identity_secondary_color')}</Label>
                <div className="flex items-center gap-4 bg-gray-50 p-4 rounded-2xl border border-gray-100 hover:bg-white hover:shadow-md transition-all group">
                  <div className="relative w-12 h-12 rounded-xl shadow-inner border border-white overflow-hidden" style={{ backgroundColor: currentSecondary }}>
                    <input type="color" value={currentSecondary} onChange={(e) => handleColorChange('couleurSecondaire', e.target.value)} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
                  </div>
                  <Input
                    value={currentSecondary.toUpperCase()}
                    onChange={(e) => handleColorChange('couleurSecondaire', e.target.value)}
                    className="font-mono font-black text-sm border-none bg-transparent shadow-none h-auto p-0 tracking-[0.2em] flex-1"
                  />
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>

  );
};
