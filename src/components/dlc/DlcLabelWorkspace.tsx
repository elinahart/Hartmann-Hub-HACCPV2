import React, { useState, useMemo } from 'react';
import { Search, Printer, Plus, Minus, Tag, FileBox, Settings } from 'lucide-react';
import { InventoryProduct } from '../../types';
import { PrintSettings } from '../../types/printing';
import { getStoredData } from '../../lib/db';
import { triggerSystemPrint } from '../../lib/printing/triggerSystemPrint';
import { getIconeCategorie } from '../../lib/categoriesIcones';

import { useConfig } from '../../contexts/ConfigContext';

interface LabelEntry {
  id: string;
  productId: string;
  productName: string;
  category: string;
  quantity: number;
  printedAt: string;
  expiryDate: string;
  author: string;
}

interface DlcLabelWorkspaceProps {
  products: InventoryProduct[];
  categories: string[];
  activeEntries: LabelEntry[];
  onAddLabel: (productId: string, qty: number, mode: 'virtual' | 'system') => void;
  onDeleteLabel: (id: string) => void;
  currentUser: any;
}

export const DlcLabelWorkspace: React.FC<DlcLabelWorkspaceProps> = ({
  products, categories, activeEntries, onAddLabel, onDeleteLabel, currentUser
}) => {
  const { config } = useConfig();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCat, setSelectedCat] = useState<string>('Toutes');
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [isPrinting, setIsPrinting] = useState(false);

  // We should read printSettings directly here or get it from a Context, 
  // but localStorage is fine for this demo.
  const printSettings = getStoredData<PrintSettings>('app_print_settings', {
    mode: 'system', format: '50x30', orientation: 'landscape', restaurantName: ''
  }) as PrintSettings;

  const effectiveRestaurantName = printSettings.restaurantName || config.restaurant.nom;

  const filteredProducts = useMemo(() => {
    return products.filter(p => {
      const matchSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase());
      const matchCat = selectedCat === 'Toutes' || p.category === selectedCat;
      return matchSearch && matchCat;
    });
  }, [products, searchTerm, selectedCat]);

  const selectedProduct = products.find(p => p.id === selectedProductId);

  const handlePrintRequest = async () => {
    if (!selectedProduct) return;
    
    // Si virtuel, on ajoute juste l'entrée
    if (printSettings.mode === 'virtual') {
      onAddLabel(selectedProduct.id, quantity, 'virtual');
      setQuantity(1);
      return;
    }

    if (printSettings.mode === 'system') {
      setIsPrinting(true);
      // Générer le HTML d'impression
      const htmlDoc = `
        <div style="font-family: sans-serif; text-align: center; width: 100%; height: 100%; display: flex; flex-direction: column; justify-content: space-between; padding: 2px;">
          <div style="font-weight: 900; font-size: 10px; border-bottom: 1px solid black; padding-bottom: 2px;">${effectiveRestaurantName}</div>
          <div style="font-weight: bold; font-size: 14px; margin-top: 5px;">${selectedProduct.name}</div>
          <div style="font-size: 10px; margin-top: 2px;">${selectedProduct.category}</div>
          <div style="font-weight: 900; font-size: 12px; margin-top: auto; border-top: 1px solid black; padding-top: 2px;">Exp: DEMAIN 23:59</div>
        </div>
      `;

      try {
        const success = await triggerSystemPrint(htmlDoc, printSettings);
        if (success) {
          // On enregistre
          onAddLabel(selectedProduct.id, quantity, 'system');
          setQuantity(1);
        }
      } catch(e) {
         console.error('Erreur Print', e);
      } finally {
         setIsPrinting(false);
      }
    }
  };

  return (
    <div className="flex flex-col flex-1 w-full min-h-0 overflow-hidden bg-gray-50/50 rounded-2xl border border-gray-200 shadow-sm animate-in fade-in zoom-in-95 duration-300">
      
      {/* Top Bar */}
      <div className="h-16 border-b border-gray-200 bg-white flex items-center justify-between px-6 shrink-0">
         <h2 className="text-lg md:text-xl font-black text-gray-800 uppercase tracking-widest flex items-center gap-2">
           <Tag className="text-crousty-purple" size={24} /> Création d'Étiquettes
         </h2>
         <div className="flex items-center gap-3">
            <div className="hidden md:flex items-center gap-2 text-xs font-bold text-gray-500 bg-gray-100 py-1.5 px-3 rounded-full">
              <span className={`w-2 h-2 rounded-full ${printSettings.mode === 'disabled' ? 'bg-red-500' : 'bg-green-500'}`}></span>
              Mode: {printSettings.mode === 'virtual' ? 'Virtuel' : printSettings.mode === 'system' ? 'AirPrint' : 'Désactivé'}
            </div>
            <button 
              onClick={() => window.dispatchEvent(new CustomEvent('open-customization-modal', { detail: { tab: 'produits' } }))}
              className="px-3 py-1.5 bg-crousty-purple/10 text-crousty-purple hover:bg-crousty-purple/20 rounded-xl text-xs font-bold transition-colors flex items-center gap-2"
            >
              <Plus size={14} /> <span className="hidden sm:inline">Gérer les produits</span>
            </button>
         </div>
      </div>

      <div className="flex flex-1 min-h-0 flex-col md:flex-row">
        {/* LEFT PANEL: LIST */}
        <div className="w-full md:w-1/2 lg:w-5/12 border-b md:border-b-0 md:border-r border-gray-200 flex flex-col bg-white flex-1 min-h-0">
          <div className="p-4 border-b border-gray-100 space-y-3 shrink-0">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              <input 
                type="text"
                placeholder="Rechercher un produit..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full bg-gray-100 border-none rounded-xl pl-10 pr-4 py-3 text-sm font-medium focus:ring-2 focus:ring-crousty-purple outline-none"
              />
            </div>
            <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
               {['Toutes', ...categories].map(cat => (
                 <button 
                   key={cat}
                   onClick={() => setSelectedCat(cat)}
                   className={`px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-colors ${selectedCat === cat ? 'bg-gray-800 text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}
                 >
                   {cat}
                 </button>
               ))}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-2 no-scrollbar">
            {filteredProducts.length === 0 ? (
              <div className="text-center text-gray-400 font-medium py-10">Aucun produit trouvé</div>
            ) : (
              filteredProducts.map(p => {
                const style = getIconeCategorie(p.category);
                const Icon = style.icone;
                return (
                  <button
                    key={p.id}
                    onClick={() => setSelectedProductId(p.id)}
                    className={`w-full text-left p-4 rounded-2xl flex items-center gap-3 transition-all ${
                      selectedProductId === p.id 
                      ? 'border-2 shadow-sm' 
                      : 'bg-white border-2 border-gray-100 hover:border-gray-200'
                    }`}
                    style={selectedProductId === p.id ? { backgroundColor: `${style.couleur}10`, borderColor: `${style.couleur}40` } : {}}
                  >
                     <div 
                        className={`p-2.5 rounded-xl`}
                        style={{ 
                          backgroundColor: selectedProductId === p.id ? style.couleur : `${style.couleur}20`,
                          color: selectedProductId === p.id ? 'white' : style.couleur
                        }}
                     >
                       <Icon size={20} />
                     </div>
                     <div className="flex-1 overflow-hidden">
                       <div className="font-black text-gray-800 truncate text-sm">{p.name}</div>
                       <div className="text-[10px] uppercase font-bold mt-0.5" style={{ color: style.couleur }}>{p.category}</div>
                     </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* RIGHT PANEL: ACTIONS & PREVIEW */}
        <div className="w-full md:w-1/2 lg:w-7/12 flex flex-col bg-gray-50 relative flex-1 min-h-0">
          {selectedProduct ? (
            <div className="flex-1 flex flex-col min-h-0">
              <div className="p-4 md:p-8 flex-1 overflow-y-auto no-scrollbar flex flex-col items-center justify-center">
                 <div className="bg-white p-6 md:p-8 rounded-[2rem] md:rounded-[3rem] shadow-xl border border-gray-100 flex flex-col items-center relative w-full max-w-sm">
                   <div className="absolute -top-3 text-white px-4 py-1 rounded-full text-[10px] font-black uppercase tracking-widest shadow-md" style={{ backgroundColor: getIconeCategorie(selectedProduct.category).couleur }}>
                     Étiquette
                   </div>
                   <div className="text-center space-y-2 mb-6 mt-4 w-full">
                     <h3 className="text-xl md:text-2xl font-black text-gray-900 leading-tight w-full truncate px-2">{selectedProduct.name}</h3>
                     <p className="font-bold uppercase text-xs md:text-sm tracking-wide" style={{ color: getIconeCategorie(selectedProduct.category).couleur }}>{selectedProduct.category}</p>
                   </div>
                   
                   <div className="w-full bg-gray-50 rounded-2xl p-4 border border-dashed border-gray-300 mb-6">
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-xs text-gray-500 font-bold">Préparation</span>
                        <span className="font-black text-sm">Aujourd'hui</span>
                      </div>
                      <div className="flex justify-between items-center" style={{ color: getIconeCategorie(selectedProduct.category).couleur }}>
                        <span className="text-xs font-bold opacity-80">Expiration</span>
                        <span className="font-black text-lg">+{selectedProduct.dlcValue || 24} {selectedProduct.dlcUnit === 'days' ? 'jours' : 'heures'}</span>
                      </div>
                      <div className="mt-4 pt-3 border-t border-gray-200 flex justify-between items-center text-[10px] text-gray-400 font-bold uppercase">
                        <span>Par : {currentUser?.name || 'Chef'}</span>
                        <span className="truncate max-w-[100px] text-right">{effectiveRestaurantName}</span>
                      </div>
                   </div>

                   <div className="w-full max-w-[200px] flex items-center justify-between bg-gray-100 p-2 rounded-2xl">
                     <button onClick={() => setQuantity(Math.max(1, quantity - 1))} className="w-10 h-10 md:w-12 md:h-12 bg-white rounded-xl shadow-sm flex items-center justify-center text-gray-800 hover:bg-gray-50 active:scale-95 transition-transform">
                       <Minus size={20} />
                     </button>
                     <span className="font-black text-xl md:text-2xl w-16 text-center">{quantity}</span>
                     <button onClick={() => setQuantity(quantity + 1)} className="w-10 h-10 md:w-12 md:h-12 bg-white rounded-xl shadow-sm flex items-center justify-center text-gray-800 hover:bg-gray-50 active:scale-95 transition-transform">
                       <Plus size={20} />
                     </button>
                   </div>
                 </div>
              </div>

              <div className="p-4 md:p-6 bg-white border-t border-gray-200 shrink-0">
                <button 
                  onClick={handlePrintRequest}
                  disabled={isPrinting || printSettings.mode === 'disabled'}
                  className="w-full h-14 md:h-16 bg-gray-900 text-white rounded-2xl font-black text-base md:text-lg flex items-center justify-center gap-3 hover:-translate-y-1 transition-transform shadow-lg shadow-gray-900/20 disabled:opacity-50 disabled:hover:translate-y-0"
                >
                  <Printer size={24} />
                  {isPrinting ? 'Impression...' : printSettings.mode === 'virtual' ? 'Créer Étiquette Virtuelle' : 'Imprimer & Enregistrer'}
                </button>
                <div className="text-center mt-3 text-[10px] md:text-xs font-bold text-gray-400 uppercase tracking-widest flex items-center justify-center gap-1.5">
                  <FileBox size={14} /> 
                  Sortie : <span className="text-crousty-purple">{printSettings.mode === 'system' ? 'AirPrint System' : printSettings.mode}</span>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-8 bg-gray-50 min-h-0">
              <div className="w-20 h-20 md:w-24 md:h-24 bg-gray-100 rounded-full flex items-center justify-center text-gray-300 mb-6 shadow-inner">
                <Tag size={40} />
              </div>
              <h3 className="text-lg md:text-xl font-black text-gray-400">Sélectionnez un produit</h3>
              <p className="text-xs md:text-sm font-medium text-gray-400 mt-2 max-w-xs">Choisissez un produit dans la liste pour configurer son étiquette DLC.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
