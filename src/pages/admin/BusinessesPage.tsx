import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Building2, Search, MoreHorizontal, Eye, Ban, CheckCircle, UserCog, Users, DollarSign } from 'lucide-react';
import { format } from 'date-fns';
import { useAdminBusinesses, useAdminAction, useSystemStats } from '@/hooks/useSuperAdmin';

interface Business {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  currency: string;
  created_at: string;
  owner_id: string | null;
  is_active?: boolean;
  user_count?: number;
  owner?: {
    full_name: string | null;
    phone: string | null;
  };
}

export default function BusinessesPage() {
  const [search, setSearch] = useState('');
  const [selectedBusiness, setSelectedBusiness] = useState<Business | null>(null);
  const [dialogAction, setDialogAction] = useState<'view' | 'suspend' | 'activate' | 'impersonate' | null>(null);

  const { data: businesses, isLoading } = useAdminBusinesses();
  const { data: stats } = useSystemStats();
  const adminAction = useAdminAction();

  const filteredBusinesses = businesses?.filter((b) =>
    b.name.toLowerCase().includes(search.toLowerCase()) ||
    b.email?.toLowerCase().includes(search.toLowerCase()) ||
    b.owner?.full_name?.toLowerCase().includes(search.toLowerCase())
  );

  const handleAction = (business: Business, action: 'view' | 'suspend' | 'activate' | 'impersonate') => {
    setSelectedBusiness(business);
    setDialogAction(action);
  };

  const confirmAction = () => {
    if (!selectedBusiness || !dialogAction) return;
    
    if (dialogAction === 'view') {
      setDialogAction(null);
      return;
    }

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

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', { 
      style: 'currency', 
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Businesses</h1>
          <p className="text-muted-foreground">Manage all registered businesses</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Businesses</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.total_businesses || businesses?.length || 0}</div>
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
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Active</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{businesses?.filter(b => b.is_active !== false).length || 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(stats?.total_revenue || 0)}</div>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search businesses..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
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
                <TableHead>Users</TableHead>
                <TableHead>Currency</TableHead>
                <TableHead>Created</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-[50px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8">
                    Loading...
                  </TableCell>
                </TableRow>
              ) : filteredBusinesses?.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    No businesses found
                  </TableCell>
                </TableRow>
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
                    <TableCell>{business.user_count || 0}</TableCell>
                    <TableCell>{business.currency}</TableCell>
                    <TableCell>{format(new Date(business.created_at), 'dd MMM yyyy')}</TableCell>
                    <TableCell>
                      <Badge variant={business.is_active === false ? 'destructive' : 'default'}>
                        {business.is_active === false ? 'Suspended' : 'Active'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleAction(business, 'view')}>
                            <Eye className="h-4 w-4 mr-2" />
                            View Details
                          </DropdownMenuItem>
                          {business.is_active === false ? (
                            <DropdownMenuItem onClick={() => handleAction(business, 'activate')}>
                              <CheckCircle className="h-4 w-4 mr-2" />
                              Activate
                            </DropdownMenuItem>
                          ) : (
                            <DropdownMenuItem 
                              onClick={() => handleAction(business, 'suspend')}
                              className="text-destructive"
                            >
                              <Ban className="h-4 w-4 mr-2" />
                              Suspend
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem onClick={() => handleAction(business, 'impersonate')}>
                            <UserCog className="h-4 w-4 mr-2" />
                            Impersonate Owner
                          </DropdownMenuItem>
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

      {/* Action Dialog */}
      <Dialog open={!!dialogAction} onOpenChange={() => setDialogAction(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {dialogAction === 'view' && 'Business Details'}
              {dialogAction === 'suspend' && 'Suspend Business'}
              {dialogAction === 'activate' && 'Activate Business'}
              {dialogAction === 'impersonate' && 'Impersonate Owner'}
            </DialogTitle>
            <DialogDescription>
              {dialogAction === 'view' && 'View business information'}
              {dialogAction === 'suspend' && 'This will prevent the business from accessing the system.'}
              {dialogAction === 'activate' && 'This will restore access for the business.'}
              {dialogAction === 'impersonate' && 'You will be logged in as the business owner.'}
            </DialogDescription>
          </DialogHeader>

          {dialogAction === 'view' && selectedBusiness && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm text-muted-foreground">Business Name</label>
                  <p className="font-medium">{selectedBusiness.name}</p>
                </div>
                <div>
                  <label className="text-sm text-muted-foreground">Currency</label>
                  <p className="font-medium">{selectedBusiness.currency}</p>
                </div>
                <div>
                  <label className="text-sm text-muted-foreground">Email</label>
                  <p className="font-medium">{selectedBusiness.email || '-'}</p>
                </div>
                <div>
                  <label className="text-sm text-muted-foreground">Phone</label>
                  <p className="font-medium">{selectedBusiness.phone || '-'}</p>
                </div>
                <div>
                  <label className="text-sm text-muted-foreground">Owner</label>
                  <p className="font-medium">{selectedBusiness.owner?.full_name || '-'}</p>
                </div>
                <div>
                  <label className="text-sm text-muted-foreground">Users</label>
                  <p className="font-medium">{selectedBusiness.user_count || 0}</p>
                </div>
                <div className="col-span-2">
                  <label className="text-sm text-muted-foreground">Owner ID</label>
                  <p className="font-mono text-sm">{selectedBusiness.owner_id}</p>
                </div>
                <div className="col-span-2">
                  <label className="text-sm text-muted-foreground">Created</label>
                  <p className="font-medium">{format(new Date(selectedBusiness.created_at), 'PPpp')}</p>
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogAction(null)}>
              {dialogAction === 'view' ? 'Close' : 'Cancel'}
            </Button>
            {dialogAction !== 'view' && (
              <Button
                variant={dialogAction === 'suspend' ? 'destructive' : 'default'}
                onClick={confirmAction}
                disabled={adminAction.isPending}
              >
                {adminAction.isPending ? 'Processing...' : 'Confirm'}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
