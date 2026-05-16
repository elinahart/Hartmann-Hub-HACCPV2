import React, { useState, useEffect, useMemo } from 'react';
import { Card, Button, Input } from '../components/ui/LightUI';
import { getStoredData } from '../lib/db';
import { useInventaire } from '../providers/InventaireProvider';
import { ShoppingCart, Download, Mail, ChevronDown, ChevronRight, Package } from 'lucide-react';
import { format, differenceInDays } from 'date-fns';
import { fr } from 'date-fns/locale';
import { calculateExpectedStock, calculateAdvancedConsumptionMetrics, calculateEstimatedStockNow } from '../lib/stockCalculation';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { useConfig } from '../contexts/ConfigContext';
import { useI18n } from '../lib/i18n';

export default function CommandesFournisseurs() {
  const { products } = useInventaire();
  const { config } = useConfig();
  const { t } = useI18n();
  const [inventories, setInventories] = useState<any[]>([]);
  const [receptions, setReceptions] = useState<any[]>([]);
  const [expandedSuppliers, setExpandedSuppliers] = useState<Record<string, boolean>>({});
  const [customOrders, setCustomOrders] = useState<Record<string, { orderCartons: number, orderUnits: number }>>({});

  useEffect(() => {
    const inv = getStoredData<any[]>('crousty_inventory', []).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    const rec = getStoredData<any[]>('crousty_receptions_v3', []).filter((r: any) => !r.supprime).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    setInventories(inv);
    setReceptions(rec);
  }, []);

  const ordersBySupplier = useMemo<Record<string, any[]>>(() => {
    if (inventories.length < 1) return {};
    
    const newest = inventories[0];
    const supplierGroups: Record<string, any[]> = {};

    for (const p of products) {
      const fournisseur = p.fournisseur || 'Non assigné';

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

      const targetStock = Math.max(Math.ceil(avgPerDay * 7), p.minThreshold || 0);
      const recommendedOrder = Math.max(0, targetStock - Math.round(realEstimatedNow));

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

      if (recommendedOrder > 0 || (isModified && (orderCartons > 0 || orderUnits > 0))) {
        if (!supplierGroups[fournisseur]) {
          supplierGroups[fournisseur] = [];
        }

        supplierGroups[fournisseur].push({
          product: p,
          recommendedOrder,
          orderCartons,
          orderUnits,
          isModified,
          estimatedNow: Math.round(realEstimatedNow)
        });
      }
    }
    
    return supplierGroups;
  }, [inventories, receptions, products, customOrders]);

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

    doc.save(`Commande_${supplier.replace(/\\s+/g, '_')}_${format(new Date(), 'yyyy-MM-dd')}.pdf`);
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
                      <h3 className="font-bold text-gray-900 uppercase tracking-wide">{supplier}</h3>
                      <p className="text-xs text-gray-500 font-medium">{items.length} produit(s) à commander</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
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
                    {isExpanded ? <ChevronDown size={20} className="text-gray-400" /> : <ChevronRight size={20} className="text-gray-400" />}
                  </div>
                </div>

                {isExpanded && (
                  <div className="bg-gray-50 border-t border-gray-100 p-4">
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
                          <div key={idx} className="flex flex-col sm:flex-row sm:items-center justify-between bg-white p-3 rounded-lg border border-gray-200 gap-3">
                            <div>
                                <div className="flex items-center gap-2">
                                  <p className="font-bold text-gray-900 text-sm">{item.product.name}</p>
                                  {item.isModified && <span className="text-[10px] bg-orange-100 text-orange-600 px-1.5 py-0.5 rounded-full font-bold uppercase">Modifié</span>}
                                </div>
                                <p className="text-xs text-gray-500">Stock estimé : {item.estimatedNow} {item.product.unite}</p>
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
