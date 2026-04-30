import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useAuth } from '../contexts/AuthContext';
import { Card, Button } from '../components/ui/LightUI';
import { InventoryEntry, InventoryProduct, InventoryItemDetail } from '../types';
import { getStoredData, setStoredData } from '../lib/db';
import { Trash2, Check, X, ChevronDown, ChevronUp, FileText, Settings, Search, Package, ChevronRight, AlertTriangle, Activity, Calendar, Upload, Brain, Download } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format, isWithinInterval, startOfDay, endOfDay, differenceInDays } from 'date-fns';

import { GererLesProduits, ICONS_MAP, getSmartIcon, DEFAULT_CATEGORIES } from '../components/GererLesProduits';

import { useInventaire } from '../providers/InventaireProvider';
import { useConfig } from '../contexts/ConfigContext';

import { getCategorieStyle } from '../lib/inventoryStyles';

const CategorieHeader = ({ nom, nbProduits, isExpanded, onToggle }: { nom: string, nbProduits: number, isExpanded: boolean, onToggle: () => void }) => {
  const style = getCategorieStyle(nom);
  const IconeCategorie = style.icone;

  return (
    <div 
      onClick={onToggle}
      className="flex items-center gap-2 py-3 px-1 mt-4 cursor-pointer hover:bg-gray-50 transition-colors rounded-xl select-none"
    >
      <div className="w-[3px] h-[18px] rounded-full shrink-0" style={{ background: style.couleur }} />
      <IconeCategorie size={15} color={style.couleur} strokeWidth={2.5} />
      <span className="text-[12px] font-bold tracking-wider uppercase" style={{ color: style.couleur }}>
        {nom}
      </span>
      <span className="ml-auto text-[12px] font-medium text-gray-400 bg-gray-50 px-2 py-0.5 rounded-full">
        {nbProduits} {nbProduits > 1 ? 'produits' : 'produit'}
      </span>
      <ChevronRight 
        size={16} 
        className={`text-gray-400 transition-transform duration-200 ${isExpanded ? 'rotate-90' : ''}`} 
      />
    </div>
  );
};

