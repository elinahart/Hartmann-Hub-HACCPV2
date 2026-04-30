import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Card, Input, Label, Button } from '../components/ui/LightUI';
import { CleaningEntry } from '../types';
import { getStoredData, setStoredData } from '../lib/db';
import { CheckSquare, Square, Clock, Trash2, History, Check, X, Wind, Droplets, Sparkles, Box, Shirt, CookingPot, Utensils, AlertTriangle, Edit2, Plus, Calendar, CalendarDays, CalendarRange, Moon, Zap, Repeat } from 'lucide-react';
import { createSignature } from '../lib/permissions';
import { SaisieActions } from '../components/SaisieActions';
import { SignatureSaisie } from '../types';
import { useConfig } from '../contexts/ConfigContext';
import { useManagerUI } from '../contexts/ManagerUIContext';

const getIcon = (iconName: string) => {
  switch(iconName) {
    case 'Utensils': return <Utensils size={18} />;
    case 'CookingPot': return <CookingPot size={18} />;
    case 'Box': return <Box size={18} />;
    case 'Sparkles': return <Sparkles size={18} />;
    case 'Droplets': return <Droplets size={18} />;
    case 'Wind': return <Wind size={18} />;
    case 'Trash2': return <Trash2 size={18} />;
    default: return <Sparkles size={18} />;
  }
};

const FREQUENCE_STYLES: Record<string, { badge: { bg: string, text: string, border: string }, cardBorder: string, icon: any, label: string }> = {
  'QUOTIDIEN': {
    badge: { bg: '#EEF2FF', text: '#4338CA', border: '#C7D2FE' },
    cardBorder: '#C7D2FE',
    icon: Repeat,
    label: 'Quotidien'
  },
  'HEBDOMADAIRE': {
    badge: { bg: '#F0FDF4', text: '#16A34A', border: '#BBF7D0' },
    cardBorder: '#BBF7D0',
    icon: CalendarDays,
    label: 'Hebdomadaire'
  },
  'APRÈS SERVICE': {
    badge: { bg: '#FFF7ED', text: '#EA580C', border: '#FED7AA' },
    cardBorder: '#FED7AA',
    icon: Moon,
    label: 'Après service'
  },
  'APRÈS UTILISATION': {
    badge: { bg: '#FEF3C7', text: '#B45309', border: '#FDE68A' },
    cardBorder: '#FDE68A',
    icon: Zap,
    label: 'Après utilisation'
  },
  'MENSUEL': {
    badge: { bg: '#FDF4FF', text: '#9333EA', border: '#E9D5FF' },
    cardBorder: '#E9D5FF',
    icon: CalendarRange,
    label: 'Mensuel'
  },
  'TRIMESTRIEL': {
    badge: { bg: '#FFF1F2', text: '#BE123C', border: '#FECDD3' },
    cardBorder: '#FECDD3',
    icon: Calendar,
    label: 'Trimestriel'
  },
};

import { useNettoyage } from '../providers/NettoyageProvider';

