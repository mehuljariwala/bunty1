"use client";

import { useState, useRef, useMemo, useEffect } from "react";
import { Plus, Search, Filter, X, Pencil, Trash2, Loader2 } from "lucide-react";
import AddColorModal, { type ColorFormData } from "@/components/AddColorModal";
import { addColor, updateColor, deleteColor } from "@/lib/colors";
import { useColorsQuery, useInvalidate } from "@/hooks/use-queries";
import { useTracker } from "@/lib/activity-tracker-context";
import type { Color } from "@/lib/types";

interface ColorRow {
  id: string;
  name: string;
  code: string;
  hex: string;
  category: string;
  subCategory: string;
  minStock: string;
  maxStock: string;
  currentStock: string;
  runningColor: boolean;
  createdAt: string;
}

type FilterState = {
  categories: string[];
  runningOnly: boolean;
  stockFilter: "all" | "low" | "ok" | "high";
};

const EMPTY_FILTERS: FilterState = { categories: [], runningOnly: false, stockFilter: "all" };
const STOCK_LABEL: Record<string, string> = { low: "Low", ok: "OK", high: "High" };

function stockStatus(current: number | string, min: number | string, max: number | string): "low" | "ok" | "high" {
  const c = Number(current), mn = Number(min), mx = Number(max);
  if (c >= mx) return "high";
  if (c <= mn) return "low";
  return "ok";
}

function colorToRow(c: Color): ColorRow {
  return {
    id: c.id,
    name: c.name,
    code: c.code,
    hex: c.hex,
    category: c.category,
    subCategory: c.subCategory,
    minStock: String(c.minStock),
    maxStock: String(c.maxStock),
    currentStock: String(c.currentStock),
    runningColor: c.runningColor,
    createdAt: c.createdAt,
  };
}

