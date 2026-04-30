import React, { useState, useEffect } from 'react';
import { Card, Input, Label, Button, Select } from '../components/ui/LightUI';
import { getStoredData, setStoredData, savePhoto, deletePhoto, getPhoto } from '../lib/db';
import { Camera, Trash2, Check, CheckCircle2, X, ImageIcon, Plus, Trash } from 'lucide-react';
import { createSignature } from '../lib/permissions';
import { SaisieActions } from '../components/SaisieActions';
import { SignatureSaisie } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { useConfig } from '../contexts/ConfigContext';
import { useAutoDraft } from '../hooks/useAutoDraft';
import { logAuditEvent } from '../lib/audit';
import { StatusBadge } from '../components/ui/StatusBadge';

import { compressPhotoTLC } from '../lib/imageUtils';

export interface ReceptionProductLine {
  id: string;
  produit: string;
  quantite: string;
  numeroLot: string;
  dlc: string;
  temperature?: string;
}

export interface ReceptionEntry {
  id: string;
  date: string;
  fournisseur: string;
  lignes: ReceptionProductLine[];
  commentaire?: string;
  photoId?: string;
  responsable: string;
  signature?: SignatureSaisie;
  supprime?: boolean;
}

const ReceptionCard = ({ e, confirmDelete, deleteId, setDeleteId, currentUser }: any) => {
  const [photo, setPhoto] = useState<string | null>(null);
  const [showPhoto, setShowPhoto] = useState(false);

  useEffect(() => {
    if (e.photoId) {
      getPhoto(e.photoId).then(data => {
        if (data) setPhoto(data);
      });
    }
  }, [e.photoId]);

  return (
    <Card className="text-sm relative group overflow-hidden p-4">
      {deleteId === e.id ? (
        <div className="absolute top-2 right-2 flex items-center gap-2 bg-red-50 p-1 rounded-lg z-10">
          <span className="text-xs text-red-600 font-bold px-1">Sûr ?</span>
          <button onClick={() => confirmDelete(e.id)} className="p-1 text-red-600 hover:text-red-800"><Check size={16}/></button>
          <button onClick={() => setDeleteId(null)} className="p-1 text-gray-500 hover:text-gray-700"><X size={16}/></button>
        </div>
      ) : (
        <div className="absolute top-2 right-2 z-10">
          <SaisieActions saisie={e} onDelete={() => setDeleteId(e.id)} inline={true} />
        </div>
      )}
      
      <div className="text-gray-800 font-black mb-1 text-lg pr-8">{e.fournisseur}</div>
      <div className="text-xs text-gray-400 mb-3 border-b border-gray-100 pb-2">
        Le {new Date(e.date).toLocaleString('fr-FR')} • Par {e.responsable || 'Inconnu'}
      </div>

      <div className="space-y-3 mb-3">
        {e.lignes && e.lignes.map((ligne: ReceptionProductLine) => (
          <div key={ligne.id} className="bg-gray-50 p-3 rounded-xl border border-gray-100">
            <div className="font-bold text-gray-800 mb-1">{ligne.produit} <span className="text-sm font-bold text-gray-500">({ligne.quantite})</span></div>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="text-gray-500">Lot: <span className="font-bold text-gray-700">{ligne.numeroLot}</span></div>
              <div className="text-gray-500">DLC: <span className="text-crousty-purple font-bold">{new Date(ligne.dlc).toLocaleDateString()}</span></div>
              {ligne.temperature && <div className="text-gray-500">Temp: <span className="font-bold text-gray-700">{ligne.temperature}°C</span></div>}
            </div>
          </div>
        ))}
      </div>
      
      {e.commentaire && <div className="bg-orange-50 p-2 rounded-lg text-orange-800 italic text-xs mb-2 border border-orange-100">"{e.commentaire}"</div>}
      
      {photo && (
        <div className="mt-3 pt-3 border-t border-gray-100">
          <button 
            onClick={() => setShowPhoto(!showPhoto)}
            className="flex items-center gap-2 text-xs font-bold text-crousty-purple hover:text-crousty-pink transition-colors"
          >
            <ImageIcon size={14} /> {showPhoto ? 'Masquer le bon de livraison' : 'Voir le bon de livraison'}
          </button>
          {showPhoto && (
            <img src={photo} alt="Bon" className="mt-2 w-full h-auto rounded-lg border border-gray-200 shadow-sm" />
          )}
        </div>
      )}
    </Card>
  );
};

