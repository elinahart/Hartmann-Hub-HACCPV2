import React, { useState } from 'react';
import { Printer, Wifi, Server, Smartphone, AlertTriangle, Info } from 'lucide-react';
import { Button, Select, Label, Input } from '../ui/LightUI';
import { getStoredData, setStoredData } from '../../lib/db';
import { PrintSettings } from '../../types/printing';
import { detectPrintCapability } from '../../lib/printing/detectPrintCapability';

import { useConfig } from '../../contexts/ConfigContext';

const DEFAULT_PRINT_SETTINGS: PrintSettings = {
  mode: 'system',
  format: '50x30',
  orientation: 'landscape',
  restaurantName: ''
};

export const ImpressionTab = () => {
  const { config } = useConfig();
  const [settings, setSettings] = useState<PrintSettings>(() => {
    const saved = getStoredData('app_print_settings', DEFAULT_PRINT_SETTINGS) as PrintSettings;
    return saved;
  });

  const effectiveRestaurantName = settings.restaurantName || config.restaurant.nom;
  
  const capability = detectPrintCapability();

  const updateSetting = <K extends keyof PrintSettings>(key: K, value: PrintSettings[K]) => {
    const newSettings = { ...settings, [key]: value };
    setSettings(newSettings);
    setStoredData('app_print_settings', newSettings);
  };

  return (
    <div className="space-y-10 animate-in fade-in slide-in-from-bottom-2 duration-300 max-w-4xl">
      <section>
        <h3 className="text-xl font-black text-gray-800 mb-2 flex items-center gap-2">
          <Printer className="text-crousty-purple" /> Mode de sortie
        </h3>
        <p className="text-sm text-gray-500 font-medium mb-6">
          Configurez l'imprimante pour les étiquettes DLC.
          Pour une PWA sous Safari iPad, l'impression "AirPrint (Système)" est la méthode standard et recommandée pour les modèles Brother QL-820NWB ou QL-810W.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <button
            onClick={() => updateSetting('mode', 'system')}
            className={`p-5 rounded-2xl border-2 text-left transition-all ${settings.mode === 'system' ? 'border-crousty-purple bg-purple-50/50 shadow-md ring-4 ring-purple-500/10' : 'border-gray-200 bg-white hover:border-gray-300'}`}
          >
            <div className={`p-2 rounded-xl mb-3 inline-block ${settings.mode === 'system' ? 'bg-crousty-purple text-white' : 'bg-gray-100 text-gray-500'}`}>
              <Wifi size={24} />
            </div>
            <h4 className={`font-black text-lg ${settings.mode === 'system' ? 'text-gray-900' : 'text-gray-700'}`}>AirPrint (Wi-Fi)</h4>
            <p className="text-xs text-gray-500 mt-1 font-medium">Utilise la boîte de dialogue native iPad. Fiable, sans installation complexe. Pour réseau Wi-Fi local.</p>
          </button>

          <button
            onClick={() => updateSetting('mode', 'virtual')}
            className={`p-5 rounded-2xl border-2 text-left transition-all ${settings.mode === 'virtual' ? 'border-blue-500 bg-blue-50/50 shadow-md ring-4 ring-blue-500/10' : 'border-gray-200 bg-white hover:border-gray-300'}`}
          >
            <div className={`p-2 rounded-xl mb-3 inline-block ${settings.mode === 'virtual' ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-500'}`}>
              <Smartphone size={24} />
            </div>
            <h4 className={`font-black text-lg ${settings.mode === 'virtual' ? 'text-gray-900' : 'text-gray-700'}`}>100% Virtuel</h4>
            <p className="text-xs text-gray-500 mt-1 font-medium">Suivi purement digital dans l'application. Aucune impression papier. Parfait pour réduire les déchets.</p>
          </button>
          
          <div className="p-5 rounded-2xl border-2 border-gray-100 bg-gray-50 text-left opacity-60 relative overflow-hidden">
             <div className="absolute top-3 right-3 text-[10px] bg-gray-200 text-gray-500 px-2 py-0.5 rounded-full font-bold uppercase">Non dispo.</div>
             <div className="p-2 rounded-xl mb-3 inline-block bg-gray-200 text-gray-400">
              <Server size={24} />
            </div>
            <h4 className="font-black text-lg text-gray-400">Pilote Réseau (IP)</h4>
            <p className="text-xs text-gray-400 mt-1 font-medium">Nécessite un SDK instable en web. Remplacé par AirPrint.</p>
          </div>
        </div>

        {capability === 'unsupported' && (
          <div className="bg-red-50 border border-red-200 text-red-800 p-4 rounded-xl flex gap-3 text-sm font-medium">
            <AlertTriangle className="shrink-0 text-red-500" />
            <p>Votre navigateur n'a pas accès à window.print(). AirPrint risque de ne pas marcher.</p>
          </div>
        )}
      </section>

      {settings.mode === 'system' && (
        <section className="bg-gray-50 p-6 sm:p-8 rounded-[2.5rem] border border-gray-100">
          <h3 className="text-xl font-black text-gray-800 mb-6 flex items-center gap-2">
            🏷️ Réglages Étiquette
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
            <div className="space-y-6">
              <div>
                <Label className="text-sm font-bold text-gray-600 mb-1">Nom du Restaurant</Label>
                <Input 
                  value={settings.restaurantName ?? config.restaurant.nom} 
                  onChange={(e: any) => updateSetting('restaurantName', e.target.value)}
                  className="h-14 font-medium"
                  placeholder={`Ex: ${config.restaurant.nom}`}
                />
              </div>
              <div>
                <Label className="text-sm font-bold text-gray-600 mb-1">Dimensions de l'étiquette</Label>
                <Select 
                  value={settings.format} 
                  onChange={(e: any) => updateSetting('format', e.target.value)}
                  className="h-14 font-medium"
                >
                  <option value="50x30">Standard Horeca (50x30mm)</option>
                  <option value="62x29">Format Brother (62x29mm)</option>
                  <option value="a4-sheet">Planche A4</option>
                </Select>
              </div>
              <div className="bg-blue-50 text-blue-800 p-4 rounded-2xl text-xs font-medium leading-relaxed border border-blue-100">
                <span className="font-bold flex items-center gap-1 mb-1"><Info size={14} className="inline"/> Remarque Safari iPad :</span>
                Safari gère seul les marges d'impression. Si l'étiquette est coupée, vous devrez ajuster l'échelle globale (pourcentage) dans la fenêtre AirPrint.
              </div>
            </div>
            
            <div className="bg-white border border-gray-200 shadow-sm rounded-3xl p-6 flex flex-col items-center">
              <Label className="text-xs mb-4 font-black uppercase tracking-widest text-gray-400">Aperçu cible</Label>
              <div className="flex items-center justify-center p-6 bg-gray-50 rounded-2xl border border-dashed border-gray-300 w-full min-h-[200px]">
                  <div 
                    className="bg-white border-2 border-black shadow-md flex flex-col p-2 overflow-hidden transition-all duration-300"
                    style={{ 
                      width: settings.format === '62x29' ? '62mm' : '50mm',
                      height: settings.format === '62x29' ? '29mm' : '30mm',
                      transform: 'scale(1.5)',
                      transformOrigin: 'center center'
                    }}
                  >
                    <div className="font-black text-center text-gray-900 text-[10px] border-b border-black pb-0.5 leading-tight truncate">{effectiveRestaurantName}</div>
                    <div className="font-bold text-center text-[12px] mt-1 leading-tight">SAUCE ALGERIENNE MAISON</div>
                    <div className="font-black text-center text-[11px] mt-auto border-t border-black pt-0.5 whitespace-nowrap">Exp: 24/04 18:00</div>
                  </div>
              </div>
            </div>
          </div>
        </section>
      )}
    </div>
  );
};
