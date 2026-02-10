import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  AlertTriangle, 
  Megaphone, 
  Plus, 
  Power, 
  Wrench,
  Bell,
  Shield,
  Clock,
  User,
  Eye,
  History,
  Radio,
  CheckCircle2,
  XCircle,
  Calendar,
  Target,
  FileText
} from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import { toast } from 'sonner';
import { 
  useSystemSettings, 
  useBroadcasts, 
  useUpdateSystemSetting,
  useCreateBroadcast,
  useToggleBroadcast,
  useGlobalAuditLogs,
  useUpdateUsername,
  useUpdateOwnPassword,
  Broadcast
} from '@/hooks/useMissionControl';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Loader2 } from 'lucide-react';

// Maintenance message templates
const MAINTENANCE_TEMPLATES = [
  { label: 'Scheduled Maintenance', message: 'We are performing scheduled maintenance. The system will be back online shortly.' },
  { label: 'Emergency Downtime', message: 'We are experiencing technical difficulties. Our team is working to resolve this issue as quickly as possible.' },
  { label: 'System Upgrade', message: 'We are upgrading our systems to serve you better. Please check back soon.' },
  { label: 'Database Migration', message: 'We are migrating our database for improved performance. This may take a few minutes.' },
];

const MAX_MESSAGE_LENGTH = 200;

