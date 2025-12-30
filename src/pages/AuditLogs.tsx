import { useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Search, Download, Eye, FileText, Shield, Activity } from "lucide-react";
import { useAuditLogs, useAuditLogStats } from "@/hooks/useAuditLogs";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";
import { AuditLog } from "@/types/database";

const actionStyles: Record<string, string> = {
  create: "bg-success/10 text-success",
  update: "bg-primary/10 text-primary",
  delete: "bg-destructive/10 text-destructive",
  price_change: "bg-warning/10 text-warning",
  cost_price_update: "bg-warning/10 text-warning",
  stock_adjustment: "bg-accent/10 text-accent-foreground",
  stock_transfer: "bg-primary/10 text-primary",
  status_change_received: "bg-success/10 text-success",
  status_change_ordered: "bg-warning/10 text-warning",
  status_change_cancelled: "bg-destructive/10 text-destructive",
};

const entityIcons: Record<string, string> = {
  product: "📦",
  sale: "🛒",
  purchase_order: "📋",
  inventory: "📊",
  expense: "💰",
  warehouse: "🏭",
  supplier: "🚚",
  user: "👤",
  settings: "⚙️",
};

export default function AuditLogs() {
  const [search, setSearch] = useState("");
  const [entityFilter, setEntityFilter] = useState("all");
  const [actionFilter, setActionFilter] = useState("all");
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);

  const { data: logs, isLoading } = useAuditLogs({
    entity_type: entityFilter !== "all" ? entityFilter : undefined,
    action: actionFilter !== "all" ? actionFilter : undefined,
  });
  const { data: stats } = useAuditLogStats();

  const filteredLogs = logs?.filter((log) => {
    if (!search) return true;
    return (
      log.entity_type.toLowerCase().includes(search.toLowerCase()) ||
      log.action.toLowerCase().includes(search.toLowerCase()) ||
      log.entity_id?.toLowerCase().includes(search.toLowerCase())
    );
  }) || [];

  const getActionStyle = (action: string) => {
    for (const [key, style] of Object.entries(actionStyles)) {
      if (action.includes(key)) return style;
    }
    return "bg-muted text-muted-foreground";
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground">
              Audit Logs
            </h1>
            <p className="mt-1 text-muted-foreground">
              Track all system activities and changes
            </p>
          </div>
          <Button variant="outline">
            <Download className="mr-2 h-4 w-4" />
            Export
          </Button>
        </div>

        {/* Summary Cards */}
        <div className="grid gap-4 sm:grid-cols-4">
          <div className="rounded-xl border border-border bg-card p-4 shadow-card">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                <FileText className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Logs</p>
                <p className="text-2xl font-bold text-foreground">
                  {stats?.total || 0}
                </p>
              </div>
            </div>
          </div>
          <div className="rounded-xl border border-border bg-card p-4 shadow-card">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-success/10">
                <Activity className="h-5 w-5 text-success" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Today</p>
                <p className="text-2xl font-bold text-success">
                  {stats?.today || 0}
                </p>
              </div>
            </div>
          </div>
          <div className="rounded-xl border border-border bg-card p-4 shadow-card">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-warning/10">
                <Shield className="h-5 w-5 text-warning" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Entity Types</p>
                <p className="text-2xl font-bold text-foreground">
                  {stats?.entityTypes.length || 0}
                </p>
              </div>
            </div>
          </div>
          <div className="rounded-xl border border-border bg-card p-4 shadow-card">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent/10">
                <Activity className="h-5 w-5 text-accent-foreground" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Action Types</p>
                <p className="text-2xl font-bold text-foreground">
                  {stats?.actions.length || 0}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-col gap-4 rounded-xl border border-border bg-card p-4 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search logs..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={entityFilter} onValueChange={setEntityFilter}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Entity Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Entities</SelectItem>
              {stats?.entityTypes.map((type) => (
                <SelectItem key={type} value={type}>
                  {entityIcons[type] || "📝"} {type}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={actionFilter} onValueChange={setActionFilter}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Action" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Actions</SelectItem>
              {stats?.actions.map((action) => (
                <SelectItem key={action} value={action}>
                  {action.replace(/_/g, " ")}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Logs Table */}
        <div className="rounded-xl border border-border bg-card shadow-card">
          {isLoading ? (
            <div className="p-6 space-y-4">
              {[...Array(10)].map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Timestamp</TableHead>
                  <TableHead>Entity</TableHead>
                  <TableHead>Action</TableHead>
                  <TableHead>Entity ID</TableHead>
                  <TableHead>Changes</TableHead>
                  <TableHead className="w-12"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredLogs.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                      No audit logs found
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredLogs.map((log) => (
                    <TableRow key={log.id} className="group">
                      <TableCell className="text-muted-foreground whitespace-nowrap">
                        {format(new Date(log.created_at), "MMM d, yyyy HH:mm:ss")}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <span>{entityIcons[log.entity_type] || "📝"}</span>
                          <span className="font-medium">{log.entity_type}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={getActionStyle(log.action)}>
                          {log.action.replace(/_/g, " ")}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-mono text-xs text-muted-foreground max-w-[100px] truncate">
                        {log.entity_id || "-"}
                      </TableCell>
                      <TableCell>
                        {log.old_value || log.new_value ? (
                          <span className="text-sm text-muted-foreground">
                            {log.old_value ? "Modified" : "Created"}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="opacity-0 group-hover:opacity-100"
                              onClick={() => setSelectedLog(log)}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                            <DialogHeader>
                              <DialogTitle>Audit Log Details</DialogTitle>
                            </DialogHeader>
                            <div className="space-y-4">
                              <div className="grid grid-cols-2 gap-4">
                                <div>
                                  <p className="text-sm text-muted-foreground">Timestamp</p>
                                  <p className="font-medium">
                                    {log.created_at && format(new Date(log.created_at), "PPpp")}
                                  </p>
                                </div>
                                <div>
                                  <p className="text-sm text-muted-foreground">Entity Type</p>
                                  <p className="font-medium">{log.entity_type}</p>
                                </div>
                                <div>
                                  <p className="text-sm text-muted-foreground">Action</p>
                                  <Badge className={getActionStyle(log.action)}>
                                    {log.action.replace(/_/g, " ")}
                                  </Badge>
                                </div>
                                <div>
                                  <p className="text-sm text-muted-foreground">Entity ID</p>
                                  <p className="font-mono text-sm">{log.entity_id || "-"}</p>
                                </div>
                              </div>

                              {log.old_value && (
                                <div>
                                  <p className="text-sm text-muted-foreground mb-2">Previous Value</p>
                                  <pre className="p-3 rounded-lg bg-destructive/10 text-sm overflow-x-auto">
                                    {JSON.stringify(log.old_value, null, 2)}
                                  </pre>
                                </div>
                              )}

                              {log.new_value && (
                                <div>
                                  <p className="text-sm text-muted-foreground mb-2">New Value</p>
                                  <pre className="p-3 rounded-lg bg-success/10 text-sm overflow-x-auto">
                                    {JSON.stringify(log.new_value, null, 2)}
                                  </pre>
                                </div>
                              )}

                              {log.user_id && (
                                <div>
                                  <p className="text-sm text-muted-foreground">User ID</p>
                                  <p className="font-mono text-sm">{log.user_id}</p>
                                </div>
                              )}

                              {log.ip_address && (
                                <div>
                                  <p className="text-sm text-muted-foreground">IP Address</p>
                                  <p className="font-mono text-sm">{log.ip_address}</p>
                                </div>
                              )}
                            </div>
                          </DialogContent>
                        </Dialog>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
