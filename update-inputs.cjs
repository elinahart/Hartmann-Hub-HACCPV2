const fs = require('fs');

const files = [
  'src/modules/Viandes.tsx',
  'src/modules/Receptions.tsx'
];

files.forEach(file => {
  if (!fs.existsSync(file)) return;
  let content = fs.readFileSync(file, 'utf8');

  // Viandes: <Input type="number" step="0.1" value={temperature}
  content = content.replace(/<Input type="number" step="0.1" value={temperature}/g, '<Input type="number" inputMode="decimal" step="0.1" value={temperature}');
  
  // Receptions: <Input type="number" step="0.1" value={temperature}
  content = content.replace(/<Input type="number" step="0.1" value={temperature}/g, '<Input type="number" inputMode="decimal" step="0.1" value={temperature}');

  fs.writeFileSync(file, content);
  console.log('Fixed inputs in', file);
});

// TemperaturesChecklist: 
let tempChecklist = fs.readFileSync('src/modules/TemperaturesChecklist.tsx', 'utf8');
tempChecklist = tempChecklist.replace(/<input\s+type="number" step="0.1" placeholder="°C"/g, '<input \ntype="number" inputMode="decimal" step="0.1" placeholder="°C"');
fs.writeFileSync('src/modules/TemperaturesChecklist.tsx', tempChecklist);
console.log('Fixed temps in TemperaturesChecklist');

// OilChecklist:
let oilChecklist = fs.readFileSync('src/modules/OilChecklist.tsx', 'utf8');
// Oil needs number input for temperature too. "<Input value={tempValue}" ?
oilChecklist = oilChecklist.replace(/<Input type="text" value=\{cuve\.temperature\}/g, '<Input type="number" inputMode="decimal" step="0.1" value={cuve.temperature}');
fs.writeFileSync('src/modules/OilChecklist.tsx', oilChecklist);
console.log('Fixed temps in OilChecklist');
