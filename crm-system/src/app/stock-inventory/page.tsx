"use client";

import { useState, useMemo, useRef, useEffect, useCallback } from "react";
import {
  Package,
  Search,
  Plus,
  Minus,
  Loader2,
  Save,
  X,
  Check,
  ArrowRight,
} from "lucide-react";
import { subscribeColors, updateColor } from "@/lib/colors";
import { useTracker } from "@/lib/activity-tracker-context";
import type { Color } from "@/lib/types";

interface StockItem {
  id: string;
  name: string;
  hex: string;
  category: string;
  currentStock: number;
  minStock: number;
  maxStock: number;
}

interface PendingChange {
  original: number;
  updated: number;
  name: string;
  hex: string;
  category: string;
}

const LIGHT_HEXES = new Set([
  "#ffffff", "#fffdd0", "#fff700", "#f1f359", "#fff04d",
  "#ffb6c1", "#68ffd1", "#00ffff", "#9ecc1f", "#6cf205",
]);

function isLight(hex: string): boolean {
  if (LIGHT_HEXES.has(hex)) return true;
  const c = hex.replace("#", "");
  if (c.length !== 6) return false;
  const r = parseInt(c.slice(0, 2), 16);
  const g = parseInt(c.slice(2, 4), 16);
  const b = parseInt(c.slice(4, 6), 16);
  return (r * 299 + g * 587 + b * 114) / 1000 > 200;
}

function stockPct(current: number, max: number): number {
  if (max <= 0) return 0;
  return Math.max(0, Math.min(100, (current / max) * 100));
}

function barColor(current: number, min: number, max: number): string {
  if (current < 0) return "bg-red-400 animate-pulse";
  if (current === 0) return "bg-slate-300";
  if (current >= max) return "bg-emerald-400";
  if (current <= min) return "bg-amber-400";
  return "bg-blue-400";
}

function stockValueColor(current: number, min: number): string {
  if (current < 0) return "text-red-500";
  if (current === 0) return "text-crm-text-muted";
  if (current <= min) return "text-amber-500";
  return "text-crm-text";
}

function colorToStockItem(color: Color): StockItem {
  return {
    id: color.id,
    name: color.name,
    hex: color.hex,
    category: color.category,
    currentStock: color.currentStock,
    minStock: color.minStock,
    maxStock: color.maxStock,
  };
}

