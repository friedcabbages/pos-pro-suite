import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useBusiness } from '@/contexts/BusinessContext';
import { toast } from 'sonner';

interface UserWithRole {
  id: string;
  user_id: string;
  role: 'owner' | 'admin' | 'cashier';
  branch_id: string | null;
  profile?: {
    full_name: string | null;
    phone: string | null;
  };
  branch?: {
    name: string;
  };
}

interface CreateUserInput {
  email: string;
  password: string;
  full_name: string;
  role: 'admin' | 'cashier';
  branch_id?: string;
}

export function useUsers() {
  const { business } = useBusiness();

  return useQuery({
    queryKey: ['users', business?.id],
    queryFn: async () => {
      if (!business?.id) return [];

      // Fetch user_roles for the current business
      const { data: rolesData, error: rolesError } = await supabase
        .from('user_roles')
        .select('id, user_id, role, branch_id')
        .eq('business_id', business.id);

      if (rolesError) throw rolesError;
      if (!rolesData || rolesData.length === 0) return [];

      // Fetch profiles for all user_ids
      const userIds = rolesData.map((u) => u.user_id);
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, full_name, phone')
        .in('id', userIds);

      if (profilesError) console.error('Error fetching profiles:', profilesError);

      // Fetch branches for users with branch_id
      const branchIds = rolesData
        .filter((u) => u.branch_id)
        .map((u) => u.branch_id as string);
      
      let branches: { id: string; name: string }[] = [];
      if (branchIds.length > 0) {
        const { data: branchesData, error: branchesError } = await supabase
          .from('branches')
          .select('id, name')
          .in('id', branchIds);
        
        if (branchesError) console.error('Error fetching branches:', branchesError);
        branches = branchesData || [];
      }

      // Map profiles and branches by id for O(1) lookup
      const profilesMap = new Map(profiles?.map((p) => [p.id, p]) || []);
      const branchesMap = new Map(branches.map((b) => [b.id, b]));

      // Build the final users array
      const usersWithData: UserWithRole[] = rolesData.map((role) => ({
        id: role.id,
        user_id: role.user_id,
        role: role.role as 'owner' | 'admin' | 'cashier',
        branch_id: role.branch_id,
        profile: profilesMap.get(role.user_id) || { full_name: null, phone: null },
        branch: role.branch_id ? branchesMap.get(role.branch_id) : undefined,
      }));

      return usersWithData;
    },
    enabled: !!business?.id,
  });
}

export function useCreateUser() {
  const queryClient = useQueryClient();
  const { business } = useBusiness();

  return useMutation({
    mutationFn: async (input: CreateUserInput) => {
      if (!business?.id) throw new Error('No business selected');

      const { data, error } = await supabase.functions.invoke('create-user', {
        body: {
          email: input.email,
          password: input.password,
          full_name: input.full_name,
          role: input.role,
          business_id: business.id,
          branch_id: input.branch_id || null,
        },
      });

      if (error) throw error;
      if (data.error) throw new Error(data.error);

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      toast.success('User created successfully');
    },
    onError: (error) => {
      toast.error('Failed to create user: ' + error.message);
    },
  });
}

export function useUpdateUserRole() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, role, branch_id }: { id: string; role: 'admin' | 'cashier'; branch_id?: string | null }) => {
      const { error } = await supabase
        .from('user_roles')
        .update({ role, branch_id: branch_id ?? null })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      toast.success('User role updated');
    },
    onError: (error) => {
      toast.error('Failed to update user: ' + error.message);
    },
  });
}

export function useDeleteUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      // Delete the user_role entry (this removes access)
      const { error } = await supabase
        .from('user_roles')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      toast.success('User access removed');
    },
    onError: (error) => {
      toast.error('Failed to remove user: ' + error.message);
    },
  });
}
