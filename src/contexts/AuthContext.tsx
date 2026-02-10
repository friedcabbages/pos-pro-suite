import { createContext, useContext, useEffect, useState, ReactNode, useCallback, useMemo } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { getSessionIdentifier, getSessionLabel } from '@/lib/session';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  initialized: boolean;
  signIn: (identifier: string, password: string) => Promise<{ error: Error | null }>;
  signUp: (email: string, password: string, fullName: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [initialized, setInitialized] = useState(false);

  const sessionId = useMemo(() => getSessionIdentifier(session), [session]);

  useEffect(() => {
    let mounted = true;

    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, newSession) => {
        if (!mounted) return;
        
        console.log('[Auth] State change:', event, newSession?.user?.id);
        setSession(newSession);
        setUser(newSession?.user ?? null);
        setLoading(false);
        setInitialized(true);
      }
    );

    // THEN check for existing session
    supabase.auth.getSession().then(({ data: { session: existingSession } }) => {
      if (!mounted) return;
      
      console.log('[Auth] Initial session:', existingSession?.user?.id);
      
      setSession(existingSession);
      setUser(existingSession?.user ?? null);
      setLoading(false);
      setInitialized(true);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!session || !user || !sessionId) {
      return;
    }

    let cancelled = false;
    let handledDisplacement = false;
    let intervalId: number | null = null;
    const sessionLabel = getSessionLabel();
    const paused = (() => {
      try {
        return localStorage.getItem("session_guard_pause") === "1";
      } catch {
        return false;
      }
    })();
    const conflictFlag = (() => {
      try {
        return localStorage.getItem("session_conflict") === "1";
      } catch {
        return false;
      }
    })();

    if (paused) {
      return;
    }

    const handleDisplacement = async (source: "check" | "heartbeat", reason: string | null, hasError: boolean) => {
      if (handledDisplacement) return;
      handledDisplacement = true;
      cancelled = true;
      if (intervalId !== null) {
        window.clearInterval(intervalId);
      }
      try {
        localStorage.setItem("session_displaced", "1");
        const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
        const ref = supabaseUrl?.replace(/^https?:\/\//, "").split(".")[0] ?? "";
        if (ref) {
          localStorage.removeItem(`sb-${ref}-auth-token`);
          sessionStorage.removeItem(`sb-${ref}-auth-token`);
        }
      } catch {
        // ignore
      }
      setSession(null);
      setUser(null);
      setLoading(false);
      setInitialized(true);
      try {
        const { error } = await supabase.auth.signOut();
      } catch (err) {
      }
      window.location.assign("/auth");
    };

    const check = async () => {
      const functionHeaders = {
        Authorization: `Bearer ${session.access_token}`,
        apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
      };
      const { data, error } = await supabase.functions.invoke("session-guard", {
        body: { action: "check", session_id: sessionId, session_label: sessionLabel },
        headers: functionHeaders,
      });
      let errorReason: string | null = null;
      const contextBody = (error as any)?.context?.body;
      if (typeof contextBody === "string") {
        try {
          const parsed = JSON.parse(contextBody) as { reason?: unknown };
          errorReason = typeof parsed.reason === "string" ? parsed.reason : null;
        } catch {
          errorReason = null;
        }
      }
      const contextBodySnippet =
        typeof contextBody === "string" ? contextBody.slice(0, 160) : null;
      let rawStatus: number | null = null;
      let rawReason: string | null = null;
      if (error && (error as any)?.context?.status === 403) {
        try {
          const functionUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/session-guard`;
          const res = await fetch(functionUrl, {
            method: "POST",
            headers: {
              ...functionHeaders,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              action: "check",
              session_id: sessionId,
              session_label: sessionLabel,
            }),
          });
          rawStatus = res.status;
          const rawBody = (await res.json().catch(() => null)) as
            | { reason?: unknown; error?: unknown }
            | null;
          if (rawBody) {
            rawReason = typeof rawBody.reason === "string"
              ? rawBody.reason
              : typeof rawBody.error === "string"
                ? rawBody.error
                : null;
          }
        } catch {
          rawStatus = null;
          rawReason = null;
        }
      }
      // Handle "No business" error - don't trigger displacement, just return early
      if (rawReason === "No business" || (error && (error as any)?.context?.status === 403 && rawReason === "No business")) {
        return;
      }
      if (data?.reason === "replaced" || rawReason === "replaced") {
        try {
          await handleDisplacement("check", data?.reason ?? null, !!error);
        } catch (err) {
        }
        return;
      }
      if (error) {
        return;
      }
      if (cancelled) {
        return;
      }
      if (data?.needs_register) {
        const { data: registerData, error: registerError } = await supabase.functions.invoke("session-guard", {
          body: { action: "register", session_id: sessionId, session_label: sessionLabel },
        });
      }
    };

    void check();

    intervalId = window.setInterval(() => {
      void (async () => {
        const functionHeaders = {
          Authorization: `Bearer ${session.access_token}`,
          apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
        };
        const { data, error } = await supabase.functions.invoke("session-guard", {
          body: { action: "heartbeat", session_id: sessionId, session_label: sessionLabel },
          headers: functionHeaders,
        });
        let heartbeatErrorReason: string | null = null;
        const heartbeatContextBody = (error as any)?.context?.body;
        if (typeof heartbeatContextBody === "string") {
          try {
            const parsed = JSON.parse(heartbeatContextBody) as { reason?: unknown };
            heartbeatErrorReason = typeof parsed.reason === "string" ? parsed.reason : null;
          } catch {
            heartbeatErrorReason = null;
          }
        }
        const heartbeatBodySnippet =
          typeof heartbeatContextBody === "string" ? heartbeatContextBody.slice(0, 160) : null;
        let heartbeatRawStatus: number | null = null;
        let heartbeatRawReason: string | null = null;
        if (error && (error as any)?.context?.status === 403) {
          try {
            const functionUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/session-guard`;
            const res = await fetch(functionUrl, {
              method: "POST",
              headers: {
                ...functionHeaders,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                action: "heartbeat",
                session_id: sessionId,
                session_label: sessionLabel,
              }),
            });
            heartbeatRawStatus = res.status;
            const rawBody = (await res.json().catch(() => null)) as
              | { reason?: unknown; error?: unknown }
              | null;
            if (rawBody) {
              heartbeatRawReason = typeof rawBody.reason === "string"
                ? rawBody.reason
                : typeof rawBody.error === "string"
                  ? rawBody.error
                  : null;
            }
          } catch {
            heartbeatRawStatus = null;
            heartbeatRawReason = null;
          }
        }
        if (data?.reason === "replaced" || heartbeatRawReason === "replaced") {
          await handleDisplacement("heartbeat", data?.reason ?? null, !!error);
          return;
        }
        if (error) {
          return;
        }
      })();
    }, 60_000);

    return () => {
      cancelled = true;
      if (intervalId !== null) {
        window.clearInterval(intervalId);
      }
    };
  }, [sessionId, session, user]);

  const signIn = useCallback(async (identifier: string, password: string) => {
    let email = identifier;
    
    // Jika bukan email (tidak mengandung @), lookup username
    if (!identifier.includes('@')) {
      try {
        const { data, error: lookupError } = await supabase.functions.invoke('lookup-user-email', {
          body: { username: identifier },
        });
        
        if (lookupError || !data?.email) {
          return { error: new Error('Invalid username or email') };
        }
        
        email = data.email;
      } catch (err) {
        return { error: new Error('Failed to lookup username') };
      }
    }
    
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error: error as Error | null };
  }, []);

  const signUp = useCallback(async (email: string, password: string, fullName: string) => {
    const redirectUrl = `${window.location.origin}/`;
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl,
        data: { full_name: fullName }
      }
    });
    return { error: error as Error | null };
  }, []);

  const signOut = useCallback(async () => {
    console.log('[Auth] Signing out...');
    
    // Set logout flag immediately to prevent redirects to onboarding
    try {
      localStorage.setItem("logout_in_progress", "1");
    } catch {
      // Ignore
    }
    
    // Clear state immediately to prevent race conditions
    setUser(null);
    setSession(null);
    
    const activeSessionId = getSessionIdentifier(session);
    if (activeSessionId && session?.access_token) {
      const functionHeaders = {
        Authorization: `Bearer ${session.access_token}`,
        apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
      };
      // Fire-and-forget to avoid delaying logout redirect
      supabase.functions
        .invoke("session-guard", {
          body: { action: "logout", session_id: activeSessionId },
          headers: functionHeaders,
        })
        .catch(() => {
          // ignore
        });
    }

    let signOutError: string | null = null;
    try {
      await supabase.auth.signOut();
    } catch (err) {
      signOutError = String(err);
      try {
        await supabase.auth.signOut({ scope: "local" });
      } catch (localErr) {
        signOutError = `${signOutError ?? ""} ${String(localErr)}`.trim();
      }
    }
    
    // Redirect after signOut completes
    window.location.replace("/auth");
  }, [session]);

  return (
    <AuthContext.Provider value={{ 
      user, 
      session, 
      loading, 
      initialized,
      signIn, 
      signUp, 
      signOut 
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
