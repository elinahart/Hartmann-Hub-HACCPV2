import React, { useState, useEffect, useMemo } from 'react';
import { Card, Button, Input, Label } from '../components/ui/LightUI';
import { getStoredData, setStoredData, savePhoto, getPhoto, deletePhoto } from '../lib/db';
import { Camera, Image as ImageIcon, Trash2, Check, X, ScanBarcode, Search, FileText, Package, ChevronRight, Plus } from 'lucide-react';
import { createPortal } from 'react-dom';
import { useAuth } from '../contexts/AuthContext';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { QRScanner } from '../components/QRScanner';
import { createSignature, updateSignature } from '../lib/permissions';
import { SaisieActions } from '../components/SaisieActions';
import { SignatureSaisie } from '../types';
import { useInventaire } from '../providers/InventaireProvider';

import { useI18n } from '../lib/i18n';
import { compressPhotoTLC } from '../lib/imageUtils';
import { cn } from '../lib/utils';
import { getCategorieStyle } from '../lib/inventoryStyles';

interface TracabiliteEntry {
  id: string;
  date: string;
  produit: string;
  numeroLot: string;
  dlc: string;
  photoId?: string;
  photoIds?: string[];
  commentaire?: string;
  userId: string;
  userName: string;
  signature?: SignatureSaisie;
  supprime?: boolean;
}

export interface TracabiliteLine {
  id: string;
  produit: string;
  numeroLot: string;
  dlc: string;
}

const handleDateInput = (val: string) => {
  const cleaned = val.replace(/[^\d]/g, '').substring(0, 6);
  if (cleaned.length > 4) {
    return `${cleaned.substring(0, 2)}/${cleaned.substring(2, 4)}/${cleaned.substring(4, 6)}`;
  } else if (cleaned.length > 2) {
    return `${cleaned.substring(0, 2)}/${cleaned.substring(2, 4)}`;
  }
  return cleaned;
};

const displayDate = (dateStr: string) => {
  if (!dateStr || dateStr === 'N/A') return 'N/A';
  if (/^\d{2}\/\d{2}\/\d{2}$/.test(dateStr)) return dateStr;
  const d = new Date(dateStr);
  if (!isNaN(d.getTime())) return d.toLocaleDateString();
  return dateStr;
};

