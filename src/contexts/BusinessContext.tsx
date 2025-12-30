import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './AuthContext';

type AppRole = 'owner' | 'admin' | 'cashier';

interface Business {
  id: string;
  name: string;
  currency: string;
  tax_rate: number;
  logo_url: string | null;
  address: string | null;
  phone: string | null;
  email: string | null;
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
  selectBranch: (branchId: string) => void;
  selectWarehouse: (warehouseId: string) => void;
  refetchBusiness: () => Promise<void>;
}

const BusinessContext = createContext<BusinessContextType | undefined>(undefined);

export function BusinessProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [business, setBusiness] = useState<Business | null>(null);
  const [branch, setBranch] = useState<Branch | null>(null);
  const [warehouse, setWarehouse] = useState<Warehouse | null>(null);
  const [userRole, setUserRole] = useState<UserRole | null>(null);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchBusinessData = async () => {
    if (!user) {
      setBusiness(null);
      setBranch(null);
      setWarehouse(null);
      setUserRole(null);
      setBranches([]);
      setWarehouses([]);
      setLoading(false);
      return;
    }

    setLoading(true);

    try {
      // Get user role
      const { data: roleData } = await supabase
        .from('user_roles')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (roleData) {
        setUserRole(roleData as UserRole);

        // Get business
        const { data: businessData } = await supabase
          .from('businesses')
          .select('*')
          .eq('id', roleData.business_id)
          .single();

        if (businessData) {
          setBusiness(businessData as Business);

          // Get all branches for this business
          const { data: branchesData } = await supabase
            .from('branches')
            .select('*')
            .eq('business_id', businessData.id)
            .eq('is_active', true);

          if (branchesData && branchesData.length > 0) {
            setBranches(branchesData as Branch[]);
            // Set default branch
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
            }
          }
        }
      }
    } catch (error) {
      console.error('Error fetching business data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBusinessData();
  }, [user]);

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
      selectBranch,
      selectWarehouse,
      refetchBusiness: fetchBusinessData
    }}>
      {children}
    </BusinessContext.Provider>
  );
}

export function useBusiness() {
  const context = useContext(BusinessContext);
  if (context === undefined) {
    throw new Error('useBusiness must be used within a BusinessProvider');
  }
  return context;
}
