import React, { createContext, useContext, useState, useEffect } from 'react';
import { InventoryProduct } from '../types';
import { getStoredData, setStoredData } from '../lib/db';
import { getSmartIcon, DEFAULT_CATEGORIES } from '../components/GererLesProduits';

interface InventaireContextType {
  products: InventoryProduct[];
  setProducts: (products: InventoryProduct[]) => void;
  updateProduct: (id: string, updates: Partial<InventoryProduct>) => void;
  deleteProduct: (id: string) => void;
  addProduct: (product: Omit<InventoryProduct, 'id'>) => void;
}

const InventaireContext = createContext<InventaireContextType | undefined>(undefined);

const STORAGE_KEY = 'crousty-inventaire-produits';

export function InventaireProvider({ children }: { children: React.ReactNode }) {
  const [products, setProductsState] = useState<InventoryProduct[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) return JSON.parse(saved);
      
      // Fallback to defaults + auto-init
      const initial: InventoryProduct[] = [];
      Object.entries(DEFAULT_CATEGORIES).forEach(([cat, items]) => {
        items.forEach(item => {
          initial.push({ 
            id: Math.random().toString(36).substring(2, 11), 
            name: item, 
            category: cat, 
            minThreshold: 0,
            icon: getSmartIcon(item, cat)
          });
        });
      });
      return initial;
    } catch {
      return [];
    }
  });

  // Listen to cross-module updates (like global import)
  useEffect(() => {
    const handleUpdate = () => {
      try {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) setProductsState(JSON.parse(saved));
      } catch(e){}
    };
    window.addEventListener('crousty-inventaire-produits-updated', handleUpdate);
    return () => window.removeEventListener('crousty-inventaire-produits-updated', handleUpdate);
  }, []);

  // Persist to localStorage whenever state changes
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(products));
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
    setProductsState(prev => [...prev, newProduct]);
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
