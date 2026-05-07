import React, { useState, useEffect } from 'react';
import { Trash2, Check, X, Plus, Edit2, Download, Upload, Package, Box, Droplets, CupSoda, Beef, Leaf, Flame, Snowflake, IceCream2, Coffee, Milk, Wine, Apple, Drumstick, Wheat, Carrot, Candy, Utensils, Archive, ShoppingBag, CakeSlice, Droplet, GlassWater, Dessert, Settings, ChevronDown, Shield, Fish, List, Search, ChevronRight, ChevronLeft } from 'lucide-react';
import { InventoryProduct } from '../types';
import { getStoredData, setStoredData } from '../lib/db';
import { Button, Input, Label } from './ui/LightUI';
import { motion } from 'motion/react';
import { useAuth } from '../contexts/AuthContext';
import { cn } from '../lib/utils';
import { useInventaire } from '../providers/InventaireProvider';
import { getCategorieStyle } from '../lib/inventoryStyles';

export const CustomCheeseIcon = (props: any) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <path d="M12 3L3 15h18Z" />
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
    <circle cx="9" cy="11" r="1.5" />
    <circle cx="14" cy="14" r="2" />
    <circle cx="11" cy="18" r="1.5" />
  </svg>
);

export const CustomBottleIcon = (props: any) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <rect x="7" y="10" width="10" height="12" rx="3" ry="3" />
    <path d="M10 4h4v6h-4z" />
    <path d="M9 2h6v2H9z" />
    <path d="M8 15h8" />
  </svg>
);

export const CustomCanIcon = (props: any) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <rect x="6" y="4" width="12" height="16" rx="2" ry="2" />
    <path d="M6 8h12" />
    <path d="M6 16h12" />
    <path d="M12 4v3" />
  </svg>
);

export const ICONS_MAP: Record<string, React.FC<any>> = {
  Package, Box, Droplets, CupSoda, Beef, Leaf, Flame, Snowflake, 
  IceCream2, Coffee, Milk, Wine, Apple, Drumstick, Wheat, Carrot, 
  Candy, Utensils, Archive, ShoppingBag, CakeSlice, Droplet, GlassWater, Dessert, Fish,
  CustomCheese: CustomCheeseIcon,
  CustomBottle: CustomBottleIcon,
  CustomCan: CustomCanIcon
};

export const getSmartIcon = (name: string, category: string): string => {
  const n = (name || "").toLowerCase();
  if (n.includes('cristaline') || n.includes('eau') || n.includes('perrier') || n.includes('bouteille') || n.includes('evian') || n.includes('vittel')) return 'CustomBottle';
  if (n.includes('dada') || n.includes('canette') || n.includes('boisson') || n.includes('coca') || n.includes('fanta') || n.includes('sprite') || n.includes('oasis') || n.includes('ice tea') || n.includes('tropico') || n.includes('schweppes') || n.includes('pepsi') || n.includes('7up')) return 'CustomCan';
  if (n.includes('mozzarella') || n.includes('cheddar') || n.includes('camembert') || n.includes('chèvre') || n.includes('raclette') || n.includes('fromage') || n.includes('brie') || n.includes('emmental') || n.includes('gruyère') || n.includes('parmesan') || n.includes('feta') || n.includes('gouda')) return 'CustomCheese';
  if (n.includes('riz au lait') || n.includes('tiramisu') || n.includes('dessert')) return 'Dessert';
  if (n.includes('tenders') || n.includes('nuggets') || n.includes('cordon bleu')) return 'Drumstick';
  if (n.includes('sauce')) return 'Droplets';
  if (n.includes('riz')) return 'Wheat';
  if (n.includes('crème')) return 'Milk';
  if (n.includes('ail') || n.includes('persil') || n.includes('oignon')) return 'Leaf';
  if (n.includes('nutella') || n.includes('oreo') || n.includes('m&ms') || n.includes('daim') || n.includes('caramel') || n.includes('bueno')) return 'Candy';
  if (n.includes('paille') || n.includes('serviette') || n.includes('sac') || n.includes('boîte') || n.includes('couvercle')) return 'ShoppingBag';
  if (category?.includes('Surgelés')) return 'Snowflake';
  if (category?.includes('Sec Alimentaire')) return 'Archive';
  if (category === 'Sec') return 'Box';
  return 'Package';
};

