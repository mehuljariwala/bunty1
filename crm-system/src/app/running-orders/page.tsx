"use client";

import { useState, useMemo, useEffect } from "react";
import Link from "next/link";
import {
  Search,
  Plus,
  X,
  Printer,
  MapPin,
  Calendar,
  Package,
  Loader,
  CircleCheck,
  Clock,
  ChevronDown,
  ChevronRight,
  Eye,
  Camera,
  FileText,
} from "lucide-react";
import { subscribeOrders } from "@/lib/orders";
import { subscribeRoutes } from "@/lib/routes";
import type { Order, RouteDoc, OrderItem } from "@/lib/types";

type TabStatus = "Running" | "Pending" | "Complete";

const STATUS_CONFIG: Record<TabStatus, { icon: typeof Loader; bg: string; text: string; dot: string; cardBorder: string; cardBg: string; iconColor: string }> = {
  Running: { icon: Loader, bg: "bg-sky-400/10", text: "text-sky-500", dot: "bg-sky-400", cardBorder: "border-sky-200", cardBg: "bg-gradient-to-br from-white to-sky-50/40", iconColor: "text-sky-400" },
  Pending: { icon: Clock, bg: "bg-amber-400/10", text: "text-amber-600", dot: "bg-amber-400", cardBorder: "border-amber-200", cardBg: "bg-gradient-to-br from-white to-amber-50/40", iconColor: "text-amber-400" },
  Complete: { icon: CircleCheck, bg: "bg-blue-50", text: "text-blue-600", dot: "bg-blue-400", cardBorder: "border-blue-200", cardBg: "bg-gradient-to-br from-white to-blue-50/40", iconColor: "text-blue-400" },
};

const ALL_STATUSES: TabStatus[] = ["Running", "Pending", "Complete"];

function hasPendingItems(order: Order): boolean {
  if (!order.items || order.items.length === 0) return false;
  return order.items.some((item) => item.deliveredQty < item.orderedQty);
}

