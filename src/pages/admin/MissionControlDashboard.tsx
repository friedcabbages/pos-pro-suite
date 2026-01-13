import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Building2, 
  Users, 
  TrendingUp, 
  Activity, 
  Clock, 
  AlertTriangle,
  CheckCircle,
  XCircle,
  BarChart3,
  Zap
} from 'lucide-react';
import { useEnhancedStats, useGlobalAuditLogs } from '@/hooks/useMissionControl';
import { useSystemSettings } from '@/hooks/useMissionControl';
import { format } from 'date-fns';
import { Skeleton } from '@/components/ui/skeleton';

export default function MissionControlDashboard() {
  const { data: stats, isLoading: statsLoading } = useEnhancedStats();
  const { data: recentLogs, isLoading: logsLoading } = useGlobalAuditLogs();
  const { data: settings } = useSystemSettings();

  const maintenanceMode = settings?.find(s => s.key === 'maintenance_mode');
  const isMaintenanceActive = maintenanceMode?.value?.enabled === true;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Mission Control</h1>
          <p className="text-muted-foreground">SaaS Command Center</p>
        </div>
        {isMaintenanceActive && (
          <Badge variant="destructive" className="animate-pulse">
            <AlertTriangle className="h-3 w-3 mr-1" />
            Maintenance Mode Active
          </Badge>
        )}
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Businesses</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {statsLoading ? (
              <Skeleton className="h-8 w-20" />
            ) : (
              <>
                <div className="text-2xl font-bold">{stats?.total_businesses || 0}</div>
                <p className="text-xs text-muted-foreground">
                  +{stats?.new_businesses_today || 0} today
                </p>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {statsLoading ? (
              <Skeleton className="h-8 w-20" />
            ) : (
              <>
                <div className="text-2xl font-bold">{stats?.total_users || 0}</div>
                <p className="text-xs text-muted-foreground">
                  Across all businesses
                </p>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Transactions Today</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {statsLoading ? (
              <Skeleton className="h-8 w-20" />
            ) : (
              <>
                <div className="text-2xl font-bold">{stats?.transactions_today || 0}</div>
                <p className="text-xs text-muted-foreground">
                  {stats?.active_businesses_today || 0} active businesses
                </p>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Revenue</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {statsLoading ? (
              <Skeleton className="h-8 w-20" />
            ) : (
              <>
                <div className="text-2xl font-bold">
                  ${((stats?.total_revenue || 0) / 1000000).toFixed(1)}M
                </div>
                <p className="text-xs text-muted-foreground">
                  Platform-wide
                </p>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Status Breakdown */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border-green-500/20 bg-green-500/5">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Active</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-600">
              {stats?.businesses_by_status?.active || 0}
            </div>
          </CardContent>
        </Card>

        <Card className="border-yellow-500/20 bg-yellow-500/5">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Trial</CardTitle>
            <Clock className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-yellow-600">
              {stats?.businesses_by_status?.trial || 0}
            </div>
          </CardContent>
        </Card>

        <Card className="border-red-500/20 bg-red-500/5">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Suspended</CardTitle>
            <XCircle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-red-600">
              {stats?.businesses_by_status?.suspended || 0}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Businesses */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Top Businesses
            </CardTitle>
            <CardDescription>By transaction count</CardDescription>
          </CardHeader>
          <CardContent>
            {statsLoading ? (
              <div className="space-y-3">
                {[1, 2, 3, 4, 5].map(i => (
                  <Skeleton key={i} className="h-10 w-full" />
                ))}
              </div>
            ) : stats?.top_businesses?.length ? (
              <div className="space-y-3">
                {stats.top_businesses.slice(0, 5).map((business, index) => (
                  <div key={business.id} className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/50">
                    <div className="flex items-center gap-3">
                      <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold">
                        {index + 1}
                      </div>
                      <div>
                        <p className="font-medium">{business.name}</p>
                        <p className="text-xs text-muted-foreground">{business.user_count} users</p>
                      </div>
                    </div>
                    <Badge variant="secondary">{business.transaction_count} txns</Badge>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground text-center py-8">No data available</p>
            )}
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5" />
              Recent Activity
            </CardTitle>
            <CardDescription>Global audit trail</CardDescription>
          </CardHeader>
          <CardContent>
            {logsLoading ? (
              <div className="space-y-3">
                {[1, 2, 3, 4, 5].map(i => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : recentLogs?.length ? (
              <div className="space-y-3">
                {recentLogs.slice(0, 5).map((log) => (
                  <div key={log.id} className="flex items-start gap-3 p-2 rounded-lg hover:bg-muted/50">
                    <div className="w-2 h-2 rounded-full bg-primary mt-2" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">
                        {log.action.replace(/_/g, ' ')}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {log.actor_email || 'System'} • {log.entity_type}
                      </p>
                    </div>
                    <span className="text-xs text-muted-foreground whitespace-nowrap">
                      {format(new Date(log.created_at), 'HH:mm')}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground text-center py-8">No recent activity</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
