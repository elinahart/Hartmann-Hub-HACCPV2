import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Smartphone, Upload, QrCode, ClipboardList, Thermometer, CheckCircle2, AlertTriangle, RefreshCw, Eye, Flame, Package, Droplets, Droplet, Trash2, Shield } from 'lucide-react';
import { Button } from '../ui/LightUI';
import { QRCodeSVG } from 'qrcode.react';
import JSZip from 'jszip';
import { getStoredData, setStoredData, savePhotoBase64 } from '../../lib/db';
import { useAuth } from '../../contexts/AuthContext';
import { useI18n } from '../../lib/i18n';

interface MobileSyncModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface ServerSession {
  sid: string;
  name: string;
  modules: string[];
  status: string;
  timestamp: number;
}

const MOBILE_PROFILES = [
  { id: 'all', name: 'Complet (Tout modules)', modules: ['reception', 'tracabilite', 'cuisson', 'temperature', 'huiles', 'nettoyage', 'inventaire'] },
  { id: 'morning', name: 'Ouverture (Matin)', modules: ['tracabilite', 'temperature', 'huiles'] },
  { id: 'evening', name: 'Fermeture (Soir)', modules: ['temperature', 'nettoyage'] },
  { id: 'delivery', name: 'Livraison', modules: ['reception'] }
];

