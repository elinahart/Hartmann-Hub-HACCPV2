import React, { useState, useEffect } from 'react';
import { Truck, Plus, Trash2, X, AlertCircle } from 'lucide-react';
import { useConfig } from '../../contexts/ConfigContext';
import { Button, Input, Label } from '../ui/LightUI';

export const ReceptionsTab = () => {
  const { config, updateConfig } = useConfig();
  const [fournisseurs, setFournisseurs] = useState<string[]>(config.fournisseurs || []);
  const [newFournisseur, setNewFournisseur] = useState('');

  useEffect(() => {
    setFournisseurs(config.fournisseurs || []);
  }, [config.fournisseurs]);

  const handleAdd = () => {
    const trimmed = newFournisseur.trim();
    if (!trimmed) return;
    if (fournisseurs.includes(trimmed)) return;

    const updated = [...fournisseurs, trimmed];
    setFournisseurs(updated);
    updateConfig({ fournisseurs: updated });
    localStorage.setItem('crousty-reception-fournisseurs', JSON.stringify(updated));
    setNewFournisseur('');
  };

  const handleRemove = (f: string) => {
    const updated = fournisseurs.filter(it => it !== f);
    setFournisseurs(updated);
    updateConfig({ fournisseurs: updated });
    localStorage.setItem('crousty-reception-fournisseurs', JSON.stringify(updated));
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300 max-w-4xl">
      <div>
        <h2 className="text-xl font-black text-gray-800">Fournisseurs de Réception</h2>
        <p className="text-gray-500 text-sm">Gérez la liste des fournisseurs proposés lors de vos réceptions de marchandise.</p>
      </div>

      <div className="bg-white border text-gray-800 p-6 rounded-3xl space-y-6">
        <div className="flex items-center gap-4">
          <div className="flex-1">
            <Label className="text-sm font-bold text-gray-600 mb-1">Nom du fournisseur</Label>
            <Input 
              value={newFournisseur} 
              onChange={(e: any) => setNewFournisseur(e.target.value)}
              placeholder="Ex: Metro, Pomona..."
              className="h-12"
              onKeyDown={(e: any) => {
                if (e.key === 'Enter') handleAdd();
              }}
            />
          </div>
          <Button onClick={handleAdd} disabled={!newFournisseur.trim()} className="h-12 mt-[22px] px-6 bg-[var(--color-primary)] text-white gap-2 font-bold whitespace-nowrap">
            <Plus size={18} />
            Ajouter
          </Button>
        </div>

        {fournisseurs.length === 0 ? (
          <div className="text-center py-8 bg-gray-50 rounded-2xl border border-dashed border-gray-200">
            <Truck size={32} className="mx-auto text-gray-300 mb-2" />
            <p className="text-gray-500 font-medium">Aucun fournisseur enregistré.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {fournisseurs.map(f => (
              <div key={f} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl border border-gray-100 group transition-all hover:bg-white hover:border-gray-200 hover:shadow-sm">
                <span className="font-bold text-gray-700">{f}</span>
                <button 
                  onClick={() => handleRemove(f)}
                  className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                >
                  <Trash2 size={18} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
