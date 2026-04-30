import * as XLSX from 'xlsx-js-style';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { getStoredData, getPhoto } from './db';
import { format, getDate, getMonth, getYear, isSameMonth, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';

export interface ExportOptions {
  periodType: 'day' | 'month';
  targetDate: Date;
  categories: {
    temperatures: boolean;
    tracabilite: boolean;
    receptions: boolean;
    viandes: boolean;
    huiles: boolean;
    inventaire: boolean;
    nettoyage: boolean;
  };
  restaurantInfo?: {
    nom: string;
    ville?: string;
    logo?: string;
  };
}

// Helper to get data for a specific period
const getDataForPeriod = (key: string, options: ExportOptions) => {
  const data = getStoredData<any[]>(key, []);
  return data.filter(item => {
    const itemDate = new Date(item.date);
    if (options.periodType === 'day') {
      return itemDate.getFullYear() === options.targetDate.getFullYear() &&
             itemDate.getMonth() === options.targetDate.getMonth() &&
             itemDate.getDate() === options.targetDate.getDate();
    } else {
      return isSameMonth(itemDate, options.targetDate);
    }
  });
};

const getPeriodString = (options: ExportOptions) => {
  if (options.periodType === 'day') {
    return format(options.targetDate, 'dd MMMM yyyy', { locale: fr }).toUpperCase();
  }
  return format(options.targetDate, 'MMMM yyyy', { locale: fr }).toUpperCase();
};

const getBranding = (options: ExportOptions) => {
  const name = options.restaurantInfo?.nom || "CROUSTY HUB";
  const city = options.restaurantInfo?.ville;
  return city ? `${name.toUpperCase()} - ${city.toUpperCase()}` : name.toUpperCase();
};


const commonStyles = {
  header: {
    font: { bold: true, color: { rgb: "FFFFFF" } },
    fill: { fgColor: { rgb: "B026FF" } }, // Purple
    alignment: { horizontal: "center", vertical: "center", wrapText: true },
    border: { top: { style: "thin" }, bottom: { style: "thin" }, left: { style: "thin" }, right: { style: "thin" } }
  },
  cell: {
    alignment: { horizontal: "center", vertical: "center" },
    border: { top: { style: "thin" }, bottom: { style: "thin" }, left: { style: "thin" }, right: { style: "thin" } }
  },
  title: {
    font: { bold: true, sz: 14, color: { rgb: "FFFFFF" } },
    fill: { fgColor: { rgb: "1A0B2E" } }, // Dark
    alignment: { horizontal: "center", vertical: "center" }
  },
  subtitle: {
    font: { bold: true },
    alignment: { horizontal: "left", vertical: "center" }
  },
  rappel: {
    font: { italic: true, color: { rgb: "FFFFFF" }, sz: 10 },
    fill: { fgColor: { rgb: "FF2A9D" } }, // Pink
    alignment: { horizontal: "left", vertical: "center" }
  }
};

export const generateProXLSX = async (options: ExportOptions) => {
  const wb = XLSX.utils.book_new();
  const periodStr = getPeriodString(options);
  
  if (options.categories.temperatures) {
    XLSX.utils.book_append_sheet(wb, generateTempSheet(options, periodStr), "Températures");
  }
  if (options.categories.tracabilite) {
    XLSX.utils.book_append_sheet(wb, generateTracabiliteSheet(options, periodStr), "Traçabilité");
  }
  if (options.categories.receptions) {
    XLSX.utils.book_append_sheet(wb, generateReceptionsSheet(options, periodStr), "Réceptions");
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
  const restoName = options.restaurantInfo?.nom?.replace(/\s+/g, '_') || 'CroustyHub';
  const fileName = `HACCP_${restoName}_${prefix}.xlsx`;
  XLSX.writeFile(wb, fileName);
};

const generateTempSheet = (options: ExportOptions, periodStr: string) => {
  const data = getDataForPeriod('crousty_temp_checklist', options);
  
  const ws = XLSX.utils.aoa_to_sheet([]);
  
  // Title
  XLSX.utils.sheet_add_aoa(ws, [[`FICHE DE RELEVE DE TEMPERATURES - ${getBranding(options)}`]], { origin: "A1" });
  ws['!merges'] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 10 } }];
  ws['A1'].s = commonStyles.title;

  // Month/Year
  XLSX.utils.sheet_add_aoa(ws, [[`Période : ${periodStr}`]], { origin: "A2" });
  ws['!merges'].push({ s: { r: 1, c: 0 }, e: { r: 1, c: 10 } });
  ws['A2'].s = commonStyles.subtitle;

  // Rappel
  XLSX.utils.sheet_add_aoa(ws, [["RAPPEL TEMPÉRATURES : Négatif et congelé ≤ -18°C ; frigos et saladettes selon consignes internes."]], { origin: "A3" });
  ws['!merges'].push({ s: { r: 2, c: 0 }, e: { r: 2, c: 10 } });
  ws['A3'].s = commonStyles.rappel;

  // Headers
  const headers = [
    "JOUR", "NEGATIF\n(<= -18°C)", "POSITIF\n(0 a +4°C)", "FRIGO\nCUISINE\n(0 a +4°C)", "CONGELE\nCUISINE\n(<= -18°C)", 
    "SALADETTE\nSAUCES\n(0 a +4°C)", "SALADETTE\nDESSERTS\n(0 a +4°C)", "FRIGO\nBOISSON 1\n(0 a +8°C)", "FRIGO\nBOISSON DADA\n(0 a +8°C)", "ACTIONS CORRECTIVES", "RESPONSABLE"
  ];
  XLSX.utils.sheet_add_aoa(ws, [headers], { origin: "A4" });
  
  for (let i = 0; i < 11; i++) {
    const cellRef = XLSX.utils.encode_cell({ r: 3, c: i });
    if (ws[cellRef]) ws[cellRef].s = commonStyles.header;
  }

  // 31 Days Rows
  for (let day = 1; day <= 31; day++) {
    const rowIdx = day + 3;
    const dayData = data.find(d => getDate(new Date(d.date)) === day) || {};
    const eq = dayData.equipments || {};
    let actionsArr = [];
    if (dayData.correctiveActions) {
      Object.entries(dayData.correctiveActions).forEach(([equip, action]) => {
        if (action) {
          let str = `${equip}: ${action}`;
          if (dayData.productTemperatures && dayData.productTemperatures[equip]) {
            str += ` (Nouv. Temp: ${dayData.productTemperatures[equip]}°C)`;
          }
          actionsArr.push(str);
        }
      });
    }
    let actions = actionsArr.join(', ');
    if (dayData.globalObservation) {
      actions = actions ? `${actions} | ${dayData.globalObservation}` : dayData.globalObservation;
    }
    
    if (dayData.signature && dayData.signature.modifiePar) {
      const modMsg = `(Modifié: ${dayData.signature.motifModification || 'Sans motif'})`;
      actions = actions ? `${actions}\n${modMsg}` : modMsg;
    }
    
    const row = [
      day,
      eq['Négatif'] || "",
      eq['Positif'] || "",
      eq['Frigo Cuisine'] || "",
      eq['Congèle Cuisine'] || eq['Congé Cuisine'] || "",
      eq['Saladette Sauces'] || "",
      eq['Saladette Desserts'] || "",
      eq['Frigo Boisson 1'] || "",
      eq['Frigo Boisson DADA'] || eq['Frigo Boisson 2'] || "",
      actions,
      dayData.responsable || ""
    ];
    
    XLSX.utils.sheet_add_aoa(ws, [row], { origin: `A${rowIdx + 1}` });
    
    for (let i = 0; i < 11; i++) {
      const cellRef = XLSX.utils.encode_cell({ r: rowIdx, c: i });
      if (ws[cellRef]) ws[cellRef].s = commonStyles.cell;
    }
  }

  ws['!cols'] = [{wch: 5}, {wch: 12}, {wch: 12}, {wch: 12}, {wch: 12}, {wch: 12}, {wch: 12}, {wch: 12}, {wch: 12}, {wch: 25}, {wch: 15}];
  return ws;
};

