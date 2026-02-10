import { useEffect, useState } from "react";
import { useNavigate, Navigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/contexts/AuthContext";
import { useBusiness } from "@/contexts/BusinessContext";
import { useImpersonation } from "@/contexts/ImpersonationContext";
import { useToast } from "@/hooks/use-toast";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Loader2, Store } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { getSessionIdentifier, getSessionLabel } from "@/lib/session";

function getTokenMeta(token?: string) {
  if (!token) return {};
  try {
    const payload = token.split(".")[1];
    if (!payload) return {};
    const base64 = payload.replace(/-/g, "+").replace(/_/g, "/");
    const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), "=");
    const json = atob(padded);
    const data = JSON.parse(json) as Record<string, unknown>;
    return {
      iss: typeof data.iss === "string" ? data.iss : null,
      aud: typeof data.aud === "string" ? data.aud : null,
      ref: typeof data.ref === "string" ? data.ref : null,
    };
  } catch {
    return {};
  }
}

export default function Auth() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [sessionConflict, setSessionConflict] = useState(false);
  const [forceLoading, setForceLoading] = useState(false);
  const [pendingSessionId, setPendingSessionId] = useState("");
  const { user, session, signIn, initialized: authInitialized, loading: authLoading } = useAuth();
  const { business, loading: businessLoading, isSuperAdmin, superAdminChecked } = useBusiness();
  const { isImpersonating } = useImpersonation();
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();

  const sessionConflictFlag = (() => {
    try {
      return localStorage.getItem("session_conflict") === "1";
    } catch {
      return false;
    }
  })();
  const sessionGuardPaused = (() => {
    try {
      return localStorage.getItem("session_guard_pause") === "1";
    } catch {
      return false;
    }
  })();

  useEffect(() => {
    try {
      const flag = localStorage.getItem("session_conflict");
      const storedPending = localStorage.getItem("session_conflict_pending");
      if (storedPending) {
        setPendingSessionId(storedPending);
      }
      if (flag === "1") {
        setSessionConflict(true);
        try {
          localStorage.removeItem("session_guard_pause");
        } catch {
          // ignore
        }
      }
    } catch {
      // ignore
    }
  }, []);


  // Get redirect destination
  const from = (location.state as { from?: { pathname: string } })?.from?.pathname || "/";

  useEffect(() => {
    try {
      const displaced = localStorage.getItem("session_displaced");
      if (displaced) {
        localStorage.removeItem("session_displaced");
        toast({
          title: "Signed out",
          description: "You were logged out because your account was used on another device.",
        });
      }
    } catch {
      // ignore
    }
  }, [toast]);

  // Check if logout is in progress - don't redirect to onboarding during logout
  const logoutInProgress = (() => {
    try {
      return localStorage.getItem("logout_in_progress") === "1";
    } catch {
      return false;
    }
  })();

  // If logout is in progress, wait for auth to fully clear then show login
  if (logoutInProgress) {
    if (authInitialized && !authLoading && !user) {
      try {
        localStorage.removeItem("logout_in_progress");
      } catch {
        // Ignore
      }
    } else {
      return (
        <div className="flex min-h-screen items-center justify-center bg-background">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      );
    }
  }

  // If already logged in, redirect appropriately
  // Since signOut uses window.location.href (immediate redirect), no race condition should occur
  if (authInitialized && !authLoading && user && !sessionConflict && !sessionConflictFlag && !sessionGuardPaused) {
    
    // Wait for business check + super admin check
    if (businessLoading || !superAdminChecked) {
      return (
        <div className="flex min-h-screen items-center justify-center bg-background">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      );
    }
    
    // Skip admin redirect if impersonating
    if (isSuperAdmin && !isImpersonating) {
      return <Navigate to="/admin" replace />;
    }

    // Redirect based on business state and business type
    // During impersonation, don't redirect - let the navigate from handleImpersonate handle it
    if (business) {
      // During impersonation, skip auto-redirect to let user stay on /app (dashboard)
      if (isImpersonating) {
        // Don't redirect during impersonation - let the navigate from handleImpersonate handle it
        // Return null to prevent any redirect
        return null;
      }
      
      // Determine landing route based on business_type (standalone prefix-based)
      const getLandingRoute = (businessType: string): string => {
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
      
      const landingRoute = getLandingRoute(business.business_type);
      console.log('[Auth] Already logged in with business type:', business.business_type, 'redirecting to', landingRoute);
      return <Navigate to={landingRoute} replace />;
    } else {
      console.log('[Auth] Logged in but no business - redirecting to onboarding');
      return <Navigate to="/onboarding" replace />;
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      localStorage.setItem("session_guard_pause", "1");
    } catch {
      // ignore
    }

    try {
      const { error } = await signIn(email, password);
      if (error) {
        toast({
          title: "Login Failed",
          description: error.message,
          variant: "destructive",
        });
        try {
          localStorage.removeItem("session_guard_pause");
        } catch {
          // ignore
        }
      } else {
        const { data: { session } } = await supabase.auth.getSession();
        const sessionId = getSessionIdentifier(session);
        const sessionLabel = getSessionLabel();
        setPendingSessionId(sessionId);
        const functionHeaders = {
          Authorization: `Bearer ${session.access_token}`,
          apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
        };
        const tokenMeta = getTokenMeta(session?.access_token);
        const { data, error: guardError } = await supabase.functions.invoke("session-guard", {
          body: { action: "register", session_id: sessionId, session_label: sessionLabel },
          headers: functionHeaders,
        });
        if (guardError) {
          const status = (guardError as any)?.context?.status ?? null;
        if (status === 409) {
            try {
              localStorage.setItem("session_conflict", "1");
            localStorage.setItem("session_conflict_pending", sessionId);
              localStorage.removeItem("session_guard_pause");
            } catch {
              // ignore
            }
            setSessionConflict(true);
            return;
          }
          toast({
            title: "Login Failed",
            description: guardError.message ?? "Unable to verify session",
            variant: "destructive",
          });
          try {
            localStorage.removeItem("session_guard_pause");
          } catch {
            // ignore
          }
          return;
        }
        if (data?.reason === "session_exists") {
          try {
            localStorage.setItem("session_conflict", "1");
            localStorage.setItem("session_conflict_pending", sessionId);
            localStorage.removeItem("session_guard_pause");
          } catch {
            // ignore
          }
          setSessionConflict(true);
          return;
        }
        try {
          localStorage.removeItem("session_guard_pause");
        } catch {
          // ignore
        }
        navigate("/");
      }
    } catch (err) {
      toast({
        title: "Error",
        description: "An unexpected error occurred",
        variant: "destructive",
      });
      try {
        localStorage.removeItem("session_guard_pause");
      } catch {
        // ignore
      }
    } finally {
      setLoading(false);
    }
  };

  const handleCancelConflict = async () => {
    setSessionConflict(false);
    setPendingSessionId("");
    try {
      localStorage.removeItem("session_conflict");
      localStorage.removeItem("session_guard_pause");
      localStorage.removeItem("session_conflict_pending");
    } catch {
      // ignore
    }
    await supabase.auth.signOut();
  };

  const handleForceLogin = async () => {
    setForceLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!pendingSessionId && session) {
        const inferredSessionId = getSessionIdentifier(session);
        if (inferredSessionId) {
          setPendingSessionId(inferredSessionId);
          try {
            localStorage.setItem("session_conflict_pending", inferredSessionId);
          } catch {
            // ignore
          }
        }
      }
      const functionHeaders = {
        Authorization: `Bearer ${session.access_token}`,
        apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
      };
      const sessionLabel = getSessionLabel();
      let data: any = null;
      let error: any = null;
      try {
        const res = await supabase.functions.invoke("session-guard", {
          body: { action: "force", session_id: pendingSessionId, session_label: sessionLabel },
          headers: functionHeaders,
        });
        data = res.data;
        error = res.error;
      } catch (err) {
        error = err;
      }
      const contextBody = (error as any)?.context?.body;
      const contextBodySnippet =
        typeof contextBody === "string" ? contextBody.slice(0, 160) : null;
      if (error || data?.allowed !== true) {
        console.error("[Auth] Force login failed", error);
        setSessionConflict(false);
        return;
      }
      try {
        localStorage.removeItem("session_conflict");
      } catch {
        // ignore
      }
      try {
        localStorage.removeItem("session_guard_pause");
      } catch {
        // ignore
      }
      try {
        localStorage.removeItem("session_conflict_pending");
      } catch {
        // ignore
      }
      setSessionConflict(false);
      setPendingSessionId("");
      navigate("/");
    } finally {
      setForceLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="w-full max-w-md space-y-8">
        {/* Logo */}
        <div className="text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-primary">
            <Store className="h-8 w-8 text-primary-foreground" />
          </div>
          <h1 className="mt-4 text-3xl font-bold text-foreground">VeloPOS</h1>
          <p className="mt-2 text-muted-foreground">
            Sign in to your account
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="rounded-xl border border-border bg-card p-6 shadow-card">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email or Username</Label>
                <Input
                  id="email"
                  type="text"
                  placeholder="email@example.com or username"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                />
              </div>
            </div>

            <Button
              type="submit"
              variant="glow"
              className="mt-6 w-full"
              disabled={loading}
            >
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Sign In
            </Button>
          </div>
        </form>

        {/* B2B Notice */}
        <p className="text-center text-sm text-muted-foreground">
          Don't have an account?{" "}
          <a
            href="/marketing/pricing"
            className="font-medium text-primary hover:underline"
          >
            Contact Sales
          </a>
        </p>
      </div>

      <AlertDialog open={sessionConflict} onOpenChange={setSessionConflict}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Force login?</AlertDialogTitle>
            <AlertDialogDescription>
              This account is currently signed in on another device. Do you want to force login and sign out the other
              session?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleCancelConflict}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleForceLogin} disabled={forceLoading}>
              {forceLoading ? "Forcing..." : "Force Login"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}