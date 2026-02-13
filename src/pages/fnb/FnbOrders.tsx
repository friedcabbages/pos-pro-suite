import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ShoppingBag, CheckCircle2, XCircle, Clock } from "lucide-react";
import { QueryBoundary } from "@/components/QueryBoundary";
import { useToast } from "@/hooks/use-toast";
import { useFnbOrders, useUpdateFnbOrderStatus } from "@/hooks/useFnb";
import { useBusiness } from "@/contexts/BusinessContext";

export default function FnbOrders() {
  const { toast } = useToast();
  const { business } = useBusiness();
  const { data: orders = [], isLoading, isError, error, refetch } = useFnbOrders({
    statusIn: ["pending", "accepted", "preparing", "ready"],
  });
  const updateStatus = useUpdateFnbOrderStatus();

  const handleAccept = async (orderId: string) => {
    await updateStatus.mutateAsync({ orderId, status: "accepted" });
    toast({ title: "Order accepted", description: "Sent to kitchen." });
  };

  const handleReject = async (orderId: string) => {
    await updateStatus.mutateAsync({ orderId, status: "rejected" });
    toast({ title: "Order rejected", variant: "destructive" });
  };

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: business?.currency ?? "IDR",
      minimumFractionDigits: 0,
    }).format(value);

  const pendingOrders = orders.filter((o) => o.status === "pending");

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

        <QueryBoundary isLoading={isLoading} isError={!!isError} error={error ?? undefined} refetch={refetch}>
        {pendingOrders.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Clock className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
              <p className="text-muted-foreground">No pending orders</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {pendingOrders.map((order) => {
              const tableName = (order.fnb_tables as { name?: string } | null)?.name ?? "Takeaway";
              const items = (order.fnb_order_items as Array<{ quantity: number; price: number }>) ?? [];
              const itemCount = items.reduce((s, i) => s + (i.quantity ?? 0), 0);
              const total = items.reduce((s, i) => s + (i.quantity ?? 0) * Number(i.price ?? 0), 0);
              return (
                <Card key={order.id}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="text-lg">{tableName}</CardTitle>
                        <CardDescription>
                          {order.customer_name || "Walk-in"} • {itemCount} items
                        </CardDescription>
                      </div>
                      <Badge variant="default">{order.status}</Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-between">
                      <div className="text-lg font-semibold">{formatCurrency(total)}</div>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleReject(order.id)}
                          disabled={updateStatus.isPending}
                        >
                          <XCircle className="h-4 w-4 mr-2" />
                          Reject
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => handleAccept(order.id)}
                          disabled={updateStatus.isPending}
                        >
                          <CheckCircle2 className="h-4 w-4 mr-2" />
                          Accept
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
        </QueryBoundary>
      </div>
    </DashboardLayout>
  );
}
