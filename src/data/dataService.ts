import { supabase } from "@/integrations/supabase/client";
import type { Category, Product, Sale, SaleItem } from "@/types/database";
import { connectivityStore } from "@/data/syncStatus";
import {
  localDb,
  makeInvoiceNumber,
  nowIso,
  type LocalCategory,
  type LocalOrder,
  type LocalOrderItem,
  type LocalProduct,
  type SyncQueueItem,
} from "@/data/localDb";

type Ctx = {
  businessId: string | null;
  branchId: string | null;
  warehouseId: string | null;
  userId: string | null;
};

let ctx: Ctx = {
  businessId: null,
  branchId: null,
  warehouseId: null,
  userId: null,
};

let started = false;
let syncing = false;
let unsubOnline: (() => void) | null = null;

function setOnlineState(online: boolean) {
  connectivityStore.setState({
    online,
    status: online ? "online_synced" : "offline",
    lastError: online ? null : connectivityStore.getState().lastError,
  });
}

async function refreshQueueCount() {
  const count = await localDb.sync_queue.where("status").anyOf("pending", "failed").count();
  connectivityStore.setState({ queueCount: count });
  return count;
}

function ensureStarted() {
  if (started) return;
  started = true;

  const onOnline = () => {
    setOnlineState(true);
    void syncNow();
  };
  const onOffline = () => {
    setOnlineState(false);
  };

  window.addEventListener("online", onOnline);
  window.addEventListener("offline", onOffline);

  unsubOnline = () => {
    window.removeEventListener("online", onOnline);
    window.removeEventListener("offline", onOffline);
  };

  setOnlineState(navigator.onLine);
}

async function upsertCategoriesFromServer(categories: Category[]) {
  const ts = nowIso();
  await localDb.transaction("rw", localDb.categories, async () => {
    for (const c of categories) {
      const existing = await localDb.categories.get(c.id);
      // If locally edited and newer, keep local (basic conflict handling)
      if (existing?.dirty === 1 && existing.local_updated_at > (c.created_at ?? "")) {
        continue;
      }

      const row: LocalCategory = {
        ...c,
        local_updated_at: ts,
        dirty: 0,
      };
      await localDb.categories.put(row);
    }
  });
}

async function upsertProductsFromServer(products: Array<Product & { category?: { id: string; name: string } | null }>) {
  const ts = nowIso();
  await localDb.transaction("rw", localDb.products, async () => {
    for (const p of products) {
      const existing = await localDb.products.get(p.id);
      // basic last-write-wins using updated_at (server) vs local_updated_at (local)
      if (existing?.dirty === 1 && existing.local_updated_at > (p.updated_at ?? "")) {
        continue;
      }

      const row: LocalProduct = {
        ...(p as Product),
        local_updated_at: ts,
        dirty: 0,
      };
      await localDb.products.put(row);
    }
  });
}

async function upsertStockFromServer(rows: Array<{ product_id: string; quantity: number }>, warehouseId: string) {
  const ts = nowIso();
  // aggregate (inventory table can have multiple rows per product due to batch_number)
  const totals = new Map<string, number>();
  for (const r of rows) totals.set(r.product_id, (totals.get(r.product_id) ?? 0) + Number(r.quantity ?? 0));

  await localDb.transaction("rw", localDb.stock, async () => {
    for (const [productId, quantity] of totals.entries()) {
      const existing = await localDb.stock.get([warehouseId, productId]);
      if (existing?.dirty === 1 && existing.local_updated_at > ts) continue;
      await localDb.stock.put({
        warehouse_id: warehouseId,
        product_id: productId,
        quantity,
        local_updated_at: ts,
        dirty: 0,
      });
    }
  });
}

