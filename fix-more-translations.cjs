const fs = require('fs');

// i18n
let i18n = fs.readFileSync('src/lib/i18n.tsx', 'utf8');
const en = {
  lbl_priority_actions: "PRIORITY ACTIONS",
  lbl_temp_morning_late: "Morning temperatures check late",
  lbl_temp_evening_late: "Evening temperatures check late",
  lbl_weekly_inv_late: "Weekly inventory late",
  lbl_food_cooking_pending: "Food cooking pending",
  lbl_activity_log: "Activity Log",
  lbl_no_events_24h: "0 EVENTS IN LAST 24H",
  lbl_creation_labels: "LABELS CREATION",
  lbl_manage_products: "Manage products",
  lbl_all: "All",
  lbl_frozen: "Frozen",
  lbl_dairy: "Dairy",
  lbl_dry_food: "Dry Food",
  lbl_fresh: "Fresh",
  lbl_sauces: "Sauces",
  ph_search_product: "Search product...",
  lbl_select_prod_to_config: "Select a product from the list to configure its DLC label.",
  lbl_select_product: "Select a product",
  lbl_optional_info: "OPTIONAL INFO",
  ph_optional_remarks: "Optional remarks...",
  btn_save_traceability: "Save traceability",
  lbl_history_openings: "OPENINGS HISTORY",
  lbl_no_product_scanned: "No product scanned",
  mode_airprint: "Mode: AirPrint"
};
const fr = {
  lbl_priority_actions: "ACTIONS PRIORITAIRES",
  lbl_temp_morning_late: "Relevé températures matin en retard",
  lbl_temp_evening_late: "Relevé températures soir en retard",
  lbl_weekly_inv_late: "Inventaire hebdomadaire en retard",
  lbl_food_cooking_pending: "Cuisson alimentaire en attente",
  lbl_activity_log: "Journal d'activité",
  lbl_no_events_24h: "0 ÉVÉNEMENTS DANS LES DERNIÈRES 24H",
  lbl_creation_labels: "CRÉATION D'ÉTIQUETTES",
  lbl_manage_products: "Gérer les produits",
  lbl_all: "Toutes",
  lbl_frozen: "Surgelés Congelés",
  lbl_dairy: "Produits Laitiers",
  lbl_dry_food: "Sec Alimentaire",
  lbl_fresh: "Frais",
  lbl_sauces: "Sauces",
  ph_search_product: "Rechercher un produit...",
  lbl_select_prod_to_config: "Choisissez un produit dans la liste pour configurer son étiquette DLC.",
  lbl_select_product: "Sélectionnez un produit",
  lbl_optional_info: "INFORMATIONS FACULTATIVES",
  ph_optional_remarks: "Remarques éventuelles...",
  btn_save_traceability: "Enregistrer la traçabilité",
  lbl_history_openings: "HISTORIQUE DES OUVERTURES",
  lbl_no_product_scanned: "Aucun produit scanné",
  mode_airprint: "Mode: AirPrint"
};

let enInsert = '';
for (const [k,v] of Object.entries(en)) enInsert += `    ${k}: ${JSON.stringify(v)},\n`;
let frInsert = '';
for (const [k,v] of Object.entries(fr)) frInsert += `    ${k}: ${JSON.stringify(v)},\n`;

i18n = i18n.replace('en: {\n', 'en: {\n' + enInsert);
i18n = i18n.replace('fr: {\n', 'fr: {\n' + frInsert);
fs.writeFileSync('src/lib/i18n.tsx', i18n);

// Tracabilite.tsx - fix the literal curly braces & replace missing ones
let tr = fs.readFileSync('src/modules/Tracabilite.tsx', 'utf8');
tr = tr.replace(/"\{t\('lbl_select_product'\) \|\| 'Sélectionner un produit'\}"/g, "t('lbl_select_product')");
tr = tr.replace(/placeholder="\{t\('ph_optional_remarks'\) \|\| 'Remarques éventuelles\.\.\.'\}"/g, "placeholder={t('ph_optional_remarks')}");
try { fs.writeFileSync('src/modules/Tracabilite.tsx', tr); } catch(e){}

