import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

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
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !serviceRoleKey) {
      return new Response(JSON.stringify({ error: "Server configuration error" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const adminClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } = await adminClient.auth.getUser(token);
    
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Invalid token" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Check super admin from database table
    const { data: superAdminRecord } = await adminClient
      .from("super_admins")
      .select("id")
      .eq("user_id", user.id)
      .single();
    
    const isSuperAdmin = !!superAdminRecord;
    
    const body = await req.json();
    const { action, business_id, filters, payload } = body;

    console.log("Admin action:", action, "by user:", user.email, "super admin:", isSuperAdmin);

    // Helper to log global audit
    const logGlobalAudit = async (actionName: string, entityType: string, entityId?: string, targetBusinessId?: string, targetUserId?: string, oldValue?: any, newValue?: any) => {
      await adminClient.from("global_audit_logs").insert({
        actor_id: user.id,
        actor_email: user.email,
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
        changed_by: user.id,
        action: actionName,
        from_status: fromStatus,
        to_status: toStatus,
        trial_days_added: trialDays,
        reason: reason,
      });
    };

    switch (action) {
      case "check_super_admin":
        return new Response(JSON.stringify({ is_super_admin: isSuperAdmin }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });

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
        const { data: profiles } = await adminClient.from("profiles").select("id, full_name, phone, avatar_url").in("id", userIds);
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
        const { data: profiles } = await adminClient.from("profiles").select("id, full_name, phone").in("id", userIds);
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
        await adminClient.from("businesses").update({ status: 'suspended', suspend_reason: reason, suspended_at: new Date().toISOString(), suspended_by: user.id }).eq("id", business_id);
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

      case "send_password_reset": {
        if (!isSuperAdmin) return new Response(JSON.stringify({ error: "Super admin access required" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
        const { email } = payload;
        await adminClient.auth.resetPasswordForEmail(email);
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
        await adminClient.from("broadcasts").insert({ ...payload, created_by: user.id });
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
        await adminClient.from("system_settings").upsert({ key, value, updated_by: user.id, updated_at: new Date().toISOString() }, { onConflict: 'key' });
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
        await adminClient.from("feature_flags").upsert({ business_id: bizId, feature_key, enabled, updated_by: user.id }, { onConflict: 'business_id,feature_key' });
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
        const { business_name, owner_email, owner_password, owner_name, currency = "USD" } = payload || {};
        if (!business_name || !owner_email || !owner_password) return new Response(JSON.stringify({ error: "Missing required fields" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
        const { data: authData, error: authError } = await adminClient.auth.admin.createUser({ email: owner_email, password: owner_password, email_confirm: true, user_metadata: { full_name: owner_name || owner_email.split('@')[0] } });
        if (authError) return new Response(JSON.stringify({ error: authError.message }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
        const newUserId = authData.user?.id;
        const trialEndAt = new Date(); trialEndAt.setDate(trialEndAt.getDate() + 7);
        const { data: businessData, error: businessError } = await adminClient.from("businesses").insert({ name: business_name, currency, owner_id: newUserId, status: 'trial', trial_end_at: trialEndAt.toISOString() }).select().single();
        if (businessError) { await adminClient.auth.admin.deleteUser(newUserId!); return new Response(JSON.stringify({ error: businessError.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }); }
        const { data: branchData } = await adminClient.from("branches").insert({ business_id: businessData.id, name: "Main Branch" }).select().single();
        if (branchData) await adminClient.from("warehouses").insert({ branch_id: branchData.id, name: "Main Warehouse" });
        await adminClient.from("user_roles").insert({ user_id: newUserId, business_id: businessData.id, role: "owner" });
        await adminClient.from("profiles").upsert({ id: newUserId, full_name: owner_name || owner_email.split('@')[0], business_id: businessData.id, branch_id: branchData?.id }, { onConflict: "id" });
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

      default:
        return new Response(JSON.stringify({ error: "Unknown action" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
  } catch (error) {
    console.error("Admin action error:", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