async function syncMasterDataFromSupabase() {
  if (!ctx.businessId) return;

  // Categories (for POS browsing/filtering)
  const { data: categories, error: catErr } = await supabase
    .from("categories")
    .select("*")
    .eq("business_id", ctx.businessId)
    .order("name");
  if (catErr) throw catErr;
  await upsertCategoriesFromServer((categories ?? []) as Category[]);

  // Products
  const { data: products, error: prodErr } = await supabase
    .from("products")
    .select(
      `
      *,
      category:categories(id, name)
    `
    )
    .eq("business_id", ctx.businessId)
    .eq("is_active", true)
    .order("name");
  if (prodErr) throw prodErr;
  await upsertProductsFromServer((products ?? []) as any);

  // Stock snapshot for active warehouse
  if (ctx.warehouseId && products?.length) {
    const productIds = (products as any[]).map((p) => p.id);
    const { data: invRows, error: invErr } = await supabase
      .from("inventory")
      .select("product_id, quantity")
      .eq("warehouse_id", ctx.warehouseId)
      .in("product_id", productIds);
    if (invErr) throw invErr;
    await upsertStockFromServer((invRows ?? []) as any, ctx.warehouseId);
  }
}

async function syncOrdersFromSupabase(limit = 200) {
  if (!ctx.businessId) return;

  // Keep this intentionally scoped; the UI mostly needs "recent" while we build out incremental sync.
  const { data: sales, error: salesErr } = await supabase
    .from("sales")
    .select("*")
    .eq("business_id", ctx.businessId)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (salesErr) throw salesErr;

  const saleIds = (sales ?? []).map((s) => s.id);
  const { data: items, error: itemsErr } = saleIds.length
    ? await supabase.from("sale_items").select("*").in("sale_id", saleIds)
    : { data: [], error: null };
  if (itemsErr) throw itemsErr;

  const ts = nowIso();
  await localDb.transaction("rw", localDb.orders, localDb.order_items, localDb.customers, async () => {
    // Orders
    for (const s of (sales ?? []) as any[]) {
      const existing = await localDb.orders.get(s.id);
      // Do NOT overwrite locally created orders that haven't been synced yet.
      if (existing?.sync_status === "pending") continue;

      const row: LocalOrder = {
        ...(s as Sale),
        local_created_at: s.created_at ?? ts,
        local_updated_at: ts,
        sync_status: "synced",
        synced_at: ts,
      };
      await localDb.orders.put(row);

      const customerName = typeof s.customer_name === "string" && s.customer_name.trim() ? s.customer_name.trim() : null;
      if (customerName) {
        // Derive a deterministic local customer id from business + name to avoid duplicates.
        const id = `${ctx.businessId}:${customerName.toLowerCase()}`;
        await localDb.customers.put({
          id,
          business_id: ctx.businessId!,
          name: customerName,
          last_order_at: s.created_at ?? ts,
          local_updated_at: ts,
        });
      }
    }

    // Items
    for (const it of (items ?? []) as any[]) {
      const row: LocalOrderItem = {
        ...(it as SaleItem),
        order_id: it.sale_id,
        local_created_at: it.created_at ?? ts,
      };
      await localDb.order_items.put(row);
    }
  });
}

