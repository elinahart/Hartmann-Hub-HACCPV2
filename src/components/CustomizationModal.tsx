import React, { useState, useEffect } from 'react';
import { useI18n } from '../lib/i18n';
import { createPortal } from 'react-dom';
import { X, Store, Thermometer, Droplets, Sparkles, BookOpen, Users, UploadCloud, Shield, Box, Printer, Smartphone, Settings, Flame, CheckCircle2, ChevronLeft, ChevronRight } from 'lucide-react';
import { motion } from 'motion/react';
import { cn } from '../lib/utils';
import { useConfig } from '../contexts/ConfigContext';
import { Button, Input, Label } from './ui/LightUI';

import { TemperaturesTab } from './customization/TemperaturesTab';
import { HuilesTab } from './customization/HuilesTab';
import { NettoyageTab } from './customization/NettoyageTab';
import { ProduitsTab } from './customization/ProduitsTab';
import { EquipeTab } from './customization/EquipeTab';
import { InventaireTab } from './customization/InventaireTab';
import { SecurityStorageSection } from './customization/SecurityStorageSection';
import { SecuriteTab } from './customization/SecuriteTab';
import { IdentiteTab } from './customization/IdentiteTab';
import { ImpressionTab } from './customization/ImpressionTab';
import { AuditTab } from './customization/AuditTab';
import { SessionsTab } from './customization/SessionsTab';
import { CuissonTab } from './customization/CuissonTab';
import { ModulesTab } from './customization/ModulesTab';
import { ReceptionsTab } from './customization/ReceptionsTab';
import { LayoutGrid, Truck } from 'lucide-react';

