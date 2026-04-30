export interface SignatureSaisie {
  auteurId: string;
  auteurInitiales: string;
  auteurPrenom: string;
  dateCreation: string;
  dateModification?: string;
  modifiePar?: string;
  motifModification?: string;
}

export interface BaseEntry {
  id: string;
  date: string;
  responsable: string;
  signature?: SignatureSaisie;
  supprime?: boolean;
  supprimePar?: string;
  dateSuppression?: string;
}

export interface TemperatureEntry extends BaseEntry {
  negatif?: number;
  positif?: number;
  congeleCuisine?: number;
  frigoBoisson1?: number;
  frigoBoisson2?: number;
  frigoCuisine?: number;
  saladetteSauces?: number;
  saladetteDesserts?: number;
  actionsCorrectives?: string;
}

export interface DLCEntry extends BaseEntry {
  productName: string;
  dateSaisie: string;
  dlcCalc: string;
  photoId?: string;
  observation?: string;
}

export interface PrimaryDLCEntry extends BaseEntry {
  ingredient: string;
  marque: string;
  numeroLot: string;
  dlcPrimaire: string;
  observations?: string;
}

export interface OilEntry extends BaseEntry {
  testValue: number;
  temperature: number;
  changed: boolean;
  actionsCorrectives?: string;
}

export interface ReceptionEntry extends BaseEntry {
  ingredient: string;
  numeroLot: string;
  dlcPrimaire: string;
  photoId: string;
}

export interface PrepEntry extends BaseEntry {
  sauceName: string;
  linkedLots: string[];
  dlcCalc: string;
}

export interface TempChecklistEntry extends BaseEntry {
  equipments: Record<string, string>;
  correctiveActions?: Record<string, string>;
  productTemperatures?: Record<string, string>;
  globalObservation?: string;
}

export interface DessertEntry extends BaseEntry {
  dessertName: string;
  dlcCalc: string;
  quantity?: number;
  mode?: 'virtual' | 'system' | 'disabled';
  used?: boolean;
}

export interface OilChecklistEntry extends BaseEntry {
  cuves: {
    [key: string]: { testValue: string; temperature: string; photo?: string; ocrMsg?: string; ocrConfidence?: number };
  };
  changed: boolean;
  cuveChangee?: string | number; // allow string keys for dynamic cuves
  motifChangement?: string;
  actionsCorrectives?: string;
}

export interface CleaningEntry extends BaseEntry {
  daily: Record<string, boolean>;
  weekly: Record<string, boolean>;
}

export interface InventoryItemDetail {
  units: string;
  cartons: string;
  na?: boolean;
}

export interface InventoryEntry extends BaseEntry {
  items: Record<string, Record<string, InventoryItemDetail>>;
}

export interface InventoryProduct {
  id: string;
  name: string;
  category: string;
  minThreshold: number;
  icon?: string;
  signature?: SignatureSaisie;
}

export interface ProductDef {
  id: string;
  name: string;
  category?: string;
  dlcValue: number;
  dlcUnit: 'hours' | 'days' | 'heures' | 'jours' | 'mois';
  conservation?: string;
  note?: string;
  icone?: string;
  iconeCouleur?: string;
  readOnly?: boolean;
  signature?: SignatureSaisie;
}

export interface MembreEquipe {
  id: string;
  name: string;
  initiales: string;
  role: 'manager' | 'equipe';
  actif: boolean;
  ordre: number;
  dateCreation: string;
  couleur?: string;
  pin?: string;
  mustChangePin?: boolean;
  avatarUrl?: string;
  avatarType?: 'photo' | 'monogram' | 'icon';
  avatarIcon?: string;
  avatarColor?: string;
}

export interface ConfigHuiles {
  seuilAttention: number;
  seuilChangement: number;
}

export type MobileSessionStatus = 'draft' | 'waiting' | 'connected' | 'collecting' | 'uploaded' | 'preview-ready' | 'import-pending' | 'imported' | 'error' | 'expired' | 'archived';

export interface MobileSession {
  id: string;
  sessionName: string;
  
  // Actor metadata
  createdByUserId: string;
  createdByUserName: string;
  roleAtCreation: 'manager' | 'equipe';
  
  assignedToEmployeeId?: string | null;
  assignedToName: string; // "Moi", specific name, or free name
  
  mobileOperatorName?: string | null; // Set when phone connects/starts
  
  // Configuration
  allowedModules: string[];
  expiresAt: string;
  createdAt: string;
  
  // Status tracking
  status: MobileSessionStatus;
  
  // Import tracking
  importStatus: 'none' | 'pending' | 'success' | 'failed';
  importByUserId?: string | null;
  importByUserName?: string | null;
  importDate?: string;
  
  // Data tracking
  receivedData?: {
    receivedAt: string;
    itemsCount: number;
    modulesFound: string[];
    errorsCount: number;
    zipSize?: number;
  };

  // UI state
  lastActivityAt: string;
}

export interface MobileSessionEvent {
  id: string;
  sessionId: string;
  timestamp: string;
  type: string;
  action: string;
  userName: string;
  details?: any;
  status: 'success' | 'warning' | 'error';
}
