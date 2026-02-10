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

type OrderItemInput = {
  product_id: string;
  quantity: number;
  notes?: string;
  modifiers?: Record<string, unknown>;
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseUrl || !serviceRoleKey) {
      return json({ error: "Server configuration error" }, 500);
    }

    const adminClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const bodyText = await req.text();
    const body = bodyText ? JSON.parse(bodyText) : {};
    const businessId = typeof body?.business_id === "string" ? body.business_id.trim() : "";
    const branchId = typeof body?.branch_id === "string" ? body.branch_id.trim() : "";
    const orderType = typeof body?.order_type === "string" ? body.order_type.trim() : "takeaway";
    const items = Array.isArray(body?.items) ? (body.items as OrderItemInput[]) : [];
    const customerName = typeof body?.customer_name === "string" ? body.customer_name.trim() : null;
    const phone = typeof body?.phone === "string" ? body.phone.trim() : null;
    const notes = typeof body?.notes === "string" ? body.notes.trim() : null;

    if (!businessId || !branchId) return json({ error: "Missing business_id or branch_id" }, 400);
    if (!items.length) return json({ error: "Cart is empty" }, 400);
    if (!["takeaway", "delivery"].includes(orderType)) return json({ error: "Invalid order_type" }, 400);

    const productIds = [...new Set(items.map((i) => i.product_id).filter(Boolean))];
    if (!productIds.length) return json({ error: "Missing products" }, 400);

    const { data: products, error: productsError } = await adminClient
      .from("products")
      .select("id, sell_price, prep_station, is_menu_item, is_active, is_available")
      .eq("business_id", businessId)
      .in("id", productIds);

    if (productsError) return json({ error: "Failed to load products" }, 500);

    const productMap = new Map((products || []).map((p) => [p.id, p]));
    for (const item of items) {
      const product = productMap.get(item.product_id);
      if (!product) return json({ error: "Invalid product in cart" }, 400);
      if (!product.is_menu_item || !product.is_active || !product.is_available) {
        return json({ error: "Product unavailable" }, 400);
      }
      if (!Number.isFinite(item.quantity) || item.quantity <= 0) {
        return json({ error: "Invalid quantity" }, 400);
      }
    }

    const { data: orderData, error: orderError } = await adminClient
      .from("fnb_orders")
      .insert({
        business_id: businessId,
        branch_id: branchId,
        order_type: orderType,
        status: "pending",
        source: "online",
        customer_name: customerName,
        phone,
        notes,
      })
      .select("id, business_id")
      .single();

    if (orderError || !orderData) {
      return json({ error: "Failed to create order" }, 500);
    }

    const orderItems = items.map((item) => {
      const product = productMap.get(item.product_id) as any;
      return {
        order_id: orderData.id,
        product_id: item.product_id,
        quantity: item.quantity,
        price: product.sell_price,
        station: product.prep_station ?? null,
        notes: typeof item.notes === "string" ? item.notes.trim() : null,
        modifiers_json: item.modifiers ?? {},
      };
    });

    const { error: itemsError } = await adminClient
      .from("fnb_order_items")
      .insert(orderItems);

    if (itemsError) {
      return json({ error: "Failed to create order items" }, 500);
    }

    await adminClient.from("audit_logs").insert({
      business_id: businessId,
      user_id: null,
      entity_type: "fnb_order",
      entity_id: orderData.id,
      action: "create_online_order",
      new_value: { source: "online", order_type: orderType },
    });

    return json({ order_id: orderData.id });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    console.error("[online-order-create] unexpected error", msg);
    return json({ error: msg }, 500);
  }
});
