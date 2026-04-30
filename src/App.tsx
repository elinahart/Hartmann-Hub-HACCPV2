import { useAuth } from './contexts/AuthContext';
import { LoginScreen } from './components/LoginScreen';
import { ForceChangePinScreen } from './components/ForceChangePinScreen';
import React, { useState, useEffect, useRef } from 'react';
import { Package, ChefHat, Thermometer, Tag, Droplet, Sparkles, ArrowLeft, Settings, Trash2, Home, ClipboardList, Clock, User, ScanBarcode, QrCode, Download, Archive, Flame, X, AlertTriangle, Smartphone } from 'lucide-react';
import Receptions from './modules/Receptions';
import PrepSauces from './modules/PrepSauces';
import TemperaturesChecklist from './modules/TemperaturesChecklist';
import DessertsDLC from './modules/DessertsDLC';
import OilChecklist from './modules/OilChecklist';
import CleaningPlan from './modules/CleaningPlan';
import ProductManager from './modules/ProductManager';
import Viandes from './modules/Viandes';
import Inventaire from './modules/Inventaire';
import InventaireIntelligent from './modules/InventaireIntelligent';
import { MobileSessions } from './modules/MobileSessions';
import { clearAllData, getStoredData } from './lib/db';
import { QRScanner } from './components/QRScanner';
import { ExportModal } from './components/ExportModal';
import { CustomizationModal } from './components/CustomizationModal';
import { startOfDay, isWithinInterval, endOfDay, format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Button } from './components/ui/LightUI';
import { motion, AnimatePresence } from 'motion/react';
import { Sidebar } from './components/Sidebar';
import { RestaurantLogo } from './components/ui/RestaurantLogo';
import { SettingsPanel } from './components/SettingsPanel';
import Tracabilite from './modules/Tracabilite';
import { getInitials } from './lib/utils';
import { useConfig } from './contexts/ConfigContext';

import { ArchiveManager } from './components/ArchiveManager';
import { UserMenu } from './components/UserMenu';
import { ActionPrioritaireList } from './components/PriorityActions';
import { Timeline } from './components/Timeline';

import { MobileCollectionApp } from './components/mobile/MobileCollectionApp';
import { MobileSyncModal } from './components/mobile/MobileSyncModal';
import { usePersistentStorage } from './hooks/usePersistentStorage';
import { ManagerUIProvider } from './contexts/ManagerUIContext';
import { SyncIndicator } from './components/SyncIndicator';

import { useI18n } from './lib/i18n';

type View = 'dashboard' | 'receptions' | 'tracabilite' | 'prep' | 'temperatures' | 'desserts' | 'oil' | 'cleaning' | 'products' | 'viandes' | 'inventaire' | 'inventaire-intelligent' | 'sessions-mobiles';

const Tile = ({ icon: Icon, title, badge, alert, status, statusColor = 'gray', onClick }: { icon: any, title: string, badge?: number, alert?: boolean, status?: React.ReactNode, statusColor?: string, onClick: () => void }) => {
  const getStatusColor = () => {
    switch(statusColor) {
      case 'green': return 'text-green-600 bg-green-50 border-green-100';
      case 'red': return 'text-red-600 bg-red-50 border-red-100';
      case 'orange': return 'text-orange-600 bg-orange-50 border-orange-100';
      case 'purple': return 'text-crousty-purple bg-purple-50 border-purple-100';
      default: return 'text-gray-500 bg-gray-50 border-gray-100';
    }
  };

  return (
    <motion.button 
      whileTap={{ scale: 0.95 }}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      onClick={onClick} 
      className={`bg-white rounded-2xl p-3 sm:p-4 flex flex-col items-center justify-center gap-2 sm:gap-3 relative shadow-[0_4px_20px_rgba(0,0,0,0.04)] border ${alert ? 'border-l-4 border-l-red-500 border-y-gray-100 border-r-gray-100' : 'border-gray-100'} text-center aspect-square`}
    >
      {badge ? (
        <div className={`absolute -top-2 -right-2 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white shadow-md ${alert ? 'bg-red-500' : 'bg-[var(--color-primary)]'}`}>
          {badge}
        </div>
      ) : null}
      <Icon className="text-[var(--color-primary)] w-6 h-6 sm:w-8 sm:h-8" strokeWidth={1.5} />
      <div className="font-black text-gray-800 leading-tight text-sm sm:text-base">{title}</div>
      {status && (
        <div className={`mt-auto text-[9px] sm:text-[10px] md:text-xs font-bold px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-md border w-full max-w-full truncate ${getStatusColor()}`}>
          {status}
        </div>
      )}
    </motion.button>
  );
};

