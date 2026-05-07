import React, { useState, useEffect, useMemo } from 'react';
import { Card, Button } from '../components/ui/LightUI';
import { getStoredData } from '../lib/db';
import { useInventaire } from '../providers/InventaireProvider';
import { Brain, TrendingUp, AlertTriangle, ArrowRight, Package, TrendingDown, Clock, Search, X, Edit2, Calendar } from 'lucide-react';
import { format, differenceInDays } from 'date-fns';
import { fr } from 'date-fns/locale';
import { InventoryProduct } from '../types';
import { createPortal } from 'react-dom';
import { calculateExpectedStock, calculateConsumptionRate } from '../lib/stockCalculation';

interface InvItems {
  [category: string]: {
    [item: string]: { units: string, cartons: string, na: boolean }
  }
}

export default function InventaireIntelligent() {
  const { products } = useInventaire();
  const [inventories, setInventories] = useState<any[]>([]);
  const [receptions, setReceptions] = useState<any[]>([]);
  const [compareCount, setCompareCount] = useState<number>(2);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedProductStat, setSelectedProductStat] = useState<any | null>(null);

  useEffect(() => {
    const inv = getStoredData<any[]>('crousty_inventory', []).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    const rec = getStoredData<any[]>('crousty_receptions_v3', []).filter((r: any) => !r.supprime).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    setInventories(inv);
    setReceptions(rec);
  }, []);

  const analysis = useMemo(() => {
    if (inventories.length < 1) return null;
    
    const newest = inventories[0];
    const results = [];

    for (const p of products) {
      const expectedStockValue = calculateExpectedStock(p, newest, receptions);
      const avgPerDay = calculateConsumptionRate(p, inventories, receptions);
      
      const lastCounted = newest.items[p.category]?.[p.name];
      const conv = p.conversionCartonUnite || 5;
      const countNum = lastCounted ? (parseInt(lastCounted.units || '0') + parseInt(lastCounted.cartons || '0') * conv) : 0;
      
      const daysSinceLast = Math.max(0, differenceInDays(Date.now(), new Date(newest.date)));
      
      const stockAtLast = countNum;
      const receivedSinceLast = expectedStockValue - countNum;
      const consumedSinceLast = avgPerDay * daysSinceLast;
      const realEstimatedNow = Math.max(0, stockAtLast + receivedSinceLast - consumedSinceLast);

      const daysUntilEmpty = avgPerDay > 0 ? realEstimatedNow / avgPerDay : 999;
      const isRisk = daysUntilEmpty <= 3;
      
      // Anomaly detection
      const hasAnomaly = (receivedSinceLast > 0 && avgPerDay === 0 && daysSinceLast > 7) || (realEstimatedNow < 0);

      results.push({
        product: p,
        expectedStock: stockAtLast + receivedSinceLast,
        estimatedNow: Math.round(realEstimatedNow),
        countNum: stockAtLast,
        receivedSinceLast,
        avgPerDay,
        daysUntilEmpty,
        isRisk,
        hasAnomaly,
        lastInventoryDate: newest.date
      });
    }

    results.sort((a, b) => {
      if (a.hasAnomaly && !b.hasAnomaly) return -1;
      if (!a.hasAnomaly && b.hasAnomaly) return 1;
      if (a.isRisk && !b.isRisk) return -1;
      if (!a.isRisk && b.isRisk) return 1;
      return a.daysUntilEmpty - b.daysUntilEmpty;
    });

    return {
      stats: results
    };
  }, [inventories, receptions, products]);

  const handleCorrectAnomaly = (productName: string) => {
    sessionStorage.setItem('crousty_inventory_search', productName);
    window.dispatchEvent(new CustomEvent('navigate-to', { detail: 'inventaire' }));
  };

  const filteredStats = analysis?.stats.filter(s => s.product.name.toLowerCase().includes(searchQuery.toLowerCase())) || [];

  return (
    <div className="space-y-6 pb-20 pt-8 animate-in fade-in">
      <div className="flex items-center gap-3 px-2">
        <Brain className="text-crousty-purple" size={32} />
        <div>
          <h2 className="text-2xl font-black text-gray-900 uppercase tracking-widest">IA Inventaire</h2>
          <p className="text-sm font-bold text-gray-500">Stock attendu et anomalies détectées</p>
        </div>
      </div>

      <div className="px-2 grid grid-cols-1 md:grid-cols-2 gap-4">
        <Button 
          className="w-full h-12 rounded-xl text-sm font-black shadow-md active:scale-95 flex items-center justify-center gap-2"
          onClick={() => {
             sessionStorage.setItem('crousty_start_smart_inventory', 'true');
             window.dispatchEvent(new CustomEvent('navigate-to', { detail: 'inventaire' }));
          }}
        >
          <Brain size={18} /> Inventaire Pré-rempli (IA)
        </Button>
        <div className="bg-white border border-gray-100 p-4 rounded-xl flex items-center justify-between shadow-sm">
           <div className="flex items-center gap-2">
             <Calendar className="text-crousty-purple" size={18} />
             <span className="text-sm font-black text-gray-800 uppercase tracking-wider">{format(new Date(), 'EEEE d MMMM', { locale: fr })}</span>
           </div>
           {analysis?.stats.filter(s => s.hasAnomaly).length > 0 && (
             <div className="bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-[10px] font-black uppercase animate-pulse">
                {analysis.stats.filter(s => s.hasAnomaly).length} Anomalies
             </div>
           )}
        </div>
      </div>

      {!analysis || analysis.stats.length === 0 ? (
        <Card className="bg-white p-12 rounded-[2rem] flex flex-col items-center justify-center text-center shadow-sm border border-gray-100 max-w-2xl mx-auto mt-12">
          <div className="w-24 h-24 mb-6 rounded-full bg-gray-50 flex items-center justify-center border-4 border-white shadow-sm ring-1 ring-gray-100">
            <Brain size={48} className="text-gray-300" />
          </div>
          <h3 className="text-xl font-black text-gray-800 mb-3 tracking-tight">Pas assez de données</h3>
          <p className="text-sm font-bold text-gray-500 leading-relaxed max-w-md">
            L'Intelligence Artificielle a besoin d'au moins un inventaire précédent et des livraisons pour calculer les stocks attendus.
          </p>
        </Card>
      ) : (
        <>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 px-2">
             <div className="flex-1">
                <h3 className="font-black text-lg text-gray-800 uppercase leading-none">Analyse des Stocks</h3>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">Comparaison temps réel livraisons / inventaires.</p>
             </div>
             <div className="relative w-full sm:w-64 shrink-0">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                <input
                  type="text"
                  placeholder="Chercher un produit..."
                  className="w-full pl-9 pr-4 py-3 sm:py-2.5 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-crousty-purple/50 outline-none text-sm font-bold transition-all shadow-sm"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                />
             </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 px-2">
            {filteredStats.map((s, idx) => {
              const p = s.product;
              return (
                <div 
                  key={idx} 
                  onClick={() => setSelectedProductStat(s)}
                  className={`p-4 rounded-2xl border transition-all cursor-pointer hover:bg-gray-50/50 bg-white relative overflow-hidden group ${s.hasAnomaly ? 'border-blue-200 bg-blue-50/20' : s.isRisk ? 'border-red-200' : 'border-gray-100 shadow-sm'}`}
                >
                  <div className="flex items-center justify-between mb-4">
                     <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${s.hasAnomaly ? 'bg-blue-100 text-blue-600' : s.isRisk ? 'bg-red-50 text-red-500' : 'bg-gray-50 text-gray-400'}`}>
                        {s.hasAnomaly ? <AlertTriangle size={20} /> : <Package size={20} />}
                     </div>
                     <div className="text-right">
                        <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Stock Attendu</div>
                        <div className="text-xl font-black text-gray-900 leading-none">{s.estimatedNow} <span className="text-[10px] text-gray-400">{(p.uniteStock || 'u.').toLowerCase()}</span></div>
                     </div>
                  </div>

                  <h4 className="font-black text-sm text-gray-800 mb-2 truncate">{p.name}</h4>

                  <div className="flex items-center justify-between mt-auto pt-2 border-t border-gray-100">
                     <div className="flex items-center gap-1.5">
                        <Clock size={12} className="text-gray-400" />
                        <span className={`text-[10px] font-black uppercase tracking-tighter ${s.isRisk ? 'text-red-500' : 'text-gray-500'}`}>
                           {s.daysUntilEmpty > 90 ? 'Sécurisé' : `~${s.daysUntilEmpty.toFixed(0)} jours`}
                        </span>
                     </div>
                     {s.hasAnomaly && (
                        <div className="text-[9px] font-black bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full uppercase">Anomalie</div>
                     )}
                  </div>
                </div>
              );
            })}
          </div>

          {selectedProductStat && createPortal(
            <div className="fixed inset-0 z-[6000] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in zoom-in duration-200">
               <Card className="w-full max-w-lg p-0 overflow-hidden shadow-2xl relative">
                  <div className="p-4 sm:p-6 border-b border-gray-100 flex justify-between items-start bg-white">
                    <div className="flex items-center gap-3">
                       <div className={`w-12 h-12 rounded-xl flex items-center justify-center border shadow-sm ${selectedProductStat.isRisk ? 'bg-red-50 border-red-100' : 'bg-gray-50 border-gray-100'}`}>
                          <Package size={24} className={selectedProductStat.isRisk ? 'text-red-500' : 'text-gray-400'} />
                       </div>
                       <div>
                          <h3 className="text-xl font-black text-gray-900 leading-tight">{selectedProductStat.product.name}</h3>
                          <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest bg-gray-100 px-2 py-0.5 rounded-full">{selectedProductStat.product.category}</span>
                       </div>
                    </div>
                    <button onClick={() => setSelectedProductStat(null)} className="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-500">
                      <X size={20}/>
                    </button>
                  </div>

                  <div className="p-4 sm:p-6 space-y-6 bg-gray-50/50">
                    {selectedProductStat.hasAnomaly && (
                       <div className="bg-blue-50 border border-blue-200 p-3 rounded-xl flex items-start gap-3">
                          <AlertTriangle className="text-blue-500 shrink-0 mt-0.5" size={18} />
                          <div>
                             <div className="text-sm font-black text-blue-800">Incohérence détectée</div>
                             <div className="text-xs text-blue-600 font-medium">Les livraisons saisies ne semblent pas correspondre à l'évolution du stock.</div>
                          </div>
                       </div>
                    )}
                    
                    <div className="grid grid-cols-2 gap-3">
                        <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
                           <div className="text-[10px] text-gray-500 uppercase font-black tracking-widest mb-1">Dernier Comptage</div>
                           <div className="font-black text-gray-900 text-2xl">{selectedProductStat.countNum} <span className="text-[10px] uppercase font-bold text-gray-400">{(selectedProductStat.product.uniteStock || 'u.').toLowerCase()}</span></div>
                           <div className="text-[9px] text-gray-400 font-bold mt-1">Le {format(new Date(selectedProductStat.lastInventoryDate), 'dd/MM')}</div>
                        </div>
                        <div className="bg-white p-4 rounded-2xl border border-blue-100 shadow-sm">
                           <div className="text-[10px] text-blue-600 uppercase font-black tracking-widest mb-1">+ Livré depuis</div>
                           <div className="font-black text-blue-900 text-2xl">{selectedProductStat.receivedSinceLast} <span className="text-[10px] uppercase font-bold text-blue-400">{(selectedProductStat.product.uniteStock || 'u.').toLowerCase()}</span></div>
                        </div>
                        <div className="bg-indigo-50 p-4 rounded-2xl border border-indigo-100 shadow-sm">
                           <div className="text-[10px] text-indigo-600 uppercase font-black tracking-widest mb-1">= Stock Attendu</div>
                           <div className="font-black text-indigo-900 text-2xl">{selectedProductStat.expectedStock} <span className="text-[10px] uppercase font-bold text-indigo-400">{(selectedProductStat.product.uniteStock || 'u.').toLowerCase()}</span></div>
                        </div>
                        <div className={`p-4 rounded-2xl border shadow-sm relative overflow-hidden ${selectedProductStat.hasAnomaly ? 'bg-orange-50 border-orange-200' : 'bg-gray-50 border-gray-100'}`}>
                           <div className="text-[10px] uppercase font-black tracking-widest mb-1">Estimation IA</div>
                           <div className="font-black text-2xl">{selectedProductStat.estimatedNow} <span className="text-[10px] uppercase font-bold opacity-50">{(selectedProductStat.product.uniteStock || 'u.').toLowerCase()}</span></div>
                        </div>
                    </div>

                    <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm space-y-4">
                       <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                             <div className="w-10 h-10 rounded-full bg-gray-50 border border-gray-100 flex items-center justify-center">
                               {selectedProductStat.avgPerDay > 0 ? <TrendingDown size={18} className="text-crousty-purple" /> : <TrendingUp size={18} className="text-gray-400" />}
                             </div>
                             <div>
                                <div className="text-[10px] text-gray-500 font-black uppercase tracking-widest leading-none mb-1">Consommation Réelle</div>
                                <div className="font-black text-gray-800 text-lg">{selectedProductStat.avgPerDay.toFixed(2)} <span className="text-[10px] text-gray-400 font-medium uppercase tracking-wider">{(selectedProductStat.product.uniteStock || 'u.')} / jr</span></div>
                             </div>
                          </div>
                          <div className="text-right">
                             <div className="text-[10px] text-gray-500 font-black uppercase tracking-widest leading-none mb-1">Autonomie</div>
                             <div className={`font-black text-lg ${selectedProductStat.isRisk ? 'text-red-600' : 'text-emerald-600'}`}>{selectedProductStat.daysUntilEmpty > 90 ? 'Safe' : `~${selectedProductStat.daysUntilEmpty.toFixed(0)}j`}</div>
                          </div>
                       </div>
                    </div>

                    <Button 
                      className="w-full bg-gray-900 border border-gray-900 text-white gap-2 font-black h-12 uppercase text-xs tracking-widest shadow-lg rounded-xl"
                      onClick={() => handleCorrectAnomaly(selectedProductStat.product.name)}
                    >
                      <Edit2 size={16} /> {selectedProductStat.hasAnomaly ? 'Corriger Anomaly' : 'Vérifier Stock'}
                    </Button>
                  </div>

                  <div className="p-4 border-t border-gray-100 bg-white">
                     <Button variant="outline" className="w-full h-12 rounded-xl text-xs font-black uppercase" onClick={() => setSelectedProductStat(null)}>Fermer</Button>
                  </div>
               </Card>
            </div>,
            document.body
          )}
        </>
      )}
    </div>
  );
}
