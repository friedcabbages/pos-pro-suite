import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useBusiness } from '@/contexts/BusinessContext';
import { useAuth } from '@/contexts/AuthContext';
import { Sale, PaymentMethod, Product } from '@/types/database';
import { toast } from 'sonner';
import { createOrder, listOrders } from '@/data/dataService';
import { useConnectivityStatus } from '@/hooks/useConnectivityStatus';

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
  const connectivity = useConnectivityStatus();

  return useQuery({
    queryKey: ['sales', business?.id, branch?.id, dateRange, connectivity.lastSyncAt, connectivity.queueCount, connectivity.status],
    queryFn: async () => {
      if (!business?.id) return [];
      return await listOrders({
        businessId: business.id,
        branchId: branch?.id,
        limit: 100,
        start: dateRange?.start,
        end: dateRange?.end,
      });
    },
    enabled: !!business?.id
  });
}

export function useTodaySales() {
  const { business, branch } = useBusiness();
  const connectivity = useConnectivityStatus();
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return useQuery({
    queryKey: ['today-sales', business?.id, branch?.id, connectivity.lastSyncAt, connectivity.queueCount, connectivity.status],
    queryFn: async () => {
      if (!business?.id) return { total: 0, count: 0, profit: 0 };
      const rows = await listOrders({
        businessId: business.id,
        branchId: branch?.id,
        limit: 1000,
        start: today,
      });
      const total = rows.reduce((sum, sale) => sum + Number(sale.total), 0);
      const profit = rows.reduce(
        (sum, sale) => sum + (sale.items?.reduce((p, item) => p + Number((item as any).profit ?? 0), 0) || 0),
        0
      );
      return { total, count: rows.length, profit };
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
      // Offline-first: always commit locally, then sync when online.
      return await createOrder({
        items: input.items.map((i) => ({ product: i.product, quantity: i.quantity })),
        subtotal: input.subtotal,
        discount_amount: input.discount_amount,
        tax_amount: input.tax_amount,
        total: input.total,
        payment_method: input.payment_method,
        payment_amount: input.payment_amount,
        customer_name: input.customer_name,
        notes: input.notes,
      });
    },
    onSuccess: () => {
      // Invalidate all dashboard-related queries for real-time updates
      queryClient.invalidateQueries({ queryKey: ['sales'] });
      queryClient.invalidateQueries({ queryKey: ['today-sales'] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['inventory'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
      queryClient.invalidateQueries({ queryKey: ['low-stock'] });
      queryClient.invalidateQueries({ queryKey: ['top-products'] });
      queryClient.invalidateQueries({ queryKey: ['sales-chart'] });
      queryClient.invalidateQueries({ queryKey: ['recent-transactions'] });
      toast.success('Sale completed successfully');
    },
    onError: (error) => {
      toast.error(error.message);
    }
  });
}
