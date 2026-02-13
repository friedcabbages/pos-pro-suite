import { useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ChefHat, Clock, Printer, CheckCircle2 } from "lucide-react";
import { QueryBoundary } from "@/components/QueryBoundary";
import { useToast } from "@/hooks/use-toast";
import {
  useFnbOrders,
  useUpdateFnbOrderItemStatus,
} from "@/hooks/useFnb";

export default function FnbKDS() {
  const { toast } = useToast();
  const [activeStation, setActiveStation] = useState<"kitchen" | "bar">("kitchen");

  const { data: orders = [], isLoading, isError, error, refetch } = useFnbOrders({
    statusIn: ["accepted", "preparing", "ready"],
  });
  const updateItemStatus = useUpdateFnbOrderItemStatus();

  const handleUpdateStatus = async (itemId: string, newStatus: "preparing" | "ready" | "served") => {
    await updateItemStatus.mutateAsync({ itemId, status: newStatus });
    toast({ title: "Status updated", description: `Item marked as ${newStatus}.` });
  };

  const handlePrintTicket = (orderId: string) => {
    toast({ title: "Printing ticket", description: "Opening print dialog..." });
    window.print();
  };

  const grouped = orders.map((order) => {
    const tableName = (order.fnb_tables as { name?: string } | null)?.name ?? "Takeaway";
    const items = (order.fnb_order_items as Array<{
      id: string;
      quantity: number;
      status: string;
      station: string | null;
      products: { name?: string } | null;
    }>) ?? [];
    const filteredItems = items.filter((i) => (i.station ?? "kitchen") === activeStation);
    return {
      ...order,
      tableName,
      items: filteredItems,
    };
  }).filter((o) => o.items.length > 0);

  return (
    <DashboardLayout>
      <div className="container mx-auto p-6">
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-2">
            <ChefHat className="h-6 w-6 text-primary" />
            <h1 className="text-2xl font-bold">Kitchen Display System</h1>
          </div>
          <p className="text-muted-foreground">
            Monitor and manage orders by station
          </p>
        </div>

        <QueryBoundary isLoading={isLoading} isError={!!isError} error={error ?? undefined} refetch={refetch}>
        <Tabs value={activeStation} onValueChange={(v) => setActiveStation(v as "kitchen" | "bar")} className="w-full">
          <TabsList className="mb-4">
            <TabsTrigger value="kitchen">Kitchen</TabsTrigger>
            <TabsTrigger value="bar">Bar</TabsTrigger>
          </TabsList>

          <TabsContent value="kitchen" className="space-y-4">
            {grouped.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <ChefHat className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                  <p className="text-muted-foreground">No active orders for kitchen</p>
                </CardContent>
              </Card>
            ) : (
              grouped.map((order) => (
                <Card key={order.id}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="text-lg">{order.tableName}</CardTitle>
                        <CardDescription>
                          <Clock className="h-3 w-3 inline mr-1" />
                          {new Date(order.created_at).toLocaleTimeString()}
                        </CardDescription>
                      </div>
                      <Button variant="outline" size="sm" onClick={() => handlePrintTicket(order.id)}>
                        <Printer className="h-4 w-4 mr-2" />
                        Print
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {order.items.map((item) => (
                        <div
                          key={item.id}
                          className="flex items-center justify-between p-3 border rounded-lg"
                        >
                          <div>
                            <div className="font-medium">
                              {item.quantity}x {(item.products as { name?: string } | null)?.name ?? "Item"}
                            </div>
                            <Badge
                              variant={
                                item.status === "preparing"
                                  ? "default"
                                  : item.status === "ready" || item.status === "served"
                                  ? "secondary"
                                  : "outline"
                              }
                              className="mt-1"
                            >
                              {item.status}
                            </Badge>
                          </div>
                          <div className="flex gap-2">
                            {item.status === "pending" && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleUpdateStatus(item.id, "preparing")}
                                disabled={updateItemStatus.isPending}
                              >
                                Start
                              </Button>
                            )}
                            {item.status === "preparing" && (
                              <Button
                                size="sm"
                                onClick={() => handleUpdateStatus(item.id, "ready")}
                                disabled={updateItemStatus.isPending}
                              >
                                <CheckCircle2 className="h-4 w-4 mr-2" />
                                Ready
                              </Button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>

          <TabsContent value="bar" className="space-y-4">
            {grouped.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <ChefHat className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                  <p className="text-muted-foreground">No active orders for bar</p>
                </CardContent>
              </Card>
            ) : (
              grouped.map((order) => (
                <Card key={order.id}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="text-lg">{order.tableName}</CardTitle>
                        <CardDescription>
                          <Clock className="h-3 w-3 inline mr-1" />
                          {new Date(order.created_at).toLocaleTimeString()}
                        </CardDescription>
                      </div>
                      <Button variant="outline" size="sm" onClick={() => handlePrintTicket(order.id)}>
                        <Printer className="h-4 w-4 mr-2" />
                        Print
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {order.items.map((item) => (
                        <div
                          key={item.id}
                          className="flex items-center justify-between p-3 border rounded-lg"
                        >
                          <div>
                            <div className="font-medium">
                              {item.quantity}x {(item.products as { name?: string } | null)?.name ?? "Item"}
                            </div>
                            <Badge
                              variant={
                                item.status === "preparing"
                                  ? "default"
                                  : item.status === "ready" || item.status === "served"
                                  ? "secondary"
                                  : "outline"
                              }
                              className="mt-1"
                            >
                              {item.status}
                            </Badge>
                          </div>
                          <div className="flex gap-2">
                            {item.status === "pending" && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleUpdateStatus(item.id, "preparing")}
                                disabled={updateItemStatus.isPending}
                              >
                                Start
                              </Button>
                            )}
                            {item.status === "preparing" && (
                              <Button
                                size="sm"
                                onClick={() => handleUpdateStatus(item.id, "ready")}
                                disabled={updateItemStatus.isPending}
                              >
                                <CheckCircle2 className="h-4 w-4 mr-2" />
                                Ready
                              </Button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>
        </Tabs>
        </QueryBoundary>
      </div>
    </DashboardLayout>
  );
}
