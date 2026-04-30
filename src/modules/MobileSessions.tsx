import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { 
  Smartphone, Search, Plus, RefreshCw, Calendar, Clock, User, QrCode, 
  CheckCircle2, AlertTriangle, ArrowRight, History, Trash2,
  Filter, X, Info, Download, Eye, ChevronRight, ClipboardList, Thermometer, Flame, 
  Package, Droplets, Droplet, ListFilter, Trash, Shield
} from 'lucide-react';
import { Card, Button, Input, Label } from '../components/ui/LightUI';
import { StatusBadge, StatusType } from '../components/ui/StatusBadge';
import { getStoredData, setStoredData, savePhotoBase64 } from '../lib/db';
import { useAuth } from '../contexts/AuthContext';
import { useConfig } from '../contexts/ConfigContext';
import { useManagerUI } from '../contexts/ManagerUIContext';
import { logAuditEvent, getAuditEvents } from '../lib/audit';
import { QRCodeSVG } from 'qrcode.react';
import JSZip from 'jszip';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { MobileSession, MobileSessionStatus, MembreEquipe } from '../types';

const MODULES_LIST = [
  { id: 'reception', label: 'Réception Livraison', icon: Package, color: 'text-orange-500' },
  { id: 'tracabilite', label: 'Traçabilité', icon: QrCode, color: 'text-blue-500' },
  { id: 'temperature', label: 'Températures', icon: Thermometer, color: 'text-sky-500' },
  { id: 'cuisson', label: 'Cuisson Alimentaire', icon: Flame, color: 'text-red-500' },
  { id: 'nettoyage', label: 'Plan de nettoyage', icon: Droplets, color: 'text-purple-500' },
  { id: 'huiles', label: 'Contrôle Huiles', icon: Droplet, color: 'text-amber-500' },
  { id: 'inventaire', label: 'Inventaire rapide', icon: ClipboardList, color: 'text-emerald-500' },
];

const DEFAULT_MOBILE_PROFILES = [
  { id: 'all', name: 'Complet (Tout modules)', modules: MODULES_LIST.map(m => m.id) },
  { id: 'morning', name: 'Ouverture (Matin)', modules: ['tracabilite', 'temperature', 'huiles'] },
  { id: 'evening', name: 'Fermeture (Soir)', modules: ['temperature', 'nettoyage'] },
  { id: 'delivery', name: 'Livraison', modules: ['reception'] }
];

