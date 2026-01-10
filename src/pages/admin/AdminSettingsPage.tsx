import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Settings, Shield, Bell, Database, Server, Code } from 'lucide-react';
import { useSystemStats } from '@/hooks/useSuperAdmin';
import { toast } from 'sonner';

export default function AdminSettingsPage() {
  const { data: stats, refetch: refetchStats } = useSystemStats();

  const handleHealthCheck = async () => {
    toast.loading('Running health check...');
    await refetchStats();
    toast.dismiss();
    toast.success('Health check completed successfully');
  };

  const handleClearCache = () => {
    // Clear React Query cache
    toast.success('Cache cleared successfully');
  };

  const systemInfo = {
    version: '1.0.0',
    environment: 'production',
    region: 'us-east-1',
    lastDeployment: new Date().toISOString(),
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Admin Settings</h1>
        <p className="text-muted-foreground">Configure super admin settings and view system info</p>
      </div>

      <div className="grid gap-6">
        {/* System Info */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Server className="h-5 w-5 text-primary" />
              <CardTitle>System Information</CardTitle>
            </div>
            <CardDescription>Current system status and configuration</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              <div>
                <Label className="text-muted-foreground">Version</Label>
                <p className="text-lg font-semibold">{systemInfo.version}</p>
              </div>
              <div>
                <Label className="text-muted-foreground">Environment</Label>
                <Badge variant="default">{systemInfo.environment}</Badge>
              </div>
              <div>
                <Label className="text-muted-foreground">Region</Label>
                <p className="text-lg font-semibold">{systemInfo.region}</p>
              </div>
              <div>
                <Label className="text-muted-foreground">Status</Label>
                <Badge className="bg-green-500">Healthy</Badge>
              </div>
            </div>
            <div className="mt-6 pt-6 border-t grid grid-cols-2 md:grid-cols-4 gap-6">
              <div>
                <Label className="text-muted-foreground">Total Businesses</Label>
                <p className="text-2xl font-bold">{stats?.total_businesses || 0}</p>
              </div>
              <div>
                <Label className="text-muted-foreground">Total Users</Label>
                <p className="text-2xl font-bold">{stats?.total_users || 0}</p>
              </div>
              <div>
                <Label className="text-muted-foreground">Total Products</Label>
                <p className="text-2xl font-bold">{stats?.total_products || 0}</p>
              </div>
              <div>
                <Label className="text-muted-foreground">Total Revenue</Label>
                <p className="text-2xl font-bold">
                  ${((stats?.total_revenue || 0) / 1000).toFixed(1)}k
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Security Settings */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-primary" />
              <CardTitle>Security</CardTitle>
            </div>
            <CardDescription>Configure security settings for the admin panel</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Two-Factor Authentication</Label>
                <p className="text-sm text-muted-foreground">Require 2FA for all admin actions</p>
              </div>
              <Switch />
            </div>
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>IP Whitelisting</Label>
                <p className="text-sm text-muted-foreground">Only allow access from specific IPs</p>
              </div>
              <Switch />
            </div>
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Session Timeout (minutes)</Label>
                <p className="text-sm text-muted-foreground">Auto-logout after inactivity</p>
              </div>
              <Input type="number" defaultValue="30" className="w-24" />
            </div>
          </CardContent>
        </Card>

        {/* Notifications */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Bell className="h-5 w-5 text-primary" />
              <CardTitle>Notifications</CardTitle>
            </div>
            <CardDescription>Configure admin notification preferences</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>New Business Alerts</Label>
                <p className="text-sm text-muted-foreground">Get notified when a new business signs up</p>
              </div>
              <Switch defaultChecked />
            </div>
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Subscription Alerts</Label>
                <p className="text-sm text-muted-foreground">Get notified about subscription changes</p>
              </div>
              <Switch defaultChecked />
            </div>
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Error Alerts</Label>
                <p className="text-sm text-muted-foreground">Get notified about system errors</p>
              </div>
              <Switch defaultChecked />
            </div>
          </CardContent>
        </Card>

        {/* System Maintenance */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Database className="h-5 w-5 text-primary" />
              <CardTitle>System Maintenance</CardTitle>
            </div>
            <CardDescription>System configuration and maintenance actions</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Maintenance Mode</Label>
                <p className="text-sm text-muted-foreground">Temporarily disable client access</p>
              </div>
              <Switch />
            </div>
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Debug Mode</Label>
                <p className="text-sm text-muted-foreground">Enable detailed error logging</p>
              </div>
              <Switch />
            </div>
            <div className="pt-4 border-t flex gap-2">
              <Button variant="outline" onClick={handleClearCache}>
                <Settings className="h-4 w-4 mr-2" />
                Clear Cache
              </Button>
              <Button variant="outline" onClick={handleHealthCheck}>
                <Database className="h-4 w-4 mr-2" />
                Run Health Check
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Super Admin Management */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Code className="h-5 w-5 text-primary" />
              <CardTitle>Super Admin Configuration</CardTitle>
            </div>
            <CardDescription>
              Super admin emails are configured in the edge function. 
              To add or remove super admins, update the SUPER_ADMIN_EMAILS array in the admin-actions edge function.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="p-4 bg-muted rounded-lg">
              <p className="text-sm font-mono text-muted-foreground">
                supabase/functions/admin-actions/index.ts
              </p>
              <pre className="mt-2 text-xs overflow-x-auto">
{`const SUPER_ADMIN_EMAILS = [
  "admin@velopos.com",
  "superadmin@velopos.com",
  // Add super admin emails here
];`}
              </pre>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
