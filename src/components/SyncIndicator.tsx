import React, { useState, useEffect } from 'react';
import { CloudOff, RefreshCw, CheckCircle2, AlertCircle } from 'lucide-react';
import { getPendingSyncTasks, type SyncTask } from '../lib/db';
import { processSyncQueue, startSyncEngine } from '../lib/syncEngine';
import { motion, AnimatePresence } from 'motion/react';

export const SyncIndicator = () => {
    const [tasks, setTasks] = useState<SyncTask[]>([]);
    const [isOnline, setIsOnline] = useState(navigator.onLine);

    const updateStatus = async () => {
        setIsOnline(navigator.onLine);
        const pending = await getPendingSyncTasks();
        setTasks(pending);
    };

    useEffect(() => {
        // Start engine
        startSyncEngine();
        updateStatus();

        const handleSyncUpdate = () => updateStatus();
        const handleOnline = () => {
            updateStatus();
            processSyncQueue();
        };
        const handleOffline = () => updateStatus();

        window.addEventListener('content_update_sync', handleSyncUpdate); // just in case
        window.addEventListener('crousty_sync_update', handleSyncUpdate);
        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);

        return () => {
            window.removeEventListener('content_update_sync', handleSyncUpdate);
            window.removeEventListener('crousty_sync_update', handleSyncUpdate);
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, []);

    if (tasks.length === 0 && isOnline) return null;

    const hasFailed = tasks.some(t => t.status === 'failed');
    const isProcessing = tasks.some(t => t.status === 'processing');

    return (
        <AnimatePresence>
            <motion.div 
                initial={{ opacity: 0, y: 50, scale: 0.9 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 50, scale: 0.9 }}
                className="fixed bottom-6 right-6 z-50 flex items-center gap-3 bg-gray-900 border border-gray-800 text-white px-4 py-3 rounded-2xl shadow-2xl backdrop-blur-md"
            >
                {!isOnline ? (
                    <div className="flex items-center gap-2 text-orange-400">
                        <CloudOff size={18} />
                        <span className="text-xs font-black uppercase tracking-widest">Hors ligne</span>
                    </div>
                ) : isProcessing ? (
                    <div className="flex items-center gap-2 text-blue-400">
                        <RefreshCw size={18} className="animate-spin" />
                        <span className="text-xs font-black uppercase tracking-widest">Synchronisation...</span>
                    </div>
                ) : hasFailed ? (
                    <div className="flex items-center gap-2 text-red-400">
                        <AlertCircle size={18} />
                        <span className="text-xs font-black uppercase tracking-widest">{tasks.length} erreur(s) d'envoi</span>
                        <button 
                            onClick={processSyncQueue}
                            className="ml-2 bg-red-500/20 text-red-100 hover:bg-red-500/40 px-2 py-1 rounded text-[10px] uppercase font-bold"
                        >
                            Réessayer
                        </button>
                    </div>
                ) : tasks.length > 0 ? (
                    <div className="flex items-center gap-2 text-yellow-400">
                        <RefreshCw size={18} />
                        <span className="text-xs font-black uppercase tracking-widest">{tasks.length} en attente</span>
                    </div>
                ) : null}
            </motion.div>
        </AnimatePresence>
    );
};
