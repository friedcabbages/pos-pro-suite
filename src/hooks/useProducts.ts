import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useBusiness } from '@/contexts/BusinessContext';
import { useAuth } from '@/contexts/AuthContext';
import { Product } from '@/types/database';
import { createAuditLog, logInventoryChange } from '@/lib/audit';
import { toast } from 'sonner';
import { listProducts, upsertProduct } from '@/data/dataService';
import { useConnectivityStatus } from '@/hooks/useConnectivityStatus';

export function useProducts() {
  const { business, warehouse } = useBusiness();
  const connectivity = useConnectivityStatus();

  return useQuery({
    queryKey: ['products', business?.id, warehouse?.id, connectivity.lastSyncAt, connectivity.queueCount, connectivity.status],
    queryFn: async () => {
      if (!business?.id) return [];
      return await listProducts(business.id, warehouse?.id);
    },
    enabled: !!business?.id
  });
}

export function useProductsWithStock() {
  const { business, warehouse } = useBusiness();
  const connectivity = useConnectivityStatus();

  return useQuery({
    queryKey: ['products-with-stock', business?.id, warehouse?.id, connectivity.lastSyncAt, connectivity.queueCount, connectivity.status],
    queryFn: async () => {
      if (!business?.id || !warehouse?.id) return [];
      return await listProducts(business.id, warehouse.id);
    },
    enabled: !!business?.id && !!warehouse?.id
  });
}

export function useCreateProduct() {
  const queryClient = useQueryClient();
  const { business, warehouse } = useBusiness();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (product: Partial<Product> & { initial_stock?: number }) => {
      if (!business?.id) throw new Error('No business selected');

      const { initial_stock, ...rest } = product;

      // Offline-first: write to local store (and enqueue if needed). Online will write-through.
      const created = await upsertProduct(rest);

      // Note: initial_stock + inventory logs are best-effort and currently online-only in this codebase.
      // We intentionally do not block product creation if offline.
      if (navigator.onLine && initial_stock && initial_stock > 0 && warehouse) {
        try {
          // keep existing behavior (server-side inventory is canonical)
          // eslint-disable-next-line @typescript-eslint/no-floating-promises
          logInventoryChange({
            product_id: created.id,
            warehouse_id: warehouse.id,
            action: 'stock_in',
            quantity_before: 0,
            quantity_after: initial_stock,
            quantity_change: initial_stock,
            notes: 'Initial stock',
            user_id: user?.id
          });
        } catch {
          // ignore
        }
      }

      if (navigator.onLine) {
        try {
          // eslint-disable-next-line @typescript-eslint/no-floating-promises
          createAuditLog({
            business_id: business.id,
            user_id: user?.id,
            entity_type: 'product',
            entity_id: created.id,
            action: 'create',
            new_value: created as unknown as Record<string, unknown>
          });
        } catch {
          // ignore
        }
      }

      return created;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      toast.success('Product created successfully');
    },
    onError: (error) => {
      toast.error('Failed to create product: ' + error.message);
    }
  });
}

export function useUpdateProduct() {
  const queryClient = useQueryClient();
  const { business } = useBusiness();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Product> & { id: string }) => {
      const updated = await upsertProduct({ id, ...updates });

      // Best-effort audit when online
      if (navigator.onLine && business) {
        try {
          // eslint-disable-next-line @typescript-eslint/no-floating-promises
          createAuditLog({
            business_id: business.id,
            user_id: user?.id,
            entity_type: 'product',
            entity_id: id,
            action: 'update',
            new_value: updates as unknown as Record<string, unknown>
          });
        } catch {
          // ignore
        }
      }

      return updated;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      toast.success('Product updated successfully');
    },
    onError: (error) => {
      toast.error('Failed to update product: ' + error.message);
    }
  });
}

export function useDeleteProduct() {
  const queryClient = useQueryClient();
  const { business } = useBusiness();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (id: string) => {
      await upsertProduct({ id, is_active: false });

      if (navigator.onLine && business) {
        try {
          // eslint-disable-next-line @typescript-eslint/no-floating-promises
          createAuditLog({
            business_id: business.id,
            user_id: user?.id,
            entity_type: 'product',
            entity_id: id,
            action: 'delete'
          });
        } catch {
          // ignore
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      toast.success('Product deleted successfully');
    },
    onError: (error) => {
      toast.error('Failed to delete product: ' + error.message);
    }
  });
}
