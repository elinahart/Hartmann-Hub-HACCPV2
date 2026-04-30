import React, { createContext, useContext, useEffect, useState } from 'react';
import { AppConfig, ConfigSchema, DEFAULT_CONFIG, DEFAULT_CLEANING_TASKS, deepMergeWithDefaults, mergeArrays } from '../lib/configSchema';
import { getStoredData } from '../lib/db';
import { getMergedProducts } from '../lib/croustyConfig';

// Color utilities requested
function lighten(hex: string, amount: number): string {
  try {
    const num = parseInt(hex.replace('#', ''), 16);
    const r = Math.min(255, (num >> 16) + Math.round(255 * amount));
    const g = Math.min(255, ((num >> 8) & 0xff) + Math.round(255 * amount));
    const b = Math.min(255, (num & 0xff) + Math.round(255 * amount));
    return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`;
  } catch(e) { return hex; }
}

function darken(hex: string, amount: number): string {
  try {
    const num = parseInt(hex.replace('#', ''), 16);
    const r = Math.max(0, (num >> 16) - Math.round(255 * amount));
    const g = Math.max(0, ((num >> 8) & 0xff) - Math.round(255 * amount));
    const b = Math.max(0, (num & 0xff) - Math.round(255 * amount));
    return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`;
  } catch(e) { return hex; }
}

