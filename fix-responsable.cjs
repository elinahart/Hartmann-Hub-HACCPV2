const fs = require('fs');

const files = [
  'src/modules/Inventaire.tsx',
  'src/modules/DLC.tsx',
  'src/modules/CleaningPlan.tsx',
  'src/modules/DessertsDLC.tsx',
  'src/modules/Viandes.tsx',
  'src/modules/TemperaturesChecklist.tsx',
  'src/modules/OilChecklist.tsx',
  'src/modules/Receptions.tsx',
  'src/modules/PrepSauces.tsx'
];

files.forEach(file => {
  if (!fs.existsSync(file)) return;
  let content = fs.readFileSync(file, 'utf8');

  // Add import if missing
  if (!content.includes('useAuth')) {
    content = content.replace(
      /import React, { useState.*? } from 'react';/,
      `import React, { useState, useEffect } from 'react';\nimport { useAuth } from '../contexts/AuthContext';`
    );
  }

  // Inject useAuth hook if missing
  if (!content.includes('const { currentUser } = useAuth();')) {
    content = content.replace(
      /export default function [A-Za-z0-9_]+\(\) {\n/,
      `export default function ${file.split('/').pop().split('.')[0]}() {\n  const { currentUser } = useAuth();\n`
    );
  }

  // Remove the local state for responsable
  content = content.replace(/const \[responsable, setResponsable\] = useState\(''\);\n/g, '');
  content = content.replace(/setResponsable\([^)]*\);?/g, '');
  
  // Replace the required check
  content = content.replace(/!responsable/g, '!currentUser');
  content = content.replace(/\|\| !currentUser/g, ''); // Fix duplicates if it became !something || !currentUser
  content = content.replace(/!currentUser \|\| /g, ''); // Fix duplicates

  // Update object creation where responsable is used as a shorthand `responsable,` to `responsable: currentUser?.name || 'Inconnu',`
  content = content.replace(/ responsable,/g, " responsable: currentUser?.name || 'Inconnu',");
  // For Receptions, there's `responsable` at the end
  content = content.replace(/, responsable\n/g, ", responsable: currentUser?.name || 'Inconnu'\n");
  
  // Also inline object creations like { ... , responsable }
  content = content.replace(/, responsable }/g, ", responsable: currentUser?.name || 'Inconnu' }");
  
  // For update in TemperaturesChecklist
  content = content.replace(/responsable: e.target.value/g, "responsable: currentUser?.name || 'Inconnu'");

  // Remove the Label and Input for Responsable UI
  content = content.replace(/<div><Label>Responsable.*?<\/div>/g, '');
  content = content.replace(/<div>\s*<Label>Responsable<\/Label>\s*<Input.*?onChange.*?setResponsable.*?\/>\s*<\/div>/gs, '');
  content = content.replace(/<Label>Responsable \*<\/Label>\s*<Input.*?\/>/gs, '');

  fs.writeFileSync(file, content);
  console.log('Fixed', file);
});
