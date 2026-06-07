import { supabase } from "./supabase";
import type { Party, RateValues } from "./types";

let partiesCache: Party[] | null = null;
let partiesCachePromise: Promise<Party[]> | null = null;

function buildEmptyRates(categories: string[] = [], materials: string[] = []): RateValues {
  const rates: RateValues = {};
  for (const cat of categories) {
    rates[cat] = {};
    for (const mat of materials) {
      rates[cat][mat] = "";
    }
  }
  return rates;
}

function rowToParty(row: Record<string, unknown>): Party {
  return {
    id: row.id as string,
    name: (row.name as string) ?? "",
    address: (row.address as string) ?? "",
    addressGu: (row.address_gu as string) ?? "",
    addressHi: (row.address_hi as string) ?? "",
    route: (row.route as string) ?? "",
    userId: (row.user_id as string) ?? "",
    password: (row.password as string) ?? "",
    status: (row.status as "Enable" | "Disable") ?? "Enable",
    rates: (row.rates as RateValues) ?? buildEmptyRates(),
  };
}

function partyToRow(
  data: Partial<Omit<Party, "id">>
): Record<string, unknown> {
  const row: Record<string, unknown> = {};
  if (data.name !== undefined) row.name = data.name;
  if (data.address !== undefined) row.address = data.address;
  if (data.addressGu !== undefined) row.address_gu = data.addressGu;
  if (data.addressHi !== undefined) row.address_hi = data.addressHi;
  if (data.route !== undefined) row.route = data.route;
  if (data.userId !== undefined) row.user_id = data.userId;
  if (data.password !== undefined) row.password = data.password;
  if (data.status !== undefined) row.status = data.status;
  if (data.rates !== undefined) row.rates = data.rates;
  return row;
}

export async function fetchParties(): Promise<Party[]> {
  const { data, error } = await supabase
    .from("parties")
    .select("id,name,address,address_gu,address_hi,route,user_id,password,status,rates")
    .order("name");
  if (error) throw error;
  return (data ?? []).map(rowToParty);
}

/** Lightweight fetch — only fields needed for order creation (skips heavy rates JSONB) */
export async function fetchPartiesLite(): Promise<Party[]> {
  const { data, error } = await supabase
    .from("parties")
    .select("id,name,address,address_gu,route,status")
    .eq("status", "Enable")
    .order("name");
  if (error) throw error;
  return (data ?? []).map((row) => ({
    id: row.id as string,
    name: (row.name as string) ?? "",
    address: (row.address as string) ?? "",
    addressGu: (row.address_gu as string) ?? "",
    addressHi: "",
    route: (row.route as string) ?? "",
    userId: "",
    password: "",
    status: "Enable" as const,
    rates: {},
  }));
}

export function fetchPartiesCached(): Promise<Party[]> {
  if (partiesCache) return Promise.resolve(partiesCache);
  if (partiesCachePromise) return partiesCachePromise;
  partiesCachePromise = fetchParties().then((parties) => {
    partiesCache = parties;
    partiesCachePromise = null;
    return parties;
  });
  return partiesCachePromise;
}

export function invalidatePartiesCache(): void {
  partiesCache = null;
  partiesCachePromise = null;
}

export function subscribeParties(
  callback: (parties: Party[]) => void
): () => void {
  const channel = supabase
    .channel("parties-changes")
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "parties" },
      () => {
        fetchParties().then(callback);
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}

export async function addParty(party: Omit<Party, "id">): Promise<string> {
  const row = partyToRow(party);
  const { data, error } = await supabase
    .from("parties")
    .insert(row)
    .select("id")
    .single();
  if (error) throw error;
  invalidatePartiesCache();
  return data.id;
}

export async function updateParty(
  id: string,
  data: Partial<Omit<Party, "id">>
): Promise<void> {
  const row = partyToRow(data);
  const { error } = await supabase.from("parties").update(row).eq("id", id);
  if (error) throw error;
  invalidatePartiesCache();
}

export async function deleteParty(id: string): Promise<void> {
  const { error } = await supabase.from("parties").delete().eq("id", id);
  if (error) throw error;
  invalidatePartiesCache();
}
