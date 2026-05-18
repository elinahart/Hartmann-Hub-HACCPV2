import React, { useState, useMemo, useEffect } from 'react';
import { BookOpen, Edit2, Trash2, Plus, Clock, Search, XCircle, Shield, Check, AlertTriangle, GitMerge, FileArchive, Package, Settings2, ChevronDown } from 'lucide-react';
import { useConfig } from '../../contexts/ConfigContext';
import { Button, Input, Label } from '../ui/LightUI';
import { ProductDef } from '../../types';
import { getIconeCategorie, CATEGORIES_CONFIG } from '../../lib/categoriesIcones';
import { ICONS_MAP, getSmartIcon } from '../../lib/inventoryIcons';
import { useCatalogue } from '../../providers/CatalogueProvider';
import { useAuth } from '../../contexts/AuthContext';
import { cn } from '../../lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import { ManualFusionModal } from './ManualFusionModal';

const normalizeName = (name: string) => {
  return (name || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
};

const levenshtein = (a: string, b: string) => {
  const matrix = Array.from({ length: a.length + 1 }, () => new Array(b.length + 1).fill(0));
  for (let i = 0; i <= a.length; i++) matrix[i][0] = i;
  for (let j = 0; j <= b.length; j++) matrix[0][j] = j;
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      if (a[i - 1] === b[j - 1]) matrix[i][j] = matrix[i - 1][j - 1];
      else matrix[i][j] = Math.min(matrix[i - 1][j - 1] + 1, matrix[i][j - 1] + 1, matrix[i - 1][j] + 1);
    }
  }
  return matrix[a.length][b.length];
};

const tokenize = (name: string) => {
  return normalizeName(name)
    .split(/[\s\-:\/,()]+/)
    .filter(w => w.length > 2 || w === "riz" || w === "sel" || w === "ail" || w === "jus"); // keep short meaningful words
};

const getDuplicateType = (p1: ProductDef, p2: ProductDef): 'strong' | 'near' | null => {
  const n1 = normalizeName(p1.name);
  const n2 = normalizeName(p2.name);
  if (n1 === n2) return 'strong';

  const t1 = tokenize(p1.name);
  const t2 = tokenize(p2.name);

  if (p1.category === p2.category) {
    if (n1.length > 3 && n2.length > 3 && levenshtein(n1, n2) <= 2) return 'strong';
  }

  // Same category but one name "wraps" another, or they share a primary word
  if (p1.category === p2.category) {
    if (t1.length > 0 && t2.length > 0) {
      if (t1[0] === t2[0] && t1[0].length > 2) return 'near'; // e.g. "Sauce algérienne" vs "Sauce tomate" => near
    }
    // "Ail" vs "Ail semoule"
    if (t1.length === 1 && t2.includes(t1[0])) return 'near';
    if (t2.length === 1 && t1.includes(t2[0])) return 'near';
  }

  return null;
};

