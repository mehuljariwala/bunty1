"use client";

import { useEffect, useRef, useState, useMemo, useCallback } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import {
  Search,
  Package,
  Loader,
  CircleCheck,
  X,
  Calendar,
  Eye,
  MapPin,
} from "lucide-react";
import { subscribeOrders } from "@/lib/orders";
import { Order, OrderItem } from "@/lib/types";

const ROUTES = ["LIMBAYAT", "SONAL", "BHATAR"] as const;
type RouteType = (typeof ROUTES)[number];

const TYPE_OPTIONS = ["All", "Running", "Complete"] as const;
type TypeFilter = (typeof TYPE_OPTIONS)[number];

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  const months = [
    "Jan", "Feb", "Mar", "Apr", "May", "Jun",
    "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
  ];
  return `${date.getDate().toString().padStart(2, "0")} ${
    months[date.getMonth()]
  } ${date.getFullYear()}`;
}

type GroupedItems = Map<string, Map<string, OrderItem[]>>;

function groupItemsByCategoryMaterial(items: OrderItem[]): GroupedItems {
  const grouped: GroupedItems = new Map();
  for (const item of items) {
    const cat = item.category || "Uncategorized";
    const mat = item.material || "General";
    if (!grouped.has(cat)) grouped.set(cat, new Map());
    const materialMap = grouped.get(cat)!;
    if (!materialMap.has(mat)) materialMap.set(mat, []);
    materialMap.get(mat)!.push(item);
  }
  return grouped;
}

