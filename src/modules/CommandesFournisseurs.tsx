import React, { useState, useEffect, useMemo } from 'react';
import { Card, Button, Input } from '../components/ui/LightUI';
import { getStoredData, setStoredData } from '../lib/db';
import { useInventaire } from '../providers/InventaireProvider';
import { ShoppingCart, Download, Mail, ChevronDown, ChevronRight, Package, Calendar, Settings2, Check } from 'lucide-react';
import { format, differenceInDays } from 'date-fns';
import { fr } from 'date-fns/locale';
import { calculateExpectedStock, calculateAdvancedConsumptionMetrics, calculateEstimatedStockNow } from '../lib/stockCalculation';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { useConfig } from '../contexts/ConfigContext';
import { useI18n } from '../lib/i18n';
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';

const DAYS_OF_WEEK = [
  { val: 1, label: 'LUN' },
  { val: 2, label: 'MAR' },
  { val: 3, label: 'MER' },
  { val: 4, label: 'JEU' },
  { val: 5, label: 'VEN' },
  { val: 6, label: 'SAM' },
  { val: 0, label: 'DIM' }
];

const DAY_NAMES: Record<number, string> = {
  1: 'Lundi', 2: 'Mardi', 3: 'Mercredi', 4: 'Jeudi', 5: 'Vendredi', 6: 'Samedi', 0: 'Dimanche'
};

function getDeliveryIntervals(supplierDays: number[], currentDay: number) {
  if (!supplierDays || supplierDays.length === 0) {
    return { daysUntilNext: 0, daysBetweenNextAndAfter: 7, nextDeliveryDayOfWeek: currentDay };
  }
  
  let daysUntilNext = -1;
  const sorted = [...supplierDays].sort((a, b) => a - b);
  for (const d of sorted) {
     if (d > currentDay) {
       daysUntilNext = d - currentDay;
       break;
     }
  }
  if (daysUntilNext === -1) {
    daysUntilNext = (7 - currentDay) + sorted[0];
  }
  
  const nextDeliveryDayOfWeek = (currentDay + daysUntilNext) % 7;
  let daysBetweenNextAndAfter = -1;
  for (const d of sorted) {
    if (d > nextDeliveryDayOfWeek) {
      daysBetweenNextAndAfter = d - nextDeliveryDayOfWeek;
      break;
    }
  }
  if (daysBetweenNextAndAfter === -1) {
    daysBetweenNextAndAfter = (7 - nextDeliveryDayOfWeek) + sorted[0];
  }
  
  return { daysUntilNext, daysBetweenNextAndAfter, nextDeliveryDayOfWeek };
}

