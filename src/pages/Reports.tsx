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
import { useSalesChart, useTopProducts, useDashboardStats } from "@/hooks/useDashboard";
import { useBusiness } from "@/contexts/BusinessContext";
import { Skeleton } from "@/components/ui/skeleton";

const categoryColors = [
  "hsl(160 84% 45%)",
  "hsl(142 76% 45%)",
  "hsl(38 92% 55%)",
  "hsl(217 91% 60%)",
  "hsl(var(--muted-foreground))",
];

export default function Reports() {
  const { data: salesChart, isLoading: chartLoading } = useSalesChart();
  const { data: topProducts, isLoading: productsLoading } = useTopProducts();
  const { data: stats, isLoading: statsLoading } = useDashboardStats();
  const { business } = useBusiness();

  const isLoading = chartLoading || productsLoading || statsLoading;

  const formatCurrency = (value: number) => {
    const currency = business?.currency || 'USD';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
      minimumFractionDigits: 0,
    }).format(value);
  };

  // Get top products for pie chart
  const pieData = topProducts?.slice(0, 5).map((p, i) => ({
    name: p.name,
    value: p.revenue || 0,
    color: categoryColors[i % categoryColors.length],
  })) || [];

  const totalRevenue = pieData.reduce((sum, p) => sum + p.value, 0);

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
                    <p className="text-sm text-muted-foreground">Monthly Revenue</p>
                    <p className="text-2xl font-bold text-foreground">{formatCurrency(stats?.monthlyRevenue || 0)}</p>
                  </div>
                </div>
              </div>
              <div className="rounded-xl border border-border bg-card p-6 shadow-card">
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-success/10">
                    <TrendingUp className="h-6 w-6 text-success" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Monthly Profit</p>
                    <p className="text-2xl font-bold text-foreground">{formatCurrency(stats?.monthlyProfit || 0)}</p>
                  </div>
                </div>
              </div>
              <div className="rounded-xl border border-border bg-card p-6 shadow-card">
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-warning/10">
                    <Receipt className="h-6 w-6 text-warning" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Today's Sales</p>
                    <p className="text-2xl font-bold text-foreground">{formatCurrency(stats?.todaySales || 0)}</p>
                  </div>
                </div>
              </div>
              <div className="rounded-xl border border-border bg-card p-6 shadow-card">
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-destructive/10">
                    <Package className="h-6 w-6 text-destructive" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Today's Profit</p>
                    <p className="text-2xl font-bold text-foreground">{formatCurrency(stats?.todayProfit || 0)}</p>
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
              Sales Trend (Last 7 Days)
            </h3>
            {chartLoading ? (
              <Skeleton className="h-[300px] w-full" />
            ) : !salesChart || salesChart.length === 0 ? (
              <div className="flex h-[300px] items-center justify-center text-muted-foreground">
                No sales data available
              </div>
            ) : (
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={salesChart}>
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
                      formatter={(value: number) => [formatCurrency(value), "Sales"]}
                    />
                    <Bar dataKey="sales" fill="hsl(160 84% 45%)" radius={[4, 4, 0, 0]} name="Sales" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>

          {/* Pie Chart */}
          <div className="rounded-xl border border-border bg-card p-6 shadow-card">
            <h3 className="mb-6 text-lg font-semibold text-foreground">
              Top Products by Revenue
            </h3>
            {productsLoading ? (
              <Skeleton className="h-[200px] w-full" />
            ) : pieData.length === 0 ? (
              <div className="flex h-[200px] items-center justify-center text-muted-foreground">
                No product data
              </div>
            ) : (
              <>
                <div className="h-[200px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={pieData}
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={80}
                        paddingAngle={2}
                        dataKey="value"
                      >
                        {pieData.map((entry, index) => (
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
                  {pieData.map((item) => (
                    <div key={item.name} className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <div
                          className="h-3 w-3 rounded-full"
                          style={{ backgroundColor: item.color }}
                        />
                        <span className="text-muted-foreground truncate max-w-[120px]">{item.name}</span>
                      </div>
                      <span className="font-medium text-foreground">
                        {totalRevenue > 0 ? ((item.value / totalRevenue) * 100).toFixed(0) : 0}%
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
