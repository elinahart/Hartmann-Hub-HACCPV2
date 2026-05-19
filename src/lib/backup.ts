import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import { getStoredData, setStoredData, db, savePhotoBase64 } from './db';
import { AppConfig } from './configSchema';

export const createFullRestaurantBackup = async (restaurantName: string) => {
  const zip = new JSZip();
  
  const manifest = {
    type: 'crousty-full-backup',
    version: 1,
    date: new Date().toISOString(),
    restaurantName
  };
  
  zip.file('manifest.json', JSON.stringify(manifest, null, 2));

  // Determine all relevant keys dynamically
  const allStorageKeys = Object.keys(window.localStorage).filter(k => 
    k.startsWith('crousty_') || 
    k.startsWith('crousty-') || 
    k.startsWith('app_')
  );

  for (const key of allStorageKeys) {
    const raw = localStorage.getItem(key);
    if (raw) {
      zip.file(`data/${key}.json`, raw);
    }
  }

  // Export all photos from IndexedDB
  try {
    const photos = await db.photos.toArray();
    const photosExport: Record<string, string> = {};
    for (const p of photos) {
      photosExport[p.id] = p.dataUrl;
    }
    if (Object.keys(photosExport).length > 0) {
      zip.file('photos.json', JSON.stringify(photosExport));
    }
  } catch (error) {
    console.error("Erreur lors de l'export des photos:", error);
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
    let importedPhotos = 0;
    
    // Process LocalStorage files
    const dataFolder = content.folder("data");
    if (dataFolder) {
      for (const relativePath in dataFolder.files) {
        if (!relativePath.endsWith('.json')) continue;
        
        const f = dataFolder.file(relativePath);
        if (f) {
           const fileContent = await f.async("string");
           try {
             JSON.parse(fileContent); // Validation
             // Key is relativePath without '.json'
             const key = relativePath.replace('.json', '');
             localStorage.setItem(key, fileContent);
             importedKeys++;
           } catch (e) {
             console.warn("Fichier backup invalide ignoré:", relativePath);
           }
        }
      }
    } else {
      // Pour la compatibilité avec les anciens backups ZIP qui étaient à la racine
      for (const relativePath in content.files) {
         if (!relativePath.endsWith('.json') || relativePath === 'manifest.json' || relativePath === 'photos.json') continue;
         const f = content.file(relativePath);
         if (f) {
            const fileContent = await f.async("string");
            try {
              JSON.parse(fileContent);
              const key = relativePath.replace('.json', '');
              localStorage.setItem(key, fileContent);
              importedKeys++;
            } catch(e) {}
         }
      }
    }
    
    // Process Photos
    const photosFile = content.file("photos.json");
    if (photosFile) {
      try {
        const photosStr = await photosFile.async("string");
        const photosData = JSON.parse(photosStr);
        for (const [id, base64] of Object.entries(photosData)) {
          await savePhotoBase64(id, base64 as string);
          importedPhotos++;
        }
      } catch (e) {
        console.error("Erreur lors de l'import des photos:", e);
      }
    }
    
    return { success: true, message: `Sauvegarde restaurée (Clés: ${importedKeys}, Photos: ${importedPhotos}). Redémarrage de l'application...` };
  } catch (err: any) {
    return { success: false, message: err.message || "Erreur lors de la lecture du fichier ZIP." };
  }
};
