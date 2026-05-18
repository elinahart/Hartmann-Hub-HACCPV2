import { InventoryEntry, InventoryProduct, InventoryItemDetail } from '../types';
import { differenceInDays, startOfDay } from 'date-fns';

/**
 * Helper to find a product detail in an inventory entry regardless of the category it was saved under.
 */
function getDetailFromInventory(product: InventoryProduct, inventory: InventoryEntry | null): InventoryItemDetail | null {
  if (!inventory || !inventory.items) return null;
  for (const cat in inventory.items) {
    if (inventory.items[cat] && inventory.items[cat][product.name]) {
      return inventory.items[cat][product.name] as InventoryItemDetail;
    }
  }
  return null;
}

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
  const detail = getDetailFromInventory(product, lastInventory);
  
  if (!detail || detail.na) {
     return calculateDeliveriesSince(product, lastInventory.date, receptions);
  }

  const parsedUnits = parseFloat(String(detail.units || '0').replace(',', '.'));
  const parsedCartons = parseFloat(String(detail.cartons || '0').replace(',', '.'));
  const safeUnits = isNaN(parsedUnits) ? 0 : parsedUnits;
  const safeCartons = isNaN(parsedCartons) ? 0 : parsedCartons;
  const stockInitial = safeUnits + safeCartons * conv;
  const livraisonsSince = calculateDeliveriesSince(product, lastInventory.date, receptions);

  return stockInitial + livraisonsSince;
}

/**
 * Calcule une estimation du stock actuel en simulant la consommation jour par jour.
 * Cela évite les stocks négatifs théoriques qui fausseraient l'ajout d'une nouvelle réception.
 */
