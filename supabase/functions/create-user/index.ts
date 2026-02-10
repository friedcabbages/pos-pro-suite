import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.50.0";

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
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    console.log("Edge function called, checking env vars...");

    if (!supabaseUrl || !serviceRoleKey || !supabaseAnonKey) {
      console.error("Missing environment variables:", {
        hasUrl: !!supabaseUrl,
        hasAnonKey: !!supabaseAnonKey,
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

    // Create a user client to validate the token using getClaims
    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const token = authHeader.split(" ")[1]?.trim();
    if (!token) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: claimsData, error: claimsError } = await userClient.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      console.error("Token validation error:", claimsError?.message);
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const currentUserId = claimsData.claims.sub as string;
    if (!currentUserId) {
      return new Response(JSON.stringify({ error: "Unauthorized - no user id in token" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    console.log("Authenticated user:", currentUserId);

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
    const phone = typeof body?.phone === "string" && body.phone.trim() !== "" ? body.phone.trim() : null;
    const branch_id = typeof body?.branch_id === "string" && body.branch_id.trim() !== "" ? body.branch_id.trim() : null;
    const usernameRaw = typeof body?.username === "string" ? body.username.trim() : null;
    const username = usernameRaw ? usernameRaw.toLowerCase() : null;

    console.log("Creating user with params:", { email, role, business_id, branch_id, phone, username });

    // Validate required fields
    if (!email || !password || !role || !business_id) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: email, password, role, business_id" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate username if provided
    const usernamePattern = /^[a-zA-Z0-9_]{3,30}$/;
    if (username && !usernamePattern.test(usernameRaw ?? "")) {
      return new Response(JSON.stringify({ error: "Username must be 3-30 characters and only contain letters, numbers, or underscores" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check username uniqueness if provided
    if (username) {
      const { data: existingUsername, error: existingUsernameError } = await adminClient
        .from("profiles")
        .select("id")
        .eq("username", username)
        .limit(1)
        .maybeSingle();

      if (existingUsernameError) {
        console.error("Username lookup error:", existingUsernameError.message);
        return new Response(JSON.stringify({ error: "Failed to validate username" }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (existingUsername) {
        return new Response(JSON.stringify({ error: "Username already in use" }), {
          status: 409,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
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

    if (business.owner_id !== currentUserId) {
      return new Response(JSON.stringify({ error: "Only business owners can create users" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Enforce plan max_users (service role bypasses RLS, so enforce here)
    const { data: maxUsers, error: maxUsersErr } = await adminClient.rpc("plan_limit_users", {
      p_business_id: business_id,
    });
    if (maxUsersErr) {
      console.error("plan_limit_users error:", maxUsersErr.message);
      return new Response(JSON.stringify({ error: "Failed to check subscription limits" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: userCount, error: userCountErr } = await adminClient.rpc("count_business_users", {
      p_business_id: business_id,
    });
    if (userCountErr) {
      console.error("count_business_users error:", userCountErr.message);
      return new Response(JSON.stringify({ error: "Failed to check subscription limits" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const maxUsersNum = maxUsers as number | null;
    const currentUsersNum = Number(userCount ?? 0);

    if (maxUsersNum !== null && currentUsersNum >= maxUsersNum) {
      console.warn("User limit reached", { business_id, currentUsersNum, maxUsersNum });

      // Best-effort log
      await adminClient.from("business_activity_logs").insert({
        business_id,
        user_id: currentUserId,
        action: "limit_blocked_users",
        entity_type: "subscription",
        entity_id: business_id,
        description: `User limit reached (${currentUsersNum}/${maxUsersNum})`,
        metadata: { current: currentUsersNum, max: maxUsersNum },
      });

      return new Response(
        JSON.stringify({
          error: "User limit reached for your current plan",
          code: "LIMIT_MAX_USERS",
          current: currentUsersNum,
          max: maxUsersNum,
        }),
        { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Permission check passed, creating auth user...");

    // Prepare user metadata
    const userMetadata: Record<string, string> = {};
    if (full_name) userMetadata.full_name = full_name;
    if (username) userMetadata.username = username;

    // Create the user using admin API (service role)
    const { data: created, error: createError } = await adminClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      ...(Object.keys(userMetadata).length ? { user_metadata: userMetadata } : {}),
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
        phone,
        business_id,
        branch_id,
        username,
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
