import React, { useState } from 'react';
import { Smartphone, Plus, Trash2, Edit2, Package, QrCode, Thermometer, Flame, Droplets, Droplet, ClipboardList, Shield, Check, X } from 'lucide-react';
import { Button, Input, Label } from '../ui/LightUI';
import { useConfig } from '../../contexts/ConfigContext';
import { useAuth } from '../../contexts/AuthContext';
import { cn } from '../../lib/utils';

interface MobileProfile {
  id: string;
  name: string;
  modules: string[];
}

const MODULES_LIST = [
  { id: 'reception', label: 'Réception Livraison', icon: Package, color: 'text-orange-500' },
  { id: 'tracabilite', label: 'Traçabilité', icon: QrCode, color: 'text-blue-500' },
  { id: 'temperature', label: 'Températures', icon: Thermometer, color: 'text-sky-500' },
  { id: 'cuisson', label: 'Cuisson Alimentaire', icon: Flame, color: 'text-red-500' },
  { id: 'nettoyage', label: 'Plan de nettoyage', icon: Droplets, color: 'text-purple-500' },
  { id: 'huiles', label: 'Contrôle Huiles', icon: Droplet, color: 'text-amber-500' },
  { id: 'inventaire', label: 'Inventaire rapide', icon: ClipboardList, color: 'text-emerald-500' },
];

