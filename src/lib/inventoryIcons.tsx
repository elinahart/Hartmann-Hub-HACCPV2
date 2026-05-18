import React from 'react';
import { Package, Box, Droplets, CupSoda, Beef, Leaf, Flame, Snowflake, IceCream2, Coffee, Milk, Wine, Apple, Drumstick, Wheat, Carrot, Candy, Utensils, Archive, ShoppingBag, CakeSlice, Droplet, GlassWater, Dessert, Fish } from 'lucide-react';

export const CustomCheeseIcon = (props: any) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <path d="M12 3L3 15h18Z" />
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
    <circle cx="9" cy="11" r="1.5" />
    <circle cx="14" cy="14" r="2" />
    <circle cx="11" cy="18" r="1.5" />
  </svg>
);

export const CustomBottleIcon = (props: any) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <rect x="7" y="10" width="10" height="12" rx="3" ry="3" />
    <path d="M10 4h4v6h-4z" />
    <path d="M9 2h6v2H9z" />
    <path d="M8 15h8" />
  </svg>
);

export const CustomCanIcon = (props: any) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <rect x="6" y="4" width="12" height="16" rx="2" ry="2" />
    <path d="M6 8h12" />
    <path d="M6 16h12" />
    <path d="M12 4v3" />
  </svg>
);

export const ICONS_MAP: Record<string, React.FC<any>> = {
  Package, Box, Droplets, CupSoda, Beef, Leaf, Flame, Snowflake, 
  IceCream2, Coffee, Milk, Wine, Apple, Drumstick, Wheat, Carrot, 
  Candy, Utensils, Archive, ShoppingBag, CakeSlice, Droplet, GlassWater, Dessert, Fish,
  CustomCheese: CustomCheeseIcon,
  CustomBottle: CustomBottleIcon,
  CustomCan: CustomCanIcon
};

export const getSmartIcon = (name: string, category: string): string => {
  const n = (name || "").toLowerCase();
  if (n.includes('cristaline') || n.includes('eau') || n.includes('perrier') || n.includes('bouteille') || n.includes('evian') || n.includes('vittel')) return 'CustomBottle';
  if (n.includes('dada') || n.includes('canette') || n.includes('boisson') || n.includes('coca') || n.includes('fanta') || n.includes('sprite') || n.includes('oasis') || n.includes('ice tea') || n.includes('tropico') || n.includes('schweppes') || n.includes('pepsi') || n.includes('7up')) return 'CustomCan';
  if (n.includes('mozzarella') || n.includes('cheddar') || n.includes('camembert') || n.includes('chèvre') || n.includes('raclette') || n.includes('fromage') || n.includes('brie') || n.includes('emmental') || n.includes('gruyère') || n.includes('parmesan') || n.includes('feta') || n.includes('gouda')) return 'CustomCheese';
  if (n.includes('riz au lait') || n.includes('tiramisu') || n.includes('dessert')) return 'Dessert';
  if (n.includes('tenders') || n.includes('nuggets') || n.includes('cordon bleu')) return 'Drumstick';
  if (n.includes('sauce')) return 'Droplets';
  if (n.includes('riz')) return 'Wheat';
  if (n.includes('crème')) return 'Milk';
  if (n.includes('ail') || n.includes('persil') || n.includes('oignon')) return 'Leaf';
  if (n.includes('nutella') || n.includes('oreo') || n.includes('m&ms') || n.includes('daim') || n.includes('caramel') || n.includes('bueno')) return 'Candy';
  if (n.includes('paille') || n.includes('serviette') || n.includes('sac') || n.includes('boîte') || n.includes('couvercle')) return 'ShoppingBag';
  if (category?.includes('Surgelé')) return 'Snowflake';
  if (category?.includes('Sec alimentaire')) return 'Archive';
  if (category === 'Sec') return 'Box';
  return 'Package';
};
