export type ConnectivityUiStatus =
  | "online_synced"
  | "offline"
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

const DEFAULT_STATE: ConnectivityState = {
  online: typeof navigator !== "undefined" ? navigator.onLine : true,
  status: typeof navigator !== "undefined" && !navigator.onLine ? "offline" : "online_synced",
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

