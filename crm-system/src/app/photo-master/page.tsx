"use client";

import { useState, useEffect, useMemo } from "react";
import { X, Download, Loader2, ImageIcon } from "lucide-react";
import { subscribePhotos } from "@/lib/photos";
import type { PhotoRecord } from "@/lib/types";

function formatGroupDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export default function PhotoMasterPage() {
  const [photos, setPhotos] = useState<PhotoRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<PhotoRecord | null>(null);

  useEffect(() => {
    return subscribePhotos((loaded) => {
      setPhotos(loaded);
      setLoading(false);
    });
  }, []);

  const grouped = useMemo(() => {
    const map = new Map<string, PhotoRecord[]>();
    for (const p of photos) {
      const key = formatGroupDate(p.capturedAt);
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(p);
    }
    return map;
  }, [photos]);

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
      {Array.from(grouped.entries()).map(([date, datePhotos]) => (
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

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
            {datePhotos.map((photo) => (
              <div
                key={photo.id}
                onClick={() => setSelected(photo)}
                style={{
                  background: "#fff",
                  borderRadius: "15px",
                  boxShadow: "0px 1px 4px 0px rgba(0,0,0,0.14)",
                  overflow: "hidden",
                  cursor: "pointer",
                  transition: "0.2s",
                }}
                className="hover:shadow-md"
              >
                <div style={{ width: "100%", aspectRatio: "3/4", overflow: "hidden", background: "#f7f7f7" }}>
                  <img
                    src={photo.imageUrl}
                    alt={`${photo.partyName} #${photo.orderCsvId}`}
                    style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "top" }}
                    loading="lazy"
                  />
                </div>
                <div style={{ padding: "8px 10px" }}>
                  <div style={{
                    fontSize: "12.5px",
                    fontWeight: 600,
                    color: "#1460BD",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}>
                    {photo.partyName.toUpperCase()}
                  </div>
                  <div style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginTop: "3px",
                  }}>
                    <span style={{ fontSize: "11px", color: "#8D9293", fontWeight: 500 }}>
                      #{photo.orderCsvId}
                    </span>
                    <span style={{
                      fontSize: "13px",
                      fontWeight: 800,
                      color: "#1a1a2e",
                      background: "#f0f0f0",
                      borderRadius: "4px",
                      padding: "0 6px",
                      lineHeight: "1.6",
                    }}>
                      {photo.sequenceNumber}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}

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
                  #{selected.orderCsvId} &middot; Seq {selected.sequenceNumber} &middot; {formatGroupDate(selected.capturedAt)}
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
              <div className="rounded-xl border border-crm-border overflow-hidden">
                <img
                  src={selected.imageUrl}
                  alt={`${selected.partyName} #${selected.orderCsvId}`}
                  className="w-full"
                />
              </div>

              <a
                href={selected.imageUrl}
                download={`order-${selected.orderCsvId}-seq${selected.sequenceNumber}.png`}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-3 w-full h-10 rounded-xl border border-crm-border text-[0.82rem] font-semibold text-crm-text hover:bg-crm-primary-muted transition-colors flex items-center justify-center gap-2"
              >
                <Download className="w-4 h-4" strokeWidth={2} />
                Download
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
