"use client";

import { useState, useMemo, useEffect } from "react";
import Link from "next/link";
import {
  Plus,
  X,
  Printer,
  MapPin,
  Calendar,
  Package,
  Loader2,
  Camera,
  FileText,
} from "lucide-react";
import { subscribeOrders } from "@/lib/orders";
import { subscribeRoutes } from "@/lib/routes";
import type { Order, RouteDoc, OrderItem } from "@/lib/types";

type TabStatus = "Running" | "Pending" | "Complete";

const ALL_STATUSES: TabStatus[] = ["Running", "Pending", "Complete"];

function hasPendingItems(order: Order): boolean {
  if (!order.items || order.items.length === 0) return false;
  return order.items.some((item) => item.deliveredQty < item.orderedQty);
}

function formatDate(d: string): string {
  return new Date(d + "T00:00:00").toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export default function RunningOrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [routes, setRoutes] = useState<RouteDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabStatus>("Running");
  const [viewOrder, setViewOrder] = useState<Order | null>(null);

  useEffect(() => {
    const unsubOrders = subscribeOrders((loaded) => {
      setOrders(loaded);
      setLoading(false);
    });
    const unsubRoutes = subscribeRoutes(setRoutes);
    return () => {
      unsubOrders();
      unsubRoutes();
    };
  }, []);

  const routeNames = useMemo(() => routes.map((r) => r.name).sort(), [routes]);

  const oneWeekAgo = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() - 7);
    return d.toISOString().split("T")[0];
  }, []);

  const filteredOrders = useMemo(() => {
    return orders.filter((o) => {
      if (activeTab === "Pending") {
        if (!hasPendingItems(o)) return false;
        if (o.orderDate < oneWeekAgo) return false;
      } else {
        if (o.type !== activeTab) return false;
        if (activeTab === "Complete" && o.orderDate < oneWeekAgo) return false;
      }
      return true;
    });
  }, [orders, activeTab, oneWeekAgo]);

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

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="flex flex-col items-center gap-3">
          <Loader2
            className="w-8 h-8 text-crm-primary animate-spin"
            strokeWidth={1.8}
          />
          <p className="text-[0.85rem] text-crm-text-muted">
            Loading orders...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-7rem)] flex flex-col">
      <div className="bg-crm-card rounded-2xl card-shadow border border-crm-border overflow-hidden flex flex-col flex-1 min-h-0">
        {/* Tabs */}
        <div className="flex justify-center border-b border-crm-border shrink-0">
          {ALL_STATUSES.map((s) => {
            const active = activeTab === s;
            return (
              <button
                key={s}
                onClick={() => setActiveTab(s)}
                className={`px-5 sm:px-10 py-2 sm:py-2.5 text-[0.78rem] sm:text-[0.85rem] font-semibold uppercase tracking-wider transition-all ${
                  active
                    ? "text-crm-primary border-b-2 border-crm-primary"
                    : "text-crm-text-muted hover:text-crm-text"
                }`}
              >
                {s}
              </button>
            );
          })}
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto min-h-0 px-3 sm:px-5 py-2 sm:py-3">
          {Array.from(routeGroups.entries()).map(([route, routeOrders]) => (
            <div key={route} className="mb-1.5">
              <p className="text-[0.82rem] font-bold text-crm-text leading-tight">
                {route} :-
              </p>
              {routeOrders.length === 0 ? (
                <p className="text-[0.78rem] text-crm-text-muted ml-1 leading-snug">
                  No parties in this route.
                </p>
              ) : (
                <div className="mt-0.5 space-y-0.5">
                  {routeOrders.map((order) => (
                    <div
                      key={order.id}
                      onClick={() => setViewOrder(order)}
                      className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-crm-bg/30 hover:bg-crm-primary-muted/20 transition-colors cursor-pointer group"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-[0.8rem] font-semibold text-crm-text truncate leading-tight">
                          {order.partyName}
                        </p>
                        <div className="flex items-center gap-2">
                          <span className="text-[0.68rem] text-crm-text-muted">
                            {formatDate(order.orderDate)}
                          </span>
                          {order.items && order.items.length > 0 && (
                            <span className="text-[0.68rem] text-crm-text-muted">
                              {order.items.length} item{order.items.length !== 1 && "s"}
                            </span>
                          )}
                          <span className="text-[0.62rem] font-mono text-crm-border">
                            #{order.csvId}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                        <button
                          onClick={(e) => { e.stopPropagation(); window.print(); }}
                          className="p-1 rounded text-crm-border hover:text-crm-primary transition-colors"
                        >
                          <Printer className="w-3 h-3" strokeWidth={1.8} />
                        </button>
                        <button
                          onClick={(e) => e.stopPropagation()}
                          className="p-1 rounded text-crm-border hover:text-crm-primary transition-colors"
                        >
                          <Camera className="w-3 h-3" strokeWidth={1.8} />
                        </button>
                        <button
                          onClick={(e) => e.stopPropagation()}
                          className="p-1 rounded text-crm-border hover:text-crm-primary transition-colors"
                        >
                          <FileText className="w-3 h-3" strokeWidth={1.8} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}

          <div className="flex justify-center mt-4 pb-1">
            <Link
              href="/select-party"
              className="flex items-center gap-2 h-9 px-7 rounded-xl bg-crm-primary text-white text-[0.82rem] font-semibold hover:bg-[#4845a2] transition-colors shadow-sm"
            >
              <Plus className="w-3.5 h-3.5" strokeWidth={2.2} />
              New Order
            </Link>
          </div>
        </div>
      </div>

      {/* View order modal */}
      {viewOrder && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-crm-sidebar/30 backdrop-blur-sm"
          onClick={() => setViewOrder(null)}
        >
          <div
            className="bg-crm-card rounded-2xl shadow-xl w-full max-w-lg mx-4 max-h-[85vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-crm-border/50 shrink-0">
              <div>
                <h3 className="text-[1rem] font-bold text-crm-text">
                  {viewOrder.partyName}
                </h3>
                <span className="text-[0.72rem] font-mono text-crm-text-muted">
                  #{viewOrder.csvId}
                </span>
              </div>
              <button
                onClick={() => setViewOrder(null)}
                className="p-2 rounded-lg hover:bg-crm-primary-muted text-crm-text-muted hover:text-crm-text transition-colors"
              >
                <X className="w-4 h-4" strokeWidth={2} />
              </button>
            </div>
            <div className="px-6 py-5 space-y-4 overflow-y-auto flex-1 min-h-0">
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-crm-bg/50 rounded-xl px-4 py-3">
                  <p className="text-[0.66rem] font-semibold uppercase tracking-widest text-crm-text-muted">
                    Route
                  </p>
                  <p className="text-[0.88rem] font-semibold text-crm-text mt-1">
                    {viewOrder.route}
                  </p>
                </div>
                <div className="bg-crm-bg/50 rounded-xl px-4 py-3">
                  <p className="text-[0.66rem] font-semibold uppercase tracking-widest text-crm-text-muted">
                    Date
                  </p>
                  <p className="text-[0.88rem] font-semibold text-crm-text mt-1">
                    {formatDate(viewOrder.orderDate)}
                  </p>
                </div>
              </div>
              <div className="bg-crm-bg/50 rounded-xl px-4 py-3">
                <p className="text-[0.66rem] font-semibold uppercase tracking-widest text-crm-text-muted">
                  Address
                </p>
                <p className="text-[0.84rem] text-crm-text mt-1">
                  {viewOrder.partyAddress}
                </p>
              </div>
              <div className="bg-crm-bg/50 rounded-xl px-4 py-3">
                <p className="text-[0.66rem] font-semibold uppercase tracking-widest text-crm-text-muted">
                  Status
                </p>
                <div className="mt-1.5">
                  <span
                    className={`inline-flex items-center gap-1.5 text-[0.76rem] font-medium px-2.5 py-1 rounded-full ${
                      viewOrder.type === "Running"
                        ? "bg-crm-primary-muted text-crm-primary"
                        : "bg-crm-bg text-crm-text-muted"
                    }`}
                  >
                    <div
                      className={`w-1.5 h-1.5 rounded-full ${
                        viewOrder.type === "Running"
                          ? "bg-crm-primary"
                          : "bg-crm-text-muted"
                      }`}
                    />
                    {viewOrder.type}
                  </span>
                </div>
              </div>
              {viewOrder.items && viewOrder.items.length > 0 && (
                <div className="bg-crm-bg/50 rounded-xl px-4 py-3">
                  <p className="text-[0.66rem] font-semibold uppercase tracking-widest text-crm-text-muted">
                    Items
                  </p>
                  <div className="mt-2 space-y-1">
                    {viewOrder.items.map((item, i) => (
                      <div
                        key={`${item.color}-${i}`}
                        className="flex items-center justify-between text-[0.82rem]"
                      >
                        <span className="text-crm-text">
                          {item.color}{" "}
                          <span className="text-crm-text-muted">
                            ({item.category} / {item.material})
                          </span>
                        </span>
                        <span className="text-crm-text font-medium">
                          {item.deliveredQty}/{item.orderedQty}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {viewOrder.grandTotalOrdered != null && (
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-crm-primary-muted rounded-xl px-4 py-3">
                    <p className="text-[0.66rem] font-semibold uppercase tracking-widest text-crm-primary">
                      Ordered
                    </p>
                    <p className="text-[1.1rem] font-bold text-crm-text mt-1">
                      {viewOrder.grandTotalOrdered}
                    </p>
                  </div>
                  <div className="bg-crm-primary-muted rounded-xl px-4 py-3">
                    <p className="text-[0.66rem] font-semibold uppercase tracking-widest text-crm-primary">
                      Delivered
                    </p>
                    <p className="text-[1.1rem] font-bold text-crm-text mt-1">
                      {viewOrder.grandTotalDelivered}
                    </p>
                  </div>
                </div>
              )}
            </div>
            <div className="flex justify-end gap-2 px-6 pb-5 shrink-0">
              <button
                onClick={() => setViewOrder(null)}
                className="h-9 px-5 rounded-xl border border-crm-border text-[0.82rem] font-medium text-crm-text-muted hover:bg-crm-primary-muted transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
