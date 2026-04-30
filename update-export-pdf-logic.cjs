const fs = require('fs');
let content = fs.readFileSync('src/lib/exportPro.ts', 'utf8');

// The tricky part of JS replace: we want to replace the sections: 
// // --- X. NAME ---
// with 
// if (options.categories.name) {
// // --- X. NAME ---
// ...
// }

// I will just use regex to wrap these sections.

content = content.replace(/\/\/ --- 1\. TEMPÉRATURES ---[\s\S]*?(?=\/\/ --- 2\. TRAÇABILITÉ ---)/, `// --- 1. TEMPÉRATURES ---
  if (options.categories.temperatures) {
    addHeader("FICHE DE RELEVE DE TEMPERATURES - CROUSTY GAME NANTES", "RAPPEL TEMPÉRATURES : Négatif et congelé <= -18°C ; frigos et saladettes selon consignes internes.");
    
    const tempData = getDataForPeriod('crousty_temp_checklist', options);
    const tempBody = [];
    for (let day = 1; day <= 31; day++) {
      const d = tempData.find(x => getDate(new Date(x.date)) === day) || {};
      const eq = d.equipments || {};
      let actionsArr = [];
      if (d.correctiveActions) {
        Object.entries(d.correctiveActions).forEach(([equip, action]) => {
          if (action) {
            let str = \`\${equip}: \${action}\`;
            if (d.productTemperatures && d.productTemperatures[equip]) {
              str += \` (Nouv. Temp: \${d.productTemperatures[equip]}°C)\`;
            }
            actionsArr.push(str);
          }
        });
      }
      let actions = actionsArr.join(', ');
      if (d.globalObservation) {
        actions = actions ? \`\${actions} | \${d.globalObservation}\` : d.globalObservation;
      }
      tempBody.push([
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
        d.responsable || ""
      ]);
    }

    autoTable(doc, {
      startY: 38,
      head: [["JOUR", "NEGATIF\\n(<= -18°C)", "POSITIF\\n(0 a +4°C)", "FRIGO\\nCUISINE\\n(0 a +4°C)", "CONGELE\\nCUISINE\\n(<= -18°C)", "SALADETTE\\nSAUCES\\n(0 a +4°C)", "SALADETTE\\nDESSERTS\\n(0 a +4°C)", "FRIGO\\nBOISSON 1\\n(0 a +8°C)", "FRIGO\\nBOISSON DADA\\n(0 a +8°C)", "ACTIONS CORRECTIVES", "RESPONSABLE"]],
      body: tempBody,
      theme: 'grid',
      headStyles: { fillColor: [176, 38, 255], halign: 'center', valign: 'middle', fontSize: 7 },
      bodyStyles: { halign: 'center', valign: 'middle', fontSize: 8 },
      styles: { cellPadding: 1, minCellHeight: 4.5 },
    });
  }

  `);

content = content.replace(/\/\/ --- 2\. TRAÇABILITÉ ---[\s\S]*?(?=\/\/ --- 3\. CUISSON VIANDES ---)/, `// --- 2. TRAÇABILITÉ ---
  if (options.categories.tracabilite) {
    if (options.categories.temperatures) doc.addPage();
    addHeader("REGISTRE DE TRAÇABILITÉ DES MATIÈRES PREMIÈRES - CROUSTY GAME NANTES", "RAPPEL TRAÇABILITÉ : Saisir une ligne par produit ouvert. Noter le n° de lot et la DLC à chaque ouverture. Conserver les étiquettes 6 mois.");
    
    const tracData = getDataForPeriod('crousty_receptions', options);
    const tracBody = tracData.length > 0 ? tracData.map(item => [
      item.date ? format(new Date(item.date), 'dd/MM/yy') : "",
      item.ingredient || "",
      item.marque || "",
      item.numeroLot || "",
      item.dlcPrimaire ? format(new Date(item.dlcPrimaire), 'dd/MM/yy') : "",
      item.responsable || "",
      item.observations || ""
    ]) : Array(25).fill(["", "", "", "", "", "", ""]);

    autoTable(doc, {
      startY: 38,
      head: [["DATE\\n(JJ/MM/AA)", "INGRÉDIENT\\n(Ex: Crème, Mayo, Ail...)", "MARQUE /\\nFOURNISSEUR", "NUMÉRO DE LOT\\n(Suivi sanitaire)", "DLC PRIMAIRE\\n(Date emballage)", "RESP.\\n(Initiales)", "OBSERVATIONS\\n(Ex: Sceau 5kg, Carton abimé...)"]],
      body: tracBody,
      theme: 'grid',
      headStyles: { fillColor: [176, 38, 255], halign: 'center', valign: 'middle', fontSize: 8 },
      bodyStyles: { halign: 'center', valign: 'middle', fontSize: 8 },
      styles: { cellPadding: 2 },
    });
  }

  `);

