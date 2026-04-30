import { useState, useEffect, useCallback } from 'react';

export type StoragePersistStatus = 'unknown' | 'granted' | 'denied' | 'unsupported' | 'error';

export interface StorageInfo {
  usedMB: number;
  totalMB: number;
  isNearlyFull: boolean;
}

export function useStoragePersist() {
  const [status, setStatus] = useState<StoragePersistStatus>('unknown');
  const [storageInfo, setStorageInfo] = useState<StorageInfo | null>(null);

  const checkStatus = useCallback(async () => {
    if (!navigator.storage || !navigator.storage.persisted) {
      setStatus('unsupported');
      return;
    }
    
    try {
      const isPersisted = await navigator.storage.persisted();
      setStatus(isPersisted ? 'granted' : 'denied');
    } catch (e) {
      console.error('Erreur lors de la vérification du stockage persistant:', e);
      setStatus('error');
    }
  }, []);

  const estimateStorage = useCallback(async () => {
    if (!navigator.storage || !navigator.storage.estimate) return;
    
    try {
      const estimate = await navigator.storage.estimate();
      const usedMB = (estimate.usage || 0) / (1024 * 1024);
      const totalMB = (estimate.quota || 0) / (1024 * 1024);
      const isNearlyFull = totalMB > 0 ? (usedMB / totalMB) > 0.8 : false;
      
      setStorageInfo({
        usedMB: Number(usedMB.toFixed(2)),
        totalMB: Number(totalMB.toFixed(0)),
        isNearlyFull
      });
    } catch (e) {
      console.error("Erreur lors de l'estimation du stockage:", e);
    }
  }, []);

  useEffect(() => {
    checkStatus();
    estimateStorage();
  }, [checkStatus, estimateStorage]);

  const requestPersist = async () => {
    if (!navigator.storage || !navigator.storage.persist) {
      setStatus('unsupported');
      return false;
    }
    
    try {
      const isPersisted = await navigator.storage.persist();
      setStatus(isPersisted ? 'granted' : 'denied');
      return isPersisted;
    } catch (e) {
      console.error('Erreur lors de la demande de persistance:', e);
      setStatus('error');
      return false;
    }
  };

  return {
    status,
    storageInfo,
    requestPersist,
    refresh: () => {
      checkStatus();
      estimateStorage();
    }
  };
}
