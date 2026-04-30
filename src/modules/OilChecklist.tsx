import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useAuth } from '../contexts/AuthContext';
import { Card, Input, Label, Button } from '../components/ui/LightUI';
import { OilChecklistEntry } from '../types';
import { getStoredData, setStoredData, savePhotoBase64, getPhotoBase64 } from '../lib/db';
import { Trash2, Check, X, Camera, CheckCircle2, AlertTriangle, Loader2, RotateCcw, ZoomIn, Eye, Clock, Plus, Edit2 } from 'lucide-react';
import { createSignature } from '../lib/permissions';
import { styleBoutonPrimaire } from '../lib/utils';
import { SaisieActions } from '../components/SaisieActions';
import { motion, AnimatePresence } from 'motion/react';
import { optimiserPhotoCapturee, blobToDataURL } from '../lib/testoOcr';
import imageCompression from 'browser-image-compression';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine } from 'recharts';
import { useConfig } from '../contexts/ConfigContext';
import { useManagerUI } from '../contexts/ManagerUIContext';
import { compressPhotoTLC } from '../lib/imageUtils';

/**
 * Module Photo & Saisie Manuelle
 */
function PhotoTesto({ cuveName, initialFile, onResult, onCancel }: { cuveName: string; initialFile: File | null; onResult: (res: any) => boolean | void; onCancel: () => void }) {
  const [photoDataUrl, setPhotoDataUrl] = useState<string | null>(null);
  const [status, setStatus] = useState<'idle' | 'compressing' | 'saving' | 'success' | 'error'>('idle');
  const [errorDetails, setErrorDetails] = useState('');

  // États de saisie
  const [tpm, setTpm] = useState({ entier: '', decimal: '' });
  const [temp, setTemp] = useState({ entier: '', decimal: '' });

  // Calcul du statut en temps réel
  const tpmValue = tpm.entier ? parseFloat(`${tpm.entier}.${tpm.decimal || '0'}`) : null;
  
  const getTpmStatus = () => {
    if (tpmValue === null) return null;
    if (tpmValue < 20) return { color: "text-green-600", label: "✅ BON — huile conforme", bg: "bg-[#F0FFF4]" };
    if (tpmValue <= 23) return { color: "text-amber-600", label: "⚠️ ATTENTION — surveiller", bg: "bg-[#FFFBEB]" };
    return { color: "text-red-600", label: "🔴 CHANGER — seuil dépassé", bg: "bg-[#FFF5F5]" };
  };

  const tpmStatus = getTpmStatus();

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  useEffect(() => {
    if (initialFile) processFile(initialFile);
  }, [initialFile]);

  const processFile = async (file: File) => {
    setStatus('compressing');
    setErrorDetails('');
    try {
      const dataUrl = await compressPhotoTLC(file);
      setPhotoDataUrl(dataUrl);
      setStatus('idle');
    } catch (err) {
      console.error("Compression erreur:", err);
      const reader = new FileReader();
      reader.onload = (event) => {
        setPhotoDataUrl(event.target?.result as string);
        setStatus('idle'); // Recovered via fallback
      };
      reader.onerror = () => {
        setStatus('error');
        setErrorDetails("Erreur de capture. Image illisible sur ce téléphone.");
      };
      reader.readAsDataURL(file);
    }
  };

  const validerSaisie = async () => {
    if (!tpmValue && tpmValue !== 0) return;

    if (tpmValue < 0 || tpmValue > 40) {
      setErrorDetails("Valeur % TPM hors plage (0.0 - 40.0)");
      setStatus('error');
      return;
    }

    const tempVal = temp.entier ? parseFloat(`${temp.entier}.${temp.decimal || '0'}`) : null;
    if (tempVal !== null && (tempVal < 50 || tempVal > 250)) {
      if (!window.confirm("La température semble anormale (50-250°C). Confirmer ?")) return;
    }

    setStatus('saving');
    setErrorDetails('');
    try {
      const now = new Date();
      const d = now.toLocaleDateString('fr-FR').replace(/\//g, '-');
      const h = now.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }).replace(':', 'h');
      const photoId = `HUILE_${cuveName.replace(' ', '')}_${d}_${h}_${Math.random().toString(36).substring(2, 6)}`;
      
      if (photoDataUrl) {
        await savePhotoBase64(photoId, photoDataUrl);
      }
      
      const success = onResult({ tpm: tpmValue, temperature: tempVal, photoId: photoDataUrl ? photoId : undefined });
      
      if (success === false) {
        // User cancelled replacement
        setStatus('idle');
        return;
      }
      
      setStatus('success');
      setTimeout(() => {
        onCancel();
      }, 1000); // 1s to view success state before it closes
      
    } catch (err) {
      console.error(err);
      setStatus('error');
      setErrorDetails("Erreur de sauvegarde de la photo. Réessayez.");
    }
  };

  if (!photoDataUrl && status !== 'compressing' && status !== 'error') return null;

  return createPortal(
    <div className="fixed top-0 left-0 w-full h-[100dvh] z-[200] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-hidden">
      <div className="bg-gray-50 w-full max-h-[90dvh] md:max-h-[85dvh] max-w-md rounded-3xl flex flex-col overflow-hidden relative shadow-2xl">
        {/* Header */}
        <div className="bg-white px-4 py-3 border-b flex items-center justify-between shrink-0">
          <button onClick={onCancel} className="text-gray-400 p-2 hover:bg-gray-100 rounded-full transition-colors"><X size={20} /></button>
          <span className="font-black text-gray-800 text-sm tracking-widest uppercase">Saisie {cuveName}</span>
          <div className="w-10" />
        </div>

        <div className="p-4 space-y-4 max-w-lg mx-auto w-full overflow-y-auto pb-6">
        {/* Photo Display - Minimalist */}
        <div className="relative bg-black rounded-2xl overflow-hidden shadow-lg h-[280px]">
          {status === 'compressing' ? (
             <div className="absolute inset-0 flex flex-col items-center justify-center bg-black text-white">
                <Loader2 className="animate-spin mb-2" size={32} />
                <p className="text-sm font-bold">Optimisation...</p>
             </div>
          ) : (
            <img src={photoDataUrl || ''} className="w-full h-full object-contain" alt="Testo Capture" />
          )}
          
          {/* Small Badges on edges */}
          {status !== 'compressing' && (
            <>
              <div className="absolute top-3 left-3 text-white text-[11px] font-black px-2 py-1 rounded shadow-sm" style={{ background: "var(--color-primary)" }}>
                ① % TPM
              </div>
              <div className="absolute bottom-3 left-3 bg-gray-600/90 text-white text-[11px] font-black px-2 py-1 rounded shadow-sm">
                ② °C
              </div>
            </>
          )}
        </div>

        {/* TPM Card - Dynamic Color */}
        <div className={`p-5 rounded-3xl border border-gray-100 shadow-sm transition-all duration-300 ${tpmStatus?.bg || "bg-white"} shrink-0`}>
          <label className="text-[11px] font-black text-gray-400 uppercase mb-4 block">
            ① % TPM — grands chiffres en haut de l'écran
          </label>
          
          <div className="flex items-center justify-center gap-2 mb-3">
            <input
              type="number" inputMode="numeric"
              value={tpm.entier}
              onChange={e => setTpm(prev => ({ ...prev, entier: e.target.value }))}
              placeholder="00"
              style={{ width: '80px', fontSize: '36px' }}
              className="h-16 font-black text-center bg-white rounded-2xl border-2 border-gray-100 focus:border-[var(--color-primary)] focus:outline-none shadow-sm"
              disabled={status === 'saving' || status === 'success'}
            />
            <span className="text-4xl font-black text-gray-300">.</span>
            <input
              type="number" inputMode="numeric"
              value={tpm.decimal}
              onChange={e => setTpm(prev => ({ ...prev, decimal: e.target.value }))}
              placeholder="0"
              style={{ width: '60px', fontSize: '36px' }}
              className="h-16 font-black text-center bg-white rounded-2xl border-2 border-gray-100 focus:border-[var(--color-primary)] focus:outline-none shadow-sm"
              disabled={status === 'saving' || status === 'success'}
            />
            <span className="text-lg font-black text-gray-400 ml-1">% TPM</span>
          </div>

          <div className={`text-center font-black text-[13px] uppercase tracking-tight h-5 transition-all ${tpmStatus?.color || 'opacity-0'}`}>
            {tpmStatus?.label}
          </div>
        </div>

        {/* Temp Card */}
        <div className="p-5 rounded-3xl border border-gray-100 bg-white shadow-sm shrink-0">
          <label className="text-[11px] font-black text-gray-400 uppercase mb-4 block">
            ② Température — petits chiffres en bas (optionnel)
          </label>
          
          <div className="flex items-center justify-center gap-2">
            <input
              type="number" inputMode="numeric"
              value={temp.entier}
              onChange={e => setTemp(prev => ({ ...prev, entier: e.target.value }))}
              placeholder="000"
              style={{ width: '80px', fontSize: '36px' }}
              className="h-16 font-black text-center bg-white rounded-2xl border-2 border-gray-100 focus:border-[var(--color-primary)] focus:outline-none shadow-sm"
              disabled={status === 'saving' || status === 'success'}
            />
            <span className="text-4xl font-black text-gray-300">.</span>
            <input
              type="number" inputMode="numeric"
              value={temp.decimal}
              onChange={e => setTemp(prev => ({ ...prev, decimal: e.target.value }))}
              placeholder="0"
              style={{ width: '60px', fontSize: '36px' }}
              className="h-16 font-black text-center bg-white rounded-2xl border-2 border-gray-100 focus:border-[var(--color-primary)] focus:outline-none shadow-sm"
              disabled={status === 'saving' || status === 'success'}
            />
            <span className="text-lg font-black text-gray-400 ml-1">°C</span>
          </div>
        </div>

        {status === 'error' && (
          <div className="bg-red-50 text-red-700 p-4 rounded-xl border border-red-200 text-sm font-bold text-center flex flex-col gap-2 shrink-0">
            <div className="flex items-center justify-center gap-2">
              <AlertTriangle size={18} /> Erreur
            </div>
            <p>{errorDetails}</p>
          </div>
        )}

        {status === 'success' && (
           <div className="bg-green-50 text-green-700 p-4 rounded-xl border border-green-200 text-sm font-bold text-center flex items-center justify-center gap-2 shrink-0">
             <CheckCircle2 size={18} /> Enregistrement réussi !
           </div>
        )}

        <div className="grid grid-cols-2 gap-4 mt-auto pt-4 shrink-0">
          <label className={`h-14 flex items-center justify-center p-4 text-gray-500 font-bold border-2 border-dashed border-gray-200 rounded-2xl transition-all ${status === 'saving' || status === 'success' ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer active:scale-95'}`}>
            <input type="file" accept="image/*" capture="environment" className="hidden" disabled={status === 'saving' || status === 'success'} onChange={e => {
              const file = e.target.files?.[0];
              if (file) processFile(file);
              e.target.value = '';
            }} />
            <RotateCcw size={18} className="mr-2" /> REPRENDRE
          </label>
          
          <button
            onClick={validerSaisie}
            disabled={!tpm.entier || status === 'saving' || status === 'success' || status === 'compressing'}
            className={`flex items-center justify-center gap-2 h-14 rounded-2xl font-black text-white shadow-lg transition-all ${(!tpm.entier || status === 'saving' || status === 'success' || status === 'compressing') ? 'bg-gray-300 shadow-none' : 'bg-indigo-600 hover:bg-indigo-700 active:scale-95'}`}
            style={ (!tpm.entier || status === 'saving' || status === 'success' || status === 'compressing') ? {} : { backgroundColor: 'var(--color-primary)' }}
          >
            {status === 'saving' ? (
              <><Loader2 className="animate-spin" size={20} /> ENCOURS</>
            ) : status === 'success' ? (
              <><Check size={20} /> VALIDÉ</>
            ) : status === 'error' ? (
               <>RÉESSAYER</>
            ) : (
              <><Check size={20} /> VALIDER</>
            )}
          </button>
        </div>
      </div>
    </div>
    </div>,
    document.body
  );
}


