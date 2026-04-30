import React, { useState, useEffect } from 'react';
import { Package, Thermometer, ChevronLeft, Upload, CheckCircle2, Trash2, Smartphone, X, Flame, QrCode, Droplets, Droplet, ClipboardList } from 'lucide-react';
import { Button } from '../ui/LightUI';
import { getStoredData, setStoredData, clearAllData } from '../../lib/db';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import Inventaire from '../../modules/Inventaire';
import TemperaturesChecklist from '../../modules/TemperaturesChecklist';
import Viandes from '../../modules/Viandes';
import Tracabilite from '../../modules/Tracabilite';
import Receptions from '../../modules/Receptions';
import CleaningPlan from '../../modules/CleaningPlan';
import OilChecklist from '../../modules/OilChecklist';
import { useI18n } from '../../lib/i18n';

import { RestaurantLogo } from '../ui/RestaurantLogo';

import { useConfig } from '../../contexts/ConfigContext';

const MODULE_CONFIG: Record<string, any> = {
  inventaire: { name: 'Inventaire', icon: ClipboardList, component: Inventaire, color: 'text-purple-500', bg: 'bg-purple-50', storageKey: 'crousty_inventory', zipFile: 'inventaire.json' },
  temperature: { name: 'Températures frigo', icon: Thermometer, component: TemperaturesChecklist, color: 'text-sky-500', bg: 'bg-sky-50', storageKey: 'crousty_temp_checklist', zipFile: 'temperatures-frigo.json' },
  cuisson: { name: 'Cuisson alimentaire', icon: Flame, component: Viandes, color: 'text-red-500', bg: 'bg-red-50', storageKey: 'crousty_viandes', zipFile: 'viandes.json' },
  tracabilite: { name: 'Traçabilité', icon: QrCode, component: Tracabilite, color: 'text-blue-500', bg: 'bg-blue-50', storageKey: 'crousty_tracabilite_v2', zipFile: 'tracabilite.json' },
  reception: { name: 'Réception', icon: Package, component: Receptions, color: 'text-orange-500', bg: 'bg-orange-50', storageKey: 'crousty_receptions_v3', zipFile: 'receptions.json' },
  nettoyage: { name: 'Plan de nettoyage', icon: Droplets, component: CleaningPlan, color: 'text-purple-500', bg: 'bg-purple-50', storageKey: 'crousty_cleaning', zipFile: 'nettoyage.json' },
  huiles: { name: 'Huiles de friture', icon: Droplet, component: OilChecklist, color: 'text-amber-500', bg: 'bg-amber-50', storageKey: 'crousty_oil_checklist', zipFile: 'huiles.json' }
};

