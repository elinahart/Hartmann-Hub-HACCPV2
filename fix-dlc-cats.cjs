const fs = require('fs');

let file = 'src/components/dlc/DlcLabelWorkspace.tsx';
let txt = fs.readFileSync(file, 'utf8');

txt = txt.replace(/\{cat\}/g, "{cat === 'Toutes' ? (t('lbl_all') || 'Toutes') : (t(cat) || cat)}");
// Just in case it was {cat} or cat, let's fix the specific place where tabs are mapped
txt = txt.replace(/\{cat === 'Toutes' \? \(t\('lbl_all'\) \|\| 'Toutes'\) : \(t\(cat\) \|\| cat\)\}/g, "{cat}"); // reset if already done
txt = txt.replace(/\{cat\}/g, "{cat === 'Toutes' ? (t('lbl_all') || 'Toutes') : t(cat)}");
// Actually let's use proper regex:
// 
// <span className="whitespace-nowrap">{cat}</span>
txt = txt.replace(/<span([^>]*)>\{cat === 'Toutes' \? \(t\('lbl_all'\) \|\| 'Toutes'\) : t\(cat\)\}<\/span>/g, "<span$1>{cat}</span>"); // reset
txt = txt.replace(/<span([^>]*)>\{cat\}<\/span>/g, "<span$1>{cat === 'Toutes' ? t('lbl_all') : (t(cat) !== cat ? t(cat) : cat)}</span>");

txt = txt.replace(/Création d'Étiquettes/g, "{t('lbl_creation_labels') || \"CRÉATION D'ÉTIQUETTES\"}");
fs.writeFileSync(file, txt);

let app = fs.readFileSync('src/modules/DessertsDLC.tsx', 'utf8');
app = app.replace(/>Création</g, ">{t('lbl_creation') || 'Création'}<");
app = app.replace(/>Historique</g, ">{t('lbl_historique') || 'Historique'}<");
fs.writeFileSync('src/modules/DessertsDLC.tsx', app);

// Now i18n
let i18n = fs.readFileSync('src/lib/i18n.tsx', 'utf8');
const en = {
  "Surgelés Congelés": "Frozen Foods",
  "Produits Laitiers": "Dairy Products",
  "Sec Alimentaire": "Dry Food",
  "Frais": "Fresh",
  "Sauces": "Sauces",
  "Desserts": "Desserts",
  "lbl_creation": "Creation"
};
const fr = {
  "Surgelés Congelés": "Surgelés Congelés",
  "Produits Laitiers": "Produits Laitiers",
  "Sec Alimentaire": "Sec Alimentaire",
  "Frais": "Frais",
  "Sauces": "Sauces",
  "Desserts": "Desserts",
  "lbl_creation": "Création"
};

let enInsert = '';
for (const [k,v] of Object.entries(en)) enInsert += `    "${k}": ${JSON.stringify(v)},\n`;
let frInsert = '';
for (const [k,v] of Object.entries(fr)) frInsert += `    "${k}": ${JSON.stringify(v)},\n`;

if (!i18n.includes('"Surgelés Congelés"')) {
   i18n = i18n.replace('en: {\n', 'en: {\n' + enInsert);
   i18n = i18n.replace('fr: {\n', 'fr: {\n' + frInsert);
   fs.writeFileSync('src/lib/i18n.tsx', i18n);
}

console.log('Fixed categories translations');
