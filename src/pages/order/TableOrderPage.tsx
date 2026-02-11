import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Plus, Minus, ShoppingCart, UtensilsCrossed } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_FUNCTIONS_URL = `${SUPABASE_URL}/functions/v1`;

type Modifier = { id: string; group_id: string; name: string; price_delta: number; price_type?: string };
type ModifierGroup = { id: string; name: string; is_required: boolean; min_select: number; max_select: number; is_multi: boolean };
type CartItem = {
  product_id: string;
  name: string;
  price: number;
  quantity: number;
  modifiers?: Record<string, unknown>;
};

export default function TableOrderPage() {
  const { token } = useParams<{ token: string }>();
  const { toast } = useToast();
  const [menu, setMenu] = useState<any>(null);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [addModal, setAddModal] = useState<{ product: any; qty: number } | null>(null);
  const [selectedModifiers, setSelectedModifiers] = useState<Record<string, string[]>>({});

  useEffect(() => {
    const loadMenu = async () => {
      try {
        const response = await fetch(`${SUPABASE_FUNCTIONS_URL}/public-menu`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ table_token: token }),
        });
        const data = await response.json();
        if (response.ok) setMenu(data);
        else toast({ title: "Error", description: data.error || "Failed to load menu", variant: "destructive" });
      } catch {
        toast({ title: "Error", description: "Failed to load menu", variant: "destructive" });
      } finally {
        setLoading(false);
      }
    };
    if (token) loadMenu();
  }, [token, toast]);

  const getModifierGroupsForProduct = (productId: string) => {
    if (!menu?.product_modifier_groups || !menu?.modifier_groups || !menu?.modifiers) return [];
    const pmg = menu.product_modifier_groups.filter((p: any) => p.product_id === productId);
    return menu.modifier_groups.filter((g: ModifierGroup) =>
      pmg.some((p: any) => p.group_id === g.id)
    );
  };

  const getModifiersForGroup = (groupId: string) =>
    (menu?.modifiers ?? []).filter((m: Modifier) => m.group_id === groupId);

  const computePrice = (product: any, mods: Record<string, string[]>) => {
    let total = Number(product.sell_price ?? 0);
    const modList = menu?.modifiers ?? [];
    for (const groupId of Object.keys(mods)) {
      for (const modId of mods[groupId] ?? []) {
        const m = modList.find((x: Modifier) => x.id === modId);
        if (m) {
          if (m.price_type === "percentage") {
            total += (product.sell_price * (Number(m.price_delta) || 0)) / 100;
          } else {
            total += Number(m.price_delta) || 0;
          }
        }
      }
    }
    return Math.max(0, total);
  };

  const quickAdd = (product: any, qty = 1) => {
    setCart((prev) => {
      const existing = prev.find(
        (i) => i.product_id === product.id && JSON.stringify(i.modifiers || {}) === "{}"
      );
      if (existing) {
        return prev.map((i) => (i === existing ? { ...i, quantity: i.quantity + qty } : i));
      }
      return [...prev, { product_id: product.id, name: product.name, price: Number(product.sell_price ?? 0), quantity: qty }];
    });
  };

  const openAddModal = (product: any, qty = 1) => {
    setAddModal({ product, qty });
    setSelectedModifiers({});
  };

  const confirmAdd = () => {
    if (!addModal) return;
    const groups = getModifierGroupsForProduct(addModal.product.id);
    for (const g of groups) {
      if (g.is_required && (!selectedModifiers[g.id] || selectedModifiers[g.id].length < g.min_select)) {
        toast({ title: "Required", description: `Please select ${g.name}`, variant: "destructive" });
        return;
      }
    }
    const price = computePrice(addModal.product, selectedModifiers);
    const modifiersJson = { modifier_ids: Object.values(selectedModifiers).flat() };
    setCart((prev) => {
      const key = `${addModal.product.id}-${JSON.stringify(modifiersJson)}`;
      const existing = prev.find(
        (i) => i.product_id === addModal.product.id && JSON.stringify(i.modifiers || {}) === JSON.stringify(modifiersJson)
      );
      if (existing) {
        return prev.map((i) =>
          i === existing ? { ...i, quantity: i.quantity + addModal.qty } : i
        );
      }
      return [
        ...prev,
        {
          product_id: addModal.product.id,
          name: addModal.product.name,
          price,
          quantity: addModal.qty,
          modifiers: modifiersJson,
        },
      ];
    });
    setAddModal(null);
  };

  const updateQuantity = (idx: number, delta: number) => {
    setCart((prev) =>
      prev
        .map((item, i) => (i === idx ? { ...item, quantity: Math.max(0, item.quantity + delta) } : item))
        .filter((item) => item.quantity > 0)
    );
  };

  const handleSubmit = async () => {
    if (!token || cart.length === 0) return;
    setSubmitting(true);
    try {
      const response = await fetch(`${SUPABASE_FUNCTIONS_URL}/table-order-create`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          table_token: token,
          items: cart.map((item) => ({
            product_id: item.product_id,
            quantity: item.quantity,
            price: item.price,
            modifiers: item.modifiers ?? {},
          })),
        }),
      });
      const data = await response.json();
      if (response.ok) {
        toast({ title: "Order submitted", description: "Your order has been sent to the kitchen." });
        setCart([]);
      } else {
        toast({ title: "Error", description: data.error || "Failed to submit order", variant: "destructive" });
      }
    } catch {
      toast({ title: "Error", description: "Failed to submit order", variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  const total = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
    }).format(value);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <UtensilsCrossed className="h-12 w-12 mx-auto mb-4 animate-pulse text-primary" />
          <p className="text-muted-foreground">Loading menu...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto p-4 max-w-6xl">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <UtensilsCrossed className="h-6 w-6 text-primary" />
            <h1 className="text-2xl font-bold">Order Menu</h1>
          </div>
          <div className="text-sm text-muted-foreground">{menu?.branch_id ? "Dine-in" : "Online"}</div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2 space-y-4">
            {(menu?.categories ?? []).map((category: any) => {
              const categoryProducts = (menu?.products ?? []).filter(
                (p: any) => p.category_id === category.id
              );
              if (categoryProducts.length === 0) return null;
              return (
                <Card key={category.id}>
                  <CardHeader>
                    <CardTitle>{category.name}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {categoryProducts.map((product: any) => {
                        const hasModifiers = getModifierGroupsForProduct(product.id).length > 0;
                        return (
                          <div
                            key={product.id}
                            className="border rounded-lg p-3 flex items-center justify-between"
                          >
                            <div className="flex-1">
                              <div className="font-medium">{product.name}</div>
                              <div className="text-sm text-muted-foreground">
                                {formatCurrency(product.sell_price)}
                                {hasModifiers && " + options"}
                              </div>
                            </div>
                            <Button size="sm" onClick={() => (hasModifiers ? openAddModal(product) : quickAdd(product))}>
                              <Plus className="h-4 w-4" />
                            </Button>
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          <div className="lg:col-span-1">
            <Card className="sticky top-4">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ShoppingCart className="h-5 w-5" />
                  Cart ({cart.reduce((s, i) => s + i.quantity, 0)})
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {cart.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">Your cart is empty</p>
                ) : (
                  <>
                    {cart.map((item, idx) => (
                      <div key={idx} className="flex items-center justify-between p-2 border rounded">
                        <div className="flex-1">
                          <div className="font-medium text-sm">{item.name}</div>
                          <div className="text-xs text-muted-foreground">
                            {formatCurrency(item.price)} × {item.quantity}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button size="sm" variant="outline" onClick={() => updateQuantity(idx, -1)}>
                            <Minus className="h-3 w-3" />
                          </Button>
                          <span className="w-8 text-center text-sm">{item.quantity}</span>
                          <Button size="sm" variant="outline" onClick={() => updateQuantity(idx, 1)}>
                            <Plus className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    ))}
                    <div className="border-t pt-3">
                      <div className="flex justify-between font-bold text-lg">
                        <span>Total</span>
                        <span>{formatCurrency(total)}</span>
                      </div>
                      <Button
                        className="w-full mt-3"
                        onClick={handleSubmit}
                        disabled={submitting || cart.length === 0}
                      >
                        {submitting ? "Submitting..." : "Submit Order"}
                      </Button>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </div>
        </div>

        <Dialog open={!!addModal} onOpenChange={() => setAddModal(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{addModal?.product?.name ?? ""}</DialogTitle>
              <DialogDescription>Select options (if any)</DialogDescription>
            </DialogHeader>
            {addModal && (
              <>
                {getModifierGroupsForProduct(addModal.product.id).map((g: ModifierGroup) => {
                  const mods = getModifiersForGroup(g.id);
                  if (mods.length === 0) return null;
                  return (
                    <div key={g.id} className="space-y-2">
                      <Label>
                        {g.name} {g.is_required && "*"}
                      </Label>
                      {g.is_multi ? (
                        <div className="space-y-2">
                          {mods.map((m: Modifier) => (
                            <div key={m.id} className="flex items-center gap-2">
                              <Checkbox
                                id={m.id}
                                checked={(selectedModifiers[g.id] ?? []).includes(m.id)}
                                onCheckedChange={(c) => {
                                  setSelectedModifiers((prev) => {
                                    const arr = prev[g.id] ?? [];
                                    const next = c
                                      ? [...arr, m.id]
                                      : arr.filter((x) => x !== m.id);
                                    return { ...prev, [g.id]: next };
                                  });
                                }}
                              />
                              <label htmlFor={m.id} className="text-sm cursor-pointer">
                                {m.name}{" "}
                                {Number(m.price_delta) !== 0 && (
                                  <span className="text-muted-foreground">
                                    {m.price_type === "percentage"
                                      ? `+${m.price_delta}%`
                                      : `+${formatCurrency(Number(m.price_delta))}`}
                                  </span>
                                )}
                              </label>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <RadioGroup
                          value={selectedModifiers[g.id]?.[0] ?? ""}
                          onValueChange={(v) =>
                            setSelectedModifiers((prev) => ({ ...prev, [g.id]: v ? [v] : [] }))
                          }
                        >
                          {mods.map((m: Modifier) => (
                            <div key={m.id} className="flex items-center gap-2">
                              <RadioGroupItem value={m.id} id={m.id} />
                              <label htmlFor={m.id} className="text-sm cursor-pointer">
                                {m.name}{" "}
                                {Number(m.price_delta) !== 0 && (
                                  <span className="text-muted-foreground">
                                    {m.price_type === "percentage"
                                      ? `+${m.price_delta}%`
                                      : `+${formatCurrency(Number(m.price_delta))}`}
                                  </span>
                                )}
                              </label>
                            </div>
                          ))}
                        </RadioGroup>
                      )}
                    </div>
                  );
                })}
              </>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setAddModal(null)}>
                Cancel
              </Button>
              <Button onClick={confirmAdd}>Add to Cart</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