function alpha(hex: string, opacity: number): string {
  try {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${opacity})`;
  } catch(e) { return `rgba(0,0,0,${opacity})`; }
}

export interface ImportReport {
  imported: number;
  ignored: number;
  duplicates: number;
  conflicts: string[];
}

export type ExportMode = 'global' | 'module';
export type ModuleName = keyof AppConfig | null;

export interface ConfigExportData {
  version: string;
  exportMode: ExportMode;
  moduleName?: ModuleName;
  exportedAt: string;
  data: Partial<AppConfig>;
}

export interface ImportResult {
  success: boolean;
  message?: string;
  report?: ImportReport;
}

interface ConfigContextProps {
  config: AppConfig;
  updateConfig: (newConfig: Partial<AppConfig>) => void;
  importConfig: (jsonString: string, mode?: 'global' | 'module', targetModule?: ModuleName) => ImportResult;
  exportConfig: (mode?: 'global' | 'module', targetModule?: ModuleName) => void;
}

const ConfigContext = createContext<ConfigContextProps | undefined>(undefined);

function normalizeString(str: string): string {
  return str.trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

function detectsDuplicate(existingArr: any[], newItem: any): boolean {
  if (!newItem) return false;
  const nameOf = (item: any) => item?.nom || item?.name || '';
  const newName = normalizeString(nameOf(newItem));
  if (!newName) return false;
  return existingArr.some(existing => normalizeString(nameOf(existing)) === newName);
}

export const ConfigProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [config, setConfig] = useState<AppConfig>(DEFAULT_CONFIG);

  useEffect(() => {
    // Load on mount
    const saved = localStorage.getItem('crousty-config');
    let initialConfig = DEFAULT_CONFIG;

    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        initialConfig = deepMergeWithDefaults(parsed);
      } catch (e) {
        console.error("Failed to parse saved config", e);
      }
    }

    // SYNC: If produits or nettoyage are empty in the main config, 
    // try to fill them from the legacy keys used by modules
    if (initialConfig.produits.length === 0) {
      const legacyProducts = getMergedProducts();
      if (legacyProducts.length > 0) {
        initialConfig.produits = legacyProducts.map(p => ({
          id: p.id,
          name: p.name,
          category: p.category,
          icone: p.icone,
          iconeCouleur: p.iconeCouleur,
          conservation: p.conservation,
          note: p.note,
          dlcValue: p.dlcValue,
          dlcUnit: p.dlcUnit,
          readOnly: p.readOnly
        })) as any;
      }
    }

    if (initialConfig.nettoyage.length === 0) {
      initialConfig.nettoyage = DEFAULT_CLEANING_TASKS;
    }

    if (initialConfig.huiles.length === 0) {
      initialConfig.huiles = DEFAULT_CONFIG.huiles;
    }

    if (initialConfig.temperatures.length === 0) {
      initialConfig.temperatures = DEFAULT_CONFIG.temperatures;
    }

    if (initialConfig.employes.length === 0) {
      initialConfig.employes = DEFAULT_CONFIG.employes;
    }

    setConfig(initialConfig);
    applyTheme(initialConfig);
  }, []);

  const applyTheme = (cfg: AppConfig) => {
    const primary = cfg.restaurant?.couleurPrimaire || '#E91E8C';
    const secondary = cfg.restaurant?.couleurSecondaire || '#7B2FBE';

    const root = document.documentElement;
    root.style.setProperty('--color-primary', primary);
    root.style.setProperty('--color-primary-light', lighten(primary, 0.2));
    root.style.setProperty('--color-primary-dark', darken(primary, 0.15));
    root.style.setProperty('--color-primary-bg', alpha(primary, 0.08));
    
    root.style.setProperty('--color-secondary', secondary);
    root.style.setProperty('--color-secondary-light', lighten(secondary, 0.2));
  };

  const syncWithLocalStorage = (baseConfig: AppConfig): AppConfig => {
    const currentData = { ...baseConfig };
    try {
      const storedEquipe = localStorage.getItem('crousty-equipe-membres');
      if (storedEquipe) currentData.employes = JSON.parse(storedEquipe);
      
      const storedProds = localStorage.getItem('crousty-catalogue-produits');
      if (storedProds) currentData.produits = JSON.parse(storedProds);
      
      const storedTemps = localStorage.getItem('crousty-temperatures-zones');
      if (storedTemps) currentData.temperatures = JSON.parse(storedTemps);
      
      const storedHuiles = localStorage.getItem('crousty-huiles-cuves');
      if (storedHuiles) currentData.huiles = JSON.parse(storedHuiles);
      
      const storedNettoyage = localStorage.getItem('crousty-nettoyage-taches');
      if (storedNettoyage) currentData.nettoyage = JSON.parse(storedNettoyage);

      const storedCuisson = localStorage.getItem('crousty-cuisson-produits');
      if (storedCuisson) currentData.cuisson = JSON.parse(storedCuisson);

      const storedModules = localStorage.getItem('crousty-modules-activation');
      if (storedModules) currentData.modules = JSON.parse(storedModules);

      const storedInventaireProduits = localStorage.getItem('crousty-inventaire-produits');
      const storedInventaireHisto = localStorage.getItem('crousty_inventory');
      if (storedInventaireProduits || storedInventaireHisto) {
        currentData.inventaire = {
          ...currentData.inventaire,
          produits: storedInventaireProduits ? JSON.parse(storedInventaireProduits) : undefined,
          historique: storedInventaireHisto ? JSON.parse(storedInventaireHisto) : undefined
        };
      }
      
      const storedFournisseurs = localStorage.getItem('crousty-reception-fournisseurs');
      if (storedFournisseurs) currentData.fournisseurs = JSON.parse(storedFournisseurs);
    } catch (e) {
      console.warn("Failed to sync latest module data", e);
    }
    return currentData;
  };

  const updateConfig = (newConfig: Partial<AppConfig>) => {
    const merged = deepMergeWithDefaults({ ...config, ...newConfig }, config);
    setConfig(merged);
    try {
      localStorage.setItem('crousty-config', JSON.stringify(merged));
    } catch (e: any) {
      if (e.name === 'QuotaExceededError' || (e.message && e.message.toLowerCase().includes('stockage'))) {
        alert("Attention : l'espace de stockage est presque saturé ! Vos derniers changements de configuration pourraient ne pas être sauvegardés. Veuillez purger d'anciennes données.");
        console.error("Quota Exceeded in ConfigContext updateConfig:", e);
      }
    }
    applyTheme(merged); window.dispatchEvent(new CustomEvent('crousty_toast'));
  };

  const parseImportPayload = (jsonString: string): { data: any, isExportFormat: boolean, moduleName?: ModuleName } => {
    try {
      const payload = JSON.parse(jsonString);
      if (payload.version && payload.exportMode && payload.data) {
        return { 
          data: payload.data, 
          isExportFormat: true, 
          moduleName: (payload.exportMode === 'module' ? payload.moduleName : null) as ModuleName
        };
      }
      return { data: payload, isExportFormat: false };
    } catch (e) {
      throw new Error("JSON invalide");
    }
  };

  const importConfig = (jsonString: string, mode: 'global' | 'module' = 'global', targetModule?: ModuleName): ImportResult => {
    try {
      const { data: parsedData, isExportFormat, moduleName: detectedModule } = parseImportPayload(jsonString);
      const report: ImportReport = { imported: 0, ignored: 0, duplicates: 0, conflicts: [] };

      // Determine the final mode and module
      let finalMode = mode;
      let finalModule = targetModule || detectedModule;

      // Auto-switch to module mode if global import receives a module payload
      if (finalMode === 'global') {
        const keys = Object.keys(parsedData);
        if (keys.length === 1 && (keys[0] as any) in config) {
          finalMode = 'module';
          finalModule = keys[0] as any;
        } else if (Array.isArray(parsedData)) {
          // If it's just an array, assume it's products (most common case for raw list)
          finalMode = 'module';
          finalModule = 'produits';
        }
      }

      const currentConfig = syncWithLocalStorage(config);
      let newConfig = { ...currentConfig };

      if (finalMode === 'global') {
        // Global Merge
        newConfig = deepMergeWithDefaults(parsedData, currentConfig);
        report.imported = Object.keys(parsedData).length;
      } else if (finalModule) {
        const moduleData = (parsedData[finalModule] !== undefined) ? parsedData[finalModule] : parsedData;
        if (!moduleData) return { success: false, message: `Aucune donnée trouvée pour le module "${finalModule}".` };
        
        if (Array.isArray(moduleData)) {
          newConfig[finalModule] = moduleData as any;
          report.imported = moduleData.length;
        } else {
          newConfig[finalModule] = { ...(newConfig[finalModule] as any), ...(moduleData as any) } as any;
          report.imported = 1;
        }
      } else {
        return { success: false, message: "Impossible de déterminer le contenu de l'import." };
      }

      // Final validation and save
      const verifiedConfig = deepMergeWithDefaults(newConfig, DEFAULT_CONFIG);
      setConfig(verifiedConfig);
      try {
        localStorage.setItem('crousty-config', JSON.stringify(verifiedConfig));
      } catch (e: any) {
        if (e.name === 'QuotaExceededError' || e.message?.toLowerCase().includes('stockage')) {
          alert("Espace insuffisant pour importer toutes ces configurations. L'import a été appliqué en mémoire mais risque d'être perdu.");
          console.error("Quota Exceeded inside importConfig:", e);
        }
      }
      applyTheme(verifiedConfig);

      // Sync module-specific storages and dispatch events
      const syncModule = (mod: ModuleName) => {
        if (!mod || !verifiedConfig[mod]) return;
        const data = verifiedConfig[mod];
        const dataStr = JSON.stringify(data);
        
        switch(mod) {
          case 'employes':
            localStorage.setItem('crousty-equipe-membres', dataStr);
            localStorage.setItem('crousty_users', dataStr);
            window.dispatchEvent(new CustomEvent('crousty-equipe-updated'));
            break;
          case 'produits':
            localStorage.setItem('crousty-catalogue-produits', dataStr);
            window.dispatchEvent(new CustomEvent('catalogue-produits-updated', { detail: { products: data } }));
            break;
          case 'temperatures':
            localStorage.setItem('crousty-temperatures-zones', dataStr);
            window.dispatchEvent(new CustomEvent('crousty-temperatures-updated'));
            break;
          case 'huiles':
            localStorage.setItem('crousty-huiles-cuves', dataStr);
            window.dispatchEvent(new CustomEvent('crousty-huiles-updated'));
            break;
          case 'nettoyage':
            localStorage.setItem('crousty-nettoyage-taches', dataStr);
            window.dispatchEvent(new CustomEvent('crousty-nettoyage-updated'));
            break;
          case 'cuisson':
            localStorage.setItem('crousty-cuisson-produits', dataStr);
            window.dispatchEvent(new CustomEvent('crousty-cuisson-updated'));
            break;
          case 'modules':
            localStorage.setItem('crousty-modules-activation', dataStr);
            window.dispatchEvent(new CustomEvent('crousty-modules-updated'));
            break;
          case 'inventaire': {
            const invData = data as any;
            if (invData.produits) {
              localStorage.setItem('crousty-inventaire-produits', JSON.stringify(invData.produits));
              window.dispatchEvent(new CustomEvent('crousty-inventaire-produits-updated'));
            }
            if (invData.historique) {
              localStorage.setItem('crousty_inventory', JSON.stringify(invData.historique));
              window.dispatchEvent(new CustomEvent('crousty-inventaire-historique-updated'));
            }
            break;
          }
        }
      };

      if (finalMode === 'global') {
        (['employes', 'produits', 'temperatures', 'huiles', 'nettoyage', 'cuisson', 'modules', 'inventaire'] as ModuleName[]).forEach(syncModule);
      } else {
        syncModule(finalModule);
      }

      return { 
        success: true, 
        message: finalMode === 'global' ? 'Importation globale terminée.' : `Module ${finalModule} importé avec succès.`,
        report 
      };

    } catch (e: any) {
      console.error("Import error:", e);
      return { success: false, message: e.message || "Échec de l'importation." };
    }
  };

  const exportConfig = (mode: 'global' | 'module' = 'global', targetModule?: ModuleName) => {
    const defaultName = config.restaurant?.nom?.replace(/\s+/g, '-').toLowerCase() || 'restaurant';
    
    let exportPayload: ConfigExportData = {
      version: '1.1',
      exportMode: mode,
      moduleName: targetModule,
      exportedAt: new Date().toISOString(),
      data: {}
    };

    if (mode === 'global') {
      const currentConfig = syncWithLocalStorage(config);
      exportPayload.data = currentConfig;
    } else if (targetModule) {
      const currentConfig = syncWithLocalStorage(config);
      let moduleData = currentConfig[targetModule];
      exportPayload.data = { [targetModule]: moduleData } as Partial<AppConfig>;
    }

    // Also update exportedAt in config
    if (mode === 'global') {
      updateConfig({ exportedAt: exportPayload.exportedAt });
    }

    const blob = new Blob([JSON.stringify(exportPayload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    
    const fileNameSuffix = mode === 'module' && targetModule ? `-${targetModule}` : '';
    link.download = `${defaultName}-config${fileNameSuffix}-${new Date().toISOString().split('T')[0]}.json`;
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <ConfigContext.Provider value={{ config, updateConfig, importConfig, exportConfig }}>
      {children}
    </ConfigContext.Provider>
  );
};

export const useConfig = () => {
  const context = useContext(ConfigContext);
  if (!context) {
    throw new Error('useConfig must be used within a ConfigProvider');
  }
  return context;
};
