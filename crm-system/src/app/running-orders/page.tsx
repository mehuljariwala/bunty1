"use client";

import { useState, useMemo, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import {
  Plus,
  X,
  Printer,


  Loader2,
  Camera,
  FileText,
  Download,
  Send,
  Pencil,
} from "lucide-react";
import { toPng } from "html-to-image";
import { subscribeOrders, markOrderComplete, getNextSeqNumber, subscribeSeqCounter } from "@/lib/orders";
import { subscribeRoutes } from "@/lib/routes";
import BillLayout from "@/components/BillLayout";
import type { Order, RouteDoc } from "@/lib/types";

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
  const [seqCounter, setSeqCounter] = useState(0);
  const [printSeq, setPrintSeq] = useState<number | null>(null);
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

  const handlePrint = useCallback(async (order: Order) => {
    let seq = seqCounter + 1;
    try { seq = await getNextSeqNumber(); } catch { /* use local fallback */ }
    setPrintSeq(seq);
    setPrintOrder(order);
    const originalTitle = document.title;
    document.title = `${order.partyName}_${formatDatePrint(order.orderDate)}`;
    showCardTip(order.id, `Seq #${seq} — Ready to print`);
    setTimeout(() => {
      window.print();
      setTimeout(() => { document.title = originalTitle; }, 3000);
    }, 150);
  }, [showCardTip, seqCounter]);

  const handlePhotoClick = useCallback(async (order: Order) => {
    let seq = seqCounter + 1;
    try { seq = await getNextSeqNumber(); } catch { /* use local fallback */ }
    setPhotoOrder(order);
    setPhotoSeqInput(String(seq));
    setPhotoImageUrl(null);
    showCardTip(order.id, `Seq #${seq} — Photo opened`);
  }, [showCardTip, seqCounter]);

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
    const unsubSeq = subscribeSeqCounter((counter) => {
      setSeqCounter(counter);
    });
    return () => {
      unsubOrders();
      unsubRoutes();
      unsubSeq();
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
      setPrintSeq(null);
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

  const tabCounts = useMemo(() => {
    const counts: Record<TabStatus, number> = { Running: 0, Pending: 0, Complete: 0 };
    for (const o of orders) {
      if (o.type === "Running") counts.Running++;
      if (hasPendingItems(o) && o.orderDate >= oneWeekAgo) counts.Pending++;
      if (o.type === "Complete" && o.orderDate >= oneWeekAgo) counts.Complete++;
    }
    return counts;
  }, [orders, oneWeekAgo]);

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
    <div className="h-[calc(100vh-7rem)] flex flex-col" style={{ fontFamily: "'Poppins', sans-serif" }}>
      <div className="overflow-hidden flex flex-col flex-1 min-h-0" style={{ background: "#EBEEF4" }}>
        {/* Tabs */}
        <div className="flex justify-around shrink-0" style={{ borderBottom: "1px solid #DDDDDD", marginBottom: "15px" }}>
          {ALL_STATUSES.map((s) => {
            const active = activeTab === s;
            return (
              <button
                key={s}
                onClick={() => setActiveTab(s)}
                className="uppercase transition-all"
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

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto min-h-0" style={{ padding: "0 15px 15px" }}>
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
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6" style={{ gap: "12px 38px", padding: "4px 4px 0" }}>
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
                        <div style={{
                          position: "absolute",
                          top: "50%",
                          left: "100%",
                          transform: "translateY(-50%)",
                          marginLeft: "1px",
                          minWidth: "24px",
                          height: "24px",
                          display: "flex",
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
                            <span style={{ fontSize: "11px", fontWeight: 600, color: "#444", background: "#f0f0f0", borderRadius: "4px", padding: "1px 6px", marginLeft: "6px", flexShrink: 0 }}>
                              #{order.csvId}
                            </span>
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
                            onClick={(e) => { e.stopPropagation(); handlePhotoClick(order); }}
                            style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: "4px", padding: "7px 0", fontSize: "11.5px", fontWeight: 500, color: "#8D9293", background: "none", border: "none", cursor: "pointer", transition: "0.2s" }}
                            className="hover:!text-[#1460BD] hover:!bg-[#f7f7f7]"
                          >
                            <Camera className="w-3 h-3" strokeWidth={1.8} />
                            Photo
                          </button>
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
                      <span className="ml-2 normal-case tracking-normal font-normal text-[0.68rem] text-crm-text-muted/70">
                        (Today&apos;s count: {seqCounter})
                      </span>
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
                      <BillLayout order={photoOrder} sequenceNumber={parseInt(photoSeqInput) || 1} />
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
