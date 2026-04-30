import React, { createContext, useContext, useState, useEffect } from 'react';
import { ProductDef } from '../types';
import { getMergedProducts } from '../lib/croustyConfig';

interface CatalogueContextType {
  produits: ProductDef[];
  setProduits: (produits: ProductDef[]) => void;
}

const CatalogueContext = createContext<CatalogueContextType | undefined>(undefined);

const STORAGE_KEY = 'crousty-catalogue-produits';

export function CatalogueProvider({ children }: { children: React.ReactNode }) {
  const [produits, setProduitsState] = useState<ProductDef[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) return JSON.parse(saved);
      
      // Fallback to existing defaults if main key is empty
      return getMergedProducts();
    } catch {
      return [];
    }
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(produits));
  }, [produits]);

  // Écouter les mises à jour en provenance de l'import
  useEffect(() => {
    const handleImportUpdate = (e: any) => {
      if (e.detail?.products && Array.isArray(e.detail.products)) {
        setProduitsState(e.detail.products);
      } else {
        // Fallback: reread from localStorage
        try {
          const saved = localStorage.getItem(STORAGE_KEY);
          if (saved) setProduitsState(JSON.parse(saved));
        } catch { /* ignore */ }
      }
    };
    window.addEventListener('catalogue-produits-updated', handleImportUpdate);
    return () => window.removeEventListener('catalogue-produits-updated', handleImportUpdate);
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
