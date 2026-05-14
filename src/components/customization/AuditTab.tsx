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
  const [selectedEvent, setSelectedEvent] = useState<AuditEvent | null>(null);

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
                  onClick={() => {
                    if (isSelectionMode) {
                      toggleSelection(evt.id);
                    } else {
                      setSelectedEvent(evt);
                    }
                  }}
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
                  <td className="px-6 py-4 text-xs">
                    <div className="max-w-xs space-y-1 line-clamp-2 overflow-hidden text-ellipsis h-[34px]">
                      {evt.details ? (
                        typeof evt.details === 'object' ? (
                          Object.entries(evt.details).map(([k, v]) => {
                            if (v === null || v === undefined) return null;
                            const displayVal = typeof v === 'object' ? JSON.stringify(v) : String(v);
                            // skip ugly properties
                            if (k === 'id' || k === 'sid' || k === 'photoId' || k === 'session') return null;
                            if (displayVal === '' || displayVal === '[]' || displayVal === '{}') return null;
                            return (
                              <span key={k} className="inline-flex gap-1 items-center mr-2">
                                <span className="font-bold text-gray-400 capitalize">{k.replace(/_/g, ' ')}:</span>
                                <span className="text-gray-600 truncate max-w-[100px]">{displayVal}</span>
                              </span>
                            );
                          })
                        ) : (
                          <div className="text-gray-600 truncate">{String(evt.details)}</div>
                        )
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
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

      {selectedEvent && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[1000] flex items-center justify-center p-4">
          <div className="bg-white rounded-[2rem] p-8 max-w-2xl w-full shadow-2xl max-h-[85vh] flex flex-col animate-in zoom-in-95 duration-300">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-black text-gray-900 leading-tight flex items-center gap-2">
                <FileEdit size={24} className="text-crousty-purple" />
                Détails de l'action
              </h3>
              <button onClick={() => setSelectedEvent(null)} className="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-500 hover:text-gray-900">
                <X size={20} />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto min-h-0 space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mb-1">Date</div>
                  <div className="font-bold text-gray-900">{format(new Date(selectedEvent.timestamp), 'dd MMM yyyy HH:mm:ss', { locale: fr })}</div>
                </div>
                <div>
                  <div className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mb-1">Utilisateur</div>
                  <div className="font-bold text-gray-900">{selectedEvent.userName}</div>
                  <div className="text-xs text-gray-400">{selectedEvent.source === 'hub' ? 'Hartmann Hub' : 'Hartmann Mobile'}</div>
                </div>
                <div>
                  <div className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mb-1">Action</div>
                  <div className="font-bold text-gray-900">{selectedEvent.action}</div>
                </div>
                <div>
                  <div className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mb-1">Module</div>
                  <div className="font-bold text-gray-900 uppercase">{selectedEvent.module}</div>
                </div>
              </div>

              <div>
                <div className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mb-2">Données brutes</div>
                <div className="bg-gray-900 text-gray-100 p-4 rounded-2xl font-mono text-xs overflow-x-auto whitespace-pre-wrap break-all shadow-inner border border-gray-800">
                  {selectedEvent.details ? JSON.stringify(selectedEvent.details, null, 2) : 'Aucun détail'}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

