import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useBusiness } from '@/contexts/BusinessContext';
import { AuditLog } from '@/types/database';

interface AuditLogFilters {
  entity_type?: string;
  action?: string;
  dateRange?: { start: Date; end: Date };
}

export function useAuditLogs(filters?: AuditLogFilters) {
  const { business } = useBusiness();

  return useQuery({
    queryKey: ['audit-logs', business?.id, filters],
    queryFn: async () => {
      if (!business?.id) return [];

      let query = supabase
        .from('audit_logs')
        .select('*')
        .eq('business_id', business.id)
        .order('created_at', { ascending: false })
        .limit(500);

      if (filters?.entity_type && filters.entity_type !== 'all') {
        query = query.eq('entity_type', filters.entity_type);
      }

      if (filters?.action && filters.action !== 'all') {
        query = query.eq('action', filters.action);
      }

      if (filters?.dateRange) {
        query = query
          .gte('created_at', filters.dateRange.start.toISOString())
          .lte('created_at', filters.dateRange.end.toISOString());
      }

      const { data, error } = await query;

      if (error) throw error;
      return data as AuditLog[];
    },
    enabled: !!business?.id
  });
}

export function useAuditLogStats() {
  const { business } = useBusiness();

  return useQuery({
    queryKey: ['audit-log-stats', business?.id],
    queryFn: async () => {
      if (!business?.id) return { total: 0, today: 0, entityTypes: [], actions: [] };

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const { data, error } = await supabase
        .from('audit_logs')
        .select('entity_type, action, created_at')
        .eq('business_id', business.id);

      if (error) throw error;

      const total = data.length;
      const todayCount = data.filter(log => 
        new Date(log.created_at) >= today
      ).length;

      const entityTypes = [...new Set(data.map(log => log.entity_type))];
      const actions = [...new Set(data.map(log => log.action))];

      return { total, today: todayCount, entityTypes, actions };
    },
    enabled: !!business?.id
  });
}
