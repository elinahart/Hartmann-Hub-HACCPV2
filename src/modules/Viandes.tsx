import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useConfig } from '../contexts/ConfigContext';
import { Card, Input, Label, Button } from '../components/ui/LightUI';
import { getStoredData, setStoredData } from '../lib/db';
import { Check, X, Clock, AlertCircle } from 'lucide-react';
import { createSignature } from '../lib/permissions';
import { SaisieActions } from '../components/SaisieActions';
import { SignatureSaisie } from '../types';
import { cn } from '../lib/utils';
import { ICONS_MAP } from '../components/GererLesProduits';

export interface CuissonProduit {
  temp: string;
  conforme: boolean;
  action?: string;
}

export interface ViandeEntry {
  id: string;
  date: string;
  
  // Legacy
  typeViande?: string;
  temperature?: string;
  conforme?: string;
  actionCorrective?: string;

  // New format
  produits?: Record<string, CuissonProduit>;

  responsable: string;
  signature?: SignatureSaisie;
  supprime?: boolean;
}

export default function Viandes() {
  const { currentUser } = useAuth();
  const { config } = useConfig();
  const [entries, setEntries] = useState<ViandeEntry[]>([]);
  
  // State for dynamic products
  const [formValues, setFormValues] = useState<Record<string, { temp: string, action: string }>>({});
  
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState(new Date());

  const activeProducts = (config.cuisson || []).filter(p => p.active);

  useEffect(() => {
    setEntries(getStoredData<ViandeEntry[]>('crousty_viandes', []));
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const getConformite = (tempStr: string) => {
    if (!tempStr) return null;
    const tempNum = parseFloat(tempStr.replace(',', '.'));
    if (isNaN(tempNum)) return null;
    return tempNum >= 67;
  };

  const handleValueChange = (id: string, field: 'temp' | 'action', value: string) => {
    setFormValues(prev => ({
      ...prev,
      [id]: {
        ...(prev[id] || { temp: '', action: '' }),
        [field]: value
      }
    }));
  };

  const checkProductValidity = (id: string) => {
    const val = formValues[id];
    if (!val || !val.temp) return false;
    const conforme = getConformite(val.temp);
    if (conforme === null) return false;
    if (!conforme && !val.action.trim()) return false;
    return true;
  };

  const canSubmit = activeProducts.length > 0 && activeProducts.every(p => checkProductValidity(p.id));

  const handleSave = () => {
    if (!canSubmit) return;
    
    const produitsSaisis: Record<string, CuissonProduit> = {};
    activeProducts.forEach(p => {
      const val = formValues[p.id];
      const conforme = getConformite(val.temp)!;
      produitsSaisis[p.id] = {
        temp: val.temp,
        conforme,
        action: conforme ? undefined : val.action
      };
    });

    const newEntry: ViandeEntry = {
      id: Date.now().toString(), 
      date: new Date().toISOString(), 
      produits: produitsSaisis,
      responsable: currentUser?.name || localStorage.getItem('crousty_mobile_worker') || 'Inconnu',
      signature: createSignature(currentUser || null)
    };
    
    const updated = [newEntry, ...entries];
    setEntries(updated);
    setStoredData('crousty_viandes', updated);
    
    // Reset form
    setFormValues({});
  };

  const handleDelete = (id: string) => {
    const updated = entries.map(e => e.id === id ? { ...e, supprime: true } : e);
    setEntries(updated);
    setStoredData('crousty_viandes', updated);
    setDeleteId(null);
  };

  const isDoneToday = entries.some(e => {
    if (e.supprime) return false;
    const date = new Date(e.date);
    return date.getDate() === currentTime.getDate() && 
           date.getMonth() === currentTime.getMonth() && 
           date.getFullYear() === currentTime.getFullYear();
  });

  const hours = currentTime.getHours();
  const enRetard = !isDoneToday && hours >= 10;

  const renderProductCard = (product: any) => {
    const val = formValues[product.id] || { temp: '', action: '' };
    const conforme = getConformite(val.temp);
    const isError = conforme === false;
    const isSuccess = conforme === true;
    
    return (
      <div key={product.id} className={`p-4 rounded-[2rem] border-2 transition-all duration-300 ${isSuccess ? 'border-green-500 bg-green-50/50 shadow-sm shadow-green-100' : isError ? 'border-red-500 bg-red-50/50 shadow-sm shadow-red-100' : 'border-gray-100 bg-white'}`}>
        <div className="flex justify-between items-center mb-4">
          <h3 className="font-black text-lg text-gray-800 flex items-center gap-2">
            <span className="flex items-center justify-center w-8 h-8 rounded-lg bg-gray-50 text-gray-600 border border-gray-100">
              {(() => {
                const IconCmp = ICONS_MAP[product.icon || 'Drumstick'] || ICONS_MAP['Package'];
                return <IconCmp size={18} />;
              })()}
            </span>
            {product.name}
          </h3>
          {isSuccess && <span className="flex items-center gap-1 text-green-600 font-bold text-xs bg-white border border-green-200 px-3 py-1.5 rounded-full shadow-sm">Conforme ✅</span>}
          {isError && <span className="flex items-center gap-1 text-red-600 font-bold text-xs bg-white border border-red-200 px-3 py-1.5 rounded-full shadow-sm">Non conforme ❌</span>}
        </div>
        
        <div className="space-y-4">
          <div>
            <Label className="text-[10px] text-gray-400 font-black uppercase tracking-widest mb-1.5 block">Temp. à cœur (°C)</Label>
            <div className="relative">
              <Input 
                type="number" 
                inputMode="decimal" 
                step="0.1" 
                value={val.temp} 
                onChange={(e: any) => handleValueChange(product.id, 'temp', e.target.value)} 
                className={`text-xl font-black h-12 pt-1 rounded-2xl ${isError ? 'border-red-300 ring-4 ring-red-50' : isSuccess ? 'border-green-300 ring-4 ring-green-50' : 'border-gray-200'}`}
                placeholder="Ex: 72"
              />
              <div className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 font-black text-sm">°C</div>
            </div>
          </div>

          {isError && (
            <div className="animate-in fade-in slide-in-from-top-2 duration-300">
              <Label className="text-red-700 font-black text-[10px] uppercase tracking-widest flex items-center gap-1 mb-1.5">
                <AlertCircle size={12} /> Action corrective obligatoire
              </Label>
              <Input 
                value={val.action} 
                onChange={(e: any) => handleValueChange(product.id, 'action', e.target.value)} 
                placeholder="Ex: Remis en cuisson 5 min" 
                className="border-red-200 bg-white rounded-2xl h-11 text-sm font-bold placeholder:text-red-300"
              />
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6 pb-20 pt-8 max-w-4xl mx-auto px-4">
      <div className="text-center space-y-2">
        <h2 className="text-3xl font-black text-gray-900 tracking-tight leading-none">Cuisson Alimentaire</h2>
        <p className="text-gray-400 font-bold text-sm">Contrôle quotidien de la température à cœur</p>
      </div>
      
      {/* Banner */}
      <div className={`p-5 rounded-[2rem] flex items-center justify-between shadow-sm border-2 ${isDoneToday ? 'bg-green-50 border-green-200' : enRetard ? 'bg-red-50 border-red-200' : 'bg-blue-50 border-blue-200'}`}>
        <div className="flex items-center gap-4">
          <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shadow-inner ${isDoneToday ? 'bg-white text-green-500' : enRetard ? 'bg-white text-red-500' : 'bg-white text-blue-500'}`}>
            {isDoneToday ? <Check size={24} /> : enRetard ? <AlertCircle size={24} /> : <Clock size={24} />}
          </div>
          <div>
            <div className={`font-black text-lg leading-tight ${isDoneToday ? 'text-green-900' : enRetard ? 'text-red-900' : 'text-blue-900'}`}>
              {isDoneToday ? "Contrôle effectué ✅" : enRetard ? "Contrôle en retard ⚠️" : "Contrôle à effectuer"}
            </div>
            <div className="text-xs font-bold text-gray-500 mt-0.5 uppercase tracking-wide">
              Objectif : Avant 10h00 • {currentTime.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {activeProducts.map(renderProductCard)}
      </div>

      {activeProducts.length === 0 ? (
        <div className="py-12 bg-gray-50 rounded-[3rem] border-2 border-dashed border-gray-100 flex flex-col items-center justify-center text-gray-400">
           <AlertCircle size={40} className="mb-3 opacity-20" />
           <p className="font-black">Aucun produit à cuire configuré</p>
           <p className="text-xs font-bold uppercase tracking-widest mt-1">Contactez votre manager</p>
        </div>
      ) : (
        <Button 
          onClick={handleSave} 
          disabled={!canSubmit}
          className={`w-full py-6 text-xl rounded-[2rem] shadow-xl transition-all font-black uppercase tracking-widest ${!canSubmit ? 'bg-gray-200 text-gray-400' : 'bg-gray-900 text-white hover:scale-[1.02] active:scale-[0.98]'}`}
        >
          Valider le contrôle
        </Button>
      )}
      
      <div className="space-y-6 mt-12">
        <div className="flex items-center justify-between px-2">
          <h3 className="text-xs font-black text-gray-400 uppercase tracking-[0.2em]">Historique des contrôles</h3>
        </div>
        
        <div className="grid grid-cols-1 gap-4">
          {entries.filter(e => !e.supprime).map(e => (
            <Card key={e.id} className="relative overflow-hidden group border-gray-100 rounded-[2rem] p-6">
              {deleteId === e.id && (
                <div className="absolute inset-0 bg-red-50/98 backdrop-blur-md z-30 flex flex-col items-center justify-center p-6 animate-in fade-in duration-200">
                  <p className="text-red-900 font-black text-lg mb-4 text-center leading-tight">
                    Supprimer ce contrôle ?
                  </p>
                  <div className="flex gap-3 w-full max-w-xs">
                    <button 
                      onClick={() => setDeleteId(null)} 
                      className="flex-1 h-12 bg-white text-gray-500 rounded-2xl font-black border border-gray-200 shadow-sm"
                    >
                      NON
                    </button>
                    <button 
                      onClick={() => handleDelete(e.id)} 
                      className="flex-1 h-12 bg-red-500 text-white rounded-2xl font-black shadow-lg shadow-red-200"
                    >
                      OUI
                    </button>
                  </div>
                </div>
              )}
              
              <div className="flex justify-between items-start mb-6">
                <div className="flex items-center gap-4">
                   <div className="w-12 h-12 bg-gray-50 rounded-2xl flex flex-col items-center justify-center text-gray-500">
                      <span className="text-[10px] font-black leading-none">{new Date(e.date).toLocaleDateString('fr-FR', { day: '2-digit' })}</span>
                      <span className="text-[8px] font-black uppercase leading-none mt-0.5">{new Date(e.date).toLocaleDateString('fr-FR', { month: 'short' })}</span>
                   </div>
                   <div>
                      <div className="text-sm font-black text-gray-900 uppercase tracking-tight">{new Date(e.date).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</div>
                      <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-0.5">Par {e.responsable}</div>
                   </div>
                </div>
                
                {deleteId !== e.id && (
                  <SaisieActions saisie={e} onDelete={() => setDeleteId(e.id)} />
                )}
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {e.produits ? Object.entries(e.produits).map(([prodId, details]) => {
                  const d = details as CuissonProduit;
                  const pHeader = config.cuisson?.find(cp => cp.id === prodId);
                  return (
                    <div key={prodId} className="bg-gray-50/50 p-4 rounded-2xl border border-gray-100">
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-xs font-black text-gray-500 uppercase tracking-wide truncate pr-2 flex items-center gap-1">
                           {(() => {
                             const IconCmp = ICONS_MAP[pHeader?.icon || 'Drumstick'] || ICONS_MAP['Package'];
                             return <IconCmp size={12} />;
                           })()}
                           {pHeader?.name || prodId}
                        </span>
                        <span className={cn(
                          "text-sm font-black",
                          d.conforme ? "text-green-600" : "text-red-500"
                        )}>
                          {d.temp}°C
                        </span>
                      </div>
                      
                      {!d.conforme && d.action && (
                        <div className="mt-2 pt-2 border-t border-gray-200/50">
                           <p className="text-[10px] font-bold text-red-600 leading-tight">
                              ⚠️ {d.action}
                           </p>
                        </div>
                      )}
                    </div>
                  );
                }) : (
                  // Legacy fallback
                  <div className="col-span-full bg-gray-50 p-3 rounded-xl border border-gray-100">
                    <p className="text-xs font-bold text-gray-400 italic">Format de données ancien</p>
                  </div>
                )}
              </div>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
