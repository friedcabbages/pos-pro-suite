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
} from "lucide-react";
import { cn } from "@/lib/utils";

interface Product {
  id: string;
  name: string;
  price: number;
  category: string;
  stock: number;
  image?: string;
}

interface CartItem extends Product {
  quantity: number;
}

const sampleProducts: Product[] = [
  { id: "1", name: "Espresso", price: 3.5, category: "Beverages", stock: 100 },
  { id: "2", name: "Cappuccino", price: 4.5, category: "Beverages", stock: 100 },
  { id: "3", name: "Latte", price: 5.0, category: "Beverages", stock: 100 },
  { id: "4", name: "Croissant", price: 3.0, category: "Pastry", stock: 25 },
  { id: "5", name: "Blueberry Muffin", price: 3.5, category: "Pastry", stock: 18 },
  { id: "6", name: "Bagel", price: 2.5, category: "Pastry", stock: 30 },
  { id: "7", name: "Sandwich Club", price: 8.5, category: "Food", stock: 15 },
  { id: "8", name: "Caesar Salad", price: 9.0, category: "Food", stock: 12 },
  { id: "9", name: "Organic Fertilizer", price: 25.0, category: "Agriculture", stock: 50 },
  { id: "10", name: "Rice 25kg", price: 28.0, category: "Wholesale", stock: 100 },
  { id: "11", name: "Sugar 1kg", price: 1.5, category: "Wholesale", stock: 200 },
  { id: "12", name: "Flour 5kg", price: 6.0, category: "Wholesale", stock: 80 },
];

const categories = ["All", "Beverages", "Pastry", "Food", "Agriculture", "Wholesale"];

export default function POS() {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [discount, setDiscount] = useState(0);

  const filteredProducts = sampleProducts.filter((product) => {
    const matchesSearch = product.name.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = selectedCategory === "All" || product.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const addToCart = (product: Product) => {
    setCart((prev) => {
      const existing = prev.find((item) => item.id === product.id);
      if (existing) {
        return prev.map((item) =>
          item.id === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }
      return [...prev, { ...product, quantity: 1 }];
    });
  };

  const updateQuantity = (id: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((item) =>
          item.id === id
            ? { ...item, quantity: Math.max(0, item.quantity + delta) }
            : item
        )
        .filter((item) => item.quantity > 0)
    );
  };

  const removeFromCart = (id: string) => {
    setCart((prev) => prev.filter((item) => item.id !== id));
  };

  const clearCart = () => {
    setCart([]);
    setDiscount(0);
  };

  const subtotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const discountAmount = (subtotal * discount) / 100;
  const total = subtotal - discountAmount;
  const itemCount = cart.reduce((sum, item) => sum + item.quantity, 0);

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
              {categories.map((category) => (
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
            <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
              {filteredProducts.map((product) => (
                <button
                  key={product.id}
                  onClick={() => addToCart(product)}
                  className="group rounded-xl border border-border bg-card p-4 text-left transition-all hover:border-primary hover:shadow-lg active:scale-[0.98]"
                >
                  <div className="mb-3 flex h-16 w-full items-center justify-center rounded-lg bg-secondary">
                    <span className="text-2xl">
                      {product.category === "Beverages" && "☕"}
                      {product.category === "Pastry" && "🥐"}
                      {product.category === "Food" && "🥗"}
                      {product.category === "Agriculture" && "🌱"}
                      {product.category === "Wholesale" && "📦"}
                    </span>
                  </div>
                  <h4 className="truncate text-sm font-medium text-foreground">
                    {product.name}
                  </h4>
                  <div className="mt-1 flex items-center justify-between">
                    <span className="text-lg font-bold text-primary">
                      ${product.price.toFixed(2)}
                    </span>
                    <Badge variant="secondary" className="text-xs">
                      {product.stock}
                    </Badge>
                  </div>
                </button>
              ))}
            </div>
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
                        ${item.price.toFixed(2)} each
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
                        ${(item.price * item.quantity).toFixed(2)}
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
                <span>${subtotal.toFixed(2)}</span>
              </div>
              {discount > 0 && (
                <div className="flex justify-between text-success">
                  <span>Discount ({discount}%)</span>
                  <span>-${discountAmount.toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between text-lg font-bold text-foreground">
                <span>Total</span>
                <span>${total.toFixed(2)}</span>
              </div>
            </div>

            {/* Payment Buttons */}
            <div className="grid grid-cols-3 gap-2">
              <Button variant="outline" className="flex-col h-16" disabled={cart.length === 0}>
                <Banknote className="mb-1 h-5 w-5" />
                <span className="text-xs">Cash</span>
              </Button>
              <Button variant="outline" className="flex-col h-16" disabled={cart.length === 0}>
                <CreditCard className="mb-1 h-5 w-5" />
                <span className="text-xs">Card</span>
              </Button>
              <Button variant="outline" className="flex-col h-16" disabled={cart.length === 0}>
                <QrCode className="mb-1 h-5 w-5" />
                <span className="text-xs">QRIS</span>
              </Button>
            </div>

            <Button 
              variant="glow" 
              className="w-full h-12 text-base" 
              disabled={cart.length === 0}
            >
              <Receipt className="mr-2 h-5 w-5" />
              Complete Sale
            </Button>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
