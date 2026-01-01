import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { useBusiness } from "@/contexts/BusinessContext";
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
} from "lucide-react";
import { Button } from "@/components/ui/button";

type NavItem = {
  name: string;
  href: string;
  icon: typeof LayoutDashboard;
  adminOnly?: boolean;
  ownerOnly?: boolean;
};

const navigation: NavItem[] = [
  { name: "Dashboard", href: "/", icon: LayoutDashboard },
  { name: "POS / Cashier", href: "/pos", icon: ShoppingCart },
  { name: "Products", href: "/products", icon: Package },
  { name: "Categories", href: "/categories", icon: Tag, adminOnly: true },
  { name: "Inventory", href: "/inventory", icon: Boxes, adminOnly: true },
  { name: "Suppliers", href: "/suppliers", icon: Truck, adminOnly: true },
  { name: "Purchase Orders", href: "/purchase-orders", icon: ClipboardList, adminOnly: true },
  { name: "Warehouses", href: "/warehouses", icon: Warehouse, adminOnly: true },
  { name: "Transactions", href: "/transactions", icon: Receipt, adminOnly: true },
  { name: "Expenses", href: "/expenses", icon: DollarSign, adminOnly: true },
  { name: "Reports", href: "/reports", icon: TrendingUp, adminOnly: true },
  { name: "Audit Logs", href: "/audit-logs", icon: FileText, adminOnly: true },
  { name: "Users", href: "/users", icon: Users, ownerOnly: true },
  { name: "Settings", href: "/settings", icon: Settings, ownerOnly: true },
];

export function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const { clearBusiness, userRole, isAdmin, isOwner, isCashier } = useBusiness();

  const handleLogout = async () => {
    setLoggingOut(true);
    try {
      clearBusiness();
      await signOut();
      navigate("/auth", { replace: true });
    } catch (error) {
      console.error('[Sidebar] Logout error:', error);
    } finally {
      setLoggingOut(false);
    }
  };

  // Get user initials
  const getUserInitials = () => {
    const email = user?.email || "";
    return email.substring(0, 2).toUpperCase();
  };

  // Filter navigation based on user role
  const filteredNavigation = navigation.filter((item) => {
    if (item.ownerOnly && !isOwner) return false;
    if (item.adminOnly && !isAdmin && !isOwner) return false;
    return true;
  });

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
            {filteredNavigation.map((item) => {
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
            })}
          </div>
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
