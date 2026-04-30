import React, { useState, useEffect } from 'react';
import { UserPlus, Users, Trash2, Edit2, ToggleLeft, ToggleRight, X, AlertTriangle, UserCircle, GripVertical, Eye, Shield, Check } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { Button, Input, Label, Select } from '../ui/LightUI';
import { getInitials, getCouleurProfil, cn } from '../../lib/utils';
import { motion, AnimatePresence, Reorder } from 'motion/react';
import { MembreEquipe } from '../../types';
import { UserAvatar } from '../UserAvatar';

export const EquipeTab = () => {
  const { users, addUser, deleteUser, updateUser, setUsers, currentUser } = useAuth();
  const isManager = currentUser?.role === 'manager';
  
  // Selection state
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [showBulkDeleteConfirm, setShowBulkDeleteConfirm] = useState<'selected' | 'all' | null>(null);

  // New user form
  const [newName, setNewName] = useState('');
  const [newInitials, setNewInitials] = useState('');
  const [newPin, setNewPin] = useState('0000');
  const [newRole, setNewRole] = useState<'manager' | 'equipe'>('equipe');
  const [nameCollision, setNameCollision] = useState(false);

  // Editing user
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [confirmDeleteUserId, setConfirmDeleteUserId] = useState<string | null>(null);

  useEffect(() => {
    if (newName) {
      const initials = getInitials(newName);
      setNewInitials(initials);
      
      const collision = users.some(u => u.initiales === initials && u.id !== editingUserId);
      setNameCollision(collision);
    } else {
      setNewInitials('');
      setNameCollision(false);
    }
  }, [newName, users, editingUserId]);

  const handleAddUser = () => {
    if (!newName || !newPin) return;
    if (newPin.length < 4) {
      alert("Le code PIN doit contenir au moins 4 chiffres.");
      return;
    }
    addUser({ 
      name: newName, 
      initiales: newInitials, 
      role: newRole, 
      actif: true,
      pin: newPin
    });
    setNewName('');
    setNewPin('0000');
    setNewRole('equipe');
    setNewInitials('');
  };

  const handleToggleActif = (u: MembreEquipe) => {
    updateUser({ ...u, actif: !u.actif });
  };

  const handleUpdateMember = (u: MembreEquipe) => {
    updateUser(u);
  };

  const toggleSelection = (id: string) => {
    if (users.find(u => u.id === id)?.name === 'Manager') {
      alert("Le compte Manager principal ne peut pas être sélectionné pour modification/suppression de masse.");
      return;
    }
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(v => v !== id) : [...prev, id]
    );
  };

  const handleSelectAll = () => {
    const selectableUsers = users.filter(u => u.name !== 'Manager');
    if (selectedIds.length === selectableUsers.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(selectableUsers.map(u => u.id));
    }
  };

  const handleBulkDelete = () => {
    if (showBulkDeleteConfirm === 'all') {
      // Keep only original manager
      const manager = users.find(u => u.name === 'Manager');
      setUsers(manager ? [manager] : []);
    } else if (showBulkDeleteConfirm === 'selected') {
      setUsers(users.filter(u => !selectedIds.includes(u.id)));
    }
    setSelectedIds([]);
    setShowBulkDeleteConfirm(null);
    setIsSelectionMode(false);
  };

  return (
    <div className="space-y-10 max-w-2xl pb-20">
      {/* Formulaire d'ajout identique à SettingsPanel */}
      <section>
        <div className="bg-gray-50 p-6 rounded-[2.5rem] border border-gray-100 space-y-4 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-black text-gray-800 flex items-center gap-2 text-sm uppercase tracking-widest">
              <UserPlus size={18} className="text-crousty-pink" /> Nouveau membre
            </h3>
            {newName && (
              <motion.div 
                key="preview"
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="w-12 h-12 rounded-full flex items-center justify-center text-white font-black text-lg shadow-lg"
                style={{ backgroundColor: getCouleurProfil(newName, newRole) }}
              >
                {newInitials}
              </motion.div>
            )}
          </div>
          
          <div className="space-y-4">
            <div>
              <Label className="text-[10px] font-black uppercase text-gray-400">Prénom / Nom</Label>
              <Input 
                value={newName} 
                onChange={(e: any) => setNewName(e.target.value)} 
                placeholder="Ex: Elina Hartmann"
                className="h-12 text-base font-bold"
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-[10px] font-black uppercase text-gray-400">Rôle</Label>
                <Select 
                  value={newRole} 
                  onChange={(e: any) => setNewRole(e.target.value)}
                  className="h-12 font-bold"
                >
                  <option value="equipe">ÉQUIPE</option>
                  <option value="manager">MANAGER</option>
                </Select>
              </div>
              <div>
                <Label className="text-[10px] font-black uppercase text-gray-400">Initiales</Label>
                <div className="relative">
                  <Input 
                    value={newInitials} 
                    onChange={(e: any) => {
                      setNewInitials(e.target.value.toUpperCase().slice(0, 3));
                    }}
                    className={cn("h-12 font-black text-center text-lg", nameCollision && "border-orange-300 bg-orange-50")}
                  />
                  {nameCollision && (
                    <div className="absolute -bottom-5 left-0 right-0 text-[10px] text-orange-600 font-bold flex items-center gap-1">
                      <AlertTriangle size={10} /> Doublon détecté (ex: EH2)
                    </div>
                  )}
                </div>
              </div>
            </div>
            
            <div>
              <Label className="text-[10px] font-black uppercase text-gray-400">Code PIN initial</Label>
              <Input 
                type="number" 
                inputMode="numeric" 
                value={newPin} 
                onChange={(e: any) => setNewPin(e.target.value.slice(0, 6))} 
                placeholder="0000"
                className="h-12 font-black tracking-widest text-lg"
              />
            </div>

            <Button onClick={handleAddUser} disabled={!newName || !newPin || nameCollision} className="h-14 font-black uppercase tracking-widest rounded-2xl w-full bg-crousty-pink hover:bg-crousty-pink/90 text-white shadow-lg shadow-pink-200">
              Créer le profil
            </Button>
          </div>
        </div>
      </section>

      {isManager && users.length > 1 && (
        <div className="bg-amber-50 border border-amber-100 p-4 rounded-3xl space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-amber-900 font-bold text-[10px] uppercase tracking-widest">
              <Shield size={14} className="text-amber-500" />
              Equipe Manager
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
                {isSelectionMode ? 'Quitter' : 'Selectionner'}
              </Button>
              <Button 
                onClick={() => setShowBulkDeleteConfirm('all')}
                className="h-7 px-3 bg-red-100 text-red-600 rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-red-500 hover:text-white transition-colors"
                variant="ghost"
              >
                Vider l'équipe
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
                  {selectedIds.length === users.filter(u => u.name !== 'Manager').length && selectedIds.length > 0 && <Check size={14} className="text-amber-500 font-black" />}
                </button>
                <span className="text-[10px] font-black text-amber-900 uppercase">{selectedIds.length} sélectionné(s)</span>
              </div>
              <Button 
                disabled={selectedIds.length === 0}
                onClick={() => setShowBulkDeleteConfirm('selected')}
                className="h-7 px-4 bg-red-500 text-white rounded-xl text-[9px] font-black uppercase tracking-widest"
              >
                Supprimer selection
              </Button>
            </div>
          )}
        </div>
      )}

      {showBulkDeleteConfirm && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[1000] flex items-center justify-center p-4">
          <div className="bg-white rounded-[2rem] p-8 max-w-sm w-full shadow-2xl space-y-6 animate-in zoom-in-95 duration-300">
            <div className="text-center space-y-2">
              <h3 className="text-xl font-black text-gray-900 leading-tight">Voulez-vous continuer ?</h3>
              <p className="text-sm text-gray-500 font-medium">
                {showBulkDeleteConfirm === 'all' 
                  ? "Cette action supprimera tous les membres sauf le Manager principal."
                  : `Cette action supprimera les ${selectedIds.length} membres sélectionnés.`}
              </p>
            </div>
            <div className="flex gap-2">
              <Button onClick={() => setShowBulkDeleteConfirm(null)} variant="ghost" className="flex-1 font-black text-[10px] uppercase">Annuler</Button>
              <Button onClick={handleBulkDelete} className="flex-1 bg-red-500 font-black text-[10px] uppercase text-white">Oui, supprimer</Button>
            </div>
          </div>
        </div>
      )}

      {/* Liste des membres identique à SettingsPanel */}
      <section className="space-y-4">
        <div className="flex items-center justify-between px-2">
          <h3 className="font-black text-gray-400 uppercase text-[10px] tracking-widest flex items-center gap-2">
            <Users size={16} /> Équipe ({users.length})
          </h3>
          <div className="text-[10px] font-bold text-gray-300">Drag & Drop pour ordonner</div>
        </div>
        
        <Reorder.Group axis="y" values={users} onReorder={setUsers} className="space-y-3">
          {users.map((u) => {
            const isEditing = editingUserId === u.id;
            const isManager = u.role === 'manager';

            return (
              <Reorder.Item 
                key={u.id} 
                value={u}
                dragListener={!isEditing && !isSelectionMode}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <div 
                  onClick={() => isSelectionMode && toggleSelection(u.id)}
                  className={cn(
                    "group relative flex flex-col p-4 bg-white border border-gray-100 rounded-3xl shadow-sm transition-all cursor-pointer",
                    !u.actif && "opacity-50 grayscale",
                    isEditing && "ring-2 ring-crousty-pink border-transparent bg-gray-50/30",
                    selectedIds.includes(u.id) && "border-amber-400 bg-amber-50/20 shadow-lg"
                  )}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      {isSelectionMode && u.name !== 'Manager' && (
                        <div className={cn(
                          "w-5 h-5 rounded-lg border-2 shrink-0 flex items-center justify-center transition-colors",
                          selectedIds.includes(u.id) ? "bg-amber-500 border-amber-500" : "border-gray-200 bg-white"
                        )}>
                          {selectedIds.includes(u.id) && <Check size={12} className="text-white" />}
                        </div>
                      )}
                      {!isSelectionMode && (
                        <GripVertical className="text-gray-200 cursor-grab active:cursor-grabbing group-hover:text-gray-400" size={20} />
                      )}
                      
                      <UserAvatar 
                        user={u} 
                        className="w-12 h-12 text-lg shadow-md" 
                        iconSize={24} 
                      />
                      
                      <div className="flex-1 min-w-0">
                        <div className="font-black text-gray-800 text-lg truncate leading-tight">{u.name}</div>
                        <div className="flex items-center gap-2 mt-1">
                          <span className={cn("text-[9px] font-black px-1.5 py-0.5 rounded uppercase tracking-widest", isManager ? "bg-crousty-pink text-white" : "bg-gray-100 text-gray-500")}>
                            {u.role}
                          </span>
                          <span className="text-[10px] font-bold text-gray-400 bg-gray-50 px-2 py-0.5 rounded">PIN: {u.pin || '0000'}</span>
                        </div>
                      </div>
                    </div>

                    {!isSelectionMode && (
                      <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
                        <button 
                          onClick={() => handleToggleActif(u)}
                          className={cn("p-2 transition-colors", u.actif ? "text-green-500" : "text-gray-300")}
                        >
                          {u.actif ? <ToggleRight size={24} /> : <ToggleLeft size={24} />}
                        </button>
                        <button 
                          onClick={() => setEditingUserId(isEditing ? null : u.id)}
                          className={cn("p-2 transition-colors", isEditing ? "text-crousty-purple" : "text-gray-300 hover:text-gray-600")}
                        >
                          {isEditing ? <X size={20} /> : <Eye size={20} />}
                        </button>
                        <button 
                          onClick={() => {
                            if (u.name === 'Manager') {
                              alert("Le compte Manager principal ne peut pas être supprimé.");
                              return;
                            }
                            setConfirmDeleteUserId(u.id);
                          }} 
                          className="p-2 text-gray-200 hover:text-red-500 transition-colors"
                          style={{ minWidth: 44, minHeight: 44 }}
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    )}
                  </div>
                  
                  <AnimatePresence>
                    {isEditing && (
                      <motion.div 
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden"
                        onClick={e => e.stopPropagation()}
                      >
                        <div className="pt-4 mt-4 border-t border-gray-100 grid grid-cols-2 gap-3">
                          <div className="col-span-2">
                            <Label className="text-[9px] font-black uppercase text-gray-400">Photo de profil</Label>
                            <div className="mt-1 flex items-center gap-4">
                              <label className="flex-1 h-10 border border-gray-200 rounded-xl flex items-center justify-center text-xs font-bold text-gray-500 cursor-pointer hover:bg-gray-50 transition-colors">
                                <span className="flex items-center gap-2">
                                  <UserCircle size={16} /> Ajouter une photo
                                </span>
                                <input 
                                  type="file" 
                                  accept="image/*" 
                                  className="hidden" 
                                  onChange={async (e) => {
                                    const file = e.target.files?.[0];
                                    if (file) {
                                      try {
                                        const { compressPhotoTLC } = await import('../../lib/imageUtils');
                                        const base64 = await compressPhotoTLC(file, 150, 0.6);
                                        handleUpdateMember({ ...u, avatarUrl: base64, avatarType: 'photo' });
                                      } catch (err) {
                                        console.error("Erreur compression avatar:", err);
                                      }
                                    }
                                  }}
                                />
                              </label>
                              {u.avatarUrl && (
                                <button 
                                  onClick={() => handleUpdateMember({ ...u, avatarUrl: undefined })}
                                  className="h-10 px-4 flex items-center justify-center rounded-xl bg-red-50 text-red-500 text-xs font-bold hover:bg-red-100 transition-colors"
                                >
                                  Retirer
                                </button>
                              )}
                            </div>
                          </div>
                          <div>
                            <Label className="text-[9px] font-black uppercase text-gray-400">Nouveau PIN</Label>
                            <Input 
                              type="number"
                              inputMode="numeric"
                              value={u.pin}
                              onChange={(e: any) => handleUpdateMember({ ...u, pin: e.target.value.slice(0, 6) })}
                              className="h-10 text-sm font-black"
                            />
                          </div>
                          <div>
                            <Label className="text-[9px] font-black uppercase text-gray-400">Rôle</Label>
                            <Select 
                              value={u.role}
                              onChange={(e: any) => handleUpdateMember({ ...u, role: e.target.value })}
                              className="h-10 text-xs font-bold"
                            >
                              <option value="equipe">ÉQUIPE</option>
                              <option value="manager">MANAGER</option>
                            </Select>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </Reorder.Item>
            );
          })}
        </Reorder.Group>

        {confirmDeleteUserId && (
          <div className="fixed inset-0 z-[500] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white rounded-3xl p-6 max-w-sm w-full shadow-2xl animate-in zoom-in-95 duration-200">
              <div className="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
                <Trash2 size={32} />
              </div>
              <h3 className="text-xl font-black text-gray-800 text-center mb-2">Supprimer le membre ?</h3>
              <p className="text-gray-500 text-center font-medium mb-6">
                Voulez-vous vraiment supprimer le profil de <span className="font-bold text-gray-800">"{users.find(u => u.id === confirmDeleteUserId)?.name}"</span> ?
              </p>
              <div className="flex gap-3">
                <button 
                  onClick={() => setConfirmDeleteUserId(null)}
                  className="flex-1 h-12 bg-gray-100 text-gray-600 rounded-xl font-bold active:scale-95 transition-transform"
                >
                  Annuler
                </button>
                <button 
                  onClick={() => {
                    deleteUser(confirmDeleteUserId);
                    setConfirmDeleteUserId(null);
                  }}
                  className="flex-1 h-12 bg-red-500 text-white rounded-xl font-bold shadow-lg shadow-red-200 active:scale-95 transition-transform"
                >
                  Supprimer
                </button>
              </div>
            </div>
          </div>
        )}
      </section>
    </div>
  );
};


