import { useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useBusiness } from "@/contexts/BusinessContext";
import { startDataLayer, syncNow } from "@/data/dataService";
import { isManualOffline } from "@/data/connectivityMode";

export function DataLayerProvider({ children }: { children: React.ReactNode }) {
  const { user, initialized: authInitialized } = useAuth();
  const { business, branch, warehouse } = useBusiness();

  useEffect(() => {
    if (!authInitialized) return;

    void startDataLayer({
      businessId: business?.id ?? null,
      branchId: branch?.id ?? null,
      warehouseId: warehouse?.id ?? null,
      userId: user?.id ?? null,
    });
  }, [authInitialized, business?.id, branch?.id, warehouse?.id, user?.id]);

  // Best-effort periodic sync while online (keeps dashboard fresh without blocking UI)
  useEffect(() => {
    if (!authInitialized) return;
    if (!business?.id) return;

    const id = window.setInterval(() => {
      if (navigator.onLine && !isManualOffline()) void syncNow();
    }, 60_000);

    return () => window.clearInterval(id);
  }, [authInitialized, business?.id]);

  return <>{children}</>;
}

