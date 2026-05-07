import { InventoryEntry, InventoryProduct, InventoryItemDetail } from '../types';
import { differenceInDays, startOfDay } from 'date-fns';

/**
 * Calcule le stock attendu pour un produit donné à une date T.
 * Logique : Dernier inventaire validé + Somme des livraisons depuis cet inventaire.
 */
export function calculateExpectedStock(
  product: InventoryProduct,
  lastInventory: InventoryEntry | null,
  receptions: any[]
): number {
  if (!lastInventory) {
    // Si aucun inventaire n'est disponible, on part de 0 + livraisons
    return calculateDeliveriesSince(product, new Date(0).toISOString(), receptions);
  }

  const conv = product.conversionCartonUnite || 5;
  const detail = lastInventory.items[product.category]?.[product.name] as InventoryItemDetail;
  
  if (!detail || detail.na) {
     return calculateDeliveriesSince(product, lastInventory.date, receptions);
  }

  const stockInitial = (parseInt(detail.units || '0')) + (parseInt(detail.cartons || '0') * conv);
  const livraisonsSince = calculateDeliveriesSince(product, lastInventory.date, receptions);

  return stockInitial + livraisonsSince;
}

/**
 * Calcule la somme des unités livrées pour un produit depuis une date ISO donnée.
 */
export function calculateDeliveriesSince(
  product: InventoryProduct,
  sinceDateIso: string,
  receptions: any[]
): number {
  const conv = product.conversionCartonUnite || 5;
  const sinceTime = new Date(sinceDateIso).getTime();
  
  let totalUnits = 0;
  
  const relevantReceptions = receptions.filter(r => {
    if (r.supprime) return false;
    return new Date(r.date).getTime() > sinceTime;
  });

  relevantReceptions.forEach(rec => {
    rec.lignes?.forEach((l: any) => {
      // Comparison insensitive cases
      if (l.produit.toLowerCase().trim() === product.name.toLowerCase().trim()) {
        const qStr = String(l.quantite).toLowerCase().trim();
        const num = parseInt(qStr.match(/\d+/) ? qStr.match(/\d+/)![0] : '0');
        
        if (!isNaN(num)) {
          const isCarton = qStr.includes('carton') || qStr.includes('colis') || qStr.includes('crt');
          // If neither is specified, we infer based on product metadata if possible
          // But usually the user enters "5 cartons" or "10" (units)
          totalUnits += isCarton ? num * conv : num;
        }
      }
    });
  });

  return totalUnits;
}

/**
 * Calcule la consommation moyenne journalière basée sur les deux derniers inventaires.
 */
export function calculateConsumptionRate(
  product: InventoryProduct,
  inventories: InventoryEntry[],
  receptions: any[]
): number {
  if (inventories.length < 2) return 0;

  const newest = inventories[0];
  const previous = inventories[1];
  
  const dNewest = new Date(newest.date).getTime();
  const dPrevious = new Date(previous.date).getTime();
  const daysDiff = Math.max(1, differenceInDays(dNewest, dPrevious));

  const conv = product.conversionCartonUnite || 5;
  
  const getStock = (inv: InventoryEntry) => {
    const detail = inv.items[product.category]?.[product.name] as InventoryItemDetail;
    if (!detail || detail.na) return null;
    return (parseInt(detail.units || '0')) + (parseInt(detail.cartons || '0') * conv);
  };

  const stockNewest = getStock(newest);
  const stockPrevious = getStock(previous);

  if (stockNewest === null || stockPrevious === null) return 0;

  const deliveredInBetween = calculateDeliveriesInInterval(
    product,
    previous.date,
    newest.date,
    receptions
  );

  // Consumption = Previous + Delivered - Newest
  const consumption = stockPrevious + deliveredInBetween - stockNewest;
  return consumption > 0 ? consumption / daysDiff : 0;
}

function calculateDeliveriesInInterval(
  product: InventoryProduct,
  startIso: string,
  endIso: string,
  receptions: any[]
): number {
  const conv = product.conversionCartonUnite || 5;
  const startTime = new Date(startIso).getTime();
  const endTime = new Date(endIso).getTime();
  
  let total = 0;
  receptions.forEach(rec => {
    if (rec.supprime) return false;
    const rt = new Date(rec.date).getTime();
    if (rt > startTime && rt <= endTime) {
      rec.lignes?.forEach((l: any) => {
        if (l.produit.toLowerCase().trim() === product.name.toLowerCase().trim()) {
          const qStr = String(l.quantite).toLowerCase().trim();
          const num = parseInt(qStr.match(/\d+/) ? qStr.match(/\d+/)![0] : '0');
          const isCarton = qStr.includes('carton') || qStr.includes('colis') || qStr.includes('crt');
          total += isCarton ? num * conv : num;
        }
      });
    }
  });
  return total;
}
