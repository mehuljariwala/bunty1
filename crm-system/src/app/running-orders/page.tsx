"use client";

import { useState, useMemo, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import {
  Plus,
  X,
  Printer,
  FileText,
  Pencil,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { subscribeOrders, getNextSeqNumber, subscribeSeqCounter } from "@/lib/orders";
import { useRoutesQuery } from "@/hooks/use-queries";
import { savePhotoRecord } from "@/lib/photos";
import BillLayout from "@/components/BillLayout";
import type { Order, RouteDoc } from "@/lib/types";

const RO_CACHE_KEY = "running_orders_cache";

function getCachedOrders(): { orders: Order[]; routes: RouteDoc[] } | null {
  try {
    const raw = sessionStorage.getItem(RO_CACHE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch { return null; }
}

function setCachedOrders(orders: Order[], routes: RouteDoc[]): void {
  try { sessionStorage.setItem(RO_CACHE_KEY, JSON.stringify({ orders, routes })); }
  catch { /* ignore */ }
}

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

function formatDatePrint(d: string): string {
  const dt = new Date(d + "T00:00:00");
  const dd = String(dt.getDate()).padStart(2, "0");
  const mm = String(dt.getMonth() + 1).padStart(2, "0");
  const yyyy = dt.getFullYear();
  return `${dd}-${mm}-${yyyy}`;
}

function PrintView({ order, sequenceNumber }: { order: Order; sequenceNumber?: number }) {
  return <BillLayout order={order} sequenceNumber={sequenceNumber} />;
}

export default function RunningOrdersPage() {
  const cachedRO = useRef(getCachedOrders());
  const [orders, setOrders] = useState<Order[]>(cachedRO.current?.orders ?? []);
  const { data: routes = cachedRO.current?.routes ?? [] } = useRoutesQuery();
  const [loading, setLoading] = useState(!cachedRO.current);
  const [activeTab, setActiveTab] = useState<TabStatus>("Running");
  const [completeDate, setCompleteDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [viewOrder, setViewOrder] = useState<Order | null>(null);
  const [printOrder, setPrintOrder] = useState<Order | null>(null);
  const [cardTips, setCardTips] = useState<Record<string, string>>({});
  const [seqCounter, setSeqCounter] = useState(0);
  const [printSeq, setPrintSeq] = useState<number | null>(null);
  const printRef = useRef<HTMLDivElement>(null);

  const showCardTip = useCallback((orderId: string, message: string) => {
    setCardTips((prev) => ({ ...prev, [orderId]: message }));
    setTimeout(() => {
      setCardTips((prev) => {
        const next = { ...prev };
        delete next[orderId];
        return next;
      });
    }, 2000);
  }, []);

  const handlePrint = useCallback(async (order: Order) => {
    showCardTip(order.id, `Saving...`);

    // First save to photo-master collection, then print
    let realSeq = seqCounter + 1;
    try {
      realSeq = await getNextSeqNumber();
    } catch {
      // use local fallback
    }

    try {
      await savePhotoRecord({
        orderId: order.id,
        orderCsvId: order.csvId,
        partyName: order.partyName,
        route: order.route,
        orderDate: order.orderDate,
        sequenceNumber: realSeq,
        orderSnapshot: order,
        capturedAt: new Date().toISOString(),
        status: "pending",
      });
      showCardTip(order.id, `Seq #${realSeq} — Saved`);
    } catch {
      showCardTip(order.id, `Seq #${realSeq} — Save failed`);
      return;
    }

    // Now print after successful save
    setPrintSeq(realSeq);
    setPrintOrder(order);

    const originalTitle = document.title;
    document.title = `${order.partyName}_${formatDatePrint(order.orderDate)}`;
    setTimeout(() => { window.print(); }, 150);
    setTimeout(() => { document.title = originalTitle; }, 3000);
  }, [showCardTip, seqCounter]);

  useEffect(() => {
    const unsubOrders = subscribeOrders((loaded) => {
      setOrders(loaded);
      setLoading(false);
      setCachedOrders(loaded, routes);
    });
    const unsubSeq = subscribeSeqCounter((counter) => {
      setSeqCounter(counter);
    });
    return () => {
      unsubOrders();
      unsubSeq();
    };
  }, []);

  useEffect(() => {
    const onAfterPrint = () => {
      setPrintOrder(null);
      setPrintSeq(null);
    };
    window.addEventListener("afterprint", onAfterPrint);
    return () => window.removeEventListener("afterprint", onAfterPrint);
  }, []);

  const routeNames = useMemo(() => routes.map((r) => r.name).sort(), [routes]);

  const oneWeekAgo = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() - 7);
    return d.toISOString().split("T")[0];
  }, []);

  const filteredOrders = useMemo(() => {
    return orders
      .filter((o) => {
        if (activeTab === "Pending") {
          if (!hasPendingItems(o)) return false;
          if (o.orderDate < oneWeekAgo) return false;
        } else if (activeTab === "Complete") {
          if (o.type !== "Complete") return false;
          if (o.orderDate !== completeDate) return false;
        } else {
          if (o.type !== activeTab) return false;
        }
        return true;
      })
      .sort((a, b) => a.csvId - b.csvId);
  }, [orders, activeTab, oneWeekAgo, completeDate]);

  const tabCounts = useMemo(() => {
    const counts: Record<TabStatus, number> = { Running: 0, Pending: 0, Complete: 0 };
    for (const o of orders) {
      if (o.type === "Running") counts.Running++;
      if (hasPendingItems(o) && o.orderDate >= oneWeekAgo) counts.Pending++;
      if (o.type === "Complete" && o.orderDate === completeDate) counts.Complete++;
    }
    return counts;
  }, [orders, oneWeekAgo, completeDate]);

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

  return (
    <div className="flex flex-col flex-1">
      <div className="flex flex-col flex-1">
        {/* Tabs */}
        <div className="flex justify-around shrink-0" style={{ borderBottom: "1px solid #DDDDDD", marginBottom: "15px" }}>
          {ALL_STATUSES.map((s) => {
            const active = activeTab === s;
            return (
              <button
                key={s}
                onClick={() => setActiveTab(s)}
                className="uppercase transition-all flex-1 sm:flex-none"
                style={{
                  padding: "10px",
                  fontSize: "13px",
                  fontWeight: 400,
                  color: active ? "#1460BD" : "#8D9293",
                  backgroundColor: active ? "#F7F7F7" : "transparent",
                  borderBottom: active ? "4px solid #1460BD" : "0px none",
                  borderTop: "0px none",
                  borderLeft: "0px none",
                  borderRight: "0px none",
                  borderRadius: "1px",
                  cursor: "pointer",
                }}
              >
                {s}
                <span
                  className="ml-1.5 rounded-full leading-none"
                  style={{
                    fontSize: "11px",
                    fontWeight: 600,
                    padding: "2px 6px",
                    backgroundColor: active ? "#1460BD" : "#e0e0e0",
                    color: active ? "#fff" : "#8D9293",
                  }}
                >
                  {tabCounts[s]}
                </span>
              </button>
            );
          })}
        </div>

        {activeTab === "Complete" && (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "8px", padding: "0 15px 10px" }}>
            <button
              onClick={() => {
                const d = new Date(completeDate + "T00:00:00");
                d.setDate(d.getDate() - 1);
                setCompleteDate(d.toISOString().split("T")[0]);
              }}
              style={{ background: "none", border: "1px solid #e0e0e0", borderRadius: "8px", padding: "5px 8px", cursor: "pointer", display: "flex", alignItems: "center" }}
            >
              <ChevronLeft className="w-4 h-4" style={{ color: "#8D9293" }} strokeWidth={2} />
            </button>
            <input
              type="date"
              value={completeDate}
              onChange={(e) => setCompleteDate(e.target.value)}
              style={{
                fontSize: "13px",
                fontWeight: 500,
                color: "#444",
                border: "1px solid #e0e0e0",
                borderRadius: "8px",
                padding: "5px 12px",
                outline: "none",
                textAlign: "center",
              }}
            />
            <button
              onClick={() => {
                const d = new Date(completeDate + "T00:00:00");
                d.setDate(d.getDate() + 1);
                setCompleteDate(d.toISOString().split("T")[0]);
              }}
              style={{ background: "none", border: "1px solid #e0e0e0", borderRadius: "8px", padding: "5px 8px", cursor: "pointer", display: "flex", alignItems: "center" }}
            >
              <ChevronRight className="w-4 h-4" style={{ color: "#8D9293" }} strokeWidth={2} />
            </button>
            {completeDate !== new Date().toISOString().split("T")[0] && (
              <button
                onClick={() => setCompleteDate(new Date().toISOString().split("T")[0])}
                style={{ fontSize: "11.5px", fontWeight: 500, color: "#1460BD", background: "#EBF2FF", border: "none", borderRadius: "8px", padding: "6px 12px", cursor: "pointer" }}
              >
                Today
              </button>
            )}
          </div>
        )}

        {/* Scrollable content */}
        <div style={{ padding: "0 15px 15px" }}>
          {loading ? (
            <div>
              {[1, 2].map((g) => (
                <div key={g} style={{ marginBottom: "10px" }}>
                  <div className="animate-[shimmer_1.5s_ease-in-out_infinite] bg-gradient-to-r from-gray-100 via-gray-200 to-gray-100 bg-[length:200%_100%] rounded h-4 w-28" style={{ margin: "10px 0" }} />
                  <div className="grid grid-cols-1 xs:grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3 xs:gap-x-[38px] xs:gap-y-3" style={{ padding: "4px 4px 0" }}>
                    {Array.from({ length: g === 1 ? 4 : 3 }).map((_, i) => (
                      <div
                        key={i}
                        style={{
                          background: "#fff",
                          borderRadius: "15px",
                          boxShadow: "0px 1px 4px 0px rgba(0,0,0,0.14)",
                          margin: "5px 0",
                          overflow: "hidden",
                        }}
                      >
                        <div style={{ padding: "10px", display: "flex", flexDirection: "column", gap: "8px" }}>
                          <div className="flex items-center justify-between">
                            <div className="animate-[shimmer_1.5s_ease-in-out_infinite] bg-gradient-to-r from-gray-100 via-gray-200 to-gray-100 bg-[length:200%_100%] rounded h-4 flex-1 mr-2" />
                            <div className="animate-[shimmer_1.5s_ease-in-out_infinite] bg-gradient-to-r from-gray-100 via-gray-200 to-gray-100 bg-[length:200%_100%] rounded h-4 w-10" />
                          </div>
                          <div className="animate-[shimmer_1.5s_ease-in-out_infinite] bg-gradient-to-r from-gray-100 via-gray-200 to-gray-100 bg-[length:200%_100%] rounded h-3 w-24" />
                          <div className="animate-[shimmer_1.5s_ease-in-out_infinite] bg-gradient-to-r from-gray-100 via-gray-200 to-gray-100 bg-[length:200%_100%] rounded h-3 w-32" />
                        </div>
                        <div style={{ borderTop: "1px solid #f0f0f0", display: "flex" }}>
                          {[1, 2, 3].map((b) => (
                            <div key={b} className="flex-1 flex justify-center" style={{ padding: "7px 0" }}>
                              <div className="animate-[shimmer_1.5s_ease-in-out_infinite] bg-gradient-to-r from-gray-100 via-gray-200 to-gray-100 bg-[length:200%_100%] rounded h-3 w-10" />
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : (
          <>
          {Array.from(routeGroups.entries()).map(([route, routeOrders]) => (
            <div key={route} style={{ marginBottom: "10px" }}>
              <h4 style={{ color: "#444444", fontSize: "15px", fontWeight: 500, margin: "10px 0", lineHeight: "16.5px" }}>
                {route.toUpperCase()} :-
              </h4>
              {routeOrders.length === 0 ? (
                <p style={{ fontSize: "12.5px", color: "#8D9293", marginLeft: "5px" }}>
                  No orders in this route
                </p>
              ) : (
                <div className="grid grid-cols-1 xs:grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3 xs:gap-x-[38px] xs:gap-y-3" style={{ padding: "4px 4px 0" }}>
                  {routeOrders.map((order) => {
                    const delivered = order.grandTotalDelivered ?? order.items?.reduce((s, i) => s + i.deliveredQty, 0) ?? 0;
                    return (
                      <div
                        key={order.id}
                        onClick={() => setViewOrder(order)}
                        style={{
                          position: "relative",
                          background: "#fff",
                          borderRadius: "15px",
                          boxShadow: "0px 1px 4px 0px rgba(0,0,0,0.14)",
                          margin: "5px 0",
                          padding: 0,
                          overflow: "visible",
                          transition: "0.2s",
                          cursor: "pointer",
                          color: "rgba(0,0,0,0.87)",
                        }}
                      >
                        {/* Delivered badge — outside card on desktop, inline on mobile */}
                        <div className="hidden xs:flex" style={{
                          position: "absolute",
                          top: "50%",
                          left: "100%",
                          transform: "translateY(-50%)",
                          marginLeft: "1px",
                          minWidth: "24px",
                          height: "24px",
                          alignItems: "center",
                          justifyContent: "center",
                          background: "#fff",
                          border: "1.5px solid #1460BD",
                          borderRadius: "0 6px 6px 0",
                          fontSize: "12px",
                          fontWeight: 700,
                          color: "#1460BD",
                          padding: "0 5px",
                          boxShadow: "1px 1px 3px rgba(0,0,0,0.12)",
                          zIndex: 1,
                          lineHeight: 1,
                        }}>
                          {delivered}
                        </div>
                        <div style={{ padding: "10px", display: "flex", flexDirection: "column", textAlign: "left" }}>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
                            <div style={{ fontSize: "14px", fontWeight: 500, color: "#1460BD", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1, minWidth: 0 }}>
                              {order.partyName.toUpperCase()}
                            </div>
                            <div className="flex items-center gap-1 shrink-0 ml-1.5">
                              <span style={{ fontSize: "11px", fontWeight: 600, color: "#444", background: "#f0f0f0", borderRadius: "4px", padding: "1px 6px" }}>
                                #{order.csvId}
                              </span>
                              {/* Inline delivered badge — mobile only */}
                              <span className="xs:hidden" style={{ fontSize: "10px", fontWeight: 700, color: "#fff", background: "#1460BD", borderRadius: "4px", padding: "1px 6px" }}>
                                {delivered}
                              </span>
                            </div>
                          </div>
                          <div style={{ fontSize: "12.5px", color: "#337AB7", marginBottom: "3px" }}>
                            {formatDate(order.orderDate)}
                          </div>
                          <div style={{ fontSize: "12.5px", color: "#337AB7", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                            {order.partyAddress}
                          </div>
                        </div>

                        <div style={{ display: "flex", alignItems: "center", borderTop: "1px solid #f0f0f0" }}>
                          <Link
                            href={`/create-order?edit=${order.id}`}
                            onClick={(e) => e.stopPropagation()}
                            style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: "4px", padding: "7px 0", fontSize: "11.5px", fontWeight: 500, color: "#8D9293", textDecoration: "none", transition: "0.2s" }}
                            className="hover:!text-[#1460BD] hover:!bg-[#f7f7f7]"
                          >
                            <Pencil className="w-3 h-3" strokeWidth={1.8} />
                            Edit
                          </Link>
                          <div style={{ width: "1px", height: "16px", background: "#f0f0f0" }} />
                          <button
                            onClick={(e) => { e.stopPropagation(); handlePrint(order); }}
                            style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: "4px", padding: "7px 0", fontSize: "11.5px", fontWeight: 500, color: "#8D9293", background: "none", border: "none", cursor: "pointer", transition: "0.2s" }}
                            className="hover:!text-[#1460BD] hover:!bg-[#f7f7f7]"
                          >
                            <Printer className="w-3 h-3" strokeWidth={1.8} />
                            Print
                          </button>
                          <div style={{ width: "1px", height: "16px", background: "#f0f0f0" }} />
                          <Link
                            href={`/order-bill/${order.id}`}
                            onClick={(e) => e.stopPropagation()}
                            style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: "4px", padding: "7px 0", fontSize: "11.5px", fontWeight: 500, color: "#8D9293", textDecoration: "none", transition: "0.2s" }}
                            className="hover:!text-[#1460BD] hover:!bg-[#f7f7f7]"
                          >
                            <FileText className="w-3 h-3" strokeWidth={1.8} />
                            Invoice
                          </Link>
                        </div>

                        {cardTips[order.id] && (
                          <p style={{ fontSize: "10px", fontWeight: 500, color: "#1B4D3E", textAlign: "center", padding: "4px 0" }} className="animate-pulse">
                            {cardTips[order.id]}
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          ))}

          <div className="flex justify-center" style={{ marginTop: "15px", paddingBottom: "10px" }}>
            <Link
              href="/select-party"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                padding: "10px 30px",
                fontSize: "14px",
                fontWeight: 400,
                color: "#fff",
                backgroundColor: "#1460BD",
                border: "1px solid #1460BD",
                borderRadius: "3px",
                textDecoration: "none",
                cursor: "pointer",
              }}
            >
              <Plus className="w-4 h-4" strokeWidth={2} />
              New Order
            </Link>
          </div>
          </>
          )}
        </div>
      </div>

      {/* Print layout — hidden on screen, visible on print */}
      {printOrder && (
        <div ref={printRef} className="print-order-sheet">
          <style>{`
            @media print {
              body * { visibility: hidden !important; }
              .print-order-sheet, .print-order-sheet * { visibility: visible !important; }
              .print-order-sheet {
                position: fixed !important;
                top: 0; left: 0; right: 0;
                z-index: 99999;
                background: #fff;
                padding: 0;
                margin: 0;
              }
              body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
              .no-print { display: none !important; }
              @page { margin: 0; }
            }
            @media screen {
              .print-order-sheet { display: none; }
            }
          `}</style>
          <PrintView order={printOrder} sequenceNumber={printSeq ?? undefined} />
        </div>
      )}

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
