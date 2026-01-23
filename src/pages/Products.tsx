import { useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Search,
  Plus,
  Download,
  MoreHorizontal,
  Edit,
  Trash2,
  Eye,
  Loader2,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useProducts, useCreateProduct, useDeleteProduct, useUpdateProduct } from "@/hooks/useProducts";
import { useCategories } from "@/hooks/useCategories";
import { useBusiness } from "@/contexts/BusinessContext";
import { usePlanAccess } from "@/hooks/usePlanAccess";
import { useUpgradeModal } from "@/contexts/UpgradeModalContext";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";

const statusStyles = {
  in_stock: "bg-success/10 text-success border-success/30",
  low_stock: "bg-warning/10 text-warning border-warning/30",
  out_of_stock: "bg-destructive/10 text-destructive border-destructive/30",
};

const statusLabels = {
  in_stock: "In Stock",
  low_stock: "Low Stock",
  out_of_stock: "Out of Stock",
};

interface ProductFormData {
  name: string;
  sku: string;
  category_id: string;
  unit: string;
  cost_price: number;
  sell_price: number;
  min_stock: number;
}

const defaultFormData: ProductFormData = {
  name: "",
  sku: "",
  category_id: "",
  unit: "pcs",
  cost_price: 0,
  sell_price: 0,
  min_stock: 0,
};

