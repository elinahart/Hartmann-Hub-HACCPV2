import React, { useState, useEffect, useMemo } from 'react';
import { Card, Button, Input, Label } from '../components/ui/LightUI';
import { getStoredData, setStoredData, savePhoto, getPhoto, deletePhoto } from '../lib/db';
import { Camera, Image as ImageIcon, Trash2, Check, X, ScanBarcode, Search, FileText, Package, ChevronRight } from 'lucide-react';
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
  photoId: string;
  commentaire?: string;
  userId: string;
  userName: string;
  signature?: SignatureSaisie;
  supprime?: boolean;
}

export default function Tracabilite() {
  const { currentUser } = useAuth();
  const { t } = useI18n();
  const { products } = useInventaire();
  const [entries, setEntries] = useState<TracabiliteEntry[]>([]);
  
  const [produit, setProduit] = useState('');
  const [numeroLot, setNumeroLot] = useState('');
  const [dlc, setDlc] = useState('');
  const [commentaire, setCommentaire] = useState('');
  const [photoDataUrl, setPhotoDataUrl] = useState<string | null>(null);
  
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [editId, setEditId] = useState<string | null>(null);
  const [editData, setEditData] = useState<TracabiliteEntry | null>(null);
  const [editMotif, setEditMotif] = useState('');
  
  const [error, setError] = useState('');
  const [isQRScannerOpen, setIsQRScannerOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);

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

  const handleScan = (decodedText: string) => {
    // Attempt standard barcode parse: 
    // Typically, standard scanning apps or inventory labels might just emit a string
    // GS1 formats are complex, doing a basic set for demonstration.
    // Let's assume the user scans a label that has properties, or just sets it as 'numeroLot'.

    let decoded = decodedText.trim();
    
    // Very basic json parsing heuristic
    if (decoded.startsWith('{') && decoded.endsWith('}')) {
      try {
        const data = JSON.parse(decoded);
        if (data.produit) setProduit(data.produit);
        if (data.lot) setNumeroLot(data.lot);
        if (data.dlc) setDlc(data.dlc);
        return;
      } catch (e) {
        // ignore JSON parse error, fallback
      }
    }

    // fallback: just put the whole string in numeroLot if it looks like an identifier.
    // Or if it contains 'http', it might be a link, so we store it in commentaire.
    if (decoded.startsWith('http')) {
      setCommentaire(`Lien scanné: ${decoded}`);
    } else {
      setNumeroLot(decoded);
    }
  };

  const handleCapture = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) {
      e.target.value = '';
      return;
    }

    try {
      const dataUrl = await compressPhotoTLC(file);
      setPhotoDataUrl(dataUrl);
    } catch (err) {
      console.error("Compression erreur:", err);
      // Fallback
      const reader = new FileReader();
      reader.onload = (event) => {
        setPhotoDataUrl(event.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
    e.target.value = '';
  };

  const handleManualSubmit = async () => {
    if (!produit) {
      setError('Veuillez sélectionner un produit de l\'inventaire');
      return;
    }
    
    if (!photoDataUrl) {
      setError('Photo obligatoire pour la traçabilité');
      return;
    }

    const photoId = `trac_photo_${Date.now()}`;
    await savePhoto(photoId, photoDataUrl);
    
    const mobileWorker = localStorage.getItem('crousty_mobile_worker');
    const uName = currentUser?.name || mobileWorker || 'Inconnu';
    const newEntry: TracabiliteEntry = {
      id: Date.now().toString(),
      date: new Date().toISOString(),
      produit,
      numeroLot: numeroLot || 'N/A',
      dlc: dlc || 'N/A',
      photoId,
      commentaire,
      userId: currentUser?.id || '0',
      userName: uName,
      signature: createSignature(currentUser || null)
    };

    const updated = [newEntry, ...entries];
    setEntries(updated);
    setStoredData('crousty_tracabilite_v2', updated);
    
    setProduit('');
    setNumeroLot('');
    setDlc('');
    setCommentaire('');
    setPhotoDataUrl(null);
    setError('');
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
        <div className="mb-4">
          <h2 className="text-lg font-black text-crousty-dark">Nouvelle Ouverture</h2>
        </div>
        
        {error && <div className="bg-red-50 text-red-600 p-3 rounded-xl mb-4 text-sm font-bold border border-red-100">{error}</div>}

        <div className="space-y-6">
          <div className="relative">
            <Label className="text-sm font-black text-gray-700 mb-2 flex items-center gap-2">
               <Package size={16} className="text-gray-500" /> Produit <span className="text-red-500">*</span>
            </Label>
            <button
               onClick={() => setIsProductModalOpen(true)}
               className={cn(
                 "w-full h-14 rounded-2xl border-2 transition-all text-left px-4 flex items-center justify-between",
                 produit ? "border-green-500 bg-green-50/30 text-green-900 font-black text-lg" : "border-gray-100 bg-gray-50/50 text-gray-400 font-bold"
               )}
            >
              <span>{produit || "Sélectionner un produit"}</span>
              <ChevronRight size={20} className="text-gray-400" />
            </button>
          </div>

          <div className="pt-2">
            <Label className="text-sm font-black text-gray-700 mb-3 flex items-center gap-2">
              <Camera size={16} className="text-gray-500" /> Photo de l'étiquette / du produit <span className="text-red-500">*</span>
            </Label>
            {!photoDataUrl ? (
              <div className="grid grid-cols-2 gap-3">
                <div className="relative group">
                  <input 
                    type="file"
                    accept="image/*"
                    capture="environment"
                    onChange={handleCapture}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                  />
                  <div className="w-full h-32 flex flex-col items-center justify-center gap-2 border-2 border-dashed border-gray-200 bg-gray-50 rounded-2xl group-hover:border-crousty-purple group-hover:bg-crousty-purple/5 transition-all">
                    <div className="w-10 h-10 bg-white rounded-xl shadow-sm flex items-center justify-center text-gray-400 group-hover:text-crousty-purple">
                      <Camera size={20} />
                    </div>
                    <span className="text-[10px] font-black uppercase tracking-widest text-gray-500 text-center">Appareil Photo</span>
                  </div>
                </div>
                <div className="relative group">
                  <input 
                    type="file"
                    accept="image/*"
                    onChange={handleCapture}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                  />
                  <div className="w-full h-32 flex flex-col items-center justify-center gap-2 border-2 border-dashed border-gray-200 bg-gray-50 rounded-2xl group-hover:border-crousty-purple group-hover:bg-crousty-purple/5 transition-all">
                    <div className="w-10 h-10 bg-white rounded-xl shadow-sm flex items-center justify-center text-gray-400 group-hover:text-crousty-purple">
                      <ImageIcon size={20} />
                    </div>
                    <span className="text-[10px] font-black uppercase tracking-widest text-gray-500 text-center">Galerie</span>
                  </div>
                </div>
                <div className="col-span-2 text-center mt-1">
                  <span className="text-gray-400 text-xs font-bold uppercase tracking-widest">Photo obligatoire pour validation</span>
                </div>
              </div>
            ) : (
               <div className="relative rounded-[2.5rem] overflow-hidden border-4 border-white shadow-xl aspect-video sm:aspect-auto sm:h-64 group">
                 <img src={photoDataUrl} alt="Aperçu" className="w-full h-full object-cover" />
                 <div className="absolute top-4 right-4 flex items-center justify-center">
                    <button 
                      onClick={() => setPhotoDataUrl(null)} 
                      className="bg-white/90 backdrop-blur-md text-red-500 px-4 py-2 rounded-xl shadow-lg border border-red-100 font-bold text-sm flex items-center gap-2 active:scale-95 transition-all"
                    >
                      <Trash2 size={16} /> Effacer la photo
                    </button>
                 </div>
               </div>
            )}
          </div>
          
          <div className="bg-gray-50 p-6 rounded-[2.5rem] border border-gray-100 space-y-4">
             <div className="flex items-center gap-2 mb-2">
                <div className="h-px bg-gray-200 flex-1"></div>
                <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-2">Informations facultatives</span>
                <div className="h-px bg-gray-200 flex-1"></div>
             </div>

             <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
               <div>
                 <Label className="text-[10px] uppercase font-black tracking-widest text-gray-400">Numéro de Lot</Label>
                 <div className="flex gap-2">
                   <Input 
                     value={numeroLot} 
                     onChange={(e: any) => setNumeroLot(e.target.value)}
                     placeholder="Ex: L12345"
                     className="bg-white border-none h-12 rounded-xl"
                   />
                   <button 
                     onClick={() => setIsQRScannerOpen(true)}
                     className="bg-white text-crousty-purple border border-gray-100 hover:border-crousty-purple transition-all rounded-xl w-12 h-12 shrink-0 flex items-center justify-center shadow-sm"
                     title="Scanner"
                   >
                     <ScanBarcode size={20} />
                   </button>
                 </div>
               </div>
               <div>
                 <Label className="text-[10px] uppercase font-black tracking-widest text-gray-400">Date Limite (DLC/DDM)</Label>
                 <Input 
                   type="date"
                   value={dlc} 
                   onChange={(e: any) => setDlc(e.target.value)}
                   className="bg-white border-none h-12 rounded-xl"
                 />
               </div>
             </div>

             <div>
               <Label className="text-[10px] uppercase font-black tracking-widest text-gray-400">Commentaires additionnels</Label>
               <Input 
                 value={commentaire} 
                 onChange={(e: any) => setCommentaire(e.target.value)}
                 placeholder="Remarques éventuelles..."
                 className="bg-white border-none h-12 rounded-xl"
               />
             </div>
          </div>
          
          <Button 
            onClick={handleManualSubmit} 
            disabled={!produit || !photoDataUrl}
            className={cn(
              "w-full h-16 text-lg font-black rounded-2xl shadow-xl transition-all duration-300",
              (!produit || !photoDataUrl) 
                ? "bg-gray-100 text-gray-400 cursor-not-allowed" 
                : "bg-crousty-purple text-white hover:bg-crousty-purple/90 active:scale-[0.98] shadow-purple-200"
            )}
          >
            <Check size={24} className="mr-3" /> Enregistrer la traçabilité
          </Button>
        </div>
      </Card>

      <div className="space-y-4">
        <h3 className="font-bold text-gray-500 px-2">HISTORIQUE DES OUVERTURES</h3>
        {entries.filter(e => !e.supprime).map(e => (
          <TracabiliteItem 
            key={e.id} 
            e={e} 
            deleteId={deleteId} 
            setDeleteId={setDeleteId} 
            confirmDelete={confirmDelete} 
          />
        ))}
        {entries.length === 0 && (
          <div className="text-center py-8 text-gray-400">Aucun produit scanné</div>
        )}
      </div>
      {isProductModalOpen && createPortal(
        <div className="fixed inset-0 z-[500] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white w-full max-w-2xl rounded-[2rem] overflow-hidden relative shadow-2xl h-[90dvh] flex flex-col">
            <div className="flex items-center justify-between p-6 bg-white border-b border-gray-100 shrink-0">
              <h2 className="text-2xl font-black text-gray-800 tracking-tight flex items-center gap-3">
                <Package className="text-crousty-purple" size={28} />
                Sélectionner un produit
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
                  placeholder="Rechercher un produit..."
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
                              setProduit(p.name);
                              setIsProductModalOpen(false);
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
  const [photo, setPhoto] = useState<string | null>(null);

  useEffect(() => {
    getPhoto(e.photoId).then(data => {
      if (data) setPhoto(data);
    });
  }, [e.photoId]);

  return (
    <Card className="p-4 relative">
       {editId === e.id && editData ? (
         <div className="space-y-4 relative z-10 w-full">
            <div className="bg-orange-50 p-3 rounded-xl border border-orange-200">
               <Label className="text-orange-800 font-bold">⚠️ Motif de modification (obligatoire)</Label>
               <Input value={editMotif} onChange={ev => setEditMotif(ev.target.value)} placeholder="Ex: Erreur de frappe..." className="mt-1" />
            </div>
            <div>
               <Label>Produit <span className="text-red-500 font-bold">*</span></Label>
               <Input value={editData.produit} onChange={ev => setEditData({...editData, produit: ev.target.value})} />
            </div>
            <div className="grid grid-cols-2 gap-2">
               <div>
                  <Label>Lot <span className="text-gray-400 font-medium">(optionnel)</span></Label>
                  <Input value={editData.numeroLot} onChange={ev => setEditData({...editData, numeroLot: ev.target.value})} />
               </div>
               <div>
                  <Label>DLC <span className="text-gray-400 font-medium">(optionnel)</span></Label>
                  <Input type="date" value={editData.dlc} onChange={ev => setEditData({...editData, dlc: ev.target.value})} />
               </div>
            </div>
            <div>
               <Label>Commentaire</Label>
               <Input value={editData.commentaire || ''} onChange={ev => setEditData({...editData, commentaire: ev.target.value})} />
            </div>
            <div className="flex gap-2 justify-end mt-4">
               <Button variant="secondary" onClick={() => setEditId(null)}>Annuler</Button>
               <Button onClick={handleEditSave} icon={Check}>Enregistrer</Button>
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

      <div className="flex gap-4">
        {photo ? (
          <img src={photo} alt="Photo du produit" className="w-24 h-24 mt-1 object-cover rounded-xl border border-gray-200" />
        ) : (
          <div className="w-24 h-24 mt-1 bg-gray-100 rounded-xl flex items-center justify-center text-gray-300">
            <ImageIcon size={32} />
          </div>
        )}
        <div className="flex-1 min-w-0 pr-16 border-l border-gray-100 pl-4">
          <div className="font-bold text-crousty-purple bg-crousty-purple/10 inline-block px-2 py-1 rounded-lg text-xs mb-2">
            Ouvert le {format(new Date(e.date), "dd MMM yyyy 'à' HH:mm", { locale: fr })}
          </div>
          
          <h4 className="font-black text-gray-800 text-lg leading-tight mb-1 truncate">{e.produit}</h4>
          
          <div className="grid grid-cols-2 gap-2 text-xs mb-2">
            <div className="text-gray-500">Lot: <span className="font-bold text-gray-700">{e.numeroLot}</span></div>
            <div className="text-gray-500">DLC: <span className="font-bold text-crousty-purple">{e.dlc !== 'N/A' ? new Date(e.dlc).toLocaleDateString() : 'N/A'}</span></div>
          </div>
          
          {e.commentaire && (
            <div className="bg-gray-50 p-2 rounded-lg text-gray-600 italic text-xs mb-2 truncate">"{e.commentaire}"</div>
          )}
          
          <div className="flex items-center justify-between">
            <div className="text-xs text-gray-400 mt-2 border-t border-gray-100 pt-2 flex items-center gap-1">
              <div className="w-4 h-4 bg-gray-100 rounded-full flex items-center justify-center font-bold text-[8px] text-gray-500 uppercase">{e.userName.substring(0, 2)}</div> {e.userName}
            </div>
            {e.signature?.dateModification && (
              <p className="text-[10px] text-orange-500 mt-2 font-bold select-none border-t border-gray-100 pt-2 text-right">
                Modifié par {e.signature.modifiePar} (Vu)
              </p>
            )}
          </div>
        </div>
      </div>
      </>
      )}
    </Card>
  );
};
