import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// List of super admin emails (in production, store in database or config)
const SUPER_ADMIN_EMAILS = [
  "admin@velopos.com",
  "superadmin@velopos.com",
  // Add super admin emails here
];

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !serviceRoleKey) {
      return new Response(
        JSON.stringify({ error: "Server configuration error" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create admin client with service role
    const adminClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // Get authorization header to verify the caller
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verify the calling user
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } = await adminClient.auth.getUser(token);
    
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: "Invalid token" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if user is super admin
    const isSuperAdmin = SUPER_ADMIN_EMAILS.includes(user.email || "");
    
    // Parse request
    const body = await req.json();
    const { action, business_id, filters, payload } = body;

    console.log("Admin action:", action, "by user:", user.email, "super admin:", isSuperAdmin);

    // Handle different actions
    switch (action) {
      case "check_super_admin": {
        return new Response(
          JSON.stringify({ is_super_admin: isSuperAdmin }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      case "list_businesses": {
        if (!isSuperAdmin) {
          return new Response(
            JSON.stringify({ error: "Super admin access required" }),
            { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        const { data: businesses, error } = await adminClient
          .from("businesses")
          .select(`
            *,
            owner:profiles!businesses_owner_id_fkey(full_name, phone)
          `)
          .order("created_at", { ascending: false });

        if (error) {
          console.error("Error fetching businesses:", error);
          return new Response(
            JSON.stringify({ error: error.message }),
            { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        // Get user counts per business
        const { data: userCounts } = await adminClient
          .from("user_roles")
          .select("business_id");

        const businessUserCounts = userCounts?.reduce((acc: Record<string, number>, role) => {
          acc[role.business_id] = (acc[role.business_id] || 0) + 1;
          return acc;
        }, {}) || {};

        const enrichedBusinesses = businesses?.map(b => ({
          ...b,
          user_count: businessUserCounts[b.id] || 0,
        }));

        return new Response(
          JSON.stringify({ businesses: enrichedBusinesses }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      case "list_users": {
        if (!isSuperAdmin) {
          return new Response(
            JSON.stringify({ error: "Super admin access required" }),
            { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        // Get all user roles with business info
        const { data: roles, error } = await adminClient
          .from("user_roles")
          .select(`
            *,
            business:businesses(name)
          `)
          .order("created_at", { ascending: false });

        if (error) {
          console.error("Error fetching roles:", error);
          return new Response(
            JSON.stringify({ error: error.message }),
            { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        // Get profiles for all users
        const userIds = roles?.map(r => r.user_id) || [];
        const { data: profiles } = await adminClient
          .from("profiles")
          .select("id, full_name, phone, avatar_url")
          .in("id", userIds);

        // Get emails from auth.users
        const { data: authUsers } = await adminClient.auth.admin.listUsers();
        const emailMap = new Map(authUsers?.users?.map(u => [u.id, u.email]) || []);

        const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);

        const enrichedUsers = roles?.map(role => ({
          ...role,
          profile: profileMap.get(role.user_id) || { full_name: null, phone: null },
          email: emailMap.get(role.user_id) || null,
        }));

        return new Response(
          JSON.stringify({ users: enrichedUsers }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      case "list_audit_logs": {
        if (!isSuperAdmin) {
          return new Response(
            JSON.stringify({ error: "Super admin access required" }),
            { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        let query = adminClient
          .from("audit_logs")
          .select(`
            *,
            business:businesses(name)
          `)
          .order("created_at", { ascending: false })
          .limit(1000);

        // Apply filters
        if (filters?.business_id) {
          query = query.eq("business_id", filters.business_id);
        }
        if (filters?.entity_type) {
          query = query.eq("entity_type", filters.entity_type);
        }
        if (filters?.action) {
          query = query.eq("action", filters.action);
        }
        if (filters?.date_from) {
          query = query.gte("created_at", filters.date_from);
        }
        if (filters?.date_to) {
          query = query.lte("created_at", filters.date_to);
        }

        const { data: logs, error } = await query;

        if (error) {
          console.error("Error fetching logs:", error);
          return new Response(
            JSON.stringify({ error: error.message }),
            { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        return new Response(
          JSON.stringify({ logs }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      case "create_business_with_owner": {
        if (!isSuperAdmin) {
          return new Response(
            JSON.stringify({ error: "Super admin access required" }),
            { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        const { business_name, owner_email, owner_password, owner_name, currency = "USD" } = payload || {};

        if (!business_name || !owner_email || !owner_password) {
          return new Response(
            JSON.stringify({ error: "Missing required fields: business_name, owner_email, owner_password" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        console.log("Creating business with owner:", business_name, owner_email);

        // 1. Create the auth user
        const { data: authData, error: authError } = await adminClient.auth.admin.createUser({
          email: owner_email,
          password: owner_password,
          email_confirm: true,
          user_metadata: { full_name: owner_name || owner_email.split('@')[0] },
        });

        if (authError) {
          console.error("Auth user creation error:", authError);
          return new Response(
            JSON.stringify({ error: authError.message }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        const newUserId = authData.user?.id;
        if (!newUserId) {
          return new Response(
            JSON.stringify({ error: "Failed to create user" }),
            { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        // Calculate trial_end_at (7 days from now)
        const trialEndAt = new Date();
        trialEndAt.setDate(trialEndAt.getDate() + 7);

        // 2. Create the business with trial status
        const { data: businessData, error: businessError } = await adminClient
          .from("businesses")
          .insert({
            name: business_name,
            currency,
            owner_id: newUserId,
            status: 'trial',
            trial_end_at: trialEndAt.toISOString(),
          })
          .select()
          .single();

        if (businessError) {
          console.error("Business creation error:", businessError);
          // Rollback: delete auth user
          await adminClient.auth.admin.deleteUser(newUserId);
          return new Response(
            JSON.stringify({ error: businessError.message }),
            { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        // 3. Create default branch
        const { data: branchData, error: branchError } = await adminClient
          .from("branches")
          .insert({
            business_id: businessData.id,
            name: "Main Branch",
          })
          .select()
          .single();

        if (branchError) {
          console.error("Branch creation error:", branchError);
        }

        // 4. Create default warehouse
        if (branchData) {
          await adminClient
            .from("warehouses")
            .insert({
              branch_id: branchData.id,
              name: "Main Warehouse",
            });
        }

        // 5. Create owner role
        const { error: roleError } = await adminClient
          .from("user_roles")
          .insert({
            user_id: newUserId,
            business_id: businessData.id,
            role: "owner",
          });

        if (roleError) {
          console.error("Role creation error:", roleError);
        }

        // 6. Create/update profile
        await adminClient
          .from("profiles")
          .upsert({
            id: newUserId,
            full_name: owner_name || owner_email.split('@')[0],
            business_id: businessData.id,
            branch_id: branchData?.id,
          }, { onConflict: "id" });

        // 7. Create default settings
        await adminClient
          .from("settings")
          .insert({ business_id: businessData.id });

        // 8. Log the action
        await adminClient.from("audit_logs").insert({
          business_id: businessData.id,
          entity_type: "business",
          action: "created_by_admin",
          entity_id: businessData.id,
          user_id: user.id,
          new_value: { 
            business_name, 
            owner_email, 
            created_by: user.email,
            status: 'trial',
            trial_end_at: trialEndAt.toISOString(),
          },
        });

        return new Response(
          JSON.stringify({ 
            success: true, 
            business: businessData,
            owner_id: newUserId,
            message: "Business and owner created successfully with 7-day trial"
          }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      case "start_trial": {
        if (!isSuperAdmin) {
          return new Response(
            JSON.stringify({ error: "Super admin access required" }),
            { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        if (!business_id) {
          return new Response(
            JSON.stringify({ error: "business_id required" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        const trialEndAt = new Date();
        trialEndAt.setDate(trialEndAt.getDate() + 7);

        const { error } = await adminClient
          .from("businesses")
          .update({ 
            status: 'trial',
            trial_end_at: trialEndAt.toISOString(),
          })
          .eq("id", business_id);

        if (error) {
          return new Response(
            JSON.stringify({ error: error.message }),
            { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        await adminClient.from("audit_logs").insert({
          business_id,
          entity_type: "business",
          action: "trial_started",
          entity_id: business_id,
          user_id: user.id,
          new_value: { status: "trial", trial_end_at: trialEndAt.toISOString(), started_by: user.email },
        });

        return new Response(
          JSON.stringify({ success: true, message: "Trial started (7 days)" }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      case "activate": {
        if (!isSuperAdmin) {
          return new Response(
            JSON.stringify({ error: "Super admin access required" }),
            { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        if (!business_id) {
          return new Response(
            JSON.stringify({ error: "business_id required" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        const { error } = await adminClient
          .from("businesses")
          .update({ status: 'active', trial_end_at: null })
          .eq("id", business_id);

        if (error) {
          return new Response(
            JSON.stringify({ error: error.message }),
            { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        await adminClient.from("audit_logs").insert({
          business_id,
          entity_type: "business",
          action: "activated",
          entity_id: business_id,
          user_id: user.id,
          new_value: { status: "active", activated_by: user.email },
        });

        return new Response(
          JSON.stringify({ success: true, message: "Business activated" }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      case "expire": {
        if (!isSuperAdmin) {
          return new Response(
            JSON.stringify({ error: "Super admin access required" }),
            { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        if (!business_id) {
          return new Response(
            JSON.stringify({ error: "business_id required" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        const { error } = await adminClient
          .from("businesses")
          .update({ status: 'expired' })
          .eq("id", business_id);

        if (error) {
          return new Response(
            JSON.stringify({ error: error.message }),
            { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        await adminClient.from("audit_logs").insert({
          business_id,
          entity_type: "business",
          action: "expired",
          entity_id: business_id,
          user_id: user.id,
          new_value: { status: "expired", expired_by: user.email },
        });

        return new Response(
          JSON.stringify({ success: true, message: "Business expired" }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      case "suspend": {
        if (!isSuperAdmin) {
          return new Response(
            JSON.stringify({ error: "Super admin access required" }),
            { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        if (!business_id) {
          return new Response(
            JSON.stringify({ error: "business_id required" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        const { error } = await adminClient
          .from("businesses")
          .update({ status: 'suspended' })
          .eq("id", business_id);

        if (error) {
          return new Response(
            JSON.stringify({ error: error.message }),
            { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        await adminClient.from("audit_logs").insert({
          business_id,
          entity_type: "business",
          action: "suspended",
          entity_id: business_id,
          user_id: user.id,
          new_value: { status: "suspended", suspended_by: user.email },
        });

        return new Response(
          JSON.stringify({ success: true, message: "Business suspended" }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      case "impersonate": {
        if (!isSuperAdmin) {
          return new Response(
            JSON.stringify({ error: "Super admin access required" }),
            { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        if (!business_id) {
          return new Response(
            JSON.stringify({ error: "business_id required" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        const { data: business } = await adminClient
          .from("businesses")
          .select("owner_id")
          .eq("id", business_id)
          .single();

        if (!business?.owner_id) {
          return new Response(
            JSON.stringify({ error: "Business owner not found" }),
            { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        // Log the impersonation attempt
        await adminClient.from("audit_logs").insert({
          business_id,
          entity_type: "admin",
          action: "impersonation",
          entity_id: business.owner_id,
          user_id: user.id,
          new_value: { impersonated_by: user.email, target_user: business.owner_id },
        });

        console.log("Impersonating owner:", business.owner_id);
        return new Response(
          JSON.stringify({ success: true, owner_id: business.owner_id }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      case "get_system_stats": {
        if (!isSuperAdmin) {
          return new Response(
            JSON.stringify({ error: "Super admin access required" }),
            { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        // Get system statistics including status counts
        const [businessesResult, usersResult, salesResult, productsResult, statusCounts] = await Promise.all([
          adminClient.from("businesses").select("id", { count: "exact", head: true }),
          adminClient.from("user_roles").select("id", { count: "exact", head: true }),
          adminClient.from("sales").select("total").limit(1000),
          adminClient.from("products").select("id", { count: "exact", head: true }),
          adminClient.from("businesses").select("status"),
        ]);

        const totalRevenue = salesResult.data?.reduce((sum, s) => sum + (s.total || 0), 0) || 0;

        // Count by status
        const statusMap = statusCounts.data?.reduce((acc: Record<string, number>, b) => {
          const status = b.status || 'active';
          acc[status] = (acc[status] || 0) + 1;
          return acc;
        }, {}) || {};

        return new Response(
          JSON.stringify({
            stats: {
              total_businesses: businessesResult.count || 0,
              total_users: usersResult.count || 0,
              total_products: productsResult.count || 0,
              total_revenue: totalRevenue,
              businesses_by_status: statusMap,
            },
          }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      default:
        return new Response(
          JSON.stringify({ error: "Unknown action" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
    }
  } catch (error) {
    console.error("Admin action error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});