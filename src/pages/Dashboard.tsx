import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { KPICard } from "@/components/dashboard/KPICard";
import { SalesChart } from "@/components/dashboard/SalesChart";
import { TopProducts } from "@/components/dashboard/TopProducts";
import { RecentTransactions } from "@/components/dashboard/RecentTransactions";
import { LowStockAlert } from "@/components/dashboard/LowStockAlert";
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

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Page Header */}
        <div>
          <h1 className="text-2xl font-semibold text-foreground">
            Dashboard
          </h1>
          <p className="text-sm text-muted-foreground">
            Welcome back! Here's what's happening with {business?.name || 'your business'}.
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
              <KPICard
                title="Today's Sales"
                value={formatCurrency(stats?.todaySales || 0)}
                change={0}
                changeLabel="today's revenue"
                icon={DollarSign}
                variant="success"
              />
              <KPICard
                title="Monthly Revenue"
                value={formatCurrency(stats?.monthlyRevenue || 0)}
                change={8.2}
                changeLabel="vs last month"
                icon={TrendingUp}
              />
              <KPICard
                title="Today's Orders"
                value={(stats?.totalOrders || 0).toString()}
                change={0}
                changeLabel="transactions"
                icon={ShoppingCart}
              />
              <KPICard
                title="Products"
                value={(stats?.totalProducts || 0).toString()}
                change={lowStock?.length || 0}
                changeLabel="low stock"
                icon={Package}
              />
            </>
          )}
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
