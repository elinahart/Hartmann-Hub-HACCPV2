import { ProductDef } from '../types';

// A. Types de données import/export
export interface GlobalImportExportPayload {
  version: string;
  exportMode: 'global' | 'module';
  moduleName?: string | null;
  exportedAt: string;
  data: any;
}

export interface ImportReportProduits {
  imported: number;
  updated: number;
  ignored: number;
  skipped: number;
  duplicates: number;
  errors: number;
  conflicts: string[];
}

// Helper to normalize strings for comparison
function normalizeString(str: string): string {
  if (!str) return '';
  return str.trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

// B. Fonction de parsing/normalisation de l’import produits
export function parseImportProduits(jsonPayload: any): { produits: ProductDef[], error?: string } {
  if (!jsonPayload || typeof jsonPayload !== 'object') {
    return { produits: [], error: "Format JSON invalide ou vide." };
  }

  // Handle both global and module exports
  let rawProduits: any[] = [];
  
  if (jsonPayload.data) {
    if (jsonPayload.exportMode === 'module' && jsonPayload.moduleName === 'produits') {
      rawProduits = Array.isArray(jsonPayload.data.produits) ? jsonPayload.data.produits : (Array.isArray(jsonPayload.data) ? jsonPayload.data : []);
    } else if (jsonPayload.exportMode === 'global' && Array.isArray(jsonPayload.data.produits)) {
      rawProduits = jsonPayload.data.produits;
    } else {
      return { produits: [], error: "Le fichier ne contient pas de données du module 'produits' ou n'est pas au bon format." };
    }
  } else if (Array.isArray(jsonPayload.produits)) {
    // Retro-compatibility legacy format
    rawProduits = jsonPayload.produits;
  } else {
    return { produits: [], error: "Aucun produit trouvé dans le fichier." };
  }

  const produits: ProductDef[] = [];
  
  for (const raw of rawProduits) {
    if (!raw.name && !raw.nom) continue; // Skip invalid entries

    const name = (raw.name || raw.nom).trim();
    
    // Normalization logic
    const produit: ProductDef = {
      id: raw.id || `import-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      name,
      category: raw.category || raw.categorie || 'Autres',
      dlcValue: Number(raw.dlcValue || raw.dlcValeur || 24),
      dlcUnit: raw.dlcUnit || raw.dlcUnite || 'hours',
      conservation: raw.conservation || '',
      note: raw.note || '',
      icone: raw.icone || raw.icon || undefined,
      iconeCouleur: raw.iconeCouleur || raw.iconColor || undefined,
      readOnly: !!raw.readOnly
    };

    produits.push(produit);
  }

  return { produits };
}

// C. Service d’import catalogue produits
export function importCatalogueProduits(jsonString: string): { success: boolean, message: string, report?: ImportReportProduits } {
  try {
    const payload = JSON.parse(jsonString);
    const parseResult = parseImportProduits(payload);
    
    if (parseResult.error || parseResult.produits.length === 0) {
      return { success: false, message: parseResult.error || "Aucun produit valide trouvé dans le fichier." };
    }

    const { produits: newProduits } = parseResult;

    // Load existing state from the specific Catalogue Source of Truth
    const STORAGE_KEY = 'crousty-catalogue-produits';
    let existingProducts: ProductDef[] = [];
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) existingProducts = JSON.parse(saved);
    } catch {
      // ignore
    }

    const report: ImportReportProduits = { imported: 0, updated: 0, ignored: 0, skipped: 0, duplicates: 0, errors: 0, conflicts: [] };
    const finalProducts = [...existingProducts];

    newProduits.forEach(newP => {
      const normName = normalizeString(newP.name);
      
      // Look for identical ID or identical Name
      const existingIdIdx = finalProducts.findIndex(p => p.id === newP.id);
      const existingNameIdx = finalProducts.findIndex(p => normalizeString(p.name) === normName);

      if (existingIdIdx !== -1) {
        // ID exists: Update it directly (override properties)
        finalProducts[existingIdIdx] = { ...finalProducts[existingIdIdx], ...newP };
        report.updated++;
      } else if (existingNameIdx !== -1) {
        // Name exists but different ID: Deduplicate
        // we can decide to update existing or skip. Let's just update the existing one with new fields to avoid ID changes.
        finalProducts[existingNameIdx] = { ...finalProducts[existingNameIdx], ...newP, id: finalProducts[existingNameIdx].id };
        report.duplicates++;
        report.updated++;
        report.conflicts.push(`Fusionné (doublon par nom) : ${newP.name}`);
      } else {
        // Insert new
        finalProducts.push(newP);
        report.imported++;
      }
    });

    // Save back to local storage
    localStorage.setItem(STORAGE_KEY, JSON.stringify(finalProducts));

    // Force dispatch event across the application so the CatalogueProvider picks it up
    window.dispatchEvent(new CustomEvent('catalogue-produits-updated', { detail: { products: finalProducts } }));

    return { 
      success: true, 
      message: `${report.imported} produits ajoutés, ${report.updated} mis à jour.`,
      report 
    };
  } catch (e: any) {
    return { success: false, message: "Le fichier importé n'est pas un JSON valide." };
  }
}
