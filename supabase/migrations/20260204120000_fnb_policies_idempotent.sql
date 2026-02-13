-- Fix: Make F&B RLS policies idempotent (DROP IF EXISTS before CREATE)
-- Run this if 20260203090000_fnb_core.sql fails with "policy already exists"

-- Floor plans
DROP POLICY IF EXISTS "Users can view fnb_floor_plans" ON public.fnb_floor_plans;
DROP POLICY IF EXISTS "Admins can manage fnb_floor_plans" ON public.fnb_floor_plans;
CREATE POLICY "Users can view fnb_floor_plans" ON public.fnb_floor_plans
  FOR SELECT USING (public.has_business_access(auth.uid(), business_id));
CREATE POLICY "Admins can manage fnb_floor_plans" ON public.fnb_floor_plans
  FOR ALL USING (public.is_admin_or_owner(auth.uid(), business_id));

-- Tables
DROP POLICY IF EXISTS "Users can view fnb_tables" ON public.fnb_tables;
DROP POLICY IF EXISTS "Admins can manage fnb_tables" ON public.fnb_tables;
CREATE POLICY "Users can view fnb_tables" ON public.fnb_tables
  FOR SELECT USING (public.has_business_access(auth.uid(), business_id));
CREATE POLICY "Admins can manage fnb_tables" ON public.fnb_tables
  FOR ALL USING (public.is_admin_or_owner(auth.uid(), business_id));

-- Table QR tokens
DROP POLICY IF EXISTS "Users can view fnb_table_qr_tokens" ON public.fnb_table_qr_tokens;
DROP POLICY IF EXISTS "Admins can manage fnb_table_qr_tokens" ON public.fnb_table_qr_tokens;
CREATE POLICY "Users can view fnb_table_qr_tokens" ON public.fnb_table_qr_tokens
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.fnb_tables t
      WHERE t.id = table_id AND public.has_business_access(auth.uid(), t.business_id)
    )
  );
CREATE POLICY "Admins can manage fnb_table_qr_tokens" ON public.fnb_table_qr_tokens
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.fnb_tables t
      WHERE t.id = table_id AND public.is_admin_or_owner(auth.uid(), t.business_id)
    )
  );

-- Modifier groups
DROP POLICY IF EXISTS "Users can view fnb_modifier_groups" ON public.fnb_modifier_groups;
DROP POLICY IF EXISTS "Admins can manage fnb_modifier_groups" ON public.fnb_modifier_groups;
CREATE POLICY "Users can view fnb_modifier_groups" ON public.fnb_modifier_groups
  FOR SELECT USING (public.has_business_access(auth.uid(), business_id));
CREATE POLICY "Admins can manage fnb_modifier_groups" ON public.fnb_modifier_groups
  FOR ALL USING (public.is_admin_or_owner(auth.uid(), business_id));

-- Modifiers
DROP POLICY IF EXISTS "Users can view fnb_modifiers" ON public.fnb_modifiers;
DROP POLICY IF EXISTS "Admins can manage fnb_modifiers" ON public.fnb_modifiers;
CREATE POLICY "Users can view fnb_modifiers" ON public.fnb_modifiers
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.fnb_modifier_groups g
      WHERE g.id = group_id AND public.has_business_access(auth.uid(), g.business_id)
    )
  );
CREATE POLICY "Admins can manage fnb_modifiers" ON public.fnb_modifiers
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.fnb_modifier_groups g
      WHERE g.id = group_id AND public.is_admin_or_owner(auth.uid(), g.business_id)
    )
  );

-- Product modifier group links
DROP POLICY IF EXISTS "Users can view fnb_product_modifier_groups" ON public.fnb_product_modifier_groups;
DROP POLICY IF EXISTS "Admins can manage fnb_product_modifier_groups" ON public.fnb_product_modifier_groups;
CREATE POLICY "Users can view fnb_product_modifier_groups" ON public.fnb_product_modifier_groups
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.products p
      WHERE p.id = product_id AND public.has_business_access(auth.uid(), p.business_id)
    )
  );
CREATE POLICY "Admins can manage fnb_product_modifier_groups" ON public.fnb_product_modifier_groups
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.products p
      WHERE p.id = product_id AND public.is_admin_or_owner(auth.uid(), p.business_id)
    )
  );

-- Orders
DROP POLICY IF EXISTS "Users can view fnb_orders" ON public.fnb_orders;
DROP POLICY IF EXISTS "Users can insert fnb_orders" ON public.fnb_orders;
DROP POLICY IF EXISTS "Users can update fnb_orders" ON public.fnb_orders;
DROP POLICY IF EXISTS "Admins can delete fnb_orders" ON public.fnb_orders;
CREATE POLICY "Users can view fnb_orders" ON public.fnb_orders
  FOR SELECT USING (public.has_business_access(auth.uid(), business_id));
CREATE POLICY "Users can insert fnb_orders" ON public.fnb_orders
  FOR INSERT WITH CHECK (public.has_business_access(auth.uid(), business_id));
CREATE POLICY "Users can update fnb_orders" ON public.fnb_orders
  FOR UPDATE USING (public.has_business_access(auth.uid(), business_id));
