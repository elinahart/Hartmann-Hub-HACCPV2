import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Download, Calendar, FileSpreadsheet, FileText, CheckSquare, Square, Filter } from 'lucide-react';
import { Button, Label } from './ui/LightUI';
import { generateProXLSX, generateProPDF, ExportOptions } from '../lib/exportPro';
import { format } from 'date-fns';

import { useConfig } from '../contexts/ConfigContext';

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ExportModal: React.FC<ExportModalProps> = ({ isOpen, onClose }) => {
  const { config } = useConfig();
  const [periodType, setPeriodType] = useState<'month' | 'day'>('month');
  const [selectedDate, setSelectedDate] = useState(() => {
    const now = new Date();
    return format(now, 'yyyy-MM-dd');
  });
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    return format(now, 'yyyy-MM');
  });

  const [categories, setCategories] = useState({
    temperatures: true,
    tracabilite: true,
    receptions: true,
    viandes: true,
    huiles: true,
    inventaire: true,
    nettoyage: true,
  });

  if (!isOpen) return null;

  const toggleCategory = (key: keyof typeof categories) => {
    setCategories(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const getTargetDate = () => {
    if (periodType === 'month') {
      const [year, month] = selectedMonth.split('-');
      return new Date(parseInt(year), parseInt(month) - 1, 1);
    } else {
      const [year, month, day] = selectedDate.split('-');
      return new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
    }
  };

  const getOptions = (): ExportOptions => ({
    periodType,
    targetDate: getTargetDate(),
    categories,
    restaurantInfo: {
      nom: config.restaurant.nom,
      ville: config.restaurant.ville
    }
  });

  const handleExportXLSX = async () => {
    await generateProXLSX(getOptions());
    onClose();
  };

  const handleExportPDF = async () => {
    await generateProPDF(getOptions());
    onClose();
  };

  const hasSelection = Object.values(categories).some(Boolean);

  return createPortal(
    <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-md rounded-[2rem] overflow-hidden relative shadow-2xl max-h-[90dvh] flex flex-col">
        <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50 shrink-0">
          <h3 className="font-black text-gray-800 uppercase tracking-wider flex items-center gap-2">
            <Download size={20} className="text-crousty-purple" /> Exporter les données
          </h3>
          <button onClick={onClose} className="p-2 bg-gray-200 rounded-full text-gray-600 hover:bg-gray-300 transition-colors">
            <X size={20} />
          </button>
        </div>
        
        <div className="p-6 space-y-6 overflow-y-auto">
          {/* PERIODE */}
          <div className="space-y-3">
            <Label className="flex items-center gap-2">
              <Calendar size={16} /> Période à exporter
            </Label>
            <div className="flex bg-gray-100 p-1 rounded-xl">
              <button 
                onClick={() => setPeriodType('month')}
                className={`flex-1 py-2 text-sm font-bold rounded-lg transition-colors ${periodType === 'month' ? 'bg-white shadow text-crousty-purple' : 'text-gray-500 hover:text-gray-700'}`}
              >
                Mois entier
              </button>
              <button 
                onClick={() => setPeriodType('day')}
                className={`flex-1 py-2 text-sm font-bold rounded-lg transition-colors ${periodType === 'day' ? 'bg-white shadow text-crousty-purple' : 'text-gray-500 hover:text-gray-700'}`}
              >
                Jour spécifique
              </button>
            </div>

            {periodType === 'month' ? (
              <input 
                type="month" 
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="w-full bg-gray-50/80 border-transparent rounded-xl px-4 py-3 text-gray-800 font-bold focus:bg-white focus:border-crousty-purple focus:ring-2 focus:ring-crousty-purple/20 transition-all"
              />
            ) : (
              <input 
                type="date" 
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="w-full bg-gray-50/80 border-transparent rounded-xl px-4 py-3 text-gray-800 font-bold focus:bg-white focus:border-crousty-purple focus:ring-2 focus:ring-crousty-purple/20 transition-all"
              />
            )}
          </div>

          {/* CATEGORIES */}
          <div className="space-y-3">
            <Label className="flex items-center gap-2">
              <Filter size={16} /> Catégories
            </Label>
            <div className="grid grid-cols-2 gap-2">
              {[
                { id: 'temperatures', label: 'Températures' },
                { id: 'tracabilite', label: 'Traçabilité' },
                { id: 'receptions', label: 'Livraisons' },
                { id: 'viandes', label: 'Cuisson Viandes' },
                { id: 'huiles', label: 'Huiles de Friture' },
                { id: 'inventaire', label: 'Inventaire' },
                { id: 'nettoyage', label: 'Nettoyage' }
              ].map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => toggleCategory(cat.id as keyof typeof categories)}
                  className={`flex items-center gap-2 p-3 rounded-xl border text-left text-sm font-bold transition-all ${categories[cat.id as keyof typeof categories] ? 'bg-crousty-purple/10 border-crousty-purple/30 text-crousty-purple' : 'bg-white border-gray-200 text-gray-500'}`}
                >
                  {categories[cat.id as keyof typeof categories] ? <CheckSquare size={16} /> : <Square size={16} />}
                  {cat.label}
                </button>
              ))}
            </div>
            {!hasSelection && <p className="text-red-500 text-xs font-bold pt-1">Veuillez sélectionner au moins une catégorie.</p>}
          </div>
        </div>
        
        <div className="p-6 bg-gray-50 border-t border-gray-100 flex flex-col gap-3 shrink-0">
          <Button disabled={!hasSelection} onClick={handleExportPDF} className="w-full flex items-center justify-center gap-2 bg-red-500 hover:bg-red-600 shadow-[0_8px_20px_-6px_rgba(239,68,68,0.5)]">
            <FileText size={20} /> Exporter en PDF
          </Button>
          <Button disabled={!hasSelection} onClick={handleExportXLSX} className="w-full flex items-center justify-center gap-2">
            <FileSpreadsheet size={20} /> Exporter en Excel
          </Button>
          <Button variant="secondary" onClick={onClose} className="w-full mt-2">Annuler</Button>
        </div>
      </div>
    </div>,
    document.body
  );
};
