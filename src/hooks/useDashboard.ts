import { useQuery } from '@tanstack/react-query';
import { useBusiness } from '@/contexts/BusinessContext';
import { listOrders, listProducts } from '@/data/dataService';
import { useConnectivityStatus } from '@/hooks/useConnectivityStatus';
import { supabase } from '@/integrations/supabase/client';

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

async function fetchFnbDashboardStats(
  businessId: string,
  branchId: string | null,
  today: Date,
  yesterday: Date,
  startOfMonth: Date,
  startOfLastMonth: Date,
  endOfLastMonth: Date
): Promise<DashboardStats> {
  const completedStatuses = ['completed', 'served'];
  let q = supabase
    .from('fnb_orders')
    .select('id, status, created_at, fnb_order_items ( product_id, quantity, price, products ( name ) )')
    .eq('business_id', businessId)
    .in('status', completedStatuses);

  if (branchId) q = q.eq('branch_id', branchId);

  const { data: allOrders } = await q;

  const orders = (allOrders ?? []) as Array<{
    id: string;
    status: string;
    created_at: string;
    fnb_order_items?: Array<{ product_id: string; quantity: number; price: number; products?: { name: string } | null }>;
  }>;

  const orderRevenue = (o: (typeof orders)[0]) =>
    (o.fnb_order_items ?? []).reduce((s, i) => s + Number(i.price ?? 0) * Number(i.quantity ?? 0), 0);

  const t = (d: Date) => d.getTime();
  const todayOrders = orders.filter((o) => {
    const ct = new Date(o.created_at).getTime();
    return ct >= t(today) && ct < t(today) + 86400000;
  });
  const yesterdayOrders = orders.filter((o) => {
    const ct = new Date(o.created_at).getTime();
    return ct >= t(yesterday) && ct < t(today);
  });
  const monthOrders = orders.filter((o) => new Date(o.created_at) >= startOfMonth);
  const lastMonthOrders = orders.filter(
    (o) => new Date(o.created_at) >= startOfLastMonth && new Date(o.created_at) <= endOfLastMonth
  );

  const todaySales = todayOrders.reduce((s, o) => s + orderRevenue(o), 0);
  const yesterdaySales = yesterdayOrders.reduce((s, o) => s + orderRevenue(o), 0);
  const monthlyRevenue = monthOrders.reduce((s, o) => s + orderRevenue(o), 0);
  const lastMonthRevenue = lastMonthOrders.reduce((s, o) => s + orderRevenue(o), 0);

  const { count: productCount } = await supabase
    .from('products')
    .select('*', { count: 'exact', head: true })
    .eq('business_id', businessId)
    .eq('is_menu_item', true)
    .eq('is_active', true);

  const productQuantities = new Map<string, number>();
  for (const o of todayOrders) {
    for (const it of o.fnb_order_items ?? []) {
      const name = it.products?.name ?? 'Unknown';
      productQuantities.set(name, (productQuantities.get(name) ?? 0) + Number(it.quantity ?? 0));
    }
  }
  const bestSellerToday =
    productQuantities.size > 0
      ? [...productQuantities.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null
      : null;

  const hourCounts = new Map<number, number>();
  for (const o of todayOrders) {
    const h = new Date(o.created_at).getHours();
    hourCounts.set(h, (hourCounts.get(h) ?? 0) + 1);
  }
  let busiestHour: number | null = null;
  let maxCount = 0;
  for (const [hour, count] of hourCounts) {
    if (count > maxCount) {
      maxCount = count;
      busiestHour = hour;
    }
  }

  return {
    todaySales,
    yesterdaySales,
    monthlyRevenue,
    lastMonthRevenue,
    totalOrders: todayOrders.length,
    yesterdayOrders: yesterdayOrders.length,
    totalProducts: productCount ?? 0,
    todayProfit: 0,
    monthlyProfit: 0,
    bestSellerToday,
    busiestHour,
  };
}

export function useDashboardStats() {
  const { business, branch } = useBusiness();
  const business_type = business?.business_type;
  const connectivity = useConnectivityStatus();
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
  const startOfLastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
  const endOfLastMonth = new Date(today.getFullYear(), today.getMonth(), 0, 23, 59, 59, 999);

  return useQuery({
    queryKey: ['dashboard-stats', business?.id, branch?.id, business_type, connectivity.lastSyncAt, connectivity.queueCount, connectivity.status],
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

      if (business_type === 'fnb') {
        if (typeof navigator !== 'undefined' && !navigator.onLine) {
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
        return fetchFnbDashboardStats(
          business.id,
          branch?.id ?? null,
          today,
          yesterday,
          startOfMonth,
          startOfLastMonth,
          endOfLastMonth
        );
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
  const business_type = business?.business_type;

  return useQuery({
    queryKey: ['low-stock', business?.id, warehouse?.id, business_type, connectivity.lastSyncAt, connectivity.queueCount, connectivity.status],
    queryFn: async () => {
      if (!business?.id) return [];

      if (business_type === 'fnb') {
        if (typeof navigator !== 'undefined' && !navigator.onLine) return [];
        const { data: products } = await supabase
          .from('products')
          .select('id, name, sku, min_stock, unit')
          .eq('business_id', business.id)
          .eq('is_active', true);
        if (!products?.length) return [];
        const productIds = products.map((p) => p.id);
        let whIds: string[] = [];
        if (warehouse?.id) {
          whIds = [warehouse.id];
        } else {
          const { data: branches } = await supabase.from('branches').select('id').eq('business_id', business.id);
          const branchIds = branches?.map((b) => b.id) ?? [];
          const { data: whs } = branchIds.length
            ? await supabase.from('warehouses').select('id').in('branch_id', branchIds)
            : { data: [] };
          whIds = whs?.map((w) => w.id) ?? [];
        }
        if (whIds.length === 0) return [];
        const { data: inv } = await supabase
          .from('inventory')
          .select('product_id, quantity')
          .in('warehouse_id', whIds)
          .in('product_id', productIds);
        const stockByProduct = new Map<string, number>();
        for (const row of inv ?? []) {
          const q = (stockByProduct.get(row.product_id) ?? 0) + Number(row.quantity ?? 0);
          stockByProduct.set(row.product_id, q);
        }
        return products
          .map((p) => ({ ...p, total_stock: stockByProduct.get(p.id) ?? 0 }))
          .filter((p) => (p.total_stock ?? 0) < (p.min_stock ?? 0))
          .sort((a, b) => (a.total_stock ?? 0) - (b.total_stock ?? 0))
          .slice(0, 10);
      }

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
  const business_type = business?.business_type;
  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  return useQuery({
    queryKey: ['top-products', business?.id, branch?.id, business_type, connectivity.lastSyncAt, connectivity.queueCount, connectivity.status],
    queryFn: async () => {
      if (!business?.id) return [];

      if (business_type === 'fnb') {
        if (typeof navigator !== 'undefined' && !navigator.onLine) return [];
        let q = supabase
          .from('fnb_orders')
          .select('id, fnb_order_items ( product_id, quantity, price, products ( name ) )')
          .eq('business_id', business.id)
          .in('status', ['completed', 'served'])
          .gte('created_at', startOfMonth.toISOString());
        if (branch?.id) q = q.eq('branch_id', branch.id);
        const { data: orders } = await q;
        const rows = (orders ?? []) as Array<{
          id: string;
          fnb_order_items?: Array<{ product_id: string; quantity: number; price: number; products?: { name: string } | null }>;
        }>;
        const productMap = new Map<string, { name: string; quantity: number; revenue: number }>();
        for (const o of rows) {
          for (const it of o.fnb_order_items ?? []) {
            const name = it.products?.name ?? 'Unknown';
            const rev = Number(it.price ?? 0) * Number(it.quantity ?? 0);
            const existing = productMap.get(it.product_id);
            if (existing) {
              existing.quantity += Number(it.quantity ?? 0);
              existing.revenue += rev;
            } else {
              productMap.set(it.product_id, { name, quantity: Number(it.quantity ?? 0), revenue: rev });
            }
          }
        }
        return Array.from(productMap.entries())
          .map(([id, data]) => ({ id, ...data }))
          .sort((a, b) => b.revenue - a.revenue)
          .slice(0, 5);
      }

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
  const business_type = business?.business_type;

  return useQuery({
    queryKey: ['sales-chart', business?.id, branch?.id, business_type, connectivity.lastSyncAt, connectivity.queueCount, connectivity.status],
    queryFn: async () => {
      if (!business?.id) return [];

      const days = [];
      for (let i = 6; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        days.push(date.toISOString().split('T')[0]);
      }

      const result: Array<{ date: string; sales: number }> = [];

      if (business_type === 'fnb') {
        if (typeof navigator !== 'undefined' && !navigator.onLine) {
          return days.map((day) => ({
            date: new Date(day).toLocaleDateString('en-US', { weekday: 'short' }),
            sales: 0,
          }));
        }
        let q = supabase
          .from('fnb_orders')
          .select('id, created_at, fnb_order_items ( quantity, price )')
          .eq('business_id', business.id)
          .in('status', ['completed', 'served']);
        if (branch?.id) q = q.eq('branch_id', branch.id);
        const { data: orders } = await q;
        const rows = (orders ?? []) as Array<{
          created_at: string;
          fnb_order_items?: Array<{ quantity: number; price: number }>;
        }>;
        for (const day of days) {
          const startOfDay = new Date(day).getTime();
          const endOfDay = startOfDay + 86400000;
          const dayOrders = rows.filter((o) => {
            const t = new Date(o.created_at).getTime();
            return t >= startOfDay && t < endOfDay;
          });
          const total = dayOrders.reduce(
            (s, o) => s + (o.fnb_order_items ?? []).reduce((a, i) => a + Number(i.price ?? 0) * Number(i.quantity ?? 0), 0),
            0
          );
          result.push({
            date: new Date(day).toLocaleDateString('en-US', { weekday: 'short' }),
            sales: total,
          });
        }
        return result;
      }

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
  const business_type = business?.business_type;

  return useQuery({
    queryKey: ['recent-transactions', business?.id, branch?.id, business_type, connectivity.lastSyncAt, connectivity.queueCount, connectivity.status],
    queryFn: async () => {
      if (!business?.id) return [];

      if (business_type === 'fnb') {
        if (typeof navigator !== 'undefined' && !navigator.onLine) return [];
        let q = supabase
          .from('fnb_orders')
          .select('id, customer_name, created_at, fnb_order_items ( quantity, price )')
          .eq('business_id', business.id)
          .in('status', ['completed', 'served'])
          .order('created_at', { ascending: false })
          .limit(5);
        if (branch?.id) q = q.eq('branch_id', branch.id);
        const { data: orders } = await q;
        const rows = (orders ?? []) as Array<{
          id: string;
          customer_name: string | null;
          created_at: string;
          fnb_order_items?: Array<{ quantity: number; price: number }>;
        }>;
        return rows.map((o) => {
          const total = (o.fnb_order_items ?? []).reduce((s, i) => s + Number(i.price ?? 0) * Number(i.quantity ?? 0), 0);
          return {
            id: o.id,
            invoice_number: `ORD-${o.id.slice(0, 8)}`,
            total,
            payment_method: 'order',
            customer_name: o.customer_name,
            created_at: o.created_at,
          };
        });
      }

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