export default function ColorMasterPage(): React.JSX.Element {
  const { trackColorAdded, trackColorEdited, trackColorDeleted } = useTracker();
  const { data: rawColors = [], isLoading: loading } = useColorsQuery();
  const invalidate = useInvalidate();
  const colors = useMemo(() => rawColors.map(colorToRow), [rawColors]);
  const [modalOpen, setModalOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [filterOpen, setFilterOpen] = useState(false);
  const [filters, setFilters] = useState<FilterState>(EMPTY_FILTERS);
  const [editingColor, setEditingColor] = useState<ColorRow | null>(null);
  const filterRef = useRef<HTMLDivElement>(null);

  const PRESET_CATEGORIES = ["3 Tar", "5 Tar", "Yarn", "3 Tar Button", "5 Tar Button", "6 Tar Button"];
  const PRESET_SUB_CATEGORIES = ["Celtionic", "Litchy", "Multy", "Polyester", "Rani multy", "ANT/ANMLIPANI", "PAL MAT", "SILVER"];

  const categories = useMemo(() => {
    const all = [...new Set([...PRESET_CATEGORIES, ...colors.map((c) => c.category)])];
    const order = PRESET_CATEGORIES;
    return all.sort((a, b) => {
      const ai = order.indexOf(a);
      const bi = order.indexOf(b);
      if (ai !== -1 && bi !== -1) return ai - bi;
      if (ai !== -1) return -1;
      if (bi !== -1) return 1;
      return a.localeCompare(b);
    });
  }, [colors]);

  const subCategories = useMemo(
    () => [...new Set([...PRESET_SUB_CATEGORIES, ...colors.map((c) => c.subCategory).filter(Boolean)])].sort(),
    [colors]
  );

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (filterRef.current && !filterRef.current.contains(e.target as Node)) {
        setFilterOpen(false);
      }
    }
    if (filterOpen) document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [filterOpen]);

  const activeFilterCount =
    filters.categories.length +
    (filters.runningOnly ? 1 : 0) +
    (filters.stockFilter !== "all" ? 1 : 0);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return colors.filter((c) => {
      const matchesSearch =
        !q ||
        c.name.toLowerCase().includes(q) ||
        c.code.toLowerCase().includes(q) ||
        c.category.toLowerCase().includes(q) ||
        c.subCategory.toLowerCase().includes(q);
      const matchesCat =
        filters.categories.length === 0 || filters.categories.includes(c.category);
      const matchesRunning = !filters.runningOnly || c.runningColor;
      const matchesStock =
        filters.stockFilter === "all" ||
        stockStatus(c.currentStock, c.minStock, c.maxStock) === filters.stockFilter;
      return matchesSearch && matchesCat && matchesRunning && matchesStock;
    });
  }, [colors, search, filters]);

  async function handleSubmit(data: ColorFormData): Promise<void> {
    if (editingColor) {
      await updateColor(editingColor.id, {
        name: data.name,
        code: data.code,
        hex: data.hex,
        category: data.category,
        subCategory: data.subCategory,
        minStock: Number(data.minStock) || 0,
        maxStock: Number(data.maxStock) || 0,
        currentStock: Number(data.currentStock) || 0,
        runningColor: data.runningColor,
      });
      trackColorEdited({ colorName: data.name, category: data.category });
      invalidate.colors();
      setEditingColor(null);
    } else {
      const now = new Date().toISOString().slice(0, 10);
      await addColor({
        name: data.name,
        code: data.code,
        hex: data.hex,
        category: data.category,
        subCategory: data.subCategory,
        minStock: Number(data.minStock) || 0,
        maxStock: Number(data.maxStock) || 0,
        currentStock: Number(data.currentStock) || 0,
        runningColor: data.runningColor,
        sortOrder: 999,
        createdAt: now,
      });
      trackColorAdded({ colorName: data.name, category: data.category });
      invalidate.colors();
    }
  }

  function handleEdit(variant: ColorRow) {
    setEditingColor(variant);
    setModalOpen(true);
  }

  function handleCloseModal() {
    setModalOpen(false);
    setEditingColor(null);
  }

  async function handleDelete(id: string): Promise<void> {
    const color = colors.find((c) => c.id === id);
    await deleteColor(id);
    invalidate.colors();
    if (color) {
      trackColorDeleted({ colorName: color.name, category: color.category });
    }
  }

  function toggleCategory(cat: string) {
    setFilters((prev) => ({
      ...prev,
      categories: prev.categories.includes(cat)
        ? prev.categories.filter((c) => c !== cat)
        : [...prev.categories, cat],
    }));
  }

  function clearFilters() {
    setFilters(EMPTY_FILTERS);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 text-blue-500 animate-spin" strokeWidth={1.8} />
          <p className="text-[0.85rem] text-slate-400">Loading colors...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:justify-between">
        <p className="text-[0.85rem] text-crm-text-muted">
          {filtered.length} colours
        </p>
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <div className="relative flex-1 sm:flex-initial">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" strokeWidth={1.8} />
            <input
              type="text"
              placeholder="Search name, code, category..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full sm:w-64 h-9 pl-9 pr-4 rounded-xl bg-white border border-slate-100 text-[0.85rem] text-slate-700 placeholder:text-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-300 transition-all"
            />
          </div>

          <div className="relative" ref={filterRef}>
            <button
              onClick={() => setFilterOpen((v) => !v)}
              className={`flex items-center gap-2 h-9 px-3 rounded-xl border text-[0.82rem] font-medium transition-colors ${
                activeFilterCount > 0
                  ? "bg-blue-50 border-blue-200 text-blue-700"
                  : "bg-white border-slate-100 text-slate-600 hover:bg-slate-50"
              }`}
            >
              <Filter className="w-3.5 h-3.5" strokeWidth={1.8} />
              Filter
              {activeFilterCount > 0 && (
                <span className="w-5 h-5 rounded-full bg-blue-500 text-white text-[0.68rem] font-bold flex items-center justify-center">
                  {activeFilterCount}
                </span>
              )}
            </button>

            {filterOpen && (
              <div className="absolute right-0 top-full mt-2 w-64 bg-white rounded-xl border border-slate-100 shadow-lg z-40 animate-[fadeIn_150ms_ease-out]">
                <div className="flex items-center justify-between px-4 pt-3.5 pb-2">
                  <p className="text-[0.82rem] font-semibold text-slate-800">Filters</p>
                  {activeFilterCount > 0 && (
                    <button onClick={clearFilters} className="text-[0.72rem] font-medium text-orange-500 hover:text-orange-600 transition-colors">
                      Clear all
                    </button>
                  )}
                </div>

                <div className="px-4 pb-3">
                  <p className="text-[0.68rem] font-semibold uppercase tracking-widest text-slate-400 mb-2">Category</p>
                  <div className="flex flex-wrap gap-1.5">
                    {categories.map((cat) => (
                      <button
                        key={cat}
                        onClick={() => toggleCategory(cat)}
                        className={`px-2.5 py-1 rounded-lg text-[0.78rem] font-medium transition-colors ${
                          filters.categories.includes(cat)
                            ? "bg-blue-500 text-white"
                            : "bg-slate-50 text-slate-600 hover:bg-slate-100"
                        }`}
                      >
                        {cat}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="border-t border-slate-100 px-4 py-3">
                  <p className="text-[0.68rem] font-semibold uppercase tracking-widest text-slate-400 mb-2">Stock Level</p>
                  <div className="flex flex-wrap gap-1.5">
                    {(["all", "low", "ok", "high"] as const).map((val) => (
                      <button
                        key={val}
                        onClick={() => setFilters((prev) => ({ ...prev, stockFilter: val }))}
                        className={`px-2.5 py-1 rounded-lg text-[0.78rem] font-medium transition-colors capitalize ${
                          filters.stockFilter === val
                            ? "bg-blue-500 text-white"
                            : "bg-slate-50 text-slate-600 hover:bg-slate-100"
                        }`}
                      >
                        {val === "all" ? "All" : STOCK_LABEL[val]}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="border-t border-slate-100 px-4 py-3">
                  <label className="flex items-center gap-2.5 cursor-pointer">
                    <div className="relative">
                      <input
                        type="checkbox"
                        checked={filters.runningOnly}
                        onChange={(e) => setFilters((prev) => ({ ...prev, runningOnly: e.target.checked }))}
                        className="sr-only peer"
                      />
                      <div className="w-8 h-[18px] rounded-full bg-slate-200 peer-checked:bg-blue-500 transition-colors" />
                      <div className="absolute top-[1px] left-[1px] w-4 h-4 rounded-full bg-white shadow-sm peer-checked:translate-x-[14px] transition-transform" />
                    </div>
                    <span className="text-[0.8rem] font-medium text-slate-700">Running colors only</span>
                  </label>
                </div>
              </div>
            )}
          </div>

          <button
            onClick={() => setModalOpen(true)}
            className="flex items-center gap-2 h-9 px-3 sm:px-4 rounded-xl bg-blue-500 text-white text-[0.82rem] font-medium hover:bg-blue-600 transition-colors shadow-sm"
          >
            <Plus className="w-4 h-4 shrink-0" strokeWidth={2.2} />
            <span className="hidden sm:inline">Add Color</span>
          </button>
        </div>
      </div>

      {activeFilterCount > 0 && (
        <div className="flex items-center gap-2 flex-wrap">
          {filters.categories.map((cat) => (
            <span key={cat} className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-blue-50 border border-blue-100 text-[0.78rem] font-medium text-blue-700">
              {cat}
              <button onClick={() => toggleCategory(cat)} className="hover:text-orange-500 transition-colors"><X className="w-3 h-3" strokeWidth={2} /></button>
            </span>
          ))}
          {filters.stockFilter !== "all" && (
            <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-blue-50 border border-blue-100 text-[0.78rem] font-medium text-blue-700">
              Stock: {STOCK_LABEL[filters.stockFilter]}
              <button onClick={() => setFilters((p) => ({ ...p, stockFilter: "all" }))} className="hover:text-orange-500 transition-colors"><X className="w-3 h-3" strokeWidth={2} /></button>
            </span>
          )}
          {filters.runningOnly && (
            <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-blue-50 border border-blue-100 text-[0.78rem] font-medium text-blue-700">
              Running only
              <button onClick={() => setFilters((p) => ({ ...p, runningOnly: false }))} className="hover:text-orange-500 transition-colors"><X className="w-3 h-3" strokeWidth={2} /></button>
            </span>
          )}
          <button onClick={clearFilters} className="text-[0.76rem] font-medium text-slate-400 hover:text-orange-500 transition-colors ml-1">Clear all</button>
        </div>
      )}

      {/* Mobile card layout */}
      <div className="md:hidden space-y-2">
        {filtered.map((c) => {
          const status = stockStatus(c.currentStock, c.minStock, c.maxStock);
          const current = Number(c.currentStock) || 0;
          const max = Number(c.maxStock) || 1;
          const pct = Math.min(Math.round((current / max) * 100), 100);
          const barColor = status === "low" ? "bg-red-500" : status === "high" ? "bg-emerald-500" : "bg-crm-primary";

          return (
            <div key={c.id} className="bg-crm-card rounded-xl card-shadow border border-crm-border px-3 py-2.5">
              <div className="flex items-center gap-2.5">
                <span
                  className="w-7 h-7 rounded-md shrink-0 border border-crm-border"
                  style={{ backgroundColor: c.hex }}
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-[0.8rem] font-medium text-crm-text truncate">{c.name}</p>
                    <div className="flex items-center gap-1 shrink-0">
                      <span className={`px-1.5 py-px rounded text-[0.62rem] font-semibold ${
                        c.runningColor
                          ? "bg-emerald-500/10 text-emerald-600"
                          : "bg-crm-bg text-crm-text-muted"
                      }`}>
                        {c.runningColor ? "ON" : "OFF"}
                      </span>
                      <button
                        onClick={() => handleEdit(c)}
                        className="p-1 rounded-md hover:bg-crm-primary-muted transition-colors text-crm-border hover:text-crm-primary"
                      >
                        <Pencil className="w-3 h-3" strokeWidth={1.8} />
                      </button>
                      <button
                        onClick={() => handleDelete(c.id)}
                        className="p-1 rounded-md hover:bg-red-50 transition-colors text-crm-border hover:text-red-500"
                      >
                        <Trash2 className="w-3 h-3" strokeWidth={1.8} />
                      </button>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-[0.68rem] text-crm-text-muted">{c.category}</span>
                    <span className="text-[0.55rem] text-crm-border">•</span>
                    <span className="text-[0.68rem] text-crm-text-muted">{c.subCategory}</span>
                  </div>
                </div>
              </div>

              <div className="mt-2 flex items-center gap-2.5">
                <div className="flex-1 h-1.5 rounded-full bg-crm-border/30 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${barColor}`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <span className={`text-[0.68rem] font-semibold tabular-nums shrink-0 ${
                  status === "low" ? "text-red-500" : status === "high" ? "text-emerald-600" : "text-crm-text"
                }`}>
                  {c.currentStock}<span className="text-crm-text-muted font-normal">/{c.maxStock}</span>
                </span>
              </div>
            </div>
          );
        })}

        {filtered.length === 0 && (
          <div className="py-12 text-center">
            <p className="text-[0.9rem] text-crm-text-muted">No colours found</p>
            <p className="text-[0.78rem] text-crm-border mt-1">
              {activeFilterCount > 0 ? "Try adjusting your filters" : "Try a different search term"}
            </p>
          </div>
        )}
      </div>

      {/* Desktop table layout */}
      <div className="hidden md:block bg-crm-card rounded-2xl card-shadow border border-crm-border overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b-2 border-crm-border">
              <th className="text-left px-5 py-3.5 text-[0.8rem] font-bold text-crm-text w-16">Id</th>
              <th className="text-left px-5 py-3.5 text-[0.8rem] font-bold text-crm-text">Category</th>
              <th className="text-left px-5 py-3.5 text-[0.8rem] font-bold text-crm-text">Sub Category</th>
              <th className="text-left px-5 py-3.5 text-[0.8rem] font-bold text-crm-text">Colour Name</th>
              <th className="text-left px-5 py-3.5 text-[0.8rem] font-bold text-crm-text">Colour Code</th>
              <th className="text-left px-5 py-3.5 text-[0.8rem] font-bold text-crm-text">Colour Stock</th>
              <th className="text-left px-5 py-3.5 text-[0.8rem] font-bold text-crm-text">Status</th>
              <th className="w-20"></th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((c, i) => (
              <tr
                key={c.id}
                className={`border-b border-crm-border/40 transition-colors hover:bg-crm-primary-muted/20 ${
                  i % 2 === 1 ? "bg-crm-bg/30" : "bg-crm-card"
                }`}
              >
                <td className="px-5 py-3 text-[0.84rem] font-medium text-crm-text-muted">{i + 1}</td>
                <td className="px-5 py-3 text-[0.84rem] text-crm-text">{c.category}</td>
                <td className="px-5 py-3 text-[0.84rem] text-crm-text">{c.subCategory}</td>
                <td className="px-5 py-3">
                  <div className="flex items-center gap-2">
                    <span
                      className="w-4 h-4 rounded shrink-0 border border-crm-border"
                      style={{ backgroundColor: c.hex }}
                    />
                    <span className="text-[0.84rem] font-medium text-crm-text">{c.name}</span>
                  </div>
                </td>
                <td className="px-5 py-3 text-[0.84rem] font-mono text-crm-text-muted">{c.hex}</td>
                <td className="px-5 py-3 text-[0.84rem] font-medium text-crm-text">{c.currentStock}</td>
                <td className="px-5 py-3">
                  <span className={`inline-block px-3 py-1 rounded-md text-[0.78rem] font-semibold ${
                    c.runningColor
                      ? "bg-emerald-500 text-white"
                      : "bg-crm-bg text-crm-text-muted"
                  }`}>
                    {c.runningColor ? "Enable" : "Disable"}
                  </span>
                </td>
                <td className="px-3 py-3">
                  <div className="flex items-center gap-0.5">
                    <button
                      onClick={() => handleEdit(c)}
                      className="p-1.5 rounded-lg hover:bg-crm-primary-muted transition-colors text-crm-border hover:text-crm-primary"
                    >
                      <Pencil className="w-3.5 h-3.5" strokeWidth={1.8} />
                    </button>
                    <button
                      onClick={() => handleDelete(c.id)}
                      className="p-1.5 rounded-lg hover:bg-red-50 transition-colors text-crm-border hover:text-red-500"
                    >
                      <Trash2 className="w-3.5 h-3.5" strokeWidth={1.8} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {filtered.length === 0 && (
          <div className="py-12 text-center">
            <p className="text-[0.9rem] text-crm-text-muted">No colours found</p>
            <p className="text-[0.78rem] text-crm-border mt-1">
              {activeFilterCount > 0 ? "Try adjusting your filters" : "Try a different search term"}
            </p>
          </div>
        )}
      </div>

      <AddColorModal
        open={modalOpen}
        onClose={handleCloseModal}
        onAdd={handleSubmit}
        categories={categories}
        subCategories={subCategories}
        editData={editingColor ? {
          name: editingColor.name,
          code: editingColor.code,
          hex: editingColor.hex,
          category: editingColor.category,
          subCategory: editingColor.subCategory,
          minStock: editingColor.minStock,
          maxStock: editingColor.maxStock,
          currentStock: editingColor.currentStock,
          runningColor: editingColor.runningColor,
        } : null}
      />
    </div>
  );
}

