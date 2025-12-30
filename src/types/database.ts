export type AppRole = 'owner' | 'admin' | 'cashier';
export type POStatus = 'draft' | 'ordered' | 'received' | 'cancelled';
export type PaymentMethod = 'cash' | 'transfer' | 'qris' | 'card' | 'other';
export type InventoryAction = 'stock_in' | 'stock_out' | 'adjustment' | 'transfer' | 'po_receive' | 'sale';

export interface Business {
  id: string;
  name: string;
  currency: string;
  tax_rate: number;
  logo_url: string | null;
  address: string | null;
  phone: string | null;
  email: string | null;
  created_at: string;
  updated_at: string;
}

export interface Branch {
  id: string;
  business_id: string;
  name: string;
  address: string | null;
  phone: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Profile {
  id: string;
  business_id: string | null;
  branch_id: string | null;
  full_name: string | null;
  avatar_url: string | null;
  phone: string | null;
  created_at: string;
  updated_at: string;
}

export interface UserRole {
  id: string;
  user_id: string;
  business_id: string;
  branch_id: string | null;
  role: AppRole;
  created_at: string;
}

export interface Category {
  id: string;
  business_id: string;
  name: string;
  description: string | null;
  created_at: string;
}

export interface Product {
  id: string;
  business_id: string;
  category_id: string | null;
  sku: string | null;
  barcode: string | null;
  name: string;
  description: string | null;
  unit: string;
  cost_price: number;
  sell_price: number;
  market_price: number;
  min_stock: number;
  image_url: string | null;
  is_active: boolean;
  track_expiry: boolean;
  created_at: string;
  updated_at: string;
  // Joined fields
  category?: Category;
  total_stock?: number;
}

export interface Warehouse {
  id: string;
  branch_id: string;
  name: string;
  address: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  // Joined fields
  branch?: Branch;
}

export interface Inventory {
  id: string;
  product_id: string;
  warehouse_id: string;
  quantity: number;
  expiry_date: string | null;
  batch_number: string | null;
  created_at: string;
  updated_at: string;
  // Joined fields
  product?: Product;
  warehouse?: Warehouse;
}

export interface InventoryLog {
  id: string;
  product_id: string;
  warehouse_id: string;
  action: InventoryAction;
  quantity_before: number;
  quantity_after: number;
  quantity_change: number;
  reference_id: string | null;
  reference_type: string | null;
  notes: string | null;
  user_id: string | null;
  created_at: string;
}

export interface Supplier {
  id: string;
  business_id: string;
  name: string;
  contact_person: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  notes: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface PurchaseOrder {
  id: string;
  business_id: string;
  branch_id: string;
  warehouse_id: string;
  supplier_id: string;
  po_number: string;
  status: POStatus;
  total_cost: number;
  notes: string | null;
  ordered_at: string | null;
  received_at: string | null;
  created_by: string | null;
  received_by: string | null;
  created_at: string;
  updated_at: string;
  // Joined fields
  supplier?: Supplier;
  branch?: Branch;
  warehouse?: Warehouse;
  items?: PurchaseOrderItem[];
}

export interface PurchaseOrderItem {
  id: string;
  purchase_order_id: string;
  product_id: string;
  quantity: number;
  cost_price: number;
  total_cost: number;
  received_quantity: number;
  created_at: string;
  // Joined fields
  product?: Product;
}

export interface Sale {
  id: string;
  business_id: string;
  branch_id: string;
  warehouse_id: string;
  invoice_number: string;
  subtotal: number;
  discount_amount: number;
  tax_amount: number;
  total: number;
  payment_method: PaymentMethod;
  payment_amount: number;
  change_amount: number;
  customer_name: string | null;
  notes: string | null;
  cashier_id: string | null;
  created_at: string;
  // Joined fields
  items?: SaleItem[];
  branch?: Branch;
  cashier?: Profile;
}

export interface SaleItem {
  id: string;
  sale_id: string;
  product_id: string;
  quantity: number;
  sell_price: number;
  cost_price: number;
  discount_amount: number;
  total: number;
  profit: number;
  created_at: string;
  // Joined fields
  product?: Product;
}

export interface Expense {
  id: string;
  business_id: string;
  branch_id: string | null;
  category: string;
  description: string | null;
  amount: number;
  expense_date: string;
  is_fixed: boolean;
  receipt_url: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  // Joined fields
  branch?: Branch;
}

export interface AuditLog {
  id: string;
  business_id: string;
  user_id: string | null;
  entity_type: string;
  entity_id: string | null;
  action: string;
  old_value: Record<string, unknown> | null;
  new_value: Record<string, unknown> | null;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
}

export interface Settings {
  id: string;
  business_id: string;
  enable_expiry_tracking: boolean;
  enable_multi_warehouse: boolean;
  enable_tax: boolean;
  enable_expenses: boolean;
  default_tax_rate: number;
  receipt_header: string | null;
  receipt_footer: string | null;
  created_at: string;
  updated_at: string;
}

// View types
export interface ProductMargin {
  id: string;
  business_id: string;
  name: string;
  sku: string | null;
  cost_price: number;
  sell_price: number;
  market_price: number;
  margin_percentage: number;
  profit_per_unit: number;
  total_stock: number;
  stock_value: number;
}

export interface DailySales {
  business_id: string;
  branch_id: string;
  sale_date: string;
  total_transactions: number;
  total_revenue: number;
  total_discounts: number;
  total_tax: number;
  total_cogs: number;
  total_profit: number;
}

export interface LowStock {
  product_id: string;
  business_id: string;
  product_name: string;
  sku: string | null;
  min_stock: number;
  warehouse_id: string;
  warehouse_name: string;
  branch_id: string;
  branch_name: string;
  current_stock: number;
  stock_deficit: number;
}

export interface SupplierPerformance {
  supplier_id: string;
  business_id: string;
  supplier_name: string;
  total_orders: number;
  completed_orders: number;
  total_value: number;
}