const generateTracabiliteSheet = (options: ExportOptions, periodStr: string) => {
  const data = getDataForPeriod('crousty_tracabilite_v2', options) || [];
  const oldData = getDataForPeriod('crousty_tracabilite', options) || [];
  const mergedData = [...data, ...oldData];

  const ws = XLSX.utils.aoa_to_sheet([]);
  
  XLSX.utils.sheet_add_aoa(ws, [[`REGISTRE DE TRAÇABILITÉ DES MATIÈRES PREMIÈRES - ${getBranding(options)}`]], { origin: "A1" });
  ws['!merges'] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 6 } }];
  ws['A1'].s = commonStyles.title;

  XLSX.utils.sheet_add_aoa(ws, [[`Période : ${periodStr}`]], { origin: "A2" });
  ws['!merges'].push({ s: { r: 1, c: 0 }, e: { r: 1, c: 6 } });
  ws['A2'].s = commonStyles.subtitle;

  XLSX.utils.sheet_add_aoa(ws, [["RAPPEL TRAÇABILITÉ : Saisir une ligne par produit ouvert. Noter le n° de lot et la DLC à chaque ouverture."]], { origin: "A3" });
  ws['!merges'].push({ s: { r: 2, c: 0 }, e: { r: 2, c: 6 } });
  ws['A3'].s = commonStyles.rappel;

  const headers = ["DATE", "PRODUIT", "MARQUE / FOUR.", "LOT", "DLC", "RESP.", "OBSERVATIONS"];
  XLSX.utils.sheet_add_aoa(ws, [headers], { origin: "A4" });
  
  for (let i = 0; i < 7; i++) {
    const cellRef = XLSX.utils.encode_cell({ r: 3, c: i });
    if (ws[cellRef]) ws[cellRef].s = commonStyles.header;
  }

  mergedData.forEach((item, idx) => {
    const rowIdx = idx + 4;
    const dateStr = item.date ? format(new Date(item.date), 'dd/MM/yy') : "";
    const prodStr = item.produit || item.ingredient || "";
    const marqueStr = item.marque || item.fournisseur || "";
    const lotStr = item.numeroLot || "";
    const dlcStr = (item.dlc && item.dlc !== 'N/A') ? format(new Date(item.dlc), 'dd/MM/yy') : (item.dlcPrimaire ? format(new Date(item.dlcPrimaire), 'dd/MM/yy') : "");
    const respStr = item.userName || item.responsable || "";
    let obsStr = item.commentaire || item.observations || "";
    if (item.signature && item.signature.modifiePar) {
      const modMsg = `(Modifié: ${item.signature.motifModification || 'Sans motif'})`;
      obsStr = obsStr ? `${obsStr}\n${modMsg}` : modMsg;
    }
    
    const row = [dateStr, prodStr, marqueStr, lotStr, dlcStr, respStr, obsStr];
    XLSX.utils.sheet_add_aoa(ws, [row], { origin: `A${rowIdx + 1}` });
    
    for (let i = 0; i < 7; i++) {
      const cellRef = XLSX.utils.encode_cell({ r: rowIdx, c: i });
      if (ws[cellRef]) ws[cellRef].s = commonStyles.cell;
    }
  });

  ws['!cols'] = [{wch: 12}, {wch: 25}, {wch: 20}, {wch: 20}, {wch: 12}, {wch: 15}, {wch: 30}];
  return ws;
};

const generateReceptionsSheet = (options: ExportOptions, periodStr: string) => {
  const data = getDataForPeriod('crousty_receptions_v3', options) || [];
  
  const ws = XLSX.utils.aoa_to_sheet([]);
  XLSX.utils.sheet_add_aoa(ws, [[`REGISTRE DES RÉCEPTIONS DE MARCHANDISES - ${getBranding(options)}`]], { origin: "A1" });
  ws['!merges'] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 7 } }];
  ws['A1'].s = commonStyles.title;

  XLSX.utils.sheet_add_aoa(ws, [[`Période : ${periodStr}`]], { origin: "A2" });
  ws['!merges'].push({ s: { r: 1, c: 0 }, e: { r: 1, c: 7 } });
  ws['A2'].s = commonStyles.subtitle;

  XLSX.utils.sheet_add_aoa(ws, [["RAPPEL RÉCEPTION : Vérifier l'état des colis et les températures à réception."]], { origin: "A3" });
  ws['!merges'].push({ s: { r: 2, c: 0 }, e: { r: 2, c: 7 } });
  ws['A3'].s = commonStyles.rappel;

  const headers = ["DATE", "FOURNISSEUR", "PRODUIT", "QUANTITÉ", "LOT", "DLC", "TEMP.", "RESP."];
  XLSX.utils.sheet_add_aoa(ws, [headers], { origin: "A4" });
  
  for (let i = 0; i < 8; i++) {
    const cellRef = XLSX.utils.encode_cell({ r: 3, c: i });
    if (ws[cellRef]) ws[cellRef].s = commonStyles.header;
  }

  let rowIdx = 4;
  data.forEach(entry => {
    const dateStr = format(new Date(entry.date), 'dd/MM/yy HH:mm');
    if (entry.lignes && entry.lignes.length > 0) {
      entry.lignes.forEach((l: any) => {
        const row = [
          dateStr,
          entry.fournisseur,
          l.produit,
          l.quantite,
          l.numeroLot,
          l.dlc ? format(new Date(l.dlc), 'dd/MM/yy') : "",
          l.temperature ? `${l.temperature}°C` : "",
          entry.responsable
        ];
        XLSX.utils.sheet_add_aoa(ws, [row], { origin: `A${rowIdx + 1}` });
        for (let i = 0; i < 8; i++) {
          const cellRef = XLSX.utils.encode_cell({ r: rowIdx, c: i });
          if (ws[cellRef]) ws[cellRef].s = commonStyles.cell;
        }
        rowIdx++;
      });
    }
  });

  ws['!cols'] = [{wch: 15}, {wch: 20}, {wch: 25}, {wch: 12}, {wch: 20}, {wch: 12}, {wch: 8}, {wch: 15}];
  return ws;
};

