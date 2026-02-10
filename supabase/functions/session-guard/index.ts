import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.50.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type Json = Record<string, unknown>;

function json(data: Json, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseUrl || !anonKey || !serviceRoleKey) {
      console.error("[session-guard] Missing env vars");
      return json({ error: "Server misconfigured" }, 500);
    }

    const authHeader = req.headers.get("authorization") ?? req.headers.get("Authorization");
    if (!authHeader?.toLowerCase().startsWith("bearer ")) {
      return json({ error: "Unauthorized" }, 401);
    }

    const token = authHeader.split(" ")[1]?.trim();
    if (!token) return json({ error: "Unauthorized" }, 401);

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const adminClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const { data: claimsData, error: claimsError } = await userClient.auth.getClaims(token);
    if (claimsError || !claimsData?.claims?.sub) {
      console.error("[session-guard] Invalid token", claimsError?.message);
      return json({ error: "Unauthorized" }, 401);
    }

    const userId = String(claimsData.claims.sub);

    const bodyText = await req.text();
    const body = bodyText ? JSON.parse(bodyText) : {};
    const action = typeof body?.action === "string" ? body.action : "check";
    const sessionId = typeof body?.session_id === "string" ? body.session_id.trim() : "";
    const sessionLabel = typeof body?.session_label === "string" ? body.session_label.trim() : null;

    if (!sessionId && action !== "check") {
      return json({ error: "Missing session_id" }, 400);
    }

    // Check if user is superadmin
    const { data: superAdminRecord } = await adminClient
      .from("super_admins")
      .select("id")
      .eq("user_id", userId)
      .maybeSingle();
    const isSuperAdmin = !!superAdminRecord;

    const { data: profile, error: profileErr } = await adminClient
      .from("profiles")
      .select("business_id")
      .eq("id", userId)
      .maybeSingle();
    if (profileErr) {
      console.error("[session-guard] Profile lookup error", profileErr.message);
      return json({ error: "Failed to load profile" }, 500);
    }

    const businessId = profile?.business_id as string | null;
    
    // Superadmins can proceed without business_id, regular users need business_id for register/force actions
    if (!isSuperAdmin && !businessId && (action === "register" || action === "force")) {
      return json({ error: "No business" }, 403);
    }

    const { data: existing, error: existingErr } = await adminClient
      .from("user_sessions")
      .select("session_id, session_label, last_seen")
      .eq("user_id", userId)
      .is("revoked_at", null)
      .maybeSingle();
    if (existingErr) {
      console.error("[session-guard] session lookup error", existingErr.message);
      return json({ error: "Failed to load session" }, 500);
    }

    const now = new Date().toISOString();

    if (action === "check") {
      if (!existing) {
        console.log("[session-guard] check: no existing session, allowing");
        return json({ allowed: true, needs_register: true });
      }
      if (sessionId && existing.session_id === sessionId) {
        console.log("[session-guard] check: session matches, allowing", { sessionId, existingSessionId: existing.session_id });
        return json({ allowed: true });
      }
      console.log("[session-guard] check: session mismatch, returning 403", { sessionId, existingSessionId: existing.session_id, userId });
      return json({ allowed: false, reason: "replaced" }, 403);
    }

    if (action === "register") {
      if (existing && existing.session_id !== sessionId) {
        return json({
          allowed: false,
          reason: "session_exists",
          active_session_id: existing.session_id,
          active_last_seen: existing.last_seen,
          active_label: existing.session_label,
        }, 409);
      }

      const { error: upsertErr } = await adminClient
        .from("user_sessions")
        .upsert(
          {
            business_id: businessId,
            user_id: userId,
            session_id: sessionId,
            session_label: sessionLabel,
            last_seen: now,
            revoked_at: null,
          },
          { onConflict: "user_id" }
        );
      if (upsertErr) {
        console.error("[session-guard] upsert error", upsertErr.message);
        return json({ error: "Failed to register session" }, 500);
      }

      return json({ allowed: true });
    }

    if (action === "force") {
      const { error: revokeErr } = await adminClient
        .from("user_sessions")
        .update({ revoked_at: now })
        .eq("user_id", userId)
        .is("revoked_at", null);
      if (revokeErr) {
        console.error("[session-guard] revoke error", revokeErr.message);
        return json({ error: "Failed to revoke previous session" }, 500);
      }

      const { error: upsertErr } = await adminClient
        .from("user_sessions")
        .upsert(
          {
            business_id: businessId,
            user_id: userId,
            session_id: sessionId,
            session_label: sessionLabel,
            last_seen: now,
            revoked_at: null,
          },
          { onConflict: "user_id" }
        );
      if (upsertErr) {
        console.error("[session-guard] force upsert error", upsertErr.message);
        return json({ error: "Failed to register session" }, 500);
      }

      return json({ allowed: true });
    }

    if (action === "heartbeat") {
      if (!existing || existing.session_id !== sessionId) {
        return json({ allowed: false, reason: "replaced" }, 403);
      }
      const { error } = await adminClient
        .from("user_sessions")
        .update({ last_seen: now })
        .eq("user_id", userId)
        .eq("session_id", sessionId)
        .is("revoked_at", null);
      if (error) {
        console.error("[session-guard] heartbeat error", error.message);
        return json({ error: "Failed to update session" }, 500);
      }
      return json({ allowed: true });
    }

    if (action === "logout") {
      const { error } = await adminClient
        .from("user_sessions")
        .update({ revoked_at: now })
        .eq("user_id", userId)
        .eq("session_id", sessionId)
        .is("revoked_at", null);
      if (error) {
        console.error("[session-guard] logout error", error.message);
        return json({ error: "Failed to logout session" }, 500);
      }
      return json({ success: true });
    }

    return json({ error: "Invalid action" }, 400);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    console.error("[session-guard] Unhandled", msg);
    return json({ error: msg }, 500);
  }
});