export default function Receptions() {
  const { currentUser } = useAuth();
  const { config } = useConfig();
  const [entries, setEntries] = useState<ReceptionEntry[]>([]);
  
  const [draft, setDraft, clearDraft, isDraftRestored] = useAutoDraft('reception_v3', {
    fournisseur: '',
    lignes: [{ id: '1', produit: '', quantite: '', numeroLot: '', dlc: '', temperature: '' }],
    commentaire: ''
  });

  const [isCustomFournisseur, setIsCustomFournisseur] = useState(false);

  const fournisseur = draft.fournisseur;
  const setFournisseur = (v: string) => setDraft(p => ({ ...p, fournisseur: v }));

  useEffect(() => {
    if (isDraftRestored && fournisseur && !config.fournisseurs?.includes(fournisseur)) {
      setIsCustomFournisseur(true);
    }
  }, [isDraftRestored, fournisseur, config.fournisseurs]);
  
  const lignes = draft.lignes;
  const setLignes = (v: ReceptionProductLine[] | ((prev: ReceptionProductLine[]) => ReceptionProductLine[])) => 
    setDraft(p => ({ ...p, lignes: typeof v === 'function' ? v(p.lignes) : v }));
    
  const commentaire = draft.commentaire;
  const setCommentaire = (v: string) => setDraft(p => ({ ...p, commentaire: v }));

  const [photoDataUrl, setPhotoDataUrl] = useState<string | null>(null);
  
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    let data = getStoredData<any[]>('crousty_receptions_v3', []);
    if (data.length === 0) {
      const oldData = getStoredData<any[]>('crousty_receptions_v2', []);
      if (oldData.length > 0) {
        data = oldData.map(old => ({
          id: old.id,
          date: old.date,
          fournisseur: old.fournisseur,
          commentaire: old.commentaire,
          photoId: old.photoId,
          responsable: old.responsable,
          lignes: [
            {
              id: Date.now().toString() + Math.random(),
              produit: old.produit || 'Inconnu',
              quantite: old.quantite || '1',
              numeroLot: old.numeroLot || 'N/A',
              dlc: old.dlc || new Date().toISOString(),
              temperature: old.temperature || ''
            }
          ]
        }));
        setStoredData('crousty_receptions_v3', data);
      }
    }
    setEntries(data);
  }, []);

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
      const reader = new FileReader();
      reader.onload = (event) => {
        setPhotoDataUrl(event.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
    e.target.value = '';
  };

  const addLigne = () => {
    setLignes([...lignes, { id: Date.now().toString() + Math.random(), produit: '', quantite: '', numeroLot: '', dlc: '', temperature: '' }]);
  };

  const updateLigne = (id: string, field: keyof ReceptionProductLine, value: string) => {
    setLignes(lignes.map(l => l.id === id ? { ...l, [field]: value } : l));
  };

  const removeLigne = (id: string) => {
    if (lignes.length > 1) {
      setLignes(lignes.filter(l => l.id !== id));
    }
  };

  const handleManualSubmit = async (e?: React.MouseEvent) => {
    e?.preventDefault();
    if (isSubmitting) return;
    
    try {
      setIsSubmitting(true);
      setError('');
      setSuccess('');
      
      if (!fournisseur) {
        setError("Veuillez indiquer le fournisseur.");
        setIsSubmitting(false);
        return;
      }
      
      const isLignesValid = lignes.every(l => l.produit && l.quantite && l.numeroLot && l.dlc);
      if (!isLignesValid) {
        setError("Veuillez remplir les champs obligatoires (Produit, Qté, Lot, DLC) pour toutes les lignes.");
        setIsSubmitting(false);
        return;
      }

      const id = Date.now().toString();
      const photoId = photoDataUrl ? `recept_bon_${id}` : undefined;

      if (photoDataUrl && photoId) {
        await savePhoto(photoId, photoDataUrl);
      }

      const rawWorker = localStorage.getItem('crousty_mobile_worker');
      const mobileWorker = rawWorker ? rawWorker.charAt(0).toUpperCase() + rawWorker.slice(1).toLowerCase() : 'Inconnu';
      
      const entry: ReceptionEntry = {
        id, 
        date: new Date().toISOString(), 
        fournisseur,
        lignes,
        commentaire,
        photoId, 
        responsable: currentUser?.name || mobileWorker,
        signature: createSignature(currentUser || null)
      };

      const updated = [entry, ...entries];
      setEntries(updated);
      setStoredData('crousty_receptions_v3', updated);

      logAuditEvent({
        type: 'create',
        module: 'reception',
        action: 'Réception fournisseur',
        userName: entry.responsable,
        userId: currentUser?.id,
        source: currentUser ? 'hub' : 'mobile',
        details: { fournisseur, lignesCount: lignes.length },
        status: 'success'
      });

      clearDraft();
      setPhotoDataUrl(null);
      setError('');
      setSuccess(`Réception de ${fournisseur} enregistrée !`);
      
      setTimeout(() => setSuccess(''), 4000);
      
      // Dispatch event for mobile app to auto-sync
      window.dispatchEvent(new Event('crousty_data_changed'));
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Erreur lors de l'enregistrement de la réception.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const confirmDelete = async (id: string) => {
    const entry = entries.find(e => e.id === id);
    const updated = entries.map(e => e.id === id ? { ...e, supprime: true } : e);
    setEntries(updated);
    setStoredData('crousty_receptions_v3', updated);
    setDeleteId(null);

    if (entry) {
      logAuditEvent({
        type: 'delete',
        module: 'reception',
        action: 'Suppression réception',
        userName: currentUser?.name || 'Inconnu',
        userId: currentUser?.id,
        source: 'hub',
        details: { receptionId: id, fournisseur: entry.fournisseur },
        status: 'warning'
      });
    }
  };

  return (
    <div className="space-y-6">
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-black text-crousty-dark">Nouvelle Réception</h2>
          {isDraftRestored && <StatusBadge status="draft" label="Brouillon en cours" />}
        </div>
        
        <div className="space-y-6">
          <div className="space-y-3">
            <Label>Fournisseur *</Label>
            <div className="space-y-2">
              <Select 
                value={isCustomFournisseur ? 'custom' : fournisseur} 
                onChange={(e: any) => {
                  if (e.target.value === 'custom') {
                    setIsCustomFournisseur(true);
                    setFournisseur('');
                  } else {
                    setIsCustomFournisseur(false);
                    setFournisseur(e.target.value);
                  }
                }}
              >
                <option value="" disabled>Sélectionnez un fournisseur</option>
                {config.fournisseurs?.map(f => (
                  <option key={f} value={f}>{f}</option>
                ))}
                <option value="custom" className="italic font-bold">Personnalisé...</option>
              </Select>
              {isCustomFournisseur && (
                <Input 
                  value={fournisseur} 
                  onChange={(e: any) => setFournisseur(e.target.value)} 
                  placeholder="Entrez le nom du fournisseur" 
                  autoFocus
                />
              )}
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-gray-100 pb-2">
              <h3 className="font-bold text-gray-800 text-sm">Produits réceptionnés</h3>
              <span className="text-xs font-bold text-gray-400">{lignes.length} {lignes.length > 1 ? 'articles' : 'article'}</span>
            </div>
            
            {lignes.map((ligne, index) => (
              <div key={ligne.id} className="bg-gray-50 rounded-2xl p-4 border border-gray-200 relative">
                {lignes.length > 1 && (
                  <button 
                    onClick={() => removeLigne(ligne.id)}
                    className="absolute top-2 right-2 w-8 h-8 flex items-center justify-center bg-white text-red-500 rounded-full hover:bg-red-50 shadow-sm active:scale-95 transition-all"
                  >
                    <Trash size={16} />
                  </button>
                )}
                <div className="font-bold text-crousty-purple mb-3 text-sm flex items-center gap-2">
                  <div className="w-5 h-5 rounded-full bg-crousty-purple text-white flex items-center justify-center text-xs">
                    {index + 1}
                  </div>
                  Ligne produit
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <div>
                    <Label>Produit *</Label>
                    <Input value={ligne.produit} onChange={(e: any) => updateLigne(ligne.id, 'produit', e.target.value)} placeholder="Ex: Cordon Bleu..." />
                  </div>
                  <div>
                    <Label>Quantité *</Label>
                    <Input value={ligne.quantite} onChange={(e: any) => updateLigne(ligne.id, 'quantite', e.target.value)} placeholder="Ex: 5 cartons" />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <Label>Numéro de Lot *</Label>
                    <Input value={ligne.numeroLot} onChange={(e: any) => updateLigne(ligne.id, 'numeroLot', e.target.value)} placeholder="Ex: L12345" />
                  </div>
                  <div>
                    <Label>DLC / DDM *</Label>
                    <Input type="date" value={ligne.dlc} onChange={(e: any) => updateLigne(ligne.id, 'dlc', e.target.value)} />
                  </div>
                  <div>
                    <Label>Température (°C)</Label>
                    <Input type="number" inputMode="decimal" value={ligne.temperature || ''} onChange={(e: any) => updateLigne(ligne.id, 'temperature', e.target.value)} placeholder="Optionnel" />
                  </div>
                </div>
              </div>
            ))}
            
            <button 
              onClick={addLigne}
              className="w-full flex items-center justify-center gap-2 py-4 rounded-xl border-2 border-dashed border-crousty-purple/30 text-crousty-purple font-bold hover:bg-crousty-purple/5 hover:border-crousty-purple transition-all"
            >
              <Plus size={20} /> Ajouter un autre produit
            </button>
          </div>

          <div>
            <Label>Commentaire ou incident de réception (Optionnel)</Label>
            <Input value={commentaire} onChange={(e: any) => setCommentaire(e.target.value)} placeholder="Colis abimé, retard..." />
          </div>

          <div className="pt-2">
            <Label className="mb-2 block">Bon de livraison (Photo optionnelle)</Label>
            {!photoDataUrl ? (
              <div className="grid grid-cols-2 gap-3">
                <div className="relative">
                  <input 
                    type="file" 
                    accept="image/*" 
                    capture="environment" 
                    onChange={handleCapture} 
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" 
                  />
                  <Button variant="outline" className="w-full h-auto flex flex-col items-center justify-center gap-2 border-dashed py-4 bg-gray-50 hover:bg-crousty-pink/5 border-gray-300 hover:border-crousty-purple px-2">
                    <Camera size={20} className="text-gray-400" /> <span className="text-[10px] uppercase tracking-wider text-gray-500 font-bold">Appareil Photo</span>
                  </Button>
                </div>
                <div className="relative">
                  <input 
                    type="file" 
                    accept="image/*" 
                    onChange={handleCapture} 
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" 
                  />
                  <Button variant="outline" className="w-full h-auto flex flex-col items-center justify-center gap-2 border-dashed py-4 bg-gray-50 hover:bg-crousty-pink/5 border-gray-300 hover:border-crousty-purple px-2">
                    <ImageIcon size={20} className="text-gray-400" /> <span className="text-[10px] uppercase tracking-wider text-gray-500 font-bold">Galerie</span>
                  </Button>
                </div>
              </div>
            ) : (
               <div className="relative rounded-xl overflow-hidden border border-gray-200">
                 <img src={photoDataUrl} alt="Aperçu" className="w-full h-48 object-cover" />
                 <button onClick={() => setPhotoDataUrl(null)} className="absolute top-2 right-2 bg-red-500 text-white p-2 rounded-full shadow-lg">
                   <Trash2 size={16} />
                 </button>
               </div>
            )}
          </div>
          
          {error && <div className="bg-red-50 text-red-600 p-3 rounded-xl scale-in-center animate-in text-sm font-bold border border-red-100 mt-2">{error}</div>}
          {success && <div className="bg-green-50 text-green-700 p-4 rounded-xl scale-in-center animate-in text-sm font-black border border-green-200 flex items-center gap-2 shadow-sm mt-2"><CheckCircle2 className="text-green-500 shrink-0" size={20} /> {success}</div>}

          <Button type="button" disabled={isSubmitting} onClick={handleManualSubmit} className="w-full py-4 text-base shadow-md mt-4 transition-all">
            {isSubmitting ? (
              <div className="w-6 h-6 border-4 border-white border-t-transparent rounded-full animate-spin"></div>
            ) : (
              <><Check size={20} className="mr-2" /> Valider la réception</>
            )}
          </Button>
        </div>
      </Card>

      <h3 className="font-black text-gray-800 text-lg ml-2">Historique des Réceptions</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {entries.filter(e => !e.supprime).map(e => (
          <ReceptionCard key={e.id} e={e} confirmDelete={confirmDelete} deleteId={deleteId} setDeleteId={setDeleteId} currentUser={currentUser} />
        ))}
        {entries.filter(e => !e.supprime).length === 0 && (
          <div className="col-span-full p-8 text-center text-gray-400 font-bold bg-white rounded-3xl border border-gray-100 shadow-sm transition-all text-sm">
            Aucune réception enregistrée.
          </div>
        )}
      </div>
    </div>
  );
}
