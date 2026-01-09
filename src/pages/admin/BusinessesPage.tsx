import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
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
import { Building2, Search, MoreHorizontal, Eye, Ban, CheckCircle, UserCog } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';

interface Business {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  currency: string;
  created_at: string;
  owner_id: string | null;
  is_active?: boolean;
}

export default function BusinessesPage() {
  const [search, setSearch] = useState('');
  const [selectedBusiness, setSelectedBusiness] = useState<Business | null>(null);
  const [dialogAction, setDialogAction] = useState<'view' | 'suspend' | 'activate' | 'impersonate' | null>(null);
  const queryClient = useQueryClient();

  const { data: businesses, isLoading } = useQuery({
    queryKey: ['admin-businesses'],
    queryFn: async () => {
      // Note: In production, this should call an edge function with service role
      const { data, error } = await supabase
        .from('businesses')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as Business[];
    },
  });

  const adminActionMutation = useMutation({
    mutationFn: async ({ action, businessId }: { action: string; businessId: string }) => {
      const { data, error } = await supabase.functions.invoke('admin-actions', {
        body: { action, business_id: businessId },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      toast.success(`Business ${variables.action}d successfully`);
      queryClient.invalidateQueries({ queryKey: ['admin-businesses'] });
      setDialogAction(null);
      setSelectedBusiness(null);
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const filteredBusinesses = businesses?.filter((b) =>
    b.name.toLowerCase().includes(search.toLowerCase()) ||
    b.email?.toLowerCase().includes(search.toLowerCase())
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

    adminActionMutation.mutate({
      action: dialogAction,
      businessId: selectedBusiness.id,
    });
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
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Businesses</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{businesses?.length || 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Active</CardTitle>
            <CheckCircle className="h-4 w-4 text-success" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{businesses?.filter(b => b.is_active !== false).length || 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Suspended</CardTitle>
            <Ban className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{businesses?.filter(b => b.is_active === false).length || 0}</div>
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
                <TableHead>Email</TableHead>
                <TableHead>Currency</TableHead>
                <TableHead>Created</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-[50px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8">
                    Loading...
                  </TableCell>
                </TableRow>
              ) : filteredBusinesses?.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    No businesses found
                  </TableCell>
                </TableRow>
              ) : (
                filteredBusinesses?.map((business) => (
                  <TableRow key={business.id}>
                    <TableCell className="font-medium">{business.name}</TableCell>
                    <TableCell>{business.email || '-'}</TableCell>
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
              <div>
                <label className="text-sm text-muted-foreground">Business Name</label>
                <p className="font-medium">{selectedBusiness.name}</p>
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
                <label className="text-sm text-muted-foreground">Currency</label>
                <p className="font-medium">{selectedBusiness.currency}</p>
              </div>
              <div>
                <label className="text-sm text-muted-foreground">Owner ID</label>
                <p className="font-mono text-sm">{selectedBusiness.owner_id}</p>
              </div>
              <div>
                <label className="text-sm text-muted-foreground">Created</label>
                <p className="font-medium">{format(new Date(selectedBusiness.created_at), 'PPpp')}</p>
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
                disabled={adminActionMutation.isPending}
              >
                {adminActionMutation.isPending ? 'Processing...' : 'Confirm'}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
