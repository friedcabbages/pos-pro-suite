import { useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Receipt, CreditCard, Banknote, QrCode, CheckCircle2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function FnbCashier() {
  const { toast } = useToast();
  const [selectedTable] = useState<string | null>("1");
  const [paymentMethod, setPaymentMethod] = useState<"cash" | "card" | "qris" | null>(null);

  const bills = [
    {
      id: "1",
      tableName: "Table 1",
      orders: [
        { id: "1", items: 3, total: 125000 },
        { id: "2", items: 2, total: 85000 },
      ],
      subtotal: 210000,
      serviceCharge: 0,
      tax: 0,
      total: 210000,
    },
  ];

  const currentBill = bills.find((b) => b.id === selectedTable);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
    }).format(value);
  };

  const handleCheckout = () => {
    if (!paymentMethod) {
      toast({
        title: "Select payment method",
        description: "Please select a payment method to continue.",
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "Payment processed",
      description: `Bill closed successfully via ${paymentMethod}.`,
    });
  };

  return (
    <DashboardLayout>
      <div className="container mx-auto p-6">
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-2">
            <Receipt className="h-6 w-6 text-primary" />
            <h1 className="text-2xl font-bold">Cashier</h1>
          </div>
          <p className="text-muted-foreground">
            Process payments and close bills
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>Select Table</CardTitle>
              <CardDescription>Choose a table to view its bill</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-4 gap-2">
                {[1, 2, 3, 4, 5, 6, 7, 8].map((num) => (
                  <Button
                    key={num}
                    variant={selectedTable === String(num) ? "default" : "outline"}
                    onClick={() => {}}
                  >
                    Table {num}
                  </Button>
                ))}
              </div>

              {currentBill && (
                <div className="mt-6 space-y-4">
                  <div>
                    <h3 className="font-semibold mb-2">Orders</h3>
                    <div className="space-y-2">
                      {currentBill.orders.map((order) => (
                        <div
                          key={order.id}
                          className="flex justify-between p-2 border rounded"
                        >
                          <span>Order #{order.id}</span>
                          <span className="font-medium">
                            {formatCurrency(order.total)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="border-t pt-4 space-y-2">
                    <div className="flex justify-between">
                      <span>Subtotal</span>
                      <span>{formatCurrency(currentBill.subtotal)}</span>
                    </div>
                    {currentBill.serviceCharge > 0 && (
                      <div className="flex justify-between">
                        <span>Service Charge</span>
                        <span>{formatCurrency(currentBill.serviceCharge)}</span>
                      </div>
                    )}
                    {currentBill.tax > 0 && (
                      <div className="flex justify-between">
                        <span>Tax</span>
                        <span>{formatCurrency(currentBill.tax)}</span>
                      </div>
                    )}
                    <div className="flex justify-between text-lg font-bold border-t pt-2">
                      <span>Total</span>
                      <span>{formatCurrency(currentBill.total)}</span>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Payment</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-3 gap-2">
                <Button
                  variant={paymentMethod === "cash" ? "default" : "outline"}
                  className="flex-col h-16"
                  onClick={() => setPaymentMethod("cash")}
                >
                  <Banknote className="h-5 w-5 mb-1" />
                  <span className="text-xs">Cash</span>
                </Button>
                <Button
                  variant={paymentMethod === "card" ? "default" : "outline"}
                  className="flex-col h-16"
                  onClick={() => setPaymentMethod("card")}
                >
                  <CreditCard className="h-5 w-5 mb-1" />
                  <span className="text-xs">Card</span>
                </Button>
                <Button
                  variant={paymentMethod === "qris" ? "default" : "outline"}
                  className="flex-col h-16"
                  onClick={() => setPaymentMethod("qris")}
                >
                  <QrCode className="h-5 w-5 mb-1" />
                  <span className="text-xs">QRIS</span>
                </Button>
              </div>

              {paymentMethod && currentBill && (
                <div className="space-y-2">
                  <Label>Payment Amount</Label>
                  <Input
                    type="number"
                    defaultValue={currentBill.total}
                    placeholder="Enter amount"
                  />
                </div>
              )}

              <Button
                className="w-full"
                size="lg"
                onClick={handleCheckout}
                disabled={!currentBill || !paymentMethod}
              >
                <CheckCircle2 className="h-4 w-4 mr-2" />
                Process Payment
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}
