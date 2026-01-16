import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

/**
 * Hook to check if the current user is a super admin.
 * This is the ONLY source of truth for super admin status.
 * 
 * SECURITY: This check queries the database via edge function.
 * The edge function validates JWT and checks the super_admins table.
 * 
 * Returns:
 * - isLoading: true while checking
 * - isSuperAdmin: true only if user is confirmed super admin
 * - error: any error from the check
 */
export function useSuperAdminCheck() {
  const { user, initialized } = useAuth();

  return useQuery({
    queryKey: ['super-admin-check', user?.id],
    queryFn: async () => {
      // No user = definitely not super admin
      if (!user) {
        console.log('[SuperAdminCheck] No user, returning false');
        return false;
      }

      console.log('[SuperAdminCheck] Checking super admin status for:', user.id);
      
      const { data, error } = await supabase.functions.invoke('admin-actions', {
        body: { action: 'check_super_admin' },
      });

      if (error) {
        console.error('[SuperAdminCheck] Error checking super admin:', error);
        // On error, DENY access (fail closed)
        return false;
      }

      const isSuperAdmin = data?.is_super_admin === true;
      console.log('[SuperAdminCheck] Result:', isSuperAdmin);
      
      return isSuperAdmin;
    },
    // Only run when auth is initialized and user exists
    enabled: initialized && !!user,
    staleTime: 1000 * 60 * 5, // Cache for 5 minutes
    retry: 1, // Only retry once to avoid delays
    // On error, return false (fail closed)
    placeholderData: false,
  });
}
