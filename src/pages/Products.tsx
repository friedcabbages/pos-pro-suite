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
import { useProducts, useCreateProduct, useDeleteProduct } from "@/hooks/useProducts";
import { useCategories } from "@/hooks/useCategories";
import { useBusiness } from "@/contexts/BusinessContext";
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

export default function Products() {
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    sku: "",
    category_id: "",
    unit: "pcs",
    cost_price: 0,
    sell_price: 0,
    min_stock: 0,
  });

  const { business } = useBusiness();
  const { data: products, isLoading } = useProducts();
  const { data: categories } = useCategories();
  const createProduct = useCreateProduct();
  const deleteProduct = useDeleteProduct();
  const { toast } = useToast();

  const filteredProducts = products?.filter((product) => {
    const matchesSearch =
      product.name.toLowerCase().includes(search.toLowerCase()) ||
      (product.sku?.toLowerCase().includes(search.toLowerCase()) ?? false);
    const matchesCategory =
      categoryFilter === "all" || product.category_id === categoryFilter;
    return matchesSearch && matchesCategory;
  }) || [];

  const getProductStatus = (product: any) => {
    const stock = product.inventory?.[0]?.quantity || 0;
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
        setIsDialogOpen(false);
        setFormData({
          name: "",
          sku: "",
          category_id: "",
          unit: "pcs",
          cost_price: 0,
          sell_price: 0,
          min_stock: 0,
        });
        toast({ title: "Product created successfully" });
      },
      onError: (error: any) => {
        toast({ title: "Failed to create product", description: error.message, variant: "destructive" });
      },
    });
  };

  const handleDelete = (id: string) => {
    if (confirm("Are you sure you want to delete this product?")) {
      deleteProduct.mutate(id, {
        onSuccess: () => toast({ title: "Product deleted" }),
        onError: (error: any) => toast({ title: "Failed to delete", description: error.message, variant: "destructive" }),
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
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="glow">
                <Plus className="mr-2 h-4 w-4" />
                Add Product
              </Button>
            </DialogTrigger>
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
          <Button variant="outline">
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
                    const stock = product.inventory?.[0]?.quantity || 0;
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
                              <DropdownMenuItem>
                                <Eye className="mr-2 h-4 w-4" />
                                View
                              </DropdownMenuItem>
                              <DropdownMenuItem>
                                <Edit className="mr-2 h-4 w-4" />
                                Edit
                              </DropdownMenuItem>
                              <DropdownMenuItem 
                                className="text-destructive"
                                onClick={() => handleDelete(product.id)}
                              >
                                <Trash2 className="mr-2 h-4 w-4" />
                                Delete
                              </DropdownMenuItem>
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
