import Dexie, { type Table } from 'dexie';
import { openDB } from 'idb';

const DB_NAME = 'crousty-hub-v2-compat';
const DB_VERSION = 1;

/**
 * Legacy initDB for archiver.ts compatibility
 */
export const initDB = async () => {
  return openDB(DB_NAME, DB_VERSION, {
    upgrade(db) {
      if (!db.objectStoreNames.contains('photos')) {
        db.createObjectStore('photos');
      }
    },
  });
};

interface PhotoRecord {
  id: string;
  dataUrl: string;
  timestamp: number;
}

export interface SyncTask {
  id: string;
  type: 'export_session';
  sessionId: string;
  sessionName: string;
  blob: Blob;
  fileName: string;
  status: 'pending' | 'failed' | 'processing';
  error?: string;
  retryCount: number;
  timestamp: number;
}

class CroustyDB extends Dexie {
  photos!: Table<PhotoRecord>;
  syncQueue!: Table<SyncTask>;

  constructor() {
    super('crousty-hub-v2');
    this.version(1).stores({
      photos: 'id, timestamp'
    });
    this.version(2).stores({
      photos: 'id, timestamp',
      syncQueue: 'id, status, type, timestamp'
    });
  }
}

export const db = new CroustyDB();

export const queueSyncTask = async (task: Omit<SyncTask, 'id' | 'timestamp' | 'status' | 'retryCount'>) => {
  const newTask: SyncTask = {
    ...task,
    id: crypto.randomUUID(),
    status: 'pending',
    retryCount: 0,
    timestamp: Date.now()
  };
  await db.syncQueue.put(newTask);
  return newTask;
};

export const getPendingSyncTasks = async () => {
  return await db.syncQueue.where('status').anyOf('pending', 'failed').sortBy('timestamp');
};

export const updateSyncTask = async (id: string, updates: Partial<SyncTask>) => {
  await db.syncQueue.update(id, updates);
};

export const deleteSyncTask = async (id: string) => {
  await db.syncQueue.delete(id);
};

/**
 * Sauvegarde une photo (DataURL) dans IndexedDB via Dexie
 */
export const savePhoto = async (id: string, dataUrl: string) => {
  // Purge old photos (older than 6 months)
  const sixMonthsAgo = Date.now() - (180 * 24 * 60 * 60 * 1000);
  await db.photos.where('timestamp').below(sixMonthsAgo).delete().catch(e => console.warn('Purge photos old', e));

  return await db.photos.put({
    id,
    dataUrl,
    timestamp: Date.now()
  });
};

export const savePhotoBase64 = savePhoto;

/**
 * Récupère une photo depuis IndexedDB
 */
export const getPhoto = async (id: string): Promise<string | undefined> => {
  const record = await db.photos.get(id);
  return record?.dataUrl;
};

export const getPhotoBase64 = getPhoto;

/**
 * Supprime une photo
 */
export const deletePhoto = async (id: string) => {
  return await db.photos.delete(id);
};

export const clearPhotos = async () => {
  return await db.photos.clear();
};

/**
 * Récupère les données brutes (Local Storage)
 */
export const getStoredData = <T>(key: string, defaultValue: T): T => {
  try {
    const item = window.localStorage.getItem(key);
    return item ? JSON.parse(item) : defaultValue;
  } catch (error) {
    console.error(error);
    return defaultValue;
  }
};

/**
 * Enregistre les données brutes (Local Storage)
 */
let quotaAlertShown = false;

export const setStoredData = <T>(key: string, value: T) => {
  try {
    const serialized = JSON.stringify(value);
    window.localStorage.setItem(key, serialized);
  } catch (error: any) {
    console.error('Error in setStoredData (Quota exceeded?):', error);
    if (!quotaAlertShown && (error.name === 'QuotaExceededError' || (error.message && error.message.toLowerCase().includes('quota')))) {
      quotaAlertShown = true;
      alert("⚠️ Espace de stockage plein ! L'application ne peut plus sauvegarder vos dernières saisies.\n\nVeuillez supprimer des anciennes archives dans les Paramètres > Stockage pour libérer de l'espace.");
    }
    // We do NOT throw an unhandled error here anymore so we don't brutally crash the app
    // Components that absolutely need to know should wrap their setItem logic manually (like AuthContext).
  }
};

export const clearCollecteData = async () => {
  const keysToClear = [
    'crousty_inventory', 'crousty_inventory_draft', 
    'crousty_temp_checklist', 'crousty_viandes', 
    'crousty_tracabilite_v2', 'crousty_receptions_v3', 
    'crousty_cleaning', 'crousty_oil_checklist'
  ];
  keysToClear.forEach(k => window.localStorage.removeItem(k));
  await db.photos.clear();
};

/**
 * Supprime les données
 */
export const clearAllData = async () => {
  await clearCollecteData();
  // Ne pas supprimer la configuration principale ou les clés de session mobile lors du vidage des données
  // window.localStorage.clear(); 
};
