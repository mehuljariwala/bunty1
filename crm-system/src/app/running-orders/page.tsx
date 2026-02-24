"use client";

import { useState, useMemo, useEffect, useRef, useCallback } from "react";
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
  Download,
  Send,
} from "lucide-react";
import { toPng } from "html-to-image";
import { subscribeOrders, markOrderComplete } from "@/lib/orders";
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

function formatDatePrint(d: string): string {
  const dt = new Date(d + "T00:00:00");
  const dd = String(dt.getDate()).padStart(2, "0");
  const mm = String(dt.getMonth() + 1).padStart(2, "0");
  const yyyy = dt.getFullYear();
  return `${dd}-${mm}-${yyyy}`;
}

interface CategoryGroup {
  category: string;
  materials: Map<string, OrderItem[]>;
  totalOrdered: number;
  totalDelivered: number;
}

function buildCategoryGroups(items: OrderItem[]): CategoryGroup[] {
  const catMap = new Map<string, Map<string, OrderItem[]>>();
  for (const item of items) {
    if (!catMap.has(item.category)) catMap.set(item.category, new Map());
    const matMap = catMap.get(item.category)!;
    if (!matMap.has(item.material)) matMap.set(item.material, []);
    matMap.get(item.material)!.push(item);
  }
  const groups: CategoryGroup[] = [];
  for (const [category, materials] of catMap) {
    let totalOrdered = 0;
    let totalDelivered = 0;
    for (const matItems of materials.values()) {
      for (const it of matItems) {
        totalOrdered += it.orderedQty;
        totalDelivered += it.deliveredQty;
      }
    }
    groups.push({ category, materials, totalOrdered, totalDelivered });
  }
  return groups;
}

