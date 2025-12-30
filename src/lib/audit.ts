import { supabase } from '@/integrations/supabase/client';

interface AuditLogInput {
  business_id: string;
  user_id?: string | null;
  entity_type: string;
  entity_id?: string;
  action: string;
  old_value?: Record<string, unknown> | null;
  new_value?: Record<string, unknown> | null;
}

export async function createAuditLog(input: AuditLogInput) {
  try {
    await supabase.from('audit_logs').insert([{
      business_id: input.business_id,
      user_id: input.user_id || null,
      entity_type: input.entity_type,
      entity_id: input.entity_id || null,
      action: input.action,
      old_value: input.old_value ? JSON.parse(JSON.stringify(input.old_value)) : null,
      new_value: input.new_value ? JSON.parse(JSON.stringify(input.new_value)) : null
    }]);
  } catch (e) {
    console.error('Failed to create audit log:', e);
  }
}

export async function logInventoryChange(input: {
  product_id: string;
  warehouse_id: string;
  action: 'stock_in' | 'stock_out' | 'adjustment' | 'transfer' | 'po_receive' | 'sale';
  quantity_before: number;
  quantity_after: number;
  quantity_change: number;
  reference_id?: string;
  reference_type?: string;
  notes?: string;
  user_id?: string | null;
}) {
  try {
    await supabase.from('inventory_logs').insert([{
      product_id: input.product_id,
      warehouse_id: input.warehouse_id,
      action: input.action,
      quantity_before: input.quantity_before,
      quantity_after: input.quantity_after,
      quantity_change: input.quantity_change,
      reference_id: input.reference_id || null,
      reference_type: input.reference_type || null,
      notes: input.notes || null,
      user_id: input.user_id || null
    }]);
  } catch (e) {
    console.error('Failed to log inventory change:', e);
  }
}
