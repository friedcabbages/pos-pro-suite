import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useBusiness } from '@/contexts/BusinessContext';
import { useAuth } from '@/contexts/AuthContext';
import { Inventory, InventoryLog } from '@/types/database';
import { createAuditLog, logInventoryChange } from '@/lib/audit';
import { toast } from 'sonner';

export function useInventory(warehouseFilter?: string) {
  const { business } = useBusiness();

  return useQuery({
    queryKey: ['inventory', business?.id, warehouseFilter],
    queryFn: async () => {
      if (!business?.id) return [];

      // First get warehouses for this business
      const { data: businessWarehouses } = await supabase
        .from('warehouses')
        .select('id, branch:branches!inner(business_id)')
        .eq('branches.business_id', business.id);

      if (!businessWarehouses || businessWarehouses.length === 0) return [];

      const warehouseIds = businessWarehouses.map(w => w.id);

      let query = supabase
        .from('inventory')
        .select(`
          *,
          product:products(id, name, sku, cost_price, sell_price, min_stock, unit),
          warehouse:warehouses(id, name, branch:branches(id, name))
        `)
        .in('warehouse_id', warehouseIds);

      // Apply warehouse filter if specified (not 'all')
      if (warehouseFilter && warehouseFilter !== 'all') {
        query = query.eq('warehouse_id', warehouseFilter);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data as Inventory[];
    },
    enabled: !!business?.id
  });
}

export function useInventoryLogs(productId?: string, warehouseFilter?: string) {
  const { business } = useBusiness();

  return useQuery({
    queryKey: ['inventory-logs', business?.id, warehouseFilter, productId],
    queryFn: async () => {
      if (!business?.id) return [];

      // First get warehouses for this business
      const { data: businessWarehouses } = await supabase
        .from('warehouses')
        .select('id, branch:branches!inner(business_id)')
        .eq('branches.business_id', business.id);

      if (!businessWarehouses || businessWarehouses.length === 0) return [];

      const warehouseIds = businessWarehouses.map(w => w.id);

      let query = supabase
        .from('inventory_logs')
        .select(`
          *,
          product:products(id, name, sku),
          warehouse:warehouses(id, name)
        `)
        .in('warehouse_id', warehouseIds)
        .order('created_at', { ascending: false })
        .limit(100);

      if (warehouseFilter && warehouseFilter !== 'all') {
        query = query.eq('warehouse_id', warehouseFilter);
      }

      if (productId) {
        query = query.eq('product_id', productId);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data as InventoryLog[];
    },
    enabled: !!business?.id
  });
}

export function useAdjustStock() {
  const queryClient = useQueryClient();
  const { business } = useBusiness();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({
      product_id,
      warehouse_id,
      adjustment,
      reason
    }: {
      product_id: string;
      warehouse_id: string;
      adjustment: number;
      reason: string;
    }) => {
      if (!business?.id) throw new Error('No business selected');

      const { data: inventory } = await supabase
        .from('inventory')
        .select('id, quantity')
        .eq('product_id', product_id)
        .eq('warehouse_id', warehouse_id)
        .maybeSingle();

      const currentQty = inventory?.quantity || 0;
      const newQty = currentQty + adjustment;

      if (newQty < 0) {
        throw new Error('Stock cannot be negative');
      }

      if (inventory) {
        await supabase
          .from('inventory')
          .update({ quantity: newQty })
          .eq('id', inventory.id);
      } else {
        await supabase.from('inventory').insert([{
          product_id,
          warehouse_id,
          quantity: newQty
        }]);
      }

      await logInventoryChange({
        product_id,
        warehouse_id,
        action: 'adjustment',
        quantity_before: currentQty,
        quantity_after: newQty,
        quantity_change: adjustment,
        notes: reason,
        user_id: user?.id
      });

      await createAuditLog({
        business_id: business.id,
        user_id: user?.id,
        entity_type: 'inventory',
        entity_id: product_id,
        action: 'stock_adjustment',
        old_value: { quantity: currentQty },
        new_value: { quantity: newQty, reason }
      });

      return { product_id, newQty };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory'] });
      queryClient.invalidateQueries({ queryKey: ['inventory-logs'] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['warehouses'] });
      queryClient.invalidateQueries({ queryKey: ['available-stock'] });
      toast.success('Stock adjusted successfully');
    },
    onError: (error) => {
      toast.error(error.message);
    }
  });
}

export function useTransferStock() {
  const queryClient = useQueryClient();
  const { business } = useBusiness();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({
      product_id,
      from_warehouse_id,
      to_warehouse_id,
      quantity,
      notes
    }: {
      product_id: string;
      from_warehouse_id: string;
      to_warehouse_id: string;
      quantity: number;
      notes?: string;
    }) => {
      if (!business?.id) throw new Error('No business selected');

      // Get source inventory
      const { data: sourceInv } = await supabase
        .from('inventory')
        .select('id, quantity')
        .eq('product_id', product_id)
        .eq('warehouse_id', from_warehouse_id)
        .maybeSingle();

      const sourceQty = sourceInv?.quantity || 0;
      if (sourceQty < quantity) {
        throw new Error('Not enough stock in source warehouse');
      }

      // Get destination inventory
      const { data: destInv } = await supabase
        .from('inventory')
        .select('id, quantity')
        .eq('product_id', product_id)
        .eq('warehouse_id', to_warehouse_id)
        .maybeSingle();

      const destQty = destInv?.quantity || 0;

      // Update source
      if (sourceInv) {
        await supabase
          .from('inventory')
          .update({ quantity: sourceQty - quantity })
          .eq('id', sourceInv.id);
      }

      // Update or insert destination
      if (destInv) {
        await supabase
          .from('inventory')
          .update({ quantity: destQty + quantity })
          .eq('id', destInv.id);
      } else {
        await supabase.from('inventory').insert([{
          product_id,
          warehouse_id: to_warehouse_id,
          quantity
        }]);
      }

      // Log both changes
      await logInventoryChange({
        product_id,
        warehouse_id: from_warehouse_id,
        action: 'transfer',
        quantity_before: sourceQty,
        quantity_after: sourceQty - quantity,
        quantity_change: -quantity,
        notes: `Transfer out: ${notes || ''}`,
        user_id: user?.id
      });

      await logInventoryChange({
        product_id,
        warehouse_id: to_warehouse_id,
        action: 'transfer',
        quantity_before: destQty,
        quantity_after: destQty + quantity,
        quantity_change: quantity,
        notes: `Transfer in: ${notes || ''}`,
        user_id: user?.id
      });

      await createAuditLog({
        business_id: business.id,
        user_id: user?.id,
        entity_type: 'inventory',
        entity_id: product_id,
        action: 'stock_transfer',
        new_value: { from_warehouse_id, to_warehouse_id, quantity, notes }
      });

      return { product_id, quantity };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory'] });
      queryClient.invalidateQueries({ queryKey: ['inventory-logs'] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['warehouses'] });
      queryClient.invalidateQueries({ queryKey: ['available-stock'] });
      toast.success('Stock transferred successfully');
    },
    onError: (error) => {
      toast.error(error.message);
    }
  });
}
