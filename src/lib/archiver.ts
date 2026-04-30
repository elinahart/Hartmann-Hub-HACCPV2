import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format, subMonths, isSameMonth, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';
import { getStoredData, setStoredData, initDB, getPhotoBase64 } from './db';

// Configuration keys to KEEP
const CONFIG_KEYS = [
  'crousty_inventory_products',
  'crousty_equipments',
  'crousty_users',
  'crousty_settings',
];

// Data keys to PURGE (only entries from previous month)
const DATA_KEYS = [
  'crousty_temp_checklist',
  'crousty_viandes',
  'crousty_traca',
  'crousty_cleaning',
  'crousty_oil_checklist',
  'crousty_prep',
  'crousty_inventory',
];

export const generateMonthlyPDF = async (targetDate: Date = subMonths(new Date(), 1)) => {
  const monthName = format(targetDate, 'MMMM yyyy', { locale: fr }).toUpperCase();
  const doc = new jsPDF('landscape');
  const primaryColor = getComputedStyle(document.documentElement).getPropertyValue('--color-primary').trim() || '#a855f7';
  
  // Header Helper
  const addHeader = (pdf: jsPDF, title: string, subtitle: string) => {
    const restoName = getStoredData('crousty-config', { restaurant: { nom: 'CROUSTY HUB' } }).restaurant.nom;
    pdf.setFillColor(primaryColor);
    pdf.rect(0, 0, pdf.internal.pageSize.width, 30, 'F');
    pdf.setTextColor('#FFFFFF');
    pdf.setFontSize(22);
    pdf.setFont('helvetica', 'bold');
    pdf.text(restoName.toUpperCase(), 14, 20);
    
    pdf.setFontSize(16);
    pdf.text(title, pdf.internal.pageSize.width / 2, 16, { align: 'center' });
    pdf.setFontSize(11);
    pdf.setFont('helvetica', 'normal');
    pdf.text(subtitle, pdf.internal.pageSize.width / 2, 24, { align: 'center' });
    pdf.setTextColor('#000000');
  };

  // Températures
  const temps = getStoredData<any[]>('crousty_temp_checklist', []).filter(e => isSameMonth(new Date(e.date), targetDate));
  addHeader(doc, `DOSSIER HACCP — ${monthName}`, "FICHE DE RELEVÉ DE TEMPÉRATURES");
  doc.setFontSize(10);
  doc.text("RAPPEL TEMPÉRATURES : Négatif et congelé <= -18°C / Frigos et saladettes selon consignes internes.", 14, 40);
  
  if (temps.length === 0) {
    doc.text("Aucun relevé de température enregistré ce mois.", 14, 50);
  } else {
    // Collect all unique equipment names used this month
    const eqSet = new Set<string>();
    temps.forEach(t => Object.keys(t.equipments).forEach(eq => eqSet.add(eq)));
    const eqNames = Array.from(eqSet);
    
    const body = temps.map(t => {
      const row = [format(new Date(t.date), 'dd/MM'), format(new Date(t.date), 'HH:mm')];
      eqNames.forEach(eq => {
        const val = t.equipments[eq];
        row.push(val ? `${val}°C` : '-');
      });
      row.push(Object.keys(t.correctiveActions || {}).length > 0 ? "Non Conforme" : "Conforme");
      let actions = Object.values(t.correctiveActions || {}).join(', ');
      if (t.signature && t.signature.modifiePar) {
        const modMsg = `(Modifié: ${t.signature.motifModification || 'Sans motif'})`;
        actions = actions ? `${actions}\n${modMsg}` : modMsg;
      }
      row.push(actions);
      row.push(t.responsable);
      return row;
    });

    autoTable(doc, {
      startY: 45,
      head: [['Date', 'Heure', ...eqNames.map(e => e.toUpperCase()), 'Statut', 'Actions', 'Responsable']],
      body: body,
      headStyles: { fillColor: primaryColor },
      alternateRowStyles: { fillColor: '#f9fafb' }
    });
  }

  // Traçabilité
  doc.addPage('landscape');
  const traca = getStoredData<any[]>('crousty_traca', []).filter(e => isSameMonth(new Date(e.date), targetDate));
  addHeader(doc, `DOSSIER HACCP — ${monthName}`, "REGISTRE DE TRAÇABILITÉ DES MATIÈRES PREMIÈRES");
  
  if (traca.length === 0) {
    doc.text("Aucun relevé de traçabilité enregistré ce mois.", 14, 40);
  } else {
    const tracaBody = traca.map(t => {
      let obs = t.commentaire || t.observations || '-';
      if (t.signature && t.signature.modifiePar) {
        const modMsg = `(Modifié: ${t.signature.motifModification || 'Sans motif'})`;
        obs = obs !== '-' ? `${obs}\n${modMsg}` : modMsg;
      }
      return [
        format(new Date(t.date), 'dd/MM/yy HH:mm'),
        t.produit || t.ingredient || '-',
        t.fournisseur || t.marque || '-',
        t.numeroLot || t.lot || '-',
        t.dlc ? format(new Date(t.dlc), 'dd/MM/yy') : (t.dlcPrimaire ? format(new Date(t.dlcPrimaire), 'dd/MM/yy') : '-'),
        obs,
        t.responsable
      ];
    });

    autoTable(doc, {
      startY: 40,
      head: [['Date', 'Produit', 'Fournisseur/Marque', 'N° Lot', 'DLC', 'Observations', 'Responsable']],
      body: tracaBody,
      headStyles: { fillColor: primaryColor },
      alternateRowStyles: { fillColor: '#f9fafb' }
    });
  }

  // Cuisson
  doc.addPage('portrait');
  const viandes = getStoredData<any[]>('crousty_viandes', []).filter(e => isSameMonth(new Date(e.date), targetDate));
  // Sort chronologically
  viandes.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  
  addHeader(doc, `DOSSIER HACCP — ${monthName}`, "FICHE DE RELEVÉ DE TEMPÉRATURES — CUISSON ALIMENTAIRE");
  doc.setFontSize(10);
  doc.setFillColor('#FFEBEE');
  doc.rect(14, 30, doc.internal.pageSize.width - 28, 12, 'F');
  doc.setTextColor('#b91c1c');
  doc.text("RAPPEL HACCP : Température à cœur (sonde piquée) >= 67°C. En dessous, le produit est NON CONFORME et nécessite une action corrective.", 16, 37);
  doc.setTextColor('#000000');
  
  if (viandes.length === 0) {
    doc.text("Aucun relevé de cuisson enregistré ce mois.", 14, 50);
  } else {
    const viandesBody = viandes.map(item => {
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
      startY: 45,
      head: [['Date', 'Tenders', 'Poisson', 'Responsable', 'Observations / Actions']],
      body: viandesBody,
      headStyles: { fillColor: primaryColor },
      alternateRowStyles: { fillColor: '#f9fafb' },
      didParseCell: function (data) {
        if (data.section === 'body') {
          // Check if Tenders or Poisson contains 'KO'
          if (typeof data.cell.raw === 'string' && data.cell.raw.includes('KO')) {
             data.cell.styles.fillColor = '#FFEBEE';
             data.cell.styles.textColor = '#b91c1c';
          }
        }
      }
    });
  }

  // Huiles
  const oils = getStoredData<any[]>('crousty_oil_checklist', []).filter(e => isSameMonth(new Date(e.date), targetDate));
  if (oils.length > 0) {
    doc.addPage('landscape');
    addHeader(doc, `DOSSIER HACCP — ${monthName}`, "FICHE DE CONTRÔLE HUILE FRITURE");
    doc.setFontSize(10);
    doc.text("RAPPEL QUALITÉ HUILE : Noter le test huile, la température, toute action corrective et chaque changement d'huile.", 14, 40);
    
    // Get all cuve keys from the first entry if available
    const cuveKeys = Object.keys(oils[0]?.cuves || { '1': {}, '2': {}, '3': {}, '4': {} }).sort();
    
    let oilHead = ['Jour'];
    cuveKeys.forEach(k => oilHead.push(`Test Cuve ${k}`));
    cuveKeys.forEach(k => oilHead.push(`Temp Cuve ${k}`));
    oilHead.push('Actions Correctives', 'Changement Huile', 'Responsable');

    // Sort chronologically
    oils.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    
    const oilPhotosQueue: { id: string, label: string, date: string, responsible: string, cuve: string }[] = [];

    const oilBody: any[][] = oils.map(o => {
      const dateStr = format(new Date(o.date), 'dd/MM/yyyy HH:mm');
      const row: any[] = [dateStr];
      
      const getCell = (c: any, cuveId: string) => {
        if (!c || !c.testValue) return "-";
        if (c.photo) {
           oilPhotosQueue.push({
              id: c.photo,
              label: c.photo, // This is exactly the reference we want
              date: dateStr,
              responsible: o.responsable,
              cuve: cuveId
           });
           return `${c.testValue}%\n[Photo annexe]`;
        }
        return `${c.testValue}%`;
      };

      cuveKeys.forEach(k => {
        row.push(getCell(o.cuves[k], k));
      });
      cuveKeys.forEach(k => {
        row.push(o.cuves[k]?.temperature ? `${o.cuves[k].temperature}°C` : '-');
      });
      row.push(o.actionsCorrectives || '-');
      row.push(o.changed ? `OUI (Cuve ${o.cuveChangee})\n${o.motifChangement || ''}` : '-');
      row.push(o.responsable);
      return row;
    });

    autoTable(doc, {
      startY: 45,
      head: [oilHead],
      body: oilBody,
      headStyles: { fillColor: primaryColor },
      alternateRowStyles: { fillColor: '#f9fafb' },
      styles: { minCellHeight: 12 },
      didParseCell: function(data) {
        if (data.section === 'body') {
           const valStr = String(data.cell.raw);
           if (valStr.includes('%')) {
               const val = parseFloat(valStr);
               if (val > 24) data.cell.styles.fillColor = '#FFEBEE';
           }
        }
      }
    });

    // We will append photos at the very end of document generation, or later in this function.
    // I can put the promise execution at the bottom of generateMonthlyPDF.
    // Let's pass the queue to a variable accessible at the bottom of the function.
    (doc as any)._oilPhotosQueue = oilPhotosQueue;

  }

  // Inventaire
  const inventories = getStoredData<any[]>('crousty_inventory', []).filter(e => isSameMonth(new Date(e.date), targetDate));
  if (inventories.length > 0) {
    doc.addPage('portrait');
    addHeader(doc, `DOSSIER HACCP — ${monthName}`, "FICHE D'INVENTAIRE");
    doc.setFontSize(10);
    doc.text("RAPPEL INVENTAIRE : Effectuer l'inventaire complet à la fréquence demandée par la direction.", 14, 40);

    const invBody: any[] = [];
    inventories.forEach(inv => {
      const dateStr = format(new Date(inv.date), 'dd/MM/yy HH:mm');
      Object.entries(inv.items).forEach(([cat, items]: [string, any]) => {
        Object.entries(items).forEach(([prod, qty]: [string, any]) => {
          let units = '0';
          let cartons = '0';
          let na = false;
          if (typeof qty === 'string') {
            units = qty;
          } else {
            units = qty.units || qty.poches || '0';
            cartons = qty.cartons || '0';
            na = qty.na || false;
          }

          if (!na) {
             let statut = "OK";
             const totalUnites = parseInt(units) + (parseInt(cartons) * 5); // 5 could be dynamic but assuming 5 here based on UI
             if (totalUnites === 0) statut = "RUPTURE";
             // Can't statically know minThreshold easily without products array, leaving basic "OK/RUPTURE"
             
             invBody.push([
               dateStr,
               inv.responsable,
               cat,
               prod,
               `${units} u. / ${cartons} crt.`,
               statut
             ]);
          }
        });
      });
    });

    autoTable(doc, {
      startY: 45,
      head: [['Date', 'Responsable', 'Catégorie', 'Produit', 'Quantité', 'Statut']],
      body: invBody,
      headStyles: { fillColor: primaryColor },
      alternateRowStyles: { fillColor: '#f9fafb' },
      didParseCell: function(data) {
        if (data.section === 'body' && data.column.index === 5) {
          if (data.cell.raw === 'RUPTURE') {
             data.cell.styles.textColor = '#dc2626'; // text-red-600
             data.cell.styles.fillColor = '#FFEBEE';
          } else if (data.cell.raw === 'FAIBLE') {
             data.cell.styles.textColor = '#d97706'; // text-orange-600
          } else {
             data.cell.styles.textColor = '#16a34a'; // text-green-600
          }
        }
      }
    });
  }

  // Préparations
  const preps = getStoredData<any[]>('crousty_prep', []).filter(e => isSameMonth(new Date(e.date), targetDate));
  if (preps.length > 0) {
    doc.addPage('portrait');
    addHeader(doc, `DOSSIER HACCP — ${monthName}`, "FICHE DE PRÉPARATIONS");
    
    const prepBody = preps.map(p => [
      format(new Date(p.date), 'dd/MM/yy'),
      p.sauceId,
      p.time || '-',
      p.expiryTime || p.endTime || '-',
      p.responsable
    ]);

    autoTable(doc, {
      startY: 40,
      head: [['Date', 'Préparation', 'Heure début', 'Heure fin', 'Responsable']],
      body: prepBody,
      headStyles: { fillColor: primaryColor },
      alternateRowStyles: { fillColor: '#f9fafb' }
    });
  }

  // Plan de Nettoyage (Optional extra pages)
  const cleaning = getStoredData<any[]>('crousty_cleaning', []).filter(e => isSameMonth(new Date(e.date), targetDate));
  if (cleaning.length > 0) {
    doc.addPage('portrait');
    addHeader(doc, `DOSSIER HACCP — ${monthName}`, "FICHE DE PLAN DE NETTOYAGE");

    
    doc.setFontSize(10);
    doc.text("RAPPEL NETTOYAGE : Toutes les tâches enregistrées sur la période.", 14, 40);

    let cleaningRows: any[] = [];
    cleaning.forEach(c => {
      Object.keys(c.daily || {}).forEach(task => {
        cleaningRows.push([format(new Date(c.date), 'dd/MM/yy'), format(new Date(c.date), 'HH:mm'), task, 'Quotidien', 'OUI', c.responsable]);
      });
      Object.keys(c.weekly || {}).forEach(task => {
        cleaningRows.push([format(new Date(c.date), 'dd/MM/yy'), format(new Date(c.date), 'HH:mm'), task, 'Hebdomadaire', 'OUI', c.responsable]);
      });
    });

    autoTable(doc, {
      startY: 45,
      head: [['Date', 'Heure', 'Tâche', 'Fréquence', 'Effectué (O/N)', 'Responsable']],
      body: cleaningRows,
      headStyles: { fillColor: primaryColor },
      alternateRowStyles: { fillColor: '#f9fafb' }
    });
  }

  // Add Oil Photos Appendix
  if ((doc as any)._oilPhotosQueue && (doc as any)._oilPhotosQueue.length > 0) {
    const photos: { id: string, label: string, date: string, responsible: string, cuve: string }[] = (doc as any)._oilPhotosQueue;
    doc.addPage('portrait');
    addHeader(doc, `DOSSIER HACCP — ${monthName}`, "ANNEXES PHOTOS TESTOS HUILE");
    doc.setFontSize(10);
    doc.text("Photos capturées lors des contrôles qualité de l'huile de friture.", 14, 40);

    let currentY = 50;
    const pageH = doc.internal.pageSize.height;
    const pageW = doc.internal.pageSize.width;

    for (let i = 0; i < photos.length; i++) {
       const p = photos[i];
       const b64 = await getPhotoBase64(p.id);
       if (b64) {
          if (currentY + 110 > pageH - 20) {
             doc.addPage('portrait');
             addHeader(doc, `DOSSIER HACCP — ${monthName}`, "ANNEXES PHOTOS TESTOS HUILE");
             currentY = 40;
          }
          
          const imgWidth = 100;
          const imgHeight = 80;
          const x = (pageW - imgWidth) / 2;
          try {
             doc.addImage(b64, 'JPEG', x, currentY, imgWidth, imgHeight);
             
             doc.setFontSize(10);
             doc.setFont('helvetica', 'bold');
             doc.text(`Cuve ${p.cuve} - ${p.date}`, pageW / 2, currentY + imgHeight + 5, { align: 'center' });
             doc.setFont('helvetica', 'normal');
             doc.setTextColor(150, 150, 150);
             doc.setFont('courier', 'normal');
             doc.text(`Réf: ${p.label} | Resp: ${p.responsible}`, pageW / 2, currentY + imgHeight + 10, { align: 'center' });
             doc.setTextColor(0, 0, 0);

             currentY += imgHeight + 25;
          } catch (e) {
             console.error("Could not add photo to PDF", e);
          }
       }
    }
  }

  // Add Page Numbers
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.text(`Crousty Hub — Rapport HACCP ${monthName} — Page ${i} / ${pageCount}`, doc.internal.pageSize.width / 2, doc.internal.pageSize.height - 10, { align: 'center' });
  }

  const restoConfig = getStoredData('crousty-config', { restaurant: { nom: 'Crousty Hub' } });
  const restaurantName = restoConfig.restaurant.nom.replace(/[^a-zA-Z0-9-]/g, '-').toLowerCase();
  const filename = `${restaurantName}-HACCP-${format(targetDate, 'MM-yyyy')}.pdf`;
  doc.save(filename);
  return filename;
};