export default function App() {
  const { currentUser, logout } = useAuth();
  const { config } = useConfig();
  const { isPersistent, estimate } = usePersistentStorage();
  const { t, language } = useI18n();
  const [currentView, setCurrentView] = useState<View>('dashboard');

  useEffect(() => {
    let isDisabled = false;
    if (currentView === 'receptions' && config.modules?.reception === false) isDisabled = true;
    if (currentView === 'tracabilite' && config.modules?.traceabilite === false) isDisabled = true;
    if (currentView === 'temperatures' && config.modules?.temperatures === false) isDisabled = true;
    if (currentView === 'viandes' && config.modules?.cuisson === false) isDisabled = true;
    if (currentView === 'cleaning' && config.modules?.nettoyage === false) isDisabled = true;
    if (currentView === 'desserts' && config.modules?.dlc === false) isDisabled = true;
    if (currentView === 'prep' && config.modules?.preparations === false) isDisabled = true;
    if (currentView === 'oil' && config.modules?.huiles === false) isDisabled = true;
    if (currentView === 'inventaire' && config.modules?.inventaire === false) isDisabled = true;
    if (currentView === 'sessions-mobiles' && config.modules?.sessions === false) isDisabled = true;

    if (isDisabled) {
      setCurrentView('dashboard');
    }
  }, [config.modules, currentView]);
  const [showSettings, setShowSettings] = useState(false);
  const [isQRScannerOpen, setIsQRScannerOpen] = useState(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);
  const [isCustomizationModalOpen, setIsCustomizationModalOpen] = useState(false);
  const [customizationInitialTab, setCustomizationInitialTab] = useState<string>('identite');
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isForceCollapsed, setIsForceCollapsed] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [dailyProgress, setDailyProgress] = useState(0);
  const [alerts, setAlerts] = useState({ 
    temps: false, 
    cleaning: false, 
    oil: false, 
    dlcCount: 0,
    eveningShortage: false,
    morningCheck: false,
    expiringTonight: 0,
    totalExpired: 0,
    tempsMorningMissed: false,
    tempsEveningMissed: false,
    oilAlertsData: [] as {cuve: number, val: number, status: 'attention' | 'changer'}[]
  });

  const [kpiData, setKpiData] = useState({ 
    tasksDone: 0, 
    tasksRemaining: 3, 
    lastTemp: '-', 
    lastAction: '-' 
  });
  
  const [mobileModeData, setMobileModeData] = useState<any>(null);
  const [isMobileSyncModalOpen, setIsMobileSyncModalOpen] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const sessionData = params.get('session');
    if (sessionData) {
      try {
        let decodedStr = atob(sessionData);
        try { decodedStr = decodeURIComponent(decodedStr); } catch (e) {}
        const decoded = JSON.parse(decodedStr);
        if (decoded && decoded.t === 'cch-mob') {
           setMobileModeData(decoded);
           localStorage.setItem('crousty_mobile_session', sessionData);
           window.history.replaceState({}, document.title, window.location.pathname);
        }
      } catch (e) {}
    } else {
      const stored = localStorage.getItem('crousty_mobile_session');
      if (stored) {
         try {
           let decodedStr = atob(stored);
           try { decodedStr = decodeURIComponent(decodedStr); } catch (e) {}
           const decoded = JSON.parse(decodedStr);
           if (decoded && decoded.t === 'cch-mob' && decoded.exp > Date.now()) {
              setMobileModeData(decoded);
           } else {
              localStorage.removeItem('crousty_mobile_session');
           }
         } catch (e) {
            localStorage.removeItem('crousty_mobile_session');
         }
      }
    }
  }, []);

  const previousUserRef = useRef(currentUser?.id);

  useEffect(() => {
    if (currentUser?.id && currentUser.id !== previousUserRef.current) {
      setCurrentView('dashboard');
    }
    previousUserRef.current = currentUser?.id;
  }, [currentUser?.id]);

  useEffect(() => {
    const handleOpenCustomizationModal = (e: Event) => {
      const customEvent = e as CustomEvent;
      if (customEvent.detail?.tab) {
        setCustomizationInitialTab(customEvent.detail.tab);
      } else {
        setCustomizationInitialTab('identite');
      }
      setIsCustomizationModalOpen(true);
    };
    window.addEventListener('open-customization-modal', handleOpenCustomizationModal);
    return () => window.removeEventListener('open-customization-modal', handleOpenCustomizationModal);
  }, []);

  const dateToTimeAgo = (dateStr: string | null) => {
    if (!dateStr) return '-';
    const diffMs = new Date().getTime() - new Date(dateStr).getTime();
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 60) return t('time_ago_mins', { mins: diffMins });
    const diffHrs = Math.floor(diffMins / 60);
    if (diffHrs < 24) return t('time_ago_hrs', { hrs: diffHrs });
    return t('time_ago_dayplus');
  };

  const [dashboardStats, setDashboardStats] = useState<any>({});

  const calculateProgress = () => {
    const now = new Date();
    const interval = { start: startOfDay(now), end: endOfDay(now) };
    
    // Check daily tasks
    const temps = getStoredData<any[]>('crousty_temp_checklist', []);
    const cleaning = getStoredData<any[]>('crousty_cleaning', []);
    const oil = getStoredData<any[]>('crousty_oil_checklist', []);
    const dlcs = getStoredData<any[]>('crousty_desserts', []);
    const receptions = getStoredData<any[]>('crousty_receptions', []);
    const traca = getStoredData<any[]>('crousty_traca', []);
    const viandes = getStoredData<any[]>('crousty_viandes', []);
    const preps = getStoredData<any[]>('crousty_prep', []);
    const products = getStoredData<any[]>('crousty_products', []);
    
    // Today stats
    const tempsTodayEntries = temps.filter(t => isWithinInterval(new Date(t.date), interval));
    const cleaningTodayEntries = cleaning.filter(c => isWithinInterval(new Date(c.date), interval));
    const oilTodayEntries = oil.filter(o => isWithinInterval(new Date(o.date), interval));
    const recToday = receptions.filter(r => isWithinInterval(new Date(r.date), interval));
    const tracaToday = traca.filter(t => isWithinInterval(new Date(t.date), interval));
    const viandesToday = viandes.filter(v => isWithinInterval(new Date(v.date), interval));
    const prepToday = preps.filter(p => isWithinInterval(new Date(p.date), interval));
    
    const tempsToday = tempsTodayEntries.length > 0;
    const cleaningToday = cleaningTodayEntries.length > 0;
    const oilToday = oilTodayEntries.length > 0;
    
    // Cleaning details
    let cleaningTasksCount = 0;
    if (cleaningToday && cleaningTodayEntries[0]) {
      cleaningTasksCount = Object.keys(cleaningTodayEntries[0].daily || {}).length;
    }

    // DLC specific checks (expired or < 24h)
    let dlcAlertCount = 0;
    let dlcActive = 0;
    let dlcExpired = 0;
    let expiringTonightCount = 0;
    
    dlcs.forEach(d => {
      const dlcDate = new Date(d.dlcCalc);
      const isPastDlc = dlcDate < now;
      if (isPastDlc) {
        dlcExpired++;
      } else {
        dlcActive++;
        if ((dlcDate.getTime() - now.getTime()) / (1000 * 60 * 60) <= 24) {
          dlcAlertCount++;
        }
        if (dlcDate < endOfDay(now)) {
          expiringTonightCount++;
        }
      }
    });

    const currentHour = now.getHours();
    
    // Check Temps Details
    const tempsMorningDone = tempsTodayEntries.some(t => new Date(t.date).getHours() < 15);
    const tempsEveningDone = tempsTodayEntries.some(t => new Date(t.date).getHours() >= 15);
    
    const tempsMorningMissed = currentHour >= 9 && !tempsMorningDone;
    // 7 PM = 19h
    const tempsEveningMissed = currentHour >= 19 && !tempsEveningDone;
    const tempsAlert = tempsMorningMissed || tempsEveningMissed;

    // Check Cleaning
    // Alert for uncompleted tasks by 11 PM (23h)
    const cleaningAlert = currentHour >= 23 && !cleaningToday;

    // Check Cuisson (Viandes)
    const cuissonToday = viandesToday.length > 0;
    const cuissonAlert = !cuissonToday;

    const isEvening = currentHour >= 18;
    const isMorning = currentHour < 11;

    // Oil Alerts Evaluation
    const configHuiles = getStoredData('config_huiles', { seuilAttention: 20, seuilChangement: 23 });
    const oilTodayEntriesSorted = oilTodayEntries.sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    let oilAlertsStatus: {cuve: number, val: number, status: 'attention' | 'changer'}[] = [];
    if (oilTodayEntriesSorted.length > 0) {
      const latestOil = oilTodayEntriesSorted[0];
      const cuvesStr = latestOil.cuves;
      if (cuvesStr) {
        [1, 2, 3, 4].forEach(num => {
           const valStr = cuvesStr[num as 1|2|3|4]?.testValue;
           const val = parseFloat(valStr);
           if (!isNaN(val)) {
               if (val > configHuiles.seuilChangement) oilAlertsStatus.push({ cuve: num, val: val, status: 'changer' });
               else if (val >= configHuiles.seuilAttention) oilAlertsStatus.push({ cuve: num, val: val, status: 'attention' });
           }
        });
      }
    }

    let doneCount = 0;
    let totalPossible = 0;

    if (config.modules?.temperatures !== false) {
      totalPossible += 2;
      if (tempsMorningDone) doneCount++;
      if (tempsEveningDone) doneCount++;
    }
    if (config.modules?.nettoyage !== false) {
      totalPossible += 1;
      if (cleaningToday) doneCount++;
    }
    if (config.modules?.cuisson !== false) {
      totalPossible += 1;
      if (cuissonToday) doneCount++;
    }
    if (config.modules?.huiles !== false) {
      totalPossible += 1;
      if (oilToday) doneCount++;
    }

    const calculatedScore = totalPossible > 0 ? Math.round((doneCount / totalPossible) * 100) : 0;
    
    // Get last temperature recorded
    const lastTempEntry = temps.length > 0 ? temps[0] : null;
    let lastTempStr = '-';
    if (lastTempEntry && lastTempEntry.equipments) {
      const firstValid = Object.values(lastTempEntry.equipments).find(t => t !== '');
      if (firstValid) lastTempStr = `${firstValid}°C`;
    }

    setDailyProgress(calculatedScore);
    setAlerts({
      temps: config.modules?.temperatures !== false ? tempsAlert : false,
      cleaning: config.modules?.nettoyage !== false ? cleaningAlert : false,
      cuisson: config.modules?.cuisson !== false ? cuissonAlert : false,
      oil: config.modules?.huiles !== false ? !oilToday : false,
      dlcCount: (config.modules?.dlc !== false) ? (dlcAlertCount + dlcExpired) : 0,
      eveningShortage: (config.modules?.dlc !== false) && isEvening && expiringTonightCount > 0,
      morningCheck: (config.modules?.dlc !== false) && isMorning && dlcExpired > 0,
      expiringTonight: (config.modules?.dlc !== false) ? expiringTonightCount : 0,
      totalExpired: (config.modules?.dlc !== false) ? dlcExpired : 0,
      tempsMorningMissed: (config.modules?.temperatures !== false) ? tempsMorningMissed : false,
      tempsEveningMissed: (config.modules?.temperatures !== false) ? tempsEveningMissed : false,
      oilAlertsData: (config.modules?.huiles !== false) ? oilAlertsStatus : []
    });
    setKpiData({
      tasksDone: doneCount,
      tasksRemaining: totalPossible - doneCount,
      lastTemp: lastTempStr,
      lastAction: dateToTimeAgo(temps.length ? temps[0].date : null)
    });
    setDashboardStats({
      receptions: recToday.length,
      traca: tracaToday.length,
      viandes: viandesToday.length,
      preps: prepToday.length,
      products: products.length,
      dlcActive,
      dlcExpired,
      dlcAlertCount,
      tempsToday: tempsTodayEntries.length,
      cleaningTasks: cleaningTasksCount,
      tempsDone: tempsMorningDone && tempsEveningDone,
      cleaningDone: cleaningToday,
      oilDone: oilToday
    });
  };

  useEffect(() => {
    if (currentView === 'dashboard') {
      calculateProgress();
    }
  }, [currentView]);

  if (mobileModeData) {
     return (
       <ManagerUIProvider setForceCollapsedSidebar={() => {}}>
         <MobileCollectionApp session={mobileModeData} onExit={() => {
            localStorage.removeItem('crousty_mobile_session');
            setMobileModeData(null);
         }} />
         <SyncIndicator />
       </ManagerUIProvider>
     );
  }

  if (!currentUser) {
    return <LoginScreen />;
  }

  if (currentUser.mustChangePin) {
    return <ForceChangePinScreen />;
  }

  const handleReset = async () => {
    await clearAllData();
    window.location.reload();
  };

  const getViewTitle = (view: View) => {
    switch(view) {
      case 'receptions': return t('nav_receptions');
      case 'tracabilite': return t('nav_tracabilite');
      case 'prep': return t('nav_prep');
      case 'temperatures': return t('nav_temperatures');
      case 'viandes': return t('nav_viandes');
      case 'oil': return t('nav_oil');
      case 'cleaning': return t('nav_cleaning');
      case 'desserts': return t('nav_desserts');
      case 'products': return t('nav_products');
      case 'inventaire': return t('nav_inventaire');
      case 'inventaire-intelligent': return 'A.I. Manager';
      case 'sessions-mobiles': return t('nav_mobile_sessions');
      default: return '';
    }
  };

  const renderView = () => {
    switch (currentView) {
      case 'receptions': return <Receptions />;
      case 'tracabilite': return <Tracabilite />;
      case 'prep': return <PrepSauces />;
      case 'temperatures': return <TemperaturesChecklist />;
      case 'desserts': return <DessertsDLC />;
      case 'oil': return <OilChecklist />;
      case 'cleaning': return <CleaningPlan />;
      case 'products': return <ProductManager />;
      case 'viandes': return <Viandes />;
      case 'inventaire': return <Inventaire setIsSidebarCollapsed={setIsSidebarCollapsed} />;
      case 'inventaire-intelligent': return <InventaireIntelligent />;
      case 'sessions-mobiles': return <MobileSessions />;
      default: return (
        <div className="p-4 space-y-6 max-w-4xl mx-auto relative w-full pb-20">
          {/* Header */}
          <header className="px-6 py-8 mb-6 bg-white border-b border-gray-100 rounded-b-[2rem] shadow-sm">
            <div className="max-w-5xl mx-auto">
              <div className="flex items-center justify-between gap-6">
                <div className="flex items-center gap-5 min-w-0">
                  <button 
                    onClick={() => setIsMobileMenuOpen(true)}
                    className="md:hidden w-11 h-11 flex items-center justify-center bg-gray-50 border border-gray-100 rounded-xl text-gray-500 shrink-0 shadow-sm"
                  >
                    <div className="flex flex-col gap-1.5">
                       <div className="w-5 h-0.5 bg-current rounded-full"></div>
                       <div className="w-4 h-0.5 bg-current rounded-full"></div>
                       <div className="w-5 h-0.5 bg-current rounded-full"></div>
                    </div>
                  </button>
                  
                  <div className="hidden md:block p-2.5 bg-gray-50 rounded-xl border border-gray-100">
                    <RestaurantLogo size="sm" />
                  </div>

                  <div className="flex flex-col min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                      <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                        {currentUser?.role === 'manager' ? 'Admin / Manager' : 'Équipe Terrain'}
                      </p>
                    </div>
                    <h1 className="text-3xl font-black text-gray-900 tracking-tight truncate leading-none">
                      {new Date().getHours() >= 18 ? t('dashboard_good_evening') : t('dashboard_good_morning')} {currentUser?.name}
                    </h1>
                    <div className="flex items-center gap-2 mt-2">
                       <span className="text-[11px] font-bold text-gray-400">{format(new Date(), 'EEEE d MMMM yyyy', { locale: fr })}</span>
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center gap-4 shrink-0">
                  <div className="p-1 bg-slate-50 rounded-2xl border border-slate-100 flex items-center gap-1">
                    <button 
                      onClick={() => setCurrentView('sessions-mobiles')}
                      className="h-12 px-5 flex items-center justify-center bg-white border border-slate-200 rounded-xl text-slate-900 hover:border-[var(--color-secondary)] hover:text-[var(--color-secondary)] transition-all shadow-sm active:scale-95 gap-3 group"
                      title={t('nav_mobile_sessions')}
                    >
                      <Smartphone size={20} className="group-hover:scale-110 transition-transform" />
                      <span className="font-black text-xs uppercase tracking-widest hidden sm:block">{t('dashboard_mobile_btn')}</span>
                    </button>
                    
                    {currentUser?.role === 'manager' && (
                      <button 
                        onClick={() => setIsExportModalOpen(true)}
                        className="w-12 h-12 flex items-center justify-center bg-white border border-slate-200 rounded-xl text-slate-400 hover:text-[var(--color-primary)] hover:border-[var(--color-primary)] transition-all shadow-sm active:scale-95"
                        title={t('dashboard_download_zip')}
                      >
                        <Download size={20} />
                      </button>
                    )}
                  </div>
                  
                  <div className="h-14 w-[1px] bg-slate-100 mx-2 hidden md:block" />
                  
                  <UserMenu />
                </div>
              </div>
            </div>
          </header>

          {/* Actions Prioritaires Re-vamp */}
          <ActionPrioritaireList currentUser={currentUser} onNavigate={setCurrentView} onUpdateStats={calculateProgress} />

          {/* Timeline d'activité */}
          <Timeline />

          {/* Progress & KPIs combined horizontally for iPad */}
          <div className="flex flex-col md:flex-row gap-4 mb-6">
             <div className="bg-white rounded-3xl p-6 shadow-[0_8px_30px_rgba(0,0,0,0.04)] border border-gray-50 flex items-center gap-6 md:w-1/2">
                <div className="relative w-28 h-28 shrink-0">
                  <svg className="w-full h-full transform -rotate-90 drop-shadow-sm" viewBox="0 0 100 100">
                    <circle cx="50" cy="50" r="40" fill="transparent" stroke="#E2E8F0" strokeWidth="8" />
                    <circle cx="50" cy="50" r="40" fill="transparent" stroke="#c2f000" strokeWidth="8" strokeDasharray="251.2" strokeDashoffset={251.2 - (251.2 * dailyProgress) / 100} strokeLinecap="round" className="transition-all duration-1000 ease-out" />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-2xl font-black text-gray-800 tracking-tighter">{dailyProgress}%</span>
                    <span className="text-[9px] text-gray-400 uppercase font-bold tracking-widest mt-1">{t('dashboard_day_progress')}</span>
                  </div>
                </div>
                <div className="flex flex-col gap-2 flex-1">
                  <div className="bg-green-50 rounded-xl p-3 border border-green-100">
                    <span className="text-[10px] text-green-600 font-bold uppercase block mb-0.5">{t('dashboard_tasks_planned')}</span>
                    <span className="text-lg font-black text-green-700">{kpiData.tasksDone} <span className="text-xs font-medium text-green-600/60">/ 5</span></span>
                  </div>
                  <div className="bg-orange-50 rounded-xl p-3 border border-orange-100">
                    <span className="text-[10px] text-orange-600 font-bold uppercase block mb-0.5">{t('dashboard_tasks_remaining')}</span>
                    <span className="text-lg font-black text-orange-700">{kpiData.tasksRemaining}</span>
                  </div>
                </div>
             </div>

             <div className="bg-white rounded-3xl p-6 shadow-[0_8px_30px_rgba(0,0,0,0.04)] border border-gray-50 flex flex-col justify-between md:w-1/2 gap-4">
               <div>
                  <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">{t('dashboard_last_action')}</h3>
                  <div className="font-black text-xl text-gray-800">{kpiData.lastAction}</div>
               </div>
               <div>
                  <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">{t('dashboard_last_temp')}</h3>
                  <div className="font-black text-xl text-crousty-purple">{kpiData.lastTemp}</div>
               </div>
             </div>
          </div>

          {/* Grid Modules */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 md:gap-4">
            {config.modules?.reception !== false && (
              <Tile 
                icon={Package} 
                title={t('nav_receptions')} 
                status={t('dashboard_lots_count', { count: dashboardStats?.receptions || 0 })} 
                statusColor={dashboardStats?.receptions > 0 ? 'green' : 'gray'}
                onClick={() => setCurrentView('receptions')} 
              />
            )}
            {config.modules?.traceabilite !== false && (
              <Tile 
                icon={QrCode} 
                title={t('nav_tracabilite')} 
                status={t('dashboard_openings_count', { count: dashboardStats?.traca || 0 })} 
                statusColor={dashboardStats?.traca > 0 ? 'purple' : 'gray'}
                onClick={() => setCurrentView('tracabilite')} 
              />
            )}
            {config.modules?.temperatures !== false && (
              <Tile 
                icon={Thermometer} 
                title={t('nav_temperatures')} 
                alert={alerts.temps} 
                status={dashboardStats?.tempsDone ? t('status_up_to_date') : t('status_pending')}
                statusColor={dashboardStats?.tempsDone ? 'green' : 'red'}
                onClick={() => setCurrentView('temperatures')} 
              />
            )}
            {config.modules?.cuisson !== false && (
              <Tile 
                icon={Flame} 
                title={t('nav_viandes')} 
                status={t('dashboard_readings_count', { count: dashboardStats?.viandes || 0 })}
                statusColor={dashboardStats?.viandes > 0 ? 'orange' : 'gray'}
                onClick={() => setCurrentView('viandes')} 
              />
            )}
            {config.modules?.nettoyage !== false && (
              <Tile 
                icon={Sparkles} 
                title={t('nav_cleaning')} 
                alert={alerts.cleaning} 
                status={t('dashboard_tasks_count', { count: dashboardStats?.cleaningTasks || 0 })}
                statusColor={dashboardStats?.cleaningTasks > 0 ? 'green' : 'orange'}
                onClick={() => setCurrentView('cleaning')} 
              />
            )}
            {config.modules?.dlc !== false && (
              <Tile 
                icon={Tag} 
                title={t('nav_desserts')} 
                badge={alerts.dlcCount > 0 ? alerts.dlcCount : undefined} 
                alert={alerts.dlcCount > 0} 
                status={`${dashboardStats?.dlcActive || 0} act. / ${dashboardStats?.dlcExpired || 0} exp.`}
                statusColor={alerts.dlcCount > 0 ? 'red' : 'purple'}
                onClick={() => setCurrentView('desserts')} 
              />
            )}
            {config.modules?.preparations !== false && (
              <Tile 
                icon={ChefHat} 
                title={t('nav_prep')} 
                status={t('dashboard_bins_count', { count: dashboardStats?.preps || 0 })}
                statusColor={dashboardStats?.preps > 0 ? 'green' : 'gray'}
                onClick={() => setCurrentView('prep')} 
              />
            )}
            {config.modules?.huiles !== false && (
              <Tile 
                icon={Droplet} 
                title={t('nav_oil')} 
                alert={alerts.oil} 
                status={dashboardStats?.oilDone ? t('status_done') : t('status_to_do')}
                statusColor={dashboardStats?.oilDone ? 'green' : 'orange'}
                onClick={() => setCurrentView('oil')} 
              />
            )}
            {config.modules?.inventaire !== false && (
              <Tile 
                icon={ClipboardList} 
                title={t('nav_inventaire')} 
                status={t('btn_manage')}
                onClick={() => setCurrentView('inventaire')} 
              />
            )}
            <Tile 
              icon={Archive} 
              title={t('nav_products')} 
              status={t('dashboard_products_count', { count: dashboardStats?.products || 0 })}
              onClick={() => setCurrentView('products')} 
            />
          </div>

          {showSettings && <SettingsPanel onClose={() => setShowSettings(false)} />}
          <ExportModal 
            isOpen={isExportModalOpen} 
            onClose={() => setIsExportModalOpen(false)} 
          />
          <ArchiveManager />
          <MobileSyncModal 
            isOpen={isMobileSyncModalOpen} 
            onClose={() => setIsMobileSyncModalOpen(false)} 
          />
        </div>
      );
    }
  };

  return (
    <ManagerUIProvider setForceCollapsedSidebar={setIsForceCollapsed}>
    <div id="app-wrapper" className={`h-[100dvh] overflow-hidden flex bg-slate-50 text-gray-800 font-sans transition-all duration-[280ms] cubic-bezier(0.4, 0, 0.2, 1) ${isSidebarCollapsed || isForceCollapsed ? 'md:pl-[64px]' : 'md:pl-[250px]'}`}>
      {currentUser?.role === 'manager' && (
        <div className="fixed top-0 left-0 right-0 h-[2px] bg-crousty-pink z-[9999] pointer-events-none" style={{ backgroundColor: 'var(--color-primary)' }} />
      )}
      <Sidebar 
          currentView={currentView} 
          setCurrentView={(view) => {
            setCurrentView(view);
            setIsMobileMenuOpen(false);
          }} 
          showSettings={showSettings} 
          setShowSettings={setShowSettings}
          isCollapsed={isSidebarCollapsed || isForceCollapsed}
          setIsCollapsed={setIsSidebarCollapsed}
          isMobileOpen={isMobileMenuOpen}
          setIsMobileOpen={setIsMobileMenuOpen}
       />
      <div className="flex-1 relative flex flex-col min-w-0 h-[100dvh] overflow-y-auto overflow-x-hidden content-scroll-container">
        {isPersistent === false && (
          <div className="bg-red-50 border-b border-red-200 p-3 px-4 flex items-start gap-3">
            <span className="text-xl leading-none">⚠️</span>
            <div className="text-sm font-bold text-red-700 leading-tight mt-0.5">
              {t('warning_ios_storage')}
            </div>
          </div>
        )}
        {estimate && estimate.quota && (estimate.usage || 0) / estimate.quota > 0.8 && (
          <div className="bg-orange-50 border-b border-orange-200 p-3 px-4 flex items-start gap-3">
            <span className="text-xl leading-none">⚠️</span>
            <div className="text-sm font-bold text-orange-700 leading-tight mt-0.5">
              {t('warning_storage_full')}
            </div>
          </div>
        )}
      {currentView !== 'dashboard' && (
        <header className="page-header sticky top-0 z-50">
          <div className="header-left flex items-center gap-2 overflow-hidden min-w-0">
            <button 
              onClick={() => setIsMobileMenuOpen(true)}
              className="md:hidden w-10 h-10 flex items-center justify-center text-gray-600 shrink-0 bg-gray-50 border border-gray-100 rounded-xl"
            >
              <div className="flex flex-col gap-1">
                 <div className="w-5 h-0.5 bg-current rounded-full"></div>
                 <div className="w-4 h-0.5 bg-current rounded-full"></div>
                 <div className="w-5 h-0.5 bg-current rounded-full"></div>
              </div>
            </button>
            <span className="font-black text-gray-800 uppercase tracking-widest text-lg truncate">{getViewTitle(currentView)}</span>
            {currentUser?.role === 'manager' && (
               <span className="badge-manager hidden sm:inline-flex">{t('role_manager')}</span>
            )}
          </div>
          <div className="header-actions">
            {currentUser?.role === 'manager' && (
               <span className="badge-manager sm:hidden">{t('role_manager')}</span>
            )}
            <UserMenu />
          </div>
        </header>
      )}
      
      <main className="main-content w-full mx-auto p-4 pt-safe relative">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentView}
            initial={{ opacity: 0, x: 16 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -16 }}
            transition={{ 
              duration: 0.22, 
              ease: [0.25, 0.46, 0.45, 0.94] 
            }}
            className="w-full"
            style={{ 
              willChange: 'transform, opacity',
              backfaceVisibility: 'hidden',
              WebkitBackfaceVisibility: 'hidden'
            }}
          >
            {renderView()}
          </motion.div>
        </AnimatePresence>
      </main>
      
      {isCustomizationModalOpen && (
        <CustomizationModal initialTab={customizationInitialTab} onClose={() => setIsCustomizationModalOpen(false)} />
      )}
      <SyncIndicator />
    </div>
    </div>
    </ManagerUIProvider>
  );
}
