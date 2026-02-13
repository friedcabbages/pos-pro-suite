import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { useSalesChart } from "@/hooks/useDashboard";
import { useBusiness } from "@/contexts/BusinessContext";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { ShoppingCart, TrendingUp } from "lucide-react";
import { useNavigate } from "react-router-dom";

export function SalesChart() {
  const { data: chartData, isLoading } = useSalesChart();
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
        <Skeleton className="h-[250px] w-full" />
      </div>
    );
  }

  const data = chartData || [];
  const hasData = data.some(d => d.sales > 0);

  return (
    <div className="rounded-xl border border-border bg-card p-6 shadow-card">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-foreground">Sales Overview</h3>
          <p className="text-sm text-muted-foreground">Last 7 days performance</p>
        </div>
        {hasData && (
          <div className="flex gap-4 text-sm">
            <div className="flex items-center gap-2">
              <div className="h-3 w-3 rounded-full bg-primary" />
              <span className="text-muted-foreground">Sales</span>
            </div>
          </div>
        )}
      </div>

      {!hasData ? (
        <div className="flex flex-col items-center justify-center h-[250px] text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-4">
            <TrendingUp className="h-8 w-8 text-primary" />
          </div>
          <h4 className="text-base font-medium text-foreground mb-2">
            No sales yet
          </h4>
          <p className="text-sm text-muted-foreground max-w-[280px] mb-4">
            Start your first transaction to see performance trends here.
          </p>
          <Button 
            onClick={() => navigate(business?.business_type === 'fnb' ? '/fnb/cashier' : '/retail/pos')}
            className="gap-2"
          >
            <ShoppingCart className="h-4 w-4" />
            {business?.business_type === 'fnb' ? 'Open Cashier' : 'Open POS'}
          </Button>
        </div>
      ) : (
        <div className="h-[250px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="salesGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis 
                dataKey="date" 
                axisLine={false} 
                tickLine={false}
                tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
              />
              <YAxis 
                axisLine={false} 
                tickLine={false}
                tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
                tickFormatter={(value) => formatCurrency(value)}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "8px",
                }}
                formatter={(value: number) => [formatCurrency(value), "Sales"]}
              />
              <Area
                type="monotone"
                dataKey="sales"
                stroke="hsl(var(--primary))"
                strokeWidth={2}
                fill="url(#salesGradient)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
