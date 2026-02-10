import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Search, Plus, Minus, ShoppingCart, UtensilsCrossed } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_FUNCTIONS_URL = `${SUPABASE_URL}/functions/v1`;

export default function TableOrderPage() {
  const { token } = useParams<{ token: string }>();
  const { toast } = useToast();
  const [menu, setMenu] = useState<any>(null);
  const [cart, setCart] = useState<Array<{ product_id: string; name: string; price: number; quantity: number }>>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const loadMenu = async () => {
      try {
        const response = await fetch(`${SUPABASE_FUNCTIONS_URL}/public-menu`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ table_token: token }),
        });
        const data = await response.json();
        if (response.ok) {
          setMenu(data);
        } else {
          toast({
            title: "Error",
            description: data.error || "Failed to load menu",
            variant: "destructive",
          });
        }
      } catch (error) {
        toast({
          title: "Error",
          description: "Failed to load menu",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    if (token) {
      loadMenu();
    }
  }, [token, toast]);

  const addToCart = (product: any) => {
    setCart((prev) => {
      const existing = prev.find((item) => item.product_id === product.id);
      if (existing) {
        return prev.map((item) =>
          item.product_id === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }
      return [...prev, { product_id: product.id, name: product.name, price: product.sell_price, quantity: 1 }];
    });
  };

  const updateQuantity = (productId: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((item) =>
          item.product_id === productId
            ? { ...item, quantity: Math.max(0, item.quantity + delta) }
            : item
        )
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
          })),
        }),
      });

      const data = await response.json();
      if (response.ok) {
        toast({
          title: "Order submitted",
          description: "Your order has been sent to the kitchen.",
        });
        setCart([]);
      } else {
        toast({
          title: "Error",
          description: data.error || "Failed to submit order",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to submit order",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const total = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
    }).format(value);
  };

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
          <Badge variant="outline">{menu?.branch_id ? "Dine-in" : "Online"}</Badge>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2 space-y-4">
            {menu?.categories?.map((category: any) => {
              const categoryProducts = menu.products?.filter(
                (p: any) => p.category_id === category.id
              ) || [];
              if (categoryProducts.length === 0) return null;

              return (
                <Card key={category.id}>
                  <CardHeader>
                    <CardTitle>{category.name}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {categoryProducts.map((product: any) => (
                        <div
                          key={product.id}
                          className="border rounded-lg p-3 flex items-center justify-between"
                        >
                          <div className="flex-1">
                            <div className="font-medium">{product.name}</div>
                            <div className="text-sm text-muted-foreground">
                              {formatCurrency(product.sell_price)}
                            </div>
                          </div>
                          <Button size="sm" onClick={() => addToCart(product)}>
                            <Plus className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
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
                  Cart ({cart.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {cart.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    Your cart is empty
                  </p>
                ) : (
                  <>
                    {cart.map((item) => (
                      <div
                        key={item.product_id}
                        className="flex items-center justify-between p-2 border rounded"
                      >
                        <div className="flex-1">
                          <div className="font-medium text-sm">{item.name}</div>
                          <div className="text-xs text-muted-foreground">
                            {formatCurrency(item.price)} each
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => updateQuantity(item.product_id, -1)}
                          >
                            <Minus className="h-3 w-3" />
                          </Button>
                          <span className="w-8 text-center text-sm">{item.quantity}</span>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => updateQuantity(item.product_id, 1)}
                          >
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
      </div>
    </div>
  );
}
