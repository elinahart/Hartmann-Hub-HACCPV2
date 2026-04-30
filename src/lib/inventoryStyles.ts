import { 
  Thermometer, 
  Snowflake, 
  GlassWater, 
  Wheat, 
  Package,
  Archive,
  Box,
  Tag,
  ShoppingBag,
  Layers,
  Grid3x3
} from 'lucide-react';
import React from 'react';

export interface CategorieStyle {
  couleur: string;
  fond: string;
  bordure: string;
  icone: React.FC<any>;
}

export const CATEGORIE_STYLES: Record<string, CategorieStyle> = {
  'Frais': {
    couleur: '#16A34A',
    fond: '#F0FDF4',
    bordure: '#BBF7D0',
    icone: Thermometer,
  },
  'Surgelés / Congelés': {
    couleur: '#0284C7',
    fond: '#F0F9FF',
    bordure: '#BAE6FD',
    icone: Snowflake,
  },
  'Boissons': {
    couleur: '#7C3AED',
    fond: '#FAF5FF',
    bordure: '#DDD6FE',
    icone: GlassWater,
  },
  'Sec Alimentaire': {
    couleur: '#D97706',
    fond: '#FFFBEB',
    bordure: '#FDE68A',
    icone: Wheat,
  },
  'Sec': {
    couleur: '#475569',
    fond: '#F8FAFC',
    bordure: '#CBD5E1',
    icone: Package,
  },
};

export const ICONES_FALLBACK = [
  Archive, Box, Tag, ShoppingBag, Layers, Grid3x3,
];

export const COULEURS_FALLBACK = [
  '#EC4899', '#14B8A6', '#F97316', '#6366F1', '#EF4444', '#84CC16',
];

export const getCategorieStyle = (nom: string): CategorieStyle => {
  if (CATEGORIE_STYLES[nom]) return CATEGORIE_STYLES[nom];
  
  // Hash function to pick a stable fallback color/icon based on name
  let hash = 0;
  for (let i = 0; i < nom.length; i++) {
    hash = nom.charCodeAt(i) + ((hash << 5) - hash);
  }
  const colorIndex = Math.abs(hash) % COULEURS_FALLBACK.length;
  const iconIndex = Math.abs(hash) % ICONES_FALLBACK.length;
  
  const couleur = COULEURS_FALLBACK[colorIndex];
  return {
    couleur: couleur,
    fond: `${couleur}10`, // 10% opacity
    bordure: `${couleur}30`, // 30% opacity
    icone: ICONES_FALLBACK[iconIndex]
  };
};
