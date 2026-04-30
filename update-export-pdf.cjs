const fs = require('fs');
let content = fs.readFileSync('src/lib/exportPro.ts', 'utf8');

const nettoyageCode = `
const generateNettoyageSheet = (options: ExportOptions, periodStr: string) => {
  const data = getDataForPeriod('crousty_cleaning', options);
  const ws = XLSX.utils.aoa_to_sheet([]);
  
  XLSX.utils.sheet_add_aoa(ws, [["FICHE DE PLAN DE NETTOYAGE - CROUSTY GAME NANTES"]], { origin: "A1" });
  ws['!merges'] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 2 } }];
  ws['A1'].s = commonStyles.title;

  XLSX.utils.sheet_add_aoa(ws, [[\`Période : \${periodStr}\`]], { origin: "A2" });
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
    XLSX.utils.sheet_add_aoa(ws, [row], { origin: \`A\${currentRow + 1}\` });
    
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

export const generateProPDF = async`;

content = content.replace("export const generateProPDF = async", nettoyageCode);

const pdfGenStart = `export const generateProPDF = async (options: ExportOptions) => {
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
    doc.text(\`Période : \${periodStr}\` , 14, 26);
    
    doc.setFillColor(255, 42, 157); // #FF2A9D
    doc.rect(14, 29, 269, 8, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(9);
    doc.setFont("helvetica", "italic");
    doc.text(rappel, 16, 34);
  };
`;

content = content.replace(/export const generateProPDF = async \([\s\S]*?addHeader = [\s\S]*?};\n/, pdfGenStart);

fs.writeFileSync('src/lib/exportPro.ts', content);
