-- Fix security definer views by recreating them with SECURITY INVOKER
DROP VIEW IF EXISTS public.v_product_margins;
DROP VIEW IF EXISTS public.v_daily_sales;
DROP VIEW IF EXISTS public.v_low_stock;
DROP VIEW IF EXISTS public.v_supplier_performance;

-- Recreate views with SECURITY INVOKER (default, explicit for clarity)
CREATE VIEW public.v_product_margins 
WITH (security_invoker = true)
AS
SELECT 
  p.id,
  p.business_id,
  p.name,
  p.sku,
  p.cost_price,
  p.sell_price,
  p.market_price,
  CASE WHEN p.sell_price > 0 THEN 
    ROUND(((p.sell_price - p.cost_price) / p.sell_price * 100)::numeric, 2)
  ELSE 0 END AS margin_percentage,
  (p.sell_price - p.cost_price) AS profit_per_unit,
  COALESCE(SUM(i.quantity), 0) AS total_stock,
  COALESCE(SUM(i.quantity), 0) * p.cost_price AS stock_value
FROM public.products p
LEFT JOIN public.inventory i ON i.product_id = p.id
GROUP BY p.id;

CREATE VIEW public.v_daily_sales 
WITH (security_invoker = true)
AS
SELECT 
  s.business_id,
  s.branch_id,
  DATE(s.created_at) AS sale_date,
  COUNT(*) AS total_transactions,
  SUM(s.total) AS total_revenue,
  SUM(s.discount_amount) AS total_discounts,
  SUM(s.tax_amount) AS total_tax,
  SUM(si.cost_price * si.quantity) AS total_cogs,
  SUM(si.profit) AS total_profit
FROM public.sales s
JOIN public.sale_items si ON si.sale_id = s.id
GROUP BY s.business_id, s.branch_id, DATE(s.created_at);

CREATE VIEW public.v_low_stock 
WITH (security_invoker = true)
AS
SELECT 
  p.id AS product_id,
  p.business_id,
  p.name AS product_name,
  p.sku,
  p.min_stock,
  w.id AS warehouse_id,
  w.name AS warehouse_name,
  b.id AS branch_id,
  b.name AS branch_name,
  COALESCE(i.quantity, 0) AS current_stock,
  p.min_stock - COALESCE(i.quantity, 0) AS stock_deficit
FROM public.products p
CROSS JOIN public.warehouses w
JOIN public.branches b ON b.id = w.branch_id
LEFT JOIN public.inventory i ON i.product_id = p.id AND i.warehouse_id = w.id
WHERE p.business_id = b.business_id
AND COALESCE(i.quantity, 0) < p.min_stock;

CREATE VIEW public.v_supplier_performance 
WITH (security_invoker = true)
AS
SELECT 
  s.id AS supplier_id,
  s.business_id,
  s.name AS supplier_name,
  COUNT(po.id) AS total_orders,
  COUNT(CASE WHEN po.status = 'received' THEN 1 END) AS completed_orders,
  COALESCE(SUM(CASE WHEN po.status = 'received' THEN po.total_cost END), 0) AS total_value
FROM public.suppliers s
LEFT JOIN public.purchase_orders po ON po.supplier_id = s.id
GROUP BY s.id, s.business_id, s.name;

-- Fix function search path for update_updated_at_column
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;