export default function Tracabilite() {
  const { currentUser } = useAuth();
  const { t } = useI18n();
  const { products } = useInventaire();
  const [entries, setEntries] = useState<TracabiliteEntry[]>([]);
  
  const [lignes, setLignes] = useState<TracabiliteLine[]>([{ id: '1', produit: '', numeroLot: '', dlc: '' }]);
  const [commentaire, setCommentaire] = useState('');
  const [photoDataUrls, setPhotoDataUrls] = useState<string[]>([]);
  
  const [activeLineId, setActiveLineId] = useState<string | null>(null);
  
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [editId, setEditId] = useState<string | null>(null);
  const [editData, setEditData] = useState<TracabiliteEntry | null>(null);
  const [editMotif, setEditMotif] = useState('');
  
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isQRScannerOpen, setIsQRScannerOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [dateSaisie, setDateSaisie] = useState<string>(() => format(new Date(), 'yyyy-MM-dd'));

  const sortedProducts = useMemo(() => {
    return [...products].sort((a, b) => a.name.localeCompare(b.name));
  }, [products]);

  const filteredProducts = useMemo(() => {
    if (!searchTerm) return sortedProducts;
    return sortedProducts.filter(p => 
      p.name.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [sortedProducts, searchTerm]);

  const groupedProducts = useMemo(() => {
    const groups: Record<string, typeof sortedProducts> = {};
    filteredProducts.forEach(p => {
      const cat = p.category || 'Non classé';
      if (!groups[cat]) groups[cat] = [];
      groups[cat].push(p);
    });
    return groups;
  }, [filteredProducts]);

  useEffect(() => {
    // Migration helper for old entries
    let data = getStoredData<any[]>('crousty_tracabilite_v2', []);
    if (data.length === 0) {
      const oldData = getStoredData<any[]>('crousty_tracabilite_photos', []);
      if (oldData.length > 0) {
        data = oldData.map(old => ({
          ...old,
          produit: old.commentaire || 'Produit Inconnu',
          numeroLot: 'N/A',
          dlc: 'N/A'
        }));
        setStoredData('crousty_tracabilite_v2', data);
      }
    }
    setEntries(data);
  }, []);

  useEffect(() => {
    // Removed click outside listener for dropdown since we use a full modal now
  }, []);

  const addLigne = () => {
    setLignes([...lignes, { id: Date.now().toString() + Math.random(), produit: '', numeroLot: '', dlc: '' }]);
  };

  const updateLigne = (id: string, field: keyof TracabiliteLine, value: string) => {
    setLignes(prev => prev.map(l => l.id === id ? { ...l, [field]: value } : l));
  };

  const removeLigne = (id: string) => {
    if (lignes.length > 1) {
      setLignes(lignes.filter(l => l.id !== id));
    }
  };

  const handleScan = (decodedText: string) => {
    let decoded = decodedText.trim();
    
    if (decoded.startsWith('{') && decoded.endsWith('}')) {
      try {
        const data = JSON.parse(decoded);
        if (activeLineId) {
            if (data.produit) updateLigne(activeLineId, 'produit', data.produit);
            if (data.lot) updateLigne(activeLineId, 'numeroLot', data.lot);
            if (data.dlc) updateLigne(activeLineId, 'dlc', data.dlc);
        }
        return;
      } catch (e) {
        // ignore JSON parse error
      }
    }

    if (activeLineId) {
      if (decoded.startsWith('http')) {
        setCommentaire(`Lien scanné: ${decoded}`);
      } else {
        updateLigne(activeLineId, 'numeroLot', decoded);
      }
    }
  };

  const handleCapture = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) {
      e.target.value = '';
      return;
    }

    const newPhotos: string[] = [];
    for (let i = 0; i < files.length; i++) {
        const file = files[i];
        try {
          const dataUrl = await compressPhotoTLC(file);
          newPhotos.push(dataUrl);
        } catch (err) {
          console.error("Compression erreur:", err);
          const reader = new FileReader();
          const p = new Promise<string>((resolve) => {
             reader.onload = (event) => {
               resolve(event.target?.result as string);
             };
          });
          reader.readAsDataURL(file);
          newPhotos.push(await p);
        }
    }
    
    setPhotoDataUrls(prev => [...prev, ...newPhotos]);
    e.target.value = '';
  };

  const handleManualSubmit = async () => {
    const isLignesValid = lignes.every(l => l.produit);
    if (!isLignesValid) {
      setError('Veuillez sélectionner un produit pour chaque ligne');
      return;
    }
    
    if (photoDataUrls.length === 0) {
      setError('Photo(s) obligatoire(s) pour la traçabilité');
      return;
    }

    const baseId = Date.now().toString();
    const photoIds: string[] = [];
    
    for (let i = 0; i < photoDataUrls.length; i++) {
        const pId = `trac_photo_${baseId}_${i}`;
        await savePhoto(pId, photoDataUrls[i]);
        photoIds.push(pId);
    }
    
    const mobileWorker = localStorage.getItem('crousty_mobile_worker');
    const uName = currentUser?.name || mobileWorker || 'Inconnu';
    
    const entryDate = new Date(dateSaisie);
    const now = new Date();
    entryDate.setHours(now.getHours(), now.getMinutes(), now.getSeconds());

    const newEntries: TracabiliteEntry[] = lignes.map((ligne, idx) => ({
      id: `${baseId}_${idx}`,
      date: entryDate.toISOString(),
      produit: ligne.produit,
      numeroLot: ligne.numeroLot || 'N/A',
      dlc: ligne.dlc || 'N/A',
      photoIds,
      commentaire,
      userId: currentUser?.id || '0',
      userName: uName,
      signature: createSignature(currentUser || null)
    }));

    const updated = [...newEntries, ...entries];
    setEntries(updated);
    setStoredData('crousty_tracabilite_v2', updated);
    
    setLignes([{ id: Date.now().toString(), produit: '', numeroLot: '', dlc: '' }]);
    setCommentaire('');
    setPhotoDataUrls([]);
    setError('');
    setSuccess(t('success_reception') || `Saisie enregistrée avec succès !`);
    setTimeout(() => setSuccess(''), 4000);
  };

  const confirmDelete = async (id: string) => {
    const updated = entries.map(e => e.id === id ? { ...e, supprime: true } : e);
    setEntries(updated);
    setStoredData('crousty_tracabilite_v2', updated);
    setDeleteId(null);
    window.dispatchEvent(new Event('crousty_data_changed'));
  };

  const startEdit = (entry: TracabiliteEntry) => {
    setEditId(entry.id);
    setEditData({ ...entry });
    setEditMotif('');
  };

  const handleEditSave = () => {
    if (!editMotif.trim()) { alert("Le motif de modification est obligatoire."); return; }
    if (!editData || !currentUser) return;
    
    if (!editData.produit) {
      alert("Le produit est obligatoire.");
      return;
    }

    const updated = entries.map(e => e.id === editId ? {
      ...editData,
      signature: updateSignature(editData.signature, currentUser, editMotif)
    } : e);
    
    setEntries(updated);
    setStoredData('crousty_tracabilite_v2', updated);
    setEditId(null);
  };

  return (
    <div className="space-y-6">
      <QRScanner 
        isOpen={isQRScannerOpen} 
        onClose={() => setIsQRScannerOpen(false)} 
        onScan={handleScan} 
      />
      <Card className="p-6">
        <div className="mb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <h2 className="text-lg font-black text-crousty-dark">{t('lbl_new_opening') || 'Nouvelle Ouverture'}</h2>
          <div className="flex items-center gap-2">
            <Label className="text-sm font-black text-gray-700 whitespace-nowrap">Date d'ouverture :</Label>
            <Input 
               type="date" 
               value={dateSaisie}
               onChange={(e: any) => setDateSaisie(e.target.value)}
               className="bg-white border-2 border-gray-100 h-10 rounded-xl w-auto"
               max={format(new Date(), 'yyyy-MM-dd')}
            />
          </div>
        </div>
        
        {error && <div className="bg-red-50 text-red-600 p-3 rounded-xl mb-4 text-sm font-bold border border-red-100">{error}</div>}

        <div className="space-y-6">
          <div className="space-y-4">
             {lignes.map((ligne, idx) => (
                <div key={ligne.id} className="bg-gray-50 p-4 rounded-2xl border border-gray-200 relative">
                  {lignes.length > 1 && (
                    <button 
                      onClick={() => removeLigne(ligne.id)}
                      className="absolute top-2 right-2 w-8 h-8 flex items-center justify-center bg-white text-red-500 rounded-full hover:bg-red-50 shadow-sm transition-all"
                    >
                      <Trash2 size={16} />
                    </button>
                  )}
                  <div className="font-bold text-crousty-purple mb-3 text-sm flex items-center gap-2">
                    <div className="w-5 h-5 rounded-full bg-crousty-purple text-white flex items-center justify-center text-xs">
                      {idx + 1}
                    </div>
                    {t('lbl_product_line') || 'Ligne produit'}
                  </div>

                  <div className="mb-4">
                    <Label className="text-sm font-black text-gray-700 mb-2 flex items-center gap-2">
                      <Package size={16} className="text-gray-500" /> Produit <span className="text-red-500">*</span>
                    </Label>
                    <button
                      onClick={() => { setActiveLineId(ligne.id); setIsProductModalOpen(true); }}
                      className={cn(
                        "w-full h-14 rounded-2xl border-2 transition-all text-left px-4 flex items-center justify-between",
                        ligne.produit ? "border-green-500 bg-green-50/30 text-green-900 font-black text-lg" : "border-gray-200 bg-white text-gray-400 font-bold"
                      )}
                    >
                      <span>{ligne.produit || t('lbl_select_product') || 'Sélectionner un produit'}</span>
                      <ChevronRight size={20} className="text-gray-400" />
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <Label className="text-[10px] uppercase font-black tracking-widest text-gray-400">{t('lbl_batch_number') || 'Numéro de Lot'}</Label>
                      <div className="flex gap-2">
                        <Input 
                          value={ligne.numeroLot} 
                          onChange={(e: any) => updateLigne(ligne.id, 'numeroLot', e.target.value)}
                          placeholder="Ex: L12345"
                          className="bg-white border-2 border-gray-100 h-12 rounded-xl"
                        />
                        <button 
                          onClick={() => { setActiveLineId(ligne.id); setIsQRScannerOpen(true); }}
                          className="bg-white text-crousty-purple border-2 border-gray-100 hover:border-crousty-purple transition-all rounded-xl w-12 h-12 shrink-0 flex items-center justify-center shadow-sm"
                          title="Scanner"
                        >
                          <ScanBarcode size={20} />
                        </button>
                      </div>
                    </div>
                    <div>
                      <Label className="text-[10px] uppercase font-black tracking-widest text-gray-400">{t('lbl_dlc') || 'DLC / DDM'}</Label>
                      <Input 
                        type="tel"
                        inputMode="numeric"
                        value={ligne.dlc} 
                        onChange={(e: any) => updateLigne(ligne.id, 'dlc', handleDateInput(e.target.value))}
                        placeholder="JJ/MM/AA"
                        className="bg-white border-2 border-gray-100 h-12 rounded-xl"
                      />
                    </div>
                  </div>
                </div>
             ))}

             <button 
                onClick={addLigne}
                className="w-full flex items-center justify-center gap-2 py-4 rounded-xl border-2 border-dashed border-crousty-purple/30 text-crousty-purple font-bold hover:bg-crousty-purple/5 hover:border-crousty-purple transition-all"
              >
                <Plus size={20} /> {t('btn_add_another_product') || 'Ajouter un autre produit'}
              </button>
          </div>

          <div className="pt-2">
            <Label className="text-sm font-black text-gray-700 mb-3 flex items-center gap-2">
              <Camera size={16} className="text-gray-500" /> Photos (Étiquettes / Produits) <span className="text-red-500">*</span>
            </Label>
            
            {photoDataUrls.length > 0 && (
               <div className="grid grid-cols-2 gap-3 mb-3">
                 {photoDataUrls.map((pUrl, idx) => (
                   <div key={idx} className="relative rounded-xl overflow-hidden border border-gray-200">
                     <img src={pUrl} alt={`Aperçu ${idx + 1}`} className="w-full h-32 object-cover" />
                     <button 
                       onClick={() => setPhotoDataUrls(prev => prev.filter((_, i) => i !== idx))} 
                       className="absolute top-2 right-2 bg-red-500 hover:bg-red-600 text-white p-2 rounded-full shadow-lg transition-transform active:scale-95"
                     >
                       <Trash2 size={16} />
                     </button>
                   </div>
                 ))}
               </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div className="relative group">
                <input 
                  type="file"
                  accept="image/*"
                  capture="environment"
                  multiple
                  onChange={handleCapture}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                />
                <div className="w-full h-32 flex flex-col items-center justify-center gap-2 border-2 border-dashed border-gray-200 bg-gray-50 rounded-2xl group-hover:border-crousty-purple group-hover:bg-crousty-purple/5 transition-all">
                  <div className="w-10 h-10 bg-white rounded-xl shadow-sm flex items-center justify-center text-gray-400 group-hover:text-crousty-purple">
                    <Camera size={20} />
                  </div>
                  <span className="text-[10px] font-black uppercase tracking-widest text-gray-500 text-center">{t('btn_camera') || 'Appareil Photo'}</span>
                </div>
              </div>
              <div className="relative group">
                <input 
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleCapture}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                />
                <div className="w-full h-32 flex flex-col items-center justify-center gap-2 border-2 border-dashed border-gray-200 bg-gray-50 rounded-2xl group-hover:border-crousty-purple group-hover:bg-crousty-purple/5 transition-all">
                  <div className="w-10 h-10 bg-white rounded-xl shadow-sm flex items-center justify-center text-gray-400 group-hover:text-crousty-purple">
                    <ImageIcon size={20} />
                  </div>
                  <span className="text-[10px] font-black uppercase tracking-widest text-gray-500 text-center">{t('btn_gallery') || 'Galerie'}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-gray-50 p-6 rounded-[2.5rem] border border-gray-100 space-y-4">
             <div>
               <Label className="text-[10px] uppercase font-black tracking-widest text-gray-400">{t('lbl_additional_comments') || 'Commentaires additionnels partagés (Optionnel)'}</Label>
               <Input 
                 value={commentaire} 
                 onChange={(e: any) => setCommentaire(e.target.value)}
                 placeholder={t('ph_optional_remarks') || 'Remarques...'}
                 className="bg-white border-2 border-gray-100 h-12 rounded-xl"
               />
             </div>
          </div>
          
          <Button 
            onClick={handleManualSubmit} 
            disabled={!lignes.every(l => l.produit) || photoDataUrls.length === 0}
            className={cn(
              "w-full h-16 text-lg font-black rounded-2xl shadow-xl transition-all duration-300",
              (!lignes.every(l => l.produit) || photoDataUrls.length === 0) 
                ? "bg-gray-100 text-gray-400 cursor-not-allowed" 
                : "bg-crousty-purple text-white hover:bg-crousty-purple/90 active:scale-[0.98] shadow-purple-200"
            )}
          >
            <Check size={24} className="mr-3" /> {t('btn_save_traceability') || 'Enregistrer la traçabilité'}
          </Button>
        </div>
      </Card>

      <div className="space-y-4">
        <h3 className="font-bold text-gray-500 px-2">{t('lbl_history_openings') || 'HISTORIQUE DES OUVERTURES'}</h3>
        {entries.filter(e => !e.supprime).map(e => (
          <TracabiliteItem 
            key={e.id} 
            e={e} 
            deleteId={deleteId} 
            setDeleteId={setDeleteId} 
            confirmDelete={confirmDelete} 
            editId={editId}
            setEditId={setEditId}
            editData={editData}
            setEditData={setEditData}
            editMotif={editMotif}
            setEditMotif={setEditMotif}
            startEdit={startEdit}
            handleEditSave={handleEditSave}
          />
        ))}
        {entries.length === 0 && (
          <div className="text-center py-8 text-gray-400">{t('lbl_no_product_scanned') || 'Aucun produit scanné'}</div>
        )}
      </div>
      {isProductModalOpen && createPortal(
        <div className="fixed inset-0 z-[500] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white w-full max-w-2xl rounded-[2rem] overflow-hidden relative shadow-2xl h-[90dvh] flex flex-col">
            <div className="flex items-center justify-between p-6 bg-white border-b border-gray-100 shrink-0">
              <h2 className="text-2xl font-black text-gray-800 tracking-tight flex items-center gap-3">
                <Package className="text-crousty-purple" size={28} />
                {t('lbl_select_product') || 'Sélectionner un produit'}
              </h2>
              <button 
                onClick={() => setIsProductModalOpen(false)}
                className="w-10 h-10 flex items-center justify-center rounded-xl bg-gray-50 text-gray-400 hover:bg-gray-100 transition-colors"
              >
                <X size={20} />
              </button>
            </div>
            
            <div className="p-4 border-b border-gray-100 shrink-0 bg-gray-50/50">
              <div className="relative">
                <Input 
                  value={searchTerm} 
                  onChange={(e: any) => setSearchTerm(e.target.value)}
                  placeholder={t('ph_search_product') || 'Rechercher un produit...'}
                  className="h-14 rounded-2xl border-white pr-10 text-lg shadow-sm"
                />
                <div className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400">
                  <Search size={20} />
                </div>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
              {Object.keys(groupedProducts).length > 0 ? (
                Object.entries(groupedProducts).map(([cat, prods]: [string, any[]]) => {
                  const style = getCategorieStyle(cat);
                  const Icon = style.icone;
                  
                  return (
                    <div key={cat} className="mb-6">
                      <div className="flex items-center gap-2 mb-3 select-none">
                        <div className="w-1 h-4 rounded-full" style={{ background: style.couleur }} />
                        <Icon size={16} color={style.couleur} strokeWidth={2.5} />
                        <span className="text-sm font-bold tracking-wider uppercase" style={{ color: style.couleur }}>
                          {cat}
                        </span>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {prods.map(p => (
                          <button
                            key={p.id}
                            onClick={() => {
                              if (activeLineId) {
                                updateLigne(activeLineId, 'produit', p.name);
                              }
                              setIsProductModalOpen(false);
                              setActiveLineId(null);
                              setError('');
                            }}
                            className="bg-white border text-left border-gray-200 rounded-2xl p-4 flex items-center gap-3 hover:border-crousty-purple hover:bg-purple-50 group transition-all"
                          >
                            <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: style.fond, color: style.couleur }}>
                              <Package size={20} />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-black text-gray-800 truncate group-hover:text-crousty-purple transition-colors">{p.name}</p>
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="text-center py-20 text-gray-400 font-bold">
                  Aucun produit trouvé.
                </div>
              )}
            </div>
            
          </div>
        </div>,
        document.body
      )}

    </div>
  );
}

const TracabiliteItem = ({ e, deleteId, setDeleteId, confirmDelete, editId, setEditId, editData, setEditData, editMotif, setEditMotif, startEdit, handleEditSave }: any) => {
  const { t } = useI18n();
  const [photos, setPhotos] = useState<string[]>([]);
  const [showPhotos, setShowPhotos] = useState(false);

  useEffect(() => {
    const loadPhotos = async () => {
      const loadedPhotos: string[] = [];
      if (e.photoId) { // Backward compatibility
        const data = await getPhoto(e.photoId);
        if (data) loadedPhotos.push(data);
      }
      if (e.photoIds && Array.isArray(e.photoIds)) {
        for (const pid of e.photoIds) {
          const data = await getPhoto(pid);
          if (data) loadedPhotos.push(data);
        }
      }
      setPhotos(loadedPhotos);
    };
    loadPhotos();
  }, [e.photoId, e.photoIds]);

  return (
    <Card className="p-4 relative">
       {editId === e.id && editData ? (
         <div className="space-y-4 relative z-10 w-full">
            <div className="bg-orange-50 p-3 rounded-xl border border-orange-200">
               <Label className="text-orange-800 font-bold">⚠️ Motif de modification (obligatoire)</Label>
               <Input value={editMotif} onChange={ev => setEditMotif(ev.target.value)} placeholder="Ex: Erreur de frappe..." className="mt-1" />
            </div>
            <div className="grid grid-cols-2 gap-2">
               <div>
                  <Label>Date <span className="text-red-500 font-bold">*</span></Label>
                  <Input 
                    type="date" 
                    value={format(new Date(editData.date || new Date()), 'yyyy-MM-dd')} 
                    max={format(new Date(), 'yyyy-MM-dd')}
                    onChange={ev => {
                      try {
                        const newDate = new Date(ev.target.value);
                        const oldDate = new Date(editData.date || new Date());
                        newDate.setHours(oldDate.getHours(), oldDate.getMinutes(), oldDate.getSeconds());
                        setEditData({...editData, date: newDate.toISOString()});
                      } catch (e) {
                         // invalid date string
                      }
                    }} 
                  />
               </div>
               <div>
                  <Label>Produit <span className="text-red-500 font-bold">*</span></Label>
                  <Input value={editData.produit} onChange={ev => setEditData({...editData, produit: ev.target.value})} />
               </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
               <div>
                  <Label>Lot <span className="text-gray-400 font-medium">(optionnel)</span></Label>
                  <Input value={editData.numeroLot} onChange={ev => setEditData({...editData, numeroLot: ev.target.value})} />
               </div>
               <div>
                  <Label>DLC <span className="text-gray-400 font-medium">(optionnel)</span></Label>
                  <Input type="tel" inputMode="numeric" placeholder="JJ/MM/AA" value={editData.dlc} onChange={ev => setEditData({...editData, dlc: handleDateInput(ev.target.value)})} />
               </div>
            </div>
            <div>
               <Label>Commentaire</Label>
               <Input value={editData.commentaire || ''} onChange={ev => setEditData({...editData, commentaire: ev.target.value})} />
            </div>
            <div className="flex gap-2 justify-end mt-4">
               <Button variant="secondary" onClick={() => setEditId(null)}>{t('btn_cancel') || 'Annuler'}</Button>
               <Button onClick={handleEditSave} icon={Check}>{t('btn_save') || 'Enregistrer'}</Button>
            </div>
         </div>
       ) : (
        <>
       {deleteId === e.id ? (
        <div className="absolute top-2 right-2 flex items-center gap-2 bg-red-50 p-1 rounded-lg z-10">
          <span className="text-xs text-red-600 font-bold px-1">Sûr ?</span>
          <button onClick={() => confirmDelete(e.id)} className="p-1 text-red-600 hover:text-red-800"><Check size={16}/></button>
          <button onClick={() => setDeleteId(null)} className="p-1 text-gray-500 hover:text-gray-700"><X size={16}/></button>
        </div>
      ) : (
        <div className="absolute top-2 right-2 z-10">
          <SaisieActions 
             saisie={{...e, responsable: e.userName}}
             onEdit={() => startEdit(e)}
             onDelete={() => setDeleteId(e.id)}
          />
        </div>
      )}

      <div className="flex flex-col gap-4">
        <div className="flex-1 min-w-0 pr-16 pl-1">
          <div className="font-bold text-crousty-purple bg-crousty-purple/10 inline-block px-2 py-1 rounded-lg text-xs mb-2">
            Ouvert le {format(new Date(e.date), "dd MMM yyyy 'à' HH:mm", { locale: fr })}
          </div>
          
          <h4 className="font-black text-gray-800 text-lg leading-tight mb-1 truncate">{e.produit}</h4>
          
          <div className="grid grid-cols-2 gap-2 text-xs mb-2">
            <div className="text-gray-500">Lot: <span className="font-bold text-gray-700">{e.numeroLot}</span></div>
            <div className="text-gray-500">DLC: <span className="font-bold text-crousty-purple">{displayDate(e.dlc)}</span></div>
          </div>
          
          {e.commentaire && (
            <div className="bg-orange-50 border border-orange-100 p-2 rounded-lg text-orange-800 italic text-xs mb-2">"{e.commentaire}"</div>
          )}
          
          <div className="flex items-center justify-between">
            <div className="text-xs text-gray-400 mt-2 flex items-center gap-1">
              <div className="w-4 h-4 bg-gray-100 rounded-full flex items-center justify-center font-bold text-[8px] text-gray-500 uppercase">{e.userName.substring(0, 2)}</div> {e.userName}
            </div>
            {e.signature?.dateModification && (
              <p className="text-[10px] text-orange-500 mt-2 font-bold select-none text-right">
                Modifié par {e.signature.modifiePar} (Vu)
              </p>
            )}
          </div>
        </div>

        {photos.length > 0 && (
          <div className="mt-2 pt-2 border-t border-gray-100">
            <button 
              onClick={() => setShowPhotos(!showPhotos)}
              className="flex items-center gap-2 text-xs font-bold text-crousty-purple hover:text-crousty-pink transition-colors"
            >
              <ImageIcon size={14} /> {showPhotos ? 'Masquer les photos' : (photos.length > 1 ? `Voir les ${photos.length} photos` : `Voir la photo`)}
            </button>
            {showPhotos && (
              <div className={`mt-2 grid gap-2 ${photos.length > 1 ? 'grid-cols-2' : 'grid-cols-1'}`}>
                {photos.map((p, idx) => (
                  <img key={idx} src={p} alt={`Traçabilité ${idx + 1}`} className="w-full h-auto rounded-lg border border-gray-200 shadow-sm" />
                ))}
              </div>
            )}
          </div>
        )}
      </div>
      </>
      )}
    </Card>
  );
};
