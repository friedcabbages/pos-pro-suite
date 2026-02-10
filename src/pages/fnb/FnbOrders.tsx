import { useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ShoppingBag, CheckCircle2, XCircle, Clock } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function FnbOrders() {
  const { toast } = useToast();
  const [orders] = useState<Array<{
    id: string;
    tableName: string;
    customerName: string | null;
    itemCount: number;
    total: number;
    status: string;
    createdAt: string;
  }>>([
    {
      id: "1",
      tableName: "Table 1",
      customerName: null,
      itemCount: 3,
      total: 125000,
      status: "pending",
      createdAt: new Date().toISOString(),
    },
    {
      id: "2",
      tableName: "Table 2",
      customerName: "John Doe",
      itemCount: 2,
      total: 85000,
      status: "pending",
      createdAt: new Date().toISOString(),
    },
  ]);

  const handleAccept = (orderId: string) => {
    toast({
      title: "Order accepted",
      description: "Order has been sent to kitchen.",
    });
  };

  const handleReject = (orderId: string) => {
    toast({
      title: "Order rejected",
      description: "Order has been rejected.",
      variant: "destructive",
    });
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
    }).format(value);
  };

  return (
    <DashboardLayout>
      <div className="container mx-auto p-6">
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-2">
            <ShoppingBag className="h-6 w-6 text-primary" />
            <h1 className="text-2xl font-bold">Order Queue</h1>
          </div>
          <p className="text-muted-foreground">
            Review and accept incoming orders from customers
          </p>
        </div>

        <div className="space-y-4">
          {orders.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Clock className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                <p className="text-muted-foreground">No pending orders</p>
              </CardContent>
            </Card>
          ) : (
            orders.map((order) => (
              <Card key={order.id}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-lg">{order.tableName}</CardTitle>
                      <CardDescription>
                        {order.customerName || "Walk-in"} • {order.itemCount} items
                      </CardDescription>
                    </div>
                    <Badge
                      variant={
                        order.status === "pending"
                          ? "default"
                          : order.status === "accepted"
                          ? "secondary"
                          : "destructive"
                      }
                    >
                      {order.status}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <div className="text-lg font-semibold">
                      {formatCurrency(order.total)}
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleReject(order.id)}
                      >
                        <XCircle className="h-4 w-4 mr-2" />
                        Reject
                      </Button>
                      <Button size="sm" onClick={() => handleAccept(order.id)}>
                        <CheckCircle2 className="h-4 w-4 mr-2" />
                        Accept
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
