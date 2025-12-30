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
  Search,
  Plus,
  Filter,
  Download,
  MoreHorizontal,
  Edit,
  Trash2,
  Eye,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface Product {
  id: string;
  name: string;
  sku: string;
  category: string;
  unit: string;
  costPrice: number;
  sellingPrice: number;
  stock: number;
  minStock: number;
  status: "in_stock" | "low_stock" | "out_of_stock";
}

const sampleProducts: Product[] = [
  {
    id: "1",
    name: "Premium Coffee Beans",
    sku: "COF-001",
    category: "Beverages",
    unit: "kg",
    costPrice: 15.0,
    sellingPrice: 25.0,
    stock: 45,
    minStock: 20,
    status: "in_stock",
  },
  {
    id: "2",
    name: "Organic Fertilizer 50kg",
    sku: "FER-001",
    category: "Agriculture",
    unit: "sack",
    costPrice: 18.0,
    sellingPrice: 32.0,
    stock: 8,
    minStock: 15,
    status: "low_stock",
  },
  {
    id: "3",
    name: "Fresh Milk 1L",
    sku: "MLK-001",
    category: "Dairy",
    unit: "pcs",
    costPrice: 2.0,
    sellingPrice: 3.5,
    stock: 120,
    minStock: 50,
    status: "in_stock",
  },
  {
    id: "4",
    name: "White Sugar 1kg",
    sku: "SUG-001",
    category: "Wholesale",
    unit: "kg",
    costPrice: 0.8,
    sellingPrice: 1.5,
    stock: 0,
    minStock: 100,
    status: "out_of_stock",
  },
  {
    id: "5",
    name: "Croissant",
    sku: "PST-001",
    category: "Pastry",
    unit: "pcs",
    costPrice: 1.5,
    sellingPrice: 3.0,
    stock: 25,
    minStock: 10,
    status: "in_stock",
  },
];

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

  const filteredProducts = sampleProducts.filter((product) => {
    const matchesSearch =
      product.name.toLowerCase().includes(search.toLowerCase()) ||
      product.sku.toLowerCase().includes(search.toLowerCase());
    const matchesCategory =
      categoryFilter === "all" || product.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

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
          <Button variant="glow">
            <Plus className="mr-2 h-4 w-4" />
            Add Product
          </Button>
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
              <SelectItem value="Beverages">Beverages</SelectItem>
              <SelectItem value="Pastry">Pastry</SelectItem>
              <SelectItem value="Dairy">Dairy</SelectItem>
              <SelectItem value="Agriculture">Agriculture</SelectItem>
              <SelectItem value="Wholesale">Wholesale</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline">
            <Filter className="mr-2 h-4 w-4" />
            More Filters
          </Button>
          <Button variant="outline">
            <Download className="mr-2 h-4 w-4" />
            Export
          </Button>
        </div>

        {/* Products Table */}
        <div className="rounded-xl border border-border bg-card shadow-card">
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
              {filteredProducts.map((product) => (
                <TableRow key={product.id} className="group">
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-secondary text-lg">
                        {product.category === "Beverages" && "☕"}
                        {product.category === "Pastry" && "🥐"}
                        {product.category === "Dairy" && "🥛"}
                        {product.category === "Agriculture" && "🌱"}
                        {product.category === "Wholesale" && "📦"}
                      </div>
                      <span className="font-medium text-foreground">
                        {product.name}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="font-mono text-sm text-muted-foreground">
                    {product.sku}
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary">{product.category}</Badge>
                  </TableCell>
                  <TableCell className="text-right font-medium">
                    ${product.costPrice.toFixed(2)}
                  </TableCell>
                  <TableCell className="text-right font-semibold text-primary">
                    ${product.sellingPrice.toFixed(2)}
                  </TableCell>
                  <TableCell className="text-right">
                    <span className="font-medium">{product.stock}</span>
                    <span className="text-muted-foreground"> {product.unit}</span>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className={statusStyles[product.status]}
                    >
                      {statusLabels[product.status]}
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
                        <DropdownMenuItem className="text-destructive">
                          <Trash2 className="mr-2 h-4 w-4" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    </DashboardLayout>
  );
}
