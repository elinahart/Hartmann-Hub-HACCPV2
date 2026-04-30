import React, { createContext, useContext, useState, useEffect } from 'react';
import { NettoyageTaskConfig, DEFAULT_CLEANING_TASKS } from '../lib/configSchema';

interface NettoyageContextType {
  taches: NettoyageTaskConfig[];
  setTaches: (taches: NettoyageTaskConfig[]) => void;
}

const NettoyageContext = createContext<NettoyageContextType | undefined>(undefined);

const STORAGE_KEY = 'crousty-nettoyage-taches';

export function NettoyageProvider({ children }: { children: React.ReactNode }) {
  const [taches, setTachesState] = useState<NettoyageTaskConfig[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved ? JSON.parse(saved) : DEFAULT_CLEANING_TASKS;
    } catch {
      return DEFAULT_CLEANING_TASKS;
    }
  });

  useEffect(() => {
    const load = () => {
      try {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) setTachesState(JSON.parse(saved));
      } catch (e) {
        console.warn("Failed to refresh cleaning tasks", e);
      }
    };
    window.addEventListener('crousty-nettoyage-updated', load);
    return () => window.removeEventListener('crousty-nettoyage-updated', load);
  }, []);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(taches));
  }, [taches]);

  return (
    <NettoyageContext.Provider value={{ taches, setTaches: setTachesState }}>
      {children}
    </NettoyageContext.Provider>
  );
}

export const useNettoyage = () => {
  const context = useContext(NettoyageContext);
  if (!context) throw new Error('useNettoyage must be used within a NettoyageProvider');
  return context;
};
