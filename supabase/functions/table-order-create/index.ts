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

async function hashToken(raw: string) {
  const data = new TextEncoder().encode(raw);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

type OrderItemInput = {
  product_id: string;
  quantity: number;
  notes?: string;
  modifiers?: Record<string, unknown>;
  price?: number; // optional override (base + modifier total)
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
    const tableToken = typeof body?.table_token === "string" ? body.table_token.trim() : "";
    const items = Array.isArray(body?.items) ? (body.items as OrderItemInput[]) : [];
    const customerName = typeof body?.customer_name === "string" ? body.customer_name.trim() : null;
    const phone = typeof body?.phone === "string" ? body.phone.trim() : null;
    const notes = typeof body?.notes === "string" ? body.notes.trim() : null;

    if (!tableToken) return json({ error: "Missing table_token" }, 400);
    if (!items.length) return json({ error: "Cart is empty" }, 400);

    const tokenHash = await hashToken(tableToken);
    const { data: tokenData, error: tokenError } = await adminClient
      .from("fnb_table_qr_tokens")
      .select("table_id, fnb_tables ( id, business_id, branch_id, status, is_active )")
      .eq("token_hash", tokenHash)
      .is("revoked_at", null)
      .maybeSingle();

    if (tokenError || !tokenData?.fnb_tables) {
      return json({ error: "Invalid or expired token" }, 404);
    }

    const table = tokenData.fnb_tables as {
      id: string;
      business_id: string;
      branch_id: string;
      status: string;
      is_active: boolean;
    };

    if (!table.is_active) return json({ error: "Table inactive" }, 403);

    const productIds = [...new Set(items.map((i) => i.product_id).filter(Boolean))];
    if (!productIds.length) return json({ error: "Missing products" }, 400);

    const { data: products, error: productsError } = await adminClient
      .from("products")
      .select("id, sell_price, prep_station, is_menu_item, is_active, is_available")
      .eq("business_id", table.business_id)
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
        business_id: table.business_id,
        branch_id: table.branch_id,
        table_id: table.id,
        order_type: "dine_in",
        status: "pending",
        source: "qr",
        customer_name: customerName,
        phone,
        notes,
      })
      .select("id, business_id, table_id")
      .single();

    if (orderError || !orderData) {
      return json({ error: "Failed to create order" }, 500);
    }

    const orderItems = items.map((item) => {
      const product = productMap.get(item.product_id) as any;
      const price = typeof item.price === "number" && item.price >= 0 ? item.price : product.sell_price;
      return {
        order_id: orderData.id,
        product_id: item.product_id,
        quantity: item.quantity,
        price,
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

    const { data: billData } = await adminClient
      .from("fnb_bills")
      .select("id")
      .eq("table_id", table.id)
      .eq("status", "open")
      .maybeSingle();

    const billId =
      billData?.id ??
      (await adminClient
        .from("fnb_bills")
        .insert({
          business_id: table.business_id,
          branch_id: table.branch_id,
          table_id: table.id,
          status: "open",
        })
        .select("id")
        .single()).data?.id;

    if (billId) {
      await adminClient.from("fnb_bill_orders").insert({
        bill_id: billId,
        order_id: orderData.id,
      });
    }

    if (table.status !== "occupied") {
      await adminClient
        .from("fnb_tables")
        .update({ status: "occupied" })
        .eq("id", table.id);
    }

    await adminClient.from("audit_logs").insert({
      business_id: table.business_id,
      user_id: null,
      entity_type: "fnb_order",
      entity_id: orderData.id,
      action: "create_public_order",
      new_value: { source: "qr", table_id: table.id },
    });

    return json({ order_id: orderData.id, bill_id: billId });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    console.error("[table-order-create] unexpected error", msg);
    return json({ error: msg }, 500);
  }
});