export default function CleaningPlan() {
  const { currentUser } = useAuth();
  const { config, updateConfig } = useConfig();
  const { taches: configTasks, setTaches } = useNettoyage();
  const { openModal, closeModal } = useManagerUI();

  // Mapping from context to task objects with visual properties
  const tasks = configTasks.map(t => ({
    id: t.id,
    name: t.nom,
    freq: t.frequence,
    desc: t.instructions || `Fréquence: ${t.frequence}`,
    icon: 'Sparkles',
    color: 'bg-stone-100 text-stone-600'
  }));

  const EditTaskModal = ({ task, onClose, onSave, onDelete }: any) => {
    const [nom, setNom] = useState(task?.name || '');
    const [frequence, setFrequence] = useState(task?.freq || 'QUOTIDIEN');

    const handleSave = () => {
      onSave({
        id: task?.id || Date.now().toString(),
        nom,
        frequence
      });
    };

    return (
      <div className="flex flex-col h-full bg-white rounded-t-[2rem]">
        <div className="p-6 border-b border-gray-100 flex items-center justify-between sticky top-0 bg-white/80 backdrop-blur-md z-10">
          <h2 className="text-xl font-black text-gray-800">{task ? `Modifier ${task.name}` : 'Nouvelle tâche'}</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-500">
            <X size={24} />
          </button>
        </div>
        
        <div className="p-6 space-y-6 flex-1 overflow-y-auto">
          <div className="space-y-4">
            <div>
              <Label className="text-sm font-bold text-gray-700">Nom de la tâche</Label>
              <Input value={nom} onChange={e => setNom(e.target.value)} placeholder="Ex: Sols et siphons" className="mt-1" />
            </div>
            <div>
              <Label className="text-sm font-bold text-gray-700">Fréquence</Label>
               <select 
                  value={frequence} 
                  onChange={e => setFrequence(e.target.value)}
                  className="mt-1 w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-crousty-purple focus:border-crousty-purple transition-all"
                >
                  <option value="QUOTIDIEN">Quotidien</option>
                  <option value="HEBDOMADAIRE">Hebdomadaire</option>
                  <option value="MENSUEL">Mensuel</option>
                  <option value="TRIMESTRIEL">Trimestriel</option>
                  <option value="APRÈS SERVICE">Après service</option>
                  <option value="APRÈS UTILISATION">Après utilisation</option>
                </select>
            </div>
          </div>
        </div>
        
        <div className="p-6 border-t border-gray-100 bg-gray-50 flex items-center justify-between sticky bottom-0 z-10">
          {task && onDelete ? (
             <Button variant="outline" className="text-red-500 border-red-200 hover:bg-red-50 px-4" onClick={() => onDelete(task.id)}>
               <Trash2 size={20} />
             </Button>
          ) : <div/>}
          <div className="flex gap-3">
            <Button variant="secondary" onClick={onClose} className="px-6 rounded-2xl">Annuler</Button>
            <Button onClick={handleSave} className="bg-crousty-purple hover:bg-crousty-purple/90 px-8 rounded-2xl">
              Enregistrer
            </Button>
          </div>
        </div>
      </div>
    );
  };

  const [entries, setEntries] = useState<CleaningEntry[]>([]);
  const [checkedTasks, setCheckedTasks] = useState<Record<string, boolean>>({});
    const [showHistory, setShowHistory] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [activeFilter, setActiveFilter] = useState<string>('Tous');
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    setEntries(getStoredData<CleaningEntry[]>('crousty_cleaning', []));
    const timer = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  const currentHour = currentTime.getHours();
  const isAvailable = currentHour >= 17;

  let timeMessage = '';
  if (!isAvailable) {
    const hoursRemaining = 17 - currentHour - 1;
    const minsRemaining = 60 - currentTime.getMinutes();
    timeMessage = `Dans ${hoursRemaining}h${minsRemaining < 10 ? '0' : ''}${minsRemaining}`;
  }

  const handleSave = () => {
    const mobileWorker = localStorage.getItem('crousty_mobile_worker');
    const uName = currentUser?.name || mobileWorker;
    if (!uName) { setError("Erreur: Aucun utilisateur connecté."); return; }
    if (!isAvailable) { setError("Le plan de nettoyage n'est pas encore disponible."); return; }
    const newEntry: CleaningEntry = {
      id: Date.now().toString(), 
      date: new Date().toISOString(), 
      daily: { ...checkedTasks }, 
      weekly: {}, 
      responsable: uName,
      signature: createSignature(currentUser || null)
    };
    const updated = [newEntry, ...entries];
    setEntries(updated);
    setStoredData('crousty_cleaning', updated);
    setCheckedTasks({});  setError('');
  };

  const handleDelete = (id: string) => {
    const updated = entries.map(e => e.id === id ? { ...e, supprime: true } : e);
    setEntries(updated);
    setStoredData('crousty_cleaning', updated);
    setDeleteId(null);
  };

  const toggleTask = (task: string) => {
    setCheckedTasks(prev => ({ ...prev, [task]: !prev[task] }));
  };

  const filteredTasks = tasks.filter(t => {
    if (activeFilter === 'Tous') return true;
    return t.freq.toUpperCase() === activeFilter.toUpperCase();
  });

  return (
    <div className="space-y-6 pb-20 pt-8 max-w-4xl mx-auto px-4">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-black text-gray-800 uppercase tracking-widest">📋 Nettoyage</h2>
        <button 
          onClick={() => setShowHistory(!showHistory)}
          className={`p-2 rounded-full transition-colors ${showHistory ? 'bg-crousty-pink text-crousty-dark' : 'bg-gray-100 text-gray-400'}`}
        >
          <History size={20} />
        </button>
      </div>

      {/* Cleaning Header Block */}
      <div className={`p-4 rounded-3xl border-2 shadow-sm mb-6 ${isAvailable ? 'bg-green-50 border-green-200' : 'bg-gray-50 border-gray-200'}`}>
        <div className="flex justify-between items-start mb-2">
          <h3 className="flex items-center gap-2 font-black text-lg text-gray-800"><Wind className="text-gray-500" /> NETTOYAGE DU SOIR</h3>
        </div>
        {!isAvailable ? (
          <div>
            <div className="flex items-center gap-2 text-gray-600 font-bold text-sm mb-1">
               Disponible à partir de 17h00
            </div>
            <div className="flex items-center gap-2 text-orange-500 font-bold text-sm">
               <Clock size={16} /> ⏳ {timeMessage}
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-2 text-green-700 font-bold text-sm">
             <Check size={16} /> Disponible — Plan de nettoyage ouvert
          </div>
        )}
      </div>

      {showHistory ? (
        <div className="space-y-4">
          <h3 className="text-lg font-bold text-gray-500 uppercase">Historique</h3>
          {entries.filter(e => !e.supprime).length === 0 ? (
            <div className="text-center py-8 text-gray-400 font-medium">Aucun historique.</div>
          ) : (
            entries.filter(e => !e.supprime).map(e => (
              <Card key={e.id} className="relative">
                {deleteId === e.id ? (
                  <div className="absolute inset-0 bg-red-50/95 backdrop-blur-sm z-30 flex flex-col items-center justify-center p-4 animate-in fade-in duration-200">
                    <p className="text-red-700 font-black text-sm mb-3 text-center px-4 leading-tight">
                      {e.responsable !== currentUser?.name && currentUser?.role === 'manager' 
                        ? `Supprimer la saisie de ${e.responsable} ?`
                        : "Supprimer cette saisie ?"}
                    </p>
                    <div className="flex gap-2 w-full max-w-[200px]">
                      <button 
                        onClick={() => setDeleteId(null)} 
                        className="flex-1 h-10 bg-white text-gray-500 rounded-xl font-bold border border-gray-200 shadow-sm active:scale-95 transition-transform"
                      >
                        Non
                      </button>
                      <button 
                        onClick={() => handleDelete(e.id)} 
                        className="flex-1 h-10 bg-red-500 text-white rounded-xl font-bold shadow-md shadow-red-200 active:scale-95 transition-transform"
                      >
                        Oui
                      </button>
                    </div>
                  </div>
                ) : (
                   <div className="absolute top-2 right-2 z-10">
                      <SaisieActions saisie={e} onDelete={() => setDeleteId(e.id)} />
                   </div>
                )}
                <div className="text-sm font-bold text-gray-800">{new Date(e.date).toLocaleString('fr-FR')}</div>
                <div className="text-xs text-gray-500 mt-1">Par : {e.responsable || 'Inconnu'}</div>
                <div className="mt-2 flex flex-wrap gap-1">
                  {Object.entries(e.daily).filter(([_, v]) => v).map(([k]) => (
                    <span key={k} className="px-2 py-0.5 bg-crousty-pink/20 text-crousty-dark text-[10px] font-bold rounded-full">
                      {k}
                    </span>
                  ))}
                </div>
              </Card>
            ))
          )}
        </div>
      ) : (
        <div className="space-y-6">
          <div className="flex bg-gray-100 p-1 rounded-2xl overflow-x-auto gap-1">
            <button
              onClick={() => setActiveFilter('Tous')}
              className={`px-4 py-2 text-xs font-bold rounded-xl transition-all whitespace-nowrap ${activeFilter === 'Tous' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
            >
              Tous
            </button>
            {Object.entries(FREQUENCE_STYLES).map(([key, style]) => {
              const Icon = style.icon;
              return (
                <button
                  key={key}
                  onClick={() => setActiveFilter(key as any)}
                  className={`px-4 py-2 text-xs font-bold rounded-xl transition-all whitespace-nowrap flex items-center gap-2 ${
                    activeFilter === key 
                      ? 'bg-white shadow-sm' 
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                  style={activeFilter === key ? { color: style.badge.text } : {}}
                >
                  <Icon size={14} />
                  <span>{style.label}</span>
                </button>
              );
            })}
          </div>
          
          <div className="space-y-4">
            <div className={`grid grid-cols-1 md:grid-cols-2 gap-4 ${!isAvailable && currentUser?.role !== 'manager' ? 'opacity-60 pointer-events-none' : ''}`}>
              {filteredTasks.map((t, index) => {
                const style = FREQUENCE_STYLES[t.freq.toUpperCase()] || FREQUENCE_STYLES['QUOTIDIEN'];
                const isChecked = !!checkedTasks[t.name];
                
                return (
                  <div 
                    key={t.id || t.name} 
                    onClick={() => isAvailable && toggleTask(t.name)} 
                    className={`animate-card-in relative group flex items-start gap-4 p-5 rounded-3xl border-2 transition-all duration-300 cursor-pointer shadow-sm ${
                      isChecked ? 'bg-green-50 border-green-500' : 'bg-white border-gray-100 hover:border-gray-200'
                    }`}
                    style={{
                      ...(!isChecked ? { borderColor: style.cardBorder } : {}),
                      animationDelay: `${Math.min(index * 40, 320)}ms`
                    }}
                  >
                    {/* MANAGER EDIT BUTTON */}
                    {currentUser?.role === 'manager' && (
                       <button 
                         onClick={(e) => {
                           e.stopPropagation();
                           openModal(
                             <EditTaskModal 
                               task={t} 
                               onClose={closeModal} 
                               onSave={(updatedTask: any) => {
                                  const newTasks = configTasks.map((task: any) => task.id === updatedTask.id ? updatedTask : task);
                                   setTaches(newTasks);
                                  updateConfig({ nettoyage: newTasks });
                                  closeModal();
                               }} 
                               onDelete={(id: string) => {
                                  if(window.confirm('Supprimer cette tâche ?')) {
                                    const newTasks = configTasks.filter((task: any) => task.id !== id);
                                     setTaches(newTasks);
                                    updateConfig({ nettoyage: newTasks });
                                    closeModal();
                                  }
                               }}
                             />
                           );
                         }}
                         className="absolute -top-3 -right-3 w-12 h-12 bg-white border border-gray-200 rounded-full shadow-lg flex items-center justify-center text-crousty-purple z-50 active:scale-[0.92] transition-transform"
                       >
                         <Edit2 size={20} strokeWidth={2.5} />
                       </button>
                    )}

                    <div className="pt-1">
                      {isChecked ? (
                        <div className="checkbox-check-animated w-6 h-6 rounded-lg bg-green-500 flex items-center justify-center text-white">
                          <Check size={18} strokeWidth={4} />
                        </div>
                      ) : (
                        <div className="w-6 h-6 rounded-lg border-2 border-gray-200" />
                      )}
                    </div>
                    <div className="flex flex-col flex-1">
                      <div className="flex items-center gap-3 mb-1">
                         <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-gray-50" style={{ color: style.badge.text }}>
                           {<style.icon size={22} />}
                         </div>
                         <span className={`font-black text-base transition-all ${isChecked ? 'text-gray-400 line-through' : 'text-gray-800'}`}>
                           {t.name}
                         </span>
                      </div>
                      
                      <div className="flex mt-2">
                        <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-wider"
                          style={{
                            background: style.badge.bg,
                            color: style.badge.text,
                            border: `1px solid ${style.badge.border}`
                          }}
                        >
                          {<style.icon size={12} />}
                          {style.label}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}

              {/* ADD TASK BUTTON */}
              {currentUser?.role === 'manager' && (
                <button 
                  onClick={() => {
                    openModal(
                      <EditTaskModal 
                        onClose={closeModal}
                        onSave={(newTask: any) => {
                          const newTasks = [...configTasks, newTask];
                          setTaches(newTasks);
                          updateConfig({ nettoyage: newTasks });
                          closeModal();
                        }}
                      />
                    )
                  }}
                  className="relative flex flex-col p-4 rounded-3xl border-2 border-dashed border-gray-200 transition-all duration-300 items-center justify-center text-gray-400 hover:text-crousty-purple hover:border-crousty-purple hover:bg-crousty-purple/5 group min-h-[120px]"
                >
                  <div className="w-12 h-12 rounded-full bg-gray-50 flex items-center justify-center group-hover:bg-white group-hover:scale-110 transition-transform shadow-sm mb-2">
                    <Plus size={24} />
                  </div>
                  <span className="font-bold text-xs tracking-widest uppercase">Ajouter Tâche</span>
                </button>
              )}
            </div>

            {error && <div className="text-red-500 text-sm font-bold text-center mt-4">{error}</div>}
            
            <div className="flex justify-center pt-8">
              <Button 
                onClick={handleSave} 
                disabled={!isAvailable} 
                className="w-full sm:w-auto px-12 py-5 rounded-3xl shadow-xl border-none hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2 font-black uppercase tracking-widest text-sm bg-gray-900 hover:bg-black text-white"
              >
                 Valider le Nettoyage <Check size={20} strokeWidth={3} />
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
