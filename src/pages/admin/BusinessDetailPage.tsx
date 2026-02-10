import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { 
  ArrowLeft, 
  Users, 
  Clock, 
  Ban, 
  CheckCircle, 
  Eye, 
  Mail, 
  Shield,
  Trash2,
  LogOut,
  Calendar,
  DollarSign,
  Settings,
  History,
  UserCog
} from 'lucide-react';
import { format, differenceInDays } from 'date-fns';
import { useAdminBusinesses } from '@/hooks/useSuperAdmin';
import { 
  useBusinessUsers, 
  useSubscriptionHistory, 
  useFeatureFlags,
  useExtendTrial,
  useSuspendWithReason,
  useForceLogout,
  useUpgradePlan,
  useUpdateBusinessType,
  useUpdateUserRole,
  useDisableUser,
  useSendPasswordReset,
  useToggleFeatureFlag,
  useDeleteBusiness,
  useUpdateUsername
} from '@/hooks/useMissionControl';
import { useImpersonation } from '@/contexts/ImpersonationContext';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';

const AVAILABLE_FEATURES = [
  { key: 'beta_reports', name: 'Beta Reports', description: 'Access to new reporting features' },
  { key: 'advanced_inventory', name: 'Advanced Inventory', description: 'Advanced inventory management' },
  { key: 'multi_warehouse', name: 'Multi-Warehouse', description: 'Multiple warehouse support' },
  { key: 'api_access', name: 'API Access', description: 'REST API access' },
];

