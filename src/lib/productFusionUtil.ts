import { getStoredData, setStoredData } from './db';
import { UnifiedProduct, InventoryEntry, InventoryItemDetail, PrimaryDLCEntry } from '../types';

export interface FusionResult {
  logs: string[];
}

/**
 * Mappe et fusionne toutes les références d'anciens produits vers un produit maître.
 * Met à jour: crousty_inventory, crousty_receptions_v3, crousty_tracabilite_v2
 * @param masterProduct Le produit qui est conservé
 * @param oldProducts Les produits qui vont être supprimés
 */
export async function migrateProductReferences(
  masterProduct: UnifiedProduct,
  oldProducts: UnifiedProduct[]
): Promise<FusionResult> {
  const logs: string[] = [];
  const oldNames = oldProducts.map(p => p.name);
  const oldIds = oldProducts.map(p => p.id);

  logs.push(`Migration de ${oldNames.length} produit(s) vers [${masterProduct.name}]`);

  // 1. crousty_inventory
  try {
    const inventories = getStoredData<InventoryEntry[]>('crousty_inventory', []);
    let invUpdated = false;
    
    const newInventories = inventories.map(entry => {
      let entryUpdated = false;
      const newItems = { ...entry.items };

      oldProducts.forEach(oldP => {
        if (newItems[oldP.category] && newItems[oldP.category][oldP.name]) {
          // L'ancien produit existe dans cet inventaire
          const oldDetail = newItems[oldP.category][oldP.name];
          
          // Initialize master category if needed
          if (!newItems[masterProduct.category]) {
            newItems[masterProduct.category] = {};
          }

          const existingMaster = newItems[masterProduct.category][masterProduct.name];

          if (existingMaster) {
            // Additionner
            const oldUnits = parseFloat(String(oldDetail.units || '0').replace(',', '.')) || 0;
            const oldCartons = parseFloat(String(oldDetail.cartons || '0').replace(',', '.')) || 0;
            
            const masterUnits = parseFloat(String(existingMaster.units || '0').replace(',', '.')) || 0;
            const masterCartons = parseFloat(String(existingMaster.cartons || '0').replace(',', '.')) || 0;

            newItems[masterProduct.category][masterProduct.name] = {
              units: String(oldUnits + masterUnits),
              cartons: String(oldCartons + masterCartons),
              na: oldDetail.na && existingMaster.na
            };
          } else {
            // Déplacer simplement
            newItems[masterProduct.category][masterProduct.name] = oldDetail;
          }
          
          // Supprimer l'ancienne réf
          delete newItems[oldP.category][oldP.name];
          entryUpdated = true;
          invUpdated = true;
        }
      });
      
      return entryUpdated ? { ...entry, items: newItems } : entry;
    });

    if (invUpdated) {
      setStoredData('crousty_inventory', newInventories);
      logs.push(`- L'inventaire historique a été mis à jour.`);
    }
  } catch (err) {
    logs.push(`- Erreur: Impossible de mettre à jour l'inventaire historique.`);
    console.error(err);
  }

  // 2. crousty_receptions_v3
  try {
    const receptions = getStoredData<any[]>('crousty_receptions_v3', []);
    let recUpdated = false;

    const newReceptions = receptions.map(rec => {
      let entryUpdated = false;
      const newLignes = (rec.lignes || []).map((ligne: any) => {
        if (oldNames.includes(ligne.produit)) {
          entryUpdated = true;
          return { ...ligne, produit: masterProduct.name };
        }
        return ligne;
      });

      if (entryUpdated) recUpdated = true;
      return entryUpdated ? { ...rec, lignes: newLignes } : rec;
    });

    if (recUpdated) {
      setStoredData('crousty_receptions_v3', newReceptions);
      logs.push(`- L'historique des réceptions a été mis à jour.`);
    }
  } catch (err) {
    logs.push(`- Erreur: Impossible de mettre à jour les réceptions.`);
  }

  // 3. crousty_tracabilite_v2
  try {
    const tracabilite = getStoredData<PrimaryDLCEntry[]>('crousty_tracabilite_v2', []);
    let tracUpdated = false;

    const newTracabilite = tracabilite.map(entry => {
      if (oldNames.includes(entry.ingredient)) {
        tracUpdated = true;
        return { ...entry, ingredient: masterProduct.name };
      }
      return entry;
    });

    if (tracUpdated) {
      setStoredData('crousty_tracabilite_v2', newTracabilite);
      logs.push(`- L'historique de traçabilité a été mis à jour.`);
    }
  } catch (err) {
    logs.push(`- Erreur: Impossible de mettre à jour la traçabilité.`);
  }

  // Add Fusion Event to Audit log
  try {
    const auditLogs = getStoredData<any[]>('crousty_fusion_logs', []);
    auditLogs.push({
      date: new Date().toISOString(),
      masterProduct: masterProduct.name,
      masterId: masterProduct.id,
      mergedProducts: oldNames.join(', '),
      logs
    });
    setStoredData('crousty_fusion_logs', auditLogs);
  } catch(e) {}

  return { logs };
}