const generateViandesSheet = (options: ExportOptions, periodStr: string) => {
  const data = getDataForPeriod('crousty_viandes', options) || [];
  const ws = XLSX.utils.aoa_to_sheet([]);
  
  XLSX.utils.sheet_add_aoa(ws, [[`FICHE DE RELEVE DE TEMPERATURES - CUISSON ALIMENTAIRE - ${getBranding(options)}`]], { origin: "A1" });
  ws['!merges'] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 6 } }];
  ws['A1'].s = commonStyles.title;

  XLSX.utils.sheet_add_aoa(ws, [[`Période : ${periodStr}`]], { origin: "A2" });
  ws['!merges'].push({ s: { r: 1, c: 0 }, e: { r: 1, c: 6 } });
  ws['A2'].s = commonStyles.subtitle;

  XLSX.utils.sheet_add_aoa(ws, [["RAPPEL HACCP : Température à coeur (sonde piquée) >= 67°C. En dessous, le produit est NON CONFORME et nécessite une action corrective."]], { origin: "A3" });
  ws['!merges'].push({ s: { r: 2, c: 0 }, e: { r: 2, c: 6 } });
  ws['A3'].s = commonStyles.rappel;

  const headers = ["DATE", "TENDERS", "POISSON", "RESPONSABLE", "OBSERVATIONS / ACTIONS"];
  XLSX.utils.sheet_add_aoa(ws, [headers], { origin: "A4" });
  
  for (let i = 0; i < headers.length; i++) {
    const cellRef = XLSX.utils.encode_cell({ r: 3, c: i });
    if (ws[cellRef]) ws[cellRef].s = commonStyles.header;
  }

  // Sort chronologically
  const sortedData = [...data].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  sortedData.forEach((item, idx) => {
    const rowIdx = idx + 4;
    const dateStr = format(new Date(item.date), 'dd/MM/yyyy HH:mm');
    
    let tendersStr = "";
    let poissonStr = "";
    let actionStr = "";
    
    if (item.produits) {
      if (item.produits.tenders) {
        tendersStr = `${item.produits.tenders.temp}°C ${item.produits.tenders.conforme ? '✅' : '❌'}`;
        if (!item.produits.tenders.conforme && item.produits.tenders.action) {
           actionStr += `Tenders: ${item.produits.tenders.action} | `;
        }
      }
      if (item.produits.poisson) {
        poissonStr = `${item.produits.poisson.temp}°C ${item.produits.poisson.conforme ? '✅' : '❌'}`;
        if (!item.produits.poisson.conforme && item.produits.poisson.action) {
           actionStr += `Poisson: ${item.produits.poisson.action} | `;
        }
      }
    } else {
      // Legacy
      const valStr = `${item.temperature}°C ${item.conforme === 'OUI' ? '✅' : '❌'}`;
      if (item.typeViande === 'Tenders') tendersStr = valStr;
      else if (item.typeViande === 'Poisson') poissonStr = valStr;
      else tendersStr = `${item.typeViande}: ${valStr}`;
      
      if (item.actionCorrective) actionStr = item.actionCorrective;
    }
    
    if (item.signature && item.signature.modifiePar) {
      const modMsg = `(Modifié: ${item.signature.motifModification || 'Sans motif'})`;
      actionStr = actionStr ? `${actionStr}\n${modMsg}` : modMsg;
    }

    const row = [
      dateStr,
      tendersStr,
      poissonStr,
      item.responsable || "",
      actionStr
    ];
    
    XLSX.utils.sheet_add_aoa(ws, [row], { origin: `A${rowIdx + 1}` });
    
    for (let i = 0; i < headers.length; i++) {
      const cellRef = XLSX.utils.encode_cell({ r: rowIdx, c: i });
      if (ws[cellRef]) ws[cellRef].s = commonStyles.cell;
    }
  });

  ws['!cols'] = [{wch: 16}, {wch: 15}, {wch: 15}, {wch: 15}, {wch: 40}];
  return ws;
};

const generateHuileSheet = (options: ExportOptions, periodStr: string) => {
  const data = getDataForPeriod('crousty_oil_checklist', options);
  const ws = XLSX.utils.aoa_to_sheet([]);
  
  XLSX.utils.sheet_add_aoa(ws, [[`FICHE DE CONTRÔLE HUILE FRITURE - ${getBranding(options)}`]], { origin: "A1" });
  ws['!merges'] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 11 } }];
  ws['A1'].s = commonStyles.title;

  XLSX.utils.sheet_add_aoa(ws, [[`Période : ${periodStr}`]], { origin: "A2" });
  ws['!merges'].push({ s: { r: 1, c: 0 }, e: { r: 1, c: 11 } });
  ws['A2'].s = commonStyles.subtitle;

  XLSX.utils.sheet_add_aoa(ws, [["RAPPEL QUALITÉ HUILE : noter le test huile, la température, toute action corrective et chaque changement d'huile."]], { origin: "A3" });
  ws['!merges'].push({ s: { r: 2, c: 0 }, e: { r: 2, c: 11 } });
  ws['A3'].s = commonStyles.rappel;

  // Complex headers
  XLSX.utils.sheet_add_aoa(ws, [
    ["JOUR", "TEST HUILE", "", "", "", "TEMPÉRATURE HUILE", "", "", "", "ACTIONS CORRECTIVES", "CHANGEMENT\nHUILE", "RESPONSABLE"],
    ["", "Cuve 1", "Cuve 2", "Cuve 3", "Cuve 4", "Cuve 1", "Cuve 2", "Cuve 3", "Cuve 4", "", "", ""]
  ], { origin: "A4" });
  
  ws['!merges'].push(
    { s: { r: 3, c: 0 }, e: { r: 4, c: 0 } }, // JOUR
    { s: { r: 3, c: 1 }, e: { r: 3, c: 4 } }, // TEST HUILE
    { s: { r: 3, c: 5 }, e: { r: 3, c: 8 } }, // TEMPÉRATURE HUILE
    { s: { r: 3, c: 9 }, e: { r: 4, c: 9 } }, // ACTIONS
    { s: { r: 3, c: 10 }, e: { r: 4, c: 10 } }, // CHANGEMENT
    { s: { r: 3, c: 11 }, e: { r: 4, c: 11 } }  // RESPONSABLE
  );

  for (let r = 3; r <= 4; r++) {
    for (let c = 0; c < 12; c++) {
      const cellRef = XLSX.utils.encode_cell({ r, c });
      if (!ws[cellRef]) ws[cellRef] = { t: 's', v: '' };
      ws[cellRef].s = commonStyles.header;
    }
  }

  let currentRowIdx = 4;
  for (let day = 1; day <= 31; day++) {
    const dayEntries = data.filter(d => getDate(new Date(d.date)) === day);
    
    if (dayEntries.length === 0) {
      const row = [day, "", "", "", "", "", "", "", "", "", "", ""];
      XLSX.utils.sheet_add_aoa(ws, [row], { origin: `A${currentRowIdx + 1}` });
      for (let i = 0; i < 12; i++) {
        const cellRef = XLSX.utils.encode_cell({ r: currentRowIdx, c: i });
        if (ws[cellRef]) ws[cellRef].s = commonStyles.cell;
      }
      currentRowIdx++;
    } else {
      const mergedCuves: any = { 1: {}, 2: {}, 3: {}, 4: {} };
      const changedStrs: string[] = [];
      const actions: string[] = [];
      const responsables = new Set<string>();

      dayEntries.forEach(d => {
        const cuves = d.cuves || {};
        [1, 2, 3, 4].forEach(c => {
           if (cuves[c]?.testValue) mergedCuves[c].testValue = (mergedCuves[c].testValue ? mergedCuves[c].testValue + "\n" : "") + cuves[c].testValue;
           if (cuves[c]?.temperature) mergedCuves[c].temperature = (mergedCuves[c].temperature ? mergedCuves[c].temperature + "\n" : "") + cuves[c].temperature;
           if (cuves[c]?.photo) mergedCuves[c].photo = cuves[c].photo;
        });
        if (d.changed) changedStrs.push(`OUI (Cuve ${d.cuveChangee})${d.motifChangement ? `\n${d.motifChangement}` : ''}`);
        if (d.actionsCorrectives) actions.push(d.actionsCorrectives);
        if (d.responsable) responsables.add(d.responsable);
      });

      const row = [
        day,
        ...[1, 2, 3, 4].map(c => mergedCuves[c].testValue ? `${mergedCuves[c].testValue} ${mergedCuves[c].photo ? '[Photo]' : ''}`.trim() : ""),
        ...[1, 2, 3, 4].map(c => mergedCuves[c].temperature || ""),
        actions.join('\n'),
        changedStrs.join('\n'),
        Array.from(responsables).join(', ')
      ];

      XLSX.utils.sheet_add_aoa(ws, [row], { origin: `A${currentRowIdx + 1}` });
      
      for (let i = 0; i < 12; i++) {
        const cellRef = XLSX.utils.encode_cell({ r: currentRowIdx, c: i });
        if (ws[cellRef]) ws[cellRef].s = commonStyles.cell;
      }
      currentRowIdx++;
    }
  }

  ws['!cols'] = [{wch: 5}, {wch: 8}, {wch: 8}, {wch: 8}, {wch: 8}, {wch: 8}, {wch: 8}, {wch: 8}, {wch: 8}, {wch: 25}, {wch: 15}, {wch: 15}];
  return ws;
};

