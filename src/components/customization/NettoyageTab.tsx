import React, { useState } from 'react';
import { Sparkles, Edit2, Trash2, Plus, Calendar, Shield, Check, AlertTriangle } from 'lucide-react';
import { useConfig } from '../../contexts/ConfigContext';
import { Button, Input, Label } from '../ui/LightUI';
import { NettoyageTaskConfig } from '../../lib/configSchema';
import { cn } from '../../lib/utils';
import { useAuth } from '../../contexts/AuthContext';

import { useNettoyage } from '../../providers/NettoyageProvider';

export const NettoyageTab = () => {
  const { config, updateConfig } = useConfig();
  const { currentUser } = useAuth();
  const isManager = currentUser?.role === 'manager';
  const { taches, setTaches } = useNettoyage();
  const [editingId, setEditingId] = useState<string | null>(null);
  
  // Selection state
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [showBulkDeleteConfirm, setShowBulkDeleteConfirm] = useState<'selected' | 'all' | null>(null);

  // Form state
  const [nom, setNom] = useState('');
  const [frequence, setFrequence] = useState('QUOTIDIEN');
  const [instructions, setInstructions] = useState('');
  const [error, setError] = useState<string | null>(null);

  const nettoyage = taches || [];
  const frequencesEnum = ['QUOTIDIEN', 'HEBDOMADAIRE', 'APRÈS SERVICE', 'APRÈS UTILISATION', 'MENSUEL', 'TRIMESTRIEL'];

  const handleEdit = (t: NettoyageTaskConfig) => {
    setEditingId(t.id);
    setNom(t.nom);
    setFrequence(t.frequence);
    // @ts-ignore
    setInstructions(t.instructions || '');
    setError(null);
  };

  const handleCreate = () => {
    setEditingId('NEW');
    setNom('');
    setFrequence('QUOTIDIEN');
    setInstructions('');
    setError(null);
  };

  const handleSave = () => {
    if (nom.trim() === '') {
      setError('Le nom est requis.');
      return;
    }

    const payload: any = {
      id: editingId === 'NEW' ? `nettoyage-${Date.now()}` : editingId!,
      nom,
      frequence,
      instructions: instructions || undefined,
      actif: true
    };

    let newNettoyage: any[];
    if (editingId === 'NEW') {
      newNettoyage = [...nettoyage, payload];
    } else {
      newNettoyage = nettoyage.map((t: any) => t.id === editingId ? payload : t);
    }

    updateConfig({ nettoyage: newNettoyage });
    setTaches(newNettoyage);
    setEditingId(null);
  };

  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  const handleDelete = (id: string) => {
    const newNettoyage = nettoyage.filter((t: any) => t.id !== id);
    updateConfig({ nettoyage: newNettoyage });
    setTaches(newNettoyage);
    setConfirmDelete(null);
    setSelectedIds(prev => prev.filter(v => v !== id));
  };

  const toggleSelection = (id: string) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(v => v !== id) : [...prev, id]
    );
  };

  const handleSelectAll = () => {
    if (selectedIds.length === nettoyage.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(nettoyage.map(t => t.id));
    }
  };

  const handleBulkDelete = () => {
    let newNettoyage = [];
    if (showBulkDeleteConfirm === 'selected') {
      newNettoyage = nettoyage.filter(t => !selectedIds.includes(t.id));
    }
    updateConfig({ nettoyage: newNettoyage });
    setTaches(newNettoyage);
    setSelectedIds([]);
    setShowBulkDeleteConfirm(null);
    setIsSelectionMode(false);
  };

  return (
    <div className="space-y-6 max-w-2xl pb-20">
      <div className="flex items-center justify-between">
        <h3 className="text-xl font-black text-gray-800">Plan de Nettoyage ({nettoyage.length})</h3>
        {!editingId && (
          <Button onClick={handleCreate} className="bg-crousty-purple text-white gap-2 rounded-xl h-10 px-4">
            <Plus size={16} /> Ajouter une tâche
          </Button>
        )}
      </div>

      {isManager && nettoyage.length > 0 && !editingId && (
        <div className="bg-amber-50 border border-amber-100 p-4 rounded-3xl space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-amber-900 font-bold text-[10px] uppercase tracking-widest">
              <Shield size={14} className="text-amber-500" />
              Gestion
            </div>
            <div className="flex gap-2">
              <Button 
                onClick={() => {
                  setIsSelectionMode(!isSelectionMode);
                  if (isSelectionMode) setSelectedIds([]);
                }}
                className={cn(
                  "h-7 px-3 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all",
                  isSelectionMode ? "bg-amber-200 text-amber-900" : "bg-white text-gray-500 border border-gray-200"
                )}
              >
                {isSelectionMode ? 'Annuler' : 'Sélectionner'}
              </Button>
              <Button 
                onClick={() => setShowBulkDeleteConfirm('all')}
                className="h-7 px-3 bg-red-100 text-red-600 rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-red-500 hover:text-white transition-colors"
                variant="ghost"
              >
                Tout supprimer
              </Button>
            </div>
          </div>

          {isSelectionMode && (
            <div className="flex items-center justify-between p-2 bg-white rounded-xl border border-amber-200 animate-in zoom-in-95 duration-200">
              <div className="flex items-center gap-2">
                <button 
                  onClick={handleSelectAll}
                  className="w-5 h-5 rounded border-2 border-amber-400 flex items-center justify-center transition-colors"
                >
                  {selectedIds.length === nettoyage.length && <Check size={14} className="text-amber-500 font-black" />}
                </button>
                <span className="text-[10px] font-black text-amber-900 uppercase">{selectedIds.length} sélectionné(s)</span>
              </div>
              <Button 
                disabled={selectedIds.length === 0}
                onClick={() => setShowBulkDeleteConfirm('selected')}
                className="h-7 px-3 bg-red-500 text-white rounded-xl text-[9px] font-black uppercase tracking-widest shadow-lg shadow-red-200 disabled:opacity-50"
              >
                Supprimer selection
              </Button>
            </div>
          )}
        </div>
      )}

      {showBulkDeleteConfirm && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[1000] flex items-center justify-center p-4">
          <div className="bg-white rounded-[2rem] p-8 max-w-sm w-full shadow-2xl space-y-6 animate-in zoom-in-95 duration-300">
            <div className="text-center space-y-2">
              <h3 className="text-xl font-black text-gray-900 leading-tight">Voulez-vous vraiment continuer ?</h3>
              <p className="text-sm text-gray-500 font-medium">
                {showBulkDeleteConfirm === 'all' 
                  ? "Cette action supprimera tout le plan de nettoyage."
                  : `Cette action supprimera ${selectedIds.length} tâche(s).`}
              </p>
            </div>
            <div className="flex gap-2">
              <Button onClick={() => setShowBulkDeleteConfirm(null)} variant="ghost" className="flex-1 font-black text-[10px] uppercase">Annuler</Button>
              <Button onClick={handleBulkDelete} className="flex-1 bg-red-500 font-black text-[10px] uppercase">Supprimer</Button>
            </div>
          </div>
        </div>
      )}

      <div className="space-y-3">
        {editingId === 'NEW' && (
          <div className="border-2 border-emerald-500 rounded-2xl bg-white p-6 space-y-5 shadow-xl shadow-emerald-100 mb-6 animate-in zoom-in-95">
            <h4 className="font-black text-xl text-gray-800">Nouvelle tâche</h4>
            <div className="space-y-4">
              <div>
                <Label className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 block">Nom de la tâche</Label>
                <Input value={nom} onChange={e => setNom(e.target.value)} placeholder="Ex: Nettoyage friteuse" className="h-12 font-bold" />
              </div>
              
              <div>
                <Label className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 block">Fréquence</Label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {frequencesEnum.map((f) => {
                    const isSelected = frequence === f;
                    return (
                      <button
                        key={f}
                        onClick={() => setFrequence(f)}
                        className={`py-2 px-3 rounded-xl border-2 text-[10px] font-black uppercase tracking-widest transition-all ${isSelected ? 'border-emerald-500 bg-emerald-50 text-emerald-700' : 'border-gray-100 bg-white text-gray-400 hover:border-gray-200'}`}
                      >
                        {f}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <Label className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 block">Instructions (optionnel)</Label>
                <textarea
                  value={instructions}
                  onChange={e => setInstructions(e.target.value)}
                  placeholder="Ex: Utiliser le dégraissant vert..."
                  className="w-full bg-white border-2 border-gray-100 rounded-xl p-4 text-sm font-bold text-gray-700 outline-none focus:border-emerald-500 transition-all min-h-[100px]"
                />
              </div>
            </div>
            {error && <p className="text-red-500 font-bold text-sm bg-red-50 p-2 rounded-md">{error}</p>}
            <div className="flex gap-3 pt-2">
              <Button variant="outline" className="flex-1 h-12" onClick={() => setEditingId(null)}>Annuler</Button>
              <Button onClick={handleSave} className="flex-1 h-12 bg-emerald-600 border-none">Créer</Button>
            </div>
          </div>
        )}

        {nettoyage.map((t) => (
          <div 
            key={t.id} 
            onClick={() => isSelectionMode && toggleSelection(t.id)}
            className={cn(
              "border rounded-2xl bg-white overflow-hidden shadow-sm hover:shadow-md transition-all cursor-pointer",
              !t.actif && "opacity-50 grayscale",
              editingId === t.id ? "border-emerald-500 shadow-lg shadow-emerald-50" : "border-gray-100",
              selectedIds.includes(t.id) && "border-amber-400 bg-amber-50/20"
            )}
          >
            {editingId === t.id ? (
              <div className="p-6 bg-gray-50 space-y-5 animate-in slide-in-from-top-2" onClick={e => e.stopPropagation()}>
                <h4 className="font-black text-gray-800">Modifier la tâche</h4>
                <div className="space-y-4">
                  <div>
                    <Label className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 block">Nom de la tâche</Label>
                    <Input value={nom} onChange={e => setNom(e.target.value)} className="h-12 font-bold" />
                  </div>
                  
                  <div>
                    <Label className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 block">Fréquence</Label>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {frequencesEnum.map((f) => {
                        const isSelected = frequence === f;
                        return (
                          <button
                            key={f}
                            onClick={() => setFrequence(f)}
                            className={`py-2 px-3 rounded-xl border-2 text-[10px] font-black uppercase tracking-widest transition-all ${isSelected ? 'border-emerald-500 bg-emerald-50 text-emerald-700' : 'border-gray-100 bg-white text-gray-400 hover:border-gray-200'}`}
                          >
                            {f}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div>
                    <Label className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 block">Instructions (optionnel)</Label>
                    <textarea
                      value={instructions}
                      onChange={e => setInstructions(e.target.value)}
                      className="w-full bg-white border-2 border-gray-100 rounded-xl p-4 text-sm font-bold text-gray-700 outline-none focus:border-emerald-500 transition-all min-h-[100px]"
                    />
                  </div>
                </div>
                {error && <p className="text-red-500 font-bold text-sm bg-red-50 p-2 rounded-md">{error}</p>}
                <div className="flex gap-3 pt-2">
                  <Button variant="outline" className="flex-1 h-12" onClick={() => setEditingId(null)}>Annuler</Button>
                  <Button onClick={handleSave} className="flex-1 h-12 bg-emerald-600 border-none text-white">Enregistrer</Button>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-between p-4 px-6">
                <div className="flex items-center gap-4">
                  {isSelectionMode && (
                    <div className={cn(
                      "w-5 h-5 rounded-lg border-2 flex items-center justify-center shrink-0 transition-colors",
                      selectedIds.includes(t.id) ? "bg-amber-500 border-amber-500" : "border-gray-200 bg-white"
                    )}>
                      {selectedIds.includes(t.id) && <Check size={12} className="text-white" />}
                    </div>
                  )}
                  <div className="w-12 h-12 rounded-full flex items-center justify-center shrink-0 bg-emerald-50 text-emerald-600">
                    <Sparkles size={22} />
                  </div>
                  <div>
                    <h4 className="font-black text-gray-800 text-lg leading-tight">{t.nom}</h4>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-[10px] font-black text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full uppercase tracking-widest">
                        {t.frequence}
                      </span>
                      {t.instructions && (
                        <span className="text-[10px] font-bold text-gray-400 italic truncate max-w-[150px]">
                          {t.instructions}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                {!isSelectionMode && (
                  <div className="flex items-center gap-1">
                    <button onClick={(e) => { e.stopPropagation(); handleEdit(t); }} className="p-2 text-gray-400 hover:text-crousty-purple hover:bg-purple-50 rounded-xl transition-all">
                      <Edit2 size={20} />
                    </button>
                    <button onClick={(e) => { e.stopPropagation(); setConfirmDelete(t.id); }} className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all">
                      <Trash2 size={20} />
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        ))}

        {confirmDelete && (
          <div className="fixed inset-0 z-[500] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white rounded-3xl p-6 max-w-sm w-full shadow-2xl animate-in zoom-in-95 duration-200">
              <div className="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
                <Trash2 size={32} />
              </div>
              <h3 className="text-xl font-black text-gray-800 text-center mb-2">Supprimer la tâche ?</h3>
              <p className="text-gray-500 text-center font-medium mb-6">
                Voulez-vous vraiment supprimer <span className="font-bold text-gray-800">"{nettoyage.find(t => t.id === confirmDelete)?.nom}"</span> ?
              </p>
              <div className="flex gap-3">
                <button 
                  onClick={() => setConfirmDelete(null)}
                  className="flex-1 h-12 bg-gray-100 text-gray-600 rounded-xl font-bold active:scale-95 transition-transform"
                >
                  Annuler
                </button>
                <button 
                  onClick={() => handleDelete(confirmDelete)}
                  className="flex-1 h-12 bg-red-500 text-white rounded-xl font-bold shadow-lg shadow-red-200 active:scale-95 transition-transform"
                >
                  Supprimer
                </button>
              </div>
            </div>
          </div>
        )}

        {nettoyage.length === 0 && editingId !== 'NEW' && (
          <div className="text-center py-16 bg-gray-50 rounded-[2.5rem] border-2 border-dashed border-gray-200">
            <div className="text-4xl mb-4 opacity-20">✨</div>
            <p className="text-gray-400 font-bold">Le plan est vide.</p>
            <Button onClick={handleCreate} variant="outline" className="mt-4">Ajouter une tâche</Button>
          </div>
        )}
      </div>
    </div>
  );
};


