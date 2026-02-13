import { useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Receipt, CreditCard, Banknote, QrCode, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { QueryBoundary } from "@/components/QueryBoundary";
import { useBusiness } from "@/contexts/BusinessContext";
import {
  useFnbCashierTables,
  useFnbOpenBills,
  useFnbOpenBillDetails,
  useCloseFnbBill,
  useFnbCashierRealtime,
} from "@/hooks/useFnbCashier";

export default function FnbCashier() {
  const { business } = useBusiness();
  const [selectedTableId, setSelectedTableId] = useState<string | null>(null);
  useFnbCashierRealtime();
  const [paymentMethod, setPaymentMethod] = useState<"cash" | "card" | "qris" | null>(null);

  const { data: tables = [], isLoading: tablesLoading, isError: tablesError, error: tablesErrorObj, refetch: refetchTables } = useFnbCashierTables();
  const { data: openBills = [] } = useFnbOpenBills();
  const { data: billDetails, isLoading: billDetailsLoading } = useFnbOpenBillDetails(selectedTableId);
  const closeBill = useCloseFnbBill();

  const openBillTableIds = new Set(openBills.map((b) => (b as { table_id: string }).table_id).filter(Boolean));

  const formatCurrency = (value: number) => {
    const currency = business?.currency ?? "IDR";
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency,
      minimumFractionDigits: 0,
    }).format(value);
  };

  const handleCheckout = () => {
    if (!paymentMethod) {
      toast.error("Please select a payment method to continue.");
      return;
    }
    if (!selectedTableId || !billDetails) return;
    closeBill.mutate(
      { tableId: selectedTableId },
      {
        onSuccess: () => {
          setSelectedTableId(null);
          setPaymentMethod(null);
        },
      }
    );
  };

  const handleTableSelect = (tableId: string) => {
    setSelectedTableId((prev) => (prev === tableId ? null : tableId));
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

        <QueryBoundary isLoading={tablesLoading} isError={!!tablesError} error={tablesErrorObj ?? undefined} refetch={refetchTables}>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>Select Table</CardTitle>
              <CardDescription>Choose a table to view its bill</CardDescription>
            </CardHeader>
            <CardContent>
              {tablesLoading ? (
                <div className="grid grid-cols-4 gap-2">
                  {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="h-10 rounded-md bg-muted animate-pulse" />
                  ))}
                </div>
              ) : tables.length === 0 ? (
                <div className="p-6 border rounded-lg bg-muted/50">
                  <p className="text-muted-foreground text-center">
                    No tables configured. Add tables in Floor Plan or Tables & QR.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-4 gap-2">
                  {tables.map((table) => {
                    const hasOpenBill = openBillTableIds.has(table.id);
                    return (
                      <Button
                        key={table.id}
                        variant={selectedTableId === table.id ? "default" : "outline"}
                        onClick={() => handleTableSelect(table.id)}
                        className={hasOpenBill ? "ring-2 ring-primary/50" : ""}
                      >
                        <span className="truncate">{table.name}</span>
                        {hasOpenBill && (
                          <span className="ml-1 text-xs opacity-80">(bill)</span>
                        )}
                      </Button>
                    );
                  })}
                </div>
              )}

              {selectedTableId && !billDetailsLoading && billDetails && (
                <div className="mt-6 space-y-4">
                  <div>
                    <h3 className="font-semibold mb-2">Orders</h3>
                    <div className="space-y-2">
                      {billDetails.orders.length === 0 ? (
                        <p className="text-muted-foreground text-sm">
                          No orders in this bill
                        </p>
                      ) : (
                        billDetails.orders.map((order) => (
                          <div
                            key={order.id}
                            className="flex justify-between p-2 border rounded"
                          >
                            <span>Order #{order.id.slice(0, 8)}</span>
                            <span className="font-medium">
                              {formatCurrency(order.total)}
                            </span>
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                  <div className="border-t pt-4 space-y-2">
                    <div className="flex justify-between">
                      <span>Subtotal</span>
                      <span>{formatCurrency(billDetails.subtotal)}</span>
                    </div>
                    {billDetails.serviceCharge > 0 && (
                      <div className="flex justify-between">
                        <span>Service Charge</span>
                        <span>{formatCurrency(billDetails.serviceCharge)}</span>
                      </div>
                    )}
                    {billDetails.taxAmount > 0 && (
                      <div className="flex justify-between">
                        <span>Tax</span>
                        <span>{formatCurrency(billDetails.taxAmount)}</span>
                      </div>
                    )}
                    <div className="flex justify-between text-lg font-bold border-t pt-2">
                      <span>Total</span>
                      <span>{formatCurrency(billDetails.total)}</span>
                    </div>
                  </div>
                </div>
              )}

              {selectedTableId && !billDetailsLoading && !billDetails && (
                <div className="mt-6 p-4 border rounded-lg bg-muted/50">
                  <p className="text-muted-foreground">
                    No open bill for this table. Select a table with an active bill.
                  </p>
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

              {paymentMethod && billDetails && (
                <div className="space-y-2">
                  <Label>Payment Amount</Label>
                  <Input
                    type="number"
                    defaultValue={billDetails.total}
                    placeholder="Enter amount"
                  />
                </div>
              )}

              <Button
                className="w-full"
                size="lg"
                onClick={handleCheckout}
                disabled={!billDetails || !paymentMethod || closeBill.isPending}
              >
                <CheckCircle2 className="h-4 w-4 mr-2" />
                {closeBill.isPending ? "Processing..." : "Process Payment"}
              </Button>
            </CardContent>
          </Card>
        </div>
        </QueryBoundary>
      </div>
    </DashboardLayout>
  );
}
