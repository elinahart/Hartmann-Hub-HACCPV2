import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import { getStoredData, setStoredData } from './db';
import { AppConfig } from './configSchema';

const ALL_KEYS = [
  'crousty-config',
  'crousty_unified_products',
  'crousty_inventory',
  'crousty_inventory_draft',
  'crousty_temp_checklist',
  'crousty_viandes',
  'crousty_tracabilite_v2',
  'crousty_receptions_v3',
  'crousty_cleaning',
  'crousty_oil_checklist',
  'crousty-temperatures-zones',
  'crousty_huiles_cuves',
  'crousty-nettoyage-taches',
  'crousty_fournisseurs',
  'crousty_employees',
  'crousty-catalogue-produits',
  'crousty_catalogue_v2',
  'crousty_print_settings',
  'app_print_settings',
];

export const createFullRestaurantBackup = async (restaurantName: string) => {
  const zip = new JSZip();
  
  const manifest = {
    type: 'crousty-full-backup',
    version: 1,
    date: new Date().toISOString(),
    restaurantName
  };
  
  zip.file('manifest.json', JSON.stringify(manifest, null, 2));

  for (const key of ALL_KEYS) {
    const raw = localStorage.getItem(key);
    if (raw) {
      zip.file(`${key}.json`, raw);
    }
  }

  const blob = await zip.generateAsync({ type: 'blob' });
  const safeName = restaurantName.replace(/\s+/g, '-').toLowerCase() || 'restaurant';
  saveAs(blob, `${safeName}-backup-complet-${new Date().toISOString().split('T')[0]}.zip`);
};

export const importFullRestaurantBackup = async (file: File): Promise<{success: boolean, message: string}> => {
  try {
    const zip = new JSZip();
    const content = await zip.loadAsync(file);
    
    const manifestFile = content.file("manifest.json");
    if (!manifestFile) {
      throw new Error("Format invalide : manifest.json introuvable.");
    }
    
    const manifestStr = await manifestFile.async("string");
    const manifest = JSON.parse(manifestStr);
    
    if (manifest.type !== 'crousty-full-backup') {
      throw new Error("Format de fichier non supporté. Ce n'est pas une sauvegarde complète valide.");
    }
    
    let importedKeys = 0;
    
    for (const key of ALL_KEYS) {
      const f = content.file(`${key}.json`);
      if (f) {
        const fileContent = await f.async("string");
        // Verify JSON validity
        JSON.parse(fileContent);
        localStorage.setItem(key, fileContent);
        importedKeys++;
      }
    }
    
    // Reload page to apply new config globally
    return { success: true, message: `Sauvegarde restaurée avec succès (${importedKeys} fichiers importés). Redémarrage de l'application...` };
  } catch (err: any) {
    return { success: false, message: err.message || "Erreur lors de la lecture du fichier ZIP." };
  }
};