content = content.replace(/\/\/ --- 3\. CUISSON VIANDES ---[\s\S]*?(?=\/\/ --- 4\. CONTRÔLE HUILE ---)/, `// --- 3. CUISSON VIANDES ---
  if (options.categories.viandes) {
    if (options.categories.temperatures || options.categories.tracabilite) doc.addPage();
    addHeader("FICHE DE RELEVE DE TEMPERATURES - VIANDES (CUISSON) - CROUSTY GAME NANTES", "RAPPEL HACCP : Température à coeur des viandes (sonde piquée) >= 67°C. En dessous, la viande est NON CONFORME et ne peut pas être servie.");
    
    const viandesData = getDataForPeriod('crousty_viandes', options);
    const viandesBody = [];
    for (let day = 1; day <= 31; day++) {
      const d = viandesData.find(x => getDate(new Date(x.date)) === day) || {};
      viandesBody.push([
        day, d.typeViande || "", d.temperature || "", d.conforme || "", d.actionCorrective || "", d.responsable || ""
      ]);
    }

    autoTable(doc, {
      startY: 38,
      head: [["JOUR", "TYPE DE VIANDE", "TEMP. MESURÉE\\n(°C)", "CONFORME\\n(>= 67°C)", "ACTION CORRECTIVE", "RESPONSABLE"]],
      body: viandesBody,
      theme: 'grid',
      headStyles: { fillColor: [176, 38, 255], halign: 'center', valign: 'middle', fontSize: 8 },
      bodyStyles: { halign: 'center', valign: 'middle', fontSize: 8 },
      styles: { cellPadding: 1, minCellHeight: 4.5 },
    });
  }

  `);

content = content.replace(/\/\/ --- 4\. CONTRÔLE HUILE ---[\s\S]*?(?=\/\/ --- 5\. INVENTAIRE ---)/, `// --- 4. CONTRÔLE HUILE ---
  if (options.categories.huiles) {
    if (options.categories.temperatures || options.categories.tracabilite || options.categories.viandes) doc.addPage();
    addHeader("FICHE DE CONTRÔLE HUILE FRITURE - CROUSTY GAME NANTES", "RAPPEL QUALITÉ HUILE : noter le test huile, la température, toute action corrective et chaque changement d'huile.");
    
    const huileData = getDataForPeriod('crousty_oil_checklist', options);
    const huileBody = [];
    for (let day = 1; day <= 31; day++) {
      const d = huileData.find(x => getDate(new Date(x.date)) === day) || {};
      const cuves = d.cuves || { 1: {}, 2: {}, 3: {}, 4: {} };
      huileBody.push([
        day, 
        cuves[1]?.testValue || "", cuves[2]?.testValue || "", cuves[3]?.testValue || "", cuves[4]?.testValue || "", 
        cuves[1]?.temperature || "", cuves[2]?.temperature || "", cuves[3]?.temperature || "", cuves[4]?.temperature || "", 
        d.actionsCorrectives || "", 
        d.changed ? "OUI" : "", 
        d.responsable || ""
      ]);
    }

    autoTable(doc, {
      startY: 38,
      head: [
        [{ content: "JOUR", rowSpan: 2 }, { content: "TEST HUILE", colSpan: 4 }, { content: "TEMPÉRATURE HUILE", colSpan: 4 }, { content: "ACTIONS CORRECTIVES", rowSpan: 2 }, { content: "CHANGEMENT\\nHUILE", rowSpan: 2 }, { content: "RESPONSABLE", rowSpan: 2 }],
        ["Cuve 1", "Cuve 2", "Cuve 3", "Cuve 4", "Cuve 1", "Cuve 2", "Cuve 3", "Cuve 4"]
      ],
      body: huileBody,
      theme: 'grid',
      headStyles: { fillColor: [176, 38, 255], halign: 'center', valign: 'middle', fontSize: 7 },
      bodyStyles: { halign: 'center', valign: 'middle', fontSize: 8 },
      styles: { cellPadding: 1, minCellHeight: 4.5 },
    });
  }

  `);

