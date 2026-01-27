import Dexie, { type Table } from "dexie";
import type { Category, PaymentMethod, Product, Sale, SaleItem } from "@/types/database";

export type SyncQueueStatus = "pending" | "syncing" | "failed";
export type LocalSyncStatus = "synced" | "pending" | "failed";

export type LocalProduct = Product & {
  local_updated_at: string; // ISO
  dirty: 0 | 1;
};

export type LocalCategory = Category & {
  local_updated_at: string; // ISO
  dirty: 0 | 1;
};

export type LocalStock = {
  warehouse_id: string;
  product_id: string;
  quantity: number;
  local_updated_at: string; // ISO
  dirty: 0 | 1;
};

export type LocalCustomer = {
  id: string;
  business_id: string;
  name: string;
  last_order_at: string | null; // ISO
  local_updated_at: string; // ISO
};

export type LocalOrder = Omit<Sale, "items"> & {
  // keep the shape close to Supabase `sales`, but store local sync metadata
  local_created_at: string; // ISO
  local_updated_at: string; // ISO
  sync_status: LocalSyncStatus;
  synced_at: string | null; // ISO
};

export type LocalOrderItem = SaleItem & {
  order_id: string; // alias for sale_id to match "orders/order_items" language
  local_created_at: string; // ISO
};

export type SyncQueueItem =
  | {
      id?: number;
      created_at: string; // ISO
      status: SyncQueueStatus;
      attempts: number;
      last_attempt_at: string | null; // ISO
      error: string | null;
      type: "create_order";
      payload: {
        order: LocalOrder;
        items: LocalOrderItem[];
        // inventory deltas for local stock reconciliation
        stock_deltas: Array<{ warehouse_id: string; product_id: string; delta: number }>;
      };
    }
  | {
      id?: number;
      created_at: string; // ISO
      status: SyncQueueStatus;
      attempts: number;
      last_attempt_at: string | null; // ISO
      error: string | null;
      type: "upsert_product";
      payload: { product: LocalProduct };
    }
  | {
      id?: number;
      created_at: string; // ISO
      status: SyncQueueStatus;
      attempts: number;
      last_attempt_at: string | null; // ISO
      error: string | null;
      type: "upsert_category";
      payload: { category: LocalCategory };
    };

export type MetaRow = { key: string; value: string };

export class VeloLocalDb extends Dexie {
  products!: Table<LocalProduct, string>;
  categories!: Table<LocalCategory, string>;
  stock!: Table<LocalStock, [string, string]>; // [warehouse_id, product_id]
  customers!: Table<LocalCustomer, string>;
  orders!: Table<LocalOrder, string>;
  order_items!: Table<LocalOrderItem, string>;
  sync_queue!: Table<SyncQueueItem, number>;
  meta!: Table<MetaRow, string>;

  constructor() {
    super("velopos_local");

    // NOTE: Keep indexes simple + business scoped for perf.
    this.version(1).stores({
      products: "id, business_id, updated_at, dirty",
      categories: "id, business_id, name, dirty",
      stock: "&[warehouse_id+product_id], warehouse_id, product_id",
      customers: "id, business_id, name, last_order_at",
      orders: "id, business_id, branch_id, created_at, sync_status",
      order_items: "id, sale_id, order_id, product_id",
      sync_queue: "++id, created_at, status, type",
      meta: "key",
    });
  }
}

export const localDb = new VeloLocalDb();

// Small helpers to build local order records consistently
export function makeInvoiceNumber() {
  const timestamp = Date.now().toString(36).toUpperCase();
  return `INV-${timestamp}`;
}

export function nowIso() {
  return new Date().toISOString();
}

export function asPaymentMethod(method: string): PaymentMethod {
  // guard against corrupted local data
  if (method === "cash" || method === "card" || method === "qris" || method === "transfer" || method === "other") {
    return method;
  }
  return "other";
}