export const MobileSyncModal = ({ isOpen, onClose }: MobileSyncModalProps) => {
  const { currentUser } = useAuth();
  const { t } = useI18n();
  const [activeTab, setActiveTab] = useState<'sessions' | 'new' | 'manual'>('sessions');
  
  const [sessions, setSessions] = useState<ServerSession[]>([]);
  const [selectedSessionSid, setSelectedSessionSid] = useState<string | null>(null);
  const [sessionToDelete, setSessionToDelete] = useState<string | null>(null);
  
  // New session state
  const [sessionName, setSessionName] = useState('Collecte du jour');
  const [selectedModules, setSelectedModules] = useState<string[]>(['inventaire', 'temperatures']);
  const [sessionUrl, setSessionUrl] = useState('');

  // Import state
  const [importStatus, setImportStatus] = useState<'idle' | 'reading' | 'summary' | 'importing' | 'success' | 'error'>('idle');
  const [importError, setImportError] = useState('');
  const [importSummary, setImportSummary] = useState<any>(null);
  const [importData, setImportData] = useState<any>(null);
  const [importingSid, setImportingSid] = useState<string | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    fetchSessions();
    const interval = setInterval(fetchSessions, 3000);
    return () => clearInterval(interval);
  }, [isOpen]);

  const fetchSessions = async () => {
    try {
      const res = await fetch('/api/sessions');
      if (res.ok) {
        const data = await res.json();
        setSessions(data.sessions || []);
      }
    } catch (e) {
      // Keep silent
    }
  };

  const generateSession = async () => {
    const modules = selectedModules;
    
    if (modules.length === 0) return alert("Sélectionnez au moins un module.");

    const newSid = typeof crypto.randomUUID === 'function' ? crypto.randomUUID() : Date.now().toString(36) + Math.random().toString(36).substring(2);
    const sessionData = {
      t: 'cch-mob',
      sid: newSid,
      resto: getStoredData<any>('crousty-config', {restaurant: {nom: "Crousty Game Nantes"}}).restaurant.nom,
      identity: getStoredData<any>('crousty-config', {restaurant: {}}).restaurant,
      exp: Date.now() + 1000 * 60 * 60 * 12, // 12 hours
      m: modules,
      name: sessionName
    };
    
    // Create config snapshot to send to server
    const configSnapshot = {
      config: getStoredData('crousty-config', {}),
      catalogue: getStoredData('crousty_catalogue_v2', []),
      fournisseurs: getStoredData('crousty_fournisseurs', []),
      employees: getStoredData('crousty_employees', []),
      temperaturesZones: getStoredData('crousty-temperatures-zones', []),
      inventaireProduits: getStoredData('crousty-inventaire-produits', []),
      huilesCuves: getStoredData('crousty-huiles-cuves', []),
      nettoyageTaches: getStoredData('crousty-nettoyage-taches', []),
      catalogueProvider: getStoredData('crousty-catalogue-produits', [])
    };
    
    try {
      const resp = await fetch(`/api/sessions/${newSid}`, { 
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: sessionName, modules, configSnapshot })
      });
      
      if (!resp.ok) {
         const txt = await resp.text();
         throw new Error(`Erreur HTTP ${resp.status}: ${txt}`);
      }

      const encoded = btoa(encodeURIComponent(JSON.stringify(sessionData)));
      const url = `${window.location.origin}${window.location.pathname}?session=${encoded}`;
      setSessionUrl(url);
      setSelectedSessionSid(newSid);
      
      fetchSessions();
    } catch (err: any) {
      console.error("Erreur création session:", err);
      alert(`Erreur: impossible de créer la session. \n${err.message}`);
    }
  };

  const downloadAndProcessSession = async (sid: string) => {
    try {
      setImportingSid(sid);
      setImportStatus('reading');
      
      const res = await fetch(`/api/sessions/${sid}/download`);
      if (!res.ok) throw new Error("Impossible de télécharger les données depuis le serveur.");
      
      const blob = await res.blob();
      const file = new File([blob], 'export.zip', { type: 'application/zip' });
      await processZipFile(file);
    } catch (err: any) {
      setImportError(err.message || "Erreur de réception.");
      setImportStatus('error');
    }
  };

  const confirmDeleteSession = async (sid: string) => {
    try {
      await fetch(`/api/sessions/${sid}`, { method: 'DELETE' });
      setSessionToDelete(null);
      fetchSessions();
    } catch (e) {
      console.error(e);
    }
  };

  const deleteSession = (sid: string) => {
    setSessionToDelete(sid);
  };

  const processZipFile = async (file: File) => {
    try {
      const zip = new JSZip();
      const content = await zip.loadAsync(file);
      
      const manifestFile = content.file("manifest.json");
      if (!manifestFile) throw new Error("Format invalide : manifest.json introuvable.");
      
      const manifest = JSON.parse(await manifestFile.async("string"));
      if (manifest.type !== 'crousty-collecte-export' || manifest.version !== 1) {
        throw new Error("Format de fichier non supporté ou corrompu.");
      }
      
      let newCount = 0;
      let duplicateCount = 0;
      const extractedData: any = {};
      
      const workerName = manifest.workerName;
      
      const moduleHandlers: Record<string, { file: string, storageKey: string, sortByDate?: string }> = {
        'inventaire': { file: 'inventaire.json', storageKey: 'crousty_inventory' },
        'temperature': { file: 'temperatures-frigo.json', storageKey: 'crousty_temp_checklist', sortByDate: 'date' },
        'cuisson': { file: 'viandes.json', storageKey: 'crousty_viandes', sortByDate: 'date' },
        'tracabilite': { file: 'tracabilite.json', storageKey: 'crousty_tracabilite_v2', sortByDate: 'date' },
        'reception': { file: 'receptions.json', storageKey: 'crousty_receptions_v3', sortByDate: 'date' },
        'nettoyage': { file: 'nettoyage.json', storageKey: 'crousty_cleaning', sortByDate: 'date' },
        'huiles': { file: 'huiles.json', storageKey: 'crousty_oil_checklist', sortByDate: 'date' }
      };

      for (const mod of manifest.modules) {
        const handler = moduleHandlers[mod];
        if (!handler) continue;

        const modFile = content.file(handler.file);
        if (modFile) {
          const modData = JSON.parse(await modFile.async("string"));
          
          if (workerName && workerName !== 'Appareil Mobile') {
             modData.forEach((d: any) => {
               if (d.responsable === 'Appareil Mobile') d.responsable = workerName;
               if (d.author === 'Appareil Mobile') d.author = workerName;
               if (d.signature && d.signature.auteurPrenom === 'Appareil Mobile') {
                 d.signature.auteurPrenom = workerName;
                 d.signature.auteurInitiales = workerName.substring(0,2).toUpperCase();
               }
             });
          }
          
          extractedData[mod] = modData;
          const existing = getStoredData<any[]>(handler.storageKey, []);
          const existingIds = new Set(existing.map(e => e.id));
          modData.forEach((d: any) => existingIds.has(d.id) ? duplicateCount++ : newCount++);
        }
      }
      
      const photosFile = content.file("photos.json");
      if (photosFile) {
         extractedData._photos = JSON.parse(await photosFile.async("string"));
      }
      
      setImportSummary({ manifest, newCount, duplicateCount });
      setImportData(extractedData);
      setImportStatus('summary');
      
    } catch (err: any) {
      setImportError(err.message || 'Erreur lors de la lecture du fichier ZIP');
      setImportStatus('error');
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImportingSid(null);
    setImportStatus('reading');
    await processZipFile(file);
    // Reset output to allow re-importing the same file
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const confirmImport = async () => {
    setImportStatus('importing');
    try {
      const moduleHandlers: Record<string, { storageKey: string, sortByDate?: string }> = {
        'inventaire': { storageKey: 'crousty_inventory' },
        'temperature': { storageKey: 'crousty_temp_checklist', sortByDate: 'date' },
        'cuisson': { storageKey: 'crousty_viandes', sortByDate: 'date' },
        'tracabilite': { storageKey: 'crousty_tracabilite_v2', sortByDate: 'date' },
        'reception': { storageKey: 'crousty_receptions_v3', sortByDate: 'date' },
        'nettoyage': { storageKey: 'crousty_cleaning', sortByDate: 'date' },
        'huiles': { storageKey: 'crousty_oil_checklist', sortByDate: 'date' }
      };

      for (const [mod, handler] of Object.entries(moduleHandlers)) {
        if (importData[mod]) {
           const existing = getStoredData<any[]>(handler.storageKey, []);
           const existingIds = new Set(existing.map(e => e.id));
           const toAdd = importData[mod].filter((d: any) => !existingIds.has(d.id)).map((d: any) => ({
             ...d, importedAt: new Date().toISOString(), importedBy: currentUser?.name || 'Inconnu'
           }));
           
           let merged = [...toAdd, ...existing];
           if (handler.sortByDate) {
             merged.sort((a,b) => new Date(b[handler.sortByDate!]).getTime() - new Date(a[handler.sortByDate!]).getTime());
           }
           setStoredData(handler.storageKey, merged);
        }
      }
      
      if (importData._photos) {
         const photoPromises = Object.entries(importData._photos).map(([id, b64]) => savePhotoBase64(id, b64 as string));
         await Promise.all(photoPromises);
      }
      
      // Notify server we've imported it so it can clear it or mark it
      if (importingSid) {
        await fetch(`/api/sessions/${importingSid}/status`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: 'imported' })
        }).catch(()=>null);
        fetchSessions();
      }
      
      // Dispatch custom event to notify the rest of the app to reload data
      window.dispatchEvent(new Event('crousty_data_changed'));
      
      setImportStatus('success');
      setTimeout(() => {
        setImportStatus('idle');
        setImportData(null);
        setImportSummary(null);
        setImportingSid(null);
        setActiveTab('sessions');
      }, 2500);
      
    } catch (err: any) {
      setImportError('Erreur lors de l’enregistrement des données');
      setImportStatus('error');
    }
  };

  const viewQrForSession = (session: ServerSession) => {
    const sessionData = {
      t: 'cch-mob',
      sid: session.sid,
      resto: getStoredData<any>('crousty-config', {restaurant: {nom: "Crousty Game Nantes"}}).restaurant.nom,
      identity: getStoredData<any>('crousty-config', {restaurant: {}}).restaurant,
      exp: session.timestamp + 1000 * 60 * 60 * 12, // 12 hours
      m: session.modules,
      name: session.name
    };
    const encoded = btoa(encodeURIComponent(JSON.stringify(sessionData)));
    const url = `${window.location.origin}${window.location.pathname}?session=${encoded}`;
    setSessionUrl(url);
    setSelectedSessionSid(session.sid);
    setActiveTab('new'); // Reuse the new view for showing QR
  };

  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-[5000] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-3xl rounded-3xl overflow-hidden relative shadow-2xl max-h-[90dvh] flex flex-col">
        <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50 shrink-0">
          <h3 className="font-black text-gray-800 tracking-wider flex items-center gap-2 text-xl">
            <Smartphone size={24} className="text-crousty-purple" /> Hub Mobile
          </h3>
          <button onClick={onClose} className="p-2 hover:bg-gray-200 rounded-full transition-colors"><X size={20} /></button>
        </div>

        <div className="flex border-b border-gray-100 shrink-0 bg-gray-50 flex-wrap">
          <button 
            className={`px-6 py-4 font-bold text-sm transition-colors ${activeTab === 'sessions' ? 'text-crousty-purple border-b-2 border-crousty-purple bg-white' : 'text-gray-500 hover:bg-blue-50/50'}`}
            onClick={() => { setActiveTab('sessions'); setImportStatus('idle'); }}
          >
            {t('mobile_sync_active')}
          </button>
          <button 
            className={`px-6 py-4 font-bold text-sm transition-colors ${activeTab === 'new' ? 'text-crousty-purple border-b-2 border-crousty-purple bg-white' : 'text-gray-500 hover:bg-blue-50/50'}`}
            onClick={() => { setActiveTab('new'); setSessionUrl(''); setSelectedSessionSid(null); setImportStatus('idle'); }}
          >
            {t('mobile_sync_create')}
          </button>
          <button 
            className={`px-6 py-4 font-bold text-sm transition-colors ${activeTab === 'manual' ? 'text-crousty-purple border-b-2 border-crousty-purple bg-white' : 'text-gray-500 hover:bg-blue-50/50'}`}
            onClick={() => setActiveTab('manual')}
          >
            {t('mobile_sync_manual')}
          </button>
        </div>

        <div className="p-6 overflow-y-auto flex-1 bg-white">
          
          {/* SESSIONS LIST TAB */}
          {activeTab === 'sessions' && importStatus === 'idle' && (
             <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <h4 className="font-black text-gray-800">Sessions en cours</h4>
                  <button onClick={fetchSessions} className="text-gray-500 hover:text-crousty-purple p-2"><RefreshCw size={18} /></button>
                </div>
                
                {sessions.length === 0 ? (
                  <div className="p-8 text-center text-gray-500 bg-gray-50 rounded-2xl border border-dashed border-gray-200">
                    {t('mobile_sync_none')}
                  </div>
                ) : (
                  <div className="space-y-3">
                    {sessions.map(s => (
                      <div key={s.sid} className="flex flex-col sm:flex-row gap-4 items-center p-4 border border-gray-100 rounded-2xl shadow-sm hover:shadow-md transition-shadow">
                        <div className="flex-1 w-full text-left">
                           <div className="font-bold flex items-center gap-2">
                             {s.name}
                             {s.status === 'imported' && <span className="bg-gray-100 text-gray-500 text-[10px] px-2 py-0.5 rounded-full uppercase tracking-wider font-bold">{t('mobile_sync_imported')}</span>}
                             {s.status === 'uploaded' && <span className="bg-green-100 text-green-700 text-[10px] px-2 py-0.5 rounded-full uppercase tracking-wider font-bold animate-pulse">{t('mobile_sync_uploaded')}</span>}
                             {s.status === 'waiting' && <span className="bg-orange-100 text-orange-700 text-[10px] px-2 py-0.5 rounded-full uppercase tracking-wider font-bold">{t('mobile_sync_waiting')}</span>}
                           </div>
                           <div className="text-xs text-gray-500 mt-1">
                             Créée à {new Date(s.timestamp).toLocaleTimeString()} - Modules : {s.modules.join(', ')}
                           </div>
                        </div>
                        <div className="flex gap-2">
                          {s.status === 'waiting' && (
                            <Button variant="secondary" onClick={() => viewQrForSession(s)} className="text-xs px-3">
                              <QrCode size={14} className="mr-1 inline-block" /> QR Code
                            </Button>
                          )}
                          {(s.status === 'uploaded' || s.status === 'imported') && (
                            <Button onClick={() => downloadAndProcessSession(s.sid)} className="text-xs px-3 bg-crousty-purple hover:bg-crousty-purple/90">
                              <Eye size={14} className="mr-1 inline-block" /> {t('mobile_sync_preview')}
                            </Button>
                          )}
                          {sessionToDelete === s.sid ? (
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-medium text-red-600">Supprimer ?</span>
                              <Button variant="danger" onClick={(e) => { e.stopPropagation(); confirmDeleteSession(s.sid); }} className="text-xs px-2 h-8 bg-red-600 hover:bg-red-700 text-white">Oui</Button>
                              <Button variant="secondary" onClick={(e) => { e.stopPropagation(); setSessionToDelete(null); }} className="text-xs px-2 h-8">{t('btn_cancel')}</Button>
                            </div>
                          ) : (
                            <button onClick={(e) => { e.stopPropagation(); deleteSession(s.sid); }} className="p-2 text-red-500 hover:bg-red-50 rounded-xl transition-colors shrink-0" title={t('mobile_sync_delete')}>
                              <Trash2 size={16} />
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
             </div>
          )}

          {/* NEW SESSION TAB */}
          {activeTab === 'new' && importStatus === 'idle' && (
            <div className="space-y-6">
              {!sessionUrl ? (
                <>
                  <div className="bg-blue-50 border border-blue-100 p-4 rounded-2xl text-sm text-blue-800">
                    Générez un QR Code pour configurer temporairement le téléphone d'un employé. 
                  </div>

                  <div className="bg-purple-50 p-4 rounded-2xl border border-purple-100 flex gap-2 overflow-x-auto snap-x pb-4">
                    {MOBILE_PROFILES.map(prof => (
                      <button 
                        key={prof.id}
                        className="shrink-0 snap-center px-3 py-1.5 bg-white rounded-lg text-xs font-bold text-crousty-purple border border-purple-200 hover:bg-purple-100 transition-colors shadow-sm"
                        onClick={() => {
                          setSessionName(prof.name);
                          setSelectedModules(prof.modules);
                        }}
                      >
                        {prof.name}
                      </button>
                    ))}
                  </div>

                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-bold text-gray-700 mb-1">Nom de la session</label>
                      <input 
                        type="text" 
                        value={sessionName}
                        onChange={e => setSessionName(e.target.value)}
                        className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 font-bold text-gray-800 focus:outline-none focus:ring-2 focus:ring-crousty-purple" 
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-gray-700 mb-2">Modules autorisés</label>
                      <div className="space-y-2 grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {[
                          { id: 'inventaire', label: 'Inventaire', icon: ClipboardList },
                          { id: 'temperature', label: 'Températures frigo', icon: Thermometer },
                          { id: 'cuisson', label: 'Cuisson alimentaire', icon: Flame },
                          { id: 'tracabilite', label: 'Traçabilité', icon: QrCode },
                          { id: 'reception', label: 'Réception Livraison', icon: Package },
                          { id: 'nettoyage', label: 'Plan de nettoyage', icon: Droplets },
                          { id: 'huiles', label: 'Huiles de friture', icon: Droplet }
                        ].map(mod => (
                          <label key={mod.id} className="flex items-center gap-3 p-3 border border-gray-200 rounded-xl cursor-pointer hover:bg-gray-50 transition-colors">
                            <input 
                              type="checkbox" 
                              checked={selectedModules.includes(mod.id)} 
                              onChange={e => {
                                if (e.target.checked) setSelectedModules([...selectedModules, mod.id]);
                                else setSelectedModules(selectedModules.filter(m => m !== mod.id));
                              }} 
                              className="w-5 h-5 text-crousty-purple rounded focus:ring-crousty-purple" 
                            />
                            <mod.icon size={20} className="text-gray-400" />
                            <span className="font-bold text-gray-800 text-sm">{mod.label}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                    <Button onClick={generateSession} className="w-full h-12 rounded-xl text-lg mt-4">
                      Générer la session
                    </Button>
                  </div>
                </>
              ) : (
                <div className="flex flex-col items-center justify-center space-y-6 text-center animate-in zoom-in-95 duration-300">
                  <div className="p-6 bg-white rounded-3xl shadow-xl border border-gray-100">
                    <QRCodeSVG value={sessionUrl} size={240} level="H" includeMargin={false} />
                  </div>

                  <div>
                    <h4 className="font-black text-xl text-gray-800 mb-2">Code {sessionName}</h4>
                    <p className="text-gray-500 text-sm max-w-sm mx-auto mb-6">
                      Ouvrez la cible sur l'appareil mobile.
                    </p>
                    {sessions.find(s => s.sid === selectedSessionSid)?.status === 'uploaded' ? (
                      <div className="flex items-center justify-center gap-3 text-green-700 font-bold bg-green-50 p-4 rounded-xl border border-green-200">
                        <CheckCircle2 size={24} />
                        <span>Les données sont arrivées !</span>
                        <Button 
                          className="ml-4 px-3 py-1.5 h-auto text-sm bg-green-600 hover:bg-green-700"
                          onClick={() => selectedSessionSid && downloadAndProcessSession(selectedSessionSid)}
                        >
                          Voir
                        </Button>
                      </div>
                    ) : (
                      <div className="flex items-center justify-center gap-3 text-crousty-purple font-bold bg-purple-50 p-4 rounded-xl">
                        <div className="w-5 h-5 border-2 border-crousty-purple border-t-transparent rounded-full animate-spin"></div>
                        <span>En attente des données...</span>
                      </div>
                    )}
                  </div>
                  <Button variant="secondary" onClick={() => {setSessionUrl(''); setActiveTab('sessions');}} className="mt-4">
                    Retour aux sessions
                  </Button>
                </div>
              )}
            </div>
          )}

          {/* MANUAL IMPORT TAB */}
          {activeTab === 'manual' && importStatus === 'idle' && (
            <div className="space-y-6">
              <div 
                className="border-2 border-dashed border-crousty-purple/30 rounded-3xl p-10 flex flex-col items-center justify-center text-center cursor-pointer hover:bg-purple-50/30 transition-colors"
                onClick={() => fileInputRef.current?.click()}
              >
                <div className="w-16 h-16 bg-purple-100 text-crousty-purple rounded-full flex items-center justify-center mb-4">
                  <Upload size={32} />
                </div>
                <h4 className="font-black text-xl text-gray-800 mb-2">Sélectionnez le fichier ZIP</h4>
                <p className="text-gray-500 text-sm max-w-sm">Le fichier téléchargé depuis l'appareil mobile.</p>
                <input type="file" ref={fileInputRef} className="hidden" accept=".zip,application/zip" onChange={handleFileUpload} />
              </div>
            </div>
          )}
          
          {/* SHARED IMPORT PIPELINE */}
          {importStatus === 'reading' && (
            <div className="flex flex-col items-center justify-center py-12 space-y-4">
              <div className="w-12 h-12 border-4 border-crousty-purple border-t-transparent rounded-full animate-spin"></div>
              <p className="font-bold text-gray-600">Lecture de l'archive ZIP...</p>
            </div>
          )}
          
          {importStatus === 'error' && (
            <div className="bg-red-50 border border-red-100 rounded-2xl p-6 text-center">
              <div className="w-16 h-16 bg-red-100 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
                <AlertTriangle size={32} />
              </div>
              <h4 className="font-black text-xl text-red-800 mb-2">Impossible d'importer</h4>
              <p className="text-red-600 text-sm mb-6">{importError}</p>
              <Button variant="secondary" onClick={() => {setImportStatus('idle'); setActiveTab('sessions');}}>Retour</Button>
            </div>
          )}
          
          {importStatus === 'summary' && importSummary && (
            <div className="space-y-6 animate-in fade-in duration-300">
              <div className="bg-green-50 border border-green-100 rounded-2xl p-6">
                <h4 className="font-black text-green-800 text-lg mb-4 flex items-center gap-2">
                   <CheckCircle2 /> Archive valide
                </h4>
                
                <div className="bg-white rounded-xl p-4 space-y-3 mb-4 shadow-sm">
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-gray-500">Auteur de la collecte</span>
                    <span className="font-black text-crousty-purple text-base">{importSummary.manifest.workerName || "Appareil Mobile"}</span>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-gray-500">Session</span>
                    <span className="font-bold text-gray-800">{importSummary.manifest.name || importSummary.manifest.sessionId.slice(0,8)}</span>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-gray-500">Date d'export</span>
                    <span className="font-bold text-gray-800">{new Date(importSummary.manifest.createdAt).toLocaleString()}</span>
                  </div>
                </div>
                
                <div className="flex gap-4">
                   <div className="flex-1 bg-white rounded-xl p-4 text-center shadow-sm">
                     <div className="text-3xl font-black text-green-600">{importSummary.newCount}</div>
                     <div className="text-xs font-bold text-gray-500 uppercase">Nouvelles entrées</div>
                   </div>
                   <div className="flex-1 bg-white rounded-xl p-4 text-center shadow-sm opacity-70">
                     <div className="text-3xl font-black text-gray-400">{importSummary.duplicateCount}</div>
                     <div className="text-xs font-bold text-gray-500 uppercase">Doublons ignorés</div>
                   </div>
                </div>
              </div>
              
              <div className="bg-gray-50 p-4 rounded-xl text-sm text-gray-600 text-center">
                Opération validée sur l'iPad par <b>{currentUser?.name}</b>.
              </div>
              
              <div className="flex gap-3">
                <Button variant="secondary" onClick={() => {setImportStatus('idle'); setImportingSid(null); setActiveTab('sessions');}} className="flex-1">Annuler</Button>
                <Button onClick={confirmImport} className="flex-1 bg-green-600 hover:bg-green-700">Confirmer l'import</Button>
              </div>
            </div>
          )}
          
          {importStatus === 'importing' && (
            <div className="flex flex-col items-center justify-center py-12 space-y-4">
              <div className="w-12 h-12 border-4 border-green-500 border-t-transparent rounded-full animate-spin"></div>
              <p className="font-bold text-gray-600">Intégration des données...</p>
            </div>
          )}
          
          {importStatus === 'success' && (
            <div className="flex flex-col items-center justify-center py-12 space-y-4 text-center animate-in zoom-in-95 duration-300">
              <div className="w-20 h-20 bg-green-100 text-green-500 rounded-full flex items-center justify-center">
                <CheckCircle2 size={40} />
              </div>
              <h4 className="font-black text-2xl text-gray-800">Succès !</h4>
              <p className="text-gray-500">Les données ont été ajoutées à la base.</p>
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
};
