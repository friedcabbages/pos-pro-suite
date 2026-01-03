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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Plus, MapPin, Package, ArrowRightLeft, MoreHorizontal, Loader2, Eye, Edit, Trash2 } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Switch } from "@/components/ui/switch";
import { useWarehouses, useCreateWarehouse, useDeleteWarehouse, useUpdateWarehouse } from "@/hooks/useWarehouses";
import { useProducts } from "@/hooks/useProducts";
import { useTransferStock } from "@/hooks/useInventory";
import { useBusiness } from "@/contexts/BusinessContext";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";

// Hook to get available stock for a product in a specific warehouse
function useAvailableStock(productId: string, warehouseId: string) {
  return useQuery({
    queryKey: ['available-stock', productId, warehouseId],
    queryFn: async () => {
      if (!productId || !warehouseId) return 0;
      
      const { data } = await supabase
        .from('inventory')
        .select('quantity')
        .eq('product_id', productId)
        .eq('warehouse_id', warehouseId)
        .maybeSingle();
      
      return data?.quantity || 0;
    },
    enabled: !!productId && !!warehouseId
  });
}

interface WarehouseWithStats {
  id: string;
  branch_id: string;
  name: string;
  address: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  products_count: number;
  total_value: number;
  low_stock_count: number;
  branch?: { id: string; name: string; business_id: string };
}

