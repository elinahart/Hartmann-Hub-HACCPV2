import * as XLSX from 'xlsx';
import { format } from 'date-fns';

export const exportToExcel = (temperatures: any[], dlcs: any[], primaryDlcs: any[], oils: any[]) => {
  const wb = XLSX.utils.book_new();

  // 1. Temperatures
  const tempHeaders = [
    "JOUR", "NEGATIF", "POSITIF", "CONGELE CUISINE", "FRIGO BOISSON 1", 
    "FRIGO BOISSON 2", "FRIGO CUISINE", "SALADETTE SAUCES", "SALADETTE DESSERTS", 
    "ACTIONS CORRECTIVES", "RESPONSABLE"
  ];
  const tempRows = temperatures.map(t => {
    let actionsArr = [];
    if (t.correctiveActions) {
      Object.entries(t.correctiveActions).forEach(([equip, action]) => {
        if (action) {
          let str = `${equip}: ${action}`;
          if (t.productTemperatures && t.productTemperatures[equip]) {
            str += ` (Nouv. Temp: ${t.productTemperatures[equip]}°C)`;
          }
          actionsArr.push(str);
        }
      });
    }
    let actions = actionsArr.join(', ');
    if (t.globalObservation) {
      actions = actions ? `${actions} | ${t.globalObservation}` : t.globalObservation;
    }

    return [
      format(new Date(t.date), 'dd/MM/yyyy HH:mm'),
      t.negatif || '',
      t.positif || '',
      t.congeleCuisine || '',
      t.frigoBoisson1 || '',
      t.frigoBoisson2 || '',
      t.frigoCuisine || '',
      t.saladetteSauces || '',
      t.saladetteDesserts || '',
      actions,
      t.responsable || ''
    ];
  });
  const wsTemp = XLSX.utils.aoa_to_sheet([tempHeaders, ...tempRows]);
  XLSX.utils.book_append_sheet(wb, wsTemp, "Temperatures");

  // 2. DLC Secondaire (Préparations)
  const dlcHeaders = [
    "DÉSIGNATION PRODUIT", "DATE SAISIE", "DLC CALCULÉE", "PHOTO (Lien local)", "OBSERVATION"
  ];
  const dlcRows = dlcs.map(d => [
    d.productName,
    format(new Date(d.dateSaisie), 'dd/MM/yyyy HH:mm'),
    format(new Date(d.dlcCalc), 'dd/MM/yyyy HH:mm'),
    d.photoId ? `Photo stockée localement (ID: ${d.photoId})` : 'Aucune',
    d.observation || ''
  ]);
  const wsDlc = XLSX.utils.aoa_to_sheet([dlcHeaders, ...dlcRows]);
  XLSX.utils.book_append_sheet(wb, wsDlc, "DLC Secondaire");

  // 3. DLC Primaire (Ingrédients)
  const primaryDlcHeaders = [
    "DATE (JJ/MM/AA)", "INGRÉDIENT", "MARQUE / FOURNISSEUR", "NUMÉRO DE LOT", "DLC PRIMAIRE", "RESP. (Initiales)", "OBSERVATIONS"
  ];
  const primaryDlcRows = primaryDlcs.map(d => [
    format(new Date(d.date), 'dd/MM/yyyy HH:mm'),
    d.ingredient || '',
    d.marque || '',
    d.numeroLot || '',
    d.dlcPrimaire ? format(new Date(d.dlcPrimaire), 'dd/MM/yyyy') : '',
    d.responsable || '',
    d.observations || ''
  ]);
  const wsPrimaryDlc = XLSX.utils.aoa_to_sheet([primaryDlcHeaders, ...primaryDlcRows]);
  XLSX.utils.book_append_sheet(wb, wsPrimaryDlc, "DLC Primaire");

  // 4. Huile
  const oilHeaders = [
    "JOUR", "TEST HUILE (%)", "TEMPÉRATURE HUILE (°C)", "ACTIONS CORRECTIVES", "CHANGEMENT HUILE", "RESPONSABLE"
  ];
  const oilRows = oils.map(o => [
    format(new Date(o.date), 'dd/MM/yyyy HH:mm'),
    o.testValue || '',
    o.temperature || '',
    o.actionsCorrectives || '',
    o.changed ? 'OUI' : 'NON',
    o.responsable || ''
  ]);
  const wsOil = XLSX.utils.aoa_to_sheet([oilHeaders, ...oilRows]);
  XLSX.utils.book_append_sheet(wb, wsOil, "Huile");

  // Export
  const fileName = `CroustyGame_Export_${format(new Date(), 'yyyyMMdd_HHmmss')}.xlsx`;
  XLSX.writeFile(wb, fileName);
};
