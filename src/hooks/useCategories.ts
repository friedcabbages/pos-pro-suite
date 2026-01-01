import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useBusiness } from '@/contexts/BusinessContext';
import { Category } from '@/types/database';
import { toast } from 'sonner';

export function useCategories() {
  const { business } = useBusiness();

  return useQuery({
    queryKey: ['categories', business?.id],
    queryFn: async () => {
      if (!business?.id) return [];

      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .eq('business_id', business.id)
        .order('name');

      if (error) throw error;
      return data as Category[];
    },
    enabled: !!business?.id
  });
}

export function useCreateCategory() {
  const queryClient = useQueryClient();
  const { business } = useBusiness();

  return useMutation({
    mutationFn: async (category: { name: string; description?: string }) => {
      if (!business?.id) throw new Error('No business selected');

      const { data, error } = await supabase
        .from('categories')
        .insert({
          ...category,
          business_id: business.id
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      toast.success('Category created successfully');
    },
    onError: (error) => {
      toast.error('Failed to create category: ' + error.message);
    }
  });
}

export function useUpdateCategory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, name, description }: { id: string; name: string; description?: string }) => {
      const { data, error } = await supabase
        .from('categories')
        .update({ name, description })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      toast.success('Category updated successfully');
    },
    onError: (error) => {
      toast.error('Failed to update category: ' + error.message);
    }
  });
}

export function useDeleteCategory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('categories')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      toast.success('Category deleted successfully');
    },
    onError: (error) => {
      toast.error('Failed to delete category: ' + error.message);
    }
  });
}
