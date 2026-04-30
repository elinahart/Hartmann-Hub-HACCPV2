import React, { useState } from 'react';
import { Thermometer, Edit2, Trash2, Plus, Snowflake, Shield, Check, AlertTriangle, GripVertical, ChevronUp, ChevronDown } from 'lucide-react';
import { useConfig } from '../../contexts/ConfigContext';
import { Button, Input, Label } from '../ui/LightUI';
import { useAuth } from '../../contexts/AuthContext';
import { cn } from '../../lib/utils';
import { motion, Reorder } from 'motion/react';

import { useTemperatures } from '../../providers/TemperaturesProvider';
import { useI18n } from '../../lib/i18n';

export const TemperaturesTab = () => {
  const { config, updateConfig } = useConfig();
  const { currentUser } = useAuth();
  const { t } = useI18n();
  const isManager = currentUser?.role === 'manager';
  const { zones, setZones } = useTemperatures();
  const [editingId, setEditingId] = useState<string | null>(null);
  
  // Selection state
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [showBulkDeleteConfirm, setShowBulkDeleteConfirm] = useState<'selected' | 'all' | null>(null);

  // Form state
  const [nom, setNom] = useState('');
  const [type, setType] = useState<'positif' | 'negatif'>('positif');
  const [seuilMin, setSeuilMin] = useState<number>(0);
  const [seuilMax, setSeuilMax] = useState<number>(4);
  const [error, setError] = useState<string | null>(null);

  const temperatures = zones || [];

  const handleEdit = (tObj: any) => {
    setEditingId(tObj.id);
    setNom(tObj.nom);
    setType(tObj.type);
    setSeuilMin(tObj.seuilMin);
    setSeuilMax(tObj.seuilMax);
    setError(null);
  };

  const handleCreate = () => {
    setEditingId('NEW');
    setNom('');
    setType('positif');
    setSeuilMin(0);
    setSeuilMax(4);
    setError(null);
  };

  const handleSave = () => {
    if (nom.trim() === '') {
      setError(t('err_generic') || 'Le nom est requis.');
      return;
    }
    if (seuilMin >= seuilMax) {
      setError(t('err_generic') || 'Le seuil min doit être inférieur au seuil max.');
      return;
    }

    const payload = {
      id: editingId === 'NEW' ? `temp-${Date.now()}` : editingId!,
      nom,
      type,
      seuilMin,
      seuilMax
    };

    let newTemps;
    if (editingId === 'NEW') {
      newTemps = [...temperatures, payload];
    } else {
      newTemps = temperatures.map((tObj: any) => tObj.id === editingId ? payload : tObj);
    }

    updateConfig({ temperatures: newTemps });
    setZones(newTemps);
    setEditingId(null);
  };

  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  const handleDelete = (id: string) => {
    const newTemps = temperatures.filter((tObj: any) => tObj.id !== id);
    updateConfig({ temperatures: newTemps });
    setZones(newTemps);
    setConfirmDelete(null);
    setSelectedIds(prev => prev.filter(v => v !== id));
  };

  const toggleSelection = (id: string) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(v => v !== id) : [...prev, id]
    );
  };

  const handleSelectAll = () => {
    if (selectedIds.length === temperatures.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(temperatures.map((tObj: any) => tObj.id));
    }
  };

  const handleBulkDelete = () => {
    let newTemps = [];
    if (showBulkDeleteConfirm === 'selected') {
      newTemps = temperatures.filter((tObj: any) => !selectedIds.includes(tObj.id));
    }
    updateConfig({ temperatures: newTemps });
    setZones(newTemps);
    setSelectedIds([]);
    setShowBulkDeleteConfirm(null);
    setIsSelectionMode(false);
  };

  const moveItem = (index: number, direction: 'up' | 'down') => {
    const items = [...temperatures];
    if (direction === 'up' && index > 0) {
      [items[index], items[index - 1]] = [items[index - 1], items[index]];
    } else if (direction === 'down' && index < items.length - 1) {
      [items[index], items[index + 1]] = [items[index + 1], items[index]];
    }
    setZones(items);
    updateConfig({ temperatures: items });
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-center justify-between">
        <h3 className="text-xl font-black text-gray-800">{t('nav_temperatures') || 'Zones Températures'}</h3>
        {!editingId && (
          <Button onClick={handleCreate} className="bg-crousty-purple text-white gap-2 rounded-xl h-10 px-4">
            <Plus size={16} /> {t('btn_add') || 'Ajouter une zone'}
          </Button>
        )}
      </div>

      {isManager && temperatures.length > 0 && !editingId && (
        <div className="bg-amber-50 border border-amber-100 p-4 rounded-3xl space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-amber-900 font-bold text-[10px] uppercase tracking-widest">
              <Shield size={14} className="text-amber-500" />
              {t('btn_manage') || 'Gestion'}
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
                {isSelectionMode ? t('btn_cancel') || 'Annuler' : t('btn_select') || 'Sélectionner'}
              </Button>
              <Button 
                onClick={() => setShowBulkDeleteConfirm('all')}
                className="h-7 px-3 bg-red-100 text-red-600 rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-red-500 hover:text-white transition-colors"
                variant="ghost"
              >
                {t('btn_empty') || 'Vider'}
              </Button>
            </div>
          </div>

          {isSelectionMode && (
            <div className="flex items-center justify-between p-2 bg-white rounded-xl border border-amber-200 animate-in zoom-in-95 duration-200">
              <div className="flex items-center gap-2">
                <button 
                  onClick={handleSelectAll}
                  className="w-5 h-5 rounded border-2 border-amber-400 flex items-center justify-center"
                >
                  {selectedIds.length === temperatures.length && <Check size={14} className="text-amber-500" />}
                </button>
                <span className="text-[10px] font-black text-amber-900 uppercase">{selectedIds.length} {t('lbl_selected') || 'sélectionné(s)'}</span>
              </div>
              <Button 
                disabled={selectedIds.length === 0}
                onClick={() => setShowBulkDeleteConfirm('selected')}
                className="h-7 px-3 bg-red-500 text-white rounded-xl text-[9px] font-black uppercase tracking-widest"
              >
                {t('btn_delete') || 'Supprimer'}
              </Button>
            </div>
          )}
        </div>
      )}

      {showBulkDeleteConfirm && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[1000] flex items-center justify-center p-4">
          <div className="bg-white rounded-[2rem] p-8 max-w-sm w-full shadow-2xl space-y-6 animate-in zoom-in-95 duration-300">
            <div className="text-center space-y-2">
              <h3 className="text-xl font-black text-gray-900">{t('lbl_confirmation') || 'Confirmation'}</h3>
              <p className="text-sm text-gray-500 font-medium">
                {showBulkDeleteConfirm === 'all' 
                  ? t('lbl_confirm_empty_temp') || "Vider toute la liste des zones ?"
                  : t('lbl_confirm_delete_selected') || `Supprimer les ${selectedIds.length} zones sélectionnées ?`}
              </p>
            </div>
            <div className="flex gap-2">
              <Button onClick={() => setShowBulkDeleteConfirm(null)} variant="ghost" className="flex-1">{t('btn_no') || 'Non'}</Button>
              <Button onClick={handleBulkDelete} className="flex-1 bg-red-500">{t('btn_yes') || 'Oui'}</Button>
            </div>
          </div>
        </div>
      )}

      <div className="space-y-3">
        {temperatures.map((tObj: any, index: number) => (
          <div 
            key={tObj.id} 
          >
            <div
            onClick={() => isSelectionMode && toggleSelection(tObj.id)}
            className={cn(
              "border rounded-2xl bg-white overflow-hidden shadow-sm transition-all relative group",
              !isSelectionMode && "cursor-default",
              isSelectionMode && "cursor-pointer",
              editingId === tObj.id ? "border-crousty-purple ring-2 ring-purple-50 z-10" : "border-gray-100",
              selectedIds.includes(tObj.id) && "border-amber-400 bg-amber-50/20"
            )}
          >
            {editingId === tObj.id ? (
              <div className="p-4 bg-gray-50 space-y-4" onClick={e => e.stopPropagation()}>
                <div className="flex justify-between items-center">
                  <h4 className="font-bold text-gray-800">{t('btn_edit') || 'Modifier la zone'}</h4>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <Label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1 block">Nom de la zone</Label>
                    <Input value={nom} onChange={(e: any) => setNom(e.target.value)} placeholder="Ex: FRIGO CUISINE" />
                  </div>
                  <div className="col-span-2 flex gap-2">
                    <button 
                      onClick={() => setType('positif')}
                      className={`flex-1 py-2 rounded-xl text-sm font-bold border transition-colors flex items-center justify-center gap-2 ${type === 'positif' ? 'border-orange-500 bg-orange-50 text-orange-600' : 'border-gray-200 bg-white text-gray-500'}`}
                    >
                      <Thermometer size={16} /> Positif
                    </button>
                    <button 
                      onClick={() => setType('negatif')}
                      className={`flex-1 py-2 rounded-xl text-sm font-bold border transition-colors flex items-center justify-center gap-2 ${type === 'negatif' ? 'border-blue-500 bg-blue-50 text-blue-600' : 'border-gray-200 bg-white text-gray-500'}`}
                    >
                      <Snowflake size={16} /> Négatif
                    </button>
                  </div>
                  <div>
                    <Label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1 block">Seuil Min (°C)</Label>
                    <Input type="number" value={seuilMin} onChange={(e: any) => setSeuilMin(Number(e.target.value))} />
                  </div>
                  <div>
                    <Label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1 block">Seuil Max (°C)</Label>
                    <Input type="number" value={seuilMax} onChange={(e: any) => setSeuilMax(Number(e.target.value))} />
                  </div>
                </div>
                {error && <p className="text-red-500 font-bold text-sm bg-red-50 p-2 rounded-md">{error}</p>}
                <div className="flex gap-2 justify-end pt-2">
                  <Button variant="outline" onClick={() => setEditingId(null)}>{t('btn_cancel') || 'Annuler'}</Button>
                  <Button onClick={handleSave} className="bg-crousty-purple text-white">{t('btn_save') || 'Enregistrer'}</Button>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-between p-4 min-h-[44px]">
                <div className="flex items-center gap-3">
                  {isSelectionMode && (
                    <div className={cn(
                      "w-5 h-5 rounded-lg border-2 shrink-0 flex items-center justify-center transition-colors",
                      selectedIds.includes(tObj.id) ? "bg-amber-500 border-amber-500" : "border-gray-200 bg-white"
                    )}>
                      {selectedIds.includes(tObj.id) && <Check size={12} className="text-white" />}
                    </div>
                  )}
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${tObj.type === 'negatif' ? 'bg-blue-50 text-blue-500' : 'bg-orange-50 text-orange-500'}`}>
                    {tObj.type === 'negatif' ? <Snowflake size={20} /> : <Thermometer size={20} />}
                  </div>
                  <div>
                    <h4 className="font-bold text-gray-800 leading-tight">{tObj.nom}</h4>
                    <span className="text-xs font-semibold text-gray-500">{tObj.seuilMin}°C {t('lbl_to') || 'à'} {tObj.seuilMax}°C</span>
                  </div>
                </div>
                {!isSelectionMode && (
                  <div className="flex items-center gap-1">
                    <div className="flex flex-col border-r border-gray-100 pr-1 mr-1">
                      <button 
                        onClick={(e) => { e.stopPropagation(); moveItem(index, 'up'); }} 
                        disabled={index === 0}
                        className={cn("p-1 rounded-md transition-colors", index === 0 ? "text-gray-200" : "text-gray-400 hover:bg-gray-100 hover:text-gray-800")}
                      >
                        <ChevronUp size={20} />
                      </button>
                      <button 
                        onClick={(e) => { e.stopPropagation(); moveItem(index, 'down'); }} 
                        disabled={index === temperatures.length - 1}
                        className={cn("p-1 rounded-md transition-colors", index === temperatures.length - 1 ? "text-gray-200" : "text-gray-400 hover:bg-gray-100 hover:text-gray-800")}
                      >
                        <ChevronDown size={20} />
                      </button>
                    </div>
                    <button onClick={(e) => { e.stopPropagation(); handleEdit(tObj); }} className="p-2 text-gray-400 hover:text-crousty-purple hover:bg-purple-50 rounded-xl transition-colors">
                      <Edit2 size={20} />
                    </button>
                    <button onClick={(e) => { e.stopPropagation(); setConfirmDelete(tObj.id); }} className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-colors">
                      <Trash2 size={20} />
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
          </div>
        ))}
      </div>

        {confirmDelete && (
          <div className="fixed inset-0 z-[500] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white rounded-3xl p-6 max-w-sm w-full shadow-2xl animate-in zoom-in-95 duration-200">
              <div className="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
                <Trash2 size={32} />
              </div>
              <h3 className="text-xl font-black text-gray-800 text-center mb-2">{t('lbl_delete_zone_confirm_title') || 'Supprimer la zone ?'}</h3>
              <p className="text-gray-500 text-center font-medium mb-6">
                {t('lbl_delete_confirm') || 'Voulez-vous vraiment supprimer'} <span className="font-bold text-gray-800">"{temperatures.find((tObj:any) => tObj.id === confirmDelete)?.nom}"</span> ?
              </p>
              <div className="flex gap-3">
                <button 
                  onClick={() => setConfirmDelete(null)}
                  className="flex-1 h-12 bg-gray-100 text-gray-600 rounded-xl font-bold active:scale-95 transition-transform"
                >
                  {t('btn_cancel') || 'Annuler'}
                </button>
                <button 
                  onClick={() => handleDelete(confirmDelete)}
                  className="flex-1 h-12 bg-red-500 text-white rounded-xl font-bold shadow-lg shadow-red-200 active:scale-95 transition-transform"
                >
                  {t('btn_delete') || 'Supprimer'}
                </button>
              </div>
            </div>
          </div>
        )}

        {editingId === 'NEW' && (
          <div className="border border-gray-100 rounded-2xl bg-gray-50 p-4 space-y-4 shadow-sm" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center">
              <h4 className="font-bold text-gray-800">{t('btn_add') || 'Ajouter une zone'}</h4>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <Label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1 block">Nom de la zone</Label>
                <Input value={nom} onChange={(e: any) => setNom(e.target.value)} placeholder="Ex: FRIGO CUISINE" />
              </div>
              <div className="col-span-2 flex gap-2">
                <button 
                  onClick={() => setType('positif')}
                  className={`flex-1 py-2 rounded-xl text-sm font-bold border transition-colors flex items-center justify-center gap-2 ${type === 'positif' ? 'border-orange-500 bg-orange-50 text-orange-600' : 'border-gray-200 bg-white text-gray-500'}`}
                >
                  <Thermometer size={16} /> Positif
                </button>
                <button 
                  onClick={() => setType('negatif')}
                  className={`flex-1 py-2 rounded-xl text-sm font-bold border transition-colors flex items-center justify-center gap-2 ${type === 'negatif' ? 'border-blue-500 bg-blue-50 text-blue-600' : 'border-gray-200 bg-white text-gray-500'}`}
                >
                  <Snowflake size={16} /> Négatif
                </button>
              </div>
              <div>
                <Label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1 block">Seuil Min (°C)</Label>
                <Input type="number" value={seuilMin} onChange={(e: any) => setSeuilMin(Number(e.target.value))} />
              </div>
              <div>
                <Label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1 block">Seuil Max (°C)</Label>
                <Input type="number" value={seuilMax} onChange={(e: any) => setSeuilMax(Number(e.target.value))} />
              </div>
            </div>
            {error && <p className="text-red-500 font-bold text-sm bg-red-50 p-2 rounded-md">{error}</p>}
            <div className="flex gap-2 justify-end pt-2">
              <Button variant="outline" onClick={() => setEditingId(null)}>{t('btn_cancel') || 'Annuler'}</Button>
              <Button onClick={handleSave} className="bg-crousty-purple text-white">{t('btn_save') || 'Enregistrer'}</Button>
            </div>
          </div>
        )}

        {temperatures.length === 0 && editingId !== 'NEW' && (
          <div className="text-center p-8 bg-gray-50 rounded-2xl border border-gray-100">
            <p className="text-gray-500 font-medium tracking-tight">{t('lbl_no_zones') || 'Aucune zone configurée.'}</p>
          </div>
        )}
    </div>
  );
};


