import { Outlet, Link, useLocation, useNavigate, Navigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { 
  Shield, 
  Building2, 
  Users, 
  FileText, 
  Settings,
  LogOut,
  ChevronRight,
  Loader2,
  AlertTriangle,
  LayoutDashboard,
  ShieldX
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useState, useEffect } from "react";
import { useAuth } from '@/contexts/AuthContext';
import { useSuperAdminCheck } from '@/hooks/useSuperAdminCheck';
import { useBusiness } from "@/contexts/BusinessContext";
import { supabase } from '@/integrations/supabase/client';

/**
 * SuperAdminLayout - SECURITY CRITICAL
 * 
 * This layout ONLY renders for users who are confirmed super admins.
 * 
 * Security checks:
 * 1. User must be authenticated (via AuthContext)
 * 2. User must have entry in super_admins table (verified via edge function)
 * 3. All checks happen BEFORE any admin UI is rendered
 * 
 * NEVER:
 * - Check email domain for access
 * - Allow access if check fails
 * - Render admin UI during loading
 */
export default function SuperAdminLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const [loggingOut, setLoggingOut] = useState(false);
  const { user, signOut, loading: authLoading, initialized: authInitialized } = useAuth();
  const { data: isSuperAdmin, isLoading: checkingAdmin, error: superAdminError, isFetched } = useSuperAdminCheck();
  const { clearBusiness } = useBusiness();
  const [accessDeniedLogged, setAccessDeniedLogged] = useState(false);


  // Log access denied attempts for security auditing
  useEffect(() => {
    if (isFetched && !checkingAdmin && !isSuperAdmin && user && !accessDeniedLogged) {
      console.warn('[SuperAdminLayout] SECURITY: Non-super-admin attempted to access /admin:', user.email);
      setAccessDeniedLogged(true);
      
      // Log to global audit (fire and forget)
      supabase.functions.invoke('admin-actions', {
        body: { 
          action: 'log_access_denied',
          payload: { 
            attempted_path: location.pathname,
            user_email: user.email 
          }
        }
      }).catch(() => {
        // Ignore errors - this is just audit logging
      });
    }
  }, [isFetched, checkingAdmin, isSuperAdmin, user, location.pathname, accessDeniedLogged]);

  const handleLogout = async (e?: React.MouseEvent) => {
    e?.preventDefault();
    e?.stopPropagation();
    setLoggingOut(true);
    try {
      // signOut already handles redirect to /auth immediately
      // Don't call clearBusiness() as it might trigger re-renders that cause redirects
      await signOut();
    } catch (error) {
      console.error('[SuperAdminLayout] Logout error:', error);
      // Fallback redirect if signOut fails
      window.location.href = "/auth";
    }
    // Don't set loggingOut to false - redirect already happened
  };

  const navItems = [
    { label: 'Dashboard', path: '/admin', icon: LayoutDashboard },
    { label: 'Businesses', path: '/admin/businesses', icon: Building2 },
    { label: 'Users', path: '/admin/users', icon: Users },
    { label: 'Audit Logs', path: '/admin/logs', icon: FileText },
    { label: 'Settings', path: '/admin/settings', icon: Settings },
  ];

  const isActive = (path: string) => {
    if (path === '/admin') {
      return location.pathname === '/admin';
    }
    return location.pathname.startsWith(path);
  };

  const logoutInProgress = (() => {
    try {
      return localStorage.getItem("logout_in_progress") === "1";
    } catch {
      return false;
    }
  })();

  // SECURITY: Wait for auth to initialize - show nothing
  if (!authInitialized || authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          <p className="text-sm text-muted-foreground">Checking authentication...</p>
        </div>
      </div>
    );
  }

  // SECURITY: No user - redirect to auth immediately
  if (!user) {
    console.log('[SuperAdminLayout] No user, redirecting to /auth');
    return <Navigate to="/auth" state={{ from: location }} replace />;
  }

  // SECURITY: Still checking super admin status - show loading, NOT admin UI
  if (checkingAdmin || !isFetched) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <Shield className="h-8 w-8 text-muted-foreground animate-pulse" />
          <p className="text-sm text-muted-foreground">Verifying admin access...</p>
        </div>
      </div>
    );
  }

  // SECURITY: Check error or not super admin - HARD BLOCK
  // This includes: error from API, false from API, or any other non-true value
  if (superAdminError || isSuperAdmin !== true) {
    console.warn('[SuperAdminLayout] Access denied - isSuperAdmin:', isSuperAdmin, 'error:', superAdminError);
    
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4 text-center p-6">
          <div className="w-20 h-20 bg-destructive/10 rounded-full flex items-center justify-center">
            <ShieldX className="h-10 w-10 text-destructive" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">Access Denied</h1>
          <p className="text-muted-foreground max-w-md">
            You do not have super admin privileges. 
            This area is restricted to authorized personnel only.
          </p>
          <p className="text-xs text-muted-foreground">
            This access attempt has been logged for security review.
          </p>
          <div className="flex gap-3 mt-4">
            <Button variant="outline" onClick={() => navigate('/')}>
              Go to Home
            </Button>
            <Button onClick={handleLogout}>
              Sign Out
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // SECURITY: Only reach here if isSuperAdmin === true
  console.log('[SuperAdminLayout] Super admin verified, rendering admin UI');

  return (
    <div className="min-h-screen bg-background flex">
      {/* Sidebar */}
      <aside className="w-64 bg-card border-r border-border flex flex-col">
        <div className="p-4 border-b border-border">
          <Link to="/admin" className="flex items-center gap-2">
            <div className="w-8 h-8 bg-destructive rounded-lg flex items-center justify-center">
              <Shield className="h-5 w-5 text-destructive-foreground" />
            </div>
            <div>
              <span className="font-bold text-foreground">Super Admin</span>
              <p className="text-xs text-muted-foreground">Internal Only</p>
            </div>
          </Link>
        </div>

        <nav className="flex-1 p-4">
          <ul className="space-y-1">
            {navItems.map((item) => (
              <li key={item.path}>
                <Link
                  to={item.path}
                  className={cn(
                    'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                    isActive(item.path)
                      ? 'bg-primary text-primary-foreground'
                      : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                  )}
                >
                  <item.icon className="h-4 w-4" />
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <div className="p-4 border-t border-border space-y-2">
          <div className="px-3 py-2 text-xs text-muted-foreground">
            Logged in as: <span className="font-medium">{user.email}</span>
          </div>
          <Button 
            variant="ghost" 
            className="w-full justify-start text-muted-foreground"
            onClick={() => navigate('/')}
          >
            <LogOut className="h-4 w-4 mr-2" />
            Back to Hub
          </Button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Top Bar */}
       <header className="h-14 border-b border-border bg-card flex items-center px-6">
  <div className="flex items-center gap-2 text-sm text-muted-foreground">
    <Shield className="h-4 w-4" />
    <span>Super Admin</span>
    <ChevronRight className="h-4 w-4" />
    <span className="text-foreground font-medium">
      {navItems.find(item => isActive(item.path))?.label || 'Dashboard'}
    </span>
  </div>

  <Button
    variant="ghost"
    size="sm"
    onClick={handleLogout}
    disabled={loggingOut}
    className="ml-auto text-muted-foreground hover:text-foreground"
  >
    <LogOut className="h-4 w-4 mr-2" />
    {loggingOut ? 'Logging out...' : 'Logout'}
  </Button>
</header>


        {/* Page Content */}
        <main className="flex-1 p-6 overflow-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
