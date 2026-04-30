import React, { useState, useEffect } from 'react';
import { useConfig } from '../../contexts/ConfigContext';
import { Button, Label } from '../ui/LightUI';
import { Package, Calendar, Bell, Send, ChevronRight, Settings, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { getStoredData } from '../../lib/db';
import { InventoryProduct } from '../../types';
import { GererLesProduits } from '../GererLesProduits';

import { useInventaire } from '../../providers/InventaireProvider';

export const InventaireTab = () => {
  const { config, updateConfig } = useConfig();
  const { products } = useInventaire();
  const [isManagingProducts, setIsManagingProducts] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');

  const productCount = products.length;

  const updateInventaireConfig = async (updates: any) => {
    setSaveStatus('saving');
    try {
      // Simulation pour l'UX
      await new Promise(resolve => setTimeout(resolve, 300));
      updateConfig({
        inventaire: {
          ...config.inventaire,
          ...updates
        }
      });
      setSaveStatus('saved');
      setTimeout(() => setSaveStatus('idle'), 2000);
    } catch (e) {
      setSaveStatus('error');
      setTimeout(() => setSaveStatus('idle'), 3000);
    }
  };

  const DAYS = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'];

  if (isManagingProducts) {
    return (
      <div className="h-full flex flex-col">
        <GererLesProduits onCancel={() => setIsManagingProducts(false)} />
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <section className="space-y-4">
        <h3 className="text-xl font-black text-gray-800 flex items-center gap-2">
          <Package className="text-crousty-purple" size={24} /> Produits
        </h3>
        <div className="bg-purple-50 p-6 rounded-3xl border border-purple-100 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>
            <div className="text-lg font-bold text-crousty-purple">Base de données</div>
            <p className="text-gray-600 text-sm">Vous avez <span className="font-black text-crousty-purple">{productCount}</span> produits enregistrés.</p>
          </div>
          <Button 
            onClick={() => setIsManagingProducts(true)}
            className="bg-crousty-purple text-white rounded-2xl flex items-center gap-2 px-6 py-3 whitespace-nowrap shadow-lg shadow-purple-200 hover:scale-105 transition-transform"
          >
            Gérer la liste des produits <ChevronRight size={18} />
          </Button>
        </div>
      </section>

      <section className="space-y-6">
        <div className="flex items-center justify-between">
          <h3 className="text-xl font-black text-gray-800 flex items-center gap-2">
            <Settings className="text-crousty-purple" size={24} /> Paramètres de l'inventaire
          </h3>
          
          <div className="flex items-center h-6">
            {saveStatus === 'saving' && <span className="flex items-center gap-1.5 text-sm font-bold text-gray-400"><Loader2 size={16} className="animate-spin" /> Enregistrement...</span>}
            {saveStatus === 'saved' && <span className="flex items-center gap-1.5 text-sm font-bold text-green-500 animate-in fade-in"><CheckCircle2 size={16} /> Enregistré</span>}
            {saveStatus === 'error' && <span className="flex items-center gap-1.5 text-sm font-bold text-red-500 animate-in fade-in"><AlertCircle size={16} /> Erreur</span>}
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2 relative">
            <Label className="flex items-center gap-2">
              <Calendar size={16} className="text-gray-400" /> Fréquence obligatoire
            </Label>
            <select 
              className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-4 py-3 text-gray-800 font-bold focus:outline-none focus:ring-2 focus:ring-crousty-purple/50 appearance-none disabled:opacity-50"
              value={config.inventaire.frequence}
              onChange={e => updateInventaireConfig({ frequence: e.target.value })}
              disabled={saveStatus === 'saving'}
            >
              <option value="quotidien">Quotidien</option>
              <option value="hebdomadaire">Hebdomadaire</option>
              <option value="mensuel">Mensuel</option>
            </select>
            <div className="absolute right-4 top-10 pointer-events-none text-gray-400">
               <ChevronRight size={16} className="rotate-90" />
            </div>
          </div>

          {config.inventaire.frequence === 'hebdomadaire' && (
            <div className="space-y-2 animate-in fade-in slide-in-from-left-4 relative">
              <Label className="flex items-center gap-2">
                <Calendar size={16} className="text-gray-400" /> Jour de l'inventaire
              </Label>
              <select 
                className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-4 py-3 text-gray-800 font-bold focus:outline-none focus:ring-2 focus:ring-crousty-purple/50 appearance-none disabled:opacity-50"
                value={config.inventaire.jourSemaine}
                onChange={e => updateInventaireConfig({ jourSemaine: e.target.value })}
                disabled={saveStatus === 'saving'}
              >
                {DAYS.map(d => <option key={d} value={d.toLowerCase()}>{d}</option>)}
              </select>
              <div className="absolute right-4 top-10 pointer-events-none text-gray-400">
                 <ChevronRight size={16} className="rotate-90" />
              </div>
            </div>
          )}
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl border border-gray-100">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-50 text-blue-500 rounded-xl">
                <Bell size={20} />
              </div>
              <div>
                <div className="font-bold text-gray-800">Rappel automatique</div>
                <div className="text-xs text-gray-500">Afficher une alerte sur le dashboard si l'inventaire est en retard.</div>
              </div>
            </div>
            <button 
              onClick={() => updateInventaireConfig({ rappelActif: !config.inventaire.rappelActif })}
              disabled={saveStatus === 'saving'}
              className={`w-12 h-7 rounded-full transition-colors relative flex items-center px-1 disabled:opacity-50 ${config.inventaire.rappelActif ? 'bg-crousty-purple' : 'bg-gray-300'}`}
            >
              <div className={`w-5 h-5 bg-white rounded-full shadow-sm transition-transform ${config.inventaire.rappelActif ? 'translate-x-5' : 'translate-x-0'}`}></div>
            </button>
          </div>

          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl border border-gray-100">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-50 text-green-500 rounded-xl">
                <Send size={20} />
              </div>
              <div>
                <div className="font-bold text-gray-800">Validation & Envoi</div>
                <div className="text-xs text-gray-500">Marquer comme "À envoyer" une fois terminé (notification manager).</div>
              </div>
            </div>
            <button 
              onClick={() => updateInventaireConfig({ envoiSuperieur: !config.inventaire.envoiSuperieur })}
              disabled={saveStatus === 'saving'}
              className={`w-12 h-7 rounded-full transition-colors relative flex items-center px-1 disabled:opacity-50 ${config.inventaire.envoiSuperieur ? 'bg-crousty-purple' : 'bg-gray-300'}`}
            >
              <div className={`w-5 h-5 bg-white rounded-full shadow-sm transition-transform ${config.inventaire.envoiSuperieur ? 'translate-x-5' : 'translate-x-0'}`}></div>
            </button>
          </div>
        </div>
      </section>
    </div>
  );
};
