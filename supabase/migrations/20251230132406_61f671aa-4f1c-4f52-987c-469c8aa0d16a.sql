-- Create enum types
CREATE TYPE public.app_role AS ENUM ('owner', 'admin', 'cashier');
CREATE TYPE public.po_status AS ENUM ('draft', 'ordered', 'received', 'cancelled');
CREATE TYPE public.payment_method AS ENUM ('cash', 'transfer', 'qris', 'card', 'other');
CREATE TYPE public.inventory_action AS ENUM ('stock_in', 'stock_out', 'adjustment', 'transfer', 'po_receive', 'sale');

-- 1. BUSINESSES TABLE
CREATE TABLE public.businesses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  currency TEXT NOT NULL DEFAULT 'IDR',
  tax_rate DECIMAL(5,2) DEFAULT 0,
  logo_url TEXT,
  address TEXT,
  phone TEXT,
  email TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. BRANCHES TABLE
CREATE TABLE public.branches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  address TEXT,
  phone TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. PROFILES TABLE (linked to auth.users)
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  business_id UUID REFERENCES public.businesses(id) ON DELETE SET NULL,
  branch_id UUID REFERENCES public.branches(id) ON DELETE SET NULL,
  full_name TEXT,
  avatar_url TEXT,
  phone TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 4. USER_ROLES TABLE (separate from profiles for security)
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  branch_id UUID REFERENCES public.branches(id) ON DELETE SET NULL,
  role app_role NOT NULL DEFAULT 'cashier',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, business_id)
);

-- 5. CATEGORIES TABLE
CREATE TABLE public.categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 6. PRODUCTS TABLE
CREATE TABLE public.products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
  sku TEXT,
  barcode TEXT,
  name TEXT NOT NULL,
  description TEXT,
  unit TEXT DEFAULT 'pcs',
  cost_price DECIMAL(15,2) NOT NULL DEFAULT 0,
  sell_price DECIMAL(15,2) NOT NULL DEFAULT 0,
  market_price DECIMAL(15,2) DEFAULT 0,
  min_stock INTEGER DEFAULT 0,
  image_url TEXT,
  is_active BOOLEAN DEFAULT true,
  track_expiry BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 7. WAREHOUSES TABLE
CREATE TABLE public.warehouses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_id UUID NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  address TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 8. INVENTORY TABLE (stock per product per warehouse)
CREATE TABLE public.inventory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  warehouse_id UUID NOT NULL REFERENCES public.warehouses(id) ON DELETE CASCADE,
  quantity INTEGER NOT NULL DEFAULT 0,
  expiry_date DATE,
  batch_number TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (product_id, warehouse_id, batch_number)
);

-- 9. INVENTORY_LOGS TABLE
CREATE TABLE public.inventory_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  warehouse_id UUID NOT NULL REFERENCES public.warehouses(id) ON DELETE CASCADE,
  action inventory_action NOT NULL,
  quantity_before INTEGER NOT NULL,
  quantity_after INTEGER NOT NULL,
  quantity_change INTEGER NOT NULL,
  reference_id UUID,
  reference_type TEXT,
  notes TEXT,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 10. SUPPLIERS TABLE
CREATE TABLE public.suppliers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  contact_person TEXT,
  phone TEXT,
  email TEXT,
  address TEXT,
  notes TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 11. PURCHASE_ORDERS TABLE
CREATE TABLE public.purchase_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  branch_id UUID NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
  warehouse_id UUID NOT NULL REFERENCES public.warehouses(id) ON DELETE CASCADE,
  supplier_id UUID NOT NULL REFERENCES public.suppliers(id) ON DELETE RESTRICT,
  po_number TEXT NOT NULL,
  status po_status NOT NULL DEFAULT 'draft',
  total_cost DECIMAL(15,2) NOT NULL DEFAULT 0,
  notes TEXT,
  ordered_at TIMESTAMPTZ,
  received_at TIMESTAMPTZ,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  received_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 12. PURCHASE_ORDER_ITEMS TABLE