/**
 * Modal d'affichage de la photo en grand
 */
function PhotoViewer({ photoId, onClose }: { photoId: string; onClose: () => void }) {
  const [url, setUrl] = useState<string | null | undefined>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  useEffect(() => {
    setLoading(true);
    getPhotoBase64(photoId)
      .then(res => {
        setUrl(res);
        setLoading(false);
      })
      .catch(() => {
        setUrl(undefined);
        setLoading(false);
      });
  }, [photoId]);

  return createPortal(
    <div className="fixed inset-0 z-[99999] bg-black/95 flex items-center justify-center p-4 overflow-hidden" onClick={onClose}>
      <button className="absolute top-8 right-8 text-white p-2 hover:bg-white/10 rounded-full transition-colors z-[100]" onClick={onClose}>
        <X size={32} />
      </button>
      <div className="relative w-full h-full max-h-[85vh] flex items-center justify-center pointer-events-none">
        {loading ? (
          <Loader2 className="text-white animate-spin" size={48} />
        ) : url ? (
          <img 
            src={url} 
            className="w-auto h-auto max-w-full max-h-full rounded-xl shadow-2xl object-contain pointer-events-auto" 
            alt="Testo capture grand" 
            onClick={e => e.stopPropagation()} 
          />
        ) : (
          <div className="bg-white/10 p-8 rounded-3xl flex flex-col items-center justify-center text-center text-white pointer-events-auto" onClick={e => e.stopPropagation()}>
            <AlertTriangle size={48} className="text-red-400 mb-4" />
            <h3 className="text-xl font-bold mb-2">Image introuvable</h3>
            <p className="text-gray-300 text-sm">La photo pour ce relevé a été supprimée ou n'a pas pu être chargée.</p>
          </div>
        )}
      </div>
    </div>,
    document.body
  );
}

