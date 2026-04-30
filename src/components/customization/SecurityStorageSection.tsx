import React, { useState, useRef } from 'react';
import { ShieldCheck, HardDrive, AlertTriangle, Download, Upload, FileJson, CheckCircle2, Filter } from 'lucide-react';
import { Button, Select, Label } from '../ui/LightUI';
import { useStoragePersist } from '../../hooks/useStoragePersist';
import { ImportReport, ModuleName } from '../../contexts/ConfigContext';
import { useConfig } from '../../contexts/ConfigContext';
import { useAuth } from '../../contexts/AuthContext';
import { format, differenceInDays } from 'date-fns';
import { fr } from 'date-fns/locale';
import { AppConfig, ConfigSchema } from '../../lib/configSchema';
import { importCatalogueProduits } from '../../lib/produitsImportService';

export const SecurityStorageSection = () => {
  const { status, storageInfo, requestPersist } = useStoragePersist();
  const { currentUser } = useAuth();
  
  const { config, exportConfig, importConfig } = useConfig();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [jsonText, setJsonText] = useState('');
  const [showJsonInput, setShowJsonInput] = useState(false);
  const [importStatus, setImportStatus] = useState<{type: 'success' | 'error', message: string, report?: ImportReport} | null>(null);

  const [exportMode, setExportMode] = useState<'global'|'module'>('global');
  const [exportTargetModule, setExportTargetModule] = useState<ModuleName>(null);

  const [importMode, setImportMode] = useState<'global'|'module'>('global');
  const [importTargetModule, setImportTargetModule] = useState<ModuleName>(null);

  const exportedAt = config.exportedAt ? new Date(config.exportedAt) : null;
  const daysSinceExport = exportedAt ? differenceInDays(new Date(), exportedAt) : null;

  const handleExport = () => {
    exportConfig(exportMode, exportTargetModule);
  };

  const processImport = (jsonString: string) => {
    try {
      const parsed = JSON.parse(jsonString);
      
      // -- Cas spécifique pour Catalogue Produits --
      if (
        (importMode === 'module' && importTargetModule === 'produits') || 
        (parsed?.exportMode === 'module' && parsed?.moduleName === 'produits')
      ) {
        const result = importCatalogueProduits(jsonString);
        if (result.success) {
          setImportStatus({ 
            type: 'success', 
            message: result.message,
            report: result.report as any
          });
          setShowJsonInput(false);
          setJsonText('');
        } else {
          setImportStatus({ type: 'error', message: result.message });
        }
        return;
      }
      
      // -- Cas général pour les autres modules --
      const result = importConfig(jsonString, importMode, importTargetModule);
      if (result.success) {
        setImportStatus({ 
          type: 'success', 
          message: result.message || 'Configuration importée avec succès !',
          report: result.report
        });
        setShowJsonInput(false);
        setJsonText('');
      } else {
        setImportStatus({ type: 'error', message: result.message || "Erreur lors de l'import." });
      }
    } catch (err: any) {
      setImportStatus({ type: 'error', message: "JSON invalide ou erreur système." });
    }
  };

  const handleFileImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        processImport(text);
      } catch (err: any) {
        setImportStatus({ type: 'error', message: err.message || 'Fichier JSON invalide' });
      }
    };
    reader.readAsText(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleTextImport = () => {
    try {
      processImport(jsonText);
    } catch (err: any) {
      setImportStatus({ type: 'error', message: err.message || 'JSON invalide' });
    }
  };

  const moduleOptions: {value: keyof AppConfig, label: string}[] = [
    { value: 'restaurant', label: 'Identité' },
    { value: 'employes', label: 'Équipe' },
    { value: 'temperatures', label: 'Températures' },
    { value: 'huiles', label: 'Huiles' },
    { value: 'nettoyage', label: 'Nettoyage' },
    { value: 'produits', label: 'Catalogue' },
    { value: 'inventaire', label: 'Inventaire' },
  ];

  return (
    <div className="space-y-10 max-w-4xl animate-in fade-in slide-in-from-bottom-2 duration-300">
      
      {/* Storage Persist Section */}
      <section>
        <h3 className="text-xl font-black text-gray-800 mb-6 flex items-center gap-2">
          <HardDrive className="text-crousty-purple" />
          Stockage Local & Sécurité iPad
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className={`p-6 rounded-3xl border-2 transition-colors ${status === 'granted' ? 'bg-emerald-50/50 border-emerald-100' : status === 'denied' ? 'bg-orange-50/50 border-orange-200' : 'bg-gray-50 border-gray-200'}`}>
            <div className="flex items-start gap-4">
              <div className={`p-3 rounded-2xl ${status === 'granted' ? 'bg-emerald-100 text-emerald-600' : 'bg-orange-100 text-orange-600'}`}>
                {status === 'granted' ? <ShieldCheck size={28} /> : <AlertTriangle size={28} />}
              </div>
              <div>
                <h4 className={`font-black text-lg ${status === 'granted' ? 'text-emerald-900' : 'text-orange-900'}`}>
                  {status === 'unknown' ? 'Vérification...' : 
                   status === 'granted' ? 'Données sécurisées' :
                   status === 'unsupported' ? 'Non supporté' :
                   "Risque d'effacement"}
                </h4>
                <p className={`text-sm mt-1 font-medium leading-relaxed ${status === 'granted' ? 'text-emerald-800/80' : 'text-orange-800/80'}`}>
                  {status === 'granted' 
                    ? "Safari a accordé le stockage persistant. Vos données ne seront pas effacées automatiquement."
                    : "⚠️ iOS peut nettoyer les données WebView/Safari sans prévenir si l'iPad manque d'espace."}
                </p>
                {status !== 'granted' && status !== 'unsupported' && (
                  <Button onClick={requestPersist} className="mt-4 bg-orange-600 text-white hover:bg-orange-700 h-10 font-bold shadow-sm">
                    Demander la protection
                  </Button>
                )}
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm flex flex-col justify-center">
            <div className="flex justify-between items-center mb-4">
              <span className="font-bold text-gray-700">Espace Base de Données</span>
              <span className="text-lg font-black text-crousty-purple">
                {storageInfo ? `${storageInfo.usedMB} Mo` : 'Calcul...'}
              </span>
            </div>
            
            {storageInfo && (
              <>
                <div className="w-full bg-gray-100 rounded-full h-4 mb-3 overflow-hidden shadow-inner">
                  <div 
                    className={`h-full rounded-full transition-all duration-1000 ${storageInfo.isNearlyFull ? 'bg-red-500' : 'bg-crousty-purple'}`} 
                    style={{ width: `${Math.min(100, Math.max(2, (storageInfo.usedMB / (storageInfo.totalMB || 1)) * 100))}%` }}
                  ></div>
                </div>
                <p className="text-xs text-gray-500 font-medium">
                  Disponibilité estimée : {storageInfo.totalMB > 0 ? `${(storageInfo.totalMB / 1024).toFixed(1)} Go` : 'Inconnue'}
                  {storageInfo.isNearlyFull && <span className="block mt-1 text-red-500 font-bold font-black">Stockage presque plein. Effectuez un archivage.</span>}
                </p>
              </>
            )}
          </div>
        </div>
      </section>

      {/* Export / Import Section - Managers Only */}
      {currentUser?.role === 'manager' && (
        <section className="bg-gray-50 p-6 sm:p-8 rounded-[2.5rem] border border-gray-100">
           <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
              {/* Export */}
            <div>
               <h3 className="text-lg font-black text-gray-800 mb-6 flex items-center gap-2">
                 <Download className="text-crousty-purple" />
                 Sauvegarde (Export)
               </h3>

               {(!exportedAt || (daysSinceExport !== null && daysSinceExport >= 7)) && (
                  <div className="bg-orange-50 border border-orange-200 rounded-2xl p-4 mb-6 flex items-start gap-3 text-orange-800 text-sm font-medium">
                    <AlertTriangle size={18} className="shrink-0 mt-0.5" />
                    <div>Il est recommandé d'exporter vos données régulièrement par sécurité.</div>
                  </div>
               )}

               <div className="space-y-4">
                  <div>
                    <Label className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-1">Périmètre</Label>
                    <Select 
                      value={exportMode} 
                      onChange={(e: any) => setExportMode(e.target.value)}
                      className="h-12 border-white shadow-sm"
                    >
                      <option value="global">Tout l'établissement (Complet)</option>
                      <option value="module">Export ciblé (Catalogue, etc.)</option>
                    </Select>
                  </div>

                  {exportMode === 'module' && (
                    <div className="animate-in fade-in slide-in-from-top-2">
                      <Label className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-1">Module ciblé</Label>
                      <Select 
                        value={exportTargetModule || ''} 
                        onChange={(e: any) => setExportTargetModule(e.target.value as any)}
                        className="h-12 border-white shadow-sm"
                      >
                        <option value="" disabled>Choisir...</option>
                        {moduleOptions.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                      </Select>
                    </div>
                  )}

                  <Button 
                    onClick={handleExport} 
                    disabled={exportMode === 'module' && !exportTargetModule}
                    className="w-full bg-crousty-purple text-white gap-2 h-14 text-base rounded-2xl shadow-sm hover:-translate-y-0.5 transition-transform disabled:opacity-50 mt-4"
                  >
                    <Download size={20} /> Exporter les données
                  </Button>
                  
                  <p className="text-xs text-gray-500 mt-2 font-medium flex items-center gap-2 justify-center">
                    <CheckCircle2 size={14} className={exportedAt ? 'text-green-500' : 'text-gray-300'} />
                    {exportedAt 
                      ? `Dernière sauvegarde : ${format(exportedAt, 'dd MMMM yyyy à HH:mm', { locale: fr })}`
                      : "Aucune sauvegarde effectuée"}
                  </p>
               </div>
            </div>

            {/* Import */}
            <div>
               <h3 className="text-lg font-black text-gray-800 mb-6 flex items-center gap-2">
                 <Upload className="text-gray-500" />
                 Restauration (Import)
               </h3>

               <div className="space-y-4">
                  <div>
                    <Label className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-1">Méthode de fusion</Label>
                    <Select 
                      value={importMode} 
                      onChange={(e: any) => setImportMode(e.target.value)}
                      className="h-12 border-white shadow-sm"
                    >
                      <option value="global">Écraser / Fusion globale</option>
                      <option value="module">Forcer vers un module précis</option>
                    </Select>
                  </div>

                  {importMode === 'module' && (
                    <div className="animate-in fade-in slide-in-from-top-2">
                      <Label className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-1 flex items-center gap-1"><Filter size={12}/> Module de destination</Label>
                      <Select 
                        value={importTargetModule || ''} 
                        onChange={(e: any) => setImportTargetModule(e.target.value as any)}
                        className="h-12 border-white shadow-sm"
                      >
                        <option value="">Auto-détecté par le fichier...</option>
                        {moduleOptions.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                      </Select>
                    </div>
                  )}

                  <div className="flex gap-3 pt-2">
                    <input 
                      type="file" 
                      accept=".json,application/json" 
                      ref={fileInputRef} 
                      onChange={handleFileImport}
                      className="hidden" 
                    />
                    <Button 
                      onClick={() => fileInputRef.current?.click()} 
                      variant="outline" 
                      className="flex-1 h-14 border-2 border-dashed border-gray-300 hover:border-crousty-purple hover:bg-crousty-purple/5 text-gray-700 gap-2 font-bold bg-white rounded-2xl"
                    >
                      <Upload size={18} /> Fichier JSON
                    </Button>
                    <Button 
                      onClick={() => setShowJsonInput(!showJsonInput)} 
                      variant="outline" 
                      className="flex-1 h-14 border-2 border-gray-200 hover:bg-gray-50 text-gray-700 gap-2 font-bold bg-white rounded-2xl"
                    >
                      <FileJson size={18} /> Coller Texte
                    </Button>
                  </div>

                  {showJsonInput && (
                    <div className="bg-white border text-left border-gray-200 rounded-2xl p-4 shadow-sm animate-in slide-in-from-top-2">
                      <textarea 
                        value={jsonText} 
                        onChange={(e) => setJsonText(e.target.value)} 
                        placeholder='{"version": "1.1", ...}'
                        className="w-full h-32 p-3 font-mono text-xs border border-gray-200 rounded-xl focus:ring-2 focus:ring-crousty-purple outline-none resize-none bg-gray-50"
                      />
                      <div className="flex gap-2 justify-end mt-3">
                        <Button variant="outline" size="sm" onClick={() => setShowJsonInput(false)}>Annuler</Button>
                        <Button size="sm" onClick={handleTextImport} className="bg-gray-800 text-white">Importer</Button>
                      </div>
                    </div>
                  )}

                  {importStatus && (
                    <div className={`p-5 rounded-2xl border font-medium text-sm flex flex-col gap-3 animate-in fade-in ${
                      importStatus.type === 'success' ? 'bg-emerald-50 border-emerald-200' : 'bg-red-50 border-red-200'
                    }`}>
                      <div className={`flex items-start gap-3 ${importStatus.type === 'success' ? 'text-emerald-800' : 'text-red-800'}`}>
                        {importStatus.type === 'success' ? <CheckCircle2 size={20} className="shrink-0 mt-0.5" /> : <AlertTriangle size={20} className="shrink-0 mt-0.5" />}
                        <p className="font-bold">{importStatus.message}</p>
                      </div>
                      
                      {importStatus.report && (importStatus.report.imported > 0 || importStatus.report.ignored > 0) && (
                        <div className="bg-white/60 p-4 rounded-xl text-emerald-900 border border-emerald-100/50 mt-1">
                          <h5 className="font-bold mb-2 uppercase text-xs tracking-wider opacity-80">Rapport d'import</h5>
                          <ul className="space-y-1 text-xs">
                            <li className="flex justify-between"><span>Lignes importées :</span> <strong>{importStatus.report.imported}</strong></li>
                            <li className="flex justify-between"><span>Ignorées :</span> <strong>{importStatus.report.ignored}</strong></li>
                            {importStatus.report.duplicates > 0 && (
                              <li className="flex justify-between text-orange-700 mt-1 pt-1 border-t border-emerald-100/50">
                                <span>Doublons interceptés :</span> <strong>{importStatus.report.duplicates}</strong>
                              </li>
                            )}
                          </ul>
                        </div>
                      )}
                    </div>
                  )}
               </div>
            </div>
         </div>
      </section>
      )}
    </div>
  );
};
