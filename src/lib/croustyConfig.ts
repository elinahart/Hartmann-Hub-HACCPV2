import { getStoredData } from './db';
import { ProductDef } from '../types';

export interface ProduitCatalogue {
  id: string;
  nom: string;
  categorie: string;
  icone?: string;
  iconeCouleur?: string;
  dlcValeur: number;
  dlcUnite: "heures" | "jours" | "mois" | "hours" | "days";
  conservation?: string;
  note?: string;
  readOnly?: boolean;
}

export const DEFAULT_CROUSTY_CONFIG: { produits: ProduitCatalogue[] } = {
  produits: [
    // ─── SURGELÉS / CONGELÉS ───────────────────────────────
    {
      id: "tenders-poulet",
      nom: "Tenders poulet",
      categorie: "Surgelés Congelés",
      icone: "Snowflake",
      iconeCouleur: "#1565C0",
      dlcValeur: 2,
      dlcUnite: "jours",
      conservation: "≤ 4°C",
      note: "Après décongélation",
      readOnly: true
    },
    {
      id: "cordon-bleu",
      nom: "Cordon bleu",
      categorie: "Surgelés Congelés",
      icone: "Snowflake",
      iconeCouleur: "#1565C0",
      dlcValeur: 2,
      dlcUnite: "jours",
      conservation: "≤ 4°C",
      note: "Après décongélation",
      readOnly: true
    },
    {
      id: "fish-pane",
      nom: "Fish pané",
      categorie: "Surgelés Congelés",
      icone: "Snowflake",
      iconeCouleur: "#1565C0",
      dlcValeur: 2,
      dlcUnite: "jours",
      conservation: "≤ 4°C",
      note: "Après décongélation",
      readOnly: true
    },
    {
      id: "nuggets",
      nom: "Nuggets",
      categorie: "Surgelés Congelés",
      icone: "Snowflake",
      iconeCouleur: "#1565C0",
      dlcValeur: 2,
      dlcUnite: "jours",
      conservation: "≤ 4°C",
      note: "Après décongélation",
      readOnly: true
    },
    {
      id: "bouchees-camembert",
      nom: "Bouchées camembert",
      categorie: "Surgelés Congelés",
      icone: "Snowflake",
      iconeCouleur: "#1565C0",
      dlcValeur: 2,
      dlcUnite: "jours",
      conservation: "≤ 4°C",
      note: "Après décongélation",
      readOnly: true
    },
    {
      id: "onion-rings",
      nom: "Onion rings",
      categorie: "Surgelés Congelés",
      icone: "Snowflake",
      iconeCouleur: "#1565C0",
      dlcValeur: 2,
      dlcUnite: "jours",
      conservation: "≤ 4°C",
      note: "Après décongélation",
      readOnly: true
    },
    {
      id: "alloco",
      nom: "Alloco",
      categorie: "Surgelés Congelés",
      icone: "Snowflake",
      iconeCouleur: "#1565C0",
      dlcValeur: 2,
      dlcUnite: "jours",
      conservation: "≤ 4°C",
      note: "Après décongélation",
      readOnly: true
    },
    {
      id: "tex-mex",
      nom: "Tex Mex",
      categorie: "Surgelés Congelés",
      icone: "Snowflake",
      iconeCouleur: "#1565C0",
      dlcValeur: 2,
      dlcUnite: "jours",
      conservation: "≤ 4°C",
      note: "Après décongélation",
      readOnly: true
    },
    // ─── FROMAGES / PRODUITS LAITIERS ─────────────────────
    {
      id: "fromage-chevre",
      nom: "Fromage de chèvre",
      categorie: "Produits Laitiers",
      icone: "Milk",
      iconeCouleur: "#FFC107",
      dlcValeur: 4,
      dlcUnite: "jours",
      conservation: "≤ 4°C",
      note: "Après ouverture",
      readOnly: true
    },
    {
      id: "mozzarella",
      nom: "Mozzarella",
      categorie: "Produits Laitiers",
      icone: "Milk",
      iconeCouleur: "#FFC107",
      dlcValeur: 2,
      dlcUnite: "jours",
      conservation: "≤ 4°C",
      note: "Après ouverture",
      readOnly: true
    },
    {
      id: "creme-liquide",
      nom: "Crème liquide",
      categorie: "Produits Laitiers",
      icone: "Milk",
      iconeCouleur: "#FFC107",
      dlcValeur: 3,
      dlcUnite: "jours",
      conservation: "≤ 4°C",
      note: "Après ouverture",
      readOnly: true
    },
    {
      id: "cheddar-rape",
      nom: "Cheddar râpé",
      categorie: "Produits Laitiers",
      icone: "Milk",
      iconeCouleur: "#FFC107",
      dlcValeur: 5,
      dlcUnite: "jours",
      conservation: "≤ 4°C",
      note: "Après ouverture",
      readOnly: true
    },
    {
      id: "boursin",
      nom: "Boursin",
      categorie: "Produits Laitiers",
      icone: "Milk",
      iconeCouleur: "#FFC107",
      dlcValeur: 7,
      dlcUnite: "jours",
      conservation: "≤ 4°C",
      note: "Après ouverture",
      readOnly: true
    },
    {
      id: "raclette",
      nom: "Raclette",
      categorie: "Produits Laitiers",
      icone: "Milk",
      iconeCouleur: "#FFC107",
      dlcValeur: 2,
      dlcUnite: "jours",
      conservation: "≤ 4°C",
      note: "Après ouverture",
      readOnly: true
    },
    // ─── ASSAISONNEMENTS ───────────────────────────────────
    {
      id: "oignons-crispy",
      nom: "Oignons crispy",
      categorie: "Sec Alimentaire",
      icone: "Package",
      iconeCouleur: "#FF9800",
      dlcValeur: 10,
      dlcUnite: "jours",
      conservation: "Ambiant",
      note: "Après ouverture, à l'abri de l'humidité",
      readOnly: true
    },
    {
      id: "persil-ail-poudre",
      nom: "Persil / Ail en poudre",
      categorie: "Sec Alimentaire",
      icone: "Package",
      iconeCouleur: "#FF9800",
      dlcValeur: 1,
      dlcUnite: "mois",
      conservation: "Ambiant",
      note: "Après ouverture",
      readOnly: true
    },
    {
      id: "ail-frais",
      nom: "Ail frais",
      categorie: "Frais",
      icone: "Refrigerator",
      iconeCouleur: "#42A5F5",
      dlcValeur: 2,
      dlcUnite: "jours",
      conservation: "≤ 4°C",
      note: "Après préparation",
      readOnly: true
    },
    {
      id: "persil-frais",
      nom: "Persil frais",
      categorie: "Frais",
      icone: "Refrigerator",
      iconeCouleur: "#42A5F5",
      dlcValeur: 2,
      dlcUnite: "jours",
      conservation: "≤ 4°C",
      note: "Après préparation",
      readOnly: true
    },
    // ─── SAUCES INDUSTRIELLES ─────────────────────────────
    {
      id: "sauce-sriracha",
      nom: "Sauce Sriracha",
      categorie: "Sauces",
      icone: "ChefHat",
      iconeCouleur: "#4CAF50",
      dlcValeur: 15,
      dlcUnite: "jours",
      conservation: "≤ 4°C",
      note: "Après ouverture",
      readOnly: true
    },
    {
      id: "sauce-poivre",
      nom: "Sauce poivre",
      categorie: "Sauces",
      icone: "ChefHat",
      iconeCouleur: "#4CAF50",
      dlcValeur: 15,
      dlcUnite: "jours",
      conservation: "≤ 4°C",
      note: "Après ouverture",
      readOnly: true
    },
    {
      id: "sauce-algerienne",
      nom: "Sauce Algérienne",
      categorie: "Sauces",
      icone: "ChefHat",
      iconeCouleur: "#4CAF50",
      dlcValeur: 15,
      dlcUnite: "jours",
      conservation: "≤ 4°C",
      note: "Après ouverture",
      readOnly: true
    },
    {
      id: "sauce-fish",
      nom: "Sauce Fish",
      categorie: "Sauces",
      icone: "ChefHat",
      iconeCouleur: "#4CAF50",
      dlcValeur: 15,
      dlcUnite: "jours",
      conservation: "≤ 4°C",
      note: "Après ouverture",
      readOnly: true
    },
    {
      id: "sauce-sweet-chili",
      nom: "Sauce Sweet chili",
      categorie: "Sauces",
      icone: "ChefHat",
      iconeCouleur: "#4CAF50",
      dlcValeur: 15,
      dlcUnite: "jours",
      conservation: "≤ 4°C",
      note: "Après ouverture",
      readOnly: true
    },
    {
      id: "sauce-soja-sucree",
      nom: "Sauce Soja sucrée",
      categorie: "Sauces",
      icone: "ChefHat",
      iconeCouleur: "#4CAF50",
      dlcValeur: 15,
      dlcUnite: "jours",
      conservation: "≤ 4°C",
      note: "Après ouverture",
      readOnly: true
    },
    {
      id: "mayonnaise",
      nom: "Mayonnaise",
      categorie: "Sauces",
      icone: "ChefHat",
      iconeCouleur: "#4CAF50",
      dlcValeur: 7,
      dlcUnite: "jours",
      conservation: "≤ 4°C",
      note: "Après ouverture — HACCP J+7 max",
      readOnly: true
    },
    {
      id: "miel",
      nom: "Miel",
      categorie: "Sec Alimentaire",
      icone: "Package",
      iconeCouleur: "#FF9800",
      dlcValeur: 6,
      dlcUnite: "mois",
      conservation: "Ambiant",
      note: "Après ouverture",
      readOnly: true
    },
    // ─── SAUCES MAISON ────────────────────────────────────
    {
      id: "sauce-crousty-maison",
      nom: "Sauce Crousty maison",
      categorie: "Sauces",
      icone: "ChefHat",
      iconeCouleur: "#E91E8C",
      dlcValeur: 3,
      dlcUnite: "jours",
      conservation: "≤ 4°C",
      note: "Préparation maison",
      readOnly: true
    },
    {
      id: "sauce-boursin-maison",
      nom: "Sauce Boursin maison",
      categorie: "Sauces",
      icone: "ChefHat",
      iconeCouleur: "#E91E8C",
      dlcValeur: 3,
      dlcUnite: "jours",
      conservation: "≤ 4°C",
      note: "Préparation maison",
      readOnly: true
    },
    {
      id: "sauce-verte-maison",
      nom: "Sauce verte maison",
      categorie: "Sauces",
      icone: "ChefHat",
      iconeCouleur: "#E91E8C",
      dlcValeur: 3,
      dlcUnite: "jours",
      conservation: "≤ 4°C",
      note: "Préparation maison",
      readOnly: true
    },
    // ─── LÉGUMES ──────────────────────────────────────────
    {
      id: "piment-jalapeno",
      nom: "Piment jalapeño",
      categorie: "Légumes",
      icone: "Apple",
      iconeCouleur: "#8BC34A",
      dlcValeur: 14,
      dlcUnite: "jours",
      conservation: "≤ 4°C",
      note: "En saumure, après ouverture",
      readOnly: true
    },
    // ─── DESSERTS ─────────────────────────────────────────
    {
      id: "tiramisu",
      nom: "Tiramisu",
      categorie: "Desserts",
      icone: "IceCream",
      iconeCouleur: "#E91E8C",
      dlcValeur: 2,
      dlcUnite: "jours",
      conservation: "≤ 4°C",
      note: "Après décongélation — stocké à ≤ -18°C, J+2 max HACCP, ne pas recongeler",
      readOnly: true
    },
    {
      id: "riz-au-lait",
      nom: "Riz au Lait",
      categorie: "Desserts",
      icone: "IceCream",
      iconeCouleur: "#E91E8C",
      dlcValeur: 3,
      dlcUnite: "jours",
      conservation: "≤ 4°C",
      note: "Après ouverture — produit industriel, J+3 max HACCP",
      readOnly: true
    }
  ]
};

export function getMergedProducts(): ProductDef[] {
  const defProduits: ProductDef[] = DEFAULT_CROUSTY_CONFIG.produits.map(p => ({
    id: p.id,
    name: p.nom,
    category: p.categorie,
    dlcValue: p.dlcValeur,
    dlcUnit: p.dlcUnite === 'jours' ? 'days' : p.dlcUnite === 'heures' ? 'hours' : p.dlcUnite,
    conservation: p.conservation,
    note: p.note,
    icone: p.icone,
    iconeCouleur: p.iconeCouleur,
    readOnly: false // All products can be edited by manager, so remove readOnly
  }));

  const stored = getStoredData<ProductDef[]>('crousty_products', []);
  
  if (stored.length > 0) {
    return stored.map(p => ({ ...p, readOnly: false }));
  }

  // If there are no stored products, we return the defaults
  // AND save them so they become the single source of truth editable by user
  return defProduits;
}
