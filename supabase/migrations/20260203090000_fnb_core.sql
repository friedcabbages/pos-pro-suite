-- F&B core schema: floor plans, tables, QR tokens, orders, bills, modifiers, recipes

-- 1) Enums
DO $$ BEGIN
  CREATE TYPE public.fnb_table_status AS ENUM ('available', 'occupied', 'reserved', 'cleaning', 'inactive');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE public.fnb_order_type AS ENUM ('dine_in', 'takeaway', 'delivery');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE public.fnb_order_status AS ENUM ('pending', 'accepted', 'rejected', 'preparing', 'ready', 'served', 'completed', 'cancelled');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE public.fnb_order_item_status AS ENUM ('pending', 'preparing', 'ready', 'served', 'cancelled');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE public.fnb_bill_status AS ENUM ('open', 'closed', 'voided');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE public.fnb_order_source AS ENUM ('qr', 'online', 'staff');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE public.fnb_prep_station AS ENUM ('kitchen', 'bar');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- 2) Extend products for F&B menu usage
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS is_menu_item BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_available BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS prep_station public.fnb_prep_station,
  ADD COLUMN IF NOT EXISTS sort_order INTEGER NOT NULL DEFAULT 0;

-- 3) Floor plans
CREATE TABLE IF NOT EXISTS public.fnb_floor_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  branch_id UUID NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  canvas_width INTEGER NOT NULL DEFAULT 1200,
  canvas_height INTEGER NOT NULL DEFAULT 800,
  grid_size INTEGER NOT NULL DEFAULT 20,
  layout_version INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 4) Tables (seating)
