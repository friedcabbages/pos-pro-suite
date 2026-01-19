import { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { format, formatDistanceToNow, subMinutes, subHours, startOfDay } from 'date-fns';
import { 
  Search, 
  Filter, 
  Download, 
  Clock, 
  User, 
  Building2, 
  Info, 
  AlertTriangle, 
  ShieldAlert,
  ChevronRight,
  ExternalLink,
  Shield,
  Activity,
  Eye,
  UserX,
  RefreshCw,
  X
} from 'lucide-react';
import { useGlobalAuditLogs, GlobalAuditLog } from '@/hooks/useMissionControl';
import { useAdminBusinesses } from '@/hooks/useSuperAdmin';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { useNavigate } from 'react-router-dom';

// Severity levels
type Severity = 'info' | 'warning' | 'critical';

// Map actions to severity
const ACTION_SEVERITY_MAP: Record<string, Severity> = {
  // Critical actions
  business_suspended: 'critical',
  business_deleted: 'critical',
  user_disabled: 'critical',
  force_logout: 'critical',
  access_denied: 'critical',
  // Warning actions
  trial_extended: 'warning',
  plan_changed: 'warning',
  user_role_changed: 'warning',
  impersonation: 'warning',
  maintenance_toggled: 'warning',
  // Info actions
  business_created: 'info',
  business_activated: 'info',
  broadcast_created: 'info',
  login: 'info',
  logout: 'info',
};

const SEVERITY_CONFIG = {
  info: {
    icon: Info,
    label: 'Info',
    color: 'text-blue-500',
    bgColor: 'bg-blue-500/10',
    borderColor: 'border-blue-500/20',
  },
  warning: {
    icon: AlertTriangle,
    label: 'Warning',
    color: 'text-amber-500',
    bgColor: 'bg-amber-500/10',
    borderColor: 'border-amber-500/20',
  },
  critical: {
    icon: ShieldAlert,
    label: 'Critical',
    color: 'text-destructive',
    bgColor: 'bg-destructive/10',
    borderColor: 'border-destructive/20',
  },
};

const ACTOR_TYPES = [
  { value: 'all', label: 'All Actors' },
  { value: 'super_admin', label: 'Super Admin' },
  { value: 'owner', label: 'Owner' },
  { value: 'staff', label: 'Staff' },
  { value: 'system', label: 'System' },
];

const TIME_PRESETS = [
  { value: 'all', label: 'All Time' },
  { value: '15min', label: 'Last 15 min' },
  { value: '1h', label: 'Last 1 hour' },
  { value: 'today', label: 'Today' },
  { value: 'custom', label: 'Custom Range' },
];

const SEVERITY_OPTIONS = [
  { value: 'all', label: 'All Severities' },
  { value: 'info', label: 'Info' },
  { value: 'warning', label: 'Warning' },
  { value: 'critical', label: 'Critical' },
];

// Helper to get human-readable action description
function getActionDescription(log: GlobalAuditLog): string {
  const action = log.action;
  const actorEmail = log.actor_email || 'System';
  
  const descriptions: Record<string, string> = {
    business_suspended: `Business was suspended`,
    business_activated: `Business was activated`,
    business_created: `New business was created`,
    business_deleted: `Business was permanently deleted`,
    user_disabled: `User account was disabled`,
    user_role_changed: `User role was modified`,
    force_logout: `User session was forcefully terminated`,
    trial_extended: `Trial period was extended`,
    plan_changed: `Subscription plan was changed`,
    impersonation: `Admin impersonated a user`,
    maintenance_toggled: `Maintenance mode was toggled`,
    broadcast_created: `New broadcast was created`,
    access_denied: `Access was denied`,
    login: `User logged in`,
    logout: `User logged out`,
  };
  
  return descriptions[action] || action.replace(/_/g, ' ');
}

function getActionTitle(action: string): string {
  const titles: Record<string, string> = {
    business_suspended: '🚫 Business Suspended',
    business_activated: '✅ Business Activated',
    business_created: '🏢 Business Created',
    business_deleted: '🗑️ Business Deleted',
    user_disabled: '👤 User Disabled',
    user_role_changed: '🔄 Role Changed',
    force_logout: '🔒 Force Logout',
    trial_extended: '📅 Trial Extended',
    plan_changed: '💳 Plan Changed',
    impersonation: '👁️ Impersonation',
    maintenance_toggled: '🔧 Maintenance Toggled',
    broadcast_created: '📢 Broadcast Created',
    access_denied: '🚫 Access Denied',
    login: '🔓 Login',
    logout: '🔒 Logout',
  };
  
  return titles[action] || action.replace(/_/g, ' ');
}

function getSeverity(action: string): Severity {
  return ACTION_SEVERITY_MAP[action] || 'info';
}

interface AuditEventCardProps {
  log: GlobalAuditLog;
  businessName?: string;
  onViewDetails: () => void;
}

function AuditEventCard({ log, businessName, onViewDetails }: AuditEventCardProps) {
  const severity = getSeverity(log.action);
  const config = SEVERITY_CONFIG[severity];
  const SeverityIcon = config.icon;
  
  return (
    <div 
      className={cn(
        "p-4 rounded-lg border transition-all cursor-pointer hover:shadow-md",
        config.bgColor,
        config.borderColor
      )}
      onClick={onViewDetails}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3 flex-1 min-w-0">
          <div className={cn("p-2 rounded-full", config.bgColor)}>
            <SeverityIcon className={cn("h-4 w-4", config.color)} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h4 className="font-semibold text-sm">{getActionTitle(log.action)}</h4>
              <Badge variant="outline" className="text-xs">
                {log.entity_type}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              {getActionDescription(log)}
            </p>
            <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground flex-wrap">
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {format(new Date(log.created_at), 'MMM dd, HH:mm')}
              </span>
              {log.actor_email && (
                <span className="flex items-center gap-1">
                  <User className="h-3 w-3" />
                  {log.actor_email}
                </span>
              )}
              {log.ip_address && (
                <span className="font-mono">
                  IP {log.ip_address.substring(0, 10)}...
                </span>
              )}
              {businessName && (
                <span className="flex items-center gap-1">
                  <Building2 className="h-3 w-3" />
                  {businessName}
                </span>
              )}
            </div>
          </div>
        </div>
        <ChevronRight className="h-5 w-5 text-muted-foreground flex-shrink-0" />
      </div>
    </div>
  );
}

interface DetailsPanelProps {
  log: GlobalAuditLog | null;
  businessName?: string;
  onClose: () => void;
  onNavigateToUser?: (userId: string) => void;
  onNavigateToBusiness?: (businessId: string) => void;
}

function DetailsPanel({ log, businessName, onClose, onNavigateToUser, onNavigateToBusiness }: DetailsPanelProps) {
  if (!log) return null;
  
  const severity = getSeverity(log.action);
  const config = SEVERITY_CONFIG[severity];
  const isRiskyAction = severity === 'critical' || severity === 'warning';
  
  const formatValue = (value: Record<string, unknown> | null) => {
    if (!value) return null;
    return Object.entries(value).map(([key, val]) => (
      <div key={key} className="py-2 border-b border-border/50 last:border-0">
        <span className="text-xs text-muted-foreground uppercase tracking-wide">{key.replace(/_/g, ' ')}</span>
        <p className="text-sm font-medium mt-0.5">{String(val)}</p>
      </div>
    ));
  };
  
  return (
    <Sheet open={!!log} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="w-full sm:max-w-lg">
        <SheetHeader>
          <div className="flex items-center gap-2">
            <div className={cn("p-2 rounded-full", config.bgColor)}>
              {severity === 'info' && <Info className={cn("h-4 w-4", config.color)} />}
              {severity === 'warning' && <AlertTriangle className={cn("h-4 w-4", config.color)} />}
              {severity === 'critical' && <ShieldAlert className={cn("h-4 w-4", config.color)} />}
            </div>
            <div>
              <SheetTitle className="text-left">{getActionTitle(log.action)}</SheetTitle>
              <SheetDescription className="text-left">
                {format(new Date(log.created_at), 'PPpp')}
              </SheetDescription>
            </div>
          </div>
        </SheetHeader>
        
        <ScrollArea className="h-[calc(100vh-180px)] mt-6">
          <div className="space-y-6 pr-4">
            {/* Summary */}
            <div>
              <h4 className="text-sm font-semibold mb-2">Summary</h4>
              <p className="text-sm text-muted-foreground">{getActionDescription(log)}</p>
            </div>
            
            <Separator />
            
            {/* Actor Info */}
            <div>
              <h4 className="text-sm font-semibold mb-3">Actor</h4>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Email</span>
                  {log.actor_email ? (
                    <Button 
                      variant="link" 
                      size="sm" 
                      className="h-auto p-0"
                      onClick={() => log.actor_id && onNavigateToUser?.(log.actor_id)}
                    >
                      {log.actor_email}
                      <ExternalLink className="h-3 w-3 ml-1" />
                    </Button>
                  ) : (
                    <span className="text-sm">System</span>
                  )}
                </div>
                {log.actor_id && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">User ID</span>
                    <span className="text-sm font-mono">{log.actor_id.substring(0, 8)}...</span>
                  </div>
                )}
              </div>
            </div>
            
            <Separator />
            
            {/* Target Info */}
            {(log.target_business_id || log.target_user_id) && (
              <>
                <div>
                  <h4 className="text-sm font-semibold mb-3">Target</h4>
                  <div className="space-y-2">
                    {log.target_business_id && (
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Business</span>
                        <Button 
                          variant="link" 
                          size="sm" 
                          className="h-auto p-0"
                          onClick={() => onNavigateToBusiness?.(log.target_business_id!)}
                        >
                          {businessName || log.target_business_id.substring(0, 8)}
                          <ExternalLink className="h-3 w-3 ml-1" />
                        </Button>
                      </div>
                    )}
                    {log.target_user_id && (
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">User ID</span>
                        <span className="text-sm font-mono">{log.target_user_id.substring(0, 8)}...</span>
                      </div>
                    )}
                  </div>
                </div>
                <Separator />
              </>
            )}
            
            {/* Metadata */}
            <div>
              <h4 className="text-sm font-semibold mb-3">Metadata</h4>
              <div className="space-y-2 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">IP Address</span>
                  <span className="font-mono">{log.ip_address || 'N/A'}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Entity Type</span>
                  <Badge variant="outline">{log.entity_type}</Badge>
                </div>
                {log.entity_id && (
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Entity ID</span>
                    <span className="font-mono">{log.entity_id.substring(0, 8)}...</span>
                  </div>
                )}
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Severity</span>
                  <Badge className={cn(config.bgColor, config.color, "border", config.borderColor)}>
                    {config.label}
                  </Badge>
                </div>
              </div>
            </div>
            
            {/* Old/New Values */}
            {(log.old_value || log.new_value) && (
              <>
                <Separator />
                <div>
                  <h4 className="text-sm font-semibold mb-3">Changes</h4>
                  {log.old_value && (
                    <div className="mb-4">
                      <h5 className="text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wide">
                        Previous State
                      </h5>
                      <div className="bg-muted/50 rounded-lg p-3">
                        {formatValue(log.old_value)}
                      </div>
                    </div>
                  )}
                  {log.new_value && (
                    <div>
                      <h5 className="text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wide">
                        New State
                      </h5>
                      <div className="bg-muted/50 rounded-lg p-3">
                        {formatValue(log.new_value)}
                      </div>
                    </div>
                  )}
                </div>
              </>
            )}
            
            {/* Quick Actions for Risky Logs */}
            {isRiskyAction && log.actor_id && (
              <>
                <Separator />
                <div>
                  <h4 className="text-sm font-semibold mb-3">Quick Actions</h4>
                  <div className="flex flex-col gap-2">
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => onNavigateToUser?.(log.actor_id!)}
                    >
                      <Eye className="h-4 w-4 mr-2" />
                      Investigate User
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm"
                      className="text-destructive hover:text-destructive"
                    >
                      <UserX className="h-4 w-4 mr-2" />
                      Temporarily Block
                    </Button>
                  </div>
                </div>
              </>
            )}
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}

