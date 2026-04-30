import React, { useState } from 'react';
import { Shield, Lock, LogOut } from 'lucide-react';
import { useConfig } from '../../contexts/ConfigContext';
import { useAuth } from '../../contexts/AuthContext';
import { Button, Input, Label } from '../ui/LightUI';

// Simplistic hash function since crypto.subtle is async and might be overkill here,
// but the specs say SHA-256 for PIN. We can use a simple async hash if needed.
// For the sake of this synchronous app interface, we will use a naive string hash
// or use crypto.subtle and await. To keep it simple, we'll hash asynchronously.

async function hashPIN(pin: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(pin);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

export const SecuriteTab = ({ onCloseModal }: { onCloseModal?: () => void }) => {
  const { config, updateConfig } = useConfig();
  const { logout } = useAuth();
  
  const [ancien, setAncien] = useState('');
  const [nouveau, setNouveau] = useState('');
  const [nouveauConfirm, setNouveauConfirm] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const handleUpdatePIN = async () => {
    setError('');
    setSuccess('');
    
    if (nouveau.length < 4 || nouveau.length > 6) {
      setError('Le nouveau PIN doit contenir entre 4 et 6 chiffres.');
      return;
    }
    if (!/^\d+$/.test(nouveau)) {
      setError('Le PIN ne doit contenir que des chiffres.');
      return;
    }
    if (nouveau !== nouveauConfirm) {
      setError('Les nouveaux codes ne correspondent pas.');
      return;
    }
    if (ancien === nouveau) {
      setError('Le nouveau code doit être différent de l\'ancien.');
      return;
    }

    setLoading(true);
    try {
      const ancienHash = await hashPIN(ancien);
      const currentHash = config.pinHash; // Make sure to get actual hash from config

      if (currentHash && currentHash !== ancienHash) {
        // If there's an existing hash and it doesn't match
        // Note: For first setup or if no hash, we might just allow it or require it.
        // Assuming there IS a valid currentHash if they are a manager.
        setError('L\'ancien code est incorrect.');
        setLoading(false);
        return;
      }

      const newHash = await hashPIN(nouveau);
      updateConfig({ pinHash: newHash });
      setSuccess('Code PIN mis à jour avec succès.');
      setAncien('');
      setNouveau('');
      setNouveauConfirm('');
    } catch (e) {
      setError('Erreur lors de la mise à jour du code.');
    } finally {
      setLoading(false);
    }
  };

  const handleLockSession = () => {
    if (onCloseModal) onCloseModal();
    logout();
  };

  return (
    <div className="space-y-10 max-w-xl">
      <section>
        <h3 className="text-xl font-black text-gray-800 mb-6 flex items-center gap-2">
          <Shield className="text-crousty-purple" /> Changer le code PIN Manager
        </h3>

        <div className="space-y-4 bg-gray-50 p-6 rounded-2xl border border-gray-100">
          <div>
            <Label>Ancien code PIN</Label>
            <Input 
              type="password" 
              inputMode="numeric"
              pattern="[0-9]*"
              value={ancien} 
              onChange={(e) => setAncien(e.target.value)} 
              placeholder="••••"
            />
          </div>
          <div>
            <Label>Nouveau code PIN</Label>
            <Input 
              type="password" 
              inputMode="numeric"
              pattern="[0-9]*"
              value={nouveau} 
              onChange={(e) => setNouveau(e.target.value)} 
              placeholder="4 à 6 chiffres"
              maxLength={6}
            />
          </div>
          <div>
            <Label>Confirmer nouveau code PIN</Label>
            <Input 
              type="password" 
              inputMode="numeric"
              pattern="[0-9]*"
              value={nouveauConfirm} 
              onChange={(e) => setNouveauConfirm(e.target.value)} 
              placeholder="4 à 6 chiffres"
              maxLength={6}
            />
          </div>

          {error && <p className="text-red-500 font-bold text-sm">{error}</p>}
          {success && <p className="text-emerald-500 font-bold text-sm">{success}</p>}

          <Button 
            onClick={handleUpdatePIN} 
            disabled={loading || !ancien || !nouveau || !nouveauConfirm} 
            className="w-full bg-crousty-purple h-12"
          >
            Enregistrer le nouveau code PIN
          </Button>
        </div>
      </section>

      <section>
        <h3 className="text-xl font-black text-red-800 mb-6 flex items-center gap-2">
          <Lock className="text-red-500" /> Verrouillage de la session
        </h3>

        <div className="bg-red-50 p-6 rounded-2xl border border-red-100 flex flex-col items-center text-center">
          <p className="text-red-800 font-medium mb-4">Verrouillez immédiatement cette session pour empêcher tout accès non autorisé aux réglages et actions Manager.</p>
          <Button 
            onClick={handleLockSession} 
            className="w-full sm:w-auto bg-red-500 hover:bg-red-600 text-white gap-2 h-12 px-6 shadow-sm"
          >
            <LogOut size={20} /> Verrouiller la session maintenant
          </Button>
        </div>
      </section>
    </div>
  );
};
