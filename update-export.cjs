const fs = require('fs');
let content = fs.readFileSync('src/lib/exportPro.ts', 'utf8');

// Replace standard generation
content = content.replace(
  /export const generateProXLSX = [\s\S]*?};\n/,
  `export const generateProXLSX = async (options: ExportOptions) => {
  const wb = XLSX.utils.book_new();
  const periodStr = getPeriodString(options);
  
  if (options.categories.temperatures) {
    XLSX.utils.book_append_sheet(wb, generateTempSheet(options, periodStr), "Températures");
  }
  if (options.categories.tracabilite) {
    XLSX.utils.book_append_sheet(wb, generateTracabiliteSheet(options, periodStr), "Traçabilité");
  }
  if (options.categories.viandes) {
    XLSX.utils.book_append_sheet(wb, generateViandesSheet(options, periodStr), "Cuisson Alimentaire");
  }
  if (options.categories.huiles) {
    XLSX.utils.book_append_sheet(wb, generateHuileSheet(options, periodStr), "Contrôle Huile");
  }
  if (options.categories.inventaire) {
    XLSX.utils.book_append_sheet(wb, generateInventaireSheet(options, periodStr), "Inventaire");
  }
  if (options.categories.nettoyage) {
    XLSX.utils.book_append_sheet(wb, generateNettoyageSheet(options, periodStr), "Nettoyage");
  }

  const prefix = options.periodType === 'day' ? format(options.targetDate, 'yyyy_MM_dd') : format(options.targetDate, 'MM_yyyy');
  const fileName = \`HACCP_CroustyGame_\${prefix}.xlsx\`;
  XLSX.writeFile(wb, fileName);
};\n`
);

// We need to pass options instead of targetDate and monthYear string
content = content.replace(/const generateTempSheet = \(targetDate: Date, monthYear: string\) => {/g, 'const generateTempSheet = (options: ExportOptions, periodStr: string) => {');
content = content.replace(/getDataForMonth\('crousty_temp_checklist', targetDate\)/g, "getDataForPeriod('crousty_temp_checklist', options)");

content = content.replace(/const generateTracabiliteSheet = \(targetDate: Date, monthYear: string\) => {/g, 'const generateTracabiliteSheet = (options: ExportOptions, periodStr: string) => {');
content = content.replace(/getDataForMonth\('crousty_receptions', targetDate\)/g, "getDataForPeriod('crousty_receptions', options)");

content = content.replace(/const generateViandesSheet = \(targetDate: Date, monthYear: string\) => {/g, 'const generateViandesSheet = (options: ExportOptions, periodStr: string) => {');
content = content.replace(/getDataForMonth\('crousty_viandes', targetDate\)/g, "getDataForPeriod('crousty_viandes', options)");

content = content.replace(/const generateHuileSheet = \(targetDate: Date, monthYear: string\) => {/g, 'const generateHuileSheet = (options: ExportOptions, periodStr: string) => {');
content = content.replace(/getDataForMonth\('crousty_oil_checklist', targetDate\)/g, "getDataForPeriod('crousty_oil_checklist', options)");

content = content.replace(/const generateInventaireSheet = \(targetDate: Date, monthYear: string\) => {/g, 'const generateInventaireSheet = (options: ExportOptions, periodStr: string) => {');
content = content.replace(/getDataForMonth\('crousty_inventory', targetDate\)/g, "getDataForPeriod('crousty_inventory', options)");

// Also replace `Mois / Année : ${monthYear}` with Période for all sheets
// Important to target the exact string and backticks
content = content.replace(/`Mois \/ Année : \$\{monthYear\}`/g, "`Période : ${periodStr}`");

fs.writeFileSync('src/lib/exportPro.ts', content);
