import { getPendingSyncTasks, updateSyncTask, deleteSyncTask } from './db';

let isSyncing = false;
let syncInterval: NodeJS.Timeout | null = null;
const MAX_RETRIES = 5;

// Dispatch global events for UI updates
const dispatchSyncUpdate = () => {
    window.dispatchEvent(new CustomEvent('crousty_sync_update'));
};

export const processSyncQueue = async () => {
    if (isSyncing || !navigator.onLine) return;
    
    isSyncing = true;
    try {
        const tasks = await getPendingSyncTasks();
        if (tasks.length > 0) {
            console.log(`[SyncEngine] Found ${tasks.length} pending tasks to sync...`);
            dispatchSyncUpdate();
        }

        for (const task of tasks) {
            if (!navigator.onLine) break;

            try {
                await updateSyncTask(task.id, { status: 'processing' });
                dispatchSyncUpdate();

                if (task.type === 'export_session') {
                    const formData = new FormData();
                    const file = new File([task.blob], task.fileName, { type: 'application/zip' });
                    formData.append('file', file);
                    
                    const response = await fetch(`/api/sessions/${task.sessionId}/upload`, {
                        method: 'POST',
                        body: formData,
                    });

                    const isHtml = response.headers.get('content-type')?.includes('text/html');
                    if (response.status === 404 || isHtml) throw new Error("API_OFFLINE");
                    if (!response.ok) throw new Error(`Erreur serveur (${response.status})`);
                    
                    const result = await response.json();
                    if (!result.success) throw new Error(result.error || "L'envoi a échoué.");

                    // Success! Remove from queue
                    await deleteSyncTask(task.id);
                } else {
                    // Unknown task type
                    await deleteSyncTask(task.id);
                }
            } catch (err: any) {
                console.error(`[SyncEngine] Task ${task.id} failed:`, err);
                // Mark as failed and increment retry
                const retryCount = task.retryCount + 1;
                // If we reach max retries, we can keep it as failed or drop. For offline-first, we keep it but maybe don't loop endlessly if it's a permanent error?
                // For now, keep it failed
                await updateSyncTask(task.id, { 
                    status: 'failed', 
                    error: err.message,
                    retryCount 
                });
                
                // We'll keep going through other tasks, assuming one might work (though unlikely if offline)
            }
            dispatchSyncUpdate();
        }
    } finally {
        isSyncing = false;
    }
};

export const startSyncEngine = () => {
    if (typeof window === 'undefined') return;
    
    // Process on online event
    window.addEventListener('online', () => {
        console.log('[SyncEngine] Network is back online, processing queue...');
        processSyncQueue();
    });

    // Also poll every 30 seconds just in case
    if (!syncInterval) {
        syncInterval = setInterval(() => {
            if (navigator.onLine) {
                processSyncQueue();
            }
        }, 30000);
    }

    // Try processing now
    processSyncQueue();
};

export const stopSyncEngine = () => {
    if (syncInterval) {
        clearInterval(syncInterval);
        syncInterval = null;
    }
};
