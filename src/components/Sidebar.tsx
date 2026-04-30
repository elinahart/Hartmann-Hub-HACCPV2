import React, { useState, useRef, useEffect } from 'react';
import { ChefHat, Package, Thermometer, Flame, Sparkles, Tag, Droplet, ClipboardList, Archive, LogOut, Settings, ChevronLeft, ChevronRight, Home, X, Smartphone, QrCode, Brain } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useConfig } from '../contexts/ConfigContext';
import { getInitials, getCouleurProfil } from '../lib/utils';
import { UserAvatar } from './UserAvatar';
import { renderAvatarIcon } from './AvatarCustomizerModal';
import { RestaurantLogo } from './ui/RestaurantLogo';
import { useI18n } from '../lib/i18n';
import { APP_NAME } from '../constants';

interface SidebarProps {
  currentView: string;
  setCurrentView: (view: string) => void;
  setShowSettings: (show: boolean) => void;
  showSettings: boolean;
  isCollapsed: boolean;
  setIsCollapsed: (collapsed: boolean) => void;
  isMobileOpen?: boolean;
  setIsMobileOpen?: (open: boolean) => void;
}

export const Sidebar = ({ currentView, setCurrentView, setShowSettings, showSettings, isCollapsed, setIsCollapsed, isMobileOpen, setIsMobileOpen }: SidebarProps) => {
  const { currentUser, logout } = useAuth();
  const { config } = useConfig();
  const { t } = useI18n();

  const [showBottomFade, setShowBottomFade] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const checkScroll = () => {
    if (scrollRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = scrollRef.current;
      setShowBottomFade(scrollHeight > clientHeight && Math.ceil(scrollTop + clientHeight) < scrollHeight);
    }
  };

  useEffect(() => {
    checkScroll();
    window.addEventListener('resize', checkScroll);
    return () => window.removeEventListener('resize', checkScroll);
  }, [config.modules, currentView]);

  const navItems = [
    { id: 'dashboard', label: t('nav_dashboard'), icon: Home },
    ...(config.modules?.reception !== false ? [{ id: 'receptions', label: t('nav_receptions'), icon: Package }] : []),
    ...(config.modules?.traceabilite !== false ? [{ id: 'tracabilite', label: t('nav_tracabilite'), icon: QrCode }] : []),
    ...(config.modules?.temperatures !== false ? [{ id: 'temperatures', label: t('nav_temperatures'), icon: Thermometer }] : []),
    ...(config.modules?.cuisson !== false ? [{ id: 'viandes', label: t('nav_viandes'), icon: Flame }] : []),
    ...(config.modules?.nettoyage !== false ? [{ id: 'cleaning', label: t('nav_cleaning'), icon: Sparkles }] : []),
    ...(config.modules?.dlc !== false ? [{ id: 'desserts', label: t('nav_desserts'), icon: Tag }] : []),
    ...(config.modules?.preparations !== false ? [{ id: 'prep', label: t('nav_prep'), icon: ChefHat }] : []),
    ...(config.modules?.huiles !== false ? [{ id: 'oil', label: t('nav_oil'), icon: Droplet }] : []),
    ...(config.modules?.inventaire !== false ? [
      { id: 'inventaire', label: t('nav_inventaire'), icon: ClipboardList },
      ...(currentUser?.role === 'manager' ? [{ id: 'inventaire-intelligent', label: 'A.I. Manager', icon: Brain }] : [])
    ] : []),
    ...(config.modules?.sessions !== false ? [{ id: 'sessions-mobiles', label: t('nav_mobile_sessions'), icon: Smartphone }] : []),
    ...(currentUser?.role !== 'Invité' ? [{ id: 'products', label: t('nav_products'), icon: Archive }] : []),
  ];

  return (
    <>
      {/* Mobile Backdrop */}
      {isMobileOpen && (
        <div 
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[150] md:hidden"
          onClick={() => setIsMobileOpen?.(false)}
        />
      )}

      <div className={`fixed top-0 left-0 bg-white border-r border-gray-100 flex flex-col h-full z-[200] transition-all duration-[280ms] ${isCollapsed ? 'md:w-[64px]' : 'md:w-[250px]'} transform 
        ${isMobileOpen ? 'translate-x-0' : '-translate-x-full'} 
        md:translate-x-0 md:flex shrink-0 shadow-[4px_0_24px_rgba(0,0,0,0.02)] w-72`}
        style={{ transitionTimingFunction: 'cubic-bezier(0.4, 0, 0.2, 1)' }}>
        
        <div className={`p-4 border-b border-gray-100 flex items-center ${isCollapsed ? 'md:justify-center' : 'justify-between'} h-[60px] overflow-hidden`}>
          <div className="flex items-center gap-2 overflow-hidden">
            <RestaurantLogo 
              size="sm" 
              showText={!isCollapsed || isMobileOpen} 
            />
          </div>
          <button className="md:hidden text-gray-400 shrink-0" onClick={() => setIsMobileOpen?.(false)}>
            <X size={24} />
          </button>
        </div>
        
        <div className="relative flex-1 overflow-hidden flex flex-col">
          <div 
            ref={scrollRef}
            onScroll={checkScroll}
            className="flex-1 overflow-y-auto py-6 px-4 space-y-2 no-scrollbar"
          >
            {navItems.map(item => {
              const Icon = item.icon;
              const isActive = currentView === item.id;
              const shownOnMobile = !isCollapsed || isMobileOpen;
              return (
                <button
                  key={item.id}
                  onClick={() => setCurrentView(item.id)}
                  title={isCollapsed && !isMobileOpen ? item.label : undefined}
                  className={`w-full flex items-center gap-3 py-3 rounded-xl font-bold transition-all ${
                    isCollapsed && !isMobileOpen ? 'md:justify-center px-0' : 'px-4'
                  } ${
                    isActive 
                      ? 'bg-[var(--color-primary)] text-white shadow-md sidebar-item-active' 
                      : 'text-gray-500 hover:bg-gray-50 hover:text-gray-800'
                  }`}
                >
                  <Icon size={20} strokeWidth={isActive ? 2.5 : 2} className="shrink-0" />
                  {shownOnMobile && <span className="whitespace-nowrap overflow-hidden text-ellipsis">{item.label}</span>}
                </button>
              )
            })}
          </div>
          {showBottomFade && (
            <div className="absolute bottom-0 left-0 right-0 h-10 bg-gradient-to-t from-white to-transparent pointer-events-none" />
          )}
        </div>

        <div className={`p-4 border-t border-gray-100 flex flex-col gap-2`}>
          <div className={`flex items-center ${isCollapsed && !isMobileOpen ? 'md:justify-center' : 'gap-3 px-4'} py-2 bg-gray-50 rounded-xl mb-2`}>
            <UserAvatar 
              user={currentUser} 
              className="w-8 h-8 shadow-sm font-bold" 
              iconSize={16} 
            />
            {(!isCollapsed || isMobileOpen) && (
              <div className="flex flex-col overflow-hidden">
                <span className="text-sm font-bold text-gray-800 leading-tight whitespace-nowrap overflow-hidden text-ellipsis">{currentUser?.name}</span>
                <span className="text-xs text-gray-500 font-medium">{currentUser?.role}</span>
              </div>
            )}
          </div>
          
          {currentView === 'dashboard' && (
            <button 
              onClick={() => setShowSettings(!showSettings)}
              title={isCollapsed && !isMobileOpen ? (currentUser?.role === 'manager' ? t('settings_title') : t('nav_profile')) : undefined}
              className={`flex items-center gap-2 py-2 text-sm font-bold text-gray-500 hover:bg-gray-50 rounded-xl transition-colors ${isCollapsed && !isMobileOpen ? 'md:justify-center px-0' : 'px-4'}`}
            >
              <Settings size={16} className="shrink-0" /> {(!isCollapsed || isMobileOpen) && (currentUser?.role === 'manager' ? t('settings_title') : t('nav_profile'))}
            </button>
          )}
          <button 
            onClick={logout}
            title={isCollapsed && !isMobileOpen ? t('nav_logout') : undefined}
            className={`flex items-center gap-2 py-2 text-sm font-bold text-red-500 hover:bg-red-50 rounded-xl transition-colors ${isCollapsed && !isMobileOpen ? 'md:justify-center px-0' : 'px-4'}`}
          >
            <LogOut size={16} className="shrink-0" /> {(!isCollapsed || isMobileOpen) && t('nav_logout')}
          </button>

          <button 
            onClick={() => setIsCollapsed(!isCollapsed)}
            className={`mt-2 hidden md:flex items-center justify-center py-2 text-gray-400 hover:text-gray-600 hover:bg-gray-50 rounded-xl transition-colors`}
          >
            {isCollapsed ? <ChevronRight size={20} /> : <ChevronLeft size={20} />}
          </button>
          
          {(!isCollapsed || isMobileOpen) && (
            <div className="mt-2 text-center">
              <span className="text-[10px] font-black text-gray-300 uppercase tracking-[0.3em]">{APP_NAME}</span>
            </div>
          )}
        </div>
      </div>
    </>
  );
};
