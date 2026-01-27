import { useQuery } from '@tanstack/react-query';
import { useBusiness } from '@/contexts/BusinessContext';
import { listOrders, listProducts } from '@/data/dataService';
import { useConnectivityStatus } from '@/hooks/useConnectivityStatus';

export interface DashboardStats {
  todaySales: number;
  yesterdaySales: number;
  monthlyRevenue: number;
  lastMonthRevenue: number;
  totalOrders: number;
  yesterdayOrders: number;
  totalProducts: number;
  todayProfit: number;
  monthlyProfit: number;
  bestSellerToday: string | null;
  busiestHour: number | null;
}

export function useDashboardStats() {
  const { business, branch } = useBusiness();
  const connectivity = useConnectivityStatus();
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  
  const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
  const startOfLastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
  const endOfLastMonth = new Date(today.getFullYear(), today.getMonth(), 0, 23, 59, 59, 999);

  return useQuery({
    queryKey: ['dashboard-stats', business?.id, branch?.id, connectivity.lastSyncAt, connectivity.queueCount, connectivity.status],
    queryFn: async (): Promise<DashboardStats> => {
      if (!business?.id) {
        return {
          todaySales: 0,
          yesterdaySales: 0,
          monthlyRevenue: 0,
          lastMonthRevenue: 0,
          totalOrders: 0,
          yesterdayOrders: 0,
          totalProducts: 0,
          todayProfit: 0,
          monthlyProfit: 0,
          bestSellerToday: null,
          busiestHour: null
        };
      }

      const todayOrders = await listOrders({
        businessId: business.id,
        branchId: branch?.id,
        limit: 5000,
        start: today,
      });
      const todaySales = todayOrders.reduce((sum, s) => sum + Number(s.total), 0);
      const todayProfit = todayOrders.reduce(
        (sum, s) => sum + (s.items?.reduce((p, i) => p + Number((i as unknown as { profit: number }).profit || 0), 0) || 0),
        0
      );

      const yesterdayOrdersRows = await listOrders({
        businessId: business.id,
        branchId: branch?.id,
        limit: 5000,
        start: yesterday,
        end: today,
      });
      const yesterdaySales = yesterdayOrdersRows.reduce((sum, s) => sum + Number(s.total), 0);
      const yesterdayOrders = yesterdayOrdersRows.length;

      const monthOrders = await listOrders({
        businessId: business.id,
        branchId: branch?.id,
        limit: 10000,
        start: startOfMonth,
      });
      const monthlyRevenue = monthOrders.reduce((sum, s) => sum + Number(s.total), 0);
      const monthlyProfit = monthOrders.reduce(
        (sum, s) => sum + (s.items?.reduce((p, i) => p + Number((i as unknown as { profit: number }).profit || 0), 0) || 0),
        0
      );

      const lastMonthOrders = await listOrders({
        businessId: business.id,
        branchId: branch?.id,
        limit: 20000,
        start: startOfLastMonth,
        end: endOfLastMonth,
      });
      const lastMonthRevenue = lastMonthOrders.reduce((sum, s) => sum + Number(s.total), 0);

      const totalOrders = todayOrders.length;

      const products = await listProducts(business.id, null);
      const totalProducts = products.length;

      // Best seller today (by quantity)
      let bestSellerToday: string | null = null;
      const productQuantities = new Map<string, { name: string; qty: number }>();
      
      for (const sale of todayOrders || []) {
        for (const item of sale.items || []) {
          const typedItem = item as unknown as { quantity: number; product?: { name?: string } | null; product_id?: string };
          const name =
            typedItem.product?.name ??
            (typedItem.product_id ? (products.find((p) => p.id === typedItem.product_id)?.name ?? null) : null);
          if (!name) continue;
          const existing = productQuantities.get(name);
          if (existing) existing.qty += Number(typedItem.quantity ?? 0);
          else productQuantities.set(name, { name, qty: Number(typedItem.quantity ?? 0) });
        }
      }
      
      if (productQuantities.size > 0) {
        const sorted = Array.from(productQuantities.values()).sort((a, b) => b.qty - a.qty);
        bestSellerToday = sorted[0]?.name || null;
      }

      // Busiest hour today
      let busiestHour: number | null = null;
      if (todayOrders && todayOrders.length > 0) {
        const hourCounts = new Map<number, number>();
        for (const sale of todayOrders) {
          const hour = new Date(sale.created_at).getHours();
          hourCounts.set(hour, (hourCounts.get(hour) || 0) + 1);
        }
        let maxCount = 0;
        for (const [hour, count] of hourCounts) {
          if (count > maxCount) {
            maxCount = count;
            busiestHour = hour;
          }
        }
      }

      return {
        todaySales,
        yesterdaySales,
        monthlyRevenue,
        lastMonthRevenue,
        totalOrders,
        yesterdayOrders,
        totalProducts: totalProducts || 0,
        todayProfit,
        monthlyProfit,
        bestSellerToday,
        busiestHour
      };
    },
    enabled: !!business?.id
  });
}

