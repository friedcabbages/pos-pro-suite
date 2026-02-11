import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import {
  UtensilsCrossed,
  LayoutGrid,
  Table,
  ShoppingBag,
  ChefHat,
  Receipt,
  Package,
  BarChart3,
  Boxes,
  Tag,
} from "lucide-react";

export default function FnbDashboard() {
  const menuItems = [
    {
      title: "Floor Plan",
      description: "Manage restaurant layout and table positions",
      href: "/fnb/floor-plan",
      icon: LayoutGrid,
      adminOnly: true,
    },
    {
      title: "Tables & QR",
      description: "Manage tables and generate QR codes",
      href: "/fnb/tables",
      icon: Table,
      adminOnly: true,
    },
    {
      title: "Order Queue",
      description: "Accept and manage incoming orders",
      href: "/fnb/orders",
      icon: ShoppingBag,
    },
    {
      title: "Kitchen Display",
      description: "View and manage kitchen orders",
      href: "/fnb/kds",
      icon: ChefHat,
    },
    {
      title: "Cashier",
      description: "Process payments and close bills",
      href: "/fnb/cashier",
      icon: Receipt,
    },
    {
      title: "Menu",
      description: "Manage menu items and modifiers",
      href: "/fnb/menu",
      icon: Package,
      adminOnly: true,
    },
    {
      title: "Inventory",
      description: "Recipe/BOM and ingredient tracking",
      href: "/fnb/inventory",
      icon: Boxes,
      adminOnly: true,
    },
    {
      title: "Promo & Bundles",
      description: "Manage promotions and product bundles",
      href: "/fnb/promo",
      icon: Tag,
      adminOnly: true,
    },
    {
      title: "Reports",
      description: "Sales, COGS, and performance reports",
      href: "/fnb/reports",
      icon: BarChart3,
      adminOnly: true,
    },
  ];

  return (
    <DashboardLayout>
      <div className="container mx-auto p-6">
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-2">
            <UtensilsCrossed className="h-8 w-8 text-primary" />
            <h1 className="text-3xl font-bold">F&B Dashboard</h1>
          </div>
          <p className="text-muted-foreground">
            Manage your restaurant operations, orders, and menu
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {menuItems.map((item) => (
            <Link key={item.href} to={item.href}>
              <Card className="h-full hover:shadow-lg transition-shadow cursor-pointer">
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-primary/10">
                      <item.icon className="h-5 w-5 text-primary" />
                    </div>
                    <CardTitle className="text-lg">{item.title}</CardTitle>
                  </div>
                  <CardDescription>{item.description}</CardDescription>
                </CardHeader>
              </Card>
            </Link>
          ))}
        </div>
      </div>
    </DashboardLayout>
  );
}