async function pushQueuedOrderToSupabase(item: Extract<SyncQueueItem, { type: "create_order" }>) {
  const { order, items, stock_deltas } = item.payload;

  // Idempotency: if this sale already exists on server, treat as synced.
  const { data: existing, error: existingErr } = await supabase
    .from("sales")
    .select("id")
    .eq("id", order.id)
    .maybeSingle();
  if (existingErr) throw existingErr;
  if (existing?.id) return;

  // Insert sale
  const { error: saleErr } = await supabase.from("sales").insert([
    {
      id: order.id,
      business_id: order.business_id,
      branch_id: order.branch_id,
      warehouse_id: order.warehouse_id,
      invoice_number: order.invoice_number,
      subtotal: order.subtotal,
      discount_amount: order.discount_amount,
      tax_amount: order.tax_amount,
      total: order.total,
      payment_method: order.payment_method,
      payment_amount: order.payment_amount,
      change_amount: order.change_amount,
      customer_name: order.customer_name,
      notes: order.notes,
      cashier_id: order.cashier_id,
      created_at: order.created_at,
    },
  ]);
  if (saleErr) throw saleErr;

  // Insert sale items
  const { error: itemsErr } = await supabase.from("sale_items").insert(
    items.map((it) => ({
      id: it.id,
      sale_id: order.id,
      product_id: it.product_id,
      quantity: it.quantity,
      sell_price: it.sell_price,
      cost_price: it.cost_price,
      discount_amount: it.discount_amount,
      total: it.total,
      profit: it.profit,
      created_at: it.created_at,
    }))
  );
  if (itemsErr) throw itemsErr;

  // Apply inventory deltas (best-effort; if it fails, we still keep the sale and retry inventory next sync)
  // NOTE: The existing online flow in `useCreateSale` updates inventory directly.
  for (const d of stock_deltas) {
    const { data: inv } = await supabase
      .from("inventory")
      .select("id, quantity")
      .eq("warehouse_id", d.warehouse_id)
      .eq("product_id", d.product_id)
      .maybeSingle();

    const current = Number(inv?.quantity ?? 0);
    const next = current + d.delta;
    if (inv?.id) {
      await supabase.from("inventory").update({ quantity: next }).eq("id", inv.id);
    } else {
      await supabase.from("inventory").insert({
        warehouse_id: d.warehouse_id,
        product_id: d.product_id,
        quantity: next,
      });
    }
  }
}

