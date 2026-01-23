-- Make plan feature gates restrictive so they cannot be bypassed by other permissive policies

-- Expenses
DROP POLICY IF EXISTS "Plan must allow expenses" ON public.expenses;
CREATE POLICY "Plan must allow expenses"
ON public.expenses
AS RESTRICTIVE
FOR ALL
USING (public.has_plan_feature(business_id, 'expenses'))
WITH CHECK (public.has_plan_feature(business_id, 'expenses'));

-- Purchase orders
DROP POLICY IF EXISTS "Plan must allow purchase_orders" ON public.purchase_orders;
CREATE POLICY "Plan must allow purchase_orders"
ON public.purchase_orders
AS RESTRICTIVE
FOR ALL
USING (public.has_plan_feature(business_id, 'purchase_orders'))
WITH CHECK (public.has_plan_feature(business_id, 'purchase_orders'));

-- Purchase order items
DROP POLICY IF EXISTS "Plan must allow purchase_order_items" ON public.purchase_order_items;
CREATE POLICY "Plan must allow purchase_order_items"
ON public.purchase_order_items
AS RESTRICTIVE
FOR ALL
USING (
  EXISTS (
    SELECT 1
    FROM public.purchase_orders po
    WHERE po.id = purchase_order_items.purchase_order_id
      AND public.has_plan_feature(po.business_id, 'purchase_orders')
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.purchase_orders po
    WHERE po.id = purchase_order_items.purchase_order_id
      AND public.has_plan_feature(po.business_id, 'purchase_orders')
  )
);
