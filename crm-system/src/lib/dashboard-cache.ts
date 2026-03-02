import type { Order, Party, Color, RouteDoc } from "./types";

interface DashboardCache {
  orders: Order[];
  parties: Party[];
  colors: Color[];
  routes: RouteDoc[];
  timestamp: number;
}

const CACHE_KEY = "dashboard_cache";

export function getDashboardCache(): DashboardCache | null {
  try {
    const raw = sessionStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as DashboardCache;
  } catch {
    return null;
  }
}

export function setDashboardCache(data: Omit<DashboardCache, "timestamp">): void {
  try {
    const cached: DashboardCache = { ...data, timestamp: Date.now() };
    sessionStorage.setItem(CACHE_KEY, JSON.stringify(cached));
  } catch {
    /* storage full or unavailable */
  }
}

export function clearDashboardCache(): void {
  try {
    sessionStorage.removeItem(CACHE_KEY);
  } catch {
    /* ignore */
  }
}
