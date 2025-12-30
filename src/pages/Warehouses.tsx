import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, MapPin, Package, ArrowRightLeft, MoreHorizontal } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const warehouses = [
  {
    id: "1",
    name: "Main Warehouse",
    location: "Jakarta, Indonesia",
    products: 524,
    totalValue: "$125,420",
    status: "active",
    lowStock: 12,
  },
  {
    id: "2",
    name: "Branch Store - Surabaya",
    location: "Surabaya, Indonesia",
    products: 312,
    totalValue: "$78,250",
    status: "active",
    lowStock: 5,
  },
  {
    id: "3",
    name: "Distribution Center",
    location: "Bandung, Indonesia",
    products: 856,
    totalValue: "$245,000",
    status: "active",
    lowStock: 23,
  },
  {
    id: "4",
    name: "Cold Storage",
    location: "Jakarta, Indonesia",
    products: 156,
    totalValue: "$45,800",
    status: "maintenance",
    lowStock: 8,
  },
];

export default function Warehouses() {
  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground">
              Warehouses
            </h1>
            <p className="mt-1 text-muted-foreground">
              Manage your warehouses and stock distribution
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline">
              <ArrowRightLeft className="mr-2 h-4 w-4" />
              Transfer Stock
            </Button>
            <Button variant="glow">
              <Plus className="mr-2 h-4 w-4" />
              Add Warehouse
            </Button>
          </div>
        </div>

        {/* Warehouse Cards */}
        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {warehouses.map((warehouse, index) => (
            <div
              key={warehouse.id}
              className="group rounded-xl border border-border bg-card p-6 shadow-card transition-all duration-300 hover:shadow-elevated animate-slide-up"
              style={{ animationDelay: `${index * 100}ms` }}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
                    <Package className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground">
                      {warehouse.name}
                    </h3>
                    <div className="flex items-center gap-1 text-sm text-muted-foreground">
                      <MapPin className="h-3 w-3" />
                      {warehouse.location}
                    </div>
                  </div>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="opacity-0 group-hover:opacity-100">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem>View Details</DropdownMenuItem>
                    <DropdownMenuItem>Edit Warehouse</DropdownMenuItem>
                    <DropdownMenuItem>Transfer Stock</DropdownMenuItem>
                    <DropdownMenuItem className="text-destructive">Delete</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              <div className="mt-6 grid grid-cols-2 gap-4">
                <div>
                  <p className="text-2xl font-bold text-foreground">
                    {warehouse.products}
                  </p>
                  <p className="text-sm text-muted-foreground">Products</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-primary">
                    {warehouse.totalValue}
                  </p>
                  <p className="text-sm text-muted-foreground">Total Value</p>
                </div>
              </div>

              <div className="mt-6 flex items-center justify-between">
                <Badge
                  variant={warehouse.status === "active" ? "default" : "secondary"}
                >
                  {warehouse.status}
                </Badge>
                {warehouse.lowStock > 0 && (
                  <span className="text-sm text-warning">
                    {warehouse.lowStock} low stock items
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </DashboardLayout>
  );
}
