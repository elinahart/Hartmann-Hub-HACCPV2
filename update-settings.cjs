const fs = require('fs');
let content = fs.readFileSync('src/App.tsx', 'utf8');

if (!content.includes('import { SettingsPanel }')) {
  // Add import
  content = content.replace(
    /import { Sidebar } from '.\/components\/Sidebar';/,
    `import { Sidebar } from './components/Sidebar';\nimport { SettingsPanel } from './components/SettingsPanel';`
  );
}

// Remove old reset/settings logic from renderView (Dashboard)
// We already removed the Reset modal code mostly in the Dashboard rewrite but let's double check.
// Wait! `handleReset` might still be used if `isResetModalOpen` is in App state, but we moved it to SettingsPanel!
// The previous Dashboard KPIs rewrite actually removed `showSettings && ...` but let's make sure.

content = content.replace(/{showSettings && \([\s\S]*?Effacer l'historique\s*<\/button>\s*<\/div>\s*\)}/g, '');
content = content.replace(/{\/\* Reset Modal \*\/}[\s\S]*?<\/div>\s*<\/div>\s*\)}/g, '');

// Since Sidebar sets showSettings, we just need to render SettingsPanel at the end of the App.tsx
content = content.replace(
  /<ExportModal/,
  `{showSettings && <SettingsPanel onClose={() => setShowSettings(false)} />}\n          <ExportModal`
);

fs.writeFileSync('src/App.tsx', content);
