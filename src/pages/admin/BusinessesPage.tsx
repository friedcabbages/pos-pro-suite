import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Building2, Search, MoreHorizontal, Eye, Ban, CheckCircle, UserCog, Users, DollarSign, Plus, Clock, XCircle, Play, ExternalLink } from 'lucide-react';
import { format, differenceInDays } from 'date-fns';
import { useAdminBusinesses, useAdminAction, useSystemStats, useCreateBusinessWithOwner } from '@/hooks/useSuperAdmin';
import { useImpersonation } from '@/contexts/ImpersonationContext';

type BusinessStatus = 'trial' | 'active' | 'expired' | 'suspended';

interface Business {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  currency: string;
  created_at: string;
  owner_id: string | null;
  status: BusinessStatus;
  trial_end_at: string | null;
  user_count?: number;
  owner?: {
    full_name: string | null;
    phone: string | null;
  };
}

export default function BusinessesPage() {
  const navigate = useNavigate();
  const { startImpersonation } = useImpersonation();
  const [search, setSearch] = useState('');
  const [selectedBusiness, setSelectedBusiness] = useState<Business | null>(null);
  const [dialogAction, setDialogAction] = useState<'suspend' | 'activate' | 'expire' | 'start_trial' | 'create' | null>(null);
  const [createForm, setCreateForm] = useState({
    business_name: '',
    owner_email: '',
    owner_password: '',
    owner_name: '',
    owner_username: '',
    currency: 'USD',
    business_type: 'retail' as 'retail' | 'fnb' | 'service' | 'venue',
  });

  const { data: businesses, isLoading } = useAdminBusinesses();
  const { data: stats } = useSystemStats();
  const adminAction = useAdminAction();
  const createBusiness = useCreateBusinessWithOwner();

  const filteredBusinesses = businesses?.filter((b) =>
    b.name.toLowerCase().includes(search.toLowerCase()) ||
    b.email?.toLowerCase().includes(search.toLowerCase()) ||
    b.owner?.full_name?.toLowerCase().includes(search.toLowerCase())
  );

  const handleViewDetails = (business: Business) => {
    navigate(`/admin/businesses/${business.id}`);
  };

  const handleImpersonate = (business: Business) => {
    if (business.owner_id) {
      startImpersonation(business.id, business.name, business.owner_id);
      navigate('/app');
    }
  };

  const handleAction = (business: Business, action: typeof dialogAction) => {
    setSelectedBusiness(business);
    setDialogAction(action);
  };

  const confirmAction = () => {
    if (!selectedBusiness || !dialogAction) return;

    adminAction.mutate(
      { action: dialogAction, businessId: selectedBusiness.id },
      {
        onSuccess: () => {
          setDialogAction(null);
          setSelectedBusiness(null);
        },
      }
    );
  };

  const handleCreateBusiness = () => {
    createBusiness.mutate(createForm, {
      onSuccess: () => {
        setDialogAction(null);
        setCreateForm({ business_name: '', owner_email: '', owner_password: '', owner_name: '', owner_username: '', currency: 'USD', business_type: 'retail' });
      },
    });
  };

  const getStatusBadge = (business: Business) => {
    const status = business.status || 'active';
    const variants: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
      active: 'default',
      trial: 'secondary',
      expired: 'outline',
      suspended: 'destructive',
    };
    return <Badge variant={variants[status]}>{status.charAt(0).toUpperCase() + status.slice(1)}</Badge>;
  };

  const getTrialDays = (business: Business) => {
    if (business.status !== 'trial' || !business.trial_end_at) return null;
    const days = differenceInDays(new Date(business.trial_end_at), new Date());
    return Math.max(0, days);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Businesses</h1>
          <p className="text-muted-foreground">Manage all registered businesses</p>
        </div>
        <Button onClick={() => setDialogAction('create')}>
          <Plus className="h-4 w-4 mr-2" />
          Create Business
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Businesses</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.total_businesses || 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Active</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.businesses_by_status?.active || 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Trial</CardTitle>
            <Clock className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.businesses_by_status?.trial || 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.total_users || 0}</div>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search businesses..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Business</TableHead>
                <TableHead>Owner</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Trial Days</TableHead>
                <TableHead>Users</TableHead>
                <TableHead>Created</TableHead>
                <TableHead className="w-[50px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={7} className="text-center py-8">Loading...</TableCell></TableRow>
              ) : filteredBusinesses?.length === 0 ? (
                <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">No businesses found</TableCell></TableRow>
              ) : (
                filteredBusinesses?.map((business) => (
                  <TableRow key={business.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{business.name}</p>
                        <p className="text-sm text-muted-foreground">{business.email || '-'}</p>
                      </div>
                    </TableCell>
                    <TableCell>{business.owner?.full_name || '-'}</TableCell>
                    <TableCell>{getStatusBadge(business)}</TableCell>
                    <TableCell>{getTrialDays(business) !== null ? `${getTrialDays(business)} days` : '-'}</TableCell>
                    <TableCell>{business.user_count || 0}</TableCell>
                    <TableCell>{format(new Date(business.created_at), 'dd MMM yyyy')}</TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon"><MoreHorizontal className="h-4 w-4" /></Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleViewDetails(business)}>
                            <Eye className="h-4 w-4 mr-2" />View Details
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleImpersonate(business)} disabled={!business.owner_id}>
                            <UserCog className="h-4 w-4 mr-2" />Impersonate Owner
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          {business.status !== 'active' && (
                            <DropdownMenuItem onClick={() => handleAction(business, 'activate')}><CheckCircle className="h-4 w-4 mr-2" />Activate</DropdownMenuItem>
                          )}
                          {business.status !== 'trial' && (
                            <DropdownMenuItem onClick={() => handleAction(business, 'start_trial')}><Play className="h-4 w-4 mr-2" />Start Trial</DropdownMenuItem>
                          )}
                          {business.status !== 'expired' && (
                            <DropdownMenuItem onClick={() => handleAction(business, 'expire')}><XCircle className="h-4 w-4 mr-2" />Expire</DropdownMenuItem>
                          )}
                          {business.status !== 'suspended' && (
                            <DropdownMenuItem onClick={() => handleAction(business, 'suspend')} className="text-destructive"><Ban className="h-4 w-4 mr-2" />Suspend</DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Create Business Dialog */}
      <Dialog open={dialogAction === 'create'} onOpenChange={() => setDialogAction(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Business</DialogTitle>
            <DialogDescription>Create a new business with an owner account. A 7-day trial will be started automatically.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Business Name *</Label>
              <Input value={createForm.business_name} onChange={(e) => setCreateForm(p => ({ ...p, business_name: e.target.value }))} placeholder="My Store" />
            </div>
            <div className="space-y-2">
              <Label>Owner Name</Label>
              <Input value={createForm.owner_name} onChange={(e) => setCreateForm(p => ({ ...p, owner_name: e.target.value }))} placeholder="John Doe" />
            </div>
            <div className="space-y-2">
              <Label>Owner Email *</Label>
              <Input type="email" value={createForm.owner_email} onChange={(e) => setCreateForm(p => ({ ...p, owner_email: e.target.value }))} placeholder="owner@example.com" />
            </div>
            <div className="space-y-2">
              <Label>Owner Username (optional)</Label>
              <Input 
                type="text" 
                value={createForm.owner_username} 
                onChange={(e) => setCreateForm(p => ({ ...p, owner_username: e.target.value }))} 
                placeholder="username (3-30 chars, letters, numbers, underscore)"
                pattern="[a-zA-Z0-9_]{3,30}"
              />
              <p className="text-xs text-muted-foreground">
                If set, owner can login using this username instead of email.
              </p>
            </div>
            <div className="space-y-2">
              <Label>Business Type *</Label>
              <Select value={createForm.business_type} onValueChange={(value) => setCreateForm(p => ({ ...p, business_type: value as 'retail' | 'fnb' | 'service' | 'venue' }))}>
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
                Select the type of business. This determines which POS module the user will access.
              </p>
            </div>
            <div className="space-y-2">
              <Label>Password *</Label>
              <Input type="password" value={createForm.owner_password} onChange={(e) => setCreateForm(p => ({ ...p, owner_password: e.target.value }))} placeholder="••••••••" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogAction(null)}>Cancel</Button>
            <Button onClick={handleCreateBusiness} disabled={createBusiness.isPending || !createForm.business_name || !createForm.owner_email || !createForm.owner_password}>
              {createBusiness.isPending ? 'Creating...' : 'Create Business'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Action Dialog */}
      <Dialog open={!!dialogAction && dialogAction !== 'create'} onOpenChange={() => setDialogAction(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {dialogAction === 'suspend' && 'Suspend Business'}
              {dialogAction === 'activate' && 'Activate Business'}
              {dialogAction === 'expire' && 'Expire Business'}
              {dialogAction === 'start_trial' && 'Start Trial'}
            </DialogTitle>
            <DialogDescription>
              {dialogAction === 'suspend' && `Are you sure you want to suspend ${selectedBusiness?.name}?`}
              {dialogAction === 'activate' && `Are you sure you want to activate ${selectedBusiness?.name}?`}
              {dialogAction === 'expire' && `Are you sure you want to expire ${selectedBusiness?.name}?`}
              {dialogAction === 'start_trial' && `Start a 7-day trial for ${selectedBusiness?.name}?`}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogAction(null)}>Cancel</Button>
            <Button variant={dialogAction === 'suspend' ? 'destructive' : 'default'} onClick={confirmAction} disabled={adminAction.isPending}>
              {adminAction.isPending ? 'Processing...' : 'Confirm'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}