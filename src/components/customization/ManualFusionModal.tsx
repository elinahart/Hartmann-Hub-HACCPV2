import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { GitMerge, X, AlertTriangle, Check, Package } from 'lucide-react';
import { Button } from '../ui/LightUI';
import { ProductDef } from '../../types';
import { migrateProductReferences } from '../../lib/productFusionUtil';
import { cn } from '../../lib/utils';
import { ICONS_MAP } from '../../lib/inventoryIcons';

interface ManualFusionModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedProducts: ProductDef[];
  onFusionComplete: (newMaster: ProductDef, deletedIds: string[]) => void;
}

export function ManualFusionModal({ isOpen, onClose, selectedProducts, onFusionComplete }: ManualFusionModalProps) {
  const [masterId, setMasterId] = useState<string | null>(selectedProducts[0]?.id || null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);

  if (!isOpen || selectedProducts.length < 2) return null;

  const handleFusion = async () => {
    if (!masterId) return;
    setIsProcessing(true);
    setLogs([]);

    const masterProduct = selectedProducts.find(p => p.id === masterId)!;
    const oldProducts = selectedProducts.filter(p => p.id !== masterId);
    
    // Simulate smart merge of fields (take best properties from old to master)
    const newMaster = { ...masterProduct };
    oldProducts.forEach(old => {
      if (!newMaster.fournisseur && old.fournisseur) newMaster.fournisseur = old.fournisseur;
      if ((!newMaster.icon || newMaster.icon === 'Package') && old.icon && old.icon !== 'Package') newMaster.icon = old.icon;
      if (!newMaster.minThreshold && old.minThreshold) newMaster.minThreshold = old.minThreshold;
      if (!newMaster.note && old.note) newMaster.note = old.note;
    });

    const result = await migrateProductReferences(newMaster, oldProducts);
    setLogs(result.logs);
    
    // Call parent to update the catalogue state immediately
    onFusionComplete(newMaster, oldProducts.map(p => p.id));
    
    setTimeout(() => {
      setIsProcessing(false);
      onClose();
    }, 2000);
  };

  return (
    <AnimatePresence>
      <motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} className="fixed inset-0 bg-black/80 backdrop-blur-md z-[3000] flex items-center justify-center p-4">
        <motion.div initial={{y:50, opacity:0}} animate={{y:0, opacity:1}} exit={{y:20, opacity:0}} className="bg-white rounded-[2rem] w-full max-w-3xl overflow-hidden shadow-2xl flex flex-col max-h-[90dvh]">
          
          <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-crousty-purple text-white">
             <div>
               <h3 className="font-black text-2xl flex items-center gap-3">
                 <GitMerge size={28} className="opacity-80" /> Fusion Manuelle
               </h3>
               <p className="text-white/80 font-medium text-sm mt-1">
                 Choisissez la fiche produit principale à conserver. Les autres seront absorbées.
               </p>
             </div>
             <button onClick={onClose} disabled={isProcessing} className="p-2 bg-white/10 hover:bg-white/20 rounded-xl transition-colors">
               <X size={24} />
             </button>
          </div>

          <div className="p-6 overflow-y-auto flex-1 bg-gray-50 space-y-6">
            
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 shadow-sm">
                <h4 className="flex items-center gap-2 text-amber-800 font-bold mb-2">
                  <AlertTriangle size={20} /> Impact de la fusion
                </h4>
                <ul className="text-amber-700 text-sm space-y-1 list-disc pl-5 font-medium">
                  <li>L'historique d'inventaire, de traçabilité et des commandes sera rattaché au produit maître.</li>
                  <li>Les produits absorbés seront supprimés du catalogue.</li>
                  <li>Cette action est irréversible.</li>
                </ul>
            </div>

            <div>
               <h4 className="text-sm font-black text-gray-800 uppercase tracking-wider mb-4">
                 Sélectionnez le produit Maître :
               </h4>
               <div className="space-y-3">
                 {selectedProducts.map(p => {
                    const isSelected = masterId === p.id;
                    const IconComp: any = (ICONS_MAP as any)[p.icon || 'Package'] || Package;
                    
                    return (
                      <div 
                        key={p.id} 
                        onClick={() => !isProcessing && setMasterId(p.id)}
                        className={cn(
                          "p-4 rounded-2xl border-2 transition-all cursor-pointer flex gap-4 items-center",
                          isSelected ? "border-crousty-purple bg-purple-50 shadow-md" : "border-gray-200 bg-white hover:border-purple-200"
                        )}
                      >
                         <div className={cn(
                           "flex-shrink-0 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors",
                           isSelected ? "border-crousty-purple bg-crousty-purple" : "border-gray-300 bg-white"
                         )}>
                           {isSelected && <Check size={14} className="text-white" />}
                         </div>
                         
                         <div className="w-12 h-12 bg-gray-100 rounded-xl flex items-center justify-center flex-shrink-0">
                           <IconComp size={24} className="text-gray-500" />
                         </div>

                         <div className="flex-1 min-w-0">
                           <div className="font-black text-gray-900 text-lg truncate">{p.name}</div>
                           <div className="flex flex-wrap gap-2 mt-1">
                             <span className="text-xs font-bold px-2 py-1 bg-gray-100 rounded-lg text-gray-600 border border-gray-200">{p.category}</span>
                             {p.fournisseur && <span className="text-xs font-bold px-2 py-1 bg-blue-50 text-blue-700 rounded-lg border border-blue-100">Fournisseur: {p.fournisseur}</span>}
                             <span className="text-xs font-bold px-2 py-1 bg-emerald-50 text-emerald-700 rounded-lg border border-emerald-100">Stock: {p.uniteStock || 'N/A'}</span>
                           </div>
                         </div>
                      </div>
                    );
                 })}
               </div>
            </div>

            {logs.length > 0 && (
              <div className="bg-gray-900 border border-black rounded-2xl p-5 shadow-inner">
                 <h4 className="text-white font-bold mb-3 flex items-center gap-2 text-sm">
                   <Package size={16} className="text-emerald-400" /> Journal de migration
                 </h4>
                 <div className="space-y-1">
                   {logs.map((log, idx) => (
                     <div key={idx} className="text-emerald-400 text-xs font-mono">{log}</div>
                   ))}
                 </div>
              </div>
            )}

          </div>

          <div className="p-6 bg-white border-t border-gray-100 flex justify-end gap-3 shrink-0">
             <Button variant="outline" onClick={onClose} disabled={isProcessing} className="font-bold border-gray-200">
               Annuler
             </Button>
             <Button 
               onClick={handleFusion} 
               disabled={!masterId || isProcessing}
               className="bg-crousty-purple text-white font-black hover:bg-purple-700 shadow-lg"
             >
               {isProcessing ? 'Fusion en cours...' : 'Fusionner maintenant'}
             </Button>
          </div>
          
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