import { useHuiles } from '../providers/HuilesProvider';

export default function OilChecklist() {
  const { currentUser } = useAuth();
  const { config, updateConfig } = useConfig();
  const { cuves: configCuves, setCuves } = useHuiles();
  const { openModal, closeModal } = useManagerUI();

  // Use fallback if no config setup yet
  const cuves = configCuves.length > 0 ? configCuves : [
    { id: '1', nom: 'Cuve 1' },
    { id: '2', nom: 'Cuve 2' },
    { id: '3', nom: 'Cuve 3' },
    { id: '4', nom: 'Cuve 4' },
  ];

  const EditCuveModal = ({ cuve, onClose, onSave, onDelete }: any) => {
    const [nom, setNom] = useState(cuve?.nom || '');

    const handleSave = () => {
      onSave({ id: cuve?.id || Date.now().toString(), nom });
    };

    return (
      <div className="flex flex-col h-full bg-white rounded-t-[2rem]">
        <div className="p-6 border-b border-gray-100 flex items-center justify-between sticky top-0 bg-white/80 backdrop-blur-md z-10">
          <h2 className="text-xl font-black text-gray-800">{cuve ? `Modifier ${cuve.nom}` : 'Nouvelle cuve'}</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-500">
            <X size={24} />
          </button>
        </div>
        
        <div className="p-6 space-y-6 flex-1 overflow-y-auto">
          <div className="space-y-4">
            <div>
              <Label className="text-sm font-bold text-gray-700">Nom de la cuve</Label>
              <Input value={nom} onChange={e => setNom(e.target.value)} placeholder="Ex: Cuve 1 (Poulet)" className="mt-1" />
            </div>
          </div>
        </div>
        
        <div className="p-6 border-t border-gray-100 bg-gray-50 flex items-center justify-between sticky bottom-0 z-10">
          {cuve && onDelete ? (
             <Button variant="outline" className="text-red-500 border-red-200 hover:bg-red-50 px-4" onClick={() => onDelete(cuve.id)}>
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
  const [entries, setEntries] = useState<OilChecklistEntry[]>([]);
  
  // Changement d'huile form
  const [showChangeForm, setShowChangeForm] = useState(false);
  const [changeForm, setChangeForm] = useState({ cuve: 1, motif: 'Qualité' });
  
  const [activePhotoCuve, setActivePhotoCuve] = useState<number | null>(null);
  const [initialFile, setInitialFile] = useState<File | null>(null);
  const [viewPhotoId, setViewPhotoId] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [deleteId, setDeleteId] = useState<string | null>(null);
  
  const configHuiles = getStoredData('config_huiles', { seuilAttention: 20, seuilChangement: 23 });

  const getStatutHuile = (valeur: number | string) => {
    if (!valeur) return null;
    const val = parseFloat(valeur as string);
    if (isNaN(val)) return null;
    if (val > configHuiles.seuilChangement) return "changer";
    if (val >= configHuiles.seuilAttention) return "attention";
    return "bon";
  };

  useEffect(() => {
    setEntries(getStoredData<OilChecklistEntry[]>('crousty_oil_checklist', []));
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const confirmDelete = (id: string) => {
    const updated = entries.map(e => e.id === id ? { ...e, supprime: true } : e);
    setEntries(updated);
    setStoredData('crousty_oil_checklist', updated);
    setDeleteId(null);
  };

  const handleOilChange = () => {
    if (!currentUser) return;
    const newEntry: OilChecklistEntry = {
      id: Date.now().toString(), 
      date: new Date().toISOString(), 
      cuves: {
        1: { testValue: '', temperature: '' },
        2: { testValue: '', temperature: '' },
        3: { testValue: '', temperature: '' },
        4: { testValue: '', temperature: '' }
      },
      changed: true,
      cuveChangee: changeForm.cuve,
      motifChangement: changeForm.motif,
      responsable: currentUser?.name || 'Inconnu',
      signature: createSignature(currentUser)
    };
    const updated = [newEntry, ...entries];
    setEntries(updated);
    setStoredData('crousty_oil_checklist', updated);
    
    setShowChangeForm(false);
  };

  const handleResult = (cuveId: number, result: any) => {
    const todayStr = new Date().toDateString();
    const existingIndex = entries.findIndex(e => !e.changed && !e.supprime && new Date(e.date).toDateString() === todayStr);

    let updated = [...entries];

    const mobileWorker = localStorage.getItem('crousty_mobile_worker');
    const uName = currentUser?.name || mobileWorker || 'Inconnu';

    if (existingIndex >= 0) {
       const existing = updated[existingIndex];
       
       if (!existing.cuves[cuveId]) {
         existing.cuves[cuveId] = { testValue: '', temperature: '' };
       }

       if (existing.cuves[cuveId].testValue !== "") {
           const confirmReplace = window.confirm("Une valeur existe déjà pour cette cuve aujourd'hui. Remplacer ?");
           if (!confirmReplace) {
               return false; // Action annulée
           }
       }

       existing.cuves[cuveId] = {
           testValue: result.tpm.toString(), 
           temperature: result.temperature?.toString() || '', 
           photo: result.photoId 
       };
       if (result.tpm >= configHuiles.seuilChangement) {
           existing.actionsCorrectives = "Valeur critique détectée lors du scan.";
       }
       existing.responsable = uName;
    } else {
      const newEntry: OilChecklistEntry = {
        id: Date.now().toString(),
        date: new Date().toISOString(),
        cuves: {
          1: { testValue: '', temperature: '' },
          2: { testValue: '', temperature: '' },
          3: { testValue: '', temperature: '' },
          4: { testValue: '', temperature: '' },
          [cuveId]: { 
            testValue: result.tpm.toString(), 
            temperature: result.temperature?.toString() || '', 
            photo: result.photoId 
          }
        },
        changed: false,
        actionsCorrectives: result.tpm >= configHuiles.seuilChangement ? "Valeur critique détectée lors du scan." : "",
        responsable: uName,
        signature: createSignature(currentUser)
      };
      updated = [newEntry, ...entries];
    }

    // This will now throw if it fails locally
    setStoredData('crousty_oil_checklist', updated);
    setEntries(updated);
    
    return true; // Succeess
  };

  const onPhotoClick = async (e: React.ChangeEvent<HTMLInputElement>, num: number) => {
    const file = e.target.files?.[0];
    if (file) {
      setInitialFile(file);
      setActivePhotoCuve(num);
    }
    // Clear the input so the same file could be selected again if cancelled
    e.target.value = '';
  };

  // Helper pour afficher la date relative
  const getRelativeTimeText = (dateStr: string) => {
    const d = new Date(dateStr);
    const today = new Date();
    const isToday = d.getDate() === today.getDate() && d.getMonth() === today.getMonth() && d.getFullYear() === today.getFullYear();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const isYesterday = d.getDate() === yesterday.getDate() && d.getMonth() === yesterday.getMonth() && d.getFullYear() === yesterday.getFullYear();
    
    const timeStr = d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
    if (isToday) return `Aujourd'hui à ${timeStr}`;
    if (isYesterday) return `Hier à ${timeStr}`;
    return `Le ${d.toLocaleDateString('fr-FR')} à ${timeStr}`;
  };

  const chartData = React.useMemo(() => {
    // On veut afficher l'évolution des TPM dans le temps
    const validEntries = [...entries].filter(e => !e.supprime).reverse();
    return validEntries.map(e => {
       const d = new Date(e.date);
       const obj: any = {
          name: d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' }) + ' ' + d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
       };
       if (!e.changed) {
          Object.keys(e.cuves).forEach(cuveId => {
            if (e.cuves[cuveId]?.testValue) {
               const cuveName = configCuves.find((c: any) => c.id === cuveId)?.nom || `Cuve${cuveId}`;
               obj[cuveName] = parseFloat(e.cuves[cuveId].testValue);
            }
          });
       } else {
          // Marqueur de changement pour la cuve
          obj[`ChangementCuve${e.cuveChangee}`] = true;
       }
       return obj;
    });
  }, [entries]);

  return (
    <div className="space-y-6 pb-24 pt-8 px-4 max-w-4xl mx-auto">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-black text-gray-800 uppercase tracking-tighter">🛢️ Huiles de Friture</h2>
        <div className="bg-indigo-100 text-indigo-700 px-3 py-1 rounded-full text-xs font-black">TESTO 270</div>
      </div>

      <Card className="space-y-8 p-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          {cuves.map((cuveObj: any, index) => {
             const num = cuveObj.id;
             // Trouver le dernier scan pour cette cuve
             const lastScanEntry = entries.find(e => !e.supprime && !e.changed && e.cuves && e.cuves[num as any]?.testValue);
             const lastScanData = lastScanEntry?.cuves?.[num as any];
             const testValue = lastScanData?.testValue || '';
             const statut = getStatutHuile(testValue);
             
             // Trouver si un changement d'huile a eu lieu depuis ce test
             let isChangedSince = false;
             if (lastScanEntry) {
                 const changeEntrySince = entries.find(e => !e.supprime && e.changed && String(e.cuveChangee) === String(num) && new Date(e.date).getTime() > new Date(lastScanEntry.date).getTime());
                 if (changeEntrySince) {
                    isChangedSince = true;
                 }
             }

            return (
              <div 
                key={num} 
                className={`animate-card-in relative p-4 rounded-3xl border-2 transition-all duration-300 flex flex-col group min-h-[240px] z-10 ${
                  !testValue || isChangedSince ? 'bg-gray-50 border-gray-100' :
                  statut === 'changer' ? 'bg-red-50 border-red-300 shadow-sm' :
                  statut === 'attention' ? 'bg-amber-50 border-amber-300 shadow-sm' :
                  'bg-green-50 border-green-300 shadow-sm'
                }`}
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
                         <EditCuveModal 
                           cuve={cuveObj} 
                           onClose={closeModal} 
                           onSave={(updatedCuve: any) => {
                              const newCuves = configCuves.map((c: any) => c.id === updatedCuve.id ? updatedCuve : c);
                               setCuves(newCuves);
                              updateConfig({ huiles: newCuves });
                              closeModal();
                           }} 
                           onDelete={(id: string) => {
                              if(window.confirm('Supprimer cette cuve ?')) {
                                const newCuves = configCuves.filter((c: any) => c.id !== id);
                                 setCuves(newCuves);
                                updateConfig({ huiles: newCuves });
                                closeModal();
                              }
                           }}
                         />
                       );
                     }}
                     className="absolute -top-3 -right-3 w-12 h-12 bg-white border border-gray-200 rounded-full shadow-lg flex items-center justify-center text-[var(--color-primary)] z-20 active:scale-[0.92] transition-transform opacity-0 group-hover:opacity-100 md:opacity-100"
                   >
                     <Edit2 size={20} strokeWidth={2.5} />
                   </button>
                )}

                <div className="flex justify-between items-start mb-4">
                  <span className="font-black text-gray-800 text-lg uppercase">{cuveObj.nom}</span>
                  {testValue && !isChangedSince && (
                     <div className={`px-3 py-1 rounded-full text-sm font-black flex items-center gap-1 ${
                        statut === 'changer' ? 'bg-red-100 text-red-700' :
                        statut === 'attention' ? 'bg-amber-100 text-amber-700' :
                        'bg-green-100 text-green-700'
                     }`}>
                        {testValue}% TPM
                        {statut === 'changer' && <X size={16} />}
                        {statut === 'attention' && <AlertTriangle size={16} />}
                        {statut === 'bon' && <Check size={16} />}
                     </div>
                  )}
                </div>

                {testValue && !isChangedSince && (
                   <div className="mb-4 text-center">
                     <div className="text-xs font-bold text-gray-500 uppercase">Seuil limite : Max {configHuiles.seuilChangement}%</div>
                     {statut === 'changer' && <div className="text-sm font-black text-red-600 mt-1">🔴 HUILE À CHANGER</div>}
                   </div>
                )}
                
                {isChangedSince && (
                   <div className="mb-4 text-center">
                     <div className="text-sm font-black text-indigo-600 mt-1 flex items-center justify-center gap-1"><RotateCcw size={16} /> HUILE NEUVE</div>
                     <div className="text-xs font-bold text-gray-500">En attente du premier test</div>
                   </div>
                )}

                {!testValue && !isChangedSince && (
                   <div className="h-12 flex items-center justify-center text-gray-400 font-bold italic mb-4">
                     Aucun relevé récent
                   </div>
                )}

                <label 
                  className={`w-full flex items-center justify-center gap-3 p-4 text-white rounded-2xl font-black text-sm shadow-sm active:scale-95 transition-all cursor-pointer mt-auto ${
                   statut === 'changer' && !isChangedSince ? 'bg-red-600 hover:bg-red-700' :
                   statut === 'attention' && !isChangedSince ? 'bg-amber-500 hover:bg-amber-600' : ''
                }`}
                  style={!(statut === 'changer' && !isChangedSince) && !(statut === 'attention' && !isChangedSince) ? { backgroundColor: 'var(--color-primary)' } : undefined}
                >
                  <input 
                    type="file" 
                    accept="image/*" 
                    capture="environment" 
                    className="hidden" 
                    onChange={(e) => onPhotoClick(e, num)} 
                  />
                  <Camera size={20} />
                  NOUVEAU TEST
                </label>
                
                {lastScanEntry && (
                   <div className="mt-4 text-[11px] text-gray-500 text-center font-medium bg-white/50 py-1.5 rounded-lg border border-gray-100/50">
                     Dernier contrôle : {getRelativeTimeText(lastScanEntry.date)}
                   </div>
                )}
              </div>
            );
          })}
          
          {/* ADD CUVE BUTTON */}
          {currentUser?.role === 'manager' && (
            <button 
              onClick={() => {
                openModal(
                  <EditCuveModal 
                    onClose={closeModal}
                    onSave={(newCuve: any) => {
                      const newCuves = [...configCuves, newCuve];
                  setCuves(newCuves);
                  updateConfig({ huiles: newCuves });
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
              <span className="font-bold text-sm tracking-widest uppercase">Ajouter cuve</span>
            </button>
          )}
        </div>

        <div className="space-y-4 pt-6 border-t border-dashed border-gray-200">
          <div className="flex items-center justify-between">
            <h4 className="font-black text-gray-800 uppercase flex items-center gap-2"><RotateCcw size={20} className="text-indigo-500" /> Signaler un changement d'huile</h4>
            {!showChangeForm && (
              <button 
                onClick={() => setShowChangeForm(true)}
                className="bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-bold px-4 py-2 rounded-xl transition-colors"
              >
                + Nouveau
              </button>
            )}
          </div>
          
          {showChangeForm && (
             <div className="bg-gray-50 p-4 rounded-3xl border border-gray-200 animate-in fade-in slide-in-from-top-2 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-gray-600 font-bold text-xs uppercase mb-1">Cuve changée</Label>
                    <select 
                      value={changeForm.cuve} 
                      onChange={e => setChangeForm({...changeForm, cuve: Number(e.target.value)})}
                      className="w-full p-3 rounded-xl border border-gray-200 font-bold text-gray-800 bg-white"
                    >
                      {[1,2,3,4].map(n => <option key={n} value={n}>Cuve {n}</option>)}
                    </select>
                  </div>
                  <div>
                    <Label className="text-gray-600 font-bold text-xs uppercase mb-1">Motif</Label>
                    <select 
                      value={changeForm.motif} 
                      onChange={e => setChangeForm({...changeForm, motif: e.target.value})}
                      className="w-full p-3 rounded-xl border border-gray-200 font-bold text-gray-800 bg-white"
                    >
                      <option value="Qualité (TPM élevé)">Qualité (% TPM élevé)</option>
                      <option value="Planifié / Entretien">Planifié / Entretien</option>
                      <option value="Autre">Autre</option>
                    </select>
                  </div>
                </div>

                <div className="flex items-center gap-2 text-sm text-gray-500 font-medium">
                  <Clock size={16} />
                  Heure : {currentTime.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                </div>

                <div className="flex gap-3 pt-2">
                  <button 
                    onClick={() => setShowChangeForm(false)}
                    className="flex-1 py-3 text-sm font-bold text-gray-500 hover:bg-gray-200 rounded-xl transition-colors"
                  >
                    Annuler
                  </button>
                  <button 
                    onClick={handleOilChange}
                    className="flex-1 py-3 text-sm font-black text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-md transition-all active:scale-95"
                  >
                    Valider le changement
                  </button>
                </div>
             </div>
          )}
        </div>
      </Card>

      {chartData.length > 0 && (
        <Card className="p-6">
          <h3 className="text-sm font-black text-gray-800 uppercase mb-4 flex items-center gap-2">
            📉 Évolution TPM (%)
          </h3>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                <XAxis dataKey="name" fontSize={10} tickMargin={10} stroke="#9CA3AF" />
                <YAxis domain={[0, 40]} fontSize={10} stroke="#9CA3AF" />
                <Tooltip 
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  labelStyle={{ fontWeight: 'bold', color: '#374151', marginBottom: '4px' }}
                />
                <Legend iconType="circle" wrapperStyle={{ fontSize: '11px', fontWeight: 'bold', paddingTop: '10px' }} />
                <ReferenceLine y={configHuiles.seuilChangement} stroke="#EF4444" strokeDasharray="3 3" />
                <ReferenceLine y={configHuiles.seuilAttention} stroke="#F59E0B" strokeDasharray="3 3" />
                <Line type="monotone" connectNulls dataKey="Cuve1" name="Cuve 1" stroke="#3B82F6" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                <Line type="monotone" connectNulls dataKey="Cuve2" name="Cuve 2" stroke="#8B5CF6" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                <Line type="monotone" connectNulls dataKey="Cuve3" name="Cuve 3" stroke="#EC4899" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                <Line type="monotone" connectNulls dataKey="Cuve4" name="Cuve 4" stroke="#F59E0B" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>
      )}

      <div className="space-y-4">
        <h3 className="text-xl font-black text-gray-800 uppercase tracking-tighter px-2">Historique des Relevés</h3>
        <AnimatePresence>
          {entries.filter(e => !e.supprime).map(e => (
            <motion.div 
              key={e.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white p-5 rounded-3xl border border-gray-100 shadow-sm relative overflow-hidden"
            >
              <div className="flex justify-between items-start mb-4">
                <div>
                  <div className="text-sm font-black text-gray-800 flex items-center gap-2">
                    <Clock size={14} className="text-indigo-400" />
                    {new Date(e.date).toLocaleDateString('fr-FR')} — {new Date(e.date).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                  </div>
                  <div className="text-[10px] text-gray-400 font-bold uppercase mt-1">Responsable: {e.responsable}</div>
                </div>
                
                {deleteId === e.id ? (
                  <div className="flex items-center gap-2 bg-red-50 p-1 rounded-lg z-10">
                    <span className="text-xs text-red-600 font-bold px-1">Sûr ?</span>
                    <button onClick={() => confirmDelete(e.id)} className="p-1 text-red-600 hover:text-red-800"><Check size={16}/></button>
                    <button onClick={() => setDeleteId(null)} className="p-1 text-gray-500 hover:text-gray-700"><X size={16}/></button>
                  </div>
                ) : (
                  <SaisieActions saisie={e} onDelete={() => setDeleteId(e.id)} inline={true} />
                )}
              </div>

              {!e.changed && (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {Object.keys(e.cuves).map(cuveId => {
                    const cuveData: any = e.cuves[cuveId];
                    if (!cuveData?.testValue) return null;
                    const statut = getStatutHuile(cuveData.testValue);
                    const cuveNameDisplay = configCuves.find((c: any) => c.id === cuveId)?.nom || `Cuve ${cuveId}`;
                    
                    return (
                      <div key={cuveId} className="bg-gray-50 p-3 rounded-2xl relative">
                        <div className="text-[10px] font-black text-gray-400 mb-1 uppercase">{cuveNameDisplay}</div>
                        <div className="text-xl font-black text-gray-800">{cuveData.testValue}%</div>
                        {cuveData.temperature && <div className="text-[10px] font-bold text-gray-500">{cuveData.temperature}°C</div>}
                        
                        <div className={`mt-2 text-[9px] font-black uppercase px-2 py-0.5 rounded-full inline-block ${
                          statut === 'changer' ? 'bg-red-100 text-red-700' :
                          statut === 'attention' ? 'bg-amber-100 text-amber-700' :
                          'bg-green-100 text-green-700'
                        }`}>
                          {statut === 'changer' ? 'Changer' : statut === 'attention' ? 'Vérifier' : 'OK'}
                        </div>

                        {cuveData.photo && (
                          <button 
                            onClick={() => setViewPhotoId(cuveData.photo!)}
                            className="mt-2 text-[10px] text-indigo-500 hover:text-indigo-700 font-bold flex items-center gap-1"
                            title="Voir la photo annexe"
                          >
                            <Camera size={12} /> [Photo annexe]
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              {e.changed && (
                <div className="mt-4 p-3 bg-indigo-50 text-indigo-700 rounded-xl text-sm font-black flex items-center gap-2">
                  <RotateCcw size={16} /> 
                  CHANGEMENT D'HUILE CUVE {e.cuveChangee}
                  <span className="font-medium text-xs ml-auto">({e.motifChangement})</span>
                </div>
              )}
              {e.actionsCorrectives && !e.changed && (
                <div className="mt-2 p-3 bg-amber-50 text-amber-700 rounded-xl text-xs font-bold border border-amber-100">
                  ⚠️ {e.actionsCorrectives}
                </div>
              )}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      <AnimatePresence>
        {activePhotoCuve !== null && (
          <PhotoTesto 
            cuveName={`Cuve ${activePhotoCuve}`}
            initialFile={initialFile}
            onResult={(res) => handleResult(activePhotoCuve, res)}
            onCancel={() => {
              setActivePhotoCuve(null);
              setInitialFile(null);
            }}
          />
        )}
        {viewPhotoId && (
          <PhotoViewer 
            photoId={viewPhotoId} 
            onClose={() => setViewPhotoId(null)} 
          />
        )}
      </AnimatePresence>
    </div>
  );
}
