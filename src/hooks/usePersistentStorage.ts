import { useState, useEffect } from 'react';

export function usePersistentStorage() {
  const [isPersistent, setIsPersistent] = useState<boolean | null>(null);
  const [estimate, setEstimate] = useState<StorageEstimate | null>(null);

  useEffect(() => {
    const initStorage = async () => {
      try {
        if (navigator.storage && navigator.storage.persist) {
          let persisted = await navigator.storage.persisted();
          if (!persisted) {
            persisted = await navigator.storage.persist();
          }
          setIsPersistent(persisted);
        }
        
        if (navigator.storage && navigator.storage.estimate) {
          const est = await navigator.storage.estimate();
          setEstimate(est);
        }
      } catch (error) {
        console.error('Storage API error', error);
      }
    };
    initStorage();
  }, []);

  return { isPersistent, estimate };
}
