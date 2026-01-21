import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useBusiness } from '@/contexts/BusinessContext';
import { toast } from 'sonner';

export interface SubscriptionPlan {
  id: string;
  name: string;
  display_name: string;
  price_monthly: number;
  price_yearly: number;
  max_users: number | null;
  max_products: number | null;
  max_branches: number | null;
  features: string[];
  sort_order: number;
  is_active: boolean;
}

export interface BusinessSubscription {
  id: string;
  business_id: string;
  plan_id: string;
  billing_cycle: 'monthly' | 'yearly';
  current_period_start: string;
  current_period_end: string;
  cancel_at_period_end: boolean;
  canceled_at: string | null;
  plan?: SubscriptionPlan;
}

export interface Invoice {
  id: string;
  business_id: string;
  invoice_number: string;
  amount: number;
  currency: string;
  plan_name: string;
  status: 'paid' | 'unpaid' | 'pending';
  billing_period_start: string;
  billing_period_end: string;
  paid_at: string | null;
  notes: string | null;
  created_at: string;
}

// Fetch all available subscription plans
export function useSubscriptionPlans() {
  return useQuery({
    queryKey: ['subscription-plans'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('subscription_plans')
        .select('*')
        .eq('is_active', true)
        .order('sort_order', { ascending: true });
      
      if (error) throw error;
      return data as SubscriptionPlan[];
    },
  });
}

// Fetch current business subscription
export function useCurrentSubscription() {
  const { business } = useBusiness();
  
  return useQuery({
    queryKey: ['current-subscription', business?.id],
    queryFn: async () => {
      if (!business?.id) return null;
      
      const { data, error } = await supabase
        .from('business_subscriptions')
        .select(`
          *,
          plan:subscription_plans(*)
        `)
        .eq('business_id', business.id)
        .maybeSingle();
      
      if (error) throw error;
      return data as BusinessSubscription | null;
    },
    enabled: !!business?.id,
  });
}

// Fetch invoices for current business
export function useInvoices() {
  const { business } = useBusiness();
  
  return useQuery({
    queryKey: ['invoices', business?.id],
    queryFn: async () => {
      if (!business?.id) return [];
      
      const { data, error } = await supabase
        .from('invoices')
        .select('*')
        .eq('business_id', business.id)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as Invoice[];
    },
    enabled: !!business?.id,
  });
}

// Request plan upgrade (creates invoice for manual payment)
export function useRequestUpgrade() {
  const queryClient = useQueryClient();
  const { business } = useBusiness();
  
  return useMutation({
    mutationFn: async ({ planId, billingCycle }: { planId: string; billingCycle: 'monthly' | 'yearly' }) => {
      if (!business?.id) throw new Error('No business found');
      
      // Get plan details
      const { data: plan } = await supabase
        .from('subscription_plans')
        .select('*')
        .eq('id', planId)
        .single();
      
      if (!plan) throw new Error('Plan not found');
      
      const amount = billingCycle === 'yearly' ? plan.price_yearly : plan.price_monthly;
      const periodStart = new Date();
      const periodEnd = new Date();
      periodEnd.setMonth(periodEnd.getMonth() + (billingCycle === 'yearly' ? 12 : 1));
      
      // Create invoice
      const invoiceNumber = `INV-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
      
      const { error } = await supabase
        .from('invoices')
        .insert({
          business_id: business.id,
          invoice_number: invoiceNumber,
          amount,
          currency: business.currency || 'USD',
          plan_name: plan.display_name,
          status: 'pending',
          billing_period_start: periodStart.toISOString(),
          billing_period_end: periodEnd.toISOString(),
        });
      
      if (error) throw error;
      
      // Log activity
      await supabase.from('business_activity_logs').insert({
        business_id: business.id,
        action: 'upgrade_requested',
        entity_type: 'subscription',
        entity_id: planId,
        description: `Requested upgrade to ${plan.display_name} (${billingCycle})`,
      });
      
      return { invoiceNumber };
    },
    onSuccess: () => {
      toast.success('Upgrade request submitted. Please complete payment to activate your plan.');
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
    },
    onError: (error: Error) => toast.error(error.message),
  });
}

// Get subscription status info
export function useSubscriptionStatus() {
  const businessContext = useBusiness();
  const { data: subscription } = useCurrentSubscription();
  const { data: plans } = useSubscriptionPlans();
  
  const currentPlan = subscription?.plan || plans?.find(p => p.name === 'basic');
  
  // Calculate status from business data
  const businessStatus = businessContext.business?.status || 'trial';
  const trialEndAt = businessContext.business?.trial_end_at;
  const trialDaysRemaining = trialEndAt 
    ? Math.max(0, Math.ceil((new Date(trialEndAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
    : null;
  const isTrialExpired = businessStatus === 'trial' && trialDaysRemaining !== null && trialDaysRemaining <= 0;
  
  return {
    business: businessContext.business,
    subscription,
    currentPlan,
    plans,
    businessStatus,
    isTrialExpired,
    trialDaysRemaining,
    isSubscriptionActive: businessStatus === 'active' || (businessStatus === 'trial' && !isTrialExpired),
  };
}
