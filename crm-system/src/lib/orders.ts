import { supabase } from "./supabase";
import type { Order, OrderItem } from "./types";

const TABLE = "orders";

let ordersCache: Order[] | null = null;
let ordersCachePromise: Promise<Order[]> | null = null;

/* ------------------------------------------------------------------ */
/*  Mapping helpers                                                    */
/* ------------------------------------------------------------------ */

function rowToOrder(row: Record<string, unknown>): Order {
  return {
    id: row.id as string,
    csvId: (row.csv_id as number) ?? 0,
    partyName: (row.party_name as string) ?? "",
    partyAddress: (row.party_address as string) ?? "",
    partyAddressGu: (row.party_address_gu as string) || undefined,
    route: (row.route as string) ?? "",
    orderDate: (row.order_date as string) ?? "",
    type: (row.type as "Running" | "Complete") ?? "Complete",
    items: (row.items as OrderItem[]) ?? [],
    grandTotalOrdered: row.grand_total_ordered as number | undefined,
    grandTotalDelivered: row.grand_total_delivered as number | undefined,
  };
}

function orderToRow(order: Partial<Order>): Record<string, unknown> {
  const row: Record<string, unknown> = {};
  if (order.id !== undefined) row.id = order.id;
  if (order.csvId !== undefined) row.csv_id = order.csvId;
  if (order.partyName !== undefined) row.party_name = order.partyName;
  if (order.partyAddress !== undefined) row.party_address = order.partyAddress;
  if (order.partyAddressGu !== undefined) row.party_address_gu = order.partyAddressGu;
  if (order.route !== undefined) row.route = order.route;
  if (order.orderDate !== undefined) row.order_date = order.orderDate;
  if (order.type !== undefined) row.type = order.type;
  if (order.items !== undefined) row.items = order.items;
  if (order.grandTotalOrdered !== undefined) row.grand_total_ordered = order.grandTotalOrdered;
  if (order.grandTotalDelivered !== undefined) row.grand_total_delivered = order.grandTotalDelivered;
  return row;
}

/* ------------------------------------------------------------------ */
/*  Public API                                                         */
/* ------------------------------------------------------------------ */

export function subscribeOrders(callback: (orders: Order[]) => void): () => void {
  // Initial fetch
  fetchOrders().then(callback);

  // Realtime subscription – refetch on any change
  const channel = supabase
    .channel("orders-realtime")
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: TABLE },
      () => {
        fetchOrders().then(callback);
      },
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}

export async function fetchOrders(): Promise<Order[]> {
  const all: Order[] = [];
  const PAGE_SIZE = 1000;
  let from = 0;

  while (true) {
    const { data, error } = await supabase
      .from(TABLE)
      .select("*")
      .order("csv_id", { ascending: false })
      .range(from, from + PAGE_SIZE - 1);

    if (error) throw error;
    if (!data || data.length === 0) break;
    all.push(...data.map(rowToOrder));
    if (data.length < PAGE_SIZE) break;
    from += PAGE_SIZE;
  }

  return all;
}

export function fetchOrdersCached(): Promise<Order[]> {
  if (ordersCache) return Promise.resolve(ordersCache);
  if (ordersCachePromise) return ordersCachePromise;
  ordersCachePromise = fetchOrders().then((data) => {
    ordersCache = data;
    ordersCachePromise = null;
    return data;
  });
  return ordersCachePromise;
}

export function invalidateOrdersCache(): void {
  ordersCache = null;
  ordersCachePromise = null;
}

export async function markOrderComplete(orderId: string): Promise<void> {
  const { error } = await supabase
    .from(TABLE)
    .update({ type: "Complete" })
    .eq("id", orderId);

  if (error) throw error;
  invalidateOrdersCache();
}

export async function getOrder(orderId: string): Promise<Order | null> {
  const { data, error } = await supabase
    .from(TABLE)
    .select("*")
    .eq("id", orderId)
    .limit(1)
    .single();

  if (error && error.code === "PGRST116") return null; // no rows
  if (error) throw error;
  return data ? rowToOrder(data) : null;
}