const generateInventaireSheet = (options: ExportOptions, periodStr: string) => {
  const data = getDataForPeriod('crousty_inventory', options);
  const products = getStoredData<any[]>('crousty_inventory_products', []);
  const ws = XLSX.utils.aoa_to_sheet([]);
  
  XLSX.utils.sheet_add_aoa(ws, [[`FICHE D'INVENTAIRE - ${getBranding(options)}`]], { origin: "A1" });
  ws['!merges'] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 5 } }];
  ws['A1'].s = commonStyles.title;

  XLSX.utils.sheet_add_aoa(ws, [[`Période : ${periodStr}`]], { origin: "A2" });
  ws['!merges'].push({ s: { r: 1, c: 0 }, e: { r: 1, c: 5 } });
  ws['A2'].s = commonStyles.subtitle;

  const headers = ["DATE", "RESPONSABLE", "CATÉGORIE", "PRODUIT", "QUANTITÉ", "STATUT"];
  XLSX.utils.sheet_add_aoa(ws, [headers], { origin: "A4" });
  
  for (let i = 0; i < 6; i++) {
    const cellRef = XLSX.utils.encode_cell({ r: 3, c: i });
    if (!ws[cellRef]) ws[cellRef] = { t: 's', v: '' };
    ws[cellRef].s = commonStyles.header;
  }

  let currentRow = 4;
  data.forEach(entry => {
    const dateStr = format(new Date(entry.date), 'dd/MM/yyyy HH:mm');
    Object.entries(entry.items).forEach(([category, items]) => {
      Object.entries(items).forEach(([item, detail]: [string, any]) => {
        const d = (typeof detail === 'string' || !detail) 
          ? { units: detail || '0', cartons: '0', na: false } 
          : { 
              units: detail.units || detail.poches || '0', 
              cartons: detail.cartons || '0',
              na: detail.na || false
            };
            
        if (!d.na) {
          const product = products.find(p => p.name === item);
          const totalUnits = parseInt(d.units) + (parseInt(d.cartons) * 5);
          const isLow = product && totalUnits <= product.minThreshold;
          const status = isLow ? '⚠️ RUPTURE' : 'OK';
          
          const parts = [];
          if (parseInt(d.cartons) > 0) parts.push(`${d.cartons} cart.`);
          if (parseInt(d.units) > 0 || parts.length === 0) parts.push(`${d.units} u.`);
          const formattedQty = parts.join(' ');
          
          const row = [dateStr, entry.responsable, category, item, formattedQty, status];
          XLSX.utils.sheet_add_aoa(ws, [row], { origin: `A${currentRow + 1}` });
          
          for (let c = 0; c < 6; c++) {
            const cellRef = XLSX.utils.encode_cell({ r: currentRow, c });
            if (!ws[cellRef]) ws[cellRef] = { t: 's', v: '' };
            ws[cellRef].s = commonStyles.cell;
          }
          currentRow++;
        }
      });
    });
  });

  ws['!cols'] = [
    { wch: 18 }, // DATE
    { wch: 15 }, // RESPONSABLE
    { wch: 25 }, // CATÉGORIE
    { wch: 30 }, // PRODUIT
    { wch: 10 }, // QUANTITÉ
    { wch: 15 }, // STATUT
  ];

  return ws;
};


