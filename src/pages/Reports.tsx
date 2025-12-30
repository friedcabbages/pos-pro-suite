import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { Download, TrendingUp, DollarSign, Receipt, Package } from "lucide-react";
import { useDashboard } from "@/hooks/useDashboard";
import { useBusiness } from "@/contexts/BusinessContext";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";

const categoryColors = [
  "hsl(160 84% 45%)",
  "hsl(142 76% 45%)",
  "hsl(38 92% 55%)",
  "hsl(217 91% 60%)",
  "hsl(var(--muted-foreground))",
];

export default function Reports() {
  const { dailySales, productMargins, isLoading } = useDashboard();
  const { business } = useBusiness();

  const formatCurrency = (value: number) => {
    const currency = business?.currency || 'USD';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
      minimumFractionDigits: 0,
    }).format(value);
  };

  // Transform daily sales for chart
  const salesData = dailySales?.slice(0, 7).reverse().map(d => ({
    date: format(new Date(d.sale_date!), "MMM d"),
    sales: d.total_revenue || 0,
    profit: d.total_profit || 0,
  })) || [];

  // Calculate totals
  const totalRevenue = dailySales?.reduce((sum, d) => sum + (d.total_revenue || 0), 0) || 0;
  const totalProfit = dailySales?.reduce((sum, d) => sum + (d.total_profit || 0), 0) || 0;
  const totalOrders = dailySales?.reduce((sum, d) => sum + (d.total_transactions || 0), 0) || 0;
  const totalCogs = dailySales?.reduce((sum, d) => sum + (d.total_cogs || 0), 0) || 0;

  // Get top products for pie chart
  const topProducts = productMargins?.slice(0, 5).map((p, i) => ({
    name: p.name,
    value: p.stock_value || 0,
    color: categoryColors[i % categoryColors.length],
  })) || [];

  const totalStockValue = topProducts.reduce((sum, p) => sum + p.value, 0);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground">
              Reports
            </h1>
            <p className="mt-1 text-muted-foreground">
              Financial analytics and business insights
            </p>
          </div>
          <div className="flex gap-2">
            <Select defaultValue="month">
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="week">This Week</SelectItem>
                <SelectItem value="month">This Month</SelectItem>
                <SelectItem value="quarter">This Quarter</SelectItem>
                <SelectItem value="year">This Year</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline">
              <Download className="mr-2 h-4 w-4" />
              Export
            </Button>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {isLoading ? (
            [...Array(4)].map((_, i) => (
              <Skeleton key={i} className="h-28 rounded-xl" />
            ))
          ) : (
            <>
              <div className="rounded-xl border border-border bg-card p-6 shadow-card">
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
                    <DollarSign className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Total Revenue</p>
                    <p className="text-2xl font-bold text-foreground">{formatCurrency(totalRevenue)}</p>
                  </div>
                </div>
              </div>
              <div className="rounded-xl border border-border bg-card p-6 shadow-card">
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-success/10">
                    <TrendingUp className="h-6 w-6 text-success" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Gross Profit</p>
                    <p className="text-2xl font-bold text-foreground">{formatCurrency(totalProfit)}</p>
                    <p className="text-xs text-success">
                      {totalRevenue > 0 ? ((totalProfit / totalRevenue) * 100).toFixed(1) : 0}% margin
                    </p>
                  </div>
                </div>
              </div>
              <div className="rounded-xl border border-border bg-card p-6 shadow-card">
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-warning/10">
                    <Receipt className="h-6 w-6 text-warning" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Total Orders</p>
                    <p className="text-2xl font-bold text-foreground">{totalOrders}</p>
                  </div>
                </div>
              </div>
              <div className="rounded-xl border border-border bg-card p-6 shadow-card">
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-destructive/10">
                    <Package className="h-6 w-6 text-destructive" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">COGS</p>
                    <p className="text-2xl font-bold text-foreground">{formatCurrency(totalCogs)}</p>
                    <p className="text-xs text-muted-foreground">
                      {totalRevenue > 0 ? ((totalCogs / totalRevenue) * 100).toFixed(1) : 0}% of revenue
                    </p>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Charts */}
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Bar Chart */}
          <div className="lg:col-span-2 rounded-xl border border-border bg-card p-6 shadow-card">
            <h3 className="mb-6 text-lg font-semibold text-foreground">
              Sales vs Profit Trend
            </h3>
            {isLoading ? (
              <Skeleton className="h-[300px] w-full" />
            ) : salesData.length === 0 ? (
              <div className="flex h-[300px] items-center justify-center text-muted-foreground">
                No sales data available
              </div>
            ) : (
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={salesData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis
                      dataKey="date"
                      stroke="hsl(var(--muted-foreground))"
                      fontSize={12}
                    />
                    <YAxis
                      stroke="hsl(var(--muted-foreground))"
                      fontSize={12}
                      tickFormatter={(value) => `${formatCurrency(value)}`}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "hsl(var(--card))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "8px",
                      }}
                      formatter={(value: number) => [formatCurrency(value), ""]}
                    />
                    <Bar dataKey="sales" fill="hsl(160 84% 45%)" radius={[4, 4, 0, 0]} name="Sales" />
                    <Bar dataKey="profit" fill="hsl(142 76% 45%)" radius={[4, 4, 0, 0]} name="Profit" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>

          {/* Pie Chart */}
          <div className="rounded-xl border border-border bg-card p-6 shadow-card">
            <h3 className="mb-6 text-lg font-semibold text-foreground">
              Top Products by Value
            </h3>
            {isLoading ? (
              <Skeleton className="h-[200px] w-full" />
            ) : topProducts.length === 0 ? (
              <div className="flex h-[200px] items-center justify-center text-muted-foreground">
                No product data
              </div>
            ) : (
              <>
                <div className="h-[200px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={topProducts}
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={80}
                        paddingAngle={2}
                        dataKey="value"
                      >
                        {topProducts.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "hsl(var(--card))",
                          border: "1px solid hsl(var(--border))",
                          borderRadius: "8px",
                        }}
                        formatter={(value: number) => [formatCurrency(value), ""]}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="mt-4 space-y-2">
                  {topProducts.map((item) => (
                    <div key={item.name} className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <div
                          className="h-3 w-3 rounded-full"
                          style={{ backgroundColor: item.color }}
                        />
                        <span className="text-muted-foreground truncate max-w-[120px]">{item.name}</span>
                      </div>
                      <span className="font-medium text-foreground">
                        {totalStockValue > 0 ? ((item.value / totalStockValue) * 100).toFixed(0) : 0}%
                      </span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
