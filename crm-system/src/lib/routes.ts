import { supabase } from "./supabase";
import type { RouteDoc } from "./types";

const TABLE = "routes";

type RouteRow = {
  id: string;
  name: string;
  code: string;
  area: string;
  description: string;
  active: boolean;
  parties: number;
  created_at: string;
};

function rowToRoute(row: RouteRow): RouteDoc {
  return {
    id: row.id,
    name: row.name ?? "",
    code: row.code ?? "",
    area: row.area ?? "",
    description: row.description ?? "",
    active: row.active ?? true,
    parties: Number(row.parties) || 0,
    createdAt: row.created_at ?? "",
  };
}

function routeToRow(
  route: Partial<Omit<RouteDoc, "id">>
): Record<string, unknown> {
  const row: Record<string, unknown> = {};
  if (route.name !== undefined) row.name = route.name;
  if (route.code !== undefined) row.code = route.code;
  if (route.area !== undefined) row.area = route.area;
  if (route.description !== undefined) row.description = route.description;
  if (route.active !== undefined) row.active = route.active;
  if (route.parties !== undefined) row.parties = route.parties;
  if (route.createdAt !== undefined) row.created_at = route.createdAt;
  return row;
}

let routesCache: RouteDoc[] | null = null;
let routesCachePromise: Promise<RouteDoc[]> | null = null;

export function subscribeRoutes(
  callback: (routes: RouteDoc[]) => void
): () => void {
  // Initial fetch
  fetchRoutes().then(callback);

  const channel = supabase
    .channel("routes-realtime")
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: TABLE },
      () => {
        fetchRoutes().then(callback);
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}

export async function fetchRoutes(): Promise<RouteDoc[]> {
  const { data, error } = await supabase
    .from(TABLE)
    .select("*")
    .order("name");

  if (error) throw error;
  return (data as RouteRow[]).map(rowToRoute);
}

export function fetchRoutesCached(): Promise<RouteDoc[]> {
  if (routesCache) return Promise.resolve(routesCache);
  if (routesCachePromise) return routesCachePromise;
  routesCachePromise = fetchRoutes().then((data) => {
    routesCache = data;
    routesCachePromise = null;
    return data;
  });
  return routesCachePromise;
}

export function invalidateRoutesCache(): void {
  routesCache = null;
  routesCachePromise = null;
}

export async function addRoute(
  route: Omit<RouteDoc, "id">
): Promise<string> {
  const row = routeToRow(route);
  const { data, error } = await supabase
    .from(TABLE)
    .insert(row)
    .select("id")
    .single();

  if (error) throw error;
  invalidateRoutesCache();
  return data.id;
}

export async function updateRoute(
  id: string,
  data: Partial<Omit<RouteDoc, "id">>
): Promise<void> {
  const row = routeToRow(data);
  const { error } = await supabase.from(TABLE).update(row).eq("id", id);

  if (error) throw error;
  invalidateRoutesCache();
}

export async function deleteRoute(id: string): Promise<void> {
  const { error } = await supabase.from(TABLE).delete().eq("id", id);

  if (error) throw error;
  invalidateRoutesCache();
}