export default function Inventaire({ setIsSidebarCollapsed }: { setIsSidebarCollapsed?: (c: boolean) => void }) {
  const { currentUser } = useAuth();
  const isMobileMode = !!localStorage.getItem('crousty_mobile_session');
  const { products, refreshProducts } = useInventaire();
  const { config } = useConfig();
  const [entries, setEntries] = useState<InventoryEntry[]>([]);
  const [quantities, setQuantities] = useState<Record<string, Record<string, InventoryItemDetail>>>({});
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({});
  const [activeFilter, setActiveFilter] = useState<string>('Tous');
  const [searchQuery, setSearchQuery] = useState('');
  const [showRupturesOnly, setShowRupturesOnly] = useState(false);
  const [isSmartMode, setIsSmartMode] = useState(false);
  const isDirty = Object.keys(quantities).length > 0;
  
  const [isManageModalOpen, setIsManageModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [visibleCount, setVisibleCount] = useState(5000);
  const scrollRef = React.useRef<HTMLDivElement>(null);

  useEffect(() => {
    setEntries(getStoredData<InventoryEntry[]>('crousty_inventory', []));
    setQuantities(getStoredData<Record<string, Record<string, InventoryItemDetail>>>('crousty_inventory_draft', {}));
    
    // Auto-expand categories
    const cats = Array.from(new Set(products.map(p => p.category))) as string[];
    const initialExpanded: Record<string, boolean> = {};
    cats.forEach(cat => { initialExpanded[cat] = true; });
    setExpandedCategories(initialExpanded);
    setLoading(false);

    const handleHistoUpdate = () => {
       setEntries(getStoredData<InventoryEntry[]>('crousty_inventory', []));
    };
    window.addEventListener('crousty-inventaire-historique-updated', handleHistoUpdate);
    return () => window.removeEventListener('crousty-inventaire-historique-updated', handleHistoUpdate);
  }, [products.length]);

  useEffect(() => {
    if (Object.keys(quantities).length > 0) {
      setStoredData('crousty_inventory_draft', quantities);
    }
  }, [quantities]);

  const smartEstimations = useMemo(() => {
    if (entries.length < 2) return null;
    
    const rec = getStoredData<any[]>('crousty_receptions_v3', []).filter((r: any) => !r.supprime).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    
    // Calculate average consumption over the last several inventories to smooth
    const selectedInventories = entries.slice(0, 3); 
    const newest = selectedInventories[0]; // the last done inventory
    const oldest = selectedInventories[selectedInventories.length - 1]; // up to 3 behind

    const dNewest = new Date(newest.date).getTime();
    const dOldest = new Date(oldest.date).getTime();
    const daysDiffHist = Math.max(1, differenceInDays(dNewest, dOldest));
    const daysSinceLast = Math.max(0, differenceInDays(Date.now(), dNewest));

    // Deliveries inside historical period
    const histDeliveries = rec.filter(r => {
      const rd = new Date(r.date).getTime();
      return rd >= dOldest && rd <= dNewest;
    });

    // Deliveries since last inventory
    const recentDeliveries = rec.filter(r => {
      const rd = new Date(r.date).getTime();
      return rd > dNewest;
    });

    const getDelivUnits = (arr: any[], prodName: string) => {
      let total = 0;
      arr.forEach(r => {
        r.lignes?.forEach((l: any) => {
          if (l.produit === prodName) {
            const num = parseInt(l.quantite);
            if (!isNaN(num)) {
               const isCarton = l.quantite.toLowerCase().includes('carton') || l.quantite.toLowerCase().includes('colis');
               total += isCarton ? num * 5 : num;
            }
          }
        });
      });
      return total;
    };

    const calcTotalUnits = (cat: string, name: string, items: any) => {
      const detail = items[cat]?.[name];
      if (!detail || detail.na) return 0;
      return parseInt(detail.units || '0') + (parseInt(detail.cartons || '0') * 5);
    };

    const est: Record<string, number> = {};

    for (const p of products) {
      const stockOldest = calcTotalUnits(p.category, p.name, oldest.items);
      const stockNewest = calcTotalUnits(p.category, p.name, newest.items);
      const dHist = getDelivUnits(histDeliveries, p.name);
      
      const consumption = stockOldest + dHist - stockNewest;
      const avgPerDay = consumption > 0 ? consumption / daysDiffHist : 0;

      const dRec = getDelivUnits(recentDeliveries, p.name);
      
      let estimated = stockNewest + dRec - (avgPerDay * daysSinceLast);
      est[p.name] = Math.max(0, Math.round(estimated));
    }
    
    return est;
  }, [entries, products]);

  const toggleCategory = (cat: string) => {
    setExpandedCategories(prev => ({ ...prev, [cat]: !prev[cat] }));
  };

  const updateQuantity = (category: string, item: string, field: keyof InventoryItemDetail, value: string | boolean) => {
    setQuantities(prev => ({
      ...prev,
      [category]: {
        ...(prev[category] || {}),
        [item]: {
          ...(prev[category]?.[item] || { units: '0', cartons: '0', na: false }),
          [field]: value
        }
      }
    }));
  };

  const adjustQuantityValue = (category: string, item: string, field: keyof InventoryItemDetail, delta: number) => {
    setQuantities(prev => {
      const currentEntry = prev[category]?.[item] || { units: '0', cartons: '0', na: false };
      if (currentEntry.na) return prev;
      const currentVal = parseInt((currentEntry[field] as string) ?? '0') || 0;
      const nextVal = Math.max(0, currentVal + delta);
      return {
        ...prev,
        [category]: {
          ...(prev[category] || {}),
          [item]: {
            ...currentEntry,
            [field]: nextVal.toString()
          }
        }
      };
    });
  };

  const toggleNA = (category: string, item: string) => {
    setQuantities(prev => {
      const currentEntry = prev[category]?.[item] || { units: '0', cartons: '0', na: false };
      return {
        ...prev,
        [category]: {
          ...(prev[category] || {}),
          [item]: {
            ...currentEntry,
            na: !currentEntry.na
          }
        }
      };
    });
  };

  const importJSON = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const importedData = JSON.parse(event.target?.result as string);
        if (Array.isArray(importedData)) {
           const combined = [...entries, ...importedData].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
           const unique = Array.from(new Map(combined.map(item => [item.id || item.date + item.responsable, item])).values());
           
           setEntries(unique);
           setStoredData('crousty_inventory', unique);
        } else {
           setError("Erreur : Le fichier JSON doit contenir un tableau d'inventaires.");
        }
      } catch (err) {
        console.error(err);
        setError("Erreur lors de l'import JSON.");
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const exportJSON = () => {
    const dataStr = JSON.stringify(entries, null, 2);
    const blob = new Blob([dataStr], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `crousty_inventaire_historique_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleSave = () => {
    const mobileWorker = localStorage.getItem('crousty_mobile_worker');
    const responsableName = currentUser?.name || (isMobileMode ? (mobileWorker || 'Appareil Mobile') : null);
    if (!responsableName) { setError("Responsable requis."); return; }
    
    const finalItems: Record<string, Record<string, InventoryItemDetail>> = {};
    products.forEach(p => {
      if (!finalItems[p.category]) finalItems[p.category] = {};
      finalItems[p.category][p.name] = quantities[p.category]?.[p.name] ?? { units: '0', cartons: '0', na: false };
    });

    const newEntry: InventoryEntry = {
      id: Date.now().toString(),
      date: new Date().toISOString(),
      items: finalItems,
      responsable: responsableName
    };
    
    const updated = [newEntry, ...entries];
    setEntries(updated);
    setStoredData('crousty_inventory', updated);
    setStoredData('crousty_inventory_draft', {});
    setQuantities({});
    setShowRupturesOnly(false);
    setIsSmartMode(false);
    
    setError('');
  };

  const confirmDelete = (id: string) => {
    const updated = entries.filter(e => e.id !== id);
    setEntries(updated);
    setStoredData('crousty_inventory', updated);
    setDeleteId(null);
  };

  const importExcel = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const { read, utils } = await import('xlsx');
        const data = new Uint8Array(event.target?.result as ArrayBuffer);
        const workbook = read(data, { type: 'array' });
        const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
        const rows = utils.sheet_to_json<any>(firstSheet);

        const entriesByDate: Record<string, InventoryEntry> = {};

        rows.forEach(row => {
           const getVal = (keys: string[]) => {
             const key = Object.keys(row).find(k => keys.includes(k.toLowerCase().trim()));
             return key ? row[key] : undefined;
           };

           const d = getVal(['date']);
           const pName = getVal(['produit', 'produits', 'item', 'nom']);
           let q = getVal(['quantite', 'quantité', 'qty', 'quantites']) || '0';
           const resp = getVal(['responsable', 'user', 'utilisateur', 'employe', 'employé']) || 'Import XLS';
           
           if (!d || !pName) return;

           const finalDate = typeof d === 'number' 
             ? new Date((d - (25567 + 2)) * 86400 * 1000).toISOString() 
             : new Date(d).toISOString();
             
           const dateKey = finalDate.split('T')[0];
           const key = `${dateKey}-${resp}`;
           
           if (!entriesByDate[key]) {
             entriesByDate[key] = {
               id: `imp_${Date.now()}_${Math.random()}`,
               date: finalDate,
               responsable: resp,
               items: {}
             };
           }
           
           const productConf = products.find(prod => prod.name.toLowerCase() === pName.toLowerCase());
           const cat = productConf ? productConf.category : 'Autres';
           
           if (!entriesByDate[key].items[cat]) entriesByDate[key].items[cat] = {};
           
           // Parsing units and cartons like "1 cart. 2 u." or "15" or "15 u."
           const qStr = String(q).toLowerCase().trim();
           let units = 0;
           let cartons = 0;

           const cartMatch = qStr.match(/(\d+)\s*cart/);
           if (cartMatch) cartons = parseInt(cartMatch[1], 10);

           const uMatch = qStr.match(/(\d+)\s*u/);
           if (uMatch) units = parseInt(uMatch[1], 10);

           if (!cartMatch && !uMatch) {
             // Fallback if just a number
             const numMatch = qStr.match(/(\d+)/);
             if (numMatch) units = parseInt(numMatch[1], 10);
           }

           entriesByDate[key].items[cat][pName] = {
              units: String(units),
              cartons: String(cartons),
              na: false
           };
        });

        const newOldEntries = Object.values(entriesByDate);
        if (newOldEntries.length > 0) {
           const combined = [...entries, ...newOldEntries].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
           setEntries(combined);
           setStoredData('crousty_inventory', combined);
        }
      } catch (err) {
        console.error(err);
        setError("Erreur lors de l'import. Vérifiez le format du fichier (Date, Produit, Quantité, Responsable).");
      }
    };
    reader.readAsArrayBuffer(file);
    e.target.value = '';
  };

  const formatItemValue = (item: InventoryItemDetail) => {
    if (item.na) return 'N/A';
    const parts = [];
    if (parseInt(item.cartons) > 0) parts.push(`${item.cartons} cart.`);
    if (parseInt(item.units) > 0 || parts.length === 0) parts.push(`${item.units} u.`);
    return parts.join(' ');
  };

  const exportSinglePDF = (entry: InventoryEntry) => {
    const doc = new jsPDF();
    const dateStr = format(new Date(entry.date), 'dd/MM/yyyy HH:mm');
    
    doc.setFillColor(26, 11, 46);
    doc.rect(14, 10, 182, 10, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    const name = config.restaurant.nom.toUpperCase();
    const city = config.restaurant.ville?.toUpperCase();
    const branding = city ? `${name} - ${city}` : name;
    doc.text(`FICHE D'INVENTAIRE - ${branding}`, 105, 17, { align: "center" });
    
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(10);
    doc.text(`Date : ${dateStr}`, 14, 28);
    doc.text(`Responsable : ${entry.responsable || 'Inconnu'}`, 14, 34);

    let currentY = 44;

    Object.entries(entry.items).forEach(([category, items]) => {
      const tableData: any[][] = [];
      Object.entries(items).forEach(([item, detail]: [string, any]) => {
        const d: InventoryItemDetail = (typeof detail === 'string') 
          ? { units: detail, cartons: '0', na: false }
          : { 
              units: detail.units || detail.poches || '0', 
              cartons: detail.cartons || '0',
              na: detail.na || false
            };
        
        const isRecorded = !d.na;
        if (isRecorded) {
          const product = products.find(p => p.name === item);
          const unitsNum = parseInt((d as any).units || '0');
          const cartonsNum = parseInt((d as any).cartons || '0');
          const totalNum = unitsNum + (cartonsNum * 5);
          const isLow = product && totalNum <= product.minThreshold;
          const status = isLow ? '⚠️ RUPTURE' : 'OK';
          tableData.push([item, formatItemValue(d), status]);
        }
      });

      if (tableData.length > 0) {
        doc.setFontSize(12);
        doc.setTextColor(176, 38, 255);
        doc.setFont("helvetica", "bold");
        doc.text(category.toUpperCase(), 14, currentY);
        
        autoTable(doc, {
          startY: currentY + 4,
          head: [["PRODUIT", "QUANTITÉ", "STATUT"]],
          body: tableData,
          theme: 'grid',
          headStyles: { fillColor: [176, 38, 255], halign: 'center', valign: 'middle', fontSize: 10 },
          bodyStyles: { halign: 'left', valign: 'middle', fontSize: 10 },
          columnStyles: {
            0: { cellWidth: 100 },
            1: { cellWidth: 40, halign: 'center' },
            2: { cellWidth: 42, halign: 'center' }
          },
          styles: { cellPadding: 2, minCellHeight: 6 },
          margin: { left: 14, right: 14 }
        });
        
        currentY = (doc as any).lastAutoTable.finalY + 12;
        
        if (currentY > 270) {
          doc.addPage();
          currentY = 20;
        }
      }
    });

    const restoShort = config.restaurant.nom.replace(/\s+/g, '_');
    doc.save(`Inventaire_${restoShort}_${format(new Date(entry.date), 'yyyyMMdd_HHmm')}.pdf`);
  };

  const productsByCategory = products.reduce((acc, product) => {
    if (!acc[product.category]) acc[product.category] = [];
    acc[product.category].push(product);
    return acc;
  }, {} as Record<string, InventoryProduct[]>);

  const filteredCategoriesFull = (Object.entries(productsByCategory) as [string, InventoryProduct[]][])
    .filter(([category]) => activeFilter === 'Tous' || category === activeFilter)
    .map(([category, items]) => {
      const filteredItems = items
        .filter(p => (p.name || "").toLowerCase().includes((searchQuery || "").toLowerCase()))
        .filter(p => {
          if (!showRupturesOnly) return true;
          const itemDetail = quantities[category]?.[p.name] ?? { units: '0', cartons: '0', na: false };
          const totalNum = parseInt(itemDetail.units) + (parseInt(itemDetail.cartons) * 5);
          return !itemDetail.na && totalNum <= p.minThreshold;
        })
        .sort((a, b) => a.name.localeCompare(b.name));
      return [category, filteredItems] as [string, InventoryProduct[]];
    })
    .filter(([_, items]) => items.length > 0);

  const totalFilteredCount = filteredCategoriesFull.reduce((sum, cat) => sum + cat[1].length, 0);

  const paginatedCategories = [];
  let remainingCount = visibleCount;
  for (const [cat, items] of filteredCategoriesFull) {
    if (remainingCount <= 0) break;
    if (items.length <= remainingCount) {
      paginatedCategories.push([cat, items]);
      remainingCount -= items.length;
    } else {
      paginatedCategories.push([cat, items.slice(0, remainingCount)]);
      remainingCount = 0;
    }
  }

  const hasMore = visibleCount < totalFilteredCount;

  if (loading) {
     return (
       <div className="space-y-6 pb-20 pt-8 flex flex-col items-center justify-center min-h-[50vh]">
          <div className="w-16 h-16 border-4 border-gray-200 border-t-crousty-purple rounded-full animate-spin mb-4"></div>
          <p className="text-gray-500 font-bold animate-pulse">Chargement intelligent de l'inventaire...</p>
       </div>
     );
  }

  const freqOption = config.inventaire.frequence.toLowerCase();
  const getFrequenceDisplay = () => {
    switch (freqOption) {
       case 'quotidien': return 'Quotidien';
       case 'hebdomadaire': return `Hebdomadaire (${config.inventaire.jourSemaine.charAt(0).toUpperCase() + config.inventaire.jourSemaine.slice(1)})`;
       case 'mensuel': return 'Mensuel (le 1er)';
       default: return 'Non configuré';
    }
  };
  
  const getInventoryStatus = () => {
      const nowInfo = new Date();
      let lastRequiredDate = startOfDay(nowInfo);
      let isLate = false;

      if (freqOption === 'quotidien') {
         lastRequiredDate = startOfDay(nowInfo);
         const done = entries.some((inv: any) => new Date(inv.date) >= lastRequiredDate);
         return { needed: !done, done, late: !done && nowInfo.getHours() >= 14 };
      } else if (freqOption === 'hebdomadaire') {
         const days = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'];
         const targetDayIdx = days.indexOf(config.inventaire.jourSemaine.toLowerCase());
         let lastTargetDay = new Date(nowInfo);
         lastTargetDay.setDate(nowInfo.getDate() - ((nowInfo.getDay() - targetDayIdx + 7) % 7));
         lastRequiredDate = startOfDay(lastTargetDay);
         
         const done = entries.some((inv: any) => new Date(inv.date) >= lastRequiredDate);
         isLate = !done && nowInfo.getTime() > lastRequiredDate.getTime() + (14 * 60 * 60 * 1000);
         return { needed: !done, done, late: isLate };
      } else if (freqOption === 'mensuel') {
         const firstDayOfMonth = new Date(nowInfo.getFullYear(), nowInfo.getMonth(), 1);
         lastRequiredDate = startOfDay(firstDayOfMonth);
         
         const done = entries.some((inv: any) => new Date(inv.date) >= lastRequiredDate);
         isLate = !done && (nowInfo.getDate() > 1 || nowInfo.getHours() >= 14);
         return { needed: !done, done, late: isLate };
      }
      return { needed: false, done: true, late: false };
  };
  
  const { needed: statusInventoryNeeded, done: statusInventoryDone, late: statusInventoryLate } = getInventoryStatus();

  return (
    <div className="space-y-6 pb-20 pt-8" ref={scrollRef}>
      <div className="flex items-center justify-between px-2">
        <div className="flex items-center gap-3">
          <h2 className="text-2xl font-black text-gray-900 uppercase tracking-widest">Inventaire</h2>
          {isDirty && (
            <motion.div 
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="flex items-center gap-1.5 bg-crousty-purple/10 text-crousty-purple px-2.5 py-1 rounded-full border border-crousty-purple/20"
            >
              <Activity size={12} className="animate-pulse" />
              <span className="text-[10px] font-black uppercase tracking-tighter">Live</span>
            </motion.div>
          )}
        </div>
        <button 
          onClick={() => {
            setIsManageModalOpen(true);
            setIsSidebarCollapsed?.(true);
          }}
          className="bg-white border border-gray-200 text-crousty-purple p-2 rounded-xl shadow-sm hover:bg-gray-50 active:scale-95 transition-transform flex items-center gap-2"
          title="Gérer les produits"
        >
          <Settings size={20} />
          <span className="text-xs font-bold hidden sm:inline uppercase">Configuration</span>
        </button>
      </div>

      <div className={`p-4 rounded-2xl flex items-center justify-between border ${statusInventoryDone ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : statusInventoryLate ? 'bg-red-50 border-red-200 text-red-800' : statusInventoryNeeded ? 'bg-orange-50 border-orange-200 text-orange-800' : 'bg-gray-50 border-gray-200 text-gray-600'}`}>
         <div className="flex items-center gap-3">
            <div className={`p-2 rounded-xl ${statusInventoryDone ? 'bg-emerald-100 text-emerald-600' : statusInventoryLate ? 'bg-red-100 text-red-600' : statusInventoryNeeded ? 'bg-orange-100 text-orange-600' : 'bg-gray-200 text-gray-500'}`}>
               <Calendar size={20} />
            </div>
            <div>
               <div className="font-bold text-sm tracking-tight text-gray-900">Fréquence : {getFrequenceDisplay()}</div>
               <div className="text-xs font-medium">
                 {statusInventoryDone ? '✅ Inventaire à jour' : (statusInventoryLate ? '🚨 Inventaire en retard !' : statusInventoryNeeded ? '⚠️ Inventaire attendu aujourd\'hui' : 'Prochain inventaire : en attente')}
               </div>
            </div>
         </div>
      </div>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
        <Card className="space-y-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input
              type="text"
              placeholder="Rechercher un produit..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl focus:outline-none focus:ring-2 focus:ring-crousty-purple/50 transition-all text-sm font-medium"
            />
          </div>

          <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
            <div className="flex overflow-x-auto gap-2 pb-2 sm:pb-0 [&::-webkit-scrollbar]:hidden w-full sm:w-auto">
              <button
                onClick={() => setActiveFilter('Tous')}
                className={`px-4 py-2 rounded-full whitespace-nowrap text-sm font-bold transition-colors ${activeFilter === 'Tous' ? 'bg-crousty-purple text-white shadow-sm' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
              >
                Tous
              </button>
              {Object.keys(productsByCategory).map(cat => (
                <button
                  key={cat}
                  onClick={() => setActiveFilter(cat)}
                  className={`px-4 py-2 rounded-full whitespace-nowrap text-sm font-bold transition-colors ${activeFilter === cat ? 'bg-crousty-purple text-white shadow-sm' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                >
                  {cat}
                </button>
              ))}
            </div>
            
            <div className="flex flex-wrap items-center gap-3 shrink-0">
                <label className="flex items-center gap-2 cursor-pointer bg-white text-gray-700 px-4 py-2 rounded-full border border-gray-200 hover:bg-gray-50 transition-colors shadow-sm">
                   <input 
                     type="checkbox" 
                     checked={isSmartMode} 
                     onChange={e => {
                       const checked = e.target.checked;
                       setIsSmartMode(checked);
                       if (checked && smartEstimations) {
                         const newQuantities = { ...quantities };
                         let changed = false;
                         products.forEach(p => {
                           const estimated = smartEstimations[p.name];
                           if (estimated !== undefined && newQuantities[p.category]?.[p.name] === undefined) {
                             if (!newQuantities[p.category]) newQuantities[p.category] = {};
                             const cartons = Math.floor(estimated / 5);
                             const units = estimated % 5;
                             newQuantities[p.category][p.name] = { units: String(units), cartons: String(cartons), na: false };
                             changed = true;
                           }
                         });
                         if (changed) {
                           setQuantities(newQuantities);
                         }
                       }
                     }}
                     disabled={entries.length < 2}
                     className="accent-crousty-purple w-4 h-4 disabled:opacity-50"
                   />
                   <span className="text-sm font-bold flex items-center gap-1"><Brain size={14} className="text-crousty-purple"/> Mode intelligent</span>
                </label>
                
                <label className="flex items-center gap-2 cursor-pointer bg-orange-50 text-orange-700 px-4 py-2 rounded-full border border-orange-200 hover:bg-orange-100 transition-colors shrink-0">
                   <input 
                     type="checkbox" 
                     checked={showRupturesOnly} 
                     onChange={e => setShowRupturesOnly(e.target.checked)}
                     className="accent-orange-600 w-4 h-4"
                   />
                   <span className="text-sm font-bold flex items-center gap-1 hidden sm:flex">⚠️ Afficher uniquement les ruptures</span>
                </label>
            </div>
          </div>

          <div className="space-y-4">
            {paginatedCategories.map(([category, categoryProducts]) => {
              const isExpanded = expandedCategories[category];
              return (
                <div key={category} className="bg-white rounded-[2rem] border border-gray-100 overflow-hidden shadow-sm mb-4">
                  <CategorieHeader 
                    nom={category} 
                    nbProduits={categoryProducts.length} 
                    isExpanded={isExpanded} 
                    onToggle={() => toggleCategory(category)} 
                  />
                  
                  <AnimatePresence>
                    {isExpanded && (
                      <motion.div 
                        initial={{ height: 0, opacity: 0 }} 
                        animate={{ height: 'auto', opacity: 1 }} 
                        exit={{ height: 0, opacity: 0 }} 
                        className="overflow-hidden"
                      >
                        <div className="p-4 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                          {categoryProducts.map((product, index) => {
                            const itemDetail = quantities[category]?.[product.name] ?? { units: '0', cartons: '0', na: false };
                            const totalNum = parseInt(itemDetail.units) + (parseInt(itemDetail.cartons) * 5);
                            const isLow = !itemDetail.na && totalNum <= product.minThreshold;
                            const style = getCategorieStyle(category);
                            const IconComp = ICONS_MAP[product.icon as keyof typeof ICONS_MAP] || Package;
                            
                            const estimated = smartEstimations?.[product.name];
                            const showEstimation = isSmartMode && estimated !== undefined && !itemDetail.na;
                            
                            let estimationColor = 'text-gray-400';
                            let estimationBg = 'bg-gray-100/50';
                            let estimationDiff = 0;
                            
                            if (showEstimation) {
                               const isItemDirty = !!quantities[category]?.[product.name];
                               const typedTotal = isItemDirty ? totalNum : null;
                               
                               if (typedTotal !== null) {
                                  estimationDiff = typedTotal - estimated;
                                  if (Math.abs(estimationDiff) <= 1) {
                                      estimationColor = 'text-emerald-600';
                                      estimationBg = 'bg-emerald-50';
                                  } else if (Math.abs(estimationDiff) <= 3) {
                                      estimationColor = 'text-orange-600';
                                      estimationBg = 'bg-orange-50';
                                  } else {
                                      estimationColor = 'text-red-600';
                                      estimationBg = 'bg-red-50';
                                  }
                               }
                            }
                            
                            return (
                              <div 
                                key={product.id} 
                                className={`animate-card-in flex flex-col gap-2 p-3 rounded-2xl border transition-all ${
                                  itemDetail.na ? 'bg-gray-50 border-gray-100 opacity-60' : 
                                  isLow ? 'bg-orange-50 border-orange-200' : 
                                  'bg-white border-gray-100 shadow-sm'
                                }`}
                                style={{
                                  animationDelay: `${Math.min(index * 20, 200)}ms`,
                                  borderLeftColor: style.couleur,
                                  borderLeftWidth: '4px'
                                }}
                              >
                                <div className="flex justify-between items-start gap-2">
                                  <div className="flex items-center gap-3">
                                    <div 
                                      onClick={() => toggleNA(category, product.name)}
                                      className={`w-10 h-6 rounded-full p-1 cursor-pointer transition-colors flex items-center shrink-0 ${itemDetail.na ? 'bg-red-400' : 'bg-gray-200'}`}
                                    >
                                      <div className={`w-4 h-4 bg-white rounded-full shadow-sm transition-transform ${itemDetail.na ? 'translate-x-4' : 'translate-x-0'}`}></div>
                                    </div>
                                    <div 
                                      className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border"
                                      style={{ 
                                        backgroundColor: itemDetail.na ? '#F3F4F6' : style.fond,
                                        borderColor: itemDetail.na ? '#E5E7EB' : style.bordure
                                      }}
                                    >
                                      <IconComp size={20} color={itemDetail.na ? '#9CA3AF' : style.couleur} strokeWidth={2} />
                                    </div>
                                    <div className={`text-sm font-black leading-tight uppercase tracking-tight ${itemDetail.na ? 'text-gray-400 line-through' : 'text-gray-800'}`}>
                                      {product.name}
                                    </div>
                                  </div>
                                  {isLow && !itemDetail.na && (
                                    <div className="shrink-0 flex items-center gap-1 text-orange-600 text-[9px] uppercase font-black bg-orange-100 px-2 py-0.5 rounded-full shadow-sm">
                                      <AlertTriangle size={10} /> Rupture
                                    </div>
                                  )}
                                </div>
                                
                                {showEstimation && (
                                   <div className={`mt-2 flex items-center justify-between text-[11px] font-bold px-2 py-1 rounded-lg ${estimationBg}`}>
                                      <span className="text-gray-500 uppercase tracking-widest text-[9px]">A.I. Estimé</span>
                                      <span className={`flex items-center gap-1 ${estimationColor}`}>
                                         {estimated} u.
                                         {!!quantities[category]?.[product.name] && (
                                            <span className="text-[10px] ml-1">
                                               (Écart: {estimationDiff > 0 ? '+' : ''}{estimationDiff})
                                            </span>
                                         )}
                                      </span>
                                   </div>
                                )}
                                
                                <div className={`grid grid-cols-2 gap-2 sm:gap-4 mt-1 ${itemDetail.na ? 'pointer-events-none' : ''}`}>
                                  <div className="flex flex-col gap-1">
                                    <span className="text-[10px] items-center text-gray-400 font-bold uppercase ml-1">Unités</span>
                                    <div className="flex items-center justify-between bg-gray-50 p-1 rounded-xl">
                                      <button onClick={() => adjustQuantityValue(category, product.name, 'units', -1)} className="w-8 h-8 flex items-center justify-center bg-white border border-gray-100 text-orange-500 rounded-lg font-black active:scale-90 shadow-sm">-</button>
                                      <input type="number" className="w-8 bg-transparent border-none text-center font-black text-sm text-gray-800 p-0" value={itemDetail.units} onChange={e => updateQuantity(category, product.name, 'units', e.target.value)} />
                                      <button onClick={() => adjustQuantityValue(category, product.name, 'units', 1)} className="w-8 h-8 flex items-center justify-center bg-orange-500 text-white rounded-lg font-black active:scale-90 shadow-sm">+</button>
                                    </div>
                                  </div>
                                  <div className="flex flex-col gap-1">
                                    <span className="text-[10px] text-gray-400 font-bold uppercase ml-1">Cartons</span>
                                    <div className="flex items-center justify-between bg-gray-50 p-1 rounded-xl">
                                      <button onClick={() => adjustQuantityValue(category, product.name, 'cartons', -1)} className="w-8 h-8 flex items-center justify-center bg-white border border-gray-100 text-blue-500 rounded-lg font-black active:scale-90 shadow-sm">-</button>
                                      <input type="number" className="w-8 bg-transparent border-none text-center font-black text-sm text-gray-800 p-0" value={itemDetail.cartons} onChange={e => updateQuantity(category, product.name, 'cartons', e.target.value)} />
                                      <button onClick={() => adjustQuantityValue(category, product.name, 'cartons', 1)} className="w-8 h-8 flex items-center justify-center bg-blue-500 text-white rounded-lg font-black active:scale-90 shadow-sm">+</button>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}
          </div>

          {hasMore && (
            <div className="flex justify-center mt-6">
              <Button onClick={() => setVisibleCount(v => v + 50)} className="bg-gray-900 border border-gray-900 text-white rounded-full px-8 shadow-md">
                🔄 Charger plus ({totalFilteredCount - visibleCount} restants)
              </Button>
            </div>
          )}
          
          {error && <div className="text-red-500 text-sm font-bold text-center">{error}</div>}
          <Button onClick={handleSave}>💾 Valider l'Inventaire</Button>
        </Card>
      </motion.div>

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold text-gray-500 uppercase">Historique</h3>
          {currentUser?.role === 'manager' && (
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={exportJSON} className="gap-2 text-xs">
                <Download size={14} /> <span className="hidden sm:inline">Export JSON</span>
              </Button>
              <label className="flex items-center gap-2 px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-xl cursor-pointer transition-colors border border-gray-200 text-xs font-bold uppercase tracking-wider">
                <Upload size={14} />
                <span className="hidden sm:inline">Import JSON</span>
                <input type="file" accept=".json,application/json" onChange={importJSON} className="hidden" />
              </label>
              <label className="flex items-center gap-2 px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-xl cursor-pointer transition-colors border border-gray-200 text-xs font-bold uppercase tracking-wider">
                <Upload size={14} />
                <span className="hidden sm:inline">Importer XLS</span>
                <input type="file" accept=".xls,.xlsx" onChange={importExcel} className="hidden" />
              </label>
            </div>
          )}
        </div>
        <AnimatePresence>
          {entries.map((e: InventoryEntry, idx: number) => {
            let totalItems = 0;
            Object.values(e.items).forEach((cat: Record<string, InventoryItemDetail>) => {
              Object.values(cat).forEach((detail: InventoryItemDetail | string) => {
                const d = typeof detail === 'string' ? { units: detail, cartons: '0', na: false } : detail;
                if (!(d as any).na) totalItems++;
              });
            });
            return (
              <motion.div key={e.id} initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} layout>
                <Card className="relative p-4">
                  {deleteId === e.id ? (
                    <div className="absolute top-2 right-2 flex items-center gap-2 bg-red-50 p-1 rounded-lg z-10">
                      <span className="text-xs text-red-600 font-bold px-1">Sûr ?</span>
                      <button onClick={() => confirmDelete(e.id)} className="p-1 text-red-600 hover:text-red-800"><Check size={16}/></button>
                      <button onClick={() => setDeleteId(null)} className="p-1 text-gray-500 hover:text-gray-700"><X size={16}/></button>
                    </div>
                  ) : (
                    <div className="absolute top-2 right-2 flex items-center gap-1">
                      <button onClick={() => exportSinglePDF(e)} className="p-2 text-crousty-purple hover:text-purple-700 transition-colors bg-purple-50 rounded-lg"><FileText size={16} /></button>
                      <button onClick={() => setDeleteId(e.id)} className="p-2 text-gray-300 hover:text-red-500 transition-colors"><Trash2 size={16} /></button>
                    </div>
                  )}
                  <div className="text-sm font-bold text-gray-800">{new Date(e.date).toLocaleString('fr-FR')}</div>
                  <div className="text-xs text-gray-500 mt-1">Par : {e.responsable || 'Inconnu'}</div>
                  <div className="mt-2 text-sm font-bold text-crousty-purple bg-purple-50 p-2 rounded-lg inline-block">
                    {totalItems} produit(s) inventorié(s)
                  </div>
                </Card>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      {isManageModalOpen && createPortal(
        <AnimatePresence>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[500] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="bg-white w-full max-w-2xl rounded-[2rem] overflow-hidden relative shadow-2xl h-[90dvh] flex flex-col">
              <GererLesProduits onSave={refreshProducts} onCancel={() => { setIsManageModalOpen(false); setIsSidebarCollapsed?.(false); }} />
            </motion.div>
          </motion.div>
        </AnimatePresence>,
        document.body
      )}
    </div>
  );
}
