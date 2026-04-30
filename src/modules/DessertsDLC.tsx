import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { getStoredData, setStoredData } from '../lib/db';
import { addHours, addDays, addMonths, isPast } from 'date-fns';
import { DessertEntry } from '../types';
import { createSignature } from '../lib/permissions';
import { DlcLabelWorkspace } from '../components/dlc/DlcLabelWorkspace';
import { DlcHistory } from '../components/dlc/DlcHistory';
import { useCatalogue } from '../providers/CatalogueProvider';
import { Tag, History } from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { triggerSystemPrint } from '../lib/printing/triggerSystemPrint';

import { useConfig } from '../contexts/ConfigContext';

export default function DessertsDLC() {
  const { config } = useConfig();
  const { currentUser } = useAuth();
  const { produits } = useCatalogue();
  const [entries, setEntries] = useState<DessertEntry[]>([]);
  const [activeTab, setActiveTab] = useState<'creation' | 'history'>('creation');

  useEffect(() => {
    setEntries(getStoredData<DessertEntry[]>('crousty_desserts', []));

    const interval = setInterval(() => {
      setEntries([...getStoredData<DessertEntry[]>('crousty_desserts', [])]);
    }, 60000);
    return () => clearInterval(interval);
  }, []);

  const categories = Array.from(new Set(produits.map(p => p.category || 'Autre')));
  
  const activeEntries = entries
    .filter(e => !e.supprime && !isPast(new Date(e.dlcCalc)) && !e.used)
    .map(e => ({
      id: e.id,
      productId: '', 
      productName: e.dessertName || '',
      category: 'Inconnue',
      quantity: e.quantity || 1,
      printedAt: e.date || '',
      expiryDate: e.dlcCalc || '',
      author: e.responsable || ''
    }));

  const handleAddLabel = (productId: string, quantity: number, mode: 'virtual' | 'system') => {
    const dessert = produits.find(d => d.id === productId);
    if (!dessert) return;

    const dlcCalc = dessert.dlcUnit === 'hours' ? addHours(new Date(), dessert.dlcValue || 24) :
                    dessert.dlcUnit === 'mois' ? addMonths(new Date(), dessert.dlcValue || 1) :
                    addDays(new Date(), dessert.dlcValue || 1);
    
    const mobileWorker = localStorage.getItem('crousty_mobile_worker');
    const newEntry: DessertEntry = {
      id: Date.now().toString(),
      date: new Date().toISOString(),
      dessertName: dessert.name,
      dlcCalc: dlcCalc.toISOString(),
      responsable: currentUser?.name || mobileWorker || 'Inconnu',
      quantity,
      mode,
      used: false,
      signature: createSignature(currentUser || null)
    };
    
    const updated = [newEntry, ...entries];
    setEntries(updated);
    setStoredData('crousty_desserts', updated);
  };

  const handleDeleteLabel = (id: string) => {
    const updated = entries.map(e => e.id === id ? { ...e, supprime: true } : e);
    setEntries(updated);
    setStoredData('crousty_desserts', updated);
  };

  const handleDeleteLabelHistory = (id: string) => {
    const updated = entries.map(e => e.id === id ? { ...e, supprime: true } : e);
    setEntries(updated);
    setStoredData('crousty_desserts', updated);
  };

  const handleMarkUsed = (id: string) => {
    const updated = entries.map(e => e.id === id ? { ...e, used: true } : e);
    setEntries(updated);
    setStoredData('crousty_desserts', updated);
  };

  const handleReprint = async (entry: DessertEntry) => {
     if (entry.mode === 'virtual') {
        const doc = new jsPDF();
        doc.setFontSize(14);
        doc.text("Étiquette Virtuelle (Export PDF)", 10, 10);
        doc.setFontSize(10);
        doc.text(`Produit : ${entry.dessertName} (x${entry.quantity || 1})`, 10, 20);
        doc.text(`Auteur : ${entry.responsable}`, 10, 25);
        doc.text(`Préparé le : ${new Date(entry.date).toLocaleString('fr-FR')}`, 10, 30);
        doc.text(`Expire le : ${new Date(entry.dlcCalc).toLocaleString('fr-FR')}`, 10, 35);
        
        doc.save(`etiquette_${entry.dessertName}_${Date.now()}.pdf`);
     } else {
        const printSettings = getStoredData<any>('app_print_settings', {
          mode: 'system', format: '50x30', orientation: 'landscape', restaurantName: ''
        });
        const effectiveName = printSettings.restaurantName || config.restaurant.nom;
        const htmlDoc = `
          <div style="font-family: sans-serif; text-align: center; width: 100%; height: 100%; display: flex; flex-direction: column; justify-content: space-between; padding: 2px;">
            <div style="font-weight: 900; font-size: 10px; border-bottom: 1px solid black; padding-bottom: 2px;">${effectiveName}</div>
            <div style="font-weight: bold; font-size: 14px; margin-top: 5px;">${entry.dessertName}</div>
            <div style="font-size: 10px; margin-top: 2px;">x${entry.quantity || 1}</div>
            <div style="font-weight: 900; font-size: 12px; margin-top: auto; border-top: 1px solid black; padding-top: 2px;">Exp: ${new Date(entry.dlcCalc).toLocaleString('fr-FR')}</div>
          </div>
        `;
        try {
           await triggerSystemPrint(htmlDoc, printSettings);
        } catch(e) {
           console.error('Print Error', e);
        }
     }
  };

  return (
    <div className="py-2 px-0 md:px-0 max-w-7xl mx-auto flex-1 flex flex-col w-full h-[calc(100dvh-100px)] lg:h-[calc(100dvh-50px)]">
      <div className="flex gap-2 mx-4 md:mx-6 mb-2 mt-4 shrink-0">
        <button
           onClick={() => setActiveTab('creation')}
           className={`px-4 py-2 font-bold text-sm rounded-full flex items-center gap-2 transition-colors ${activeTab === 'creation' ? 'bg-crousty-purple text-white shadow-sm' : 'bg-white text-gray-500 border border-gray-200 hover:bg-gray-50'}`}
        >
           <Tag size={16} /> Création
        </button>
        <button
           onClick={() => setActiveTab('history')}
           className={`px-4 py-2 font-bold text-sm rounded-full flex items-center gap-2 transition-colors ${activeTab === 'history' ? 'bg-crousty-purple text-white shadow-sm' : 'bg-white text-gray-500 border border-gray-200 hover:bg-gray-50'}`}
        >
           <History size={16} /> Historique
        </button>
      </div>

      <div className="flex flex-col flex-1 px-4 md:px-6 pb-6 min-h-0">
        {activeTab === 'creation' ? (
          <DlcLabelWorkspace 
            products={produits}
            categories={categories}
            activeEntries={activeEntries}
            onAddLabel={handleAddLabel}
            onDeleteLabel={handleDeleteLabel}
            currentUser={currentUser}
          />
        ) : (
          <DlcHistory 
            entries={entries}
            onMarkUsed={handleMarkUsed}
            onReprint={handleReprint}
            onDelete={handleDeleteLabelHistory}
            currentUser={currentUser}
          />
        )}
      </div>
    </div>
  );
}
