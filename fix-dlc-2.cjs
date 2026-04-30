const fs = require('fs');

let file = 'src/components/dlc/DlcLabelWorkspace.tsx';
let txt = fs.readFileSync(file, 'utf8');

txt = txt.replace(/Création d'Étiquettes/g, "{t('lbl_creation_labels') || \"CRÉATION D'ÉTIQUETTES\"}");
// also: "Toutes", "Surgelés Congelés", "Produits Laitiers", "Sec Alimentaire", "Frais", "Sauces"
// they might be in a categories array or tabs.
txt = txt.replace(/'Toutes'/g, "t('lbl_all') || 'Toutes'");
txt = txt.replace(/>Toutes</g, ">{t('lbl_all') || 'Toutes'}<");
txt = txt.replace(/>Surgelés Congelés</g, ">{t('lbl_frozen') || 'Surgelés Congelés'}<");
txt = txt.replace(/>Produits Laitiers</g, ">{t('lbl_dairy') || 'Produits Laitiers'}<");
txt = txt.replace(/>Sec Alimentaire</g, ">{t('lbl_dry_food') || 'Sec Alimentaire'}<");
txt = txt.replace(/>Frais</g, ">{t('lbl_fresh') || 'Frais'}<");
txt = txt.replace(/>Sauces</g, ">{t('lbl_sauces') || 'Sauces'}<");

fs.writeFileSync(file, txt);

let file2 = 'src/modules/DessertsDLC.tsx';
let txt2 = fs.readFileSync(file2, 'utf8');
txt2 = txt2.replace(/>Création</g, ">{t('lbl_creation') || 'Création'}<");
txt2 = txt2.replace(/>Historique</g, ">{t('lbl_historique') || 'Historique'}<");
fs.writeFileSync(file2, txt2);

console.log('Fixed Dlc strings again');
