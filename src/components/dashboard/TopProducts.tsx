import { TrendingUp, TrendingDown } from "lucide-react";
import { cn } from "@/lib/utils";

const products = [
  { name: "Premium Coffee Beans", sales: 245, revenue: "$2,450", growth: 12 },
  { name: "Organic Fertilizer 50kg", sales: 189, revenue: "$4,725", growth: 8 },
  { name: "Fresh Milk 1L", sales: 156, revenue: "$468", growth: -3 },
  { name: "Whole Wheat Bread", sales: 134, revenue: "$402", growth: 15 },
  { name: "Rice Premium 25kg", sales: 98, revenue: "$2,450", growth: 5 },
];

export function TopProducts() {
  return (
    <div className="rounded-lg border border-border bg-card p-5">
      <div className="mb-4">
        <h3 className="text-base font-semibold text-foreground">Top Products</h3>
        <p className="text-sm text-muted-foreground">Best selling this week</p>
      </div>

      <div className="space-y-2">
        {products.map((product, index) => (
          <div
            key={product.name}
            className="flex items-center gap-3 rounded-md p-2 transition-colors hover:bg-muted/50"
          >
            <div className="flex h-7 w-7 items-center justify-center rounded-md bg-muted text-xs font-medium text-muted-foreground">
              {index + 1}
            </div>
            <div className="flex-1 min-w-0">
              <p className="truncate text-sm font-medium text-foreground">
                {product.name}
              </p>
              <p className="text-xs text-muted-foreground">
                {product.sales} sold
              </p>
            </div>
            <div className="text-right">
              <p className="text-sm font-semibold text-foreground tabular-nums">
                {product.revenue}
              </p>
              <div
                className={cn(
                  "flex items-center justify-end gap-0.5 text-xs",
                  product.growth >= 0 ? "text-success" : "text-destructive"
                )}
              >
                {product.growth >= 0 ? (
                  <TrendingUp className="h-3 w-3" />
                ) : (
                  <TrendingDown className="h-3 w-3" />
                )}
                {product.growth > 0 ? "+" : ""}
                {product.growth}%
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
