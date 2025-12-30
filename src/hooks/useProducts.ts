import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useBusiness } from '@/contexts/BusinessContext';
import { useAuth } from '@/contexts/AuthContext';
import { Product } from '@/types/database';
import { toast } from 'sonner';

export function useProducts() {
  const { business, warehouse } = useBusiness();
  const { user } = useAuth();

  return useQuery({
    queryKey: ['products', business?.id],
    queryFn: async () => {
      if (!business?.id) return [];

      const { data, error } = await supabase
        .from('products')
        .select(`
          *,
          category:categories(id, name)
        `)
        .eq('business_id', business.id)
        .eq('is_active', true)
        .order('name');

      if (error) throw error;

      // Get inventory for each product
      if (data && warehouse) {
        const productIds = data.map(p => p.id);
        const { data: inventoryData } = await supabase
          .from('inventory')
          .select('product_id, quantity')
          .in('product_id', productIds)
          .eq('warehouse_id', warehouse.id);

        const inventoryMap = new Map(
          inventoryData?.map(inv => [inv.product_id, inv.quantity]) || []
        );

        return data.map(product => ({
          ...product,
          total_stock: inventoryMap.get(product.id) || 0
        })) as Product[];
      }

      return data as Product[];
    },
    enabled: !!business?.id
  });
}

export function useProductsWithStock() {
  const { business, warehouse } = useBusiness();

  return useQuery({
    queryKey: ['products-with-stock', business?.id, warehouse?.id],
    queryFn: async () => {
      if (!business?.id || !warehouse?.id) return [];

      const { data: products, error } = await supabase
        .from('products')
        .select(`
          *,
          category:categories(id, name)
        `)
        .eq('business_id', business.id)
        .eq('is_active', true)
        .order('name');

      if (error) throw error;

      // Get inventory
      const { data: inventory } = await supabase
        .from('inventory')
        .select('product_id, quantity')
        .eq('warehouse_id', warehouse.id);

      const inventoryMap = new Map(
        inventory?.map(inv => [inv.product_id, inv.quantity]) || []
      );

      return products.map(product => ({
        ...product,
        total_stock: inventoryMap.get(product.id) || 0
      })) as Product[];
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

      const { initial_stock, ...productData } = product;

      const { data, error } = await supabase
        .from('products')
        .insert({
          ...productData,
          business_id: business.id
        })
        .select()
        .single();

      if (error) throw error;

      // Create initial inventory if stock provided
      if (initial_stock && initial_stock > 0 && warehouse) {
        await supabase.from('inventory').insert({
          product_id: data.id,
          warehouse_id: warehouse.id,
          quantity: initial_stock
        });

        // Log the stock addition
        await supabase.from('inventory_logs').insert({
          product_id: data.id,
          warehouse_id: warehouse.id,
          action: 'stock_in',
          quantity_before: 0,
          quantity_after: initial_stock,
          quantity_change: initial_stock,
          notes: 'Initial stock',
          user_id: user?.id
        });
      }

      // Create audit log
      await supabase.from('audit_logs').insert({
        business_id: business.id,
        user_id: user?.id,
        entity_type: 'product',
        entity_id: data.id,
        action: 'create',
        new_value: data
      });

      return data;
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
      // Get old value for audit
      const { data: oldData } = await supabase
        .from('products')
        .select()
        .eq('id', id)
        .single();

      const { data, error } = await supabase
        .from('products')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      // Create audit log for price changes
      if (oldData && business) {
        const priceChanged = 
          oldData.cost_price !== updates.cost_price ||
          oldData.sell_price !== updates.sell_price;

        if (priceChanged) {
          await supabase.from('audit_logs').insert({
            business_id: business.id,
            user_id: user?.id,
            entity_type: 'product',
            entity_id: id,
            action: 'price_change',
            old_value: { 
              cost_price: oldData.cost_price, 
              sell_price: oldData.sell_price 
            },
            new_value: { 
              cost_price: updates.cost_price || oldData.cost_price, 
              sell_price: updates.sell_price || oldData.sell_price 
            }
          });
        }
      }

      return data;
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
      // Soft delete
      const { error } = await supabase
        .from('products')
        .update({ is_active: false })
        .eq('id', id);

      if (error) throw error;

      // Audit log
      if (business) {
        await supabase.from('audit_logs').insert({
          business_id: business.id,
          user_id: user?.id,
          entity_type: 'product',
          entity_id: id,
          action: 'delete'
        });
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
