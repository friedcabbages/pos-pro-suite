import { createContext, useContext, useMemo, useState } from "react";
import type { PlanFeatureKey, PlanName } from "@/lib/plan";
import { FEATURE_REQUIRED_PLAN, PLAN_LABEL } from "@/lib/plan";
import { UpgradeModal } from "@/components/subscription/UpgradeModal";

type UpgradeReason = "feature" | "limit" | "devices";

type UpgradeState = {
  open: boolean;
  reason: UpgradeReason;
  featureKey?: PlanFeatureKey;
  requiredPlan?: PlanName;
  title?: string;
  message?: string;
  highlights?: string[];
};

type UpgradeModalApi = {
  open: (args: Omit<UpgradeState, "open">) => void;
  close: () => void;
};

const Ctx = createContext<UpgradeModalApi | null>(null);

export function UpgradeModalProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<UpgradeState>({ open: false, reason: "feature" });

  const api = useMemo<UpgradeModalApi>(
    () => ({
      open: (args) => {
        const required =
          args.requiredPlan ?? (args.featureKey ? FEATURE_REQUIRED_PLAN[args.featureKey] : undefined);
        setState({
          open: true,
          reason: args.reason,
          featureKey: args.featureKey,
          requiredPlan: required,
          title: args.title,
          message: args.message,
          highlights: args.highlights,
        });
      },
      close: () => setState((s) => ({ ...s, open: false })),
    }),
    []
  );

  const requiredLabel = state.requiredPlan ? PLAN_LABEL[state.requiredPlan] : "Pro";

  return (
    <Ctx.Provider value={api}>
      {children}
      <UpgradeModal
        open={state.open}
        onOpenChange={(open) => setState((s) => ({ ...s, open }))}
        title={
          state.title ??
          (state.reason === "limit"
            ? `Upgrade to add more`
            : state.reason === "devices"
              ? `Device limit reached`
              : `Upgrade to unlock this feature`)
        }
        message={
          state.message ??
          (state.featureKey
            ? `This feature is available on the ${requiredLabel} Plan. Upgrade now to unlock it and more.`
            : `This is available on the ${requiredLabel} Plan. Upgrade now to unlock more.`)
        }
        highlights={
          state.highlights ??
          (state.requiredPlan === "enterprise"
            ? ["API Access", "Custom Branding", "Priority Support", "Compliance Mode"]
            : ["Expenses", "Purchase Orders", "Multi-Warehouse", "Advanced Reports"])
        }
      />
    </Ctx.Provider>
  );
}

export function useUpgradeModal() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useUpgradeModal must be used within UpgradeModalProvider");
  return ctx;
}
