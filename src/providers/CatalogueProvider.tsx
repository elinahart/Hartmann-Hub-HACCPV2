import React, { createContext, useContext, useState, useEffect } from 'react';
import { ProductDef } from '../types';
import { migrateProductsToUnified } from '../lib/productMigration';

interface CatalogueContextType {
  produits: ProductDef[];
  setProduits: (produits: ProductDef[]) => void;
}

const CatalogueContext = createContext<CatalogueContextType | undefined>(undefined);

const STORAGE_KEY = 'crousty_unified_products';

export function CatalogueProvider({ children }: { children: React.ReactNode }) {
  const [produits, setProduitsState] = useState<ProductDef[]>(() => {
    try {
      const unified = migrateProductsToUnified();
      return unified;
    } catch {
      return [];
    }
  });

  useEffect(() => {
    const current = JSON.stringify(produits);
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved !== current) {
      localStorage.setItem(STORAGE_KEY, current);
      window.dispatchEvent(new Event('crousty_unified_products_updated'));
    }
  }, [produits]);

  // Écouter les mises à jour en provenance de cross module
  useEffect(() => {
    const handleImportUpdate = () => {
        try {
          const saved = localStorage.getItem(STORAGE_KEY);
          if (saved) {
            setProduitsState(prev => {
              if (JSON.stringify(prev) === saved) return prev;
              return JSON.parse(saved);
            });
          }
        } catch { /* ignore */ }
    };
    window.addEventListener('crousty_unified_products_updated', handleImportUpdate);
    return () => window.removeEventListener('crousty_unified_products_updated', handleImportUpdate);
  }, []);

  const setProduits = (newProduits: ProductDef[]) => {
    setProduitsState(newProduits);
  };

  return (
    <CatalogueContext.Provider value={{ produits, setProduits }}>
      {children}
    </CatalogueContext.Provider>
  );
}

export const useCatalogue = () => {
  const context = useContext(CatalogueContext);
  if (!context) throw new Error('useCatalogue must be used within a CatalogueProvider');
  return context;
};
