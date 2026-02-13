import { useEffect, useMemo, useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Boxes, Plus, ChefHat, Trash2, Loader2, AlertTriangle } from "lucide-react";
import { QueryBoundary } from "@/components/QueryBoundary";
import {
  useFnbRecipes,
  useFnbRecipeItems,
  useFnbMenuItems,
  useFnbProducts,
  useCreateFnbRecipe,
  useAddRecipeItem,
  useDeleteRecipeItem,
  useDeleteFnbRecipe,
  useFnbWasteLogs,
  useCreateFnbWasteLog,
} from "@/hooks/useFnb";
import { useWarehouses } from "@/hooks/useWarehouses";
import { format } from "date-fns";

export default function FnbInventory() {
  const [addRecipeOpen, setAddRecipeOpen] = useState(false);
  const [addIngredientOpen, setAddIngredientOpen] = useState<string | null>(null);
  const [newRecipeProductId, setNewRecipeProductId] = useState("");
  const [newRecipeYield, setNewRecipeYield] = useState("1");
  const [newRecipeUnit, setNewRecipeUnit] = useState("portion");
  const [newIngredientProductId, setNewIngredientProductId] = useState("");
  const [newIngredientQty, setNewIngredientQty] = useState("1");
  const [newIngredientUnit, setNewIngredientUnit] = useState("pcs");

  const [wasteWarehouseId, setWasteWarehouseId] = useState<string>("_all_");
  const [wasteDialogWarehouseId, setWasteDialogWarehouseId] = useState<string>("");
  const [wasteDialogOpen, setWasteDialogOpen] = useState(false);
  const [wasteProductId, setWasteProductId] = useState("");
  const [wasteQty, setWasteQty] = useState("1");
  const [wasteUnit, setWasteUnit] = useState("pcs");
  const [wasteReason, setWasteReason] = useState("spoilage");
  const [wasteBatch, setWasteBatch] = useState("");
  const [wasteNotes, setWasteNotes] = useState("");

  const { data: recipes = [], isLoading: recipesLoading, isError: recipesError, error: recipesErrorObj, refetch: refetchRecipes } = useFnbRecipes();
  const { data: menuItems = [] } = useFnbMenuItems();
  const { data: products = [] } = useFnbProducts();
  const { data: warehouses = [] } = useWarehouses();
  const recipeIds = useMemo(() => recipes.map((r) => r.id), [recipes]);
  const { data: recipeItems = [], isLoading: itemsLoading } = useFnbRecipeItems(recipeIds);
  const { data: wasteLogs = [], isLoading: wasteLogsLoading } = useFnbWasteLogs(wasteWarehouseId === "_all_" || !wasteWarehouseId ? null : wasteWarehouseId);

  const createRecipe = useCreateFnbRecipe();
  const createWasteLog = useCreateFnbWasteLog();

  useEffect(() => {
    if (wasteDialogOpen && warehouses.length > 0 && !wasteDialogWarehouseId) {
      setWasteDialogWarehouseId(warehouses[0].id);
    }
    if (!wasteDialogOpen) {
      setWasteDialogWarehouseId("");
    }
  }, [wasteDialogOpen, warehouses, wasteDialogWarehouseId]);
  const addRecipeItem = useAddRecipeItem();
  const deleteRecipeItem = useDeleteRecipeItem();
  const deleteRecipe = useDeleteFnbRecipe();

  const itemsByRecipe = useMemo(() => {
    const map: Record<string, typeof recipeItems> = {};
    for (const ri of recipeItems) {
      const rid = (ri as { recipe_id?: string }).recipe_id;
      if (rid) {
        if (!map[rid]) map[rid] = [];
        map[rid].push(ri);
      }
    }
    return map;
  }, [recipeItems]);

  const menuItemsWithoutRecipe = useMemo(
    () => menuItems.filter((m) => !recipes.some((r) => (r as { product_id?: string }).product_id === m.id)),
    [menuItems, recipes]
  );

  const handleCreateRecipe = async () => {
    if (!newRecipeProductId) return;
    await createRecipe.mutateAsync({
      productId: newRecipeProductId,
      yieldQuantity: parseFloat(newRecipeYield) || 1,
      unit: newRecipeUnit,
    });
    setAddRecipeOpen(false);
    setNewRecipeProductId("");
    setNewRecipeYield("1");
    setNewRecipeUnit("portion");
  };

  const handleAddIngredient = async (recipeId: string) => {
    if (!newIngredientProductId) return;
    await addRecipeItem.mutateAsync({
      recipeId,
      ingredientProductId: newIngredientProductId,
      quantity: parseFloat(newIngredientQty) || 1,
      unit: newIngredientUnit,
    });
    setAddIngredientOpen(null);
    setNewIngredientProductId("");
    setNewIngredientQty("1");
    setNewIngredientUnit("pcs");
  };

  const handleLogWaste = async () => {
    if (!wasteProductId || !wasteDialogWarehouseId) return;
    await createWasteLog.mutateAsync({
      warehouseId: wasteDialogWarehouseId,
      productId: wasteProductId,
      quantity: parseFloat(wasteQty) || 1,
      unit: wasteUnit,
      reason: wasteReason,
      batchNumber: wasteBatch || undefined,
      notes: wasteNotes || undefined,
    });
    setWasteDialogOpen(false);
    setWasteDialogWarehouseId("");
    setWasteProductId("");
    setWasteQty("1");
    setWasteUnit("pcs");
    setWasteReason("spoilage");
    setWasteBatch("");
    setWasteNotes("");
  };

  return (
    <DashboardLayout>
      <div className="container mx-auto p-6">
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-2">
            <Boxes className="h-6 w-6 text-primary" />
            <h1 className="text-2xl font-bold">Recipe & Inventory</h1>
          </div>
          <p className="text-muted-foreground">
            Manage recipes, ingredients, and waste logs for F&B
          </p>
        </div>

        <QueryBoundary isLoading={recipesLoading} isError={!!recipesError} error={recipesErrorObj ?? undefined} refetch={refetchRecipes}>
        <Tabs defaultValue="recipes">
          <TabsList>
            <TabsTrigger value="recipes">Recipes & BOM</TabsTrigger>
            <TabsTrigger value="waste">Waste Log</TabsTrigger>
          </TabsList>

          <TabsContent value="recipes" className="mt-4">
        <div className="mb-4 flex justify-end">
          <Dialog open={addRecipeOpen} onOpenChange={setAddRecipeOpen}>
            <DialogTrigger asChild>
              <Button disabled={menuItemsWithoutRecipe.length === 0}>
                <Plus className="h-4 w-4 mr-2" />
                Add Recipe
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create Recipe</DialogTitle>
                <DialogDescription>Assign a menu item and define its output.</DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div>
                  <Label>Menu Item</Label>
                  <Select value={newRecipeProductId} onValueChange={setNewRecipeProductId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select menu item" />
                    </SelectTrigger>
                    <SelectContent>
                      {menuItemsWithoutRecipe.map((m) => (
                        <SelectItem key={m.id} value={m.id}>
                          {m.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Yield Quantity</Label>
                    <Input
                      type="number"
                      min="0.001"
                      step="0.01"
                      value={newRecipeYield}
                      onChange={(e) => setNewRecipeYield(e.target.value)}
                    />
                  </div>
                  <div>
                    <Label>Unit</Label>
                    <Input
                      value={newRecipeUnit}
                      onChange={(e) => setNewRecipeUnit(e.target.value)}
                      placeholder="portion, serving, etc."
                    />
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setAddRecipeOpen(false)}>
                  Cancel
                </Button>
                <Button
                  onClick={() => void handleCreateRecipe()}
                  disabled={!newRecipeProductId || createRecipe.isPending}
                >
                  {createRecipe.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                  Create
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {recipesLoading ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-muted-foreground" />
              <p className="text-muted-foreground">Loading recipes...</p>
            </CardContent>
          </Card>
        ) : recipes.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <ChefHat className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
              <p className="text-muted-foreground">No recipes yet</p>
              <p className="text-sm text-muted-foreground mt-1">
                Add a recipe for a menu item above. Menu items come from F&B Menu.
              </p>
              <Button className="mt-4" variant="outline" onClick={() => setAddRecipeOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Create First Recipe
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {recipes.map((recipe) => {
              const product = (recipe as { products?: { id: string; name: string } }).products;
              const productName = product?.name ?? "Unknown";
              const items = itemsByRecipe[recipe.id] ?? [];
              const isLoading = itemsLoading;

              return (
                <Card key={recipe.id}>
                  <CardHeader className="flex flex-row items-center justify-between">
                    <div>
                      <CardTitle>{productName}</CardTitle>
                      <CardDescription>
                        Yield: {String((recipe as { yield_quantity?: number }).yield_quantity ?? 1)}{" "}
                        {(recipe as { unit?: string }).unit ?? "portion"}
                      </CardDescription>
                    </div>
                    <div className="flex items-center gap-2">
                      <Dialog
                        open={addIngredientOpen === recipe.id}
                        onOpenChange={(o) => setAddIngredientOpen(o ? recipe.id : null)}
                      >
                        <DialogTrigger asChild>
                          <Button variant="outline" size="sm">
                            <Plus className="h-4 w-4 mr-1" />
                            Add Ingredient
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Add Ingredient</DialogTitle>
                            <DialogDescription>
                              Add an ingredient product with quantity for this recipe.
                            </DialogDescription>
                          </DialogHeader>
                          <div className="grid gap-4 py-4">
                            <div>
                              <Label>Product (ingredient)</Label>
                              <Select
                                value={newIngredientProductId}
                                onValueChange={setNewIngredientProductId}
                              >
                                <SelectTrigger>
                                  <SelectValue placeholder="Select product" />
                                </SelectTrigger>
                                <SelectContent>
                                  {products.map((p) => (
                                    <SelectItem key={p.id} value={p.id}>
                                      {p.name}
                                      {p.unit ? ` (${p.unit})` : ""}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                              <div>
                                <Label>Quantity</Label>
                                <Input
                                  type="number"
                                  min="0.001"
                                  step="0.01"
                                  value={newIngredientQty}
                                  onChange={(e) => setNewIngredientQty(e.target.value)}
                                />
                              </div>
                              <div>
                                <Label>Unit</Label>
                                <Input
                                  value={newIngredientUnit}
                                  onChange={(e) => setNewIngredientUnit(e.target.value)}
                                  placeholder="g, ml, pcs"
                                />
                              </div>
                            </div>
                          </div>
                          <DialogFooter>
                            <Button
                              variant="outline"
                              onClick={() => setAddIngredientOpen(null)}
                            >
                              Cancel
                            </Button>
                            <Button
                              onClick={() => void handleAddIngredient(recipe.id)}
                              disabled={!newIngredientProductId || addRecipeItem.isPending}
                            >
                              {addRecipeItem.isPending ? (
                                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                              ) : null}
                              Add
                            </Button>
                          </DialogFooter>
                        </DialogContent>
                      </Dialog>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-destructive hover:text-destructive"
                        onClick={() => {
                          if (confirm("Remove this recipe and all ingredients?")) {
                            void deleteRecipe.mutateAsync(recipe.id);
                          }
                        }}
                        disabled={deleteRecipe.isPending}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {isLoading ? (
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Loading ingredients...
                      </div>
                    ) : items.length === 0 ? (
                      <p className="text-sm text-muted-foreground">
                        No ingredients yet. Add ingredients above.
                      </p>
                    ) : (
                      <div className="space-y-2">
                        {items.map((ri) => {
                          const ing = (ri as { products?: { id: string; name: string; unit?: string } }).products;
                          const qty = (ri as { quantity?: number }).quantity ?? 0;
                          const unit = (ri as { unit?: string }).unit ?? "pcs";
                          return (
                            <div
                              key={(ri as { id?: string }).id}
                              className="flex items-center justify-between p-2 border rounded"
                            >
                              <span className="font-medium">{ing?.name ?? "Unknown"}</span>
                              <div className="flex items-center gap-2">
                                <span className="text-sm text-muted-foreground">
                                  {qty} {unit}
                                </span>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 text-muted-foreground hover:text-destructive"
                                  onClick={() => {
                                    if (confirm("Remove this ingredient?")) {
                                      void deleteRecipeItem.mutateAsync((ri as { id: string }).id);
                                    }
                                  }}
                                  disabled={deleteRecipeItem.isPending}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
          </TabsContent>

          <TabsContent value="waste" className="mt-4">
            <div className="mb-4 flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-2">
                <Label>Warehouse</Label>
                <Select value={wasteWarehouseId} onValueChange={setWasteWarehouseId}>
                  <SelectTrigger className="w-[200px]">
                    <SelectValue placeholder="All warehouses" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="_all_">All warehouses</SelectItem>
                    {warehouses.map((w) => (
                      <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Dialog open={wasteDialogOpen} onOpenChange={setWasteDialogOpen}>
                <DialogTrigger asChild>
                  <Button>
                    <AlertTriangle className="h-4 w-4 mr-2" />
                    Log Waste
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Log Waste / Spoilage</DialogTitle>
                    <DialogDescription>
                      Record product waste. Stock will be deducted from inventory.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="grid gap-4 py-4">
                    <div>
                      <Label>Warehouse *</Label>
                      <Select value={wasteDialogWarehouseId} onValueChange={setWasteDialogWarehouseId} required>
                        <SelectTrigger>
                          <SelectValue placeholder="Select warehouse" />
                        </SelectTrigger>
                        <SelectContent>
                          {warehouses.length === 0 ? (
                            <SelectItem value="_empty_wh" disabled>No warehouses. Create one in Settings first.</SelectItem>
                          ) : (
                            warehouses.map((w) => (
                              <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>
                            ))
                          )}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Product *</Label>
                      <Select value={wasteProductId} onValueChange={setWasteProductId}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select product" />
                        </SelectTrigger>
                        <SelectContent>
                          {products.length === 0 ? (
                            <SelectItem value="_empty_prod" disabled>No products. Add products first.</SelectItem>
                          ) : (
                            products.map((p) => (
                            <SelectItem key={p.id} value={p.id}>
                              {p.name}{p.unit ? ` (${p.unit})` : ""}
                            </SelectItem>
                          ))
                          )}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>Quantity *</Label>
                        <Input
                          type="number"
                          min="0.001"
                          value={wasteQty}
                          onChange={(e) => setWasteQty(e.target.value)}
                        />
                      </div>
                      <div>
                        <Label>Unit</Label>
                        <Input value={wasteUnit} onChange={(e) => setWasteUnit(e.target.value)} />
                      </div>
                    </div>
                    <div>
                      <Label>Reason</Label>
                      <Select value={wasteReason} onValueChange={setWasteReason}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="spoilage">Spoilage</SelectItem>
                          <SelectItem value="expired">Expired</SelectItem>
                          <SelectItem value="damaged">Damaged</SelectItem>
                          <SelectItem value="wastage">Wastage</SelectItem>
                          <SelectItem value="other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Batch number (optional)</Label>
                      <Input value={wasteBatch} onChange={(e) => setWasteBatch(e.target.value)} placeholder="e.g. BATCH-001" />
                    </div>
                    <div>
                      <Label>Notes (optional)</Label>
                      <Input value={wasteNotes} onChange={(e) => setWasteNotes(e.target.value)} placeholder="Additional notes" />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setWasteDialogOpen(false)}>Cancel</Button>
                    <Button
                      onClick={() => void handleLogWaste()}
                      disabled={!wasteProductId || !wasteDialogWarehouseId || createWasteLog.isPending || warehouses.length === 0 || products.length === 0}
                    >
                      {createWasteLog.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                      Log Waste
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
            <Card>
              <CardHeader>
                <CardTitle>Waste Log History</CardTitle>
                <CardDescription>Recent waste and spoilage records</CardDescription>
              </CardHeader>
              <CardContent>
                {wasteLogsLoading ? (
                  <div className="flex items-center gap-2 text-muted-foreground py-8">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Loading...
                  </div>
                ) : wasteLogs.length === 0 ? (
                  <p className="text-muted-foreground py-8 text-center">No waste logs yet</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Product</TableHead>
                        <TableHead>Quantity</TableHead>
                        <TableHead>Warehouse</TableHead>
                        <TableHead>Reason</TableHead>
                        <TableHead>Batch</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {wasteLogs.map((log) => {
                        const p = (log as { products?: { name: string; unit?: string } }).products;
                        const w = (log as { warehouses?: { name: string } }).warehouses;
                        return (
                          <TableRow key={(log as { id: string }).id}>
                            <TableCell>{format(new Date((log as { created_at: string }).created_at), "PPp")}</TableCell>
                            <TableCell>{p?.name ?? "-"}</TableCell>
                            <TableCell>
                              {(log as { quantity: number }).quantity} {(log as { unit?: string }).unit ?? "pcs"}
                            </TableCell>
                            <TableCell>{w?.name ?? "-"}</TableCell>
                            <TableCell>{(log as { reason?: string }).reason ?? "-"}</TableCell>
                            <TableCell>{(log as { batch_number?: string }).batch_number ?? "-"}</TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
        </QueryBoundary>
      </div>
    </DashboardLayout>
  );
}