export const DEFAULT_CATEGORIES = {
  "Frais": [
    "Sauce Algérienne", "Sauce Poivre", "Sauce Fish", "Sauce BBQ", 
    "Crème liquide", "Ail", "Persil", "Mayo", "Riz au lait", "Mozzarella", "Cheddar"
  ],
  "Surgelés / Congelés": [
    "Tenders", "Cordon bleu", "Allocos", "Nuggets", "Oignon rings", 
    "Chèvre", "Raclette", "Camembert"
  ],
  "Boissons": [
    "DADA Pêche", "DADA Ice Tea Pêche", "DADA Fraise", "DADA Cerise", "DADA Mangue", 
    "DADA Melon", "DADA Pomme", "DADA Mojito", "DADA Litchi", "DADA Lemon", 
    "DADA Cola", "DADA Cola Zéro", "DADA Cola Cherry", 
    "Cristaline Eau", "Cristaline Pêche", "Cristaline Fraise", "Perrier"
  ],
  "Sec Alimentaire": [
    "Oreo", "M&Ms", "Daim", "Sauce caramel dessert", "Nutella", "Pistache", 
    "Oignon frit", "Sauce chili Thaï", "Sauce Soja", "Riz", "Sucre", "Persil", 
    "Ail (Poudre)", "Gingembre (Poudre)", "Poivre (Poudre)", "Jalapeños", 
    "Sauce pimentée", "Kinder Bueno", "Cassonade"
  ],
  "Sec": [
    "Paille", "Serviette", "Sac kraft", "Boîte crousty", "Grande Cuillère", 
    "Petite Cuillère", "Boîte d'aluminium Grande", "Boîte d'aluminium Petite", 
    "Contenant pour riz au lait", "Gants", "Essuie Main", "Papier Toilette", 
    "Savon main", "Couvercle Grand Aluminium", "Couvercle petit Aluminium", 
    "Pot de Sauce", "Gros rouleau Ticket", "Petit rouleau Ticket", "Film étirable", 
    "Lavette rose", "Tablier", "Filet cheveux", "Sac poubelle"
  ]
};

export const CATEGORY_LIST = Object.keys(DEFAULT_CATEGORIES);

const CategorieBadge = ({ nom }: { nom: string }) => {
  const style = getCategorieStyle(nom);
  const Icone = style.icone;
  return (
    <span 
      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-tight border shadow-xs"
      style={{ 
        backgroundColor: style.fond, 
        color: style.couleur, 
        borderColor: style.bordure 
      }}
    >
      <Icone size={10} strokeWidth={3} />
      {nom}
    </span>
  );
};

const ThresholdInput = ({ initialValue, onSave }: { initialValue: number, onSave: (val: number) => void }) => {
  const [val, setVal] = useState<string>(initialValue.toString());

  useEffect(() => {
    setVal(initialValue.toString());
  }, [initialValue]);

  return (
    <input 
      type="number"
      className="w-12 px-1.5 py-0.5 bg-gray-50 border border-gray-100 rounded text-center font-bold text-gray-700 hover:bg-gray-100 focus:bg-white focus:ring-1 focus:ring-crousty-purple outline-none"
      value={val}
      placeholder="0"
      onChange={(e) => setVal(e.target.value)} 
      onBlur={() => {
        const num = val === '' ? 0 : Number(val);
        setVal(num.toString());
        onSave(num);
      }}
      onKeyDown={(e) => {
        if (e.key === 'Enter') {
          e.currentTarget.blur();
        }
      }}
    />
  );
};