export function calculateEstimatedStockNow(
  product: InventoryProduct,
  lastInventory: InventoryEntry | null,
  receptions: any[],
  avgPerDay: number
): number {
  if (!lastInventory) {
    return calculateDeliveriesSince(product, new Date(0).toISOString(), receptions);
  }

  const conv = product.conversionCartonUnite || 5;
  const detail = getDetailFromInventory(product, lastInventory);
  let currentStock = 0;
  
  if (detail && !detail.na) {
    const parsedUnits = parseFloat(String(detail.units || '0').replace(',', '.'));
    const parsedCartons = parseFloat(String(detail.cartons || '0').replace(',', '.'));
    const safeUnits = isNaN(parsedUnits) ? 0 : parsedUnits;
    const safeCartons = isNaN(parsedCartons) ? 0 : parsedCartons;
    currentStock = safeUnits + safeCartons * conv;
  }

  const startDate = new Date(lastInventory.date);
  const now = new Date();
  const daysDiff = differenceInDays(startOfDay(now), startOfDay(startDate));

  if (daysDiff <= 0) {
    return currentStock + calculateDeliveriesSince(product, lastInventory.date, receptions);
  }

  const relevantReceptions = receptions.filter(r => !r.supprime && new Date(r.date).getTime() > startDate.getTime());
  let simulatedDate = startOfDay(startDate);
  
  // Simulate day by day to prevent negative drops
  for (let i = 0; i < daysDiff; i++) {
    const nextDate = new Date(simulatedDate.getTime() + 24 * 60 * 60 * 1000);
    const dayDeliveries = calculateDeliveriesInInterval(
      product,
      simulatedDate.toISOString(),
      nextDate.toISOString(),
      relevantReceptions
    );
    
    currentStock += dayDeliveries;
    currentStock -= avgPerDay;
    if (currentStock < 0) currentStock = 0;
    
    simulatedDate = nextDate;
  }
  
  // Add today's deliveries up to 'now'
  const todayDeliveries = calculateDeliveriesInInterval(
    product,
    simulatedDate.toISOString(),
    now.toISOString(),
    relevantReceptions
  );
  
  currentStock += todayDeliveries;
  return currentStock;
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
        const qStr = String(l.quantite).toLowerCase().trim().replace(',', '.');
        const numMatch = qStr.match(/\d+(\.\d+)?/);
        const num = parseFloat(numMatch ? numMatch[0] : '0');
        
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
 * Calcule la consommation moyenne journalière basée sur tous les inventaires disponibles et les livraisons.
 */
export function calculateConsumptionRate(
  product: InventoryProduct,
  inventories: InventoryEntry[],
  receptions: any[]
): number {
  return calculateAdvancedConsumptionMetrics(product, inventories, receptions).avgPerDay;
}

export interface ConsumptionMetrics {
  avgPerDay: number;
  avgPerWeek: number;
  intervalsCount: number;
  totalDays: number;
  totalConsumption: number;
}

/**
 * Calcule des métriques avancées de consommation en se basant sur TOUS les inventaires passés
 * et TOUTES les livraisons intermédiaires.
 */
export function calculateAdvancedConsumptionMetrics(
  product: InventoryProduct,
  inventories: InventoryEntry[],
  receptions: any[]
): ConsumptionMetrics {
  const defaultMetrics = { avgPerDay: 0, avgPerWeek: 0, intervalsCount: 0, totalDays: 0, totalConsumption: 0 };
  
  if (inventories.length < 2) return defaultMetrics;

  const conv = product.conversionCartonUnite || 5;
  
  let totalConsumption = 0;
  let totalDays = 0;
  let validIntervals = 0;

  let currentNewestIdx = 0;

  while (currentNewestIdx < inventories.length - 1) {
     const newest = inventories[currentNewestIdx];
     const detailNewest = getDetailFromInventory(product, newest);
     
     // Skip if N/A in the newer end of the interval
     if (!detailNewest || detailNewest.na) {
       currentNewestIdx++;
       continue;
     }

     // Find the next older valid inventory
     let olderIdx = currentNewestIdx + 1;
     let older: InventoryEntry | null = null;
     let detailOlder: InventoryItemDetail | null = null;
     
     while (olderIdx < inventories.length) {
       older = inventories[olderIdx];
       detailOlder = getDetailFromInventory(product, older);
       if (detailOlder && !detailOlder.na) {
         break;
       }
       olderIdx++;
     }

     if (!older || !detailOlder || detailOlder.na) {
       // We couldn't find a valid older inventory to form an interval
       break;
     }

     const getStock = (detail: InventoryItemDetail) => {
       const parsedUnits = parseFloat(String(detail.units || '0').replace(',', '.'));
       const parsedCartons = parseFloat(String(detail.cartons || '0').replace(',', '.'));
       const safeUnits = isNaN(parsedUnits) ? 0 : parsedUnits;
       const safeCartons = isNaN(parsedCartons) ? 0 : parsedCartons;
       return safeUnits + safeCartons * conv;
     };

     const stockNewest = getStock(detailNewest);
     const stockOlder = getStock(detailOlder);
     
     const dNewest = new Date(newest.date).getTime();
     const dOlder = new Date(older.date).getTime();
     const daysDiff = Math.max(1, differenceInDays(dNewest, dOlder));

     const deliveredInBetween = calculateDeliveriesInInterval(
       product,
       older.date,
       newest.date,
       receptions
     );

     const consumption = stockOlder + deliveredInBetween - stockNewest;
     
     if (consumption >= 0) {
       totalConsumption += consumption;
       totalDays += daysDiff;
       validIntervals++;
     }

     // Move our window
     currentNewestIdx = olderIdx;
  }

  const avgPerDay = totalDays > 0 ? (totalConsumption / totalDays) : 0;

  return {
    avgPerDay,
    avgPerWeek: avgPerDay * 7,
    intervalsCount: validIntervals,
    totalDays,
    totalConsumption
  };
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
          const qStr = String(l.quantite).toLowerCase().trim().replace(',', '.');
          const numMatch = qStr.match(/\d+(\.\d+)?/);
          const num = parseFloat(numMatch ? numMatch[0] : '0');
          const isCarton = qStr.includes('carton') || qStr.includes('colis') || qStr.includes('crt');
          total += isCarton ? num * conv : num;
        }
      });
    }
  });
  return total;
}
