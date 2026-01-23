import { usePlanAccess } from "@/hooks/usePlanAccess";
import type { PlanFeatureKey, PlanName } from "@/lib/plan";
import { LockedFeature } from "@/components/subscription/LockedFeature";
import { DashboardLayout } from "@/components/layout/DashboardLayout";

export function FeatureRoute(props: {
  featureKey: PlanFeatureKey;
  requiredPlan: PlanName;
  title: string;
  description: string;
  upsell: string;
  children: React.ReactNode;
}) {
  const plan = usePlanAccess();

  if (!plan.canUse(props.featureKey)) {
    return (
      <DashboardLayout>
        <LockedFeature
          featureKey={props.featureKey}
          requiredPlan={props.requiredPlan}
          title={props.title}
          description={props.description}
          upsell={props.upsell}
        />
      </DashboardLayout>
    );
  }

  return <>{props.children}</>;
}