export default function Warehouses() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isViewOpen, setIsViewOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isTransferOpen, setIsTransferOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [selectedWarehouse, setSelectedWarehouse] = useState<WarehouseWithStats | null>(null);
  
  const [formData, setFormData] = useState({
    name: "",
    address: "",
  });
  
  const [editData, setEditData] = useState({
    name: "",
    address: "",
    is_active: true,
  });

  // Transfer state
  const [selectedProduct, setSelectedProduct] = useState("");
  const [transferQty, setTransferQty] = useState(1);
  const [fromWarehouse, setFromWarehouse] = useState("");
  const [toWarehouse, setToWarehouse] = useState("");
  const [transferNotes, setTransferNotes] = useState("");

  const { data: warehouses, isLoading } = useWarehouses();
  const { data: products } = useProducts();
  const createWarehouse = useCreateWarehouse();
  const updateWarehouse = useUpdateWarehouse();
  const deleteWarehouse = useDeleteWarehouse();
  const transferStock = useTransferStock();
  const { branch, business } = useBusiness();
  const { toast } = useToast();

  // Get available stock for transfer dialog
  const { data: transferAvailableStock } = useAvailableStock(selectedProduct, fromWarehouse);

  const selectedProductUnit = products?.find(p => p.id === selectedProduct)?.unit || 'pcs';

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
      address: formData.address || undefined,
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

  const handleEdit = (warehouse: WarehouseWithStats) => {
    setSelectedWarehouse(warehouse);
    setEditData({
      name: warehouse.name,
      address: warehouse.address || "",
      is_active: warehouse.is_active,
    });
    setIsEditOpen(true);
  };

  const handleSaveEdit = () => {
    if (!selectedWarehouse) return;
    if (!editData.name.trim()) {
      toast({ title: "Name is required", variant: "destructive" });
      return;
    }

    updateWarehouse.mutate({
      id: selectedWarehouse.id,
      name: editData.name,
      address: editData.address || null,
      is_active: editData.is_active,
    }, {
      onSuccess: () => {
        setIsEditOpen(false);
        setSelectedWarehouse(null);
        toast({ title: "Warehouse updated" });
      },
      onError: (error: any) => {
        toast({ title: "Failed to update", description: error.message, variant: "destructive" });
      },
    });
  };

  const handleViewDetails = (warehouse: WarehouseWithStats) => {
    setSelectedWarehouse(warehouse);
    setIsViewOpen(true);
  };

  const handleOpenTransfer = (warehouse?: WarehouseWithStats) => {
    if (warehouse) {
      setFromWarehouse(warehouse.id);
    } else {
      setFromWarehouse("");
    }
    setSelectedProduct("");
    setToWarehouse("");
    setTransferQty(1);
    setTransferNotes("");
    setIsTransferOpen(true);
  };

  const handleTransfer = () => {
    if (!selectedProduct || !fromWarehouse || !toWarehouse) {
      toast({ title: "Fill all required fields", variant: "destructive" });
      return;
    }
    if (fromWarehouse === toWarehouse) {
      toast({ title: "Cannot transfer to same warehouse", variant: "destructive" });
      return;
    }
    if (transferQty <= 0) {
      toast({ title: "Quantity must be greater than 0", variant: "destructive" });
      return;
    }
    if (transferQty > (transferAvailableStock || 0)) {
      toast({ title: `Insufficient stock. Available: ${transferAvailableStock}`, variant: "destructive" });
      return;
    }

    transferStock.mutate({
      product_id: selectedProduct,
      from_warehouse_id: fromWarehouse,
      to_warehouse_id: toWarehouse,
      quantity: transferQty,
      notes: transferNotes
    }, {
      onSuccess: () => {
        setIsTransferOpen(false);
        setSelectedProduct("");
        setFromWarehouse("");
        setToWarehouse("");
        setTransferQty(1);
        setTransferNotes("");
      }
    });
  };

  const handleDeleteConfirm = (warehouse: WarehouseWithStats) => {
    setSelectedWarehouse(warehouse);
    setIsDeleteOpen(true);
  };

  const handleDelete = () => {
    if (!selectedWarehouse) return;
    
    // Check if warehouse has stock
    if (selectedWarehouse.products_count > 0) {
      toast({ 
        title: "Cannot delete warehouse", 
        description: "This warehouse has inventory. Transfer or remove stock first.",
        variant: "destructive" 
      });
      setIsDeleteOpen(false);
      return;
    }

    deleteWarehouse.mutate(selectedWarehouse.id, {
      onSuccess: () => {
        toast({ title: "Warehouse deleted" });
        setIsDeleteOpen(false);
        setSelectedWarehouse(null);
      },
      onError: (error: any) => {
        toast({ title: "Failed to delete", description: error.message, variant: "destructive" });
      },
    });
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
            <Button variant="outline" onClick={() => handleOpenTransfer()}>
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
                        <DropdownMenuItem onClick={() => handleViewDetails(warehouse)}>
                          <Eye className="mr-2 h-4 w-4" />
                          View Details
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleEdit(warehouse)}>
                          <Edit className="mr-2 h-4 w-4" />
                          Edit Warehouse
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleOpenTransfer(warehouse)}>
                          <ArrowRightLeft className="mr-2 h-4 w-4" />
                          Transfer Stock
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          className="text-destructive"
                          onClick={() => handleDeleteConfirm(warehouse)}
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
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

        {/* View Details Dialog */}
        <Dialog open={isViewOpen} onOpenChange={setIsViewOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Warehouse Details</DialogTitle>
            </DialogHeader>
            {selectedWarehouse && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-muted-foreground">Name</Label>
                    <p className="font-medium">{selectedWarehouse.name}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Status</Label>
                    <p>
                      <Badge variant={selectedWarehouse.is_active ? "default" : "secondary"}>
                        {selectedWarehouse.is_active ? "Active" : "Inactive"}
                      </Badge>
                    </p>
                  </div>
                </div>
                
                {selectedWarehouse.address && (
                  <div>
                    <Label className="text-muted-foreground">Address</Label>
                    <p className="font-medium">{selectedWarehouse.address}</p>
                  </div>
                )}

                <div className="grid grid-cols-3 gap-4 pt-4 border-t border-border">
                  <div className="text-center">
                    <p className="text-2xl font-bold text-foreground">{selectedWarehouse.products_count}</p>
                    <p className="text-sm text-muted-foreground">Products</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-primary">{formatCurrency(selectedWarehouse.total_value)}</p>
                    <p className="text-sm text-muted-foreground">Total Value</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-warning">{selectedWarehouse.low_stock_count}</p>
                    <p className="text-sm text-muted-foreground">Low Stock</p>
                  </div>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Edit Dialog */}
        <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit Warehouse</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Warehouse Name *</Label>
                <Input
                  value={editData.name}
                  onChange={(e) => setEditData({ ...editData, name: e.target.value })}
                  placeholder="Warehouse name"
                />
              </div>
              <div className="space-y-2">
                <Label>Address</Label>
                <Input
                  value={editData.address}
                  onChange={(e) => setEditData({ ...editData, address: e.target.value })}
                  placeholder="Address"
                />
              </div>
              <div className="flex items-center justify-between">
                <Label>Active Status</Label>
                <Switch
                  checked={editData.is_active}
                  onCheckedChange={(checked) => setEditData({ ...editData, is_active: checked })}
                />
              </div>
              <Button onClick={handleSaveEdit} className="w-full" disabled={updateWarehouse.isPending}>
                {updateWarehouse.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Save Changes
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Transfer Stock Dialog */}
        <Dialog open={isTransferOpen} onOpenChange={(open) => {
          setIsTransferOpen(open);
          if (!open) {
            setSelectedProduct("");
            setFromWarehouse("");
            setToWarehouse("");
            setTransferQty(1);
            setTransferNotes("");
          }
        }}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Transfer Stock Between Warehouses</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Product *</Label>
                <Select value={selectedProduct} onValueChange={(v) => {
                  setSelectedProduct(v);
                  setTransferQty(1);
                }}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select product" />
                  </SelectTrigger>
                  <SelectContent>
                    {products?.map((p) => (
                      <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>From Warehouse *</Label>
                  <Select value={fromWarehouse} onValueChange={(v) => {
                    setFromWarehouse(v);
                    if (v === toWarehouse) setToWarehouse("");
                    setTransferQty(1);
                  }}>
                    <SelectTrigger>
                      <SelectValue placeholder="Source" />
                    </SelectTrigger>
                    <SelectContent>
                      {warehouses?.map((w) => (
                        <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>To Warehouse *</Label>
                  <Select value={toWarehouse} onValueChange={setToWarehouse}>
                    <SelectTrigger>
                      <SelectValue placeholder="Destination" />
                    </SelectTrigger>
                    <SelectContent>
                      {warehouses?.filter(w => w.id !== fromWarehouse).map((w) => (
                        <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              {/* Available Stock Display */}
              {selectedProduct && fromWarehouse && (
                <div className="rounded-lg bg-muted/50 p-3 border border-border">
                  <p className="text-sm text-muted-foreground">
                    Available in source: <span className="font-semibold text-foreground">{transferAvailableStock || 0} {selectedProductUnit}</span>
                  </p>
                </div>
              )}
              
              <div className="space-y-2">
                <Label>Quantity *</Label>
                <Input
                  type="number"
                  min="1"
                  max={transferAvailableStock || undefined}
                  value={transferQty}
                  onChange={(e) => setTransferQty(Number(e.target.value))}
                />
                {transferQty > (transferAvailableStock || 0) && selectedProduct && fromWarehouse && (
                  <p className="text-xs text-destructive">
                    Exceeds available stock
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label>Notes</Label>
                <Input
                  value={transferNotes}
                  onChange={(e) => setTransferNotes(e.target.value)}
                  placeholder="Reason for transfer..."
                />
              </div>
              <Button 
                onClick={handleTransfer} 
                className="w-full" 
                disabled={transferStock.isPending || transferQty > (transferAvailableStock || 0) || transferQty <= 0}
              >
                {transferStock.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Transfer Stock
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation Dialog */}
        <AlertDialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Warehouse</AlertDialogTitle>
              <AlertDialogDescription>
                {selectedWarehouse?.products_count && selectedWarehouse.products_count > 0 ? (
                  <>
                    This warehouse has <strong>{selectedWarehouse.products_count} products</strong> with inventory.
                    You must transfer or remove all stock before deleting this warehouse.
                  </>
                ) : (
                  <>
                    Are you sure you want to delete <strong>{selectedWarehouse?.name}</strong>? 
                    This action cannot be undone.
                  </>
                )}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction 
                onClick={handleDelete}
                disabled={selectedWarehouse?.products_count ? selectedWarehouse.products_count > 0 : false}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                {deleteWarehouse.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </DashboardLayout>
  );
}
