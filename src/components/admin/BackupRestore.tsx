import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Download,
  Upload,
  Clock,
  AlertTriangle,
  CheckCircle2,
  HardDrive,
  Database,
} from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { format } from 'date-fns';

interface BusinessSnapshot {
  id: string;
  business_id: string;
  name: string;
  description: string | null;
  snapshot_data: Record<string, unknown>;
  created_by: string;
  created_at: string;
}

interface BackupRestoreProps {
  businessId: string;
  businessName: string;
}

export function BackupRestore({ businessId, businessName }: BackupRestoreProps) {
  const queryClient = useQueryClient();
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [restoreDialogOpen, setRestoreDialogOpen] = useState(false);
  const [selectedSnapshot, setSelectedSnapshot] = useState<BusinessSnapshot | null>(null);
  const [snapshotName, setSnapshotName] = useState('');
  const [snapshotDescription, setSnapshotDescription] = useState('');
  
  // Fetch snapshots for this business
  const { data: snapshots, isLoading } = useQuery({
    queryKey: ['business-snapshots', businessId],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke('admin-actions', {
        body: { action: 'list_snapshots', business_id: businessId },
      });
      if (error) throw error;
      return data.snapshots as BusinessSnapshot[];
    },
  });
  
  // Create snapshot mutation
  const createSnapshot = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke('admin-actions', {
        body: { 
          action: 'create_snapshot', 
          business_id: businessId,
          payload: { name: snapshotName, description: snapshotDescription },
        },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success('Snapshot created successfully');
      setCreateDialogOpen(false);
      setSnapshotName('');
      setSnapshotDescription('');
      queryClient.invalidateQueries({ queryKey: ['business-snapshots', businessId] });
    },
    onError: (error: Error) => toast.error(error.message),
  });
  
  // Restore snapshot mutation
  const restoreSnapshot = useMutation({
    mutationFn: async (snapshotId: string) => {
      const { data, error } = await supabase.functions.invoke('admin-actions', {
        body: { 
          action: 'restore_snapshot', 
          business_id: businessId,
          payload: { snapshot_id: snapshotId },
        },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success('Snapshot restored successfully');
      setRestoreDialogOpen(false);
      setSelectedSnapshot(null);
      queryClient.invalidateQueries({ queryKey: ['admin-businesses'] });
    },
    onError: (error: Error) => toast.error(error.message),
  });
  
  const handleOpenRestore = (snapshot: BusinessSnapshot) => {
    setSelectedSnapshot(snapshot);
    setRestoreDialogOpen(true);
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <HardDrive className="h-5 w-5" />
              Backup & Restore
            </CardTitle>
            <CardDescription>
              Create snapshots and restore business data
            </CardDescription>
          </div>
          <Button onClick={() => setCreateDialogOpen(true)}>
            <Download className="h-4 w-4 mr-2" />
            Create Snapshot
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map(i => <Skeleton key={i} className="h-16 w-full" />)}
          </div>
        ) : !snapshots?.length ? (
          <div className="text-center py-8 text-muted-foreground">
            <Database className="h-12 w-12 mx-auto mb-3 opacity-30" />
            <p>No snapshots yet</p>
            <p className="text-sm">Create a snapshot to backup this business's data</p>
          </div>
        ) : (
          <div className="space-y-3">
            {snapshots.map((snapshot) => (
              <div 
                key={snapshot.id}
                className="flex items-center justify-between p-4 rounded-lg border bg-card hover:bg-muted/30 transition-colors"
              >
                <div className="flex items-center gap-4">
                  <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Database className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium">{snapshot.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {snapshot.description || 'No description'}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right text-sm text-muted-foreground">
                    <Clock className="h-3 w-3 inline mr-1" />
                    {format(new Date(snapshot.created_at), 'MMM d, yyyy HH:mm')}
                  </div>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => handleOpenRestore(snapshot)}
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    Restore
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
      
      {/* Create Snapshot Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Snapshot</DialogTitle>
            <DialogDescription>
              Create a backup snapshot of {businessName}'s current data.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Snapshot Name</Label>
              <Input
                placeholder="e.g., Pre-migration backup"
                value={snapshotName}
                onChange={(e) => setSnapshotName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Description (Optional)</Label>
              <Textarea
                placeholder="Describe what this snapshot is for..."
                value={snapshotDescription}
                onChange={(e) => setSnapshotDescription(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={() => createSnapshot.mutate()}
              disabled={!snapshotName.trim() || createSnapshot.isPending}
            >
              {createSnapshot.isPending ? 'Creating...' : 'Create Snapshot'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Restore Confirmation Dialog */}
      <Dialog open={restoreDialogOpen} onOpenChange={setRestoreDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-warning">
              <AlertTriangle className="h-5 w-5" />
              Restore Snapshot
            </DialogTitle>
            <DialogDescription>
              This action will restore {businessName} to the state captured in this snapshot.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <div className="p-4 rounded-lg border bg-warning/5 border-warning/20 space-y-2">
              <p className="font-medium">Warning: This action is destructive</p>
              <p className="text-sm text-muted-foreground">
                Restoring this snapshot will overwrite all current data for this business. 
                This cannot be undone. Make sure you have a current snapshot before proceeding.
              </p>
            </div>
            {selectedSnapshot && (
              <div className="mt-4 p-4 rounded-lg border">
                <p className="font-medium">{selectedSnapshot.name}</p>
                <p className="text-sm text-muted-foreground">
                  Created: {format(new Date(selectedSnapshot.created_at), 'MMM d, yyyy HH:mm')}
                </p>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRestoreDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              variant="destructive"
              onClick={() => selectedSnapshot && restoreSnapshot.mutate(selectedSnapshot.id)}
              disabled={restoreSnapshot.isPending}
            >
              {restoreSnapshot.isPending ? 'Restoring...' : 'Restore Snapshot'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
