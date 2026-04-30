import React, { useState, useEffect } from 'react';
import { getAuditEvents, AuditEvent } from '../lib/audit';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Clock, Plus, Edit2, Trash2, Smartphone, Download, AlertTriangle, CheckCircle2, X, ChevronRight } from 'lucide-react';
import { StatusBadge } from './ui/StatusBadge';
import { useManagerUI } from '../contexts/ManagerUIContext';
import { useAuth } from '../contexts/AuthContext';

export const Timeline = () => {
  const [events, setEvents] = useState<AuditEvent[]>([]);
  const { openModal, closeModal } = useManagerUI();
  const { currentUser } = useAuth();

  const allEvents = getAuditEvents();

  useEffect(() => {
    const loadEvents = () => {
      setEvents(getAuditEvents().slice(0, 3));
    };
    loadEvents();
    
    window.addEventListener('crousty_audit_updated', loadEvents);
    return () => window.removeEventListener('crousty_audit_updated', loadEvents);
  }, []);

  const getActionIcon = (type: string) => {
    switch (type) {
      case 'create': return <Plus size={14} className="text-emerald-500" />;
      case 'update': return <Edit2 size={14} className="text-blue-500" />;
      case 'delete': return <Trash2 size={14} className="text-red-500" />;
      case 'sync': return <Download size={14} className="text-purple-500" />;
      case 'error': return <AlertTriangle size={14} className="text-orange-500" />;
      default: return <Clock size={14} className="text-gray-500" />;
    }
  };

  const getModuleColor = (mod: string) => {
    switch (mod) {
      case 'temperature': return 'bg-cyan-50 text-cyan-600 border-cyan-100';
      case 'nettoyage': return 'bg-purple-50 text-purple-600 border-purple-100';
      case 'reception': return 'bg-orange-50 text-orange-600 border-orange-100';
      case 'tracabilite': return 'bg-blue-50 text-blue-600 border-blue-100';
      case 'huiles': return 'bg-amber-50 text-amber-600 border-amber-100';
      case 'inventaire': return 'bg-emerald-50 text-emerald-600 border-emerald-100';
      case 'session':
      case 'mobile': return 'bg-indigo-50 text-indigo-600 border-indigo-100';
      default: return 'bg-gray-50 text-gray-600 border-gray-100';
    }
  };

  const showFullAudit = () => {
    openModal(
      <div className="flex flex-col max-h-[inherit] h-full bg-white">
        <div className="p-6 border-b border-gray-100 flex items-center justify-between shrink-0 bg-white z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-crousty-purple/10 rounded-xl flex items-center justify-center text-crousty-purple">
              <Clock size={24} />
            </div>
            <div>
              <h2 className="text-xl font-black text-gray-800 tracking-tight leading-tight">Journal d'activité complet</h2>
              <p className="text-gray-400 font-bold text-[10px] uppercase tracking-widest">{allEvents.length} événements enregistrés</p>
            </div>
          </div>
          <button 
            onClick={closeModal}
            className="w-10 h-10 hover:bg-gray-100 rounded-xl flex items-center justify-center transition-colors text-gray-400"
          >
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto min-h-0 p-6 bg-gray-50/50 space-y-3">
          {allEvents.map((evt) => (
            <div key={evt.id} className="bg-white border border-gray-100 rounded-2xl p-4 flex items-center justify-between gap-4 shadow-sm">
              <div className="flex items-center gap-4 min-w-0">
                <div className={`w-9 h-9 rounded-lg flex items-center justify-center border shrink-0 ${getModuleColor(evt.module)}`}>
                  {getActionIcon(evt.type)}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                     <span className="font-black text-gray-800 text-sm truncate">{evt.action}</span>
                     <span className={`text-[9px] uppercase font-black px-1.5 py-0.5 rounded-md border shrink-0 ${getModuleColor(evt.module)}`}>
                       {evt.module}
                     </span>
                  </div>
                  <div className="text-gray-400 text-[10px] font-bold uppercase truncate">
                    {evt.userName} • {format(new Date(evt.timestamp), 'eeee d MMMM HH:mm', { locale: fr })}
                  </div>
                </div>
              </div>
              <div className="shrink-0">
                <StatusBadge 
                  status={evt.type === 'delete' ? 'archived' : evt.status === 'success' ? 'done' : evt.status === 'warning' ? 'pending' : 'error'} 
                />
              </div>
            </div>
          ))}
        </div>

        <div className="p-4 bg-white border-t border-gray-100 flex justify-end gap-3">
          <button 
            onClick={closeModal}
            className="w-full bg-gray-800 text-white h-11 rounded-xl font-black active:scale-95 transition-all text-sm"
          >
            Fermer le journal
          </button>
        </div>
      </div>,
      'max-w-[560px]'
    );
  };

  // Only manager sees recent activity button
  if (currentUser?.role !== 'manager') return null;

  return (
    <div 
      onClick={showFullAudit} 
      className="bg-white rounded-3xl p-6 shadow-[0_8px_30px_rgba(0,0,0,0.04)] border border-gray-50 mb-6 flex items-center justify-between cursor-pointer active:scale-[0.98] transition-all hover:border-crousty-purple/30 group"
    >
       <div className="flex items-center gap-4">
         <div className="w-12 h-12 bg-crousty-purple/10 rounded-2xl flex items-center justify-center text-crousty-purple group-hover:bg-crousty-purple group-hover:text-white transition-colors">
           <Clock size={24} />
         </div>
         <div>
           <h3 className="text-lg font-black text-gray-800 leading-none mb-1">Journal d'activité</h3>
           <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">{allEvents.length} événements dans les dernières 24h</p>
         </div>
       </div>
       <div className="w-10 h-10 rounded-2xl bg-gray-50 flex items-center justify-center text-gray-400 group-hover:bg-crousty-purple/10 group-hover:text-crousty-purple transition-colors">
         <ChevronRight size={20} />
       </div>
    </div>
  );
};