export default function CommandesFournisseurs() {
  const { products } = useInventaire();
  const { config } = useConfig();
  const { t } = useI18n();
  const [inventories, setInventories] = useState<any[]>([]);
  const [receptions, setReceptions] = useState<any[]>([]);
  const [expandedSuppliers, setExpandedSuppliers] = useState<Record<string, boolean>>({});
  const [customOrders, setCustomOrders] = useState<Record<string, { orderCartons: number, orderUnits: number }>>({});
  const [globalDeliveryDays, setGlobalDeliveryDays] = useState<number[]>([]);
  const [isEditingGlobalDays, setIsEditingGlobalDays] = useState(false);

  useEffect(() => {
    const inv = getStoredData<any[]>('crousty_inventory', []).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    const rec = getStoredData<any[]>('crousty_receptions_v3', []).filter((r: any) => !r.supprime).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    const gd = getStoredData<number[]>('crousty_global_delivery_days', []);
    setInventories(inv);
    setReceptions(rec);
    setGlobalDeliveryDays(gd);
  }, []);

  const saveGlobalDeliveryDays = (days: number[]) => {
    setGlobalDeliveryDays(days);
    setStoredData('crousty_global_delivery_days', days);
  };

  const ordersBySupplier = useMemo<Record<string, any[]>>(() => {
    if (inventories.length < 1) return {};
    
    const newest = inventories[0];
    const supplierGroups: Record<string, any[]> = {};
    const currentDayOfWeek = new Date().getDay();

    for (const p of products) {
      const fournisseur = p.fournisseur || 'Non assigné';
      const myDeliveryDays = globalDeliveryDays;
      const { daysUntilNext, daysBetweenNextAndAfter, nextDeliveryDayOfWeek } = getDeliveryIntervals(myDeliveryDays, currentDayOfWeek);

      let validNewest = newest;
      let lastCounted = validNewest.items[p.category]?.[p.name];
      
      if (!lastCounted || lastCounted.na) {
        for (let i = 1; i < inventories.length; i++) {
          const pastCount = inventories[i].items[p.category]?.[p.name];
          if (pastCount && !pastCount.na) {
            validNewest = inventories[i];
            lastCounted = pastCount;
            break;
          }
        }
      }

      if (!lastCounted || lastCounted.na) {
        lastCounted = { units: '0', cartons: '0', na: false };
      }

      const expectedStockValue = calculateExpectedStock(p, validNewest, receptions);
      const metrics = calculateAdvancedConsumptionMetrics(p, inventories, receptions);
      const avgPerDay = metrics.avgPerDay;
      
      const conv = p.conversionCartonUnite || 5;
      const parsedUnits = parseFloat(String(lastCounted.units || '0').replace(',', '.'));
      const parsedCartons = parseFloat(String(lastCounted.cartons || '0').replace(',', '.'));
      const safeUnits = isNaN(parsedUnits) ? 0 : parsedUnits;
      const safeCartons = isNaN(parsedCartons) ? 0 : parsedCartons;
      const countNum = safeUnits + safeCartons * conv;
      
      const daysSinceLast = Math.max(0, differenceInDays(Date.now(), new Date(validNewest.date)));
      
      const stockAtLast = countNum;
      const receivedSinceLast = expectedStockValue - countNum;
      const realEstimatedNow = calculateEstimatedStockNow(p, validNewest, receptions, avgPerDay);

      // Calcul IA avec jours de livraisons =======================
      
      // 1. Stock projeté au moment de la livraison
      const projectedStockAtDelivery = Math.max(0, realEstimatedNow - (avgPerDay * daysUntilNext));
      
      // 2. Besoin pour tenir jusqu'à la livraison SUIVANTE (+ stock secu)
      const targetStock = Math.max(Math.ceil(avgPerDay * daysBetweenNextAndAfter), p.minThreshold || 0);

      const recommendedOrder = Math.max(0, targetStock - Math.round(projectedStockAtDelivery));

      let orderCartons = 0;
      let orderUnits = recommendedOrder;
      
      if (conv > 1 && (p.unite === 'Carton' || p.unite === 'Colis' || recommendedOrder >= conv)) {
        orderCartons = Math.floor(recommendedOrder / conv);
        orderUnits = recommendedOrder % conv;
      } else {
        orderCartons = 0;
        orderUnits = recommendedOrder;
      }

      let isModified = false;
      if (customOrders[p.name]) {
         orderCartons = customOrders[p.name].orderCartons;
         orderUnits = customOrders[p.name].orderUnits;
         isModified = true;
      }

      // On affiche les fournisseurs si on y a commandé quelque chose.
      if (recommendedOrder > 0 || (isModified && (orderCartons > 0 || orderUnits > 0))) {
        if (!supplierGroups[fournisseur]) {
          supplierGroups[fournisseur] = [];
        }

        if (recommendedOrder > 0 || (isModified && (orderCartons > 0 || orderUnits > 0))) {
           supplierGroups[fournisseur].push({
             product: p,
             recommendedOrder,
             orderCartons,
             orderUnits,
             isModified,
             estimatedNow: Math.round(realEstimatedNow),
             projectedStockAtDelivery: Math.round(projectedStockAtDelivery),
             targetStock,
             daysUntilNext,
             daysBetweenNextAndAfter,
             nextDeliveryDayOfWeek
           });
        }
      }
    }

    return supplierGroups;
  }, [inventories, receptions, products, customOrders, globalDeliveryDays]);

  const toggleSupplier = (supplier: string) => {
    setExpandedSuppliers(prev => ({ ...prev, [supplier]: !prev[supplier] }));
  };

  const updateCustomOrder = (productName: string, field: 'orderCartons' | 'orderUnits', valStr: string) => {
    let val = parseInt(valStr || '0');
    if (isNaN(val)) val = 0;
    setCustomOrders(prev => {
      const existing = prev[productName] || { 
        orderCartons: ordersBySupplier[Object.keys(ordersBySupplier).find(k => ordersBySupplier[k].some(i => i.product.name === productName)) || '']?.find(i => i.product.name === productName)?.orderCartons || 0,
        orderUnits: ordersBySupplier[Object.keys(ordersBySupplier).find(k => ordersBySupplier[k].some(i => i.product.name === productName)) || '']?.find(i => i.product.name === productName)?.orderUnits || 0
      };
      
      return {
        ...prev,
        [productName]: {
          ...existing,
          [field]: val
        }
      };
    });
  };

  const generateEmail = (supplier: string, items: any[]) => {
    let body = `Bonjour,\n\nVoici notre commande pour aujourd'hui :\n\n`;
    
    items.forEach(item => {
      let qteStr = "";
      if (item.orderCartons > 0 && item.orderUnits > 0) {
          qteStr = `${item.orderCartons} Carton(s) + ${item.orderUnits} Unité(s)`;
      } else if (item.orderCartons > 0) {
          qteStr = `${item.orderCartons} Carton(s)`;
      } else {
          qteStr = `${item.orderUnits} Unité(s)`;
      }
      body += `- ${item.product.name} : ${qteStr}\n`;
    });
    
    body += `\nMerci de nous confirmer la bonne réception de cette commande.\n\nCordialement,\n${config.restaurant?.nom || 'Le Restaurant'}`;
    
    const subject = encodeURIComponent(`Commande - ${config.restaurant?.nom || 'Restaurant'}`);
    const encodedBody = encodeURIComponent(body);
    
    window.location.href = `mailto:?subject=${subject}&body=${encodedBody}`;
  };

  const hexToRgb = (hex: string): [number, number, number] => {
    let r = 0, g = 0, b = 0;
    if (hex.length === 4) {
      r = parseInt(hex[1] + hex[1], 16);
      g = parseInt(hex[2] + hex[2], 16);
      b = parseInt(hex[3] + hex[3], 16);
    } else if (hex.length === 7) {
      r = parseInt(hex.substring(1, 3), 16);
      g = parseInt(hex.substring(3, 5), 16);
      b = parseInt(hex.substring(5, 7), 16);
    }
    return [r, g, b];
  };

  const generatePDF = (supplier: string, items: any[]) => {
    const doc = new jsPDF();
    const restoName = config.restaurant?.nom || 'Restaurant';
    const primaryColor = hexToRgb(config.colors?.primary || '#5b10aa');
    
    doc.setFillColor(...primaryColor);
    doc.rect(0, 0, 210, 30, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(22);
    doc.setFont("helvetica", "bold");
    doc.text(`Bon de commande`, 14, 20);
    
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(0, 0, 0);
    
    doc.text(`Date : ${format(new Date(), 'dd MMMM yyyy', { locale: fr })}`, 14, 40);
    doc.text(`Établissement : ${restoName}`, 14, 46);
    doc.setFont("helvetica", "bold");
    doc.text(`Fournisseur : ${supplier}`, 14, 54);
    
    autoTable(doc, {
      startY: 60,
      head: [['Produit', 'Conditionnement', 'Quantité à commander']],
      body: items.map(item => {
        let qteStr = "";
        if (item.orderCartons > 0 && item.orderUnits > 0) {
            qteStr = `${item.orderCartons} Crt + ${item.orderUnits} Unité(s)`;
        } else if (item.orderCartons > 0) {
            qteStr = `${item.orderCartons} Carton(s)`;
        } else {
            qteStr = `${item.orderUnits} Unité(s)`;
        }

        return [
          item.product.name,
          `${item.product.conversionCartonUnite || 5} / Carton`,
          qteStr
        ];
      }),
      theme: 'grid',
      headStyles: { fillColor: primaryColor, textColor: [255, 255, 255] },
      styles: { fontSize: 10, cellPadding: 4 }
    });

    doc.save(`Commande_${supplier.replace(/\s+/g, '_')}_${format(new Date(), 'yyyy-MM-dd')}.pdf`);
  };

  const renderGlobalDeliveryDaysSelector = () => {
    const activeDays = globalDeliveryDays;
    const toggleDay = (dayVal: number) => {
       const has = activeDays.includes(dayVal);
       const next = has ? activeDays.filter(d => d !== dayVal) : [...activeDays, dayVal];
       saveGlobalDeliveryDays(next);
    };

    return (
      <Card className="mb-6 border-0 shadow-sm overflow-hidden bg-white">
         <div className="bg-indigo-50/30 p-4 flex items-center justify-between cursor-pointer hover:bg-indigo-50/50 transition-colors" onClick={() => setIsEditingGlobalDays(!isEditingGlobalDays)}>
           <div className="flex items-center gap-3">
             <div className="p-2 bg-indigo-100 rounded-xl">
               <Calendar size={20} className="text-indigo-600" />
             </div>
             <div>
               <h3 className="font-bold text-gray-900 leading-tight">Jours de livraison globaux</h3>
               <p className="text-xs text-gray-500 font-medium mt-0.5">
                  {activeDays.length > 0 
                      ? `${activeDays.length} jour(s) sélectionné(s)` 
                      : 'Aucun jour défini'}
               </p>
             </div>
           </div>
           <Button variant="ghost" className="rounded-full w-10 h-10 p-0 text-gray-400 border border-gray-200">
             {isEditingGlobalDays ? <ChevronDown size={20} /> : <ChevronRight size={20} />}
           </Button>
         </div>
         
         <AnimatePresence>
           {isEditingGlobalDays && (
             <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }} className="overflow-hidden">
               <div className="p-4 bg-white border-t border-indigo-50">
                  <p className="text-sm text-gray-600 mb-4 font-medium">Sélectionnez les jours prévus pour vos prochaines livraisons. L'IA calculera les quantités nécessaires pour tenir jusqu'à ces jours-là.</p>
                  <div className="grid grid-cols-4 sm:flex sm:flex-wrap gap-2">
                    {DAYS_OF_WEEK.map(d => {
                       const isActive = activeDays.includes(d.val);
                       return (
                         <button
                           key={d.val}
                           onClick={(e) => { e.stopPropagation(); toggleDay(d.val); }}
                           className={cn(
                             "flex-1 min-w-[4rem] py-3 flex flex-col items-center gap-1.5 rounded-xl border-2 transition-all font-bold text-xs uppercase tracking-wider relative",
                             isActive ? "bg-indigo-50 border-indigo-500 text-indigo-700 shadow-sm" : "bg-white border-gray-100 text-gray-500 hover:border-gray-200 hover:bg-gray-50"
                           )}
                         >
                           {isActive && (
                             <div className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-indigo-500 rounded-full flex items-center justify-center shadow-sm">
                               <Check size={10} className="text-white" />
                             </div>
                           )}
                           {d.label}
                         </button>
                       )
                    })}
                  </div>
               </div>
             </motion.div>
           )}
         </AnimatePresence>
      </Card>
    );
  };

  return (
    <div className="p-4 space-y-6 max-w-4xl mx-auto relative w-full pb-20">
      <header className="px-6 py-8 mb-6 bg-white border-b border-gray-100 rounded-b-[2rem] shadow-sm">
        <div className="flex items-center gap-4 mb-4">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-50 to-indigo-100/50 flex items-center justify-center text-indigo-600 shadow-sm border border-indigo-100/50">
            <ShoppingCart size={24} />
          </div>
          <div>
            <h1 className="text-2xl font-black text-gray-900 tracking-tight">{t('nav_orders')}</h1>
            <p className="text-sm font-medium text-gray-500">Générateur intelligent basé sur l'IA</p>
          </div>
        </div>
      </header>

      {renderGlobalDeliveryDaysSelector()}

      {inventories.length === 0 ? (
        <Card className="p-8 text-center text-gray-500 bg-white border-dashed border-2">
          Impossible de générer des commandes : Aucun inventaire n'a été réalisé.
        </Card>
      ) : Object.keys(ordersBySupplier).length === 0 ? (
        <Card className="p-8 text-center text-gray-500 bg-white shadow-sm border-0">
          <Package size={48} className="mx-auto mb-4 text-gray-300" />
          <h3 className="text-lg font-bold text-gray-900">Stock optimal</h3>
          <p>L'IA n'a détecté aucune commande nécessaire pour aujourd'hui.</p>
        </Card>
      ) : (
        <div className="space-y-4">
          {Object.entries(ordersBySupplier).map(([supplier, items]: [string, any[]]) => {
            const isExpanded = expandedSuppliers[supplier];
            const hasDeliverySettings = globalDeliveryDays.length > 0;
            const nextDayOfWeeek = items[0]?.nextDeliveryDayOfWeek;
            
            return (
              <Card key={supplier} className="overflow-hidden border-0 shadow-sm">
                <div 
                  className="bg-white p-4 flex items-center justify-between cursor-pointer hover:bg-gray-50 transition-colors"
                  onClick={() => toggleSupplier(supplier)}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center">
                      <ShoppingCart size={20} />
                    </div>
                    <div>
                      <h3 className="font-bold text-gray-900 uppercase tracking-wide flex items-center gap-2">
                        {supplier}
                        {hasDeliverySettings && nextDayOfWeeek !== undefined && items.length > 0 && (
                          <span className="text-[9px] bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full font-black uppercase tracking-widest flex items-center gap-1">
                             <Calendar size={10} /> Livraison {DAY_NAMES[nextDayOfWeeek]}
                          </span>
                        )}
                      </h3>
                      <p className="text-xs text-gray-500 font-medium">{items.length} produit(s) à commander</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 sm:gap-4">
                    <div className="hidden sm:flex items-center gap-2">
                      <Button 
                        variant="outline" 
                        className="gap-2 h-10"
                        onClick={(e) => {
                          e.stopPropagation();
                          generateEmail(supplier, items);
                        }}
                      >
                        <Mail size={16} /> Email
                      </Button>
                      <Button 
                        variant="primary" 
                        className="gap-2 h-10"
                        onClick={(e) => {
                          e.stopPropagation();
                          generatePDF(supplier, items);
                        }}
                      >
                        <Download size={16} /> PDF
                      </Button>
                    </div>
                    {isExpanded ? <ChevronDown size={20} className="text-gray-400" /> : <ChevronRight size={20} className="text-gray-400" />}
                  </div>
                </div>

                {isExpanded && (
                  <div className="bg-gray-50 border-t border-gray-100 p-4">
                    {items.length === 0 ? (
                      <p className="text-sm text-gray-500 font-medium text-center py-4">
                         Rien à commander pour ce fournisseur.
                      </p>
                    ) : (
                      <div className="space-y-2">
                        {items.map((item, idx) => {
                           let qteStr = "";
                           if (item.orderCartons > 0 && item.orderUnits > 0) {
                               qteStr = `${item.orderCartons} Crt + ${item.orderUnits} Unité(s)`;
                           } else if (item.orderCartons > 0) {
                               qteStr = `${item.orderCartons} Carton(s)`;
                           } else {
                               qteStr = `${item.orderUnits} Unité(s)`;
                           }

                          return (
                            <div key={idx} className="flex flex-col sm:flex-row sm:items-center justify-between bg-white p-3 rounded-lg border border-gray-200 gap-3 relative overflow-hidden group">
                              <div className="flex-1">
                                  <div className="flex items-center gap-2">
                                    <p className="font-bold text-gray-900 text-sm">{item.product.name}</p>
                                    {item.isModified && <span className="text-[10px] bg-orange-100 text-orange-600 px-1.5 py-0.5 rounded-full font-bold uppercase tracking-widest shadow-sm">Modifié</span>}
                                  </div>
                                  <div className="flex flex-wrap gap-2 mt-1">
                                    <span className="text-[10px] text-gray-500 font-medium bg-gray-50 px-1.5 py-0.5 rounded-md border border-gray-100" title="Stock théorique actuel">
                                      Stock actuel: {item.estimatedNow}
                                    </span>
                                    {item.daysUntilNext > 0 && (
                                       <span className="text-[10px] text-orange-600 font-bold bg-orange-50 px-1.5 py-0.5 rounded-md border border-orange-100" title={`Consommation estimée d'ici la livraison (${item.daysUntilNext} jours)`}>
                                         Stock à la livraison: {item.projectedStockAtDelivery}
                                       </span>
                                    )}
                                    <span className="text-[10px] text-indigo-600 font-bold bg-indigo-50 px-1.5 py-0.5 rounded-md border border-indigo-100">
                                      Besoin pour {item.daysBetweenNextAndAfter} j. ({DAY_NAMES[item.nextDeliveryDayOfWeek]?.substring(0,3).toUpperCase()} ➔ {DAY_NAMES[(item.nextDeliveryDayOfWeek + item.daysBetweenNextAndAfter) % 7]?.substring(0,3).toUpperCase()}): {item.targetStock}
                                    </span>
                                  </div>
                              </div>
                              <div className="flex items-center gap-2 justify-end">
                                 {(item.product.uniteAchat === 'Carton' || item.product.uniteAchat === 'Colis' || item.orderCartons > 0 || (item.product.conversionCartonUnite || 0) > 1) && (
                                    <div className="flex flex-col items-center">
                                      <span className="text-[10px] text-gray-400 font-bold uppercase mb-0.5">{item.product.uniteAchat || 'Cartons'}</span>
                                      <div className="flex items-center bg-gray-50 rounded-lg p-0.5">
                                        <input type="text" inputMode="none" data-keyboard="numeric" className="w-10 text-center bg-transparent border-none font-bold text-sm text-indigo-700" value={item.orderCartons} onChange={(e) => updateCustomOrder(item.product.name, 'orderCartons', e.target.value)} />
                                      </div>
                                    </div>
                                 )}
                                 <div className="flex flex-col items-center">
                                   <span className="text-[10px] text-gray-400 font-bold uppercase mb-0.5">{item.product.uniteStock || 'Unités'}</span>
                                   <div className="flex items-center bg-gray-50 rounded-lg p-0.5">
                                     <input type="text" inputMode="none" data-keyboard="numeric" className="w-10 text-center bg-transparent border-none font-bold text-sm text-indigo-700" value={item.orderUnits} onChange={(e) => updateCustomOrder(item.product.name, 'orderUnits', e.target.value)} />
                                   </div>
                                 </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                    
                    <div className="sm:hidden grid grid-cols-2 gap-2 mt-4 pt-4 border-t border-gray-200">
                       <Button 
                          variant="outline" 
                          className="gap-2 h-10 w-full justify-center"
                          onClick={(e) => {
                            e.stopPropagation();
                            generateEmail(supplier, items);
                          }}
                        >
                          <Mail size={16} /> Email
                        </Button>
                        <Button 
                          variant="primary" 
                          className="gap-2 h-10 w-full justify-center"
                          onClick={(e) => {
                            e.stopPropagation();
                            generatePDF(supplier, items);
                          }}
                        >
                          <Download size={16} /> PDF
                        </Button>
                    </div>

                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
