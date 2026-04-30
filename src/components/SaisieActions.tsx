import React from 'react';
import { Pencil, Trash2, Lock } from 'lucide-react';
import { usePermissions } from '../hooks/usePermissions';

interface SaisieActionsProps {
  saisie: any;
  onEdit?: () => void;
  onDelete?: () => void;
  inline?: boolean;
}

export const SaisieActions: React.FC<SaisieActionsProps> = ({ saisie, onEdit, onDelete, inline = false }) => {
  const { peutModifier, raisonBlocage } = usePermissions(saisie);

  if (!peutModifier) {
    return (
      <div className={`flex items-center gap-1.5 text-xs font-bold text-gray-500 bg-gray-50 px-2 py-1 rounded-md border border-gray-100 ${inline ? 'inline-flex' : ''}`}>
        <Lock size={12} />
        {raisonBlocage}
      </div>
    );
  }

  return (
    <div className={`flex items-center gap-2 ${inline ? 'inline-flex' : ''}`}>
      {onEdit && (
        <button 
          onClick={onEdit} 
          style={{ minHeight: 44, padding: '0 16px' }}
          className="flex items-center gap-2 text-[11px] font-black uppercase tracking-widest text-[#555] hover:text-[var(--color-primary)] active:bg-[var(--color-primary-bg)] bg-white rounded-2xl border border-gray-100 shadow-sm transition-all active:scale-95"
        >
          <Pencil size={14} className="opacity-70" /> Modifier
        </button>
      )}
      {onDelete && (
        <button 
          onClick={onDelete} 
          style={{ minHeight: 44, padding: '0 16px' }}
          className="flex items-center gap-2 text-[11px] font-black uppercase tracking-widest text-[#555] hover:text-red-500 active:bg-red-50 bg-white rounded-2xl border border-gray-100 shadow-sm transition-all active:scale-95"
        >
          <Trash2 size={14} className="opacity-70" /> Supprimer
        </button>
      )}
    </div>
  );
};
