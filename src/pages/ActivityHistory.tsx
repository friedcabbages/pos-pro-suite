import { useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Activity,
  Download,
  FileSpreadsheet,
  Package,
  Layers,
  ShoppingCart,
  LogIn,
  Settings,
  User,
  Clock,
} from 'lucide-react';
import { useBusinessActivityLogs, useExportData } from '@/hooks/useActivityLogs';
import { format, formatDistanceToNow } from 'date-fns';

const actionIcons: Record<string, React.ReactNode> = {
  login: <LogIn className="h-4 w-4" />,
  sale_completed: <ShoppingCart className="h-4 w-4" />,
  product_created: <Package className="h-4 w-4" />,
  product_updated: <Package className="h-4 w-4" />,
  stock_adjusted: <Layers className="h-4 w-4" />,
  settings_updated: <Settings className="h-4 w-4" />,
  user_added: <User className="h-4 w-4" />,
  data_exported: <Download className="h-4 w-4" />,
};

const actionLabels: Record<string, string> = {
  login: 'User Login',
  sale_completed: 'Sale Completed',
  product_created: 'Product Created',
  product_updated: 'Product Updated',
  stock_adjusted: 'Stock Adjusted',
  settings_updated: 'Settings Updated',
  user_added: 'User Added',
  data_exported: 'Data Exported',
  upgrade_requested: 'Upgrade Requested',
  onboarding_completed: 'Onboarding Completed',
  onboarding_skipped: 'Onboarding Skipped',
};

const actionColors: Record<string, string> = {
  login: 'bg-blue-500/10 text-blue-500',
  sale_completed: 'bg-success/10 text-success',
  product_created: 'bg-primary/10 text-primary',
  product_updated: 'bg-warning/10 text-warning',
  stock_adjusted: 'bg-orange-500/10 text-orange-500',
  data_exported: 'bg-purple-500/10 text-purple-500',
};

export default function ActivityHistory() {
  const [entityFilter, setEntityFilter] = useState<string>('all');
  const exportData = useExportData();
  
  const { data: logs, isLoading } = useBusinessActivityLogs({
    entity_type: entityFilter === 'all' ? undefined : entityFilter,
    limit: 200,
  });

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-foreground">Activity History</h1>
            <p className="text-sm text-muted-foreground">
              Track all actions and changes in your business.
            </p>
          </div>
        </div>
        
        {/* Data Export Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileSpreadsheet className="h-5 w-5" />
              Export Data
            </CardTitle>
            <CardDescription>
              Download your business data as CSV files for backup or analysis.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-3">
              <Button
                variant="outline"
                onClick={() => exportData.mutate('sales')}
                disabled={exportData.isPending}
              >
                <ShoppingCart className="h-4 w-4 mr-2" />
                Export Sales
              </Button>
              <Button
                variant="outline"
                onClick={() => exportData.mutate('products')}
                disabled={exportData.isPending}
              >
                <Package className="h-4 w-4 mr-2" />
                Export Products
              </Button>
              <Button
                variant="outline"
                onClick={() => exportData.mutate('inventory')}
                disabled={exportData.isPending}
              >
                <Layers className="h-4 w-4 mr-2" />
                Export Inventory
              </Button>
            </div>
          </CardContent>
        </Card>
        
        {/* Activity Log */}
        <Card>
          <CardHeader>
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="h-5 w-5" />
                  Recent Activity
                </CardTitle>
                <CardDescription>
                  All actions performed in your business
                </CardDescription>
              </div>
              <Select value={entityFilter} onValueChange={setEntityFilter}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Filter by type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Activities</SelectItem>
                  <SelectItem value="sale">Sales</SelectItem>
                  <SelectItem value="product">Products</SelectItem>
                  <SelectItem value="inventory">Inventory</SelectItem>
                  <SelectItem value="user">Users</SelectItem>
                  <SelectItem value="settings">Settings</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-3">
                {[1, 2, 3, 4, 5].map(i => (
                  <Skeleton key={i} className="h-16 w-full" />
                ))}
              </div>
            ) : !logs?.length ? (
              <div className="text-center py-12 text-muted-foreground">
                <Clock className="h-12 w-12 mx-auto mb-3 opacity-30" />
                <p>No activity recorded yet</p>
                <p className="text-sm">Actions will appear here as you use the system</p>
              </div>
            ) : (
              <div className="relative">
                {/* Timeline line */}
                <div className="absolute left-5 top-0 bottom-0 w-px bg-border" />
                
                <div className="space-y-4">
                  {logs.map((log, idx) => {
                    const Icon = actionIcons[log.action] || <Activity className="h-4 w-4" />;
                    const colorClass = actionColors[log.action] || 'bg-muted text-muted-foreground';
                    
                    return (
                      <div key={log.id} className="flex gap-4 relative">
                        {/* Timeline dot */}
                        <div className={`
                          h-10 w-10 rounded-full flex items-center justify-center shrink-0 z-10
                          ${colorClass}
                        `}>
                          {Icon}
                        </div>
                        
                        {/* Content */}
                        <div className="flex-1 min-w-0 pb-4">
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <p className="font-medium">
                                {actionLabels[log.action] || log.action}
                              </p>
                              <p className="text-sm text-muted-foreground">
                                {log.description || `${log.entity_type} action performed`}
                              </p>
                            </div>
                            <div className="text-right shrink-0">
                              <p className="text-sm text-muted-foreground">
                                {formatDistanceToNow(new Date(log.created_at), { addSuffix: true })}
                              </p>
                              {log.user_email && (
                                <Badge variant="outline" className="text-xs">
                                  {log.user_email}
                                </Badge>
                              )}
                            </div>
                          </div>
                          {log.entity_id && (
                            <p className="text-xs text-muted-foreground mt-1">
                              ID: {log.entity_id}
                            </p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