export const MobileCollectionApp = ({ session, onExit }: { session: any, onExit: () => void }) => {
  const { config } = useConfig();
  const { t, language } = useI18n();
  const identity = config.restaurant || session.identity || { nom: session.resto };
  
  const [currentView, setCurrentView] = useState<string>(() => {
    return localStorage.getItem('crousty_mobile_worker') ? 'dashboard' : 'setup';
  });
  const [workerName, setWorkerName] = useState(() => localStorage.getItem('crousty_mobile_worker') || '');
  
  // Sync
  const [configSynced, setConfigSynced] = useState(() => !!localStorage.getItem(`crousty_mobile_config_synced_${session.sid}`));
  const [syncingConfig, setSyncingConfig] = useState(false);

  // Stats
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [isExporting, setIsExporting] = useState(false);
  const [exportDone, setExportDone] = useState(false);

  const [syncError, setSyncError] = useState<string | null>(null);

  useEffect(() => {
     if (!configSynced && !syncingConfig) {
        setSyncingConfig(true);
        setSyncError(null);
        
        fetch(`/api/sessions/${session.sid}/config`)
          .then(async res => {
             const isHtml = res.headers.get('content-type')?.includes('text/html');
             if (res.status === 404 || isHtml) {
                throw new Error("API_OFFLINE"); // Netlify environment or backend not available
             }
             if (res.status === 403) {
                throw new Error("ACCÈS REFUSÉ (403) : Cette URL est protégée. Vérifiez que vous n'utilisez pas l'URL de TEST au lieu de l'URL PUBLIQUE.");
             }
             if (!res.ok) {
                throw new Error(`Erreur serveur (${res.status})`);
             }
             return res.json();
          })
          .then(data => {
             let synced = false;
             if (data.configSnapshot) {
               if (data.configSnapshot.config) setStoredData('crousty-config', data.configSnapshot.config);
               if (data.configSnapshot.catalogue) setStoredData('crousty_catalogue_v2', data.configSnapshot.catalogue);
               if (data.configSnapshot.fournisseurs) setStoredData('crousty_fournisseurs', data.configSnapshot.fournisseurs);
               if (data.configSnapshot.employees) setStoredData('crousty_employees', data.configSnapshot.employees);
               if (data.configSnapshot.temperaturesZones) setStoredData('crousty-temperatures-zones', data.configSnapshot.temperaturesZones);
               if (data.configSnapshot.inventaireProduits) setStoredData('crousty-inventaire-produits', data.configSnapshot.inventaireProduits);
               if (data.configSnapshot.huilesCuves) setStoredData('crousty-huiles-cuves', data.configSnapshot.huilesCuves);
               if (data.configSnapshot.nettoyageTaches) setStoredData('crousty-nettoyage-taches', data.configSnapshot.nettoyageTaches);
               if (data.configSnapshot.catalogueProvider) setStoredData('crousty-catalogue-produits', data.configSnapshot.catalogueProvider);
               synced = true;
             }
             
             localStorage.setItem(`crousty_mobile_config_synced_${session.sid}`, 'true');
             setConfigSynced(true);
             setSyncingConfig(false);
             
             if (synced) {
                // We reload to apply new config effectively
                window.location.reload();
             }
          })
          .catch((err) => {
             if (err.message === "API_OFFLINE" || String(err).includes("Unexpected token")) {
                // Backend not available (Netlify), skip config sync completely
                console.warn('Backend unavailable (Netlify mode), skipping config sync.');
                localStorage.setItem(`crousty_mobile_config_synced_${session.sid}`, 'true');
                setConfigSynced(true);
                setSyncingConfig(false);
                return;
             }
             console.error('Erreur de synchronisation:', err);
             setSyncError(err.message || 'Erreur inconnue');
             setSyncingConfig(false);
             // We don't mark as synced yet, we want to show the error
          });
     }
  }, [configSynced, syncingConfig, session.sid]);

  const handleStartSession = async (e: React.FormEvent) => {
    e.preventDefault();
    if (workerName.trim()) {
      localStorage.setItem('crousty_mobile_worker', workerName.trim());
      
      // Notify server of connection
      try {
        await fetch(`/api/sessions/${session.sid}/status`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: 'connected' })
        });
      } catch (err) {
        console.warn("Failed to notify connection status", err);
      }
      
      setCurrentView('dashboard');
    }
  };

  const calculateCounts = () => {
    const newCounts: Record<string, number> = {};
    for (const mod of session.m) {
      if (MODULE_CONFIG[mod]) {
         newCounts[mod] = getStoredData<any[]>(MODULE_CONFIG[mod].storageKey, []).length;
      }
    }
    setCounts(newCounts);
  };

  useEffect(() => {
    if (currentView === 'dashboard') {
      calculateCounts();
    }
  }, [currentView]);

  const generateZip = async () => {
    const zip = new JSZip();
    const entryCounts: Record<string, number> = {};
    const exportedPhotos: Record<string, string> = {};
    
    // We need to import getPhoto
    const { getPhoto } = await import('../../lib/db');
    
    for (const mod of session.m) {
       if (MODULE_CONFIG[mod]) {
          const data = getStoredData<any[]>(MODULE_CONFIG[mod].storageKey, []);
          entryCounts[mod] = data.length;
          zip.file(MODULE_CONFIG[mod].zipFile, JSON.stringify(data, null, 2));

          // Extract photos if module supports them
          for (const item of data) {
             // Standard photoId
             if (item.photoId) {
                const b64 = await getPhoto(item.photoId);
                if (b64) exportedPhotos[item.photoId] = b64;
             }
             // For Oil Checklist (cuves[cid].photo)
             if (item.cuves) {
               for (const cid in item.cuves) {
                 const photoId = item.cuves[cid]?.photo;
                 if (photoId) {
                    const b64 = await getPhoto(photoId);
                    if (b64) exportedPhotos[photoId] = b64;
                 }
               }
             }
             // For receptions, if there is a photo URL in lignes (though they usually use the root photoDataUrl/photoId for BL)
          }
       }
    }
    
    if (Object.keys(exportedPhotos).length > 0) {
       zip.file('photos.json', JSON.stringify(exportedPhotos));
    }

    const manifest = {
      version: 1,
      type: 'crousty-collecte-export',
      sessionId: session.sid,
      restaurantId: session.resto,
      name: session.name,
      workerName: localStorage.getItem('crousty_mobile_worker') || 'Appareil Mobile',
      modules: session.m,
      createdAt: new Date().toISOString(),
      entryCounts
    };
    
    zip.file('manifest.json', JSON.stringify(manifest, null, 2));
    const blob = await zip.generateAsync({ type: 'blob' });
    return blob;
  };

  const handleExport = async () => {
    setIsExporting(true);
    setExportDone(false);
    try {
       const { queueSyncTask } = await import('../../lib/db');
       const { processSyncQueue } = await import('../../lib/syncEngine');
       
       const blob = await generateZip();
       const fileName = `collecte-${session.name?.replace(/\s+/g, '-') || 'donnees'}-${Date.now()}.zip`;
       
       // Offline-first: Push to queue instead of sending directly
       await queueSyncTask({
           type: 'export_session',
           sessionId: session.sid,
           sessionName: session.name,
           blob,
           fileName
       });

       setExportDone(true);
       alert("Données enregistrées ! L'envoi se fera automatiquement en arrière-plan.\n\nL'appareil va être réinitialisé et la session fermée.");
       
       await clearAllData();
       localStorage.removeItem('crousty_mobile_worker');
       localStorage.removeItem(`crousty_mobile_config_synced_${session.sid}`);
       
       // Trigger sync engine processing right away
       processSyncQueue();
       
       onExit();
    } catch (err: any) {
       console.error(err);
       alert("Erreur critique lors de la préparation des données : " + err.message);
    } finally {
       setIsExporting(false);
    }
  };

  const forceDownload = async () => {
    setIsExporting(true);
    try {
       const blob = await generateZip();
       const fileName = `collecte-${session.name?.replace(/\s+/g, '-') || 'donnees'}-${new Date().toISOString().slice(0,10)}.zip`;
       saveAs(blob, fileName);
       setExportDone(true);
    } catch (err: any) {
       alert("Erreur: " + err.message);
    } finally {
       setIsExporting(false);
    }
  };

  const handleExit = async () => {
    if (confirm("Clôturer la session effacera toutes les données de ce téléphone. Avez-vous bien envoyé les données à l'iPad ?")) {
      await clearAllData();
      localStorage.removeItem('crousty_mobile_worker');
      localStorage.removeItem(`crousty_mobile_config_synced_${session.sid}`);
      onExit();
    }
  };

  const clearLocalData = async () => {
     if (confirm("Voulez-vous vraiment effacer les données de ce téléphone ? (À faire après import iPad)")) {
        await clearAllData();
        calculateCounts();
        setExportDone(false);
     }
  };

  const totalEntries = (Object.values(counts) as number[]).reduce((a, b) => a + b, 0);

  if (!configSynced) {
     return (
       <div className="min-h-[100dvh] bg-slate-50 flex flex-col items-center justify-center p-6 text-center animate-in fade-in duration-300">
         {syncError ? (
           <div className="max-w-md space-y-6">
              <div className="w-20 h-20 bg-red-100 text-red-500 rounded-full flex items-center justify-center mx-auto">
                 <X size={40} />
              </div>
              <h2 className="text-2xl font-black text-gray-800 uppercase tracking-tight">Erreur de Connexion</h2>
              <p className="text-gray-500 text-sm bg-white p-4 rounded-xl border border-red-100 shadow-sm leading-relaxed">
                 {syncError}
              </p>
              <div className="pt-4 space-y-3">
                 <Button onClick={() => setConfigSynced(false)} className="w-full">Réessayer</Button>
                 <Button variant="secondary" onClick={() => {
                    setConfigSynced(true); // ignore and use local defaults
                 }} className="w-full text-gray-400">Ignorer (Mode dégradé)</Button>
              </div>
           </div>
         ) : (
           <>
            <div className="w-12 h-12 border-4 border-crousty-purple border-t-transparent rounded-full animate-spin mb-6"></div>
            <h2 className="text-xl font-black text-gray-800">{t('mobile_app_syncing')}</h2>
            <p className="text-gray-500 mt-2">{t('mobile_app_sync_desc')}</p>
           </>
         )}
       </div>
     );
  }

  if (currentView === 'setup') {
     return (
       <div className="min-h-[100dvh] bg-slate-50 flex flex-col items-center justify-center p-6 text-center animate-in fade-in zoom-in-95 duration-300">
         <div className="mb-6">
            <RestaurantLogo size="xl" />
         </div>
         <h1 className="text-2xl font-black text-gray-800 tracking-tight leading-tight mb-2">
           {identity.nom}
         </h1>
         <p className="text-gray-500 mb-8 max-w-sm">
           {identity.ville ? `${identity.ville} • ` : ''}{t('mobile_app_setup_desc')}
         </p>
         
         <form onSubmit={handleStartSession} className="w-full max-w-sm space-y-4">
            <input 
              type="text"
              required
              placeholder="Ex: Jean Dupont"
              value={workerName}
              onChange={e => setWorkerName(e.target.value)}
              className="w-full px-6 py-4 text-lg font-bold text-center border-2 border-purple-100 rounded-2xl focus:outline-none focus:ring-4 focus:ring-crousty-purple/20 focus:border-crousty-purple bg-white shadow-sm"
            />
            <Button type="submit" disabled={!workerName.trim()} className="w-full h-14 text-lg">
               {t('mobile_app_start_btn')}
            </Button>
            <Button variant="secondary" onClick={handleExit} type="button" className="w-full text-red-500">
               {t('mobile_app_exit_btn')}
            </Button>
         </form>
       </div>
     );
  }

  if (currentView !== 'dashboard') {
     const modConfig = MODULE_CONFIG[currentView];
     if (!modConfig) return null;
     const ModComponent = modConfig.component;
     
     return (
        <div className="h-[100dvh] flex flex-col bg-slate-50 relative pb-[safe-area-inset-bottom]">
           <header className="bg-white border-b border-gray-100 p-4 pt-safe flex items-center justify-between shrink-0 shadow-sm sticky top-0 z-50">
             <button onClick={() => setCurrentView('dashboard')} className="flex items-center gap-2 text-gray-500 font-bold active:bg-gray-100 p-2 rounded-xl -ml-2 transition-colors">
                <ChevronLeft size={24} /> {t('btn_back')}
             </button>
             <span className="font-black text-gray-800 uppercase tracking-widest truncate">
               {modConfig.name}
             </span>
             <div className="w-10"></div>
           </header>
           <main className="flex-1 overflow-y-auto w-full max-w-2xl mx-auto px-4 pb-20 pt-4 content-scroll-container">
             <ModComponent setIsSidebarCollapsed={() => {}} />
           </main>
           <style>{`
             .badge-manager, .user-menu-btn { display: none !important; }
           `}</style>
        </div>
     );
  }

  return (
    <div className="min-h-[100dvh] bg-slate-50 flex flex-col pt-safe px-4 pb-10">
       <header className="py-6 border-b border-gray-100 mb-6 flex justify-between items-start">
         <div className="flex items-start gap-4">
           <RestaurantLogo size="md" />
           <div>
             <div className="inline-flex items-center gap-2 px-3 py-1 bg-purple-100 text-crousty-purple rounded-full text-[10px] font-black uppercase tracking-wider mb-2">
               <Smartphone size={12} /> {t('mobile_app_mode')}
             </div>
             <h1 className="text-2xl font-black text-gray-800 tracking-tight leading-tight">{session.name || "Session Terrain"}</h1>
             <p className="text-gray-500 text-sm mt-1">{identity.nom}</p>
           </div>
         </div>
         <button onClick={handleExit} className="p-2 bg-gray-100 text-gray-400 rounded-full hover:text-red-500 active:scale-95 transition-all shrink-0">
           <X size={20} />
         </button>
       </header>

       <div className="space-y-4 mb-8 flex-1">
         <h2 className="text-sm font-bold text-gray-400 uppercase tracking-widest px-1">{t('mobile_app_allowed_modules')}</h2>
         
         {session.m.map((mod: string) => {
           const conf = MODULE_CONFIG[mod];
           if (!conf) return null;
           const Icon = conf.icon;
           
           return (
             <button 
               key={mod}
               onClick={() => setCurrentView(mod)}
               className="w-full bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex items-center justify-between active:scale-95 transition-all text-left"
             >
               <div className="flex items-center gap-4 min-w-0 flex-1">
                 <div className={`w-12 h-12 ${conf.bg} ${conf.color} rounded-xl flex items-center justify-center shrink-0 border border-black/5`}>
                   <Icon size={24} />
                 </div>
                 <div className="min-w-0 flex-1">
                   <h3 className="font-black text-gray-800 text-lg truncate leading-tight mb-0.5">{conf.name}</h3>
                   <p className="text-gray-400 text-sm font-bold truncate">{t('mobile_app_elements_count', { count: counts[mod] || 0 })}</p>
                 </div>
               </div>
               <ChevronLeft className="text-gray-300 rotate-180 shrink-0 ml-2" />
             </button>
           );
         })}
       </div>

       <div className="bg-white p-6 rounded-3xl shadow-xl shadow-crousty-purple/5 border border-purple-50">
          <div className="flex items-end justify-between mb-6">
            <div>
              <h3 className="font-black text-gray-800 text-lg">{t('mobile_app_ready_export')}</h3>
              <p className="text-gray-400 text-sm">{t('mobile_app_elements_count', { count: totalEntries })}</p>
            </div>
            <div className="text-3xl font-black text-crousty-purple">{totalEntries}</div>
          </div>
          
          {exportDone ? (
             <div className="flex flex-col gap-3">
               <div className="bg-green-50 text-green-700 p-4 rounded-xl flex items-center gap-3 font-bold mb-2">
                 <CheckCircle2 className="text-green-500" /> {t('mobile_app_sent_success')}
               </div>
               <Button onClick={handleExport} variant="secondary" className="w-full">
                 <Upload size={18} /> {t('mobile_app_resend')}
               </Button>
               <button onClick={forceDownload} className="text-sm font-bold text-gray-500 hover:text-crousty-purple py-2 underline underline-offset-4 active:scale-95 transition-transform">
                 {t('mobile_app_manual_download')}
               </button>
               <Button onClick={clearLocalData} className="w-full bg-red-50 text-red-600 hover:bg-red-100 mt-2 border-none">
                 <Trash2 size={18} /> {t('mobile_app_clear_device')}
               </Button>
             </div>
          ) : (
             <Button onClick={handleExport} disabled={totalEntries === 0 || isExporting} className="w-full h-14 text-lg animate-pulse-light shadow-lg shadow-crousty-purple/30">
               {isExporting ? t('mobile_app_sending') : (
                 <>
                   <Upload size={20} /> {t('mobile_app_send_btn')}
                 </>
               )}
             </Button>
          )}
       </div>
    </div>
  );
};
