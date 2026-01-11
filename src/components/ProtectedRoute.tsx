import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useBusiness } from "@/contexts/BusinessContext";
import { Loader2 } from "lucide-react";

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: 'owner' | 'admin' | 'cashier';
  adminOnly?: boolean;
}

// Routes that cashiers can access
const CASHIER_ALLOWED_ROUTES = ['/pos', '/products', '/'];

export function ProtectedRoute({ children, requiredRole, adminOnly }: ProtectedRouteProps) {
  const { user, loading: authLoading, initialized: authInitialized } = useAuth();
  const { 
    business, 
    loading: businessLoading, 
    userRole, 
    isCashier, 
    isAdmin, 
    isOwner,
    businessStatus,
    isSubscriptionActive,
    isTrialExpired
  } = useBusiness();
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
  if (businessLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Loading business data...</p>
        </div>
      </div>
    );
  }

  // User logged in but no business - B2B model requires admin provisioning
  if (!business || !userRole) {
    console.log('[ProtectedRoute] No business/role, redirecting to /no-access');
    return <Navigate to="/no-access" replace />;
  }

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

  // Role-based access control
  if (adminOnly && !isAdmin && !isOwner) {
    console.log('[ProtectedRoute] Admin required, user is cashier, redirecting to /pos');
    return <Navigate to="/pos" replace />;
  }

  if (requiredRole === 'owner' && !isOwner) {
    console.log('[ProtectedRoute] Owner required, redirecting to /');
    return <Navigate to="/" replace />;
  }

  // Cashier route restrictions
  if (isCashier && !CASHIER_ALLOWED_ROUTES.includes(location.pathname)) {
    console.log('[ProtectedRoute] Cashier accessing restricted route, redirecting to /pos');
    return <Navigate to="/pos" replace />;
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