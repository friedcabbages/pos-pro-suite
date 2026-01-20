import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { EnhancedKPICard } from "@/components/dashboard/EnhancedKPICard";
import { SalesChart } from "@/components/dashboard/SalesChart";
import { TopProducts } from "@/components/dashboard/TopProducts";
import { RecentTransactions } from "@/components/dashboard/RecentTransactions";
import { LowStockAlert } from "@/components/dashboard/LowStockAlert";
import { QuickActions } from "@/components/dashboard/QuickActions";
import { DailyInsights } from "@/components/dashboard/DailyInsights";
import { useDashboardStats, useLowStockProducts } from "@/hooks/useDashboard";
import { useBusiness } from "@/contexts/BusinessContext";
import {
  DollarSign,
  TrendingUp,
  ShoppingCart,
  Package,
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

export default function Dashboard() {
  const { business } = useBusiness();
  const { data: stats, isLoading } = useDashboardStats();
  const { data: lowStock } = useLowStockProducts();

  const formatCurrency = (value: number) => {
    const currency = business?.currency || 'USD';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  // Calculate percentage changes
  const calculatePercentageChange = (current: number, previous: number): number => {
    if (previous === 0) return current > 0 ? 100 : 0;
    return ((current - previous) / previous) * 100;
  };

  const todayVsYesterday = stats 
    ? calculatePercentageChange(stats.todaySales, stats.yesterdaySales)
    : 0;

  const monthVsLastMonth = stats
    ? calculatePercentageChange(stats.monthlyRevenue, stats.lastMonthRevenue)
    : 0;

  const ordersVsYesterday = stats
    ? calculatePercentageChange(stats.totalOrders, stats.yesterdayOrders)
    : 0;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Page Header */}
        <div>
          <h1 className="text-2xl font-semibold text-foreground">
            Dashboard
          </h1>
          <p className="text-sm text-muted-foreground">
            Your store's control panel for today. Welcome back to {business?.name || 'your business'}!
          </p>
        </div>

        {/* KPI Cards */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {isLoading ? (
            <>
              {[...Array(4)].map((_, i) => (
                <Skeleton key={i} className="h-28 rounded-lg" />
              ))}
            </>
          ) : (
            <>
              <EnhancedKPICard
                title="Today's Sales"
                value={formatCurrency(stats?.todaySales || 0)}
                comparison={{
                  value: todayVsYesterday,
                  label: "vs yesterday",
                  type: "percentage"
                }}
                icon={DollarSign}
                variant="success"
                tooltip="Total revenue from all sales made today, starting from midnight."
              />
              <EnhancedKPICard
                title="Monthly Revenue"
                value={formatCurrency(stats?.monthlyRevenue || 0)}
                comparison={{
                  value: monthVsLastMonth,
                  label: "vs last month",
                  type: "percentage"
                }}
                icon={TrendingUp}
                tooltip="Total revenue accumulated this calendar month."
              />
              <EnhancedKPICard
                title="Today's Orders"
                value={(stats?.totalOrders || 0).toString()}
                comparison={{
                  value: ordersVsYesterday,
                  label: "vs yesterday",
                  type: "percentage"
                }}
                icon={ShoppingCart}
                tooltip="Number of completed transactions today."
              />
              <EnhancedKPICard
                title="Products"
                value={(stats?.totalProducts || 0).toString()}
                subtitle={`${lowStock?.length || 0} low stock`}
                icon={Package}
                variant={(lowStock?.length || 0) > 0 ? "warning" : "default"}
                tooltip="Total active products in your catalog. Shows count of items below minimum stock level."
              />
            </>
          )}
        </div>

        {/* Quick Actions + Daily Insights */}
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <QuickActions />
          </div>
          <div>
            <DailyInsights />
          </div>
        </div>

        {/* Charts & Analytics */}
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <SalesChart />
          </div>
          <div>
            <TopProducts />
          </div>
        </div>

        {/* Recent Activity */}
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <RecentTransactions />
          </div>
          <div>
            <LowStockAlert />
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
