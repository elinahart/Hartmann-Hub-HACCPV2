import React, { useState } from 'react';
import { Droplets, Edit2, Trash2, Plus, Shield, Check, AlertTriangle, GripVertical, ChevronUp, ChevronDown } from 'lucide-react';
import { useConfig } from '../../contexts/ConfigContext';
import { Button, Input, Label } from '../ui/LightUI';
import { useAuth } from '../../contexts/AuthContext';
import { cn } from '../../lib/utils';
import { motion, Reorder } from 'motion/react';

import { useHuiles } from '../../providers/HuilesProvider';
import { useI18n } from '../../lib/i18n';

export const HuilesTab = () => {
  const { config, updateConfig } = useConfig();
  const { currentUser } = useAuth();
  const { t } = useI18n();
  const isManager = currentUser?.role === 'manager';
  const { cuves, setCuves } = useHuiles();
  const [editingId, setEditingId] = useState<string | null>(null);
  
  // Selection state
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [showBulkDeleteConfirm, setShowBulkDeleteConfirm] = useState<'selected' | 'all' | null>(null);

  // Form state
  const [nom, setNom] = useState('');
  const [error, setError] = useState<string | null>(null);

  const huiles = cuves || [];

  const handleEdit = (h: any) => {
    setEditingId(h.id);
    setNom(h.nom);
    setError(null);
  };

  const handleCreate = () => {
    setEditingId('NEW');
    setNom('');
    setError(null);
  };

  const handleSave = () => {
    if (nom.trim() === '') {
      setError(t('err_generic'));
      return;
    }

    const payload = {
      id: editingId === 'NEW' ? `huile-${Date.now()}` : editingId!,
      nom
    };

    let newHuiles;
    if (editingId === 'NEW') {
      newHuiles = [...huiles, payload];
    } else {
      newHuiles = huiles.map((h: any) => h.id === editingId ? payload : h);
    }

    updateConfig({ huiles: newHuiles });
    setCuves(newHuiles);
    setEditingId(null);
  };

  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  const handleDelete = (id: string) => {
    const newHuiles = huiles.filter((h: any) => h.id !== id);
    updateConfig({ huiles: newHuiles });
    setCuves(newHuiles);
    setConfirmDelete(null);
    setSelectedIds(prev => prev.filter(v => v !== id));
  };

  const toggleSelection = (id: string) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(v => v !== id) : [...prev, id]
    );
  };

  const handleSelectAll = () => {
    if (selectedIds.length === huiles.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(huiles.map((h: any) => h.id));
    }
  };

  const handleBulkDelete = () => {
    let newHuiles = [];
    if (showBulkDeleteConfirm === 'selected') {
      newHuiles = huiles.filter((h: any) => !selectedIds.includes(h.id));
    }
    updateConfig({ huiles: newHuiles });
    setCuves(newHuiles);
    setSelectedIds([]);
    setShowBulkDeleteConfirm(null);
    setIsSelectionMode(false);
  };

  const moveItem = (index: number, direction: 'up' | 'down') => {
    const items = [...huiles];
    if (direction === 'up' && index > 0) {
      [items[index], items[index - 1]] = [items[index - 1], items[index]];
    } else if (direction === 'down' && index < items.length - 1) {
      [items[index], items[index + 1]] = [items[index + 1], items[index]];
    }
    setCuves(items);
    updateConfig({ huiles: items });
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-center justify-between">
        <h3 className="text-xl font-black text-gray-800">{t('nav_oil')}</h3>
        {!editingId && (
          <Button onClick={handleCreate} className="bg-crousty-purple text-white gap-2 rounded-xl h-10 px-4">
            <Plus size={16} /> {t('btn_add')}
          </Button>
        )}
      </div>

      {isManager && huiles.length > 0 && !editingId && (
        <div className="bg-amber-50 border border-amber-100 p-4 rounded-3xl space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-amber-900 font-bold text-[10px] uppercase tracking-widest">
              <Shield size={14} className="text-amber-500" />
              {t('btn_manage')}
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
                {isSelectionMode ? t('btn_cancel') : t('btn_select')}
              </Button>
              <Button 
                onClick={() => setShowBulkDeleteConfirm('all')}
                className="h-7 px-3 bg-red-100 text-red-600 rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-red-500 hover:text-white transition-colors"
                variant="ghost"
              >
                {t('btn_empty')}
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
                  {selectedIds.length === huiles.length && <Check size={14} className="text-amber-500" />}
                </button>
                <span className="text-[10px] font-black text-amber-900 uppercase">{selectedIds.length} {t('lbl_selected')}</span>
              </div>
              <Button 
                disabled={selectedIds.length === 0}
                onClick={() => setShowBulkDeleteConfirm('selected')}
                className="h-7 px-3 bg-red-500 text-white rounded-xl text-[9px] font-black uppercase tracking-widest shadow-lg shadow-red-200 shadow-opacity-20"
              >
                {t('btn_delete')}
              </Button>
            </div>
          )}
        </div>
      )}

      {showBulkDeleteConfirm && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[1000] flex items-center justify-center p-4">
          <div className="bg-white rounded-[2rem] p-8 max-w-sm w-full shadow-2xl space-y-6 animate-in zoom-in-95 duration-300">
            <div className="text-center space-y-2">
              <h3 className="text-xl font-black text-gray-900">{t('lbl_confirmation')}</h3>
              <p className="text-sm text-gray-500 font-medium tracking-tight">
                {showBulkDeleteConfirm === 'all' 
                  ? t('lbl_confirm_empty_oils')
                  : t('lbl_confirm_delete_oils_selected', { count: selectedIds.length })}
              </p>
            </div>
            <div className="flex gap-2">
              <Button onClick={() => setShowBulkDeleteConfirm(null)} variant="ghost" className="flex-1 font-black uppercase tracking-widest text-[10px]">{t('btn_cancel')}</Button>
              <Button onClick={handleBulkDelete} className="flex-1 bg-red-500 text-white font-black uppercase tracking-widest text-[10px]">{t('btn_yes')}</Button>
            </div>
          </div>
        </div>
      )}

      <div className="space-y-3">
        {huiles.map((h: any, index: number) => (
          <div 
            key={h.id} 
          >
          <div 
            onClick={() => isSelectionMode && toggleSelection(h.id)}
            className={cn(
              "border rounded-2xl bg-white overflow-hidden shadow-sm transition-all relative group",
              !isSelectionMode && "cursor-default",
              isSelectionMode && "cursor-pointer",
              editingId === h.id ? "border-crousty-purple ring-2 ring-purple-50 z-10" : "border-gray-100",
              selectedIds.includes(h.id) && "border-amber-400 bg-amber-50/20"
            )}
          >
            {editingId === h.id ? (
              <div className="p-4 bg-gray-50 flex items-center gap-3" onClick={e => e.stopPropagation()}>
                <Input value={nom} onChange={(e: any) => setNom(e.target.value)} placeholder={t('ph_oil_vat_name')} autoFocus className="flex-1" />
                <Button variant="outline" onClick={() => setEditingId(null)}>{t('btn_cancel')}</Button>
                <Button onClick={handleSave} className="bg-crousty-purple text-white font-bold">{t('btn_save')}</Button>
              </div>
            ) : (
              <div className="flex items-center justify-between p-4 min-h-[44px]">
                <div className="flex items-center gap-3">
                  {isSelectionMode && (
                    <div className={cn(
                      "w-5 h-5 rounded-lg border-2 flex items-center justify-center transition-colors",
                      selectedIds.includes(h.id) ? "bg-amber-500 border-amber-500" : "border-gray-200 bg-white"
                    )}>
                      {selectedIds.includes(h.id) && <Check size={12} className="text-white" />}
                    </div>
                  )}
                  <div className="w-10 h-10 rounded-full flex items-center justify-center shrink-0 bg-yellow-50 text-yellow-600">
                    <Droplets size={20} />
                  </div>
                  <div>
                    <h4 className="font-bold text-gray-800 leading-tight">{h.nom}</h4>
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
                        disabled={index === huiles.length - 1}
                        className={cn("p-1 rounded-md transition-colors", index === huiles.length - 1 ? "text-gray-200" : "text-gray-400 hover:bg-gray-100 hover:text-gray-800")}
                      >
                        <ChevronDown size={20} />
                      </button>
                    </div>
                    <button onClick={(e) => { e.stopPropagation(); handleEdit(h); }} className="p-2 text-gray-400 hover:text-crousty-purple hover:bg-purple-50 rounded-xl transition-colors">
                      <Edit2 size={20} />
                    </button>
                    <button onClick={(e) => { e.stopPropagation(); setConfirmDelete(h.id); }} className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-colors">
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
              <h3 className="text-xl font-black text-gray-800 text-center mb-2 tracking-tight">{t('lbl_delete_oils_confirm_title')}</h3>
              <p className="text-gray-500 text-center font-medium mb-6 text-sm">
                {t('lbl_confirm_delete_item', { item: huiles.find((h:any) => h.id === confirmDelete)?.nom })}
              </p>
              <div className="flex gap-3">
                <button 
                  onClick={() => setConfirmDelete(null)}
                  className="flex-1 h-12 bg-gray-100 text-gray-600 rounded-xl font-bold"
                >
                  {t('btn_cancel')}
                </button>
                <button 
                  onClick={() => handleDelete(confirmDelete)}
                  className="flex-1 h-12 bg-red-500 text-white rounded-xl font-bold shadow-lg shadow-red-200"
                >
                  {t('btn_delete')}
                </button>
              </div>
            </div>
          </div>
        )}

        {editingId === 'NEW' && (
           <div className="border border-gray-100 rounded-2xl bg-gray-50 p-4 space-y-3 shadow-sm" onClick={e => e.stopPropagation()}>
            <Label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1 block">{t('btn_add')}</Label>
            <div className="flex items-center gap-3">
              <Input value={nom} onChange={(e: any) => setNom(e.target.value)} placeholder={t('ph_oil_vat_name')} autoFocus className="flex-1" />
              <Button variant="outline" onClick={() => setEditingId(null)}>{t('btn_cancel')}</Button>
              <Button onClick={handleSave} className="bg-crousty-purple text-white font-bold">{t('btn_save')}</Button>
            </div>
            {error && <p className="text-red-500 font-bold text-sm bg-red-50 p-2 rounded-md">{error}</p>}
          </div>
        )}

        {huiles.length === 0 && editingId !== 'NEW' && (
          <div className="text-center p-8 bg-gray-50 rounded-2xl border border-gray-100">
            <p className="text-gray-500 font-medium tracking-tight">{t('lbl_no_oils')}</p>
          </div>
        )}
    </div>
  );
};