CREATE TABLE public.purchase_order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  purchase_order_id UUID NOT NULL REFERENCES public.purchase_orders(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE RESTRICT,
  quantity INTEGER NOT NULL,
  cost_price DECIMAL(15,2) NOT NULL,
  total_cost DECIMAL(15,2) NOT NULL,
  received_quantity INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 13. SALES TABLE
CREATE TABLE public.sales (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  branch_id UUID NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
  warehouse_id UUID NOT NULL REFERENCES public.warehouses(id) ON DELETE CASCADE,
  invoice_number TEXT NOT NULL,
  subtotal DECIMAL(15,2) NOT NULL DEFAULT 0,
  discount_amount DECIMAL(15,2) DEFAULT 0,
  tax_amount DECIMAL(15,2) DEFAULT 0,
  total DECIMAL(15,2) NOT NULL DEFAULT 0,
  payment_method payment_method NOT NULL DEFAULT 'cash',
  payment_amount DECIMAL(15,2) NOT NULL DEFAULT 0,
  change_amount DECIMAL(15,2) DEFAULT 0,
  customer_name TEXT,
  notes TEXT,
  cashier_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 14. SALE_ITEMS TABLE
CREATE TABLE public.sale_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sale_id UUID NOT NULL REFERENCES public.sales(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE RESTRICT,
  quantity INTEGER NOT NULL,
  sell_price DECIMAL(15,2) NOT NULL,
  cost_price DECIMAL(15,2) NOT NULL,
  discount_amount DECIMAL(15,2) DEFAULT 0,
  total DECIMAL(15,2) NOT NULL,
  profit DECIMAL(15,2) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 15. EXPENSES TABLE
CREATE TABLE public.expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  branch_id UUID REFERENCES public.branches(id) ON DELETE SET NULL,
  category TEXT NOT NULL,
  description TEXT,
  amount DECIMAL(15,2) NOT NULL,
  expense_date DATE NOT NULL DEFAULT CURRENT_DATE,
  is_fixed BOOLEAN DEFAULT false,
  receipt_url TEXT,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 16. AUDIT_LOGS TABLE
CREATE TABLE public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  entity_type TEXT NOT NULL,
  entity_id UUID,
  action TEXT NOT NULL,
  old_value JSONB,
  new_value JSONB,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 17. SETTINGS TABLE
CREATE TABLE public.settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE UNIQUE,
  enable_expiry_tracking BOOLEAN DEFAULT false,
  enable_multi_warehouse BOOLEAN DEFAULT true,
  enable_tax BOOLEAN DEFAULT false,
  enable_expenses BOOLEAN DEFAULT true,
  default_tax_rate DECIMAL(5,2) DEFAULT 0,
  receipt_header TEXT,
  receipt_footer TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create indexes for performance
CREATE INDEX idx_branches_business ON public.branches(business_id);
CREATE INDEX idx_profiles_business ON public.profiles(business_id);
CREATE INDEX idx_user_roles_user ON public.user_roles(user_id);
CREATE INDEX idx_user_roles_business ON public.user_roles(business_id);
CREATE INDEX idx_products_business ON public.products(business_id);
CREATE INDEX idx_products_category ON public.products(category_id);
CREATE INDEX idx_products_sku ON public.products(sku);
CREATE INDEX idx_products_barcode ON public.products(barcode);
CREATE INDEX idx_warehouses_branch ON public.warehouses(branch_id);
CREATE INDEX idx_inventory_product ON public.inventory(product_id);
CREATE INDEX idx_inventory_warehouse ON public.inventory(warehouse_id);
CREATE INDEX idx_inventory_logs_product ON public.inventory_logs(product_id);
CREATE INDEX idx_inventory_logs_created ON public.inventory_logs(created_at);
CREATE INDEX idx_suppliers_business ON public.suppliers(business_id);
CREATE INDEX idx_purchase_orders_business ON public.purchase_orders(business_id);
CREATE INDEX idx_purchase_orders_supplier ON public.purchase_orders(supplier_id);
CREATE INDEX idx_purchase_orders_status ON public.purchase_orders(status);
CREATE INDEX idx_sales_business ON public.sales(business_id);
CREATE INDEX idx_sales_branch ON public.sales(branch_id);
CREATE INDEX idx_sales_created ON public.sales(created_at);
CREATE INDEX idx_sale_items_sale ON public.sale_items(sale_id);
CREATE INDEX idx_expenses_business ON public.expenses(business_id);
CREATE INDEX idx_expenses_date ON public.expenses(expense_date);
CREATE INDEX idx_audit_logs_business ON public.audit_logs(business_id);
CREATE INDEX idx_audit_logs_entity ON public.audit_logs(entity_type, entity_id);
CREATE INDEX idx_audit_logs_created ON public.audit_logs(created_at);

-- Enable RLS on all tables
ALTER TABLE public.businesses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.branches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.warehouses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchase_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchase_order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sale_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;

-- Security definer function to get user's business_id
CREATE OR REPLACE FUNCTION public.get_user_business_id()
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT business_id FROM public.profiles WHERE id = auth.uid()
$$;

-- Security definer function to check user role
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- Security definer function to check if user has access to business
CREATE OR REPLACE FUNCTION public.has_business_access(_user_id UUID, _business_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND business_id = _business_id
  )
$$;

-- Security definer function to check if user has access to branch
CREATE OR REPLACE FUNCTION public.has_branch_access(_user_id UUID, _branch_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles ur
    JOIN public.branches b ON b.business_id = ur.business_id
    WHERE ur.user_id = _user_id 
    AND (ur.branch_id IS NULL OR ur.branch_id = _branch_id OR b.id = _branch_id)
    AND (ur.role = 'owner' OR ur.branch_id = _branch_id)
  )
$$;

-- Security definer function to check if user is owner
CREATE OR REPLACE FUNCTION public.is_owner(_user_id UUID, _business_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND business_id = _business_id AND role = 'owner'
  )
$$;

-- Security definer function to check if user is admin or owner
CREATE OR REPLACE FUNCTION public.is_admin_or_owner(_user_id UUID, _business_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id 
    AND business_id = _business_id 
    AND role IN ('owner', 'admin')
  )
$$;

-- RLS POLICIES

-- Businesses: users can only see their own business
CREATE POLICY "Users can view own business" ON public.businesses
  FOR SELECT USING (public.has_business_access(auth.uid(), id));

CREATE POLICY "Owners can update business" ON public.businesses
  FOR UPDATE USING (public.is_owner(auth.uid(), id));

-- Branches: users can see branches of their business
CREATE POLICY "Users can view business branches" ON public.branches
  FOR SELECT USING (public.has_business_access(auth.uid(), business_id));

CREATE POLICY "Owners can manage branches" ON public.branches
  FOR ALL USING (public.is_owner(auth.uid(), business_id));

-- Profiles: users can view/update own profile
CREATE POLICY "Users can view own profile" ON public.profiles
  FOR SELECT USING (id = auth.uid());

CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE USING (id = auth.uid());

CREATE POLICY "Users can insert own profile" ON public.profiles
  FOR INSERT WITH CHECK (id = auth.uid());

-- User roles: restrict access
CREATE POLICY "Users can view own roles" ON public.user_roles
  FOR SELECT USING (user_id = auth.uid() OR public.is_owner(auth.uid(), business_id));

CREATE POLICY "Owners can manage roles" ON public.user_roles
  FOR ALL USING (public.is_owner(auth.uid(), business_id));

-- Categories: business-scoped
CREATE POLICY "Users can view categories" ON public.categories
  FOR SELECT USING (public.has_business_access(auth.uid(), business_id));

CREATE POLICY "Admins can manage categories" ON public.categories
  FOR ALL USING (public.is_admin_or_owner(auth.uid(), business_id));

-- Products: business-scoped
CREATE POLICY "Users can view products" ON public.products
  FOR SELECT USING (public.has_business_access(auth.uid(), business_id));

CREATE POLICY "Admins can manage products" ON public.products
  FOR ALL USING (public.is_admin_or_owner(auth.uid(), business_id));

-- Warehouses: branch-scoped
CREATE POLICY "Users can view warehouses" ON public.warehouses
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.branches b
      WHERE b.id = branch_id AND public.has_business_access(auth.uid(), b.business_id)
    )
  );

CREATE POLICY "Admins can manage warehouses" ON public.warehouses
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.branches b
      WHERE b.id = branch_id AND public.is_admin_or_owner(auth.uid(), b.business_id)
    )
  );

