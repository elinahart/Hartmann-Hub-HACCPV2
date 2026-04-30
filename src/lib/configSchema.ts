import { z } from 'zod';

export const EmployeSchema = z.object({
  id: z.string(),
  name: z.string(),
  initiales: z.string(),
  role: z.enum(['manager', 'equipe']).default('equipe'),
  pin: z.string().optional(),
  actif: z.boolean().default(true),
  ordre: z.number().optional()
});

export const TemperatureConfigSchema = z.object({
  id: z.string(),
  nom: z.string(),
  type: z.enum(['positif', 'negatif']),
  seuilMin: z.number(),
  seuilMax: z.number()
});

export const HuileConfigSchema = z.object({
  id: z.string(),
  nom: z.string()
});

export const NettoyageConfigSchema = z.object({
  id: z.string(),
  nom: z.string(),
  frequence: z.string().catch('QUOTIDIEN'),
  actif: z.boolean().default(true),
  instructions: z.string().optional()
});

export const ProduitConfigSchema = z.object({
  id: z.string(),
  name: z.string(),
  category: z.string().default('Desserts'),
  icone: z.string().optional(),
  iconeCouleur: z.string().optional(),
  conservation: z.string().optional(),
  note: z.string().optional(),
  dlcValue: z.number().default(24),
  dlcUnit: z.string().default('hours'),
  readOnly: z.boolean().optional()
});

export const RestaurantConfigSchema = z.object({
  nom: z.string().default('Hartmann Hub'),
  ville: z.string().default(''),
  couleurPrimaire: z.string().default('#004696'),
  couleurSecondaire: z.string().default('#00A9E0'),
  logoMode: z.enum(['text', 'initials', 'icon', 'icon+text', 'icon+initials']).default('initials'),
  logoText: z.string().optional(),
  logoIcon: z.string().default('ChefHat'),
  logoBackgroundStyle: z.enum(['round', 'square', 'none']).default('round'),
  logoBackgroundColor: z.string().optional(), // If not set, use primary
  logoTextColor: z.string().default('#FFFFFF')
});

export const InventaireConfigSchema = z.object({
  frequence: z.enum(['quotidien', 'hebdomadaire', 'mensuel']).default('hebdomadaire'),
  jourSemaine: z.enum(['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi', 'dimanche']).default('lundi'),
  rappelActif: z.boolean().default(true),
  envoiSuperieur: z.boolean().default(true),
  produits: z.array(z.any()).optional(),
  historique: z.array(z.any()).optional()
});

export const CookingProductSchema = z.object({
  id: z.string(),
  name: z.string(),
  active: z.boolean().default(true),
  icon: z.string().optional()
});

export const ConfigSchema = z.object({
  version: z.string().optional().default('1.0'),
  exportedAt: z.string().optional(),
  pinHash: z.string().optional(),
  restaurant: RestaurantConfigSchema.default({ 
    nom: 'Hartmann Hub', 
    ville: '', 
    couleurPrimaire: '#004696', 
    couleurSecondaire: '#00A9E0',
    logoMode: 'initials',
    logoIcon: 'ChefHat',
    logoBackgroundStyle: 'round',
    logoTextColor: '#FFFFFF'
  }),
  fournisseurs: z.array(z.string()).default([]),
  employes: z.array(EmployeSchema).default([]),
  temperatures: z.array(TemperatureConfigSchema).default([]),
  huiles: z.array(HuileConfigSchema).default([]),
  nettoyage: z.array(NettoyageConfigSchema).default([]),
  produits: z.array(ProduitConfigSchema).default([]),
  cuisson: z.array(CookingProductSchema).default([]),
  modules: z.record(z.string(), z.boolean()).default({}),
  inventaire: InventaireConfigSchema.default({ frequence: 'hebdomadaire', jourSemaine: 'lundi', rappelActif: true, envoiSuperieur: true })
});

