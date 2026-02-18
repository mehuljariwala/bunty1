"use client";

import { useState, useMemo, useRef, useEffect, useCallback } from "react";
import {
  Package,
  AlertTriangle,
  CircleCheck,
  Search,
  Plus,
  Minus,
  Ban,
  LayoutGrid,
  TableProperties,
  Info,
  Loader2,
} from "lucide-react";
import { subscribeColors, updateColor } from "@/lib/colors";
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

const LIGHT_HEXES = new Set(["#ffffff", "#fffdd0", "#fff700", "#f1f359", "#fff04d", "#ffb6c1", "#68ffd1", "#00ffff", "#9ecc1f", "#6cf205"]);

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

function barColor(current: number, min: number): string {
  if (current < 0) return "bg-red-400";
  if (current === 0) return "bg-slate-300";
  if (current <= min) return "bg-amber-400";
  return "bg-blue-400";
}

function statusLabel(current: number, min: number): { text: string; color: string; dot: string } | null {
  if (current < 0) return { text: "Deficit", color: "text-red-500", dot: "bg-red-500" };
  if (current === 0) return { text: "Empty", color: "text-slate-400", dot: "bg-slate-300" };
  if (current <= min) return { text: "Low", color: "text-amber-500", dot: "bg-amber-400" };
  return null;
}