-- Inventory: warehouse-scoped
CREATE POLICY "Users can view inventory" ON public.inventory
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.warehouses w
      JOIN public.branches b ON b.id = w.branch_id
      WHERE w.id = warehouse_id AND public.has_business_access(auth.uid(), b.business_id)
    )
  );

CREATE POLICY "Admins can manage inventory" ON public.inventory
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.warehouses w
      JOIN public.branches b ON b.id = w.branch_id
      WHERE w.id = warehouse_id AND public.is_admin_or_owner(auth.uid(), b.business_id)
    )
  );

-- Inventory logs: read-only for users
CREATE POLICY "Users can view inventory logs" ON public.inventory_logs
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.warehouses w
      JOIN public.branches b ON b.id = w.branch_id
      WHERE w.id = warehouse_id AND public.has_business_access(auth.uid(), b.business_id)
    )
  );

CREATE POLICY "System can insert inventory logs" ON public.inventory_logs
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.warehouses w
      JOIN public.branches b ON b.id = w.branch_id
      WHERE w.id = warehouse_id AND public.has_business_access(auth.uid(), b.business_id)
    )
  );

-- Suppliers: business-scoped
CREATE POLICY "Users can view suppliers" ON public.suppliers
  FOR SELECT USING (public.has_business_access(auth.uid(), business_id));

