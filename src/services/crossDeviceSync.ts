import { Task, IntegrationSettings } from '../types';

const STORAGE_KEY_TASKS = 'calen_tasks_data';
const STORAGE_KEY_SETTINGS = 'calen_settings_data';
const SYNC_CHANNEL_NAME = 'calen_broadcast_sync';

export interface WorkspaceExport {
  version: number;
  exportedAt: string;
  tasks: Task[];
  settings: IntegrationSettings;
}

export function loadSavedTasks(fallback: Task[]): Task[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_TASKS);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (e) {
    console.error('Failed to load tasks from localStorage', e);
  }
  return fallback;
}

export function saveTasks(tasks: Task[]): void {
  try {
    localStorage.setItem(STORAGE_KEY_TASKS, JSON.stringify(tasks));
    notifyTabs('TASKS_UPDATED', tasks);
  } catch (e) {
    console.error('Failed to save tasks', e);
  }
}

export function loadSavedSettings(fallback: IntegrationSettings): IntegrationSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_SETTINGS);
    if (raw) {
      return JSON.parse(raw);
    }
  } catch (e) {
    console.error('Failed to load settings', e);
  }
  return fallback;
}

export function saveSettings(settings: IntegrationSettings): void {
  try {
    localStorage.setItem(STORAGE_KEY_SETTINGS, JSON.stringify(settings));
    notifyTabs('SETTINGS_UPDATED', settings);
  } catch (e) {
    console.error('Failed to save settings', e);
  }
}

// BroadcastChannel for instant cross-tab sync
let channel: BroadcastChannel | null = null;
try {
  if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
    channel = new BroadcastChannel(SYNC_CHANNEL_NAME);
  }
} catch {
  // BroadcastChannel not supported in all contexts
}

function notifyTabs(type: string, payload: unknown) {
  try {
    channel?.postMessage({ type, payload });
  } catch {
    // Ignore
  }
}

export function subscribeToCrossTabSync(callback: (type: string, payload: unknown) => void): () => void {
  if (!channel) return () => {};
  const handler = (e: MessageEvent) => {
    if (e.data?.type) {
      callback(e.data.type, e.data.payload);
    }
  };
  channel.addEventListener('message', handler);
  return () => {
    channel?.removeEventListener('message', handler);
  };
}

// Export Workspace JSON
export function exportWorkspaceJSON(tasks: Task[], settings: IntegrationSettings): void {
  const data: WorkspaceExport = {
    version: 1,
    exportedAt: new Date().toISOString(),
    tasks,
    settings,
  };
  const jsonStr = JSON.stringify(data, null, 2);
  const blob = new Blob([jsonStr], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `calen-backup-${new Date().toISOString().slice(0, 10)}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// Import Workspace JSON
export function importWorkspaceJSON(file: File): Promise<WorkspaceExport> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target?.result as string;
        const parsed = JSON.parse(text) as WorkspaceExport;
        if (!parsed.tasks || !Array.isArray(parsed.tasks)) {
          throw new Error('Invalid Calen backup file format.');
        }
        resolve(parsed);
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = () => reject(new Error('Failed to read file.'));
    reader.readAsText(file);
  });
}

// Generate Instant Sync Link for Mobile / Other Devices
export function generateDeviceSyncUrl(tasks: Task[], settings: IntegrationSettings): string {
  try {
    const payload = JSON.stringify({
      t: tasks,
      s: settings,
      ts: Date.now(),
    });
    // Base64 encode safe for URI
    const encoded = btoa(encodeURIComponent(payload));
    const url = new URL(window.location.href);
    url.hash = `sync=${encoded}`;
    return url.toString();
  } catch {
    return window.location.href;
  }
}

// Check if incoming URL has sync payload
export function checkIncomingSyncPayload(): { tasks: Task[]; settings: IntegrationSettings } | null {
  try {
    if (typeof window === 'undefined') return null;
    const hash = window.location.hash;
    if (hash && hash.includes('sync=')) {
      const match = hash.match(/sync=([^&]+)/);
      if (match && match[1]) {
        const decoded = decodeURIComponent(atob(match[1]));
        const parsed = JSON.parse(decoded);
        if (parsed.t && Array.isArray(parsed.t)) {
          // Clean hash so it doesn't stay in URL forever
          history.replaceState(null, '', window.location.pathname);
          return {
            tasks: parsed.t,
            settings: parsed.s,
          };
        }
      }
    }
  } catch (err) {
    console.warn('Could not parse sync payload from URL hash', err);
  }
  return null;
}
