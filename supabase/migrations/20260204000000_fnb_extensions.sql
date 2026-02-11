-- F&B extensions: modifier %, reservation, order-type fees, split bill, merge table, promo, waste log

-- 1) Modifier: add price_type (fixed | percentage)
DO $$ BEGIN
  CREATE TYPE public.fnb_modifier_price_type AS ENUM ('fixed', 'percentage');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

ALTER TABLE public.fnb_modifiers
  ADD COLUMN IF NOT EXISTS price_type public.fnb_modifier_price_type NOT NULL DEFAULT 'fixed';
-- price_delta remains for fixed; for percentage, interpret as 0-100 (e.g. 10 = 10%)

-- 2) Order type: add reservation
ALTER TYPE public.fnb_order_type ADD VALUE IF NOT EXISTS 'reservation';

-- 3) fnb_orders: add order-type fee fields (tax, service charge, packaging)
ALTER TABLE public.fnb_orders
  ADD COLUMN IF NOT EXISTS service_charge_pct DECIMAL(5,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS tax_pct DECIMAL(5,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS packaging_fee DECIMAL(15,2) NOT NULL DEFAULT 0;

-- 4) fnb_bills: fee totals (computed on close or from orders)
ALTER TABLE public.fnb_bills
  ADD COLUMN IF NOT EXISTS subtotal DECIMAL(15,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS service_charge DECIMAL(15,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS tax_amount DECIMAL(15,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS packaging_fee DECIMAL(15,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total DECIMAL(15,2) DEFAULT 0;

-- 5) Split bill per seat
CREATE TABLE IF NOT EXISTS public.fnb_bill_seats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bill_id UUID NOT NULL REFERENCES public.fnb_bills(id) ON DELETE CASCADE,
  seat_label TEXT NOT NULL DEFAULT '1',
  order_ids UUID[] NOT NULL DEFAULT '{}',
  subtotal DECIMAL(15,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_fnb_bill_seats_bill ON public.fnb_bill_seats(bill_id);
ALTER TABLE public.fnb_bill_seats ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view fnb_bill_seats" ON public.fnb_bill_seats
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.fnb_bills b
      WHERE b.id = bill_id AND public.has_business_access(auth.uid(), b.business_id)
    )
  );
CREATE POLICY "Users can manage fnb_bill_seats" ON public.fnb_bill_seats
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.fnb_bills b
      WHERE b.id = bill_id AND public.has_business_access(auth.uid(), b.business_id)
    )
  );

-- 6) Merge table: link tables into a group
ALTER TABLE public.fnb_tables
  ADD COLUMN IF NOT EXISTS merged_into_table_id UUID REFERENCES public.fnb_tables(id) ON DELETE SET NULL;
-- When merged_into_table_id IS NOT NULL, this table is part of the merged group (parent has null)

-- 7) Inventory waste / spoilage log
CREATE TABLE IF NOT EXISTS public.inventory_waste_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  warehouse_id UUID NOT NULL REFERENCES public.warehouses(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE RESTRICT,
  quantity DECIMAL(15,4) NOT NULL,
  unit TEXT NOT NULL DEFAULT 'pcs',
  reason TEXT NOT NULL DEFAULT 'spoilage',
  batch_number TEXT,
  notes TEXT,
  logged_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_inventory_waste_logs_business ON public.inventory_waste_logs(business_id);
CREATE INDEX IF NOT EXISTS idx_inventory_waste_logs_warehouse ON public.inventory_waste_logs(warehouse_id);
CREATE INDEX IF NOT EXISTS idx_inventory_waste_logs_product ON public.inventory_waste_logs(product_id);
CREATE INDEX IF NOT EXISTS idx_inventory_waste_logs_created ON public.inventory_waste_logs(created_at);

ALTER TABLE public.inventory_waste_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view inventory_waste_logs" ON public.inventory_waste_logs
  FOR SELECT USING (public.has_business_access(auth.uid(), business_id));
CREATE POLICY "Admins can manage inventory_waste_logs" ON public.inventory_waste_logs
  FOR ALL USING (public.is_admin_or_owner(auth.uid(), business_id));

-- 8) Promo / promotions
DO $$ BEGIN
  CREATE TYPE public.fnb_promo_type AS ENUM ('percentage', 'fixed', 'bogo', 'bundle');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS public.fnb_promotions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  branch_id UUID REFERENCES public.branches(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  promo_type public.fnb_promo_type NOT NULL DEFAULT 'percentage',
  value DECIMAL(15,2) NOT NULL DEFAULT 0,
  min_order_amount DECIMAL(15,2) DEFAULT 0,
  product_ids UUID[] DEFAULT '{}',
  category_ids UUID[] DEFAULT '{}',
  start_at TIMESTAMPTZ NOT NULL,
  end_at TIMESTAMPTZ NOT NULL,
  day_of_week INTEGER[] DEFAULT '{0,1,2,3,4,5,6}',
  time_start TIME,
  time_end TIME,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_fnb_promotions_business ON public.fnb_promotions(business_id);
CREATE INDEX IF NOT EXISTS idx_fnb_promotions_dates ON public.fnb_promotions(start_at, end_at);

ALTER TABLE public.fnb_promotions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view fnb_promotions" ON public.fnb_promotions
  FOR SELECT USING (public.has_business_access(auth.uid(), business_id));
CREATE POLICY "Admins can manage fnb_promotions" ON public.fnb_promotions
  FOR ALL USING (public.is_admin_or_owner(auth.uid(), business_id));

CREATE TRIGGER update_fnb_promotions_updated_at BEFORE UPDATE ON public.fnb_promotions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 9) Bundles: product set with bundle price
CREATE TABLE IF NOT EXISTS public.fnb_bundles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  bundle_price DECIMAL(15,2) NOT NULL,
  product_ids UUID[] NOT NULL DEFAULT '{}',
  quantities INTEGER[] NOT NULL DEFAULT '{}',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_fnb_bundles_business ON public.fnb_bundles(business_id);

ALTER TABLE public.fnb_bundles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view fnb_bundles" ON public.fnb_bundles
  FOR SELECT USING (public.has_business_access(auth.uid(), business_id));
CREATE POLICY "Admins can manage fnb_bundles" ON public.fnb_bundles
  FOR ALL USING (public.is_admin_or_owner(auth.uid(), business_id));

CREATE TRIGGER update_fnb_bundles_updated_at BEFORE UPDATE ON public.fnb_bundles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 10) fnb_table_qr_tokens: add token_raw for building QR URL
ALTER TABLE public.fnb_table_qr_tokens
  ADD COLUMN IF NOT EXISTS token_raw TEXT;
