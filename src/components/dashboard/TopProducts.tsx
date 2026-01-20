import { TrendingUp, Package, Plus } from "lucide-react";
import { useTopProducts } from "@/hooks/useDashboard";
import { useBusiness } from "@/contexts/BusinessContext";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

export function TopProducts() {
  const { data: products, isLoading } = useTopProducts();
  const { business } = useBusiness();
  const navigate = useNavigate();

  const formatCurrency = (value: number) => {
    const currency = business?.currency || 'USD';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
      minimumFractionDigits: 0,
    }).format(value);
  };

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
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-foreground">Top Products</h3>
        <p className="text-sm text-muted-foreground">Best sellers this month</p>
      </div>

      {!products || products.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-[200px] text-center">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-primary/10 mb-4">
            <Package className="h-7 w-7 text-primary" />
          </div>
          <h4 className="text-sm font-medium text-foreground mb-1">
            No sales data yet
          </h4>
          <p className="text-xs text-muted-foreground max-w-[200px] mb-4">
            Your best-selling products will appear here after you make sales.
          </p>
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => navigate('/products')}
            className="gap-1.5"
          >
            <Plus className="h-4 w-4" />
            Add Product
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          {products.map((product, index) => (
            <div key={product.id} className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-sm font-bold text-primary">
                {index + 1}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground truncate">{product.name}</p>
                <p className="text-xs text-muted-foreground">{product.quantity} sold</p>
              </div>
              <div className="text-right">
                <p className="text-sm font-semibold text-foreground">{formatCurrency(product.revenue)}</p>
                <div className="flex items-center justify-end gap-1 text-xs text-success">
                  <TrendingUp className="h-3 w-3" />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