function OrderDetailModal({
  order,
  onClose,
}: {
  order: Order;
  onClose: () => void;
}) {
  const items = order.items ?? [];
  const grouped = useMemo(() => groupItemsByCategoryMaterial(items), [items]);

  const totalOrdered = order.grandTotalOrdered ?? items.reduce((s, i) => s + i.orderedQty, 0);
  const totalDelivered = order.grandTotalDelivered ?? items.reduce((s, i) => s + i.deliveredQty, 0);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/30 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[85vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-slate-100 shrink-0">
          <div>
            <h3 className="text-[1rem] font-bold text-slate-800">
              {order.partyName}
            </h3>
            <span className="text-[0.72rem] font-mono text-slate-400">
              Order #{order.csvId}
            </span>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
          >
            <X className="w-4 h-4" strokeWidth={2} />
          </button>
        </div>

        <div className="px-6 py-5 space-y-4 overflow-y-auto flex-1">
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-slate-50 rounded-xl px-4 py-3">
              <p className="text-[0.66rem] font-semibold uppercase tracking-widest text-slate-400">
                Route
              </p>
              <div className="flex items-center gap-1.5 mt-1">
                <MapPin className="w-3.5 h-3.5 text-slate-400" strokeWidth={1.8} />
                <p className="text-[0.88rem] font-semibold text-slate-800">
                  {order.route}
                </p>
              </div>
            </div>
            <div className="bg-slate-50 rounded-xl px-4 py-3">
              <p className="text-[0.66rem] font-semibold uppercase tracking-widest text-slate-400">
                Date
              </p>
              <div className="flex items-center gap-1.5 mt-1">
                <Calendar className="w-3.5 h-3.5 text-slate-400" strokeWidth={1.8} />
                <p className="text-[0.88rem] font-semibold text-slate-800">
                  {formatDate(order.orderDate)}
                </p>
              </div>
            </div>
            <div className="bg-slate-50 rounded-xl px-4 py-3">
              <p className="text-[0.66rem] font-semibold uppercase tracking-widest text-slate-400">
                Status
              </p>
              <div className="mt-1.5">
                <span
                  className={`inline-flex items-center gap-1.5 text-[0.76rem] font-medium px-2.5 py-1 rounded-full ${
                    order.type === "Running"
                      ? "bg-blue-50 text-blue-700"
                      : "bg-slate-100 text-slate-700"
                  }`}
                >
                  {order.type}
                </span>
              </div>
            </div>
          </div>

          <div className="bg-slate-50 rounded-xl px-4 py-3">
            <p className="text-[0.66rem] font-semibold uppercase tracking-widest text-slate-400">
              Address
            </p>
            <p className="text-[0.84rem] text-slate-700 mt-1">
              {order.partyAddress}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="bg-blue-50 rounded-xl px-4 py-3">
              <p className="text-[0.66rem] font-semibold uppercase tracking-widest text-blue-500">
                Total Ordered
              </p>
              <p className="text-[1.3rem] font-bold text-blue-700 mt-1">
                {totalOrdered}
              </p>
            </div>
            <div className="bg-sky-50 rounded-xl px-4 py-3">
              <p className="text-[0.66rem] font-semibold uppercase tracking-widest text-sky-500">
                Total Delivered
              </p>
              <p className="text-[1.3rem] font-bold text-sky-700 mt-1">
                {totalDelivered}
              </p>
            </div>
          </div>

          <div>
            <p className="text-[0.76rem] font-semibold text-slate-600 uppercase tracking-wide mb-3">
              Order Items
            </p>

            {items.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-slate-400">
                <Package className="w-10 h-10 mb-2 opacity-30" />
                <p className="text-[0.84rem] font-medium">No items found</p>
                <p className="text-[0.72rem] mt-0.5">
                  This order has no item details yet
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {Array.from(grouped.entries()).map(([category, materials]) => (
                  <div
                    key={category}
                    className="bg-slate-50 rounded-xl overflow-hidden"
                  >
                    <div className="px-4 py-2.5 bg-slate-100/60 border-b border-slate-200/50">
                      <h4 className="text-[0.8rem] font-bold text-slate-700">
                        {category}
                      </h4>
                    </div>
                    <div className="px-4 py-2">
                      {Array.from(materials.entries()).map(
                        ([material, matItems]) => (
                          <div key={material} className="py-2 first:pt-1 last:pb-1">
                            <p className="text-[0.72rem] font-semibold text-slate-500 mb-1.5">
                              {material}
                            </p>
                            <div className="space-y-1">
                              {matItems.map((item) => {
                                const pending = item.orderedQty - item.deliveredQty;
                                return (
                                  <div
                                    key={`${item.color}-${item.orderedQty}`}
                                    className="flex items-center justify-between py-1.5 px-3 rounded-lg bg-white/70"
                                  >
                                    <span className="text-[0.82rem] text-slate-800 font-medium">
                                      {item.color}
                                    </span>
                                    <div className="flex items-center gap-4 text-[0.76rem]">
                                      <span className="text-blue-600 font-medium">
                                        Ord: {item.orderedQty}
                                      </span>
                                      <span className="text-sky-600 font-medium">
                                        Del: {item.deliveredQty}
                                      </span>
                                      {pending > 0 && (
                                        <span className="text-orange-500 font-semibold">
                                          Pen: {pending}
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="flex justify-end gap-2 px-6 py-4 border-t border-slate-100 shrink-0">
          <button
            onClick={onClose}
            className="h-9 px-5 rounded-xl border border-slate-200 text-[0.82rem] font-medium text-slate-600 hover:bg-slate-50 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedRoutes, setSelectedRoutes] = useState<Set<RouteType>>(
    new Set()
  );
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("All");
  const [viewOrder, setViewOrder] = useState<Order | null>(null);

  const parentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const unsubscribe = subscribeOrders((newOrders) => {
      setOrders(newOrders);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const filteredOrders = useMemo(() => {
    return orders.filter((order) => {
      const matchesSearch =
        searchQuery === "" ||
        order.partyName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        order.partyAddress.toLowerCase().includes(searchQuery.toLowerCase()) ||
        order.route.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesRoute =
        selectedRoutes.size === 0 || selectedRoutes.has(order.route as RouteType);

      const matchesType =
        typeFilter === "All" || order.type === typeFilter;

      return matchesSearch && matchesRoute && matchesType;
    });
  }, [orders, searchQuery, selectedRoutes, typeFilter]);

  const runningCount = orders.filter((o) => o.type === "Running").length;
  const completeCount = orders.filter((o) => o.type === "Complete").length;

  const rowVirtualizer = useVirtualizer({
    count: filteredOrders.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 48,
    overscan: 10,
  });

  const toggleRoute = useCallback((route: RouteType) => {
    setSelectedRoutes((prev) => {
      const newRoutes = new Set(prev);
      if (newRoutes.has(route)) {
        newRoutes.delete(route);
      } else {
        newRoutes.add(route);
      }
      return newRoutes;
    });
  }, []);

  const clearFilters = () => {
    setSearchQuery("");
    setSelectedRoutes(new Set());
    setTypeFilter("All");
  };

  const hasActiveFilters =
    searchQuery !== "" || selectedRoutes.size > 0 || typeFilter !== "All";

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl p-5 card-shadow">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-slate-600 text-[0.76rem] font-medium mb-1.5">
                Total Orders
              </p>
              <p className="text-[1.65rem] font-bold text-slate-900 leading-none">
                {orders.length.toLocaleString()}
              </p>
            </div>
            <div className="w-11 h-11 rounded-full bg-blue-50 flex items-center justify-center">
              <Package className="w-5 h-5 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 card-shadow">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-slate-600 text-[0.76rem] font-medium mb-1.5">
                Running
              </p>
              <p className="text-[1.65rem] font-bold text-slate-900 leading-none">
                {runningCount.toLocaleString()}
              </p>
            </div>
            <div className="w-11 h-11 rounded-full bg-orange-50 flex items-center justify-center">
              <Loader className="w-5 h-5 text-orange-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 card-shadow">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-slate-600 text-[0.76rem] font-medium mb-1.5">
                Complete
              </p>
              <p className="text-[1.65rem] font-bold text-slate-900 leading-none">
                {completeCount.toLocaleString()}
              </p>
            </div>
            <div className="w-11 h-11 rounded-full bg-blue-50 flex items-center justify-center">
              <CircleCheck className="w-5 h-5 text-blue-600" />
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl p-5 card-shadow space-y-4">
        <div className="flex flex-col lg:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search by party name, address, or route..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-9 pl-9 pr-3 rounded-xl border border-slate-100 text-[0.84rem] placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-300"
            />
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[0.76rem] text-slate-600 font-medium">
              Route:
            </span>
            {ROUTES.map((route) => (
              <button
                key={route}
                onClick={() => toggleRoute(route)}
                className={`px-3 h-9 rounded-xl text-[0.82rem] font-medium transition-all ${
                  selectedRoutes.has(route)
                    ? "bg-blue-500 text-white shadow-sm"
                    : "bg-white border border-slate-200 text-slate-600 hover:border-blue-300"
                }`}
              >
                {route}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[0.76rem] text-slate-600 font-medium">
              Type:
            </span>
            {TYPE_OPTIONS.map((type) => (
              <button
                key={type}
                onClick={() => setTypeFilter(type)}
                className={`px-3 h-9 rounded-xl text-[0.82rem] font-medium transition-all ${
                  typeFilter === type
                    ? "bg-blue-500 text-white shadow-sm"
                    : "bg-white border border-slate-200 text-slate-600 hover:border-blue-300"
                }`}
              >
                {type}
              </button>
            ))}
          </div>

          {hasActiveFilters && (
            <button
              onClick={clearFilters}
              className="flex items-center gap-1.5 px-3 h-9 rounded-xl border border-slate-200 text-[0.82rem] font-medium text-slate-600 hover:bg-slate-50 transition-colors"
            >
              <X className="w-3.5 h-3.5" />
              Clear
            </button>
          )}
        </div>

        <div className="text-[0.76rem] text-slate-600">
          Showing {filteredOrders.length.toLocaleString()} of{" "}
          {orders.length.toLocaleString()} orders
        </div>
      </div>

      <div className="bg-white rounded-2xl card-shadow overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-96">
            <Loader className="w-8 h-8 text-blue-500 animate-spin" />
          </div>
        ) : filteredOrders.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-96 text-slate-500">
            <Package className="w-12 h-12 mb-3 opacity-30" />
            <p className="text-[0.9rem] font-medium">No orders found</p>
            <p className="text-[0.76rem] mt-1">
              Try adjusting your filters or search query
            </p>
          </div>
        ) : (
          <div>
            <div className="grid grid-cols-[60px_1fr_80px_40px] md:grid-cols-[80px_1fr_1fr_120px_100px_60px] lg:grid-cols-[80px_1fr_1.5fr_120px_130px_100px_60px] gap-4 px-5 py-3.5 bg-slate-50 border-b border-slate-100 sticky top-0 z-10">
              <div className="text-[0.72rem] font-semibold text-slate-600 uppercase tracking-wide">
                ID
              </div>
              <div className="text-[0.72rem] font-semibold text-slate-600 uppercase tracking-wide">
                Party Name
              </div>
              <div className="text-[0.72rem] font-semibold text-slate-600 uppercase tracking-wide hidden lg:block">
                Address
              </div>
              <div className="text-[0.72rem] font-semibold text-slate-600 uppercase tracking-wide hidden md:block">
                Route
              </div>
              <div className="text-[0.72rem] font-semibold text-slate-600 uppercase tracking-wide flex items-center gap-1 hidden md:block">
                <Calendar className="w-3 h-3" />
                Date
              </div>
              <div className="text-[0.72rem] font-semibold text-slate-600 uppercase tracking-wide">
                Type
              </div>
              <div />
            </div>

            <div
              ref={parentRef}
              className="overflow-auto"
              style={{ height: "calc(100vh - 420px)" }}
            >
              <div
                style={{
                  height: `${rowVirtualizer.getTotalSize()}px`,
                  width: "100%",
                  position: "relative",
                }}
              >
                {rowVirtualizer.getVirtualItems().map((virtualRow) => {
                  const order = filteredOrders[virtualRow.index];
                  const isEven = virtualRow.index % 2 === 0;

                  return (
                    <div
                      key={order.id}
                      className={`grid grid-cols-[60px_1fr_80px_40px] md:grid-cols-[80px_1fr_1fr_120px_100px_60px] lg:grid-cols-[80px_1fr_1.5fr_120px_130px_100px_60px] gap-4 px-5 items-center absolute top-0 left-0 w-full transition-colors hover:bg-blue-50/50 ${
                        isEven ? "bg-white" : "bg-slate-25"
                      }`}
                      style={{
                        height: `${virtualRow.size}px`,
                        transform: `translateY(${virtualRow.start}px)`,
                      }}
                    >
                      <div className="text-[0.84rem] font-medium text-slate-900">
                        {order.csvId}
                      </div>
                      <div className="text-[0.84rem] text-slate-900 truncate">
                        {order.partyName}
                      </div>
                      <div className="text-[0.84rem] text-slate-600 truncate hidden lg:block">
                        {order.partyAddress}
                      </div>
                      <div className="text-[0.84rem] text-slate-700 font-medium hidden md:block">
                        {order.route}
                      </div>
                      <div className="text-[0.84rem] text-slate-600 hidden md:block">
                        {formatDate(order.orderDate)}
                      </div>
                      <div>
                        <span
                          className={`inline-flex items-center px-2.5 py-1 rounded-full text-[0.72rem] font-medium ${
                            order.type === "Running"
                              ? "bg-blue-50 text-blue-700"
                              : "bg-slate-100 text-slate-700"
                          }`}
                        >
                          {order.type}
                        </span>
                      </div>
                      <div className="flex justify-center">
                        <button
                          onClick={() => setViewOrder(order)}
                          className="p-1.5 rounded-lg text-slate-300 hover:text-sky-500 hover:bg-sky-50 transition-colors"
                          title="View Details"
                        >
                          <Eye className="w-4 h-4" strokeWidth={1.8} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>

      {viewOrder && (
        <OrderDetailModal
          order={viewOrder}
          onClose={() => setViewOrder(null)}
        />
      )}
    </div>
  );
}
