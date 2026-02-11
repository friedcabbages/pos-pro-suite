import { useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
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
import { Package, Plus, Search, Edit, Trash2, Sliders } from "lucide-react";
import {
  useFnbMenuItems,
  useFnbModifierGroups,
  useFnbProductModifierGroups,
  useSetProductAsMenuItem,
  useUnsetProductAsMenuItem,
  useCreateModifierGroup,
  useCreateModifier,
  useLinkProductToModifierGroup,
} from "@/hooks/useFnb";
import { useProducts } from "@/hooks/useProducts";
import { useCategories } from "@/hooks/useCategories";
import { supabase } from "@/integrations/supabase/client";
import { useBusiness } from "@/contexts/BusinessContext";
import { toast } from "sonner";

export default function FnbMenu() {
  const { business } = useBusiness();
  const [search, setSearch] = useState("");
  const [addOpen, setAddOpen] = useState(false);
  const [modifierOpen, setModifierOpen] = useState(false);

  const { data: menuItems = [], isLoading } = useFnbMenuItems();
  const { data: modifierGroups = [] } = useFnbModifierGroups();
  const productIds = menuItems.map((p) => p.id);
  const { data: productModifierGroups = [] } = useFnbProductModifierGroups(productIds);
  const { data: products = [] } = useProducts();
  const { data: categories = [] } = useCategories();
  const categoryMap = new Map(categories.map((c) => [c.id, c.name]));
  const productsNotOnMenu = products.filter((p) => !p.is_menu_item);

  const setAsMenuItem = useSetProductAsMenuItem();
  const unsetAsMenuItem = useUnsetProductAsMenuItem();
  const createModifierGroup = useCreateModifierGroup();
  const createModifier = useCreateModifier();
  const linkProductToModifierGroup = useLinkProductToModifierGroup();

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: business?.currency ?? "IDR",
      minimumFractionDigits: 0,
    }).format(value);

  const getModifierGroupsForProduct = (productId: string) => {
    const pmg = productModifierGroups.filter((p) => p.product_id === productId);
    return modifierGroups.filter((g) => pmg.some((p) => p.group_id === g.id));
  };

  const handleToggleAvailable = async (id: string, current: boolean) => {
    const { error } = await supabase
      .from("products")
      .update({ is_available: !current })
      .eq("id", id)
      .eq("business_id", business!.id);
    if (error) toast.error(error.message);
    else toast.success(current ? "Marked unavailable" : "Marked available");
  };

  const handleAddToMenu = async (productId: string, prepStation: "kitchen" | "bar") => {
    await setAsMenuItem.mutateAsync({ productId, prepStation });
    setAddOpen(false);
  };

  const handleRemoveFromMenu = async (productId: string) => {
    if (!confirm("Remove this item from menu?")) return;
    await unsetAsMenuItem.mutateAsync(productId);
  };

  const filtered = menuItems.filter((item) =>
    item.name?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <DashboardLayout>
      <div className="container mx-auto p-6">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Package className="h-6 w-6 text-primary" />
              <h1 className="text-2xl font-bold">Menu Management</h1>
            </div>
            <p className="text-muted-foreground">
              Manage menu items, modifiers, and availability
            </p>
          </div>
          <div className="flex gap-2">
            <Dialog open={modifierOpen} onOpenChange={setModifierOpen}>
              <DialogTrigger asChild>
                <Button variant="outline">
                  <Sliders className="h-4 w-4 mr-2" />
                  Modifier Groups
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Modifier Groups</DialogTitle>
                  <DialogDescription>
                    Create modifier groups (e.g. Size, Sugar, Add-ons)
                  </DialogDescription>
                </DialogHeader>
                <ModifierGroupsSection onCreate={() => setModifierOpen(false)} />
              </DialogContent>
            </Dialog>
            <Dialog open={addOpen} onOpenChange={setAddOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Menu Item
                </Button>
              </DialogTrigger>
              <DialogContent>
                <AddToMenuDialog
                  products={productsNotOnMenu}
                  formatCurrency={formatCurrency}
                  onAdd={handleAddToMenu}
                  onClose={() => setAddOpen(false)}
                  isPending={setAsMenuItem.isPending}
                />
              </DialogContent>
            </Dialog>
          </div>
        </div>

        <div className="mb-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search menu items..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>

        {isLoading ? (
          <div className="text-center py-12 text-muted-foreground">Loading...</div>
        ) : filtered.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Package className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
              <p className="text-muted-foreground">No menu items yet</p>
              <p className="text-sm text-muted-foreground mt-1">
                Add products from your catalog as menu items
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map((item) => {
              const groups = getModifierGroupsForProduct(item.id);
              return (
                <Card key={item.id}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg">{item.name}</CardTitle>
                      <Badge variant={item.is_available ? "default" : "secondary"}>
                        {item.is_available ? "Available" : "Unavailable"}
                      </Badge>
                    </div>
                    <CardDescription>
                      {categoryMap.get(item.category_id) ?? "—"}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Price</span>
                        <span className="text-lg font-semibold">
                          {formatCurrency(Number(item.sell_price ?? 0))}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Station</span>
                        <Badge variant="outline">{item.prep_station ?? "—"}</Badge>
                      </div>
                      {groups.length > 0 && (
                        <div className="flex items-center gap-1 flex-wrap">
                          <span className="text-sm text-muted-foreground">Modifiers:</span>
                          {groups.map((g) => (
                            <Badge key={g.id} variant="secondary" className="text-xs">
                              {g.name}
                            </Badge>
                          ))}
                        </div>
                      )}
                      <div className="flex gap-2 pt-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex-1"
                          onClick={() => handleToggleAvailable(item.id, !!item.is_available)}
                        >
                          {item.is_available ? "Unavailable" : "Available"}
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex-1"
                          onClick={() => handleRemoveFromMenu(item.id)}
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Remove
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}

function AddToMenuDialog({
  products,
  formatCurrency,
  onAdd,
  onClose,
  isPending,
}: {
  products: Array<{ id: string; name: string; sell_price?: number }>;
  formatCurrency: (n: number) => string;
  onAdd: (productId: string, station: "kitchen" | "bar") => Promise<void>;
  onClose: () => void;
  isPending: boolean;
}) {
  const [productId, setProductId] = useState<string | null>(null);
  const [station, setStation] = useState<"kitchen" | "bar">("kitchen");
  const handleSubmit = () => {
    if (productId) onAdd(productId, station).then(onClose);
  };
  return (
    <>
      <DialogHeader>
        <DialogTitle>Add Product to Menu</DialogTitle>
        <DialogDescription>
          Select a product and assign preparation station
        </DialogDescription>
      </DialogHeader>
      <div className="space-y-4">
        <div>
          <label className="text-sm font-medium">Product</label>
          <Select value={productId ?? ""} onValueChange={setProductId}>
            <SelectTrigger className="mt-1">
              <SelectValue placeholder="Choose product" />
            </SelectTrigger>
            <SelectContent>
              {products.map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.name} – {formatCurrency(Number(p.sell_price ?? 0))}
                </SelectItem>
              ))}
              {products.length === 0 && (
                <SelectItem value="_" disabled>
                  No products to add
                </SelectItem>
              )}
            </SelectContent>
          </Select>
        </div>
        <div>
          <label className="text-sm font-medium">Station</label>
          <Select value={station} onValueChange={(v) => setStation(v as "kitchen" | "bar")}>
            <SelectTrigger className="mt-1">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="kitchen">Kitchen</SelectItem>
              <SelectItem value="bar">Bar</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      <DialogFooter>
        <Button variant="outline" onClick={onClose}>
          Cancel
        </Button>
        <Button disabled={!productId || isPending} onClick={handleSubmit}>
          Add to Menu
        </Button>
      </DialogFooter>
    </>
  );
}

function ModifierGroupsSection({ onCreate }: { onCreate?: () => void }) {
  const [groupName, setGroupName] = useState("");
  const [modifierName, setModifierName] = useState("");
  const [modifierPrice, setModifierPrice] = useState("");
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  const { data: modifierGroups = [] } = useFnbModifierGroups();
  const createGroup = useCreateModifierGroup();
  const createModifier = useCreateModifier();

  const handleCreateGroup = async () => {
    if (!groupName.trim()) return;
    await createGroup.mutateAsync({ name: groupName.trim() });
    setGroupName("");
    onCreate?.();
  };

  const handleCreateModifier = async () => {
    if (!selectedGroupId || !modifierName.trim()) return;
    await createModifier.mutateAsync({
      groupId: selectedGroupId,
      name: modifierName.trim(),
      priceDelta: parseFloat(modifierPrice) || 0,
    });
    setModifierName("");
    setModifierPrice("");
  };

  return (
    <div className="space-y-4">
      <div>
        <label className="text-sm font-medium">New modifier group</label>
        <div className="flex gap-2 mt-1">
          <Input
            placeholder="e.g. Size, Sugar, Add-ons"
            value={groupName}
            onChange={(e) => setGroupName(e.target.value)}
          />
          <Button onClick={handleCreateGroup} disabled={!groupName.trim() || createGroup.isPending}>
            Add
          </Button>
        </div>
      </div>
      <div>
        <label className="text-sm font-medium">Add modifier to group</label>
        <Select onValueChange={setSelectedGroupId}>
          <SelectTrigger className="mt-1">
            <SelectValue placeholder="Select group" />
          </SelectTrigger>
          <SelectContent>
            {modifierGroups.map((g) => (
              <SelectItem key={g.id} value={g.id}>
                {g.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="flex gap-2 mt-2">
          <Input
            placeholder="Modifier name (e.g. Extra shot)"
            value={modifierName}
            onChange={(e) => setModifierName(e.target.value)}
          />
          <Input
            type="number"
            placeholder="+Price"
            value={modifierPrice}
            onChange={(e) => setModifierPrice(e.target.value)}
          />
          <Button
            onClick={handleCreateModifier}
            disabled={!selectedGroupId || !modifierName.trim() || createModifier.isPending}
          >
            Add
          </Button>
        </div>
      </div>
      {modifierGroups.length > 0 && (
        <div className="border rounded p-3">
          <p className="text-sm font-medium mb-2">Modifier groups</p>
          <ul className="text-sm text-muted-foreground space-y-1">
            {modifierGroups.map((g) => (
              <li key={g.id}>{g.name}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
