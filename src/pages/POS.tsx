import { useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Search,
  Plus,
  Minus,
  Trash2,
  CreditCard,
  Banknote,
  QrCode,
  Receipt,
  X,
  Loader2,
} from "lucide-react";
import { useProducts } from "@/hooks/useProducts";
import { useCategories } from "@/hooks/useCategories";
import { useCreateSale } from "@/hooks/useSales";
import { useBusiness } from "@/contexts/BusinessContext";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";

interface CartItem {
  id: string;
  name: string;
  price: number;
  cost_price: number;
  quantity: number;
  stock: number;
  product_id: string;
}

export default function POS() {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [discount, setDiscount] = useState(0);
  const [customerName, setCustomerName] = useState("");

  const { data: products, isLoading: productsLoading } = useProducts();
  const { data: categories } = useCategories();
  const createSale = useCreateSale();
  const { business, branch, warehouse } = useBusiness();
  const { toast } = useToast();

  const allCategories = ["All", ...(categories?.map(c => c.name) || [])];

  const filteredProducts = products?.filter((product) => {
    const matchesSearch = product.name.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = selectedCategory === "All" || 
      categories?.find(c => c.id === product.category_id)?.name === selectedCategory;
    return matchesSearch && matchesCategory && product.is_active;
  }) || [];

  const addToCart = (product: any) => {
    const stock = product.inventory?.[0]?.quantity || 0;
    
    setCart((prev) => {
      const existing = prev.find((item) => item.product_id === product.id);
      if (existing) {
        if (existing.quantity >= stock) {
          toast({ title: "Not enough stock", variant: "destructive" });
          return prev;
        }
        return prev.map((item) =>
          item.product_id === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }
      if (stock <= 0) {
        toast({ title: "Out of stock", variant: "destructive" });
        return prev;
      }
      return [...prev, {
        id: crypto.randomUUID(),
        product_id: product.id,
        name: product.name,
        price: product.sell_price,
        cost_price: product.cost_price,
        quantity: 1,
        stock,
      }];
    });
  };

  const updateQuantity = (id: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((item) => {
          if (item.id !== id) return item;
          const newQty = Math.max(0, item.quantity + delta);
          if (newQty > item.stock) {
            toast({ title: "Not enough stock", variant: "destructive" });
            return item;
          }
          return { ...item, quantity: newQty };
        })
        .filter((item) => item.quantity > 0)
    );
  };

  const removeFromCart = (id: string) => {
    setCart((prev) => prev.filter((item) => item.id !== id));
  };

  const clearCart = () => {
    setCart([]);
    setDiscount(0);
    setCustomerName("");
  };

  const subtotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const discountAmount = (subtotal * discount) / 100;
  const total = subtotal - discountAmount;
  const itemCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  const handleCheckout = async (method: "cash" | "card" | "qris" | "transfer") => {
    if (!branch || !warehouse) {
      toast({ title: "Please select a branch and warehouse", variant: "destructive" });
      return;
    }
    
    if (cart.length === 0) {
      toast({ title: "Cart is empty", variant: "destructive" });
      return;
    }

    const saleData = {
      branch_id: branch.id,
      warehouse_id: warehouse.id,
      subtotal,
      discount_amount: discountAmount,
      total,
      payment_method: method,
      payment_amount: total,
      customer_name: customerName || null,
      items: cart.map((item) => ({
        product_id: item.product_id,
        quantity: item.quantity,
        sell_price: item.price,
        cost_price: item.cost_price,
        discount_amount: 0,
        total: item.price * item.quantity,
        profit: (item.price - item.cost_price) * item.quantity,
      })),
    };

    createSale.mutate(saleData, {
      onSuccess: () => {
        toast({ title: "Sale completed successfully!" });
        clearCart();
      },
      onError: (error: any) => {
        toast({ title: "Sale failed", description: error.message, variant: "destructive" });
      },
    });
  };

  const getCategoryIcon = (categoryName: string) => {
    const name = categoryName.toLowerCase();
    if (name.includes("beverage") || name.includes("drink") || name === "all") return "☕";
    if (name.includes("pastry") || name.includes("bake")) return "🥐";
    if (name.includes("food")) return "🥗";
    if (name.includes("agri") || name.includes("farm")) return "🌱";
    return "📦";
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
      <div className="flex h-[calc(100vh-7rem)] gap-6">
        {/* Products Section */}
        <div className="flex flex-1 flex-col">
          {/* Search & Categories */}
          <div className="mb-4 space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Search products or scan barcode..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="flex flex-wrap gap-2">
              {allCategories.map((category) => (
                <Button
                  key={category}
                  variant={selectedCategory === category ? "default" : "secondary"}
                  size="sm"
                  onClick={() => setSelectedCategory(category)}
                >
                  {category}
                </Button>
              ))}
            </div>
          </div>

          {/* Products Grid */}
          <div className="flex-1 overflow-y-auto">
            {productsLoading ? (
              <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
                {[...Array(10)].map((_, i) => (
                  <Skeleton key={i} className="h-32 rounded-xl" />
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
                {filteredProducts.map((product) => {
                  const stock = product.inventory?.[0]?.quantity || 0;
                  const category = categories?.find(c => c.id === product.category_id);
                  return (
                    <button
                      key={product.id}
                      onClick={() => addToCart(product)}
                      disabled={stock <= 0}
                      className="group rounded-xl border border-border bg-card p-4 text-left transition-all hover:border-primary hover:shadow-lg active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <div className="mb-3 flex h-16 w-full items-center justify-center rounded-lg bg-secondary">
                        <span className="text-2xl">
                          {getCategoryIcon(category?.name || "")}
                        </span>
                      </div>
                      <h4 className="truncate text-sm font-medium text-foreground">
                        {product.name}
                      </h4>
                      <div className="mt-1 flex items-center justify-between">
                        <span className="text-lg font-bold text-primary">
                          {formatCurrency(product.sell_price)}
                        </span>
                        <Badge variant={stock > 0 ? "secondary" : "destructive"} className="text-xs">
                          {stock}
                        </Badge>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Cart Section */}
        <div className="flex w-96 flex-col rounded-xl border border-border bg-card shadow-lg">
          {/* Cart Header */}
          <div className="flex items-center justify-between border-b border-border p-4">
            <div>
              <h2 className="text-lg font-semibold text-foreground">Current Order</h2>
              <p className="text-sm text-muted-foreground">{itemCount} items</p>
            </div>
            {cart.length > 0 && (
              <Button variant="ghost" size="sm" onClick={clearCart}>
                <X className="mr-1 h-4 w-4" />
                Clear
              </Button>
            )}
          </div>

          {/* Customer Name */}
          <div className="border-b border-border p-4">
            <Input
              placeholder="Customer name (optional)"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
            />
          </div>

          {/* Cart Items */}
          <div className="flex-1 overflow-y-auto p-4">
            {cart.length === 0 ? (
              <div className="flex h-full flex-col items-center justify-center text-center">
                <Receipt className="mb-4 h-12 w-12 text-muted-foreground/50" />
                <p className="text-muted-foreground">No items in cart</p>
                <p className="text-sm text-muted-foreground/70">
                  Click products to add them
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {cart.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center gap-3 rounded-lg border border-border/50 p-3"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="truncate text-sm font-medium text-foreground">
                        {item.name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatCurrency(item.price)} each
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => updateQuantity(item.id, -1)}
                      >
                        <Minus className="h-3 w-3" />
                      </Button>
                      <span className="w-8 text-center text-sm font-medium">
                        {item.quantity}
                      </span>
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => updateQuantity(item.id, 1)}
                      >
                        <Plus className="h-3 w-3" />
                      </Button>
                    </div>
                    <div className="w-16 text-right">
                      <p className="text-sm font-semibold text-foreground">
                        {formatCurrency(item.price * item.quantity)}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-destructive hover:bg-destructive/10"
                      onClick={() => removeFromCart(item.id)}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Cart Summary */}
          <div className="border-t border-border p-4 space-y-4">
            {/* Discount */}
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Discount %</span>
              <Input
                type="number"
                min="0"
                max="100"
                value={discount}
                onChange={(e) => setDiscount(Number(e.target.value))}
                className="h-8 w-20"
              />
            </div>

            {/* Totals */}
            <div className="space-y-2 text-sm">
              <div className="flex justify-between text-muted-foreground">
                <span>Subtotal</span>
                <span>{formatCurrency(subtotal)}</span>
              </div>
              {discount > 0 && (
                <div className="flex justify-between text-success">
                  <span>Discount ({discount}%)</span>
                  <span>-{formatCurrency(discountAmount)}</span>
                </div>
              )}
              <div className="flex justify-between text-lg font-bold text-foreground">
                <span>Total</span>
                <span>{formatCurrency(total)}</span>
              </div>
            </div>

            {/* Payment Buttons */}
            <div className="grid grid-cols-3 gap-2">
              <Button 
                variant="outline" 
                className="flex-col h-16" 
                disabled={cart.length === 0 || createSale.isPending}
                onClick={() => handleCheckout("cash")}
              >
                <Banknote className="mb-1 h-5 w-5" />
                <span className="text-xs">Cash</span>
              </Button>
              <Button 
                variant="outline" 
                className="flex-col h-16" 
                disabled={cart.length === 0 || createSale.isPending}
                onClick={() => handleCheckout("card")}
              >
                <CreditCard className="mb-1 h-5 w-5" />
                <span className="text-xs">Card</span>
              </Button>
              <Button 
                variant="outline" 
                className="flex-col h-16" 
                disabled={cart.length === 0 || createSale.isPending}
                onClick={() => handleCheckout("qris")}
              >
                <QrCode className="mb-1 h-5 w-5" />
                <span className="text-xs">QRIS</span>
              </Button>
            </div>

            <Button 
              variant="glow" 
              className="w-full h-12 text-base" 
              disabled={cart.length === 0 || createSale.isPending}
              onClick={() => handleCheckout("cash")}
            >
              {createSale.isPending ? (
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              ) : (
                <Receipt className="mr-2 h-5 w-5" />
              )}
              Complete Sale
            </Button>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
