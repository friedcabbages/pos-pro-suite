import { ShoppingCart, Receipt } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useRecentTransactions } from "@/hooks/useDashboard";
import { useBusiness } from "@/contexts/BusinessContext";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";
import { useNavigate } from "react-router-dom";

const paymentStyles: Record<string, string> = {
  cash: "bg-primary/10 text-primary",
  card: "bg-secondary text-secondary-foreground",
  qris: "bg-accent/10 text-accent-foreground",
  transfer: "bg-muted text-muted-foreground",
  other: "bg-muted text-muted-foreground",
};

export function RecentTransactions() {
  const { data: transactions, isLoading } = useRecentTransactions();
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
        <Skeleton className="h-6 w-48 mb-4" />
        <div className="space-y-4">
          {[...Array(5)].map((_, i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border bg-card p-6 shadow-card">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-foreground">Recent Transactions</h3>
          <p className="text-sm text-muted-foreground">Latest sales activity</p>
        </div>
        {transactions && transactions.length > 0 && (
          <Button variant="ghost" size="sm" onClick={() => navigate("/transactions")}>
            View all
          </Button>
        )}
      </div>

      {!transactions || transactions.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-[200px] text-center">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-primary/10 mb-4">
            <Receipt className="h-7 w-7 text-primary" />
          </div>
          <h4 className="text-sm font-medium text-foreground mb-1">
            No transactions yet
          </h4>
          <p className="text-xs text-muted-foreground max-w-[220px] mb-4">
            Your recent sales will appear here. Start selling to see activity.
          </p>
          <Button 
            size="sm"
            onClick={() => navigate('/pos')}
            className="gap-1.5"
          >
            <ShoppingCart className="h-4 w-4" />
            Open POS
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          {transactions.map((tx) => (
            <div key={tx.id} className="flex items-center gap-4 py-2">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                <ShoppingCart className="h-5 w-5 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium text-foreground">{tx.invoice_number}</p>
                  <Badge variant="secondary" className={paymentStyles[tx.payment_method] || paymentStyles.other}>
                    {tx.payment_method}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground">
                  {tx.customer_name || "Walk-in"} • {format(new Date(tx.created_at), "HH:mm")}
                </p>
              </div>
              <p className="text-sm font-semibold text-foreground">{formatCurrency(tx.total)}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
