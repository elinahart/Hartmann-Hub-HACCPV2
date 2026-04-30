import React, { createContext, useContext, useState, useEffect } from 'react';
import { getStoredData, setStoredData } from '../lib/db';
import { MembreEquipe } from '../types';

interface AuthContextType {
  currentUser: MembreEquipe | null;
  users: MembreEquipe[];
  login: (userId: string, pin: string) => boolean;
  logout: () => void;
  addUser: (user: Omit<MembreEquipe, 'id' | 'dateCreation' | 'ordre'>) => void;
  deleteUser: (id: string) => void;
  updateUserPin: (id: string, newPin: string) => void;
  updateUser: (user: MembreEquipe) => void;
  setUsers: (users: MembreEquipe[]) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const INITIAL_TEAM: Omit<MembreEquipe, 'id' | 'dateCreation' | 'ordre'>[] = [
  { name: 'Manager', initiales: 'M', role: 'manager', actif: true, pin: '0000' }
];

const STORAGE_KEY = 'crousty-equipe-membres';
const LEGACY_KEY = 'crousty_users';

const safeSaveUsers = (key: string, data: MembreEquipe[]) => {
  try {
    setStoredData(key, data);
    return data;
  } catch (e: any) {
    if (e.message && e.message.toLowerCase().includes('stockage')) {
      console.warn('Quota exceeded when saving users. Stripping avatars as fallback.');
      const strippedData = data.map(u => ({ ...u, avatarUrl: undefined }));
      try {
        setStoredData(key, strippedData);
        alert("Espace de stockage saturé. Les photos de profil ont été retirées pour libérer de l'espace.");
        return strippedData;
      } catch (e2) {
        console.error("Toujours erreur de quota même sans avatars :", e2);
        alert("Erreur critique : espace de stockage plein. Veuillez vider le cache du navigateur.");
      }
    }
  }
  return data;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<MembreEquipe | null>(null);
  const [users, setUsersState] = useState<MembreEquipe[]>([]);

  const setUsers = (newUsers: MembreEquipe[]) => {
    const finalUsers = safeSaveUsers(STORAGE_KEY, newUsers);
    setUsersState(finalUsers);
    window.dispatchEvent(new CustomEvent('crousty_toast'));
  };

  useEffect(() => {
    const loadUsers = () => {
      let storedUsers = getStoredData<MembreEquipe[]>(STORAGE_KEY, []);
      
      // Check legacy key if new key is empty
      if (storedUsers.length === 0) {
        const legacy = getStoredData<MembreEquipe[]>(LEGACY_KEY, []);
        if (legacy.length > 0) {
          storedUsers = legacy;
          storedUsers = safeSaveUsers(STORAGE_KEY, storedUsers);
        }
      }
      
      // Migration/Heal
      if (storedUsers.length > 0) {
        let changed = false;
        storedUsers = storedUsers.map(u => {
          let updated = { ...u };
          if (u.actif === undefined) {
            changed = true;
            updated.actif = true;
          }
          if (!u.initiales || u.initiales.trim() === '') {
            changed = true;
            const parts = u.name.trim().split(/\s+/);
            updated.initiales = parts.length >= 2 
              ? (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase()
              : u.name.charAt(0).toUpperCase();
          }
          if (u.name?.toLowerCase() === 'manager' && u.role !== 'manager') {
            changed = true;
            updated.role = 'manager';
          }
          if (u.avatarUrl && u.avatarUrl.length > 100000) {
            changed = true;
            delete updated.avatarUrl;
          }
          return updated;
        });
        if (changed) {
          storedUsers = safeSaveUsers(STORAGE_KEY, storedUsers);
        }
      }
      
      if (storedUsers.length === 0) {
        storedUsers = INITIAL_TEAM.map((m, i) => ({
          ...m,
          id: i === 0 ? '1' : Date.now().toString() + i,
          dateCreation: new Date().toISOString(),
          ordre: i,
          actif: true
        }));
        storedUsers = safeSaveUsers(STORAGE_KEY, storedUsers);
      }
      
      setUsersState(storedUsers);
      
      const activeUserId = window.sessionStorage.getItem('crousty_active_user');
      if (activeUserId) {
        const activeUser = storedUsers.find(u => u.id === activeUserId);
        if (activeUser) setCurrentUser(activeUser);
      }
    };

    loadUsers();

    // Listen for external updates (e.g. from config import)
    const handleUpdate = () => loadUsers();
    window.addEventListener('crousty-equipe-updated', handleUpdate);
    return () => window.removeEventListener('crousty-equipe-updated', handleUpdate);
  }, []);

  const login = (userId: string, pin: string) => {
    const user = users.find(u => u.id === userId && (u.pin === pin || (!u.pin && pin === '0000')));
    if (user) {
      // Small safety: ensure role is lowercase for internal logic
      const normalizedUser = { ...user, role: (user.role || 'employee').toLowerCase() as any };
      if (pin === '0000') {
        normalizedUser.mustChangePin = true;
      }
      setCurrentUser(normalizedUser);
      window.sessionStorage.setItem('crousty_active_user', user.id);
      return true;
    }
    return false;
  };

  const logout = () => {
    setCurrentUser(null);
    window.sessionStorage.removeItem('crousty_active_user');
  };

  const addUser = (userData: Omit<MembreEquipe, 'id' | 'dateCreation' | 'ordre'>) => {
    const newUser: MembreEquipe = { 
      ...userData, 
      id: Date.now().toString(), 
      dateCreation: new Date().toISOString(),
      ordre: users.length 
    };
    setUsers([...users, newUser]);
  };

  const deleteUser = (id: string) => {
    const updatedUsers = users.filter(u => u.id !== id);
    setUsers(updatedUsers);
    if (currentUser?.id === id) logout();
  };

  const updateUserPin = (id: string, newPin: string) => {
    const updatedUsers = users.map(u => u.id === id ? { ...u, pin: newPin } : u);
    setUsers(updatedUsers);
    if (currentUser?.id === id) {
      const updatedCtxUser = { ...currentUser, pin: newPin };
      delete updatedCtxUser.mustChangePin;
      setCurrentUser(updatedCtxUser);
    }
  };

  const updateUser = (updatedUser: MembreEquipe) => {
    const updatedUsers = users.map(u => u.id === updatedUser.id ? updatedUser : u);
    setUsers(updatedUsers);
    if (currentUser?.id === updatedUser.id) {
      setCurrentUser(updatedUser);
    }
  };

  return (
    <AuthContext.Provider value={{ currentUser, users, login, logout, addUser, deleteUser, updateUserPin, updateUser, setUsers }}>
      {children}
    </AuthContext.Provider>
  );
};

export const EquipeProvider = AuthProvider;

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  
  if (!context.currentUser) {
    const isMobileMode = !!localStorage.getItem('crousty_mobile_session');
    const mobileWorker = localStorage.getItem('crousty_mobile_worker');
    if (isMobileMode && mobileWorker) {
      return {
        ...context,
        currentUser: {
          id: 'mobile-worker',
          name: mobileWorker,
          initiales: mobileWorker.charAt(0).toUpperCase(),
          role: 'equipe',
          actif: true,
          pin: '0000',
          ordre: 0,
          dateCreation: new Date().toISOString()
        } as MembreEquipe
      };
    }
  }

  return context;
};
