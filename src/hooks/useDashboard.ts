import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useBusiness } from '@/contexts/BusinessContext';

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
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  
  const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
  const startOfLastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
  const endOfLastMonth = new Date(today.getFullYear(), today.getMonth(), 0, 23, 59, 59, 999);

  return useQuery({
    queryKey: ['dashboard-stats', business?.id, branch?.id],
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

      // Today's sales
      let todayQuery = supabase
        .from('sales')
        .select('total, created_at, items:sale_items(profit, quantity, product:products(name))')
        .eq('business_id', business.id)
        .gte('created_at', today.toISOString());

      if (branch?.id) {
        todayQuery = todayQuery.eq('branch_id', branch.id);
      }

      const { data: todaySalesData } = await todayQuery;
      const todaySales = todaySalesData?.reduce((sum, s) => sum + Number(s.total), 0) || 0;
      const todayProfit = todaySalesData?.reduce((sum, s) => 
        sum + (s.items?.reduce((p, i: { profit: number }) => p + Number(i.profit), 0) || 0), 0
      ) || 0;

      // Yesterday's sales for comparison
      let yesterdayQuery = supabase
        .from('sales')
        .select('total')
        .eq('business_id', business.id)
        .gte('created_at', yesterday.toISOString())
        .lt('created_at', today.toISOString());

      if (branch?.id) {
        yesterdayQuery = yesterdayQuery.eq('branch_id', branch.id);
      }

      const { data: yesterdaySalesData } = await yesterdayQuery;
      const yesterdaySales = yesterdaySalesData?.reduce((sum, s) => sum + Number(s.total), 0) || 0;
      const yesterdayOrders = yesterdaySalesData?.length || 0;

      // Monthly revenue
      let monthQuery = supabase
        .from('sales')
        .select('total, items:sale_items(profit)')
        .eq('business_id', business.id)
        .gte('created_at', startOfMonth.toISOString());

      if (branch?.id) {
        monthQuery = monthQuery.eq('branch_id', branch.id);
      }

      const { data: monthSalesData } = await monthQuery;
      const monthlyRevenue = monthSalesData?.reduce((sum, s) => sum + Number(s.total), 0) || 0;
      const monthlyProfit = monthSalesData?.reduce((sum, s) => 
        sum + (s.items?.reduce((p, i: { profit: number }) => p + Number(i.profit), 0) || 0), 0
      ) || 0;

      // Last month's revenue for comparison
      let lastMonthQuery = supabase
        .from('sales')
        .select('total')
        .eq('business_id', business.id)
        .gte('created_at', startOfLastMonth.toISOString())
        .lte('created_at', endOfLastMonth.toISOString());

      if (branch?.id) {
        lastMonthQuery = lastMonthQuery.eq('branch_id', branch.id);
      }

      const { data: lastMonthSalesData } = await lastMonthQuery;
      const lastMonthRevenue = lastMonthSalesData?.reduce((sum, s) => sum + Number(s.total), 0) || 0;

      // Total orders today
      const totalOrders = todaySalesData?.length || 0;

      // Total products
      const { count: totalProducts } = await supabase
        .from('products')
        .select('*', { count: 'exact', head: true })
        .eq('business_id', business.id)
        .eq('is_active', true);

      // Best seller today
      let bestSellerToday: string | null = null;
      const productQuantities = new Map<string, { name: string; qty: number }>();
      
      for (const sale of todaySalesData || []) {
        for (const item of sale.items || []) {
          const typedItem = item as { quantity: number; product: { name: string } | null };
          const productName = typedItem.product?.name;
          if (productName) {
            const existing = productQuantities.get(productName);
            if (existing) {
              existing.qty += typedItem.quantity;
            } else {
              productQuantities.set(productName, { name: productName, qty: typedItem.quantity });
            }
          }
        }
      }
      
      if (productQuantities.size > 0) {
        const sorted = Array.from(productQuantities.values()).sort((a, b) => b.qty - a.qty);
        bestSellerToday = sorted[0]?.name || null;
      }

      // Busiest hour today
      let busiestHour: number | null = null;
      if (todaySalesData && todaySalesData.length > 0) {
        const hourCounts = new Map<number, number>();
        for (const sale of todaySalesData) {
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
  const { business } = useBusiness();

  return useQuery({
    queryKey: ['low-stock', business?.id],
    queryFn: async () => {
      if (!business?.id) return [];

      const { data, error } = await supabase
        .from('v_low_stock')
        .select('*')
        .eq('business_id', business.id)
        .limit(10);

      if (error) throw error;
      return data;
    },
    enabled: !!business?.id
  });
}

export function useTopProducts() {
  const { business, branch } = useBusiness();
  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  return useQuery({
    queryKey: ['top-products', business?.id, branch?.id],
    queryFn: async () => {
      if (!business?.id) return [];

      // Get sale items with product info
      let query = supabase
        .from('sale_items')
        .select(`
          quantity,
          total,
          product:products(id, name),
          sale:sales!inner(business_id, branch_id, created_at)
        `)
        .eq('sales.business_id', business.id)
        .gte('sales.created_at', startOfMonth.toISOString());

      if (branch?.id) {
        query = query.eq('sales.branch_id', branch.id);
      }

      const { data, error } = await query;

      if (error) throw error;

      // Aggregate by product
      const productMap = new Map<string, { name: string; quantity: number; revenue: number }>();
      
      for (const item of data || []) {
        const product = item.product as { id: string; name: string } | null;
        if (!product) continue;

        const existing = productMap.get(product.id);
        if (existing) {
          existing.quantity += item.quantity;
          existing.revenue += Number(item.total);
        } else {
          productMap.set(product.id, {
            name: product.name,
            quantity: item.quantity,
            revenue: Number(item.total)
          });
        }
      }

      // Sort by revenue and take top 5
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

  return useQuery({
    queryKey: ['sales-chart', business?.id, branch?.id],
    queryFn: async () => {
      if (!business?.id) return [];

      // Get last 7 days
      const days = [];
      for (let i = 6; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        days.push(date.toISOString().split('T')[0]);
      }

      const result = [];
      for (const day of days) {
        const startOfDay = new Date(day);
        const endOfDay = new Date(day);
        endOfDay.setDate(endOfDay.getDate() + 1);

        let query = supabase
          .from('sales')
          .select('total')
          .eq('business_id', business.id)
          .gte('created_at', startOfDay.toISOString())
          .lt('created_at', endOfDay.toISOString());

        if (branch?.id) {
          query = query.eq('branch_id', branch.id);
        }

        const { data } = await query;
        const total = data?.reduce((sum, s) => sum + Number(s.total), 0) || 0;

        result.push({
          date: new Date(day).toLocaleDateString('en-US', { weekday: 'short' }),
          sales: total
        });
      }

      return result;
    },
    enabled: !!business?.id
  });
}

export function useRecentTransactions() {
  const { business, branch } = useBusiness();

  return useQuery({
    queryKey: ['recent-transactions', business?.id, branch?.id],
    queryFn: async () => {
      if (!business?.id) return [];

      let query = supabase
        .from('sales')
        .select(`
          id,
          invoice_number,
          total,
          payment_method,
          customer_name,
          created_at
        `)
        .eq('business_id', business.id)
        .order('created_at', { ascending: false })
        .limit(5);

      if (branch?.id) {
        query = query.eq('branch_id', branch.id);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data;
    },
    enabled: !!business?.id
  });
}
