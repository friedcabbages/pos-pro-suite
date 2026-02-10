import { useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  Plus,
  QrCode,
  Download,
  RefreshCw,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function FnbTables() {
  const { toast } = useToast();
  const [tables] = useState<Array<{ id: string; name: string; capacity: number; status: string; qrToken: string }>>([
    { id: "1", name: "Table 1", capacity: 4, status: "available", qrToken: "token-1" },
    { id: "2", name: "Table 2", capacity: 2, status: "occupied", qrToken: "token-2" },
  ]);

  const handleGenerateQR = (tableId: string) => {
    toast({
      title: "QR Code generated",
      description: `QR code for ${tables.find((t) => t.id === tableId)?.name} has been generated.`,
    });
  };

  const handleRegenerateQR = (tableId: string) => {
    toast({
      title: "QR Code regenerated",
      description: `New QR code for ${tables.find((t) => t.id === tableId)?.name} has been generated.`,
    });
  };

  const handlePrintQRSheet = () => {
    toast({
      title: "Printing QR codes",
      description: "Opening print dialog for QR code sheet...",
    });
    window.print();
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
              Manage your restaurant tables and generate QR codes for customer ordering
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={handlePrintQRSheet}>
              <Download className="h-4 w-4 mr-2" />
              Print QR Sheet
            </Button>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Add Table
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {tables.map((table) => (
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
                  <QrCode className="h-24 w-24 text-muted-foreground" />
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={() => handleGenerateQR(table.id)}
                  >
                    <QrCode className="h-4 w-4 mr-2" />
                    Generate QR
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleRegenerateQR(table.id)}
                  >
                    <RefreshCw className="h-4 w-4" />
                  </Button>
                </div>
                <div className="text-xs text-muted-foreground text-center">
                  Token: {table.qrToken}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </DashboardLayout>
  );
}
