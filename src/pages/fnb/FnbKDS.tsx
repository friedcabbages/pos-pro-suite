import { useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ChefHat, Clock, Printer, CheckCircle2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function FnbKDS() {
  const { toast } = useToast();
  const [activeStation] = useState<"kitchen" | "bar">("kitchen");

  const orders = [
    {
      id: "1",
      tableName: "Table 1",
      items: [
        { id: "1", name: "Nasi Goreng", quantity: 2, status: "preparing", station: "kitchen" },
        { id: "2", name: "Es Teh", quantity: 2, status: "preparing", station: "bar" },
      ],
      createdAt: new Date().toISOString(),
    },
    {
      id: "2",
      tableName: "Table 2",
      items: [
        { id: "3", name: "Mie Ayam", quantity: 1, status: "ready", station: "kitchen" },
      ],
      createdAt: new Date().toISOString(),
    },
  ];

  const handleUpdateStatus = (orderId: string, itemId: string, newStatus: string) => {
    toast({
      title: "Status updated",
      description: `Item status updated to ${newStatus}.`,
    });
  };

  const handlePrintTicket = (orderId: string) => {
    toast({
      title: "Printing ticket",
      description: "Opening print dialog...",
    });
    window.print();
  };

  const filteredOrders = orders.map((order) => ({
    ...order,
    items: order.items.filter((item) => item.station === activeStation),
  })).filter((order) => order.items.length > 0);

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

        <Tabs defaultValue="kitchen" className="w-full">
          <TabsList className="mb-4">
            <TabsTrigger value="kitchen">Kitchen</TabsTrigger>
            <TabsTrigger value="bar">Bar</TabsTrigger>
          </TabsList>

          <TabsContent value="kitchen" className="space-y-4">
            {filteredOrders.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <ChefHat className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                  <p className="text-muted-foreground">No active orders for kitchen</p>
                </CardContent>
              </Card>
            ) : (
              filteredOrders.map((order) => (
                <Card key={order.id}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="text-lg">{order.tableName}</CardTitle>
                        <CardDescription>
                          <Clock className="h-3 w-3 inline mr-1" />
                          {new Date(order.createdAt).toLocaleTimeString()}
                        </CardDescription>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handlePrintTicket(order.id)}
                      >
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
                              {item.quantity}x {item.name}
                            </div>
                            <Badge
                              variant={
                                item.status === "preparing"
                                  ? "default"
                                  : item.status === "ready"
                                  ? "secondary"
                                  : "outline"
                              }
                              className="mt-1"
                            >
                              {item.status}
                            </Badge>
                          </div>
                          <div className="flex gap-2">
                            {item.status === "preparing" && (
                              <Button
                                size="sm"
                                onClick={() =>
                                  handleUpdateStatus(order.id, item.id, "ready")
                                }
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
            <Card>
              <CardContent className="py-12 text-center">
                <ChefHat className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                <p className="text-muted-foreground">No active orders for bar</p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
