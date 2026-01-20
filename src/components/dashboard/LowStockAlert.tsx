import { AlertTriangle, Package, CheckCircle2 } from "lucide-react";
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

  const hasLowStock = lowStockItems && lowStockItems.length > 0;

  return (
    <div className="rounded-xl border border-border bg-card p-6 shadow-card h-full">
      <div className="mb-4 flex items-center gap-2">
        {hasLowStock ? (
          <AlertTriangle className="h-5 w-5 text-warning" />
        ) : (
          <CheckCircle2 className="h-5 w-5 text-success" />
        )}
        <h3 className="text-lg font-semibold text-foreground">
          {hasLowStock ? 'Low Stock Alert' : 'Stock Status'}
        </h3>
      </div>

      {!hasLowStock ? (
        <div className="flex flex-col items-center justify-center h-[200px] text-center">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-success/10 mb-4">
            <Package className="h-7 w-7 text-success" />
          </div>
          <h4 className="text-sm font-medium text-foreground mb-1">
            All products well stocked
          </h4>
          <p className="text-xs text-muted-foreground max-w-[200px]">
            Great job! Your inventory levels are healthy.
          </p>
        </div>
      ) : (
        <>
          <div className="space-y-4 mb-4">
            {lowStockItems.slice(0, 5).map((item) => {
              const current = item.current_stock || 0;
              const min = item.min_stock || 1;
              const percentage = Math.min((current / min) * 100, 100);
              const isCritical = percentage < 25;

              return (
                <div key={`${item.product_id}-${item.warehouse_id}`} className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-foreground truncate max-w-[150px]">
                      {item.product_name}
                    </span>
                    <span className={`text-sm ${isCritical ? 'text-destructive font-medium' : 'text-muted-foreground'}`}>
                      {current} / {min}
                    </span>
                  </div>
                  <Progress 
                    value={percentage} 
                    className={`h-2 ${isCritical ? '[&>div]:bg-destructive' : ''}`}
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