export default function BusinessDetailPage() {
  const { businessId } = useParams<{ businessId: string }>();
  const navigate = useNavigate();
  const { startImpersonation } = useImpersonation();
  
  // Data fetching
  const { data: businesses, isLoading: businessLoading } = useAdminBusinesses();
  const { data: users, isLoading: usersLoading } = useBusinessUsers(businessId!);
  const { data: history, isLoading: historyLoading } = useSubscriptionHistory(businessId);
  const { data: featureFlags } = useFeatureFlags(businessId);

  // Mutations
  const extendTrial = useExtendTrial();
  const suspendWithReason = useSuspendWithReason();
  const forceLogout = useForceLogout();
  const upgradePlan = useUpgradePlan();
  const updateBusinessType = useUpdateBusinessType();
  const updateUserRole = useUpdateUserRole();
  const disableUser = useDisableUser();
  const sendPasswordReset = useSendPasswordReset();
  const toggleFeatureFlag = useToggleFeatureFlag();
  const deleteBusiness = useDeleteBusiness();
  const updateUsername = useUpdateUsername();

  // Dialog states
  const [extendTrialDialog, setExtendTrialDialog] = useState(false);
  const [suspendDialog, setSuspendDialog] = useState(false);
  const [deleteDialog, setDeleteDialog] = useState(false);
  const [upgradeDialog, setUpgradeDialog] = useState(false);
  const [businessTypeDialog, setBusinessTypeDialog] = useState(false);
  const [newBusinessType, setNewBusinessType] = useState<'retail' | 'fnb' | 'service' | 'venue'>('retail');
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [userActionDialog, setUserActionDialog] = useState<'role' | 'disable' | 'username' | null>(null);

  // Form states
  const [trialDays, setTrialDays] = useState(7);
  const [suspendReason, setSuspendReason] = useState('');
  const [newRole, setNewRole] = useState('');
  const [newPlan, setNewPlan] = useState('active');
  const [manualPayment, setManualPayment] = useState(false);
  const [newUsername, setNewUsername] = useState('');

  const business = businesses?.find(b => b.id === businessId);

  if (businessLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!business) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Business not found</p>
        <Button variant="outline" onClick={() => navigate('/admin')} className="mt-4">
          Back to Businesses
        </Button>
      </div>
    );
  }

  const trialDaysRemaining = business.status === 'trial' && business.trial_end_at 
    ? Math.max(0, differenceInDays(new Date(business.trial_end_at), new Date()))
    : null;

  const handleImpersonate = () => {
    if (business.owner_id) {
      startImpersonation(business.id, business.name, business.owner_id);
      navigate('/app');
    }
  };

  const handleExtendTrial = () => {
    extendTrial.mutate({ businessId: business.id, days: trialDays }, {
      onSuccess: () => setExtendTrialDialog(false)
    });
  };

  const handleSuspend = () => {
    suspendWithReason.mutate({ businessId: business.id, reason: suspendReason }, {
      onSuccess: () => {
        setSuspendDialog(false);
        setSuspendReason('');
      }
    });
  };

  const handleUpgrade = () => {
    upgradePlan.mutate({ businessId: business.id, plan: newPlan, manualPayment }, {
      onSuccess: () => setUpgradeDialog(false)
    });
  };

  const handleUpdateBusinessType = () => {
    updateBusinessType.mutate({ businessId: business.id, businessType: newBusinessType }, {
      onSuccess: () => {
        setBusinessTypeDialog(false);
      }
    });
  };

  const handleDelete = () => {
    deleteBusiness.mutate(business.id, {
      onSuccess: () => navigate('/admin')
    });
  };

  const handleUserRoleChange = () => {
    if (selectedUser && newRole) {
      updateUserRole.mutate({ 
        userId: selectedUser.user_id, 
        businessId: business.id, 
        newRole 
      }, {
        onSuccess: () => {
          setUserActionDialog(null);
          setSelectedUser(null);
        }
      });
    }
  };

  const handleToggleUser = () => {
    if (selectedUser) {
      disableUser.mutate({ 
        userId: selectedUser.user_id, 
        disabled: !selectedUser.disabled 
      }, {
        onSuccess: () => {
          setUserActionDialog(null);
          setSelectedUser(null);
        }
      });
    }
  };

  const handleUsernameChange = () => {
    if (!selectedUser) return;
    
    const usernameTrimmed = newUsername.trim() || null;
    
    // Client-side validation
    if (usernameTrimmed) {
      const usernamePattern = /^[a-zA-Z0-9_]{3,30}$/;
      if (!usernamePattern.test(usernameTrimmed)) {
        // Error will be shown by the mutation's onError handler
        // But we can also show it immediately for better UX
        return;
      }
    }
    
    updateUsername.mutate({ 
      userId: selectedUser.user_id, 
      username: usernameTrimmed 
    }, {
      onSuccess: () => {
        setUserActionDialog(null);
        setSelectedUser(null);
        setNewUsername('');
      },
      onError: () => {
        // Error already shown by hook's onError
      }
    });
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
      active: 'default',
      trial: 'secondary',
      expired: 'outline',
      suspended: 'destructive',
    };
    return <Badge variant={variants[status] || 'outline'}>{status}</Badge>;
  };

  const getRoleBadge = (role: string) => {
    const variants: Record<string, 'default' | 'secondary' | 'outline'> = {
      owner: 'default',
      admin: 'secondary',
      cashier: 'outline',
    };
    return <Badge variant={variants[role] || 'outline'}>{role}</Badge>;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate('/admin/businesses')}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold">{business.name}</h1>
          <p className="text-muted-foreground">{business.email || 'No email'}</p>
        </div>
        {getStatusBadge(business.status)}
      </div>

      {/* Quick Actions */}
      <div className="flex flex-wrap gap-2">
        <Button variant="outline" onClick={handleImpersonate} disabled={!business.owner_id}>
          <Eye className="h-4 w-4 mr-2" />
          Impersonate
        </Button>
        <Button variant="outline" onClick={() => forceLogout.mutate(business.id)}>
          <LogOut className="h-4 w-4 mr-2" />
          Force Logout All
        </Button>
        <Button variant="outline" onClick={() => setExtendTrialDialog(true)}>
          <Calendar className="h-4 w-4 mr-2" />
          Extend Trial
        </Button>
        <Button variant="outline" onClick={() => setUpgradeDialog(true)}>
          <DollarSign className="h-4 w-4 mr-2" />
          Manage Plan
        </Button>
        <Button variant="outline" onClick={() => {
          setNewBusinessType(business.business_type || 'retail');
          setBusinessTypeDialog(true);
        }}>
          <Settings className="h-4 w-4 mr-2" />
          Change Business Type
        </Button>
        {business.status !== 'suspended' ? (
          <Button variant="outline" className="text-destructive" onClick={() => setSuspendDialog(true)}>
            <Ban className="h-4 w-4 mr-2" />
            Suspend
          </Button>
        ) : (
          <Button variant="outline" onClick={() => upgradePlan.mutate({ businessId: business.id, plan: 'active' })}>
            <CheckCircle className="h-4 w-4 mr-2" />
            Unsuspend
          </Button>
        )}
        <Button variant="destructive" onClick={() => setDeleteDialog(true)}>
          <Trash2 className="h-4 w-4 mr-2" />
          Delete
        </Button>
      </div>

      {/* Business Info */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Status</CardTitle>
          </CardHeader>
          <CardContent>
            {getStatusBadge(business.status)}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Business Type</CardTitle>
          </CardHeader>
          <CardContent>
            <Badge variant="outline" className="capitalize">
              {business.business_type || 'retail'}
            </Badge>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Trial Days Left</CardTitle>
          </CardHeader>
          <CardContent>
            <span className="text-2xl font-bold">
              {trialDaysRemaining !== null ? trialDaysRemaining : '-'}
            </span>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Users</CardTitle>
          </CardHeader>
          <CardContent>
            <span className="text-2xl font-bold">{business.user_count || 0}</span>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Created</CardTitle>
          </CardHeader>
          <CardContent>
            <span className="text-sm">{format(new Date(business.created_at), 'PP')}</span>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="users">
        <TabsList>
          <TabsTrigger value="users" className="gap-2">
            <Users className="h-4 w-4" />
            Users
          </TabsTrigger>
          <TabsTrigger value="history" className="gap-2">
            <History className="h-4 w-4" />
            Subscription History
          </TabsTrigger>
          <TabsTrigger value="features" className="gap-2">
            <Settings className="h-4 w-4" />
            Feature Flags
          </TabsTrigger>
        </TabsList>

        <TabsContent value="users" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Users</CardTitle>
              <CardDescription>All users in this business</CardDescription>
            </CardHeader>
            <CardContent>
              {usersLoading ? (
                <div className="space-y-2">
                  {[1, 2, 3].map(i => <Skeleton key={i} className="h-12 w-full" />)}
                </div>
              ) : users?.length ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Username</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {users.map((user: any) => (
                      <TableRow key={user.user_id}>
                        <TableCell>{user.profile?.full_name || 'Unknown'}</TableCell>
                        <TableCell>{user.email || '-'}</TableCell>
                        <TableCell>{user.profile?.username || '-'}</TableCell>
                        <TableCell>{getRoleBadge(user.role)}</TableCell>
                        <TableCell>
                          <Badge variant={user.disabled ? 'destructive' : 'default'}>
                            {user.disabled ? 'Disabled' : 'Active'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button 
                              variant="ghost" 
                              size="sm"
                              onClick={() => {
                                setSelectedUser(user);
                                setNewRole(user.role);
                                setUserActionDialog('role');
                              }}
                            >
                              <Shield className="h-4 w-4" />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="sm"
                              onClick={() => {
                                setSelectedUser(user);
                                setUserActionDialog('disable');
                              }}
                            >
                              <Ban className="h-4 w-4" />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="sm"
                              onClick={() => user.email && sendPasswordReset.mutate(user.email)}
                              disabled={!user.email}
                            >
                              <Mail className="h-4 w-4" />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="sm"
                              onClick={() => {
                                setSelectedUser(user);
                                setNewUsername(user.profile?.username || '');
                                setUserActionDialog('username');
                              }}
                              title="Edit username"
                            >
                              <UserCog className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <p className="text-center py-8 text-muted-foreground">No users found</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Subscription History</CardTitle>
              <CardDescription>All subscription changes</CardDescription>
            </CardHeader>
            <CardContent>
              {historyLoading ? (
                <div className="space-y-2">
                  {[1, 2, 3].map(i => <Skeleton key={i} className="h-12 w-full" />)}
                </div>
              ) : history?.length ? (
                <div className="space-y-4">
                  {history.map((entry) => (
                    <div key={entry.id} className="flex items-start gap-4 p-3 rounded-lg border">
                      <div className="w-2 h-2 rounded-full bg-primary mt-2" />
                      <div className="flex-1">
                        <p className="font-medium">{entry.action.replace(/_/g, ' ')}</p>
                        {entry.from_status && entry.to_status && (
                          <p className="text-sm text-muted-foreground">
                            {entry.from_status} → {entry.to_status}
                          </p>
                        )}
                        {entry.trial_days_added && (
                          <p className="text-sm text-muted-foreground">
                            +{entry.trial_days_added} days
                          </p>
                        )}
                        {entry.reason && (
                          <p className="text-sm text-muted-foreground">Reason: {entry.reason}</p>
                        )}
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {format(new Date(entry.created_at), 'PPp')}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-center py-8 text-muted-foreground">No history found</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="features" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Feature Flags</CardTitle>
              <CardDescription>Toggle features for this business</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {AVAILABLE_FEATURES.map((feature) => {
                  const flag = featureFlags?.find(f => f.feature_key === feature.key);
                  const enabled = flag?.enabled || false;

                  return (
                    <div key={feature.key} className="flex items-center justify-between p-3 rounded-lg border">
                      <div>
                        <p className="font-medium">{feature.name}</p>
                        <p className="text-sm text-muted-foreground">{feature.description}</p>
                      </div>
                      <Switch
                        checked={enabled}
                        onCheckedChange={(checked) => {
                          toggleFeatureFlag.mutate({
                            businessId: business.id,
                            featureKey: feature.key,
                            enabled: checked
                          });
                        }}
                      />
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Dialogs */}
      <Dialog open={extendTrialDialog} onOpenChange={setExtendTrialDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Extend Trial</DialogTitle>
            <DialogDescription>Add more days to the trial period</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Days to Add</Label>
              <Input 
                type="number" 
                value={trialDays} 
                onChange={(e) => setTrialDays(parseInt(e.target.value) || 0)} 
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setExtendTrialDialog(false)}>Cancel</Button>
            <Button onClick={handleExtendTrial} disabled={extendTrial.isPending}>
              {extendTrial.isPending ? 'Extending...' : 'Extend Trial'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={suspendDialog} onOpenChange={setSuspendDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Suspend Business</DialogTitle>
            <DialogDescription>Provide a reason for suspension</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Reason</Label>
              <Textarea 
                value={suspendReason} 
                onChange={(e) => setSuspendReason(e.target.value)}
                placeholder="e.g., Fraudulent activity, Non-payment, Policy violation"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSuspendDialog(false)}>Cancel</Button>
            <Button variant="destructive" onClick={handleSuspend} disabled={suspendWithReason.isPending || !suspendReason}>
              {suspendWithReason.isPending ? 'Suspending...' : 'Suspend'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={upgradeDialog} onOpenChange={setUpgradeDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Manage Plan</DialogTitle>
            <DialogDescription>Change the business plan</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>New Status</Label>
              <Select value={newPlan} onValueChange={setNewPlan}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active (Paid)</SelectItem>
                  <SelectItem value="trial">Trial</SelectItem>
                  <SelectItem value="expired">Expired</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center justify-between">
              <Label>Mark as Manual Payment</Label>
              <Switch checked={manualPayment} onCheckedChange={setManualPayment} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setUpgradeDialog(false)}>Cancel</Button>
            <Button onClick={handleUpgrade} disabled={upgradePlan.isPending}>
              {upgradePlan.isPending ? 'Updating...' : 'Update Plan'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={businessTypeDialog} onOpenChange={setBusinessTypeDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Change Business Type</DialogTitle>
            <DialogDescription>
              Update the business type. This will change which POS module the business owner accesses after login.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Current Business Type</Label>
              <Badge variant="outline" className="capitalize">
                {business.business_type || 'retail'}
              </Badge>
            </div>
            <div className="space-y-2">
              <Label>New Business Type *</Label>
              <Select value={newBusinessType} onValueChange={(value) => setNewBusinessType(value as 'retail' | 'fnb' | 'service' | 'venue')}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="retail">Retail</SelectItem>
                  <SelectItem value="fnb">Food & Beverage</SelectItem>
                  <SelectItem value="service">Service (Barbershop, etc.)</SelectItem>
                  <SelectItem value="venue">Venue (Badminton/Futsal/Rental)</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Changing the business type will redirect users to the appropriate POS module on their next login.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBusinessTypeDialog(false)}>Cancel</Button>
            <Button 
              onClick={handleUpdateBusinessType} 
              disabled={updateBusinessType.isPending || newBusinessType === (business.business_type || 'retail')}
            >
              {updateBusinessType.isPending ? 'Updating...' : 'Update Business Type'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={userActionDialog === 'role'} onOpenChange={() => setUserActionDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Change User Role</DialogTitle>
            <DialogDescription>Update role for {selectedUser?.profile?.full_name || 'user'}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>New Role</Label>
              <Select value={newRole} onValueChange={setNewRole}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="owner">Owner</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="cashier">Cashier</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setUserActionDialog(null)}>Cancel</Button>
            <Button onClick={handleUserRoleChange} disabled={updateUserRole.isPending}>
              {updateUserRole.isPending ? 'Updating...' : 'Update Role'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={userActionDialog === 'disable'} onOpenChange={() => setUserActionDialog(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {selectedUser?.disabled ? 'Enable User' : 'Disable User'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {selectedUser?.disabled 
                ? 'This will allow the user to access the system again.'
                : 'This will prevent the user from logging in.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleToggleUser}>
              {selectedUser?.disabled ? 'Enable' : 'Disable'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={userActionDialog === 'username'} onOpenChange={() => setUserActionDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Update Username</DialogTitle>
            <DialogDescription>Update username for {selectedUser?.profile?.full_name || selectedUser?.email || 'user'}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Username (optional)</Label>
              <Input
                value={newUsername}
                onChange={(e) => setNewUsername(e.target.value)}
                placeholder="username (3-30 chars, letters, numbers, underscore)"
                pattern="[a-zA-Z0-9_]{3,30}"
              />
              <p className="text-xs text-muted-foreground">
                Leave empty to remove username. If set, user can login using this username instead of email.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setUserActionDialog(null);
              setNewUsername('');
            }}>Cancel</Button>
            <Button onClick={handleUsernameChange} disabled={updateUsername.isPending}>
              {updateUsername.isPending ? 'Updating...' : 'Update Username'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteDialog} onOpenChange={setDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Business</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the business 
              "{business.name}" and all associated data.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDelete}
              className="bg-destructive hover:bg-destructive/90"
            >
              {deleteBusiness.isPending ? 'Deleting...' : 'Delete Business'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
