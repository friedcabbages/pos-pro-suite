import { useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useBusiness } from '@/contexts/BusinessContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

/**
 * Products not yet on menu (is_menu_item = false or null). Direct Supabase query
 * so Add-to-menu dropdown stays fresh without waiting for local sync.
 */
export function useProductsNotOnMenu() {
  const { business } = useBusiness();
  return useQuery({
    queryKey: ['fnb-products-not-on-menu', business?.id],
    queryFn: async () => {
      if (!business?.id) return [];
      const { data, error } = await supabase
        .from('products')
        .select('id, name, sell_price')
        .eq('business_id', business.id)
        .eq('is_active', true)
        .or('is_menu_item.is.null,is_menu_item.eq.false')
        .order('name');
      if (error) throw error;
      return (data ?? []) as Array<{ id: string; name: string; sell_price?: number }>;
    },
    enabled: !!business?.id,
    refetchInterval: 5000,
  });
}

/**
 * Toggle is_available for a menu item. Invalidates fnb-menu-items and products
 * so both the menu list and Add-to-menu dropdown stay in sync.
 */
export function useToggleMenuItemAvailability() {
  const queryClient = useQueryClient();
  const { business } = useBusiness();

  return useMutation({
    mutationFn: async (params: { productId: string; current: boolean }) => {
      const { productId, current } = params;
      if (!business?.id) throw new Error('No business selected');
      const { error } = await supabase
        .from('products')
        .update({ is_available: !current })
        .eq('id', productId)
        .eq('business_id', business.id);
      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['fnb-menu-items'] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
      toast.success(variables.current ? 'Marked unavailable' : 'Marked available');
    },
    onError: (e) => toast.error(String(e)),
  });
}

/**
 * Subscribes to postgres changes for F&B menu tables and invalidates
 * React Query caches to keep the menu screen updated without refresh.
 * Falls back to refetchInterval on key queries if realtime is unavailable.
 */
export function useFnbMenuRealtime() {
  const queryClient = useQueryClient();
  const { business } = useBusiness();

  useEffect(() => {
    if (!business?.id) return;

    const invalidate = () => {
      queryClient.invalidateQueries({ queryKey: ['fnb-menu-items'] });
      queryClient.invalidateQueries({ queryKey: ['fnb-products-not-on-menu'] });
      queryClient.invalidateQueries({ queryKey: ['fnb-modifier-groups'] });
      queryClient.invalidateQueries({ queryKey: ['fnb-product-modifier-groups'] });
      queryClient.invalidateQueries({ queryKey: ['fnb-modifiers'] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
    };

    const channel = supabase
      .channel('fnb-menu-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'products',
          filter: `business_id=eq.${business.id}`,
        },
        invalidate
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'fnb_modifier_groups',
          filter: `business_id=eq.${business.id}`,
        },
        invalidate
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'fnb_modifiers',
        },
        invalidate
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'fnb_product_modifier_groups',
        },
        invalidate
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [business?.id, queryClient]);
}
