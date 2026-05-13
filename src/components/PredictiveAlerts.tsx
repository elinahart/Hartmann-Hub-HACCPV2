import React, { useMemo, useState } from 'react';
import { AlertTriangle, ChevronRight, X, Package } from 'lucide-react';
import { useInventaire } from '../providers/InventaireProvider';
import { getStoredData } from '../lib/db';
import { calculateExpectedStock, calculateAdvancedConsumptionMetrics } from '../lib/stockCalculation';
import { differenceInDays } from 'date-fns';
import { Card, Button } from './ui/LightUI';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';

export function PredictiveAlerts() {
  const { products } = useInventaire();
  const [inventories, setInventories] = useState<any[]>([]);
  const [receptions, setReceptions] = useState<any[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);

  React.useEffect(() => {
    const inv = getStoredData<any[]>('crousty_inventory', []).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    const rec = getStoredData<any[]>('crousty_receptions_v3', []).filter((r: any) => !r.supprime);
    setInventories(inv);
    setReceptions(rec);
  }, []);

  const alerts = useMemo(() => {
    if (inventories.length < 1) return { today: [], tomorrow: [] };

    const newest = inventories[0];
    const today: any[] = [];
    const tomorrow: any[] = [];

    products.forEach(p => {
      const lastCounted = newest.items[p.category]?.[p.name];
      if (lastCounted?.na === true) return;

      const expectedStockValue = calculateExpectedStock(p, newest, receptions);
      const metrics = calculateAdvancedConsumptionMetrics(p, inventories, receptions);
      const avgPerDay = metrics.avgPerDay;
      
      const conv = p.conversionCartonUnite || 5;
      const countNum = lastCounted ? (parseInt(lastCounted.units || '0') + parseInt(lastCounted.cartons || '0') * conv) : 0;
      const daysSinceLast = Math.max(0, differenceInDays(Date.now(), new Date(newest.date)));
      
      const stockAtLast = countNum;
      const receivedSinceLast = expectedStockValue - countNum;
      const consumedSinceLast = avgPerDay * daysSinceLast;
      const realEstimatedNow = Math.max(0, stockAtLast + receivedSinceLast - consumedSinceLast);

      if (avgPerDay > 0) {
        const daysRemaining = realEstimatedNow / avgPerDay;
        
        if (daysRemaining <= 0.5) {
          today.push({ ...p, estimated: Math.round(realEstimatedNow), daysRemaining });
        } else if (daysRemaining <= 1.5) {
          tomorrow.push({ ...p, estimated: Math.round(realEstimatedNow), daysRemaining });
        }
      } else if (realEstimatedNow <= 0) {
          if (p.minThreshold > 0) {
             today.push({ ...p, estimated: 0, daysRemaining: 0 });
          }
      }
    });

    return { today, tomorrow };
  }, [inventories, receptions, products]);

  const totalAlerts = alerts.today.length + alerts.tomorrow.length;
  if (totalAlerts === 0) return null;

  const phrase = alerts.today.length > 0 && alerts.tomorrow.length > 0
    ? `Attention, ${totalAlerts} produits seront en rupture aujourd'hui et demain.`
    : alerts.today.length > 0
    ? alerts.today.length === 1 
      ? `Attention, rupture imminente pour ${alerts.today[0].name} aujourd'hui.`
      : `Attention, ${alerts.today.length} produits sont en rupture aujourd'hui.`
    : alerts.tomorrow.length === 1
      ? `Attention, rupture prévue pour ${alerts.tomorrow[0].name} dès demain soir.`
      : `Attention, ${alerts.tomorrow.length} produits seront en rupture demain.`;

  return (
    <>
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-6"
      >
        <button 
          onClick={() => setIsModalOpen(true)}
          className="w-full bg-red-50 border border-red-100 rounded-2xl p-4 flex items-center justify-between gap-4 group hover:bg-red-100/50 transition-colors shadow-sm"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-red-500 text-white flex items-center justify-center shadow-lg shadow-red-200">
              <AlertTriangle size={20} />
            </div>
            <div className="text-left">
              <p className="text-red-900 font-bold text-sm sm:text-base leading-tight">
                {phrase}
              </p>
              <p className="text-red-600/60 text-[11px] font-bold uppercase tracking-wider mt-0.5">
                Cliquer pour voir la liste
              </p>
            </div>
          </div>
          <ChevronRight className="text-red-400 group-hover:translate-x-1 transition-transform" />
        </button>
      </motion.div>

      {isModalOpen && createPortal(
        <div className="fixed inset-0 z-[999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-[2.5rem] w-full max-w-lg overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200 flex flex-col max-h-[90dvh]">
            <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-white sticky top-0 z-10">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-red-50 text-red-500 flex items-center justify-center">
                  <AlertTriangle size={24} />
                </div>
                <div>
                  <h2 className="text-xl font-black text-gray-900 leading-tight">Alertes Rupture</h2>
                  <p className="text-sm text-gray-500 font-medium italic">Basé sur votre consommation réelle</p>
                </div>
              </div>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="w-10 h-10 rounded-xl bg-gray-50 text-gray-400 flex items-center justify-center hover:bg-gray-100 hover:text-gray-600 transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-8 scroll-smooth no-scrollbar">
              {alerts.today.length > 0 && (
                <section>
                  <h3 className="text-red-600 font-black text-xs uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-red-600 animate-pulse" />
                    Rupture aujourd'hui
                  </h3>
                  <div className="space-y-3">
                    {alerts.today.map((p: any) => (
                      <div key={p.id} className="bg-red-50/50 border border-red-100 rounded-2xl p-4 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-white border border-red-100 flex items-center justify-center text-red-500">
                            <Package size={20} />
                          </div>
                          <div>
                            <p className="font-bold text-gray-900">{p.name}</p>
                            <p className="text-xs text-red-600">Stock restant estimé : {p.estimated} {p.unite || 'unité(s)'}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {alerts.tomorrow.length > 0 && (
                <section>
                  <h3 className="text-orange-600 font-black text-xs uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-orange-500" />
                    Rupture demain
                  </h3>
                  <div className="space-y-3">
                    {alerts.tomorrow.map((p: any) => (
                      <div key={p.id} className="bg-orange-50/50 border border-orange-100 rounded-2xl p-4 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-white border border-orange-100 flex items-center justify-center text-orange-500">
                            <Package size={20} />
                          </div>
                          <div>
                            <p className="font-bold text-gray-900">{p.name}</p>
                            <p className="text-xs text-orange-600 font-medium">Sera épuisé demain soir (estimé)</p>
                          </div>
                        </div>
                        <div className="text-right">
                           <p className="text-xs text-gray-400 font-bold">~ {p.estimated} restants</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              )}
            </div>

            <div className="p-6 bg-gray-50 border-t border-gray-100">
               <Button variant="primary" className="w-full h-12 rounded-xl text-lg font-black" onClick={() => setIsModalOpen(false)}>
                  J'ai compris
               </Button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}
