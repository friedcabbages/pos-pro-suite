import { useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Plus, MapPin, Package, ArrowRightLeft, MoreHorizontal, Loader2 } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useWarehouses, useCreateWarehouse, useDeleteWarehouse } from "@/hooks/useWarehouses";
import { useBusiness } from "@/contexts/BusinessContext";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";

export default function Warehouses() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    address: "",
  });

  const { data: warehouses, isLoading } = useWarehouses();
  const createWarehouse = useCreateWarehouse();
  const deleteWarehouse = useDeleteWarehouse();
  const { branch, business } = useBusiness();
  const { toast } = useToast();

  const handleCreate = () => {
    if (!formData.name.trim()) {
      toast({ title: "Name is required", variant: "destructive" });
      return;
    }
    if (!branch?.id) {
      toast({ title: "No branch selected", variant: "destructive" });
      return;
    }

    createWarehouse.mutate({
      name: formData.name,
      address: formData.address || null,
      branch_id: branch.id,
    }, {
      onSuccess: () => {
        setIsDialogOpen(false);
        setFormData({ name: "", address: "" });
        toast({ title: "Warehouse created" });
      },
      onError: (error: any) => {
        toast({ title: "Failed to create", description: error.message, variant: "destructive" });
      },
    });
  };

  const handleDelete = (id: string) => {
    if (confirm("Are you sure you want to delete this warehouse?")) {
      deleteWarehouse.mutate(id, {
        onSuccess: () => toast({ title: "Warehouse deleted" }),
        onError: (error: any) => toast({ title: "Failed to delete", description: error.message, variant: "destructive" }),
      });
    }
  };

  const formatCurrency = (value: number) => {
    const currency = business?.currency || 'USD';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
      minimumFractionDigits: 0,
    }).format(value);
  };

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
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="glow">
                  <Plus className="mr-2 h-4 w-4" />
                  Add Warehouse
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add Warehouse</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Warehouse Name *</Label>
                    <Input
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="Main Warehouse"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Address</Label>
                    <Input
                      value={formData.address}
                      onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                      placeholder="123 Main Street"
                    />
                  </div>
                  <Button onClick={handleCreate} className="w-full" disabled={createWarehouse.isPending}>
                    {createWarehouse.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Create Warehouse
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Warehouse Cards */}
        {isLoading ? (
          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
            {[...Array(3)].map((_, i) => (
              <Skeleton key={i} className="h-48 rounded-xl" />
            ))}
          </div>
        ) : warehouses?.length === 0 ? (
          <div className="rounded-xl border border-border bg-card p-12 text-center">
            <Package className="mx-auto h-12 w-12 text-muted-foreground/50" />
            <h3 className="mt-4 text-lg font-medium text-foreground">No warehouses</h3>
            <p className="mt-2 text-muted-foreground">Create your first warehouse to start managing inventory</p>
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
            {warehouses?.map((warehouse, index) => {
              const productCount = warehouse.products_count;
              const totalValue = warehouse.total_value;
              const lowStockCount = warehouse.low_stock_count;

              return (
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
                        {warehouse.address && (
                          <div className="flex items-center gap-1 text-sm text-muted-foreground">
                            <MapPin className="h-3 w-3" />
                            {warehouse.address}
                          </div>
                        )}
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
                        <DropdownMenuItem 
                          className="text-destructive"
                          onClick={() => handleDelete(warehouse.id)}
                        >
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>

                  <div className="mt-6 grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-2xl font-bold text-foreground">
                        {productCount}
                      </p>
                      <p className="text-sm text-muted-foreground">Products</p>
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-primary">
                        {formatCurrency(totalValue)}
                      </p>
                      <p className="text-sm text-muted-foreground">Total Value</p>
                    </div>
                  </div>

                  <div className="mt-6 flex items-center justify-between">
                    <Badge variant={warehouse.is_active ? "default" : "secondary"}>
                      {warehouse.is_active ? "active" : "inactive"}
                    </Badge>
                    {lowStockCount > 0 && (
                      <span className="text-sm text-warning">
                        {lowStockCount} low stock items
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