export type CookingProductConfig = z.infer<typeof CookingProductSchema>;
export type NettoyageTaskConfig = z.infer<typeof NettoyageConfigSchema>;
export type ProduitConfig = z.infer<typeof ProduitConfigSchema>;
export type TemperatureConfig = z.infer<typeof TemperatureConfigSchema>;
export type InventaireConfig = z.infer<typeof InventaireConfigSchema>;
export type AppConfig = z.infer<typeof ConfigSchema>;
export type RestaurantConfig = z.infer<typeof RestaurantConfigSchema>;

// The "Crousty Hub" default fallback config
export const DEFAULT_CLEANING_TASKS: NettoyageTaskConfig[] = [
  { id: 'nt-1', nom: 'Balances / tables inox', frequence: 'APRÈS UTILISATION', actif: true },
  { id: 'nt-2', nom: 'Machines', frequence: 'APRÈS UTILISATION', actif: true },
  { id: 'nt-3', nom: 'Chambre froide (+)', frequence: 'APRÈS SERVICE', actif: true },
  { id: 'nt-4', nom: 'Chambre froide (-)', frequence: 'TRIMESTRIEL', actif: true },
  { id: 'nt-5', nom: 'Bac de plonge', frequence: 'APRÈS SERVICE', actif: true },
  { id: 'nt-6', nom: 'Petit matériel, couteaux', frequence: 'APRÈS UTILISATION', actif: true },
  { id: 'nt-7', nom: 'Lave mains', frequence: 'APRÈS SERVICE', actif: true },
  { id: 'nt-8', nom: 'Sols et siphons', frequence: 'QUOTIDIEN', actif: true },
  { id: 'nt-9', nom: 'Murs, portes', frequence: 'HEBDOMADAIRE', actif: true },
  { id: 'nt-10', nom: 'Poignées et interrupteurs', frequence: 'QUOTIDIEN', actif: true },
  { id: 'nt-11', nom: 'Vitrines', frequence: 'APRÈS SERVICE', actif: true },
  { id: 'nt-12', nom: 'Étagères, palettes', frequence: 'HEBDOMADAIRE', actif: true },
  { id: 'nt-13', nom: 'Poubelles', frequence: 'QUOTIDIEN', actif: true },
  { id: 'nt-14', nom: 'Plafonds', frequence: 'TRIMESTRIEL', actif: true },
];

export const DEFAULT_CONFIG: AppConfig = {
  version: '1.0',
  restaurant: {
    nom: 'Hartmann Hub',
    ville: '',
    couleurPrimaire: '#004696',
    couleurSecondaire: '#00A9E0',
    logoMode: 'initials',
    logoIcon: 'ChefHat',
    logoBackgroundStyle: 'round',
    logoTextColor: '#FFFFFF'
  },
  fournisseurs: [],
  employes: [
    { id: "emp-manager", name: "Manager", initiales: "M", role: "manager", actif: true, pin: "0000" },
    { id: "emp-equipier", name: "Équipier", initiales: "É", role: "equipe", actif: true, pin: "0000" }
  ],
  temperatures: [
    { id: "negatif",          nom: "NÉGATIF",           type: "negatif",  seuilMin: -25, seuilMax: -18 },
    { id: "positif",          nom: "POSITIF",            type: "positif",  seuilMin: 0,   seuilMax: 4 },
    { id: "frigo-cuisine",    nom: "FRIGO CUISINE",      type: "positif",  seuilMin: 0,   seuilMax: 4 },
    { id: "congele-cuisine",  nom: "CONGÈLE CUISINE",    type: "negatif",  seuilMin: -25, seuilMax: -18 },
    { id: "saladette-sauces", nom: "SALADETTE SAUCES",   type: "positif",  seuilMin: 0,   seuilMax: 4 },
    { id: "saladette-desser", nom: "SALADETTE DESSERTS", type: "positif",  seuilMin: 0,   seuilMax: 4 },
    { id: "frigo-boisson1",   nom: "FRIGO BOISSON 1",    type: "positif",  seuilMin: 0,   seuilMax: 8 },
    { id: "frigo-boisson2",   nom: "FRIGO BOISSON DADA", type: "positif",  seuilMin: 0,   seuilMax: 8 }
  ],
  huiles: [
    { id: "cuve-1", nom: "Cuve 1" },
    { id: "cuve-2", nom: "Cuve 2" },
    { id: "cuve-3", nom: "Cuve 3" },
    { id: "cuve-4", nom: "Cuve 4" }
  ],
  nettoyage: DEFAULT_CLEANING_TASKS,
  produits: [],
  cuisson: [
    { id: 'c-1', name: 'Tenders', icon: 'Drumstick', active: true },
    { id: 'c-2', name: 'Poisson', icon: 'Fish', active: true }
  ],
  modules: {
    reception: true,
    traceabilite: true,
    temperatures: true,
    cuisson: true,
    nettoyage: true,
    dlc: true,
    preparations: true,
    inventaire: true,
    huiles: true
  },
  inventaire: {
    frequence: 'hebdomadaire',
    jourSemaine: 'lundi',
    rappelActif: true,
    envoiSuperieur: true
  }
};

