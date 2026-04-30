import React, { useState } from 'react';
import { useConfig } from '../../contexts/ConfigContext';
import { Button, Input, Label } from '../ui/LightUI';
import { Plus, Trash2, Edit2, AlertTriangle, Check, X, Flame, Shield, LayoutGrid } from 'lucide-react';
import { CookingProductConfig } from '../../lib/configSchema';
import { cn } from '../../lib/utils';
import { useAuth } from '../../contexts/AuthContext';
import { ICONS_MAP } from '../GererLesProduits';

export function CuissonTab() {
  const { config, updateConfig } = useConfig();
  const { currentUser } = useAuth();
  const isManager = currentUser?.role === 'manager';

  const [newProductName, setNewProductName] = useState('');
  const [newProductIcon, setNewProductIcon] = useState('Drumstick');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [deleteId, setDeleteId] = useState<string | null>(null);
  
  // Selection state
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [showBulkDeleteConfirm, setShowBulkDeleteConfirm] = useState<'selected' | 'all' | null>(null);

  const products = config.cuisson || [];

  const handleAdd = () => {
    if (!newProductName.trim()) return;
    const newProduct: CookingProductConfig = {
      id: `cp-${Date.now()}`,
      name: newProductName.trim(),
      icon: newProductIcon,
      active: true
    };
    updateConfig({ cuisson: [...products, newProduct] });
    setNewProductName('');
    setNewProductIcon('Drumstick');
  };

  const handleStartEdit = (p: CookingProductConfig) => {
    setEditingId(p.id);
    setEditName(p.name);
  };

  const handleSaveEdit = () => {
    if (!editingId || !editName.trim()) return;
    const updated = products.map(p => 
      p.id === editingId ? { ...p, name: editName.trim() } : p
    );
    updateConfig({ cuisson: updated });
    setEditingId(null);
  };

  const handleDelete = (id: string) => {
    updateConfig({ cuisson: products.filter(p => p.id !== id) });
    setDeleteId(null);
    setSelectedIds(prev => prev.filter(v => v !== id));
  };

  const toggleStatus = (id: string) => {
    const updated = products.map(p => 
      p.id === id ? { ...p, active: !p.active } : p
    );
    updateConfig({ cuisson: updated });
  };

  const toggleSelection = (id: string) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(v => v !== id) : [...prev, id]
    );
  };

  const handleSelectAll = () => {
    if (selectedIds.length === products.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(products.map(p => p.id));
    }
  };

  const handleBulkDelete = () => {
    if (showBulkDeleteConfirm === 'all') {
      updateConfig({ cuisson: [] });
      setSelectedIds([]);
    } else if (showBulkDeleteConfirm === 'selected') {
      updateConfig({ cuisson: products.filter(p => !selectedIds.includes(p.id)) });
      setSelectedIds([]);
    }
    setShowBulkDeleteConfirm(null);
    setIsSelectionMode(false);
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="bg-blue-50 border border-blue-100 p-6 rounded-[2rem] flex items-start gap-4">
        <div className="p-3 bg-white rounded-2xl shadow-sm text-blue-600">
          <Flame size={24} />
        </div>
        <div>
          <h3 className="text-lg font-black text-blue-900">Cuisson Alimentaire</h3>
          <p className="text-sm text-blue-700/80 font-medium leading-relaxed">
            Gérez la liste des produits qui nécessitent un contrôle de température à cœur pendant la cuisson. 
            Ces produits apparaîtront directement dans le module "Cuisson Alimentaire" pour l'équipe.
          </p>
        </div>
      </div>

      {isManager && products.length > 0 && (
        <div className="bg-amber-50 border border-amber-100 p-6 rounded-[2rem] space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-amber-900 font-black text-xs uppercase tracking-widest">
              <Shield size={14} className="text-amber-500" />
              Actions de Gestion (Manager)
            </div>
            <div className="flex gap-2">
              <Button 
                onClick={() => {
                  setIsSelectionMode(!isSelectionMode);
                  if (isSelectionMode) setSelectedIds([]);
                }}
                className={cn(
                  "h-8 px-3 rounded-xl text-[10px] font-black uppercase tracking-widest",
                  isSelectionMode ? "bg-amber-200 text-amber-900" : "bg-white text-gray-500 border border-gray-200"
                )}
              >
                {isSelectionMode ? 'Annuler sélection' : 'Sélectionner'}
              </Button>
              <Button 
                onClick={() => setShowBulkDeleteConfirm('all')}
                className="h-8 px-3 bg-red-100 text-red-600 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-red-500 hover:text-white transition-colors"
                variant="ghost"
              >
                Tout supprimer
              </Button>
            </div>
          </div>

          {isSelectionMode && (
            <div className="flex items-center justify-between p-3 bg-white rounded-2xl border border-amber-200 animate-in zoom-in-95 duration-200">
              <div className="flex items-center gap-3">
                <button 
                  onClick={handleSelectAll}
                  className="w-5 h-5 rounded border-2 border-amber-400 flex items-center justify-center transition-colors"
                >
                  {selectedIds.length === products.length && <Check size={14} className="text-amber-500 font-black" />}
                </button>
                <span className="text-xs font-black text-amber-900">{selectedIds.length} produit(s) sélectionné(s)</span>
              </div>
              <Button 
                disabled={selectedIds.length === 0}
                onClick={() => setShowBulkDeleteConfirm('selected')}
                className="h-8 px-3 bg-red-500 text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-red-200 disabled:opacity-50"
              >
                Supprimer la sélection
              </Button>
            </div>
          )}
        </div>
      )}

      {showBulkDeleteConfirm && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[1000] flex items-center justify-center p-4">
          <div className="bg-white rounded-[2.5rem] p-8 max-w-sm w-full shadow-2xl space-y-6 animate-in zoom-in-95 duration-300">
            <div className="w-20 h-20 bg-red-50 rounded-[2rem] flex items-center justify-center mx-auto">
              <AlertTriangle size={40} className="text-red-500" />
            </div>
            <div className="text-center space-y-2">
              <h3 className="text-xl font-black text-gray-900">Confirmation forte</h3>
              <p className="text-sm text-gray-500 font-medium leading-relaxed">
                {showBulkDeleteConfirm === 'all' 
                  ? "Voulez-vous vraiment supprimer TOUS les produits de cuisson ? Cette action est irréversible."
                  : `Voulez-vous vraiment supprimer les ${selectedIds.length} produits sélectionnés ?`}
              </p>
            </div>
            <div className="flex flex-col gap-2">
              <Button 
                onClick={handleBulkDelete}
                className="w-full h-14 bg-red-500 text-white rounded-2xl font-black shadow-lg shadow-red-200 uppercase tracking-widest"
              >
                OUI, SUPPRIMER
              </Button>
              <Button 
                onClick={() => setShowBulkDeleteConfirm(null)}
                variant="ghost"
                className="w-full h-12 text-gray-500 font-black uppercase tracking-widest"
              >
                Annuler
              </Button>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white border border-gray-100 p-6 rounded-[2rem] shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Nouveau produit</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
          <div className="md:col-span-9">
            <Input 
              value={newProductName}
              onChange={(e: any) => setNewProductName(e.target.value)}
              placeholder="Nom du produit (ex: Aiguillettes...)"
              className="font-bold rounded-2xl h-12"
            />
          </div>
          <div className="md:col-span-3">
            <Button 
              onClick={handleAdd}
              disabled={!newProductName.trim()}
              className="w-full h-12 bg-gray-900 text-white rounded-2xl gap-2 font-black shadow-md shadow-gray-200"
            >
              <Plus size={18} /> Ajouter
            </Button>
          </div>
        </div>
        <div>
          <Label className="mb-2 block text-[10px] font-black text-gray-400 uppercase tracking-widest">Icône associée</Label>
          <div className="flex flex-wrap gap-2">
            {Object.keys(ICONS_MAP).map(iconKey => {
              const IconComp = ICONS_MAP[iconKey];
              const isSelected = newProductIcon === iconKey;
              return (
                <button
                  key={iconKey}
                  onClick={() => setNewProductIcon(iconKey)}
                  className={cn(
                    "p-2.5 rounded-xl border flex items-center justify-center transition-all",
                    isSelected ? "bg-blue-500 text-white border-blue-600 scale-110 shadow-md" : "bg-white text-gray-400 border-gray-200 hover:bg-gray-50 hover:text-gray-600"
                  )}
                  title={iconKey}
                >
                  <IconComp size={20} />
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between px-2">
          <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Produits configurés ({products.length})</p>
        </div>

        <div className="grid grid-cols-1 gap-3">
          {products.map(product => (
            <div 
              key={product.id}
              onClick={() => isSelectionMode && toggleSelection(product.id)}
              className={cn(
                "group relative bg-white border rounded-[1.5rem] p-4 flex items-center justify-between transition-all hover:shadow-md cursor-pointer",
                deleteId === product.id ? "border-red-200 bg-red-50" : "border-gray-100",
                selectedIds.includes(product.id) && "border-amber-400 bg-amber-50/30"
              )}
            >
              {isSelectionMode && (
                <div className="mr-4">
                   <div className={cn(
                     "w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-colors",
                     selectedIds.includes(product.id) ? "bg-amber-500 border-amber-500" : "border-gray-200 bg-white"
                   )}>
                     {selectedIds.includes(product.id) && <Check size={14} className="text-white font-black" />}
                   </div>
                </div>
              )}

              {deleteId === product.id ? (
                <div className="flex-1 flex items-center justify-between animate-in zoom-in-95 duration-200">
                  <div className="flex items-center gap-3">
                    <AlertTriangle className="text-red-500" size={20} />
                    <p className="text-sm font-black text-red-900">Supprimer "{product.name}" ?</p>
                  </div>
                  <div className="flex gap-2 text-[10px]">
                    <button 
                      onClick={(e) => { e.stopPropagation(); setDeleteId(null); }}
                      className="px-4 py-2 bg-white text-gray-500 rounded-xl font-black border border-gray-200 uppercase"
                    >
                      Annuler
                    </button>
                    <button 
                      onClick={(e) => { e.stopPropagation(); handleDelete(product.id); }}
                      className="px-4 py-2 bg-red-500 text-white rounded-xl font-black shadow-lg shadow-red-200 uppercase"
                    >
                      Supprimer
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="flex items-center gap-4 flex-1 min-w-0">
                    <div className="w-12 h-12 shrink-0 flex items-center justify-center bg-blue-50 text-blue-600 rounded-2xl border border-blue-100/50">
                      {(() => {
                        const IconCmp = ICONS_MAP[product.icon || 'Drumstick'] || ICONS_MAP['Package'];
                        return <IconCmp size={24} />;
                      })()}
                    </div>
                    {editingId === product.id ? (
                      <div className="flex-1 flex gap-2" onClick={e => e.stopPropagation()}>
                        <Input 
                          autoFocus
                          value={editName}
                          onChange={(e: any) => setEditName(e.target.value)}
                          className="h-10 font-bold"
                        />
                        <button 
                          onClick={handleSaveEdit}
                          className="p-2 bg-green-500 text-white rounded-xl"
                        >
                          <Check size={18} />
                        </button>
                        <button 
                          onClick={() => setEditingId(null)}
                          className="p-2 bg-gray-100 text-gray-500 rounded-xl"
                        >
                          <X size={18} />
                        </button>
                      </div>
                    ) : (
                      <div className="flex flex-col">
                        <h4 className="font-black text-gray-900 truncate">{product.name}</h4>
                        <p className={cn(
                          "text-[10px] font-black uppercase tracking-wider",
                          product.active ? "text-green-500" : "text-gray-400"
                        )}>
                          {product.active ? 'Actif' : 'Inactif'}
                        </p>
                      </div>
                    )}
                  </div>

                  {!isSelectionMode && (
                    <div className="flex items-center gap-1.5 shrink-0 ml-2">
                      <button 
                        onClick={(e) => { e.stopPropagation(); toggleStatus(product.id); }}
                        className={cn(
                          "p-2 rounded-xl transition-colors",
                          product.active ? "text-green-500 bg-green-50" : "text-gray-400 bg-gray-50"
                        )}
                        title={product.active ? 'Désactiver' : 'Activer'}
                      >
                        <Check size={18} />
                      </button>
                      <button 
                        onClick={(e) => { e.stopPropagation(); handleStartEdit(product); }}
                        className="p-2 text-blue-500 hover:bg-blue-50 rounded-xl transition-colors"
                      >
                        <Edit2 size={18} />
                      </button>
                      <button 
                        onClick={(e) => { e.stopPropagation(); setDeleteId(product.id); }}
                        className="p-2 text-red-500 hover:bg-red-50 rounded-xl transition-colors"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>
          ))}

          {products.length === 0 && (
            <div className="py-12 flex flex-col items-center justify-center text-gray-400 bg-gray-50/50 rounded-[2rem] border-2 border-dashed border-gray-100">
              <Flame size={48} className="mb-4 opacity-20" />
              <p className="font-bold">Aucun produit configuré</p>
              <p className="text-xs">Ajoutez votre premier produit ci-dessus</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