function OrderLayout({ order, sequenceNumber }: { order: Order; sequenceNumber?: number }) {
  const groups = buildCategoryGroups(order.items ?? []);
  const grandOrdered = order.grandTotalOrdered ?? groups.reduce((s, g) => s + g.totalOrdered, 0);
  const grandDelivered = order.grandTotalDelivered ?? groups.reduce((s, g) => s + g.totalDelivered, 0);

  return (
    <div style={{ fontFamily: "Arial, Helvetica, sans-serif", color: "#1a1a2e", fontSize: "9px", padding: "6px 10px", maxWidth: "100%", background: "#fff" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1px" }}>
        <div style={{ flex: 1 }}>
          <h1 style={{ fontSize: "13px", fontWeight: 700, color: "#3b3d8e", margin: 0 }}>
            {order.partyName.toUpperCase()}
          </h1>
          <p style={{ fontSize: "8px", color: "#666", margin: "1px 0 0 0", lineHeight: 1.1 }}>{order.partyAddress}</p>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          {sequenceNumber != null && (
            <div style={{ fontSize: "22px", fontWeight: 800, color: "#1a1a2e", background: "#f0f0f0", borderRadius: "6px", padding: "2px 14px", lineHeight: 1.2, boxShadow: "0 1px 3px rgba(0,0,0,0.12)" }}>
              {sequenceNumber}
            </div>
          )}
          <div style={{ fontSize: "18px", fontWeight: 800, color: "#1a1a2e", border: "1.5px solid #1a1a2e", borderRadius: "3px", padding: "0 8px", lineHeight: 1.2 }}>
            {order.csvId}
          </div>
        </div>
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: "8px", color: "#555", marginBottom: "3px" }}>
        <span><b>Date:-</b> {formatDatePrint(order.orderDate)}</span>
        <span><b>Order ID:-</b> #{order.csvId}</span>
      </div>
      <hr style={{ border: "none", borderTop: "1px solid #bbb", margin: "0 0 3px 0" }} />

      {groups.map((group) => {
        const materialEntries = Array.from(group.materials.entries());
        return (
          <div key={group.category} style={{ marginBottom: "4px" }}>
            <p style={{ textAlign: "center", fontSize: "10px", fontWeight: 700, margin: "0 0 2px 0", borderBottom: "1px solid #ccc", paddingBottom: "1px" }}>
              {group.category}
            </p>
            <div style={{ display: "flex", gap: "4px", alignItems: "flex-start" }}>
              {materialEntries.map(([material, items]) => {
                const matOrdered = items.reduce((s, i) => s + i.orderedQty, 0);
                const matDelivered = items.reduce((s, i) => s + i.deliveredQty, 0);
                return (
                  <div key={material} style={{ flex: 1, border: "1px solid #ddd", borderRadius: "2px", padding: "2px 4px" }}>
                    <p style={{ fontSize: "8px", fontWeight: 700, margin: "0 0 1px 0", borderBottom: "1px dashed #ccc", paddingBottom: "1px" }}>
                      {material} :-
                    </p>
                    <table style={{ width: "100%", fontSize: "8.5px", borderCollapse: "collapse", lineHeight: 1.15 }}>
                      <tbody>
                        {items.map((item, idx) => (
                          <tr key={idx}>
                            <td style={{ padding: "0", width: "52%" }}>{item.color}</td>
                            <td style={{ padding: "0", textAlign: "right", width: "16%" }}>{item.orderedQty}</td>
                            <td style={{ padding: "0", textAlign: "center", width: "16%", color: "#888" }}>-&gt;</td>
                            <td style={{ padding: "0", textAlign: "right", width: "16%" }}>{item.deliveredQty}</td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot>
                        <tr style={{ borderTop: "1px solid #333", fontWeight: 700 }}>
                          <td style={{ padding: "1px 0 0" }}>TOTAL</td>
                          <td style={{ padding: "1px 0 0", textAlign: "right" }}>{matOrdered}</td>
                          <td style={{ padding: "1px 0 0", textAlign: "center", color: "#888" }}>-&gt;</td>
                          <td style={{ padding: "1px 0 0", textAlign: "right" }}>{matDelivered}</td>
                        </tr>
                        <tr>
                          <td colSpan={4} style={{ padding: "8px 0 1px", fontSize: "8px" }}>
                            <div style={{ display: "flex", alignItems: "baseline", gap: "2px" }}>
                              <span>Weight:</span>
                              <span style={{ flex: 1, borderBottom: "1px solid #333" }}>&nbsp;</span>
                            </div>
                          </td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                );
              })}
            </div>
            <div style={{ textAlign: "center", margin: "2px 0 0", padding: "1px 8px", border: "1px solid #333", borderRadius: "2px", fontSize: "8.5px", fontWeight: 700 }}>
              GRAND TOTAL&nbsp;&nbsp;{group.totalOrdered} -&gt; {group.totalDelivered}
            </div>
          </div>
        );
      })}

      {groups.length > 1 && (
        <div style={{ textAlign: "center", margin: "3px 0 4px", padding: "2px 8px", border: "1.5px solid #1a1a2e", borderRadius: "2px", fontSize: "9.5px", fontWeight: 800 }}>
          GRAND TOTAL&nbsp;&nbsp;{grandOrdered} -&gt; {grandDelivered}
        </div>
      )}

    </div>
  );
}

function PrintView({ order }: { order: Order }) {
  return <OrderLayout order={order} />;
}

export default function RunningOrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [routes, setRoutes] = useState<RouteDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabStatus>("Running");
  const [viewOrder, setViewOrder] = useState<Order | null>(null);
  const [printOrder, setPrintOrder] = useState<Order | null>(null);
  const [photoOrder, setPhotoOrder] = useState<Order | null>(null);
  const [photoSeqInput, setPhotoSeqInput] = useState("1");
  const [photoImageUrl, setPhotoImageUrl] = useState<string | null>(null);
  const [photoCapturing, setPhotoCapturing] = useState(false);
  const [cardTips, setCardTips] = useState<Record<string, string>>({});
  const printRef = useRef<HTMLDivElement>(null);
  const photoCaptureRef = useRef<HTMLDivElement>(null);

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

  const handlePrint = useCallback((order: Order) => {
    setPrintOrder(order);
    showCardTip(order.id, "Ready to print");
    setTimeout(() => window.print(), 150);
  }, [showCardTip]);

  const handlePhotoClick = useCallback((order: Order) => {
    setPhotoOrder(order);
    setPhotoSeqInput("1");
    setPhotoImageUrl(null);
    showCardTip(order.id, "Photo opened");
  }, [showCardTip]);

  const capturePhoto = useCallback(async () => {
    if (!photoCaptureRef.current || !photoOrder) return;
    setPhotoCapturing(true);
    try {
      const dataUrl = await toPng(photoCaptureRef.current, {
        pixelRatio: 3,
        backgroundColor: "#ffffff",
      });
      setPhotoImageUrl(dataUrl);
      showCardTip(photoOrder.id, "Ready to print");
    } catch {
      alert("Failed to capture image");
    }
    setPhotoCapturing(false);
  }, [photoOrder, showCardTip]);

  const downloadPhoto = useCallback(() => {
    if (!photoImageUrl || !photoOrder) return;
    const link = document.createElement("a");
    link.download = `order-${photoOrder.csvId}-seq${photoSeqInput}.png`;
    link.href = photoImageUrl;
    link.click();
  }, [photoImageUrl, photoOrder, photoSeqInput]);

  const shareToWhatsApp = useCallback(async () => {
    if (!photoImageUrl || !photoOrder) return;
    try {
      const blob = await (await fetch(photoImageUrl)).blob();
      await navigator.clipboard.write([
        new ClipboardItem({ "image/png": blob }),
      ]);
    } catch {
      downloadPhoto();
    }
    const text = encodeURIComponent(`Order #${photoOrder.csvId} - ${photoOrder.partyName} (Seq: ${photoSeqInput})`);
    window.open(`https://wa.me/919998478787?text=${text}`, "_blank");
  }, [photoImageUrl, photoOrder, photoSeqInput, downloadPhoto]);

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

  useEffect(() => {
    const onAfterPrint = () => {
      if (printOrder) {
        markOrderComplete(printOrder.id).then(() => {
          showCardTip(printOrder.id, "Marked as Complete");
        });
      }
      setPrintOrder(null);
    };
    window.addEventListener("afterprint", onAfterPrint);
    return () => window.removeEventListener("afterprint", onAfterPrint);
  }, [printOrder, showCardTip]);

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
        <div className="flex-1 overflow-y-auto min-h-0 px-3 sm:px-4 py-3">
          {Array.from(routeGroups.entries()).map(([route, routeOrders]) => (
            <div key={route} className="mb-4">
              <div className="flex items-center gap-2 mb-2">
                <MapPin className="w-3.5 h-3.5 text-crm-primary" strokeWidth={2} />
                <p className="text-[0.78rem] font-bold text-crm-text uppercase tracking-wide">
                  {route}
                </p>
                <span className="text-[0.64rem] font-semibold px-1.5 py-0.5 rounded-md bg-crm-primary-muted text-crm-primary">
                  {routeOrders.length}
                </span>
              </div>
              {routeOrders.length === 0 ? (
                <p className="text-[0.75rem] text-crm-text-muted ml-5">
                  No orders in this route
                </p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2.5">
                  {routeOrders.map((order) => {
                    const totalItems = order.items?.length ?? 0;
                    const totalQty = order.items?.reduce((s, i) => s + i.orderedQty, 0) ?? 0;
                    const deliveredQty = order.items?.reduce((s, i) => s + i.deliveredQty, 0) ?? 0;
                    return (
                      <div
                        key={order.id}
                        onClick={() => setViewOrder(order)}
                        className="bg-white rounded-xl border border-crm-border/60 p-3 cursor-pointer hover:border-crm-primary/40 hover:shadow-md transition-all group"
                      >
                        <div className="flex items-start justify-between mb-2">
                          <div className="min-w-0 flex-1">
                            <p className="text-[0.8rem] font-bold text-crm-text truncate">
                              {order.partyName}
                            </p>
                            <p className="text-[0.64rem] font-mono text-crm-border mt-0.5">
                              #{order.csvId}
                            </p>
                          </div>
                          <span className={`text-[0.6rem] font-bold px-1.5 py-0.5 rounded-md shrink-0 ml-2 ${
                            activeTab === "Running"
                              ? "bg-crm-primary-muted text-crm-primary"
                              : activeTab === "Complete"
                                ? "bg-emerald-50 text-emerald-600"
                                : "bg-orange-50 text-orange-500"
                          }`}>
                            {order.type}
                          </span>
                        </div>

                        <div className="flex items-center gap-1.5 text-[0.68rem] text-crm-text-muted mb-2.5">
                          <Calendar className="w-3 h-3 shrink-0" strokeWidth={1.8} />
                          <span>{formatDate(order.orderDate)}</span>
                        </div>

                        <div className="grid grid-cols-3 gap-1.5">
                          <div className="bg-crm-bg/50 rounded-lg px-2 py-1.5 text-center">
                            <p className="text-[0.88rem] font-bold text-crm-text tabular-nums leading-none">{totalItems}</p>
                            <p className="text-[0.56rem] text-crm-text-muted font-medium mt-0.5">Colors</p>
                          </div>
                          <div className="bg-crm-bg/50 rounded-lg px-2 py-1.5 text-center">
                            <p className="text-[0.88rem] font-bold text-crm-text tabular-nums leading-none">{totalQty}</p>
                            <p className="text-[0.56rem] text-crm-text-muted font-medium mt-0.5">Ordered</p>
                          </div>
                          <div className="bg-crm-bg/50 rounded-lg px-2 py-1.5 text-center">
                            <p className="text-[0.88rem] font-bold text-crm-text tabular-nums leading-none">{deliveredQty}</p>
                            <p className="text-[0.56rem] text-crm-text-muted font-medium mt-0.5">Delivered</p>
                          </div>
                        </div>

                        <div className="flex items-center gap-1 mt-2.5 pt-2 border-t border-crm-border/30">
                          <button
                            onClick={(e) => { e.stopPropagation(); handlePrint(order); }}
                            className="flex-1 flex items-center justify-center gap-1 py-1 rounded-md text-[0.64rem] font-medium text-crm-text-muted hover:text-crm-primary hover:bg-crm-primary-muted/50 transition-colors"
                          >
                            <Printer className="w-3 h-3" strokeWidth={1.8} />
                            Print
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); handlePhotoClick(order); }}
                            className="flex-1 flex items-center justify-center gap-1 py-1 rounded-md text-[0.64rem] font-medium text-crm-text-muted hover:text-crm-primary hover:bg-crm-primary-muted/50 transition-colors"
                          >
                            <Camera className="w-3 h-3" strokeWidth={1.8} />
                            Photo
                          </button>
                          <button
                            onClick={(e) => e.stopPropagation()}
                            className="flex-1 flex items-center justify-center gap-1 py-1 rounded-md text-[0.64rem] font-medium text-crm-text-muted hover:text-crm-primary hover:bg-crm-primary-muted/50 transition-colors"
                          >
                            <FileText className="w-3 h-3" strokeWidth={1.8} />
                            Bill
                          </button>
                        </div>

                        {cardTips[order.id] && (
                          <p className="text-[0.6rem] font-medium text-emerald-600 text-center mt-1 animate-pulse">
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

      {/* Print layout — hidden on screen, visible on print */}
      {printOrder && (
        <div ref={printRef} className="print-order-sheet">
          <style>{`
            @media print {
              body * { visibility: hidden !important; }
              .print-order-sheet, .print-order-sheet * { visibility: visible !important; }
              .print-order-sheet {
                position: fixed !important;
                top: 0; left: 0; right: 0; bottom: 0;
                z-index: 99999;
                background: #fff;
                padding: 0;
                margin: 0;
              }
              .no-print { display: none !important; }
              @page { size: A4; margin: 6mm 8mm; }
            }
            @media screen {
              .print-order-sheet { display: none; }
            }
          `}</style>
          <PrintView order={printOrder} />
        </div>
      )}

      {/* Photo modal */}
      {photoOrder && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-crm-sidebar/30 backdrop-blur-sm"
          onClick={() => { setPhotoOrder(null); setPhotoImageUrl(null); }}
        >
          <div
            className="bg-crm-card rounded-2xl shadow-xl w-full max-w-md mx-4 max-h-[90vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-5 pt-4 pb-3 border-b border-crm-border/50 shrink-0">
              <div>
                <h3 className="text-[0.92rem] font-bold text-crm-text">
                  Photo — #{photoOrder.csvId}
                </h3>
                <p className="text-[0.7rem] text-crm-text-muted mt-0.5">{photoOrder.partyName}</p>
              </div>
              <button
                onClick={() => { setPhotoOrder(null); setPhotoImageUrl(null); }}
                className="p-2 rounded-lg hover:bg-crm-primary-muted text-crm-text-muted hover:text-crm-text transition-colors"
              >
                <X className="w-4 h-4" strokeWidth={2} />
              </button>
            </div>

            <div className="px-5 py-4 overflow-y-auto flex-1 min-h-0">
              {!photoImageUrl ? (
                <div className="space-y-4">
                  <div>
                    <label className="block text-[0.72rem] font-semibold text-crm-text-muted uppercase tracking-wider mb-1.5">
                      Sequence Number
                    </label>
                    <input
                      type="number"
                      min={1}
                      value={photoSeqInput}
                      onChange={(e) => setPhotoSeqInput(e.target.value)}
                      className="w-full h-10 px-3 rounded-xl border border-crm-border text-[0.9rem] font-bold text-crm-text text-center focus:outline-none focus:ring-2 focus:ring-crm-primary/30 focus:border-crm-primary"
                    />
                  </div>

                  {/* Hidden capture area */}
                  <div style={{ position: "absolute", left: "-9999px", top: 0 }}>
                    <div ref={photoCaptureRef} style={{ width: "540px" }}>
                      <OrderLayout order={photoOrder} sequenceNumber={parseInt(photoSeqInput) || 1} />
                    </div>
                  </div>

                  <button
                    onClick={capturePhoto}
                    disabled={photoCapturing}
                    className="w-full h-10 rounded-xl bg-crm-primary text-white text-[0.82rem] font-semibold hover:bg-[#4845a2] transition-colors flex items-center justify-center gap-2 disabled:opacity-60"
                  >
                    {photoCapturing ? (
                      <Loader2 className="w-4 h-4 animate-spin" strokeWidth={2} />
                    ) : (
                      <Camera className="w-4 h-4" strokeWidth={2} />
                    )}
                    {photoCapturing ? "Capturing..." : "Generate Photo"}
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="rounded-xl border border-crm-border overflow-hidden">
                    <img
                      src={photoImageUrl}
                      alt={`Order #${photoOrder.csvId}`}
                      className="w-full"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={downloadPhoto}
                      className="h-9 rounded-xl border border-crm-border text-[0.78rem] font-semibold text-crm-text hover:bg-crm-primary-muted transition-colors flex items-center justify-center gap-1.5"
                    >
                      <Download className="w-3.5 h-3.5" strokeWidth={2} />
                      Download
                    </button>
                    <button
                      onClick={shareToWhatsApp}
                      className="h-9 rounded-xl bg-[#25D366] text-white text-[0.78rem] font-semibold hover:bg-[#1fb855] transition-colors flex items-center justify-center gap-1.5"
                    >
                      <Send className="w-3.5 h-3.5" strokeWidth={2} />
                      WhatsApp
                    </button>
                  </div>
                  <p className="text-[0.64rem] text-crm-text-muted text-center">
                    Image copied to clipboard — paste (Ctrl+V) in WhatsApp chat
                  </p>

                  <button
                    onClick={() => setPhotoImageUrl(null)}
                    className="w-full h-8 rounded-lg text-[0.72rem] font-medium text-crm-text-muted hover:text-crm-text hover:bg-crm-bg transition-colors"
                  >
                    Change sequence number
                  </button>
                </div>
              )}
            </div>
          </div>
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
