import { createContext, useContext, useEffect, useState, ReactNode, useCallback, useRef, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './AuthContext';
import { useImpersonation } from './ImpersonationContext';

type AppRole = 'owner' | 'admin' | 'cashier';
type BusinessStatus = 'trial' | 'active' | 'expired' | 'suspended';
type BusinessType = 'retail' | 'fnb' | 'service' | 'venue';

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
  business_type: BusinessType;
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
  superAdminChecked: boolean;
  businessStatus: BusinessStatus | null;
  isSubscriptionActive: boolean;
  isTrialExpired: boolean;
  trialDaysRemaining: number | null;
  selectBranch: (branchId: string) => void;
  selectWarehouse: (warehouseId: string) => void;
  refetchBusiness: () => Promise<void>;
  clearBusiness: (userId?: string) => void;
}

const BusinessContext = createContext<BusinessContextType | undefined>(undefined);

const CACHE_KEY_PREFIX = 'pospro.business_cache.';
const CACHE_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

type BusinessCacheData = {
  business: Business;
  userRole: UserRole;
  branches: Branch[];
  warehouses: Warehouse[];
  branch: Branch | null;
  warehouse: Warehouse | null;
  savedAt: string;
};

function getCacheKey(userId: string): string {
  return `${CACHE_KEY_PREFIX}${userId}`;
}

function saveBusinessCache(userId: string, data: Omit<BusinessCacheData, 'savedAt'>): void {
  try {
    const payload: BusinessCacheData = { ...data, savedAt: new Date().toISOString() };
    localStorage.setItem(getCacheKey(userId), JSON.stringify(payload));
  } catch {
    // Ignore storage errors
  }
}

function loadBusinessCache(userId: string): BusinessCacheData | null {
  try {
    const raw = localStorage.getItem(getCacheKey(userId));
    if (!raw) return null;
    const data = JSON.parse(raw) as BusinessCacheData;
    const savedAt = data.savedAt ? new Date(data.savedAt).getTime() : 0;
    if (Date.now() - savedAt > CACHE_MAX_AGE_MS) return null;
    if (!data.business || !data.userRole) return null;
    return data;
  } catch {
    return null;
  }
}

function clearBusinessCache(userId: string | null): void {
  try {
    if (userId) {
      localStorage.removeItem(getCacheKey(userId));
    } else {
      Object.keys(localStorage).forEach((key) => {
        if (key.startsWith(CACHE_KEY_PREFIX)) localStorage.removeItem(key);
      });
    }
  } catch {
    // Ignore storage errors
  }
}

