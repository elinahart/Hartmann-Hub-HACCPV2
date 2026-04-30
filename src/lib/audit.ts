import { getStoredData, setStoredData } from './db';

export type AuditActionType = 'create' | 'update' | 'delete' | 'sync' | 'error' | 'system';
export type AuditModule = 'reception' | 'tracabilite' | 'temperature' | 'nettoyage' | 'huile' | 'inventaire' | 'mobile' | 'system' | 'session';

export interface AuditEvent {
  id: string;
  timestamp: string;
  type: AuditActionType;
  module: AuditModule;
  action: string;
  userName: string;
  userId?: string | null;
  source: 'hub' | 'mobile';
  sessionId?: string;
  details?: any;
  status: 'success' | 'warning' | 'error';
}

export function logAuditEvent(event: Omit<AuditEvent, 'id' | 'timestamp'>) {
  try {
    const rawEvents = getStoredData<AuditEvent[]>('crousty_audit_log', []);
    const now = Date.now();
    const TWENTY_FOUR_HOURS = 24 * 60 * 60 * 1000;
    
    let events = rawEvents.filter(e => now - new Date(e.timestamp).getTime() <= TWENTY_FOUR_HOURS);
    
    const newEvent: AuditEvent = {
      ...event,
      id: Date.now().toString(36) + Math.random().toString(36).substring(2),
      timestamp: new Date().toISOString()
    };
    events.unshift(newEvent); // newer first
    
    // Keep last 1000 events
    if (events.length > 1000) {
      events.length = 1000;
    }
    
    setStoredData('crousty_audit_log', events);
    window.dispatchEvent(new Event('crousty_audit_updated'));
  } catch (e) {
    console.error("Failed to log audit event:", e);
  }
}

export function getAuditEvents(): AuditEvent[] {
  const events = getStoredData<AuditEvent[]>('crousty_audit_log', []);
  const now = Date.now();
  const TWENTY_FOUR_HOURS = 24 * 60 * 60 * 1000;
  
  // Clean up events older than 24h
  const filteredEvents = events.filter(e => {
    return now - new Date(e.timestamp).getTime() <= TWENTY_FOUR_HOURS;
  });

  if (filteredEvents.length !== events.length) {
    setStoredData('crousty_audit_log', filteredEvents);
  }

  return filteredEvents;
}

export function clearAuditEvents() {
  setStoredData('crousty_audit_log', []);
  window.dispatchEvent(new Event('crousty_audit_updated'));
}

export function deleteAuditEvents(ids: string[]) {
  const events = getAuditEvents();
  const filtered = events.filter(e => !ids.includes(e.id));
  setStoredData('crousty_audit_log', filtered);
  window.dispatchEvent(new Event('crousty_audit_updated'));
}