export default function GlobalAuditPage() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [selectedBusiness, setSelectedBusiness] = useState<string>('all');
  const [selectedSeverity, setSelectedSeverity] = useState('all');
  const [selectedActorType, setSelectedActorType] = useState('all');
  const [selectedTimePreset, setSelectedTimePreset] = useState('all');
  const [selectedLog, setSelectedLog] = useState<GlobalAuditLog | null>(null);

  // Calculate date range based on preset
  const dateRange = useMemo(() => {
    const now = new Date();
    switch (selectedTimePreset) {
      case '15min':
        return { from: subMinutes(now, 15), to: now };
      case '1h':
        return { from: subHours(now, 1), to: now };
      case 'today':
        return { from: startOfDay(now), to: now };
      default:
        return {};
    }
  }, [selectedTimePreset]);

  const filters = {
    business_id: selectedBusiness !== 'all' ? selectedBusiness : undefined,
    date_from: dateRange.from?.toISOString(),
    date_to: dateRange.to?.toISOString(),
  };

  const { data: logs, isLoading, refetch } = useGlobalAuditLogs(filters);
  const { data: businesses } = useAdminBusinesses();

  // Apply client-side filters
  const filteredLogs = useMemo(() => {
    if (!logs) return [];
    
    return logs.filter(log => {
      // Search filter
      if (search) {
        const searchLower = search.toLowerCase();
        const matchesSearch = (
          log.action.toLowerCase().includes(searchLower) ||
          log.actor_email?.toLowerCase().includes(searchLower) ||
          log.entity_type.toLowerCase().includes(searchLower) ||
          getActionDescription(log).toLowerCase().includes(searchLower)
        );
        if (!matchesSearch) return false;
      }
      
      // Severity filter
      if (selectedSeverity !== 'all') {
        if (getSeverity(log.action) !== selectedSeverity) return false;
      }
      
      // Actor type filter
      if (selectedActorType !== 'all') {
        if (selectedActorType === 'system' && log.actor_email) return false;
        if (selectedActorType !== 'system' && !log.actor_email) return false;
        // Note: More sophisticated actor type detection would require role data
      }
      
      return true;
    });
  }, [logs, search, selectedSeverity, selectedActorType]);

  // Count by severity
  const severityCounts = useMemo(() => {
    if (!logs) return { info: 0, warning: 0, critical: 0 };
    return logs.reduce((acc, log) => {
      const severity = getSeverity(log.action);
      acc[severity] = (acc[severity] || 0) + 1;
      return acc;
    }, { info: 0, warning: 0, critical: 0 } as Record<Severity, number>);
  }, [logs]);

  const getBusinessName = (businessId: string | null) => {
    if (!businessId) return undefined;
    return businesses?.find(b => b.id === businessId)?.name;
  };

  const exportLogs = () => {
    if (!filteredLogs?.length) return;
    
    const csv = [
      ['Timestamp', 'Severity', 'Action', 'Entity Type', 'Actor', 'Business', 'IP Address'].join(','),
      ...filteredLogs.map(log => [
        format(new Date(log.created_at), 'yyyy-MM-dd HH:mm:ss'),
        getSeverity(log.action),
        log.action,
        log.entity_type,
        log.actor_email || 'System',
        getBusinessName(log.target_business_id) || '-',
        log.ip_address || '-',
      ].join(','))
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `security-audit-logs-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
  };

  const clearFilters = () => {
    setSearch('');
    setSelectedBusiness('all');
    setSelectedSeverity('all');
    setSelectedActorType('all');
    setSelectedTimePreset('all');
  };

  const hasActiveFilters = search || selectedBusiness !== 'all' || selectedSeverity !== 'all' || selectedActorType !== 'all' || selectedTimePreset !== 'all';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <Shield className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">Security & Operations Console</h1>
              <p className="text-muted-foreground">Platform-wide audit trail and forensic analysis</p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={() => refetch()}>
            <RefreshCw className="h-4 w-4" />
          </Button>
          <Button variant="outline" onClick={exportLogs} disabled={!filteredLogs?.length}>
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Severity Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card 
          className={cn(
            "cursor-pointer transition-all hover:shadow-md border-2",
            selectedSeverity === 'info' ? 'border-blue-500' : 'border-transparent'
          )}
          onClick={() => setSelectedSeverity(selectedSeverity === 'info' ? 'all' : 'info')}
        >
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-full bg-blue-500/10">
                  <Info className="h-5 w-5 text-blue-500" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Info</p>
                  <p className="text-2xl font-bold">{severityCounts.info}</p>
                </div>
              </div>
              <Activity className="h-8 w-8 text-muted-foreground/20" />
            </div>
          </CardContent>
        </Card>

        <Card 
          className={cn(
            "cursor-pointer transition-all hover:shadow-md border-2",
            selectedSeverity === 'warning' ? 'border-amber-500' : 'border-transparent'
          )}
          onClick={() => setSelectedSeverity(selectedSeverity === 'warning' ? 'all' : 'warning')}
        >
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-full bg-amber-500/10">
                  <AlertTriangle className="h-5 w-5 text-amber-500" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Warnings</p>
                  <p className="text-2xl font-bold">{severityCounts.warning}</p>
                </div>
              </div>
              <AlertTriangle className="h-8 w-8 text-muted-foreground/20" />
            </div>
          </CardContent>
        </Card>

        <Card 
          className={cn(
            "cursor-pointer transition-all hover:shadow-md border-2",
            selectedSeverity === 'critical' ? 'border-destructive' : 'border-transparent'
          )}
          onClick={() => setSelectedSeverity(selectedSeverity === 'critical' ? 'all' : 'critical')}
        >
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-full bg-destructive/10">
                  <ShieldAlert className="h-5 w-5 text-destructive" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Critical</p>
                  <p className="text-2xl font-bold">{severityCounts.critical}</p>
                </div>
              </div>
              <ShieldAlert className="h-8 w-8 text-muted-foreground/20" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <Filter className="h-4 w-4" />
              Filters
            </CardTitle>
            {hasActiveFilters && (
              <Button variant="ghost" size="sm" onClick={clearFilters}>
                <X className="h-4 w-4 mr-1" />
                Clear All
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input 
                placeholder="Search logs..." 
                value={search} 
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>

            <Select value={selectedTimePreset} onValueChange={setSelectedTimePreset}>
              <SelectTrigger>
                <Clock className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Time Range" />
              </SelectTrigger>
              <SelectContent>
                {TIME_PRESETS.map(preset => (
                  <SelectItem key={preset.value} value={preset.value}>
                    {preset.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={selectedSeverity} onValueChange={setSelectedSeverity}>
              <SelectTrigger>
                <SelectValue placeholder="Severity" />
              </SelectTrigger>
              <SelectContent>
                {SEVERITY_OPTIONS.map(option => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={selectedActorType} onValueChange={setSelectedActorType}>
              <SelectTrigger>
                <SelectValue placeholder="Actor Type" />
              </SelectTrigger>
              <SelectContent>
                {ACTOR_TYPES.map(type => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={selectedBusiness} onValueChange={setSelectedBusiness}>
              <SelectTrigger>
                <SelectValue placeholder="All Businesses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Businesses</SelectItem>
                {businesses?.map(b => (
                  <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Event Cards */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Security Events</CardTitle>
              <CardDescription>
                {filteredLogs.length} events {hasActiveFilters && '(filtered)'}
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="p-4 rounded-lg border">
                  <div className="flex items-start gap-3">
                    <Skeleton className="h-8 w-8 rounded-full" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-4 w-48" />
                      <Skeleton className="h-3 w-64" />
                      <Skeleton className="h-3 w-32" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : filteredLogs.length === 0 ? (
            <div className="text-center py-12">
              <Shield className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
              <p className="text-muted-foreground">No security events found</p>
              {hasActiveFilters && (
                <Button variant="link" onClick={clearFilters} className="mt-2">
                  Clear filters
                </Button>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              {filteredLogs.map(log => (
                <AuditEventCard
                  key={log.id}
                  log={log}
                  businessName={getBusinessName(log.target_business_id)}
                  onViewDetails={() => setSelectedLog(log)}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Details Panel */}
      <DetailsPanel
        log={selectedLog}
        businessName={selectedLog ? getBusinessName(selectedLog.target_business_id) : undefined}
        onClose={() => setSelectedLog(null)}
        onNavigateToUser={(userId) => {
          setSelectedLog(null);
          navigate(`/admin/users?user=${userId}`);
        }}
        onNavigateToBusiness={(businessId) => {
          setSelectedLog(null);
          navigate(`/admin/businesses/${businessId}`);
        }}
      />
    </div>
  );
}
