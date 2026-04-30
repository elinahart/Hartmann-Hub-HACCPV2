import React, { useState } from 'react';
import { useConfig } from '../../contexts/ConfigContext';
import { Shield, LayoutGrid, Package, QrCode, Thermometer, Flame, Sparkles, Tag, ChefHat, ClipboardList, Droplet, Smartphone } from 'lucide-react';
import { cn } from '../../lib/utils';
import { useAuth } from '../../contexts/AuthContext';
import { Button } from '../ui/LightUI';
import { createPortal } from 'react-dom';

export function ModulesTab() {
  const { config, updateConfig } = useConfig();
  const { currentUser } = useAuth();
  const isManager = currentUser?.role === 'manager';
  const [moduleToDisable, setModuleToDisable] = useState<string | null>(null);

  const modules = [
    { id: 'reception', label: 'Réception de Marchandises', icon: Package },
    { id: 'traceabilite', label: 'Traçabilité / DLC Secondaires', icon: QrCode },
    { id: 'temperatures', label: 'Lectures de Températures', icon: Thermometer },
    { id: 'cuisson', label: 'Cuisson Alimentaire', icon: Flame },
    { id: 'nettoyage', label: 'Plan de Nettoyage', icon: Sparkles },
    { id: 'dlc', label: 'Étiquettes DLC', icon: Tag },
    { id: 'preparations', label: 'Préparation', icon: ChefHat },
    { id: 'inventaire', label: 'Inventaire Hebdomadaire', icon: ClipboardList },
    { id: 'huiles', label: 'Gestion des Huiles / Friture', icon: Droplet },
    { id: 'sessions', label: 'Sessions Mobiles (Équipiers)', icon: Smartphone }
  ];

  const handleToggleClick = (id: string) => {
    if (!isManager) return;
    const currentModules = config.modules || {};
    const isEnabled = currentModules[id] !== false; // Default is true
    
    if (isEnabled) {
      setModuleToDisable(id);
    } else {
      // Activating requires no confirmation
      updateConfig({ 
        modules: { 
          ...currentModules, 
          [id]: true 
        } 
      });
      window.dispatchEvent(new CustomEvent('crousty_toast', { detail: 'Modification appliquée' }));
    }
  };

  const confirmDisable = () => {
    if (!moduleToDisable) return;
    const currentModules = config.modules || {};
    updateConfig({ 
      modules: { 
        ...currentModules, 
        [moduleToDisable]: false 
      } 
    });
    setModuleToDisable(null);
    window.dispatchEvent(new CustomEvent('crousty_toast', { detail: 'Modification appliquée' }));
  };

  if (!isManager) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-gray-400">
        <Shield size={48} className="mb-4 opacity-20" />
        <p className="font-black uppercase tracking-widest text-sm">Accès réservé au Manager</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="bg-[var(--color-primary)]/10 border border-[var(--color-primary)]/20 p-6 rounded-[2rem] flex items-start gap-4">
        <div className="p-3 bg-white rounded-2xl shadow-sm text-[var(--color-primary)]">
          <LayoutGrid size={24} />
        </div>
        <div>
          <h3 className="text-lg font-black text-[var(--color-primary)]">Activation des Modules</h3>
          <p className="text-sm font-medium leading-relaxed opacity-80" style={{ color: 'var(--color-primary)' }}>
            Activez ou désactivez les fonctionnalités du restaurant. Les modules désactivés seront masqués pour toute l'équipe. 
            Les données existantes sont conservées.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {modules.map(mod => {
          const isEnabled = config.modules?.[mod.id] !== false;
          const Icon = mod.icon;
          return (
            <button
              key={mod.id}
              onClick={() => handleToggleClick(mod.id)}
              className={cn(
                "flex items-center justify-between p-5 rounded-[1.5rem] border-2 transition-all group",
                isEnabled 
                  ? "bg-white border-[var(--color-primary)]/20 shadow-sm hover:border-[var(--color-primary)]/40" 
                  : "bg-gray-50 border-gray-100 grayscale opacity-60"
              )}
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-gray-50 rounded-2xl flex items-center justify-center text-[var(--color-primary)] shadow-inner group-hover:scale-110 transition-transform">
                  <Icon size={24} />
                </div>
                <div className="text-left">
                  <p className="font-black text-gray-900">{mod.label}</p>
                  <p className={cn(
                    "text-[10px] font-black uppercase tracking-widest",
                    isEnabled ? "text-[var(--color-primary)]" : "text-gray-400"
                  )}>
                    {isEnabled ? 'Activé' : 'Désactivé'}
                  </p>
                </div>
              </div>

              <div className={cn(
                "w-12 h-6 rounded-full relative transition-colors p-1",
                isEnabled ? "bg-[var(--color-primary)]" : "bg-gray-300"
              )}>
                <div className={cn(
                  "w-4 h-4 bg-white rounded-full transition-transform shadow-sm",
                  isEnabled ? "translate-x-6" : "translate-x-0"
                )} />
              </div>
            </button>
          );
        })}
      </div>

      {moduleToDisable && createPortal(
        <div className="fixed inset-0 bg-black/50 z-[9999] flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in" onClick={() => setModuleToDisable(null)}>
          <div className="bg-white rounded-3xl p-6 w-full max-w-sm shadow-2xl animate-in zoom-in-95" onClick={e => e.stopPropagation()}>
            <h3 className="text-xl font-black text-gray-800 mb-2">Désactiver ce module ?</h3>
            <p className="text-sm text-gray-600 mb-6 font-medium">Il sera masqué pour toute l'équipe.</p>
            <div className="flex gap-3">
              <Button variant="outline" className="flex-1" onClick={() => setModuleToDisable(null)}>Annuler</Button>
              <Button style={{ backgroundColor: 'var(--color-primary)' }} className="flex-1 text-white" onClick={confirmDisable}>Confirmer</Button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
