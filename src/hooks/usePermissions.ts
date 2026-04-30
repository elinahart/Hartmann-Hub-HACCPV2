import { useAuth } from '../contexts/AuthContext';
import { SignatureSaisie } from '../types';

interface SaisieWithSignature {
  signature?: SignatureSaisie;
  responsable?: string;
  [key: string]: any;
}

export function usePermissions(saisie?: SaisieWithSignature) {
  const { currentUser } = useAuth();
  
  if (!currentUser) {
    return { peutModifier: false, peutSupprimer: false, raisonBlocage: "Non connecté" };
  }

  const isManager = currentUser.role === 'manager';

  let isAuteur = false;
  let auteurPrenom = "Inconnu";

  if (saisie?.signature) {
    isAuteur = saisie.signature.auteurId === currentUser.id;
    auteurPrenom = saisie.signature.auteurPrenom;
  } else if (saisie?.responsable) {
    // Legacy support where only "responsable" was saved
    isAuteur = saisie.responsable === currentUser.name;
    auteurPrenom = saisie.responsable;
  } else {
    // If it's a global entity like a product created without a signature
    isAuteur = false;
  }

  const peutModifier = isManager || isAuteur;
  const peutSupprimer = peutModifier; 

  let raisonBlocage = null;
  if (!peutModifier) {
    raisonBlocage = `🔒 Saisie par ${auteurPrenom}`;
  }

  return { peutModifier, peutSupprimer, raisonBlocage, isManager, isAuteur };
}
