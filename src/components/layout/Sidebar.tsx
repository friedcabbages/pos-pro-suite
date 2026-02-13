import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { useBusiness } from "@/contexts/BusinessContext";
import { usePlanAccess } from "@/hooks/usePlanAccess";
import type { PlanFeatureKey } from "@/lib/plan";
import {
  LayoutDashboard,
  ShoppingCart,
  Package,
  Warehouse,
  Receipt,
  TrendingUp,
  Settings,
  ChevronLeft,
  ChevronRight,
  LogOut,
  Users,
  DollarSign,
  Truck,
  ClipboardList,
  Boxes,
  FileText,
  Tag,
  Crown,
  UtensilsCrossed,
  LayoutGrid,
  Table,
  ShoppingBag,
  ChefHat,
  BarChart3,
} from "lucide-react";
import { Button } from "@/components/ui/button";

type NavItem = {
  name: string;
  href: string;
  icon: typeof LayoutDashboard;
  adminOnly?: boolean;
  ownerOnly?: boolean;
  featureKey?: PlanFeatureKey;
};

type NavGroups = { main: NavItem[]; account: NavItem[] };

const accountNav: NavItem[] = [
  { name: "Users", href: "/users", icon: Users, ownerOnly: true },
  { name: "Settings", href: "/settings", icon: Settings, ownerOnly: true },
  { name: "Subscription", href: "/subscription", icon: Crown, ownerOnly: true },
];

// Navigation items per business type (grouped: main + account)
const getNavigationForBusinessType = (businessType: string): NavGroups => {
  switch (businessType) {
    case "retail":
      return {
        main: [
          // Overview
          { name: "Dashboard", href: "/app", icon: LayoutDashboard },
          // Operations
          { name: "POS / Cashier", href: "/retail/pos", icon: ShoppingCart },
          { name: "Transactions", href: "/retail/transactions", icon: Receipt, adminOnly: true },
          // Catalog
          { name: "Products", href: "/retail/products", icon: Package },
          { name: "Categories", href: "/retail/categories", icon: Tag, adminOnly: true },
          // Inventory & Supply
          { name: "Inventory", href: "/retail/inventory", icon: Boxes, adminOnly: true },
          { name: "Suppliers", href: "/retail/suppliers", icon: Truck, adminOnly: true },
          {
            name: "Purchase Orders",
            href: "/retail/purchase-orders",
            icon: ClipboardList,
            adminOnly: true,
            featureKey: "purchase_orders",
          },
          { name: "Warehouses", href: "/retail/warehouses", icon: Warehouse, adminOnly: true },
          // Finance & Insights
          { name: "Expenses", href: "/retail/expenses", icon: DollarSign, adminOnly: true, featureKey: "expenses" },
          { name: "Reports", href: "/retail/reports", icon: TrendingUp, adminOnly: true },
          // Compliance
          {
            name: "Audit Logs",
            href: "/retail/audit-logs",
            icon: FileText,
            adminOnly: true,
            featureKey: "audit_logs_full",
          },
          { name: "Activity", href: "/activity", icon: FileText, adminOnly: true },
        ],
        account: accountNav,
      };

    case "fnb":
      return {
        main: [
          // Overview
          { name: "Dashboard", href: "/app", icon: LayoutDashboard },
          { name: "F&B Dashboard", href: "/fnb/dashboard", icon: UtensilsCrossed },
          // Operations
          { name: "Floor Plan", href: "/fnb/floor-plan", icon: LayoutGrid, adminOnly: true },
          { name: "Tables & QR", href: "/fnb/tables", icon: Table, adminOnly: true },
          { name: "Order Queue", href: "/fnb/orders", icon: ShoppingBag },
          { name: "Kitchen Display", href: "/fnb/kds", icon: ChefHat },
          { name: "Cashier", href: "/fnb/cashier", icon: Receipt },
          // Catalog
          { name: "Menu", href: "/fnb/menu", icon: Package, adminOnly: true },
          // Inventory & Supply
          { name: "Inventory (BOM)", href: "/fnb/inventory", icon: Boxes, adminOnly: true },
          // Finance & Insights
          { name: "Promo & Bundles", href: "/fnb/promo", icon: Tag, adminOnly: true },
          { name: "Reports", href: "/fnb/reports", icon: BarChart3, adminOnly: true },
          // Compliance
          { name: "Activity", href: "/activity", icon: FileText, adminOnly: true },
        ],
        account: accountNav,
      };

    default:
      return {
        main: [{ name: "Dashboard", href: "/app", icon: LayoutDashboard }],
        account: accountNav,
      };
  }
};