CREATE TABLE IF NOT EXISTS public.fnb_tables (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  branch_id UUID NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
  floor_plan_id UUID REFERENCES public.fnb_floor_plans(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  capacity INTEGER NOT NULL DEFAULT 2,
  status public.fnb_table_status NOT NULL DEFAULT 'available',
  pos_x INTEGER NOT NULL DEFAULT 0,
  pos_y INTEGER NOT NULL DEFAULT 0,
  width INTEGER NOT NULL DEFAULT 120,
  height INTEGER NOT NULL DEFAULT 120,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_fnb_tables_branch_name ON public.fnb_tables(branch_id, name);

-- 5) QR tokens per table (hashed)
CREATE TABLE IF NOT EXISTS public.fnb_table_qr_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  table_id UUID NOT NULL REFERENCES public.fnb_tables(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL UNIQUE,
  last_rotated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ,
  revoked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 6) Modifier groups and modifiers
CREATE TABLE IF NOT EXISTS public.fnb_modifier_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  is_required BOOLEAN NOT NULL DEFAULT false,
  min_select INTEGER NOT NULL DEFAULT 0,
  max_select INTEGER NOT NULL DEFAULT 1,
  is_multi BOOLEAN NOT NULL DEFAULT false,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.fnb_modifiers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID NOT NULL REFERENCES public.fnb_modifier_groups(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  price_delta DECIMAL(15,2) NOT NULL DEFAULT 0,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.fnb_product_modifier_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  group_id UUID NOT NULL REFERENCES public.fnb_modifier_groups(id) ON DELETE CASCADE,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_fnb_product_modifier_groups_unique ON public.fnb_product_modifier_groups(product_id, group_id);

-- 7) Orders and items
CREATE TABLE IF NOT EXISTS public.fnb_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  branch_id UUID NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
  table_id UUID REFERENCES public.fnb_tables(id) ON DELETE SET NULL,
  order_type public.fnb_order_type NOT NULL DEFAULT 'dine_in',
  status public.fnb_order_status NOT NULL DEFAULT 'pending',
  source public.fnb_order_source NOT NULL DEFAULT 'qr',
  customer_name TEXT,
  phone TEXT,
  notes TEXT,
  opened_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  accepted_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.fnb_order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES public.fnb_orders(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE RESTRICT,
  quantity INTEGER NOT NULL,
  price DECIMAL(15,2) NOT NULL,
  notes TEXT,
  station public.fnb_prep_station,
  status public.fnb_order_item_status NOT NULL DEFAULT 'pending',
  modifiers_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 8) Bills (for pay-at-cashier)
CREATE TABLE IF NOT EXISTS public.fnb_bills (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  branch_id UUID NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
  table_id UUID REFERENCES public.fnb_tables(id) ON DELETE SET NULL,
  status public.fnb_bill_status NOT NULL DEFAULT 'open',
  opened_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  closed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  opened_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  closed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.fnb_bill_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bill_id UUID NOT NULL REFERENCES public.fnb_bills(id) ON DELETE CASCADE,
  order_id UUID NOT NULL REFERENCES public.fnb_orders(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_fnb_bill_orders_unique ON public.fnb_bill_orders(bill_id, order_id);

-- 9) Recipes / BOM
CREATE TABLE IF NOT EXISTS public.fnb_recipes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  yield_quantity DECIMAL(15,4) NOT NULL DEFAULT 1,
  unit TEXT NOT NULL DEFAULT 'portion',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_fnb_recipes_business_product ON public.fnb_recipes(business_id, product_id);

CREATE TABLE IF NOT EXISTS public.fnb_recipe_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recipe_id UUID NOT NULL REFERENCES public.fnb_recipes(id) ON DELETE CASCADE,
  ingredient_product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE RESTRICT,
  quantity DECIMAL(15,4) NOT NULL,
  unit TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 10) Indexes
CREATE INDEX IF NOT EXISTS idx_fnb_floor_plans_business ON public.fnb_floor_plans(business_id);
CREATE INDEX IF NOT EXISTS idx_fnb_floor_plans_branch ON public.fnb_floor_plans(branch_id);

CREATE INDEX IF NOT EXISTS idx_fnb_tables_business ON public.fnb_tables(business_id);
CREATE INDEX IF NOT EXISTS idx_fnb_tables_branch ON public.fnb_tables(branch_id);
CREATE INDEX IF NOT EXISTS idx_fnb_tables_status ON public.fnb_tables(status);

CREATE INDEX IF NOT EXISTS idx_fnb_table_qr_tokens_table ON public.fnb_table_qr_tokens(table_id);

CREATE INDEX IF NOT EXISTS idx_fnb_modifier_groups_business ON public.fnb_modifier_groups(business_id);
CREATE INDEX IF NOT EXISTS idx_fnb_modifiers_group ON public.fnb_modifiers(group_id);

CREATE INDEX IF NOT EXISTS idx_fnb_orders_business ON public.fnb_orders(business_id);
CREATE INDEX IF NOT EXISTS idx_fnb_orders_branch ON public.fnb_orders(branch_id);
CREATE INDEX IF NOT EXISTS idx_fnb_orders_table ON public.fnb_orders(table_id);
CREATE INDEX IF NOT EXISTS idx_fnb_orders_status ON public.fnb_orders(status);
CREATE INDEX IF NOT EXISTS idx_fnb_orders_created ON public.fnb_orders(created_at);

CREATE INDEX IF NOT EXISTS idx_fnb_order_items_order ON public.fnb_order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_fnb_order_items_status ON public.fnb_order_items(status);

CREATE INDEX IF NOT EXISTS idx_fnb_bills_business ON public.fnb_bills(business_id);
CREATE INDEX IF NOT EXISTS idx_fnb_bills_branch ON public.fnb_bills(branch_id);
CREATE INDEX IF NOT EXISTS idx_fnb_bills_status ON public.fnb_bills(status);

CREATE INDEX IF NOT EXISTS idx_fnb_recipe_items_recipe ON public.fnb_recipe_items(recipe_id);

-- 11) Enable RLS
ALTER TABLE public.fnb_floor_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fnb_tables ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fnb_table_qr_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fnb_modifier_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fnb_modifiers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fnb_product_modifier_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fnb_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fnb_order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fnb_bills ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fnb_bill_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fnb_recipes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fnb_recipe_items ENABLE ROW LEVEL SECURITY;