export const ProduitsTab = () => {
  const { config } = useConfig();
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
  const [category, setCategory] = useState('Sec alimentaire');
  const [dlcNeeded, setDlcNeeded] = useState(false);
  const [dlcValue, setDlcValue] = useState<number>(24);
  const [dlcUnit, setDlcUnit] = useState('hours');
  const [conservation, setConservation] = useState('');
  const [note, setNote] = useState('');
  const [icon, setIcon] = useState('Package');
  const [uniteStock, setUniteStock] = useState('unité');
  const [uniteAchat, setUniteAchat] = useState('carton');
  const [conversionCartonUnite, setConversionCartonUnite] = useState<number | string>(1);
  const [minThreshold, setMinThreshold] = useState<number | string>(0);
  const [fournisseur, setFournisseur] = useState('');
  const [error, setError] = useState<string | null>(null);

  // Doublons (Fusion)
  const [ignoredDuplicates, setIgnoredDuplicates] = useState<string[]>([]);
  
  useEffect(() => {
    try {
      const stored = localStorage.getItem('crousty_ignored_duplicates');
      if (stored) setIgnoredDuplicates(JSON.parse(stored));
    } catch {}
  }, []);

  const saveIgnored = (list: string[]) => {
    setIgnoredDuplicates(list);
    localStorage.setItem('crousty_ignored_duplicates', JSON.stringify(list));
  };

  const duplicateGroups = useMemo(() => {
    const groups: { type: 'strong' | 'near', items: ProductDef[] }[] = [];
    const handled = new Set<string>();

    for (let i = 0; i < produits.length; i++) {
      if (handled.has(produits[i].id)) continue;
      const p1 = produits[i];
      
      const currentGroup = [p1];
      let groupType: 'strong' | 'near' | null = null;

      for (let j = i + 1; j < produits.length; j++) {
        if (handled.has(produits[j].id)) continue;
        const p2 = produits[j];
        
        // Ignore pairs that are in excluded lists
        const pairKey = [p1.id, p2.id].sort().join('_');
        if (ignoredDuplicates.includes(pairKey)) continue;

        const dtype = getDuplicateType(p1, p2);
        if (dtype) {
          currentGroup.push(p2);
          handled.add(p2.id);
          // If any is near, the whole group is near, unless it's strictly strong
          if (!groupType) groupType = dtype;
          else if (dtype === 'near') groupType = 'near';
        }
      }
      
      if (currentGroup.length > 1 && groupType) {
        groups.push({ type: groupType, items: currentGroup });
      }
      handled.add(p1.id);
    }
    return groups;
  }, [produits, ignoredDuplicates]);

  const [showFusionModal, setShowFusionModal] = useState(false);
  const [currentFusionGroupIndex, setCurrentFusionGroupIndex] = useState(0);

  const [showManualFusionModal, setShowManualFusionModal] = useState(false);

  const handleEdit = (p: ProductDef) => {
    setEditingId(p.id);
    setName(p.name || '');
    setCategory(p.category || 'Sec alimentaire');
    
    // Déduction auto de test: 
    const isSec = p.category === 'Sec';
    setDlcNeeded(p.dlcNeeded !== undefined ? p.dlcNeeded : !isSec);
    
    setDlcValue(p.dlcValue || 24);
    setDlcUnit(p.dlcUnit || 'hours');
    setConservation(p.conservation || '');
    setNote(p.note || '');
    setIcon(p.icon || 'Package');
    setUniteStock(p.uniteStock || 'unité');
    setUniteAchat(p.uniteAchat || 'carton');
    setConversionCartonUnite(p.conversionCartonUnite || 1);
    setMinThreshold(p.minThreshold || 0);
    setFournisseur(p.fournisseur || '');
    setError(null);
  };

  const handleCategoryChange = (val: string) => {
    setCategory(val);
    if (val === 'Sec') {
       if (dlcNeeded) setDlcNeeded(false);
    } else {
       if (!dlcNeeded) setDlcNeeded(true);
    }
  };

  const handleCreate = () => {
    setEditingId('NEW');
    setName('');
    setCategory(selectedFilterCategory !== 'Toutes' ? selectedFilterCategory : 'Sec alimentaire');
    setDlcNeeded(selectedFilterCategory !== 'Sec');
    setDlcValue(24);
    setDlcUnit('hours');
    setConservation('');
    setNote('');
    setIcon('Package');
    setUniteStock('unité');
    setUniteAchat('carton');
    setConversionCartonUnite(1);
    setMinThreshold(0);
    setFournisseur('');
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
      dlcNeeded,
      dlcValue: Number(dlcValue),
      dlcUnit: dlcUnit as any,
      conservation,
      note,
      icon,
      uniteStock,
      uniteAchat,
      conversionCartonUnite: Number(conversionCartonUnite),
      minThreshold: Number(minThreshold),
      fournisseur
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

  const executeFusion = (groupObj: { type: 'strong'|'near', items: ProductDef[] }, keepId: string) => {
    const group = groupObj.items;
    const keepProd = group.find(p => p.id === keepId)!;
    const deleteIds = group.filter(p => p.id !== keepId).map(p => p.id);
    
    // Create highly merged product taking best fields from discarded to kept
    const newProd = { ...keepProd };
    group.forEach(d => {
       if (d.id === keepId) return;
       // Enrich with missing data points simply...
       if (!newProd.icon || newProd.icon === 'Package') newProd.icon = d.icon || newProd.icon;
       if (!newProd.fournisseur) newProd.fournisseur = d.fournisseur;
       if (newProd.minThreshold === 0 && d.minThreshold && d.minThreshold > 0) newProd.minThreshold = d.minThreshold;
       // We keep DLC preference of main
    });

    const newProduits = produits.filter(p => !deleteIds.includes(p.id)).map(p => p.id === keepId ? newProd : p);
    setProduits(newProduits);
    
    // Since array shrinks on update, always use 0 or check if empty
    setCurrentFusionGroupIndex(0);
    if (duplicateGroups.length <= 1) {
      setShowFusionModal(false);
    }
  };

  const ignoreFusion = (groupObj: { type: 'strong'|'near', items: ProductDef[] }) => {
    const group = groupObj.items;
    // Save all pairwise combinations in this group to ignored
    const newIgnores = [...ignoredDuplicates];
    for (let i = 0; i < group.length; i++) {
       for (let j = i + 1; j < group.length; j++) {
         newIgnores.push([group[i].id, group[j].id].sort().join('_'));
       }
    }
    saveIgnored(newIgnores);

    setCurrentFusionGroupIndex(0);
    if (duplicateGroups.length <= 1) {
      setShowFusionModal(false);
    }
  };

  const categories = Object.keys(CATEGORIES_CONFIG);

  const filteredAndGroupedProducts = useMemo(() => {
    let filtered = produits.filter(p => {
      const matchSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase());
      const matchCat = selectedFilterCategory === 'Toutes' || p.category === selectedFilterCategory;
      return matchSearch && matchCat;
    });

    const visibleIds = filtered.map(p => p.id);

    const grouped = filtered.reduce((acc, current) => {
      const cat = current.category || 'Non catégorisé';
      if (!acc[cat]) acc[cat] = [];
      acc[cat].push(current);
      return acc;
    }, {} as Record<string, ProductDef[]>);

    const sortedCategories = Object.keys(grouped).sort();

    sortedCategories.forEach(c => {
      grouped[c].sort((a, b) => (a.name || '').localeCompare(b.name || ''));
    });

    return { grouped, sortedCategories, visibleIds };
  }, [produits, searchQuery, selectedFilterCategory]);

  const renderProductForm = () => (
    <div className="space-y-8 mt-2">
      {/* Information Principale */}
      <div className="space-y-6">
         <div>
           <Label className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 block">Nom du produit</Label>
           <Input 
             data-native="true"
             value={name} 
             onChange={(e: any) => {
                 setName(e.target.value);
                 if (icon === 'Package') setIcon(getSmartIcon(e.target.value, category));
             }} 
             placeholder="Ex: Tiramisu" 
             className="h-14 font-black text-xl bg-gray-50/50 border-gray-200 focus:bg-white rounded-2xl shadow-sm" 
           />
         </div>

         <div>
           <Label className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3 block">Catégorie</Label>
           <div className="flex flex-wrap gap-2">
             {categories.filter(c => c !== 'Non catégorisé').map((c) => {
               const isSelected = category === c;
               return (
                 <button
                   key={c}
                   type="button"
                   onClick={() => handleCategoryChange(c)}
                   className={`px-4 py-2.5 font-bold text-sm rounded-full transition-all border ${isSelected ? 'bg-gray-900 text-white border-gray-900 shadow-md' : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300 hover:bg-gray-50'}`}
                 >
                   {c}
                 </button>
               );
             })}
           </div>
         </div>
      </div>

      {/* Stock & Unités */}
      <div className="pt-6 border-t border-gray-100 space-y-5">
         <h4 className="text-sm font-black text-gray-900 flex items-center gap-2 tracking-tight">
           <Package size={18} className="text-gray-400"/> Gestion du stock
         </h4>
         
         <div className="grid grid-cols-2 gap-4">
             <div>
                <Label className="text-[11px] text-gray-500 mb-1.5 block font-bold uppercase tracking-wider">Unité de stock (kg...)</Label>
                <Input data-native="true" value={uniteStock} onChange={(e: any) => setUniteStock(e.target.value)} className="h-12 bg-white border-gray-200 text-sm font-bold shadow-sm" />
             </div>
             <div>
                <Label className="text-[11px] text-gray-500 mb-1.5 block font-bold uppercase tracking-wider">Seuil d'alerte</Label>
                <Input data-native="true" type="number" inputMode="numeric" value={minThreshold} onChange={(e: any) => setMinThreshold(e.target.value)} className="h-12 bg-white border-gray-200 text-sm font-bold shadow-sm" />
             </div>
         </div>

         <div className="bg-blue-50/40 p-5 rounded-2xl border border-blue-100/50 flex flex-col gap-4">
            <Label className="text-xs text-blue-900 font-black block tracking-tight">Conversion Achat ➔ Stock</Label>
            <div className="grid grid-cols-[1fr_auto_1fr] gap-3 items-end">
                <div>
                  <Label className="text-[10px] text-blue-600 font-bold mb-1.5 block uppercase tracking-wider">Achat (Carton...)</Label>
                  <Input data-native="true" value={uniteAchat} onChange={(e: any) => setUniteAchat(e.target.value)} className="h-11 text-sm font-bold bg-white border-white shadow-sm focus:border-blue-300 focus:ring-blue-100 placeholder-blue-200" placeholder="Carton" />
                </div>
                <div className="flex items-center justify-center text-blue-300 font-black h-11 w-8 pb-1">
                  ➔
                </div>
                <div>
                  <Label className="text-[10px] text-blue-600 font-bold mb-1.5 block uppercase tracking-wider">Fait X {uniteStock || 'unité(s)'}</Label>
                  <Input data-native="true" type="number" inputMode="decimal" step="any" value={conversionCartonUnite} onChange={(e: any) => setConversionCartonUnite(e.target.value)} className="h-11 text-sm font-bold bg-white border-white shadow-sm focus:border-blue-300 focus:ring-blue-100" />
                </div>
            </div>
         </div>
      </div>

      {/* Paramètres Avancés (Collapsible) */}
      <details className="group pt-4 border-t border-gray-100">
         <summary className="cursor-pointer list-none flex items-center justify-between text-sm font-bold text-gray-500 hover:text-gray-900 transition-colors py-2 outline-none">
            <div className="flex items-center gap-2"><Settings2 size={16}/> Paramètres complémentaires (DLC, Icône...)</div>
            <ChevronDown size={18} className="transition-transform group-open:rotate-180" />
         </summary>
         <div className="pt-6 space-y-8 animate-in fade-in slide-in-from-top-2 duration-200">
            
            {/* DLC */}
            <div className="space-y-4">
               <div className="flex items-center justify-between">
                  <Label className="text-xs font-bold text-gray-700 uppercase tracking-wider !mb-0">Norme DLC / Péremption</Label>
                  <button 
                    type="button"
                    onClick={() => { if (category !== 'Sec') setDlcNeeded(!dlcNeeded); }} 
                    className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center justify-center rounded-full transition-colors duration-200 ease-in-out focus:outline-none ${dlcNeeded ? 'bg-crousty-purple' : 'bg-gray-200'} ${category === 'Sec' ? 'opacity-50 cursor-not-allowed' : ''}`}>
                     <span className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${dlcNeeded ? 'translate-x-2.5' : '-translate-x-2.5'}`} />
                  </button>
               </div>
               
               {category === 'Sec' && <p className="text-[11px] text-red-500 font-bold mb-2">Désactivé : L'étiquetage DLC n'est pas applicable au "Sec".</p>}
               
               {dlcNeeded && (
                  <div className="grid grid-cols-2 gap-4 bg-gray-50/70 p-5 rounded-2xl border border-gray-100 shadow-inner">
                     <div>
                       <Label className="text-[11px] text-gray-500 block mb-1.5 font-bold uppercase tracking-wider">Durée</Label>
                       <Input data-native="true" type="number" inputMode="numeric" value={dlcValue} onChange={(e: any) => setDlcValue(Number(e.target.value))} className="h-11 text-sm font-bold bg-white" />
                     </div>
                     <div>
                       <Label className="text-[11px] text-gray-500 block mb-1.5 font-bold uppercase tracking-wider">Unité</Label>
                       <div className="relative">
                         <select
                           value={dlcUnit}
                           onChange={e => setDlcUnit(e.target.value)}
                           className="w-full h-11 bg-white border border-gray-200 rounded-full px-4 text-sm font-bold focus:border-crousty-purple focus:ring-2 focus:ring-crousty-purple/20 outline-none appearance-none"
                         >
                           <option value="hours">Heures</option>
                           <option value="days">Jours</option>
                           <option value="mois">Mois</option>
                         </select>
                         <ChevronDown size={14} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                       </div>
                     </div>
                     <div className="col-span-2 grid grid-cols-2 gap-4 pt-2">
                        <div>
                          <Label className="text-[10px] text-gray-500 block mb-1.5 font-bold uppercase tracking-wider">Conservation (+4°C)</Label>
                          <Input data-native="true" value={conservation} onChange={(e: any) => setConservation(e.target.value)} className="h-11 text-xs bg-white" />
                        </div>
                        <div>
                          <Label className="text-[10px] text-gray-500 block mb-1.5 font-bold uppercase tracking-wider">Consignes (Ouv...)</Label>
                          <Input data-native="true" value={note} onChange={(e: any) => setNote(e.target.value)} className="h-11 text-xs bg-white" />
                        </div>
                     </div>
                  </div>
               )}
            </div>

            {/* Fournisseur */}
            <div>
               <Label className="text-xs text-gray-700 font-bold uppercase tracking-wider mb-2 block">Fournisseur</Label>
               <Input data-native="true" value={fournisseur} onChange={(e: any) => setFournisseur(e.target.value)} placeholder="Ex: Transgourmet" className="h-11 bg-white text-sm" />
            </div>

            {/* Icône */}
            <div className="space-y-3">
               <Label className="text-xs font-bold text-gray-700 uppercase tracking-wider block">Icône personnalisée</Label>
               <details className="group/icon">
                 <summary className="cursor-pointer list-none flex items-center justify-between p-3 rounded-2xl border border-gray-200 bg-white hover:border-gray-300 outline-none">
                    <div className="flex items-center gap-3">
                       <div className="w-10 h-10 rounded-xl bg-gray-50 flex items-center justify-center text-gray-700 border border-gray-100">
                         {React.createElement(ICONS_MAP[icon] || Package, { size: 20 })}
                       </div>
                       <span className="text-sm font-bold text-gray-700">Changer l'icône</span>
                    </div>
                    <ChevronDown size={18} className="text-gray-400 group-open/icon:rotate-180 transition-transform" />
                 </summary>
                 <div className="flex flex-wrap gap-2 max-h-40 overflow-y-auto w-full p-3 mt-2 bg-gray-50 rounded-2xl border border-gray-200 shadow-inner">
                    {Object.entries(ICONS_MAP).map(([name, Cmp]) => (
                      <button
                        key={name}
                        onClick={() => setIcon(name)}
                        type="button"
                        className={`p-2.5 rounded-xl flex items-center justify-center transition-all ${icon === name ? 'bg-gray-900 border-gray-900 text-white shadow-md' : 'bg-white text-gray-400 border-gray-200 hover:bg-gray-100 hover:text-gray-600 border'}`}
                      >
                        <Cmp size={20} />
                      </button>
                    ))}
                 </div>
               </details>
            </div>

         </div>
      </details>
    </div>
  );

  return (
    <div className="space-y-6 max-w-4xl pb-24 mx-auto animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <h3 className="text-2xl font-black text-gray-800 tracking-tight">Catalogue Produits ({produits.length})</h3>
        
        {duplicateGroups.length > 0 && (
           <Button onClick={() => setShowFusionModal(true)} className="bg-amber-100 text-amber-800 border border-amber-200 hover:bg-amber-200 shadow-sm relative pr-10 hover:shadow-md transition-all">
             {duplicateGroups.length} doublons suspects détectés
             <div className="absolute right-2 top-1/2 -translate-y-1/2 bg-amber-500 text-white w-6 h-6 rounded-full flex justify-center items-center font-black text-[10px]">!</div>
           </Button>
        )}
      </div>

      {!editingId && (
        <button 
          onClick={handleCreate} 
          className="fixed bottom-6 right-6 md:bottom-12 md:right-12 w-16 h-16 bg-crousty-purple text-white rounded-full flex items-center justify-center shadow-2xl hover:scale-105 active:scale-95 transition-all z-[300]"
        >
          <Plus size={32} strokeWidth={2.5} />
        </button>
      )}

      {isManager && produits.length > 0 && !editingId && (
        <div className="bg-emerald-50 border border-emerald-100 p-3 sm:p-4 rounded-3xl space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-emerald-900 font-bold text-[10px] sm:text-xs uppercase tracking-widest">
              <Shield size={14} className="text-emerald-500" /> Actions rapides
            </div>
            <div className="flex gap-2">
              <Button 
                onClick={() => {
                  setIsSelectionMode(!isSelectionMode);
                  if (isSelectionMode) setSelectedIds([]);
                }}
                className={cn(
                  "h-8 px-4 rounded-xl text-xs font-bold transition-all",
                  isSelectionMode ? "bg-emerald-200 text-emerald-900" : "bg-white text-gray-600 border border-emerald-200 hover:bg-emerald-100"
                )}
              >
                {isSelectionMode ? 'Terminer' : 'Activer sélection'}
              </Button>
            </div>
          </div>

          {isSelectionMode && (
            <div className="flex items-center justify-between p-3 bg-white rounded-2xl border border-emerald-200 animate-in zoom-in-95 duration-200">
              <div className="flex items-center gap-3">
                <button 
                  onClick={() => handleSelectAll(filteredAndGroupedProducts.visibleIds)}
                  className="w-5 h-5 rounded border-2 border-emerald-400 flex items-center justify-center transition-colors"
                >
                  {selectedIds.length > 0 && selectedIds.length >= filteredAndGroupedProducts.visibleIds.length && <Check size={14} className="text-emerald-500 font-black" />}
                </button>
                <span className="text-xs font-black text-emerald-900">{selectedIds.length} sélectionné(s)</span>
              </div>
              <div className="flex gap-2">
                {selectedIds.length >= 2 && (
                  <Button 
                    onClick={() => setShowManualFusionModal(true)}
                    className="h-8 px-4 bg-crousty-purple text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-md"
                  >
                    Fusionner
                  </Button>
                )}
                <Button 
                  disabled={selectedIds.length === 0}
                  onClick={() => setShowBulkDeleteConfirm('selected')}
                  className="h-8 px-4 bg-red-500 text-white rounded-xl text-[10px] font-black uppercase tracking-widest"
                >
                  Supprimer
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* MODAL FUSION MANUELLE */}
      <ManualFusionModal 
        isOpen={showManualFusionModal}
        onClose={() => setShowManualFusionModal(false)}
        selectedProducts={produits.filter(p => selectedIds.includes(p.id))}
        onFusionComplete={(newMaster, deletedIds) => {
          const newProduits = produits.filter(p => !deletedIds.includes(p.id)).map(p => p.id === newMaster.id ? newMaster : p);
          setProduits(newProduits);
          setShowManualFusionModal(false);
          setSelectedIds([]);
          setIsSelectionMode(false);
        }}
      />

      {/* MODAL FUSION */}
      <AnimatePresence>
         {showFusionModal && duplicateGroups.length > 0 && (
           <motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} className="fixed inset-0 bg-black/80 backdrop-blur-md z-[2000] flex items-center justify-center p-4">
              {(() => {
                 const currentGroup = duplicateGroups[currentFusionGroupIndex] || duplicateGroups[0];
                 if (!currentGroup) return null;
                 return (
              <motion.div initial={{y:50, opacity:0}} animate={{y:0, opacity:1}} exit={{y:20, opacity:0}} className="bg-white rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col max-h-[90dvh]">
                 <div className={`p-6 border-b border-white/20 text-white shadow-inner flex-shrink-0 ${currentGroup.type === 'strong' ? 'bg-gradient-to-r from-red-500 to-red-600' : 'bg-gradient-to-r from-amber-500 to-amber-600'}`}>
                    <div className="flex justify-between items-center">
                       <h3 className="font-black text-xl flex items-center gap-2">
                         <GitMerge size={24} className="opacity-80" /> 
                         {currentGroup.type === 'strong' ? 'Doublons Confirmés' : 'Produits Proches À Vérifier'}
                       </h3>
                       <div className="text-sm font-bold bg-black/20 px-3 py-1 rounded-full backdrop-blur-sm shadow-sm ring-1 ring-white/10">
                         {Math.min(currentFusionGroupIndex + 1, duplicateGroups.length)} / {duplicateGroups.length}
                       </div>
                    </div>
                    <p className="text-white/80 text-sm mt-2 font-medium">
                      {currentGroup.type === 'strong' 
                        ? 'Ces produits sont presques identiques (faute de frappe, casse). Lequel souhaitez-vous conserver ?'
                        : 'Ces produits ont des noms très proches. S\'agit-il de doublons ou de variantes ?'
                      }
                    </p>
                 </div>
                 <div className="p-6 space-y-4 overflow-y-auto flex-1 bg-gray-50/50">
                    {currentGroup.items.map(p => {
                       const conf = CATEGORIES_CONFIG[p.category as keyof typeof CATEGORIES_CONFIG] || CATEGORIES_CONFIG["Non catégorisé"];
                       const IconCmp = ICONS_MAP[p.icon || 'Package'] || FileArchive;
                       return (
                         <div key={p.id} className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center p-4 rounded-2xl border border-gray-200 hover:border-crousty-purple bg-white hover:shadow-md transition-all">
                           <div className="flex items-center gap-3 min-w-0">
                              <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-gray-50 border border-gray-100 shrink-0 shadow-sm" style={{ color: conf.couleur }}>
                                <IconCmp size={24} />
                              </div>
                              <div className="min-w-0">
                                <h4 className="font-black text-lg text-gray-900 truncate">{p.name}</h4>
                                <div className="flex items-center gap-2 mt-1 text-xs font-bold text-gray-500 truncate">
                                  <span className="shrink-0">{p.category}</span>
                                  {p.fournisseur && <><span className="text-gray-300">•</span><span className="text-blue-500 truncate">{p.fournisseur}</span></>}
                                  <span className="text-gray-300">•</span>
                                  <span className="shrink-0">Stock: {p.uniteStock}</span>
                                </div>
                              </div>
                           </div>
                           <Button onClick={() => executeFusion(currentGroup, p.id)} className="w-full sm:w-auto shrink-0 bg-gray-900 text-white font-bold hover:bg-black transition-colors rounded-xl px-4 py-2 text-sm shadow-md ring-1 ring-gray-900/5 hover:ring-gray-900/10">
                             Conserver
                           </Button>
                         </div>
                       );
                    })}
                 </div>
                 <div className="p-5 sm:p-6 bg-white border-t border-gray-100 flex flex-col sm:flex-row justify-between gap-3 flex-shrink-0">
                    <Button onClick={() => setShowFusionModal(false)} variant="outline" className="font-bold border-gray-200">Plus tard</Button>
                    <Button onClick={() => ignoreFusion(currentGroup)} variant="secondary" className="bg-gray-100 text-gray-700 hover:bg-red-50 hover:text-red-600 font-bold border border-transparent hover:border-red-200 transition-colors">
                      {currentGroup.type === 'near' ? 'Ce sont des produits différents' : 'Ignorer ce doublon'}
                    </Button>
                 </div>
              </motion.div>
                 );
              })()}
           </motion.div>
         )}
      </AnimatePresence>

      {!editingId && (
        <div className="space-y-3 p-4 sm:p-5 rounded-[2rem] border border-gray-100 shadow-sm bg-white ring-1 ring-gray-900/5">
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-gray-400">
              <Search size={18} />
            </div>
            <input
              type="text"
              placeholder="Rechercher par nom..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-12 sm:h-14 pl-12 pr-12 bg-gray-50 border-none rounded-2xl text-sm font-bold focus:outline-none focus:ring-2 focus:ring-crousty-purple/30 transition-all text-gray-700"
            />
            {searchQuery && (
              <button 
                onClick={() => setSearchQuery('')}
                className="absolute inset-y-0 right-0 pr-4 flex items-center text-gray-400 hover:text-gray-600 transition-colors"
              >
                <XCircle size={18} />
              </button>
            )}
          </div>
          
          <div className="flex flex-nowrap items-center gap-2 overflow-x-auto pb-2 scrollbar-none" style={{ WebkitOverflowScrolling: 'touch' }}>
            <button
              onClick={() => setSelectedFilterCategory('Toutes')}
              className={`px-5 py-2.5 shrink-0 rounded-full text-xs font-bold transition-all ${selectedFilterCategory === 'Toutes' ? 'bg-gray-900 text-white shadow-md' : 'bg-gray-50 text-gray-600 hover:bg-gray-100'}`}
            >
              Toutes
            </button>
            {categories.map((c) => {
              const count = produits.filter(p => p.category === c).length;
              if (count === 0 && selectedFilterCategory !== c) return null;
              
              const conf = CATEGORIES_CONFIG[c as keyof typeof CATEGORIES_CONFIG];
              const isSelected = selectedFilterCategory === c;
              
              return (
                <button
                  key={c}
                  onClick={() => setSelectedFilterCategory(c)}
                  className={`px-4 py-2 shrink-0 rounded-full text-xs font-bold transition-all flex items-center gap-2 ${isSelected ? 'bg-crousty-purple text-white shadow-md' : 'bg-gray-50 text-gray-600 hover:bg-gray-100'}`}
                >
                  <conf.icone size={14} />
                  <span>{c}</span>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full ${isSelected ? 'bg-white/20' : 'bg-gray-200 text-gray-500'}`}>
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
          <div className="border border-purple-200 rounded-[2rem] bg-white p-6 sm:p-8 space-y-6 shadow-2xl shadow-purple-100/50 mb-6 animate-in slide-in-from-bottom-8">
            <h4 className="font-black text-2xl text-gray-900 tracking-tight">Nouveau produit</h4>
            {renderProductForm()}
            {error && <p className="text-red-500 font-bold text-sm bg-red-50 p-3 rounded-xl flex items-center gap-2"><AlertTriangle size={18}/> {error}</p>}
            <div className="flex flex-col-reverse sm:flex-row gap-3 pt-6 border-t border-gray-100 mt-6">
              <Button variant="ghost" className="flex-1 h-14 text-gray-500 font-bold hover:bg-gray-100 hover:text-gray-900 rounded-xl transition-colors" onClick={() => setEditingId(null)}>Annuler</Button>
              <Button onClick={handleSave} className="flex-[2] h-14 bg-gray-900 text-white font-black rounded-xl shadow-md hover:bg-black transition-all text-base">Enregistrer le produit</Button>
            </div>
          </div>
        )}

        {filteredAndGroupedProducts.sortedCategories.length === 0 && editingId !== 'NEW' && (
          <div className="text-center py-20 px-4 bg-white/50 backdrop-blur-sm rounded-[3rem] border-2 border-dashed border-gray-200">
            <div className="w-20 h-20 bg-gray-100 text-gray-300 rounded-full flex items-center justify-center mx-auto mb-6">
              <BookOpen size={32} />
            </div>
            <p className="text-gray-900 font-black text-xl mb-2">{searchQuery ? 'Aucun produit trouvé' : 'Le catalogue est vide'}</p>
            <p className="text-gray-500 font-medium max-w-sm mx-auto">
              {!searchQuery ? 'Commencez à construire votre base de produits en ajoutant votre premier article.' : 'Modifiez vos critères de recherche.'}
            </p>
            {!searchQuery && <Button onClick={handleCreate} className="mt-6 bg-gray-900 text-white rounded-full px-8 py-3 font-bold hover:bg-black transition-colors">Ajouter un article</Button>}
          </div>
        )}

        {filteredAndGroupedProducts.sortedCategories.map(cat => (
          <div key={cat} className="space-y-4 animate-in fade-in duration-500">
            <h4 className="font-black text-gray-400 uppercase tracking-widest text-xs flex items-center gap-2 px-2">
              {(() => {
                const conf = getIconeCategorie(cat);
                const IconCmp = conf.icone;
                return <IconCmp size={16} color={conf.couleur} />;
              })()}
              {cat}
              <span className="text-[10px] bg-gray-200 text-gray-600 px-2 py-0.5 rounded-full ml-1 font-black">
                {filteredAndGroupedProducts.grouped[cat].length}
              </span>
            </h4>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredAndGroupedProducts.grouped[cat].map((p) => (
                <div 
                  key={p.id} 
                  onClick={() => isSelectionMode && toggleSelection(p.id)}
                  className={cn(
                    "border rounded-[1.5rem] bg-white shadow-sm hover:shadow-lg transition-all overflow-hidden",
                    editingId === p.id ? "border-crousty-purple ring-4 ring-purple-50 col-span-1 md:col-span-2 shadow-xl z-10" : "border-gray-100",
                    selectedIds.includes(p.id) && "border-emerald-400 bg-emerald-50/20 ring-2 ring-emerald-100",
                    !isSelectionMode && editingId !== p.id && "cursor-pointer"
                  )}
                >
                  {editingId === p.id ? (
                    <div className="p-6 sm:p-8 bg-gray-50/30 space-y-6" onClick={e => e.stopPropagation()}>
                      <div className="flex justify-between items-center border-b border-gray-100 pb-4">
                        <h4 className="font-black text-2xl text-gray-900">Modifier <span className="text-crousty-purple">{p.name}</span></h4>
                      </div>
                      {renderProductForm()}
                      {error && <p className="text-red-500 font-bold text-sm bg-red-50 p-3 rounded-xl flex items-center gap-2"><AlertTriangle size={18} /> {error}</p>}
                      <div className="flex flex-col-reverse sm:flex-row gap-3 pt-6 border-t border-gray-100 mt-6">
                        <Button variant="ghost" className="flex-1 h-14 text-gray-500 font-bold hover:bg-gray-100 hover:text-gray-900 rounded-xl transition-colors" onClick={() => setEditingId(null)}>Annuler</Button>
                        <Button onClick={handleSave} className="flex-[2] h-14 bg-gray-900 text-white font-black rounded-xl shadow-md hover:bg-black transition-all text-base">Enregistrer les modifications</Button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between p-4 px-5">
                      <div className="flex items-center gap-4 flex-1 min-w-0">
                        {isSelectionMode && (
                          <div className={cn(
                            "w-5 h-5 rounded-lg border-2 shrink-0 flex items-center justify-center transition-colors",
                            selectedIds.includes(p.id) ? "bg-emerald-500 border-emerald-500" : "border-gray-200 bg-white"
                          )}>
                            {selectedIds.includes(p.id) && <Check size={12} className="text-white" />}
                          </div>
                        )}
                        {(() => {
                           // Use actual product icon
                           const IconComp = ICONS_MAP[p.icon || 'Package'] || FileArchive;
                           const catConf = getIconeCategorie(p.category || 'Sec alimentaire');
                           return (
                             <div className="w-12 h-12 rounded-[1rem] flex items-center justify-center shrink-0 border bg-white" style={{ borderColor: `${catConf.couleur}40`, color: catConf.couleur }}>
                               <IconComp size={22} strokeWidth={2} />
                             </div>
                           );
                        })()}
                        <div className="min-w-0 flex-1">
                          <h4 className="font-black text-gray-900 text-base leading-tight truncate">{p.name}</h4>
                          <div className="flex items-center gap-2 mt-1 whitespace-nowrap overflow-hidden text-ellipsis">
                            {p.dlcNeeded && (
                              <>
                                <span className="text-[10px] font-black text-crousty-purple flex items-center gap-1 bg-purple-50 px-2 py-0.5 rounded-full shrink-0">
                                  <Clock size={10} strokeWidth={3} />
                                  DLC
                                </span>
                              </>
                            )}
                            <span className="text-[10px] font-bold text-gray-500 truncate">
                              Stock: {p.uniteStock}
                            </span>
                            {p.fournisseur && (
                              <span className="text-[10px] font-bold text-blue-500 truncate bg-blue-50 px-2 py-0.5 rounded-full shrink-0">
                                {p.fournisseur}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      {!isSelectionMode && (
                        <div className="flex items-center gap-1 shrink-0 ml-3">
                          <button onClick={(e) => { e.stopPropagation(); handleEdit(p); }} className="p-2 text-gray-400 hover:text-crousty-purple hover:bg-crousty-purple/10 rounded-xl transition-all border border-transparent hover:border-purple-100">
                            <Edit2 size={18} />
                          </button>
                          <button onClick={(e) => { e.stopPropagation(); setConfirmDelete(p.id); }} className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all border border-transparent hover:border-red-100">
                            <Trash2 size={18} />
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

        {showBulkDeleteConfirm && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-[2000] flex items-center justify-center p-4">
          <div className="bg-white rounded-[2.5rem] p-8 max-w-sm w-full shadow-2xl space-y-6 animate-in zoom-in-95 duration-300">
            <div className="text-center space-y-2">
              <div className="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
                <AlertTriangle size={32} />
              </div>
              <h3 className="text-2xl font-black text-gray-900 leading-tight">Confirmation</h3>
              <p className="text-gray-500 font-medium">
                {showBulkDeleteConfirm === 'all' 
                  ? "Voulez-vous vraiment vider tout le catalogue ?"
                  : `Supprimer les ${selectedIds.length} produits sélectionnés ?`}
              </p>
            </div>
            <div className="flex gap-3">
              <Button onClick={() => setShowBulkDeleteConfirm(null)} variant="outline" className="flex-1 h-12 font-bold rounded-2xl">Non</Button>
              <Button onClick={handleBulkDelete} className="flex-1 h-12 bg-red-500 font-black text-white hover:bg-red-600 rounded-2xl shadow-lg shadow-red-200">Oui, supprimer</Button>
            </div>
          </div>
        </div>
      )}

        {confirmDelete && (
          <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-in fade-in duration-200">
            <div className="bg-white rounded-[2.5rem] p-8 max-w-sm w-full shadow-2xl animate-in zoom-in-95 duration-200">
              <div className="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
                <Trash2 size={32} />
              </div>
              <h3 className="text-xl font-black text-gray-900 text-center mb-2">Supprimer le produit ?</h3>
              <p className="text-gray-500 text-center font-medium mb-6 leading-relaxed">
                Voulez-vous vraiment supprimer <span className="font-bold text-gray-900 block mt-1 text-lg">"{produits.find(p => p.id === confirmDelete)?.name}"</span>
              </p>
              <div className="flex gap-3">
                <button 
                  onClick={() => setConfirmDelete(null)}
                  className="flex-1 h-12 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-2xl font-bold transition-colors"
                >
                  Annuler
                </button>
                <button 
                  onClick={() => handleDelete(confirmDelete)}
                  className="flex-1 h-12 bg-red-500 hover:bg-red-600 text-white rounded-2xl font-black shadow-lg shadow-red-200 transition-colors"
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