const generateNettoyageSheet = (options: ExportOptions, periodStr: string) => {
  const data = getDataForPeriod('crousty_cleaning', options);
  const ws = XLSX.utils.aoa_to_sheet([]);
  
  XLSX.utils.sheet_add_aoa(ws, [[`FICHE DE PLAN DE NETTOYAGE - ${getBranding(options)}`]], { origin: "A1" });
  ws['!merges'] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 2 } }];
  ws['A1'].s = commonStyles.title;

  XLSX.utils.sheet_add_aoa(ws, [[`Période : ${periodStr}`]], { origin: "A2" });
  ws['!merges'].push({ s: { r: 1, c: 0 }, e: { r: 1, c: 2 } });
  ws['A2'].s = commonStyles.subtitle;

  XLSX.utils.sheet_add_aoa(ws, [["RAPPEL NETTOYAGE : Cochez les tâches réalisées quotidiennement, ou aux fréquences indiquées."]], { origin: "A3" });
  ws['!merges'].push({ s: { r: 2, c: 0 }, e: { r: 2, c: 2 } });
  ws['A3'].s = commonStyles.rappel;

  const headers = ["DATE", "RESPONSABLE", "TÂCHES RÉALISÉES"];
  XLSX.utils.sheet_add_aoa(ws, [headers], { origin: "A4" });
  
  for (let i = 0; i < 3; i++) {
    const cellRef = XLSX.utils.encode_cell({ r: 3, c: i });
    if (!ws[cellRef]) ws[cellRef] = { t: 's', v: '' };
    ws[cellRef].s = commonStyles.header;
  }

  let currentRow = 4;
  data.forEach(entry => {
    const dateStr = format(new Date(entry.date), 'dd/MM/yyyy HH:mm');
    const tasks = Object.entries(entry.daily || {})
      .filter(([_, done]) => done)
      .map(([task]) => task)
      .join(', ');

    const row = [dateStr, entry.responsable || "", tasks || "Aucune tâche couchée"];
    XLSX.utils.sheet_add_aoa(ws, [row], { origin: `A${currentRow + 1}` });
    
    for (let c = 0; c < 3; c++) {
      const cellRef = XLSX.utils.encode_cell({ r: currentRow, c });
      if (!ws[cellRef]) ws[cellRef] = { t: 's', v: '' };
      ws[cellRef].s = commonStyles.cell;
    }
    currentRow++;
  });

  ws['!cols'] = [{ wch: 18 }, { wch: 15 }, { wch: 60 }];

  return ws;
};

