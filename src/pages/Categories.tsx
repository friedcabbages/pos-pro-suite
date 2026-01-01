import { useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import { Plus, Search, MoreHorizontal, Edit, Trash2, Loader2, Tag } from "lucide-react";
import { useCategories, useCreateCategory, useUpdateCategory, useDeleteCategory } from "@/hooks/useCategories";
import { useProducts } from "@/hooks/useProducts";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { Category } from "@/types/database";

export default function Categories() {
  const [search, setSearch] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [formData, setFormData] = useState({ name: "", description: "" });

  const { data: categories, isLoading } = useCategories();
  const { data: products } = useProducts();
  const createCategory = useCreateCategory();
  const updateCategory = useUpdateCategory();
  const deleteCategory = useDeleteCategory();

  const filteredCategories = categories?.filter((cat) =>
    cat.name.toLowerCase().includes(search.toLowerCase())
  ) || [];

  const getProductCount = (categoryId: string) => {
    return products?.filter((p) => p.category_id === categoryId).length || 0;
  };

  const handleOpenCreate = () => {
    setEditingCategory(null);
    setFormData({ name: "", description: "" });
    setIsDialogOpen(true);
  };

  const handleOpenEdit = (category: Category) => {
    setEditingCategory(category);
    setFormData({ name: category.name, description: category.description || "" });
    setIsDialogOpen(true);
  };

  const handleSubmit = () => {
    if (!formData.name.trim()) {
      toast.error("Category name is required");
      return;
    }

    if (editingCategory) {
      updateCategory.mutate(
        { id: editingCategory.id, name: formData.name, description: formData.description || undefined },
        {
          onSuccess: () => {
            setIsDialogOpen(false);
            setEditingCategory(null);
          },
        }
      );
    } else {
      createCategory.mutate(
        { name: formData.name, description: formData.description || undefined },
        {
          onSuccess: () => {
            setIsDialogOpen(false);
            setFormData({ name: "", description: "" });
          },
        }
      );
    }
  };

  const handleDelete = (id: string) => {
    const productCount = getProductCount(id);
    if (productCount > 0) {
      toast.error(`Cannot delete category with ${productCount} products. Move or delete the products first.`);
      return;
    }
    setDeleteId(id);
  };

  const confirmDelete = () => {
    if (deleteId) {
      deleteCategory.mutate(deleteId, {
        onSuccess: () => setDeleteId(null),
      });
    }
  };

  const isPending = createCategory.isPending || updateCategory.isPending;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground">
              Categories
            </h1>
            <p className="mt-1 text-muted-foreground">
              Organize your products into categories
            </p>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={handleOpenCreate}>
                <Plus className="mr-2 h-4 w-4" />
                Add Category
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>
                  {editingCategory ? "Edit Category" : "Add New Category"}
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Category Name *</Label>
                  <Input
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g., Beverages"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Description</Label>
                  <Textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Optional description"
                    rows={3}
                  />
                </div>
                <Button onClick={handleSubmit} className="w-full" disabled={isPending}>
                  {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {editingCategory ? "Update Category" : "Create Category"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Search */}
        <div className="flex gap-4 rounded-xl border border-border bg-card p-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search categories..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {/* Categories Table */}
        <div className="rounded-xl border border-border bg-card shadow-card">
          {isLoading ? (
            <div className="p-6 space-y-4">
              {[...Array(4)].map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Category</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead className="text-right">Products</TableHead>
                  <TableHead className="w-12"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredCategories.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                      No categories found. Add your first category to get started.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredCategories.map((category) => {
                    const productCount = getProductCount(category.id);
                    return (
                      <TableRow key={category.id} className="group">
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-secondary">
                              <Tag className="h-5 w-5 text-muted-foreground" />
                            </div>
                            <span className="font-medium text-foreground">
                              {category.name}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {category.description || "-"}
                        </TableCell>
                        <TableCell className="text-right">
                          <span className="font-medium">{productCount}</span>
                          <span className="text-muted-foreground"> products</span>
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
                              <DropdownMenuItem onClick={() => handleOpenEdit(category)}>
                                <Edit className="mr-2 h-4 w-4" />
                                Edit
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                className="text-destructive"
                                onClick={() => handleDelete(category.id)}
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

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Category</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this category? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DashboardLayout>
  );
}
