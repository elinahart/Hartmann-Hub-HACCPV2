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

  const parsedUnits = parseFloat(String(detail.units || '0').replace(',', '.'));
  const parsedCartons = parseFloat(String(detail.cartons || '0').replace(',', '.'));
  const safeUnits = isNaN(parsedUnits) ? 0 : parsedUnits;
  const safeCartons = isNaN(parsedCartons) ? 0 : parsedCartons;
  const stockInitial = safeUnits + safeCartons * conv;
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

  // inventories est trié du plus récent (0) au plus ancien (N)
  for (let i = 0; i < inventories.length - 1; i++) {
    const newest = inventories[i];
    const older = inventories[i + 1];
    
    const dNewest = new Date(newest.date).getTime();
    const dOlder = new Date(older.date).getTime();
    const daysDiff = Math.max(1, differenceInDays(dNewest, dOlder));

    const getStock = (inv: InventoryEntry) => {
      const detail = inv.items[product.category]?.[product.name] as InventoryItemDetail;
      if (!detail || detail.na) return null;
      const parsedUnits = parseFloat(String(detail.units || '0').replace(',', '.'));
      const parsedCartons = parseFloat(String(detail.cartons || '0').replace(',', '.'));
      const safeUnits = isNaN(parsedUnits) ? 0 : parsedUnits;
      const safeCartons = isNaN(parsedCartons) ? 0 : parsedCartons;
      return safeUnits + safeCartons * conv;
    };

    const stockNewest = getStock(newest);
    const stockOlder = getStock(older);

    if (stockNewest !== null && stockOlder !== null) {
      const deliveredInBetween = calculateDeliveriesInInterval(
        product,
        older.date,
        newest.date,
        receptions
      );

      // Consommation = Ancien stock + Livré depuis - Nouveau stock
      const consumption = stockOlder + deliveredInBetween - stockNewest;
      
      // On ignore les consommations négatives (ex: recomptage, don, erreur de saisie)
      if (consumption >= 0) {
        totalConsumption += consumption;
        totalDays += daysDiff;
        validIntervals++;
      }
    }
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
