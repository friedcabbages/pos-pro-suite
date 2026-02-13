import { useState, useCallback } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { LayoutGrid, Plus } from "lucide-react";
import { QueryBoundary } from "@/components/QueryBoundary";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import {
  useFnbTables,
  useCreateFnbTable,
  useUpdateFnbTable,
} from "@/hooks/useFnb";
import { supabase } from "@/integrations/supabase/client";

export default function FnbFloorPlan() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data: tables = [], isLoading, isError, error, refetch } = useFnbTables();
  const createTable = useCreateFnbTable();
  const updateTable = useUpdateFnbTable();
  const [selectedTable, setSelectedTable] = useState<string | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [newCapacity, setNewCapacity] = useState(2);
  const [dragState, setDragState] = useState<{
    tableId: string;
    startX: number;
    startY: number;
    origX: number;
    origY: number;
  } | null>(null);
  const [localPos, setLocalPos] = useState<Record<string, { x: number; y: number }>>({});

  const handleAddTable = async () => {
    if (!newName.trim()) return;
    await createTable.mutateAsync({
      name: newName.trim(),
      capacity: newCapacity,
      posX: 80 + (tables.length % 4) * 140,
      posY: 80 + Math.floor(tables.length / 4) * 140,
      width: 100,
      height: 100,
    });
    setNewName("");
    setNewCapacity(2);
    setAddOpen(false);
  };


  const handleCanvasMouseMove = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (!dragState) return;
      const dx = e.clientX - dragState.startX;
      const dy = e.clientY - dragState.startY;
      const x = Math.max(0, dragState.origX + dx);
      const y = Math.max(0, dragState.origY + dy);
      setLocalPos((prev) => ({
        ...prev,
        [dragState.tableId]: { x, y },
      }));
    },
    [dragState]
  );

  const handleTableMouseDown = (e: React.MouseEvent, tableId: string) => {
    e.stopPropagation();
    const t = tables.find((x) => x.id === tableId);
    if (!t) return;
    setDragState({
      tableId,
      startX: e.clientX,
      startY: e.clientY,
      origX: t.pos_x ?? 0,
      origY: t.pos_y ?? 0,
    });
    setSelectedTable(tableId);
  };

  const handleCanvasMouseUp = useCallback(() => {
    if (dragState) {
      const pos = localPos[dragState.tableId];
      if (pos) {
        updateTable.mutate({
          id: dragState.tableId,
          posX: pos.x,
          posY: pos.y,
        });
      }
      setLocalPos((prev) => {
        const next = { ...prev };
        delete next[dragState.tableId];
        return next;
      });
    }
    setDragState(null);
  }, [dragState, localPos, updateTable]);

  const handleDeleteTable = async (tableId: string) => {
    if (!confirm("Remove this table? This will invalidate its QR code.")) return;
    await supabase.from("fnb_tables").update({ is_active: false }).eq("id", tableId);
    queryClient.invalidateQueries({ queryKey: ["fnb-tables"] });
    setSelectedTable(null);
    toast.success("Table removed");
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
              Arrange tables by dragging. Click to edit details.
            </p>
          </div>
          <div className="flex gap-2">
            <Dialog open={addOpen} onOpenChange={setAddOpen}>
              <DialogTrigger asChild>
                <Button variant="outline">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Table
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add Table</DialogTitle>
                  <DialogDescription>Create a new table on the floor plan</DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label>Name</Label>
                    <Input
                      className="mt-1"
                      placeholder="e.g. Table 1"
                      value={newName}
                      onChange={(e) => setNewName(e.target.value)}
                    />
                  </div>
                  <div>
                    <Label>Capacity</Label>
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
                    Add
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        <QueryBoundary isLoading={isLoading} isError={!!isError} error={error ?? undefined} refetch={refetch}>
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          <Card className="lg:col-span-1">
            <CardHeader>
              <CardTitle>Table Properties</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {selectedTable ? (
                (() => {
                  const table = tables.find((t) => t.id === selectedTable);
                  if (!table) return null;
                  return (
                    <TableEditForm
                      table={table}
                      onUpdate={(updates) =>
                        updateTable.mutate({ id: table.id, ...updates })
                      }
                      onDelete={() => handleDeleteTable(table.id)}
                      isPending={updateTable.isPending}
                    />
                  );
                })()
              ) : (
                <p className="text-sm text-muted-foreground">
                  Select a table to edit
                </p>
              )}
            </CardContent>
          </Card>

          <Card className="lg:col-span-3">
            <CardHeader>
              <CardTitle>Canvas</CardTitle>
              <CardDescription>
                Click and drag tables to reposition
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div
                className="relative border-2 border-dashed border-border rounded-lg bg-muted/20"
                style={{ width: "100%", height: "600px", minHeight: "600px" }}
                onMouseMove={handleCanvasMouseMove}
                onMouseUp={handleCanvasMouseUp}
                onMouseLeave={handleCanvasMouseUp}
              >
                {isLoading ? (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <p className="text-muted-foreground">Loading...</p>
                  </div>
                ) : (
                  tables.map((table) => {
                    const pos = localPos[table.id];
                    const x = pos ? pos.x : (table.pos_x ?? 0);
                    const y = pos ? pos.y : (table.pos_y ?? 0);
                    return (
                    <div
                      key={table.id}
                      onMouseDown={(e) => handleTableMouseDown(e, table.id)}
                      className={`absolute border-2 rounded-lg cursor-move flex items-center justify-center ${
                        selectedTable === table.id
                          ? "border-primary bg-primary/10"
                          : "border-border bg-card hover:border-primary/50"
                      }`}
                      style={{
                        left: `${x}px`,
                        top: `${y}px`,
                        width: `${table.width ?? 120}px`,
                        height: `${table.height ?? 120}px`,
                      }}
                    >
                      <div className="text-center">
                        <div className="font-semibold">{table.name}</div>
                        <div className="text-xs text-muted-foreground">
                          {table.capacity} seats
                        </div>
                      </div>
                    </div>
                    );
                  })
                )}
                {!isLoading && tables.length === 0 && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="text-center text-muted-foreground">
                      <LayoutGrid className="h-12 w-12 mx-auto mb-2 opacity-50" />
                      <p>No tables yet. Click Add Table to get started.</p>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
        </QueryBoundary>
      </div>
    </DashboardLayout>
  );
}

function TableEditForm({
  table,
  onUpdate,
  onDelete,
  isPending,
}: {
  table: { id: string; name: string; capacity: number };
  onUpdate: (u: { name?: string; capacity?: number }) => void;
  onDelete: () => void;
  isPending: boolean;
}) {
  const [name, setName] = useState(table.name);
  const [capacity, setCapacity] = useState(table.capacity);
  const changed = name !== table.name || capacity !== table.capacity;
  const handleSave = () => {
    onUpdate({ name, capacity: capacity || 2 });
  };
  return (
    <>
      <div>
        <Label>Name</Label>
        <Input value={name} onChange={(e) => setName(e.target.value)} />
      </div>
      <div>
        <Label>Capacity</Label>
        <Input
          type="number"
          min={1}
          value={capacity}
          onChange={(e) => setCapacity(parseInt(e.target.value) || 2)}
        />
      </div>
      {changed && (
        <Button onClick={handleSave} disabled={isPending}>
          Save changes
        </Button>
      )}
      <Button variant="destructive" onClick={onDelete}>
        Remove Table
      </Button>
    </>
  );
}