export function useLowStockProducts() {
  const { business, warehouse } = useBusiness();
  const connectivity = useConnectivityStatus();

  return useQuery({
    queryKey: ['low-stock', business?.id, warehouse?.id, connectivity.lastSyncAt, connectivity.queueCount, connectivity.status],
    queryFn: async () => {
      if (!business?.id) return [];
      const products = await listProducts(business.id, warehouse?.id ?? null);
      return products
        .filter((p) => (p.total_stock ?? 0) < (p.min_stock ?? 0))
        .sort((a, b) => (a.total_stock ?? 0) - (b.total_stock ?? 0))
        .slice(0, 10);
    },
    enabled: !!business?.id
  });
}

export function useTopProducts() {
  const { business, branch } = useBusiness();
  const connectivity = useConnectivityStatus();
  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  return useQuery({
    queryKey: ['top-products', business?.id, branch?.id, connectivity.lastSyncAt, connectivity.queueCount, connectivity.status],
    queryFn: async () => {
      if (!business?.id) return [];

      const orders = await listOrders({
        businessId: business.id,
        branchId: branch?.id,
        limit: 20000,
        start: startOfMonth,
      });

      const products = await listProducts(business.id, null);
      const nameById = new Map(products.map((p) => [p.id, p.name]));

      const productMap = new Map<string, { name: string; quantity: number; revenue: number }>();
      for (const order of orders) {
        for (const it of order.items || []) {
          const productId = (it as unknown as { product_id: string }).product_id;
          const name = nameById.get(productId) ?? "Unknown";
          const existing = productMap.get(productId);
          if (existing) {
            existing.quantity += Number((it as any).quantity ?? 0);
            existing.revenue += Number((it as any).total ?? 0);
          } else {
            productMap.set(productId, {
              name,
              quantity: Number((it as any).quantity ?? 0),
              revenue: Number((it as any).total ?? 0),
            });
          }
        }
      }

      return Array.from(productMap.entries())
        .map(([id, data]) => ({ id, ...data }))
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 5);
    },
    enabled: !!business?.id
  });
}

export function useSalesChart() {
  const { business, branch } = useBusiness();
  const connectivity = useConnectivityStatus();

  return useQuery({
    queryKey: ['sales-chart', business?.id, branch?.id, connectivity.lastSyncAt, connectivity.queueCount, connectivity.status],
    queryFn: async () => {
      if (!business?.id) return [];

      // Get last 7 days
      const days = [];
      for (let i = 6; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        days.push(date.toISOString().split('T')[0]);
      }

      const result: Array<{ date: string; sales: number }> = [];
      for (const day of days) {
        const startOfDay = new Date(day);
        const endOfDay = new Date(day);
        endOfDay.setDate(endOfDay.getDate() + 1);

        const orders = await listOrders({
          businessId: business.id,
          branchId: branch?.id,
          limit: 5000,
          start: startOfDay,
          end: endOfDay,
        });
        const total = orders.reduce((sum, s) => sum + Number(s.total), 0);
        result.push({
          date: new Date(day).toLocaleDateString('en-US', { weekday: 'short' }),
          sales: total,
        });
      }

      return result;
    },
    enabled: !!business?.id
  });
}

export function useRecentTransactions() {
  const { business, branch } = useBusiness();
  const connectivity = useConnectivityStatus();

  return useQuery({
    queryKey: ['recent-transactions', business?.id, branch?.id, connectivity.lastSyncAt, connectivity.queueCount, connectivity.status],
    queryFn: async () => {
      if (!business?.id) return [];
      const orders = await listOrders({ businessId: business.id, branchId: branch?.id, limit: 5 });
      return orders.map((o) => ({
        id: o.id,
        invoice_number: o.invoice_number,
        total: o.total,
        payment_method: o.payment_method,
        customer_name: o.customer_name,
        created_at: o.created_at,
      }));
    },
    enabled: !!business?.id
  });
}