function makeKey(item: StockItem): string {
  return item.id;
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

export default function StockInventoryPage(): React.JSX.Element {
  const [stock, setStock] = useState<StockItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<string>("");
  const [search, setSearch] = useState("");
  const [viewMode, setViewMode] = useState<"grid" | "table">("grid");
  const [inputMap, setInputMap] = useState<Record<string, string>>({});
  const [highlightKey, setHighlightKey] = useState<string | null>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const unsubscribe = subscribeColors((colors) => {
      setStock(colors.map(colorToStockItem));
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  const categories = useMemo(
    () => [...new Set(stock.map((s) => s.category))].sort(),
    [stock]
  );

  useEffect(() => {
    if (!activeTab && categories.length > 0) {
      setActiveTab(categories[0]);
    }
  }, [categories, activeTab]);

  function getInput(key: string): string {
    return inputMap[key] ?? "";
  }

  function setInput(key: string, val: string) {
    setInputMap((prev) => ({ ...prev, [key]: val }));
  }

  function applyInput(key: string) {
    const val = parseInt(getInput(key));
    if (!isNaN(val) && val !== 0) {
      adjustStock(key, val);
    }
    setInput(key, "");
  }

  function adjustStock(id: string, amount: number) {
    const item = stock.find((s) => s.id === id);
    if (!item) return;
    const newStock = item.currentStock + amount;
    setStock((prev) =>
      prev.map((s) => s.id === id ? { ...s, currentStock: newStock } : s)
    );
    updateColor(id, { currentStock: newStock });
  }

  const handleItemClick = useCallback((item: StockItem) => {
    const key = makeKey(item);
    setActiveTab(item.category);
    setSearch("");
    setHighlightKey(key);

    setTimeout(() => {
      const el = contentRef.current?.querySelector(`[data-stock-key="${CSS.escape(key)}"]`);
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    }, 100);

    setTimeout(() => setHighlightKey(null), 3000);
  }, []);

  const tabItems = useMemo(() => {
    const q = search.toLowerCase();
    return stock.filter(
      (i) => i.category === activeTab && (!q || i.name.toLowerCase().includes(q))
    );
  }, [stock, activeTab, search]);

  const tabTotals = useMemo(() => {
    const result: Record<string, { total: number; count: number; deficit: number }> = {};
    for (const cat of categories) {
      const items = stock.filter((i) => i.category === cat);
      result[cat] = {
        total: items.reduce((s, i) => s + i.currentStock, 0),
        count: items.length,
        deficit: items.filter((i) => i.currentStock < 0).length,
      };
    }
    return result;
  }, [stock, categories]);

  const deficitItems = useMemo(() => stock.filter((i) => i.currentStock < 0), [stock]);
  const emptyLowItems = useMemo(() => stock.filter((i) => i.currentStock === 0 || (i.currentStock > 0 && i.currentStock <= i.minStock)), [stock]);
  const healthyItems = useMemo(() => stock.filter((i) => i.currentStock > i.minStock), [stock]);

  const allDeficit = deficitItems.length;
  const allEmpty = stock.filter((i) => i.currentStock === 0).length;
  const allLow = stock.filter((i) => i.currentStock > 0 && i.currentStock <= i.minStock).length;
  const allHealthy = healthyItems.length;
  const positiveTotal = stock.reduce((s, i) => s + Math.max(0, i.currentStock), 0);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 text-blue-500 animate-spin" strokeWidth={1.8} />
          <p className="text-[0.85rem] text-slate-400">Loading inventory...</p>
        </div>
      </div>
    );
  }

  if (stock.length === 0) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="flex flex-col items-center gap-3">
          <Package className="w-10 h-10 text-slate-300" strokeWidth={1.5} />
          <p className="text-[0.9rem] text-slate-400">No colors in inventory</p>
          <p className="text-[0.78rem] text-slate-300">Add colors in Color Master first</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">

      <div className="grid grid-cols-4 gap-4">
        <SummaryCard
          icon={<Package className="w-5 h-5 text-blue-500" strokeWidth={1.8} />}
          bg="bg-blue-50"
          label="Total In Stock"
          value={positiveTotal.toLocaleString()}
          valueColor="text-slate-900"
          sub={`${stock.length} colours, ${categories.length} categories`}
        />
        <SummaryCard
          icon={<AlertTriangle className="w-5 h-5 text-red-500" strokeWidth={1.8} />}
          bg="bg-red-50"
          label="Deficit"
          value={String(allDeficit)}
          valueColor="text-red-600"
          sub="Negative stock colours"
          items={deficitItems}
          onItemClick={handleItemClick}
          badgeColor="bg-red-500"
        />
        <SummaryCard
          icon={<Ban className="w-5 h-5 text-amber-500" strokeWidth={1.8} />}
          bg="bg-amber-50"
          label="Empty / Low"
          value={String(allEmpty + allLow)}
          valueColor="text-amber-600"
          sub={`${allEmpty} empty, ${allLow} low`}
          items={emptyLowItems}
          onItemClick={handleItemClick}
          badgeColor="bg-amber-500"
        />
        <SummaryCard
          icon={<CircleCheck className="w-5 h-5 text-blue-500" strokeWidth={1.8} />}
          bg="bg-blue-50"
          label="Healthy"
          value={String(allHealthy)}
          valueColor="text-blue-600"
          sub="Stock above min level"
          items={healthyItems}
          onItemClick={handleItemClick}
          badgeColor="bg-blue-500"
        />
      </div>

      <div ref={contentRef} className="bg-white rounded-2xl card-shadow overflow-hidden">
        <div className="flex items-center justify-between px-5 pt-4 pb-0">
          <div className="flex gap-1">
            {categories.map((cat) => {
              const t = tabTotals[cat];
              const active = activeTab === cat;
              return (
                <button
                  key={cat}
                  onClick={() => setActiveTab(cat)}
                  className={`relative px-5 py-3 rounded-t-xl text-[0.84rem] font-semibold transition-all ${
                    active
                      ? "bg-slate-50 text-slate-900 shadow-[inset_0_2px_0_0_var(--color-blue-400)]"
                      : "text-slate-400 hover:text-slate-600 hover:bg-slate-50/50"
                  }`}
                >
                  <span>{cat}</span>
                  {t && (
                    <>
                      <span className={`ml-2 text-[0.72rem] font-bold tabular-nums ${
                        t.total < 0 ? "text-red-500" : active ? "text-blue-600" : "text-slate-300"
                      }`}>
                        {t.total.toLocaleString()}
                      </span>
                      {t.deficit > 0 && (
                        <span className="ml-1.5 w-4 h-4 rounded-full bg-red-500 text-white text-[0.6rem] font-bold inline-flex items-center justify-center">
                          {t.deficit}
                        </span>
                      )}
                    </>
                  )}
                </button>
              );
            })}
          </div>

          <div className="flex items-center gap-2">
            <div className="flex rounded-lg border border-slate-100 overflow-hidden">
              <button
                onClick={() => setViewMode("grid")}
                className={`p-1.5 transition-colors ${
                  viewMode === "grid"
                    ? "bg-blue-50 text-blue-600"
                    : "text-slate-300 hover:text-slate-500 hover:bg-slate-50"
                }`}
              >
                <LayoutGrid className="w-4 h-4" strokeWidth={1.8} />
              </button>
              <button
                onClick={() => setViewMode("table")}
                className={`p-1.5 transition-colors ${
                  viewMode === "table"
                    ? "bg-blue-50 text-blue-600"
                    : "text-slate-300 hover:text-slate-500 hover:bg-slate-50"
                }`}
              >
                <TableProperties className="w-4 h-4" strokeWidth={1.8} />
              </button>
            </div>

            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" strokeWidth={1.8} />
              <input
                type="text"
                placeholder="Search colour..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-48 h-8 pl-8 pr-3 rounded-lg bg-slate-50 border border-slate-100 text-[0.8rem] text-slate-700 placeholder:text-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-300 transition-all"
              />
            </div>
          </div>
        </div>

        {viewMode === "grid" ? (
          <div className="bg-slate-50 px-5 py-4">
            <div className="grid grid-cols-5 gap-2.5">
              {tabItems.map((item) => {
                const key = makeKey(item);
                const deficit = item.currentStock < 0;
                const empty = item.currentStock === 0;
                const low = item.currentStock > 0 && item.currentStock <= item.minStock;
                const pct = stockPct(item.currentStock, item.maxStock);
                const status = statusLabel(item.currentStock, item.minStock);
                const minPct = stockPct(item.minStock, item.maxStock);
                const highlighted = highlightKey === key;

                return (
                  <div
                    key={key}
                    data-stock-key={key}
                    className={`group rounded-xl bg-white border transition-all hover:shadow-md ${
                      highlighted
                        ? "ring-2 ring-blue-400 border-blue-300 shadow-lg scale-[1.03]"
                        : deficit ? "border-red-200"
                        : empty || low ? "border-amber-200"
                        : "border-slate-100"
                    }`}
                  >
                    <div className="flex items-center gap-2.5 px-3 pt-2.5 pb-1">
                      <div
                        className={`w-7 h-7 rounded-lg shrink-0 ${isLight(item.hex) ? "border border-slate-200" : ""}`}
                        style={{ backgroundColor: item.hex }}
                      />
                      <div className="min-w-0 flex-1">
                        <p className="text-[0.78rem] font-semibold text-slate-800 truncate leading-tight">
                          {item.name}
                        </p>
                        <div className="flex items-baseline gap-1.5 mt-0.5">
                          <span className={`text-[1.05rem] font-bold tabular-nums leading-none ${
                            deficit ? "text-red-600" :
                            empty ? "text-slate-400" :
                            low ? "text-amber-600" :
                            "text-slate-800"
                          }`}>
                            {item.currentStock}
                          </span>
                          <span className="text-[0.6rem] text-slate-300 tabular-nums">
                            / {item.maxStock}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="px-3 pb-1.5">
                      <div className="relative h-1.5 rounded-full bg-slate-100 overflow-hidden">
                        {deficit ? (
                          <div
                            className="absolute inset-y-0 left-0 rounded-full bg-red-400 animate-pulse"
                            style={{ width: "100%" }}
                          />
                        ) : (
                          <div
                            className={`absolute inset-y-0 left-0 rounded-full transition-all duration-300 ${barColor(item.currentStock, item.minStock)}`}
                            style={{ width: `${pct}%` }}
                          />
                        )}
                        <div
                          className="absolute top-0 bottom-0 w-px bg-slate-300"
                          style={{ left: `${minPct}%` }}
                          title={`Min: ${item.minStock}`}
                        />
                      </div>
                      <div className="flex items-center justify-between mt-0.5">
                        <span className="text-[0.55rem] text-slate-300 tabular-nums">
                          min {item.minStock}
                        </span>
                        {status ? (
                          <span className={`text-[0.55rem] font-semibold uppercase tracking-wide ${status.color}`}>
                            {status.text}
                          </span>
                        ) : (
                          <span className="text-[0.55rem] text-slate-300 tabular-nums">
                            max {item.maxStock}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-1 px-2 pb-2 pt-1 border-t border-slate-50">
                      <button
                        onClick={() => adjustStock(item.id, -1)}
                        className="flex items-center gap-0.5 h-6 px-1.5 rounded-md bg-red-50 text-red-500 hover:bg-red-100 transition-colors shrink-0"
                      >
                        <Minus className="w-3 h-3" strokeWidth={2.5} />
                        <span className="text-[0.62rem] font-bold">1</span>
                      </button>
                      <input
                        type="number"
                        placeholder="qty"
                        value={getInput(key)}
                        onChange={(e) => setInput(key, e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && applyInput(key)}
                        onBlur={() => applyInput(key)}
                        className="w-full h-6 text-center rounded-md bg-slate-50 border border-slate-100 text-[0.72rem] font-bold text-slate-700 placeholder:text-slate-300 placeholder:font-normal focus:outline-none focus:ring-1 focus:ring-blue-200 transition-all [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                      />
                      <button
                        onClick={() => adjustStock(item.id, 3)}
                        className="flex items-center gap-0.5 h-6 px-1.5 rounded-md bg-blue-50 text-blue-600 hover:bg-blue-100 transition-colors shrink-0"
                      >
                        <Plus className="w-3 h-3" strokeWidth={2.5} />
                        <span className="text-[0.62rem] font-bold">3</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {tabItems.length === 0 && (
              <div className="py-12 text-center">
                <p className="text-[0.9rem] text-slate-400">No colours found</p>
                <p className="text-[0.78rem] text-slate-300 mt-1">Try a different search</p>
              </div>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full table-fixed">
              <colgroup>
                <col className="w-[38px]" />
                <col />
                <col className="w-[90px]" />
                <col className="w-[160px]" />
                <col className="w-[70px]" />
                <col className="w-[70px]" />
                <col className="w-[180px]" />
              </colgroup>
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50">
                  <th className="px-5 py-2.5 text-left text-[0.68rem] font-semibold uppercase tracking-widest text-slate-400" colSpan={2}>
                    Colour
                  </th>
                  <th className="px-2 py-2.5 text-right text-[0.68rem] font-semibold uppercase tracking-widest text-slate-400">
                    Stock
                  </th>
                  <th className="px-3 py-2.5 text-left text-[0.68rem] font-semibold uppercase tracking-widest text-slate-400">
                    Level
                  </th>
                  <th className="px-2 py-2.5 text-center text-[0.68rem] font-semibold uppercase tracking-widest text-slate-400">
                    Min
                  </th>
                  <th className="px-2 py-2.5 text-center text-[0.68rem] font-semibold uppercase tracking-widest text-slate-400">
                    Max
                  </th>
                  <th className="px-5 py-2.5 text-center text-[0.68rem] font-semibold uppercase tracking-widest text-slate-400">
                    Action
                  </th>
                </tr>
              </thead>
              <tbody>
                {tabItems.map((item, idx) => {
                  const key = makeKey(item);
                  const deficit = item.currentStock < 0;
                  const empty = item.currentStock === 0;
                  const pct = stockPct(item.currentStock, item.maxStock);
                  const minPct = stockPct(item.minStock, item.maxStock);
                  const status = statusLabel(item.currentStock, item.minStock);
                  const highlighted = highlightKey === key;

                  return (
                    <tr
                      key={key}
                      data-stock-key={key}
                      className={`border-b border-slate-50 transition-all hover:bg-slate-50/60 ${
                        highlighted
                          ? "!bg-blue-50 ring-2 ring-inset ring-blue-400"
                          : deficit ? "bg-red-50/40" : ""
                      } ${!highlighted && idx % 2 !== 0 ? "bg-slate-50/30" : ""}`}
                    >
                      <td className="pl-5 py-2">
                        <div
                          className={`w-6 h-6 rounded-md shrink-0 ${isLight(item.hex) ? "border border-slate-200" : ""}`}
                          style={{ backgroundColor: item.hex }}
                        />
                      </td>
                      <td className="px-2 py-2">
                        <span className="text-[0.82rem] font-semibold text-slate-800">
                          {item.name}
                        </span>
                      </td>
                      <td className="px-2 py-2 text-right">
                        <div className="flex items-baseline justify-end gap-1">
                          <span className={`text-[0.88rem] font-bold tabular-nums ${
                            deficit ? "text-red-600" :
                            empty ? "text-slate-400" :
                            "text-slate-800"
                          }`}>
                            {item.currentStock}
                          </span>
                          {status && (
                            <span className={`text-[0.55rem] font-semibold uppercase ${status.color}`}>
                              {status.text}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-3 py-2">
                        <div className="relative h-2 rounded-full bg-slate-100 overflow-hidden">
                          {deficit ? (
                            <div className="absolute inset-y-0 left-0 rounded-full bg-red-400 animate-pulse w-full" />
                          ) : (
                            <div
                              className={`absolute inset-y-0 left-0 rounded-full transition-all duration-300 ${barColor(item.currentStock, item.minStock)}`}
                              style={{ width: `${pct}%` }}
                            />
                          )}
                          <div
                            className="absolute top-0 bottom-0 w-px bg-slate-400/50"
                            style={{ left: `${minPct}%` }}
                          />
                        </div>
                      </td>
                      <td className="px-2 py-2 text-center text-[0.75rem] text-slate-400 tabular-nums">
                        {item.minStock}
                      </td>
                      <td className="px-2 py-2 text-center text-[0.75rem] text-slate-400 tabular-nums">
                        {item.maxStock}
                      </td>
                      <td className="px-5 py-2">
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
                            placeholder="qty"
                            value={getInput(key)}
                            onChange={(e) => setInput(key, e.target.value)}
                            onKeyDown={(e) => e.key === "Enter" && applyInput(key)}
                            onBlur={() => applyInput(key)}
                            className="w-16 h-7 text-center rounded-lg bg-slate-50 border border-slate-100 text-[0.75rem] font-bold text-slate-700 placeholder:text-slate-300 placeholder:font-normal focus:outline-none focus:ring-1 focus:ring-blue-200 transition-all [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                          />
                          <button
                            onClick={() => adjustStock(item.id, 3)}
                            className="flex items-center gap-0.5 h-7 px-2 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 transition-colors shrink-0"
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
              <div className="py-12 text-center">
                <p className="text-[0.9rem] text-slate-400">No colours found</p>
                <p className="text-[0.78rem] text-slate-300 mt-1">Try a different search</p>
              </div>
            )}
          </div>
        )}

        <div className="flex items-center justify-between px-5 py-3 border-t border-slate-100 bg-white">
          <p className="text-[0.78rem] text-slate-400">
            {tabItems.length} colours in <span className="font-semibold text-slate-600">{activeTab}</span>
          </p>
          {tabTotals[activeTab] && (
            <p className={`text-[0.82rem] font-bold tabular-nums ${tabTotals[activeTab].total < 0 ? "text-red-600" : "text-slate-800"}`}>
              Total: {tabTotals[activeTab].total.toLocaleString()}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

function SummaryCard({ icon, bg, label, value, valueColor, sub, items, onItemClick, badgeColor }: {
  icon: React.ReactNode;
  bg: string;
  label: string;
  value: string;
  valueColor: string;
  sub: string;
  items?: StockItem[];
  onItemClick?: (item: StockItem) => void;
  badgeColor?: string;
}) {
  const [open, setOpen] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function handleClickOutside(e: MouseEvent) {
      if (cardRef.current && !cardRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  const hasPopup = items && items.length > 0;

  const grouped = useMemo(() => {
    if (!items) return {};
    const map: Record<string, StockItem[]> = {};
    for (const item of items) {
      (map[item.category] ??= []).push(item);
    }
    return map;
  }, [items]);

  return (
    <div ref={cardRef} className="relative bg-white rounded-2xl card-shadow p-5">
      <div className="flex items-center gap-3 mb-1">
        <div className={`w-10 h-10 rounded-xl ${bg} flex items-center justify-center`}>
          {icon}
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-1.5">
            <p className="text-[0.68rem] font-semibold uppercase tracking-widest text-slate-400">{label}</p>
            {hasPopup && (
              <button
                onMouseEnter={() => setOpen(true)}
                onClick={() => setOpen((p) => !p)}
                className="p-0.5 rounded-full text-slate-300 hover:text-blue-500 hover:bg-blue-50 transition-colors"
              >
                <Info className="w-3.5 h-3.5" strokeWidth={2} />
              </button>
            )}
          </div>
          <p className={`text-xl font-bold ${valueColor}`}>{value}</p>
        </div>
      </div>
      <p className="text-[0.72rem] text-slate-400 mt-2">{sub}</p>

      {hasPopup && open && (
        <div
          className="absolute top-full left-0 right-0 mt-2 z-50 bg-white rounded-xl border border-slate-100 shadow-xl animate-[fadeIn_150ms_ease-out]"
          onMouseLeave={() => setOpen(false)}
        >
          <div className="px-3.5 pt-3 pb-1.5">
            <p className="text-[0.7rem] font-semibold text-slate-500 uppercase tracking-widest">
              {label} <span className="text-slate-300">({items.length})</span>
            </p>
          </div>
          <div className="max-h-[240px] overflow-y-auto px-1.5 pb-2">
            {Object.entries(grouped).map(([cat, catItems]) => (
              <div key={cat}>
                <p className="px-2 pt-2 pb-1 text-[0.62rem] font-bold uppercase tracking-widest text-slate-300">
                  {cat}
                </p>
                {catItems.map((item) => (
                  <button
                    key={makeKey(item)}
                    onClick={() => {
                      onItemClick?.(item);
                      setOpen(false);
                    }}
                    className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-slate-50 transition-colors group"
                  >
                    <div
                      className={`w-4 h-4 rounded shrink-0 ${isLight(item.hex) ? "border border-slate-200" : ""}`}
                      style={{ backgroundColor: item.hex }}
                    />
                    <span className="text-[0.76rem] font-medium text-slate-700 group-hover:text-slate-900 truncate text-left flex-1">
                      {item.name}
                    </span>
                    <span className={`text-[0.72rem] font-bold tabular-nums shrink-0 ${
                      item.currentStock < 0 ? "text-red-500" :
                      item.currentStock === 0 ? "text-slate-400" :
                      "text-slate-600"
                    }`}>
                      {item.currentStock}
                    </span>
                  </button>
                ))}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
