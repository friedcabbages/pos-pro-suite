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

      const { data, error } = await supabase
        .from('user_roles')
        .select('id, user_id, role, branch_id')
        .eq('business_id', business.id);

      if (error) throw error;

      if (!data || data.length === 0) return [];

      // Fetch profiles for each user
      const userIds = data.map((u) => u.user_id);
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name, phone')
        .in('id', userIds);

      // Fetch branches
      const branchIds = data.filter((u) => u.branch_id).map((u) => u.branch_id!);
      const { data: branches } = branchIds.length > 0
        ? await supabase.from('branches').select('id, name').in('id', branchIds)
        : { data: [] };

      const usersWithData: UserWithRole[] = data.map((user) => ({
        ...user,
        profile: profiles?.find((p) => p.id === user.user_id),
        branch: branches?.find((b) => b.id === user.branch_id),
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
