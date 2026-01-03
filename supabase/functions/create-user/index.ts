import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get environment variables
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    console.log("Edge function called, checking env vars...");

    if (!supabaseUrl || !serviceRoleKey) {
      console.error("Missing environment variables:", {
        hasUrl: !!supabaseUrl,
        hasServiceKey: !!serviceRoleKey,
      });
      return new Response(
        JSON.stringify({ error: "Server configuration error: missing environment variables" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create admin client with service role
    const adminClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    // Get the authorization header from the request
    const authHeader = req.headers.get("Authorization") ?? req.headers.get("authorization");
    if (!authHeader || !authHeader.toLowerCase().startsWith("bearer ")) {
      console.error("Missing/invalid Authorization header");
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Verify caller (must be authenticated)
    const token = authHeader.split(" ")[1]?.trim();
    if (!token) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: userData, error: authError } = await adminClient.auth.getUser(token);
    if (authError || !userData?.user) {
      console.error("Auth error:", authError?.message ?? authError);
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const currentUser = userData.user;
    console.log("Authenticated user:", currentUser.id);

    // Parse request body with error handling
    let body: any;
    try {
      const text = await req.text();
      if (!text || text.trim() === "") {
        return new Response(JSON.stringify({ error: "Empty request body" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      body = JSON.parse(text);
    } catch (parseError) {
      console.error("JSON parse error:", parseError);
      return new Response(JSON.stringify({ error: "Invalid JSON in request body" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const email = typeof body?.email === "string" ? body.email.trim() : "";
    const password = typeof body?.password === "string" ? body.password : "";
    const role = typeof body?.role === "string" ? body.role.trim() : "";
    const business_id = typeof body?.business_id === "string" ? body.business_id.trim() : "";
    const full_name = typeof body?.full_name === "string" ? body.full_name.trim() : null;
    const branch_id = typeof body?.branch_id === "string" && body.branch_id.trim() !== "" ? body.branch_id.trim() : null;

    console.log("Creating user with params:", { email, role, business_id, branch_id });

    // Validate required fields
    if (!email || !password || !role || !business_id) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: email, password, role, business_id" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate role
    if (!['admin', 'cashier'].includes(role)) {
      return new Response(JSON.stringify({ error: "Invalid role. Must be 'admin' or 'cashier'" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Permission check (MANDATORY): caller must own the business
    const { data: business, error: businessError } = await adminClient
      .from("businesses")
      .select("id, owner_id")
      .eq("id", business_id)
      .maybeSingle();

    if (businessError) {
      console.error("Business lookup error:", businessError.message);
      return new Response(JSON.stringify({ error: "Failed to verify business" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!business) {
      return new Response(JSON.stringify({ error: "Business not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (business.owner_id !== currentUser.id) {
      return new Response(JSON.stringify({ error: "Only business owners can create users" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log("Permission check passed, creating auth user...");

    // Create the user using admin API (service role)
    const { data: created, error: createError } = await adminClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      ...(full_name ? { user_metadata: { full_name } } : {}),
    });

    if (createError) {
      console.error("Create user error:", createError.message);
      return new Response(JSON.stringify({ error: createError.message }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const newUserId = created?.user?.id;
    if (!newUserId) {
      console.error("Create user returned no user id");
      return new Response(JSON.stringify({ error: "Failed to create user" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log("Auth user created:", newUserId);

    // Assign role in backend (service role bypasses RLS)
    const { error: userRoleError } = await adminClient.from("user_roles").insert({
      user_id: newUserId,
      business_id,
      branch_id,
      role,
    });

    if (userRoleError) {
      console.error("User role insert error:", userRoleError.message);
      try {
        await adminClient.auth.admin.deleteUser(newUserId);
      } catch (rollbackErr) {
        console.error("Rollback deleteUser failed:", rollbackErr);
      }
      return new Response(JSON.stringify({ error: "Failed to assign user role" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Ensure a profile row exists (best-effort)
    const { error: profileError } = await adminClient.from("profiles").upsert(
      {
        id: newUserId,
        full_name,
        business_id,
        branch_id,
      },
      { onConflict: "id" }
    );

    if (profileError) {
      console.error("Profile upsert error:", profileError.message);
      // non-critical
    }

    console.log("User creation completed successfully");

    return new Response(
      JSON.stringify({
        success: true,
        user: {
          id: newUserId,
          email: created.user?.email ?? email,
          role,
        },
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("Unhandled error:", errorMessage);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
