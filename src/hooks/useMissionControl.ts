import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

// Types
export interface SubscriptionHistoryEntry {
  id: string;
  business_id: string;
  changed_by: string | null;
  action: string;
  from_status: string | null;
  to_status: string | null;
  from_plan: string | null;
  to_plan: string | null;
  trial_days_added: number | null;
  reason: string | null;
  notes: string | null;
  created_at: string;
}

export interface Broadcast {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'warning' | 'critical';
  is_active: boolean;
  target_businesses: string[] | null;
  created_by: string | null;
  expires_at: string | null;
  created_at: string;
}

export interface FeatureFlag {
  id: string;
  business_id: string;
  feature_key: string;
  enabled: boolean;
  metadata: Record<string, unknown>;
  updated_at: string;
}

export interface GlobalAuditLog {
  id: string;
  actor_id: string | null;
  actor_email: string | null;
  action: string;
  entity_type: string;
  entity_id: string | null;
  target_business_id: string | null;
  target_user_id: string | null;
  old_value: Record<string, unknown> | null;
  new_value: Record<string, unknown> | null;
  ip_address: string | null;
  created_at: string;
}

export interface SystemSetting {
  id: string;
  key: string;
  value: Record<string, unknown>;
  updated_at: string;
}

export interface EnhancedStats {
  total_businesses: number;
  total_users: number;
  total_products: number;
  total_revenue: number;
  businesses_by_status: Record<string, number>;
  new_businesses_today: number;
  new_businesses_week: number;
  transactions_today: number;
  active_businesses_today: number;
  top_businesses: Array<{
    id: string;
    name: string;
    transaction_count: number;
    user_count: number;
  }>;
}

// Hook for enhanced system stats
export function useEnhancedStats() {
  return useQuery({
    queryKey: ['enhanced-stats'],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke('admin-actions', {
        body: { action: 'get_enhanced_stats' },
      });
      if (error) throw error;
      return data.stats as EnhancedStats;
    },
    staleTime: 1000 * 30, // 30 seconds
  });
}

// Hook for global audit logs
export function useGlobalAuditLogs(filters?: {
  business_id?: string;
  action?: string;
  entity_type?: string;
  date_from?: string;
  date_to?: string;
}) {
  return useQuery({
    queryKey: ['global-audit-logs', filters],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke('admin-actions', {
        body: { action: 'list_global_audit_logs', filters },
      });
      if (error) throw error;
      return data.logs as GlobalAuditLog[];
    },
  });
}

// Hook for subscription history
export function useSubscriptionHistory(businessId?: string) {
  return useQuery({
    queryKey: ['subscription-history', businessId],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke('admin-actions', {
        body: { action: 'get_subscription_history', business_id: businessId },
      });
      if (error) throw error;
      return data.history as SubscriptionHistoryEntry[];
    },
  });
}

// Hook for broadcasts
export function useBroadcasts() {
  return useQuery({
    queryKey: ['broadcasts'],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke('admin-actions', {
        body: { action: 'list_broadcasts' },
      });
      if (error) throw error;
      return data.broadcasts as Broadcast[];
    },
  });
}

// Hook for system settings
export function useSystemSettings() {
  return useQuery({
    queryKey: ['system-settings'],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke('admin-actions', {
        body: { action: 'get_system_settings' },
      });
      if (error) throw error;
      return data.settings as SystemSetting[];
    },
  });
}

// Hook for feature flags
export function useFeatureFlags(businessId?: string) {
  return useQuery({
    queryKey: ['feature-flags', businessId],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke('admin-actions', {
        body: { action: 'list_feature_flags', business_id: businessId },
      });
      if (error) throw error;
      return data.flags as FeatureFlag[];
    },
    enabled: !!businessId,
  });
}

// Hook for business users
export function useBusinessUsers(businessId: string) {
  return useQuery({
    queryKey: ['business-users', businessId],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke('admin-actions', {
        body: { action: 'get_business_users', business_id: businessId },
      });
      if (error) throw error;
      return data.users;
    },
    enabled: !!businessId,
  });
}

// Mutation hooks
export function useExtendTrial() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ businessId, days }: { businessId: string; days: number }) => {
      const { data, error } = await supabase.functions.invoke('admin-actions', {
        body: { action: 'extend_trial', business_id: businessId, payload: { days } },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success('Trial extended successfully');
      queryClient.invalidateQueries({ queryKey: ['admin-businesses'] });
      queryClient.invalidateQueries({ queryKey: ['subscription-history'] });
    },
    onError: (error: Error) => toast.error(error.message),
  });
}