-- 12) RLS policies (business scoped)
-- Floor plans
CREATE POLICY "Users can view fnb_floor_plans" ON public.fnb_floor_plans
  FOR SELECT USING (public.has_business_access(auth.uid(), business_id));
CREATE POLICY "Admins can manage fnb_floor_plans" ON public.fnb_floor_plans
  FOR ALL USING (public.is_admin_or_owner(auth.uid(), business_id));

-- Tables
CREATE POLICY "Users can view fnb_tables" ON public.fnb_tables
  FOR SELECT USING (public.has_business_access(auth.uid(), business_id));
CREATE POLICY "Admins can manage fnb_tables" ON public.fnb_tables
  FOR ALL USING (public.is_admin_or_owner(auth.uid(), business_id));

-- Table QR tokens
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
CREATE POLICY "Users can view fnb_modifier_groups" ON public.fnb_modifier_groups
  FOR SELECT USING (public.has_business_access(auth.uid(), business_id));
CREATE POLICY "Admins can manage fnb_modifier_groups" ON public.fnb_modifier_groups
  FOR ALL USING (public.is_admin_or_owner(auth.uid(), business_id));

-- Modifiers
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
CREATE POLICY "Users can view fnb_orders" ON public.fnb_orders
  FOR SELECT USING (public.has_business_access(auth.uid(), business_id));
CREATE POLICY "Users can insert fnb_orders" ON public.fnb_orders
  FOR INSERT WITH CHECK (public.has_business_access(auth.uid(), business_id));
CREATE POLICY "Users can update fnb_orders" ON public.fnb_orders
  FOR UPDATE USING (public.has_business_access(auth.uid(), business_id));
CREATE POLICY "Admins can delete fnb_orders" ON public.fnb_orders
  FOR DELETE USING (public.is_admin_or_owner(auth.uid(), business_id));

-- Order items
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
CREATE POLICY "Users can view fnb_bills" ON public.fnb_bills
  FOR SELECT USING (public.has_business_access(auth.uid(), business_id));
CREATE POLICY "Users can insert fnb_bills" ON public.fnb_bills
  FOR INSERT WITH CHECK (public.has_business_access(auth.uid(), business_id));
CREATE POLICY "Users can update fnb_bills" ON public.fnb_bills
  FOR UPDATE USING (public.has_business_access(auth.uid(), business_id));
CREATE POLICY "Admins can delete fnb_bills" ON public.fnb_bills
  FOR DELETE USING (public.is_admin_or_owner(auth.uid(), business_id));

-- Bill orders
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
CREATE POLICY "Users can view fnb_recipes" ON public.fnb_recipes
  FOR SELECT USING (public.has_business_access(auth.uid(), business_id));
CREATE POLICY "Admins can manage fnb_recipes" ON public.fnb_recipes
  FOR ALL USING (public.is_admin_or_owner(auth.uid(), business_id));

-- Recipe items
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

-- 13) Updated_at triggers
CREATE TRIGGER update_fnb_floor_plans_updated_at BEFORE UPDATE ON public.fnb_floor_plans
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_fnb_tables_updated_at BEFORE UPDATE ON public.fnb_tables
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_fnb_modifier_groups_updated_at BEFORE UPDATE ON public.fnb_modifier_groups
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_fnb_modifiers_updated_at BEFORE UPDATE ON public.fnb_modifiers
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_fnb_orders_updated_at BEFORE UPDATE ON public.fnb_orders
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_fnb_order_items_updated_at BEFORE UPDATE ON public.fnb_order_items
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_fnb_bills_updated_at BEFORE UPDATE ON public.fnb_bills
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_fnb_recipes_updated_at BEFORE UPDATE ON public.fnb_recipes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
