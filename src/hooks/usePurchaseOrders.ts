import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useBusiness } from '@/contexts/BusinessContext';
import { useAuth } from '@/contexts/AuthContext';
import { PurchaseOrder, PurchaseOrderItem, POStatus, Product } from '@/types/database';
import { toast } from 'sonner';

interface POItemInput {
  product_id: string;
  quantity: number;
  cost_price: number;
}

interface CreatePOInput {
  supplier_id: string;
  notes?: string;
  items: POItemInput[];
}

export function usePurchaseOrders() {
  const { business, branch } = useBusiness();

  return useQuery({
    queryKey: ['purchase-orders', business?.id, branch?.id],
    queryFn: async () => {
      if (!business?.id) return [];

      let query = supabase
        .from('purchase_orders')
        .select(`
          *,
          supplier:suppliers(id, name),
          branch:branches(id, name),
          warehouse:warehouses(id, name),
          items:purchase_order_items(
            *,
            product:products(id, name, sku)
          )
        `)
        .eq('business_id', business.id)
        .order('created_at', { ascending: false });

      if (branch?.id) {
        query = query.eq('branch_id', branch.id);
      }

      const { data, error } = await query.limit(100);

      if (error) throw error;
      return data as PurchaseOrder[];
    },
    enabled: !!business?.id
  });
}

export function useCreatePurchaseOrder() {
  const queryClient = useQueryClient();
  const { business, branch, warehouse } = useBusiness();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (input: CreatePOInput) => {
      if (!business?.id || !branch?.id || !warehouse?.id) {
        throw new Error('Business, branch, or warehouse not selected');
      }

      // Generate PO number
      const timestamp = Date.now().toString(36).toUpperCase();
      const po_number = `PO-${timestamp}`;

      const total_cost = input.items.reduce(
        (sum, item) => sum + item.cost_price * item.quantity, 
        0
      );

      // Create PO
      const { data: po, error: poError } = await supabase
        .from('purchase_orders')
        .insert({
          business_id: business.id,
          branch_id: branch.id,
          warehouse_id: warehouse.id,
          supplier_id: input.supplier_id,
          po_number,
          status: 'draft',
          total_cost,
          notes: input.notes,
          created_by: user?.id
        })
        .select()
        .single();

      if (poError) throw poError;

      // Create PO items
      for (const item of input.items) {
        await supabase.from('purchase_order_items').insert({
          purchase_order_id: po.id,
          product_id: item.product_id,
          quantity: item.quantity,
          cost_price: item.cost_price,
          total_cost: item.cost_price * item.quantity
        });
      }

      // Audit log
      await supabase.from('audit_logs').insert({
        business_id: business.id,
        user_id: user?.id,
        entity_type: 'purchase_order',
        entity_id: po.id,
        action: 'create',
        new_value: { po_number, total_cost, items_count: input.items.length }
      });

      return po;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['purchase-orders'] });
      toast.success('Purchase order created');
    },
    onError: (error) => {
      toast.error('Failed to create PO: ' + error.message);
    }
  });
}

export function useUpdatePOStatus() {
  const queryClient = useQueryClient();
  const { business, warehouse } = useBusiness();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: POStatus }) => {
      const updates: Record<string, unknown> = { status };
      
      if (status === 'ordered') {
        updates.ordered_at = new Date().toISOString();
      }

      // If receiving, handle inventory updates
      if (status === 'received') {
        updates.received_at = new Date().toISOString();
        updates.received_by = user?.id;

        // Get PO with items
        const { data: po } = await supabase
          .from('purchase_orders')
          .select(`
            *,
            items:purchase_order_items(*)
          `)
          .eq('id', id)
          .single();

        if (po && po.items) {
          for (const item of po.items as PurchaseOrderItem[]) {
            // Get current inventory
            const { data: inventory } = await supabase
              .from('inventory')
              .select('id, quantity')
              .eq('product_id', item.product_id)
              .eq('warehouse_id', po.warehouse_id)
              .maybeSingle();

            const currentQty = inventory?.quantity || 0;
            const newQty = currentQty + item.quantity;

            // Update or insert inventory
            if (inventory) {
              await supabase
                .from('inventory')
                .update({ quantity: newQty })
                .eq('id', inventory.id);
            } else {
              await supabase.from('inventory').insert({
                product_id: item.product_id,
                warehouse_id: po.warehouse_id,
                quantity: item.quantity
              });
            }

            // Update received quantity
            await supabase
              .from('purchase_order_items')
              .update({ received_quantity: item.quantity })
              .eq('id', item.id);

            // Log inventory change
            await supabase.from('inventory_logs').insert({
              product_id: item.product_id,
              warehouse_id: po.warehouse_id,
              action: 'po_receive',
              quantity_before: currentQty,
              quantity_after: newQty,
              quantity_change: item.quantity,
              reference_id: po.id,
              reference_type: 'purchase_order',
              user_id: user?.id
            });

            // Update product cost_price with weighted average
            const { data: product } = await supabase
              .from('products')
              .select('cost_price')
              .eq('id', item.product_id)
              .single();

            if (product) {
              const oldCost = product.cost_price;
              const totalOldValue = oldCost * currentQty;
              const newValue = item.cost_price * item.quantity;
              const newAvgCost = newQty > 0 
                ? (totalOldValue + newValue) / newQty 
                : item.cost_price;

              await supabase
                .from('products')
                .update({ cost_price: newAvgCost })
                .eq('id', item.product_id);

              // Audit price change
              if (business) {
                await supabase.from('audit_logs').insert({
                  business_id: business.id,
                  user_id: user?.id,
                  entity_type: 'product',
                  entity_id: item.product_id,
                  action: 'cost_price_update',
                  old_value: { cost_price: oldCost },
                  new_value: { cost_price: newAvgCost }
                });
              }
            }
          }
        }
      }

      const { data, error } = await supabase
        .from('purchase_orders')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      // Audit log
      if (business) {
        await supabase.from('audit_logs').insert({
          business_id: business.id,
          user_id: user?.id,
          entity_type: 'purchase_order',
          entity_id: id,
          action: `status_change_${status}`,
          new_value: { status }
        });
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['purchase-orders'] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['inventory'] });
      toast.success('Purchase order updated');
    },
    onError: (error) => {
      toast.error('Failed to update PO: ' + error.message);
    }
  });
}