export function BusinessProvider({ children }: { children: ReactNode }) {
  const { user, initialized: authInitialized } = useAuth();
  const { isImpersonating, businessId: impersonationBusinessId } = useImpersonation();
  const [business, setBusiness] = useState<Business | null>(null);
  const [branch, setBranch] = useState<Branch | null>(null);
  const [warehouse, setWarehouse] = useState<Warehouse | null>(null);
  const [userRole, setUserRole] = useState<UserRole | null>(null);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [superAdminChecked, setSuperAdminChecked] = useState(false);
  const fetchingRef = useRef(false);
  const lastUserIdRef = useRef<string | null>(null);
  const lastImpersonationBusinessIdRef = useRef<string | null>(null);

  const clearBusiness = useCallback((userId?: string) => {
    console.log('[Business] Clearing state');
    clearBusinessCache(userId ?? lastUserIdRef.current ?? null);
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
      setSuperAdminChecked(false);
      setLoading(false);
      return;
    }

    fetchingRef.current = true;
    setLoading(true);
    console.log('[Business] Fetching data for user:', user.id);

    // Offline: try restore from cache first
    if (typeof navigator !== 'undefined' && !navigator.onLine && !isImpersonating) {
      const cached = loadBusinessCache(user.id);
      if (cached) {
        console.log('[Business] Offline - restored from cache');
        setBusiness(cached.business);
        setUserRole(cached.userRole);
        setBranches(cached.branches);
        setWarehouses(cached.warehouses);
        setBranch(cached.branch);
        setWarehouse(cached.warehouse);
        lastUserIdRef.current = user.id;
        setLoading(false);
        fetchingRef.current = false;
        return;
      }
    }

    try {
      // 1. Check super admin first (skip if impersonating)
      // SECURITY: This check is via edge function which validates JWT and checks super_admins table
      // During impersonation, skip superadmin check and load business data directly
      if (!isImpersonating) {
        try {
          const { data: adminCheck, error: adminErr } =
            await supabase.functions.invoke('admin-actions', {
              body: { action: 'check_super_admin' },
            });

          // SECURITY: Only set super admin if explicitly true (fail closed)
          if (!adminErr && adminCheck?.is_super_admin === true) {
            console.log('[Business] Super admin detected, skipping business context');
            setIsSuperAdmin(true);
            setSuperAdminChecked(true);

            // Super admin does not need business context
            setUserRole(null);
            setBusiness(null);
            setBranch(null);
            setWarehouse(null);
            setBranches([]);
            setWarehouses([]);

            lastUserIdRef.current = user.id;
            fetchingRef.current = false;
            setLoading(false);
            return;
          }
          
          // Not super admin or error - continue with normal flow
          setIsSuperAdmin(false);
          setSuperAdminChecked(true);
        } catch (err) {
          // On any error, assume NOT super admin (fail closed)
          console.error('[Business] Super admin check failed:', err);
          setIsSuperAdmin(false);
          setSuperAdminChecked(true);
        }
      } else {
        setIsSuperAdmin(false);
        setSuperAdminChecked(true);
      }

      // 2. Normal user flow (or impersonation flow)
      let roleData: UserRole | null = null;
      let targetBusinessId: string | null = null;

      if (isImpersonating && impersonationBusinessId) {
        // During impersonation, use edge function to get business data (bypasses RLS)
        // This is necessary because superadmin doesn't have direct access to businesses table via RLS
        const { data: businessResponse, error: businessLookupError } = await supabase.functions.invoke('admin-actions', {
          body: { action: 'get_business_for_impersonation', business_id: impersonationBusinessId },
        });

        if (businessLookupError || !businessResponse?.business) {
          console.error('[Business] Impersonation business lookup error:', businessLookupError);
          fetchingRef.current = false;
          setLoading(false);
          return;
        }

        const impersonationBusiness = businessResponse.business;

        // Find role for the owner of this business, or any role in this business
        let impersonationRoleData = null;
        let impersonationRoleError = null;
        
        // First try to find owner's role
        const { data: ownerRoleData, error: ownerRoleError } = await supabase
          .from('user_roles')
          .select('*')
          .eq('business_id', impersonationBusinessId)
          .eq('user_id', impersonationBusiness.owner_id)
          .maybeSingle();

        if (!ownerRoleError && ownerRoleData) {
          impersonationRoleData = ownerRoleData;
        } else {
          // If owner role not found, try to find any role in this business
          const { data: anyRoleData, error: anyRoleError } = await supabase
            .from('user_roles')
            .select('*')
            .eq('business_id', impersonationBusinessId)
            .order('role', { ascending: true }) // owner first, then admin, then cashier
            .limit(1)
            .maybeSingle();

          if (!anyRoleError && anyRoleData) {
            impersonationRoleData = anyRoleData;
          } else {
            impersonationRoleError = anyRoleError || ownerRoleError;
          }
        }

        if (impersonationRoleError) {
          console.error('[Business] Impersonation role fetch error:', impersonationRoleError);
          fetchingRef.current = false;
          setLoading(false);
          return;
        }

        // If no role found, create a dummy role for impersonation purposes
        if (!impersonationRoleData) {
          console.log('[Business] No role found for impersonated business, creating dummy role');
          // Create a dummy role object for impersonation
          impersonationRoleData = {
            id: 'impersonation-dummy',
            user_id: impersonationBusiness.owner_id || user.id,
            business_id: impersonationBusinessId,
            branch_id: null,
            role: 'owner' as AppRole,
          } as UserRole;
        }

        roleData = impersonationRoleData as UserRole;
        targetBusinessId = impersonationBusinessId;

        // Set role and use business data from edge function response
        setUserRole(roleData);
        setBusiness(impersonationBusiness as Business);

        // Get all branches for this business
        const { data: branchesData } = await supabase
          .from('branches')
          .select('*')
          .eq('business_id', impersonationBusinessId)
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
        } else {
          setBranches([]);
          setBranch(null);
          setWarehouses([]);
          setWarehouse(null);
        }

        lastUserIdRef.current = user.id;
        fetchingRef.current = false;
        setLoading(false);
        return;
      } else {
        // Normal flow: get role for current user
        const { data: normalRoleData, error: roleError } = await supabase
          .from('user_roles')
          .select('*')
          .eq('user_id', user.id)
          .maybeSingle();

        if (roleError) {
          console.error('[Business] Role fetch error:', roleError);
          if (!navigator.onLine) {
            const cached = loadBusinessCache(user.id);
            if (cached) {
              console.log('[Business] Offline - restored from cache after role error');
              setBusiness(cached.business);
              setUserRole(cached.userRole);
              setBranches(cached.branches);
              setWarehouses(cached.warehouses);
              setBranch(cached.branch);
              setWarehouse(cached.warehouse);
              lastUserIdRef.current = user.id;
            } else {
              clearBusiness(user.id);
            }
          } else {
            clearBusiness(user.id);
          }
          fetchingRef.current = false;
          setLoading(false);
          return;
        }

        if (!normalRoleData) {
          console.log('[Business] No role found - user needs onboarding');
          clearBusiness(user.id);
          lastUserIdRef.current = user.id;
          fetchingRef.current = false;
          setLoading(false);
          return;
        }

        roleData = normalRoleData as UserRole;
        targetBusinessId = roleData.business_id;
      }

      setUserRole(roleData);

      // Get business with status, trial_end_at, and business_type
      const { data: businessData, error: businessError } = await supabase
        .from('businesses')
        .select('id, name, currency, tax_rate, logo_url, address, phone, email, status, trial_end_at, business_type')
        .eq('id', targetBusinessId)
        .single();

      if (businessError || !businessData) {
        console.error('[Business] Business fetch error:', businessError);
        if (!navigator.onLine) {
          const cached = loadBusinessCache(user.id);
          if (cached) {
            console.log('[Business] Offline - restored from cache after business error');
            setBusiness(cached.business);
            setUserRole(cached.userRole);
            setBranches(cached.branches);
            setWarehouses(cached.warehouses);
            setBranch(cached.branch);
            setWarehouse(cached.warehouse);
            lastUserIdRef.current = user.id;
          } else {
            clearBusiness(user.id);
          }
        } else {
          clearBusiness(user.id);
        }
        lastUserIdRef.current = user.id;
        fetchingRef.current = false;
        setLoading(false);
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

      let cachedBranch: Branch | null = null;
      let cachedWarehouses: Warehouse[] = [];

      if (branchesData && branchesData.length > 0) {
        setBranches(branchesData as Branch[]);

        const defaultBranch = roleData.branch_id
          ? branchesData.find(b => b.id === roleData.branch_id) || branchesData[0]
          : branchesData[0];

        setBranch(defaultBranch as Branch);
        cachedBranch = defaultBranch as Branch;

        // Get warehouses for the selected branch
        const { data: warehousesData } = await supabase
          .from('warehouses')
          .select('*')
          .eq('branch_id', defaultBranch.id)
          .eq('is_active', true);

        if (warehousesData && warehousesData.length > 0) {
          setWarehouses(warehousesData as Warehouse[]);
          setWarehouse(warehousesData[0] as Warehouse);
          cachedWarehouses = warehousesData as Warehouse[];
        } else {
          setWarehouses([]);
          setWarehouse(null);
        }
      }

      lastUserIdRef.current = user.id;

      // Save to cache for offline use
      saveBusinessCache(user.id, {
        business: businessData as Business,
        userRole: roleData,
        branches: (branchesData ?? []) as Branch[],
        warehouses: cachedWarehouses,
        branch: cachedBranch,
        warehouse: cachedWarehouses.length > 0 ? cachedWarehouses[0] : null,
      });
    } catch (error) {
      console.error('[Business] Unexpected error:', error);
      if (!navigator.onLine && user) {
        const cached = loadBusinessCache(user.id);
        if (cached) {
          console.log('[Business] Offline - restored from cache after unexpected error');
          setBusiness(cached.business);
          setUserRole(cached.userRole);
          setBranches(cached.branches);
          setWarehouses(cached.warehouses);
          setBranch(cached.branch);
          setWarehouse(cached.warehouse);
          lastUserIdRef.current = user.id;
        }
      }
    } finally {
      setLoading(false);
      fetchingRef.current = false;
    }
  }, [user, clearBusiness, isImpersonating, impersonationBusinessId]);

  // Only fetch when auth is ready and user changes, or when impersonation state changes
  useEffect(() => {
    if (!authInitialized) {
      console.log('[Business] Waiting for auth to initialize');
      return;
    }

    if (!user) {
      console.log('[Business] No user after auth init, clearing');
      clearBusiness();
      lastUserIdRef.current = null;
      setSuperAdminChecked(false);
      setLoading(false);
      return;
    }

    // User changed, first load, or impersonation state changed
    const userChanged = lastUserIdRef.current !== user.id;
    const impersonationChanged = isImpersonating && lastImpersonationBusinessIdRef.current !== impersonationBusinessId;
    const impersonationStopped = !isImpersonating && lastImpersonationBusinessIdRef.current !== null;
    
    if (userChanged || impersonationChanged || impersonationStopped) {
      // Update refs before fetching
      if (isImpersonating && impersonationBusinessId) {
        lastImpersonationBusinessIdRef.current = impersonationBusinessId;
      } else if (!isImpersonating) {
        lastImpersonationBusinessIdRef.current = null;
      }
      
      fetchBusinessData();
    }
  }, [user, authInitialized, fetchBusinessData, clearBusiness, isImpersonating, impersonationBusinessId]);

  // Refetch when coming back online
  useEffect(() => {
    const onOnline = () => {
      if (user && !isImpersonating) {
        console.log('[Business] Back online - refetching');
        void fetchBusinessData();
      }
    };
    window.addEventListener('online', onOnline);
    return () => window.removeEventListener('online', onOnline);
  }, [user, isImpersonating, fetchBusinessData]);

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
      superAdminChecked,
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
