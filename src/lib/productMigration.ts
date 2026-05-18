import { getStoredData, setStoredData } from './db';
import { UnifiedProduct } from '../types';
import { DEFAULT_CROUSTY_CONFIG } from './croustyConfig';
import { migrateCategoryName } from './categoriesIcones';

const UNIFIED_STORAGE_KEY = 'crousty_unified_products';

export const migrateProductsToUnified = () => {
  // Try to get unified first
  let existingUnified = getStoredData<UnifiedProduct[]>(UNIFIED_STORAGE_KEY, []);
  
  // If we don't have unified yet, migrate from old storages
  if (!existingUnified || existingUnified.length === 0) {
    const inventoryProducts = getStoredData<any[]>('crousty-inventaire-produits', []);
    let catalogueProducts = getStoredData<any[]>('crousty-catalogue-produits', []);
    
    if (catalogueProducts.length === 0) {
      catalogueProducts = getStoredData<any[]>('crousty_products', []);
    }

    // Si on a rien, on fallback sur le default
    if (catalogueProducts.length === 0) {
      catalogueProducts = DEFAULT_CROUSTY_CONFIG.produits.map(p => ({
        id: p.id,
        name: p.nom,
        category: p.categorie,
        dlcValue: p.dlcValeur,
        dlcUnit: p.dlcUnite === 'jours' ? 'days' : p.dlcUnite === 'heures' ? 'hours' : p.dlcUnite,
        conservation: p.conservation,
        note: p.note,
        icone: p.icone,
        iconeCouleur: p.iconeCouleur,
      }));
    }

    const unifiedDict: Record<string, UnifiedProduct> = {};

    // 1. Ajouter d'abord TOUS les produits d'Inventaire
    inventoryProducts.forEach((invP) => {
      // Normaliser l'id et le nom
      const searchName = (invP.name || '').toLowerCase().trim();
      
      // Trouver la contrepartie Catalogue
      const catP = catalogueProducts.find((cp: any) => 
        (cp.id === invP.id) || ((cp.name || '').toLowerCase().trim() === searchName)
      );

      const merged: UnifiedProduct = {
        id: invP.id || Math.random().toString(36).substring(2, 11),
        name: invP.name || 'Produit Inconnu',
        category: migrateCategoryName(invP.category || catP?.category || 'Autres'), // apply migration here
        
        // Fields from Inventory
        minThreshold: invP.minThreshold !== undefined ? invP.minThreshold : 0,
        fournisseur: invP.fournisseur || '',
        icon: invP.icon || 'Package',
        uniteStock: invP.uniteStock || 'unité',
        uniteAchat: invP.uniteAchat || 'carton',
        conversionCartonUnite: invP.conversionCartonUnite || 5,

        // Fields from Catalogue
        dlcValue: catP ? catP.dlcValue : 24,
        dlcUnit: catP ? catP.dlcUnit : 'hours',
        conservation: catP ? catP.conservation : '',
        note: catP ? catP.note : '',
        icone: catP ? catP.icone : '',
        iconeCouleur: catP ? catP.iconeCouleur : '',
      };
      
      unifiedDict[searchName] = merged;
    });

    // 2. Ajouter les produits du catalogue qui n'étaient pas dans l'inventaire
    catalogueProducts.forEach((catP) => {
      const searchName = (catP.name || '').toLowerCase().trim();
      if (!unifiedDict[searchName]) {
        unifiedDict[searchName] = {
          id: catP.id || Math.random().toString(36).substring(2, 11),
          name: catP.name || 'Produit Inconnu',
          category: migrateCategoryName(catP.category || 'Autres'),
          
          // Fields from Inventory (Defaults)
          minThreshold: 0,
          fournisseur: '',
          icon: 'Package',
          uniteStock: 'unité',
          uniteAchat: 'carton',
          conversionCartonUnite: 5,

          // Fields from Catalogue
          dlcValue: catP.dlcValue || 24,
          dlcUnit: catP.dlcUnit || 'hours',
          conservation: catP.conservation || '',
          note: catP.note || '',
          icone: catP.icone || '',
          iconeCouleur: catP.iconeCouleur || '',
        };
      }
    });

    existingUnified = Object.values(unifiedDict);
  }
  
  // ALWAYS auto-migrate categories & dlc logic on every run (to upgrade any outdated ones)
  let changed = false;
  const migratedUnified = existingUnified.map(p => {
    let pCat = p.category;
    const newCat = migrateCategoryName(pCat);
    
    // Set DLC rules: Sec has false
    let isSec = newCat === 'Sec';
    let newDlcNeeded = p.dlcNeeded;
    if (isSec) newDlcNeeded = false;
    else if (newDlcNeeded === undefined) newDlcNeeded = true;
    
    if (pCat !== newCat || p.dlcNeeded !== newDlcNeeded) {
        changed = true;
    }
    
    return { ...p, category: newCat, dlcNeeded: newDlcNeeded };
  });

  if (changed) {
    setStoredData(UNIFIED_STORAGE_KEY, migratedUnified);
  }

  return migratedUnified;
};