export function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const location = useLocation();
  const { user, signOut } = useAuth();
  const { clearBusiness, userRole, isAdmin, isOwner, business } = useBusiness();
  const plan = usePlanAccess();

  const handleLogout = async (e?: React.MouseEvent) => {
    e?.preventDefault();
    e?.stopPropagation();
    setLoggingOut(true);
    try {
      // signOut already handles redirect to /auth immediately
      // Don't call clearBusiness() as it might trigger re-renders that cause redirects
      await signOut();
    } catch (error) {
      console.error('[Sidebar] Logout error:', error);
      // Fallback redirect if signOut fails
      window.location.href = "/auth";
    }
    // Don't set loggingOut to false - redirect already happened
  };

  // Get user initials
  const getUserInitials = () => {
    const email = user?.email || "";
    return email.substring(0, 2).toUpperCase();
  };

  // Get navigation based on business type
  const navGroups = business?.business_type
    ? getNavigationForBusinessType(business.business_type)
    : { main: [], account: [] };

  const filterItem = (item: NavItem) => {
    if (item.ownerOnly && !isOwner) return false;
    if (item.adminOnly && !isAdmin && !isOwner) return false;
    if (item.featureKey && !plan.canUse(item.featureKey)) return false;
    return true;
  };

  const filteredMain = navGroups.main.filter(filterItem);
  const filteredAccount = navGroups.account.filter(filterItem);

  const renderNavLink = (item: NavItem) => {
    const isActive = location.pathname === item.href;
    return (
      <Link
        key={item.name}
        to={item.href}
        className={cn(
          "flex items-center gap-2.5 rounded-md px-2.5 py-2 text-sm font-medium transition-colors",
          isActive
            ? "bg-primary/10 text-primary"
            : "text-muted-foreground hover:bg-muted hover:text-foreground"
        )}
      >
        <item.icon className="h-4 w-4 shrink-0" />
        {!collapsed && <span>{item.name}</span>}
      </Link>
    );
  };

  return (
    <aside
      className={cn(
        "fixed left-0 top-0 z-40 h-screen bg-card border-r border-border transition-all duration-200",
        collapsed ? "w-16" : "w-60"
      )}
    >
      <div className="flex h-full flex-col">
        {/* Logo */}
        <div className="flex h-14 items-center justify-between border-b border-border px-3">
          {!collapsed && (
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary">
                <ShoppingCart className="h-4 w-4 text-primary-foreground" />
              </div>
              <span className="text-base font-semibold text-foreground">
                VeloPOS
              </span>
            </div>
          )}
          {collapsed && (
            <div className="mx-auto flex h-8 w-8 items-center justify-center rounded-md bg-primary">
              <ShoppingCart className="h-4 w-4 text-primary-foreground" />
            </div>
          )}
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-3 px-2">
          <div className="space-y-0.5">
            {filteredMain.map(renderNavLink)}
          </div>
          {filteredAccount.length > 0 && (
            <>
              <div className="mt-4 border-t border-border pt-3">
                {!collapsed && (
                  <p className="mb-2 px-2.5 text-xs font-medium text-muted-foreground">Account</p>
                )}
                <div className="space-y-0.5">
                  {filteredAccount.map(renderNavLink)}
                </div>
              </div>
            </>
          )}
        </nav>

        {/* User section */}
        <div className="border-t border-border p-3">
          {!collapsed && (
            <div className="mb-2 flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted text-xs font-medium text-muted-foreground">
                {getUserInitials()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground truncate">
                  {user?.email?.split('@')[0] || 'User'}
                </p>
                <p className="text-xs text-muted-foreground capitalize">
                  {userRole?.role || 'User'}
                </p>
              </div>
            </div>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={handleLogout}
            disabled={loggingOut}
            className={cn(
              "w-full justify-start text-muted-foreground hover:text-foreground",
              collapsed && "justify-center px-0"
            )}
          >
            <LogOut className="h-4 w-4" />
            {!collapsed && <span className="ml-2">{loggingOut ? 'Logging out...' : 'Logout'}</span>}
          </Button>
        </div>

        {/* Collapse toggle */}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="absolute -right-3 top-16 flex h-6 w-6 items-center justify-center rounded-full border border-border bg-card text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          {collapsed ? (
            <ChevronRight className="h-3 w-3" />
          ) : (
            <ChevronLeft className="h-3 w-3" />
          )}
        </button>
      </div>
    </aside>
  );
}
