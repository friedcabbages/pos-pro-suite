import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useUpgradeModal } from "@/contexts/UpgradeModalContext";
import type { PlanFeatureKey, PlanName } from "@/lib/plan";
import { Lock } from "lucide-react";

export function LockedFeature(props: {
  featureKey: PlanFeatureKey;
  requiredPlan: PlanName;
  title: string;
  description: string;
  upsell: string;
}) {
  const upgrade = useUpgradeModal();

  return (
    <Card className="p-6">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
          <Lock className="h-5 w-5 text-muted-foreground" />
        </div>
        <div className="flex-1">
          <h1 className="text-xl font-semibold text-foreground">{props.title}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{props.description}</p>

          <div className="mt-4 rounded-lg border border-border bg-muted/40 p-3 text-sm text-muted-foreground">
            {props.upsell}
          </div>

          <div className="mt-4 flex flex-col gap-2 sm:flex-row">
            <Button
              onClick={() =>
                upgrade.open({
                  reason: "feature",
                  featureKey: props.featureKey,
                  requiredPlan: props.requiredPlan,
                  message: props.upsell,
                })
              }
            >
              Upgrade to unlock
            </Button>
          </div>
        </div>
      </div>
    </Card>
  );
}
