import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart3, TrendingUp, DollarSign, Package } from "lucide-react";
import { QueryBoundary } from "@/components/QueryBoundary";
import { useDashboardStats, useTopProducts } from "@/hooks/useDashboard";
import { useBusiness } from "@/contexts/BusinessContext";
import { SalesChart } from "@/components/dashboard/SalesChart";
import { Skeleton } from "@/components/ui/skeleton";

export default function FnbReports() {
  const { business } = useBusiness();
  const { data: stats, isLoading: statsLoading, isError: statsError, error: statsErrorObj, refetch: refetchStats } = useDashboardStats();
  const { data: topProducts, isLoading: topLoading } = useTopProducts();

  const formatCurrency = (value: number) => {
    const currency = business?.currency || "IDR";
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency,
      minimumFractionDigits: 0,
    }).format(value);
  };

  const avgOrderValue = stats && stats.totalOrders > 0 ? stats.todaySales / stats.totalOrders : 0;

  return (
    <DashboardLayout>
      <div className="container mx-auto p-6">
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-2">
            <BarChart3 className="h-6 w-6 text-primary" />
            <h1 className="text-2xl font-bold">F&B Reports</h1>
          </div>
          <p className="text-muted-foreground">
            View sales performance, COGS, and operational insights
          </p>
        </div>

        <QueryBoundary isLoading={statsLoading || topLoading} isError={!!statsError} error={statsErrorObj ?? undefined} refetch={refetchStats}>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {statsLoading ? (
            [...Array(4)].map((_, i) => (
              <Card key={i}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <Skeleton className="h-4 w-24" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-8 w-20" />
                </CardContent>
              </Card>
            ))
          ) : (
            <>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Today&apos;s Revenue</CardTitle>
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{formatCurrency(stats?.todaySales ?? 0)}</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Orders Today</CardTitle>
                  <Package className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats?.totalOrders ?? 0}</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Average Order Value</CardTitle>
                  <TrendingUp className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{formatCurrency(avgOrderValue)}</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Top Item</CardTitle>
                  <BarChart3 className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats?.bestSellerToday ?? "—"}</div>
                </CardContent>
              </Card>
            </>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <SalesChart />

          <Card>
            <CardHeader>
              <CardTitle>Top Menu Items</CardTitle>
              <CardDescription>Best selling items this period</CardDescription>
            </CardHeader>
            <CardContent>
              {topLoading ? (
                <div className="space-y-2">
                  {[...Array(5)].map((_, i) => (
                    <Skeleton key={i} className="h-14 w-full" />
                  ))}
                </div>
              ) : !topProducts || topProducts.length === 0 ? (
                <div className="h-64 flex items-center justify-center text-muted-foreground text-sm">
                  No sales data yet
                </div>
              ) : (
                <div className="space-y-2">
                  {topProducts.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center justify-between p-2 border rounded"
                    >
                      <div>
                        <div className="font-medium">{item.name}</div>
                        <div className="text-sm text-muted-foreground">
                          {item.quantity} sold
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-semibold">{formatCurrency(item.revenue)}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
        </QueryBoundary>
      </div>
    </DashboardLayout>
  );
}
