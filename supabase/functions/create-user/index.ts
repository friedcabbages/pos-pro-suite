import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    
    // Create admin client with service role
    const adminClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    // Get the authorization header from the request
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "No authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create a client with the user's token to verify permissions
    const userClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });

    // Get the current user
    const { data: { user: currentUser }, error: authError } = await userClient.auth.getUser();
    if (authError || !currentUser) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get the request body
    const { email, password, full_name, role, business_id, branch_id } = await req.json();

    // Validate required fields
    if (!email || !password || !role || !business_id) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: email, password, role, business_id" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate role
    if (!["admin", "cashier"].includes(role)) {
      return new Response(
        JSON.stringify({ error: "Invalid role. Must be 'admin' or 'cashier'" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if current user has permission (must be owner of the business)
    const { data: currentUserRole, error: roleError } = await adminClient
      .from("user_roles")
      .select("role")
      .eq("user_id", currentUser.id)
      .eq("business_id", business_id)
      .single();

    if (roleError || !currentUserRole || currentUserRole.role !== "owner") {
      return new Response(
        JSON.stringify({ error: "Only business owners can create users" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create the user using admin API
    const { data: newUser, error: createError } = await adminClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // Skip email confirmation
      user_metadata: { full_name },
    });

    if (createError) {
      return new Response(
        JSON.stringify({ error: createError.message }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create user role
    const { error: userRoleError } = await adminClient
      .from("user_roles")
      .insert({
        user_id: newUser.user.id,
        business_id,
        branch_id: branch_id || null,
        role,
      });

    if (userRoleError) {
      // Rollback: delete the created user
      await adminClient.auth.admin.deleteUser(newUser.user.id);
      return new Response(
        JSON.stringify({ error: "Failed to assign user role: " + userRoleError.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Update profile with business and branch
    const { error: profileError } = await adminClient
      .from("profiles")
      .update({
        business_id,
        branch_id: branch_id || null,
        full_name,
      })
      .eq("id", newUser.user.id);

    if (profileError) {
      console.error("Profile update error:", profileError);
      // Non-critical, continue
    }

    return new Response(
      JSON.stringify({
        success: true,
        user: {
          id: newUser.user.id,
          email: newUser.user.email,
          role,
        },
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("Error:", errorMessage);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