export default function SystemSettingsPage() {
  const { user } = useAuth();
  const { data: settings, isLoading: settingsLoading } = useSystemSettings();
  const { data: broadcasts, isLoading: broadcastsLoading } = useBroadcasts();
  const { data: auditLogs, isLoading: auditLoading } = useGlobalAuditLogs({
    entity_type: 'system',
  });
  
  const updateSetting = useUpdateSystemSetting();
  const createBroadcast = useCreateBroadcast();
  const toggleBroadcast = useToggleBroadcast();
  const updateUsername = useUpdateUsername();
  const updatePassword = useUpdateOwnPassword();

  const [maintenanceMessage, setMaintenanceMessage] = useState('');
  const [showMaintenanceConfirm, setShowMaintenanceConfirm] = useState(false);
  const [pendingMaintenanceState, setPendingMaintenanceState] = useState(false);
  const [broadcastDialog, setBroadcastDialog] = useState(false);
  const [selectedBroadcast, setSelectedBroadcast] = useState<Broadcast | null>(null);
  const [newBroadcast, setNewBroadcast] = useState({
    title: '',
    message: '',
    type: 'info' as 'info' | 'warning' | 'critical',
    target_businesses: null as string[] | null,
    expires_at: '',
  });

  // Account settings state
  const [currentUsername, setCurrentUsername] = useState('');
  const [newUsername, setNewUsername] = useState('');
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [usernameLoading, setUsernameLoading] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);

  // Fetch current username
  useEffect(() => {
    if (user?.id) {
      supabase
        .from('profiles')
        .select('username')
        .eq('id', user.id)
        .single()
        .then(({ data }) => {
          if (data?.username) {
            setCurrentUsername(data.username);
            setNewUsername(data.username);
          }
        });
    }
  }, [user?.id]);

  // Get current maintenance settings
  const currentMaintenance = settings?.find(s => s.key === 'maintenance_mode');
  const isMaintenanceActive = currentMaintenance?.value?.enabled === true;
  const currentMaintenanceMessage = (currentMaintenance?.value?.message as string) || '';
  const maintenanceUpdatedAt = currentMaintenance?.updated_at;
  const maintenanceUpdatedBy = (currentMaintenance?.value?.updated_by as string) || 'System';

  // Initialize message from settings
  useEffect(() => {
    if (currentMaintenanceMessage && !maintenanceMessage) {
      setMaintenanceMessage(currentMaintenanceMessage);
    }
  }, [currentMaintenanceMessage]);

  const handleMaintenanceToggle = (enabled: boolean) => {
    if (enabled) {
      setPendingMaintenanceState(true);
      setShowMaintenanceConfirm(true);
    } else {
      confirmMaintenanceChange(false);
    }
  };

  const confirmMaintenanceChange = (enabled: boolean) => {
    updateSetting.mutate({
      key: 'maintenance_mode',
      value: { 
        enabled, 
        message: maintenanceMessage || 'System is under maintenance. Please try again later.',
        updated_by: 'Super Admin',
        updated_at: new Date().toISOString(),
      }
    });
    setShowMaintenanceConfirm(false);
  };

  const handleSaveMaintenanceMessage = () => {
    updateSetting.mutate({
      key: 'maintenance_mode',
      value: { 
        enabled: isMaintenanceActive, 
        message: maintenanceMessage,
        updated_by: 'Super Admin',
        updated_at: new Date().toISOString(),
      }
    });
  };

  const applyTemplate = (template: typeof MAINTENANCE_TEMPLATES[0]) => {
    setMaintenanceMessage(template.message);
  };

  const handleCreateBroadcast = () => {
    createBroadcast.mutate({
      ...newBroadcast,
      is_active: true,
      target_businesses: newBroadcast.target_businesses,
      expires_at: newBroadcast.expires_at || null,
    }, {
      onSuccess: () => {
        setBroadcastDialog(false);
        setNewBroadcast({ title: '', message: '', type: 'info', target_businesses: null, expires_at: '' });
      }
    });
  };

  const getBroadcastTypeColor = (type: string) => {
    switch (type) {
      case 'critical': return 'destructive';
      case 'warning': return 'secondary';
      default: return 'outline';
    }
  };

  const getBroadcastTypeIcon = (type: string) => {
    switch (type) {
      case 'critical': return <AlertTriangle className="h-4 w-4" />;
      case 'warning': return <AlertTriangle className="h-4 w-4" />;
      default: return <Bell className="h-4 w-4" />;
    }
  };

  const isBroadcastExpired = (broadcast: Broadcast) => {
    if (!broadcast.expires_at) return false;
    return new Date(broadcast.expires_at) < new Date();
  };

  // Filter system-related audit logs
  const systemAuditLogs = auditLogs?.filter(log => 
    log.entity_type === 'system' || 
    log.action.includes('maintenance') || 
    log.action.includes('broadcast') ||
    log.action.includes('setting')
  ).slice(0, 10) || [];

  const getAuditIcon = (action: string) => {
    if (action.includes('maintenance')) return <Power className="h-4 w-4" />;
    if (action.includes('broadcast')) return <Megaphone className="h-4 w-4" />;
    return <FileText className="h-4 w-4" />;
  };

  const handleUpdateUsername = async () => {
    if (!user?.id) return;
    
    const usernameTrimmed = newUsername.trim();
    
    if (usernameTrimmed) {
      const usernamePattern = /^[a-zA-Z0-9_]{3,30}$/;
      if (!usernamePattern.test(usernameTrimmed)) {
        toast.error('Username must be 3-30 characters and only contain letters, numbers, or underscores');
        return;
      }
    }
    
    setUsernameLoading(true);
    try {
      await updateUsername.mutateAsync({
        userId: user.id,
        username: usernameTrimmed || null,
      });
      setCurrentUsername(usernameTrimmed);
    } catch (error) {
      // Error already handled by hook
    } finally {
      setUsernameLoading(false);
    }
  };

  const handleUpdatePassword = async () => {
    if (!passwordForm.currentPassword || !passwordForm.newPassword || !passwordForm.confirmPassword) {
      toast.error('Please fill in all password fields');
      return;
    }
    
    if (passwordForm.newPassword.length < 6) {
      toast.error('New password must be at least 6 characters');
      return;
    }
    
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      toast.error('New password and confirm password do not match');
      return;
    }
    
    setPasswordLoading(true);
    try {
      await updatePassword.mutateAsync({
        currentPassword: passwordForm.currentPassword,
        newPassword: passwordForm.newPassword,
      });
      // Clear form on success
      setPasswordForm({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      });
    } catch (error) {
      // Error already handled by hook
    } finally {
      setPasswordLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header with Global Status */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Global Control Panel</h1>
          <p className="text-muted-foreground">System-wide configuration and operational controls</p>
        </div>
        <div className="flex items-center gap-3">
          {isMaintenanceActive ? (
            <Badge variant="destructive" className="px-4 py-2 text-sm font-semibold flex items-center gap-2">
              <Radio className="h-4 w-4 animate-pulse" />
              🟠 Maintenance Mode Active
            </Badge>
          ) : (
            <Badge variant="outline" className="px-4 py-2 text-sm font-semibold flex items-center gap-2 border-green-500 text-green-600 dark:text-green-400">
              <CheckCircle2 className="h-4 w-4" />
              🟢 System Operational
            </Badge>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Maintenance Mode - Takes 2 columns */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5" />
                  Maintenance Mode
                </CardTitle>
                <CardDescription className="mt-1">
                  Control system-wide access for all users
                </CardDescription>
              </div>
              {maintenanceUpdatedAt && (
                <div className="text-right text-xs text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <User className="h-3 w-3" />
                    {maintenanceUpdatedBy}
                  </div>
                  <div className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {formatDistanceToNow(new Date(maintenanceUpdatedAt), { addSuffix: true })}
                  </div>
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {settingsLoading ? (
              <Skeleton className="h-40 w-full" />
            ) : (
              <>
                {/* Main Toggle */}
                <div className={`flex items-center justify-between p-4 rounded-lg border-2 transition-colors ${
                  isMaintenanceActive 
                    ? 'border-destructive/50 bg-destructive/5' 
                    : 'border-border'
                }`}>
                  <div className="flex items-center gap-4">
                    <div className={`p-3 rounded-full ${
                      isMaintenanceActive 
                        ? 'bg-destructive/10' 
                        : 'bg-muted'
                    }`}>
                      <Power className={`h-6 w-6 ${
                        isMaintenanceActive 
                          ? 'text-destructive' 
                          : 'text-muted-foreground'
                      }`} />
                    </div>
                    <div>
                      <p className="font-semibold text-lg">
                        {isMaintenanceActive ? 'Maintenance Mode Active' : 'System Operational'}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {isMaintenanceActive 
                          ? 'All non-admin users are blocked from accessing the system'
                          : 'All users have normal access to the system'
                        }
                      </p>
                    </div>
                  </div>
                  <Switch 
                    checked={isMaintenanceActive}
                    onCheckedChange={handleMaintenanceToggle}
                    disabled={updateSetting.isPending}
                    className="scale-125"
                  />
                </div>

                {/* Impact Warning */}
                <div className="p-4 rounded-lg bg-amber-500/10 border border-amber-500/20">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="h-5 w-5 text-amber-500 mt-0.5" />
                    <div>
                      <p className="font-medium text-amber-700 dark:text-amber-400">Platform Impact</p>
                      <p className="text-sm text-muted-foreground mt-1">
                        Enabling maintenance mode will immediately block all non-admin users from accessing the system. 
                        This affects every business and every POS terminal connected to the platform.
                      </p>
                    </div>
                  </div>
                </div>

                <Separator />

                {/* Message Templates */}
                <div className="space-y-3">
                  <Label className="text-sm font-medium">Quick Templates</Label>
                  <div className="flex flex-wrap gap-2">
                    {MAINTENANCE_TEMPLATES.map((template) => (
                      <Button
                        key={template.label}
                        variant="outline"
                        size="sm"
                        onClick={() => applyTemplate(template)}
                        className="text-xs"
                      >
                        {template.label}
                      </Button>
                    ))}
                  </div>
                </div>

                {/* Message Input */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label>Maintenance Message</Label>
                    <span className={`text-xs ${
                      maintenanceMessage.length > MAX_MESSAGE_LENGTH 
                        ? 'text-destructive' 
                        : 'text-muted-foreground'
                    }`}>
                      {maintenanceMessage.length}/{MAX_MESSAGE_LENGTH}
                    </span>
                  </div>
                  <Textarea
                    value={maintenanceMessage}
                    onChange={(e) => setMaintenanceMessage(e.target.value.slice(0, MAX_MESSAGE_LENGTH))}
                    placeholder="Enter a message to display during maintenance"
                    rows={3}
                  />
                  <Button 
                    variant="secondary" 
                    size="sm" 
                    onClick={handleSaveMaintenanceMessage}
                    disabled={updateSetting.isPending || maintenanceMessage === currentMaintenanceMessage}
                  >
                    Save Message
                  </Button>
                </div>

                {/* Live Preview */}
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <Eye className="h-4 w-4" />
                    Live Preview
                  </Label>
                  <div className="p-6 rounded-lg bg-muted/50 border-2 border-dashed">
                    <div className="text-center space-y-3">
                      <Wrench className="h-12 w-12 mx-auto text-muted-foreground" />
                      <h3 className="font-semibold text-lg">System Under Maintenance</h3>
                      <p className="text-muted-foreground max-w-md mx-auto">
                        {maintenanceMessage || 'System is under maintenance. Please try again later.'}
                      </p>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground text-center">
                    This is what users will see when maintenance mode is active
                  </p>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Recent System Changes - Audit Panel */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <History className="h-5 w-5" />
              Recent System Changes
            </CardTitle>
            <CardDescription>
              Audit trail of system-wide actions
            </CardDescription>
          </CardHeader>
          <CardContent>
            {auditLoading ? (
              <div className="space-y-3">
                {[1, 2, 3, 4, 5].map(i => <Skeleton key={i} className="h-16 w-full" />)}
              </div>
            ) : systemAuditLogs.length > 0 ? (
              <ScrollArea className="h-[500px] pr-4">
                <div className="space-y-3">
                  {systemAuditLogs.map((log) => (
                    <div key={log.id} className="p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors">
                      <div className="flex items-start gap-3">
                        <div className="p-2 rounded-full bg-muted">
                          {getAuditIcon(log.action)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm truncate">
                            {log.action.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                          </p>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {log.actor_email || 'System'}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {format(new Date(log.created_at), 'MMM d, yyyy h:mm a')}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <History className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No recent system changes</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Account Settings - Full Width */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Account Settings
          </CardTitle>
          <CardDescription>
            Update your username and password
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Update Username Section */}
            <div className="space-y-4">
              <div>
                <Label htmlFor="username">Username</Label>
                <Input
                  id="username"
                  type="text"
                  value={newUsername}
                  onChange={(e) => setNewUsername(e.target.value)}
                  placeholder="username (3-30 chars, letters, numbers, underscore)"
                  pattern="[a-zA-Z0-9_]{3,30}"
                  className="mt-2"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  You can login using this username instead of email
                </p>
              </div>
              <Button 
                onClick={handleUpdateUsername} 
                disabled={usernameLoading || newUsername === currentUsername}
                className="w-full"
              >
                {usernameLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Update Username
              </Button>
            </div>

            {/* Update Password Section */}
            <div className="space-y-4">
              <div>
                <Label htmlFor="currentPassword">Current Password</Label>
                <Input
                  id="currentPassword"
                  type="password"
                  value={passwordForm.currentPassword}
                  onChange={(e) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })}
                  className="mt-2"
                />
              </div>
              <div>
                <Label htmlFor="newPassword">New Password</Label>
                <Input
                  id="newPassword"
                  type="password"
                  value={passwordForm.newPassword}
                  onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                  minLength={6}
                  className="mt-2"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Must be at least 6 characters
                </p>
              </div>
              <div>
                <Label htmlFor="confirmPassword">Confirm New Password</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  value={passwordForm.confirmPassword}
                  onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
                  className="mt-2"
                />
              </div>
              <Button 
                onClick={handleUpdatePassword} 
                disabled={passwordLoading || !passwordForm.currentPassword || !passwordForm.newPassword || !passwordForm.confirmPassword}
                className="w-full"
              >
                {passwordLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Update Password
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* System Broadcasts - Full Width */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Megaphone className="h-5 w-5" />
              System Broadcasts
            </CardTitle>
            <CardDescription>
              Send announcements visible on every POS screen across all businesses
            </CardDescription>
          </div>
          <Button onClick={() => setBroadcastDialog(true)}>
            <Plus className="h-4 w-4 mr-2" />
            New Broadcast
          </Button>
        </CardHeader>
        <CardContent>
          {broadcastsLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[1, 2, 3].map(i => <Skeleton key={i} className="h-40 w-full" />)}
            </div>
          ) : broadcasts?.length ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {broadcasts.map(broadcast => {
                const expired = isBroadcastExpired(broadcast);
                return (
                  <div 
                    key={broadcast.id} 
                    className={`p-4 rounded-lg border transition-all hover:shadow-md cursor-pointer ${
                      !broadcast.is_active || expired ? 'opacity-60 bg-muted/30' : ''
                    } ${
                      broadcast.type === 'critical' ? 'border-destructive/50' :
                      broadcast.type === 'warning' ? 'border-amber-500/50' : ''
                    }`}
                    onClick={() => setSelectedBroadcast(broadcast)}
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <Badge variant={getBroadcastTypeColor(broadcast.type) as any} className="flex items-center gap-1">
                          {getBroadcastTypeIcon(broadcast.type)}
                          {broadcast.type}
                        </Badge>
                        {expired && <Badge variant="outline" className="text-xs">Expired</Badge>}
                        {!broadcast.is_active && !expired && <Badge variant="outline" className="text-xs">Inactive</Badge>}
                      </div>
                      <Switch
                        checked={broadcast.is_active}
                        onCheckedChange={(active) => {
                          toggleBroadcast.mutate({ broadcastId: broadcast.id, active });
                        }}
                        onClick={(e) => e.stopPropagation()}
                      />
                    </div>
                    
                    <h4 className="font-semibold mb-1 line-clamp-1">{broadcast.title}</h4>
                    <p className="text-sm text-muted-foreground line-clamp-2 mb-3">{broadcast.message}</p>
                    
                    <div className="flex items-center justify-between text-xs text-muted-foreground pt-3 border-t">
                      <div className="flex items-center gap-1">
                        <Target className="h-3 w-3" />
                        {broadcast.target_businesses?.length 
                          ? `${broadcast.target_businesses.length} businesses` 
                          : 'All businesses'
                        }
                      </div>
                      <div className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {formatDistanceToNow(new Date(broadcast.created_at), { addSuffix: true })}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              <Megaphone className="h-16 w-16 mx-auto mb-4 opacity-30" />
              <p className="text-lg font-medium">No broadcasts yet</p>
              <p className="text-sm mt-1">Create a broadcast to notify users across the platform</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Maintenance Confirmation Dialog */}
      <AlertDialog open={showMaintenanceConfirm} onOpenChange={setShowMaintenanceConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              Enable Maintenance Mode
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-4">
                <p>
                  You are about to put the <strong>entire system</strong> into maintenance mode.
                </p>
                <div className="p-4 rounded-lg bg-destructive/10 border border-destructive/20 space-y-2">
                  <p className="font-medium text-destructive">This action will:</p>
                  <ul className="text-sm space-y-1 list-disc list-inside text-muted-foreground">
                    <li>Immediately block all non-admin users</li>
                    <li>Display maintenance message on all POS terminals</li>
                    <li>Prevent any transactions from being processed</li>
                    <li>Affect every business on the platform</li>
                  </ul>
                </div>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => confirmMaintenanceChange(pendingMaintenanceState)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Enable Maintenance Mode
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Create Broadcast Dialog */}
      <Dialog open={broadcastDialog} onOpenChange={setBroadcastDialog}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Megaphone className="h-5 w-5" />
              Create System Broadcast
            </DialogTitle>
            <DialogDescription>
              This message will appear on every POS screen across the platform
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Title</Label>
              <Input
                value={newBroadcast.title}
                onChange={(e) => setNewBroadcast(prev => ({ ...prev, title: e.target.value }))}
                placeholder="Important Announcement"
              />
            </div>
            <div className="space-y-2">
              <Label>Message</Label>
              <Textarea
                value={newBroadcast.message}
                onChange={(e) => setNewBroadcast(prev => ({ ...prev, message: e.target.value }))}
                placeholder="Enter the broadcast message..."
                rows={4}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Type</Label>
                <Select 
                  value={newBroadcast.type} 
                  onValueChange={(type: 'info' | 'warning' | 'critical') => 
                    setNewBroadcast(prev => ({ ...prev, type }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="info">
                      <span className="flex items-center gap-2">
                        <Bell className="h-4 w-4" /> Info
                      </span>
                    </SelectItem>
                    <SelectItem value="warning">
                      <span className="flex items-center gap-2">
                        <AlertTriangle className="h-4 w-4 text-amber-500" /> Warning
                      </span>
                    </SelectItem>
                    <SelectItem value="critical">
                      <span className="flex items-center gap-2">
                        <AlertTriangle className="h-4 w-4 text-destructive" /> Critical
                      </span>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Expires At (Optional)</Label>
                <Input
                  type="datetime-local"
                  value={newBroadcast.expires_at}
                  onChange={(e) => setNewBroadcast(prev => ({ ...prev, expires_at: e.target.value }))}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Target</Label>
              <Select 
                value={newBroadcast.target_businesses ? 'selected' : 'all'} 
                onValueChange={(value) => 
                  setNewBroadcast(prev => ({ 
                    ...prev, 
                    target_businesses: value === 'all' ? null : [] 
                  }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Businesses</SelectItem>
                  <SelectItem value="selected">Selected Businesses</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Broadcast Preview */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Eye className="h-4 w-4" />
                Preview
              </Label>
              <div className={`p-4 rounded-lg border-2 ${
                newBroadcast.type === 'critical' ? 'border-destructive/50 bg-destructive/5' :
                newBroadcast.type === 'warning' ? 'border-amber-500/50 bg-amber-500/5' :
                'border-primary/50 bg-primary/5'
              }`}>
                <div className="flex items-start gap-3">
                  {getBroadcastTypeIcon(newBroadcast.type)}
                  <div>
                    <p className="font-medium">{newBroadcast.title || 'Broadcast Title'}</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      {newBroadcast.message || 'Broadcast message will appear here...'}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBroadcastDialog(false)}>Cancel</Button>
            <Button 
              onClick={handleCreateBroadcast}
              disabled={createBroadcast.isPending || !newBroadcast.title || !newBroadcast.message}
            >
              {createBroadcast.isPending ? 'Creating...' : 'Create Broadcast'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Broadcast Detail Dialog */}
      <Dialog open={!!selectedBroadcast} onOpenChange={() => setSelectedBroadcast(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {selectedBroadcast && getBroadcastTypeIcon(selectedBroadcast.type)}
              Broadcast Details
            </DialogTitle>
          </DialogHeader>
          {selectedBroadcast && (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Badge variant={getBroadcastTypeColor(selectedBroadcast.type) as any}>
                  {selectedBroadcast.type}
                </Badge>
                {selectedBroadcast.is_active ? (
                  <Badge variant="outline" className="text-green-600 border-green-600">
                    <CheckCircle2 className="h-3 w-3 mr-1" /> Active
                  </Badge>
                ) : (
                  <Badge variant="outline" className="text-muted-foreground">
                    <XCircle className="h-3 w-3 mr-1" /> Inactive
                  </Badge>
                )}
                {isBroadcastExpired(selectedBroadcast) && (
                  <Badge variant="destructive">Expired</Badge>
                )}
              </div>
              
              <div>
                <Label className="text-xs text-muted-foreground">Title</Label>
                <p className="font-semibold text-lg">{selectedBroadcast.title}</p>
              </div>
              
              <div>
                <Label className="text-xs text-muted-foreground">Message</Label>
                <p className="text-muted-foreground">{selectedBroadcast.message}</p>
              </div>
              
              <div className="grid grid-cols-2 gap-4 pt-4 border-t">
                <div>
                  <Label className="text-xs text-muted-foreground">Target</Label>
                  <p className="flex items-center gap-1">
                    <Target className="h-4 w-4" />
                    {selectedBroadcast.target_businesses?.length 
                      ? `${selectedBroadcast.target_businesses.length} businesses` 
                      : 'All businesses'
                    }
                  </p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Created</Label>
                  <p className="flex items-center gap-1">
                    <Calendar className="h-4 w-4" />
                    {format(new Date(selectedBroadcast.created_at), 'MMM d, yyyy h:mm a')}
                  </p>
                </div>
                {selectedBroadcast.expires_at && (
                  <div>
                    <Label className="text-xs text-muted-foreground">Expires</Label>
                    <p className="flex items-center gap-1">
                      <Clock className="h-4 w-4" />
                      {format(new Date(selectedBroadcast.expires_at), 'MMM d, yyyy h:mm a')}
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedBroadcast(null)}>Close</Button>
            {selectedBroadcast && (
              <Button
                variant={selectedBroadcast.is_active ? 'destructive' : 'default'}
                onClick={() => {
                  toggleBroadcast.mutate({ 
                    broadcastId: selectedBroadcast.id, 
                    active: !selectedBroadcast.is_active 
                  });
                  setSelectedBroadcast(null);
                }}
              >
                {selectedBroadcast.is_active ? 'Deactivate' : 'Activate'}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
