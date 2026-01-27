import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useBusiness } from "@/contexts/BusinessContext";
import { usePlanAccess } from "@/hooks/usePlanAccess";
import { useUpgradeModal } from "@/contexts/UpgradeModalContext";

function getOrCreateDeviceId() {
  const key = "velopos_device_id";
  const existing = localStorage.getItem(key);
  if (existing) return existing;

  const id = crypto.randomUUID();
  localStorage.setItem(key, id);
  return id;
}

export function useDeviceSession() {
  const { business } = useBusiness();
  const plan = usePlanAccess();
  const upgrade = useUpgradeModal();

  const [blocked, setBlocked] = useState(false);
  const timerRef = useRef<number | null>(null);

  const deviceId = useMemo(() => {
    try {
      return getOrCreateDeviceId();
    } catch {
      return "";
    }
  }, []);

  useEffect(() => {
    if (!business?.id) return;
    if (!deviceId) return;

    let cancelled = false;

    const ping = async () => {
      // Offline-first: never block the POS when offline.
      if (!navigator.onLine) {
        setBlocked(false);
        return;
      }

      const { data, error } = await supabase.functions.invoke("device-session", {
        body: { device_id: deviceId, window_minutes: 10 },
      });

      const allowed = !error && data?.allowed === true;
      if (cancelled) return;

      if (!allowed) {
        setBlocked(true);
        upgrade.open({
          reason: "devices",
          requiredPlan: plan.planName === "basic" ? "pro" : "enterprise",
          message:
            "Your plan has reached its active device limit. Upgrade to add more devices and keep your team moving.",
          highlights: ["More active devices", "Multi-user operations", "Advanced reporting"],
        });
      } else {
        setBlocked(false);
      }
    };

    void ping();

    const onOnline = () => void ping();
    window.addEventListener("online", onOnline);

    timerRef.current = window.setInterval(() => {
      void ping();
    }, 60_000);

    return () => {
      cancelled = true;
      window.removeEventListener("online", onOnline);
      if (timerRef.current) window.clearInterval(timerRef.current);
    };
  }, [business?.id, deviceId, plan.planName, upgrade]);

  return { blocked };
}
