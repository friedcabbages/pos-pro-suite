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
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Search,
  Plus,
  Minus,
  ArrowRightLeft,
  History,
  Loader2,
  Package,
  AlertTriangle,
} from "lucide-react";
import { useInventory, useInventoryLogs, useAdjustStock, useTransferStock } from "@/hooks/useInventory";
import { useProducts } from "@/hooks/useProducts";
import { useWarehouses } from "@/hooks/useWarehouses";
import { useBusiness } from "@/contexts/BusinessContext";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

const actionStyles: Record<string, string> = {
  stock_in: "bg-success/10 text-success",
  stock_out: "bg-destructive/10 text-destructive",
  adjustment: "bg-warning/10 text-warning",
  transfer: "bg-primary/10 text-primary",
  po_receive: "bg-success/10 text-success",
  sale: "bg-destructive/10 text-destructive",
};

export default function Inventory() {
  const [search, setSearch] = useState("");
  const [isAdjustOpen, setIsAdjustOpen] = useState(false);
  const [isTransferOpen, setIsTransferOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState("");
  const [adjustmentQty, setAdjustmentQty] = useState(0);
  const [adjustmentReason, setAdjustmentReason] = useState("");
  const [transferQty, setTransferQty] = useState(1);
  const [fromWarehouse, setFromWarehouse] = useState("");
  const [toWarehouse, setToWarehouse] = useState("");
  const [transferNotes, setTransferNotes] = useState("");

  const { business, warehouse } = useBusiness();
  const { data: inventory, isLoading } = useInventory();
  const { data: logs, isLoading: logsLoading } = useInventoryLogs();
  const { data: products } = useProducts();
  const { data: warehouses } = useWarehouses();
  const adjustStock = useAdjustStock();
  const transferStock = useTransferStock();
  const { toast } = useToast();

  const filteredInventory = inventory?.filter((inv) => {
    const product = inv.product;
    if (!product) return false;
    return (
      product.name.toLowerCase().includes(search.toLowerCase()) ||
      (product.sku?.toLowerCase().includes(search.toLowerCase()) ?? false)
    );
  }) || [];

  const lowStockItems = filteredInventory.filter((inv) => {
    const product = inv.product;
    if (!product) return false;
    return inv.quantity <= (product.min_stock || 0);
  });

  const handleAdjust = () => {
    if (!selectedProduct || !warehouse?.id) {
      toast({ title: "Select product and warehouse", variant: "destructive" });
      return;
    }
    if (adjustmentQty === 0) {
      toast({ title: "Adjustment cannot be zero", variant: "destructive" });
      return;
    }

    adjustStock.mutate({
      product_id: selectedProduct,
      warehouse_id: warehouse.id,
      adjustment: adjustmentQty,
      reason: adjustmentReason || "Manual adjustment"
    }, {
      onSuccess: () => {
        setIsAdjustOpen(false);
        setSelectedProduct("");
        setAdjustmentQty(0);
        setAdjustmentReason("");
      }
    });
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

  const formatCurrency = (value: number) => {
    const currency = business?.currency || 'USD';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
      minimumFractionDigits: 0,
    }).format(value);
  };

  const totalValue = filteredInventory.reduce((sum, inv) => {
    const product = inv.product;
    if (!product) return sum;
    return sum + (inv.quantity * product.cost_price);
  }, 0);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground">
              Inventory
            </h1>
            <p className="mt-1 text-muted-foreground">
              Manage stock levels, adjustments, and transfers
            </p>
          </div>
          <div className="flex gap-2">
            <Dialog open={isTransferOpen} onOpenChange={setIsTransferOpen}>
              <DialogTrigger asChild>
                <Button variant="outline">
                  <ArrowRightLeft className="mr-2 h-4 w-4" />
                  Transfer Stock
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Transfer Stock Between Warehouses</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Product *</Label>
                    <Select value={selectedProduct} onValueChange={setSelectedProduct}>
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
                      <Select value={fromWarehouse} onValueChange={setFromWarehouse}>
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
                  <div className="space-y-2">
                    <Label>Quantity *</Label>
                    <Input
                      type="number"
                      min="1"
                      value={transferQty}
                      onChange={(e) => setTransferQty(Number(e.target.value))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Notes</Label>
                    <Input
                      value={transferNotes}
                      onChange={(e) => setTransferNotes(e.target.value)}
                      placeholder="Reason for transfer..."
                    />
                  </div>
                  <Button onClick={handleTransfer} className="w-full" disabled={transferStock.isPending}>
                    {transferStock.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Transfer Stock
                  </Button>
                </div>
              </DialogContent>
            </Dialog>

            <Dialog open={isAdjustOpen} onOpenChange={setIsAdjustOpen}>
              <DialogTrigger asChild>
                <Button variant="glow">
                  <Plus className="mr-2 h-4 w-4" />
                  Adjust Stock
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Stock Adjustment</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Product *</Label>
                    <Select value={selectedProduct} onValueChange={setSelectedProduct}>
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
                  <div className="space-y-2">
                    <Label>Adjustment (+ or -)</Label>
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        onClick={() => setAdjustmentQty(prev => prev - 1)}
                      >
                        <Minus className="h-4 w-4" />
                      </Button>
                      <Input
                        type="number"
                        value={adjustmentQty}
                        onChange={(e) => setAdjustmentQty(Number(e.target.value))}
                        className="text-center"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        onClick={() => setAdjustmentQty(prev => prev + 1)}
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Positive = add stock, Negative = remove stock
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label>Reason *</Label>
                    <Input
                      value={adjustmentReason}
                      onChange={(e) => setAdjustmentReason(e.target.value)}
                      placeholder="Reason for adjustment..."
                    />
                  </div>
                  <Button onClick={handleAdjust} className="w-full" disabled={adjustStock.isPending}>
                    {adjustStock.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Apply Adjustment
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid gap-4 sm:grid-cols-4">
          <div className="rounded-xl border border-border bg-card p-4 shadow-card">
            <p className="text-sm text-muted-foreground">Total Products</p>
            <p className="mt-1 text-2xl font-bold text-foreground">
              {isLoading ? <Skeleton className="h-8 w-16" /> : filteredInventory.length}
            </p>
          </div>
          <div className="rounded-xl border border-border bg-card p-4 shadow-card">
            <p className="text-sm text-muted-foreground">Total Value</p>
            <p className="mt-1 text-2xl font-bold text-primary">
              {isLoading ? <Skeleton className="h-8 w-24" /> : formatCurrency(totalValue)}
            </p>
          </div>
          <div className="rounded-xl border border-border bg-card p-4 shadow-card">
            <p className="text-sm text-muted-foreground">Low Stock Items</p>
            <p className="mt-1 text-2xl font-bold text-warning">
              {isLoading ? <Skeleton className="h-8 w-16" /> : lowStockItems.length}
            </p>
          </div>
          <div className="rounded-xl border border-border bg-card p-4 shadow-card">
            <p className="text-sm text-muted-foreground">Warehouses</p>
            <p className="mt-1 text-2xl font-bold text-foreground">
              {warehouses?.length || 0}
            </p>
          </div>
        </div>

        <Tabs defaultValue="stock" className="space-y-4">
          <TabsList>
            <TabsTrigger value="stock">
              <Package className="mr-2 h-4 w-4" />
              Stock Levels
            </TabsTrigger>
            <TabsTrigger value="low-stock">
              <AlertTriangle className="mr-2 h-4 w-4" />
              Low Stock ({lowStockItems.length})
            </TabsTrigger>
            <TabsTrigger value="history">
              <History className="mr-2 h-4 w-4" />
              Activity Log
            </TabsTrigger>
          </TabsList>

          <TabsContent value="stock" className="space-y-4">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Search by product name or SKU..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* Inventory Table */}
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
                      <TableHead>Product</TableHead>
                      <TableHead>SKU</TableHead>
                      <TableHead>Warehouse</TableHead>
                      <TableHead className="text-right">Quantity</TableHead>
                      <TableHead className="text-right">Min Stock</TableHead>
                      <TableHead className="text-right">Value</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredInventory.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                          No inventory records found
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredInventory.map((inv) => {
                        const product = inv.product;
                        if (!product) return null;
                        const isLow = inv.quantity <= (product.min_stock || 0);
                        return (
                          <TableRow key={inv.id}>
                            <TableCell className="font-medium">{product.name}</TableCell>
                            <TableCell className="font-mono text-sm text-muted-foreground">
                              {product.sku || "-"}
                            </TableCell>
                            <TableCell>{inv.warehouse?.name || "-"}</TableCell>
                            <TableCell className="text-right font-semibold">
                              {inv.quantity} {product.unit}
                            </TableCell>
                            <TableCell className="text-right text-muted-foreground">
                              {product.min_stock || 0}
                            </TableCell>
                            <TableCell className="text-right">
                              {formatCurrency(inv.quantity * product.cost_price)}
                            </TableCell>
                            <TableCell>
                              <Badge variant={isLow ? "destructive" : "secondary"}>
                                {isLow ? "Low Stock" : "In Stock"}
                              </Badge>
                            </TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              )}
            </div>
          </TabsContent>

          <TabsContent value="low-stock">
            <div className="rounded-xl border border-border bg-card shadow-card">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Product</TableHead>
                    <TableHead>SKU</TableHead>
                    <TableHead className="text-right">Current</TableHead>
                    <TableHead className="text-right">Min Stock</TableHead>
                    <TableHead className="text-right">Deficit</TableHead>
                    <TableHead>Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {lowStockItems.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                        No low stock items
                      </TableCell>
                    </TableRow>
                  ) : (
                    lowStockItems.map((inv) => {
                      const product = inv.product;
                      if (!product) return null;
                      const deficit = (product.min_stock || 0) - inv.quantity;
                      return (
                        <TableRow key={inv.id}>
                          <TableCell className="font-medium">{product.name}</TableCell>
                          <TableCell className="font-mono text-sm text-muted-foreground">
                            {product.sku || "-"}
                          </TableCell>
                          <TableCell className="text-right font-semibold text-destructive">
                            {inv.quantity}
                          </TableCell>
                          <TableCell className="text-right">
                            {product.min_stock || 0}
                          </TableCell>
                          <TableCell className="text-right text-warning font-medium">
                            -{deficit}
                          </TableCell>
                          <TableCell>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setSelectedProduct(product.id);
                                setAdjustmentQty(deficit);
                                setIsAdjustOpen(true);
                              }}
                            >
                              <Plus className="mr-1 h-3 w-3" />
                              Restock
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>
          </TabsContent>

          <TabsContent value="history">
            <div className="rounded-xl border border-border bg-card shadow-card">
              {logsLoading ? (
                <div className="p-6 space-y-4">
                  {[...Array(5)].map((_, i) => (
                    <Skeleton key={i} className="h-12 w-full" />
                  ))}
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date & Time</TableHead>
                      <TableHead>Product</TableHead>
                      <TableHead>Action</TableHead>
                      <TableHead className="text-right">Change</TableHead>
                      <TableHead className="text-right">Before</TableHead>
                      <TableHead className="text-right">After</TableHead>
                      <TableHead>Notes</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(logs?.length || 0) === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                          No activity logs
                        </TableCell>
                      </TableRow>
                    ) : (
                      logs?.map((log) => (
                        <TableRow key={log.id}>
                          <TableCell className="text-muted-foreground">
                            {format(new Date(log.created_at), "MMM d, HH:mm")}
                          </TableCell>
                          <TableCell className="font-medium">
                            {(log as any).product?.name || "Unknown"}
                          </TableCell>
                          <TableCell>
                            <Badge className={actionStyles[log.action] || "bg-muted"}>
                              {log.action.replace("_", " ")}
                            </Badge>
                          </TableCell>
                          <TableCell className={`text-right font-semibold ${log.quantity_change > 0 ? 'text-success' : 'text-destructive'}`}>
                            {log.quantity_change > 0 ? '+' : ''}{log.quantity_change}
                          </TableCell>
                          <TableCell className="text-right text-muted-foreground">
                            {log.quantity_before}
                          </TableCell>
                          <TableCell className="text-right">
                            {log.quantity_after}
                          </TableCell>
                          <TableCell className="max-w-[200px] truncate text-muted-foreground">
                            {log.notes || "-"}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