export function mergeArrays(existing: any[], incoming: any[]) {
  if (!Array.isArray(incoming)) return { merged: existing, importedCount: 0, updatedCount: 0 };
  const merged = [...existing];
  let importedCount = 0;
  let updatedCount = 0;
  
  incoming.forEach(newItem => {
    // Find if item exists by ID or by Name (normalized)
    const existingIdx = merged.findIndex(oldItem => {
      const idMatch = oldItem.id && newItem.id && oldItem.id === newItem.id;
      const normalize = (s: any) => (s || '').trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
      const nameOf = (i: any) => i?.nom || i?.name || '';
      const nameMatch = nameOf(oldItem) && nameOf(newItem) && 
                        normalize(nameOf(oldItem)) === normalize(nameOf(newItem));
      return idMatch || nameMatch;
    });

    if (existingIdx !== -1) {
      // Update existing item by merging
      merged[existingIdx] = { ...merged[existingIdx], ...newItem };
      updatedCount++;
    } else {
      // Add new item
      merged.push(newItem);
      importedCount++;
    }
  });
  return { merged, importedCount, updatedCount };
}

// Deep merge strategy as requested
export function deepMergeWithDefaults(imported: any, defaults: AppConfig = DEFAULT_CONFIG): AppConfig {
  const result = { ...defaults };
  if (!imported || typeof imported !== 'object') return result;

  // Simple deep merge for known top-level keys
  if (imported.version) result.version = imported.version;
  if (imported.exportedAt) result.exportedAt = imported.exportedAt;
  if (imported.pinHash) result.pinHash = imported.pinHash;
  
  if (imported.restaurant && typeof imported.restaurant === 'object') {
    result.restaurant = { ...defaults.restaurant, ...imported.restaurant };
  }

  // For arrays, we should REPLACE instead of MERGE when applying defaults or doing global imports
  // so we don't resurrect items that were deleted by the user. If the user's config provides it, use it.
  if (Array.isArray(imported.employes)) result.employes = imported.employes;
  if (Array.isArray(imported.fournisseurs)) result.fournisseurs = imported.fournisseurs;
  if (Array.isArray(imported.temperatures)) result.temperatures = imported.temperatures;
  if (Array.isArray(imported.huiles)) result.huiles = imported.huiles;
  if (Array.isArray(imported.nettoyage)) result.nettoyage = imported.nettoyage;
  if (Array.isArray(imported.produits)) result.produits = imported.produits;
  if (Array.isArray(imported.cuisson)) result.cuisson = imported.cuisson;

  if (imported.inventaire && typeof imported.inventaire === 'object') {
    result.inventaire = { ...defaults.inventaire, ...imported.inventaire };
  }

  if (imported.modules && typeof imported.modules === 'object') {
    result.modules = { ...defaults.modules, ...imported.modules };
  }

  // Validate the merged object to ensure it fits the schema
  // We use passthrough to avoid failing on extra fields added by future versions
  const parsed = ConfigSchema.passthrough().safeParse(result);
  
  if (parsed.success) {
    return parsed.data as AppConfig;
  } else {
    console.warn("Zod validation failed after merge. Detail:", parsed.error);
    // Even if validation fails, we try to return the result as it might be partially valid
    return result as AppConfig;
  }
}
