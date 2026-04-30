import React from 'react';
import { cn } from '../../lib/utils';
import { Clock, CheckCircle2, AlertCircle, Archive, Send, Download, FileEdit, AlertTriangle, ListTodo, Smartphone } from 'lucide-react';

export type StatusType = 'draft' | 'pending' | 'done' | 'sent' | 'received' | 'ready' | 'imported' | 'error' | 'archived' | 'expired' | 'late' | 'todo' | 'waiting' | 'connected' | 'collecting' | 'uploaded' | 'preview-ready' | 'import-pending';

interface StatusBadgeProps {
  status: StatusType;
  label?: string;
  className?: string;
}

const STATUS_CONFIG: Record<StatusType, { bg: string, text: string, border: string, icon: any, defaultLabel: string }> = {
  draft: { bg: 'bg-gray-100', text: 'text-gray-600', border: 'border-gray-200', icon: FileEdit, defaultLabel: 'Brouillon' },
  pending: { bg: 'bg-orange-50', text: 'text-orange-600', border: 'border-orange-300', icon: Clock, defaultLabel: 'En attente' },
  waiting: { bg: 'bg-orange-50', text: 'text-orange-600', border: 'border-orange-300', icon: Clock, defaultLabel: 'En attente' },
  connected: { bg: 'bg-blue-50', text: 'text-blue-600', border: 'border-blue-300', icon: Smartphone, defaultLabel: 'Connectée' },
  collecting: { bg: 'bg-purple-50', text: 'text-purple-600', border: 'border-purple-300', icon: Smartphone, defaultLabel: 'Collecte en cours' },
  uploaded: { bg: 'bg-indigo-50', text: 'text-indigo-600', border: 'border-indigo-300', icon: Download, defaultLabel: 'Données reçues' },
  'preview-ready': { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-300', icon: CheckCircle2, defaultLabel: 'Prête à importer' },
  'import-pending': { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-300', icon: Clock, defaultLabel: 'Import en attente' },
  done: { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200', icon: CheckCircle2, defaultLabel: 'Terminé' },
  sent: { bg: 'bg-blue-50', text: 'text-blue-600', border: 'border-blue-200', icon: Send, defaultLabel: 'Envoyé' },
  received: { bg: 'bg-indigo-50', text: 'text-indigo-600', border: 'border-indigo-200', icon: Download, defaultLabel: 'Reçu' },
  ready: { bg: 'bg-purple-50', text: 'text-purple-600', border: 'border-purple-200', icon: CheckCircle2, defaultLabel: 'Prêt' },
  imported: { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200', icon: CheckCircle2, defaultLabel: 'Importée' },
  error: { bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200', icon: AlertCircle, defaultLabel: 'Erreur' },
  archived: { bg: 'bg-slate-100', text: 'text-slate-600', border: 'border-slate-300', icon: Archive, defaultLabel: 'Archivée' },
  expired: { bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200', icon: AlertCircle, defaultLabel: 'Expirée' },
  late: { bg: 'bg-red-100', text: 'text-red-800', border: 'border-red-300', icon: AlertTriangle, defaultLabel: 'En retard' },
  todo: { bg: 'bg-blue-50', text: 'text-blue-600', border: 'border-blue-200', icon: ListTodo, defaultLabel: 'À faire' },
};

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, label, className }) => {
  const config = STATUS_CONFIG[status];
  const Icon = config.icon;
  
  return (
    <span className={cn(`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold border shadow-sm`, config.bg, config.text, config.border, className)}>
      <Icon size={14} />
      {label || config.defaultLabel}
    </span>
  );
};