export const SessionsTab = () => {
  const { config, updateConfig } = useConfig();
  const { currentUser } = useAuth();
  const isManager = currentUser?.role === 'manager';
  
  // @ts-ignore
  const profiles: MobileProfile[] = config.mobileProfiles || [
    { id: 'morning', name: 'Ouverture (Matin)', modules: ['tracabilite', 'temperature', 'huiles'] },
    { id: 'evening', name: 'Fermeture (Soir)', modules: ['temperature', 'nettoyage'] },
    { id: 'delivery', name: 'Livraison', modules: ['reception'] }
  ];

  const [editingId, setEditingId] = useState<string | null>(null);
  const [profileName, setProfileName] = useState('');
  const [selectedModules, setSelectedModules] = useState<string[]>([]);

  // Selection state
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [showBulkDeleteConfirm, setShowBulkDeleteConfirm] = useState<'selected' | 'all' | null>(null);

  const handleEdit = (p: MobileProfile) => {
    setEditingId(p.id);
    setProfileName(p.name);
    setSelectedModules(p.modules);
  };

  const handleCreate = () => {
    setEditingId('NEW');
    setProfileName('');
    setSelectedModules([]);
  };

  const handleSave = () => {
    if (!profileName.trim()) return;

    const newProfile: MobileProfile = {
      id: editingId === 'NEW' ? `prof-${Date.now()}` : editingId!,
      name: profileName,
      modules: selectedModules
    };

    let updatedProfiles: MobileProfile[];
    if (editingId === 'NEW') {
      updatedProfiles = [...profiles, newProfile];
    } else {
      updatedProfiles = profiles.map(p => p.id === editingId ? newProfile : p);
    }

    // @ts-ignore
    updateConfig({ mobileProfiles: updatedProfiles });
    setEditingId(null);
  };

  const handleDelete = (id: string) => {
    // @ts-ignore
    const updatedProfiles = profiles.filter(p => p.id !== id);
    // @ts-ignore
    updateConfig({ mobileProfiles: updatedProfiles });
  };

  const toggleSelection = (id: string) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(v => v !== id) : [...prev, id]
    );
  };

  const handleSelectAll = () => {
    if (selectedIds.length === profiles.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(profiles.map(p => p.id));
    }
  };

  const handleBulkDelete = () => {
    if (showBulkDeleteConfirm === 'all') {
      // @ts-ignore
      updateConfig({ mobileProfiles: [] });
    } else if (showBulkDeleteConfirm === 'selected') {
      // @ts-ignore
      updateConfig({ mobileProfiles: profiles.filter(p => !selectedIds.includes(p.id)) });
    }
    setSelectedIds([]);
    setShowBulkDeleteConfirm(null);
    setIsSelectionMode(false);
  };

  return (
    <div className="space-y-8 max-w-3xl pb-20">
      <div>
        <h3 className="text-2xl font-black text-gray-800 mb-2">Modèles de Session Mobile</h3>
        <p className="text-gray-500 font-medium">Configurez des modèles rapides pour vos équipes sur le terrain.</p>
      </div>

      <div className="flex justify-between items-center bg-gray-50 p-4 rounded-3xl border border-gray-100">
        <div className="flex items-center gap-4">
          <Button onClick={handleCreate} disabled={!!editingId} className="bg-crousty-purple text-white gap-2 rounded-xl">
            <Plus size={18} /> Créer un modèle
          </Button>
        </div>
        {isManager && profiles.length > 0 && !editingId && (
          <div className="flex items-center gap-2">
            <Button 
              onClick={() => {
                setIsSelectionMode(!isSelectionMode);
                if (isSelectionMode) setSelectedIds([]);
              }}
              variant="ghost"
              className={cn(
                "h-9 px-4 rounded-xl text-[10px] font-black uppercase tracking-widest",
                isSelectionMode ? "bg-amber-100 text-amber-900" : "text-gray-500"
              )}
            >
              {isSelectionMode ? 'Quitter Selection' : 'Selectionner'}
            </Button>
            <Button 
              onClick={() => setShowBulkDeleteConfirm('all')}
              className="h-9 px-4 text-red-500 hover:bg-red-50 rounded-xl text-[10px] font-black uppercase tracking-widest transition-colors"
              variant="ghost"
            >
              Vider tout
            </Button>
          </div>
        )}
      </div>

      {isSelectionMode && (
        <div className="flex items-center justify-between p-3 bg-amber-50 rounded-2xl border border-amber-200 animate-in zoom-in-95 duration-200">
          <div className="flex items-center gap-3">
            <button 
              onClick={handleSelectAll}
              className="w-6 h-6 rounded-lg border-2 border-amber-400 flex items-center justify-center transition-colors bg-white"
            >
              {selectedIds.length === profiles.length && profiles.length > 0 && <Check size={16} className="text-amber-500 font-black" />}
            </button>
            <span className="text-xs font-black text-amber-900 uppercase tracking-widest">{selectedIds.length} sélectionné(s)</span>
          </div>
          <Button 
            disabled={selectedIds.length === 0}
            onClick={() => setShowBulkDeleteConfirm('selected')}
            className="h-9 px-6 bg-red-500 text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-red-200"
          >
            Supprimer selection
          </Button>
        </div>
      )}

      {showBulkDeleteConfirm && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[1000] flex items-center justify-center p-4">
          <div className="bg-white rounded-[2rem] p-8 max-w-sm w-full shadow-2xl space-y-6 animate-in zoom-in-95 duration-300">
            <div className="text-center space-y-2">
              <h3 className="text-xl font-black text-gray-900 leading-tight">Attention</h3>
              <p className="text-sm text-gray-500 font-medium">
                {showBulkDeleteConfirm === 'all' 
                  ? "Voulez-vous vraiment supprimer TOUS les modèles de session ?"
                  : `Voulez-vous vraiment supprimer les ${selectedIds.length} modèles sélectionnés ?`}
              </p>
            </div>
            <div className="flex gap-2">
              <Button onClick={() => setShowBulkDeleteConfirm(null)} variant="ghost" className="flex-1 font-black text-[10px] uppercase">Annuler</Button>
              <Button onClick={handleBulkDelete} className="flex-1 bg-red-500 font-black text-[10px] uppercase text-white">Confirmer</Button>
            </div>
          </div>
        </div>
      )}

      <div className="space-y-4">
        {editingId === 'NEW' && (
          <div className="bg-gray-50 p-6 rounded-[2rem] border-2 border-emerald-500 space-y-6 animate-in zoom-in-95">
            <div className="space-y-4">
              <div>
                <Label>Nom du modèle</Label>
                <Input 
                  value={profileName} 
                  onChange={e => setProfileName(e.target.value)} 
                  placeholder="Ex: Contrôle Hygiène Midi"
                  className="bg-white border-none h-12 font-bold"
                />
              </div>
              <div className="space-y-3">
                <Label>Modules autorisés</Label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {MODULES_LIST.map(mod => (
                    <label key={mod.id} className="flex items-center gap-3 p-3 bg-white rounded-2xl cursor-pointer hover:bg-gray-100 transition-colors border border-gray-100">
                      <input 
                        type="checkbox" 
                        checked={selectedModules.includes(mod.id)} 
                        onChange={e => {
                          if (e.target.checked) setSelectedModules([...selectedModules, mod.id]);
                          else setSelectedModules(selectedModules.filter(id => id !== mod.id));
                        }}
                        className="w-5 h-5 text-crousty-purple rounded focus:ring-crousty-purple"
                      />
                      <mod.icon size={18} className={mod.color} />
                      <span className="font-bold text-gray-700 text-sm">{mod.label}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
            <div className="flex gap-3">
              <Button variant="outline" className="flex-1 h-12 rounded-xl" onClick={() => setEditingId(null)}>Annuler</Button>
              <Button onClick={handleSave} className="flex-1 h-12 rounded-xl bg-emerald-600 text-white">Créer le modèle</Button>
            </div>
          </div>
        )}

        {profiles.map(p => (
          <div 
            key={p.id} 
            onClick={() => isSelectionMode && toggleSelection(p.id)}
            className={cn(
              "bg-white border border-gray-100 rounded-3xl p-6 shadow-sm hover:shadow-md transition-all relative overflow-hidden",
              isSelectionMode && "cursor-pointer hover:border-amber-400",
              selectedIds.includes(p.id) && "border-amber-400 bg-amber-50/20"
            )}
          >
            {editingId === p.id ? (
              <div className="space-y-6">
                <div className="space-y-4">
                  <div>
                    <Label>Nom du modèle</Label>
                    <Input 
                      value={profileName} 
                      onChange={e => setProfileName(e.target.value)} 
                      className="bg-gray-50 border-none h-12 font-bold"
                    />
                  </div>
                  <div className="space-y-3">
                    <Label>Modules autorisés</Label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {MODULES_LIST.map(mod => (
                        <label key={mod.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-2xl cursor-pointer hover:bg-gray-100 transition-colors">
                          <input 
                            type="checkbox" 
                            checked={selectedModules.includes(mod.id)} 
                            onChange={e => {
                              if (e.target.checked) setSelectedModules([...selectedModules, mod.id]);
                              else setSelectedModules(selectedModules.filter(id => id !== mod.id));
                            }}
                            className="w-5 h-5 text-crousty-purple rounded focus:ring-crousty-purple"
                          />
                          <mod.icon size={18} className={mod.color} />
                          <span className="font-bold text-gray-700 text-sm">{mod.label}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                </div>
                <div className="flex gap-3">
                  <Button variant="outline" className="flex-1 h-12 rounded-xl" onClick={() => setEditingId(null)}>Annuler</Button>
                  <Button onClick={handleSave} className="flex-1 h-12 rounded-xl bg-crousty-purple text-white">Enregistrer</Button>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-start gap-4">
                  {isSelectionMode && (
                    <div className={cn(
                      "w-6 h-6 rounded-lg border-2 shrink-0 flex items-center justify-center transition-colors mt-3",
                      selectedIds.includes(p.id) ? "bg-amber-500 border-amber-500" : "border-gray-200 bg-white shadow-inner"
                    )}>
                      {selectedIds.includes(p.id) && <Check size={16} className="text-white" />}
                    </div>
                  )}
                  <div className="w-12 h-12 bg-gray-50 rounded-2xl flex items-center justify-center text-gray-400">
                    <Smartphone size={24} />
                  </div>
                  <div>
                    <h4 className="font-black text-gray-800 text-xl tracking-tight">{p.name}</h4>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {p.modules.map(mid => {
                        const m = MODULES_LIST.find(x => x.id === mid);
                        return m ? (
                          <span key={mid} className="px-2 py-0.5 bg-gray-50 border border-gray-100 rounded-lg text-[10px] font-bold text-gray-500 uppercase tracking-wider flex items-center gap-1.5">
                            <m.icon size={10} className={m.color} /> {m.label}
                          </span>
                        ) : null;
                      })}
                    </div>
                  </div>
                </div>
                {!isSelectionMode && (
                  <div className="flex gap-1" onClick={e => e.stopPropagation()}>
                    <button onClick={() => handleEdit(p)} className="p-3 text-gray-400 hover:text-crousty-purple hover:bg-crousty-purple/10 rounded-xl transition-all">
                      <Edit2 size={20} />
                    </button>
                    <button onClick={() => handleDelete(p.id)} className="p-3 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all">
                      <Trash2 size={20} />
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="bg-blue-50 border border-blue-100 p-6 rounded-3xl">
        <h4 className="font-bold text-blue-900 mb-2">💡 Conseil d'utilisation</h4>
        <p className="text-blue-700 text-sm font-medium leading-relaxed">
          Les modèles préconfigurés permettent aux managers de lancer une collecte en un clic depuis l'espace Sessions Mobiles.  
          Assurez-vous de sélectionner uniquement les modules nécessaires pour simplifier la saisie des équipiers.
        </p>
      </div>
    </div>
  );
};
