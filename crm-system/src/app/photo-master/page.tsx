"use client";

import { useState, useEffect, useMemo } from "react";
import { X, Loader2, ImageIcon, CheckCircle2, Clock } from "lucide-react";
import { subscribePhotos, markPhotoComplete } from "@/lib/photos";
import BillLayout from "@/components/BillLayout";
import { CATEGORY_COLORS } from "@/lib/colors";
import type { PhotoRecord } from "@/lib/types";

function getCategoryBadges(photo: PhotoRecord): { name: string; color: string }[] {
  const items = photo.orderSnapshot?.items;
  if (!items || items.length === 0) return [];
  const cats = new Set<string>();
  for (const item of items) {
    if (item.category) cats.add(item.category);
  }
  return Array.from(cats).map((c) => ({
    name: c,
    color: CATEGORY_COLORS[c] ?? "#888",
  }));
}

function formatGroupDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-IN", {
    weekday: "short",
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
}

type Tab = "all" | "pending" | "complete";

export default function PhotoMasterPage() {
  const [photos, setPhotos] = useState<PhotoRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<PhotoRecord | null>(null);
  const [tab, setTab] = useState<Tab>("pending");
  const [marking, setMarking] = useState(false);

  useEffect(() => {
    return subscribePhotos((loaded) => {
      setPhotos(loaded);
      setLoading(false);
    });
  }, []);

  const pendingPhotos = useMemo(() => photos.filter((p) => (p.status ?? "pending") === "pending"), [photos]);
  const completePhotos = useMemo(() => photos.filter((p) => p.status === "complete"), [photos]);
  const activePhotos = tab === "all" ? photos : tab === "pending" ? pendingPhotos : completePhotos;

  // Group by date, sorted newest first. Within each date, sort by sequence number ascending (1 to N).
  const grouped = useMemo(() => {
    // Sort by date desc first, then by sequence number asc within each date
    const sorted = [...activePhotos].sort((a, b) => {
      const dateA = new Date(a.capturedAt).setHours(0, 0, 0, 0);
      const dateB = new Date(b.capturedAt).setHours(0, 0, 0, 0);
      if (dateA !== dateB) return dateB - dateA; // newest date first
      return (a.sequenceNumber ?? 0) - (b.sequenceNumber ?? 0); // sequence asc within date
    });
    const map = new Map<string, PhotoRecord[]>();
    for (const p of sorted) {
      const key = formatGroupDate(p.capturedAt);
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(p);
    }
    return map;
  }, [activePhotos]);

  async function handleMarkComplete() {
    if (!selected || marking) return;
    setMarking(true);
    try {
      await markPhotoComplete(selected.id);
      setSelected(null);
    } finally {
      setMarking(false);
    }
  }

  const TABS: { key: Tab; label: string; count: number }[] = [
    { key: "pending", label: "Pending", count: pendingPhotos.length },
    { key: "complete", label: "Complete", count: completePhotos.length },
    { key: "all", label: "All", count: photos.length },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 text-crm-primary animate-spin" strokeWidth={1.8} />
          <p className="text-[0.85rem] text-crm-text-muted">Loading photos...</p>
        </div>
      </div>
    );
  }

  if (photos.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-3">
        <ImageIcon className="w-12 h-12 text-crm-text-muted/40" strokeWidth={1.2} />
        <p className="text-[0.92rem] font-medium text-crm-text-muted">No photos yet</p>
        <p className="text-[0.78rem] text-crm-text-muted/70">Photos are automatically captured when you print an order</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col flex-1" style={{ padding: "0 15px 15px" }}>
      {/* Tabs */}
      <div style={{ display: "flex", gap: "0", margin: "10px 0 4px", borderBottom: "2px solid #e5e7eb" }}>
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            style={{
              padding: "8px 20px",
              fontSize: "13px",
              fontWeight: tab === t.key ? 700 : 500,
              color: tab === t.key ? "#1460BD" : "#888",
              background: "none",
              border: "none",
              borderBottom: tab === t.key ? "2px solid #1460BD" : "2px solid transparent",
              marginBottom: "-2px",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "6px",
              transition: "0.2s",
            }}
          >
            {t.label}
            <span style={{
              fontSize: "11px",
              fontWeight: 600,
              color: tab === t.key ? "#fff" : "#888",
              background: tab === t.key ? "#1460BD" : "#e5e7eb",
              borderRadius: "10px",
              padding: "0 7px",
              lineHeight: "1.7",
            }}>
              {t.count}
            </span>
          </button>
        ))}
      </div>

      {activePhotos.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 gap-2">
          <ImageIcon className="w-10 h-10 text-crm-text-muted/30" strokeWidth={1.2} />
          <p className="text-[0.85rem] text-crm-text-muted">
            No {tab === "all" ? "" : tab === "pending" ? "pending " : "completed "}photos
          </p>
        </div>
      ) : (
        Array.from(grouped.entries()).map(([date, datePhotos]) => (
          <div key={date} style={{ marginBottom: "20px" }}>
            <h3 style={{
              fontSize: "15px",
              fontWeight: 600,
              color: "#444",
              margin: "12px 0 8px",
              display: "flex",
              alignItems: "center",
              gap: "8px",
            }}>
              {date}
              <span style={{
                fontSize: "11px",
                fontWeight: 600,
                color: "#fff",
                background: "#1460BD",
                borderRadius: "10px",
                padding: "1px 8px",
              }}>
                {datePhotos.length}
              </span>
            </h3>

            <div className="grid grid-cols-2 xs:grid-cols-3 sm:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2.5">
              {datePhotos.map((photo) => {
                const isPending = (photo.status ?? "pending") === "pending";
                const totalDelivered = photo.orderSnapshot?.grandTotalDelivered ?? photo.orderSnapshot?.items?.reduce((s, i) => s + i.deliveredQty, 0) ?? 0;
                return (
                  <div
                    key={photo.id}
                    onClick={() => setSelected(photo)}
                    style={{
                      background: "#fff",
                      borderRadius: "12px",
                      boxShadow: "0px 1px 4px 0px rgba(0,0,0,0.12)",
                      overflow: "hidden",
                      cursor: "pointer",
                      transition: "0.2s",
                      display: "flex",
                      flexDirection: "column",
                      borderLeft: isPending ? "3px solid #f59e0b" : "3px solid #10b981",
                    }}
                    className="hover:shadow-md"
                  >
                    {/* Seq + Party */}
                    <div style={{ display: "flex", alignItems: "center", gap: "8px", padding: "8px 10px 4px" }}>
                      <span style={{
                        fontSize: "24px",
                        fontWeight: 800,
                        color: "#1a1a2e",
                        background: "#f0f0f0",
                        borderRadius: "8px",
                        padding: "2px 10px",
                        lineHeight: 1.2,
                        flexShrink: 0,
                      }}>
                        {photo.sequenceNumber}
                      </span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{
                          fontSize: "12px",
                          fontWeight: 700,
                          color: "#1460BD",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}>
                          {photo.partyName.toUpperCase()}
                        </div>
                        <span style={{ fontSize: "11px", color: "#8D9293", fontWeight: 500 }}>
                          #{photo.orderCsvId}
                        </span>
                      </div>
                    </div>

                    {/* Time */}
                    <div style={{ display: "flex", alignItems: "center", gap: "4px", padding: "2px 10px 4px" }}>
                      <Clock style={{ width: "11px", height: "11px", color: "#9CA3AF" }} strokeWidth={2} />
                      <span style={{ fontSize: "11px", fontWeight: 600, color: "#6B7280" }}>
                        {formatTime(photo.capturedAt)}
                      </span>
                      <span style={{
                        marginLeft: "auto",
                        fontSize: "10px",
                        fontWeight: 700,
                        color: "#1460BD",
                        background: "#e8f0fe",
                        borderRadius: "4px",
                        padding: "1px 5px",
                      }}>
                        {totalDelivered}
                      </span>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: "4px", padding: "0 10px 4px" }}>
                      <span style={{
                        fontSize: "9px",
                        fontWeight: 700,
                        color: isPending ? "#f59e0b" : "#10b981",
                        background: isPending ? "#fef3c7" : "#d1fae5",
                        borderRadius: "4px",
                        padding: "1px 5px",
                      }}>
                        {isPending ? "PENDING" : "DONE"}
                      </span>
                    </div>

                    {/* Category badges */}
                    <div style={{ display: "flex", gap: "4px", flexWrap: "wrap", padding: "0 10px 8px" }}>
                      {getCategoryBadges(photo).map((b) => (
                        <span
                          key={b.name}
                          style={{
                            fontSize: "9px",
                            fontWeight: 600,
                            color: "#fff",
                            background: b.color,
                            borderRadius: "3px",
                            padding: "1px 5px",
                            lineHeight: "1.5",
                          }}
                        >
                          {b.name}
                        </span>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))
      )}

      {selected && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-crm-sidebar/30 backdrop-blur-sm"
          onClick={() => setSelected(null)}
        >
          <div
            className="bg-crm-card rounded-2xl shadow-xl w-full max-w-lg mx-4 max-h-[90vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-5 pt-4 pb-3 border-b border-crm-border/50 shrink-0">
              <div>
                <h3 className="text-[0.92rem] font-bold text-crm-text">
                  {selected.partyName}
                </h3>
                <p className="text-[0.7rem] text-crm-text-muted mt-0.5">
                  #{selected.orderCsvId} &middot; Seq {selected.sequenceNumber} &middot; {formatGroupDate(selected.capturedAt)} at {formatTime(selected.capturedAt)}
                </p>
              </div>
              <button
                onClick={() => setSelected(null)}
                className="p-2 rounded-lg hover:bg-crm-primary-muted text-crm-text-muted hover:text-crm-text transition-colors"
              >
                <X className="w-4 h-4" strokeWidth={2} />
              </button>
            </div>

            <div className="px-5 py-4 overflow-y-auto flex-1 min-h-0">
              <div className="rounded-xl border border-crm-border overflow-hidden bg-white">
                <BillLayout order={selected.orderSnapshot} sequenceNumber={selected.sequenceNumber} />
              </div>
            </div>

            {(selected.status ?? "pending") === "pending" && (
              <div className="px-5 pb-4 pt-2 shrink-0 border-t border-crm-border/50">
                <button
                  onClick={handleMarkComplete}
                  disabled={marking}
                  style={{
                    width: "100%",
                    padding: "10px 0",
                    fontSize: "14px",
                    fontWeight: 700,
                    color: "#fff",
                    background: marking ? "#93c5fd" : "#1460BD",
                    border: "none",
                    borderRadius: "10px",
                    cursor: marking ? "not-allowed" : "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "8px",
                    transition: "0.2s",
                  }}
                >
                  {marking ? (
                    <Loader2 className="w-4 h-4 animate-spin" strokeWidth={2} />
                  ) : (
                    <CheckCircle2 className="w-4 h-4" strokeWidth={2} />
                  )}
                  {marking ? "Marking..." : "Mark Complete"}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
