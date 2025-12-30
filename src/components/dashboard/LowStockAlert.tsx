import { AlertTriangle, Package } from "lucide-react";
import { Button } from "@/components/ui/button";

const lowStockItems = [
  { name: "Coffee Beans Premium", current: 5, minimum: 20, unit: "kg" },
  { name: "Sugar White", current: 8, minimum: 50, unit: "kg" },
  { name: "Milk Fresh 1L", current: 12, minimum: 30, unit: "pcs" },
  { name: "Flour All Purpose", current: 3, minimum: 25, unit: "kg" },
];

export function LowStockAlert() {
  return (
    <div className="rounded-lg border border-warning/30 bg-warning/5 p-5">
      <div className="mb-4 flex items-center gap-2">
        <div className="flex h-8 w-8 items-center justify-center rounded-md bg-warning/10">
          <AlertTriangle className="h-4 w-4 text-warning" />
        </div>
        <div>
          <h3 className="text-base font-semibold text-foreground">Low Stock Alert</h3>
          <p className="text-sm text-muted-foreground">{lowStockItems.length} items need attention</p>
        </div>
      </div>

      <div className="space-y-2">
        {lowStockItems.map((item) => {
          const percentage = (item.current / item.minimum) * 100;
          return (
            <div
              key={item.name}
              className="flex items-center gap-3 rounded-md bg-card p-3"
            >
              <Package className="h-4 w-4 text-warning" />
              <div className="flex-1 min-w-0">
                <p className="truncate text-sm font-medium text-foreground">
                  {item.name}
                </p>
                <p className="text-xs text-muted-foreground">
                  {item.current} / {item.minimum} {item.unit}
                </p>
              </div>
              <div className="h-1.5 w-16 overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full bg-warning transition-all"
                  style={{ width: `${percentage}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>

      <Button variant="outline" size="sm" className="mt-4 w-full">
        View Inventory
      </Button>
    </div>
  );
}
