import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useBusiness } from "@/contexts/BusinessContext";
import { Loader2 } from "lucide-react";

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { user, loading: authLoading, initialized: authInitialized } = useAuth();
  const { business, loading: businessLoading } = useBusiness();
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

  // Wait for business data to load before deciding on onboarding
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

  // User logged in but no business - redirect to onboarding
  if (!business) {
    console.log('[ProtectedRoute] No business, redirecting to /onboarding');
    return <Navigate to="/onboarding" replace />;
  }

  // All checks passed - render children
  return <>{children}</>;
}
