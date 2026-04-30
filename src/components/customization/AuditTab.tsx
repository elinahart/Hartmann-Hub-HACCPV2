import React, { useState, useEffect } from 'react';
import { getAuditEvents, AuditEvent, clearAuditEvents, deleteAuditEvents } from '../../lib/audit';
import { StatusBadge } from '../ui/StatusBadge';
import { FileEdit, Shield, ArrowRight, History, Trash2, Check, X } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { useAuth } from '../../contexts/AuthContext';
import { Button, Input } from '../ui/LightUI';
import { cn } from '../../lib/utils';

export const AuditTab = () => {
  const { currentUser } = useAuth();
  const isManager = currentUser?.role === 'manager';
  const [events, setEvents] = useState<AuditEvent[]>([]);
  const [filterModule, setFilterModule] = useState<string>('all');
  const [filterType, setFilterType] = useState<string>('all');
  const [filterDateStart, setFilterDateStart] = useState<string>('');
  const [filterDateEnd, setFilterDateEnd] = useState<string>('');

  // Selection state
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [showBulkDeleteConfirm, setShowBulkDeleteConfirm] = useState<'selected' | 'all' | null>(null);

  useEffect(() => {
    const loadEvents = () => {
      setEvents(getAuditEvents());
    };
    loadEvents();
    
    window.addEventListener('crousty_audit_updated', loadEvents);
    return () => window.removeEventListener('crousty_audit_updated', loadEvents);
  }, []);

  const filteredEvents = events.filter(e => {
    if (filterModule !== 'all' && e.module !== filterModule) return false;
    if (filterType !== 'all' && e.type !== filterType) return false;
    if (filterDateStart || filterDateEnd) {
      const eventDate = new Date(e.timestamp);
      if (filterDateStart) {
        const start = new Date(filterDateStart);
        start.setHours(0, 0, 0, 0);
        if (eventDate < start) return false;
      }
      if (filterDateEnd) {
        const end = new Date(filterDateEnd);
        end.setHours(23, 59, 59, 999);
        if (eventDate > end) return false;
      }
    }
    return true;
  });

  const toggleSelection = (id: string) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(v => v !== id) : [...prev, id]
    );
  };

  const handleSelectAll = () => {
    if (selectedIds.length === filteredEvents.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredEvents.map(e => e.id));
    }
  };

  const handleBulkDelete = () => {
    if (showBulkDeleteConfirm === 'all') {
      clearAuditEvents();
    } else if (showBulkDeleteConfirm === 'selected') {
      deleteAuditEvents(selectedIds);
    }
    setSelectedIds([]);
    setShowBulkDeleteConfirm(null);
    setIsSelectionMode(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-black text-gray-800">Journal d'Audit Global</h2>
            <p className="text-gray-500 text-sm">Historique de toutes les actions et modifications</p>
          </div>
          <div className="flex gap-4">
            <select 
              value={filterModule}
              onChange={(e) => setFilterModule(e.target.value)}
              className="border border-gray-200 rounded-lg px-4 py-2 text-sm font-bold text-gray-600 bg-white"
            >
              <option value="all">Tous les modules</option>
              <option value="reception">Réceptions</option>
              <option value="tracabilite">Traçabilité</option>
              <option value="temperature">Températures</option>
              <option value="mobile">Sessions Mobiles</option>
            </select>
            <select 
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="border border-gray-200 rounded-lg px-4 py-2 text-sm font-bold text-gray-600 bg-white"
            >
              <option value="all">Toutes les actions</option>
              <option value="create">Création</option>
              <option value="update">Modification</option>
              <option value="delete">Suppression</option>
              <option value="sync">Synchronisation</option>
            </select>
          </div>
        </div>
        <div className="flex items-center justify-end gap-2">
          <Input 
            type="date"
            value={filterDateStart}
            onChange={(e: any) => setFilterDateStart(e.target.value)}
            className="w-auto h-10 py-1 text-sm bg-white"
          />
          <span className="text-gray-400 font-bold px-1">à</span>
          <Input 
            type="date"
            value={filterDateEnd}
            onChange={(e: any) => setFilterDateEnd(e.target.value)}
            className="w-auto h-10 py-1 text-sm bg-white"
          />
        </div>
      </div>

      {isManager && events.length > 0 && (
        <div className="bg-amber-50 border border-amber-100 p-4 rounded-3xl space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-amber-900 font-bold text-[10px] uppercase tracking-widest">
              <Shield size={14} className="text-amber-500" />
              Actions de masse
            </div>
            <div className="flex gap-2">
              <Button 
                onClick={() => {
                  setIsSelectionMode(!isSelectionMode);
                  if (isSelectionMode) setSelectedIds([]);
                }}
                className={cn(
                  "h-7 px-3 rounded-xl text-[9px] font-black uppercase tracking-widest",
                  isSelectionMode ? "bg-amber-200 text-amber-900" : "bg-white text-gray-500 border border-gray-200"
                )}
              >
                {isSelectionMode ? 'Terminer' : 'Sélectionner'}
              </Button>
              <Button 
                onClick={() => setShowBulkDeleteConfirm('all')}
                className="h-7 px-3 bg-red-100 text-red-600 rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-red-500 hover:text-white transition-colors"
                variant="ghost"
              >
                Tout effacer
              </Button>
            </div>
          </div>

          {isSelectionMode && (
            <div className="flex items-center justify-between p-2 bg-white rounded-xl border border-amber-200 animate-in zoom-in-95 duration-200">
              <div className="flex items-center gap-2">
                <button 
                  onClick={handleSelectAll}
                  className="w-5 h-5 rounded border-2 border-amber-400 flex items-center justify-center transition-colors"
                >
                  {selectedIds.length === filteredEvents.length && filteredEvents.length > 0 && <Check size={14} className="text-amber-500 font-black" />}
                </button>
                <span className="text-[10px] font-black text-amber-900 uppercase">{selectedIds.length} sélectionné(s)</span>
              </div>
              <Button 
                disabled={selectedIds.length === 0}
                onClick={() => setShowBulkDeleteConfirm('selected')}
                className="h-7 px-4 bg-red-500 text-white rounded-xl text-[9px] font-black uppercase tracking-widest"
              >
                Supprimer sélection
              </Button>
            </div>
          )}
        </div>
      )}

      {showBulkDeleteConfirm && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[1000] flex items-center justify-center p-4">
          <div className="bg-white rounded-[2rem] p-8 max-w-sm w-full shadow-2xl space-y-6 animate-in zoom-in-95 duration-300">
            <div className="text-center space-y-2">
              <h3 className="text-xl font-black text-gray-900 leading-tight">Attention</h3>
              <p className="text-sm text-gray-500 font-medium">
                {showBulkDeleteConfirm === 'all' 
                  ? "Voulez-vous vraiment effacer TOUT l'historique d'audit ?"
                  : `Voulez-vous vraiment supprimer les ${selectedIds.length} événements sélectionnés ?`}
              </p>
            </div>
            <div className="flex gap-2">
              <Button onClick={() => setShowBulkDeleteConfirm(null)} variant="ghost" className="flex-1 font-black text-[10px] uppercase">Annuler</Button>
              <Button onClick={handleBulkDelete} className="flex-1 bg-red-500 font-black text-[10px] uppercase text-white">Confirmer</Button>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white border text-sm border-gray-100 rounded-2xl overflow-hidden shadow-sm">
        {filteredEvents.length === 0 ? (
          <div className="p-12 text-center text-gray-400 font-bold flex flex-col items-center">
            <History size={48} className="mb-4 text-gray-200" />
            Aucun événement d'audit trouvé
          </div>
        ) : (
          <table className="w-full text-left">
            <thead className="bg-gray-50 text-gray-500 font-bold text-xs uppercase">
              <tr>
                {isSelectionMode && <th className="px-6 py-4 w-10"></th>}
                <th className="px-6 py-4">Date / Heure</th>
                <th className="px-6 py-4">Action</th>
                <th className="px-6 py-4">Utilisateur</th>
                <th className="px-6 py-4">Détails</th>
                <th className="px-6 py-4 text-right">Statut</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filteredEvents.map((evt) => (
                <tr 
                  key={evt.id} 
                  className={cn(
                    "hover:bg-gray-50 cursor-pointer transition-colors",
                    selectedIds.includes(evt.id) && "bg-amber-50/50"
                  )}
                  onClick={() => isSelectionMode && toggleSelection(evt.id)}
                >
                  {isSelectionMode && (
                    <td className="px-6 py-4">
                      <div className={cn(
                        "w-5 h-5 rounded-lg border-2 shrink-0 flex items-center justify-center transition-colors",
                        selectedIds.includes(evt.id) ? "bg-amber-500 border-amber-500" : "border-gray-200 bg-white"
                      )}>
                        {selectedIds.includes(evt.id) && <Check size={12} className="text-white" />}
                      </div>
                    </td>
                  )}
                  <td className="px-6 py-4 whitespace-nowrap text-gray-600">
                    <div className="font-bold">{format(new Date(evt.timestamp), 'dd MMM yyyy', { locale: fr })}</div>
                    <div className="text-xs text-gray-400">{format(new Date(evt.timestamp), 'HH:mm:ss')}</div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="font-bold flex items-center gap-2">
                       {evt.type === 'delete' && <div className="w-2 h-2 rounded-full bg-red-400"/>}
                       {evt.type === 'create' && <div className="w-2 h-2 rounded-full bg-green-400"/>}
                       {evt.type === 'update' && <div className="w-2 h-2 rounded-full bg-blue-400"/>}
                       {evt.type === 'sync' && <div className="w-2 h-2 rounded-full bg-purple-400"/>}
                       {evt.action}
                    </div>
                    <div className="text-xs text-gray-500 uppercase font-bold tracking-wider mt-1">{evt.module}</div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="font-bold text-gray-800">{evt.userName}</div>
                    <div className="text-xs text-gray-400">{evt.source === 'hub' ? 'Hartmann Hub' : 'Hartmann Mobile'}</div>
                  </td>
                  <td className="px-6 py-4 text-gray-500 text-xs font-mono">
                    <div className="max-w-[200px] truncate" title={evt.details ? JSON.stringify(evt.details) : '-'}>
                      {evt.details ? JSON.stringify(evt.details) : '-'}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <StatusBadge status={evt.type === 'delete' ? 'done' : evt.status === 'success' ? 'done' : evt.status === 'warning' ? 'pending' : 'error'} label={evt.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