export const CustomizationModal = ({ onClose, initialTab = 'identite' }: { onClose: () => void, initialTab?: string }) => {
  const { config, updateConfig } = useConfig();
  const [activeTab, setActiveTab] = useState(initialTab);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  useEffect(() => {
    let timeout: ReturnType<typeof setTimeout>;
    
    const handleToast = (e: any) => {
      setToastMessage(e.detail || '✓ Modification appliquée');
      clearTimeout(timeout);
      timeout = setTimeout(() => {
        setToastMessage(null);
      }, 2000);
    };

    window.addEventListener('crousty_toast', handleToast);
    return () => {
      window.removeEventListener('crousty_toast', handleToast);
      clearTimeout(timeout);
    };
  }, []);

  const tabs = [
    { id: 'identite', label: 'Identité', icon: <Store size={18} /> },
    { id: 'modules', label: 'Modules', icon: <LayoutGrid size={18} /> },
    { id: 'receptions', label: 'Réceptions', icon: <Truck size={18} /> },
    { id: 'temperatures', label: 'Zones Températures', icon: <Thermometer size={18} /> },
    { id: 'cuisson', label: 'Cuisson Alimentaire', icon: <Flame size={18} /> },
    { id: 'huiles', label: 'Cuves d\'Huile', icon: <Droplets size={18} /> },
    { id: 'nettoyage', label: 'Plan de Nettoyage', icon: <Sparkles size={18} /> },
    { id: 'produits', label: 'Catalogue Produits', icon: <BookOpen size={18} /> },
    { id: 'inventaire', label: 'Inventaire', icon: <Box size={18} /> },
    { id: 'equipe', label: 'Équipe', icon: <Users size={18} /> },
    { id: 'sessions', label: 'Session mobile', icon: <Smartphone size={18} /> },
    { id: 'impression', label: 'Impression', icon: <Printer size={18} /> },
    { id: 'securite_stockage', label: 'Sécurité & Stockage', icon: <Shield size={18} /> },
    { id: 'audit', label: 'Journal d\'Audit', icon: <BookOpen size={18} /> },
  ];

  const [showMobileMenu, setShowMobileMenu] = useState(true);

  useEffect(() => {
    // If we change tab on mobile, show the content and hide menu
    if (activeTab) {
      setShowMobileMenu(false);
    }
  }, [activeTab]);

  return createPortal(
    <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-md z-[300] flex items-center justify-center sm:p-4">
      <div className="bg-white sm:rounded-[3rem] w-full max-w-7xl h-full sm:h-[90dvh] flex flex-col overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-300">
        <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between bg-white shrink-0">
          <div className="flex items-center gap-3">
            {!showMobileMenu && (
              <button 
                onClick={() => setShowMobileMenu(true)}
                className="md:hidden p-2 -ml-2 bg-gray-50 text-gray-500 rounded-full"
              >
                <ChevronLeft size={20} />
              </button>
            )}
            <h2 className="text-xl font-black text-gray-900 tracking-tight flex items-center gap-2">
              <Settings className="text-[var(--color-primary)]" size={20} /> 
              {showMobileMenu ? 'Paramètres' : tabs.find(t => t.id === activeTab)?.label}
            </h2>
          </div>
          <button onClick={onClose} className="w-10 h-10 flex items-center justify-center bg-gray-50 hover:bg-gray-100 rounded-full text-gray-400 transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="flex flex-1 overflow-hidden relative">
          {/* Sidebar / Menu List */}
          <div className={`
            absolute inset-0 z-10 bg-gray-50 md:relative md:translate-x-0 md:w-72 md:flex border-r border-gray-100 overflow-y-auto transition-transform duration-300
            ${showMobileMenu ? 'translate-x-0' : '-translate-x-full'}
          `}>
            <div className="p-4 w-full space-y-1.5">
              {tabs.map(tab => (
                <button
                  key={tab.id}
                  onClick={() => {
                    setActiveTab(tab.id);
                    setShowMobileMenu(false);
                  }}
                  className={`flex items-center justify-between px-4 py-4 rounded-[1.25rem] w-full text-left font-black transition-all group ${
                    activeTab === tab.id 
                      ? 'bg-[var(--color-primary)] text-white shadow-lg shadow-[var(--color-primary)]/20 shadow-md translate-x-1' 
                      : 'bg-white md:bg-transparent text-gray-500 hover:bg-white hover:text-gray-900 border border-gray-100/50 md:border-transparent'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={cn("p-2 rounded-xl transition-colors", activeTab === tab.id ? "bg-white/20" : "bg-gray-100 group-hover:bg-white")}>
                      {React.cloneElement(tab.icon as React.ReactElement, { size: 18 })}
                    </div>
                    <span className="text-sm tracking-tight">{tab.label}</span>
                  </div>
                  <ChevronRight size={16} className={cn("transition-opacity", activeTab === tab.id ? "opacity-100" : "opacity-0 md:group-hover:opacity-100")} />
                </button>
              ))}
            </div>
          </div>

          {/* Content Area */}
          <div className={`
            flex-1 overflow-y-auto bg-white p-6 sm:p-10 scroll-smooth
            ${!showMobileMenu ? 'block' : 'hidden md:block'}
          `}>
             <div className="max-w-4xl mx-auto">
                <div className="mb-8 hidden md:block">
                  <h3 className="text-3xl font-black text-gray-900 tracking-tighter mb-2">
                    {tabs.find(t => t.id === activeTab)?.label}
                  </h3>
                  <div className="h-1.5 w-12 bg-[var(--color-primary)] rounded-full" />
                </div>

                <motion.div
                  key={activeTab}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2 }}
                >
                  {activeTab === 'identite' && <IdentiteTab />}
                  {activeTab === 'modules' && <ModulesTab />}
                  {activeTab === 'receptions' && <ReceptionsTab />}
                  {activeTab === 'temperatures' && <TemperaturesTab />}
                  {activeTab === 'cuisson' && <CuissonTab />}
                  {activeTab === 'huiles' && <HuilesTab />}
                  {activeTab === 'nettoyage' && <NettoyageTab />}
                  {activeTab === 'produits' && <ProduitsTab />}
                  {activeTab === 'inventaire' && <InventaireTab />}
                  {activeTab === 'equipe' && <EquipeTab />}
                  {activeTab === 'sessions' && <SessionsTab />}
                  {activeTab === 'impression' && <ImpressionTab />}
                  {activeTab === 'audit' && <AuditTab />}
                  {activeTab === 'securite_stockage' && (
                    <div className="space-y-16">
                      <div className="bg-gray-50 rounded-[2.5rem] p-8 border border-gray-100">
                        <h3 className="text-2xl font-black text-gray-900 mb-6">Contrôle d'accès</h3>
                        <SecuriteTab onCloseModal={onClose} />
                      </div>
                      <SecurityStorageSection />
                    </div>
                  )}
                </motion.div>
             </div>
          </div>
        </div>
      </div>
      
      {toastMessage && (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-[400] bg-[var(--color-primary)] text-white px-6 py-3 rounded-full font-bold shadow-lg shadow-[var(--color-primary)]/30 animate-in fade-in slide-in-from-bottom-4 duration-300 pointer-events-none">
          {toastMessage}
        </div>
      )}
    </div>,
    document.body
  );
};
