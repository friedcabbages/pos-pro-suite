import { Package } from "lucide-react";

const products = [
  { name: "Premium Coffee Beans", sales: 245, revenue: "$2,450", growth: 12 },
  { name: "Organic Fertilizer 50kg", sales: 189, revenue: "$4,725", growth: 8 },
  { name: "Fresh Milk 1L", sales: 156, revenue: "$468", growth: -3 },
  { name: "Whole Wheat Bread", sales: 134, revenue: "$402", growth: 15 },
  { name: "Rice Premium 25kg", sales: 98, revenue: "$2,450", growth: 5 },
];

export function TopProducts() {
  return (
    <div className="rounded-xl border border-border bg-card p-6 shadow-card animate-slide-up" style={{ animationDelay: "300ms" }}>
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-foreground">Top Products</h3>
        <p className="text-sm text-muted-foreground">Best selling this week</p>
      </div>

      <div className="space-y-4">
        {products.map((product, index) => (
          <div
            key={product.name}
            className="flex items-center gap-4 rounded-lg p-3 transition-colors hover:bg-secondary/50"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Package className="h-5 w-5" />
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
              <p className="text-sm font-semibold text-foreground">
                {product.revenue}
              </p>
              <p
                className={`text-xs ${
                  product.growth > 0 ? "text-success" : "text-destructive"
                }`}
              >
                {product.growth > 0 ? "+" : ""}
                {product.growth}%
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
