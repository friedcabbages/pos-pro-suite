import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useBusiness } from '@/contexts/BusinessContext';
import { useAuth } from '@/contexts/AuthContext';
import { Warehouse } from '@/types/database';
import { toast } from 'sonner';

interface WarehouseWithStats extends Warehouse {
  products_count: number;
  total_value: number;
  low_stock_count: number;
}

export function useWarehouses() {
  const { business } = useBusiness();

  return useQuery({
    queryKey: ['warehouses', business?.id],
    queryFn: async () => {
      if (!business?.id) return [];

      // Get warehouses with branch info
      const { data: warehouses, error } = await supabase
        .from('warehouses')
        .select(`
          *,
          branch:branches!inner(id, name, business_id)
        `)
        .eq('branches.business_id', business.id)
        .eq('is_active', true);

      if (error) throw error;

      // Get inventory stats for each warehouse
      const result: WarehouseWithStats[] = [];
      
      for (const warehouse of warehouses) {
        // Get inventory with product info
        const { data: inventory } = await supabase
          .from('inventory')
          .select(`
            quantity,
            product:products(cost_price, min_stock)
          `)
          .eq('warehouse_id', warehouse.id);

        let products_count = 0;
        let total_value = 0;
        let low_stock_count = 0;

        if (inventory) {
          products_count = inventory.length;
          for (const inv of inventory) {
            const product = inv.product as { cost_price: number; min_stock: number } | null;
            if (product) {
              total_value += inv.quantity * product.cost_price;
              if (inv.quantity < product.min_stock) {
                low_stock_count++;
              }
            }
          }
        }

        result.push({
          ...warehouse,
          products_count,
          total_value,
          low_stock_count
        });
      }

      return result;
    },
    enabled: !!business?.id
  });
}

export function useCreateWarehouse() {
  const queryClient = useQueryClient();
  const { business, branch } = useBusiness();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (warehouse: { name: string; address?: string; branch_id?: string }) => {
      if (!branch?.id) throw new Error('No branch selected');

      const { data, error } = await supabase
        .from('warehouses')
        .insert({
          ...warehouse,
          branch_id: warehouse.branch_id || branch.id
        })
        .select()
        .single();

      if (error) throw error;

      if (business) {
        await supabase.from('audit_logs').insert({
          business_id: business.id,
          user_id: user?.id,
          entity_type: 'warehouse',
          entity_id: data.id,
          action: 'create',
          new_value: data
        });
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['warehouses'] });
      toast.success('Warehouse created successfully');
    },
    onError: (error) => {
      toast.error('Failed to create warehouse: ' + error.message);
    }
  });
}

export function useUpdateWarehouse() {
  const queryClient = useQueryClient();
  const { business } = useBusiness();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Warehouse> & { id: string }) => {
      const { data, error } = await supabase
        .from('warehouses')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      if (business) {
        await supabase.from('audit_logs').insert({
          business_id: business.id,
          user_id: user?.id,
          entity_type: 'warehouse',
          entity_id: id,
          action: 'update',
          new_value: updates
        });
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['warehouses'] });
      toast.success('Warehouse updated successfully');
    },
    onError: (error) => {
      toast.error('Failed to update warehouse: ' + error.message);
    }
  });
}

export function useDeleteWarehouse() {
  const queryClient = useQueryClient();
  const { business } = useBusiness();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (id: string) => {
      // Soft delete
      const { error } = await supabase
        .from('warehouses')
        .update({ is_active: false })
        .eq('id', id);

      if (error) throw error;

      if (business) {
        await supabase.from('audit_logs').insert({
          business_id: business.id,
          user_id: user?.id,
          entity_type: 'warehouse',
          entity_id: id,
          action: 'delete'
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['warehouses'] });
      toast.success('Warehouse deleted successfully');
    },
    onError: (error) => {
      toast.error('Failed to delete warehouse: ' + error.message);
    }
  });
}
