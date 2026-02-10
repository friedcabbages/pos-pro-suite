-- Auto-deduct inventory when F&B bill is closed
-- This function calculates ingredient usage from recipes and creates inventory logs

CREATE OR REPLACE FUNCTION public.fnb_auto_deduct_inventory_on_bill_close()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_order_record RECORD;
  v_order_item_record RECORD;
  v_recipe_record RECORD;
  v_recipe_item_record RECORD;
  v_ingredient_qty DECIMAL(15,4);
  v_total_ingredient_qty DECIMAL(15,4);
  v_warehouse_id UUID;
BEGIN
  -- Only process when bill status changes from 'open' to 'closed'
  IF NEW.status = 'closed' AND OLD.status = 'open' THEN
    -- Get default warehouse for the branch (or first active warehouse)
    SELECT w.id INTO v_warehouse_id
    FROM public.warehouses w
    JOIN public.branches b ON b.id = w.branch_id
    WHERE b.id = NEW.branch_id AND w.is_active = true
    LIMIT 1;

    -- If no warehouse found, skip inventory deduction (log warning)
    IF v_warehouse_id IS NULL THEN
      RAISE WARNING 'No active warehouse found for branch % when closing bill %', NEW.branch_id, NEW.id;
      RETURN NEW;
    END IF;

    -- Loop through all orders linked to this bill
    FOR v_order_record IN
      SELECT o.id, o.business_id, o.branch_id
      FROM public.fnb_orders o
      JOIN public.fnb_bill_orders bo ON bo.order_id = o.id
      WHERE bo.bill_id = NEW.id
        AND o.status IN ('accepted', 'preparing', 'ready', 'served')
    LOOP
      -- Loop through order items
      FOR v_order_item_record IN
        SELECT oi.product_id, oi.quantity
        FROM public.fnb_order_items oi
        WHERE oi.order_id = v_order_record.id
      LOOP
        -- Check if this product has a recipe
        SELECT r.id INTO v_recipe_record
        FROM public.fnb_recipes r
        WHERE r.product_id = v_order_item_record.product_id
          AND r.business_id = v_order_record.business_id
        LIMIT 1;

        IF v_recipe_record.id IS NOT NULL THEN
          -- Process recipe items (ingredients)
          FOR v_recipe_item_record IN
            SELECT ri.ingredient_product_id, ri.quantity, ri.unit
            FROM public.fnb_recipe_items ri
            WHERE ri.recipe_id = v_recipe_record.id
          LOOP
            -- Calculate total ingredient quantity needed
            -- Formula: (recipe_item.quantity / recipe.yield_quantity) * order_item.quantity
            v_ingredient_qty := (
              v_recipe_item_record.quantity / 
              NULLIF(v_recipe_record.yield_quantity, 0)
            ) * v_order_item_record.quantity;

            -- Get current inventory quantity
            SELECT COALESCE(SUM(i.quantity), 0) INTO v_total_ingredient_qty
            FROM public.inventory i
            WHERE i.product_id = v_recipe_item_record.ingredient_product_id
              AND i.warehouse_id = v_warehouse_id;

            -- Create inventory log for deduction
            INSERT INTO public.inventory_logs (
              product_id,
              warehouse_id,
              action,
              quantity_before,
              quantity_after,
              quantity_change,
              reference_id,
              reference_type,
              notes,
              user_id
            ) VALUES (
              v_recipe_item_record.ingredient_product_id,
              v_warehouse_id,
              'sale',
              v_total_ingredient_qty,
              GREATEST(0, v_total_ingredient_qty - v_ingredient_qty),
              -v_ingredient_qty,
              NEW.id,
              'fnb_bill',
              format('Auto-deducted from F&B bill %s (order %s, menu item %s)', 
                     NEW.id, v_order_record.id, v_order_item_record.product_id),
              NEW.closed_by
            );

            -- Update inventory quantity
            INSERT INTO public.inventory (
              product_id,
              warehouse_id,
              quantity
            )
            VALUES (
              v_recipe_item_record.ingredient_product_id,
              v_warehouse_id,
              -v_ingredient_qty
            )
            ON CONFLICT (product_id, warehouse_id)
            DO UPDATE SET
              quantity = GREATEST(0, inventory.quantity - v_ingredient_qty),
              updated_at = now();
          END LOOP;
        END IF;
      END LOOP;
    END LOOP;
  END IF;

  RETURN NEW;
END;
$$;

-- Create trigger
DROP TRIGGER IF EXISTS trigger_fnb_auto_deduct_inventory ON public.fnb_bills;
CREATE TRIGGER trigger_fnb_auto_deduct_inventory
  AFTER UPDATE ON public.fnb_bills
  FOR EACH ROW
  EXECUTE FUNCTION public.fnb_auto_deduct_inventory_on_bill_close();

-- Create view for F&B sales with COGS calculation
CREATE OR REPLACE VIEW public.v_fnb_daily_sales
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
  -- COGS from inventory logs linked to F&B bills
  COALESCE(SUM(
    CASE 
      WHEN il.reference_type = 'fnb_bill' AND il.action = 'sale' 
      THEN ABS(il.quantity_change * p.cost_price)
      ELSE 0
    END
  ), 0) AS total_cogs,
  -- Profit = Revenue - COGS
  SUM(s.total) - COALESCE(SUM(
    CASE 
      WHEN il.reference_type = 'fnb_bill' AND il.action = 'sale' 
      THEN ABS(il.quantity_change * p.cost_price)
      ELSE 0
    END
  ), 0) AS total_profit
FROM public.sales s
LEFT JOIN public.inventory_logs il ON il.reference_id::text = s.id::text AND il.reference_type = 'fnb_bill'
LEFT JOIN public.products p ON p.id = il.product_id
WHERE EXISTS (
  SELECT 1 FROM public.fnb_bills fb
  WHERE fb.id::text = s.id::text
)
GROUP BY s.business_id, s.branch_id, DATE(s.created_at);

-- Create view for top F&B menu items
CREATE OR REPLACE VIEW public.v_fnb_top_items
WITH (security_invoker = true)
AS
SELECT 
  oi.product_id,
  p.business_id,
  p.name AS product_name,
  COUNT(DISTINCT o.id) AS order_count,
  SUM(oi.quantity) AS total_quantity_sold,
  SUM(oi.price * oi.quantity) AS total_revenue,
  AVG(oi.price) AS avg_price
FROM public.fnb_order_items oi
JOIN public.fnb_orders o ON o.id = oi.order_id
JOIN public.products p ON p.id = oi.product_id
WHERE o.status IN ('completed', 'served')
GROUP BY oi.product_id, p.business_id, p.name
ORDER BY total_revenue DESC;
