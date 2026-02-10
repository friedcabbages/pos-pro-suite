import { useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LayoutGrid, Plus, Save } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function FnbFloorPlan() {
  const { toast } = useToast();
  const [tables, setTables] = useState<Array<{ id: string; name: string; x: number; y: number; width: number; height: number; capacity: number }>>([]);
  const [selectedTable, setSelectedTable] = useState<string | null>(null);
  const [isAdding, setIsAdding] = useState(false);

  const handleAddTable = () => {
    const newTable = {
      id: crypto.randomUUID(),
      name: `Table ${tables.length + 1}`,
      x: 100,
      y: 100,
      width: 120,
      height: 120,
      capacity: 2,
    };
    setTables([...tables, newTable]);
    setSelectedTable(newTable.id);
    setIsAdding(false);
  };

  const handleSave = () => {
    toast({
      title: "Floor plan saved",
      description: "Your floor plan has been saved successfully.",
    });
  };

  return (
    <DashboardLayout>
      <div className="container mx-auto p-6">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <LayoutGrid className="h-6 w-6 text-primary" />
              <h1 className="text-2xl font-bold">Floor Plan</h1>
            </div>
            <p className="text-muted-foreground">
              Design your restaurant layout by adding and positioning tables
            </p>
          </div>
          <div className="flex gap-2">
            <Button onClick={handleAddTable} variant="outline">
              <Plus className="h-4 w-4 mr-2" />
              Add Table
            </Button>
            <Button onClick={handleSave}>
              <Save className="h-4 w-4 mr-2" />
              Save Layout
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          <Card className="lg:col-span-1">
            <CardHeader>
              <CardTitle>Table Properties</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {selectedTable ? (
                <>
                  {(() => {
                    const table = tables.find((t) => t.id === selectedTable);
                    if (!table) return null;
                    return (
                      <>
                        <div>
                          <Label>Table Name</Label>
                          <Input
                            value={table.name}
                            onChange={(e) => {
                              setTables(
                                tables.map((t) =>
                                  t.id === selectedTable ? { ...t, name: e.target.value } : t
                                )
                              );
                            }}
                          />
                        </div>
                        <div>
                          <Label>Capacity</Label>
                          <Input
                            type="number"
                            value={table.capacity}
                            onChange={(e) => {
                              setTables(
                                tables.map((t) =>
                                  t.id === selectedTable
                                    ? { ...t, capacity: parseInt(e.target.value) || 2 }
                                    : t
                                )
                              );
                            }}
                          />
                        </div>
                        <Button
                          variant="destructive"
                          onClick={() => {
                            setTables(tables.filter((t) => t.id !== selectedTable));
                            setSelectedTable(null);
                          }}
                        >
                          Delete Table
                        </Button>
                      </>
                    );
                  })()}
                </>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Select a table to edit its properties
                </p>
              )}
            </CardContent>
          </Card>

          <Card className="lg:col-span-3">
            <CardHeader>
              <CardTitle>Canvas</CardTitle>
              <CardDescription>
                Click and drag tables to reposition them
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div
                className="relative border-2 border-dashed border-border rounded-lg bg-muted/20"
                style={{ width: "100%", height: "600px", minHeight: "600px" }}
              >
                {tables.map((table) => (
                  <div
                    key={table.id}
                    onClick={() => setSelectedTable(table.id)}
                    className={`absolute border-2 rounded-lg cursor-move flex items-center justify-center ${
                      selectedTable === table.id
                        ? "border-primary bg-primary/10"
                        : "border-border bg-card hover:border-primary/50"
                    }`}
                    style={{
                      left: `${table.x}px`,
                      top: `${table.y}px`,
                      width: `${table.width}px`,
                      height: `${table.height}px`,
                    }}
                  >
                    <div className="text-center">
                      <div className="font-semibold">{table.name}</div>
                      <div className="text-xs text-muted-foreground">
                        {table.capacity} seats
                      </div>
                    </div>
                  </div>
                ))}
                {tables.length === 0 && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="text-center text-muted-foreground">
                      <LayoutGrid className="h-12 w-12 mx-auto mb-2 opacity-50" />
                      <p>No tables yet. Click "Add Table" to get started.</p>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}