function formatDate(d: string): string {
  return new Date(d + "T00:00:00").toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

function summarizeItems(items?: OrderItem[]): string {
  if (!items || items.length === 0) return "";
  const byCategory = new Map<string, string[]>();
  for (const item of items) {
    const colors = byCategory.get(item.category) ?? [];
    colors.push(item.color);
    byCategory.set(item.category, colors);
  }
  return Array.from(byCategory.entries())
    .map(([cat, colors]) => `${cat} — ${colors.slice(0, 4).join(", ")}${colors.length > 4 ? "…" : ""}`)
    .join(" | ");
}

export default function RunningOrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [routes, setRoutes] = useState<RouteDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabStatus>("Running");
  const [search, setSearch] = useState("");
  const [collapsedRoutes, setCollapsedRoutes] = useState<Set<string>>(new Set());
  const [viewOrder, setViewOrder] = useState<Order | null>(null);

  useEffect(() => {
    const unsubOrders = subscribeOrders((loaded) => {
      setOrders(loaded);
      setLoading(false);
    });
    const unsubRoutes = subscribeRoutes(setRoutes);
    return () => { unsubOrders(); unsubRoutes(); };
  }, []);

  const routeNames = useMemo(() => routes.map((r) => r.name).sort(), [routes]);

  const oneWeekAgo = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() - 7);
    return d.toISOString().split("T")[0];
  }, []);

  const statusCounts = useMemo(() => {
    const c: Record<TabStatus, number> = { Running: 0, Pending: 0, Complete: 0 };
    for (const o of orders) {
      if (o.type === "Running") c.Running++;
      if (o.type === "Complete" && o.orderDate >= oneWeekAgo) c.Complete++;
      if (hasPendingItems(o) && o.orderDate >= oneWeekAgo) c.Pending++;
    }
    return c;
  }, [orders, oneWeekAgo]);

  const filteredOrders = useMemo(() => {
    const q = search.toLowerCase();
    return orders.filter((o) => {
      if (activeTab === "Pending") {
        if (!hasPendingItems(o)) return false;
        if (o.orderDate < oneWeekAgo) return false;
      } else {
        if (o.type !== activeTab) return false;
        if (activeTab === "Complete" && o.orderDate < oneWeekAgo) return false;
      }
      const matchSearch = !q || o.partyName.toLowerCase().includes(q) || o.partyAddress.toLowerCase().includes(q) || o.route.toLowerCase().includes(q);
      return matchSearch;
    });
  }, [orders, activeTab, search, oneWeekAgo]);

  const routeGroups = useMemo(() => {
    const map = new Map<string, Order[]>();
    for (const route of routeNames) map.set(route, []);
    for (const o of filteredOrders) {
      const list = map.get(o.route);
      if (list) list.push(o);
      else map.set(o.route, [o]);
    }
    return map;
  }, [filteredOrders, routeNames]);

  const activeRouteCount = useMemo(() => {
    let count = 0;
    routeGroups.forEach((o) => { if (o.length > 0) count++; });
    return count;
  }, [routeGroups]);

  function toggleRoute(route: string) {
    setCollapsedRoutes((prev) => {
      const next = new Set(prev);
      if (next.has(route)) next.delete(route);
      else next.add(route);
      return next;
    });
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader className="w-8 h-8 text-blue-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-3 gap-2">
        {ALL_STATUSES.map((s) => {
          const sc = STATUS_CONFIG[s];
          const Icon = sc.icon;
          const active = activeTab === s;
          return (
            <button key={s} onClick={() => setActiveTab(s)}
              className={`relative flex items-center gap-3 sm:gap-4 px-3 py-3 sm:px-6 sm:py-4 rounded-2xl border-2 transition-all duration-200 ${active ? `${sc.cardBg} ${sc.cardBorder} shadow-sm` : "bg-white border-transparent card-shadow hover:shadow-md"}`}
            >
              <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-xl ${sc.bg} flex items-center justify-center shrink-0`}>
                <Icon className={`w-5 h-5 sm:w-6 sm:h-6 ${sc.iconColor}`} strokeWidth={1.8} />
              </div>
              <div className="text-left">
                <p className={`text-[1.4rem] sm:text-[2rem] font-bold leading-none tabular-nums ${active ? sc.text : "text-slate-800"}`}>{statusCounts[s]}</p>
                <p className={`text-[0.78rem] font-semibold mt-1 ${active ? sc.text : "text-slate-400"}`}>{s}</p>
              </div>
              {active && <div className={`absolute top-3 right-3 w-2.5 h-2.5 rounded-full ${sc.dot}`} />}
            </button>
          );
        })}
      </div>

      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:justify-between">
        <p className="text-[0.84rem] text-slate-500">
          <span className="font-semibold text-slate-700">{filteredOrders.length}</span> orders across{" "}
          <span className="font-semibold text-slate-700">{activeRouteCount}</span> routes
        </p>
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <div className="relative flex-1 sm:flex-initial">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" strokeWidth={1.8} />
            <input type="text" placeholder="Search party, route..." value={search} onChange={(e) => setSearch(e.target.value)}
              className="w-full sm:w-60 h-9 pl-9 pr-4 rounded-xl bg-white border border-slate-100 text-[0.82rem] text-slate-700 placeholder:text-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-300 transition-all" />
          </div>
          <Link href="/create-order" className="flex items-center gap-2 h-9 px-5 rounded-xl bg-blue-500 text-white text-[0.82rem] font-medium hover:bg-blue-600 transition-colors shadow-sm">
            <Plus className="w-4 h-4" strokeWidth={2.2} />
            New Order
          </Link>
        </div>
      </div>

      <div className="space-y-4">
        {Array.from(routeGroups.entries()).map(([route, routeOrders]) => {
          const collapsed = collapsedRoutes.has(route);
          const hasOrders = routeOrders.length > 0;
          return (
            <div key={route} className="bg-white rounded-2xl card-shadow overflow-hidden">
              <button onClick={() => toggleRoute(route)} className="w-full flex items-center gap-3 px-6 py-4 hover:bg-slate-50/50 transition-colors">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${hasOrders ? "bg-blue-50" : "bg-slate-50"}`}>
                  <MapPin className={`w-4 h-4 ${hasOrders ? "text-blue-500" : "text-slate-300"}`} strokeWidth={1.8} />
                </div>
                <h3 className={`text-[0.92rem] font-bold tracking-wide ${hasOrders ? "text-slate-800" : "text-slate-400"}`}>{route}</h3>
                {hasOrders && (
                  <span className={`text-[0.72rem] font-bold px-2.5 py-0.5 rounded-full ${STATUS_CONFIG[activeTab].bg} ${STATUS_CONFIG[activeTab].text}`}>
                    {routeOrders.length} {routeOrders.length === 1 ? "order" : "orders"}
                  </span>
                )}
                {!hasOrders && <span className="text-[0.76rem] text-slate-300 italic">No orders in this route</span>}
                <div className="ml-auto">
                  {collapsed ? <ChevronRight className="w-4 h-4 text-slate-300" strokeWidth={1.8} /> : <ChevronDown className="w-4 h-4 text-slate-300" strokeWidth={1.8} />}
                </div>
              </button>
              {!collapsed && hasOrders && (
                <div className="px-6 pb-5 pt-0">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                    {routeOrders.map((order) => {
                      const sc = STATUS_CONFIG[order.type as TabStatus] ?? STATUS_CONFIG.Complete;
                      const itemsSummary = summarizeItems(order.items);
                      return (
                        <div key={order.id} className={`group relative rounded-xl border ${sc.cardBorder} ${sc.cardBg} p-4 hover:shadow-md transition-all duration-200 cursor-pointer`} onClick={() => setViewOrder(order)}>
                          <div className="flex items-start justify-between mb-3">
                            <div className="flex-1 min-w-0">
                              <h4 className="text-[0.88rem] font-bold text-slate-800 truncate">{order.partyName}</h4>
                              <div className="flex items-center gap-1.5 mt-1">
                                <Calendar className="w-3 h-3 text-slate-300 shrink-0" strokeWidth={1.8} />
                                <span className="text-[0.74rem] font-medium text-slate-500">{formatDate(order.orderDate)}</span>
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-1.5 mb-2">
                            <MapPin className="w-3 h-3 text-slate-300 shrink-0" strokeWidth={1.8} />
                            <span className="text-[0.76rem] text-slate-500 truncate">{order.partyAddress}</span>
                          </div>
                          {itemsSummary && (
                            <div className="mb-3">
                              <div className="flex items-center gap-1.5">
                                <Package className="w-3 h-3 text-slate-300 shrink-0" strokeWidth={1.8} />
                                <span className="text-[0.72rem] text-slate-400 truncate">{itemsSummary}</span>
                              </div>
                            </div>
                          )}
                          <div className="flex items-center justify-between pt-2.5 border-t border-slate-100/60">
                            <span className="text-[0.66rem] font-mono text-slate-300">#{order.csvId}</span>
                            <div className="flex items-center gap-1">
                              <button onClick={(e) => { e.stopPropagation(); window.print(); }} className="flex items-center gap-1 px-2 py-1 rounded-lg text-[0.68rem] font-medium text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors" title="Print">
                                <Printer className="w-3 h-3" strokeWidth={1.8} />
                                Print
                              </button>
                              <button onClick={(e) => { e.stopPropagation(); }} className="flex items-center gap-1 px-2 py-1 rounded-lg text-[0.68rem] font-medium text-slate-400 hover:text-sky-600 hover:bg-sky-50 transition-colors" title="Create Photo">
                                <Camera className="w-3 h-3" strokeWidth={1.8} />
                                Photo
                              </button>
                              <button onClick={(e) => { e.stopPropagation(); }} className="flex items-center gap-1 px-2 py-1 rounded-lg text-[0.68rem] font-medium text-slate-400 hover:text-amber-600 hover:bg-amber-50 transition-colors" title="Invoice">
                                <FileText className="w-3 h-3" strokeWidth={1.8} />
                                Invoice
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {viewOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/30 backdrop-blur-sm" onClick={() => setViewOrder(null)}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg mx-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-slate-100">
              <div>
                <h3 className="text-[1rem] font-bold text-slate-800">{viewOrder.partyName}</h3>
                <span className="text-[0.72rem] font-mono text-slate-400">#{viewOrder.csvId}</span>
              </div>
              <button onClick={() => setViewOrder(null)} className="p-2 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"><X className="w-4 h-4" strokeWidth={2} /></button>
            </div>
            <div className="px-6 py-5 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-slate-50 rounded-xl px-4 py-3">
                  <p className="text-[0.66rem] font-semibold uppercase tracking-widest text-slate-400">Route</p>
                  <p className="text-[0.88rem] font-semibold text-slate-800 mt-1">{viewOrder.route}</p>
                </div>
                <div className="bg-slate-50 rounded-xl px-4 py-3">
                  <p className="text-[0.66rem] font-semibold uppercase tracking-widest text-slate-400">Date</p>
                  <p className="text-[0.88rem] font-semibold text-slate-800 mt-1">{formatDate(viewOrder.orderDate)}</p>
                </div>
              </div>
              <div className="bg-slate-50 rounded-xl px-4 py-3">
                <p className="text-[0.66rem] font-semibold uppercase tracking-widest text-slate-400">Address</p>
                <p className="text-[0.84rem] text-slate-700 mt-1">{viewOrder.partyAddress}</p>
              </div>
              <div className="bg-slate-50 rounded-xl px-4 py-3">
                <p className="text-[0.66rem] font-semibold uppercase tracking-widest text-slate-400">Status</p>
                <div className="mt-1.5">
                  <span className={`inline-flex items-center gap-1.5 text-[0.76rem] font-medium px-2.5 py-1 rounded-full ${STATUS_CONFIG[viewOrder.type as TabStatus]?.bg ?? "bg-blue-50"} ${STATUS_CONFIG[viewOrder.type as TabStatus]?.text ?? "text-blue-600"}`}>
                    <div className={`w-1.5 h-1.5 rounded-full ${STATUS_CONFIG[viewOrder.type as TabStatus]?.dot ?? "bg-blue-400"}`} />
                    {viewOrder.type}
                  </span>
                </div>
              </div>
              {viewOrder.items && viewOrder.items.length > 0 && (
                <div className="bg-slate-50 rounded-xl px-4 py-3">
                  <p className="text-[0.66rem] font-semibold uppercase tracking-widest text-slate-400">Items</p>
                  <div className="mt-2 space-y-1">
                    {viewOrder.items.map((item, i) => (
                      <div key={`${item.color}-${i}`} className="flex items-center justify-between text-[0.82rem]">
                        <span className="text-slate-700">{item.color} <span className="text-slate-400">({item.category} / {item.material})</span></span>
                        <span className="text-slate-600 font-medium">{item.deliveredQty}/{item.orderedQty}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {viewOrder.grandTotalOrdered != null && (
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-blue-50 rounded-xl px-4 py-3">
                    <p className="text-[0.66rem] font-semibold uppercase tracking-widest text-blue-500">Ordered</p>
                    <p className="text-[1.1rem] font-bold text-blue-700 mt-1">{viewOrder.grandTotalOrdered}</p>
                  </div>
                  <div className="bg-sky-50 rounded-xl px-4 py-3">
                    <p className="text-[0.66rem] font-semibold uppercase tracking-widest text-sky-500">Delivered</p>
                    <p className="text-[1.1rem] font-bold text-sky-700 mt-1">{viewOrder.grandTotalDelivered}</p>
                  </div>
                </div>
              )}
            </div>
            <div className="flex justify-end gap-2 px-6 pb-5">
              <button onClick={() => setViewOrder(null)} className="h-9 px-5 rounded-xl border border-slate-200 text-[0.82rem] font-medium text-slate-600 hover:bg-slate-50 transition-colors">Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
