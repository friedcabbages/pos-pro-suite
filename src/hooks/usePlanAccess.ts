import { useMemo } from "react";
import { useSubscriptionStatus } from "@/hooks/useSubscription";
import {
  DEFAULT_FEATURES_BY_PLAN,
  type PlanFeatureKey,
  type PlanName,
  PLAN_LABEL,
  meetsPlan,
} from "@/lib/plan";

type Limits = {
  maxUsers: number | null;
  maxProducts: number | null;
  maxBranches: number | null;
  maxDevices: number | null;
};

export function usePlanAccess() {
  const { currentPlan, businessStatus, trialDaysRemaining, planReady } = useSubscriptionStatus();

  const planName = (currentPlan?.name as PlanName | undefined) ?? "basic";
  const displayName = PLAN_LABEL[planName] ?? "Basic";

  const features = useMemo(() => {
    const fromDb = (currentPlan?.features as unknown) as string[] | undefined;
    const list = Array.isArray(fromDb) && fromDb.length ? fromDb : DEFAULT_FEATURES_BY_PLAN[planName];
    return new Set(list as PlanFeatureKey[]);
  }, [currentPlan?.features, planName]);

  const limits: Limits = {
    maxUsers: currentPlan?.max_users ?? null,
    maxProducts: currentPlan?.max_products ?? null,
    maxBranches: currentPlan?.max_branches ?? null,
    maxDevices: (currentPlan as any)?.max_devices ?? null,
  };
  const resolvedDeviceLimit = limits.maxDevices ?? limits.maxUsers;

  return {
    planName,
    displayName,
    businessStatus,
    trialDaysRemaining,
    limits,
    resolvedDeviceLimit,
    features,
    isPlanReady: planReady,
    canUse: (feature: PlanFeatureKey) => features.has(feature),
    isComplianceMode: features.has("compliance_mode"),
    meetsPlan,
  };
}
