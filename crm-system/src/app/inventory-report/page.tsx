"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ChevronDown,
  ChevronUp,
  ArrowUpDown,
  Loader2,
  AlertTriangle,
  CircleCheck,
  Package,
} from "lucide-react";

import { subscribeColors } from "@/lib/colors";
import type { Color } from "@/lib/types";

interface StockItem {
  name: string;
  hex: string;
  category: string;
  currentStock: number;
  minStock: number;
  maxStock: number;
}

const LIGHT_HEXES = new Set([
  "#ffffff", "#fffdd0", "#fff700", "#f1f359", "#fff04d",
  "#ffb6c1", "#68ffd1", "#00ffff", "#9ecc1f", "#6cf205",
]);

interface ColorRow {
  name: string;
  hex: string;
  stocks: Record<string, StockItem>;
  totalStock: number;
  issueCount: number;
}

type SortField = string;
type Filter = "all" | "attention" | "ok" | "deficit" | "empty" | "low" | "at-max";

function hasIssue(item: StockItem): boolean {
  return item.currentStock <= item.minStock;
}

function stockPct(current: number, max: number): number {
  if (max <= 0) return 0;
  return Math.max(0, Math.min(100, (current / max) * 100));
}

function barFill(item: StockItem): string {
  if (item.currentStock < 0) return "bg-red-400 animate-pulse";
  if (item.currentStock === 0) return "bg-slate-300";
  if (item.currentStock <= item.minStock) return "bg-amber-400";
  if (item.currentStock >= item.maxStock) return "bg-emerald-400";
  return "bg-blue-400";
}

function stockNumColor(item: StockItem): string {
  if (item.currentStock < 0) return "text-red-500";
  if (item.currentStock === 0) return "text-crm-text-muted";
  if (item.currentStock <= item.minStock) return "text-amber-500";
  return "text-crm-text";
}

function statusTag(item: StockItem): { label: string; cls: string } | null {
  if (item.currentStock < 0) return { label: "Deficit", cls: "bg-red-500 text-white" };
  if (item.currentStock === 0) return { label: "Empty", cls: "bg-crm-bg text-crm-text-muted" };
  if (item.currentStock <= item.minStock) return { label: "Low", cls: "bg-amber-400 text-white" };
  return null;
}

