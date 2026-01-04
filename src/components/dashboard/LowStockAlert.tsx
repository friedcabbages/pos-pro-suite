import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useLowStockProducts } from "@/hooks/useDashboard";
import { Skeleton } from "@/components/ui/skeleton";
import { useNavigate } from "react-router-dom";

export function LowStockAlert() {
  const { data: lowStockItems, isLoading } = useLowStockProducts();
  const navigate = useNavigate();

  if (isLoading) {
    return (
      <div className="rounded-xl border border-border bg-card p-6 shadow-card">
        <Skeleton className="h-6 w-32 mb-4" />
        <div className="space-y-4">
          {[...Array(5)].map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border bg-card p-6 shadow-card h-full">
      <div className="mb-4 flex items-center gap-2">
        <AlertTriangle className="h-5 w-5 text-warning" />
        <h3 className="text-lg font-semibold text-foreground">Low Stock Alert</h3>
      </div>

      {!lowStockItems || lowStockItems.length === 0 ? (
        <div className="flex h-[200px] items-center justify-center text-muted-foreground">
          All products are well stocked
        </div>
      ) : (
        <>
          <div className="space-y-4 mb-4">
            {lowStockItems.slice(0, 5).map((item) => {
              const current = item.current_stock || 0;
              const min = item.min_stock || 1;
              const percentage = Math.min((current / min) * 100, 100);

              return (
                <div key={`${item.product_id}-${item.warehouse_id}`} className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-foreground truncate max-w-[150px]">
                      {item.product_name}
                    </span>
                    <span className="text-sm text-muted-foreground">
                      {current} / {min}
                    </span>
                  </div>
                  <Progress 
                    value={percentage} 
                    className="h-2"
                  />
                  <p className="text-xs text-muted-foreground">{item.warehouse_name}</p>
                </div>
              );
            })}
          </div>
          <Button 
            variant="outline" 
            className="w-full" 
            onClick={() => navigate("/inventory")}
          >
            View Inventory
          </Button>
        </>
      )}
    </div>
  );
}