export default function Products() {
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isViewOpen, setIsViewOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const [formData, setFormData] = useState<ProductFormData>(defaultFormData);

  const { business } = useBusiness();
  const { data: products, isLoading } = useProducts();
  const { data: categories } = useCategories();
  const createProduct = useCreateProduct();
  const updateProduct = useUpdateProduct();
  const deleteProduct = useDeleteProduct();
  const { toast } = useToast();
  const plan = usePlanAccess();
  const upgrade = useUpgradeModal();

  const currentProductsCount = products?.length || 0;
  const maxProducts = plan.limits.maxProducts;
  const isAtProductLimit = maxProducts !== null && currentProductsCount >= maxProducts;

  const filteredProducts = products?.filter((product) => {
    const matchesSearch =
      product.name.toLowerCase().includes(search.toLowerCase()) ||
      (product.sku?.toLowerCase().includes(search.toLowerCase()) ?? false);
    const matchesCategory =
      categoryFilter === "all" || product.category_id === categoryFilter;
    return matchesSearch && matchesCategory;
  }) || [];

  const getProductStatus = (product: any) => {
    const stock = product.total_stock ?? 0;
    const minStock = product.min_stock || 0;
    if (stock === 0) return "out_of_stock";
    if (stock <= minStock) return "low_stock";
    return "in_stock";
  };

  const getCategoryIcon = (categoryName?: string) => {
    if (!categoryName) return "📦";
    const name = categoryName.toLowerCase();
    if (name.includes("beverage") || name.includes("drink")) return "☕";
    if (name.includes("pastry") || name.includes("bake")) return "🥐";
    if (name.includes("dairy") || name.includes("milk")) return "🥛";
    if (name.includes("agri") || name.includes("farm")) return "🌱";
    return "📦";
  };

  const handleCreate = async () => {
    if (isAtProductLimit) {
      upgrade.open({
        reason: "limit",
        requiredPlan: plan.planName === "basic" ? "pro" : "enterprise",
        message:
          "You’ve reached your product limit. Upgrade now to add more products and unlock more features.",
        highlights: ["Up to 1,000 products", "Expenses", "Purchase Orders", "Advanced reports"],
      });
      return;
    }

    if (!formData.name.trim()) {
      toast({ title: "Name required", variant: "destructive" });
      return;
    }
    
    createProduct.mutate({
      name: formData.name,
      sku: formData.sku || null,
      category_id: formData.category_id || null,
      unit: formData.unit,
      cost_price: formData.cost_price,
      sell_price: formData.sell_price,
      min_stock: formData.min_stock,
    }, {
      onSuccess: () => {
        setIsCreateOpen(false);
        setFormData(defaultFormData);
        toast({ title: "Product created successfully" });
      },
      onError: (error: any) => {
        const msg = String(error?.message || "");
        if (isAtProductLimit || msg.toLowerCase().includes("row-level security")) {
          upgrade.open({
            reason: "limit",
            requiredPlan: plan.planName === "basic" ? "pro" : "enterprise",
            message:
              "Your plan allows a limited number of products. Upgrade now to add more products and unlock more features.",
            highlights: ["More products", "Advanced reports", "Multi-warehouse"],
          });
        }
        toast({ title: "Failed to create product", description: error.message, variant: "destructive" });
      },
    });
  };

  const handleEdit = async () => {
    if (!formData.name.trim() || !selectedProduct) {
      toast({ title: "Name required", variant: "destructive" });
      return;
    }
    
    updateProduct.mutate({
      id: selectedProduct.id,
      name: formData.name,
      sku: formData.sku || null,
      category_id: formData.category_id || null,
      unit: formData.unit,
      cost_price: formData.cost_price,
      sell_price: formData.sell_price,
      min_stock: formData.min_stock,
    }, {
      onSuccess: () => {
        setIsEditOpen(false);
        setSelectedProduct(null);
        setFormData(defaultFormData);
        toast({ title: "Product updated successfully" });
      },
      onError: (error: any) => {
        toast({ title: "Failed to update product", description: error.message, variant: "destructive" });
      },
    });
  };

  const openEditDialog = (product: any) => {
    setSelectedProduct(product);
    setFormData({
      name: product.name,
      sku: product.sku || "",
      category_id: product.category_id || "",
      unit: product.unit || "pcs",
      cost_price: product.cost_price || 0,
      sell_price: product.sell_price || 0,
      min_stock: product.min_stock || 0,
    });
    setIsEditOpen(true);
  };

  const openViewDialog = (product: any) => {
    setSelectedProduct(product);
    setIsViewOpen(true);
  };

  const handleDelete = (id: string) => {
    if (confirm("Are you sure you want to delete this product?")) {
      deleteProduct.mutate(id, {
        onSuccess: () => toast({ title: "Product deleted" }),
        onError: (error: any) => toast({ title: "Failed to delete", description: error.message, variant: "destructive" }),
      });
    }
  };

  const handleExport = () => {
    if (filteredProducts.length === 0) {
      toast({ title: "No products to export", variant: "destructive" });
      return;
    }

    // Build CSV content
    const headers = ["Name", "SKU", "Category", "Unit", "Cost Price", "Sell Price", "Stock", "Min Stock", "Status"];
    const rows = filteredProducts.map((product) => {
      const category = categories?.find(c => c.id === product.category_id);
      const stock = product.total_stock ?? 0;
      const status = getProductStatus(product);
      return [
        `"${product.name}"`,
        product.sku || "",
        category?.name || "",
        product.unit || "pcs",
        product.cost_price,
        product.sell_price,
        stock,
        product.min_stock || 0,
        statusLabels[status],
      ].join(",");
    });

    const csvContent = [headers.join(","), ...rows].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `products_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    toast({ title: `Exported ${filteredProducts.length} products` });
  };

  const formatCurrency = (value: number) => {
    const currency = business?.currency || 'USD';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
      minimumFractionDigits: 2,
    }).format(value);
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground">
              Products
            </h1>
            <p className="mt-1 text-muted-foreground">
              Manage your product inventory and pricing
            </p>
          </div>
          <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <div>
              <Button
                variant="glow"
                onClick={() => {
                  if (isAtProductLimit) {
                    upgrade.open({
                      reason: "limit",
                      requiredPlan: plan.planName === "basic" ? "pro" : "enterprise",
                      message:
                        "You’ve reached your product limit. Upgrade now to add more products and unlock more features.",
                      highlights: ["Up to 1,000 products", "Expenses", "Purchase Orders"],
                    });
                    return;
                  }
                  setIsCreateOpen(true);
                }}
              >
                <Plus className="mr-2 h-4 w-4" />
                Add Product
              </Button>
              {maxProducts !== null && (
                <p className="mt-1 text-xs text-muted-foreground">
                  {currentProductsCount}/{maxProducts} products
                </p>
              )}
            </div>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add New Product</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Product Name *</Label>
                  <Input
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Product name"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>SKU</Label>
                    <Input
                      value={formData.sku}
                      onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                      placeholder="SKU-001"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Unit</Label>
                    <Select value={formData.unit} onValueChange={(v) => setFormData({ ...formData, unit: v })}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pcs">Pieces</SelectItem>
                        <SelectItem value="kg">Kilogram</SelectItem>
                        <SelectItem value="ltr">Liter</SelectItem>
                        <SelectItem value="box">Box</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Category</Label>
                  <Select value={formData.category_id} onValueChange={(v) => setFormData({ ...formData, category_id: v })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories?.map((cat) => (
                        <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Cost Price</Label>
                    <Input
                      type="number"
                      value={formData.cost_price}
                      onChange={(e) => setFormData({ ...formData, cost_price: Number(e.target.value) })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Sell Price</Label>
                    <Input
                      type="number"
                      value={formData.sell_price}
                      onChange={(e) => setFormData({ ...formData, sell_price: Number(e.target.value) })}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Minimum Stock</Label>
                  <Input
                    type="number"
                    value={formData.min_stock}
                    onChange={(e) => setFormData({ ...formData, min_stock: Number(e.target.value) })}
                  />
                </div>
                <Button onClick={handleCreate} className="w-full" disabled={createProduct.isPending}>
                  {createProduct.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Create Product
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Filters */}
        <div className="flex flex-col gap-4 rounded-xl border border-border bg-card p-4 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search by name or SKU..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="w-full sm:w-48">
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {categories?.map((cat) => (
                <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={handleExport}>
            <Download className="mr-2 h-4 w-4" />
            Export
          </Button>
        </div>

        {/* Products Table */}
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
                  <TableHead>Category</TableHead>
                  <TableHead className="text-right">Cost</TableHead>
                  <TableHead className="text-right">Price</TableHead>
                  <TableHead className="text-right">Stock</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-12"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredProducts.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                      No products found. Add your first product to get started.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredProducts.map((product) => {
                    const status = getProductStatus(product);
                    const stock = product.total_stock ?? 0;
                    const category = categories?.find(c => c.id === product.category_id);
                    return (
                      <TableRow key={product.id} className="group">
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-secondary text-lg">
                              {getCategoryIcon(category?.name)}
                            </div>
                            <span className="font-medium text-foreground">
                              {product.name}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="font-mono text-sm text-muted-foreground">
                          {product.sku || "-"}
                        </TableCell>
                        <TableCell>
                          {category ? (
                            <Badge variant="secondary">{category.name}</Badge>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {formatCurrency(product.cost_price)}
                        </TableCell>
                        <TableCell className="text-right font-semibold text-primary">
                          {formatCurrency(product.sell_price)}
                        </TableCell>
                        <TableCell className="text-right">
                          <span className="font-medium">{stock}</span>
                          <span className="text-muted-foreground"> {product.unit}</span>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className={statusStyles[status]}
                          >
                            {statusLabels[status]}
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
                              <DropdownMenuItem onClick={() => openViewDialog(product)}>
                                <Eye className="mr-2 h-4 w-4" />
                                View
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => openEditDialog(product)}>
                                <Edit className="mr-2 h-4 w-4" />
                                Edit
                              </DropdownMenuItem>
                              {!plan.isComplianceMode ? (
                                <DropdownMenuItem
                                  className="text-destructive"
                                  onClick={() => handleDelete(product.id)}
                                >
                                  <Trash2 className="mr-2 h-4 w-4" />
                                  Delete
                                </DropdownMenuItem>
                              ) : (
                                <DropdownMenuItem
                                  disabled
                                  className="text-muted-foreground"
                                  onSelect={(e) => e.preventDefault()}
                                >
                                  <Trash2 className="mr-2 h-4 w-4" />
                                  Delete (Compliance Mode)
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

        {/* View Dialog */}
        <Dialog open={isViewOpen} onOpenChange={setIsViewOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Product Details</DialogTitle>
            </DialogHeader>
            {selectedProduct && (
              <div className="space-y-4">
                <div className="flex items-center gap-4">
                  <div className="flex h-16 w-16 items-center justify-center rounded-xl bg-secondary text-2xl">
                    {getCategoryIcon(categories?.find(c => c.id === selectedProduct.category_id)?.name)}
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold">{selectedProduct.name}</h3>
                    {selectedProduct.sku && (
                      <p className="text-sm text-muted-foreground font-mono">{selectedProduct.sku}</p>
                    )}
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="rounded-lg bg-muted/50 p-3">
                    <p className="text-xs text-muted-foreground">Category</p>
                    <p className="font-medium">{categories?.find(c => c.id === selectedProduct.category_id)?.name || "-"}</p>
                  </div>
                  <div className="rounded-lg bg-muted/50 p-3">
                    <p className="text-xs text-muted-foreground">Unit</p>
                    <p className="font-medium">{selectedProduct.unit || "pcs"}</p>
                  </div>
                  <div className="rounded-lg bg-muted/50 p-3">
                    <p className="text-xs text-muted-foreground">Cost Price</p>
                    <p className="font-medium">{formatCurrency(selectedProduct.cost_price)}</p>
                  </div>
                  <div className="rounded-lg bg-muted/50 p-3">
                    <p className="text-xs text-muted-foreground">Sell Price</p>
                    <p className="font-medium text-primary">{formatCurrency(selectedProduct.sell_price)}</p>
                  </div>
                  <div className="rounded-lg bg-muted/50 p-3">
                    <p className="text-xs text-muted-foreground">Current Stock</p>
                    <p className="font-medium">{selectedProduct.total_stock ?? 0} {selectedProduct.unit || "pcs"}</p>
                  </div>
                  <div className="rounded-lg bg-muted/50 p-3">
                    <p className="text-xs text-muted-foreground">Min Stock</p>
                    <p className="font-medium">{selectedProduct.min_stock || 0}</p>
                  </div>
                </div>
                
                <div className="flex justify-end gap-2 pt-2">
                  <Button variant="outline" onClick={() => setIsViewOpen(false)}>
                    Close
                  </Button>
                  <Button onClick={() => {
                    setIsViewOpen(false);
                    openEditDialog(selectedProduct);
                  }}>
                    <Edit className="mr-2 h-4 w-4" />
                    Edit Product
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Edit Dialog */}
        <Dialog open={isEditOpen} onOpenChange={(open) => {
          setIsEditOpen(open);
          if (!open) {
            setSelectedProduct(null);
            setFormData(defaultFormData);
          }
        }}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit Product</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Product Name *</Label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Product name"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>SKU</Label>
                  <Input
                    value={formData.sku}
                    onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                    placeholder="SKU-001"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Unit</Label>
                  <Select value={formData.unit} onValueChange={(v) => setFormData({ ...formData, unit: v })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pcs">Pieces</SelectItem>
                      <SelectItem value="kg">Kilogram</SelectItem>
                      <SelectItem value="ltr">Liter</SelectItem>
                      <SelectItem value="box">Box</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Category</Label>
                <Select value={formData.category_id} onValueChange={(v) => setFormData({ ...formData, category_id: v })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories?.map((cat) => (
                      <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Cost Price</Label>
                  <Input
                    type="number"
                    value={formData.cost_price}
                    onChange={(e) => setFormData({ ...formData, cost_price: Number(e.target.value) })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Sell Price</Label>
                  <Input
                    type="number"
                    value={formData.sell_price}
                    onChange={(e) => setFormData({ ...formData, sell_price: Number(e.target.value) })}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Minimum Stock</Label>
                <Input
                  type="number"
                  value={formData.min_stock}
                  onChange={(e) => setFormData({ ...formData, min_stock: Number(e.target.value) })}
                />
              </div>
              
              {/* Read-only stock display */}
              {selectedProduct && (
                <div className="rounded-lg bg-muted/50 p-3 border border-border">
                  <p className="text-xs text-muted-foreground">Current Stock (read-only)</p>
                  <p className="font-medium">{selectedProduct.total_stock ?? 0} {selectedProduct.unit || "pcs"}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    To adjust stock, use the Inventory page
                  </p>
                </div>
              )}
              
              <Button onClick={handleEdit} className="w-full" disabled={updateProduct.isPending}>
                {updateProduct.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Update Product
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
