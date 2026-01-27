import { useSyncExternalStore } from "react";
import { connectivityStore } from "@/data/syncStatus";

export function useConnectivityStatus() {
  return useSyncExternalStore(
    (onStoreChange) => connectivityStore.subscribe(() => onStoreChange()),
    () => connectivityStore.getState(),
    () => connectivityStore.getState()
  );
}