export const generateProPDF = async (options: ExportOptions) => {
  const doc = new jsPDF('landscape');
  const periodStr = getPeriodString(options);
  
  const addHeader = (title: string, rappel: string) => {
    doc.setFillColor(26, 11, 46); // #1A0B2E
    doc.rect(14, 10, 269, 10, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text(title, 148, 17, { align: "center" });
    
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(10);
    doc.text(`Période : ${periodStr}` , 14, 26);
    
    doc.setFillColor(255, 42, 157); // #FF2A9D
    doc.rect(14, 29, 269, 8, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(9);
    doc.setFont("helvetica", "italic");
    doc.text(rappel, 16, 34);
  };

  // --- 1. TEMPÉRATURES ---
  if (options.categories.temperatures) {
    const tempData = getDataForPeriod('crousty_temp_checklist', options);
    
    // Helper pour générer le tableau d'une période (jours)
    const renderTempPage = (startDay: number, endDay: number) => {
      addHeader(`FICHE DE RELEVE DE TEMPERATURES - ${getBranding(options)}`, "RAPPEL TEMPÉRATURES : Négatif et congelé <= -18°C ; frigos et saladettes selon consignes internes.");
      
      const tempBody = [];
      for (let day = startDay; day <= endDay; day++) {
        // Obtenir toutes les entrées du jour
        const entriesDay = tempData.filter(x => getDate(new Date(x.date)) === day);
        const morning = entriesDay.find(e => new Date(e.date).getHours() < 15);
        const evening = entriesDay.find(e => new Date(e.date).getHours() >= 15);

        const getEq = (entry: any, eqName: string) => {
          if (!entry || !entry.equipments) return "";
          const val = entry.equipments[eqName] || entry.equipments[eqName.replace('è', 'é')] || entry.equipments[eqName.replace('é', 'è')] || entry.equipments['Frigo Boisson 2'];
          return val !== undefined && val !== null && val !== "" ? String(val) : "";
        };

        const eqNames = [
          'Négatif', 
          'Positif', 
          'Frigo Cuisine', 
          'Congèle Cuisine', 
          'Saladette Sauces', 
          'Saladette Desserts', 
          'Frigo Boisson 1', 
          'Frigo Boisson DADA'
        ];

        let actionsArr: string[] = [];
        let responsablesArr: string[] = [];
        
        [morning, evening].forEach(d => {
          if (!d) return;
          if (d.responsable && !responsablesArr.includes(d.responsable)) {
             responsablesArr.push(d.responsable);
          }
          if (d.correctiveActions) {
            Object.entries(d.correctiveActions).forEach(([equip, action]) => {
              if (action) {
                let str = `${equip}: ${action}`;
                if (d.productTemperatures && d.productTemperatures[equip]) {
                  str += ` (Nouv: ${d.productTemperatures[equip]}°C)`;
                }
                actionsArr.push(str);
              }
            });
          }
          if (d.globalObservation) actionsArr.push(d.globalObservation);
          if (d.signature && d.signature.modifiePar) {
             actionsArr.push(`(Modif: ${d.signature.motifModification || 'Sans motif'})`);
          }
        });

        let actions = actionsArr.join('\n');
        let resp = responsablesArr.join(' / ');

        const row = [day.toString()];
        
        eqNames.forEach(eq => {
           row.push(getEq(morning, eq));
           row.push(getEq(evening, eq));
        });

        row.push(actions);
        row.push(resp);

        tempBody.push(row);
      }

      autoTable(doc, {
        startY: 38,
        head: [
          [
            { content: "JOUR", rowSpan: 2 }, 
            { content: "NÉGATIF\n(<= -18°C)", colSpan: 2 }, 
            { content: "POSITIF\n(0 à +4°C)", colSpan: 2 }, 
            { content: "FRIGO CUISINE\n(0 à +4°C)", colSpan: 2 }, 
            { content: "CONGELÉ CUISINE\n(<= -18°C)", colSpan: 2 }, 
            { content: "SALADETTE SAUCES\n(0 à +4°C)", colSpan: 2 }, 
            { content: "SALADETTE DESSERTS\n(0 à +4°C)", colSpan: 2 }, 
            { content: "FRIGO BOISSON 1\n(0 à +8°C)", colSpan: 2 }, 
            { content: "FRIGO BOISSON DADA\n(0 à +8°C)", colSpan: 2 }, 
            { content: "ACTIONS CORRECTIVES", rowSpan: 2 }, 
            { content: "RESPONSABLE", rowSpan: 2 }
          ],
          [
             "M", "S", "M", "S", "M", "S", "M", "S", "M", "S", "M", "S", "M", "S", "M", "S"
          ]
        ],
        body: tempBody,
        theme: 'grid',
        headStyles: { fillColor: [147, 51, 234], halign: 'center', valign: 'middle', textColor: 255 },
        bodyStyles: { halign: 'center', valign: 'middle', fontSize: 7 },
        styles: { cellPadding: 1, minCellHeight: 6 },
        didParseCell: function(data) {
          if (data.section === 'head') {
              if (data.row.index === 0) {
                 data.cell.styles.fontSize = 8;
                 data.cell.styles.fontStyle = 'bold';
              } else if (data.row.index === 1) {
                 data.cell.styles.fontSize = 7;
                 data.cell.styles.fontStyle = 'normal';
              }
          } else if (data.section === 'body') {
              const col = data.column.index;
              // Equipments cols: 1 to 16
              if (col >= 1 && col <= 16 && data.cell.raw && data.cell.raw !== '-' && data.cell.raw !== '') {
                 const valStr = String(data.cell.raw).replace(',', '.');
                 const val = parseFloat(valStr);
                 if (!isNaN(val)) {
                    let isOut = false;
                    // Négatif (1,2), Congelé Cuisine (7,8) <= -18
                    if (col === 1 || col === 2 || col === 7 || col === 8) {
                        if (val > -18) isOut = true;
                    } 
                    // Boissons (13,14, 15,16) <= 8
                    else if (col >= 13 && col <= 16) {
                        if (val < 0 || val > 8) isOut = true;
                    } 
                    // Positif (3,4), Frigo Cui (5,6), Saladettes (9,10,11,12) <= 4
                    else {
                        if (val < 0 || val > 4) isOut = true;
                    }
                    
                    if (isOut) {
                        data.cell.styles.fillColor = '#FFEBEE';
                        data.cell.styles.textColor = '#b91c1c';
                    }
                 }
              }
          }
        }
      });
    };

    renderTempPage(1, 15);
    doc.addPage();
    renderTempPage(16, 31);
  }

  // --- 2. TRAÇABILITÉ ---
  if (options.categories.tracabilite) {
    if (options.categories.temperatures) doc.addPage();
    addHeader(`REGISTRE DE TRAÇABILITÉ DES MATIÈRES PREMIÈRES - ${getBranding(options)}`, "RAPPEL TRAÇABILITÉ : Noter le n° de lot et la DLC à chaque ouverture d'ingrédient.");
    
    const trac1 = getDataForPeriod('crousty_tracabilite_v2', options) || [];
    const trac2 = getDataForPeriod('crousty_tracabilite', options) || [];
    const tracData = [...trac1, ...trac2];

    const tracBody = tracData.length > 0 ? tracData.map(item => {
      let obs = item.commentaire || item.observations || "";
      if (item.signature && item.signature.modifiePar) {
        const modMsg = `(Modifié: ${item.signature.motifModification || 'Sans motif'})`;
        obs = obs ? `${obs}\n${modMsg}` : modMsg;
      }
      return [
        item.date ? format(new Date(item.date), 'dd/MM/yy') : "",
        item.produit || item.ingredient || "",
        item.marque || item.fournisseur || "",
        item.numeroLot || "",
        (item.dlc && item.dlc !== 'N/A') ? format(new Date(item.dlc), 'dd/MM/yy') : (item.dlcPrimaire ? format(new Date(item.dlcPrimaire), 'dd/MM/yy') : ""),
        item.userName || item.responsable || "",
        obs
      ];
    }) : [];

    autoTable(doc, {
      startY: 38,
      head: [["DATE", "PRODUIT", "MARQUE / FOUR.", "NUMÉRO DE LOT", "DLC", "RESP.", "OBSERVATIONS"]],
      body: tracBody,
      theme: 'grid',
      headStyles: { fillColor: [176, 38, 255], halign: 'center', valign: 'middle', fontSize: 8 },
      bodyStyles: { halign: 'center', valign: 'middle', fontSize: 8 },
      styles: { cellPadding: 2 },
    });
  }

  // --- 2b. RÉCEPTIONS ---
  if (options.categories.receptions) {
    if (options.categories.temperatures || options.categories.tracabilite) doc.addPage();
    addHeader(`REGISTRE DES RÉCEPTIONS DE MARCHANDISES - ${getBranding(options)}`, "RAPPEL RÉCEPTION : Vérifier l'état des colis et les températures à réception.");
    
    const receptData = getDataForPeriod('crousty_receptions_v3', options) || [];
    const receptBody: any[] = [];
    
    receptData.forEach(entry => {
      if (entry.lignes) {
        entry.lignes.forEach((l: any) => {
          receptBody.push([
            format(new Date(entry.date), 'dd/MM/yy HH:mm'),
            entry.fournisseur,
            l.produit,
            l.quantite,
            l.numeroLot,
            l.dlc ? format(new Date(l.dlc), 'dd/MM/yy') : "",
            l.temperature ? `${l.temperature}°C` : "",
            entry.responsable
          ]);
        });
      }
    });

    autoTable(doc, {
      startY: 38,
      head: [["DATE", "FOURNISSEUR", "PRODUIT", "QUANTITÉ", "NUMÉRO DE LOT", "DLC", "TEMP.", "RESP."]],
      body: receptBody,
      theme: 'grid',
      headStyles: { fillColor: [176, 38, 255], halign: 'center', valign: 'middle', fontSize: 8 },
      bodyStyles: { halign: 'center', valign: 'middle', fontSize: 8 },
      styles: { cellPadding: 2 },
    });
  }

  // --- 3. CUISSON VIANDES ---
  if (options.categories.viandes) {
    if (options.categories.temperatures || options.categories.tracabilite) doc.addPage();
    addHeader(`FICHE DE RELEVE DE TEMPERATURES - CUISSON ALIMENTAIRE - ${getBranding(options)}`, "RAPPEL HACCP : Température à coeur (sonde piquée) >= 67°C. En dessous, le produit est NON CONFORME et nécessite une action corrective.");
    
    const viandesData = getDataForPeriod('crousty_viandes', options);
    const sortedData = [...viandesData].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    
    const viandesBody = sortedData.map(item => {
      const dateStr = format(new Date(item.date), 'dd/MM/yyyy HH:mm');
      
      let tendersStr = "";
      let poissonStr = "";
      let actionStr = "";
      
      if (item.produits) {
        if (item.produits.tenders) {
          tendersStr = `${item.produits.tenders.temp}°C ${item.produits.tenders.conforme ? 'OK' : 'KO'}`;
          if (!item.produits.tenders.conforme && item.produits.tenders.action) actionStr += `Tenders: ${item.produits.tenders.action} | `;
        }
        if (item.produits.poisson) {
          poissonStr = `${item.produits.poisson.temp}°C ${item.produits.poisson.conforme ? 'OK' : 'KO'}`;
          if (!item.produits.poisson.conforme && item.produits.poisson.action) actionStr += `Poisson: ${item.produits.poisson.action} | `;
        }
      } else {
        const valStr = `${item.temperature}°C ${item.conforme === 'OUI' ? 'OK' : 'KO'}`;
        if (item.typeViande === 'Tenders') tendersStr = valStr;
        else if (item.typeViande === 'Poisson') poissonStr = valStr;
        else tendersStr = `${item.typeViande || ''}: ${valStr}`;
        if (item.actionCorrective) actionStr = item.actionCorrective;
      }

      if (item.signature && item.signature.modifiePar) {
        const modMsg = `(Modifié)`;
        actionStr = actionStr ? `${actionStr}\n${modMsg}` : modMsg;
      }

      return [
        dateStr,
        tendersStr,
        poissonStr,
        item.responsable || "",
        actionStr
      ];
    });

    autoTable(doc, {
      startY: 38,
      head: [["DATE", "TENDERS", "POISSON", "RESPONSABLE", "OBSERVATIONS / ACTIONS"]],
      body: viandesBody.length > 0 ? viandesBody : [["Aucun relevé", "", "", "", ""]],
      theme: 'grid',
      headStyles: { fillColor: [176, 38, 255], halign: 'center', valign: 'middle', fontSize: 8 },
      bodyStyles: { halign: 'center', valign: 'middle', fontSize: 8 },
      styles: { cellPadding: 2 },
    });
  }

  // --- 4. CONTRÔLE HUILE ---
  if (options.categories.huiles) {
    if (options.categories.temperatures || options.categories.tracabilite || options.categories.viandes) doc.addPage();
    addHeader(`FICHE DE CONTRÔLE HUILE FRITURE - ${getBranding(options)}`, "RAPPEL QUALITÉ HUILE : noter le test huile, la température, toute action corrective et chaque changement d'huile.");
    
    const oilPhotosQueue: { id: string, label: string, date: string, responsible: string, cuve: string }[] = [];

    const huileData = getDataForPeriod('crousty_oil_checklist', options);
    const huileBody = [];
    for (let day = 1; day <= 31; day++) {
      const dayEntries = huileData.filter(x => getDate(new Date(x.date)) === day);
      if (dayEntries.length === 0) {
        huileBody.push([day, "", "", "", "", "", "", "", "", "", "", ""]);
        continue;
      } else {
        const mergedCuves: any = { 1: {}, 2: {}, 3: {}, 4: {} };
        const changedStrs: string[] = [];
        const actions: string[] = [];
        const responsables = new Set<string>();

        dayEntries.forEach(d => {
          const cuves = d.cuves || {};
          const dateStr = format(new Date(d.date), 'dd/MM/yyyy HH:mm');
          
          [1, 2, 3, 4].forEach(c => {
             if (cuves[c]?.testValue) mergedCuves[c].testValue = (mergedCuves[c].testValue ? mergedCuves[c].testValue + "\n" : "") + cuves[c].testValue;
             if (cuves[c]?.temperature) mergedCuves[c].temperature = (mergedCuves[c].temperature ? mergedCuves[c].temperature + "\n" : "") + cuves[c].temperature;
             if (cuves[c]?.photo) {
                mergedCuves[c].photo = cuves[c].photo;
                oilPhotosQueue.push({
                   id: cuves[c].photo,
                   label: cuves[c].photo,
                   date: dateStr,
                   responsible: d.responsable || "Inconnu",
                   cuve: c.toString()
                });
             }
          });
          if (d.changed) changedStrs.push(`OUI (Cuve ${d.cuveChangee})${d.motifChangement ? `\n${d.motifChangement}` : ''}`);
          if (d.actionsCorrectives) actions.push(d.actionsCorrectives);
          if (d.responsable) responsables.add(d.responsable);
        });

        huileBody.push([
          day,
          ...[1, 2, 3, 4].map(c => mergedCuves[c].testValue ? `${mergedCuves[c].testValue}${mergedCuves[c].photo ? '\n[Photo annexe]' : ''}` : ""),
          ...[1, 2, 3, 4].map(c => mergedCuves[c].temperature || ""),
          actions.join('\n'),
          changedStrs.join('\n'),
          Array.from(responsables).join(', ')
        ]);
      }
    }

    autoTable(doc, {
      startY: 38,
      head: [
        [{ content: "JOUR", rowSpan: 2 }, { content: "TEST HUILE", colSpan: 4 }, { content: "TEMPÉRATURE HUILE", colSpan: 4 }, { content: "ACTIONS CORRECTIVES", rowSpan: 2 }, { content: "CHANGEMENT\nHUILE", rowSpan: 2 }, { content: "RESPONSABLE", rowSpan: 2 }],
        ["Cuve 1", "Cuve 2", "Cuve 3", "Cuve 4", "Cuve 1", "Cuve 2", "Cuve 3", "Cuve 4"]
      ],
      body: huileBody,
      theme: 'grid',
      headStyles: { fillColor: [176, 38, 255], halign: 'center', valign: 'middle', fontSize: 7 },
      bodyStyles: { halign: 'center', valign: 'middle', fontSize: 8 },
      styles: { cellPadding: 1, minCellHeight: 12 }
    });

    (doc as any)._oilPhotosQueue = oilPhotosQueue;
  }

  // --- 5. INVENTAIRE ---
  if (options.categories.inventaire) {
    if (options.categories.temperatures || options.categories.tracabilite || options.categories.viandes || options.categories.huiles) doc.addPage();
    addHeader(`FICHE D'INVENTAIRE - ${getBranding(options)}`, "RAPPEL INVENTAIRE : Effectuer l'inventaire complet à la fréquence demandée par la direction.");
    
    const invData = getDataForPeriod('crousty_inventory', options);
    const products = getStoredData<any[]>('crousty_inventory_products', []);
    const invBody: any[][] = [];
    
    invData.forEach(entry => {
      const dateStr = format(new Date(entry.date), 'dd/MM/yyyy HH:mm');
      Object.entries(entry.items).forEach(([category, items]) => {
        Object.entries(items as Record<string, any>).forEach(([item, detail]: [string, any]) => {
          const d = (typeof detail === 'string' || !detail) 
            ? { units: detail || '0', cartons: '0', na: false } 
            : { 
                units: detail.units || detail.poches || '0', 
                cartons: detail.cartons || '0',
                na: detail.na || false
              };
              
          if (!d.na) {
            const product = products.find(p => p.name === item);
            const totalUnits = parseInt(d.units) + (parseInt(d.cartons) * 5);
            const isLow = product && totalUnits <= product.minThreshold;
            const status = isLow ? '⚠️ RUPTURE' : 'OK';
            
            const parts = [];
            if (parseInt(d.cartons) > 0) parts.push(`${d.cartons} cart.`);
            if (parseInt(d.units) > 0 || parts.length === 0) parts.push(`${d.units} u.`);
            const formattedQty = parts.join(' ');

            invBody.push([dateStr, entry.responsable, category, item, formattedQty, status]);
          }
        });
      });
    });

    if (invBody.length > 0) {
      autoTable(doc, {
        startY: 38,
        head: [["DATE", "RESPONSABLE", "CATÉGORIE", "PRODUIT", "QUANTITÉ", "STATUT"]],
        body: invBody,
        theme: 'grid',
        headStyles: { fillColor: [176, 38, 255], halign: 'center', valign: 'middle', fontSize: 8 },
        bodyStyles: { halign: 'center', valign: 'middle', fontSize: 8 },
        styles: { cellPadding: 1, minCellHeight: 4.5 },
      });
    } else {
      doc.setFontSize(10);
      doc.text("Aucun inventaire enregistré pour cette période.", 14, 45);
    }
  }

  // --- 6. PLAN DE NETTOYAGE ---
  if (options.categories.nettoyage) {
    if (options.categories.temperatures || options.categories.tracabilite || options.categories.viandes || options.categories.huiles || options.categories.inventaire) doc.addPage();
    addHeader(`FICHE DE PLAN DE NETTOYAGE - ${getBranding(options)}`, "RAPPEL NETTOYAGE : Tâches enregistrées dans la période.");
    
    const nettoyageData = getDataForPeriod('crousty_cleaning', options);
    const nettoyageBody: any[][] = [];
    
    nettoyageData.forEach(entry => {
      const dateStr = format(new Date(entry.date), 'dd/MM/yyyy HH:mm');
      const tasks = Object.entries(entry.daily || {})
        .filter(([_, done]) => done)
        .map(([task]) => task)
        .join(', ');

      nettoyageBody.push([dateStr, entry.responsable || "", tasks || "Aucune tâche couchée"]);
    });

    if (nettoyageBody.length > 0) {
      autoTable(doc, {
        startY: 38,
        head: [["DATE", "RESPONSABLE", "TÂCHES RÉALISÉES"]],
        body: nettoyageBody,
        theme: 'grid',
        headStyles: { fillColor: [176, 38, 255], halign: 'center', valign: 'middle', fontSize: 8 },
        bodyStyles: { halign: 'center', valign: 'middle', fontSize: 8 },
        styles: { cellPadding: 1, minCellHeight: 4.5 },
      });
    } else {
      doc.setFontSize(10);
      doc.text("Aucun plan de nettoyage enregistré pour cette période.", 14, 45);
    }
  }

  // --- 7. IMAGES ---
  // Photos de Traçabilité
  if (options.categories.tracabilite) {
    const tracData = getDataForPeriod('crousty_tracabilite_v2', options);
    const tracDataWithPhotos = tracData.filter(item => item.photoId);
    if (tracDataWithPhotos.length > 0) {
      doc.addPage();
      addHeader("ANNEXE : PHOTOS DE TRAÇABILITÉ", "Photos des étiquettes des produits ouverts dans la période.");
      
      let yOffset = 45;
      let xOffset = 14;
      const imgWidth = 80;
      const imgHeight = 60;
      
      for (const item of tracDataWithPhotos) {
        const photoData = await getPhoto(item.photoId);
        if (photoData) {
          if (yOffset + imgHeight > 190) {
            doc.addPage();
            addHeader("ANNEXE : PHOTOS DE TRAÇABILITÉ", "Photos des étiquettes des produits ouverts dans la période.");
            yOffset = 45;
            xOffset = 14;
          }
          
          try {
            doc.addImage(photoData, 'JPEG', xOffset, yOffset, imgWidth, imgHeight);
          } catch (e) {
            doc.text("[Image non supportée]", xOffset, yOffset + 30);
          }
          
          doc.setFontSize(8);
          doc.text(`Produit: ${item.produit}`, xOffset, yOffset + imgHeight + 4);
          doc.text(`Lot: ${item.numeroLot} - Le: ${format(new Date(item.date), 'dd/MM/yy')}`, xOffset, yOffset + imgHeight + 8);
          
          xOffset += imgWidth + 10;
          if (xOffset + imgWidth > 280) {
            xOffset = 14;
            yOffset += imgHeight + 15;
          }
        }
      }
    }
  }

  // Photos de Livraison (Réceptions)
  if (options.categories.receptions) {
    const receptData = getDataForPeriod('crousty_receptions_v3', options);
    const receptWithPhotos = receptData.filter(item => item.photoId);
    if (receptWithPhotos.length > 0) {
      doc.addPage();
      addHeader("ANNEXE : PHOTOS DE LIVRAISON (BONS)", "Bons de livraison photographiés dans la période.");
      
      let yOffset = 45;
      let xOffset = 14;
      const imgWidth = 80;
      const imgHeight = 100; // More vertical for delivery slips
      
      for (const item of receptWithPhotos) {
        const photoData = await getPhoto(item.photoId);
        if (photoData) {
          if (yOffset + imgHeight > 190) {
            doc.addPage();
            addHeader("ANNEXE : PHOTOS DE LIVRAISON (BONS)", "Bons de livraison photographiés dans la période.");
            yOffset = 45;
            xOffset = 14;
          }
          
          try {
            doc.addImage(photoData, 'JPEG', xOffset, yOffset, imgWidth, imgHeight);
          } catch (e) {
            doc.text("[Image non supportée]", xOffset, yOffset + 30);
          }
          
          doc.setFontSize(8);
          doc.text(`Fournisseur: ${item.fournisseur}`, xOffset, yOffset + imgHeight + 4);
          doc.text(`Date: ${format(new Date(item.date), 'dd/MM/yy HH:mm')}`, xOffset, yOffset + imgHeight + 8);
          
          xOffset += imgWidth + 10;
          if (xOffset + imgWidth > 280) {
            xOffset = 14;
            yOffset += imgHeight + 15;
          }
        }
      }
    }
  }

  // Photos Testos (Huile)
  if ((doc as any)._oilPhotosQueue && (doc as any)._oilPhotosQueue.length > 0) {
    const photos: { id: string, label: string, date: string, responsible: string, cuve: string }[] = (doc as any)._oilPhotosQueue;
    
    // Sort by date
    photos.sort((a, b) => {
      // date format is dd/MM/yyyy HH:mm
      const valA = a.date.split(' ').join('');
      const valB = b.date.split(' ').join('');
      return valA.localeCompare(valB);
    });

    const titreSection = `Annexe Photos — Huiles de Friture — ${format(options.targetDate, 'MMMM yyyy', { locale: fr })}`;
    
    let photoIndex = 0;
    while (photoIndex < photos.length) {
       doc.addPage();
       addHeader(titreSection, "Photos capturées lors des contrôles qualité de l'huile de friture.");
       
       let xOffsets = [25, 155];
       let yOffsets = [45, 130];
       
       for (let row = 0; row < 2 && photoIndex < photos.length; row++) {
         for (let col = 0; col < 2 && photoIndex < photos.length; col++) {
           const p = photos[photoIndex];
           const b64 = await getPhoto(p.id);
           
           if (b64) {
             const imgWidth = 110;
             const imgHeight = 70;
             const x = xOffsets[col];
             const y = yOffsets[row];
             
             try {
                doc.addImage(b64, 'JPEG', x, y, imgWidth, imgHeight);
                
                doc.setFontSize(8);
                doc.setTextColor(100, 100, 100);
                doc.setFont('helvetica', 'normal');
                
                // Sous chaque photo : référence, date, heure, numéro de cuve, responsable (police 8pt, couleur grise)
                doc.text(`Réf: ${p.label}`, x, y + imgHeight + 4);
                doc.text(`Date & Heure: ${p.date}`, x, y + imgHeight + 8);
                doc.text(`Cuve: ${p.cuve} | Resp: ${p.responsible}`, x, y + imgHeight + 12);
             } catch (e) {
                console.error("Could not add photo to PDF", e);
             }
           }
           photoIndex++;
         }
       }
    }
  }

  const prefix = options.periodType === 'day' ? format(options.targetDate, 'yyyy_MM_dd') : format(options.targetDate, 'MM_yyyy');
  const restoName = options.restaurantInfo?.nom?.replace(/\s+/g, '_') || 'CroustyHub';
  doc.save(`HACCP_${restoName}_${prefix}.pdf`);
};
