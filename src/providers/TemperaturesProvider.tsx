import React, { createContext, useContext, useState, useEffect } from 'react';
import { TemperatureConfig, DEFAULT_CONFIG } from '../lib/configSchema';

interface TemperaturesContextType {
  zones: TemperatureConfig[];
  setZones: (zones: TemperatureConfig[]) => void;
}

const TemperaturesContext = createContext<TemperaturesContextType | undefined>(undefined);

const STORAGE_KEY = 'crousty-temperatures-zones';

export function TemperaturesProvider({ children }: { children: React.ReactNode }) {
  const [zones, setZonesState] = useState<TemperatureConfig[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved ? JSON.parse(saved) : DEFAULT_CONFIG.temperatures;
    } catch {
      return DEFAULT_CONFIG.temperatures;
    }
  });

  useEffect(() => {
    const load = () => {
      try {
        const saved = localStorage.getItem(STORAGE_KEY);
        setZonesState(saved ? JSON.parse(saved) : DEFAULT_CONFIG.temperatures);
      } catch {
        // preserve current state if error or just use defaults
      }
    };
    
    window.addEventListener('crousty-temperatures-updated', load);
    return () => window.removeEventListener('crousty-temperatures-updated', load);
  }, []);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(zones));
  }, [zones]);

  return (
    <TemperaturesContext.Provider value={{ zones, setZones: setZonesState }}>
      {children}
    </TemperaturesContext.Provider>
  );
}

export const useTemperatures = () => {
  const context = useContext(TemperaturesContext);
  if (!context) throw new Error('useTemperatures must be used within a TemperaturesProvider');
  return context;
};