content = content.replace(/\/\/ --- 5\. INVENTAIRE ---[\s\S]*?(?=\/\/ --- 6\. IMAGES TRAÇABILITÉ ---)/, `// --- 5. INVENTAIRE ---
  if (options.categories.inventaire) {
    if (options.categories.temperatures || options.categories.tracabilite || options.categories.viandes || options.categories.huiles) doc.addPage();
    addHeader("FICHE D'INVENTAIRE - CROUSTY GAME NANTES", "RAPPEL INVENTAIRE : Effectuer l'inventaire complet à la fréquence demandée par la direction.");
    
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
            if (parseInt(d.cartons) > 0) parts.push(\`\${d.cartons} cart.\`);
            if (parseInt(d.units) > 0 || parts.length === 0) parts.push(\`\${d.units} u.\`);
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
    addHeader("FICHE DE PLAN DE NETTOYAGE - CROUSTY GAME NANTES", "RAPPEL NETTOYAGE : Tâches enregistrées dans la période.");
    
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

  `);

content = content.replace(/\/\/ --- 6\. IMAGES TRAÇABILITÉ ---[\s\S]*$/, `// --- 7. IMAGES TRAÇABILITÉ ---
  if (options.categories.tracabilite) {
    const tracData = getDataForPeriod('crousty_receptions', options);
    const tracDataWithPhotos = tracData.filter(item => item.photoId);
    if (tracDataWithPhotos.length > 0) {
      doc.addPage();
      addHeader("ANNEXE : PHOTOS DE TRAÇABILITÉ", "Photos des étiquettes des produits réceptionnés dans la période.");
      
      let yOffset = 45;
      let xOffset = 14;
      const imgWidth = 80;
      const imgHeight = 60;
      
      for (const item of tracDataWithPhotos) {
        const photoData = await getPhoto(item.photoId);
        if (photoData) {
          if (yOffset + imgHeight > 190) {
            doc.addPage();
            addHeader("ANNEXE : PHOTOS DE TRAÇABILITÉ", "Photos des étiquettes des produits réceptionnés dans la période.");
            yOffset = 45;
            xOffset = 14;
          }
          
          try {
            doc.addImage(photoData, 'JPEG', xOffset, yOffset, imgWidth, imgHeight);
          } catch (e) {
            // Fallback if image format is not supported
            doc.text("[Image non supportée]", xOffset, yOffset + 30);
          }
          
          doc.setFontSize(8);
          doc.text(\`Lot: \${item.numeroLot} - \${item.ingredient}\`, xOffset, yOffset + imgHeight + 4);
          doc.text(\`Date: \${format(new Date(item.date), 'dd/MM/yy')}\`, xOffset, yOffset + imgHeight + 8);
          
          xOffset += imgWidth + 10;
          if (xOffset + imgWidth > 280) {
            xOffset = 14;
            yOffset += imgHeight + 15;
          }
        }
      }
    }
  }

  const prefix = options.periodType === 'day' ? format(options.targetDate, 'yyyy_MM_dd') : format(options.targetDate, 'MM_yyyy');
  doc.save(\`HACCP_CroustyGame_\${prefix}.pdf\`);
};
`);

fs.writeFileSync('src/lib/exportPro.ts', content);
