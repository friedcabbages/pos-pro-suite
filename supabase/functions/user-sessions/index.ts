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
      console.error("[user-sessions] Missing env vars");
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
      console.error("[user-sessions] Invalid token", claimsError?.message);
      return json({ error: "Unauthorized" }, 401);
    }

    const userId = String(claimsData.claims.sub);

    const bodyText = await req.text();
    const body = bodyText ? JSON.parse(bodyText) : {};
    const action = typeof body?.action === "string" ? body.action : "list";
    const windowMinutes = typeof body?.window_minutes === "number" ? body.window_minutes : 10;
    const targetUserId = typeof body?.user_id === "string" ? body.user_id.trim() : "";
    const keepUserId = typeof body?.keep_user_id === "string" ? body.keep_user_id.trim() : "";

    const { data: profile, error: profileErr } = await adminClient
      .from("profiles")
      .select("business_id")
      .eq("id", userId)
      .maybeSingle();
    if (profileErr) {
      console.error("[user-sessions] Profile lookup error", profileErr.message);
      return json({ error: "Failed to load profile" }, 500);
    }

    const businessId = profile?.business_id as string | null;
    if (!businessId) return json({ error: "No business" }, 403);

    const { data: roleRow, error: roleErr } = await adminClient
      .from("user_roles")
      .select("role")
      .eq("business_id", businessId)
      .eq("user_id", userId)
      .maybeSingle();
    if (roleErr) {
      console.error("[user-sessions] role lookup error", roleErr.message);
      return json({ error: "Failed to check role" }, 500);
    }

    const role = roleRow?.role as string | undefined;
    if (!role || (role !== "owner" && role !== "admin")) {
      return json({ error: "Forbidden" }, 403);
    }

    if (action === "list") {
      const { data: sessions, error: listErr } = await adminClient.rpc("list_user_sessions", {
        p_business_id: businessId,
        p_window_minutes: windowMinutes,
      });
      if (listErr) {
        console.error("[user-sessions] list error", listErr.message);
        return json({ error: "Failed to load sessions" }, 500);
      }
      return json({ sessions: sessions ?? [] });
    }

    if (action === "revoke_user") {
      if (!targetUserId) return json({ error: "Missing user_id" }, 400);
      const { error } = await adminClient.rpc("revoke_user_session", {
        p_business_id: businessId,
        p_user_id: targetUserId,
      });
      if (error) {
        console.error("[user-sessions] revoke_user error", error.message);
        return json({ error: "Failed to revoke session" }, 500);
      }
      return json({ success: true });
    }

    if (action === "revoke_others") {
      if (!keepUserId) return json({ error: "Missing keep_user_id" }, 400);
      const { error } = await adminClient.rpc("revoke_other_user_sessions", {
        p_business_id: businessId,
        p_keep_user_id: keepUserId,
      });
      if (error) {
        console.error("[user-sessions] revoke_others error", error.message);
        return json({ error: "Failed to revoke other sessions" }, 500);
      }
      return json({ success: true });
    }

    if (action === "revoke_all") {
      const { error } = await adminClient.rpc("revoke_all_user_sessions", {
        p_business_id: businessId,
      });
      if (error) {
        console.error("[user-sessions] revoke_all error", error.message);
        return json({ error: "Failed to revoke all sessions" }, 500);
      }
      return json({ success: true });
    }

    return json({ error: "Invalid action" }, 400);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    console.error("[user-sessions] Unhandled", msg);
    return json({ error: msg }, 500);
  }
});