export async function getNextSeqNumber(): Promise<number> {
  const today = new Date().toISOString().split("T")[0];
  const { data } = await supabase.rpc("get_next_seq_number", {
    counter_id: "seqCounter",
    counter_date: today,
  });
  return data ?? 1;
}

export function subscribeSeqCounter(callback: (counter: number, date: string) => void): () => void {
  // Initial fetch
  const fetchCounter = async () => {
    const { data, error } = await supabase
      .from("counters")
      .select("*")
      .eq("id", "seqCounter")
      .single();

    const today = new Date().toISOString().split("T")[0];
    if (!error && data && data.date === today) {
      callback(data.counter ?? 0, data.date);
    } else {
      callback(0, today);
    }
  };

  fetchCounter();

  // Realtime subscription on counters table
  const channel = supabase
    .channel("counters-realtime")
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "counters" },
      () => {
        fetchCounter();
      },
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}

/* ------------------------------------------------------------------ */
/*  Filtered / lightweight queries for performance                     */
/* ------------------------------------------------------------------ */

/** Fetch only Running (or Running+Complete-for-date) orders — much faster than fetchOrders() */
export async function fetchOrdersByType(type: "Running" | "Complete"): Promise<Order[]> {
  const { data, error } = await supabase
    .from(TABLE)
    .select("*")
    .eq("type", type)
    .order("csv_id", { ascending: false });

  if (error) throw error;
  return (data ?? []).map(rowToOrder);
}

/** Fetch Complete orders for a specific date */
export async function fetchCompleteOrdersByDate(date: string): Promise<Order[]> {
  const { data, error } = await supabase
    .from(TABLE)
    .select("*")
    .eq("type", "Complete")
    .eq("order_date", date)
    .order("csv_id", { ascending: false });

  if (error) throw error;
  return (data ?? []).map(rowToOrder);
}

/** Fetch only Running order party names — ultra lightweight for select-party */
export async function fetchRunningPartyNames(): Promise<Set<string>> {
  const { data, error } = await supabase
    .from(TABLE)
    .select("party_name")
    .eq("type", "Running");

  if (error) throw error;
  return new Set((data ?? []).map((r) => r.party_name as string));
}

/** Subscribe to only Running orders — for running-orders page */
export function subscribeRunningOrders(callback: (orders: Order[]) => void): () => void {
  fetchOrdersByType("Running").then(callback);

  const channel = supabase
    .channel("running-orders-realtime")
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: TABLE },
      () => {
        fetchOrdersByType("Running").then(callback);
      },
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}

/** Paginated orders for the orders list page */
export async function fetchOrdersPaginated(opts: {
  page: number;
  pageSize: number;
  type?: "Running" | "Complete";
  route?: string;
  search?: string;
}): Promise<{ orders: Order[]; total: number }> {
  const { page, pageSize, type, route, search } = opts;
  let query = supabase
    .from(TABLE)
    .select("*", { count: "exact" });

  if (type) query = query.eq("type", type);
  if (route) query = query.eq("route", route);
  if (search) query = query.or(`party_name.ilike.%${search}%,party_address.ilike.%${search}%`);

  const { data, error, count } = await query
    .order("csv_id", { ascending: false })
    .range((page - 1) * pageSize, page * pageSize - 1);

  if (error) throw error;
  return {
    orders: (data ?? []).map(rowToOrder),
    total: count ?? 0,
  };
}

export async function updateOrder(
  orderId: string,
  data: {
    items: OrderItem[];
    grandTotalOrdered: number;
    grandTotalDelivered: number;
    type: "Running" | "Complete";
  },
): Promise<void> {
  const { error } = await supabase
    .from(TABLE)
    .update({
      items: data.items,
      grand_total_ordered: data.grandTotalOrdered,
      grand_total_delivered: data.grandTotalDelivered,
      type: data.type,
    })
    .eq("id", orderId);

  if (error) throw error;
  invalidateOrdersCache();
}
