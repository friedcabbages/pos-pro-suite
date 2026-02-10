import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

type BusinessStatus = 'trial' | 'active' | 'expired' | 'suspended';

interface Business {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  currency: string;
  created_at: string;
  owner_id: string | null;
  status: BusinessStatus;
  trial_end_at: string | null;
  business_type?: 'retail' | 'fnb' | 'service' | 'venue';
  user_count?: number;
  owner?: {
    full_name: string | null;
    phone: string | null;
  };
}

interface AdminUser {
  id: string;
  user_id: string;
  role: string;
  business_id: string;
  branch_id: string | null;
  created_at: string;
  profile?: {
    full_name: string | null;
    phone: string | null;
    username: string | null;
    avatar_url?: string | null;
  };
  business?: {
    name: string;
  };
  email?: string | null;
}

interface AuditLog {
  id: string;
  entity_type: string;
  action: string;
  entity_id: string | null;
  user_id: string | null;
  old_value: Record<string, unknown> | null;
  new_value: Record<string, unknown> | null;
  ip_address: string | null;
  created_at: string;
  business_id: string;
  business?: {
    name: string;
  };
}

interface SystemStats {
  total_businesses: number;
  total_users: number;
  total_products: number;
  total_revenue: number;
  businesses_by_status?: Record<string, number>;
}

interface AuditLogFilters {
  business_id?: string;
  entity_type?: string;
  action?: string;
  date_from?: string;
  date_to?: string;
}

interface CreateBusinessPayload {
  business_name: string;
  owner_email: string;
  owner_password: string;
  owner_name?: string;
  owner_username?: string;
  currency?: string;
  business_type?: 'retail' | 'fnb' | 'service' | 'venue';
}

// Check if current user is super admin
// DEPRECATED: Use useSuperAdminCheck from @/hooks/useSuperAdminCheck instead
// This is kept for backwards compatibility with existing code
export function useSuperAdminCheck() {
  return useQuery({
    queryKey: ['super-admin-check'],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke('admin-actions', {
        body: { action: 'check_super_admin' },
      });
      // On error, return false (fail closed)
      if (error) {
        console.error('[useSuperAdminCheck] Error:', error);
        return false;
      }
      return data?.is_super_admin === true;
    },
    staleTime: 1000 * 60 * 5, // Cache for 5 minutes
    retry: 1,
    placeholderData: false,
  });
}

// Fetch all businesses (super admin only)
export function useAdminBusinesses() {
  return useQuery({
    queryKey: ['admin-businesses'],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke('admin-actions', {
        body: { action: 'list_businesses' },
      });
      if (error) throw error;
      return data.businesses as Business[];
    },
  });
}

// Fetch all users across businesses (super admin only)
export function useAdminUsers() {
  return useQuery({
    queryKey: ['admin-users'],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke('admin-actions', {
        body: { action: 'list_users' },
      });
      if (error) throw error;
      return data.users as AdminUser[];
    },
  });
}

// Fetch audit logs with filters (super admin only)
export function useAdminAuditLogs(filters?: AuditLogFilters) {
  return useQuery({
    queryKey: ['admin-audit-logs', filters],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke('admin-actions', {
        body: { action: 'list_audit_logs', filters },
      });
      if (error) throw error;
      return data.logs as AuditLog[];
    },
  });
}

// Fetch system stats (super admin only)
export function useSystemStats() {
  return useQuery({
    queryKey: ['system-stats'],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke('admin-actions', {
        body: { action: 'get_system_stats' },
      });
      if (error) throw error;
      return data.stats as SystemStats;
    },
  });
}

// Admin actions mutation
export function useAdminAction() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ action, businessId }: { action: string; businessId: string }) => {
      const { data, error } = await supabase.functions.invoke('admin-actions', {
        body: { action, business_id: businessId },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      const actionLabels: Record<string, string> = {
        activate: 'activated',
        suspend: 'suspended',
        expire: 'expired',
        start_trial: 'trial started',
      };
      toast.success(`Business ${actionLabels[variables.action] || variables.action} successfully`);
      queryClient.invalidateQueries({ queryKey: ['admin-businesses'] });
      queryClient.invalidateQueries({ queryKey: ['admin-audit-logs'] });
      queryClient.invalidateQueries({ queryKey: ['system-stats'] });
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}

// Create business with owner mutation
export function useCreateBusinessWithOwner() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: CreateBusinessPayload) => {
      const { data, error } = await supabase.functions.invoke('admin-actions', {
        body: { action: 'create_business_with_owner', payload },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success('Business and owner created successfully');
      queryClient.invalidateQueries({ queryKey: ['admin-businesses'] });
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      queryClient.invalidateQueries({ queryKey: ['system-stats'] });
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}