async function processQueue() {
  const online = navigator.onLine;
  if (!online) return;
  if (!ctx.businessId) return;

  const pending = await localDb.sync_queue
    .orderBy("created_at")
    .filter((q) => q.status === "pending" || q.status === "failed")
    .toArray();

  if (!pending.length) return;

  for (const q of pending) {
    await localDb.sync_queue.update(q.id!, {
      status: "syncing",
      last_attempt_at: nowIso(),
      attempts: (q.attempts ?? 0) + 1,
      error: null,
    });

    try {
      if (q.type === "create_order") {
        await pushQueuedOrderToSupabase(q as any);

        const ts = nowIso();
        await localDb.transaction("rw", localDb.orders, localDb.sync_queue, async () => {
          await localDb.orders.update((q as any).payload.order.id, {
            sync_status: "synced",
            synced_at: ts,
            local_updated_at: ts,
          });
          await localDb.sync_queue.delete(q.id!);
        });
      } else if (q.type === "upsert_product") {
        // For now: only sync product upserts when online; server-side policies may block by plan/role.
        const p = (q as any).payload.product as LocalProduct;
        const { error } = await supabase.from("products").upsert({
          ...p,
          local_updated_at: undefined,
          dirty: undefined,
        } as any);
        if (error) throw error;
        await localDb.products.update(p.id, { dirty: 0, local_updated_at: nowIso() });
        await localDb.sync_queue.delete(q.id!);
      } else if (q.type === "upsert_category") {
        const c = (q as any).payload.category as LocalCategory;
        const { error } = await supabase.from("categories").upsert({
          ...c,
          local_updated_at: undefined,
          dirty: undefined,
        } as any);
        if (error) throw error;
        await localDb.categories.update(c.id, { dirty: 0, local_updated_at: nowIso() });
        await localDb.sync_queue.delete(q.id!);
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Unknown sync error";
      await localDb.sync_queue.update(q.id!, { status: "failed", error: msg });
      connectivityStore.setState({ status: "sync_failed", lastError: msg });
      // Continue processing other items; never block core flows.
    } finally {
      await refreshQueueCount();
    }
  }
}

export async function syncNow() {
  ensureStarted();
  if (syncing) return;
  if (!navigator.onLine) {
    connectivityStore.setState({ online: false, status: "offline" });
    await refreshQueueCount();
    return;
  }
  if (!ctx.businessId) {
    await refreshQueueCount();
    return;
  }

  syncing = true;
  connectivityStore.setState({ online: true, status: "syncing", lastError: null });
  try {
    await syncMasterDataFromSupabase();
    await syncOrdersFromSupabase();
    await processQueue();
    const queueCount = await refreshQueueCount();
    connectivityStore.setState({
      status: queueCount === 0 ? "online_synced" : "sync_failed",
      lastSyncAt: nowIso(),
      lastError: null,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unknown sync error";
    connectivityStore.setState({ status: "sync_failed", lastError: msg });
  } finally {
    syncing = false;
  }
}

export async function startDataLayer(next: Ctx) {
  ensureStarted();

  const changed =
    ctx.businessId !== next.businessId ||
    ctx.branchId !== next.branchId ||
    ctx.warehouseId !== next.warehouseId ||
    ctx.userId !== next.userId;
  ctx = next;

  await refreshQueueCount();

  // Don't block UI: kick sync asynchronously on start / context change.
  if (changed && navigator.onLine) {
    void syncNow();
  }
}

export function stopDataLayer() {
  ctx = { businessId: null, branchId: null, warehouseId: null, userId: null };
  if (unsubOnline) unsubOnline();
  unsubOnline = null;
  started = false;
}

// -----------------------------
// Public read API (local-first)
// -----------------------------

export async function listCategories(businessId: string): Promise<Category[]> {
  return (await localDb.categories.where("business_id").equals(businessId).sortBy("name")) as Category[];
}

export async function listProducts(businessId: string, warehouseId?: string | null): Promise<Product[]> {
  const products = await localDb.products
    .where("business_id")
    .equals(businessId)
    .and((p) => (p as any).is_active !== false)
    .sortBy("name");

  if (!warehouseId) return products as Product[];

  const stockRows = await localDb.stock.where("warehouse_id").equals(warehouseId).toArray();
  const stockMap = new Map(stockRows.map((s) => [s.product_id, s.quantity]));

  return products.map((p) => ({ ...(p as Product), total_stock: stockMap.get(p.id) ?? 0 }));
}

export async function listOrders(params: {
  businessId: string;
  branchId?: string | null;
  limit?: number;
  start?: Date;
  end?: Date;
}): Promise<Sale[]> {
  const { businessId, branchId, limit = 100 } = params;

  const all = await localDb.orders.where("business_id").equals(businessId).toArray();
  const filtered = all
    .filter((o) => (!branchId ? true : o.branch_id === branchId))
    .filter((o) => {
      if (!params.start && !params.end) return true;
      const t = new Date(o.created_at).getTime();
      const gte = params.start ? t >= params.start.getTime() : true;
      const lte = params.end ? t <= params.end.getTime() : true;
      return gte && lte;
    })
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, limit);

  const ids = filtered.map((o) => o.id);
  const items = ids.length
    ? await localDb.order_items.where("sale_id").anyOf(ids).toArray()
    : [];
  const itemsByOrder = new Map<string, SaleItem[]>();
  for (const it of items as unknown as SaleItem[]) {
    const list = itemsByOrder.get((it as any).sale_id) ?? [];
    list.push(it);
    itemsByOrder.set((it as any).sale_id, list);
  }

  return filtered.map((o) => ({ ...(o as unknown as Sale), items: itemsByOrder.get(o.id) ?? [] }));
}

export async function listOrderItems(orderId: string): Promise<SaleItem[]> {
  const items = await localDb.order_items.where("sale_id").equals(orderId).toArray();
  return items as unknown as SaleItem[];
}

// -----------------------------
// Public write API
// -----------------------------

export async function createOrder(input: {
  items: Array<{ product: Product; quantity: number }>;
  subtotal: number;
  discount_amount: number;
  tax_amount: number;
  total: number;
  payment_method: Sale["payment_method"];
  payment_amount: number;
  customer_name?: string;
  notes?: string;
}) {
  if (!ctx.businessId || !ctx.branchId || !ctx.warehouseId) {
    throw new Error("Business, branch, or warehouse not selected");
  }

  const ts = nowIso();
  const id = crypto.randomUUID();
  const invoice_number = makeInvoiceNumber();

  const order: LocalOrder = {
    id,
    business_id: ctx.businessId,
    branch_id: ctx.branchId,
    warehouse_id: ctx.warehouseId,
    invoice_number,
    subtotal: input.subtotal,
    discount_amount: input.discount_amount,
    tax_amount: input.tax_amount,
    total: input.total,
    payment_method: input.payment_method,
    payment_amount: input.payment_amount,
    change_amount: input.payment_amount - input.total,
    customer_name: input.customer_name ?? null,
    notes: input.notes ?? null,
    cashier_id: ctx.userId ?? null,
    created_at: ts,
    local_created_at: ts,
    local_updated_at: ts,
    sync_status: navigator.onLine ? "synced" : "pending",
    synced_at: navigator.onLine ? ts : null,
  };

  const items: LocalOrderItem[] = input.items.map((it) => {
    const profit = (it.product.sell_price - it.product.cost_price) * it.quantity;
    return {
      id: crypto.randomUUID(),
      sale_id: id,
      order_id: id,
      product_id: it.product.id,
      quantity: it.quantity,
      sell_price: it.product.sell_price,
      cost_price: it.product.cost_price,
      discount_amount: 0,
      total: it.product.sell_price * it.quantity,
      profit,
      created_at: ts,
      local_created_at: ts,
    };
  });

  const stockDeltas = input.items.map((it) => ({
    warehouse_id: ctx.warehouseId!,
    product_id: it.product.id,
    delta: -it.quantity,
  }));

  // Always write locally first (offline-first, never block POS flow)
  await localDb.transaction("rw", localDb.orders, localDb.order_items, localDb.stock, localDb.customers, async () => {
    await localDb.orders.put(order);
    await localDb.order_items.bulkPut(items);

    // update local stock snapshot (best-effort)
    for (const d of stockDeltas) {
      const key: [string, string] = [d.warehouse_id, d.product_id];
      const existing = await localDb.stock.get(key);
      const current = Number(existing?.quantity ?? 0);
      await localDb.stock.put({
        warehouse_id: d.warehouse_id,
        product_id: d.product_id,
        quantity: current + d.delta,
        local_updated_at: ts,
        dirty: 1,
      });
    }

    const customerName =
      typeof input.customer_name === "string" && input.customer_name.trim() ? input.customer_name.trim() : null;
    if (customerName) {
      const customerId = `${ctx.businessId}:${customerName.toLowerCase()}`;
      await localDb.customers.put({
        id: customerId,
        business_id: ctx.businessId!,
        name: customerName,
        last_order_at: ts,
        local_updated_at: ts,
      });
    }
  });

  // Online path: write-through to Supabase (but never block local commit)
  if (navigator.onLine) {
    try {
      await pushQueuedOrderToSupabase({
        created_at: ts,
        status: "pending",
        attempts: 0,
        last_attempt_at: null,
        error: null,
        type: "create_order",
        payload: { order, items, stock_deltas: stockDeltas },
      });
    } catch (e) {
      // fallback: queue for later sync
      const msg = e instanceof Error ? e.message : "Unknown error";
      await localDb.orders.update(order.id, { sync_status: "pending", synced_at: null, local_updated_at: nowIso() });
      await localDb.sync_queue.add({
        created_at: ts,
        status: "pending",
        attempts: 0,
        last_attempt_at: null,
        error: msg,
        type: "create_order",
        payload: { order, items, stock_deltas: stockDeltas },
      });
      await refreshQueueCount();
      connectivityStore.setState({ status: "sync_failed", lastError: msg });
      return order as unknown as Sale;
    }

    // mark synced locally
    await localDb.orders.update(order.id, { sync_status: "synced", synced_at: nowIso(), local_updated_at: nowIso() });
    // keep stock dirty until next successful stock snapshot pull
    await refreshQueueCount();
    connectivityStore.setState({ status: "online_synced", lastSyncAt: nowIso(), lastError: null });
    return order as unknown as Sale;
  }

  // Offline path: enqueue order for later
  await localDb.sync_queue.add({
    created_at: ts,
    status: "pending",
    attempts: 0,
    last_attempt_at: null,
    error: null,
    type: "create_order",
    payload: { order, items, stock_deltas: stockDeltas },
  });
  await refreshQueueCount();
  connectivityStore.setState({ status: "offline" });
  return order as unknown as Sale;
}

export async function upsertProduct(product: Partial<Product> & { id?: string }) {
  if (!ctx.businessId) throw new Error("No business selected");
  const ts = nowIso();
  const id = product.id ?? crypto.randomUUID();

  const row: LocalProduct = {
    // Default fields (keep compatible with `Product` type)
    id,
    business_id: ctx.businessId,
    category_id: product.category_id ?? null,
    sku: product.sku ?? null,
    barcode: product.barcode ?? null,
    name: product.name ?? "Unnamed Product",
    description: product.description ?? null,
    unit: (product.unit as any) ?? "pcs",
    cost_price: Number(product.cost_price ?? 0),
    sell_price: Number(product.sell_price ?? 0),
    market_price: Number(product.market_price ?? 0),
    min_stock: Number(product.min_stock ?? 0),
    image_url: product.image_url ?? null,
    is_active: product.is_active ?? true,
    track_expiry: product.track_expiry ?? false,
    created_at: (product.created_at as string) ?? ts,
    updated_at: (product.updated_at as string) ?? ts,
    category: (product as any).category,
    total_stock: (product as any).total_stock,
    local_updated_at: ts,
    dirty: 1,
  };

  await localDb.products.put(row);

  if (navigator.onLine) {
    try {
      const { error } = await supabase.from("products").upsert({
        ...row,
        local_updated_at: undefined,
        dirty: undefined,
        category: undefined,
        total_stock: undefined,
      } as any);
      if (error) throw error;
      await localDb.products.update(id, { dirty: 0, local_updated_at: nowIso() });
      return row as Product;
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Unknown error";
      await localDb.sync_queue.add({
        created_at: ts,
        status: "pending",
        attempts: 0,
        last_attempt_at: null,
        error: msg,
        type: "upsert_product",
        payload: { product: row },
      });
      await refreshQueueCount();
      connectivityStore.setState({ status: "sync_failed", lastError: msg });
      return row as Product;
    }
  }

  await localDb.sync_queue.add({
    created_at: ts,
    status: "pending",
    attempts: 0,
    last_attempt_at: null,
    error: null,
    type: "upsert_product",
    payload: { product: row },
  });
  await refreshQueueCount();
  return row as Product;
}

export async function upsertCategory(category: Partial<Category> & { id?: string }) {
  if (!ctx.businessId) throw new Error("No business selected");
  const ts = nowIso();
  const id = category.id ?? crypto.randomUUID();

  const row: LocalCategory = {
    id,
    business_id: ctx.businessId,
    name: category.name ?? "Unnamed Category",
    description: category.description ?? null,
    created_at: (category.created_at as string) ?? ts,
    local_updated_at: ts,
    dirty: 1,
  };

  await localDb.categories.put(row);

  if (navigator.onLine) {
    try {
      const { error } = await supabase.from("categories").upsert({
        ...row,
        local_updated_at: undefined,
        dirty: undefined,
      } as any);
      if (error) throw error;
      await localDb.categories.update(id, { dirty: 0, local_updated_at: nowIso() });
      return row as Category;
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Unknown error";
      await localDb.sync_queue.add({
        created_at: ts,
        status: "pending",
        attempts: 0,
        last_attempt_at: null,
        error: msg,
        type: "upsert_category",
        payload: { category: row },
      });
      await refreshQueueCount();
      connectivityStore.setState({ status: "sync_failed", lastError: msg });
      return row as Category;
    }
  }

  await localDb.sync_queue.add({
    created_at: ts,
    status: "pending",
    attempts: 0,
    last_attempt_at: null,
    error: null,
    type: "upsert_category",
    payload: { category: row },
  });
  await refreshQueueCount();
  return row as Category;
}

