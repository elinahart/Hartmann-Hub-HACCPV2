import React, { useState, useRef, useEffect } from 'react';
import { ChefHat, Package, Thermometer, Flame, Sparkles, Tag, Droplet, ClipboardList, Archive, LogOut, Settings, ChevronLeft, ChevronRight, Home, X, Smartphone, QrCode, Brain, ShoppingCart } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useConfig } from '../contexts/ConfigContext';
import { getInitials, getCouleurProfil, cn } from '../lib/utils';
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
  alerts?: any;
  dashboardStats?: any;
}

export const Sidebar = ({ currentView, setCurrentView, setShowSettings, showSettings, isCollapsed, setIsCollapsed, isMobileOpen, setIsMobileOpen, alerts, dashboardStats }: SidebarProps) => {
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

  const navGroups = [
    {
      title: t('nav_group_main') || 'Principal',
      items: [
        { id: 'dashboard', label: t('nav_dashboard'), icon: Home },
      ]
    },
    {
      title: t('nav_group_checklists') || 'Checklists terrain',
      items: [
        ...(config.modules?.temperatures !== false ? [{ id: 'temperatures', label: t('nav_temperatures'), icon: Thermometer, badge: alerts?.temps ? '1' : null, badgeColor: 'bg-red-500' }] : []),
        ...(config.modules?.traceabilite !== false ? [{ id: 'tracabilite', label: t('nav_tracabilite'), icon: QrCode }] : []),
        ...(config.modules?.dlc !== false ? [{ id: 'desserts', label: t('nav_desserts'), icon: Tag, badge: alerts?.dlcCount > 0 ? alerts.dlcCount.toString() : null, badgeColor: 'bg-red-500' }] : []),
        ...(config.modules?.nettoyage !== false ? [{ id: 'cleaning', label: t('nav_cleaning'), icon: Sparkles, badge: alerts?.cleaning ? '1' : null, badgeColor: 'bg-orange-500' }] : []),
        ...(config.modules?.huiles !== false ? [{ id: 'oil', label: t('nav_oil'), icon: Droplet, badge: alerts?.oil ? '1' : null, badgeColor: 'bg-orange-500' }] : []),
        ...(config.modules?.cuisson !== false ? [{ id: 'viandes', label: t('nav_viandes'), icon: Flame }] : []),
        ...(config.modules?.preparations !== false ? [{ id: 'prep', label: t('nav_prep'), icon: ChefHat }] : []),
      ]
    },
    {
      title: t('nav_group_inventory') || 'Inventaire & Stocks',
      items: [
        ...(config.modules?.reception !== false ? [{ id: 'receptions', label: t('nav_receptions'), icon: Package }] : []),
        ...(config.modules?.inventaire !== false ? [
          { id: 'inventaire', label: t('nav_inventaire'), icon: ClipboardList },
          ...(currentUser?.role !== 'Invité' ? [{ id: 'inventaire-intelligent', label: t('nav_ai_inventory') || 'IA Inventaire', icon: Brain }] : [])
        ] : []),
        ...(currentUser?.role !== 'Invité' ? [
          { id: 'orders', label: t('nav_orders'), icon: ShoppingCart },
          { id: 'products', label: t('nav_products'), icon: Archive }
        ] : []),
      ]
    },
    {
      title: t('nav_group_tools') || 'Outils',
      items: [
        ...(config.modules?.sessions !== false ? [{ id: 'sessions-mobiles', label: t('nav_mobile_sessions'), icon: Smartphone }] : []),
      ]
    }
  ].filter(g => g.items.length > 0);

  return (
    <>
      {/* Mobile Backdrop */}
      {isMobileOpen && (
        <div 
          className="fixed inset-0 bg-gray-900/40 backdrop-blur-md z-[150] md:hidden animate-in fade-in duration-300"
          onClick={() => setIsMobileOpen?.(false)}
        />
      )}

      <div className={`fixed top-0 left-0 bg-white md:bg-white/80 md:backdrop-blur-xl border-r border-gray-100 flex flex-col h-full z-[200] transition-all duration-[400ms] ${isCollapsed ? 'md:w-[80px]' : 'md:w-[280px]'} transform 
        ${isMobileOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full'} 
        md:translate-x-0 md:flex shrink-0 w-[280px]`}
        style={{ transitionTimingFunction: 'cubic-bezier(0.4, 0, 0.2, 1)' }}>
        
        <div className={`p-6 flex items-center ${isCollapsed ? 'md:justify-center' : 'justify-between'} h-[72px] shrink-0`}>
          <div className="flex items-center gap-3 overflow-hidden">
             <RestaurantLogo 
                size="sm" 
                showText={!isCollapsed || isMobileOpen} 
              />
          </div>
          <button className="md:hidden w-10 h-10 flex items-center justify-center bg-gray-50 rounded-full text-gray-400 shrink-0 hover:bg-gray-100 transition-colors" onClick={() => setIsMobileOpen?.(false)}>
            <X size={20} />
          </button>
        </div>
        
        <div className="relative flex-1 overflow-hidden flex flex-col mt-2">
          <div 
            ref={scrollRef}
            onScroll={checkScroll}
            className="flex-1 overflow-y-auto px-4 space-y-8 no-scrollbar overscroll-contain touch-pan-y pb-12"
          >
            {navGroups.map((group, gIdx) => (
              <div key={group.title} className="space-y-1.5">
                {(!isCollapsed || isMobileOpen) && (
                  <h3 className="px-4 text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-3">
                    {group.title}
                  </h3>
                )}
                {group.items.map(item => {
                  const Icon = item.icon;
                  const isActive = currentView === item.id;
                  const shownOnMobile = !isCollapsed || isMobileOpen;
                  
                  return (
                    <button
                      key={item.id}
                      onClick={() => setCurrentView(item.id)}
                      title={isCollapsed && !isMobileOpen ? item.label : undefined}
                      className={`w-full flex items-center gap-3 py-3 rounded-2xl font-bold transition-all relative isolate select-none touch-manipulation group ${
                        isCollapsed && !isMobileOpen ? 'md:justify-center px-0' : 'px-4'
                      } ${
                        isActive 
                          ? 'bg-[var(--color-primary)] text-white shadow-lg shadow-[var(--color-primary)]/20 z-20 translate-x-1' 
                          : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900 active:scale-[0.98]'
                      }`}
                    >
                      <div className="relative">
                        <Icon size={20} strokeWidth={isActive ? 2.5 : 2} className={cn("shrink-0 transition-transform", !isActive && "group-hover:scale-110")} />
                        {item.badge && (
                          <span className={`absolute -top-1.5 -right-1.5 ${item.badgeColor || 'bg-red-500'} text-white text-[10px] font-black w-4 h-4 flex items-center justify-center rounded-full border-2 border-white pointer-events-none`}>
                            {item.badge}
                          </span>
                        )}
                      </div>
                      {shownOnMobile && <span className="whitespace-nowrap overflow-hidden text-ellipsis flex-1 text-left text-sm tracking-tight">{item.label}</span>}
                    </button>
                  );
                })}
              </div>
            ))}
          </div>
          {showBottomFade && (
            <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-white to-transparent pointer-events-none z-30" />
          )}
        </div>

        <div className="p-4 mt-auto">
          <div className="bg-gray-50/80 backdrop-blur-sm rounded-[2rem] p-3 border border-gray-100/50 space-y-1">
            <div className={`flex items-center ${isCollapsed && !isMobileOpen ? 'md:justify-center' : 'gap-3 px-3'} py-2`}>
              <UserAvatar 
                user={currentUser} 
                className="w-10 h-10 shadow-md font-bold ring-2 ring-white" 
                iconSize={20} 
              />
              {(!isCollapsed || isMobileOpen) && (
                <div className="flex flex-col min-w-0">
                  <span className="text-sm font-black text-gray-900 leading-tight truncate">{currentUser?.name}</span>
                  <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">{currentUser?.role}</span>
                </div>
              )}
            </div>
            
            <div className="pt-2 flex flex-col gap-0.5">
              <button 
                onClick={() => setShowSettings(!showSettings)}
                className={`flex items-center gap-3 py-2.5 text-xs font-black uppercase tracking-wider text-gray-500 hover:bg-white hover:text-gray-900 hover:shadow-sm rounded-xl transition-all ${isCollapsed && !isMobileOpen ? 'md:justify-center px-0' : 'px-4'}`}
              >
                <Settings size={16} className="shrink-0" /> 
                {(!isCollapsed || isMobileOpen) && (currentUser?.role === 'manager' ? t('settings_title') : t('nav_profile'))}
              </button>
              
              <button 
                onClick={logout}
                className={`flex items-center gap-3 py-2.5 text-xs font-black uppercase tracking-wider text-red-500 hover:bg-red-50/50 rounded-xl transition-all ${isCollapsed && !isMobileOpen ? 'md:justify-center px-0' : 'px-4'}`}
              >
                <LogOut size={16} className="shrink-0" /> 
                {(!isCollapsed || isMobileOpen) && t('nav_logout')}
              </button>
            </div>
          </div>

          <div className="mt-4 flex items-center justify-between px-4">
             {(!isCollapsed || isMobileOpen) && (
                <span className="text-[9px] font-black text-gray-300 uppercase tracking-[0.4em]">{APP_NAME}</span>
             )}
             <button 
                onClick={() => setIsCollapsed(!isCollapsed)}
                className={`hidden md:flex items-center justify-center p-2 text-gray-300 hover:text-gray-600 transition-colors`}
              >
                {isCollapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
              </button>
          </div>
        </div>
      </div>
    </>
  );
};
