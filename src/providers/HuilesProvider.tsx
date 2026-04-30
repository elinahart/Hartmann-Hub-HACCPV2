import React, { createContext, useContext, useState, useEffect } from 'react';
import { DEFAULT_CONFIG } from '../lib/configSchema';

interface HuileConfig {
  id: string;
  nom: string;
}

interface HuilesContextType {
  cuves: HuileConfig[];
  setCuves: (cuves: HuileConfig[]) => void;
}

const HuilesContext = createContext<HuilesContextType | undefined>(undefined);

const STORAGE_KEY = 'crousty-huiles-cuves';

export function HuilesProvider({ children }: { children: React.ReactNode }) {
  const [cuves, setCuvesState] = useState<HuileConfig[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved ? JSON.parse(saved) : DEFAULT_CONFIG.huiles;
    } catch {
      return DEFAULT_CONFIG.huiles;
    }
  });

  useEffect(() => {
    const load = () => {
      try {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) setCuvesState(JSON.parse(saved));
      } catch (e) {
        console.warn("Failed to refresh huiles", e);
      }
    };
    window.addEventListener('crousty-huiles-updated', load);
    return () => window.removeEventListener('crousty-huiles-updated', load);
  }, []);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(cuves));
  }, [cuves]);

  return (
    <HuilesContext.Provider value={{ cuves, setCuves: setCuvesState }}>
      {children}
    </HuilesContext.Provider>
  );
}

export const useHuiles = () => {
  const context = useContext(HuilesContext);
  if (!context) throw new Error('useHuiles must be used within a HuilesProvider');
  return context;
};
