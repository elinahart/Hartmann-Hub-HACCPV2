import {
  Package, Snowflake, Refrigerator, GlassWater, Tag
} from "lucide-react";

export const CATEGORIES_CONFIG = {
  "Frais":             { icone: Refrigerator, couleur: "#42A5F5" },
  "Sec alimentaire":   { icone: Package,      couleur: "#FF9800" },
  "Sec":               { icone: Package,      couleur: "#FF9800" },
  "Surgelé / Congelé": { icone: Snowflake,    couleur: "#1565C0" },
  "Boissons":          { icone: GlassWater,   couleur: "#00BCD4" },
  "Non catégorisé":    { icone: Tag,          couleur: "#9E9E9E" },
} as const;

export type Categorie = keyof typeof CATEGORIES_CONFIG;

export function getIconeCategorie(categorie: string) {
  // Use migration logic effectively for icon retrieval
  const mapped = migrateCategoryName(categorie);
  return CATEGORIES_CONFIG[mapped as Categorie] ?? CATEGORIES_CONFIG["Non catégorisé"];
}

export function migrateCategoryName(oldCategory: string): string {
  if (!oldCategory) return "Non catégorisé";
  const norm = oldCategory.trim();
  const lower = norm.toLowerCase();
  
  if (lower === "frais" || lower.includes("laitier") || lower.includes("viande") || lower.includes("poisson") || lower.includes("légume") || lower.includes("fruit") || lower.includes("sauce")) return "Frais";
  if (lower.includes("surge") || lower.includes("congel") || lower === "desserts") return "Surgelé / Congelé";
  if (lower.includes("boisson") || lower.includes("liquide")) return "Boissons";
  if (lower.includes("sec alimentaire") || lower.includes("épicerie") || lower.includes("boulangerie")) return "Sec alimentaire";
  if (lower === "sec") return "Sec";
  
  // If it exactly matches one of the new ones (just in case)
  if (Object.keys(CATEGORIES_CONFIG).includes(norm)) return norm;
  
  return "Non catégorisé";
}


