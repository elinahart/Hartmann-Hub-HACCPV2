import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Card, Input, Label, Button, Select } from '../components/ui/LightUI';
import { PrepEntry, ReceptionEntry } from '../types';
import { getStoredData, setStoredData } from '../lib/db';
import { addHours, formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Trash2, Check, X } from 'lucide-react';
import { createSignature } from '../lib/permissions';
import { SaisieActions } from '../components/SaisieActions';

const SAUCES = [
  { id: 'crousty', name: 'Sauce Crousty', hours: 24 },
  { id: 'boursin', name: 'Sauce Boursin', hours: 48 },
  { id: 'verte', name: 'Sauce Verte', hours: 48 },
];

export default function PrepSauces() {
  const { currentUser } = useAuth();
  const [entries, setEntries] = useState<PrepEntry[]>([]);
  const [activeLots, setActiveLots] = useState<ReceptionEntry[]>([]);
  const [selectedSauce, setSelectedSauce] = useState(SAUCES[0].id);
  const [selectedLots, setSelectedLots] = useState<string[]>([]);
    const [deleteId, setDeleteId] = useState<string | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    setEntries(getStoredData<PrepEntry[]>('crousty_prep', []));
    
    // Get lots from both sources
    const receptions = getStoredData<any[]>('crousty_receptions_v3', []);
    const tracabilite = getStoredData<any[]>('crousty_tracabilite_v2', []);
    
    const flattenedLots: any[] = [];
    
    // Flatten receptions (v3 has multiple lines)
    receptions.forEach(r => {
      if (r.lignes) {
        r.lignes.forEach((l: any) => {
          flattenedLots.push({
            id: `${r.id}_${l.id}`,
            ingredient: l.produit,
            numeroLot: l.numeroLot,
            date: r.date
          });
        });
      }
    });
    
    // Add items from traceability (v2)
    tracabilite.forEach(t => {
      flattenedLots.push({
        id: t.id,
        ingredient: t.produit,
        numeroLot: t.numeroLot,
        date: t.date
      });
    });
    
    // Sort by date (recent first)
    flattenedLots.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    
    setActiveLots(flattenedLots);
  }, []);

  const toggleLot = (id: string) => {
    setSelectedLots(prev => prev.includes(id) ? prev.filter(l => l !== id) : [...prev, id]);
  };

  const handleSave = () => {
    if (selectedLots.length === 0) {
      setError("Veuillez sélectionner au moins un lot.");
      return;
    }
    const sauce = SAUCES.find(s => s.id === selectedSauce)!;
    const dlcCalc = addHours(new Date(), sauce.hours).toISOString();
    
    const mobileWorker = localStorage.getItem('crousty_mobile_worker');
    const newEntry: PrepEntry = {
      id: Date.now().toString(),
      date: new Date().toISOString(),
      sauceName: sauce.name,
      linkedLots: selectedLots,
      dlcCalc,
      responsable: currentUser?.name || mobileWorker || 'Inconnu',
      signature: createSignature(currentUser || null)
    };
    const updated = [newEntry, ...entries];
    setEntries(updated);
    setStoredData('crousty_prep', updated);
    setSelectedLots([]);  setError('');
  };

  const confirmDelete = (id: string) => {
    const entryToDel = entries.find(e => e.id === id);
    if (!entryToDel) return;
    const updated = entries.map(e => e.id === id ? { ...e, supprime: true } : e);
    setEntries(updated);
    setStoredData('crousty_prep', updated);
    setDeleteId(null);
  };

  return (
    <div className="space-y-6 pb-20 pt-8">
      <h2 className="text-2xl font-black text-gray-800 uppercase tracking-widest text-center">📊 Traçabilité / Prep</h2>
      <Card className="space-y-4">
        <div>
          <Label>Sauce Préparée</Label>
          <Select value={selectedSauce} onChange={(e: any) => setSelectedSauce(e.target.value)}>
            {SAUCES.map(s => <option key={s.id} value={s.id}>{s.name} ({s.hours}h)</option>)}
          </Select>
        </div>
        <div>
          <Label>Lier aux lots d'ingrédients actifs</Label>
          <div className="space-y-2 max-h-40 overflow-y-auto p-3 bg-gray-50 border border-gray-200 rounded-xl">
            {activeLots.length === 0 ? <div className="text-xs text-gray-500">Aucun lot actif.</div> : 
              activeLots.map(lot => (
                <label key={lot.id} className="flex items-center gap-3 text-sm text-gray-700 cursor-pointer p-2 hover:bg-gray-100 rounded-lg transition-colors">
                  <input type="checkbox" checked={selectedLots.includes(lot.id)} onChange={() => toggleLot(lot.id)} className="w-4 h-4 text-blue-500 rounded focus:ring-blue-500" />
                  <span className="font-bold">{lot.ingredient}</span> <span className="text-gray-500">(Lot: {lot.numeroLot})</span>
                </label>
              ))
            }
          </div>
        </div>
        
        {error && <div className="text-red-500 text-sm font-bold text-center">{error}</div>}
        <Button onClick={handleSave}>💾 Valider la Préparation</Button>
      </Card>
      <div className="space-y-4">
        <h3 className="text-lg font-bold text-gray-500 uppercase">Préparations Actives</h3>
        {entries.filter(e => !e.supprime).map(e => (
          <Card key={e.id} className="relative">
            {deleteId === e.id ? (
              <div className="absolute top-2 right-2 flex items-center gap-2 bg-red-50 p-1 rounded-lg z-10">
                <span className="text-xs text-red-600 font-bold px-1">Sûr ?</span>
                <button onClick={() => confirmDelete(e.id)} className="p-1 text-red-600 hover:text-red-800"><Check size={16}/></button>
                <button onClick={() => setDeleteId(null)} className="p-1 text-gray-500 hover:text-gray-700"><X size={16}/></button>
              </div>
            ) : (
               <div className="absolute top-2 right-2 z-10">
                  <SaisieActions saisie={e} onDelete={() => setDeleteId(e.id)} />
               </div>
            )}
            <div className="font-black text-lg text-gray-800">{e.sauceName}</div>
            <div className="text-crousty-purple text-sm font-bold mt-1">Expire dans : {formatDistanceToNow(new Date(e.dlcCalc), { locale: fr })}</div>
            <div className="flex items-center gap-2 mt-2">
               <div className="text-xs text-gray-500 font-medium">Lots liés : {e.linkedLots.length}</div>
               <span className="text-gray-300">•</span>
               <span className="text-xs font-bold text-gray-600">Par {e.responsable}</span>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
