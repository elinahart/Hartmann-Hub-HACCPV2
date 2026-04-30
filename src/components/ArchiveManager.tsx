import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';
import { FileText, Trash2, CheckCircle2, Clock, Check } from 'lucide-react';
import { getStoredData, setStoredData } from '../lib/db';
import { format, subMonths, startOfMonth, isAfter } from 'date-fns';
import { fr } from 'date-fns/locale';
import { generateMonthlyPDF, purgeOldData } from '../lib/archiver';
import { Button } from './ui/LightUI';
import { useAuth } from '../contexts/AuthContext';

export const ArchiveManager = () => {
  const { currentUser } = useAuth();
  const [showArchiver, setShowArchiver] = useState(false);
  const [step, setStep] = useState<'export' | 'purge'>('export');
  const [isExporting, setIsExporting] = useState(false);
  const [isPurging, setIsPurging] = useState(false);
  const [pdfConfirmed, setPdfConfirmed] = useState(false);
  const [targetDate, setTargetDate] = useState<Date>(subMonths(new Date(), 1));

  useEffect(() => {
    const handleOpenArchiver = () => setShowArchiver(true);
    window.addEventListener('openArchiver', handleOpenArchiver);
    return () => window.removeEventListener('openArchiver', handleOpenArchiver);
  }, []);

  useEffect(() => {
    // Only verify automatic trigger if logged in
    if (!currentUser) return;
    
    // Auto-trigger should ideally only show for managers as per constraints
    if (currentUser.role !== 'manager') return;

    const now = new Date();
    // Only check if we are in the new month (after 1st day of the month)
    // Actually, any day of the current month should trigger for the previous month
    // if not already done.
    
    const prevMonthDate = subMonths(now, 1);
    const key = format(prevMonthDate, 'yyyy-MM');
    
    // Check if we already archived this
    const archivesDone = getStoredData<Record<string, boolean>>('crousty_archives_done', {});
    if (archivesDone[key]) return;

    // Check if snoozed
    const snoozeTime = getStoredData<number>('crousty_archive_snooze', 0);
    if (now.getTime() < snoozeTime) return;

    setTargetDate(prevMonthDate);
    setShowArchiver(true);
  }, [currentUser]);

  const handleSnooze = () => {
    const next24h = new Date().getTime() + 24 * 60 * 60 * 1000;
    setStoredData('crousty_archive_snooze', next24h);
    setShowArchiver(false);
  };

  const handleExport = async () => {
    setIsExporting(true);
    try {
      await generateMonthlyPDF(targetDate);
      setStep('purge');
    } catch (err) {
      alert("Erreur lors de l'exportation du PDF.");
      console.error(err);
    }
    setIsExporting(false);
  };

  const handlePurge = async () => {
    if (currentUser?.role !== 'manager') {
      alert("La purge ne peut être effectuée que par un Manager.");
      return;
    }

    if (!pdfConfirmed) {
      alert("Veuillez confirmer avoir sauvegardé le PDF avant de continuer.");
      return;
    }
    
    setIsPurging(true);
    try {
      const removed = await purgeOldData(targetDate);
      const archivesDone = getStoredData<Record<string, boolean>>('crousty_archives_done', {});
      const key = format(targetDate, 'yyyy-MM');
      archivesDone[key] = true;
      setStoredData('crousty_archives_done', archivesDone);
      alert(`Nettoyage terminé ! ${removed} relevés nettoyés.`);
      setShowArchiver(false);
    } catch (err) {
      alert("Erreur lors de la purge des données.");
      console.error(err);
    }
    setIsPurging(false);
  };

  const monthName = format(targetDate, 'MMMM yyyy', { locale: fr });

  return createPortal(
    <AnimatePresence>
      {showArchiver && (
        <div className="fixed inset-0 z-[1000] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <motion.div 
            initial={{ scale: 0.9, opacity: 0 }} 
            animate={{ scale: 1, opacity: 1 }} 
            exit={{ scale: 0.9, opacity: 0 }}
            className="bg-white rounded-3xl max-w-sm w-full overflow-hidden shadow-2xl relative"
          >
            {step === 'export' ? (
              <div className="p-6">
                <div className="w-16 h-16 bg-crousty-purple/10 text-crousty-purple rounded-full flex items-center justify-center mb-6 mx-auto">
                  <FileText size={32} />
                </div>
                <h3 className="text-xl font-black text-gray-800 text-center mb-2 uppercase">Archivage mensuel disponible</h3>
                <p className="text-gray-500 text-center font-medium text-sm mb-8">
                  Le rapport de <span className="font-bold text-gray-800 capitalize">{monthName}</span> est prêt à être exporté.
                </p>
                <div className="flex flex-col gap-3">
                  <Button onClick={handleExport} disabled={isExporting} className="w-full flex items-center justify-center gap-2">
                    {isExporting ? 'Génération...' : 'Exporter le PDF'}
                  </Button>
                  <button onClick={handleSnooze} className="w-full p-4 text-sm font-bold text-gray-500 hover:bg-gray-50 rounded-2xl transition-colors">
                    Plus tard
                  </button>
                </div>
              </div>
            ) : (
              <div className="p-6">
                <div className="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center mb-6 mx-auto">
                  <Trash2 size={32} />
                </div>
                <h3 className="text-xl font-black text-gray-800 text-center mb-2 uppercase">Nettoyer les données ?</h3>
                <p className="text-gray-500 text-center font-medium text-sm mb-4">
                  L'historique des relevés et photos de <span className="font-bold text-gray-800 capitalize">{monthName}</span> peut maintenant être supprimé pour garder l'appareil rapide.
                </p>
                <div className="bg-gray-50 p-4 rounded-xl mb-6 text-xs text-gray-600 font-medium">
                  La configuration de votre app (couleurs, zones, produits) ne sera <span className="font-bold">PAS</span> supprimée.
                </div>
                
                <label className="flex items-center gap-3 mb-6 p-4 border border-gray-100 rounded-xl cursor-pointer hover:bg-gray-50 transition-colors">
                  <div className={`w-6 h-6 rounded-md border-2 flex items-center justify-center ${pdfConfirmed ? 'bg-crousty-purple border-crousty-purple text-white' : 'border-gray-300'}`}>
                    {pdfConfirmed && <Check size={14} strokeWidth={3} />}
                  </div>
                  <input type="checkbox" className="hidden" checked={pdfConfirmed} onChange={() => setPdfConfirmed(!pdfConfirmed)} />
                  <span className="font-bold text-sm text-gray-800">✅ J'ai bien sauvegardé le PDF</span>
                </label>

                <div className="flex flex-col gap-3">
                  <button 
                    onClick={handlePurge} 
                    disabled={isPurging || !pdfConfirmed} 
                    className={`w-full p-4 text-sm font-black rounded-2xl transition-colors flex items-center justify-center gap-2 ${pdfConfirmed ? 'bg-red-500 text-white shadow-xl hover:bg-red-600' : 'bg-gray-100 text-gray-400 cursor-not-allowed'}`}
                  >
                    {isPurging ? 'Nettoyage...' : 'Purger les données'}
                  </button>
                  <button onClick={() => setShowArchiver(false)} className="w-full p-4 text-sm font-bold text-gray-500 hover:bg-gray-50 rounded-2xl transition-colors">
                    Garder les données
                  </button>
                </div>
              </div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body
  );
};
