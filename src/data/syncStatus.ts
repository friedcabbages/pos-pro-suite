import { getConnectivityMode } from "@/data/connectivityMode";

export type ConnectivityUiStatus =
  | "online_synced"
  | "offline"
  | "offline_forced"
  | "syncing"
  | "sync_failed";

export type ConnectivityState = {
  online: boolean;
  status: ConnectivityUiStatus;
  queueCount: number;
  lastSyncAt: string | null; // ISO
  lastError: string | null;
};

type Listener = (state: ConnectivityState) => void;

const initialMode = getConnectivityMode();
const initialOnline = typeof navigator !== "undefined" ? navigator.onLine : true;
const forcedOffline = initialMode === "offline";

const DEFAULT_STATE: ConnectivityState = {
  online: forcedOffline ? false : initialOnline,
  status: forcedOffline ? "offline_forced" : initialOnline ? "online_synced" : "offline",
  queueCount: 0,
  lastSyncAt: null,
  lastError: null,
};

class ConnectivityStore {
  private state: ConnectivityState = DEFAULT_STATE;
  private listeners = new Set<Listener>();

  getState() {
    return this.state;
  }

  setState(patch: Partial<ConnectivityState>) {
    const next = { ...this.state, ...patch };
    // Cheap structural equality guard
    if (JSON.stringify(next) === JSON.stringify(this.state)) return;
    this.state = next;
    for (const l of this.listeners) l(this.state);
  }

  subscribe(listener: Listener) {
    this.listeners.add(listener);
    listener(this.state);
    return () => this.listeners.delete(listener);
  }
}

export const connectivityStore = new ConnectivityStore();

