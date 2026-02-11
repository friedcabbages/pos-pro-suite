import { useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Table, Plus, QrCode, Download, RefreshCw } from "lucide-react";
import { useFnbTables, useCreateFnbTable, useRegenerateTableToken } from "@/hooks/useFnb";
import { useToast } from "@/hooks/use-toast";

const ORDER_BASE = import.meta.env.VITE_APP_URL || window.location.origin;

export default function FnbTables() {
  const { toast } = useToast();
  const { data: tables = [], isLoading } = useFnbTables();
  const createTable = useCreateFnbTable();
  const regenerateToken = useRegenerateTableToken();
  const [addOpen, setAddOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [newCapacity, setNewCapacity] = useState(2);

  const handleAddTable = async () => {
    if (!newName.trim()) return;
    await createTable.mutateAsync({
      name: newName.trim(),
      capacity: newCapacity,
    });
    setNewName("");
    setNewCapacity(2);
    setAddOpen(false);
  };

  const handleRegenerate = async (tableId: string) => {
    await regenerateToken.mutateAsync(tableId);
  };

  const handlePrintQRSheet = () => {
    const tablesWithToken = tables.filter((t) => t.token_raw);
    if (tablesWithToken.length === 0) {
      toast({
        title: "No QR codes",
        description: "Add tables and generate QR codes first.",
        variant: "destructive",
      });
      return;
    }
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;
    const urls = tablesWithToken.map(
      (t) => `${ORDER_BASE}/order/table/${t.token_raw}`
    );
    printWindow.document.write(`
      <!DOCTYPE html>
      <html><head><title>QR Codes</title></head>
      <body style="display:flex;flex-wrap:wrap;gap:24px;padding:24px;font-family:sans-serif">
        ${tablesWithToken
          .map(
            (t) => `
          <div style="text-align:center;padding:16px;border:1px solid #ccc;border-radius:8px">
            <img src="https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(
              `${ORDER_BASE}/order/table/${t.token_raw}`
            )}" alt="QR ${t.name}" />
            <p style="margin:8px 0 0;font-weight:bold">${t.name}</p>
            <p style="margin:0;font-size:12px;color:#666">${t.capacity} seats</p>
          </div>
        `
          )
          .join("")}
      </body></html>
    `);
    printWindow.document.close();
    printWindow.print();
    printWindow.close();
  };

  return (
    <DashboardLayout>
      <div className="container mx-auto p-6">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Table className="h-6 w-6 text-primary" />
              <h1 className="text-2xl font-bold">Tables & QR Codes</h1>
            </div>
            <p className="text-muted-foreground">
              Manage tables and generate QR codes for customer ordering
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={handlePrintQRSheet}>
              <Download className="h-4 w-4 mr-2" />
              Print QR Sheet
            </Button>
            <Dialog open={addOpen} onOpenChange={setAddOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Table
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add Table</DialogTitle>
                  <DialogDescription>Create a new table and QR token</DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium">Name</label>
                    <Input
                      className="mt-1"
                      placeholder="e.g. Table 1"
                      value={newName}
                      onChange={(e) => setNewName(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Capacity</label>
                    <Input
                      type="number"
                      className="mt-1"
                      min={1}
                      value={newCapacity}
                      onChange={(e) => setNewCapacity(parseInt(e.target.value) || 2)}
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setAddOpen(false)}>
                    Cancel
                  </Button>
                  <Button
                    disabled={!newName.trim() || createTable.isPending}
                    onClick={handleAddTable}
                  >
                    Add Table
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {isLoading ? (
          <div className="text-center py-12 text-muted-foreground">Loading...</div>
        ) : tables.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Table className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
              <p className="text-muted-foreground">No tables yet</p>
              <p className="text-sm text-muted-foreground mt-1">
                Add a table to get started with QR ordering
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {tables.map((table) => {
              const orderUrl = table.token_raw
                ? `${ORDER_BASE}/order/table/${table.token_raw}`
                : null;
              const qrImgUrl = orderUrl
                ? `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(orderUrl)}`
                : null;
              return (
                <Card key={table.id}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle>{table.name}</CardTitle>
                      <Badge
                        variant={
                          table.status === "available"
                            ? "default"
                            : table.status === "occupied"
                            ? "destructive"
                            : "secondary"
                        }
                      >
                        {table.status}
                      </Badge>
                    </div>
                    <CardDescription>Capacity: {table.capacity} seats</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex items-center justify-center p-4 border border-border rounded-lg bg-muted/20">
                      {qrImgUrl ? (
                        <img
                          src={qrImgUrl}
                          alt={`QR for ${table.name}`}
                          className="w-24 h-24 object-contain"
                        />
                      ) : (
                        <QrCode className="h-24 w-24 text-muted-foreground" />
                      )}
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1"
                        onClick={() => handleRegenerate(table.id)}
                        disabled={regenerateToken.isPending}
                      >
                        <RefreshCw className="h-4 w-4 mr-2" />
                        Regenerate QR
                      </Button>
                    </div>
                    {orderUrl && (
                      <p className="text-xs text-muted-foreground truncate" title={orderUrl}>
                        {orderUrl}
                      </p>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
