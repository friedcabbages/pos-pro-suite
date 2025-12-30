import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { KPICard } from "@/components/dashboard/KPICard";
import { SalesChart } from "@/components/dashboard/SalesChart";
import { TopProducts } from "@/components/dashboard/TopProducts";
import { RecentTransactions } from "@/components/dashboard/RecentTransactions";
import { LowStockAlert } from "@/components/dashboard/LowStockAlert";
import {
  DollarSign,
  TrendingUp,
  ShoppingCart,
  Package,
} from "lucide-react";

export default function Dashboard() {
  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Page Header */}
        <div className="animate-fade-in">
          <h1 className="text-3xl font-bold tracking-tight text-foreground">
            Dashboard
          </h1>
          <p className="mt-1 text-muted-foreground">
            Welcome back! Here's what's happening with your business.
          </p>
        </div>

        {/* KPI Cards */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <KPICard
            title="Today's Sales"
            value="$12,426"
            change={12.5}
            changeLabel="vs yesterday"
            icon={DollarSign}
            variant="success"
            delay={0}
          />
          <KPICard
            title="Monthly Revenue"
            value="$284,920"
            change={8.2}
            changeLabel="vs last month"
            icon={TrendingUp}
            delay={50}
          />
          <KPICard
            title="Total Orders"
            value="1,248"
            change={-2.4}
            changeLabel="vs yesterday"
            icon={ShoppingCart}
            delay={100}
          />
          <KPICard
            title="Products"
            value="856"
            change={3}
            changeLabel="new this week"
            icon={Package}
            delay={150}
          />
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