CREATE POLICY "Admins can manage suppliers" ON public.suppliers
  FOR ALL USING (public.is_admin_or_owner(auth.uid(), business_id));

-- Purchase orders: business-scoped
CREATE POLICY "Users can view purchase orders" ON public.purchase_orders
  FOR SELECT USING (public.has_business_access(auth.uid(), business_id));

CREATE POLICY "Admins can manage purchase orders" ON public.purchase_orders
  FOR ALL USING (public.is_admin_or_owner(auth.uid(), business_id));

-- Purchase order items
CREATE POLICY "Users can view PO items" ON public.purchase_order_items
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.purchase_orders po
      WHERE po.id = purchase_order_id AND public.has_business_access(auth.uid(), po.business_id)
    )
  );

CREATE POLICY "Admins can manage PO items" ON public.purchase_order_items
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.purchase_orders po
      WHERE po.id = purchase_order_id AND public.is_admin_or_owner(auth.uid(), po.business_id)
    )
  );

-- Sales: business-scoped, cashiers can insert
CREATE POLICY "Users can view sales" ON public.sales
  FOR SELECT USING (public.has_business_access(auth.uid(), business_id));

CREATE POLICY "Users can create sales" ON public.sales
  FOR INSERT WITH CHECK (public.has_business_access(auth.uid(), business_id));

CREATE POLICY "Admins can manage sales" ON public.sales
  FOR UPDATE USING (public.is_admin_or_owner(auth.uid(), business_id));

CREATE POLICY "Admins can delete sales" ON public.sales
  FOR DELETE USING (public.is_admin_or_owner(auth.uid(), business_id));

-- Sale items
CREATE POLICY "Users can view sale items" ON public.sale_items
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.sales s
      WHERE s.id = sale_id AND public.has_business_access(auth.uid(), s.business_id)
    )
  );

CREATE POLICY "Users can create sale items" ON public.sale_items
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.sales s
      WHERE s.id = sale_id AND public.has_business_access(auth.uid(), s.business_id)
    )
  );

-- Expenses: business-scoped
CREATE POLICY "Users can view expenses" ON public.expenses
  FOR SELECT USING (public.has_business_access(auth.uid(), business_id));

CREATE POLICY "Admins can manage expenses" ON public.expenses
  FOR ALL USING (public.is_admin_or_owner(auth.uid(), business_id));

-- Audit logs: read-only
CREATE POLICY "Users can view audit logs" ON public.audit_logs
  FOR SELECT USING (public.has_business_access(auth.uid(), business_id));

CREATE POLICY "System can insert audit logs" ON public.audit_logs
  FOR INSERT WITH CHECK (public.has_business_access(auth.uid(), business_id));

-- Settings: business-scoped
CREATE POLICY "Users can view settings" ON public.settings
  FOR SELECT USING (public.has_business_access(auth.uid(), business_id));

CREATE POLICY "Owners can manage settings" ON public.settings
  FOR ALL USING (public.is_owner(auth.uid(), business_id));

-- Create trigger for auto-creating profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name)
  VALUES (NEW.id, NEW.raw_user_meta_data ->> 'full_name');
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Add update triggers to relevant tables
CREATE TRIGGER update_businesses_updated_at BEFORE UPDATE ON public.businesses
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_branches_updated_at BEFORE UPDATE ON public.branches
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_products_updated_at BEFORE UPDATE ON public.products
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_warehouses_updated_at BEFORE UPDATE ON public.warehouses
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_inventory_updated_at BEFORE UPDATE ON public.inventory
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_suppliers_updated_at BEFORE UPDATE ON public.suppliers
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_purchase_orders_updated_at BEFORE UPDATE ON public.purchase_orders
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_expenses_updated_at BEFORE UPDATE ON public.expenses
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_settings_updated_at BEFORE UPDATE ON public.settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Create views for analytics

-- Product margin analysis view
CREATE OR REPLACE VIEW public.v_product_margins AS
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

-- Daily sales summary view
CREATE OR REPLACE VIEW public.v_daily_sales AS
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

-- Low stock alert view
CREATE OR REPLACE VIEW public.v_low_stock AS
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

-- Supplier performance view
CREATE OR REPLACE VIEW public.v_supplier_performance AS
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