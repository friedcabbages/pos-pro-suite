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
    const tableToken = typeof body?.table_token === "string" ? body.table_token.trim() : "";

    if (!businessId && !tableToken) {
      return json({ error: "Missing business_id or table_token" }, 400);
    }

    let resolvedBusinessId = businessId;
    let resolvedBranchId: string | null = null;

    if (!resolvedBusinessId && tableToken) {
      const tokenHash = await hashToken(tableToken);
      const { data: tokenData, error: tokenError } = await adminClient
        .from("fnb_table_qr_tokens")
        .select("table_id, fnb_tables ( id, business_id, branch_id, is_active )")
        .eq("token_hash", tokenHash)
        .is("revoked_at", null)
        .maybeSingle();

      if (tokenError || !tokenData?.fnb_tables) {
        return json({ error: "Invalid or expired token" }, 404);
      }

      const table = tokenData.fnb_tables as { business_id: string; branch_id: string; is_active: boolean };
      if (!table.is_active) {
        return json({ error: "Table inactive" }, 403);
      }

      resolvedBusinessId = table.business_id;
      resolvedBranchId = table.branch_id;
    }

    const { data: categories } = await adminClient
      .from("categories")
      .select("id, name, description")
      .eq("business_id", resolvedBusinessId)
      .order("name", { ascending: true });

    const { data: products, error: productsError } = await adminClient
      .from("products")
      .select("id, name, description, category_id, sell_price, image_url, prep_station, sort_order")
      .eq("business_id", resolvedBusinessId)
      .eq("is_menu_item", true)
      .eq("is_active", true)
      .eq("is_available", true)
      .order("sort_order", { ascending: true });

    if (productsError) {
      return json({ error: "Failed to load menu" }, 500);
    }

    const productIds = (products || []).map((p) => p.id);

    const { data: modifierGroups } = await adminClient
      .from("fnb_modifier_groups")
      .select("id, name, is_required, min_select, max_select, is_multi, sort_order")
      .eq("business_id", resolvedBusinessId)
      .eq("is_active", true)
      .order("sort_order", { ascending: true });

    const groupIds = (modifierGroups || []).map((g) => g.id);
    const { data: modifiers } = groupIds.length
      ? await adminClient
          .from("fnb_modifiers")
          .select("id, group_id, name, price_delta, price_type, sort_order")
          .in("group_id", groupIds)
          .eq("is_active", true)
          .order("sort_order", { ascending: true })
      : { data: [] as any[] };

    const { data: productModifierGroups } = productIds.length
      ? await adminClient
          .from("fnb_product_modifier_groups")
          .select("product_id, group_id, sort_order")
          .in("product_id", productIds)
          .order("sort_order", { ascending: true })
      : { data: [] as any[] };

    return json({
      business_id: resolvedBusinessId,
      branch_id: resolvedBranchId,
      categories: categories || [],
      products: products || [],
      modifier_groups: modifierGroups || [],
      modifiers: modifiers || [],
      product_modifier_groups: productModifierGroups || [],
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    console.error("[public-menu] unexpected error", msg);
    return json({ error: msg }, 500);
  }
});
