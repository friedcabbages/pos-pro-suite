import { createContext, useContext, useEffect, useState, ReactNode, useCallback, useRef, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './AuthContext';

type AppRole = 'owner' | 'admin' | 'cashier';
type BusinessStatus = 'trial' | 'active' | 'expired' | 'suspended';

interface Business {
  id: string;
  name: string;
  currency: string;
  tax_rate: number;
  logo_url: string | null;
  address: string | null;
  phone: string | null;
  email: string | null;
  status: BusinessStatus;
  trial_end_at: string | null;
}

interface Branch {
  id: string;
  business_id: string;
  name: string;
  address: string | null;
  phone: string | null;
  is_active: boolean;
}

interface Warehouse {
  id: string;
  branch_id: string;
  name: string;
  address: string | null;
  is_active: boolean;
}

interface UserRole {
  id: string;
  user_id: string;
  business_id: string;
  branch_id: string | null;
  role: AppRole;
}

interface BusinessContextType {
  business: Business | null;
  branch: Branch | null;
  warehouse: Warehouse | null;
  userRole: UserRole | null;
  branches: Branch[];
  warehouses: Warehouse[];
  loading: boolean;
  isOwner: boolean;
  isAdmin: boolean;
  isCashier: boolean;
  isSuperAdmin: boolean;
  businessStatus: BusinessStatus | null;
  isSubscriptionActive: boolean;
  isTrialExpired: boolean;
  trialDaysRemaining: number | null;
  selectBranch: (branchId: string) => void;
  selectWarehouse: (warehouseId: string) => void;
  refetchBusiness: () => Promise<void>;
  clearBusiness: () => void;
}

const BusinessContext = createContext<BusinessContextType | undefined>(undefined);

export function BusinessProvider({ children }: { children: ReactNode }) {
  const { user, initialized: authInitialized } = useAuth();
  const [business, setBusiness] = useState<Business | null>(null);
  const [branch, setBranch] = useState<Branch | null>(null);
  const [warehouse, setWarehouse] = useState<Warehouse | null>(null);
  const [userRole, setUserRole] = useState<UserRole | null>(null);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const fetchingRef = useRef(false);
  const lastUserIdRef = useRef<string | null>(null);

  const clearBusiness = useCallback(() => {
    console.log('[Business] Clearing state');
    setBusiness(null);
    setBranch(null);
    setWarehouse(null);
    setUserRole(null);
    setBranches([]);
    setWarehouses([]);
    setIsSuperAdmin(false);
  }, []);

  const fetchBusinessData = useCallback(async () => {
    if (fetchingRef.current) {
      console.log('[Business] Fetch already in progress, skipping');
      return;
    }

    if (!user) {
      console.log('[Business] No user, clearing state');
      clearBusiness();
      setLoading(false);
      return;
    }

    fetchingRef.current = true;
    setLoading(true);
    console.log('[Business] Fetching data for user:', user.id);

    try {
      // 1. Check super admin first
      // SECURITY: This check is via edge function which validates JWT and checks super_admins table
      try {
        const { data: adminCheck, error: adminErr } =
          await supabase.functions.invoke('admin-actions', {
            body: { action: 'check_super_admin' },
          });

        // SECURITY: Only set super admin if explicitly true (fail closed)
        if (!adminErr && adminCheck?.is_super_admin === true) {
          console.log('[Business] Super admin detected, skipping business context');
          setIsSuperAdmin(true);

          // Super admin does not need business context
          setUserRole(null);
          setBusiness(null);
          setBranch(null);
          setWarehouse(null);
          setBranches([]);
          setWarehouses([]);

          lastUserIdRef.current = user.id;
          return;
        }
        
        // Not super admin or error - continue with normal flow
        setIsSuperAdmin(false);
      } catch (err) {
        // On any error, assume NOT super admin (fail closed)
        console.error('[Business] Super admin check failed:', err);
        setIsSuperAdmin(false);
      }

      // 2. Normal user flow
      const { data: roleData, error: roleError } = await supabase
        .from('user_roles')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (roleError) {
        console.error('[Business] Role fetch error:', roleError);
        return;
      }

      if (!roleData) {
        console.log('[Business] No role found - user needs onboarding');
        clearBusiness();
        lastUserIdRef.current = user.id;
        return;
      }

      setUserRole(roleData as UserRole);

      // Get business with status and trial_end_at
      const { data: businessData, error: businessError } = await supabase
        .from('businesses')
        .select('id, name, currency, tax_rate, logo_url, address, phone, email, status, trial_end_at')
        .eq('id', roleData.business_id)
        .single();

      if (businessError || !businessData) {
        console.error('[Business] Business fetch error:', businessError);
        clearBusiness();
        lastUserIdRef.current = user.id;
        return;
      }

      console.log('[Business] Found business:', businessData.name, 'Status:', businessData.status);
      setBusiness(businessData as Business);

      // Get all branches for this business
      const { data: branchesData } = await supabase
        .from('branches')
        .select('*')
        .eq('business_id', businessData.id)
        .eq('is_active', true);

      if (branchesData && branchesData.length > 0) {
        setBranches(branchesData as Branch[]);

        const defaultBranch = roleData.branch_id
          ? branchesData.find(b => b.id === roleData.branch_id) || branchesData[0]
          : branchesData[0];

        setBranch(defaultBranch as Branch);

        // Get warehouses for the selected branch
        const { data: warehousesData } = await supabase
          .from('warehouses')
          .select('*')
          .eq('branch_id', defaultBranch.id)
          .eq('is_active', true);

        if (warehousesData && warehousesData.length > 0) {
          setWarehouses(warehousesData as Warehouse[]);
          setWarehouse(warehousesData[0] as Warehouse);
        } else {
          setWarehouses([]);
          setWarehouse(null);
        }
      }

      lastUserIdRef.current = user.id;
    } catch (error) {
      console.error('[Business] Unexpected error:', error);
    } finally {
      setLoading(false);
      fetchingRef.current = false;
    }
  }, [user, clearBusiness]);

  // Only fetch when auth is ready and user changes
  useEffect(() => {
    if (!authInitialized) {
      console.log('[Business] Waiting for auth to initialize');
      return;
    }

    if (!user) {
      console.log('[Business] No user after auth init, clearing');
      clearBusiness();
      lastUserIdRef.current = null;
      setLoading(false);
      return;
    }

    // User changed or first load
    if (lastUserIdRef.current !== user.id) {
      fetchBusinessData();
    }
  }, [user, authInitialized, fetchBusinessData, clearBusiness]);

  const selectBranch = async (branchId: string) => {
    const selectedBranch = branches.find(b => b.id === branchId);
    if (selectedBranch) {
      setBranch(selectedBranch);
      
      // Fetch warehouses for new branch
      const { data: warehousesData } = await supabase
        .from('warehouses')
        .select('*')
        .eq('branch_id', branchId)
        .eq('is_active', true);

      if (warehousesData && warehousesData.length > 0) {
        setWarehouses(warehousesData as Warehouse[]);
        setWarehouse(warehousesData[0] as Warehouse);
      } else {
        setWarehouses([]);
        setWarehouse(null);
      }
    }
  };

  const selectWarehouse = (warehouseId: string) => {
    const selectedWarehouse = warehouses.find(w => w.id === warehouseId);
    if (selectedWarehouse) {
      setWarehouse(selectedWarehouse);
    }
  };

  // Compute subscription status
  const subscriptionStatus = useMemo(() => {
    if (!business) {
      return {
        businessStatus: null as BusinessStatus | null,
        isSubscriptionActive: false,
        isTrialExpired: false,
        trialDaysRemaining: null as number | null,
      };
    }

    const status = business.status;
    const now = new Date();
    const trialEnd = business.trial_end_at ? new Date(business.trial_end_at) : null;

    // Calculate trial days remaining
    let trialDaysRemaining: number | null = null;
    if (status === 'trial' && trialEnd) {
      const diff = Math.ceil((trialEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      trialDaysRemaining = Math.max(0, diff);
    }

    // Check if trial is expired
    const isTrialExpired = status === 'trial' && trialEnd && now >= trialEnd;

    // Subscription is active if status is 'active' OR (status is 'trial' AND trial hasn't expired)
    const isSubscriptionActive = status === 'active' || (status === 'trial' && !isTrialExpired);

    return {
      businessStatus: status,
      isSubscriptionActive,
      isTrialExpired: !!isTrialExpired,
      trialDaysRemaining,
    };
  }, [business]);

  const isOwner = userRole?.role === 'owner';
  const isAdmin = userRole?.role === 'admin' || isOwner;
  const isCashier = userRole?.role === 'cashier';

  return (
    <BusinessContext.Provider value={{
      business,
      branch,
      warehouse,
      userRole,
      branches,
      warehouses,
      loading,
      isOwner,
      isAdmin,
      isCashier,
      isSuperAdmin,
      businessStatus: subscriptionStatus.businessStatus,
      isSubscriptionActive: subscriptionStatus.isSubscriptionActive,
      isTrialExpired: subscriptionStatus.isTrialExpired,
      trialDaysRemaining: subscriptionStatus.trialDaysRemaining,
      selectBranch,
      selectWarehouse,
      refetchBusiness: fetchBusinessData,
      clearBusiness
    }}>
      {children}
    </BusinessContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useBusiness() {
  const context = useContext(BusinessContext);
  if (context === undefined) {
    throw new Error('useBusiness must be used within a BusinessProvider');
  }
  return context;
}
