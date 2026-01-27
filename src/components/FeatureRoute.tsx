import { usePlanAccess } from "@/hooks/usePlanAccess";
import type { PlanFeatureKey } from "@/lib/plan";
import { Navigate, useLocation } from "react-router-dom";

export function FeatureRoute(props: {
  featureKey: PlanFeatureKey;
  fallbackPath?: string;
  children: React.ReactNode;
}) {
  const plan = usePlanAccess();
  const location = useLocation();

  if (!plan.canUse(props.featureKey)) {
    return <Navigate to={props.fallbackPath ?? "/app"} state={{ from: location }} replace />;
  }

  return <>{props.children}</>;
}
