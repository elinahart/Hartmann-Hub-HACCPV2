import React, { useState, useMemo } from 'react';
import { Search, Printer, CheckCircle, Tag, Download, Archive, Info, Check, Trash2 } from 'lucide-react';
import { DessertEntry } from '../../types';
import { format, isPast } from 'date-fns';
import { fr } from 'date-fns/locale';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface DlcHistoryProps {
  entries: DessertEntry[];
  onMarkUsed: (id: string) => void;
  onReprint: (entry: DessertEntry) => void;
  onDelete?: (id: string) => void;
  currentUser?: any;
}

export const DlcHistory: React.FC<DlcHistoryProps> = ({ entries, onMarkUsed, onReprint, onDelete, currentUser }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [modeFilter, setModeFilter] = useState<'all' | 'virtual' | 'system'>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'used'>('all');
  const [dateFilter, setDateFilter] = useState<'all' | 'today' | 'week'>('all');
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const filteredEntries = useMemo(() => {
    return entries
      .filter(e => !e.supprime)
      .filter(e => e.dessertName.toLowerCase().includes(searchTerm.toLowerCase()))
      .filter(e => modeFilter === 'all' || e.mode === modeFilter)
      .filter(e => {
        if (statusFilter === 'all') return true;
        const used = !!e.used;
        const past = Boolean(e.dlcCalc && isPast(new Date(e.dlcCalc)));
        if (statusFilter === 'used') return used || past; // Let's also consider expired as 'used' or inactive. Actually let's just stick to used
        if (statusFilter === 'active') return !used && !past;
        return true;
      })
      .filter(e => {
        if (dateFilter === 'all') return true;
        const d = new Date(e.date);
        const now = new Date();
        if (dateFilter === 'today') {
           return d.toDateString() === now.toDateString();
        }
        if (dateFilter === 'week') {
           const weekAgo = new Date();
           weekAgo.setDate(now.getDate() - 7);
           return d >= weekAgo;
        }
        return true;
      })
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [entries, searchTerm, modeFilter, statusFilter, dateFilter]);

  const handleExportCSV = () => {
    const header = ['Produit', 'Quantité', 'Préparation', 'Expiration', 'Mode', 'Auteur', 'Statut'];
    const rows = filteredEntries.map(e => [
      e.dessertName,
      e.quantity || 1,
      format(new Date(e.date), 'dd/MM/yyyy HH:mm'),
      format(new Date(e.dlcCalc), 'dd/MM/yyyy HH:mm'),
      e.mode === 'virtual' ? 'Virtuelle' : 'Imprimée',
      e.responsable,
      e.used ? 'Consommée' : isPast(new Date(e.dlcCalc)) ? 'Expirée' : 'Active'
    ]);
    const csvContent = [header.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `haccp_etiquettes_${format(new Date(), 'yyyyMMdd')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExportPDF = () => {
    const doc = new jsPDF();
    doc.text('Historique des Étiquettes DLC', 14, 15);
    doc.setFontSize(10);
    doc.text(`Imprimé le : ${format(new Date(), 'dd/MM/yyyy HH:mm')}`, 14, 21);

    const tableData = filteredEntries.map(e => [
      e.dessertName,
      (e.quantity || 1).toString(),
      format(new Date(e.date), 'dd/MM/yyyy HH:mm'),
      format(new Date(e.dlcCalc), 'dd/MM/yyyy HH:mm'),
      e.mode === 'virtual' ? 'Virtuelle' : 'Imprimée',
      e.responsable,
      e.used ? 'Consommée' : isPast(new Date(e.dlcCalc)) ? 'Expirée (Perte)' : 'Active'
    ]);

    autoTable(doc, {
      startY: 30,
      head: [['Produit', 'Qté', 'Préparé le', 'Expire le', 'Mode', 'Auteur', 'Statut']],
      body: tableData,
      theme: 'grid',
      styles: { fontSize: 8 },
      headStyles: { fillColor: [99, 102, 241] } // crousty-purple variant roughly
    });

    doc.save(`haccp_etiquettes_${format(new Date(), 'yyyyMMdd')}.pdf`);
  };

  return (
    <div className="flex flex-col flex-1 w-full min-h-0 overflow-hidden bg-gray-50/50 rounded-2xl border border-gray-200 shadow-sm animate-in fade-in zoom-in-95 duration-300">
      
      {/* Filters Bar */}
      <div className="bg-white border-b border-gray-200 p-4 shrink-0 flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="relative w-full md:w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <input 
            type="text"
            placeholder="Rechercher étiquette..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full bg-gray-100 border-none rounded-xl pl-10 pr-4 py-2 text-sm font-medium focus:ring-2 focus:ring-crousty-purple outline-none"
          />
        </div>

        <div className="flex flex-wrap gap-2 md:gap-4 items-center w-full md:w-auto">
          <select 
            value={modeFilter} 
            onChange={(e) => setModeFilter(e.target.value as any)}
            className="bg-gray-100 border-none rounded-xl px-4 py-2 text-sm font-bold text-gray-600 outline-none focus:ring-2 focus:ring-crousty-purple"
          >
            <option value="all">Tous les modes</option>
            <option value="virtual">Virtuelles</option>
            <option value="system">Imprimées</option>
          </select>

          <select 
            value={statusFilter} 
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="bg-gray-100 border-none rounded-xl px-4 py-2 text-sm font-bold text-gray-600 outline-none focus:ring-2 focus:ring-crousty-purple"
          >
            <option value="all">Tous les statuts</option>
            <option value="active">Actives</option>
            <option value="used">Consommées / Archivées</option>
          </select>
          
          <select 
            value={dateFilter} 
            onChange={(e) => setDateFilter(e.target.value as any)}
            className="bg-gray-100 border-none rounded-xl px-4 py-2 text-sm font-bold text-gray-600 outline-none focus:ring-2 focus:ring-crousty-purple"
          >
            <option value="all">Toutes les dates</option>
            <option value="today">Aujourd'hui</option>
            <option value="week">7 derniers jours</option>
          </select>
          
          <div className="flex gap-2 ml-auto">
             <button onClick={handleExportCSV} className="p-2 text-gray-500 hover:text-gray-900 bg-gray-100 hover:bg-gray-200 rounded-xl transition" title="Exporter CSV"><Download size={18} /></button>
             <button onClick={handleExportPDF} className="p-2 text-gray-500 hover:text-white hover:bg-crousty-purple bg-gray-100 rounded-xl transition" title="Exporter PDF HACCP"><Archive size={18} /></button>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 md:p-6 no-scrollbar space-y-3">
        {filteredEntries.length === 0 ? (
           <div className="text-center py-20 text-gray-400 font-medium">Aucune étiquette trouvée.</div>
        ) : (
           filteredEntries.map(entry => {
             const isExpired = isPast(new Date(entry.dlcCalc));
             const isActive = !entry.used && !isExpired;
             const isVirtual = entry.mode === 'virtual';

             return (
               <div key={entry.id} className={`relative p-4 rounded-xl border flex flex-col md:flex-row gap-4 items-center justify-between transition-colors ${entry.used ? 'bg-gray-50 border-gray-200 opacity-60' : isActive ? 'bg-white border-crousty-purple/20 shadow-sm' : 'bg-red-50 border-red-200 opacity-80'}`}>
                 {/* Delete Overlay */}
                 {deleteConfirmId === entry.id && (
                   <div className="absolute inset-0 z-20 bg-white/95 backdrop-blur-sm rounded-xl flex flex-col md:flex-row items-center justify-center p-4 gap-4 animate-in fade-in">
                     <p className="font-bold text-red-600 text-sm">Supprimer cette étiquette ?</p>
                     <div className="flex gap-2">
                       <button onClick={() => setDeleteConfirmId(null)} className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-sm font-bold transition">Annuler</button>
                       <button onClick={() => { onDelete?.(entry.id); setDeleteConfirmId(null); }} className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg text-sm font-bold transition">Confirmer</button>
                     </div>
                   </div>
                 )}

                 <div className="flex items-center gap-4 w-full md:w-auto">
                    <div className={`p-3 rounded-xl flex-shrink-0 ${entry.used ? 'bg-gray-200 text-gray-500' : isActive ? 'bg-indigo-100 text-indigo-600' : 'bg-red-100 text-red-600'}`}>
                      <Tag size={20} />
                    </div>
                    <div>
                       <div className="font-black text-gray-800 text-base">{entry.dessertName} <span className="text-xs font-bold bg-white px-2 py-0.5 rounded-full border border-gray-200 ml-2">x{entry.quantity || 1}</span></div>
                       <div className="text-xs text-gray-500 mt-1 flex flex-wrap gap-2">
                          <span className="font-medium text-gray-400">Par {entry.responsable}</span>
                          <span className="text-gray-300">•</span>
                          <span>Créé le {format(new Date(entry.date), 'dd/MM à HH:mm')}</span>
                       </div>
                    </div>
                 </div>

                 <div className="flex flex-wrap md:flex-nowrap items-center gap-4 w-full md:w-auto justify-end">
                    <div className="text-right flex-shrink-0">
                       <div className={`text-xs font-bold uppercase tracking-wide ${entry.used ? 'text-gray-500' : isActive ? 'text-indigo-600' : 'text-red-500'}`}>
                         {entry.used ? 'Consommée' : isActive ? 'Valide jusqu\'au' : 'Expirée depuis'}
                       </div>
                       <div className={`font-black text-sm ${isActive ? 'text-gray-900' : 'text-gray-500'}`}>
                         {format(new Date(entry.dlcCalc), 'dd/MM/yyyy HH:mm')}
                       </div>
                    </div>
                    
                    <div className="flex gap-2 items-center">
                       {isVirtual && !entry.used && (
                         <button 
                            onClick={() => onMarkUsed(entry.id)}
                            className="bg-green-100 text-green-700 hover:bg-green-200 px-3 py-2 rounded-lg text-xs font-bold flex items-center gap-1 transition"
                         >
                            <Check size={14} /> Consommer
                         </button>
                       )}
                       <button
                          onClick={() => onReprint(entry)}
                          className="bg-gray-100 text-gray-700 hover:bg-gray-200 px-3 py-2 rounded-lg text-xs font-bold flex items-center gap-1 transition"
                       >
                          <Printer size={14} /> {isVirtual ? 'Imprimer PDF' : 'Réimprimer'}
                       </button>
                       {currentUser?.role === 'manager' && onDelete && (
                         <button
                           onClick={() => setDeleteConfirmId(entry.id)}
                           className="bg-red-50 text-red-600 hover:bg-red-100 px-3 py-2 rounded-lg text-xs font-bold flex items-center transition"
                           title="Supprimer (Manager)"
                         >
                           <Trash2 size={16} />
                         </button>
                       )}
                    </div>
                 </div>
               </div>
             )
           })
        )}
      </div>
    </div>
  );
};
