import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useBusiness } from '@/contexts/BusinessContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { logInventoryChange } from '@/lib/audit';

// --- All products (for recipe ingredients, etc.)
export function useFnbProducts() {
  const { business } = useBusiness();
  return useQuery({
    queryKey: ['fnb-products', business?.id],
    queryFn: async () => {
      if (!business?.id) return [];
      const { data, error } = await supabase
        .from('products')
        .select('id, name, unit, sell_price')
        .eq('business_id', business.id)
        .order('name');
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!business?.id,
  });
}

// --- Menu items (products with is_menu_item)
export function useFnbMenuItems(branchId?: string | null) {
  const { business } = useBusiness();
  return useQuery({
    queryKey: ['fnb-menu-items', business?.id],
    queryFn: async () => {
      if (!business?.id) return [];
      const { data, error } = await supabase
        .from('products')
        .select('id, name, description, category_id, sell_price, image_url, prep_station, sort_order, is_available, is_menu_item')
        .eq('business_id', business.id)
        .eq('is_menu_item', true)
        .order('sort_order', { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!business?.id,
  });
}

export function useFnbModifierGroups() {
  const { business } = useBusiness();
  return useQuery({
    queryKey: ['fnb-modifier-groups', business?.id],
    queryFn: async () => {
      if (!business?.id) return [];
      const { data, error } = await supabase
        .from('fnb_modifier_groups')
        .select('*')
        .eq('business_id', business.id)
        .eq('is_active', true)
        .order('sort_order', { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!business?.id,
  });
}

export function useFnbModifiers(groupIds: string[]) {
  const { business } = useBusiness();
  return useQuery({
    queryKey: ['fnb-modifiers', groupIds],
    queryFn: async () => {
      if (groupIds.length === 0) return [];
      const { data, error } = await supabase
        .from('fnb_modifiers')
        .select('*')
        .in('group_id', groupIds)
        .eq('is_active', true)
        .order('sort_order', { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!business?.id && groupIds.length > 0,
  });
}

export function useFnbProductModifierGroups(productIds: string[]) {
  return useQuery({
    queryKey: ['fnb-product-modifier-groups', productIds],
    queryFn: async () => {
      if (productIds.length === 0) return [];
      const { data, error } = await supabase
        .from('fnb_product_modifier_groups')
        .select('product_id, group_id, sort_order')
        .in('product_id', productIds);
      if (error) throw error;
      return data ?? [];
    },
    enabled: productIds.length > 0,
  });
}

export function useSetProductAsMenuItem() {
  const queryClient = useQueryClient();
  const { business } = useBusiness();
  return useMutation({
    mutationFn: async (params: { productId: string; prepStation?: 'kitchen' | 'bar'; sortOrder?: number }) => {
      const { data, error } = await supabase
        .from('products')
        .update({
          is_menu_item: true,
          prep_station: params.prepStation ?? null,
          sort_order: params.sortOrder ?? 0,
          is_available: true,
        })
        .eq('id', params.productId)
        .eq('business_id', business!.id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fnb-menu-items'] });
    },
    onError: (e) => toast.error(String(e)),
  });
}

export function useUnsetProductAsMenuItem() {
  const queryClient = useQueryClient();
  const { business } = useBusiness();
  return useMutation({
    mutationFn: async (productId: string) => {
      const { error } = await supabase
        .from('products')
        .update({ is_menu_item: false, prep_station: null })
        .eq('id', productId)
        .eq('business_id', business!.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fnb-menu-items'] });
    },
    onError: (e) => toast.error(String(e)),
  });
}

export function useCreateModifierGroup() {
  const queryClient = useQueryClient();
  const { business } = useBusiness();
  return useMutation({
    mutationFn: async (params: {
      name: string;
      isRequired?: boolean;
      minSelect?: number;
      maxSelect?: number;
      isMulti?: boolean;
      sortOrder?: number;
    }) => {
      const { data, error } = await supabase
        .from('fnb_modifier_groups')
        .insert({
          business_id: business!.id,
          name: params.name,
          is_required: params.isRequired ?? false,
          min_select: params.minSelect ?? 0,
          max_select: params.maxSelect ?? 1,
          is_multi: params.isMulti ?? false,
          sort_order: params.sortOrder ?? 0,
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fnb-modifier-groups'] });
      toast.success('Modifier group created');
    },
    onError: (e) => toast.error(String(e)),
  });
}

export function useCreateModifier() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (params: {
      groupId: string;
      name: string;
      priceDelta?: number;
      priceType?: 'fixed' | 'percentage';
      sortOrder?: number;
    }) => {
      const { data, error } = await supabase
        .from('fnb_modifiers')
        .insert({
          group_id: params.groupId,
          name: params.name,
          price_delta: params.priceDelta ?? 0,
          price_type: (params.priceType as 'fixed' | 'percentage') ?? 'fixed',
          sort_order: params.sortOrder ?? 0,
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fnb-modifiers'] });
      toast.success('Modifier created');
    },
    onError: (e) => toast.error(String(e)),
  });
}

export function useLinkProductToModifierGroup() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (params: { productId: string; groupId: string; sortOrder?: number }) => {
      const { error } = await supabase.from('fnb_product_modifier_groups').upsert(
        { product_id: params.productId, group_id: params.groupId, sort_order: params.sortOrder ?? 0 },
        { onConflict: 'product_id,group_id' }
      );
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fnb-product-modifier-groups'] });
    },
    onError: (e) => toast.error(String(e)),
  });
}

export function useUnlinkProductFromModifierGroup() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (params: { productId: string; groupId: string }) => {
      const { error } = await supabase
        .from('fnb_product_modifier_groups')
        .delete()
        .eq('product_id', params.productId)
        .eq('group_id', params.groupId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fnb-product-modifier-groups'] });
    },
    onError: (e) => toast.error(String(e)),
  });
}

// --- Floor plans & Tables
export function useFnbFloorPlans() {
  const { business, branch } = useBusiness();
  return useQuery({
    queryKey: ['fnb-floor-plans', business?.id, branch?.id],
    queryFn: async () => {
      if (!business?.id || !branch?.id) return [];
      const { data, error } = await supabase
        .from('fnb_floor_plans')
        .select('*')
        .eq('business_id', business.id)
        .eq('branch_id', branch.id)
        .order('name');
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!business?.id && !!branch?.id,
  });
}

export function useFnbTables() {
  const { business, branch } = useBusiness();
  return useQuery({
    queryKey: ['fnb-tables', business?.id, branch?.id],
    queryFn: async () => {
      if (!business?.id || !branch?.id) return [];
      const { data: tables, error } = await supabase
        .from('fnb_tables')
        .select('*')
        .eq('business_id', business.id)
        .eq('branch_id', branch.id)
        .eq('is_active', true)
        .is('merged_into_table_id', null)
        .order('name');
      if (error) throw error;
      const ids = (tables ?? []).map((t) => t.id);
      if (ids.length === 0) return [];
      const { data: tokens } = await supabase
        .from('fnb_table_qr_tokens')
        .select('table_id, token_raw')
        .in('table_id', ids)
        .is('revoked_at', null);
      const tokenMap = new Map(
        (tokens ?? []).map((t) => [t.table_id, t.token_raw])
      );
      return (tables ?? []).map((t) => ({
        ...t,
        token_raw: tokenMap.get(t.id) ?? null,
      }));
    },
    enabled: !!business?.id && !!branch?.id,
  });
}

async function hashToken(raw: string): Promise<string> {
  const data = new TextEncoder().encode(raw);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

export function useCreateFnbTable() {
  const queryClient = useQueryClient();
  const { business, branch } = useBusiness();
  return useMutation({
    mutationFn: async (params: {
      name: string;
      capacity?: number;
      posX?: number;
      posY?: number;
      width?: number;
      height?: number;
      floorPlanId?: string;
    }) => {
      const { data: table, error: tableError } = await supabase
        .from('fnb_tables')
        .insert({
          business_id: business!.id,
          branch_id: branch!.id,
          name: params.name,
          capacity: params.capacity ?? 2,
          pos_x: params.posX ?? 0,
          pos_y: params.posY ?? 0,
          width: params.width ?? 120,
          height: params.height ?? 120,
          floor_plan_id: params.floorPlanId ?? null,
        })
        .select()
        .single();
      if (tableError) throw tableError;

      const rawToken = crypto.randomUUID().replace(/-/g, '');
      const tokenHash = await hashToken(rawToken);
      await supabase.from('fnb_table_qr_tokens').insert({
        table_id: table.id,
        token_hash: tokenHash,
        token_raw: rawToken,
      });
      return { ...table, raw_token: rawToken };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fnb-tables'] });
      queryClient.invalidateQueries({ queryKey: ['fnb-floor-plans'] });
      toast.success('Table created');
    },
    onError: (e) => toast.error(String(e)),
  });
}

export function useUpdateFnbTable() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (params: {
      id: string;
      name?: string;
      capacity?: number;
      posX?: number;
      posY?: number;
      width?: number;
      height?: number;
      status?: string;
    }) => {
      const updates: Record<string, unknown> = {};
      if (params.name != null) updates.name = params.name;
      if (params.capacity != null) updates.capacity = params.capacity;
      if (params.posX != null) updates.pos_x = params.posX;
      if (params.posY != null) updates.pos_y = params.posY;
      if (params.width != null) updates.width = params.width;
      if (params.height != null) updates.height = params.height;
      if (params.status != null) updates.status = params.status;
      const { error } = await supabase
        .from('fnb_tables')
        .update(updates)
        .eq('id', params.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fnb-tables'] });
    },
    onError: (e) => toast.error(String(e)),
  });
}

export function useRegenerateTableToken() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (tableId: string) => {
      const rawToken = crypto.randomUUID().replace(/-/g, '');
      const tokenHash = await hashToken(rawToken);
      await supabase
        .from('fnb_table_qr_tokens')
        .update({ revoked_at: new Date().toISOString() })
        .eq('table_id', tableId);
      const { error } = await supabase.from('fnb_table_qr_tokens').insert({
        table_id: tableId,
        token_hash: tokenHash,
        token_raw: rawToken,
      });
      if (error) throw error;
      return rawToken;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fnb-tables'] });
      toast.success('QR token regenerated');
    },
    onError: (e) => toast.error(String(e)),
  });
}

// --- FNB Orders (for KDS, Order Queue)
export function useFnbOrders(filters?: { status?: string; tableId?: string; statusIn?: string[] }) {
  const { business, branch } = useBusiness();
  return useQuery({
    queryKey: ['fnb-orders', business?.id, branch?.id, filters],
    queryFn: async () => {
      if (!business?.id || !branch?.id) return [];
      let q = supabase
        .from('fnb_orders')
        .select(`
          id,
          table_id,
          order_type,
          status,
          source,
          customer_name,
          notes,
          opened_at,
          accepted_at,
          created_at,
          fnb_tables ( name ),
          fnb_order_items ( id, quantity, price, status, station, products ( name ) )
        `)
        .eq('business_id', business.id)
        .eq('branch_id', branch.id)
        .order('created_at', { ascending: false })
        .limit(100);
      if (filters?.status) q = q.eq('status', filters.status);
      if (filters?.statusIn?.length) q = q.in('status', filters.statusIn);
      if (filters?.tableId) q = q.eq('table_id', filters.tableId);
      const { data, error } = await q;
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!business?.id && !!branch?.id,
  });
}

export function useFnbOrderItems(orderIds: string[]) {
  return useQuery({
    queryKey: ['fnb-order-items', orderIds],
    queryFn: async () => {
      if (orderIds.length === 0) return [];
      const { data, error } = await supabase
        .from('fnb_order_items')
        .select('*, products ( name )')
        .in('order_id', orderIds)
        .order('created_at', { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
    enabled: orderIds.length > 0,
  });
}

export function useUpdateFnbOrderItemStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (params: { itemId: string; status: 'pending' | 'preparing' | 'ready' | 'served' | 'cancelled' }) => {
      const { error } = await supabase
        .from('fnb_order_items')
        .update({ status: params.status })
        .eq('id', params.itemId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fnb-orders'] });
      queryClient.invalidateQueries({ queryKey: ['fnb-order-items'] });
    },
    onError: (e) => toast.error(String(e)),
  });
}

export function useUpdateFnbOrderStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (params: { orderId: string; status: string }) => {
      const updates: Record<string, unknown> = { status: params.status };
      if (params.status === 'accepted') updates.accepted_at = new Date().toISOString();
      if (['completed', 'cancelled'].includes(params.status)) updates.completed_at = new Date().toISOString();
      const { error } = await supabase
        .from('fnb_orders')
        .update(updates)
        .eq('id', params.orderId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fnb-orders'] });
      queryClient.invalidateQueries({ queryKey: ['fnb-order-items'] });
    },
    onError: (e) => toast.error(String(e)),
  });
}

// --- Recipes
export function useFnbRecipes() {
  const { business } = useBusiness();
  return useQuery({
    queryKey: ['fnb-recipes', business?.id],
    queryFn: async () => {
      if (!business?.id) return [];
      const { data, error } = await supabase
        .from('fnb_recipes')
        .select('*, products ( id, name )')
        .eq('business_id', business.id);
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!business?.id,
  });
}

export function useFnbRecipeItems(recipeIds: string[]) {
  return useQuery({
    queryKey: ['fnb-recipe-items', recipeIds],
    queryFn: async () => {
      if (recipeIds.length === 0) return [];
      const { data, error } = await supabase
        .from('fnb_recipe_items')
        .select('*, products ( id, name, sell_price, unit )')
        .in('recipe_id', recipeIds);
      if (error) throw error;
      return data ?? [];
    },
    enabled: recipeIds.length > 0,
  });
}

export function useCreateFnbRecipe() {
  const queryClient = useQueryClient();
  const { business } = useBusiness();
  return useMutation({
    mutationFn: async (params: { productId: string; yieldQuantity?: number; unit?: string }) => {
      const { data, error } = await supabase
        .from('fnb_recipes')
        .insert({
          business_id: business!.id,
          product_id: params.productId,
          yield_quantity: params.yieldQuantity ?? 1,
          unit: params.unit ?? 'portion',
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fnb-recipes'] });
      toast.success('Recipe created');
    },
    onError: (e) => toast.error(String(e)),
  });
}

export function useAddRecipeItem() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (params: { recipeId: string; ingredientProductId: string; quantity: number; unit: string }) => {
      const { error } = await supabase.from('fnb_recipe_items').insert({
        recipe_id: params.recipeId,
        ingredient_product_id: params.ingredientProductId,
        quantity: params.quantity,
        unit: params.unit,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fnb-recipe-items'] });
      queryClient.invalidateQueries({ queryKey: ['fnb-recipes'] });
      toast.success('Ingredient added');
    },
    onError: (e) => toast.error(String(e)),
  });
}

export function useDeleteRecipeItem() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (itemId: string) => {
      const { error } = await supabase.from('fnb_recipe_items').delete().eq('id', itemId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fnb-recipe-items'] });
      queryClient.invalidateQueries({ queryKey: ['fnb-recipes'] });
    },
    onError: (e) => toast.error(String(e)),
  });
}

export function useDeleteFnbRecipe() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (recipeId: string) => {
      const { error } = await supabase.from('fnb_recipes').delete().eq('id', recipeId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fnb-recipes'] });
      queryClient.invalidateQueries({ queryKey: ['fnb-recipe-items'] });
      toast.success('Recipe removed');
    },
    onError: (e) => toast.error(String(e)),
  });
}

// --- Waste logs (F&B inventory: spoilage, expiry, etc.)
export function useFnbWasteLogs(warehouseId?: string | null) {
  const { business } = useBusiness();
  return useQuery({
    queryKey: ['fnb-waste-logs', business?.id, warehouseId],
    queryFn: async () => {
      if (!business?.id) return [];
      let q = supabase
        .from('inventory_waste_logs')
        .select('*, products ( id, name, unit ), warehouses ( id, name )')
        .eq('business_id', business.id)
        .order('created_at', { ascending: false })
        .limit(100);
      if (warehouseId) q = q.eq('warehouse_id', warehouseId);
      const { data, error } = await q;
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!business?.id,
  });
}

export function useCreateFnbWasteLog() {
  const queryClient = useQueryClient();
  const { business } = useBusiness();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (params: {
      warehouseId: string;
      productId: string;
      quantity: number;
      unit?: string;
      reason?: string;
      batchNumber?: string;
      notes?: string;
    }) => {
      if (!business?.id) throw new Error('No business selected');
      const { data: inv } = await supabase
        .from('inventory')
        .select('id, quantity')
        .eq('product_id', params.productId)
        .eq('warehouse_id', params.warehouseId)
        .maybeSingle();
      const currentQty = inv?.quantity ?? 0;
      const deduct = params.quantity;
      if (currentQty < deduct) throw new Error('Not enough stock to record waste');
      const newQty = currentQty - deduct;
      if (inv) {
        await supabase.from('inventory').update({ quantity: newQty }).eq('id', inv.id);
      } else {
        throw new Error('No inventory record found');
      }
      await logInventoryChange({
        product_id: params.productId,
        warehouse_id: params.warehouseId,
        action: 'stock_out',
        quantity_before: currentQty,
        quantity_after: newQty,
        quantity_change: -deduct,
        reference_type: 'waste_log',
        notes: params.reason ?? 'waste',
        user_id: user?.id,
      });
      const { data, error } = await supabase
        .from('inventory_waste_logs')
        .insert({
          business_id: business.id,
          warehouse_id: params.warehouseId,
          product_id: params.productId,
          quantity: deduct,
          unit: params.unit ?? 'pcs',
          reason: params.reason ?? 'spoilage',
          batch_number: params.batchNumber ?? null,
          notes: params.notes ?? null,
          logged_by: user?.id,
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fnb-waste-logs'] });
      queryClient.invalidateQueries({ queryKey: ['inventory'] });
      queryClient.invalidateQueries({ queryKey: ['inventory-logs'] });
      toast.success('Waste logged');
    },
    onError: (e) => toast.error(String(e)),
  });
}

// --- Promotions
export function useFnbPromotions() {
  const { business } = useBusiness();
  return useQuery({
    queryKey: ['fnb-promotions', business?.id],
    queryFn: async () => {
      if (!business?.id) return [];
      const { data, error } = await supabase
        .from('fnb_promotions')
        .select('*')
        .eq('business_id', business.id)
        .order('start_at', { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!business?.id,
  });
}

export function useCreateFnbPromotion() {
  const queryClient = useQueryClient();
  const { business } = useBusiness();
  return useMutation({
    mutationFn: async (params: {
      name: string;
      promoType: 'percentage' | 'fixed' | 'bogo' | 'bundle';
      value: number;
      minOrderAmount?: number;
      startAt: string;
      endAt: string;
      branchId?: string;
      productIds?: string[];
      categoryIds?: string[];
      isActive?: boolean;
    }) => {
      const { data, error } = await supabase
        .from('fnb_promotions')
        .insert({
          business_id: business!.id,
          name: params.name,
          promo_type: params.promoType,
          value: params.value,
          min_order_amount: params.minOrderAmount ?? 0,
          start_at: params.startAt,
          end_at: params.endAt,
          branch_id: params.branchId ?? null,
          product_ids: params.productIds ?? [],
          category_ids: params.categoryIds ?? [],
          is_active: params.isActive ?? true,
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fnb-promotions'] });
      toast.success('Promotion created');
    },
    onError: (e) => toast.error(String(e)),
  });
}

export function useUpdateFnbPromotion() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (params: { id: string; isActive?: boolean; [k: string]: unknown }) => {
      const { id, ...rest } = params;
      const { error } = await supabase.from('fnb_promotions').update(rest).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['fnb-promotions'] }),
    onError: (e) => toast.error(String(e)),
  });
}

// --- Bundles
export function useFnbBundles() {
  const { business } = useBusiness();
  return useQuery({
    queryKey: ['fnb-bundles', business?.id],
    queryFn: async () => {
      if (!business?.id) return [];
      const { data, error } = await supabase
        .from('fnb_bundles')
        .select('*')
        .eq('business_id', business.id)
        .order('name');
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!business?.id,
  });
}

export function useCreateFnbBundle() {
  const queryClient = useQueryClient();
  const { business } = useBusiness();
  return useMutation({
    mutationFn: async (params: {
      name: string;
      description?: string;
      bundlePrice: number;
      productIds: string[];
      quantities: number[];
    }) => {
      const { data, error } = await supabase
        .from('fnb_bundles')
        .insert({
          business_id: business!.id,
          name: params.name,
          description: params.description ?? null,
          bundle_price: params.bundlePrice,
          product_ids: params.productIds,
          quantities: params.quantities,
          is_active: true,
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fnb-bundles'] });
      toast.success('Bundle created');
    },
    onError: (e) => toast.error(String(e)),
  });
}

export function useUpdateFnbBundle() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (params: { id: string; isActive?: boolean; [k: string]: unknown }) => {
      const { id, ...rest } = params;
      const { error } = await supabase.from('fnb_bundles').update(rest).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['fnb-bundles'] }),
    onError: (e) => toast.error(String(e)),
  });
}
