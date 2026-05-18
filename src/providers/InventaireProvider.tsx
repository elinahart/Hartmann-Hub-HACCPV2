import React, { createContext, useContext, useState, useEffect } from 'react';
import { InventoryProduct } from '../types';
import { migrateProductsToUnified } from '../lib/productMigration';

interface InventaireContextType {
  products: InventoryProduct[];
  setProducts: (products: InventoryProduct[]) => void;
  updateProduct: (id: string, updates: Partial<InventoryProduct>) => void;
  deleteProduct: (id: string) => void;
  addProduct: (product: Omit<InventoryProduct, 'id'>) => void;
}

const InventaireContext = createContext<InventaireContextType | undefined>(undefined);

const STORAGE_KEY = 'crousty_unified_products';

export function InventaireProvider({ children }: { children: React.ReactNode }) {
  const [products, setProductsState] = useState<InventoryProduct[]>(() => {
    try {
      const unified = migrateProductsToUnified();
      return unified;
    } catch {
      return [];
    }
  });

  // Listen to cross-module updates
  useEffect(() => {
    const handleUpdate = () => {
      try {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) {
          setProductsState(prev => {
            if (JSON.stringify(prev) === saved) return prev;
            return JSON.parse(saved);
          });
        }
      } catch(e){}
    };
    window.addEventListener('crousty_unified_products_updated', handleUpdate);
    return () => window.removeEventListener('crousty_unified_products_updated', handleUpdate);
  }, []);

  // Persist to localStorage whenever state changes
  useEffect(() => {
    const current = JSON.stringify(products);
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved !== current) {
      localStorage.setItem(STORAGE_KEY, current);
      window.dispatchEvent(new Event('crousty_unified_products_updated'));
    }
  }, [products]);

  const setProducts = (newProducts: InventoryProduct[]) => {
    setProductsState(newProducts);
  };

  const updateProduct = (id: string, updates: Partial<InventoryProduct>) => {
    setProductsState(prev => prev.map(p => p.id === id ? { ...p, ...updates } : p));
  };

  const deleteProduct = (id: string) => {
    setProductsState(prev => prev.filter(p => p.id !== id));
  };

  const addProduct = (product: Omit<InventoryProduct, 'id'>) => {
    const newProduct = { ...product, id: Math.random().toString(36).substring(2, 11) };
    setProductsState(prev => [...prev, newProduct as InventoryProduct]);
  };

  return (
    <InventaireContext.Provider value={{ products, setProducts, updateProduct, deleteProduct, addProduct }}>
      {children}
    </InventaireContext.Provider>
  );
}

export const useInventaire = () => {
  const context = useContext(InventaireContext);
  if (!context) throw new Error('useInventaire must be used within an InventaireProvider');
  return context;
};
