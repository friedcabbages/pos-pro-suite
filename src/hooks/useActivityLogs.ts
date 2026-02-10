import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { Json } from '@/integrations/supabase/types';
import { useBusiness } from '@/contexts/BusinessContext';
import { toast } from 'sonner';

export interface ActivityLog {
  id: string;
  business_id: string;
  user_id: string | null;
  user_email: string | null;
  action: string;
  entity_type: string;
  entity_id: string | null;
  description: string | null;
  metadata: Record<string, unknown> | null;
  ip_address: string | null;
  created_at: string;
}

// Fetch activity logs for current business
export function useBusinessActivityLogs(filters?: {
  action?: string;
  entity_type?: string;
  limit?: number;
}) {
  const { business } = useBusiness();
  
  return useQuery({
    queryKey: ['business-activity-logs', business?.id, filters],
    queryFn: async () => {
      if (!business?.id) return [];
      
      let query = supabase
        .from('business_activity_logs')
        .select('*')
        .eq('business_id', business.id)
        .order('created_at', { ascending: false });
      
      if (filters?.action) {
        query = query.eq('action', filters.action);
      }
      if (filters?.entity_type) {
        query = query.eq('entity_type', filters.entity_type);
      }
      if (filters?.limit) {
        query = query.limit(filters.limit);
      } else {
        query = query.limit(100);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return (data ?? []) as ActivityLog[];
    },
    enabled: !!business?.id,
  });
}

// Log an activity
// Log an activity
export function useLogActivity() {
  const { business } = useBusiness();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      action,
      entityType,
      entityId,
      description,
      metadata,
    }: {
      action: string;
      entityType: string;
      entityId?: string;
      description?: string;
      metadata?: Record<string, unknown>;
    }) => {
      if (!business?.id) throw new Error('No business found');

      const { data: { user } } = await supabase.auth.getUser();

      const { error } = await supabase
        .from('business_activity_logs')
        .insert({
          business_id: business.id,
          user_id: user?.id,
          user_email: user?.email,
          action,
          entity_type: entityType,
          entity_id: entityId,
          description,
          metadata: metadata ? (JSON.parse(JSON.stringify(metadata)) as Json) : undefined,
        });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['business-activity-logs'] });
    },
  });
}


// Export data (sales, products, inventory)
export function useExportData() {
  const { business } = useBusiness();
  
  return useMutation({
    mutationFn: async (type: 'sales' | 'products' | 'inventory') => {
      if (!business?.id) throw new Error('No business found');
      
      let data: unknown[] = [];
      let filename = '';
      
      switch (type) {
        case 'sales': {
          const { data: sales, error } = await supabase
            .from('sales')
            .select(`
              *,
              sale_items(*)
            `)
            .eq('business_id', business.id)
            .order('created_at', { ascending: false });
          
          if (error) throw error;
          data = sales || [];
          filename = `sales-export-${new Date().toISOString().split('T')[0]}.csv`;
          break;
        }
        case 'products': {
          const { data: products, error } = await supabase
            .from('products')
            .select('*')
            .eq('business_id', business.id)
            .order('name', { ascending: true });
          
          if (error) throw error;
          data = products || [];
          filename = `products-export-${new Date().toISOString().split('T')[0]}.csv`;
          break;
        }
        case 'inventory': {
          const { data: inventory, error } = await supabase
            .from('inventory')
            .select(`
              *,
              product:products(name, sku),
              warehouse:warehouses(name)
            `)
            .order('updated_at', { ascending: false });
          
          if (error) throw error;
          data = inventory || [];
          filename = `inventory-export-${new Date().toISOString().split('T')[0]}.csv`;
          break;
        }
      }
      
      // Log the export - use audit_logs table which has the right schema
      const { data: { user } } = await supabase.auth.getUser();
      await supabase.from('audit_logs').insert([
        {
          business_id: business.id,
          action: 'data_exported',
          entity_type: type,
          entity_id: null,
          user_id: user?.id ?? null,
          old_value: null,
          new_value: null,
        },
      ]);
      
      return { data, filename, type };
    },
    onSuccess: ({ data, filename, type }) => {
      // Convert to CSV
      if (data.length === 0) {
        toast.info('No data to export');
        return;
      }
      
      const flatData = data.map((item: any) => {
        const flat: Record<string, unknown> = {};
        Object.entries(item).forEach(([key, value]) => {
          if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
            Object.entries(value as Record<string, unknown>).forEach(([subKey, subValue]) => {
              flat[`${key}_${subKey}`] = subValue;
            });
          } else if (!Array.isArray(value)) {
            flat[key] = value;
          }
        });
        return flat;
      });
      
      const headers = Object.keys(flatData[0]);
      const csvContent = [
        headers.join(','),
        ...flatData.map(row => 
          headers.map(h => {
            const val = row[h];
            if (val === null || val === undefined) return '';
            if (typeof val === 'string' && val.includes(',')) return `"${val}"`;
            return String(val);
          }).join(',')
        )
      ].join('\n');
      
      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      link.click();
      URL.revokeObjectURL(url);
      
      toast.success(`${type.charAt(0).toUpperCase() + type.slice(1)} exported successfully`);
    },
    onError: (error: Error) => toast.error(error.message),
  });
}