export const MobileSessions = () => {
  const { currentUser } = useAuth();
  const { config } = useConfig();
  
  // @ts-ignore
  const MOBILE_PROFILES = config?.mobileProfiles || DEFAULT_MOBILE_PROFILES;
  
  const [sessions, setSessions] = useState<MobileSession[]>([]);
  const [auditEvents, setAuditEvents] = useState<any[]>([]);
  const [filterModule, setFilterModule] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterCreator, setFilterCreator] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  
  const [showNewModal, setShowNewModal] = useState(false);
  const [showQrModal, setShowQrModal] = useState<MobileSession | null>(null);
  const [showImportModal, setShowImportModal] = useState<MobileSession | null>(null);
  const [showFullAudit, setShowFullAudit] = useState(false);
  
  // New session state
  const [sessionName, setSessionName] = useState('Collecte du jour');
  const [selectedModules, setSelectedModules] = useState<string[]>(['tracabilite', 'temperature']);
  const [durationHours, setDurationHours] = useState('12');
  
  const [confirmingDelete, setConfirmingDelete] = useState<string | null>(null);

  const employees = getStoredData<MembreEquipe[]>('crousty_employees', []);

  const [isOfflineMode, setIsOfflineMode] = useState(false);

  useEffect(() => {
    loadSessions();
    loadAudit();
    const interval = setInterval(loadSessions, 5000); // reduced frequency
    
    window.addEventListener('crousty_audit_updated', loadAudit);
    return () => {
      clearInterval(interval);
      window.removeEventListener('crousty_audit_updated', loadAudit);
    };
  }, []);

  const loadAudit = () => {
    const allEvents = getAuditEvents();
    const sessionEvents = allEvents
      .filter(e => e.module === 'session' || e.module === 'mobile')
      .slice(0, 3); // Limited to 3 items
    setAuditEvents(sessionEvents);
  };

  const loadSessions = () => {
    fetch('/api/sessions')
      .then(res => {
        const isHtml = res.headers.get('content-type')?.includes('text/html');
        if (!res.ok || isHtml) throw new Error('Offline');
        setIsOfflineMode(false);
        return res.json();
      })
      .then(data => {
        // Normalize server data to MobileSession type
        const normalized: MobileSession[] = (data.sessions || []).map((s: any) => ({
          id: s.sid || s.id,
          sessionName: s.name || s.sessionName || 'Session sans nom',
          status: s.status as MobileSessionStatus,
          allowedModules: s.modules || s.allowedModules || [],
          createdAt: s.timestamp ? new Date(s.timestamp).toISOString() : new Date().toISOString(),
          expiresAt: s.expiresAt || (s.timestamp ? new Date(s.timestamp + 12 * 60 * 60 * 1000).toISOString() : new Date().toISOString()),
          assignedToName: s.assignedToName || 'Moi',
          createdByUserName: s.createdByUserName || 'Moi',
          createdByUserId: s.createdByUserId || currentUser?.id,
          importStatus: s.importStatus || 'none',
          lastActivityAt: s.lastActivityAt || new Date().toISOString()
        }));
        
        setSessions(normalized);
        setStoredData('crousty_mobile_sessions', normalized);
      })
      .catch(err => {
        setIsOfflineMode(true);
        const local = getStoredData<MobileSession[]>('crousty_mobile_sessions', []);
        const now = Date.now();
        const TWENTY_FOUR_HOURS = 24 * 60 * 60 * 1000;
        const filteredLocal = local.filter(s => {
          const timestamp = s.lastActivityAt || s.createdAt;
          return now - new Date(timestamp).getTime() <= TWENTY_FOUR_HOURS;
        });
        if (filteredLocal.length !== local.length) {
          setStoredData('crousty_mobile_sessions', filteredLocal);
        }
        setSessions(filteredLocal);
      });
  };

  useEffect(() => {
    if (showQrModal && !isOfflineMode) {
      const currentSession = sessions.find(s => s.id === showQrModal.id);
      if (currentSession && (currentSession.status === 'connected' || currentSession.status === 'collecting' || currentSession.status === 'uploaded')) {
        const timer = setTimeout(() => {
          setShowQrModal(null);
        }, 1200); // 1.2s delay to show the connection success message
        return () => clearTimeout(timer);
      }
    }
  }, [showQrModal, sessions, isOfflineMode]);

  const handleDeleteSession = async (sid: string) => {
    try {
      fetch(`/api/sessions/${sid}`, {
        method: 'DELETE'
      }).catch(() => console.warn("Serveur injoignable, suppression locale uniquement"));

      const updated = sessions.filter(s => s.id !== sid);
      setSessions(updated);
      setStoredData('crousty_mobile_sessions', updated);
      setConfirmingDelete(null);

      // Close modals if they were showing the deleted session
      if (showQrModal?.id === sid) setShowQrModal(null);
      if (showImportModal?.id === sid) setShowImportModal(null);
      
      logAuditEvent({
        type: 'delete',
        module: 'session',
        action: 'Suppression session mobile',
        userName: currentUser?.name || 'Inconnu',
        userId: currentUser?.id,
        source: 'hub',
        details: { sid },
        status: 'success'
      });
    } catch (e) {
      console.error(e);
      setConfirmingDelete(null);
    }
  };

  const handleCreateSession = async () => {
    if (!currentUser) return;
    
    const assignedName = currentUser.name;
    const assignedToEmployeeId = currentUser.id;

    const newSid = Date.now().toString(36) + Math.random().toString(36).substring(2, 5);
    const now = new Date();
    const expires = new Date(now.getTime() + parseInt(durationHours) * 60 * 60 * 1000);

    const newSession: MobileSession = {
      id: newSid,
      sessionName,
      createdByUserId: currentUser.id,
      createdByUserName: currentUser.name,
      roleAtCreation: currentUser.role,
      assignedToEmployeeId: assignedToEmployeeId,
      assignedToName: assignedName,
      allowedModules: selectedModules,
      createdAt: now.toISOString(),
      expiresAt: expires.toISOString(),
      status: 'waiting',
      importStatus: 'none',
      lastActivityAt: now.toISOString()
    };

    // Prepare server sync
    const configSnapshot = {
      config: getStoredData('crousty-config', {}),
      catalogue: getStoredData('crousty_catalogue_v2', []),
      fournisseurs: getStoredData('crousty_fournisseurs', []),
      employees: getStoredData('crousty_employees', []),
      temperaturesZones: getStoredData('crousty-temperatures-zones', []),
      inventaireProduits: getStoredData('crousty-inventaire-produits', []),
      huilesCuves: getStoredData('crousty_huiles_cuves', []),
      nettoyageTaches: getStoredData('crousty-nettoyage-taches', []),
    };

    try {
      try {
        await fetch(`/api/sessions/${newSid}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            name: sessionName, 
            modules: selectedModules, 
            configSnapshot,
            metadata: {
              createdByUserId: currentUser.id,
              createdByUserName: currentUser.name,
              assignedToName: assignedName
            }
          })
        }).then(res => {
          if (!res.ok && res.status !== 404 && !res.headers.get('content-type')?.includes('text/html')) {
             console.warn('Backend responded with config error (ignored on static deploy)');
          }
        }).catch(() => console.warn('No backend for session sync (Netlify static)'));
      } catch (e) {}

      const updated = [newSession, ...(sessions || [])];
      setSessions(updated);
      setStoredData('crousty_mobile_sessions', updated);
      
      logAuditEvent({
        type: 'create',
        module: 'session',
        action: 'Création session mobile',
        userName: currentUser.name,
        userId: currentUser.id,
        source: 'hub',
        details: { sessionName, assignedTo: assignedName, sid: newSid },
        status: 'success'
      });

      setShowNewModal(false);
      setShowQrModal(newSession);
    } catch (e) {
      console.error(e);
      alert("Erreur lors de la création de la session.");
    }
  };

  const archivedSessions = (sessions || []).filter(s => s.status === 'archived' || s.status === 'imported');
  const activeSessions = (sessions || []).filter(s => s.status !== 'archived' && s.status !== 'imported');

  const filteredSessions = (currentUser?.role === 'manager' ? activeSessions : activeSessions.filter(s => s.createdByUserId === currentUser?.id || s.assignedToEmployeeId === currentUser?.id)).filter(s => {
    if (filterStatus !== 'all' && s.status !== filterStatus) return false;
    if (filterModule !== 'all' && !(s.allowedModules || []).includes(filterModule)) return false;
    if (filterCreator !== 'all' && s.createdByUserId !== filterCreator) return false;
    if (searchQuery && !s.sessionName.toLowerCase().includes(searchQuery.toLowerCase()) && !s.assignedToName.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });

  const kpis = {
    active: activeSessions.length,
    waiting: activeSessions.filter(s => s.status === 'waiting').length,
    received: activeSessions.filter(s => s.status === 'uploaded' || s.status === 'preview-ready').length,
    errors: activeSessions.filter(s => s.status === 'error').length,
  };

  return (
    <div className="space-y-6">
      {/* HEADER */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-gray-800 tracking-tight">Espace Sessions Mobiles</h1>
          <p className="text-gray-500 font-medium">Gérez vos collectes de données sur smartphone</p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={loadSessions} className="rounded-xl w-auto h-10 py-0 px-4 text-xs font-bold whitespace-nowrap">
            <RefreshCw size={16} className="mr-2" /> Actualiser
          </Button>
          <Button onClick={() => setShowNewModal(true)} className="rounded-xl w-auto h-10 py-0 px-4 text-xs font-bold whitespace-nowrap shadow-md shadow-crousty-purple/20">
            <Plus size={16} className="mr-2" /> Nouvelle Session
          </Button>
        </div>
      </div>

      {/* KPI CARDS */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KPIItem label="Actives" value={kpis.active} icon={History} color="text-blue-600" bg="bg-blue-50" />
        <KPIItem label="En attente" value={kpis.waiting} icon={Clock} color="text-orange-600" bg="bg-orange-50" />
        <KPIItem label="Collectes reçues" value={kpis.received} icon={Download} color="text-emerald-600" bg="bg-emerald-50" />
        <KPIItem label="En erreur" value={kpis.errors} icon={AlertTriangle} color="text-red-600" bg="bg-red-50" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* MAIN LIST */}
        <div className="lg:col-span-2 space-y-4">
           <Card className="p-4 bg-gray-50 border-none shadow-none">
             <div className="flex flex-wrap gap-3">
                <div className="flex-1 min-w-[200px] relative">
                   <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                   <Input 
                    placeholder="Rechercher une session..." 
                    className="pl-10 h-10 border-none bg-white rounded-xl shadow-sm"
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                   />
                </div>
                <select 
                  className="h-10 px-3 rounded-xl border-none bg-white shadow-sm text-sm font-bold text-gray-600 outline-none focus:ring-2 focus:ring-crousty-purple"
                  value={filterStatus}
                  onChange={e => setFilterStatus(e.target.value)}
                >
                  <option value="all">Tous les statuts</option>
                  <option value="waiting">En attente</option>
                  <option value="connected">Connectée</option>
                  <option value="collecting">Collecte en cours</option>
                  <option value="uploaded">Reçue</option>
                  <option value="error">Erreur</option>
                </select>
                {currentUser?.role === 'manager' && (
                  <select 
                    className="h-10 px-3 rounded-xl border-none bg-white shadow-sm text-sm font-bold text-gray-600 outline-none focus:ring-2 focus:ring-crousty-purple"
                    value={filterCreator}
                    onChange={e => setFilterCreator(e.target.value)}
                  >
                    <option value="all">Tous les créateurs</option>
                    {Array.from(new Set((sessions || []).map(s => s.createdByUserId))).filter(id => id != null).map((id, idx) => {
                      const creatorName = (sessions || []).find(s => s.createdByUserId === id)?.createdByUserName || 'Inconnu';
                      return (
                        <option key={`creator-${id}-${idx}`} value={String(id)}>
                          {creatorName}
                        </option>
                      );
                    })}
                  </select>
                )}
             </div>
           </Card>

           <div className="space-y-3">
             {filteredSessions.length === 0 ? (
               <div className="p-12 text-center text-gray-400 bg-white border border-dashed rounded-3xl flex flex-col items-center">
                  <Smartphone size={48} className="mb-4 opacity-20" />
                  <p className="font-bold">Aucune session mobile active</p>
                  <p className="text-sm">Commencez par créer une nouvelle session de collecte.</p>
               </div>
             ) : (
               filteredSessions.map((session, idx) => (
                 <SessionRow 
                    key={`${session.id}-${idx}`} 
                    session={session} 
                    onShowQr={setShowQrModal}
                    onImport={setShowImportModal}
                    isConfirmingDelete={confirmingDelete === session.id}
                    onSetConfirmingDelete={(sid: string | null) => setConfirmingDelete(sid)}
                    onDelete={handleDeleteSession}
                    isOfflineMode={isOfflineMode}
                 />
               ))
             )}
           </div>
        </div>

        {/* SIDEBAR */}
        <div className="space-y-6">
           <Card className="p-5 overflow-hidden">
             <h3 className="font-black text-gray-800 mb-4 flex items-center gap-2">
               <History size={18} className="text-crousty-purple" /> Événements récents
             </h3>
             <div className="space-y-4 text-sm relative border-l-2 border-gray-100 ml-2">
                {auditEvents.length > 0 ? (
                  auditEvents.map((item, idx) => {
                    const eventDate = new Date(item.timestamp);
                    const isToday = format(eventDate, 'dd/MM') === format(new Date(), 'dd/MM');
                    const timeLabel = isToday ? format(eventDate, 'HH:mm') : format(eventDate, 'dd MMM', { locale: fr });
                    
                    return (
                      <div key={`${item.id}-${idx}`} className="relative pl-6 pb-2">
                         <div className={`absolute -left-[7px] top-1 w-3 h-3 bg-white border-2 rounded-full ${
                           item.status === 'error' ? 'border-red-500' : 'border-crousty-purple'
                         }`} />
                         <div className="font-bold text-gray-800 flex items-center gap-2">
                           {item.action}
                           {item.status === 'error' && <AlertTriangle size={12} className="text-red-500" />}
                         </div>
                         <div className="text-gray-500 text-xs">
                           {item.userName} • Session: {item.details?.sessionName || item.details?.session || 'N/A'}
                         </div>
                         <div className="text-[10px] text-gray-400 mt-1 uppercase font-black">{timeLabel}</div>
                      </div>
                    );
                  })
                ) : (
                  <div className="pl-6 text-gray-400 italic text-xs py-4">Aucun événement récent</div>
                )}
                <button 
                  onClick={() => setShowFullAudit(true)}
                  className="text-xs text-crousty-purple font-black hover:underline mt-2 ml-4"
                >
                  Voir l'audit complet
                </button>
             </div>
           </Card>

           <div className="bg-gradient-to-br from-crousty-purple to-crousty-purple/80 p-6 rounded-[2.5rem] text-white shadow-xl">
              <Smartphone size={32} className="mb-4 opacity-50" />
              <h4 className="text-lg font-black leading-tight mb-2">Comment ça marche ?</h4>
              <ul className="space-y-3 text-sm opacity-90 font-medium">
                 <li className="flex gap-2">
                   <div className="w-5 h-5 bg-white/20 rounded-full flex items-center justify-center shrink-0">1</div>
                   Créez une session et choisissez les modules.
                 </li>
                 <li className="flex gap-2">
                   <div className="w-5 h-5 bg-white/20 rounded-full flex items-center justify-center shrink-0">2</div>
                   Scannez le QR Code avec le téléphone.
                 </li>
                 <li className="flex gap-2">
                   <div className="w-5 h-5 bg-white/20 rounded-full flex items-center justify-center shrink-0">3</div>
                   Faites la saisie et envoyez les données.
                 </li>
                 <li className="flex gap-2">
                   <div className="w-5 h-5 bg-white/20 rounded-full flex items-center justify-center shrink-0">4</div>
                   Vérifiez et importez sur cet écran.
                 </li>
              </ul>
           </div>
        </div>
      </div>

      {/* NEW SESSION MODAL */}
      {showNewModal && createPortal(
        <div className="fixed inset-0 z-[6000] bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
           <Card className="w-full max-w-2xl max-h-[90dvh] overflow-y-auto p-0 flex flex-col shadow-2xl">
              <div className="p-6 border-b border-gray-100 flex justify-between items-center sticky top-0 bg-white z-10">
                <h2 className="text-xl font-black text-gray-800">Nouvelle Session Mobile</h2>
                <button onClick={() => setShowNewModal(false)} className="p-2 hover:bg-gray-100 rounded-full"><X size={20}/></button>
              </div>
              
              <div className="p-6 space-y-6">
                 {/* Profils */}
                 <div className="space-y-3">
                   <Label className="uppercase tracking-widest text-[10px] font-black text-gray-400">Modèles préconfigurés</Label>
                   <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                      {MOBILE_PROFILES.map(prof => (
                        <button 
                          key={prof.id}
                          className="shrink-0 px-4 py-2 bg-gray-50 hover:bg-crousty-purple/10 border border-gray-100 rounded-xl text-xs font-bold text-gray-700 transition-colors"
                          onClick={() => {
                            setSessionName(prof.name);
                            setSelectedModules(prof.modules);
                          }}
                        >
                          {prof.name}
                        </button>
                      ))}
                   </div>
                 </div>

                 <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                       <div>
                          <Label>Nom de la session</Label>
                          <Input 
                            value={sessionName}
                            onChange={e => setSessionName(e.target.value)}
                            placeholder="Ex: Inventaire matin"
                            className="bg-gray-50 border-none h-12 text-lg font-bold"
                          />
                       </div>
                       <div>
                          <Label>Durée de validité (en heures)</Label>
                          <select 
                            className="w-full mt-1 h-12 bg-gray-50 rounded-xl px-4 font-bold text-gray-700 outline-none border-2 border-transparent focus:border-crousty-purple"
                            value={durationHours}
                            onChange={e => setDurationHours(e.target.value)}
                          >
                            <option key="4h" value="4">4 Heures</option>
                            <option key="8h" value="8">8 Heures</option>
                            <option key="12h" value="12">12 Heures (Défaut)</option>
                            <option key="24h" value="24">24 Heures</option>
                          </select>
                       </div>
                    </div>

                    <div>
                       <Label className="mb-2 block">Modules autorisés</Label>
                       <div className="grid grid-cols-1 gap-2">
                          {MODULES_LIST.map(mod => (
                            <label key={mod.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl cursor-pointer hover:bg-gray-100 transition-colors">
                               <input 
                                type="checkbox" 
                                checked={selectedModules.includes(mod.id)} 
                                onChange={e => {
                                  if (e.target.checked) setSelectedModules([...selectedModules, mod.id]);
                                  else setSelectedModules(selectedModules.filter(id => id !== mod.id));
                                }}
                                className="w-5 h-5 text-crousty-purple rounded focus:ring-crousty-purple"
                               />
                               <mod.icon size={20} className={mod.color} />
                               <span className="font-bold text-gray-700 text-sm">{mod.label}</span>
                            </label>
                          ))}
                       </div>
                    </div>
                 </div>
              </div>

              <div className="p-6 border-t border-gray-100 bg-gray-50 flex gap-3">
                 <Button variant="secondary" onClick={() => setShowNewModal(false)} className="flex-1 rounded-xl h-12">Annuler</Button>
                 <Button onClick={handleCreateSession} className="flex-1 rounded-xl h-12 shadow-lg shadow-crousty-purple/20">Lancer la session</Button>
              </div>
           </Card>
        </div>,
        document.body
      )}

      {/* QR MODAL */}
      {showQrModal && (() => {
        const currentSession = sessions.find(s => s.id === showQrModal.id) || showQrModal;
        const isConnected = currentSession.status === 'connected' || currentSession.status === 'collecting' || currentSession.status === 'uploaded';
        
        return createPortal(
          <div className="fixed inset-0 z-[7000] bg-black/90 backdrop-blur-xl flex items-center justify-center p-4">
             <div className="text-center space-y-6 text-white animate-in zoom-in-95 duration-300 flex flex-col items-center justify-center">
                <div className="bg-white p-8 rounded-[3rem] shadow-2xl inline-block mx-auto">
                   <QRCodeSVG 
                    value={window.location.origin + window.location.pathname + '?session=' + btoa(encodeURIComponent(JSON.stringify({
                      t: 'cch-mob',
                      sid: currentSession.id,
                      resto: getStoredData<any>('crousty-config', {restaurant: {nom: 'Crousty'}}).restaurant.nom,
                      identity: getStoredData<any>('crousty-config', {restaurant: {}}).restaurant,
                      exp: isNaN(new Date(currentSession.expiresAt).getTime()) ? Date.now() + 3600000 : new Date(currentSession.expiresAt).getTime(),
                      m: currentSession.allowedModules,
                      name: currentSession.sessionName
                    })))} 
                    size={280} 
                    level="H"
                  />
                </div>

                <div>
                   <h2 className="text-3xl font-black">{currentSession.sessionName}</h2>
                   <p className="text-purple-200 font-bold uppercase tracking-widest text-xs mt-2">
                     {isConnected ? 'APPAREIL CONNECTÉ' : 'PRÊT POUR SCAN MOBILE'}
                   </p>
                </div>
                
                {isConnected ? (
                  <div className="bg-emerald-500/20 p-4 rounded-2xl flex items-center gap-3 max-w-sm mx-auto border border-emerald-500/30">
                    <CheckCircle2 size={24} className="text-emerald-400" />
                    <div className="text-left">
                      <span className="block text-sm font-black text-emerald-100">Connecté</span>
                      <span className="block text-[10px] text-emerald-200/70 font-medium">L'utilisateur peut maintenant commencer la saisie.</span>
                    </div>
                  </div>
                ) : (
                  <div className="bg-white/10 p-4 rounded-2xl flex items-center gap-3 max-w-sm mx-auto border border-white/10">
                    {isOfflineMode ? (
                      <div className="flex flex-col items-center gap-2 text-center w-full">
                        <AlertTriangle className="text-yellow-400" size={24} />
                        <span className="text-sm font-bold text-yellow-100">Serveur API indisponible</span>
                        <p className="text-xs text-white/70">Scannez le code, effectuez la saisie, puis utilisez l'import manuel (bouton ZIP) à la fin.</p>
                      </div>
                    ) : (
                      <>
                        <div className="w-5 h-5 border-2 border-white/50 border-t-white rounded-full animate-spin"></div>
                        <span className="text-sm font-medium">En attente de connexion du téléphone...</span>
                      </>
                    )}
                  </div>
                )}
                
                <Button variant="secondary" onClick={() => setShowQrModal(null)} className="bg-white text-gray-900 border-none h-12 px-8 rounded-2xl font-black mx-auto block mt-8">FERMER</Button>
             </div>
          </div>,
          document.body
        );
      })()}

      {/* IMPORT PREVIEW MODAL */}
      {showImportModal && (
        <ImportPreviewModal 
          session={showImportModal} 
          onClose={() => setShowImportModal(null)} 
          onImported={loadSessions}
        />
      )}

      {/* FULL AUDIT MODAL */}
      {showFullAudit && createPortal(
        <div className="fixed inset-0 z-[6000] bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
           <Card className="w-full max-w-2xl max-h-[90dvh] overflow-hidden p-0 flex flex-col shadow-2xl">
              <div className="p-6 border-b border-gray-100 flex justify-between items-center sticky top-0 bg-white z-10">
                <div className="flex items-center gap-3">
                  <History className="text-crousty-purple" size={24} />
                  <h2 className="text-xl font-black text-gray-800">Audit Sessions & Mobile</h2>
                </div>
                <button onClick={() => setShowFullAudit(false)} className="p-2 hover:bg-gray-100 rounded-full"><X size={20}/></button>
              </div>
              
              <div className="p-6 overflow-y-auto space-y-4">
                {getAuditEvents()
                  .filter(e => e.module === 'session' || e.module === 'mobile')
                  .map((item, idx) => {
                    const eventDate = new Date(item.timestamp);
                    const timeLabel = format(eventDate, 'eeee d MMMM HH:mm', { locale: fr });
                    
                    return (
                      <div key={`${item.id}-${idx}`} className="flex gap-4 p-4 bg-gray-50 rounded-2xl border border-gray-100 items-start">
                         <div className={`p-2 rounded-xl shrink-0 ${
                           item.status === 'error' ? 'bg-red-50 text-red-500' : 'bg-crousty-purple/10 text-crousty-purple'
                         }`}>
                           {item.status === 'error' ? <AlertTriangle size={20} /> : <CheckCircle2 size={20} />}
                         </div>
                         <div className="min-w-0">
                           <div className="font-bold text-gray-800 flex items-center gap-2">
                             {item.action}
                           </div>
                           <div className="text-gray-500 text-sm font-medium">
                             Par <span className="text-gray-700 font-bold">{item.userName}</span>
                           </div>
                           <div className="mt-1 text-xs text-gray-400 font-bold uppercase tracking-wider">{timeLabel}</div>
                           
                           {item.details && (
                             <div className="mt-3 grid grid-cols-2 gap-2">
                               {Object.entries(item.details).map(([key, val]: [string, any]) => (
                                 <div key={key} className="bg-white/50 p-2 rounded-lg text-[10px] border border-gray-200">
                                   <span className="text-gray-400 block uppercase font-black">{key}</span>
                                   <span className="text-gray-700 font-bold break-all">{String(val)}</span>
                                 </div>
                               ))}
                             </div>
                           )}
                         </div>
                      </div>
                    );
                  })}
              </div>
              
              <div className="p-4 border-t border-gray-100 bg-gray-50 flex justify-end">
                <Button onClick={() => setShowFullAudit(false)} className="rounded-xl px-8">Fermer</Button>
              </div>
           </Card>
        </div>,
        document.body
      )}
    </div>
  );
};

const KPIItem = ({ label, value, icon: Icon, color, bg }: any) => (
  <Card className="p-4 border-none shadow-sm flex items-center gap-4">
    <div className={`p-2.5 rounded-2xl ${bg} ${color}`}>
      <Icon size={20} />
    </div>
    <div>
      <div className="text-sm text-gray-500 font-bold uppercase tracking-wider">{label}</div>
      <div className="text-2xl font-black text-gray-800">{value}</div>
    </div>
  </Card>
);

const SessionRow = ({ session, onShowQr, onImport, onDelete, isConfirmingDelete, onSetConfirmingDelete, isOfflineMode }: any) => {
  const safeFormat = (dateStr: string | undefined, formatStr: string) => {
    if (!dateStr) return '--:--';
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return '--:--';
    return format(date, formatStr, { locale: fr });
  };

  const expiresDate = new Date(session.expiresAt);
  const isExpired = !isNaN(expiresDate.getTime()) && expiresDate < new Date();
  
  return (
    <div className={`group bg-white border border-gray-100 rounded-3xl p-5 hover:shadow-xl hover:shadow-gray-100 transition-all ${isExpired ? 'opacity-60' : ''}`}>
       <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-4">
             <div className={`w-14 h-14 rounded-[1.2rem] flex items-center justify-center shadow-inner ${session.status === 'uploaded' ? 'bg-emerald-50 text-emerald-600' : 'bg-gray-50 text-gray-400'}`}>
                {session.status === 'uploaded' ? <Download size={24} /> : <Smartphone size={24} />}
             </div>
             <div>
                <div className="flex items-center gap-2 mb-1">
                   <h3 className="font-black text-gray-900 text-lg uppercase tracking-tight">{session.sessionName}</h3>
                   <StatusBadge status={isExpired ? 'expired' : session.status as any} label={isOfflineMode && session.status === 'waiting' && !isExpired ? 'Mode Manuel' : undefined} />
                </div>
                <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500 font-bold uppercase tracking-wider">
                   <span className="flex items-center gap-1.5"><User size={14}/> {session.assignedToName}</span>
                   <span className="flex items-center gap-1.5"><Calendar size={14}/> {safeFormat(session.createdAt, 'dd MMM HH:mm')}</span>
                   <span className="flex items-center gap-1.5"><History size={14}/> Exp: {safeFormat(session.expiresAt, 'HH:mm')}</span>
                </div>
                <div className="flex gap-2 mt-2">
                   {(session.allowedModules || []).map((mid, idx) => {
                     const mod = MODULES_LIST.find(m => m.id === mid);
                     return mod ? <span key={`${mid}-${idx}`} className="text-[9px] bg-gray-50 px-2 py-0.5 rounded-md border text-gray-400" title={mod.label}>{mod.label}</span> : null;
                   })}
                </div>
             </div>
          </div>
          
          <div className="flex gap-2 items-center justify-end">
             {isConfirmingDelete ? (
               <div className="flex items-center gap-2 animate-in fade-in slide-in-from-right-2 duration-300">
                  <span className="text-[10px] font-black text-red-500 uppercase tracking-widest mr-1">Confirmer ?</span>
                  <Button 
                    onClick={() => onSetConfirmingDelete(null)} 
                    variant="secondary" 
                    className="h-9 w-9 p-0 rounded-full bg-gray-100"
                  >
                    <X size={14} />
                  </Button>
                  <Button 
                    onClick={() => onDelete(session.id)} 
                    variant="danger" 
                    className="h-9 w-9 p-0 rounded-full"
                  >
                    <CheckCircle2 size={14} />
                  </Button>
               </div>
             ) : (
               <>
                 {session.status === 'waiting' && !isExpired && (
                   <Button onClick={() => onShowQr(session)} variant="secondary" className="h-10 text-xs px-4 rounded-xl border-gray-200 font-black">
                     <QrCode size={16} className="mr-2" /> QR CODE
                   </Button>
                 )}
                 {(session.status === 'uploaded' || session.status === 'error') && (
                    <Button onClick={() => onImport(session)} className="h-10 text-xs px-4 rounded-xl font-black bg-emerald-600 hover:bg-emerald-700">
                      <Eye size={16} className="mr-2" /> PRÉVISUALISER
                    </Button>
                 )}
                 <button 
                    onClick={() => onSetConfirmingDelete(session.id)} 
                    className="p-3 text-gray-300 hover:text-red-500 transition-colors" 
                    title="Supprimer / Archiver"
                  >
                     <Trash2 size={18} />
                  </button>
               </>
             )}
          </div>
       </div>
    </div>
  );
};

const MODULE_MAP: Record<string, { storageKey: string, zipFile: string }> = {
  inventaire: { storageKey: 'crousty_inventory', zipFile: 'inventaire.json' },
  temperature: { storageKey: 'crousty_temp_checklist', zipFile: 'temperatures-frigo.json' },
  cuisson: { storageKey: 'crousty_viandes', zipFile: 'viandes.json' },
  tracabilite: { storageKey: 'crousty_tracabilite_v2', zipFile: 'tracabilite.json' },
  reception: { storageKey: 'crousty_receptions_v3', zipFile: 'receptions.json' },
  nettoyage: { storageKey: 'crousty_cleaning', zipFile: 'nettoyage.json' },
  huiles: { storageKey: 'crousty_oil_checklist', zipFile: 'huiles.json' }
};

const ImportPreviewModal = ({ session, onClose, onImported }: { session: MobileSession, onClose: () => void, onImported: () => void }) => {
  const [status, setStatus] = useState<'reading' | 'ready' | 'importing' | 'success' | 'error'>('reading');
  const [summary, setSummary] = useState<any>(null);
  const [previewData, setPreviewData] = useState<Record<string, any[]>>({});
  const [errorMsg, setErrorMsg] = useState('');
  const { currentUser } = useAuth();

  useEffect(() => {
    const fetchSessionData = async () => {
      try {
        const response = await fetch(`/api/sessions/${session.id}/download?format=json`);
        if (!response.ok) throw new Error("Erreur lors du téléchargement");
        
        let blob: Blob;
        const contentType = response.headers.get('content-type') || '';
        
        if (contentType.includes('application/json')) {
            const data = await response.json();
            if (!data || !data.base64) throw new Error("Format d'export invalide (base64 manquant)");
            
            // Convert Base64 to Blob safely for Safari/iPad compatibility
            const binaryString = atob(data.base64);
            const bytes = new Uint8Array(binaryString.length);
            for (let i = 0; i < binaryString.length; i++) {
               bytes[i] = binaryString.charCodeAt(i);
            }
            blob = new Blob([bytes], { type: 'application/zip' });
        } else {
            blob = await response.blob();
        }
        
        const JSZip = (await import('jszip')).default;
        const zip = await JSZip.loadAsync(blob);
        const manifestFile = zip.file('manifest.json');
        
        if (!manifestFile) throw new Error("Manifeste manquant dans l'export");
        
        const manifest = JSON.parse(await manifestFile.async('text'));
        
        const extractedData: Record<string, any[]> = {};
        for(const modId of manifest.modules) {
          const modConf = MODULE_MAP[modId];
          if (modConf) {
            const zf = zip.file(modConf.zipFile);
            if (zf) {
               try {
                  extractedData[modId] = JSON.parse(await zf.async('text'));
               } catch(e) {}
            }
          }
        }
        setPreviewData(extractedData);

        setSummary({
          workerName: manifest.workerName || session.assignedToName || 'Equipier Mobile',
          itemsCount: manifest.entryCounts ? Object.values(manifest.entryCounts).reduce((a: any, b: any) => a + b, 0) : 0,
          modules: manifest.modules || [],
          errors: 0,
          zip // save zip for final import
        });
        setStatus('ready');
      } catch (err: any) {
        console.error("Fetch session data error:", err);
        setErrorMsg(err.message);
        setStatus('error');
      }
    };
    
    fetchSessionData();
  }, [session]);

  const handleImportFinal = async () => {
    if (!summary || !summary.zip) return;
    setStatus('importing');
    
    try {
      const zip = summary.zip;
      const manifestFile = zip.file('manifest.json');
      if (!manifestFile) throw new Error("Manifeste manquant");
      const manifest = JSON.parse(await manifestFile.async('text'));

      let totalImported = 0;

      // 1. Process Photos
      const photosFile = zip.file('photos.json');
      if (photosFile) {
        try {
          const photos = JSON.parse(await photosFile.async('text'));
          for (const [id, b64] of Object.entries(photos)) {
            await savePhotoBase64(id, b64 as string);
          }
        } catch (e) {
          console.warn("Erreur import photos:", e);
        }
      }

      // 2. Process Modules
      for (const modId of manifest.modules) {
        const config = MODULE_MAP[modId];
        if (!config) continue;

        const modFile = zip.file(config.zipFile);
        if (!modFile) continue;

        const importedData = JSON.parse(await modFile.async('text'));
        if (!Array.isArray(importedData) || importedData.length === 0) continue;

        const existingData = getStoredData<any[]>(config.storageKey, []);
        
        // Merge strategy: Append with duplicate check (using ID if available)
        const merged = [...existingData];
        let modCount = 0;
        
        importedData.forEach(item => {
           // Basic duplicate check by ID or timestamp or stringified content
           const isDuplicate = existingData.some(existing => 
             (item.id && existing.id === item.id) || 
             (JSON.stringify(item) === JSON.stringify(existing))
           );
           
           if (!isDuplicate) {
             merged.push({
               ...item,
               _importedAt: new Date().toISOString(),
               _mobileSource: manifest.workerName
             });
             modCount++;
           }
        });

        if (modCount > 0) {
           setStoredData(config.storageKey, merged);
           totalImported += modCount;
        }
      }

      // Mark as imported on server
      await fetch(`/api/sessions/${session.id}/status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'imported' })
      }).catch(() => null);

      logAuditEvent({
        type: 'sync',
        module: 'session',
        action: 'Import collectif réussi',
        userName: currentUser?.name || 'Inconnu',
        userId: currentUser?.id,
        source: 'hub',
        details: { session: session.sessionName, items: totalImported, operator: manifest.workerName },
        status: 'success'
      });

      window.dispatchEvent(new Event('crousty_data_changed'));
      setStatus('success');
      setTimeout(() => {
        onImported();
        onClose();
      }, 1500);
    } catch (err: any) {
      console.error("Import error:", err);
      setErrorMsg(err.message || "Erreur lors de l'import");
      setStatus('error');
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-[6000] bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
       <Card className={`w-full p-6 space-y-6 text-center shadow-2xl flex flex-col ${status === 'ready' ? 'max-w-4xl max-h-[90dvh]' : 'max-w-lg'}`}>
          {status === 'reading' && (
            <div className="py-8 space-y-4">
               <div className="w-12 h-12 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
               <p className="font-bold text-gray-600">Chargement des données de collecte...</p>
            </div>
          )}
          
          {status === 'ready' && summary && (
            <div className="flex flex-col h-full animate-in fade-in zoom-in-95 duration-300 min-h-0">
               <div className="shrink-0 flex items-center gap-4 mb-4">
                   <div className="w-16 h-16 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center shrink-0">
                      <Download size={32} />
                   </div>
                   <div className="text-left flex-1">
                       <h3 className="text-2xl font-black text-gray-800 tracking-tight">Données mobiles reçues</h3>
                       <p className="text-gray-500 font-medium">Session envoyée par <b className="text-emerald-700">{summary.workerName}</b></p>
                   </div>
                   <div className="text-right">
                       <div className="text-3xl font-black text-crousty-purple">{summary.itemsCount}</div>
                       <div className="text-[10px] font-black text-gray-400 uppercase">Éléments analysés</div>
                   </div>
               </div>
               
               <div className="flex-1 overflow-y-auto space-y-6 pr-2 py-2 min-h-0 text-left">
                  {Object.entries(previewData).map(([modId, itemsUncast]) => {
                     const items = itemsUncast as any[];
                     const modApp = MODULES_LIST.find(m => m.id === modId);
                     if (!items || items.length === 0) return null;
                     return (
                        <div key={modId} className="border border-gray-100 rounded-2xl overflow-hidden bg-white shadow-sm">
                           <div className="bg-gray-50 border-b border-gray-100 px-4 py-3 flex items-center gap-3">
                              {modApp && <modApp.icon size={18} className={modApp.color} />}
                              <h4 className="font-black text-gray-800 tracking-tight">{modApp ? modApp.label : modId}</h4>
                              <span className="ml-auto bg-white px-2 py-1 rounded-lg text-xs font-bold text-gray-500 border border-gray-100">{items.length} éléments</span>
                           </div>
                           <div className="p-4 bg-white grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                              {items.slice(0, 6).map((item, i) => (
                                <div key={i} className="text-xs bg-gray-50 p-3 rounded-xl border border-gray-100">
                                   {Object.entries(item)
                                      .filter(([k]) => k !== 'id' && k !== 'author' && k !== 'importedAt')
                                      .slice(0, 4)
                                      .map(([k, v]) => (
                                         <div key={k} className="flex gap-2 truncate pb-1">
                                            <span className="font-bold text-gray-400 capitalize w-1/3 truncate text-right shrink-0">{String(k).replace(/_/g, ' ')}:</span>
                                            <span className="truncate flex-1 font-medium text-gray-700" title={String(v)}>{typeof v === 'object' ? JSON.stringify(v) : String(v)}</span>
                                         </div>
                                   ))}
                                </div>
                              ))}
                              {items.length > 6 && (
                                <div className="text-xs text-crousty-purple font-bold flex items-center justify-center p-3 bg-purple-50 rounded-xl border border-purple-100 shadow-inner">
                                  + {items.length - 6} autres éléments ...
                                </div>
                              )}
                           </div>
                        </div>
                     );
                  })}
               </div>

               <div className="shrink-0 mt-6 flex gap-3 pt-4 border-t border-gray-100">
                  <Button variant="secondary" onClick={onClose} className="flex-1 rounded-2xl h-14 text-sm font-black text-gray-500 bg-gray-100 hover:bg-gray-200">FERMER</Button>
                  <Button onClick={handleImportFinal} className="flex-1 rounded-2xl h-14 text-base font-black bg-emerald-600 hover:bg-emerald-700 shadow-lg shadow-emerald-200">
                      INTÉGRER LES DONNÉES
                  </Button>
               </div>
            </div>
          )}

          {status === 'importing' && (
            <div className="py-8 space-y-4">
               <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
               <p className="font-bold text-gray-600">Importation dans Crousty Hub...</p>
            </div>
          )}

          {status === 'success' && (
             <div className="py-8 space-y-4 animate-in zoom-in-95 duration-300">
                <div className="w-16 h-16 bg-emerald-50 text-emerald-500 rounded-full flex items-center justify-center mx-auto">
                   <CheckCircle2 size={40} />
                </div>
                <h4 className="text-2xl font-black text-gray-800">Import réussi</h4>
                <p className="text-gray-500">Les données sont maintenant accessibles dans les modules.</p>
             </div>
          )}

          {status === 'error' && (
             <div className="py-8 space-y-4 animate-in zoom-in-95 duration-300">
                <div className="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
                   <AlertTriangle size={32} />
                </div>
                <h3 className="text-xl font-black text-gray-800">Erreur de prévisualisation</h3>
                <p className="text-red-500 text-sm mb-6">{errorMsg || "Impossible de charger les données."}</p>
                <div className="flex gap-3">
                  <Button variant="secondary" onClick={onClose} className="flex-1 rounded-xl h-12">Fermer</Button>
                </div>
             </div>
          )}
       </Card>
    </div>,
    document.body
  );
};
