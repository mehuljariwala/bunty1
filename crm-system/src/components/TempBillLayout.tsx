"use client";

import type { Order, OrderItem } from "@/lib/types";

interface CategoryGroup {
  category: string;
  materials: { material: string; items: OrderItem[]; totalOrdered: number; totalDelivered: number }[];
  totalOrdered: number;
  totalDelivered: number;
}

const CATEGORY_COLORS: Record<string, string> = {
  "3 Tar": "#f5956b",
  "5 Tar": "#5b5fc7",
  "3 Tar Bullet": "#f5956b",
  "5 Tar Bullet": "#5b5fc7",
  "Yarn": "#36b49f",
  "3 Tar Button": "#e8b838",
  "5 Tar Button": "#9b59b6",
  "6 Tar Button": "#3498db",
};

const SUB_CAT_ORDER = ["Celtionic", "Litchy", "Polyester", "Multy", "Rani multy"];

function groupItems(items: OrderItem[]): CategoryGroup[] {
  const catMap = new Map<string, Map<string, OrderItem[]>>();
  for (const item of items) {
    if (!catMap.has(item.category)) catMap.set(item.category, new Map());
    const matMap = catMap.get(item.category)!;
    if (!matMap.has(item.material)) matMap.set(item.material, []);
    matMap.get(item.material)!.push(item);
  }
  return Array.from(catMap.entries()).map(([category, matMap]) => {
    const sortedEntries: [string, OrderItem[]][] = [];
    for (const sub of SUB_CAT_ORDER) {
      if (matMap.has(sub)) { sortedEntries.push([sub, matMap.get(sub)!]); matMap.delete(sub); }
    }
    for (const [sub, items] of matMap) sortedEntries.push([sub, items]);
    const materials = sortedEntries.map(([material, items]) => ({
      material, items,
      totalOrdered: items.reduce((s, i) => s + i.orderedQty, 0),
      totalDelivered: items.reduce((s, i) => s + i.deliveredQty, 0),
    }));
    return {
      category, materials,
      totalOrdered: materials.reduce((s, m) => s + m.totalOrdered, 0),
      totalDelivered: materials.reduce((s, m) => s + m.totalDelivered, 0),
    };
  });
}

interface TempBillLayoutProps {
  order: Order;
  weights?: Record<string, string>;
  onWeightChange?: (key: string, value: string) => void;
  bagSummary?: string;
  onBagClick?: () => void;
}

export default function TempBillLayout({ order, weights, onWeightChange, bagSummary, onBagClick }: TempBillLayoutProps) {
  const groups = groupItems(order.items ?? []);
  const grandOrdered = order.grandTotalOrdered ?? groups.reduce((s, g) => s + g.totalOrdered, 0);
  const grandDelivered = order.grandTotalDelivered ?? groups.reduce((s, g) => s + g.totalDelivered, 0);

  return (
    <div className="text-xs leading-snug">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="min-w-0">
          <h2 className="text-base font-bold text-crm-primary truncate">{order.partyName}</h2>
          {order.partyAddress && <p className="text-[11px] text-crm-text-muted truncate">{order.partyAddress}</p>}
        </div>
        <span className="text-[11px] font-bold text-crm-text bg-crm-bg px-2 py-0.5 rounded shrink-0 tabular-nums">#{order.csvId}</span>
      </div>

      {/* Categories */}
      {groups.map((group) => {
        const catColor = CATEGORY_COLORS[group.category] ?? "#5b5fc7";
        return (
          <div key={group.category} className="mb-3">
            <div className="text-center py-1 rounded text-[11px] font-bold uppercase tracking-wide text-white mb-1.5" style={{ backgroundColor: catColor }}>
              {group.category}
            </div>

            <div className="grid grid-cols-2 gap-x-3 gap-y-2">
              {group.materials.map((mat) => {
                const wtKey = `${group.category}||${mat.material}`;
                return (
                  <div key={mat.material}>
                    <p className="text-[11px] font-bold text-crm-text mb-0.5">{mat.material} :-</p>
                    {mat.items.map((item, idx) => (
                      <div key={idx} className="flex justify-between px-0.5 py-[1px]">
                        <span className="truncate">{item.color}</span>
                        <span className="tabular-nums shrink-0 ml-1">{item.orderedQty} → {item.deliveredQty}</span>
                      </div>
                    ))}
                    <div className="flex justify-between font-bold border-t border-black/20 mt-1 pt-1 px-0.5">
                      <span>TOTAL</span>
                      <span className="tabular-nums">{mat.totalOrdered} → {mat.totalDelivered}</span>
                    </div>
                    {onWeightChange ? (
                      <div className="flex items-center gap-1.5 mt-1">
                        <span className="text-[10px] font-semibold text-crm-text-muted">Wt:</span>
                        <input
                          type="text"
                          placeholder="0.000"
                          value={weights?.[wtKey] ?? ""}
                          onChange={(e) => onWeightChange(wtKey, e.target.value)}
                          className="flex-1 h-6 px-1.5 rounded border border-crm-primary/40 bg-blue-50/50 text-[11px] font-semibold text-crm-primary placeholder:text-crm-border focus:outline-none focus:border-crm-primary tabular-nums"
                        />
                      </div>
                    ) : null}
                  </div>
                );
              })}
            </div>

            <div className="text-center text-[11px] font-bold mt-1.5 py-1 rounded" style={{ color: catColor, backgroundColor: `${catColor}10` }}>
              TOTAL {group.totalOrdered} → {group.totalDelivered}
            </div>
          </div>
        );
      })}

      {/* Grand total */}
      {groups.length > 1 && (
        <div className="text-center py-2 rounded-lg bg-crm-sidebar text-white text-sm font-bold mt-2">
          GRAND TOTAL&nbsp;&nbsp;{grandOrdered} → {grandDelivered}
        </div>
      )}

      {/* BAG */}
      <div className="flex justify-center mt-3">
        {onBagClick ? (
          <button type="button" onClick={onBagClick}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg border border-crm-primary/30 text-crm-primary text-xs font-bold hover:bg-crm-primary-muted transition-all">
            BAG {bagSummary ? <span className="bg-crm-primary text-white px-1.5 py-0.5 rounded text-[10px]">{bagSummary}</span> : "(—)"}
            <span className="text-[10px] opacity-50">✎</span>
          </button>
        ) : (
          <div className="text-xs font-bold text-crm-text">BAG ({bagSummary || "—"})</div>
        )}
      </div>
    </div>
  );
}
