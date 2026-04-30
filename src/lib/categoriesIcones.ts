import {
  IceCream, Refrigerator, Snowflake, GlassWater,
  Package, ChefHat, Beef, Tag, Cookie, Milk,
  Croissant, Droplets, Apple, Fish
} from "lucide-react";

export const CATEGORIES_CONFIG = {
  "Desserts":          { icone: IceCream,     couleur: "var(--color-primary)" },
  "Frais":             { icone: Refrigerator,  couleur: "#42A5F5" },
  "Surgelés Congelés": { icone: Snowflake,     couleur: "#1565C0" },
  "Boissons":          { icone: GlassWater,    couleur: "#00BCD4" },
  "Sec Alimentaire":   { icone: Package,       couleur: "#FF9800" },
  "Sauces":            { icone: ChefHat,       couleur: "#4CAF50" },
  "Viandes":           { icone: Beef,          couleur: "#F44336" },
  "Produits Laitiers": { icone: Milk,          couleur: "#FFC107" },
  "Boulangerie":       { icone: Croissant,     couleur: "#795548" },
  "Fruits Légumes":    { icone: Apple,         couleur: "#8BC34A" },
  "Poissons":          { icone: Fish,          couleur: "#03A9F4" },
  "Non catégorisé":    { icone: Tag,           couleur: "#9E9E9E" },
} as const;

export type Categorie = keyof typeof CATEGORIES_CONFIG;

export function getIconeCategorie(categorie: string) {
  return CATEGORIES_CONFIG[categorie as Categorie] 
    ?? CATEGORIES_CONFIG["Non catégorisé"];
}
