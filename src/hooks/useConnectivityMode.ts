import { useSyncExternalStore } from "react";
import { connectivityModeStore, type ConnectivityMode } from "@/data/connectivityMode";

export function useConnectivityMode() {
  const mode = useSyncExternalStore(
    (onStoreChange) => connectivityModeStore.subscribe(() => onStoreChange()),
    () => connectivityModeStore.getState(),
    () => connectivityModeStore.getState()
  );

  const setMode = (next: ConnectivityMode) => {
    connectivityModeStore.setMode(next);
  };

  return { mode, setMode };
}
