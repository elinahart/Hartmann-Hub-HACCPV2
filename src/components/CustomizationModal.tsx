import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Store, Thermometer, Droplets, Sparkles, BookOpen, Users, UploadCloud, Shield, Box, Printer, Smartphone, Settings, Flame, CheckCircle2 } from 'lucide-react';
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

  return createPortal(
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[300] flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl w-full max-w-7xl h-[90dvh] flex flex-col overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-300">
        <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-white shrink-0">
          <h2 className="text-xl font-black text-gray-800 flex items-center gap-3">
            <Settings className="text-gray-400" size={24} /> 
            Configuration Restaurant
          </h2>
          <button onClick={onClose} className="p-2 bg-gray-100 hover:bg-gray-200 rounded-full text-gray-500 transition-colors">
            <X size={24} />
          </button>
        </div>

        <div className="flex flex-1 overflow-hidden">
          {/* Sidebar Tabs */}
          <div className="w-64 bg-gray-50 border-r border-gray-100 p-4 overflow-y-auto shrink-0 flex flex-col gap-2">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-3 px-4 py-3 rounded-2xl w-full text-left font-bold transition-all ${
                  activeTab === tab.id 
                    ? 'bg-white text-crousty-purple shadow-sm border border-gray-100' 
                    : 'text-gray-500 hover:bg-gray-100'
                }`}
              >
                {tab.icon} {tab.label}
              </button>
            ))}
          </div>

          {/* Content Area */}
          <div className="flex-1 p-8 overflow-y-auto bg-white">
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
              <div className="space-y-12">
                <div>
                  <h3 className="text-2xl font-black text-gray-800 mb-6 pb-2 border-b border-gray-100">Contrôle d'accès</h3>
                  <SecuriteTab onCloseModal={onClose} />
                </div>
                <div>
                   <SecurityStorageSection />
                </div>
              </div>
            )}
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