// App.tsx
let app = fs.readFileSync('src/App.tsx', 'utf8');
if (!app.includes("import { enUS }")) {
   app = app.replace("import { fr } from 'date-fns/locale';", "import { fr, enUS } from 'date-fns/locale';");
   app = app.replace("{format(new Date(), 'EEEE d MMMM yyyy', { locale: fr })}", "{format(new Date(), 'EEEE d MMMM yyyy', { locale: language === 'en' ? enUS : fr })}");
}
try { fs.writeFileSync('src/App.tsx', app); } catch(e){}

// PriorityActions.tsx
let pa = fs.readFileSync('src/components/PriorityActions.tsx', 'utf8');
if (!pa.includes('const { t } = useI18n()')) {
  pa = pa.replace(/export function PriorityActions\(([^)]*)\)\s*\{/, "export function PriorityActions($1) {\n  const { t } = useI18n();\n");
}
if (!pa.includes('import { useI18n }')) {
  pa = pa.replace(/(import React.*?;\n)/, `$1import { useI18n } from '../lib/i18n';\n`);
}
pa = pa.replace(/label: "Relevé températures matin en retard"/g, "label: t('lbl_temp_morning_late')");
pa = pa.replace(/label: "Relevé températures soir en retard"/g, "label: t('lbl_temp_evening_late')");
pa = pa.replace(/label: "Inventaire hebdomadaire en retard"/g, "label: t('lbl_weekly_inv_late')");
pa = pa.replace(/label: "Cuisson alimentaire en attente"/g, "label: t('lbl_food_cooking_pending')");
pa = pa.replace(/Actions Prioritaires \(/g, "{t('lbl_priority_actions')} ("); 
pa = pa.replace(/>Journal d'activité</g, ">{t('lbl_activity_log')}<");
pa = pa.replace(/>0 ÉVÉNEMENTS DANS LES DERNIÈRES 24H</g, ">{t('lbl_no_events_24h')}<");
try { fs.writeFileSync('src/components/PriorityActions.tsx', pa); } catch(e){}

// DessertsDLC.tsx
let dessert = fs.readFileSync('src/modules/DessertsDLC.tsx', 'utf8');
if(!dessert.includes("useI18n")) {
   dessert = dessert.replace(/(import React.*?;\n)/, `$1import { useI18n } from '../lib/i18n';\n`);
   dessert = dessert.replace(/export default function DessertsDLC\(\)\s*\{/, "export default function DessertsDLC() { const { t } = useI18n();");
}
dessert = dessert.replace(/>CRÉATION D'ÉTIQUETTES</g, ">{t('lbl_creation_labels')}<");
dessert = dessert.replace(/>Mode: AirPrint</g, ">{t('mode_airprint')}<");
dessert = dessert.replace(/>Gérer les produits</g, ">{t('lbl_manage_products')}<");
dessert = dessert.replace(/placeholder="Rechercher un produit\.\.\."/g, "placeholder={t('ph_search_product')}");
dessert = dessert.replace(/>Toutes</g, ">{t('lbl_all')}<");
dessert = dessert.replace(/>Surgelés Congelés</g, ">{t('lbl_frozen')}<");
dessert = dessert.replace(/>Produits Laitiers</g, ">{t('lbl_dairy')}<");
dessert = dessert.replace(/>Sec Alimentaire</g, ">{t('lbl_dry_food')}<");
dessert = dessert.replace(/>Frais</g, ">{t('lbl_fresh')}<");
dessert = dessert.replace(/>Sauces</g, ">{t('lbl_sauces')}<");
dessert = dessert.replace(/>Sélectionnez un produit</g, ">{t('lbl_select_product')}<");
dessert = dessert.replace(/>Choisissez un produit dans la liste pour configurer son étiquette DLC\.</g, ">{t('lbl_select_prod_to_config')}<");
try { fs.writeFileSync('src/modules/DessertsDLC.tsx', dessert); } catch(e){}

console.log("Translations added and source files updated.");