export const GererLesProduits = ({ onSave, onCancel }: { onSave?: () => void, onCancel?: () => void }) => {
  const { currentUser } = useAuth();
  const isManager = currentUser?.role === 'manager';
  const { products, setProducts, updateProduct, deleteProduct, addProduct } = useInventaire();

  // Scroll lock for modal
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = 'unset'; };
  }, []);
  const [editingProduct, setEditingProduct] = useState<InventoryProduct | null>(null);
  const defaultFormState = { 
    name: '', 
    category: 'Frais', 
    minThreshold: '' as number | string, 
    icon: 'Package',
    uniteStock: 'unité',
    uniteAchat: 'carton',
    conversionCartonUnite: '' as number | string
  };
  const [productForm, setProductForm] = useState(defaultFormState);
  const [viewMode, setViewMode] = useState<'form' | 'list'>('list');

  // Selection state
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [showBulkDeleteConfirm, setShowBulkDeleteConfirm] = useState<'selected' | 'all' | null>(null);
  const [bulkThreshold, setBulkThreshold] = useState<string>('');

  const handleSaveProduct = () => {
    if (!productForm.name.trim()) return;
    
    const thresholdNum = productForm.minThreshold === '' ? 0 : Number(productForm.minThreshold);
    const convNum = productForm.conversionCartonUnite === '' ? 5 : Number(productForm.conversionCartonUnite);
    
    if (convNum <= 0) {
      alert("Le facteur de conversion doit être supérieur à 0");
      return;
    }

    const dataToSave = { 
      ...productForm, 
      minThreshold: thresholdNum,
      conversionCartonUnite: convNum
    };

    if (editingProduct) {
      updateProduct(editingProduct.id, dataToSave);
    } else {
      addProduct(dataToSave);
    }
    
    setEditingProduct(null);
    setProductForm(defaultFormState);
    setViewMode('list');
    if (onSave) onSave();
  };

  const handleDeleteProduct = (id: string) => {
    deleteProduct(id);
    setSelectedIds(prev => prev.filter(v => v !== id));
    if (onSave) onSave();
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
      setProducts([]);
    } else if (showBulkDeleteConfirm === 'selected') {
      setProducts(products.filter(p => !selectedIds.includes(p.id)));
    }
    setSelectedIds([]);
    setShowBulkDeleteConfirm(null);
    setIsSelectionMode(false);
    if (onSave) onSave();
  };

  const handleExportProducts = () => {
    const dataStr = JSON.stringify(products, null, 2);
    const blob = new Blob([dataStr], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `crousty_inventaire_produits_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleImportProducts = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const importedData = JSON.parse(event.target?.result as string);
        if (Array.isArray(importedData)) {
          const updated = [...products];
          const existingIds = new Set(products.map(p => p.id));
          
          importedData.forEach(p => {
             if (p.id && p.name && p.category && !existingIds.has(p.id)) {
                updated.push(p);
             }
          });

          setProducts(updated);
          if (onSave) onSave();
          alert("Produits importés avec succès !");
        }
      } catch (err) {
        alert("Erreur lors de l'import.");
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleBulkThresholdUpdate = () => {
    if (selectedIds.length === 0 || bulkThreshold === '') return;
    const num = Number(bulkThreshold);
    const updated = products.map(p => {
      if (selectedIds.includes(p.id)) {
        return { ...p, minThreshold: num };
      }
      return p;
    });
    setProducts(updated);
    setBulkThreshold('');
    setSelectedIds([]);
    setIsSelectionMode(false);
    if (onSave) onSave();
  };

  const updateProductThreshold = (id: string, newThreshold: string) => {
    const num = newThreshold === '' ? 0 : Number(newThreshold);
    updateProduct(id, { minThreshold: num });
    if (onSave) onSave();
  };

  const productsByCategory = (products || []).reduce((acc, product) => {
    if (!acc[product.category]) acc[product.category] = [];
    acc[product.category].push(product);
    return acc;
  }, {} as Record<string, InventoryProduct[]>);

  const [searchList, setSearchList] = useState('');

  const filteredProductsByCategory = Object.entries(productsByCategory).reduce((acc, [cat, prods]: [string, InventoryProduct[]]) => {
    const filtered = prods.filter(p => !searchList || p.name.toLowerCase().includes(searchList.toLowerCase()));
    if (filtered.length > 0) acc[cat] = filtered;
    return acc;
  }, {} as Record<string, InventoryProduct[]>);

  return (
    <div className="flex flex-col h-full bg-white relative">
      <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50 shrink-0 z-10">
        <h3 className="font-black text-gray-800 uppercase tracking-wider flex items-center gap-2">
          <Settings size={20} className="text-crousty-purple" /> Gérer les produits
        </h3>
        <div className="flex items-center gap-2">
          <button 
            onClick={() => { 
              setEditingProduct(null); 
              setProductForm(defaultFormState); 
              setViewMode('form'); 
            }} 
            className="bg-crousty-purple text-white px-3 py-2 text-xs font-bold rounded-xl shadow-sm hover:bg-purple-700 active:scale-95 flex items-center gap-2"
          >
            <Plus size={16} /> <span className="hidden sm:inline">Ajouter</span>
          </button>
          <label className="cursor-pointer bg-white border border-gray-200 text-crousty-purple p-2 rounded-xl shadow-sm hover:bg-gray-50 active:scale-95 flex items-center gap-2" title="Importer">
            <Upload size={18} />
            <input type="file" accept=".json" className="hidden" onChange={handleImportProducts} />
          </label>
          <button onClick={handleExportProducts} className="bg-white border border-gray-200 text-crousty-purple p-2 rounded-xl shadow-sm hover:bg-gray-50 active:scale-95" title="Exporter">
            <Download size={18} />
          </button>
          {onCancel && (
            <button onClick={onCancel} className="ml-2 p-2 bg-gray-200 rounded-full text-gray-600 hover:bg-gray-300 transition-colors">
              <X size={20} />
            </button>
          )}
        </div>
      </div>
      
      <div className="flex flex-1 overflow-hidden">
        {/* Left Pane: List */}
        <div className={cn(
          "w-full sm:w-1/3 md:w-2/5 border-r border-gray-100 flex flex-col bg-gray-50/30",
          viewMode === 'form' ? 'hidden sm:flex' : 'flex'
        )}>
          <div className="p-3 border-b border-gray-100 bg-white shrink-0 sticky top-0 z-10">
             <div className="relative">
               <input 
                 type="text"
                 placeholder="Rechercher un produit..." 
                 value={searchList}
                 onChange={e => setSearchList(e.target.value)}
                 className="w-full pl-9 pr-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-crousty-purple focus:border-transparent font-medium"
               />
               <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
             </div>
          </div>
          
          <div className="flex-1 overflow-y-auto p-4 space-y-6">
            {isManager && products.length > 0 && (
              <div className="bg-amber-50 border border-amber-100 p-3 rounded-2xl space-y-3 shadow-sm">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-amber-900 font-bold text-[10px] uppercase tracking-widest">
                    <Shield size={12} className="text-amber-500" />
                    Actions de masse
                  </div>
                  <Button 
                    onClick={() => {
                      setIsSelectionMode(!isSelectionMode);
                      if (isSelectionMode) setSelectedIds([]);
                    }}
                    className={cn(
                      "h-6 px-2 rounded-lg text-[9px] font-black uppercase tracking-widest",
                      isSelectionMode ? "bg-amber-200 text-amber-900" : "bg-white text-gray-500 border border-gray-200"
                    )}
                  >
                    {isSelectionMode ? 'Terminer' : 'Sélection'}
                  </Button>
                </div>
                {isSelectionMode && (
                  <div className="flex flex-col gap-2 p-2 bg-white rounded-xl border border-amber-200 animate-in zoom-in-95 duration-200">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <button 
                          onClick={handleSelectAll}
                          className="w-4 h-4 rounded border-2 border-amber-400 flex items-center justify-center shrink-0"
                        >
                          {selectedIds.length === products.length && products.length > 0 && <Check size={10} className="text-amber-500 font-black" />}
                        </button>
                        <span className="text-[9px] font-black text-amber-900 uppercase">{selectedIds.length} sél.</span>
                      </div>
                      <Button 
                        disabled={selectedIds.length === 0}
                        onClick={() => setShowBulkDeleteConfirm('selected')}
                        className="h-6 px-2 bg-red-100 text-red-600 rounded-lg text-[9px] font-black hover:bg-red-500 hover:text-white"
                        variant="ghost"
                      >
                        Supprimer
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {(Object.entries(filteredProductsByCategory) as [string, InventoryProduct[]][]).map(([cat, prods]) => {
              const style = getCategorieStyle(cat);
              const CatIcon = style.icone;
              return (
                <div key={cat} className="space-y-2">
                  <div className="flex items-center gap-2 border-b border-gray-100 pb-1 sticky items-center bg-gray-50/50 py-1 -mx-2 px-2 backdrop-blur-sm z-10 transition-colors">
                    <CatIcon size={12} color={style.couleur} strokeWidth={2.5} />
                    <h5 className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex-1">{cat}</h5>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    {prods.map(p => {
                      const IconComp = ICONS_MAP[p.icon || 'Package'] || Package;
                      const productStyle = getCategorieStyle(p.category);
                      const isSelectedToEdit = editingProduct?.id === p.id;
                      return (
                        <div 
                          key={p.id} 
                          onClick={() => {
                            if (isSelectionMode) {
                               toggleSelection(p.id);
                            } else {
                               setEditingProduct(p); 
                               setProductForm({ 
                                 name: p.name, 
                                 category: p.category, 
                                 minThreshold: p.minThreshold, 
                                 icon: p.icon || 'Package',
                                 uniteStock: p.uniteStock || 'unité',
                                 uniteAchat: p.uniteAchat || 'carton',
                                 conversionCartonUnite: p.conversionCartonUnite || 5
                               });
                               setViewMode('form');
                            }
                          }}
                          className={cn(
                            "flex items-center gap-2 p-2 rounded-xl transition-all cursor-pointer border",
                            isSelectedToEdit ? "bg-crousty-purple/5 border-crousty-purple/30 ring-1 ring-crousty-purple/50 shadow-sm" : "bg-white border-transparent hover:border-gray-200 hover:bg-gray-50",
                            isSelectionMode && selectedIds.includes(p.id) && "border-amber-400 bg-amber-50/50"
                          )}
                        >
                          {isSelectionMode && (
                            <div className={cn(
                              "w-4 h-4 rounded flex items-center justify-center shrink-0 border-2",
                              selectedIds.includes(p.id) ? "bg-amber-500 border-amber-500" : "border-gray-300 bg-white"
                            )}>
                              {selectedIds.includes(p.id) && <Check size={10} className="text-white" />}
                            </div>
                          )}
                          <div 
                            className="p-1.5 rounded-lg flex items-center justify-center border shrink-0 opacity-80"
                            style={{ backgroundColor: productStyle.fond, borderColor: productStyle.bordure }}
                          >
                            <IconComp size={16} color={productStyle.couleur} />
                          </div>
                          <div className="flex-1 overflow-hidden">
                            <div className="text-sm font-bold text-gray-800 leading-none truncate mb-1">{p.name}</div>
                            <div className="text-[9px] text-gray-500 font-medium">Seuil: {p.minThreshold}</div>
                          </div>
                          <ChevronRight size={14} className={cn("text-gray-300 shrink-0", isSelectedToEdit && "text-crousty-purple")} />
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Pane: Form */}
        <div className={cn(
          "w-full sm:w-2/3 md:w-3/5 overflow-y-auto bg-white",
          viewMode === 'list' ? 'hidden sm:block' : 'block'
        )}>
          {viewMode === 'form' && (
             <div className="p-4 border-b border-gray-100 sm:hidden bg-gray-50 flex items-center">
               <button onClick={() => setViewMode('list')} className="text-sm font-bold text-gray-600 flex items-center gap-1">
                 <ChevronLeft size={16} /> Retour à la liste
               </button>
             </div>
          )}

          {!editingProduct && viewMode === 'list' ? (
             <div className="h-full flex flex-col items-center justify-center text-gray-400 p-8 text-center bg-gray-50/30">
               <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mb-4">
                 <Package size={24} className="text-gray-400" />
               </div>
               <h3 className="font-bold text-lg text-gray-800 mb-2">Sélectionnez un produit</h3>
               <p className="text-sm max-w-sm mb-6">Cliquez sur un produit dans la liste de gauche pour le modifier, ou ajoutez un nouveau produit.</p>
               <Button onClick={() => { setEditingProduct(null); setProductForm(defaultFormState); setViewMode('form'); }} className="bg-white border border-gray-200 text-gray-700 hover:bg-gray-50">
                 Créer un produit
               </Button>
             </div>
          ) : (
            <div className="p-6 max-w-2xl mx-auto animate-in fade-in zoom-in-95 duration-200">
               <div className="flex items-center justify-between mb-6">
                 <div>
                   <h4 className="text-xl font-black text-gray-900 tracking-tight">{editingProduct ? 'Modifier le produit' : 'Nouveau produit'}</h4>
                   <p className="text-sm text-gray-500 font-bold mt-1 max-w-[250px] sm:max-w-none truncate">{editingProduct ? editingProduct.name : 'Remplissez les informations ci-dessous'}</p>
                 </div>
                 {editingProduct && (
                   <button 
                     onClick={() => handleDeleteProduct(editingProduct.id)}
                     className="p-2 text-red-500 hover:bg-red-50 rounded-xl transition-colors shrink-0"
                     title="Supprimer ce produit"
                   >
                     <Trash2 size={20} />
                   </button>
                 )}
               </div>

              <div className="space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="sm:col-span-1">
                    <Label>Catégorie</Label>
                    <div className="relative group">
                      <select 
                        className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-gray-800 font-bold outline-none focus:ring-2 focus:ring-crousty-purple/50 appearance-none shadow-sm cursor-pointer"
                        value={productForm.category}
                        onChange={e => setProductForm({...productForm, category: e.target.value})}
                        style={{ borderLeft: `4px solid ${getCategorieStyle(productForm.category).couleur}` }}
                      >
                        {CATEGORY_LIST.map(c => <option key={c} value={c}>{c}</option>)}
                      </select>
                      <ChevronDown size={18} className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400 group-hover:text-crousty-purple" />
                    </div>
                  </div>
                  <div className="sm:col-span-1">
                    <Label>Nom du produit</Label>
                    <Input 
                      value={productForm.name} 
                      onChange={(e: any) => setProductForm({...productForm, name: e.target.value, icon: getSmartIcon(e.target.value, productForm.category)})} 
                      placeholder="Ex: Sauce Mayo" 
                      className="bg-gray-50 h-[46px]"
                    />
                  </div>
                </div>

                <div className="p-5 bg-indigo-50/50 rounded-2xl border border-indigo-100 space-y-4">
                  <div className="flex items-center gap-2 text-indigo-900 font-bold text-xs uppercase tracking-widest border-b border-indigo-100/50 pb-2">
                    <Package size={14} className="text-indigo-500" /> Conditionnement et conversions
                  </div>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="sm:col-span-1">
                      <Label className="text-indigo-800">Unité de stock</Label>
                      <Input 
                        value={productForm.uniteStock} 
                        onChange={(e: any) => setProductForm({...productForm, uniteStock: e.target.value})} 
                        placeholder="Ex: unité, kg..." 
                        className="bg-white border-indigo-100 placeholder-indigo-300 text-indigo-900"
                      />
                    </div>
                    <div className="sm:col-span-1">
                      <Label className="text-indigo-800">Unité d'achat</Label>
                      <Input 
                        value={productForm.uniteAchat} 
                        onChange={(e: any) => setProductForm({...productForm, uniteAchat: e.target.value})} 
                        placeholder="Ex: carton, boîte..." 
                        className="bg-white border-indigo-100 placeholder-indigo-300 text-indigo-900"
                      />
                    </div>
                    <div className="sm:col-span-1 relative group">
                      <Label className="text-indigo-800">Conversion</Label>
                      <div className="relative">
                        <Input 
                          type="number"
                          min="1"
                          value={productForm.conversionCartonUnite} 
                          onChange={(e: any) => setProductForm({...productForm, conversionCartonUnite: e.target.value === '' ? '' : Number(e.target.value)})} 
                          placeholder="Ex: 5" 
                          className="pl-8 bg-white border-indigo-100 font-black text-indigo-900 focus:ring-indigo-300 focus:border-indigo-300"
                        />
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-indigo-300 font-black">X</span>
                      </div>
                      
                      {productForm.uniteAchat && productForm.uniteStock && productForm.conversionCartonUnite && (
                         <div className="absolute top-full left-0 mt-2 w-max bg-indigo-900 text-white text-[10px] py-1.5 px-3 rounded-lg shadow-xl opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-20">
                            1 <strong>{productForm.uniteAchat}</strong> = {productForm.conversionCartonUnite} <strong>{productForm.uniteStock}s</strong>
                         </div>
                      )}
                    </div>
                  </div>
                  <p className="text-[10px] text-indigo-600/80 font-medium leading-tight">
                    La conversion permet de calculer le stock total (ex: 2 cartons et 3 unités).
                  </p>
                </div>

                <div className="grid grid-cols-1 gap-4">
                  <div className="sm:col-span-1">
                    <Label className="flex items-center justify-between">
                      <span>Seuil d'alerte (Rupture)</span>
                      <span className="text-[10px] font-normal text-gray-400">En {productForm.uniteStock || 'unités'}</span>
                    </Label>
                    <div className="relative">
                       <Input 
                         type="number" 
                         value={productForm.minThreshold} 
                         onChange={(e: any) => setProductForm({...productForm, minThreshold: Number(e.target.value)})} 
                         className="bg-gray-50 pr-12 font-bold"
                       />
                       {productForm.uniteStock && (
                          <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-bold text-gray-400 select-none">
                             {productForm.uniteStock}(s)
                          </span>
                       )}
                    </div>
                  </div>
                </div>

                <div>
                  <Label className="mb-2 block">Icône associée</Label>
                  <div className="flex flex-wrap gap-2">
                    {Object.keys(ICONS_MAP).map(iconKey => {
                      const IconComp = ICONS_MAP[iconKey];
                      const isSelected = productForm.icon === iconKey;
                      return (
                        <button
                          key={iconKey}
                          onClick={() => setProductForm({...productForm, icon: iconKey})}
                          className={`p-2.5 rounded-xl border flex items-center justify-center transition-all ${isSelected ? 'bg-crousty-purple text-white border-purple-600 scale-110 shadow-md ring-2 ring-purple-200' : 'bg-white text-gray-400 border-gray-200 hover:bg-gray-50 hover:text-gray-600'}`}
                          title={iconKey}
                        >
                          <IconComp size={18} />
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="flex gap-3 pt-6 border-t border-gray-100 justify-end">
                  <Button 
                    variant="outline" 
                    className="w-full sm:w-auto hover:bg-gray-50"
                    onClick={() => { setEditingProduct(null); setViewMode('list'); }}
                  >
                    Annuler
                  </Button>
                  <Button 
                    className="w-full sm:w-auto bg-crousty-purple text-white shadow-md hover:bg-purple-700"
                    onClick={handleSaveProduct}
                  >
                    <Check size={16} className="mr-2" />
                    {editingProduct ? 'Enregistrer les modifications' : 'Créer le produit'}
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
      
      {showBulkDeleteConfirm && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[1000] flex items-center justify-center p-4">
          <div className="bg-white rounded-[2rem] p-8 max-w-sm w-full shadow-2xl space-y-6 animate-in zoom-in-95 duration-300">
            <div className="text-center space-y-2">
              <h3 className="text-xl font-black text-gray-900 leading-tight">Attention</h3>
              <p className="text-sm text-gray-500 font-medium">
                {showBulkDeleteConfirm === 'all' 
                  ? "Voulez-vous vraiment supprimer TOUS les produits de l'inventaire ?"
                  : `Voulez-vous vraiment supprimer les ${selectedIds.length} produits sélectionnés ?`}
              </p>
            </div>
            <div className="flex gap-2">
              <Button onClick={() => setShowBulkDeleteConfirm(null)} variant="ghost" className="flex-1 font-black text-[10px] uppercase">Annuler</Button>
              <Button onClick={handleBulkDelete} className="flex-1 bg-red-500 font-black text-[10px] uppercase text-white hover:bg-red-600">Confirmer</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

