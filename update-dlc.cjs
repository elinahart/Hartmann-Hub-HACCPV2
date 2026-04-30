const fs = require('fs');
let content = fs.readFileSync('src/modules/DessertsDLC.tsx', 'utf8');

// The replace logic: Find the button <Button onClick={handleSave} ...
// and insert the preview block right before it.

const previewBlock = `
        {/* WYSIWYG Preview */}
        {products.find(d => d.id === selectedDessert) && (
          <div className="bg-gray-100/50 p-6 rounded-3xl flex flex-col items-center justify-center border border-gray-100 mt-4 mb-6">
            <span className="text-[10px] font-black text-gray-400 mb-4 uppercase tracking-widest">Aperçu Mode Impression</span>
            
            <div className="bg-white border-4 border-black w-72 h-44 p-4 flex flex-col relative shadow-xl transform scale-100 origin-center bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI0IiBoZWlnaHQ9IjQiPgo8cmVjdCB3aWR0aD0iNCIgaGVpZ2h0PSI0IiBmaWxsPSIjZmZmIj48L3JlY3Q+CjxyZWN0IHdpZHRoPSIxIiBoZWlnaHQ9IjEiIGZpbGw9IiNjY2MiPjwvcmVjdD4KPC9zdmc+')]">
               {/* Label Header */}
               <div className="flex items-start justify-between border-b-2 border-black pb-2 mb-2">
                 <div className="font-black text-2xl text-black leading-none uppercase tracking-tighter">
                   {products.find(d => d.id === selectedDessert)?.name.toUpperCase()}
                 </div>
               </div>
               
               {/* Saisie */}
               <div className="text-xs font-bold text-gray-800 uppercase flex justify-between items-center mb-1">
                  <span className="opacity-60 text-[10px]">Ouverture:</span>
                  <span className="font-black">{format(new Date(), 'dd/MM/yy HH:mm')}</span>
               </div>
               
               {/* DLC Final */}
               <div className="mt-auto pt-2 border-t-2 border-black flex justify-between items-end">
                  <div className="flex flex-col">
                    <span className="text-[10px] font-black opacity-60 uppercase mb-0.5">DLC Max / Jeter le :</span>
                    <span className="font-black text-xl leading-none">
                      {(() => {
                        const d = products.find(d => d.id === selectedDessert);
                        if (!d) return '';
                        const date = d.dlcUnit === 'hours' ? addHours(new Date(), d.dlcValue) : addDays(new Date(), d.dlcValue);
                        return format(date, 'dd/MM/yy HH:mm');
                      })()}
                    </span>
                  </div>
               </div>
               
               {/* Par */}
               <div className="text-[9px] font-black absolute bottom-1 right-2 opacity-50 uppercase">
                  Resp: {currentUser?.name || 'Inconnu'}
               </div>
            </div>
            
            <p className="text-xs font-bold text-crousty-purple text-center mt-6 flex items-center gap-2">
              <Printer size={14} /> Format {printerConfig.labelSize}
            </p>
          </div>
        )}

`;

content = content.replace(/<Button onClick={handleSave}/, previewBlock + "        <Button onClick={handleSave}");

// also ensure 'fr' locale is imported if not already. It usually is, but just in case.
if (!content.includes('import { fr }')) {
  content = content.replace(/import \{ addHours, addDays, format \} from 'date-fns';/, "import { addHours, addDays, format } from 'date-fns';\nimport { fr } from 'date-fns/locale';");
}

fs.writeFileSync('src/modules/DessertsDLC.tsx', content);
