import React, { useState, useEffect, useMemo } from 'react';
import { Card, Button, Input } from '../components/ui/LightUI';
import { getStoredData, setStoredData } from '../lib/db';
import { useInventaire } from '../providers/InventaireProvider';
import { useAuth } from '../contexts/AuthContext';
import { Brain, TrendingUp, AlertTriangle, ArrowRight, Package, TrendingDown, Clock, Search, X, Edit2, Calendar, FileText, Lock, Check } from 'lucide-react';
import { format, differenceInDays } from 'date-fns';
import { fr } from 'date-fns/locale';
import { InventoryProduct } from '../types';
import { createPortal } from 'react-dom';
import { calculateExpectedStock, calculateAdvancedConsumptionMetrics } from '../lib/stockCalculation';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { useConfig } from '../contexts/ConfigContext';
import { useI18n } from '../lib/i18n';

interface InvItems {
  [category: string]: {
    [item: string]: { units: string, cartons: string, na: boolean }
  }
}

export default function InventaireIntelligent() {
  const { products } = useInventaire();
  const { config } = useConfig();
  const { t } = useI18n();
  const { currentUser } = useAuth();
  const isReadOnly = currentUser?.role !== 'manager';
  const [inventories, setInventories] = useState<any[]>([]);
  const [receptions, setReceptions] = useState<any[]>([]);
  const [compareCount, setCompareCount] = useState<number>(2);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedProductStat, setSelectedProductStat] = useState<any | null>(null);
  const [isCorrectionModalOpen, setIsCorrectionModalOpen] = useState(!1);
  const [correctionUnits, setCorrectionUnits] = useState('0');
  const [correctionCartons, setCorrectionCartons] = useState('0');

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
      const lastCounted = newest.items[p.category]?.[p.name];
      
      // Exclusion des produits marqués N/A (Non Applicables / Non Concernés)
      if (lastCounted?.na === true) continue;

      const expectedStockValue = calculateExpectedStock(p, newest, receptions);
      const metrics = calculateAdvancedConsumptionMetrics(p, inventories, receptions);
      const avgPerDay = metrics.avgPerDay;
      const avgPerWeek = metrics.avgPerWeek;
      
      const conv = p.conversionCartonUnite || 5;
      const parsedUnits = parseFloat(String(lastCounted?.units || '0').replace(',', '.'));
      const parsedCartons = parseFloat(String(lastCounted?.cartons || '0').replace(',', '.'));
      const safeUnits = isNaN(parsedUnits) ? 0 : parsedUnits;
      const safeCartons = isNaN(parsedCartons) ? 0 : parsedCartons;
      const countNum = lastCounted ? (safeUnits + safeCartons * conv) : 0;
      
      const daysSinceLast = Math.max(0, differenceInDays(Date.now(), new Date(newest.date)));
      
      const stockAtLast = countNum;
      const receivedSinceLast = expectedStockValue - countNum;
      const consumedSinceLast = avgPerDay * daysSinceLast;
      const realEstimatedNow = Math.max(0, stockAtLast + receivedSinceLast - consumedSinceLast);

      const daysUntilEmpty = avgPerDay > 0 ? realEstimatedNow / avgPerDay : 999;
      const isRisk = daysUntilEmpty <= 3;
      
      // Anomaly detection
      const hasAnomaly = (receivedSinceLast > 0 && avgPerDay === 0 && daysSinceLast > 7) || (realEstimatedNow < 0);

      // Reliability indicator
      let reliability = "Insuffisant";
      let reliabilityCode = "low";
      if (metrics.intervalsCount === 1) { reliability = "Préliminaire"; reliabilityCode = "low"; }
      else if (metrics.intervalsCount >= 2 && metrics.intervalsCount <= 3) { reliability = "Correcte"; reliabilityCode = "medium"; }
      else if (metrics.intervalsCount > 3) { reliability = "Très Fiable"; reliabilityCode = "high"; }

      const recommendedOrder = avgPerDay > 0 ? Math.max(0, Math.ceil((avgPerDay * 7) - realEstimatedNow)) : 0;

      results.push({
        product: p,
        lastCount: lastCounted || { units: '', cartons: '' },
        expectedStock: stockAtLast + receivedSinceLast,
        estimatedNow: Math.round(realEstimatedNow),
        countNum: stockAtLast,
        receivedSinceLast,
        avgPerDay,
        avgPerWeek,
        daysUntilEmpty,
        isRisk,
        hasAnomaly,
        lastInventoryDate: newest.date,
        reliability,
        reliabilityCode,
        recommendedOrder,
        intervalsCount: metrics.intervalsCount
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

  const handleCorrectAnomaly = (stat: any) => {
    if (stat) {
      setCorrectionUnits(stat.lastCount.units || '0');
      setCorrectionCartons(stat.lastCount.cartons || '0');
      setIsCorrectionModalOpen(true);
    }
  };

  const saveCorrection = () => {
    if (!selectedProductStat || inventories.length === 0) return;
    
    // Find the newest inventory entry
    const currentInvList = getStoredData<any[]>('crousty_inventory', []).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    if (currentInvList.length === 0) return;
    
    const newestEntry = { ...currentInvList[0] };
    const pInfo = selectedProductStat.product;
    
    // Ensure nested objects exist
    if (!newestEntry.items) newestEntry.items = {};
    if (!newestEntry.items[pInfo.category]) newestEntry.items[pInfo.category] = {};
    
    newestEntry.items[pInfo.category][pInfo.name] = {
      units: correctionUnits,
      cartons: correctionCartons,
      na: false
    };
    
    currentInvList[0] = newestEntry;
    setStoredData('crousty_inventory', currentInvList);
    setInventories(currentInvList); // This will trigger recalculation of analysis
    setIsCorrectionModalOpen(false);
  };

  const filteredStats = analysis?.stats.filter(s => s.product.name.toLowerCase().includes(searchQuery.toLowerCase())) || [];

  const getColorCode = (code: string) => {
    switch(code) {
      case 'high': return [16, 185, 129]; // Emerald
      case 'medium': return [59, 130, 246]; // Blue
      case 'low': return [245, 158, 11]; // Orange
      default: return [107, 114, 128]; // Gray
    }
  };

  const generatePDF = () => {
    if (!analysis) return;

    const doc = new jsPDF();
    const primaryColor = config.restaurant?.couleurPrimaire || '#E91E8C';
    const secondaryColor = config.restaurant?.couleurSecondaire || '#7B2FBE';
    const restaurantName = config.restaurant?.nom || 'Mon Restaurant';
    
    // Hex to RGB for jspdf
    const hexToRgb = (hex: string): [number, number, number] => {
      const bigint = parseInt(hex.replace('#', ''), 16);
      return [(bigint >> 16) & 255, (bigint >> 8) & 255, bigint & 255];
    };
    const rgbPrimary = hexToRgb(primaryColor);

    // Header
    doc.setFillColor(rgbPrimary[0], rgbPrimary[1], rgbPrimary[2]);
    doc.rect(0, 0, 210, 40, 'F');
    
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(24);
    doc.setFont('helvetica', 'bold');
    doc.text(restaurantName.toUpperCase(), 15, 20);
    
    doc.setFontSize(12);
    doc.setFont('helvetica', 'normal');
    doc.text(`RAPPORT D'ANALYSE INVENTAIRE IA`, 15, 30);
    doc.text(format(new Date(), 'dd MMMM yyyy HH:mm', { locale: fr }), 195, 30, { align: 'right' });

    // Global Stats & Reliability
    const avgReliability = analysis.stats.reduce((acc, s) => {
      if (s.reliabilityCode === 'high') return acc + 100;
      if (s.reliabilityCode === 'medium') return acc + 60;
      return acc + 30;
    }, 0) / analysis.stats.length;

    let yPos = 55;
    doc.setTextColor(50, 50, 50);
    doc.setFontSize(16);
    doc.text('Synthèse Globale', 15, yPos);
    yPos += 10;
    
    doc.setFontSize(10);
    doc.text(`Nombre de produits analysés : ${analysis.stats.length}`, 15, yPos);
    doc.text(`Fiabilité globale de l'analyse : ${avgReliability.toFixed(0)}%`, 110, yPos);
    
    yPos += 15;

    // Critical Sections: Ruptures & Risks
    const ruptures = analysis.stats.filter(s => s.estimatedNow <= 0);
    const risks = analysis.stats.filter(s => s.isRisk && s.estimatedNow > 0);
    const anomalies = analysis.stats.filter(s => s.hasAnomaly);

    const formatAmount = (amount: number, product: InventoryProduct) => {
      const conv = product.conversionCartonUnite;
      const unit = product.uniteStock || 'u.';
      if (conv && conv > 1 && amount > 0) {
        const cartons = Math.floor(amount / conv);
        const units = Math.round(amount % conv);
        return `${amount} ${unit}\n(${cartons} crt ${units > 0 ? '+ ' + units + ' ' + unit : ''})`;
      }
      return `${amount} ${unit}`;
    };

    if (ruptures.length > 0) {
      doc.setTextColor(185, 28, 28); // Red
      doc.setFontSize(14);
      doc.text(`RUPTURES DÉTECTÉES (${ruptures.length})`, 15, yPos);
      yPos += 5;
      
      autoTable(doc, {
        startY: yPos,
        head: [['Produit', 'Dernier Comptage', 'Conso/Jour', 'Stock Est.', 'Statut']],
        body: ruptures.map(s => [
          s.product.name,
          formatAmount(s.countNum, s.product),
          `${s.avgPerDay.toFixed(1)} /j`,
          '0',
          'RUPTURE'
        ]),
        headStyles: { fillColor: [185, 28, 28] },
        styles: { cellPadding: 2, fontSize: 9 },
        margin: { left: 15, right: 15 }
      });
      yPos = (doc as any).lastAutoTable.finalY + 15;
    }

    if (risks.length > 0) {
      doc.setTextColor(245, 158, 11); // Orange
      doc.setFontSize(14);
      doc.text(`PROCHES DE LA RUPTURE (${risks.length})`, 15, yPos);
      yPos += 5;
      
      autoTable(doc, {
        startY: yPos,
        head: [['Produit', 'Stock Actuel', 'Conso/Jour', 'Autonomie', 'Recommandation']],
        body: risks.map(s => [
          s.product.name,
          formatAmount(s.estimatedNow, s.product),
          `${s.avgPerDay.toFixed(1)} /j`,
          `${s.daysUntilEmpty.toFixed(0)} jours`,
          `Commander +${s.recommendedOrder}`
        ]),
        headStyles: { fillColor: [245, 158, 11] },
        styles: { cellPadding: 2, fontSize: 9 },
        margin: { left: 15, right: 15 }
      });
      yPos = (doc as any).lastAutoTable.finalY + 15;
    }

    if (anomalies.length > 0) {
      doc.setTextColor(37, 99, 235); // Blue
      doc.setFontSize(14);
      doc.text(`ANOMALIES & ÉCARTS (${anomalies.length})`, 15, yPos);
      yPos += 5;
      
      autoTable(doc, {
        startY: yPos,
        head: [['Produit', 'Stock Attendu', 'Stock Estimé', 'Différence', 'Fiabilité']],
        body: anomalies.map(s => [
          s.product.name,
          formatAmount(s.expectedStock, s.product),
          formatAmount(s.estimatedNow, s.product),
          (s.expectedStock - s.estimatedNow).toFixed(1),
          s.reliability
        ]),
        headStyles: { fillColor: [37, 99, 235] },
        styles: { cellPadding: 2, fontSize: 9 },
        margin: { left: 15, right: 15 }
      });
      yPos = (doc as any).lastAutoTable.finalY + 15;
    }

    // Full Analysis Table
    if (yPos > 240) { doc.addPage(); yPos = 20; }
    doc.setTextColor(50, 50, 50);
    doc.setFontSize(14);
    doc.text('Détail Complet de l\'Analyse', 15, yPos);
    yPos += 5;

    autoTable(doc, {
      startY: yPos,
      head: [['Produit', 'Stock', 'Conso/Jour', 'Recommandé', 'Fiabilité']],
      body: analysis.stats.map(s => [
        s.product.name,
        formatAmount(s.estimatedNow, s.product),
        `${s.avgPerDay.toFixed(1)} /j`,
        s.recommendedOrder > 0 ? `+${s.recommendedOrder}` : '-',
        s.reliability
      ]),
      headStyles: { fillColor: rgbPrimary },
      styles: { fontSize: 8, cellPadding: 2 },
      margin: { left: 15, right: 15 }
    });

    // Footer
    const pageCount = (doc as any).internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(150, 150, 150);
      doc.text(`Document généré par Hartmann Hub IA - Page ${i} / ${pageCount}`, 105, 290, { align: 'center' });
    }

    doc.save(`Rapport_IA_Stock_${format(new Date(), 'yyyyMMdd')}.pdf`);
  };

  const renderAmount = (amount: number, product: InventoryProduct) => {
    const conv = product.conversionCartonUnite;
    const unit = product.uniteStock || 'u.';
    
    if (conv && conv > 1 && amount > 0) {
      const cartons = Math.floor(amount / conv);
      const units = Math.round(amount % conv);
      
      return (
        <span className="inline-flex flex-col text-right items-end">
          <span>{amount % 1 !== 0 ? amount.toFixed(1) : amount} <span className="text-[10px] uppercase font-bold opacity-50">{unit.toLowerCase()}</span></span>
          <span className="text-[9px] text-gray-500 font-bold mt-0.5" style={{lineHeight: 1}}>
            Soit {cartons > 0 ? `${cartons} crt.` : ''} {cartons > 0 && units > 0 ? ' + ' : ''}{units > 0 ? `${units} ${unit.toLowerCase()}` : ''}
          </span>
        </span>
      );
    }
    
    return <span>{amount % 1 !== 0 ? amount.toFixed(1) : amount} <span className="text-[10px] uppercase font-bold opacity-50">{unit.toLowerCase()}</span></span>;
  };

  return (
    <div className="space-y-6 pb-20 pt-8 animate-in fade-in">
      <div className="flex items-center gap-3 px-2 flex-wrap">
        <div className="flex items-center gap-3">
          <Brain className="text-crousty-purple" size={32} />
          <div>
            <h2 className="text-2xl font-black text-gray-900 uppercase tracking-widest">IA Inventaire</h2>
            <p className="text-sm font-bold text-gray-500">Stock attendu et anomalies détectées</p>
          </div>
        </div>
        {isReadOnly && (
          <div className="flex items-center gap-1.5 px-3 py-1 bg-gray-100 text-gray-500 rounded-full text-[10px] font-black uppercase tracking-widest ml-auto">
            <Lock size={12} /> Lecture Seule
          </div>
        )}
      </div>

      <div className="px-2 grid grid-cols-1 md:grid-cols-2 gap-4">
        {!isReadOnly && (
          <Button 
            className="w-full h-12 rounded-xl text-sm font-black shadow-md active:scale-95 flex items-center justify-center gap-2"
            onClick={() => {
               sessionStorage.setItem('crousty_start_smart_inventory', 'true');
               window.dispatchEvent(new CustomEvent('navigate-to', { detail: 'inventaire' }));
            }}
          >
            <Brain size={18} /> Inventaire Pré-rempli (IA)
          </Button>
        )}
        <div className={`${isReadOnly ? 'md:col-span-2' : ''} bg-white border border-gray-100 p-4 rounded-xl flex items-center justify-between shadow-sm`}>
           <div className="flex items-center gap-2">
             <Calendar className="text-crousty-purple" size={18} />
             <span className="text-sm font-black text-gray-800 uppercase tracking-wider">{format(new Date(), 'EEEE d MMMM', { locale: fr })}</span>
           </div>
           <div className="flex items-center gap-2">
             <Button 
               variant="ghost" 
               size="sm"
               className="h-9 px-3 rounded-lg text-[10px] font-black uppercase text-gray-500 hover:text-crousty-purple hover:bg-crousty-purple/5"
               onClick={generatePDF}
             >
               <FileText size={14} className="mr-1.5" /> Rapport PDF
             </Button>
             {analysis?.stats.filter(s => s.hasAnomaly).length > 0 && (
               <div className="bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-[10px] font-black uppercase animate-pulse">
                  {analysis.stats.filter(s => s.hasAnomaly).length} Anomalies
               </div>
             )}
           </div>
        </div>
      </div>

      {!analysis || analysis.stats.length === 0 ? (
        <Card className="bg-white p-12 rounded-[2rem] flex flex-col items-center justify-center text-center shadow-sm border border-gray-100 max-w-2xl mx-auto mt-12">
          <div className="w-24 h-24 mb-6 rounded-full bg-gray-50 flex items-center justify-center border-4 border-white shadow-sm ring-1 ring-gray-100">
            <Brain size={48} className="text-gray-300" />
          </div>
          <h3 className="text-xl font-black text-gray-800 mb-3 tracking-tight">Pas assez de données</h3>
          <p className="text-sm font-bold text-gray-500 leading-relaxed max-w-md">
            L'Intelligence Artificielle a besoin d'au moins deux inventaires précédents et des livraisons pour calculer la consommation moyenne réelle et prédire les besoins avec fiabilité.
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
                        <div className="text-xl font-black text-gray-900 leading-none">{renderAmount(s.estimatedNow, p)}</div>
                     </div>
                  </div>

                  <h4 className="font-black text-sm text-gray-800 mb-2 truncate">{p.name}</h4>

                  <div className="flex flex-col gap-2 mt-auto pt-2 border-t border-gray-100">
                     <div className="flex items-center justify-between">
                         <div className="flex items-center gap-1.5">
                            <Clock size={12} className="text-gray-400" />
                            <span className={`text-[10px] font-black uppercase tracking-tighter ${s.isRisk ? 'text-red-500' : 'text-gray-500'}`}>
                               {s.daysUntilEmpty > 90 ? 'Sécurisé' : `~${s.daysUntilEmpty.toFixed(0)} jours`}
                            </span>
                         </div>
                         {s.hasAnomaly ? (
                            <div className="text-[9px] font-black bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full uppercase">Anomalie</div>
                         ) : (
                            <div className={`text-[8px] font-black uppercase px-1.5 py-0.5 rounded border border-current ${s.reliabilityCode === 'high' ? 'text-emerald-500 bg-emerald-50' : s.reliabilityCode === 'medium' ? 'text-blue-500 bg-blue-50' : 'text-orange-500 bg-orange-50'}`}>
                               Fiabilité {s.reliabilityCode === 'high' ? 'Haute' : s.reliabilityCode === 'medium' ? 'Moy.' : 'Basse'}
                            </div>
                         )}
                     </div>
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
                           <div className="font-black text-gray-900 text-2xl">{renderAmount(selectedProductStat.countNum, selectedProductStat.product)}</div>
                           <div className="text-[9px] text-gray-400 font-bold mt-1">Le {format(new Date(selectedProductStat.lastInventoryDate), 'dd/MM')}</div>
                        </div>
                        <div className="bg-white p-4 rounded-2xl border border-blue-100 shadow-sm">
                           <div className="text-[10px] text-blue-600 uppercase font-black tracking-widest mb-1">+ Livré depuis</div>
                           <div className="font-black text-blue-900 text-2xl">{renderAmount(selectedProductStat.receivedSinceLast, selectedProductStat.product)}</div>
                        </div>
                        <div className="bg-indigo-50 p-4 rounded-2xl border border-indigo-100 shadow-sm">
                           <div className="text-[10px] text-indigo-600 uppercase font-black tracking-widest mb-1">= Stock Attendu</div>
                           <div className="font-black text-indigo-900 text-2xl">{renderAmount(selectedProductStat.expectedStock, selectedProductStat.product)}</div>
                        </div>
                        <div className={`p-4 rounded-2xl border shadow-sm relative overflow-hidden ${selectedProductStat.hasAnomaly ? 'bg-orange-50 border-orange-200' : 'bg-gray-50 border-gray-100'}`}>
                           <div className="text-[10px] uppercase font-black tracking-widest mb-1">Estimation IA</div>
                           <div className="font-black text-2xl">{renderAmount(selectedProductStat.estimatedNow, selectedProductStat.product)}</div>
                        </div>
                    </div>

                    <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm space-y-4">
                       <div className="flex items-center justify-between border-b border-gray-100 pb-4">
                          <div className="flex items-center gap-3">
                             <div className="w-10 h-10 rounded-full bg-gray-50 border border-gray-100 flex items-center justify-center">
                               {selectedProductStat.avgPerDay > 0 ? <TrendingDown size={18} className="text-crousty-purple" /> : <TrendingUp size={18} className="text-gray-400" />}
                             </div>
                             <div>
                                <div className="text-[10px] text-gray-500 font-black uppercase tracking-widest leading-none mb-1">Conso Moyenne</div>
                                <div className="font-black text-gray-800 text-lg">{selectedProductStat.avgPerDay.toFixed(2)} <span className="text-[10px] text-gray-400 font-medium uppercase tracking-wider">{(selectedProductStat.product.uniteStock || 'u.')} / jr</span></div>
                                <div className="text-[10px] font-bold text-gray-400">~{selectedProductStat.avgPerWeek.toFixed(1)} / semaine</div>
                             </div>
                          </div>
                          <div className="text-right">
                             <div className="text-[10px] text-gray-500 font-black uppercase tracking-widest leading-none mb-1">Rupture dans</div>
                             <div className={`font-black text-lg ${selectedProductStat.isRisk ? 'text-red-600' : 'text-emerald-600'}`}>{selectedProductStat.daysUntilEmpty > 90 ? '> 3 mois' : `~${selectedProductStat.daysUntilEmpty.toFixed(0)}j`}</div>
                          </div>
                       </div>
                       
                       <div className="flex items-center justify-between pt-2">
                           <div>
                               <div className="text-[10px] text-gray-500 font-black uppercase tracking-widest mb-1">Fiabilité IA</div>
                               <div className={`text-xs font-black uppercase px-2 py-0.5 rounded-md inline-flex items-center ${selectedProductStat.reliabilityCode === 'high' ? 'bg-emerald-100 text-emerald-700' : selectedProductStat.reliabilityCode === 'medium' ? 'bg-blue-100 text-blue-700' : 'bg-orange-100 text-orange-700'}`}>
                                  {selectedProductStat.reliability} ({selectedProductStat.intervalsCount} inv.)
                               </div>
                           </div>
                           <div className="text-right">
                               <div className="text-[10px] text-gray-500 font-black uppercase tracking-widest mb-1">Commande Suggérée</div>
                               <div className="text-sm font-black text-indigo-600 bg-indigo-50 px-3 py-1 rounded-md inline-block">
                                  + {selectedProductStat.recommendedOrder} <span className="text-[10px] opacity-70">{(selectedProductStat.product.uniteStock || 'u.').toLowerCase()}</span>
                               </div>
                           </div>
                       </div>
                    </div>

                    <Button 
                      className="w-full bg-gray-900 border border-gray-900 text-white gap-2 font-black h-12 uppercase text-xs tracking-widest shadow-lg rounded-xl"
                      onClick={() => !isReadOnly && handleCorrectAnomaly(selectedProductStat)}
                    >
                      <Edit2 size={16} /> {isReadOnly ? 'Navigation Verrouillée' : 'Corriger le stock'}
                    </Button>
                  </div>

                  <div className="p-4 border-t border-gray-100 bg-white">
                     <Button variant="outline" className="w-full h-12 rounded-xl text-xs font-black uppercase" onClick={() => setSelectedProductStat(null)}>Fermer</Button>
                  </div>
               </Card>
            </div>,
            document.body
          )}

          {isCorrectionModalOpen && selectedProductStat && createPortal(
            <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[7000] flex items-center justify-center p-4">
               <Card className="w-full max-w-sm bg-white overflow-hidden shadow-2xl rounded-[2.5rem] border-0 animate-in fade-in zoom-in-95 duration-200">
                  <div className="px-6 pt-6 pb-4">
                     <div className="flex items-center justify-between mb-4">
                       <div>
                         <h3 className="font-black text-xl text-gray-900">Corriger le stock</h3>
                         <p className="text-xs font-black uppercase tracking-widest text-crousty-purple mt-1">{selectedProductStat.product.name}</p>
                       </div>
                       <button onClick={() => setIsCorrectionModalOpen(false)} className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 text-gray-500 hover:bg-gray-200 transition-colors">
                         <X size={16} />
                       </button>
                     </div>
                     <p className="text-xs text-gray-500 mb-6 font-medium">Ceci va remplacer la valeur pour ce produit dans le dernier inventaire.</p>
                     
                     <div className="grid grid-cols-2 gap-4 mb-6">
                        <div>
                           <label className="block text-[10px] uppercase font-black tracking-widest text-gray-500 mb-2">Cartons</label>
                           <Input 
                             type="number"
                             value={correctionCartons}
                             onChange={(e: any) => setCorrectionCartons(e.target.value)}
                             className="h-14 bg-gray-50 border-2 border-gray-100 rounded-2xl text-lg font-black text-center"
                           />
                        </div>
                        <div>
                           <label className="block text-[10px] uppercase font-black tracking-widest text-gray-500 mb-2">{selectedProductStat.product.uniteStock || 'Unités'}</label>
                           <Input 
                             type="number"
                             value={correctionUnits}
                             onChange={(e: any) => setCorrectionUnits(e.target.value)}
                             className="h-14 bg-gray-50 border-2 border-gray-100 rounded-2xl text-lg font-black text-center"
                           />
                        </div>
                     </div>
                     
                     <Button 
                       onClick={saveCorrection}
                       className="w-full h-14 bg-crousty-purple hover:bg-crousty-purple/90 text-white rounded-xl shadow-xl font-black text-sm transition-all"
                     >
                       <Check size={16} className="mr-2" /> Valider la correction
                     </Button>
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
