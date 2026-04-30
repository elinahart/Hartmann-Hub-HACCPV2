import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Card, Input, Label, Button } from '../components/ui/LightUI';
import { TempChecklistEntry } from '../types';
import { getStoredData, setStoredData } from '../lib/db';
import { CheckCircle2, Circle, Trash2, Check, X, Minus, Plus, Snowflake, Thermometer, Box, Droplets, IceCream2, Refrigerator, Sunrise, Sunset, Clock, Edit2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { format, isWithinInterval, startOfDay, endOfDay } from 'date-fns';
import { fr } from 'date-fns/locale';
import { getInitials } from '../lib/utils';
import { createSignature, updateSignature } from '../lib/permissions';
import { SaisieActions } from '../components/SaisieActions';
import { useConfig } from '../contexts/ConfigContext';
import { useManagerUI } from '../contexts/ManagerUIContext';
import { useAutoDraft } from '../hooks/useAutoDraft';
import { logAuditEvent } from '../lib/audit';
import { StatusBadge } from '../components/ui/StatusBadge';

const EditTempZoneModal = ({ zone, onClose, onSave, onDelete }: any) => {
  const [nom, setNom] = useState(zone?.nom || '');
  const [type, setType] = useState(zone?.type || 'positif');
  const [seuilMin, setSeuilMin] = useState(zone?.seuilMin?.toString() || '0');
  const [seuilMax, setSeuilMax] = useState(zone?.seuilMax?.toString() || '4');

  const handleSave = () => {
    onSave({
      id: zone?.id || Date.now().toString(),
      nom,
      type,
      seuilMin: parseFloat(seuilMin),
      seuilMax: parseFloat(seuilMax)
    });
  };

  return (
    <div className="flex flex-col h-full bg-white rounded-t-[2rem]">
      <div className="p-6 border-b border-gray-100 flex items-center justify-between sticky top-0 bg-white/80 backdrop-blur-md z-10">
        <h2 className="text-xl font-black text-gray-800">{zone ? `Modifier ${zone.nom}` : 'Nouvelle zone'}</h2>
        <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-500">
          <X size={24} />
        </button>
      </div>
      
      <div className="p-6 space-y-6 flex-1 overflow-y-auto">
        <div className="space-y-4">
          <div>
            <Label className="text-sm font-bold text-gray-700">Nom de l'équipement</Label>
            <Input value={nom} onChange={e => setNom(e.target.value)} placeholder="Ex: Frigo Boissons" className="mt-1" />
          </div>
          <div>
            <Label className="text-sm font-bold text-gray-700">Type de froid</Label>
            <select 
              value={type} 
              onChange={e => setType(e.target.value)}
              className="mt-1 w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-crousty-purple focus:border-crousty-purple transition-all"
            >
              <option value="positif">Positif (ex: Frigo)</option>
              <option value="negatif">Négatif (ex: Congélateur)</option>
            </select>
          </div>
          <div className="flex gap-4">
             <div className="flex-1">
               <Label className="text-sm font-bold text-gray-700">Seuil Min (°C)</Label>
               <Input type="number" step="0.1" value={seuilMin} onChange={e => setSeuilMin(e.target.value)} className="mt-1" />
             </div>
             <div className="flex-1">
               <Label className="text-sm font-bold text-gray-700">Seuil Max (°C)</Label>
               <Input type="number" step="0.1" value={seuilMax} onChange={e => setSeuilMax(e.target.value)} className="mt-1" />
             </div>
          </div>
        </div>
      </div>
      
      <div className="p-6 border-t border-gray-100 bg-gray-50 flex items-center justify-between sticky bottom-0 z-10">
        {zone && onDelete ? (
           <Button variant="outline" className="text-red-500 border-red-200 hover:bg-red-50 px-4" onClick={() => onDelete(zone.id)}>
             <Trash2 size={20} />
           </Button>
        ) : <div/>}
        <div className="flex gap-3">
          <Button variant="secondary" onClick={onClose} className="px-6 rounded-2xl">Annuler</Button>
          <Button onClick={handleSave} className="bg-crousty-purple hover:bg-crousty-purple/90 px-8 rounded-2xl">
            Enregistrer
          </Button>
        </div>
      </div>
    </div>
  );
};

import { useTemperatures } from '../providers/TemperaturesProvider';
export default function TemperaturesChecklist({ 
  isModal = false, 
  onComplete 
}: { 
  isModal?: boolean, 
  onComplete?: () => void 
}) {
  const { currentUser } = useAuth();
  const isMobileMode = !!localStorage.getItem('crousty_mobile_session');
  const { config, updateConfig } = useConfig();
  const { zones: configZones, setZones } = useTemperatures();
  const { openModal, closeModal } = useManagerUI();
  
  // Use config instead of hardcoded EQUIPMENTS
  const equipementObjects = configZones.length > 0 
    ? configZones 
    : [
        { id: '1', nom: 'Négatif', type: 'negatif', seuilMin: -25, seuilMax: -18 },
        { id: '2', nom: 'Positif', type: 'positif', seuilMin: 0, seuilMax: 4 }
      ];
  
  const EQUIPMENTS = equipementObjects.map(e => e.nom);
  const [entries, setEntries] = useState<TempChecklistEntry[]>([]);
  
  const [draft, setDraft, clearDraft, isDraftRestored] = useAutoDraft('temp_checklist', {
    currentEquipments: {} as Record<string, string>,
    correctiveActions: {} as Record<string, string>,
    productTemperatures: {} as Record<string, string>,
    globalObservation: ''
  });

  const currentEquipments = draft.currentEquipments;
  const setCurrentEquipments = (v: any) => setDraft(p => ({ ...p, currentEquipments: typeof v === 'function' ? v(p.currentEquipments) : v }));

  const correctiveActions = draft.correctiveActions;
  const setCorrectiveActions = (v: any) => setDraft(p => ({ ...p, correctiveActions: typeof v === 'function' ? v(p.correctiveActions) : v }));

  const productTemperatures = draft.productTemperatures;
  const setProductTemperatures = (v: any) => setDraft(p => ({ ...p, productTemperatures: typeof v === 'function' ? v(p.productTemperatures) : v }));

  const globalObservation = draft.globalObservation;
  const setGlobalObservation = (v: string) => setDraft(p => ({ ...p, globalObservation: v }));

  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [editId, setEditId] = useState<string | null>(null);
  const [editData, setEditData] = useState<TempChecklistEntry | null>(null);
  const [editMotif, setEditMotif] = useState('');
  const [error, setError] = useState('');
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    setEntries(getStoredData<TempChecklistEntry[]>('crousty_temp_checklist', []));
    const timer = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  const todayEntries = entries.filter(e => isWithinInterval(new Date(e.date), { start: startOfDay(currentTime), end: endOfDay(currentTime) }));
  const morningEntry = todayEntries.find(e => new Date(e.date).getHours() >= 7 && new Date(e.date).getHours() < 12);
  const eveningEntry = todayEntries.find(e => new Date(e.date).getHours() >= 17 && new Date(e.date).getHours() < 24);

  const currentHour = currentTime.getHours();
  const isMorningSlot = currentHour >= 7 && currentHour < 12;
  const isEveningSlot = currentHour >= 17 && currentHour < 24;
  
  let slotStatus = '';
  let slotAvailable = false;
  let nextSlot = '';

  if (isMorningSlot) {
    if (morningEntry) { 
      slotStatus = 'Relevé matin déjà effectué'; 
      slotAvailable = false; 
      nextSlot = '17h00';
    } else { 
      slotAvailable = true; 
      slotStatus = 'Relevé matin disponible'; 
    }
  } else if (currentHour >= 12 && currentHour < 17) {
    slotAvailable = false; 
    slotStatus = 'Hors créneau'; 
    nextSlot = '17h00';
  } else if (isEveningSlot) {
    if (eveningEntry) { 
      slotStatus = 'Relevé soir déjà effectué'; 
      slotAvailable = false; 
      nextSlot = '07h00 (Demain)';
    } else { 
      slotAvailable = true; 
      slotStatus = 'Relevé soir disponible'; 
    }
  } else {
    slotAvailable = false; 
    slotStatus = 'Hors créneau'; 
    nextSlot = '07h00';
  }
  
  if (currentUser?.role === 'manager' || isMobileMode) {
    slotAvailable = true;
    if (slotStatus.includes('déjà effectué')) {
      slotStatus = isMobileMode ? 'Mode Collecte' : 'Accès Manager';
    } else if (!slotAvailable || slotStatus === 'Hors créneau') {
      slotStatus = isMobileMode ? 'Mode Collecte' : 'Accès Manager';
    }
  }

  const isTempBad = (eqName: string, temp: string) => {
    if (!temp) return false;
    const val = parseFloat(temp);
    if (isNaN(val)) return false;
    
    const eqObj = equipementObjects.find(e => e.nom === eqName);
    if (eqObj) {
      return val < eqObj.seuilMin || val > eqObj.seuilMax;
    }
    
    // Fallback for legacy data
    const eqLower = (eqName || "").toLowerCase();
    if (eqLower.includes('négatif') || eqLower.includes('congé')) {
      return val > -18;
    } else if (eqLower.includes('boisson')) {
      return val > 8;
    } else {
      return val > 4;
    }
  };

  const adjustTemp = (eq: string, amount: number) => {
    if (!slotAvailable) return;
    const current = parseFloat(currentEquipments[eq] || '0');
    if (isNaN(current)) {
      setCurrentEquipments({...currentEquipments, [eq]: String(amount)});
    } else {
      setCurrentEquipments({...currentEquipments, [eq]: (current + amount).toFixed(1)});
    }
  };

  const setTempValue = (eq: string, val: string) => {
    if (!slotAvailable) return;
    setCurrentEquipments({...currentEquipments, [eq]: val});
  };

  const handleSave = () => {
    const mobileWorker = localStorage.getItem('crousty_mobile_worker');
    const responsableName = currentUser?.name || (isMobileMode ? (mobileWorker || 'Appareil Mobile') : null);
    if (!responsableName) { setError("Erreur: Aucun utilisateur connecté."); return; }
    if (!slotAvailable) { setError("Créneau invalide pour effectuer un relevé."); return; }

    // Validation (excepté pour le manager ou le mode mobile si on veut forcer)
    if (currentUser?.role !== 'manager') {
      for (const eq of EQUIPMENTS) {
        if (isTempBad(eq, currentEquipments[eq])) {
          if (!correctiveActions[eq] || correctiveActions[eq].trim() === '') {
            setError(`Action corrective requise pour : ${eq}`);
            return;
          }
        }
      }
    }

    const newEntry: TempChecklistEntry = {
      id: Date.now().toString(),
      date: new Date().toISOString(),
      equipments: currentEquipments,
      correctiveActions,
      productTemperatures,
      globalObservation,
      responsable: responsableName,
      signature: currentUser ? createSignature(currentUser) : {
        auteurId: 'mobile',
        auteurInitiales: getInitials(responsableName),
        auteurPrenom: responsableName,
        dateCreation: new Date().toISOString()
      }
    };
    const updated = [newEntry, ...entries];
    setEntries(updated);
    setStoredData('crousty_temp_checklist', updated);
    
    logAuditEvent({
      type: 'create',
      module: 'temperature',
      action: 'Relevé de températures',
      userName: responsableName,
      userId: currentUser?.id,
      source: currentUser ? 'hub' : 'mobile',
      details: { equipmentCount: Object.keys(currentEquipments).length },
      status: 'success'
    });

    clearDraft();
    setError('');
    
    if (onComplete) onComplete();
  };

  const confirmDelete = (id: string) => {
    // Soft delete logic
    const entryToDel = entries.find(e => e.id === id);
    if (!entryToDel) return;
    
    const updated = entries.map(e => e.id === id ? { 
      ...e, 
      supprime: true, 
      supprimePar: currentUser?.name || 'Inconnu', 
      dateSuppression: new Date().toISOString() 
    } : e);
    setEntries(updated);
    setStoredData('crousty_temp_checklist', updated);
    setDeleteId(null);
    window.dispatchEvent(new Event('crousty_data_changed'));
    
    logAuditEvent({
      type: 'delete',
      module: 'temperature',
      action: 'Suppression relevé',
      userName: currentUser?.name || 'Inconnu',
      userId: currentUser?.id,
      source: 'hub',
      details: { recordId: id, owner: entryToDel.responsable },
      status: 'warning'
    });
  };

  const startEdit = (entry: TempChecklistEntry) => {
    setEditId(entry.id);
    setEditData({ ...entry });
    setEditMotif('');
  };

  const handleEditSave = () => {
    if (!editMotif.trim()) { alert("Le motif de modification est obligatoire."); return; }
    if (!editData || !currentUser) return;
    
    if (currentUser.role !== 'manager') {
      for (const eq of EQUIPMENTS) {
        if (isTempBad(eq, editData.equipments[eq])) {
          if (!editData.correctiveActions?.[eq] || editData.correctiveActions[eq].trim() === '') {
            alert(`Action corrective requise pour : ${eq}`);
            return;
          }
        }
      }
    }

    const updated = entries.map(e => e.id === editId ? {
      ...editData,
      signature: updateSignature(editData.signature, currentUser, editMotif)
    } : e);
    
    setEntries(updated);
    setStoredData('crousty_temp_checklist', updated);
    setEditId(null);
  };

  const getEquipmentIcon = (eq: string) => {
    const lower = (eq || "").toLowerCase();
    if (lower.includes('négatif') || lower.includes('congèl')) return <Snowflake className="text-cyan-500" size={24} />;
    if (lower.includes('boisson')) return <Droplets className="text-blue-500" size={24} />;
    if (lower.includes('sauce')) return <Box className="text-orange-500" size={24} />;
    if (lower.includes('dessert')) return <IceCream2 className="text-pink-500" size={24} />;
    if (lower.includes('frigo')) return <Refrigerator className="text-emerald-500" size={24} />;
    return <Thermometer className="text-purple-500" size={24} />;
  };

  return (
    <div className={isModal ? "space-y-6" : "space-y-6 pb-20 pt-8 max-w-5xl mx-auto px-4"}>
      {!isModal && (
      <div className="flex flex-col items-center justify-center text-center space-y-2 mb-8">
        <h2 className="flex flex-wrap items-center justify-center gap-3 text-3xl font-black text-gray-900 uppercase tracking-[0.2em]">
          <span>🌡️ Relevés Températures</span>
          {isDraftRestored && <StatusBadge status="draft" label="Brouillon restauré" />}
        </h2>
        <p className="text-gray-500 font-bold uppercase text-xs tracking-widest">Poste de contrôle HACCP</p>
      </div>
      )}

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}
        className={!slotAvailable ? 'opacity-50 pointer-events-none' : ''}
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8 pointer-events-auto opacity-100">
          <div className={`p-4 rounded-3xl border-2 shadow-sm ${morningEntry ? 'bg-green-50 border-green-200' : currentHour >= 12 ? 'bg-red-50 border-red-200' : 'bg-white border-blue-100'}`}>
            <div className="flex justify-between items-start mb-2">
              <h3 className="flex items-center gap-2 font-black text-lg text-gray-800"><Sunrise className="text-orange-500" /> RELEVÉ MATIN — 8h00</h3>
            </div>
            {morningEntry ? (
              <div className="flex items-center gap-2 text-green-700 font-bold text-sm">
                <CheckCircle2 size={16} /> Effectué à {format(new Date(morningEntry.date), 'HH:mm')} par {getInitials(morningEntry.responsable)}
              </div>
            ) : currentHour >= 12 ? (
              <div className="flex items-center gap-2 text-red-600 font-bold text-sm">
                <X size={16} /> ⚠️ Relevé non effectué
              </div>
            ) : (
              <div className="flex items-center gap-2 text-gray-500 font-bold text-sm">
                <Clock size={16} /> ⏳ {isMorningSlot ? 'En cours (jusqu\'à 12h)' : 'Dès 7h00'}
              </div>
            )}
          </div>

          <div className={`p-4 rounded-3xl border-2 shadow-sm ${eveningEntry ? 'bg-green-50 border-green-200' : currentHour >= 23 ? 'bg-red-50 border-red-200' : 'bg-white border-indigo-100'}`}>
            <div className="flex justify-between items-start mb-2">
              <h3 className="flex items-center gap-2 font-black text-lg text-gray-800"><Sunset className="text-indigo-500" /> RELEVÉ SOIR — 17h00</h3>
            </div>
            {eveningEntry ? (
              <div className="flex items-center gap-2 text-green-700 font-bold text-sm">
                <CheckCircle2 size={16} /> Effectué à {format(new Date(eveningEntry.date), 'HH:mm')} par {getInitials(eveningEntry.responsable)}
              </div>
            ) : currentHour >= 23 ? (
              <div className="flex items-center gap-2 text-red-600 font-bold text-sm">
                <X size={16} /> ⚠️ Relevé non effectué
              </div>
            ) : (
              <div className="flex items-center gap-2 text-gray-500 font-bold text-sm">
                <Clock size={16} /> ⏳ {isEveningSlot ? 'En cours (jusqu\'à 23h)' : 'Dès 17h00'}
              </div>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {equipementObjects.map((eqObj, index) => {
            const eq = eqObj.nom;
            const bad = isTempBad(eq, currentEquipments[eq]);
            const hasValue = currentEquipments[eq] !== undefined && currentEquipments[eq] !== '';
            const isFreezer = eqObj.type === 'negatif';
            const expectedText = `De ${eqObj.seuilMin}°C à ${eqObj.seuilMax}°C`;
            
            return (
              <div 
                key={eqObj.id || eq} 
                className={`animate-card-in relative flex flex-col p-4 rounded-[2rem] border-2 transition-all duration-300 shadow-sm ${
                  bad 
                    ? 'bg-red-50 border-red-200' 
                    : hasValue 
                      ? 'bg-green-50 border-green-200' 
                      : 'bg-white border-gray-100'
                } group`}
                style={{
                  animationDelay: `${Math.min(index * 40, 320)}ms`
                }}
              >
                {/* MANAGER EDIT BUTTON */}
                {currentUser?.role === 'manager' && (
                   <button 
                     onClick={(e) => {
                       e.stopPropagation();
                       openModal(
                         <EditTempZoneModal 
                           zone={eqObj} 
                           onClose={closeModal} 
                           onSave={(updatedZone: any) => {
                              const newZones = configZones.map((z: any) => z.id === updatedZone.id ? updatedZone : z);
                               setZones(newZones);
                              updateConfig({ temperatures: newZones });
                              closeModal();
                           }} 
                           onDelete={(id: string) => {
                              if(window.confirm('Supprimer cette zone ?')) {
                                const newZones = configZones.filter((z: any) => z.id !== id);
                                 setZones(newZones);
                                updateConfig({ temperatures: newZones });
                                closeModal();
                              }
                           }}
                         />
                       );
                     }}
                     className="absolute -top-3 -right-3 w-12 h-12 bg-white border border-gray-200 rounded-full shadow-lg flex items-center justify-center text-[var(--color-primary)] z-50 active:scale-[0.92] transition-transform"
                   >
                     <Edit2 size={20} strokeWidth={2.5} />
                   </button>
                )}

                <div className="flex items-center justify-between mb-4">
                   <div className={`p-3 rounded-2xl ${bad ? 'bg-red-100 text-red-600' : hasValue ? 'bg-green-100 text-green-600' : 'bg-gray-50 text-gray-400'}`}>
                      {getEquipmentIcon(eq)}
                   </div>
                   {hasValue && (
                     <motion.div 
                        initial={{ scale: 0 }} 
                        animate={{ scale: 1 }} 
                        className={`w-6 h-6 rounded-full flex items-center justify-center shadow-sm ${bad ? 'bg-red-500 text-white' : 'bg-green-500 text-white'}`}
                     >
                       {bad ? <X size={14} strokeWidth={4} /> : <Check size={14} strokeWidth={4} />}
                     </motion.div>
                   )}
                </div>

                <div className="flex flex-col mb-6">
                  <span className={`text-base font-black tracking-tight uppercase ${bad ? 'text-red-900' : hasValue ? 'text-green-900' : 'text-gray-800'}`}>
                    {eq}
                  </span>
                  <span className={`text-[10px] font-bold uppercase tracking-widest mt-0.5 ${bad && isFreezer ? 'text-red-600' : 'text-gray-400'}`}>
                    {expectedText}
                  </span>
                </div>

                <div className="mt-auto space-y-4">
                  <div className="flex items-center justify-between bg-white backdrop-blur-sm rounded-2xl p-1 shadow-inner border border-black/5">
                    <button 
                      onClick={() => adjustTemp(eq, -1)} 
                      className={`w-10 h-10 flex items-center justify-center rounded-xl font-bold transition-all active:scale-90 ${
                        bad ? 'bg-red-500 text-white' : 'bg-gray-800 text-white'
                      } shadow-lg`}
                    >
                      <Minus size={20} strokeWidth={3} />
                    </button>
                    
                    <input 
                      type="number" 
                      inputMode="decimal" 
                      step="0.1" 
                      placeholder="°C" 
                      className={`w-16 bg-transparent text-center text-xl font-black focus:outline-none ${bad ? 'text-red-700' : 'text-gray-900'}`}
                      value={currentEquipments[eq] || ''}
                      onChange={e => setTempValue(eq, e.target.value)}
                    />

                    <button 
                      onClick={() => adjustTemp(eq, 1)} 
                      className={`w-10 h-10 flex items-center justify-center rounded-xl font-bold transition-all active:scale-90 ${
                        bad ? 'bg-red-500 text-white' : 'bg-crousty-purple text-white'
                      } shadow-lg`}
                    >
                      <Plus size={20} strokeWidth={3} />
                    </button>
                  </div>

                  <AnimatePresence>
                    {bad && (
                      <motion.div 
                        initial={{ opacity: 0, height: 0 }} 
                        animate={{ opacity: 1, height: 'auto' }} 
                        exit={{ opacity: 0, height: 0 }}
                        className="overflow-hidden"
                      >
                        <div className="p-3 bg-red-100 rounded-xl space-y-3">
                          {isFreezer ? (
                            <p className="text-[10px] font-black text-red-700 uppercase leading-snug">⚠️ NON CONFORME — Température trop élevée</p>
                          ) : (
                            <p className="text-[10px] font-black text-red-700 uppercase leading-snug">⚠️ NON CONFORME — Action correctrice requise</p>
                          )}
                          <div className="flex flex-col gap-2">
                             <input 
                                type="text"
                                placeholder="Saisir action corrective..." 
                                className="w-full bg-white border border-red-200 rounded-lg p-2 text-sm font-bold text-gray-800 focus:outline-none"
                                value={correctiveActions[eq] || ''}
                                onChange={e => setCorrectiveActions({...correctiveActions, [eq]: e.target.value})}
                              />
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>
            );
          })}
          
          {/* ADD ZONE BUTTON */}
          {currentUser?.role === 'manager' && (
            <button 
              onClick={() => {
                openModal(
                  <EditTempZoneModal 
                    onClose={closeModal}
                    onSave={(newZone: any) => {
                      const newZones = [...configZones, newZone];
                      setZones(newZones);
                      updateConfig({ temperatures: newZones });
                      closeModal();
                    }}
                  />
                )
              }}
              className="relative flex flex-col p-4 rounded-[2rem] border-2 border-dashed border-gray-200 transition-all duration-300 items-center justify-center text-gray-400 hover:text-crousty-purple hover:border-crousty-purple hover:bg-crousty-purple/5 group min-h-[200px]"
            >
              <div className="w-16 h-16 rounded-full bg-gray-50 flex items-center justify-center group-hover:bg-white group-hover:scale-110 transition-transform shadow-sm mb-4">
                <Plus size={32} />
              </div>
              <span className="font-bold text-sm tracking-widest uppercase">Ajouter zone</span>
            </button>
          )}
        </div>

        <div className="mt-8 flex flex-col items-center gap-6">
          <div className="w-full max-w-md pointer-events-auto">
            <textarea 
              className="w-full p-4 bg-white border-2 border-gray-100 rounded-[2rem] shadow-sm focus:ring-4 focus:ring-crousty-purple/10 focus:border-crousty-purple transition-all outline-none text-sm font-medium"
              rows={2}
              placeholder="Observation globale (optionnel)..."
              value={globalObservation}
              onChange={(e) => setGlobalObservation(e.target.value)}
            />
          </div>
          
          {error && <div className="text-red-500 text-sm font-bold animate-pulse text-center">{error}</div>}
          
          <button 
            disabled={!slotAvailable}
            onClick={handleSave}
            className={`group relative px-12 py-4 text-white rounded-full font-black uppercase tracking-[0.2em] shadow-xl transition-all flex items-center gap-3 overflow-hidden pointer-events-auto ${slotAvailable ? 'bg-gray-900 hover:shadow-2xl hover:scale-105 active:scale-95' : 'bg-gray-400 cursor-not-allowed'}`}
          >
            {slotAvailable && <div className="absolute inset-0 bg-crousty-purple translate-y-full group-hover:translate-y-0 transition-transform duration-300"></div>}
            <p className="relative z-10">{slotAvailable ? "Valider le Relevé" : `Prochain relevé disponible à ${nextSlot}`}</p>
            {slotAvailable && <CheckCircle2 className="relative z-10" />}
          </button>
        </div>
      </motion.div>

      {!isModal && (
      <div className="pt-12 space-y-6">
        <div className="flex items-center gap-4">
           <hr className="flex-1 border-gray-100" />
           <h3 className="text-sm font-bold text-gray-300 uppercase tracking-[0.3em]">Historique Récent</h3>
           <hr className="flex-1 border-gray-100" />
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <AnimatePresence>
          {entries.filter(e => !e.supprime).map(e => (
            <motion.div 
              key={e.id} 
              initial={{ opacity: 0, scale: 0.95 }} 
              animate={{ opacity: 1, scale: 1 }} 
              exit={{ opacity: 0, scale: 0.95 }}
              layout
            >
              <Card className="relative overflow-hidden group border-none shadow-sm hover:shadow-md transition-shadow bg-white rounded-[2rem] p-6">
                <div className="absolute top-0 right-0 w-32 h-32 bg-gray-50 rounded-full translate-x-12 -translate-y-12 opacity-50 group-hover:bg-crousty-purple/5 transition-colors"></div>
                
                <div className="relative z-10">
                  {editId === e.id && editData ? (
                    <div className="space-y-4">
                      <div className="bg-orange-50 p-3 rounded-xl border border-orange-200">
                        <Label className="text-orange-800 font-bold">⚠️ Motif de modification (obligatoire)</Label>
                        <Input value={editMotif} onChange={ev => setEditMotif(ev.target.value)} placeholder="Ex: Erreur de saisie initiale..." className="mt-1" />
                      </div>
                      <div className="grid grid-cols-2 gap-2 mt-4">
                        {EQUIPMENTS.map(eq => (
                          <div key={eq}>
                             <Label className="text-xs text-gray-500 uppercase">{eq}</Label>
                             <Input 
                               type="number" step="0.1"
                               value={editData.equipments[eq] || ''}
                               onChange={ev => setEditData({...editData, equipments: {...editData.equipments, [eq]: ev.target.value}})}
                             />
                          </div>
                        ))}
                      </div>
                      <div className="flex gap-2 justify-end mt-4">
                         <Button variant="secondary" onClick={() => setEditId(null)}>Annuler</Button>
                         <Button onClick={handleEditSave}>💾 Enregistrer</Button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="flex justify-between items-start mb-4">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            {new Date(e.date).getHours() < 15 ? (
                              <div className="bg-orange-100 text-orange-600 text-[10px] font-black uppercase px-2 py-1 rounded-full flex items-center gap-1"><Sunrise size={12}/> Matin</div>
                            ) : (
                              <div className="bg-indigo-100 text-indigo-600 text-[10px] font-black uppercase px-2 py-1 rounded-full flex items-center gap-1"><Sunset size={12}/> Soir</div>
                            )}
                          </div>
                          <div className="text-lg font-black text-gray-900 tracking-tighter">{format(new Date(e.date), 'HH:mm')}</div>
                          <div className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">{format(new Date(e.date), 'dd MMMM yyyy', { locale: fr })}</div>
                        </div>
                        {deleteId === e.id ? (
                          <div className="flex items-center gap-1 bg-red-50 p-1 rounded-full animate-in slide-in-from-right">
                             <span className="text-xs text-red-600 font-bold px-1 whitespace-nowrap">Sûr ?</span>
                            <button onClick={() => confirmDelete(e.id)} className="w-8 h-8 flex items-center justify-center bg-red-500 text-white rounded-full"><Check size={14} /></button>
                            <button onClick={() => setDeleteId(null)} className="w-8 h-8 flex items-center justify-center bg-white text-gray-400 rounded-full"><X size={14} /></button>
                          </div>
                        ) : (
                          <SaisieActions 
                             saisie={e}
                             onEdit={() => startEdit(e)}
                             onDelete={() => setDeleteId(e.id)}
                          />
                        )}
                      </div>

                      <div className="grid grid-cols-2 gap-2 mb-4">
                        {Object.entries(e.equipments).slice(0, 4).map(([eq, temp]) => {
                          const bad = isTempBad(eq, temp as string);
                          return (
                            <div key={eq} className="flex flex-col">
                               <span className="text-[10px] font-bold text-gray-400 uppercase">{eq}</span>
                               <span className={`text-sm font-black ${bad ? 'text-red-600' : 'text-gray-800'}`}>{temp}°C</span>
                            </div>
                          );
                        })}
                      </div>

                      <div className="flex items-center justify-between pt-4 border-t border-gray-50 mt-auto">
                        <div className="flex items-center gap-2">
                           <div className="w-6 h-6 bg-gray-100 rounded-full flex items-center justify-center text-[10px] font-black text-gray-500">
                              {getInitials(e.responsable)}
                           </div>
                           <span className="text-[10px] font-bold text-gray-500 uppercase">{e.responsable}</span>
                        </div>
                        {e.signature?.dateModification && (
                          <div className="text-[10px] font-bold text-orange-500 text-right">
                            Modifié par {e.signature.modifiePar} (Vu)
                          </div>
                        )}
                        {Object.keys(e.equipments).length > 4 && !e.signature?.dateModification && (
                          <span className="text-[10px] font-bold text-crousty-purple">+ {Object.keys(e.equipments).length - 4} autres</span>
                        )}
                      </div>
                    </>
                  )}
                </div>
              </Card>
            </motion.div>
          ))}
          </AnimatePresence>
        </div>
      </div>
      )}
    </div>
  );
}
