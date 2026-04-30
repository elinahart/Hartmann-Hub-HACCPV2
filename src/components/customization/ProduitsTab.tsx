import React, { useState, useMemo } from 'react';
import { BookOpen, Edit2, Trash2, Plus, Clock, Search, XCircle, Shield, Check, AlertTriangle } from 'lucide-react';
import { useConfig } from '../../contexts/ConfigContext';
import { Button, Input, Label } from '../ui/LightUI';
import { ProductDef } from '../../types';
import { getIconeCategorie, CATEGORIES_CONFIG } from '../../lib/categoriesIcones';
import { useCatalogue } from '../../providers/CatalogueProvider';
import { useAuth } from '../../contexts/AuthContext';
import { cn } from '../../lib/utils';

const CATEGORY_ORDER = [
  'Surgelés / Congelés',
  'Frais',
  'Produits laitiers',
  'Sec alimentaire',
  'Sauces',
  'Légumes',
  'Desserts',
  'Hygiène / Nettoyage'
];

const getCategoryOrder = (cat: string) => {
  const index = CATEGORY_ORDER.indexOf(cat);
  return index === -1 ? 999 : index;
};

export const ProduitsTab = () => {
  const { config, updateConfig } = useConfig();
  const { currentUser } = useAuth();
  const isManager = currentUser?.role === 'manager';
  const { produits, setProduits } = useCatalogue();
  const [editingId, setEditingId] = useState<string | null>(null);
  
  // Selection state
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [showBulkDeleteConfirm, setShowBulkDeleteConfirm] = useState<'selected' | 'all' | null>(null);

  // Filtres
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilterCategory, setSelectedFilterCategory] = useState<string>('Toutes');

  // Form state
  const [name, setName] = useState('');
  const [category, setCategory] = useState('Desserts');
  const [dlcValue, setDlcValue] = useState<number>(24);
  const [dlcUnit, setDlcUnit] = useState('hours');
  const [conservation, setConservation] = useState('');
  const [note, setNote] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleEdit = (p: ProductDef) => {
    setEditingId(p.id);
    setName(p.name || '');
    setCategory(p.category || 'Desserts');
    setDlcValue(p.dlcValue || 24);
    setDlcUnit(p.dlcUnit || 'hours');
    setConservation(p.conservation || '');
    setNote(p.note || '');
    setError(null);
  };

  const handleCreate = () => {
    setEditingId('NEW');
    setName('');
    setCategory(selectedFilterCategory !== 'Toutes' ? selectedFilterCategory : 'Desserts');
    setDlcValue(24);
    setDlcUnit('hours');
    setConservation('');
    setNote('');
    setError(null);
  };

  const handleSave = () => {
    if (name.trim() === '') {
      setError('Le nom du produit est requis.');
      return;
    }

    const payload: ProductDef = {
      id: editingId === 'NEW' ? Date.now().toString() : editingId!,
      name: name.trim(),
      category,
      dlcValue: Number(dlcValue),
      dlcUnit,
      conservation,
      note
    };

    let newProduits: ProductDef[];
    if (editingId === 'NEW') {
      newProduits = [...produits, payload];
    } else {
      newProduits = produits.map((p: ProductDef) => p.id === editingId ? payload : p);
    }

    setProduits(newProduits);
    setEditingId(null);
  };

  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  const handleDelete = (id: string) => {
    setProduits(produits.filter((p: ProductDef) => p.id !== id));
    setConfirmDelete(null);
    setSelectedIds(prev => prev.filter(v => v !== id));
  };

  const toggleSelection = (id: string) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(v => v !== id) : [...prev, id]
    );
  };

  const handleSelectAll = (visibleIds: string[]) => {
    if (selectedIds.length >= visibleIds.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(visibleIds);
    }
  };

  const handleBulkDelete = () => {
    if (showBulkDeleteConfirm === 'all') {
      setProduits([]);
    } else if (showBulkDeleteConfirm === 'selected') {
      setProduits(produits.filter(p => !selectedIds.includes(p.id)));
    }
    setSelectedIds([]);
    setShowBulkDeleteConfirm(null);
    setIsSelectionMode(false);
  };

  const categories = Object.keys(CATEGORIES_CONFIG);

  // Filtrage et distribution par catégories
  const filteredAndGroupedProducts = useMemo(() => {
    let filtered = produits.filter(p => {
      const matchSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase());
      const matchCat = selectedFilterCategory === 'Toutes' || p.category === selectedFilterCategory;
      return matchSearch && matchCat;
    });

    const visibleIds = filtered.map(p => p.id);

    const grouped = filtered.reduce((acc, current) => {
      const cat = current.category || 'Autres';
      if (!acc[cat]) acc[cat] = [];
      acc[cat].push(current);
      return acc;
    }, {} as Record<string, ProductDef[]>);

    const sortedCategories = Object.keys(grouped).sort((a, b) => getCategoryOrder(a) - getCategoryOrder(b));

    sortedCategories.forEach(c => {
      grouped[c].sort((a, b) => (a.name || '').localeCompare(b.name || ''));
    });

    return { grouped, sortedCategories, visibleIds };
  }, [produits, searchQuery, selectedFilterCategory]);

  const renderProductForm = () => (
    <div className="space-y-4">
      <div>
        <Label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 block">Nom du produit</Label>
        <Input value={name} onChange={e => setName(e.target.value)} placeholder="Ex: Tiramisu" className="h-12 font-bold" />
      </div>
      
      <div>
        <Label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 block">Catégorie</Label>
        <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
          {categories.map((c) => {
            const conf = CATEGORIES_CONFIG[c as keyof typeof CATEGORIES_CONFIG];
            const IconCmp = conf.icone;
            const isSelected = category === c;
            return (
              <button
                key={c}
                onClick={() => setCategory(c)}
                className={`flex flex-col items-center justify-center p-2 rounded-xl border-2 transition-all cursor-pointer h-16 ${isSelected ? 'border-crousty-purple bg-crousty-pink/10' : 'border-gray-100 bg-white hover:border-gray-200'}`}
              >
                <IconCmp size={20} color={isSelected ? '#FF2A9D' : conf.couleur} className="mb-1" />
                <span className={`text-[8px] font-bold text-center leading-tight ${isSelected ? 'text-crousty-purple' : 'text-gray-500'}`}>{c}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 block">Valeur DLC</Label>
          <Input type="number" value={dlcValue} onChange={e => setDlcValue(Number(e.target.value))} className="h-12 font-bold" />
        </div>
        <div>
          <Label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 block">Unité</Label>
          <select
            value={dlcUnit}
            onChange={e => setDlcUnit(e.target.value)}
            className="w-full h-12 bg-white border-2 border-gray-100 rounded-xl px-4 text-sm font-bold text-gray-700 outline-none focus:border-crousty-purple transition-all"
          >
            <option value="hours">Heures</option>
            <option value="days">Jours</option>
            <option value="mois">Mois</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="col-span-2 sm:col-span-1">
          <Label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 block">Conservation</Label>
          <Input value={conservation} onChange={e => setConservation(e.target.value)} placeholder="❄️ +4°C" className="h-12 text-sm" />
        </div>
        <div className="col-span-2 sm:col-span-1">
          <Label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 block">Ouverture</Label>
          <Input value={note} onChange={e => setNote(e.target.value)} placeholder="Consommer sous 24h" className="h-12 text-sm" />
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-6 max-w-2xl pb-24">
      <div className="flex items-center justify-between">
        <h3 className="text-xl font-black text-gray-800">Catalogue Produits ({produits.length})</h3>
      </div>

      {!editingId && (
        <button 
          onClick={handleCreate} 
          className="fixed bottom-6 right-6 md:bottom-12 md:right-12 w-16 h-16 bg-crousty-purple text-white rounded-full flex items-center justify-center shadow-2xl shadow-crousty-purple/30 hover:scale-105 active:scale-95 transition-all z-[300] shadow-glow-purple"
        >
          <Plus size={32} strokeWidth={2.5} />
        </button>
      )}

      {isManager && produits.length > 0 && !editingId && (
        <div className="bg-amber-50 border border-amber-100 p-4 rounded-3xl space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-amber-900 font-bold text-[10px] uppercase tracking-widest">
              <Shield size={14} className="text-amber-500" />
              Actions Manager
            </div>
            <div className="flex gap-2">
              <Button 
                onClick={() => {
                  setIsSelectionMode(!isSelectionMode);
                  if (isSelectionMode) setSelectedIds([]);
                }}
                className={cn(
                  "h-7 px-3 rounded-xl text-[9px] font-black uppercase tracking-widest",
                  isSelectionMode ? "bg-amber-200 text-amber-900" : "bg-white text-gray-500 border border-gray-200"
                )}
              >
                {isSelectionMode ? 'Annuler' : 'Sélection'}
              </Button>
              <Button 
                onClick={() => setShowBulkDeleteConfirm('all')}
                className="h-7 px-3 bg-red-100 text-red-600 rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-red-500 hover:text-white transition-colors"
                variant="ghost"
              >
                Tout vider
              </Button>
            </div>
          </div>

          {isSelectionMode && (
            <div className="flex items-center justify-between p-2 bg-white rounded-xl border border-amber-200 animate-in zoom-in-95 duration-200">
              <div className="flex items-center gap-2">
                <button 
                  onClick={() => handleSelectAll(filteredAndGroupedProducts.visibleIds)}
                  className="w-5 h-5 rounded border-2 border-amber-400 flex items-center justify-center transition-colors"
                >
                  {selectedIds.length > 0 && selectedIds.length >= filteredAndGroupedProducts.visibleIds.length && <Check size={14} className="text-amber-500 font-black" />}
                </button>
                <span className="text-[10px] font-black text-amber-900 uppercase">{selectedIds.length} sélectionné(s)</span>
              </div>
              <Button 
                disabled={selectedIds.length === 0}
                onClick={() => setShowBulkDeleteConfirm('selected')}
                className="h-7 px-4 bg-red-500 text-white rounded-xl text-[9px] font-black uppercase tracking-widest"
              >
                Supprimer
              </Button>
            </div>
          )}
        </div>
      )}

      {showBulkDeleteConfirm && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[1000] flex items-center justify-center p-4">
          <div className="bg-white rounded-[2rem] p-8 max-w-sm w-full shadow-2xl space-y-6 animate-in zoom-in-95 duration-300">
            <div className="text-center space-y-2">
              <h3 className="text-xl font-black text-gray-900 leading-tight">Confirmation</h3>
              <p className="text-sm text-gray-500 font-medium">
                {showBulkDeleteConfirm === 'all' 
                  ? "Voulez-vous vraiment vider tout le catalogue ?"
                  : `Supprimer les ${selectedIds.length} produits sélectionnés ?`}
              </p>
            </div>
            <div className="flex gap-2">
              <Button onClick={() => setShowBulkDeleteConfirm(null)} variant="ghost" className="flex-1 font-black text-[10px] uppercase">Non</Button>
              <Button onClick={handleBulkDelete} className="flex-1 bg-red-500 font-black text-[10px] uppercase text-white">Oui, supprimer</Button>
            </div>
          </div>
        </div>
      )}

      {!editingId && (
        <div className="space-y-3 bg-gray-50 p-4 rounded-2xl border border-gray-100 shadow-sm">
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
              <Search size={18} />
            </div>
            <input
              type="text"
              placeholder="Rechercher un produit..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-12 pl-10 pr-10 bg-white border border-gray-200 rounded-xl text-sm font-medium focus:outline-none focus:border-crousty-purple focus:ring-2 focus:ring-crousty-purple/20 transition-all"
            />
            {searchQuery && (
              <button 
                onClick={() => setSearchQuery('')}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 transition-colors"
              >
                <XCircle size={18} />
              </button>
            )}
          </div>
          
          <div className="flex flex-nowrap items-center gap-2 overflow-x-auto pb-1 scrollbar-hide" style={{ WebkitOverflowScrolling: 'touch' }}>
            <button
              onClick={() => setSelectedFilterCategory('Toutes')}
              className={`px-4 py-2 shrink-0 rounded-full text-xs font-bold transition-all border ${selectedFilterCategory === 'Toutes' ? 'bg-gray-800 text-white border-transparent shadow-md' : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'}`}
            >
              Toutes
            </button>
            {categories.map((c) => {
              const conf = CATEGORIES_CONFIG[c as keyof typeof CATEGORIES_CONFIG];
              const isSelected = selectedFilterCategory === c;
              
              // Count products in this category
              const count = produits.filter(p => p.category === c).length;
              if (count === 0 && selectedFilterCategory !== c) return null; // Hide empty categories unless selected

              return (
                <button
                  key={c}
                  onClick={() => setSelectedFilterCategory(c)}
                  className={`px-4 py-2 shrink-0 rounded-full text-xs font-bold transition-all flex items-center gap-2 border ${isSelected ? 'bg-crousty-purple text-white border-transparent shadow-md' : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'}`}
                >
                  <conf.icone size={14} />
                  <span>{c}</span>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${isSelected ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-500'}`}>
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      <div className="space-y-8">
        {editingId === 'NEW' && (
          <div className="border-2 border-crousty-purple rounded-2xl bg-white p-6 space-y-5 shadow-xl shadow-purple-100 mb-6 animate-in zoom-in-95">
            <h4 className="font-black text-xl text-gray-800">Nouveau produit</h4>
            {renderProductForm()}
            {error && <p className="text-red-500 font-bold text-sm bg-red-50 p-2 rounded-md">{error}</p>}
            <div className="flex gap-3 pt-2">
              <Button variant="outline" className="flex-1 h-12" onClick={() => setEditingId(null)}>Annuler</Button>
              <Button onClick={handleSave} className="flex-1 h-12 bg-crousty-purple text-white font-bold">Créer</Button>
            </div>
          </div>
        )}

        {filteredAndGroupedProducts.sortedCategories.length === 0 && editingId !== 'NEW' && (
          <div className="text-center py-16 bg-gray-50 rounded-[2.5rem] border-2 border-dashed border-gray-200">
            <div className="text-4xl mb-4 opacity-20">{searchQuery ? '🔍' : '📦'}</div>
            <p className="text-gray-400 font-bold">{searchQuery ? 'Aucun produit trouvé selon vos critères.' : 'Le catalogue est vide.'}</p>
            {!searchQuery && <Button onClick={handleCreate} variant="outline" className="mt-4">Ajouter un produit</Button>}
          </div>
        )}

        {filteredAndGroupedProducts.sortedCategories.map(cat => (
          <div key={cat} className="space-y-3 animate-in fade-in duration-500">
            <h4 className="font-black text-gray-400 uppercase tracking-widest text-sm flex items-center gap-2 px-2">
              {(() => {
                const conf = getIconeCategorie(cat);
                const IconCmp = conf.icone;
                return <IconCmp size={16} color={conf.couleur} />;
              })()}
              {cat}
              <span className="text-xs bg-gray-200 text-gray-600 px-2 py-0.5 rounded-full ml-1 font-black">
                {filteredAndGroupedProducts.grouped[cat].length}
              </span>
            </h4>
            
            <div className="grid grid-cols-1 gap-3">
              {filteredAndGroupedProducts.grouped[cat].map((p) => (
                <div 
                  key={p.id} 
                  onClick={() => isSelectionMode && toggleSelection(p.id)}
                  className={cn(
                    "border rounded-2xl bg-white overflow-hidden shadow-sm hover:shadow-md transition-all cursor-pointer",
                    editingId === p.id ? "border-crousty-purple shadow-lg shadow-purple-50" : "border-gray-100",
                    selectedIds.includes(p.id) && "border-amber-400 bg-amber-50/20"
                  )}
                >
                  {editingId === p.id ? (
                    <div className="p-6 bg-gray-50 space-y-5" onClick={e => e.stopPropagation()}>
                      <div className="flex justify-between items-center">
                        <h4 className="font-black text-gray-800">Modifier {p.name}</h4>
                      </div>
                      {renderProductForm()}
                      {error && <p className="text-red-500 font-bold text-sm bg-red-50 p-2 rounded-md">{error}</p>}
                      <div className="flex gap-3 pt-2">
                        <Button variant="outline" className="flex-1 h-12" onClick={() => setEditingId(null)}>Annuler</Button>
                        <Button onClick={handleSave} className="flex-1 h-12 bg-crousty-purple text-white font-bold">Enregistrer</Button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between p-4 px-6">
                      <div className="flex items-center gap-4">
                        {isSelectionMode && (
                          <div className={cn(
                            "w-5 h-5 rounded-lg border-2 shrink-0 flex items-center justify-center transition-colors",
                            selectedIds.includes(p.id) ? "bg-amber-500 border-amber-500" : "border-gray-200 bg-white"
                          )}>
                            {selectedIds.includes(p.id) && <Check size={12} className="text-white" />}
                          </div>
                        )}
                        {(() => {
                          const conf = getIconeCategorie(p.category || "Desserts");
                          const IconCmp = conf.icone;
                          return (
                            <div className="w-12 h-12 rounded-full flex items-center justify-center shrink-0" style={{ backgroundColor: `${conf.couleur}15`, color: conf.couleur }}>
                              <IconCmp size={22} />
                            </div>
                          );
                        })()}
                        <div>
                          <h4 className="font-black text-gray-800 text-lg leading-tight">{p.name}</h4>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest hidden sm:inline">
                              {p.category || 'Desserts'}
                            </span>
                            <span className="w-1 h-1 bg-gray-200 rounded-full hidden sm:inline"></span>
                            <span className="text-xs font-black text-crousty-purple flex items-center gap-1">
                              <Clock size={12} strokeWidth={3} />
                              +{p.dlcValue}{p.dlcUnit === 'hours' ? 'h' : p.dlcUnit === 'days' ? 'j' : p.dlcUnit === 'mois' ? 'm' : ''}
                            </span>
                          </div>
                        </div>
                      </div>
                      {!isSelectionMode && (
                        <div className="flex items-center gap-1">
                          <button onClick={(e) => { e.stopPropagation(); handleEdit(p); }} className="p-2 text-gray-400 hover:text-crousty-purple hover:bg-crousty-purple/10 rounded-xl transition-all">
                            <Edit2 size={20} />
                          </button>
                          <button onClick={(e) => { e.stopPropagation(); setConfirmDelete(p.id); }} className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all">
                            <Trash2 size={20} />
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}

        {confirmDelete && (
          <div className="fixed inset-0 z-[500] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white rounded-3xl p-6 max-w-sm w-full shadow-2xl animate-in zoom-in-95 duration-200">
              <div className="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
                <Trash2 size={32} />
              </div>
              <h3 className="text-xl font-black text-gray-800 text-center mb-2">Supprimer le produit ?</h3>
              <p className="text-gray-500 text-center font-medium mb-6">
                Voulez-vous vraiment supprimer <span className="font-bold text-gray-800">"{produits.find(p => p.id === confirmDelete)?.name}"</span> ?
              </p>
              <div className="flex gap-3">
                <button 
                  onClick={() => setConfirmDelete(null)}
                  className="flex-1 h-12 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-xl font-bold transition-colors"
                >
                  Annuler
                </button>
                <button 
                  onClick={() => handleDelete(confirmDelete)}
                  className="flex-1 h-12 bg-red-500 hover:bg-red-600 text-white rounded-xl font-bold shadow-lg shadow-red-200 transition-colors"
                >
                  Supprimer
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