function SummaryModal({
  changes,
  categories,
  onClose,
  onSave,
  saving,
}: {
  changes: Map<string, PendingChange>;
  categories: string[];
  onClose: () => void;
  onSave: () => void;
  saving: boolean;
}) {
  const grouped = useMemo(() => {
    const map = new Map<string, { id: string; change: PendingChange }[]>();
    for (const cat of categories) map.set(cat, []);
    changes.forEach((change, id) => {
      const list = map.get(change.category) ?? [];
      list.push({ id, change });
      map.set(change.category, list);
    });
    return map;
  }, [changes, categories]);

  const totalChanges = changes.size;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-crm-sidebar/30 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-crm-card rounded-2xl card-shadow w-full max-w-lg mx-4 max-h-[85vh] flex flex-col animate-[fadeIn_150ms_ease-out]">
        <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-crm-border/50 shrink-0">
          <div>
            <h3 className="text-[1.05rem] font-bold text-crm-text">
              Stock Update Summary
            </h3>
            <p className="text-[0.78rem] text-crm-text-muted mt-0.5">
              {totalChanges} colour{totalChanges !== 1 && "s"} modified
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-crm-primary-muted text-crm-text-muted hover:text-crm-text transition-colors"
          >
            <X className="w-4.5 h-4.5" strokeWidth={1.8} />
          </button>
        </div>

        <div className="overflow-y-auto flex-1 px-6 py-4 space-y-4">
          {Array.from(grouped.entries()).map(([cat, items]) => {
            if (items.length === 0) return null;
            return (
              <div key={cat}>
                <p className="text-[0.72rem] font-bold uppercase tracking-widest text-crm-primary mb-2">
                  {cat}
                  <span className="ml-1.5 text-crm-text-muted font-semibold">
                    ({items.length})
                  </span>
                </p>
                <div className="rounded-xl border border-crm-border overflow-hidden">
                  <div className="grid grid-cols-[1fr_80px_24px_80px] gap-0 px-4 py-2 bg-crm-bg/40 border-b border-crm-border">
                    <span className="text-[0.68rem] font-semibold uppercase tracking-widest text-crm-text-muted">Colour</span>
                    <span className="text-[0.68rem] font-semibold uppercase tracking-widest text-crm-text-muted text-right">Current</span>
                    <span />
                    <span className="text-[0.68rem] font-semibold uppercase tracking-widest text-crm-text-muted text-right">New</span>
                  </div>
                  {items.map(({ id, change }, idx) => {
                    const diff = change.updated - change.original;
                    return (
                      <div
                        key={id}
                        className={`grid grid-cols-[1fr_80px_24px_80px] gap-0 px-4 py-2.5 items-center ${
                          idx % 2 === 1 ? "bg-crm-bg/20" : ""
                        }`}
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <div
                            className={`w-5 h-5 rounded shrink-0 ${isLight(change.hex) ? "border border-crm-border" : ""}`}
                            style={{ backgroundColor: change.hex }}
                          />
                          <span className="text-[0.82rem] font-medium text-crm-text truncate">
                            {change.name}
                          </span>
                        </div>
                        <span className="text-[0.84rem] font-semibold text-crm-text-muted tabular-nums text-right">
                          {change.original}
                        </span>
                        <div className="flex justify-center">
                          <ArrowRight className="w-3.5 h-3.5 text-crm-border" strokeWidth={2} />
                        </div>
                        <div className="flex items-center justify-end gap-1.5">
                          <span className={`text-[0.84rem] font-bold tabular-nums ${
                            change.updated < 0 ? "text-red-500" : "text-crm-text"
                          }`}>
                            {change.updated}
                          </span>
                          <span className={`text-[0.68rem] font-bold tabular-nums ${
                            diff > 0 ? "text-emerald-500" : "text-red-500"
                          }`}>
                            {diff > 0 ? `+${diff}` : diff}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        <div className="px-6 py-4 border-t border-crm-border/50 shrink-0">
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={onClose}
              disabled={saving}
              className="h-11 rounded-xl border border-crm-border text-[0.82rem] font-semibold text-crm-text-muted hover:bg-crm-primary-muted transition-colors disabled:opacity-40"
            >
              Cancel
            </button>
            <button
              onClick={onSave}
              disabled={saving}
              className="flex items-center justify-center gap-2 h-11 rounded-xl bg-crm-primary text-white text-[0.82rem] font-semibold hover:bg-[#4845a2] transition-colors shadow-sm disabled:opacity-60"
            >
              {saving ? (
                <Loader2 className="w-4 h-4 animate-spin" strokeWidth={2} />
              ) : (
                <Save className="w-4 h-4" strokeWidth={2} />
              )}
              {saving ? "Saving..." : "Save & Update Stock"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function StockInventoryPage(): React.JSX.Element {
  const { trackStockUpdate } = useTracker();
  const [dbStock, setDbStock] = useState<StockItem[]>([]);
  const [localStock, setLocalStock] = useState<StockItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<string>("");
  const [search, setSearch] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState<string>("");
  const [highlightKey, setHighlightKey] = useState<string | null>(null);
  const [pendingChanges, setPendingChanges] = useState<Map<string, PendingChange>>(new Map());
  const [summaryOpen, setSummaryOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savedCount, setSavedCount] = useState<number | null>(null);
  const [lastTouchedId, setLastTouchedId] = useState<string | null>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const unsubscribe = subscribeColors((colors) => {
      const items = colors.map(colorToStockItem);
      setDbStock(items);
      setLocalStock((prev) => {
        if (prev.length === 0) return items;
        const pendingIds = new Set<string>();
        setPendingChanges((pc) => { pc.forEach((_, id) => pendingIds.add(id)); return pc; });
        return items.map((item) => {
          if (pendingIds.has(item.id)) {
            const existing = prev.find((p) => p.id === item.id);
            if (existing) return { ...item, currentStock: existing.currentStock };
          }
          return item;
        });
      });
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  const categories = useMemo(
    () => [...new Set(localStock.map((s) => s.category))].sort(),
    [localStock]
  );

  useEffect(() => {
    if (!activeTab && categories.length > 0) {
      setActiveTab(categories[0]);
    }
  }, [categories, activeTab]);

  function getDelta(id: string): number {
    const change = pendingChanges.get(id);
    return change ? change.updated - change.original : 0;
  }

  function startEdit(id: string) {
    setEditingId(id);
    setEditValue(String(getDelta(id)));
  }

  function commitEdit(id: string) {
    const val = parseInt(editValue);
    if (!isNaN(val)) {
      const currentDelta = getDelta(id);
      const diff = val - currentDelta;
      if (diff !== 0) adjustStock(id, diff);
    }
    setEditingId(null);
    setEditValue("");
  }

  function adjustStock(id: string, amount: number) {
    const item = localStock.find((s) => s.id === id);
    const dbItem = dbStock.find((s) => s.id === id);
    if (!item || !dbItem) return;

    const newStock = item.currentStock + amount;
    setLastTouchedId(id);

    setLocalStock((prev) =>
      prev.map((s) => (s.id === id ? { ...s, currentStock: newStock } : s))
    );

    setPendingChanges((prev) => {
      const next = new Map(prev);
      if (newStock === dbItem.currentStock) {
        next.delete(id);
      } else {
        next.set(id, {
          original: dbItem.currentStock,
          updated: newStock,
          name: item.name,
          hex: item.hex,
          category: item.category,
        });
      }
      return next;
    });
  }

  function discardChanges() {
    setLocalStock(dbStock.map((item) => ({ ...item })));
    setPendingChanges(new Map());
    setEditingId(null);
    setEditValue("");
    setLastTouchedId(null);
  }

  async function saveAllChanges(): Promise<void> {
    setSaving(true);
    const entries = Array.from(pendingChanges.entries());

    const results = await Promise.all(
      entries.map(async ([id, change]) => {
        try {
          await updateColor(id, { currentStock: change.updated });
          return true;
        } catch {
          return false;
        }
      })
    );

    const successCount = results.filter(Boolean).length;

    if (successCount > 0) {
      const changes = entries.map(([, change]) => ({
        colorName: change.name,
        category: change.category,
        previousStock: change.original,
        newStock: change.updated,
      }));
      trackStockUpdate({ changes, totalUpdated: successCount });
    }

    setPendingChanges(new Map());
    setLastTouchedId(null);
    setSummaryOpen(false);
    setSaving(false);
    setSavedCount(successCount);
    setTimeout(() => setSavedCount(null), 2500);
  }

  const handleItemHighlight = useCallback((item: StockItem) => {
    setActiveTab(item.category);
    setSearch("");
    setHighlightKey(item.id);

    setTimeout(() => {
      const el = contentRef.current?.querySelector(
        `[data-stock-key="${CSS.escape(item.id)}"]`
      );
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    }, 100);

    setTimeout(() => setHighlightKey(null), 3000);
  }, []);

  const tabItems = useMemo(() => {
    const q = search.toLowerCase();
    return localStock.filter(
      (i) => i.category === activeTab && (!q || i.name.toLowerCase().includes(q))
    );
  }, [localStock, activeTab, search]);

  const tabTotals = useMemo(() => {
    const result: Record<string, { total: number; deficit: number }> = {};
    for (const cat of categories) {
      const items = localStock.filter((i) => i.category === cat);
      result[cat] = {
        total: items.reduce((s, i) => s + i.currentStock, 0),
        deficit: items.filter((i) => i.currentStock < 0).length,
      };
    }
    return result;
  }, [localStock, categories]);

  const changeCount = pendingChanges.size;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 text-crm-primary animate-spin" strokeWidth={1.8} />
          <p className="text-[0.85rem] text-crm-text-muted">Loading inventory...</p>
        </div>
      </div>
    );
  }

  if (localStock.length === 0) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="flex flex-col items-center gap-3">
          <Package className="w-10 h-10 text-crm-border" strokeWidth={1.5} />
          <p className="text-[0.9rem] text-crm-text-muted">No colors in inventory</p>
          <p className="text-[0.78rem] text-crm-border">Add colors in Color Master first</p>
        </div>
      </div>
    );
  }

  return (
    <div ref={contentRef} className="flex flex-col flex-1">
      <div className="flex flex-col flex-1">

        {/* Top bar: Save button when changes exist */}
        {changeCount > 0 && (
          <div className="sticky top-0 z-20 flex items-center justify-between gap-3 px-4 sm:px-5 py-3 bg-crm-primary-muted/80 backdrop-blur-sm border-b border-crm-border/40 animate-[fadeIn_150ms_ease-out]">
            <p className="text-[0.82rem] font-medium text-crm-text">
              <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-crm-primary text-white text-[0.68rem] font-bold mr-2">
                {changeCount}
              </span>
              unsaved change{changeCount !== 1 && "s"}
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={discardChanges}
                className="flex items-center gap-1.5 h-8 px-3 rounded-lg border border-crm-border text-[0.78rem] font-medium text-crm-text-muted hover:bg-crm-card transition-colors"
              >
                <X className="w-3.5 h-3.5" strokeWidth={2} />
                Discard
              </button>
              <button
                onClick={() => setSummaryOpen(true)}
                className="flex items-center gap-1.5 h-8 px-4 rounded-lg bg-crm-primary text-white text-[0.78rem] font-semibold hover:bg-[#4845a2] transition-colors shadow-sm"
              >
                <Save className="w-3.5 h-3.5" strokeWidth={2} />
                Review & Save
              </button>
            </div>
          </div>
        )}

        {/* Saved confirmation */}
        {savedCount !== null && (
          <div className="flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-50 border-b border-emerald-200 animate-[fadeIn_150ms_ease-out]">
            <Check className="w-4 h-4 text-emerald-500" strokeWidth={2.5} />
            <p className="text-[0.82rem] font-medium text-emerald-700">
              {savedCount} colour{savedCount !== 1 && "s"} updated successfully
            </p>
          </div>
        )}

        {/* Header: tabs + search */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-0 sm:gap-3 px-3 sm:px-5 pt-1 sm:pt-4 pb-0 border-b border-crm-border/40 shrink-0">
          <div className="flex gap-0 overflow-x-auto pb-0">
            {categories.map((cat) => {
              const t = tabTotals[cat];
              const active = activeTab === cat;
              const catChanges = Array.from(pendingChanges.values()).filter((c) => c.category === cat).length;
              return (
                <button
                  key={cat}
                  onClick={() => setActiveTab(cat)}
                  className={`relative px-3 sm:px-4 py-1.5 sm:py-2.5 rounded-t-xl text-[0.76rem] sm:text-[0.82rem] font-semibold transition-all whitespace-nowrap ${
                    active
                      ? "bg-crm-bg/40 text-crm-text shadow-[inset_0_2px_0_0_var(--color-crm-primary)]"
                      : "text-crm-text-muted hover:text-crm-text hover:bg-crm-bg/20"
                  }`}
                >
                  <span>{cat}</span>
                </button>
              );
            })}
          </div>

          <div className="relative pb-2 shrink-0 hidden sm:block">
            <Search
              className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-crm-text-muted"
              strokeWidth={1.8}
            />
            <input
              type="text"
              placeholder="Search colour..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-48 h-8 pl-8 pr-3 rounded-lg bg-crm-bg/40 border border-crm-border text-[0.8rem] text-crm-text placeholder:text-crm-text-muted focus:outline-none focus:ring-2 focus:ring-crm-primary/30 focus:border-crm-primary/50 transition-all"
            />
          </div>
        </div>

        {/* Desktop table */}
        <div className="hidden sm:block overflow-y-auto overflow-x-auto flex-1 min-h-0">
          <table className="w-full">
            <thead>
              <tr className="border-b-2 border-crm-border">
                <th className="text-left px-5 py-3.5 text-[0.8rem] font-bold text-crm-text bg-crm-card sticky top-0 z-10" colSpan={2}>
                  Colour
                </th>
                <th className="text-center px-5 py-3.5 text-[0.8rem] font-bold text-crm-text bg-crm-card sticky top-0 z-10">
                  Min
                </th>
                <th className="text-center px-5 py-3.5 text-[0.8rem] font-bold text-crm-text bg-crm-card sticky top-0 z-10">
                  Max
                </th>
                <th className="text-right px-5 py-3.5 text-[0.8rem] font-bold text-crm-text bg-crm-card sticky top-0 z-10">
                  Stock
                </th>
                <th className="text-center px-5 py-3.5 text-[0.8rem] font-bold text-crm-text bg-crm-card sticky top-0 z-10">
                  Action
                </th>
              </tr>
            </thead>
            <tbody>
              {tabItems.map((item, idx) => {
                const pct = stockPct(item.currentStock, item.maxStock);
                const minPct = stockPct(item.minStock, item.maxStock);
                const highlighted = highlightKey === item.id;
                const hasChange = pendingChanges.has(item.id);
                const isLastTouched = lastTouchedId === item.id;
                const rowBase =
                  idx % 2 === 0 ? "bg-crm-bg/30" : "bg-crm-card";

                return (
                  <tr
                    key={item.id}
                    data-stock-key={item.id}
                    className={`border-b border-crm-border/40 transition-colors hover:bg-crm-primary-muted/20 ${
                      highlighted
                        ? "!bg-crm-primary-muted/40 ring-2 ring-inset ring-crm-primary/40"
                        : isLastTouched
                        ? "!bg-emerald-100/70 !border-b-emerald-300/50"
                        : rowBase
                    }`}
                  >
                    <td className="pl-5 py-3 w-10">
                      <div
                        className={`w-7 h-7 rounded-lg shrink-0 ${
                          isLight(item.hex) ? "border border-crm-border" : ""
                        }`}
                        style={{ backgroundColor: item.hex }}
                      />
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex items-center gap-2">
                        <p className="text-[0.84rem] text-crm-text font-semibold">
                          {item.name}
                        </p>
                        {hasChange && (
                          <span className="w-1.5 h-1.5 rounded-full bg-crm-primary shrink-0" />
                        )}
                      </div>
                      <div className="relative h-1.5 rounded-full bg-crm-bg overflow-hidden max-w-[180px] mt-1.5">
                        <div
                          className={`absolute inset-y-0 left-0 rounded-full transition-all duration-300 ${barColor(
                            item.currentStock,
                            item.minStock,
                            item.maxStock
                          )}`}
                          style={{
                            width: item.currentStock < 0 ? "100%" : `${pct}%`,
                          }}
                        />
                        <div
                          className="absolute top-0 bottom-0 w-px bg-crm-border"
                          style={{ left: `${minPct}%` }}
                          title={`Min: ${item.minStock}`}
                        />
                      </div>
                    </td>
                    <td className="px-5 py-3 text-center text-[0.84rem] text-crm-text-muted tabular-nums">
                      {item.minStock}
                    </td>
                    <td className="px-5 py-3 text-center text-[0.84rem] text-crm-text-muted tabular-nums">
                      {item.maxStock}
                    </td>
                    <td className="px-5 py-3 text-right">
                      <span
                        className={`text-[0.88rem] font-bold tabular-nums ${stockValueColor(
                          item.currentStock,
                          item.minStock
                        )}`}
                      >
                        {item.currentStock}
                      </span>
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          onClick={() => adjustStock(item.id, -1)}
                          className="flex items-center gap-0.5 h-7 px-2 rounded-lg bg-red-50 text-red-500 hover:bg-red-100 transition-colors shrink-0"
                        >
                          <Minus className="w-3.5 h-3.5" strokeWidth={2.2} />
                          <span className="text-[0.68rem] font-bold">1</span>
                        </button>
                        <input
                          type="number"
                          value={editingId === item.id ? editValue : getDelta(item.id)}
                          onFocus={() => startEdit(item.id)}
                          onChange={(e) => setEditValue(e.target.value)}
                          onKeyDown={(e) =>
                            e.key === "Enter" && commitEdit(item.id)
                          }
                          onBlur={() => commitEdit(item.id)}
                          className="w-16 h-7 text-center rounded-lg bg-crm-bg/50 border border-crm-border text-[0.75rem] font-bold text-crm-text focus:outline-none focus:ring-1 focus:ring-crm-primary/30 transition-all [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                        />
                        <button
                          onClick={() => adjustStock(item.id, 3)}
                          className="flex items-center gap-0.5 h-7 px-2 rounded-lg bg-crm-primary-muted text-crm-primary hover:bg-crm-primary-muted/70 transition-colors shrink-0"
                        >
                          <Plus className="w-3.5 h-3.5" strokeWidth={2.2} />
                          <span className="text-[0.68rem] font-bold">3</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {tabItems.length === 0 && (
            <div className="py-14 text-center">
              <Package className="w-8 h-8 text-crm-border mx-auto mb-2" strokeWidth={1.5} />
              <p className="text-[0.9rem] text-crm-text-muted">No colours found</p>
              <p className="text-[0.78rem] text-crm-border mt-1">Try a different search</p>
            </div>
          )}
        </div>

        {/* Mobile table */}
        <div className="sm:hidden overflow-y-auto overflow-x-auto flex-1 min-h-0">
          <table className="w-full">
            <thead>
              <tr className="border-b-2 border-crm-border">
                <th className="text-left pl-3 pr-1 py-2.5 text-[0.72rem] font-bold text-crm-text w-8 bg-crm-card sticky top-0 z-10">#</th>
                <th className="text-left px-2 py-2.5 text-[0.72rem] font-bold text-crm-text bg-crm-card sticky top-0 z-10">Colour Name</th>
                <th className="text-center px-2 py-2.5 text-[0.72rem] font-bold text-crm-text bg-crm-card sticky top-0 z-10">Stock</th>
                <th className="text-center px-2 pr-3 py-2.5 text-[0.72rem] font-bold text-crm-text bg-crm-card sticky top-0 z-10">Action</th>
              </tr>
            </thead>
            <tbody>
              {tabItems.map((item, idx) => {
                const pct = stockPct(item.currentStock, item.maxStock);
                const minPct = stockPct(item.minStock, item.maxStock);
                const highlighted = highlightKey === item.id;
                const hasChange = pendingChanges.has(item.id);
                const isLastTouched = lastTouchedId === item.id;
                const rowBase = idx % 2 === 0 ? "bg-crm-bg/30" : "bg-crm-card";

                return (
                  <tr
                    key={item.id}
                    data-stock-key={item.id}
                    className={`border-b border-crm-border/40 transition-colors ${
                      highlighted
                        ? "!bg-crm-primary-muted/40 ring-2 ring-inset ring-crm-primary/40"
                        : isLastTouched
                        ? "!bg-emerald-100/70 !border-b-emerald-300/50"
                        : rowBase
                    }`}
                  >
                    <td className="pl-3 pr-1 py-2 align-middle">
                      <div
                        className={`w-7 h-7 rounded-lg shrink-0 ${
                          isLight(item.hex) ? "border border-crm-border" : ""
                        }`}
                        style={{ backgroundColor: item.hex }}
                      />
                    </td>
                    <td className="px-2 py-2 align-middle">
                      <div className="flex items-center gap-1">
                        <span className="text-[0.78rem] font-semibold text-crm-text">
                          {item.name}
                        </span>
                        {hasChange && (
                          <span className="w-1.5 h-1.5 rounded-full bg-crm-primary shrink-0" />
                        )}
                      </div>
                      <div className="relative h-1 rounded-full bg-crm-bg overflow-hidden mt-1 max-w-[120px]">
                        <div
                          className={`absolute inset-y-0 left-0 rounded-full transition-all duration-300 ${barColor(
                            item.currentStock,
                            item.minStock,
                            item.maxStock
                          )}`}
                          style={{
                            width: item.currentStock < 0 ? "100%" : `${pct}%`,
                          }}
                        />
                        <div
                          className="absolute top-0 bottom-0 w-px bg-crm-border"
                          style={{ left: `${minPct}%` }}
                        />
                      </div>
                    </td>
                    <td className="px-2 py-2 text-center align-middle">
                      <span
                        className={`text-[0.84rem] font-bold tabular-nums ${stockValueColor(
                          item.currentStock,
                          item.minStock
                        )}`}
                      >
                        {item.currentStock}
                      </span>
                    </td>
                    <td className="px-2 pr-3 py-2 align-middle">
                      <div className="flex items-center justify-center gap-0.5">
                        <button
                          onClick={() => adjustStock(item.id, -1)}
                          className="flex items-center justify-center w-7 h-7 rounded-md bg-red-50 text-red-500 active:bg-red-100 transition-colors"
                        >
                          <Minus className="w-3.5 h-3.5" strokeWidth={2.5} />
                        </button>
                        <input
                          type="number"
                          value={editingId === item.id ? editValue : getDelta(item.id)}
                          onFocus={() => startEdit(item.id)}
                          onChange={(e) => setEditValue(e.target.value)}
                          onKeyDown={(e) =>
                            e.key === "Enter" && commitEdit(item.id)
                          }
                          onBlur={() => commitEdit(item.id)}
                          className="w-10 h-7 text-center rounded-md bg-crm-bg/50 border border-crm-border text-[0.75rem] font-bold text-crm-text focus:outline-none focus:ring-1 focus:ring-crm-primary/30 transition-all [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                        />
                        <button
                          onClick={() => adjustStock(item.id, 3)}
                          className="flex items-center justify-center w-7 h-7 rounded-md bg-crm-primary-muted text-crm-primary active:bg-crm-primary-muted/70 transition-colors"
                        >
                          <Plus className="w-3.5 h-3.5" strokeWidth={2.5} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {tabItems.length === 0 && (
            <div className="py-14 text-center">
              <Package className="w-8 h-8 text-crm-border mx-auto mb-2" strokeWidth={1.5} />
              <p className="text-[0.9rem] text-crm-text-muted">No colours found</p>
              <p className="text-[0.78rem] text-crm-border mt-1">Try a different search</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-5 py-3 border-t border-crm-border bg-crm-card shrink-0">
          <p className="text-[0.78rem] text-crm-text-muted">
            {tabItems.length} colours in{" "}
            <span className="font-semibold text-crm-text">{activeTab}</span>
          </p>
          {tabTotals[activeTab] && (
            <p
              className={`text-[0.82rem] font-bold tabular-nums ${
                tabTotals[activeTab].total < 0
                  ? "text-red-500"
                  : "text-crm-text"
              }`}
            >
              Total: {tabTotals[activeTab].total.toLocaleString()}
            </p>
          )}
        </div>
      </div>

      {summaryOpen && pendingChanges.size > 0 && (
        <SummaryModal
          changes={pendingChanges}
          categories={categories}
          onClose={() => setSummaryOpen(false)}
          onSave={saveAllChanges}
          saving={saving}
        />
      )}
    </div>
  );
}
