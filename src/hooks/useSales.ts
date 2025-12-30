import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useBusiness } from '@/contexts/BusinessContext';
import { useAuth } from '@/contexts/AuthContext';
import { Sale, PaymentMethod, Product } from '@/types/database';
import { createAuditLog, logInventoryChange } from '@/lib/audit';
import { toast } from 'sonner';

interface CartItem {
  product: Product;
  quantity: number;
}

interface CreateSaleInput {
  items: CartItem[];
  subtotal: number;
  discount_amount: number;
  tax_amount: number;
  total: number;
  payment_method: PaymentMethod;
  payment_amount: number;
  customer_name?: string;
  notes?: string;
}

export function useSales(dateRange?: { start: Date; end: Date }) {
  const { business, branch } = useBusiness();

  return useQuery({
    queryKey: ['sales', business?.id, branch?.id, dateRange],
    queryFn: async () => {
      if (!business?.id) return [];

      let query = supabase
        .from('sales')
        .select(`
          *,
          branch:branches(id, name),
          items:sale_items(
            *,
            product:products(id, name, sku)
          )
        `)
        .eq('business_id', business.id)
        .order('created_at', { ascending: false });

      if (branch?.id) {
        query = query.eq('branch_id', branch.id);
      }

      if (dateRange) {
        query = query
          .gte('created_at', dateRange.start.toISOString())
          .lte('created_at', dateRange.end.toISOString());
      }

      const { data, error } = await query.limit(100);

      if (error) throw error;
      return data as Sale[];
    },
    enabled: !!business?.id
  });
}

export function useTodaySales() {
  const { business, branch } = useBusiness();
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return useQuery({
    queryKey: ['today-sales', business?.id, branch?.id],
    queryFn: async () => {
      if (!business?.id) return { total: 0, count: 0, profit: 0 };

      let query = supabase
        .from('sales')
        .select('total, items:sale_items(profit)')
        .eq('business_id', business.id)
        .gte('created_at', today.toISOString());

      if (branch?.id) {
        query = query.eq('branch_id', branch.id);
      }

      const { data, error } = await query;

      if (error) throw error;

      const total = data?.reduce((sum, sale) => sum + Number(sale.total), 0) || 0;
      const profit = data?.reduce((sum, sale) => 
        sum + (sale.items?.reduce((p, item: { profit: number }) => p + Number(item.profit), 0) || 0), 0
      ) || 0;

      return { 
        total, 
        count: data?.length || 0,
        profit 
      };
    },
    enabled: !!business?.id
  });
}

export function useCreateSale() {
  const queryClient = useQueryClient();
  const { business, branch, warehouse } = useBusiness();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (input: CreateSaleInput) => {
      if (!business?.id || !branch?.id || !warehouse?.id) {
        throw new Error('Business, branch, or warehouse not selected');
      }

      const timestamp = Date.now().toString(36).toUpperCase();
      const invoice_number = `INV-${timestamp}`;

      // Check stock availability
      for (const item of input.items) {
        const { data: inventory } = await supabase
          .from('inventory')
          .select('quantity')
          .eq('product_id', item.product.id)
          .eq('warehouse_id', warehouse.id)
          .maybeSingle();

        const currentStock = inventory?.quantity || 0;
        if (currentStock < item.quantity) {
          throw new Error(`Insufficient stock for ${item.product.name}. Available: ${currentStock}`);
        }
      }

      // Create sale
      const { data: sale, error: saleError } = await supabase
        .from('sales')
        .insert([{
          business_id: business.id,
          branch_id: branch.id,
          warehouse_id: warehouse.id,
          invoice_number,
          subtotal: input.subtotal,
          discount_amount: input.discount_amount,
          tax_amount: input.tax_amount,
          total: input.total,
          payment_method: input.payment_method,
          payment_amount: input.payment_amount,
          change_amount: input.payment_amount - input.total,
          customer_name: input.customer_name || null,
          notes: input.notes || null,
          cashier_id: user?.id || null
        }])
        .select()
        .single();

      if (saleError) throw saleError;

      // Create sale items and update inventory
      for (const item of input.items) {
        const profit = (item.product.sell_price - item.product.cost_price) * item.quantity;

        await supabase.from('sale_items').insert([{
          sale_id: sale.id,
          product_id: item.product.id,
          quantity: item.quantity,
          sell_price: item.product.sell_price,
          cost_price: item.product.cost_price,
          discount_amount: 0,
          total: item.product.sell_price * item.quantity,
          profit
        }]);

        const { data: inventory } = await supabase
          .from('inventory')
          .select('id, quantity')
          .eq('product_id', item.product.id)
          .eq('warehouse_id', warehouse.id)
          .maybeSingle();

        const currentQty = inventory?.quantity || 0;
        const newQty = currentQty - item.quantity;

        if (inventory) {
          await supabase
            .from('inventory')
            .update({ quantity: newQty })
            .eq('id', inventory.id);
        }

        await logInventoryChange({
          product_id: item.product.id,
          warehouse_id: warehouse.id,
          action: 'sale',
          quantity_before: currentQty,
          quantity_after: newQty,
          quantity_change: -item.quantity,
          reference_id: sale.id,
          reference_type: 'sale',
          user_id: user?.id
        });
      }

      await createAuditLog({
        business_id: business.id,
        user_id: user?.id,
        entity_type: 'sale',
        entity_id: sale.id,
        action: 'create',
        new_value: { 
          invoice_number, 
          total: input.total,
          items_count: input.items.length 
        }
      });

      return sale;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sales'] });
      queryClient.invalidateQueries({ queryKey: ['today-sales'] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['inventory'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      toast.success('Sale completed successfully');
    },
    onError: (error) => {
      toast.error(error.message);
    }
  });
}
