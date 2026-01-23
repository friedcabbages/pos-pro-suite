export type PlanName = 'basic' | 'pro' | 'enterprise';

export type PlanFeatureKey =
  | 'pos'
  | 'products'
  | 'categories'
  | 'inventory'
  | 'transactions'
  | 'reports_basic'
  | 'reports_advanced'
  | 'users_roles'
  | 'activity'
  | 'audit_logs_full'
  | 'expenses'
  | 'purchase_orders'
  | 'multi_warehouse'
  | 'api_access'
  | 'custom_branding'
  | 'compliance_mode';

export const DEFAULT_FEATURES_BY_PLAN: Record<PlanName, PlanFeatureKey[]> = {
  basic: [
    'pos',
    'products',
    'categories',
    'inventory',
    'transactions',
    'reports_basic',
    'users_roles',
    'activity',
  ],
  pro: [
    'pos',
    'products',
    'categories',
    'inventory',
    'transactions',
    'reports_basic',
    'reports_advanced',
    'users_roles',
    'activity',
    'expenses',
    'purchase_orders',
    'multi_warehouse',
  ],
  enterprise: [
    'pos',
    'products',
    'categories',
    'inventory',
    'transactions',
    'reports_basic',
    'reports_advanced',
    'users_roles',
    'activity',
    'expenses',
    'purchase_orders',
    'multi_warehouse',
    'api_access',
    'custom_branding',
    'audit_logs_full',
    'compliance_mode',
  ],
};

export const PLAN_LABEL: Record<PlanName, string> = {
  basic: 'Basic',
  pro: 'Pro',
  enterprise: 'Enterprise',
};

export const FEATURE_REQUIRED_PLAN: Partial<Record<PlanFeatureKey, PlanName>> = {
  expenses: 'pro',
  purchase_orders: 'pro',
  multi_warehouse: 'pro',
  reports_advanced: 'pro',
  api_access: 'enterprise',
  custom_branding: 'enterprise',
  audit_logs_full: 'enterprise',
  compliance_mode: 'enterprise',
};

export function planRank(plan: PlanName) {
  return plan === 'basic' ? 0 : plan === 'pro' ? 1 : 2;
}

export function meetsPlan(required: PlanName, actual: PlanName) {
  return planRank(actual) >= planRank(required);
}