export const purgeOldData = async (targetDate: Date = subMonths(new Date(), 1)) => {
  // Purge localStorage DATA_KEYS mapping
  let removedCount = 0;
  for (const key of DATA_KEYS) {
    const data = getStoredData<any[]>(key, []);
    const filtered = data.filter(e => {
        if (!e.date) return true;
        // Keep tracking if it's NOT from the target month
        return !isSameMonth(new Date(e.date), targetDate);
    });
    
    removedCount += (data.length - filtered.length);
    setStoredData(key, filtered);
  }

  // Purge Photos from IDB
  try {
    const db = await initDB();
    const tx = db.transaction('photos', 'readwrite');
    const store = tx.objectStore('photos');
    const keys = await store.getAllKeys();
    
    // We don't have accurate dates for photos unless embedded in ID, 
    // Assuming traca sets IDs with dates or we just clear completely old ones
    // For simplicity, we clear ALL photos since Traca keeps them short-lived 
    // BUT we should actually selectively delete. 
    // If ID is timestamp based: return !isSameMonth(new Date(parseInt(id)), targetDate)
    
    for (const key of keys) {
      if (typeof key === 'string') {
        const timestamp = parseInt(key.split('-')[0] || '0');
        if (timestamp > 0 && isSameMonth(new Date(timestamp), targetDate)) {
           await store.delete(key);
        }
      }
    }
  } catch (err) {
    console.error("Erreur purge IDB:", err);
  }
  
  return removedCount;
};
