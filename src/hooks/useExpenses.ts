import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useBusiness } from '@/contexts/BusinessContext';
import { useAuth } from '@/contexts/AuthContext';
import { Expense } from '@/types/database';
import { toast } from 'sonner';

export function useExpenses(dateRange?: { start: Date; end: Date }) {
  const { business, branch } = useBusiness();

  return useQuery({
    queryKey: ['expenses', business?.id, branch?.id, dateRange],
    queryFn: async () => {
      if (!business?.id) return [];

      let query = supabase
        .from('expenses')
        .select(`
          *,
          branch:branches(id, name)
        `)
        .eq('business_id', business.id)
        .order('expense_date', { ascending: false });

      if (branch?.id) {
        query = query.or(`branch_id.eq.${branch.id},branch_id.is.null`);
      }

      if (dateRange) {
        query = query
          .gte('expense_date', dateRange.start.toISOString().split('T')[0])
          .lte('expense_date', dateRange.end.toISOString().split('T')[0]);
      }

      const { data, error } = await query.limit(100);

      if (error) throw error;
      return data as Expense[];
    },
    enabled: !!business?.id
  });
}

export function useExpenseSummary() {
  const { business, branch } = useBusiness();
  const today = new Date();
  const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

  return useQuery({
    queryKey: ['expense-summary', business?.id, branch?.id],
    queryFn: async () => {
      if (!business?.id) return { total: 0, count: 0, fixed: 0 };

      let query = supabase
        .from('expenses')
        .select('amount, is_fixed')
        .eq('business_id', business.id)
        .gte('expense_date', startOfMonth.toISOString().split('T')[0]);

      if (branch?.id) {
        query = query.or(`branch_id.eq.${branch.id},branch_id.is.null`);
      }

      const { data, error } = await query;

      if (error) throw error;

      const total = data?.reduce((sum, exp) => sum + Number(exp.amount), 0) || 0;
      const fixed = data?.filter(exp => exp.is_fixed).reduce((sum, exp) => sum + Number(exp.amount), 0) || 0;

      return { 
        total, 
        count: data?.length || 0,
        fixed
      };
    },
    enabled: !!business?.id
  });
}

export function useCreateExpense() {
  const queryClient = useQueryClient();
  const { business, branch } = useBusiness();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (expense: Partial<Expense>) => {
      if (!business?.id) throw new Error('No business selected');

      const { data, error } = await supabase
        .from('expenses')
        .insert({
          ...expense,
          business_id: business.id,
          branch_id: expense.branch_id || branch?.id,
          created_by: user?.id
        })
        .select()
        .single();

      if (error) throw error;

      // Audit log
      await supabase.from('audit_logs').insert({
        business_id: business.id,
        user_id: user?.id,
        entity_type: 'expense',
        entity_id: data.id,
        action: 'create',
        new_value: data
      });

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
      queryClient.invalidateQueries({ queryKey: ['expense-summary'] });
      toast.success('Expense created successfully');
    },
    onError: (error) => {
      toast.error('Failed to create expense: ' + error.message);
    }
  });
}

export function useUpdateExpense() {
  const queryClient = useQueryClient();
  const { business } = useBusiness();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Expense> & { id: string }) => {
      // Get old value for audit
      const { data: oldData } = await supabase
        .from('expenses')
        .select()
        .eq('id', id)
        .single();

      const { data, error } = await supabase
        .from('expenses')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      if (business) {
        await supabase.from('audit_logs').insert({
          business_id: business.id,
          user_id: user?.id,
          entity_type: 'expense',
          entity_id: id,
          action: 'update',
          old_value: oldData,
          new_value: data
        });
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
      queryClient.invalidateQueries({ queryKey: ['expense-summary'] });
      toast.success('Expense updated successfully');
    },
    onError: (error) => {
      toast.error('Failed to update expense: ' + error.message);
    }
  });
}

export function useDeleteExpense() {
  const queryClient = useQueryClient();
  const { business } = useBusiness();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('expenses')
        .delete()
        .eq('id', id);

      if (error) throw error;

      if (business) {
        await supabase.from('audit_logs').insert({
          business_id: business.id,
          user_id: user?.id,
          entity_type: 'expense',
          entity_id: id,
          action: 'delete'
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
      queryClient.invalidateQueries({ queryKey: ['expense-summary'] });
      toast.success('Expense deleted successfully');
    },
    onError: (error) => {
      toast.error('Failed to delete expense: ' + error.message);
    }
  });
}