CREATE POLICY "Admins can delete fnb_orders" ON public.fnb_orders
  FOR DELETE USING (public.is_admin_or_owner(auth.uid(), business_id));

-- Order items
DROP POLICY IF EXISTS "Users can view fnb_order_items" ON public.fnb_order_items;
DROP POLICY IF EXISTS "Users can insert fnb_order_items" ON public.fnb_order_items;
DROP POLICY IF EXISTS "Users can update fnb_order_items" ON public.fnb_order_items;
DROP POLICY IF EXISTS "Admins can delete fnb_order_items" ON public.fnb_order_items;
CREATE POLICY "Users can view fnb_order_items" ON public.fnb_order_items
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.fnb_orders o
      WHERE o.id = order_id AND public.has_business_access(auth.uid(), o.business_id)
    )
  );
CREATE POLICY "Users can insert fnb_order_items" ON public.fnb_order_items
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.fnb_orders o
      WHERE o.id = order_id AND public.has_business_access(auth.uid(), o.business_id)
    )
  );
CREATE POLICY "Users can update fnb_order_items" ON public.fnb_order_items
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.fnb_orders o
      WHERE o.id = order_id AND public.has_business_access(auth.uid(), o.business_id)
    )
  );
CREATE POLICY "Admins can delete fnb_order_items" ON public.fnb_order_items
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.fnb_orders o
      WHERE o.id = order_id AND public.is_admin_or_owner(auth.uid(), o.business_id)
    )
  );

-- Bills
DROP POLICY IF EXISTS "Users can view fnb_bills" ON public.fnb_bills;
DROP POLICY IF EXISTS "Users can insert fnb_bills" ON public.fnb_bills;
DROP POLICY IF EXISTS "Users can update fnb_bills" ON public.fnb_bills;
DROP POLICY IF EXISTS "Admins can delete fnb_bills" ON public.fnb_bills;
CREATE POLICY "Users can view fnb_bills" ON public.fnb_bills
  FOR SELECT USING (public.has_business_access(auth.uid(), business_id));
CREATE POLICY "Users can insert fnb_bills" ON public.fnb_bills
  FOR INSERT WITH CHECK (public.has_business_access(auth.uid(), business_id));
CREATE POLICY "Users can update fnb_bills" ON public.fnb_bills
  FOR UPDATE USING (public.has_business_access(auth.uid(), business_id));
CREATE POLICY "Admins can delete fnb_bills" ON public.fnb_bills
  FOR DELETE USING (public.is_admin_or_owner(auth.uid(), business_id));

-- Bill orders
DROP POLICY IF EXISTS "Users can view fnb_bill_orders" ON public.fnb_bill_orders;
DROP POLICY IF EXISTS "Users can insert fnb_bill_orders" ON public.fnb_bill_orders;
DROP POLICY IF EXISTS "Users can update fnb_bill_orders" ON public.fnb_bill_orders;
DROP POLICY IF EXISTS "Admins can delete fnb_bill_orders" ON public.fnb_bill_orders;
CREATE POLICY "Users can view fnb_bill_orders" ON public.fnb_bill_orders
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.fnb_bills b
      WHERE b.id = bill_id AND public.has_business_access(auth.uid(), b.business_id)
    )
  );
CREATE POLICY "Users can insert fnb_bill_orders" ON public.fnb_bill_orders
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.fnb_bills b
      WHERE b.id = bill_id AND public.has_business_access(auth.uid(), b.business_id)
    )
  );
CREATE POLICY "Users can update fnb_bill_orders" ON public.fnb_bill_orders
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.fnb_bills b
      WHERE b.id = bill_id AND public.has_business_access(auth.uid(), b.business_id)
    )
  );
CREATE POLICY "Admins can delete fnb_bill_orders" ON public.fnb_bill_orders
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.fnb_bills b
      WHERE b.id = bill_id AND public.is_admin_or_owner(auth.uid(), b.business_id)
    )
  );

-- Recipes
DROP POLICY IF EXISTS "Users can view fnb_recipes" ON public.fnb_recipes;
DROP POLICY IF EXISTS "Admins can manage fnb_recipes" ON public.fnb_recipes;
CREATE POLICY "Users can view fnb_recipes" ON public.fnb_recipes
  FOR SELECT USING (public.has_business_access(auth.uid(), business_id));
CREATE POLICY "Admins can manage fnb_recipes" ON public.fnb_recipes
  FOR ALL USING (public.is_admin_or_owner(auth.uid(), business_id));

-- Recipe items
DROP POLICY IF EXISTS "Users can view fnb_recipe_items" ON public.fnb_recipe_items;
DROP POLICY IF EXISTS "Admins can manage fnb_recipe_items" ON public.fnb_recipe_items;
CREATE POLICY "Users can view fnb_recipe_items" ON public.fnb_recipe_items
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.fnb_recipes r
      WHERE r.id = recipe_id AND public.has_business_access(auth.uid(), r.business_id)
    )
  );
CREATE POLICY "Admins can manage fnb_recipe_items" ON public.fnb_recipe_items
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.fnb_recipes r
      WHERE r.id = recipe_id AND public.is_admin_or_owner(auth.uid(), r.business_id)
    )
  );
