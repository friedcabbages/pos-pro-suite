import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useBusiness } from '@/contexts/BusinessContext';
import { useAuth } from '@/contexts/AuthContext';
import { Supplier } from '@/types/database';
import { createAuditLog } from '@/lib/audit';
import { toast } from 'sonner';

export function useSuppliers() {
  const { business } = useBusiness();

  return useQuery({
    queryKey: ['suppliers', business?.id],
    queryFn: async () => {
      if (!business?.id) return [];

      const { data, error } = await supabase
        .from('suppliers')
        .select('*')
        .eq('business_id', business.id)
        .eq('is_active', true)
        .order('name');

      if (error) throw error;
      return data as Supplier[];
    },
    enabled: !!business?.id
  });
}

export function useSupplierPerformance() {
  const { business } = useBusiness();

  return useQuery({
    queryKey: ['supplier-performance', business?.id],
    queryFn: async () => {
      if (!business?.id) return [];

      const { data, error } = await supabase
        .from('v_supplier_performance')
        .select('*')
        .eq('business_id', business.id);

      if (error) throw error;
      return data;
    },
    enabled: !!business?.id
  });
}

export function useCreateSupplier() {
  const queryClient = useQueryClient();
  const { business } = useBusiness();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (supplier: Partial<Supplier>) => {
      if (!business?.id) throw new Error('No business selected');

      const { data, error } = await supabase
        .from('suppliers')
        .insert([{
          name: supplier.name || 'Unnamed Supplier',
          business_id: business.id,
          contact_person: supplier.contact_person || null,
          phone: supplier.phone || null,
          email: supplier.email || null,
          address: supplier.address || null,
          notes: supplier.notes || null,
          is_active: supplier.is_active ?? true
        }])
        .select()
        .single();

      if (error) throw error;

      await createAuditLog({
        business_id: business.id,
        user_id: user?.id,
        entity_type: 'supplier',
        entity_id: data.id,
        action: 'create',
        new_value: data as Record<string, unknown>
      });

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['suppliers'] });
      toast.success('Supplier created successfully');
    },
    onError: (error) => {
      toast.error('Failed to create supplier: ' + error.message);
    }
  });
}

export function useUpdateSupplier() {
  const queryClient = useQueryClient();
  const { business } = useBusiness();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Supplier> & { id: string }) => {
      const { data, error } = await supabase
        .from('suppliers')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      if (business) {
        await createAuditLog({
          business_id: business.id,
          user_id: user?.id,
          entity_type: 'supplier',
          entity_id: id,
          action: 'update',
          new_value: updates as Record<string, unknown>
        });
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['suppliers'] });
      toast.success('Supplier updated successfully');
    },
    onError: (error) => {
      toast.error('Failed to update supplier: ' + error.message);
    }
  });
}

export function useDeleteSupplier() {
  const queryClient = useQueryClient();
  const { business } = useBusiness();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('suppliers')
        .update({ is_active: false })
        .eq('id', id);

      if (error) throw error;

      if (business) {
        await createAuditLog({
          business_id: business.id,
          user_id: user?.id,
          entity_type: 'supplier',
          entity_id: id,
          action: 'delete'
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['suppliers'] });
      toast.success('Supplier deleted successfully');
    },
    onError: (error) => {
      toast.error('Failed to delete supplier: ' + error.message);
    }
  });
}
