import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { usePlanAccess } from "@/hooks/usePlanAccess";
import { TrendingUp } from "lucide-react";

export default function ReportsAdvanced() {
  const plan = usePlanAccess();

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <header className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground">Advanced Reports</h1>
            <p className="mt-1 text-muted-foreground">
              Deeper insights for growing businesses (margins, supplier performance, and trends).
            </p>
          </div>
          <Badge variant="secondary" className="w-fit">
            <TrendingUp className="mr-2 h-4 w-4" />
            Plan: {plan.displayName}
          </Badge>
        </header>

        <Card className="p-6">
          <p className="text-sm text-muted-foreground">
            This route is intentionally separate so Basic users see a clear “🔒 Advanced Reports” upsell
            while Pro+ users get richer analytics. Next step: we’ll move margin/supplier-performance widgets
            here using the existing data views.
          </p>
        </Card>
      </div>
    </DashboardLayout>
  );
}
