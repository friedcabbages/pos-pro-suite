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
      console.error("[device-session] Missing env vars");
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
      console.error("[device-session] Invalid token", claimsError?.message);
      return json({ error: "Unauthorized" }, 401);
    }

    const userId = String(claimsData.claims.sub);

    const bodyText = await req.text();
    const body = bodyText ? JSON.parse(bodyText) : {};
    const deviceId = typeof body?.device_id === "string" ? body.device_id.trim() : "";
    const deviceName = typeof body?.device_name === "string" ? body.device_name.trim() : "";
    const windowMinutes = typeof body?.window_minutes === "number" ? body.window_minutes : 10;

    if (!deviceId) return json({ error: "Missing device_id" }, 400);

    // Determine business_id (via profiles)
    const { data: profile, error: profileErr } = await adminClient
      .from("profiles")
      .select("business_id")
      .eq("id", userId)
      .maybeSingle();

    if (profileErr) {
      console.error("[device-session] Profile lookup error", profileErr.message);
      return json({ error: "Failed to load profile" }, 500);
    }

    const businessId = profile?.business_id as string | null;
    if (!businessId) return json({ allowed: false, reason: "no_business" }, 403);

    // Resolve plan limit
    const { data: limitData, error: limitErr } = await adminClient.rpc("plan_limit_devices", {
      p_business_id: businessId,
    });
    if (limitErr) {
      console.error("[device-session] plan_limit_devices error", limitErr.message);
      return json({ error: "Failed to resolve plan" }, 500);
    }

    const maxDevices = limitData as number | null;

    // If device was revoked, reject until it re-registers (client should refresh device_id)
    const { data: existing, error: existingErr } = await adminClient
      .from("active_devices")
      .select("revoked_at")
      .eq("business_id", businessId)
      .eq("device_id", deviceId)
      .maybeSingle();
    if (existingErr) {
      console.error("[device-session] active_devices lookup error", existingErr.message);
      return json({ error: "Failed to load device session" }, 500);
    }
    if (existing?.revoked_at) {
      return json({ allowed: false, reason: "revoked" }, 403);
    }

    // Upsert this device (idempotent) so current device counts as active
    const now = new Date().toISOString();
    const { error: upsertErr } = await adminClient
      .from("active_devices")
      .upsert(
        {
          business_id: businessId,
          user_id: userId,
          device_id: deviceId,
          device_name: deviceName || null,
          last_seen: now,
          revoked_at: null,
        },
        { onConflict: "business_id,device_id" }
      );
    if (upsertErr) {
      console.error("[device-session] upsert error", upsertErr.message);
      return json({ error: "Failed to update session" }, 500);
    }

    // Count active sessions
    const { data: activeCount, error: countErr } = await adminClient.rpc("count_active_devices", {
      p_business_id: businessId,
      p_window_minutes: windowMinutes,
    });
    if (countErr) {
      console.error("[device-session] count_active_devices error", countErr.message);
      return json({ error: "Failed to check device usage" }, 500);
    }

    const current = Number(activeCount ?? 0);

    if (maxDevices !== null && current > maxDevices) {
      const excess = current - maxDevices;
      const { data: candidates, error: candidatesErr } = await adminClient
        .from("active_devices")
        .select("device_id")
        .eq("business_id", businessId)
        .is("revoked_at", null)
        .neq("device_id", deviceId)
        .order("last_seen", { ascending: true })
        .limit(excess);

      if (candidatesErr) {
        console.error("[device-session] prune candidates error", candidatesErr.message);
        return json({ error: "Failed to resolve device usage" }, 500);
      }

      if (candidates?.length) {
        const revokeIds = candidates.map((c) => c.device_id);
        const { error: revokeErr } = await adminClient
          .from("active_devices")
          .update({ revoked_at: now })
          .in("device_id", revokeIds)
          .eq("business_id", businessId)
          .is("revoked_at", null);
        if (revokeErr) {
          console.error("[device-session] prune revoke error", revokeErr.message);
          return json({ error: "Failed to resolve device usage" }, 500);
        }
      }

      const { data: refreshedCount, error: refreshErr } = await adminClient.rpc("count_active_devices", {
        p_business_id: businessId,
        p_window_minutes: windowMinutes,
      });
      if (refreshErr) {
        console.error("[device-session] refresh count error", refreshErr.message);
        return json({ error: "Failed to check device usage" }, 500);
      }

      const refreshed = Number(refreshedCount ?? current);
      if (refreshed > maxDevices && candidates?.length === 0) {
        // Always allow current device even if limit is misconfigured.
        return json({ allowed: true, current: refreshed, maxDevices, overLimit: true });
      }
      if (refreshed > maxDevices) {
        console.warn("[device-session] device limit exceeded", { businessId, current: refreshed, maxDevices });

        // Best-effort log
        await adminClient.from("business_activity_logs").insert({
          business_id: businessId,
          user_id: userId,
          action: "device_limit_blocked",
          entity_type: "subscription",
          entity_id: businessId,
          description: `Active device limit exceeded (${refreshed}/${maxDevices})`,
          metadata: { current: refreshed, maxDevices, deviceId },
        });

        return json({ allowed: false, reason: "device_limit", current: refreshed, maxDevices }, 403);
      }
    }

    return json({ allowed: true, current, maxDevices });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    console.error("[device-session] Unhandled", msg);
    return json({ error: msg }, 500);
  }
});
