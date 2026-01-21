import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useBusiness } from '@/contexts/BusinessContext';
import { toast } from 'sonner';

export interface OnboardingProgress {
  id: string;
  business_id: string;
  step_store_info: boolean;
  step_first_product: boolean;
  step_initial_stock: boolean;
  step_first_sale: boolean;
  wizard_completed: boolean;
  wizard_skipped: boolean;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

export type OnboardingStep = 'store_info' | 'first_product' | 'initial_stock' | 'first_sale';

// Fetch onboarding progress
export function useOnboardingProgress() {
  const { business } = useBusiness();
  
  return useQuery({
    queryKey: ['onboarding-progress', business?.id],
    queryFn: async () => {
      if (!business?.id) return null;
      
      const { data, error } = await supabase
        .from('onboarding_progress')
        .select('*')
        .eq('business_id', business.id)
        .maybeSingle();
      
      if (error) throw error;
      return data as OnboardingProgress | null;
    },
    enabled: !!business?.id,
  });
}

// Update onboarding step
export function useUpdateOnboardingStep() {
  const queryClient = useQueryClient();
  const { business } = useBusiness();
  
  return useMutation({
    mutationFn: async ({ step, completed }: { step: OnboardingStep; completed: boolean }) => {
      if (!business?.id) throw new Error('No business found');
      
      const columnMap: Record<OnboardingStep, string> = {
        store_info: 'step_store_info',
        first_product: 'step_first_product',
        initial_stock: 'step_initial_stock',
        first_sale: 'step_first_sale',
      };
      
      // Check if record exists
      const { data: existing } = await supabase
        .from('onboarding_progress')
        .select('id')
        .eq('business_id', business.id)
        .maybeSingle();
      
      if (existing) {
        const { error } = await supabase
          .from('onboarding_progress')
          .update({ [columnMap[step]]: completed, updated_at: new Date().toISOString() })
          .eq('business_id', business.id);
        
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('onboarding_progress')
          .insert({ 
            business_id: business.id, 
            [columnMap[step]]: completed 
          });
        
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['onboarding-progress'] });
    },
  });
}

// Complete or skip onboarding wizard
export function useCompleteOnboarding() {
  const queryClient = useQueryClient();
  const { business } = useBusiness();
  
  return useMutation({
    mutationFn: async ({ skipped = false }: { skipped?: boolean }) => {
      if (!business?.id) throw new Error('No business found');
      
      // Check if record exists
      const { data: existing } = await supabase
        .from('onboarding_progress')
        .select('id')
        .eq('business_id', business.id)
        .maybeSingle();
      
      const updates = skipped 
        ? { wizard_skipped: true }
        : { wizard_completed: true, completed_at: new Date().toISOString() };
      
      if (existing) {
        const { error } = await supabase
          .from('onboarding_progress')
          .update(updates)
          .eq('business_id', business.id);
        
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('onboarding_progress')
          .insert({ business_id: business.id, ...updates });
        
        if (error) throw error;
      }
      
      // Log activity
      await supabase.from('business_activity_logs').insert({
        business_id: business.id,
        action: skipped ? 'onboarding_skipped' : 'onboarding_completed',
        entity_type: 'onboarding',
        description: skipped ? 'User skipped the onboarding wizard' : 'User completed the onboarding wizard',
      });
    },
    onSuccess: (_, { skipped }) => {
      if (!skipped) {
        toast.success('Great job! Your store is ready to go.');
      }
      queryClient.invalidateQueries({ queryKey: ['onboarding-progress'] });
    },
  });
}

// Hook to check if user should see onboarding wizard
export function useShouldShowOnboarding() {
  const { data: progress, isLoading } = useOnboardingProgress();
  
  const shouldShow = !isLoading && progress !== null && 
    !progress.wizard_completed && 
    !progress.wizard_skipped;
  
  const completedSteps = progress ? [
    progress.step_store_info,
    progress.step_first_product,
    progress.step_initial_stock,
    progress.step_first_sale,
  ].filter(Boolean).length : 0;
  
  return {
    shouldShow,
    progress,
    completedSteps,
    totalSteps: 4,
    isLoading,
  };
}
