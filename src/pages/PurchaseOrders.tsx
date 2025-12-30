import { useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Plus,
  Search,
  MoreHorizontal,
  Eye,
  CheckCircle,
  XCircle,
  Loader2,
  Package,
} from "lucide-react";
import { usePurchaseOrders, useCreatePurchaseOrder, useReceivePurchaseOrder } from "@/hooks/usePurchaseOrders";
import { useSuppliers } from "@/hooks/useSuppliers";
import { useProducts } from "@/hooks/useProducts";
import { useBusiness } from "@/contexts/BusinessContext";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

const statusStyles: Record<string, string> = {
  draft: "bg-muted text-muted-foreground",
  ordered: "bg-warning/10 text-warning",
  received: "bg-success/10 text-success",
  cancelled: "bg-destructive/10 text-destructive",
};

export default function PurchaseOrders() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    supplier_id: "",
    notes: "",
    items: [] as { product_id: string; quantity: number; cost_price: number }[],
  });
  const [selectedProduct, setSelectedProduct] = useState("");
  const [itemQuantity, setItemQuantity] = useState(1);
  const [itemCost, setItemCost] = useState(0);

  const { business, branch, warehouse } = useBusiness();
  const { data: purchaseOrders, isLoading } = usePurchaseOrders();
  const { data: suppliers } = useSuppliers();
  const { data: products } = useProducts();
  const createPO = useCreatePurchaseOrder();
  const receivePO = useReceivePurchaseOrder();
  const { toast } = useToast();

  const filteredOrders = purchaseOrders?.filter((po) => {
    const matchesSearch = po.po_number.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === "all" || po.status === statusFilter;
    return matchesSearch && matchesStatus;
  }) || [];

  const addItem = () => {
    if (!selectedProduct || itemQuantity <= 0) {
      toast({ title: "Please select product and quantity", variant: "destructive" });
      return;
    }
    const product = products?.find(p => p.id === selectedProduct);
    if (!product) return;

    setFormData({
      ...formData,
      items: [...formData.items, {
        product_id: selectedProduct,
        quantity: itemQuantity,
        cost_price: itemCost || product.cost_price,
      }],
    });
    setSelectedProduct("");
    setItemQuantity(1);
    setItemCost(0);
  };

  const removeItem = (index: number) => {
    setFormData({
      ...formData,
      items: formData.items.filter((_, i) => i !== index),
    });
  };

  const handleCreate = () => {
    if (!formData.supplier_id || formData.items.length === 0) {
      toast({ title: "Please select supplier and add items", variant: "destructive" });
      return;
    }
    if (!branch?.id || !warehouse?.id) {
      toast({ title: "Please select branch and warehouse", variant: "destructive" });
      return;
    }

    createPO.mutate({
      supplier_id: formData.supplier_id,
      branch_id: branch.id,
      warehouse_id: warehouse.id,
      notes: formData.notes || null,
      items: formData.items,
    }, {
      onSuccess: () => {
        setIsDialogOpen(false);
        setFormData({ supplier_id: "", notes: "", items: [] });
        toast({ title: "Purchase order created" });
      },
      onError: (error: any) => {
        toast({ title: "Failed to create", description: error.message, variant: "destructive" });
      },
    });
  };

  const handleReceive = (id: string) => {
    if (confirm("Mark this order as received? This will update inventory.")) {
      receivePO.mutate(id, {
        onSuccess: () => toast({ title: "Order received and inventory updated" }),
        onError: (error: any) => toast({ title: "Failed to receive", description: error.message, variant: "destructive" }),
      });
    }
  };

  const formatCurrency = (value: number) => {
    const currency = business?.currency || 'USD';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
      minimumFractionDigits: 2,
    }).format(value);
  };

  const totalDraft = purchaseOrders?.filter(po => po.status === 'draft').length || 0;
  const totalOrdered = purchaseOrders?.filter(po => po.status === 'ordered').length || 0;
  const totalReceived = purchaseOrders?.filter(po => po.status === 'received').length || 0;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground">
              Purchase Orders
            </h1>
            <p className="mt-1 text-muted-foreground">
              Manage orders from suppliers
            </p>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="glow">
                <Plus className="mr-2 h-4 w-4" />
                New Order
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Create Purchase Order</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Supplier *</Label>
                  <Select value={formData.supplier_id} onValueChange={(v) => setFormData({ ...formData, supplier_id: v })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select supplier" />
                    </SelectTrigger>
                    <SelectContent>
                      {suppliers?.filter(s => s.is_active).map((s) => (
                        <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Notes</Label>
                  <Input
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    placeholder="Additional notes..."
                  />
                </div>

                {/* Add Items */}
                <div className="border border-border rounded-lg p-4 space-y-4">
                  <Label>Add Products</Label>
                  <div className="grid grid-cols-4 gap-2">
                    <Select value={selectedProduct} onValueChange={setSelectedProduct}>
                      <SelectTrigger className="col-span-2">
                        <SelectValue placeholder="Select product" />
                      </SelectTrigger>
                      <SelectContent>
                        {products?.filter(p => p.is_active).map((p) => (
                          <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Input
                      type="number"
                      min="1"
                      value={itemQuantity}
                      onChange={(e) => setItemQuantity(Number(e.target.value))}
                      placeholder="Qty"
                    />
                    <Button type="button" onClick={addItem} variant="secondary">
                      Add
                    </Button>
                  </div>

                  {/* Items List */}
                  {formData.items.length > 0 && (
                    <div className="space-y-2">
                      {formData.items.map((item, index) => {
                        const product = products?.find(p => p.id === item.product_id);
                        return (
                          <div key={index} className="flex items-center justify-between p-2 bg-secondary rounded-lg">
                            <div>
                              <span className="font-medium">{product?.name}</span>
                              <span className="text-muted-foreground ml-2">x{item.quantity}</span>
                              <span className="text-muted-foreground ml-2">@ {formatCurrency(item.cost_price)}</span>
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => removeItem(index)}
                              className="text-destructive"
                            >
                              Remove
                            </Button>
                          </div>
                        );
                      })}
                      <div className="text-right font-semibold">
                        Total: {formatCurrency(formData.items.reduce((sum, i) => sum + i.quantity * i.cost_price, 0))}
                      </div>
                    </div>
                  )}
                </div>

                <Button onClick={handleCreate} className="w-full" disabled={createPO.isPending}>
                  {createPO.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Create Purchase Order
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Summary */}
        <div className="grid gap-4 sm:grid-cols-4">
          <div className="rounded-xl border border-border bg-card p-4 shadow-card">
            <p className="text-sm text-muted-foreground">Total Orders</p>
            <p className="mt-1 text-2xl font-bold text-foreground">
              {isLoading ? <Skeleton className="h-8 w-16" /> : purchaseOrders?.length || 0}
            </p>
          </div>
          <div className="rounded-xl border border-border bg-card p-4 shadow-card">
            <p className="text-sm text-muted-foreground">Draft</p>
            <p className="mt-1 text-2xl font-bold text-muted-foreground">
              {isLoading ? <Skeleton className="h-8 w-16" /> : totalDraft}
            </p>
          </div>
          <div className="rounded-xl border border-border bg-card p-4 shadow-card">
            <p className="text-sm text-muted-foreground">Ordered</p>
            <p className="mt-1 text-2xl font-bold text-warning">
              {isLoading ? <Skeleton className="h-8 w-16" /> : totalOrdered}
            </p>
          </div>
          <div className="rounded-xl border border-border bg-card p-4 shadow-card">
            <p className="text-sm text-muted-foreground">Received</p>
            <p className="mt-1 text-2xl font-bold text-success">
              {isLoading ? <Skeleton className="h-8 w-16" /> : totalReceived}
            </p>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-col gap-4 rounded-xl border border-border bg-card p-4 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search by PO number..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="draft">Draft</SelectItem>
              <SelectItem value="ordered">Ordered</SelectItem>
              <SelectItem value="received">Received</SelectItem>
              <SelectItem value="cancelled">Cancelled</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Table */}
        <div className="rounded-xl border border-border bg-card shadow-card">
          {isLoading ? (
            <div className="p-6 space-y-4">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>PO Number</TableHead>
                  <TableHead>Supplier</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead className="text-right">Items</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-12"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredOrders.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      No purchase orders found
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredOrders.map((po) => {
                    const supplier = suppliers?.find(s => s.id === po.supplier_id);
                    return (
                      <TableRow key={po.id} className="group">
                        <TableCell className="font-mono text-sm font-medium text-foreground">
                          {po.po_number}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Package className="h-4 w-4 text-muted-foreground" />
                            {supplier?.name || "Unknown"}
                          </div>
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {format(new Date(po.created_at), "MMM d, yyyy")}
                        </TableCell>
                        <TableCell className="text-right">
                          {po.items?.length || 0}
                        </TableCell>
                        <TableCell className="text-right font-semibold">
                          {formatCurrency(po.total_cost)}
                        </TableCell>
                        <TableCell>
                          <Badge className={statusStyles[po.status]}>
                            {po.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="opacity-0 group-hover:opacity-100"
                              >
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem>
                                <Eye className="mr-2 h-4 w-4" />
                                View Details
                              </DropdownMenuItem>
                              {po.status === 'ordered' && (
                                <DropdownMenuItem onClick={() => handleReceive(po.id)}>
                                  <CheckCircle className="mr-2 h-4 w-4" />
                                  Mark Received
                                </DropdownMenuItem>
                              )}
                              {po.status === 'draft' && (
                                <DropdownMenuItem className="text-destructive">
                                  <XCircle className="mr-2 h-4 w-4" />
                                  Cancel Order
                                </DropdownMenuItem>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
