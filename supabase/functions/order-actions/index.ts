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

const ORDER_STATUSES = new Set([
  "pending",
  "accepted",
  "rejected",
  "preparing",
  "ready",
  "served",
  "completed",
  "cancelled",
]);

const ITEM_STATUSES = new Set(["pending", "preparing", "ready", "served", "cancelled"]);

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseUrl || !anonKey || !serviceRoleKey) {
      return json({ error: "Server configuration error" }, 500);
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
      console.error("[order-actions] Invalid token", claimsError?.message);
      return json({ error: "Unauthorized" }, 401);
    }

    const userId = String(claimsData.claims.sub);

    const bodyText = await req.text();
    const body = bodyText ? JSON.parse(bodyText) : {};
    const action = typeof body?.action === "string" ? body.action : "";
    const orderId = typeof body?.order_id === "string" ? body.order_id.trim() : "";
    const orderItemId = typeof body?.order_item_id === "string" ? body.order_item_id.trim() : "";
    const status = typeof body?.status === "string" ? body.status.trim() : "";
    const reason = typeof body?.reason === "string" ? body.reason.trim() : null;

    if (!action) return json({ error: "Missing action" }, 400);

    const ensureAccess = async (businessId: string) => {
      const { data, error } = await adminClient.rpc("has_business_access", {
        _user_id: userId,
        _business_id: businessId,
      });
      if (error || !data) return false;
      return true;
    };

    if (action === "accept_order" || action === "reject_order" || action === "update_order_status") {
      if (!orderId) return json({ error: "Missing order_id" }, 400);

      const { data: order, error: orderError } = await adminClient
        .from("fnb_orders")
        .select("id, business_id, table_id, status")
        .eq("id", orderId)
        .maybeSingle();

      if (orderError || !order) return json({ error: "Order not found" }, 404);
      if (!(await ensureAccess(order.business_id))) return json({ error: "Forbidden" }, 403);

      let nextStatus = order.status as string;
      const updatePayload: Record<string, unknown> = {};

      if (action === "accept_order") {
        nextStatus = "accepted";
        updatePayload.accepted_at = new Date().toISOString();
      } else if (action === "reject_order") {
        nextStatus = "rejected";
        if (reason) updatePayload.notes = reason;
      } else if (action === "update_order_status") {
        if (!ORDER_STATUSES.has(status)) return json({ error: "Invalid status" }, 400);
        nextStatus = status;
        if (status === "completed") updatePayload.completed_at = new Date().toISOString();
      }

      const { data: updated, error: updateError } = await adminClient
        .from("fnb_orders")
        .update({ status: nextStatus, ...updatePayload })
        .eq("id", orderId)
        .select("id, status, table_id, business_id")
        .single();

      if (updateError) return json({ error: "Failed to update order" }, 500);

      if (updated?.table_id && nextStatus === "accepted") {
        await adminClient.from("fnb_tables").update({ status: "occupied" }).eq("id", updated.table_id);
      }

      await adminClient.from("audit_logs").insert({
        business_id: updated.business_id,
        user_id: userId,
        entity_type: "fnb_order",
        entity_id: updated.id,
        action,
        new_value: { status: nextStatus },
      });

      return json({ order: updated });
    }

    if (action === "update_item_status") {
      if (!orderItemId) return json({ error: "Missing order_item_id" }, 400);
      if (!ITEM_STATUSES.has(status)) return json({ error: "Invalid status" }, 400);

      const { data: item, error: itemError } = await adminClient
        .from("fnb_order_items")
        .select("id, order_id")
        .eq("id", orderItemId)
        .maybeSingle();

      if (itemError || !item) return json({ error: "Order item not found" }, 404);

      const { data: order, error: orderError } = await adminClient
        .from("fnb_orders")
        .select("id, business_id")
        .eq("id", item.order_id)
        .maybeSingle();

      if (orderError || !order) return json({ error: "Order not found" }, 404);
      if (!(await ensureAccess(order.business_id))) return json({ error: "Forbidden" }, 403);

      const { data: updated, error: updateError } = await adminClient
        .from("fnb_order_items")
        .update({ status })
        .eq("id", orderItemId)
        .select("id, status, order_id")
        .single();

      if (updateError) return json({ error: "Failed to update item" }, 500);

      await adminClient.from("audit_logs").insert({
        business_id: order.business_id,
        user_id: userId,
        entity_type: "fnb_order_item",
        entity_id: updated.id,
        action,
        new_value: { status },
      });

      return json({ item: updated });
    }

    return json({ error: "Unsupported action" }, 400);
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    console.error("[order-actions] unexpected error", msg);
    return json({ error: msg }, 500);
  }
});
