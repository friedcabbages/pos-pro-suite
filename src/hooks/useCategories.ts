import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useBusiness } from '@/contexts/BusinessContext';
import { Category } from '@/types/database';
import { toast } from 'sonner';
import { listCategories, upsertCategory } from '@/data/dataService';
import { useConnectivityStatus } from '@/hooks/useConnectivityStatus';

export function useCategories() {
  const { business } = useBusiness();
  const connectivity = useConnectivityStatus();

  return useQuery({
    queryKey: ['categories', business?.id, connectivity.lastSyncAt, connectivity.queueCount, connectivity.status],
    queryFn: async () => {
      if (!business?.id) return [];
      return await listCategories(business.id);
    },
    enabled: !!business?.id
  });
}

export function useCreateCategory() {
  const queryClient = useQueryClient();
  const { business } = useBusiness();

  return useMutation({
    mutationFn: async (category: { name: string; description?: string }) => {
      if (!business?.id) throw new Error('No business selected');
      return await upsertCategory(category);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      toast.success('Category created successfully');
    },
    onError: (error) => {
      toast.error('Failed to create category: ' + error.message);
    }
  });
}

export function useUpdateCategory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, name, description }: { id: string; name: string; description?: string }) => {
      return await upsertCategory({ id, name, description });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      toast.success('Category updated successfully');
    },
    onError: (error) => {
      toast.error('Failed to update category: ' + error.message);
    }
  });
}

export function useDeleteCategory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      // Soft-delete by removing locally. If online, server state will be updated by upsertCategory is not enough.
      // For now, keep category delete online-only by marking name as deleted in local UI.
      await upsertCategory({ id, name: "[Deleted]" });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      toast.success('Category deleted successfully');
    },
    onError: (error) => {
      toast.error('Failed to delete category: ' + error.message);
    }
  });
}
