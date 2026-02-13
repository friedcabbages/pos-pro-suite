import { useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useBusiness } from '@/contexts/BusinessContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface CashierTable {
  id: string;
  name: string;
  status: string;
  capacity: number;
}

export interface BillOrderSummary {
  id: string;
  created_at: string;
  total: number;
  itemCount: number;
}

export interface OpenBillDetails {
  billId: string;
  tableId: string;
  tableName: string;
  orders: BillOrderSummary[];
  subtotal: number;
  serviceCharge: number;
  taxAmount: number;
  packagingFee: number;
  total: number;
}

export function useFnbCashierTables() {
  const { business, branch } = useBusiness();
  return useQuery({
    queryKey: ['fnb-cashier-tables', business?.id, branch?.id],
    queryFn: async (): Promise<CashierTable[]> => {
      if (!business?.id || !branch?.id) return [];
      const { data, error } = await supabase
        .from('fnb_tables')
        .select('id, name, status, capacity')
        .eq('business_id', business.id)
        .eq('branch_id', branch.id)
        .eq('is_active', true)
        .order('name');
      if (error) throw error;
      return (data ?? []) as CashierTable[];
    },
    enabled: !!business?.id && !!branch?.id,
    refetchInterval: 5000,
  });
}

export function useFnbOpenBills() {
  const { business, branch } = useBusiness();
  return useQuery({
    queryKey: ['fnb-open-bills', business?.id, branch?.id],
    queryFn: async () => {
      if (!business?.id || !branch?.id) return [];
      const { data, error } = await supabase
        .from('fnb_bills')
        .select('id, table_id')
        .eq('business_id', business.id)
        .eq('branch_id', branch.id)
        .eq('status', 'open');
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!business?.id && !!branch?.id,
    refetchInterval: 5000,
  });
}

export function useFnbOpenBillDetails(tableId: string | null) {
  const { business, branch } = useBusiness();
  return useQuery({
    queryKey: ['fnb-open-bill-details', tableId, business?.id, branch?.id],
    queryFn: async (): Promise<OpenBillDetails | null> => {
      if (!tableId || !business?.id || !branch?.id) return null;

      const { data: bill, error: billErr } = await supabase
        .from('fnb_bills')
        .select('id, table_id')
        .eq('business_id', business.id)
        .eq('branch_id', branch.id)
        .eq('table_id', tableId)
        .eq('status', 'open')
        .maybeSingle();
      if (billErr || !bill) return null;

      const { data: billOrders, error: boErr } = await supabase
        .from('fnb_bill_orders')
        .select('order_id')
        .eq('bill_id', bill.id);
      if (boErr || !billOrders?.length) {
        return {
          billId: bill.id,
          tableId,
          tableName: '',
          orders: [],
          subtotal: 0,
          serviceCharge: 0,
          taxAmount: 0,
          packagingFee: 0,
          total: 0,
        };
      }

      const orderIds = billOrders.map((bo) => bo.order_id);
      const { data: orders, error: ordErr } = await supabase
        .from('fnb_orders')
        .select(`
          id,
          created_at,
          fnb_order_items ( quantity, price )
        `)
        .in('id', orderIds);
      if (ordErr) throw ordErr;

      const { data: table } = await supabase
        .from('fnb_tables')
        .select('name')
        .eq('id', tableId)
        .single();

      const orderSummaries: BillOrderSummary[] = (orders ?? []).map((o) => {
        const items = (o as { fnb_order_items?: Array<{ quantity: number; price: number }> }).fnb_order_items ?? [];
        const total = items.reduce((s, i) => s + Number(i.price ?? 0) * Number(i.quantity ?? 0), 0);
        const itemCount = items.reduce((s, i) => s + Number(i.quantity ?? 0), 0);
        return {
          id: (o as { id: string }).id,
          created_at: (o as { created_at: string }).created_at,
          total,
          itemCount,
        };
      });

      const subtotal = orderSummaries.reduce((s, o) => s + o.total, 0);
      const serviceCharge = 0;
      const taxAmount = 0;
      const packagingFee = 0;
      const total = subtotal + serviceCharge + taxAmount + packagingFee;

      return {
        billId: bill.id,
        tableId,
        tableName: (table as { name?: string })?.name ?? 'Unknown',
        orders: orderSummaries,
        subtotal,
        serviceCharge,
        taxAmount,
        packagingFee,
        total,
      };
    },
    enabled: !!tableId && !!business?.id && !!branch?.id,
    refetchInterval: 5000,
  });
}

export function useCloseFnbBill() {
  const queryClient = useQueryClient();
  const { business, branch } = useBusiness();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (params: { tableId: string }) => {
      const { tableId } = params;
      if (!business?.id || !branch?.id || !user?.id) throw new Error('Missing context');

      const { data: bill, error: billErr } = await supabase
        .from('fnb_bills')
        .select('id')
        .eq('business_id', business.id)
        .eq('branch_id', branch.id)
        .eq('table_id', tableId)
        .eq('status', 'open')
        .maybeSingle();
      if (billErr || !bill) throw new Error('No open bill for this table');

      const { data: billOrders, error: boErr } = await supabase
        .from('fnb_bill_orders')
        .select('order_id')
        .eq('bill_id', bill.id);
      if (boErr) throw boErr;
      const orderIds = (billOrders ?? []).map((bo) => (bo as { order_id: string }).order_id);

      const { data: orders } = await supabase
        .from('fnb_orders')
        .select('id, fnb_order_items ( quantity, price )')
        .in('id', orderIds);
      let subtotal = 0;
      for (const o of orders ?? []) {
        const items = (o as { fnb_order_items?: Array<{ quantity: number; price: number }> }).fnb_order_items ?? [];
        subtotal += items.reduce((s, i) => s + Number(i.price ?? 0) * Number(i.quantity ?? 0), 0);
      }
      const total = subtotal;

      if (orderIds.length > 0) {
        const { error: updateOrdErr } = await supabase
          .from('fnb_orders')
          .update({ status: 'completed', completed_at: new Date().toISOString() })
          .in('id', orderIds);
        if (updateOrdErr) throw updateOrdErr;
      }

      const { error: updateBillErr } = await supabase
        .from('fnb_bills')
        .update({
          status: 'closed',
          closed_at: new Date().toISOString(),
          closed_by: user.id,
          subtotal,
          total,
          service_charge: 0,
          tax_amount: 0,
          packaging_fee: 0,
        })
        .eq('id', bill.id);
      if (updateBillErr) throw updateBillErr;

      const { error: updateTableErr } = await supabase
        .from('fnb_tables')
        .update({ status: 'available' })
        .eq('id', tableId);
      if (updateTableErr) throw updateTableErr;

      return { billId: bill.id };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fnb-cashier-tables'] });
      queryClient.invalidateQueries({ queryKey: ['fnb-open-bills'] });
      queryClient.invalidateQueries({ queryKey: ['fnb-open-bill-details'] });
      queryClient.invalidateQueries({ queryKey: ['fnb-orders'] });
      toast.success('Bill closed successfully');
    },
    onError: (e) => toast.error(String(e)),
  });
}

