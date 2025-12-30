import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { KPICard } from "@/components/dashboard/KPICard";
import { SalesChart } from "@/components/dashboard/SalesChart";
import { TopProducts } from "@/components/dashboard/TopProducts";
import { RecentTransactions } from "@/components/dashboard/RecentTransactions";
import { LowStockAlert } from "@/components/dashboard/LowStockAlert";
import { useDashboard } from "@/hooks/useDashboard";
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
  const { dailySales, lowStock, productMargins, isLoading } = useDashboard();

  // Calculate KPIs from daily sales
  const todaySales = dailySales?.[0]?.total_revenue || 0;
  const todayTransactions = dailySales?.[0]?.total_transactions || 0;
  const monthlyRevenue = dailySales?.reduce((sum, d) => sum + (d.total_revenue || 0), 0) || 0;
  const totalProducts = productMargins?.length || 0;

  // Calculate change percentages (simplified - compare to previous period)
  const yesterdaySales = dailySales?.[1]?.total_revenue || 0;
  const salesChange = yesterdaySales > 0 
    ? ((todaySales - yesterdaySales) / yesterdaySales) * 100 
    : 0;

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
        <div className="animate-fade-in">
          <h1 className="text-3xl font-bold tracking-tight text-foreground">
            Dashboard
          </h1>
          <p className="mt-1 text-muted-foreground">
            Welcome back! Here's what's happening with {business?.name || 'your business'}.
          </p>
        </div>

        {/* KPI Cards */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {isLoading ? (
            <>
              {[...Array(4)].map((_, i) => (
                <Skeleton key={i} className="h-32 rounded-xl" />
              ))}
            </>
          ) : (
            <>
              <KPICard
                title="Today's Sales"
                value={formatCurrency(todaySales)}
                change={salesChange}
                changeLabel="vs yesterday"
                icon={DollarSign}
                variant="success"
                delay={0}
              />
              <KPICard
                title="Monthly Revenue"
                value={formatCurrency(monthlyRevenue)}
                change={8.2}
                changeLabel="vs last month"
                icon={TrendingUp}
                delay={50}
              />
              <KPICard
                title="Today's Orders"
                value={todayTransactions.toString()}
                change={0}
                changeLabel="transactions"
                icon={ShoppingCart}
                delay={100}
              />
              <KPICard
                title="Products"
                value={totalProducts.toString()}
                change={lowStock?.length || 0}
                changeLabel="low stock"
                icon={Package}
                delay={150}
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
