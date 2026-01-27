export type ConnectivityMode = "online" | "offline";

const STORAGE_KEY = "pospro.connectivityMode";

function readStoredMode(): ConnectivityMode {
  if (typeof window === "undefined") return "online";
  try {
    const value = localStorage.getItem(STORAGE_KEY);
    if (value === "offline" || value === "online") return value;
  } catch {
    // Ignore storage access errors and fall back to default.
  }
  return "online";
}

type Listener = (mode: ConnectivityMode) => void;

class ConnectivityModeStore {
  private mode: ConnectivityMode = readStoredMode();
  private listeners = new Set<Listener>();

  getState() {
    return this.mode;
  }

  setMode(mode: ConnectivityMode) {
    if (mode === this.mode) return;
    this.mode = mode;
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem(STORAGE_KEY, mode);
      } catch {
        // Ignore storage write failures.
      }
    }
    for (const l of this.listeners) l(this.mode);
  }

  subscribe(listener: Listener) {
    this.listeners.add(listener);
    listener(this.mode);
    return () => this.listeners.delete(listener);
  }
}

export const connectivityModeStore = new ConnectivityModeStore();

export function getConnectivityMode(): ConnectivityMode {
  return connectivityModeStore.getState();
}

export function isManualOffline() {
  return connectivityModeStore.getState() === "offline";
}
