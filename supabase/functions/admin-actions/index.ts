import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.50.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !serviceRoleKey || !supabaseAnonKey) {
      return new Response(JSON.stringify({ error: "Server configuration error" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const adminClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // Read authorization header (same pattern as other working edge functions)
    const authHeaderLower = req.headers.get("authorization");
    const authHeaderUpper = req.headers.get("Authorization");
    const authHeader = authHeaderLower ?? authHeaderUpper;
    
    if (!authHeader?.toLowerCase().startsWith("bearer ")) {
      console.error("[admin-actions] Missing or invalid Authorization header");
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const token = authHeader.split(" ")[1]?.trim();
    
    if (!token) {
      console.error("[admin-actions] Empty token after parsing");
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Create a client with the user's auth header to validate the token
    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    
    // Validate token using getClaims (same as other working edge functions)
    const { data: claimsData, error: claimsError } = await userClient.auth.getClaims(token);
    
    if (claimsError || !claimsData?.claims?.sub) {
      console.error("[admin-actions] Token validation error:", claimsError?.message || "Unknown error");
      return new Response(JSON.stringify({ error: "Invalid token" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const userId = String(claimsData.claims.sub);
    const userEmail = claimsData.claims.email as string;

    if (!userId) {
      console.error("[admin-actions] No user ID in token claims");
      return new Response(JSON.stringify({ error: "Invalid token - no user id" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Check super admin from database table
    const { data: superAdminRecord } = await adminClient
      .from("super_admins")
      .select("id")
      .eq("user_id", userId)
      .single();
    
    const isSuperAdmin = !!superAdminRecord;
    
    // Read body as text first, then parse JSON (like other edge functions)
    let body: any;
    try {
      const bodyText = await req.text();
      if (!bodyText || bodyText.trim() === "") {
        return new Response(JSON.stringify({ error: "Empty request body" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      body = JSON.parse(bodyText);
    } catch (parseError) {
      console.error("[admin-actions] JSON parse error:", parseError);
      return new Response(JSON.stringify({ error: "Invalid JSON body" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const { action, business_id, filters, payload } = body;

    if (!action || typeof action !== "string") {
      return new Response(JSON.stringify({ error: "Missing or invalid action" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    console.log("Admin action:", action, "by user:", userEmail, "super admin:", isSuperAdmin);

    // Helper to log global audit
    const logGlobalAudit = async (actionName: string, entityType: string, entityId?: string, targetBusinessId?: string, targetUserId?: string, oldValue?: any, newValue?: any) => {
      await adminClient.from("global_audit_logs").insert({
        actor_id: userId,
        actor_email: userEmail,
        action: actionName,
        entity_type: entityType,
        entity_id: entityId,
        target_business_id: targetBusinessId,
        target_user_id: targetUserId,
        old_value: oldValue,
        new_value: newValue,
      });
    };

    // Helper to log subscription history
    const logSubscriptionHistory = async (businessId: string, actionName: string, fromStatus?: string, toStatus?: string, trialDays?: number, reason?: string) => {
      await adminClient.from("subscription_history").insert({
        business_id: businessId,
        changed_by: userId,
        action: actionName,
        from_status: fromStatus,
        to_status: toStatus,
        trial_days_added: trialDays,
        reason: reason,
      });
    };

    switch (action) {
      // This action is allowed for any authenticated user (to check their own status)
      case "check_super_admin":
        return new Response(JSON.stringify({ is_super_admin: isSuperAdmin }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });

      // Log access denied attempts - allowed for any authenticated user
      case "log_access_denied": {
        const { attempted_path, user_email } = payload || {};
        console.warn("SECURITY: Access denied attempt logged:", { user_id: userId, user_email, attempted_path });
        // Log to global audit (even non-super admins can log their own access denied)
        await adminClient.from("global_audit_logs").insert({
          actor_id: userId,
          actor_email: userEmail,
          action: 'access_denied',
          entity_type: 'admin_panel',
          entity_id: attempted_path,
          new_value: { attempted_path, user_email, timestamp: new Date().toISOString() },
        });
        return new Response(JSON.stringify({ logged: true }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      case "list_businesses": {
        if (!isSuperAdmin) return new Response(JSON.stringify({ error: "Super admin access required" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });

        const { data: businesses } = await adminClient.from("businesses").select("*").order("created_at", { ascending: false });
        const ownerIds = businesses?.map(b => b.owner_id).filter(Boolean) || [];
        const { data: owners } = await adminClient.from("profiles").select("id, full_name, phone").in("id", ownerIds);
        const ownerMap = new Map(owners?.map(o => [o.id, o]) || []);
        const { data: userCounts } = await adminClient.from("user_roles").select("business_id");
        const businessUserCounts = userCounts?.reduce((acc: Record<string, number>, role) => { acc[role.business_id] = (acc[role.business_id] || 0) + 1; return acc; }, {}) || {};
        const enrichedBusinesses = businesses?.map(b => ({ ...b, owner: ownerMap.get(b.owner_id) || null, user_count: businessUserCounts[b.id] || 0 }));
        return new Response(JSON.stringify({ businesses: enrichedBusinesses }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      case "list_users": {
        if (!isSuperAdmin) return new Response(JSON.stringify({ error: "Super admin access required" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
        const { data: roles } = await adminClient.from("user_roles").select(`*, business:businesses(name)`).order("created_at", { ascending: false });
        const userIds = roles?.map(r => r.user_id) || [];
        const { data: profiles } = await adminClient.from("profiles").select("id, full_name, phone, username, avatar_url").in("id", userIds);
        const { data: authUsers } = await adminClient.auth.admin.listUsers();
        const emailMap = new Map(authUsers?.users?.map(u => [u.id, u.email]) || []);
        const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);
        const enrichedUsers = roles?.map(role => ({ ...role, profile: profileMap.get(role.user_id) || { full_name: null, phone: null }, email: emailMap.get(role.user_id) || null }));
        return new Response(JSON.stringify({ users: enrichedUsers }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      case "get_business_users": {
        if (!isSuperAdmin) return new Response(JSON.stringify({ error: "Super admin access required" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
        const { data: roles } = await adminClient.from("user_roles").select("*").eq("business_id", business_id);
        const userIds = roles?.map(r => r.user_id) || [];
        const { data: profiles } = await adminClient.from("profiles").select("id, full_name, phone, username").in("id", userIds);
        const { data: authUsers } = await adminClient.auth.admin.listUsers();
        const emailMap = new Map(authUsers?.users?.map(u => [u.id, { email: u.email, banned: (u as any).banned_until !== null }]) || []);
        const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);
        const users = roles?.map(role => ({ ...role, profile: profileMap.get(role.user_id), email: emailMap.get(role.user_id)?.email, disabled: emailMap.get(role.user_id)?.banned }));
        return new Response(JSON.stringify({ users }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      case "get_enhanced_stats": {
        if (!isSuperAdmin) return new Response(JSON.stringify({ error: "Super admin access required" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
        const today = new Date().toISOString().split('T')[0];
        const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        
        const [businessesResult, usersResult, salesResult, todaySales, statusCounts, newToday, newWeek] = await Promise.all([
          adminClient.from("businesses").select("id", { count: "exact", head: true }),
          adminClient.from("user_roles").select("id", { count: "exact", head: true }),
          adminClient.from("sales").select("total"),
          adminClient.from("sales").select("business_id").gte("created_at", today),
          adminClient.from("businesses").select("status"),
          adminClient.from("businesses").select("id", { count: "exact", head: true }).gte("created_at", today),
          adminClient.from("businesses").select("id", { count: "exact", head: true }).gte("created_at", weekAgo),
        ]);

        const totalRevenue = salesResult.data?.reduce((sum, s) => sum + (s.total || 0), 0) || 0;
        const statusMap = statusCounts.data?.reduce((acc: Record<string, number>, b) => { acc[b.status || 'active'] = (acc[b.status || 'active'] || 0) + 1; return acc; }, {}) || {};
        const activeBusinessesToday = new Set(todaySales.data?.map(s => s.business_id)).size;

        // Top businesses by transaction count
        const { data: topBusinessData } = await adminClient.from("sales").select("business_id, businesses(name)").limit(1000);
        const businessCounts = topBusinessData?.reduce((acc: Record<string, { count: number; name: string }>, s: any) => {
          if (!acc[s.business_id]) acc[s.business_id] = { count: 0, name: s.businesses?.name || 'Unknown' };
          acc[s.business_id].count++;
          return acc;
        }, {}) || {};
        const topBusinesses = Object.entries(businessCounts).map(([id, data]) => ({ id, name: data.name, transaction_count: data.count, user_count: 0 })).sort((a, b) => b.transaction_count - a.transaction_count).slice(0, 5);

        return new Response(JSON.stringify({
          stats: {
            total_businesses: businessesResult.count || 0,
            total_users: usersResult.count || 0,
            total_revenue: totalRevenue,
            businesses_by_status: statusMap,
            new_businesses_today: newToday.count || 0,
            new_businesses_week: newWeek.count || 0,
            transactions_today: todaySales.data?.length || 0,
            active_businesses_today: activeBusinessesToday,
            top_businesses: topBusinesses,
          }
        }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      case "list_global_audit_logs": {
        if (!isSuperAdmin) return new Response(JSON.stringify({ error: "Super admin access required" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
        let query = adminClient.from("global_audit_logs").select("*").order("created_at", { ascending: false }).limit(500);
        if (filters?.business_id) query = query.eq("target_business_id", filters.business_id);
        if (filters?.action) query = query.eq("action", filters.action);
        if (filters?.entity_type) query = query.eq("entity_type", filters.entity_type);
        const { data: logs } = await query;
        return new Response(JSON.stringify({ logs: logs || [] }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      case "get_subscription_history": {
        if (!isSuperAdmin) return new Response(JSON.stringify({ error: "Super admin access required" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
        let query = adminClient.from("subscription_history").select("*").order("created_at", { ascending: false });
        if (business_id) query = query.eq("business_id", business_id);
        const { data: history } = await query;
        return new Response(JSON.stringify({ history: history || [] }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      case "extend_trial": {
        if (!isSuperAdmin) return new Response(JSON.stringify({ error: "Super admin access required" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
        const days = payload?.days || 7;
        const { data: business } = await adminClient.from("businesses").select("trial_end_at, status").eq("id", business_id).single();
        const baseDate = business?.trial_end_at ? new Date(business.trial_end_at) : new Date();
        baseDate.setDate(baseDate.getDate() + days);
        await adminClient.from("businesses").update({ trial_end_at: baseDate.toISOString(), status: 'trial' }).eq("id", business_id);
        await logSubscriptionHistory(business_id, 'trial_extended', business?.status, 'trial', days);
        await logGlobalAudit('trial_extended', 'subscription', business_id, business_id, undefined, undefined, { days_added: days });
        return new Response(JSON.stringify({ success: true }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      case "suspend_with_reason": {
        if (!isSuperAdmin) return new Response(JSON.stringify({ error: "Super admin access required" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
        const reason = payload?.reason || 'No reason provided';
        const { data: business } = await adminClient.from("businesses").select("status").eq("id", business_id).single();
        await adminClient.from("businesses").update({ status: 'suspended', suspend_reason: reason, suspended_at: new Date().toISOString(), suspended_by: userId }).eq("id", business_id);
        await logSubscriptionHistory(business_id, 'suspended', business?.status, 'suspended', undefined, reason);
        await logGlobalAudit('business_suspended', 'business', business_id, business_id, undefined, undefined, { reason });
        return new Response(JSON.stringify({ success: true }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      case "force_logout_business": {
        if (!isSuperAdmin) return new Response(JSON.stringify({ error: "Super admin access required" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
        // Note: True force logout requires invalidating sessions which isn't directly supported
        await logGlobalAudit('force_logout', 'business', business_id, business_id);
        return new Response(JSON.stringify({ success: true, message: "Logout signal sent" }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      case "upgrade_plan": {
        if (!isSuperAdmin) return new Response(JSON.stringify({ error: "Super admin access required" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
        const plan = payload?.plan || 'active';
        const { data: business } = await adminClient.from("businesses").select("status").eq("id", business_id).single();
        await adminClient.from("businesses").update({ status: plan, suspend_reason: null, suspended_at: null, suspended_by: null }).eq("id", business_id);
        await logSubscriptionHistory(business_id, 'plan_changed', business?.status, plan, undefined, payload?.manual_payment ? 'Manual payment' : undefined);
        await logGlobalAudit('plan_changed', 'subscription', business_id, business_id, undefined, { status: business?.status }, { status: plan });
        return new Response(JSON.stringify({ success: true }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      case "update_business_type": {
        if (!isSuperAdmin) return new Response(JSON.stringify({ error: "Super admin access required" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
        const { business_type } = payload;
        const validBusinessTypes = ['retail', 'fnb', 'service', 'venue'];
        if (!business_type || !validBusinessTypes.includes(business_type)) {
          return new Response(JSON.stringify({ error: "Invalid business_type. Must be one of: retail, fnb, service, venue" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
        }
        const { data: business } = await adminClient.from("businesses").select("business_type").eq("id", business_id).single();
        if (!business) {
          return new Response(JSON.stringify({ error: "Business not found" }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });
        }
        await adminClient.from("businesses").update({ business_type }).eq("id", business_id);
        await logGlobalAudit('business_type_changed', 'business', business_id, business_id, undefined, { business_type: business.business_type }, { business_type });
        return new Response(JSON.stringify({ success: true }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      case "update_user_role": {
        if (!isSuperAdmin) return new Response(JSON.stringify({ error: "Super admin access required" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
        const { user_id: targetUserId, business_id: targetBizId, new_role } = payload;
        const { data: oldRole } = await adminClient.from("user_roles").select("role").eq("user_id", targetUserId).eq("business_id", targetBizId).single();
        await adminClient.from("user_roles").update({ role: new_role }).eq("user_id", targetUserId).eq("business_id", targetBizId);
        await logGlobalAudit('user_role_changed', 'user', targetUserId, targetBizId, targetUserId, { role: oldRole?.role }, { role: new_role });
        return new Response(JSON.stringify({ success: true }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      case "disable_user": {
        if (!isSuperAdmin) return new Response(JSON.stringify({ error: "Super admin access required" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
        const { user_id: targetUserId, disabled } = payload;
        if (disabled) {
          await adminClient.auth.admin.updateUserById(targetUserId, { ban_duration: '876000h' }); // ~100 years
        } else {
          await adminClient.auth.admin.updateUserById(targetUserId, { ban_duration: 'none' });
        }
        await logGlobalAudit(disabled ? 'user_disabled' : 'user_enabled', 'user', targetUserId, undefined, targetUserId);
        return new Response(JSON.stringify({ success: true }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      case "update_username": {
        if (!isSuperAdmin) return new Response(JSON.stringify({ error: "Super admin access required" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
        
        console.log("[update_username] Payload received:", JSON.stringify(payload));
        
        if (!payload || typeof payload !== "object") {
          console.error("[update_username] Invalid payload:", payload);
          return new Response(JSON.stringify({ error: "Invalid payload" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
        }
        
        const { user_id: targetUserId, username } = payload;
        
        console.log("[update_username] Extracted values - user_id:", targetUserId, "username:", username);
        
        if (!targetUserId || typeof targetUserId !== "string") {
          console.error("[update_username] Missing or invalid user_id:", targetUserId);
          return new Response(JSON.stringify({ error: "Missing or invalid user_id" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
        }
        
        const usernameTrimmed = typeof username === "string" && username.trim() ? username.trim().toLowerCase() : null;
        
        if (usernameTrimmed) {
          const usernamePattern = /^[a-zA-Z0-9_]{3,30}$/;
          if (!usernamePattern.test(usernameTrimmed)) {
            return new Response(JSON.stringify({ error: "Username must be 3-30 characters and only contain letters, numbers, or underscores" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
          }

          const { data: existing, error: checkError } = await adminClient
            .from("profiles")
            .select("id")
            .eq("username", usernameTrimmed)
            .neq("id", targetUserId)
            .maybeSingle();

          if (checkError) {
            console.error("[update_username] Error checking existing username:", checkError);
            return new Response(JSON.stringify({ error: "Failed to check username availability" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
          }

          if (existing) {
            return new Response(JSON.stringify({ error: "Username already in use" }), { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } });
          }
        }

        const { data: oldProfile, error: profileError } = await adminClient
          .from("profiles")
          .select("username")
          .eq("id", targetUserId)
          .maybeSingle();
        
        if (profileError) {
          console.error("[update_username] Error fetching profile:", profileError);
          return new Response(JSON.stringify({ error: "Failed to fetch user profile" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
        }

        const { error: updateError } = await adminClient
          .from("profiles")
          .update({ username: usernameTrimmed })
          .eq("id", targetUserId);
        
        if (updateError) {
          console.error("[update_username] Error updating profile:", updateError);
          return new Response(JSON.stringify({ error: "Failed to update username" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
        }
        
        if (usernameTrimmed) {
          const { error: authError } = await adminClient.auth.admin.updateUserById(targetUserId, { 
            user_metadata: { username: usernameTrimmed } 
          });
          
          if (authError) {
            console.error("[update_username] Error updating auth metadata:", authError);
            // Don't fail the whole operation if metadata update fails
          }
        }
        
        await logGlobalAudit('username_updated', 'user', targetUserId, undefined, targetUserId, { username: oldProfile?.username || null }, { username: usernameTrimmed });
        return new Response(JSON.stringify({ success: true }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      case "send_password_reset": {
        if (!isSuperAdmin) return new Response(JSON.stringify({ error: "Super admin access required" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
        const { email } = payload;
        await adminClient.auth.resetPasswordForEmail(email);
        return new Response(JSON.stringify({ success: true }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      case "update_own_password": {
        if (!isSuperAdmin) return new Response(JSON.stringify({ error: "Super admin access required" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
        
        const { current_password, new_password } = payload || {};
        
        if (!current_password || !new_password) {
          return new Response(JSON.stringify({ error: "Missing required fields: current_password and new_password" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
        }
        
        if (new_password.length < 6) {
          return new Response(JSON.stringify({ error: "New password must be at least 6 characters" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
        }
        
        // Verify current password by attempting to sign in
        const verifyClient = createClient(supabaseUrl, supabaseAnonKey, {
          auth: { persistSession: false, autoRefreshToken: false },
        });
        
        const { error: signInError } = await verifyClient.auth.signInWithPassword({
          email: userEmail,
          password: current_password,
        });
        
        if (signInError) {
          // Return 400 instead of 401 to avoid confusion with authentication errors
          return new Response(JSON.stringify({ error: "Current password is incorrect" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
        }
        
        // Update password using admin client
        const { error: updateError } = await adminClient.auth.admin.updateUserById(userId, {
          password: new_password,
        });
        
        if (updateError) {
          console.error("[update_own_password] Password update error:", updateError.message);
          return new Response(JSON.stringify({ error: "Failed to update password" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
        }
        
        await logGlobalAudit('password_updated', 'user', userId, undefined, userId, {}, {});
        return new Response(JSON.stringify({ success: true }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      case "delete_business": {
        if (!isSuperAdmin) return new Response(JSON.stringify({ error: "Super admin access required" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
        const { data: business } = await adminClient.from("businesses").select("name").eq("id", business_id).single();
        await adminClient.from("businesses").delete().eq("id", business_id);
        await logGlobalAudit('business_deleted', 'business', business_id, undefined, undefined, { name: business?.name });
        return new Response(JSON.stringify({ success: true }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      case "list_broadcasts": {
        if (!isSuperAdmin) return new Response(JSON.stringify({ error: "Super admin access required" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
        const { data: broadcasts } = await adminClient.from("broadcasts").select("*").order("created_at", { ascending: false });
        return new Response(JSON.stringify({ broadcasts: broadcasts || [] }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      case "create_broadcast": {
        if (!isSuperAdmin) return new Response(JSON.stringify({ error: "Super admin access required" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
        await adminClient.from("broadcasts").insert({ ...payload, created_by: userId });
        await logGlobalAudit('broadcast_created', 'broadcast', undefined, undefined, undefined, undefined, payload);
        return new Response(JSON.stringify({ success: true }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      case "toggle_broadcast": {
        if (!isSuperAdmin) return new Response(JSON.stringify({ error: "Super admin access required" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
        await adminClient.from("broadcasts").update({ is_active: payload.active }).eq("id", payload.broadcast_id);
        return new Response(JSON.stringify({ success: true }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      case "get_system_settings": {
        if (!isSuperAdmin) return new Response(JSON.stringify({ error: "Super admin access required" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
        const { data: settings } = await adminClient.from("system_settings").select("*");
        return new Response(JSON.stringify({ settings: settings || [] }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      case "update_system_setting": {
        if (!isSuperAdmin) return new Response(JSON.stringify({ error: "Super admin access required" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
        const { key, value } = payload;
        await adminClient.from("system_settings").upsert({ key, value, updated_by: userId, updated_at: new Date().toISOString() }, { onConflict: 'key' });
        await logGlobalAudit('setting_updated', 'system', key, undefined, undefined, undefined, { key, value });
        return new Response(JSON.stringify({ success: true }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      case "list_feature_flags": {
        if (!isSuperAdmin) return new Response(JSON.stringify({ error: "Super admin access required" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
        let query = adminClient.from("feature_flags").select("*");
        if (business_id) query = query.eq("business_id", business_id);
        const { data: flags } = await query;
        return new Response(JSON.stringify({ flags: flags || [] }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      case "toggle_feature_flag": {
        if (!isSuperAdmin) return new Response(JSON.stringify({ error: "Super admin access required" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
        const { business_id: bizId, feature_key, enabled } = payload;
        await adminClient.from("feature_flags").upsert({ business_id: bizId, feature_key, enabled, updated_by: userId }, { onConflict: 'business_id,feature_key' });
        return new Response(JSON.stringify({ success: true }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      case "activate": case "suspend": case "expire": case "start_trial": {
        if (!isSuperAdmin) return new Response(JSON.stringify({ error: "Super admin access required" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
        const statusMap: Record<string, string> = { activate: 'active', suspend: 'suspended', expire: 'expired', start_trial: 'trial' };
        const newStatus = statusMap[action];
        const updates: any = { status: newStatus };
        if (action === 'start_trial') { const d = new Date(); d.setDate(d.getDate() + 7); updates.trial_end_at = d.toISOString(); }
        if (action === 'activate') { updates.trial_end_at = null; }
        await adminClient.from("businesses").update(updates).eq("id", business_id);
        await logGlobalAudit(`business_${action}d`, 'business', business_id, business_id);
        return new Response(JSON.stringify({ success: true }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      case "impersonate": {
        if (!isSuperAdmin) return new Response(JSON.stringify({ error: "Super admin access required" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
        const { data: business } = await adminClient.from("businesses").select("owner_id").eq("id", business_id).single();
        if (!business?.owner_id) return new Response(JSON.stringify({ error: "Owner not found" }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });
        await logGlobalAudit('impersonation', 'user', business.owner_id, business_id, business.owner_id);
        return new Response(JSON.stringify({ success: true, owner_id: business.owner_id }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      case "get_business_for_impersonation": {
        if (!isSuperAdmin) return new Response(JSON.stringify({ error: "Super admin access required" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
        const { data: business } = await adminClient.from("businesses").select("id, name, currency, tax_rate, logo_url, address, phone, email, status, trial_end_at, business_type, owner_id").eq("id", business_id).single();
        if (!business) return new Response(JSON.stringify({ error: "Business not found" }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });
        return new Response(JSON.stringify({ business }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      case "get_system_stats": {
        if (!isSuperAdmin) return new Response(JSON.stringify({ error: "Super admin access required" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
        const [businessesResult, usersResult, salesResult, statusCounts] = await Promise.all([
          adminClient.from("businesses").select("id", { count: "exact", head: true }),
          adminClient.from("user_roles").select("id", { count: "exact", head: true }),
          adminClient.from("sales").select("total").limit(1000),
          adminClient.from("businesses").select("status"),
        ]);
        const totalRevenue = salesResult.data?.reduce((sum, s) => sum + (s.total || 0), 0) || 0;
        const statusMap = statusCounts.data?.reduce((acc: Record<string, number>, b) => { acc[b.status || 'active'] = (acc[b.status || 'active'] || 0) + 1; return acc; }, {}) || {};
        return new Response(JSON.stringify({ stats: { total_businesses: businessesResult.count || 0, total_users: usersResult.count || 0, total_revenue: totalRevenue, businesses_by_status: statusMap } }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      case "create_business_with_owner": {
        if (!isSuperAdmin) return new Response(JSON.stringify({ error: "Super admin access required" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
        const { business_name, owner_email, owner_password, owner_name, owner_username, currency = "USD", business_type = "retail" } = payload || {};
        if (!business_name || !owner_email || !owner_password) return new Response(JSON.stringify({ error: "Missing required fields" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
        
        // Validate business_type
        const validBusinessTypes = ['retail', 'fnb', 'service', 'venue'];
        const businessType = typeof business_type === "string" && validBusinessTypes.includes(business_type) ? business_type : "retail";
        
        const ownerUsernameLower = typeof owner_username === "string" && owner_username.trim() ? owner_username.trim().toLowerCase() : null;
        
        // Validate username if provided
        if (ownerUsernameLower) {
          const usernamePattern = /^[a-zA-Z0-9_]{3,30}$/;
          if (!usernamePattern.test(ownerUsernameLower)) {
            return new Response(JSON.stringify({ error: "Username must be 3-30 characters and only contain letters, numbers, or underscores" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
          }

          // Check username uniqueness
          const { data: existingUsername } = await adminClient
            .from("profiles")
            .select("id")
            .eq("username", ownerUsernameLower)
            .maybeSingle();

          if (existingUsername) {
            return new Response(JSON.stringify({ error: "Username already in use" }), { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } });
          }
        }
        
        const userMetadata: Record<string, string> = { full_name: owner_name || owner_email.split('@')[0] };
        if (ownerUsernameLower) userMetadata.username = ownerUsernameLower;
        const { data: authData, error: authError } = await adminClient.auth.admin.createUser({ email: owner_email, password: owner_password, email_confirm: true, user_metadata: userMetadata });
        if (authError) return new Response(JSON.stringify({ error: authError.message }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
        const newUserId = authData.user?.id;
        const trialEndAt = new Date(); trialEndAt.setDate(trialEndAt.getDate() + 7);
        const { data: businessData, error: businessError } = await adminClient.from("businesses").insert({ name: business_name, currency, owner_id: newUserId, status: 'trial', trial_end_at: trialEndAt.toISOString(), business_type: businessType }).select().single();
        if (businessError) { await adminClient.auth.admin.deleteUser(newUserId!); return new Response(JSON.stringify({ error: businessError.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }); }
        const { data: branchData } = await adminClient.from("branches").insert({ business_id: businessData.id, name: "Main Branch" }).select().single();
        if (branchData) await adminClient.from("warehouses").insert({ branch_id: branchData.id, name: "Main Warehouse" });
        await adminClient.from("user_roles").insert({ user_id: newUserId, business_id: businessData.id, role: "owner" });
        await adminClient.from("profiles").upsert({ id: newUserId, full_name: owner_name || owner_email.split('@')[0], username: ownerUsernameLower, business_id: businessData.id, branch_id: branchData?.id }, { onConflict: "id" });
        await adminClient.from("settings").insert({ business_id: businessData.id });
        await logGlobalAudit('business_created', 'business', businessData.id, businessData.id, newUserId, undefined, { business_name, owner_email });
        return new Response(JSON.stringify({ success: true, business: businessData }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      case "list_audit_logs": {
        if (!isSuperAdmin) return new Response(JSON.stringify({ error: "Super admin access required" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
        let query = adminClient.from("audit_logs").select(`*, business:businesses(name)`).order("created_at", { ascending: false }).limit(1000);
        if (filters?.business_id) query = query.eq("business_id", filters.business_id);
        const { data: logs } = await query;
        return new Response(JSON.stringify({ logs }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      // --------------------
      // Backup & Restore
      // --------------------
      case "list_snapshots": {
        if (!isSuperAdmin) {
          return new Response(JSON.stringify({ error: "Super admin access required" }), {
            status: 403,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        if (!business_id) {
          return new Response(JSON.stringify({ error: "Missing business_id" }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        const { data: snapshots, error } = await adminClient
          .from("business_snapshots")
          .select("id,business_id,name,description,snapshot_data,created_by,created_at")
          .eq("business_id", business_id)
          .order("created_at", { ascending: false })
          .limit(50);

        if (error) {
          console.error("list_snapshots error:", error.message);
          return new Response(JSON.stringify({ error: error.message }), {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        return new Response(JSON.stringify({ snapshots: snapshots || [] }), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      case "create_snapshot": {
        if (!isSuperAdmin) {
          return new Response(JSON.stringify({ error: "Super admin access required" }), {
            status: 403,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        if (!business_id) {
          return new Response(JSON.stringify({ error: "Missing business_id" }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        const snapshotName = payload?.name as string | undefined;
        const snapshotDescription = (payload?.description as string | undefined) ?? null;
        if (!snapshotName || !snapshotName.trim()) {
          return new Response(JSON.stringify({ error: "Snapshot name is required" }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        console.log("[admin-actions] create_snapshot", { business_id, snapshotName });

        // Fetch the business + core data
        const { data: business, error: businessError } = await adminClient
          .from("businesses")
          .select("*")
          .eq("id", business_id)
          .single();
        if (businessError || !business) {
          return new Response(JSON.stringify({ error: businessError?.message || "Business not found" }), {
            status: 404,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        const { data: branches } = await adminClient.from("branches").select("*").eq("business_id", business_id);
        const branchIds = (branches || []).map((b: any) => b.id);

        const { data: warehouses } = branchIds.length
          ? await adminClient.from("warehouses").select("*").in("branch_id", branchIds)
          : { data: [] };

        const { data: categories } = await adminClient.from("categories").select("*").eq("business_id", business_id);
        const { data: suppliers } = await adminClient.from("suppliers").select("*").eq("business_id", business_id);
        const { data: products } = await adminClient.from("products").select("*").eq("business_id", business_id);
        const { data: expenses } = await adminClient.from("expenses").select("*").eq("business_id", business_id);
        const { data: purchase_orders } = await adminClient.from("purchase_orders").select("*").eq("business_id", business_id);

        const poIds = (purchase_orders || []).map((po: any) => po.id);
        const { data: purchase_order_items } = poIds.length
          ? await adminClient.from("purchase_order_items").select("*").in("purchase_order_id", poIds)
          : { data: [] };

        const { data: sales } = await adminClient.from("sales").select("*").eq("business_id", business_id);
        const saleIds = (sales || []).map((s: any) => s.id);
        const { data: sale_items } = saleIds.length
          ? await adminClient.from("sale_items").select("*").in("sale_id", saleIds)
          : { data: [] };

        const warehouseIds = (warehouses || []).map((w: any) => w.id);
        const { data: inventory } = warehouseIds.length
          ? await adminClient.from("inventory").select("*").in("warehouse_id", warehouseIds)
          : { data: [] };
        const { data: inventory_logs } = warehouseIds.length
          ? await adminClient.from("inventory_logs").select("*").in("warehouse_id", warehouseIds)
          : { data: [] };

        const { data: settings } = await adminClient.from("settings").select("*").eq("business_id", business_id).maybeSingle();
        const { data: user_roles } = await adminClient.from("user_roles").select("*").eq("business_id", business_id);

        const snapshotData = {
          business,
          branches: branches || [],
          warehouses: warehouses || [],
          categories: categories || [],
          suppliers: suppliers || [],
          products: products || [],
          inventory: inventory || [],
          inventory_logs: inventory_logs || [],
          sales: sales || [],
          sale_items: sale_items || [],
          expenses: expenses || [],
          purchase_orders: purchase_orders || [],
          purchase_order_items: purchase_order_items || [],
          settings: settings || null,
          user_roles: user_roles || [],
        };

        const { data: snapshot, error: snapshotError } = await adminClient
          .from("business_snapshots")
          .insert({
            business_id,
            name: snapshotName.trim(),
            description: snapshotDescription,
            snapshot_data: snapshotData,
            created_by: userId,
          })
          .select()
          .single();

        if (snapshotError) {
          console.error("create_snapshot insert error:", snapshotError.message);
          return new Response(JSON.stringify({ error: snapshotError.message }), {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        await logGlobalAudit("snapshot_created", "backup", snapshot.id, business_id, undefined, undefined, {
          snapshot_id: snapshot.id,
          name: snapshotName.trim(),
        });

        return new Response(JSON.stringify({ success: true, snapshot }), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      case "restore_snapshot": {
        if (!isSuperAdmin) {
          return new Response(JSON.stringify({ error: "Super admin access required" }), {
            status: 403,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        if (!business_id) {
          return new Response(JSON.stringify({ error: "Missing business_id" }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        const snapshotId = payload?.snapshot_id as string | undefined;
        if (!snapshotId) {
          return new Response(JSON.stringify({ error: "Missing snapshot_id" }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        console.log("[admin-actions] restore_snapshot", { business_id, snapshotId });

        const { data: snapshot, error: snapError } = await adminClient
          .from("business_snapshots")
          .select("*")
          .eq("id", snapshotId)
          .eq("business_id", business_id)
          .single();

        if (snapError || !snapshot) {
          return new Response(JSON.stringify({ error: snapError?.message || "Snapshot not found" }), {
            status: 404,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        const data = snapshot.snapshot_data as any;
        if (!data?.business?.id || data.business.id !== business_id) {
          return new Response(JSON.stringify({ error: "Snapshot data mismatch" }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        // Delete current business-scoped data (best-effort, ordered)
        // Note: This is intentionally explicit (no raw SQL) and relies on service role.
        const saleIds = (data.sales || []).map((s: any) => s.id).filter(Boolean);
        const poIds = (data.purchase_orders || []).map((po: any) => po.id).filter(Boolean);
        const branchIds = (data.branches || []).map((b: any) => b.id).filter(Boolean);
        const warehouseIds = (data.warehouses || []).map((w: any) => w.id).filter(Boolean);

        if (saleIds.length) await adminClient.from("sale_items").delete().in("sale_id", saleIds);
        await adminClient.from("sales").delete().eq("business_id", business_id);
        if (warehouseIds.length) await adminClient.from("inventory_logs").delete().in("warehouse_id", warehouseIds);
        if (warehouseIds.length) await adminClient.from("inventory").delete().in("warehouse_id", warehouseIds);
        if (poIds.length) await adminClient.from("purchase_order_items").delete().in("purchase_order_id", poIds);
        await adminClient.from("purchase_orders").delete().eq("business_id", business_id);
        await adminClient.from("expenses").delete().eq("business_id", business_id);
        await adminClient.from("products").delete().eq("business_id", business_id);
        await adminClient.from("categories").delete().eq("business_id", business_id);
        await adminClient.from("suppliers").delete().eq("business_id", business_id);
        if (branchIds.length) await adminClient.from("warehouses").delete().in("branch_id", branchIds);
        await adminClient.from("branches").delete().eq("business_id", business_id);
        await adminClient.from("settings").delete().eq("business_id", business_id);
        await adminClient.from("user_roles").delete().eq("business_id", business_id);

        // Restore business row (non-destructive: keep id)
        const businessUpdate: any = { ...data.business };
        delete businessUpdate.created_at;
        delete businessUpdate.updated_at;
        await adminClient.from("businesses").update(businessUpdate).eq("id", business_id);

        // Restore core tables (insert with original ids)
        if (data.branches?.length) await adminClient.from("branches").insert(data.branches);
        if (data.warehouses?.length) await adminClient.from("warehouses").insert(data.warehouses);
        if (data.categories?.length) await adminClient.from("categories").insert(data.categories);
        if (data.suppliers?.length) await adminClient.from("suppliers").insert(data.suppliers);
        if (data.products?.length) await adminClient.from("products").insert(data.products);
        if (data.settings) await adminClient.from("settings").insert(data.settings);
        if (data.user_roles?.length) await adminClient.from("user_roles").insert(data.user_roles);
        if (data.purchase_orders?.length) await adminClient.from("purchase_orders").insert(data.purchase_orders);
        if (data.purchase_order_items?.length) await adminClient.from("purchase_order_items").insert(data.purchase_order_items);
        if (data.inventory?.length) await adminClient.from("inventory").insert(data.inventory);
        if (data.inventory_logs?.length) await adminClient.from("inventory_logs").insert(data.inventory_logs);
        if (data.sales?.length) await adminClient.from("sales").insert(data.sales);
        if (data.sale_items?.length) await adminClient.from("sale_items").insert(data.sale_items);
        if (data.expenses?.length) await adminClient.from("expenses").insert(data.expenses);

        await logGlobalAudit("snapshot_restored", "backup", snapshotId, business_id, undefined, undefined, {
          snapshot_id: snapshotId,
          restored_at: new Date().toISOString(),
        });

        return new Response(JSON.stringify({ success: true }), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      default:
        return new Response(JSON.stringify({ error: "Unknown action" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
  } catch (error) {
    console.error("Admin action error:", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