export function useSuspendWithReason() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ businessId, reason }: { businessId: string; reason: string }) => {
      const { data, error } = await supabase.functions.invoke('admin-actions', {
        body: { action: 'suspend_with_reason', business_id: businessId, payload: { reason } },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success('Business suspended');
      queryClient.invalidateQueries({ queryKey: ['admin-businesses'] });
    },
    onError: (error: Error) => toast.error(error.message),
  });
}

export function useForceLogout() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (businessId: string) => {
      const { data, error } = await supabase.functions.invoke('admin-actions', {
        body: { action: 'force_logout_business', business_id: businessId },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success('All users logged out successfully');
      queryClient.invalidateQueries({ queryKey: ['global-audit-logs'] });
    },
    onError: (error: Error) => toast.error(error.message),
  });
}

export function useUpgradePlan() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ businessId, plan, manualPayment }: { businessId: string; plan: string; manualPayment?: boolean }) => {
      const { data, error } = await supabase.functions.invoke('admin-actions', {
        body: { action: 'upgrade_plan', business_id: businessId, payload: { plan, manual_payment: manualPayment } },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success('Plan updated successfully');
      queryClient.invalidateQueries({ queryKey: ['admin-businesses'] });
      queryClient.invalidateQueries({ queryKey: ['subscription-history'] });
    },
    onError: (error: Error) => toast.error(error.message),
  });
}

export function useUpdateUserRole() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ userId, businessId, newRole }: { userId: string; businessId: string; newRole: string }) => {
      const { data, error } = await supabase.functions.invoke('admin-actions', {
        body: { action: 'update_user_role', payload: { user_id: userId, business_id: businessId, new_role: newRole } },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success('User role updated');
      queryClient.invalidateQueries({ queryKey: ['business-users'] });
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
    },
    onError: (error: Error) => toast.error(error.message),
  });
}

export function useDisableUser() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ userId, disabled }: { userId: string; disabled: boolean }) => {
      const { data, error } = await supabase.functions.invoke('admin-actions', {
        body: { action: 'disable_user', payload: { user_id: userId, disabled } },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      toast.success(variables.disabled ? 'User disabled' : 'User enabled');
      queryClient.invalidateQueries({ queryKey: ['business-users'] });
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
    },
    onError: (error: Error) => toast.error(error.message),
  });
}

export function useSendPasswordReset() {
  return useMutation({
    mutationFn: async (email: string) => {
      const { data, error } = await supabase.functions.invoke('admin-actions', {
        body: { action: 'send_password_reset', payload: { email } },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => toast.success('Password reset email sent'),
    onError: (error: Error) => toast.error(error.message),
  });
}

export function useCreateBroadcast() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (broadcast: Omit<Broadcast, 'id' | 'created_at' | 'created_by'>) => {
      const { data, error } = await supabase.functions.invoke('admin-actions', {
        body: { action: 'create_broadcast', payload: broadcast },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success('Broadcast created');
      queryClient.invalidateQueries({ queryKey: ['broadcasts'] });
    },
    onError: (error: Error) => toast.error(error.message),
  });
}

export function useToggleBroadcast() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ broadcastId, active }: { broadcastId: string; active: boolean }) => {
      const { data, error } = await supabase.functions.invoke('admin-actions', {
        body: { action: 'toggle_broadcast', payload: { broadcast_id: broadcastId, active } },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['broadcasts'] });
    },
    onError: (error: Error) => toast.error(error.message),
  });
}

export function useUpdateSystemSetting() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ key, value }: { key: string; value: Record<string, unknown> }) => {
      const { data, error } = await supabase.functions.invoke('admin-actions', {
        body: { action: 'update_system_setting', payload: { key, value } },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success('Setting updated');
      queryClient.invalidateQueries({ queryKey: ['system-settings'] });
    },
    onError: (error: Error) => toast.error(error.message),
  });
}

export function useToggleFeatureFlag() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ businessId, featureKey, enabled }: { businessId: string; featureKey: string; enabled: boolean }) => {
      const { data, error } = await supabase.functions.invoke('admin-actions', {
        body: { action: 'toggle_feature_flag', payload: { business_id: businessId, feature_key: featureKey, enabled } },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success('Feature flag updated');
      queryClient.invalidateQueries({ queryKey: ['feature-flags'] });
    },
    onError: (error: Error) => toast.error(error.message),
  });
}

export function useDeleteBusiness() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (businessId: string) => {
      const { data, error } = await supabase.functions.invoke('admin-actions', {
        body: { action: 'delete_business', business_id: businessId },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success('Business deleted');
      queryClient.invalidateQueries({ queryKey: ['admin-businesses'] });
      queryClient.invalidateQueries({ queryKey: ['enhanced-stats'] });
    },
    onError: (error: Error) => toast.error(error.message),
  });
}
