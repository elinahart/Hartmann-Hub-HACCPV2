const fs = require('fs');
let content = fs.readFileSync('src/App.tsx', 'utf8');

// 1. imports
if (!content.includes('import { Sidebar }')) {
  content = content.replace(
    /import { motion, AnimatePresence } from 'motion\/react';/,
    `import { motion, AnimatePresence } from 'motion/react';\nimport { Sidebar } from './components/Sidebar';\nimport Tracabilite from './modules/Tracabilite';`
  );
}

// 2. View type
content = content.replace(
  /type View = 'dashboard'[\s\S]*?';/,
  "type View = 'dashboard' | 'receptions' | 'tracabilite' | 'prep' | 'temperatures' | 'desserts' | 'oil' | 'cleaning' | 'products' | 'viandes' | 'inventaire';"
);

// 3. getViewTitle
content = content.replace(
  /case 'receptions': return 'Réception & Traçabilité';/,
  "case 'receptions': return 'Réception';\n      case 'tracabilite': return 'Traçabilité';"
);

// 4. renderView cases
content = content.replace(
  /case 'receptions': return <Receptions \/>;/,
  "case 'receptions': return <Receptions />;\n      case 'tracabilite': return <Tracabilite />;"
);

// 5. Dashboard Grid
content = content.replace(
  /<Tile icon={Package} title="Réception & Traçabilité" onClick={\(\) => setCurrentView\('receptions'\)} \/>/,
  `<Tile icon={Package} title="Réception" onClick={() => setCurrentView('receptions')} />
            <Tile icon={Sparkles} title="Traçabilité" onClick={() => setCurrentView('tracabilite')} />`
);

// 6. Return layout
content = content.replace(
  /<div className="min-h-screen bg-slate-50 text-gray-800 font-sans pb-24 relative">/,
  `<div className="flex h-screen bg-slate-50 text-gray-800 font-sans overflow-hidden">
      <Sidebar 
          currentView={currentView} 
          setCurrentView={setCurrentView} 
          showSettings={showSettings} 
          setShowSettings={setShowSettings} 
       />
      <div className="flex-1 overflow-y-auto relative pb-24 md:pb-0">`
);

// 7. floating home button
content = content.replace(
  /<button[\s\S]*?className="fixed bottom-8 left-4 w-14 h-14 bg-white text-crousty-purple rounded-full flex items-center justify-center shadow-\[0_4px_20px_rgba\(0,0,0,0\.15\)\] active:scale-90 transition-transform z-\[100\] border border-gray-100"[\s\S]*?<Home size={24} \/>/g,
  `<button 
          onClick={() => setCurrentView('dashboard')}
          className="fixed bottom-8 left-4 w-14 h-14 bg-white text-crousty-purple rounded-full flex md:hidden items-center justify-center shadow-[0_4px_20px_rgba(0,0,0,0.15)] active:scale-90 transition-transform z-[100] border border-gray-100"
        >
          <Home size={24} />`
);

// close the div wrapper correctly at the very end
content = content.replace(
  /<\/div>\n  \);\n}\n$/,
  `</div>\n    </div>\n  );\n}\n`
)

fs.writeFileSync('src/App.tsx', content);
