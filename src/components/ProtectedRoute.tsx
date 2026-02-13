import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useBusiness } from "@/contexts/BusinessContext";
import { useImpersonation } from "@/contexts/ImpersonationContext";
import { Loader2 } from "lucide-react";

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: 'owner' | 'admin' | 'cashier';
  adminOnly?: boolean;
}

// Routes that cashiers can access (updated for prefix-based)
const getCashierAllowedRoutes = (businessType: string): string[] => {
  const prefix = businessType === 'retail' ? '/retail' : businessType === 'fnb' ? '/fnb' : '';
  return [
    '/app',
    ...(prefix ? [`${prefix}/pos`, `${prefix}/cashier`, `${prefix}/products`, `${prefix}/menu`] : [])
  ];
};

export function ProtectedRoute({ children, requiredRole, adminOnly }: ProtectedRouteProps) {
  const { user, loading: authLoading, initialized: authInitialized } = useAuth();
  const { 
    business, 
    loading: businessLoading, 
    userRole, 
    isCashier, 
    isAdmin, 
    isOwner,
    isSuperAdmin,
    businessStatus,
    isSubscriptionActive,
    isTrialExpired,
    superAdminChecked
  } = useBusiness();
  const { isImpersonating } = useImpersonation();
  const location = useLocation();


  // Wait for auth to fully initialize before making any decisions
  if (!authInitialized || authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Checking authentication...</p>
        </div>
      </div>
    );
  }

  // Not logged in - redirect to auth
  if (!user) {
    console.log('[ProtectedRoute] No user, redirecting to /auth');
    return <Navigate to="/auth" state={{ from: location }} replace />;
  }

  // Wait for business data to load before deciding
  // During impersonation, wait longer for business data to load
  if (businessLoading || !superAdminChecked || (isImpersonating && (!business || !userRole))) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Loading business data...</p>
        </div>
      </div>
    );
  }

  // Super admin detection - do NOT auto-redirect them anywhere
  // Super admins who want to access /admin routes should go there directly
  // Super admins accessing client routes will be treated as having no business (which is correct)
  // The SuperAdminLayout handles /admin route protection separately
  // BUT: Skip redirect if impersonating (superadmin is impersonating a business)
  if (isSuperAdmin && !isImpersonating) {
    console.log('[ProtectedRoute] Super admin detected accessing client route');
    return <Navigate to="/admin" replace />;
  }

  // Check if logout is in progress - don't redirect to onboarding during logout
  const logoutInProgress = (() => {
    try {
      return localStorage.getItem("logout_in_progress") === "1";
    } catch {
      return false;
    }
  })();

  // User logged in but no business/role - send to onboarding
  // But don't redirect if logout is in progress or if impersonating (business data might still be loading)
  if (!business || !userRole) {
    if (logoutInProgress) {
      return (
        <div className="flex min-h-screen items-center justify-center bg-background">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      );
    }
    // During impersonation, always wait for business data to load (don't redirect to onboarding)
    if (isImpersonating) {
      return (
        <div className="flex min-h-screen items-center justify-center bg-background">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      );
    }
    console.log('[ProtectedRoute] No business/role, redirecting to /onboarding');
    return <Navigate to="/onboarding" replace />;
  }

  // When offline, skip subscription checks (cannot verify with server; allow access with cached data)
  const isOffline = typeof navigator !== 'undefined' && !navigator.onLine;
  if (!isOffline) {
    // Check business status - suspended accounts
    if (businessStatus === 'suspended') {
      console.log('[ProtectedRoute] Business suspended, redirecting to /account-suspended');
      return <Navigate to="/account-suspended" replace />;
    }

    // Check business status - expired or trial expired
    if (businessStatus === 'expired' || isTrialExpired) {
      console.log('[ProtectedRoute] Subscription expired, redirecting to /subscription-required');
      return <Navigate to="/subscription-required" replace />;
    }

    // Ensure subscription is active
    if (!isSubscriptionActive) {
      console.log('[ProtectedRoute] Subscription not active, redirecting to /subscription-required');
      return <Navigate to="/subscription-required" replace />;
    }
  }

  // Business type route enforcement - prefix-based standalone
  const getLandingRouteForBusinessType = (businessType: string): string => {
    switch (businessType) {
      case 'retail':
        return '/retail/pos';
      case 'fnb':
        return '/fnb/dashboard';
      case 'service':
        return '/service/dashboard';
      case 'venue':
        return '/venue/dashboard';
      default:
        return '/retail/pos';
    }
  };

  // Prefix-based route enforcement: users can only access routes matching their business type prefix
  if (business && !isImpersonating) {
    const currentPath = location.pathname;
    const businessType = business.business_type;
    
    // Global routes that everyone can access (not business-type-specific)
    const globalRoutes = ['/app', '/users', '/settings', '/subscription', '/activity'];
    const isGlobalRoute = globalRoutes.some(route => currentPath === route || currentPath.startsWith(route + '/'));
    
    // Public ordering routes (customer-facing)
    const isPublicOrderRoute = currentPath.startsWith('/order/');
    
    if (!isGlobalRoute && !isPublicOrderRoute) {
      // Check prefix-based access
      let allowedPrefix = '';
      switch (businessType) {
        case 'retail':
          allowedPrefix = '/retail';
          break;
        case 'fnb':
          allowedPrefix = '/fnb';
          break;
        case 'service':
          allowedPrefix = '/service';
          break;
        case 'venue':
          allowedPrefix = '/venue';
          break;
        default:
          allowedPrefix = '/retail';
      }
      
      // If accessing old routes (without prefix), redirect to new prefixed route
      const oldRouteMap: Record<string, Record<string, string>> = {
        retail: {
          '/pos': '/retail/pos',
          '/products': '/retail/products',
          '/categories': '/retail/categories',
          '/inventory': '/retail/inventory',
          '/warehouses': '/retail/warehouses',
          '/transactions': '/retail/transactions',
          '/reports': '/retail/reports',
          '/reports-advanced': '/retail/reports-advanced',
          '/suppliers': '/retail/suppliers',
          '/purchase-orders': '/retail/purchase-orders',
          '/expenses': '/retail/expenses',
          '/audit-logs': '/retail/audit-logs',
        },
        fnb: {
          '/fnb': '/fnb/dashboard',
        },
      };
      
      if (oldRouteMap[businessType]?.[currentPath]) {
        const newRoute = oldRouteMap[businessType][currentPath];
        console.log(`[ProtectedRoute] Redirecting old route ${currentPath} to ${newRoute}`);
        return <Navigate to={newRoute} replace />;
      }
      
      // Enforce prefix-based access
      if (!currentPath.startsWith(allowedPrefix + '/') && currentPath !== allowedPrefix) {
        const expectedRoute = getLandingRouteForBusinessType(businessType);
        console.log(`[ProtectedRoute] Business type ${businessType} cannot access ${currentPath}, redirecting to ${expectedRoute}`);
        return <Navigate to={expectedRoute} replace />;
      }
    }
  }

  // Role-based access control
  if (adminOnly && !isAdmin && !isOwner) {
    const defaultRoute = business?.business_type === 'retail' ? '/retail/pos' : business?.business_type === 'fnb' ? '/fnb/cashier' : '/app';
    console.log('[ProtectedRoute] Admin required, user is cashier, redirecting to', defaultRoute);
    return <Navigate to={defaultRoute} replace />;
  }

  if (requiredRole === 'owner' && !isOwner) {
    console.log('[ProtectedRoute] Owner required, redirecting to /access-denied');
    return <Navigate to="/access-denied" replace />;
  }

  // Cashier route restrictions
  if (isCashier && business) {
    const allowedRoutes = getCashierAllowedRoutes(business.business_type);
    if (!allowedRoutes.some(route => location.pathname === route || location.pathname.startsWith(route + '/'))) {
      const defaultRoute = business.business_type === 'retail' ? '/retail/pos' : '/fnb/cashier';
      console.log('[ProtectedRoute] Cashier accessing restricted route, redirecting to', defaultRoute);
      return <Navigate to={defaultRoute} replace />;
    }
  }

  // All checks passed - render children
  return <>{children}</>;
}

// Wrapper for admin-only routes
export function AdminRoute({ children }: { children: React.ReactNode }) {
  return <ProtectedRoute adminOnly>{children}</ProtectedRoute>;
}

// Wrapper for owner-only routes
export function OwnerRoute({ children }: { children: React.ReactNode }) {
  return <ProtectedRoute requiredRole="owner">{children}</ProtectedRoute>;
}