export default function InventoryReportPage(): React.JSX.Element {
  const [colors, setColors] = useState<Color[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = subscribeColors((loaded) => {
      setColors(loaded);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const ALL = useMemo<StockItem[]>(() =>
    colors.map((c) => ({
      name: c.name,
      hex: c.hex,
      category: c.category,
      currentStock: c.currentStock,
      minStock: c.minStock,
      maxStock: c.maxStock,
    })),
    [colors]
  );

  const CATEGORIES = useMemo(() => [...new Set(colors.map(c => c.category))].sort(), [colors]);

  const [filter, setFilter] = useState<Filter>("all");
  const [catFilter, setCatFilter] = useState<string>("all");
  const [sortField, setSortField] = useState<SortField>("default");
  const [sortAsc, setSortAsc] = useState(true);

  const colorRows = useMemo<ColorRow[]>(() => {
    const map = new Map<string, ColorRow>();
    for (const item of ALL) {
      let row = map.get(item.name);
      if (!row) {
        row = { name: item.name, hex: item.hex, stocks: {}, totalStock: 0, issueCount: 0 };
        map.set(item.name, row);
      }
      row.stocks[item.category] = item;
      row.totalStock += item.currentStock;
      if (hasIssue(item)) row.issueCount++;
    }
    return Array.from(map.values());
  }, [ALL]);

  function getStocksForFilter(row: ColorRow): StockItem[] {
    if (catFilter === "all") return Object.values(row.stocks);
    const s = row.stocks[catFilter];
    return s ? [s] : [];
  }

  const filtered = useMemo(() => {
    let rows = colorRows;

    if (catFilter !== "all") {
      rows = rows.filter((r) => r.stocks[catFilter]);
    }

    switch (filter) {
      case "attention": rows = rows.filter((r) => getStocksForFilter(r).some((s) => hasIssue(s))); break;
      case "ok": rows = rows.filter((r) => getStocksForFilter(r).every((s) => !hasIssue(s))); break;
      case "deficit": rows = rows.filter((r) => getStocksForFilter(r).some((s) => s.currentStock < 0)); break;
      case "empty": rows = rows.filter((r) => getStocksForFilter(r).some((s) => s.currentStock === 0)); break;
      case "low": rows = rows.filter((r) => getStocksForFilter(r).some((s) => s.currentStock > 0 && s.currentStock <= s.minStock)); break;
      case "at-max": rows = rows.filter((r) => getStocksForFilter(r).some((s) => s.currentStock >= s.maxStock)); break;
    }

    if (sortField !== "default") {
      rows = [...rows].sort((a, b) => {
        let cmp = 0;
        switch (sortField) {
          case "name": cmp = a.name.localeCompare(b.name); break;
          default:
            cmp = (a.stocks[sortField]?.currentStock ?? -9999) - (b.stocks[sortField]?.currentStock ?? -9999);
            break;
        }
        return sortAsc ? cmp : -cmp;
      });
    }
    return rows;
  }, [colorRows, filter, catFilter, sortField, sortAsc]);

  function toggleSort(field: SortField) {
    if (sortField === field) setSortAsc((p) => !p);
    else { setSortField(field); setSortAsc(field === "name"); }
  }

  const baseRows = useMemo(() => {
    if (catFilter === "all") return colorRows;
    return colorRows.filter((r) => r.stocks[catFilter]);
  }, [colorRows, catFilter]);

  const filterCounts = useMemo(() => {
    function stocks(row: ColorRow): StockItem[] {
      if (catFilter === "all") return Object.values(row.stocks);
      const s = row.stocks[catFilter];
      return s ? [s] : [];
    }
    return {
      all: baseRows.length,
      attention: baseRows.filter((r) => stocks(r).some((s) => hasIssue(s))).length,
      ok: baseRows.filter((r) => stocks(r).every((s) => !hasIssue(s))).length,
      deficit: baseRows.filter((r) => stocks(r).some((s) => s.currentStock < 0)).length,
      empty: baseRows.filter((r) => stocks(r).some((s) => s.currentStock === 0)).length,
      low: baseRows.filter((r) => stocks(r).some((s) => s.currentStock > 0 && s.currentStock <= s.minStock)).length,
      "at-max": baseRows.filter((r) => stocks(r).some((s) => s.currentStock >= s.maxStock)).length,
    };
  }, [baseRows, catFilter]);

  const FILTERS: { key: Filter; label: string; count: number; dot?: string }[] = [
    { key: "all", label: "All", count: filterCounts.all },
    { key: "attention", label: "Attention", count: filterCounts.attention, dot: "bg-amber-400" },
    { key: "deficit", label: "Deficit", count: filterCounts.deficit, dot: "bg-red-500" },
    { key: "empty", label: "Empty", count: filterCounts.empty, dot: "bg-crm-border" },
    { key: "low", label: "Low", count: filterCounts.low, dot: "bg-amber-400" },
    { key: "at-max", label: "At Max", count: filterCounts["at-max"], dot: "bg-emerald-500" },
    { key: "ok", label: "OK", count: filterCounts.ok, dot: "bg-blue-400" },
  ];

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return <ArrowUpDown className="w-2.5 h-2.5 opacity-30" strokeWidth={2} />;
    return sortAsc
      ? <ChevronUp className="w-3 h-3" strokeWidth={2.5} />
      : <ChevronDown className="w-3 h-3" strokeWidth={2.5} />;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 text-crm-primary animate-spin" strokeWidth={1.8} />
          <p className="text-[0.85rem] text-crm-text-muted">Loading inventory data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col flex-1">
      <div className="flex flex-col flex-1">

        {/* Tabs: category + filters */}
        <div className="flex flex-col gap-0 px-3 sm:px-5 pt-1 sm:pt-3 pb-0 border-b border-crm-border/40 shrink-0">
          <div className="flex gap-0 overflow-x-auto pb-0">
            {["all", ...CATEGORIES].map((cat) => (
              <button
                key={cat}
                onClick={() => { setCatFilter(cat); setFilter("all"); }}
                className={`px-3 sm:px-4 py-1.5 sm:py-2.5 rounded-t-xl text-[0.76rem] sm:text-[0.82rem] font-semibold transition-all whitespace-nowrap ${
                  catFilter === cat
                    ? "bg-crm-bg/40 text-crm-text shadow-[inset_0_2px_0_0_var(--color-crm-primary)]"
                    : "text-crm-text-muted hover:text-crm-text hover:bg-crm-bg/20"
                }`}
              >
                {cat === "all" ? "All" : cat}
              </button>
            ))}
          </div>

          <div className="flex gap-0.5 sm:gap-1 flex-wrap pb-1.5 sm:pb-2.5">
            {FILTERS.map((f) => (
              <button
                key={f.key}
                onClick={() => setFilter(f.key)}
                className={`inline-flex items-center gap-1 px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-lg text-[0.68rem] sm:text-[0.76rem] font-medium transition-all whitespace-nowrap ${
                  filter === f.key
                    ? "bg-crm-primary-muted text-crm-primary shadow-[inset_0_0_0_1px_var(--color-crm-primary)]"
                    : "text-crm-text-muted hover:text-crm-text hover:bg-crm-bg/40"
                }`}
              >
                {f.dot && <span className={`w-1.5 h-1.5 rounded-full ${f.dot}`} />}
                {f.label}
                <span className={`text-[0.6rem] sm:text-[0.65rem] tabular-nums ${
                  filter === f.key ? "text-crm-primary" : "text-crm-border"
                }`}>{f.count}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Desktop table */}
        <div className="hidden sm:block overflow-y-auto overflow-x-auto flex-1 min-h-0">
          <table className="w-full">
            <thead>
              <tr className="border-b-2 border-crm-border">
                <th
                  onClick={() => toggleSort("name")}
                  className="text-left px-5 py-3.5 text-[0.8rem] font-bold text-crm-text bg-crm-card sticky top-0 z-10 cursor-pointer select-none"
                >
                  <span className="inline-flex items-center gap-1">Colour <SortIcon field="name" /></span>
                </th>
                {CATEGORIES.map((cat) => (
                  <th
                    key={cat}
                    onClick={() => toggleSort(cat)}
                    className="text-center px-3 py-3.5 text-[0.8rem] font-bold text-crm-text bg-crm-card sticky top-0 z-10 cursor-pointer select-none"
                  >
                    <span className="inline-flex items-center gap-1">{cat} <SortIcon field={cat} /></span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((row, idx) => {
                const rowBase = idx % 2 === 0 ? "bg-crm-bg/30" : "bg-crm-card";
                return (
                  <tr
                    key={row.name}
                    className={`border-b border-crm-border/40 transition-colors hover:bg-crm-primary-muted/20 ${rowBase}`}
                  >
                    <td className="pl-5 pr-3 py-3">
                      <div className="flex items-center gap-2.5">
                        <div
                          className={`w-6 h-6 rounded-lg shrink-0 ${LIGHT_HEXES.has(row.hex) ? "border border-crm-border" : ""}`}
                          style={{ backgroundColor: row.hex }}
                        />
                        <span className="text-[0.84rem] font-semibold text-crm-text">{row.name}</span>
                      </div>
                    </td>

                    {CATEGORIES.map((cat) => {
                      const item = row.stocks[cat];
                      if (!item) return <td key={cat} className="px-3 py-3 text-center text-[0.8rem] text-crm-border">&mdash;</td>;

                      const pct = stockPct(item.currentStock, item.maxStock);
                      const minPct = stockPct(item.minStock, item.maxStock);
                      const tag = statusTag(item);

                      return (
                        <td key={cat} className="px-3 py-3">
                          <div className="flex flex-col items-center gap-1">
                            <div className="flex items-center gap-1.5">
                              <span className={`text-[0.84rem] font-bold tabular-nums ${stockNumColor(item)}`}>
                                {item.currentStock}
                              </span>
                              {tag && (
                                <span className={`px-1.5 py-px rounded text-[0.55rem] font-bold uppercase tracking-wide ${tag.cls}`}>
                                  {tag.label}
                                </span>
                              )}
                            </div>
                            <div className="w-full max-w-[100px] relative h-1 rounded-full bg-crm-bg overflow-hidden">
                              <div
                                className={`absolute inset-y-0 left-0 rounded-full transition-all duration-300 ${barFill(item)}`}
                                style={{ width: item.currentStock < 0 ? "100%" : `${pct}%` }}
                              />
                              <div
                                className="absolute top-0 bottom-0 w-px bg-crm-border"
                                style={{ left: `${minPct}%` }}
                              />
                            </div>
                            <div className="flex items-center justify-between w-full max-w-[100px]">
                              <span className="text-[0.58rem] text-crm-text-muted tabular-nums">{item.minStock}</span>
                              <span className="text-[0.58rem] text-crm-text-muted tabular-nums">{item.maxStock}</span>
                            </div>
                          </div>
                        </td>
                      );
                    })}

                  </tr>
                );
              })}
            </tbody>
          </table>

          {filtered.length === 0 && (
            <div className="py-14 text-center">
              <Package className="w-8 h-8 text-crm-border mx-auto mb-2" strokeWidth={1.5} />
              <p className="text-[0.9rem] text-crm-text-muted">No colours found</p>
              <p className="text-[0.78rem] text-crm-border mt-1">Try a different filter</p>
            </div>
          )}
        </div>

        {/* Mobile table */}
        <div className="sm:hidden overflow-y-auto overflow-x-auto flex-1 min-h-0">
          <table className="w-full">
            <thead>
              <tr className="border-b-2 border-crm-border">
                <th className="text-left pl-3 pr-1 py-2 text-[0.72rem] font-bold text-crm-text bg-crm-card sticky top-0 z-10 w-8">#</th>
                <th className="text-left px-2 py-2 text-[0.72rem] font-bold text-crm-text bg-crm-card sticky top-0 z-10">Colour</th>
                <th className="text-center px-2 pr-3 py-2 text-[0.72rem] font-bold text-crm-text bg-crm-card sticky top-0 z-10">
                  {catFilter !== "all" ? "Stock" : "Stock by Category"}
                </th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((row, idx) => {
                const rowBase = idx % 2 === 0 ? "bg-crm-bg/30" : "bg-crm-card";

                return (
                  <tr
                    key={row.name}
                    className={`border-b border-crm-border/40 transition-colors ${rowBase}`}
                  >
                    <td className="pl-3 pr-1 py-2 align-top">
                      <div
                        className={`w-7 h-7 rounded-lg shrink-0 mt-0.5 ${LIGHT_HEXES.has(row.hex) ? "border border-crm-border" : ""}`}
                        style={{ backgroundColor: row.hex }}
                      />
                    </td>
                    <td className="px-2 py-2 align-top">
                      <span className="text-[0.78rem] font-semibold text-crm-text">{row.name}</span>
                      {catFilter !== "all" && row.stocks[catFilter] && (
                        <div className="relative h-1 rounded-full bg-crm-bg overflow-hidden mt-1 max-w-[100px]">
                          <div
                            className={`absolute inset-y-0 left-0 rounded-full transition-all duration-300 ${barFill(row.stocks[catFilter])}`}
                            style={{ width: row.stocks[catFilter].currentStock < 0 ? "100%" : `${stockPct(row.stocks[catFilter].currentStock, row.stocks[catFilter].maxStock)}%` }}
                          />
                          <div
                            className="absolute top-0 bottom-0 w-px bg-crm-border"
                            style={{ left: `${stockPct(row.stocks[catFilter].minStock, row.stocks[catFilter].maxStock)}%` }}
                          />
                        </div>
                      )}
                    </td>

                    <td className="px-2 pr-3 py-2 align-top">
                      {catFilter !== "all" ? (
                        <div className="text-center">
                          {row.stocks[catFilter] ? (
                            <span className={`text-[0.84rem] font-bold tabular-nums ${stockNumColor(row.stocks[catFilter])}`}>
                              {row.stocks[catFilter].currentStock}
                            </span>
                          ) : (
                            <span className="text-[0.78rem] text-crm-border">&mdash;</span>
                          )}
                        </div>
                      ) : (
                        <div className="space-y-1">
                          {CATEGORIES.map((cat) => {
                            const item = row.stocks[cat];
                            return (
                              <div key={cat} className="flex items-center gap-1.5">
                                <span className="text-[0.62rem] text-crm-text-muted w-10 truncate">{cat}</span>
                                {item ? (
                                  <>
                                    <div className="relative h-1 rounded-full bg-crm-bg overflow-hidden flex-1 min-w-[40px]">
                                      <div
                                        className={`absolute inset-y-0 left-0 rounded-full transition-all duration-300 ${barFill(item)}`}
                                        style={{ width: item.currentStock < 0 ? "100%" : `${stockPct(item.currentStock, item.maxStock)}%` }}
                                      />
                                    </div>
                                    <span className={`text-[0.68rem] font-bold tabular-nums w-6 text-right ${stockNumColor(item)}`}>
                                      {item.currentStock}
                                    </span>
                                  </>
                                ) : (
                                  <span className="text-[0.68rem] text-crm-border">&mdash;</span>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {filtered.length === 0 && (
            <div className="py-14 text-center">
              <Package className="w-8 h-8 text-crm-border mx-auto mb-2" strokeWidth={1.5} />
              <p className="text-[0.9rem] text-crm-text-muted">No colours found</p>
              <p className="text-[0.78rem] text-crm-border mt-1">Try a different filter</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-3 sm:px-5 py-2.5 sm:py-3 border-t border-crm-border bg-crm-card shrink-0 gap-2">
          <p className="text-[0.72rem] sm:text-[0.78rem] text-crm-text-muted shrink-0">
            {filtered.length} of {baseRows.length}
            {catFilter !== "all" && <span className="ml-1 font-semibold text-crm-text">in {catFilter}</span>}
          </p>
          <div className="flex items-center gap-2 sm:gap-3 flex-wrap justify-end">
            <span className="flex items-center gap-1 text-[0.6rem] sm:text-[0.65rem] text-crm-text-muted">
              <span className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-red-400" /> Deficit
            </span>
            <span className="flex items-center gap-1 text-[0.6rem] sm:text-[0.65rem] text-crm-text-muted">
              <span className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-amber-400" /> Low
            </span>
            <span className="flex items-center gap-1 text-[0.6rem] sm:text-[0.65rem] text-crm-text-muted">
              <span className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-blue-400" /> Good
            </span>
            <span className="flex items-center gap-1 text-[0.6rem] sm:text-[0.65rem] text-crm-text-muted">
              <span className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-emerald-400" /> Max
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
