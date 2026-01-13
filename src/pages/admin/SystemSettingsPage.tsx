import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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
  Trash2,
  Wrench,
  Bell
} from 'lucide-react';
import { format } from 'date-fns';
import { 
  useSystemSettings, 
  useBroadcasts, 
  useUpdateSystemSetting,
  useCreateBroadcast,
  useToggleBroadcast
} from '@/hooks/useMissionControl';
import { Skeleton } from '@/components/ui/skeleton';

export default function SystemSettingsPage() {
  const { data: settings, isLoading: settingsLoading } = useSystemSettings();
  const { data: broadcasts, isLoading: broadcastsLoading } = useBroadcasts();
  
  const updateSetting = useUpdateSystemSetting();
  const createBroadcast = useCreateBroadcast();
  const toggleBroadcast = useToggleBroadcast();

  const [maintenanceMode, setMaintenanceMode] = useState(false);
  const [maintenanceMessage, setMaintenanceMessage] = useState('');
  const [broadcastDialog, setBroadcastDialog] = useState(false);
  const [newBroadcast, setNewBroadcast] = useState({
    title: '',
    message: '',
    type: 'info' as 'info' | 'warning' | 'critical',
  });

  // Initialize from settings
  const currentMaintenance = settings?.find(s => s.key === 'maintenance_mode');
  const isMaintenanceActive = currentMaintenance?.value?.enabled === true;
  const currentMaintenanceMessage = (currentMaintenance?.value?.message as string) || '';

  const handleMaintenanceToggle = (enabled: boolean) => {
    updateSetting.mutate({
      key: 'maintenance_mode',
      value: { 
        enabled, 
        message: maintenanceMessage || 'System is under maintenance. Please try again later.' 
      }
    });
  };

  const handleCreateBroadcast = () => {
    createBroadcast.mutate({
      ...newBroadcast,
      is_active: true,
      target_businesses: null,
      expires_at: null,
    }, {
      onSuccess: () => {
        setBroadcastDialog(false);
        setNewBroadcast({ title: '', message: '', type: 'info' });
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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">System Settings</h1>
        <p className="text-muted-foreground">Global system configuration and operational tools</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Maintenance Mode */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Wrench className="h-5 w-5" />
              Maintenance Mode
            </CardTitle>
            <CardDescription>
              Enable maintenance mode to prevent users from accessing the system
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {settingsLoading ? (
              <Skeleton className="h-20 w-full" />
            ) : (
              <>
                <div className="flex items-center justify-between p-4 rounded-lg border">
                  <div className="flex items-center gap-3">
                    <Power className={`h-5 w-5 ${isMaintenanceActive ? 'text-destructive' : 'text-muted-foreground'}`} />
                    <div>
                      <p className="font-medium">Maintenance Mode</p>
                      <p className="text-sm text-muted-foreground">
                        {isMaintenanceActive ? 'System is in maintenance' : 'System is operational'}
                      </p>
                    </div>
                  </div>
                  <Switch 
                    checked={isMaintenanceActive}
                    onCheckedChange={handleMaintenanceToggle}
                    disabled={updateSetting.isPending}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Maintenance Message</Label>
                  <Textarea
                    value={maintenanceMessage || currentMaintenanceMessage}
                    onChange={(e) => setMaintenanceMessage(e.target.value)}
                    placeholder="Enter a message to display during maintenance"
                  />
                </div>

                {isMaintenanceActive && (
                  <div className="p-4 rounded-lg bg-destructive/10 border border-destructive/20">
                    <div className="flex items-center gap-2 text-destructive">
                      <AlertTriangle className="h-4 w-4" />
                      <span className="font-medium">Maintenance Mode is Active</span>
                    </div>
                    <p className="text-sm text-muted-foreground mt-2">
                      Users will see a maintenance page when accessing the application.
                    </p>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>

        {/* System Announcements */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Bell className="h-5 w-5" />
                System Broadcasts
              </CardTitle>
              <CardDescription>
                Send announcements to all users
              </CardDescription>
            </div>
            <Button onClick={() => setBroadcastDialog(true)}>
              <Plus className="h-4 w-4 mr-2" />
              New Broadcast
            </Button>
          </CardHeader>
          <CardContent>
            {broadcastsLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map(i => <Skeleton key={i} className="h-16 w-full" />)}
              </div>
            ) : broadcasts?.length ? (
              <div className="space-y-3">
                {broadcasts.map(broadcast => (
                  <div 
                    key={broadcast.id} 
                    className={`p-4 rounded-lg border ${broadcast.is_active ? '' : 'opacity-50'}`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <Badge variant={getBroadcastTypeColor(broadcast.type) as any}>
                            {broadcast.type}
                          </Badge>
                          {!broadcast.is_active && (
                            <Badge variant="outline">Inactive</Badge>
                          )}
                        </div>
                        <h4 className="font-medium mt-2">{broadcast.title}</h4>
                        <p className="text-sm text-muted-foreground">{broadcast.message}</p>
                        <p className="text-xs text-muted-foreground mt-2">
                          Created {format(new Date(broadcast.created_at), 'PPp')}
                        </p>
                      </div>
                      <Switch
                        checked={broadcast.is_active}
                        onCheckedChange={(active) => toggleBroadcast.mutate({ 
                          broadcastId: broadcast.id, 
                          active 
                        })}
                      />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Megaphone className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No broadcasts yet</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Create Broadcast Dialog */}
      <Dialog open={broadcastDialog} onOpenChange={setBroadcastDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Broadcast</DialogTitle>
            <DialogDescription>
              Send an announcement to all users across all businesses
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
              />
            </div>
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
                  <SelectItem value="info">Info</SelectItem>
                  <SelectItem value="warning">Warning</SelectItem>
                  <SelectItem value="critical">Critical</SelectItem>
                </SelectContent>
              </Select>
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
    </div>
  );
}
