"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Search,
  TrendingUp,
  AlertTriangle,
  CircleCheck,
  Layers,
  ChevronDown,
  ChevronUp,
  ArrowUpDown,
  Loader2,
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
  worstDeficit: number;
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

function cellBg(item: StockItem | undefined): string {
  if (!item) return "";
  if (item.currentStock < 0) return "bg-red-50/60";
  if (item.currentStock === 0) return "bg-slate-warm-50/60";
  if (item.currentStock <= item.minStock) return "bg-amber-50/40";
  return "";
}

function barFill(item: StockItem): string {
  if (item.currentStock < 0) return "bg-red-400";
  if (item.currentStock === 0) return "bg-slate-warm-300";
  if (item.currentStock <= item.minStock) return "bg-amber-400";
  return "bg-sage-400";
}

function stockNumColor(item: StockItem): string {
  if (item.currentStock < 0) return "text-red-600";
  if (item.currentStock === 0) return "text-slate-warm-400";
  if (item.currentStock <= item.minStock) return "text-amber-600";
  return "text-slate-warm-800";
}

function statusTag(item: StockItem): { label: string; bg: string; text: string } | null {
  if (item.currentStock < 0) return { label: "Deficit", bg: "bg-red-100", text: "text-red-700" };
  if (item.currentStock === 0) return { label: "Empty", bg: "bg-slate-warm-100", text: "text-slate-warm-600" };
  if (item.currentStock <= item.minStock) return { label: "Low", bg: "bg-amber-100", text: "text-amber-700" };
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
  const [search, setSearch] = useState("");
  const [sortField, setSortField] = useState<SortField>("name");
  const [sortAsc, setSortAsc] = useState(true);

  const colorRows = useMemo<ColorRow[]>(() => {
    const map = new Map<string, ColorRow>();
    for (const item of ALL) {
      let row = map.get(item.name);
      if (!row) {
        row = { name: item.name, hex: item.hex, stocks: {}, totalStock: 0, issueCount: 0, worstDeficit: 0 };
        map.set(item.name, row);
      }
      row.stocks[item.category] = item;
      row.totalStock += item.currentStock;
      if (hasIssue(item)) row.issueCount++;
      if (item.currentStock < row.worstDeficit) row.worstDeficit = item.currentStock;
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
    const q = search.toLowerCase();
    if (q) rows = rows.filter((r) => r.name.toLowerCase().includes(q));

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

    rows = [...rows].sort((a, b) => {
      let cmp = 0;
      switch (sortField) {
        case "name": cmp = a.name.localeCompare(b.name); break;
        case "total": cmp = a.totalStock - b.totalStock; break;
        case "issues": cmp = a.issueCount - b.issueCount; break;
        default:
          cmp = (a.stocks[sortField]?.currentStock ?? -9999) - (b.stocks[sortField]?.currentStock ?? -9999);
          break;
      }
      return sortAsc ? cmp : -cmp;
    });
    return rows;
  }, [colorRows, filter, catFilter, search, sortField, sortAsc]);

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

  const healthPct = baseRows.length > 0 ? Math.round((filterCounts.ok / baseRows.length) * 100) : 0;

  const catTotals = useMemo(() => {
    const result: Record<string, { total: number; deficit: number; low: number; healthy: number }> = {};
    for (const cat of CATEGORIES) {
      const items = ALL.filter((i) => i.category === cat);
      result[cat] = {
        total: items.reduce((s, i) => s + i.currentStock, 0),
        deficit: items.filter((i) => i.currentStock < 0).length,
        low: items.filter((i) => i.currentStock >= 0 && i.currentStock <= i.minStock).length,
        healthy: items.filter((i) => i.currentStock > i.minStock).length,
      };
    }
    return result;
  }, [ALL, CATEGORIES]);

  const FILTERS: { key: Filter; label: string; count: number; dot?: string }[] = [
    { key: "all", label: "All", count: filterCounts.all },
    { key: "attention", label: "Needs Attention", count: filterCounts.attention },
    { key: "deficit", label: "Deficit", count: filterCounts.deficit, dot: "bg-red-500" },
    { key: "empty", label: "Empty", count: filterCounts.empty, dot: "bg-slate-warm-400" },
    { key: "low", label: "Low Stock", count: filterCounts.low, dot: "bg-amber-400" },
    { key: "at-max", label: "At Max", count: filterCounts["at-max"], dot: "bg-sage-500" },
    { key: "ok", label: "All Good", count: filterCounts.ok },
  ];

  const SortHeader = ({ field, children, className }: { field: SortField; children: React.ReactNode; className?: string }) => (
    <th
      onClick={() => toggleSort(field)}
      className={`py-3 text-[0.65rem] font-bold uppercase tracking-widest cursor-pointer select-none transition-colors hover:text-sage-600 ${
        sortField === field ? "text-sage-600" : "text-slate-warm-400"
      } ${className ?? ""}`}
    >
      <span className="inline-flex items-center gap-1">
        {children}
        {sortField === field ? (
          sortAsc
            ? <ChevronUp className="w-3 h-3" strokeWidth={2.5} />
            : <ChevronDown className="w-3 h-3" strokeWidth={2.5} />
        ) : (
          <ArrowUpDown className="w-2.5 h-2.5 opacity-30" strokeWidth={2} />
        )}
      </span>
    </th>
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 text-sage-400 animate-spin" strokeWidth={1.8} />
          <p className="text-[0.85rem] text-slate-warm-400 font-medium">Loading inventory data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">

      {/* Summary cards */}
      <div className="grid grid-cols-6 gap-3">
        <div className="bg-white rounded-2xl card-shadow p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-sage-50 flex items-center justify-center">
            <Layers className="w-5 h-5 text-sage-500" strokeWidth={1.8} />
          </div>
          <div>
            <p className="text-[0.6rem] font-semibold uppercase tracking-widest text-slate-warm-400">Total</p>
            <p className="text-xl font-bold text-slate-warm-900">{filterCounts.all}</p>
          </div>
        </div>

        <div className="bg-white rounded-2xl card-shadow p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-sage-50 flex items-center justify-center">
            <TrendingUp className="w-5 h-5 text-sage-500" strokeWidth={1.8} />
          </div>
          <div>
            <p className="text-[0.6rem] font-semibold uppercase tracking-widest text-slate-warm-400">Health</p>
            <p className={`text-xl font-bold ${healthPct >= 50 ? "text-sage-600" : "text-amber-600"}`}>{healthPct}%</p>
          </div>
        </div>

        <div className="bg-white rounded-2xl card-shadow p-4 flex items-center gap-3 cursor-pointer hover:shadow-md transition-shadow" onClick={() => setFilter("deficit")}>
          <div className="w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center">
            <span className="w-3 h-3 rounded-full bg-red-500" />
          </div>
          <div>
            <p className="text-[0.6rem] font-semibold uppercase tracking-widest text-slate-warm-400">Deficit</p>
            <p className="text-xl font-bold text-red-600">{filterCounts.deficit}</p>
          </div>
        </div>

        <div className="bg-white rounded-2xl card-shadow p-4 flex items-center gap-3 cursor-pointer hover:shadow-md transition-shadow" onClick={() => setFilter("empty")}>
          <div className="w-10 h-10 rounded-xl bg-slate-warm-50 flex items-center justify-center">
            <span className="w-3 h-3 rounded-full bg-slate-warm-400" />
          </div>
          <div>
            <p className="text-[0.6rem] font-semibold uppercase tracking-widest text-slate-warm-400">Empty</p>
            <p className="text-xl font-bold text-slate-warm-600">{filterCounts.empty}</p>
          </div>
        </div>

        <div className="bg-white rounded-2xl card-shadow p-4 flex items-center gap-3 cursor-pointer hover:shadow-md transition-shadow" onClick={() => setFilter("low")}>
          <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center">
            <span className="w-3 h-3 rounded-full bg-amber-400" />
          </div>
          <div>
            <p className="text-[0.6rem] font-semibold uppercase tracking-widest text-slate-warm-400">Low</p>
            <p className="text-xl font-bold text-amber-600">{filterCounts.low}</p>
          </div>
        </div>

        <div className="bg-white rounded-2xl card-shadow p-4 flex items-center gap-3 cursor-pointer hover:shadow-md transition-shadow" onClick={() => setFilter("ok")}>
          <div className="w-10 h-10 rounded-xl bg-sage-50 flex items-center justify-center">
            <CircleCheck className="w-5 h-5 text-sage-500" strokeWidth={1.8} />
          </div>
          <div>
            <p className="text-[0.6rem] font-semibold uppercase tracking-widest text-slate-warm-400">Good</p>
            <p className="text-xl font-bold text-sage-600">{filterCounts.ok}</p>
          </div>
        </div>
      </div>

      {/* Category quick stats */}
      <div className={`grid gap-3`} style={{ gridTemplateColumns: `repeat(${CATEGORIES.length}, minmax(0, 1fr))` }}>
        {CATEGORIES.map((cat) => {
          const ct = catTotals[cat];
          if (!ct) return null;
          const catHealthPct = Math.round((ct.healthy / (ct.deficit + ct.low + ct.healthy)) * 100);
          return (
            <div key={cat} className="bg-white rounded-xl card-shadow px-5 py-3.5">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-[0.82rem] font-bold text-slate-warm-800">{cat}</h3>
                <span className={`text-[0.82rem] font-bold tabular-nums ${ct.total < 0 ? "text-red-600" : "text-slate-warm-700"}`}>
                  {ct.total.toLocaleString()}
                </span>
              </div>
              <div className="h-1.5 flex rounded-full overflow-hidden bg-slate-warm-100">
                {ct.healthy > 0 && (
                  <div className="bg-sage-400" style={{ width: `${(ct.healthy / (ct.deficit + ct.low + ct.healthy)) * 100}%` }} />
                )}
                {ct.low > 0 && (
                  <div className="bg-amber-400" style={{ width: `${(ct.low / (ct.deficit + ct.low + ct.healthy)) * 100}%` }} />
                )}
                {ct.deficit > 0 && (
                  <div className="bg-red-400" style={{ width: `${(ct.deficit / (ct.deficit + ct.low + ct.healthy)) * 100}%` }} />
                )}
              </div>
              <div className="flex items-center gap-3 mt-2">
                <span className="text-[0.62rem] text-sage-600 font-semibold">{ct.healthy} good</span>
                <span className="text-[0.62rem] text-amber-600 font-semibold">{ct.low} low</span>
                <span className="text-[0.62rem] text-red-600 font-semibold">{ct.deficit} deficit</span>
                <span className="ml-auto text-[0.62rem] font-bold text-slate-warm-400">{catHealthPct}%</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Main combined table */}
      <div className="bg-white rounded-2xl card-shadow overflow-hidden">

        {/* Toolbar */}
        <div className="px-5 pt-4 pb-3 border-b border-slate-warm-100 space-y-2.5">
          {/* Category filter + search */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1">
              <span className="text-[0.65rem] font-semibold uppercase tracking-widest text-slate-warm-300 mr-2">Category</span>
              {["all", ...CATEGORIES].map((cat) => (
                <button
                  key={cat}
                  onClick={() => { setCatFilter(cat); setFilter("all"); }}
                  className={`px-3 py-1.5 rounded-lg text-[0.78rem] font-semibold transition-all ${
                    catFilter === cat
                      ? "bg-slate-warm-800 text-white shadow-sm"
                      : "text-slate-warm-400 hover:text-slate-warm-600 hover:bg-cream-50"
                  }`}
                >
                  {cat === "all" ? "All" : cat}
                </button>
              ))}
            </div>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-warm-400" strokeWidth={1.8} />
              <input
                type="text"
                placeholder="Search colour..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-52 h-8 pl-8 pr-3 rounded-lg bg-cream-50 border border-slate-warm-100 text-[0.8rem] text-slate-warm-700 placeholder:text-slate-warm-300 focus:outline-none focus:ring-2 focus:ring-sage-200 focus:border-sage-300 transition-all"
              />
            </div>
          </div>

          {/* Status filters */}
          <div className="flex gap-1 flex-wrap">
            {FILTERS.map((f) => (
              <button
                key={f.key}
                onClick={() => setFilter(f.key)}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[0.78rem] font-medium transition-all ${
                  filter === f.key
                    ? "bg-sage-50 text-sage-700 shadow-[inset_0_0_0_1px_var(--color-sage-200)]"
                    : "text-slate-warm-400 hover:text-slate-warm-600 hover:bg-cream-50"
                }`}
              >
                {f.dot && <span className={`w-2 h-2 rounded-full ${f.dot}`} />}
                {f.label}
                <span className={`text-[0.68rem] tabular-nums ${
                  filter === f.key ? "text-sage-500" : "text-slate-warm-300"
                }`}>{f.count}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-cream-50/60">
                <SortHeader field="name" className="pl-5 pr-3 text-left w-[180px]">Colour</SortHeader>
                {CATEGORIES.map((cat) => (
                  <SortHeader key={cat} field={cat} className="px-2 text-center">{cat}</SortHeader>
                ))}
                <SortHeader field="total" className="px-3 text-right w-[90px]">Total</SortHeader>
                <SortHeader field="issues" className="px-5 text-center w-[110px]">Status</SortHeader>
              </tr>
            </thead>
            <tbody>
              {filtered.map((row, idx) => (
                <tr
                  key={row.name}
                  className={`border-b border-slate-warm-50 transition-colors hover:bg-cream-50/60 ${
                    idx % 2 !== 0 ? "bg-cream-50/25" : ""
                  }`}
                >
                  {/* Colour name + swatch */}
                  <td className="pl-5 pr-3 py-2">
                    <div className="flex items-center gap-2.5">
                      <div
                        className={`w-6 h-6 rounded-md shrink-0 shadow-sm ${LIGHT_HEXES.has(row.hex) ? "border border-slate-warm-200" : ""}`}
                        style={{ backgroundColor: row.hex }}
                      />
                      <span className="text-[0.82rem] font-semibold text-slate-warm-800">{row.name}</span>
                    </div>
                  </td>

                  {/* Category cells with inline progress */}
                  {CATEGORIES.map((cat) => {
                    const item = row.stocks[cat];
                    if (!item) return <td key={cat} className="px-2 py-2 text-center text-[0.78rem] text-slate-warm-300">&mdash;</td>;

                    const pct = stockPct(item.currentStock, item.maxStock);
                    const minPct = stockPct(item.minStock, item.maxStock);
                    const deficit = item.currentStock < 0;
                    const tag = statusTag(item);

                    return (
                      <td key={cat} className={`px-2 py-2 ${cellBg(item)}`}>
                        <div className="flex flex-col items-center gap-1">
                          <div className="flex items-center gap-1.5">
                            <span className={`text-[0.88rem] font-bold tabular-nums ${stockNumColor(item)}`}>
                              {item.currentStock}
                            </span>
                            {tag && (
                              <span className={`px-1.5 py-px rounded text-[0.55rem] font-bold uppercase tracking-wide ${tag.bg} ${tag.text}`}>
                                {tag.label}
                              </span>
                            )}
                          </div>
                          <div className="w-full max-w-[100px] relative h-1 rounded-full bg-slate-warm-100 overflow-hidden">
                            {deficit ? (
                              <div className="absolute inset-0 rounded-full bg-red-400 animate-pulse" />
                            ) : (
                              <div
                                className={`absolute inset-y-0 left-0 rounded-full transition-all duration-300 ${barFill(item)}`}
                                style={{ width: `${pct}%` }}
                              />
                            )}
                            <div
                              className="absolute top-0 bottom-0 w-px bg-slate-warm-400/40"
                              style={{ left: `${minPct}%` }}
                            />
                          </div>
                          <div className="flex items-center justify-between w-full max-w-[100px]">
                            <span className="text-[0.6rem] text-slate-warm-400 tabular-nums">{item.minStock}</span>
                            <span className="text-[0.6rem] text-slate-warm-400 tabular-nums">{item.maxStock}</span>
                          </div>
                        </div>
                      </td>
                    );
                  })}

                  {/* Total */}
                  <td className={`px-3 py-2 text-right text-[0.88rem] font-bold tabular-nums ${
                    row.totalStock < 0 ? "text-red-600" : "text-slate-warm-800"
                  }`}>
                    {row.totalStock}
                  </td>

                  {/* Status */}
                  <td className="px-5 py-2 text-center">
                    {row.issueCount === 0 ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-sage-50 text-sage-600 text-[0.7rem] font-bold">
                        <CircleCheck className="w-3 h-3" strokeWidth={2.2} />
                        OK
                      </span>
                    ) : row.issueCount === CATEGORIES.length ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-red-50 text-red-600 text-[0.7rem] font-bold">
                        <AlertTriangle className="w-3 h-3" strokeWidth={2.2} />
                        All Low
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-amber-50 text-amber-600 text-[0.7rem] font-bold">
                        <AlertTriangle className="w-3 h-3" strokeWidth={2.2} />
                        {row.issueCount}/{CATEGORIES.length}
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {filtered.length === 0 && (
            <div className="py-12 text-center">
              <p className="text-[0.9rem] text-slate-warm-400">No colours found</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-5 py-3 border-t border-slate-warm-100 bg-white">
          <p className="text-[0.78rem] text-slate-warm-400">
            Showing <span className="font-semibold text-slate-warm-600">{filtered.length}</span> of {baseRows.length} colours
            {catFilter !== "all" && <span className="ml-1 text-slate-warm-500">in {catFilter}</span>}
          </p>
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1.5 text-[0.65rem] text-slate-warm-400">
              <span className="w-2 h-2 rounded-full bg-red-400" /> Deficit
            </span>
            <span className="flex items-center gap-1.5 text-[0.65rem] text-slate-warm-400">
              <span className="w-2 h-2 rounded-full bg-slate-warm-300" /> Empty
            </span>
            <span className="flex items-center gap-1.5 text-[0.65rem] text-slate-warm-400">
              <span className="w-2 h-2 rounded-full bg-amber-400" /> Low
            </span>
            <span className="flex items-center gap-1.5 text-[0.65rem] text-slate-warm-400">
              <span className="w-2 h-2 rounded-full bg-sage-400" /> Good
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