/**
 * Subscribes to postgres changes for F&B cashier tables and invalidates
 * React Query caches to keep the cashier screen updated without refresh.
 * Falls back to refetchInterval (5s) on key queries if realtime is unavailable.
 */
export function useFnbCashierRealtime() {
  const queryClient = useQueryClient();
  const { business, branch } = useBusiness();

  useEffect(() => {
    if (!business?.id || !branch?.id) return;

    const invalidate = () => {
      queryClient.invalidateQueries({ queryKey: ['fnb-cashier-tables'] });
      queryClient.invalidateQueries({ queryKey: ['fnb-open-bills'] });
      queryClient.invalidateQueries({ queryKey: ['fnb-open-bill-details'] });
      queryClient.invalidateQueries({ queryKey: ['fnb-orders'] });
    };

    const channel = supabase
      .channel('fnb-cashier-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'fnb_tables',
          filter: `business_id=eq.${business.id}`,
        },
        invalidate
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'fnb_bills',
          filter: `business_id=eq.${business.id}`,
        },
        invalidate
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'fnb_orders',
          filter: `business_id=eq.${business.id}`,
        },
        invalidate
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'fnb_bill_orders',
        },
        invalidate
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'fnb_order_items',
        },
        invalidate
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [business?.id, branch?.id, queryClient]);
}
