"use client";

import { useState, useRef, useEffect, useMemo, useCallback } from "react";
import { Plus, Search, Filter, X, Pencil, Trash2, CircleCheck, ArrowDown, ArrowUp, Loader2, ChevronRight, ChevronDown } from "lucide-react";
import AddColorModal, { type ColorFormData } from "@/components/AddColorModal";
import { subscribeColors, addColor, updateColor, deleteColor } from "@/lib/colors";
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

interface ColorGroup {
  key: string;
  name: string;
  hex: string;
  subCategory: string;
  hasRunning: boolean;
  variants: Map<string, ColorRow>;
}

function stockStatus(current: string, min: string, max: string): "low" | "ok" | "high" {
  const c = Number(current), mn = Number(min), mx = Number(max);
  if (c <= mn) return "low";
  if (c >= mx * 0.9) return "high";
  return "ok";
}

const STOCK_STYLES = {
  low: "bg-red-50 text-red-600",
  ok: "bg-sage-50 text-sage-600",
  high: "bg-sky-50 text-sky-600",
};

const STOCK_DOT = {
  low: "bg-red-400",
  ok: "bg-sage-400",
  high: "bg-sky-400",
};

const STOCK_LABEL = { low: "Low", ok: "OK", high: "Full" };

const CATEGORY_ORDER = ["5 Tar", "3 Tar", "Yarn"] as const;

type FilterState = {
  categories: string[];
  runningOnly: boolean;
  stockFilter: "all" | "low" | "ok" | "high";
};

const EMPTY_FILTERS: FilterState = { categories: [], runningOnly: false, stockFilter: "all" };

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

function StockBadge({ variant }: { variant: ColorRow | undefined }): React.JSX.Element {
  if (!variant) {
    return <span className="text-[0.72rem] text-slate-warm-300">—</span>;
  }
  const status = stockStatus(variant.currentStock, variant.minStock, variant.maxStock);
  return (
    <div className="flex items-center justify-center gap-1.5">
      <span className="text-[0.78rem] font-medium text-slate-warm-700">{variant.currentStock}</span>
      <span className={`w-2 h-2 rounded-full ${STOCK_DOT[status]}`} />
    </div>
  );
}

export default function ColorMasterPage(): React.JSX.Element {
  const [colors, setColors] = useState<ColorRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [filterOpen, setFilterOpen] = useState(false);
  const [filters, setFilters] = useState<FilterState>(EMPTY_FILTERS);
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const [editingColor, setEditingColor] = useState<ColorRow | null>(null);
  const filterRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const unsubscribe = subscribeColors((updated) => {
      setColors(updated.map(colorToRow));
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  const categories = useMemo(
    () => [...new Set(colors.map((c) => c.category))].sort(),
    [colors]
  );

  const subCategories = useMemo(
    () => [...new Set(colors.map((c) => c.subCategory).filter(Boolean))].sort(),
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

  const groupedColors = useMemo(() => {
    const map = new Map<string, ColorGroup>();
    for (const c of filtered) {
      const key = `${c.name}::${c.hex}`;
      let group = map.get(key);
      if (!group) {
        group = {
          key,
          name: c.name,
          hex: c.hex,
          subCategory: c.subCategory,
          hasRunning: false,
          variants: new Map(),
        };
        map.set(key, group);
      }
      group.variants.set(c.category, c);
      if (c.runningColor) group.hasRunning = true;
      if (c.subCategory && !group.subCategory) group.subCategory = c.subCategory;
    }
    return [...map.values()].sort((a, b) => a.name.localeCompare(b.name));
  }, [filtered]);

  const toggleGroup = useCallback((key: string) => {
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }, []);

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
    await deleteColor(id);
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
          <Loader2 className="w-8 h-8 text-sage-500 animate-spin" strokeWidth={1.8} />
          <p className="text-[0.85rem] text-slate-warm-400">Loading colors...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:justify-between">
        <p className="text-[0.85rem] text-slate-warm-400">
          {groupedColors.length} colors{" "}
          <span className="text-slate-warm-300">({filtered.length} entries)</span>
        </p>
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <div className="relative flex-1 sm:flex-initial">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-warm-400" strokeWidth={1.8} />
            <input
              type="text"
              placeholder="Search name, code, category..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full sm:w-64 h-9 pl-9 pr-4 rounded-xl bg-white border border-slate-warm-100 text-[0.85rem] text-slate-warm-700 placeholder:text-slate-warm-300 focus:outline-none focus:ring-2 focus:ring-sage-200 focus:border-sage-300 transition-all"
            />
          </div>

          <div className="relative" ref={filterRef}>
            <button
              onClick={() => setFilterOpen((v) => !v)}
              className={`flex items-center gap-2 h-9 px-3 rounded-xl border text-[0.82rem] font-medium transition-colors ${
                activeFilterCount > 0
                  ? "bg-sage-50 border-sage-200 text-sage-700"
                  : "bg-white border-slate-warm-100 text-slate-warm-600 hover:bg-cream-50"
              }`}
            >
              <Filter className="w-3.5 h-3.5" strokeWidth={1.8} />
              Filter
              {activeFilterCount > 0 && (
                <span className="w-5 h-5 rounded-full bg-sage-500 text-white text-[0.68rem] font-bold flex items-center justify-center">
                  {activeFilterCount}
                </span>
              )}
            </button>

            {filterOpen && (
              <div className="absolute right-0 top-full mt-2 w-64 bg-white rounded-xl border border-slate-warm-100 shadow-lg z-40 animate-[fadeIn_150ms_ease-out]">
                <div className="flex items-center justify-between px-4 pt-3.5 pb-2">
                  <p className="text-[0.82rem] font-semibold text-slate-warm-800">Filters</p>
                  {activeFilterCount > 0 && (
                    <button onClick={clearFilters} className="text-[0.72rem] font-medium text-coral-500 hover:text-coral-600 transition-colors">
                      Clear all
                    </button>
                  )}
                </div>

                <div className="px-4 pb-3">
                  <p className="text-[0.68rem] font-semibold uppercase tracking-widest text-slate-warm-400 mb-2">Category</p>
                  <div className="flex flex-wrap gap-1.5">
                    {categories.map((cat) => (
                      <button
                        key={cat}
                        onClick={() => toggleCategory(cat)}
                        className={`px-2.5 py-1 rounded-lg text-[0.78rem] font-medium transition-colors ${
                          filters.categories.includes(cat)
                            ? "bg-sage-500 text-white"
                            : "bg-cream-50 text-slate-warm-600 hover:bg-cream-100"
                        }`}
                      >
                        {cat}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="border-t border-slate-warm-100 px-4 py-3">
                  <p className="text-[0.68rem] font-semibold uppercase tracking-widest text-slate-warm-400 mb-2">Stock Level</p>
                  <div className="flex flex-wrap gap-1.5">
                    {(["all", "low", "ok", "high"] as const).map((val) => (
                      <button
                        key={val}
                        onClick={() => setFilters((prev) => ({ ...prev, stockFilter: val }))}
                        className={`px-2.5 py-1 rounded-lg text-[0.78rem] font-medium transition-colors capitalize ${
                          filters.stockFilter === val
                            ? "bg-sage-500 text-white"
                            : "bg-cream-50 text-slate-warm-600 hover:bg-cream-100"
                        }`}
                      >
                        {val === "all" ? "All" : STOCK_LABEL[val]}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="border-t border-slate-warm-100 px-4 py-3">
                  <label className="flex items-center gap-2.5 cursor-pointer">
                    <div className="relative">
                      <input
                        type="checkbox"
                        checked={filters.runningOnly}
                        onChange={(e) => setFilters((prev) => ({ ...prev, runningOnly: e.target.checked }))}
                        className="sr-only peer"
                      />
                      <div className="w-8 h-[18px] rounded-full bg-slate-warm-200 peer-checked:bg-sage-500 transition-colors" />
                      <div className="absolute top-[1px] left-[1px] w-4 h-4 rounded-full bg-white shadow-sm peer-checked:translate-x-[14px] transition-transform" />
                    </div>
                    <span className="text-[0.8rem] font-medium text-slate-warm-700">Running colors only</span>
                  </label>
                </div>
              </div>
            )}
          </div>

          <button
            onClick={() => setModalOpen(true)}
            className="flex items-center gap-2 h-9 px-4 rounded-xl bg-sage-500 text-white text-[0.82rem] font-medium hover:bg-sage-600 transition-colors shadow-sm"
          >
            <Plus className="w-4 h-4" strokeWidth={2.2} />
            Add Color
          </button>
        </div>
      </div>

      {activeFilterCount > 0 && (
        <div className="flex items-center gap-2 flex-wrap">
          {filters.categories.map((cat) => (
            <span key={cat} className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-sage-50 border border-sage-100 text-[0.78rem] font-medium text-sage-700">
              {cat}
              <button onClick={() => toggleCategory(cat)} className="hover:text-coral-500 transition-colors"><X className="w-3 h-3" strokeWidth={2} /></button>
            </span>
          ))}
          {filters.stockFilter !== "all" && (
            <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-sage-50 border border-sage-100 text-[0.78rem] font-medium text-sage-700">
              Stock: {STOCK_LABEL[filters.stockFilter]}
              <button onClick={() => setFilters((p) => ({ ...p, stockFilter: "all" }))} className="hover:text-coral-500 transition-colors"><X className="w-3 h-3" strokeWidth={2} /></button>
            </span>
          )}
          {filters.runningOnly && (
            <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-sage-50 border border-sage-100 text-[0.78rem] font-medium text-sage-700">
              Running only
              <button onClick={() => setFilters((p) => ({ ...p, runningOnly: false }))} className="hover:text-coral-500 transition-colors"><X className="w-3 h-3" strokeWidth={2} /></button>
            </span>
          )}
          <button onClick={clearFilters} className="text-[0.76rem] font-medium text-slate-warm-400 hover:text-coral-500 transition-colors ml-1">Clear all</button>
        </div>
      )}

      <div className="bg-white rounded-2xl card-shadow overflow-x-auto">
        <table className="w-full table-fixed">
          <colgroup>
            <col style={{ width: "22%" }} />
            <col style={{ width: "14%" }} />
            <col style={{ width: "18%" }} />
            <col style={{ width: "18%" }} />
            <col style={{ width: "18%" }} />
            <col style={{ width: "10%" }} />
          </colgroup>
          <thead>
            <tr className="border-b border-slate-warm-100">
              <th className="text-left px-4 py-3 text-[0.7rem] font-semibold uppercase tracking-wider text-slate-warm-400">Color Name</th>
              <th className="text-left px-4 py-3 text-[0.7rem] font-semibold uppercase tracking-wider text-slate-warm-400">Sub Cat.</th>
              <th className="text-center px-4 py-3 text-[0.7rem] font-semibold uppercase tracking-wider text-slate-warm-400">5 Tar</th>
              <th className="text-center px-4 py-3 text-[0.7rem] font-semibold uppercase tracking-wider text-slate-warm-400">3 Tar</th>
              <th className="text-center px-4 py-3 text-[0.7rem] font-semibold uppercase tracking-wider text-slate-warm-400">Yarn</th>
              <th className="w-16"></th>
            </tr>
          </thead>
          <tbody>
            {groupedColors.map((group) => {
              const isExpanded = expandedGroups.has(group.key);

              return (
                <GroupRows
                  key={group.key}
                  group={group}
                  isExpanded={isExpanded}
                  onToggle={() => toggleGroup(group.key)}
                  onEdit={handleEdit}
                  onDelete={handleDelete}
                />
              );
            })}
          </tbody>
        </table>

        {groupedColors.length === 0 && (
          <div className="py-12 text-center">
            <p className="text-[0.9rem] text-slate-warm-400">No colors found</p>
            <p className="text-[0.78rem] text-slate-warm-300 mt-1">
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

function GroupRows({
  group,
  isExpanded,
  onToggle,
  onEdit,
  onDelete,
}: {
  group: ColorGroup;
  isExpanded: boolean;
  onToggle: () => void;
  onEdit: (variant: ColorRow) => void;
  onDelete: (id: string) => void;
}): React.JSX.Element {
  return (
    <>
      <tr
        onClick={onToggle}
        className={`border-b border-slate-warm-50 cursor-pointer transition-colors ${
          isExpanded ? "bg-cream-50" : "hover:bg-cream-50"
        }`}
      >
        <td className="px-4 py-3">
          <div className="flex items-center gap-2">
            {isExpanded ? (
              <ChevronDown className="w-4 h-4 text-slate-warm-400 shrink-0" strokeWidth={1.8} />
            ) : (
              <ChevronRight className="w-4 h-4 text-slate-warm-300 shrink-0" strokeWidth={1.8} />
            )}
            <span
              className="w-5 h-5 rounded-md shrink-0 border border-slate-warm-100"
              style={{ backgroundColor: group.hex }}
            />
            <p className="text-[0.84rem] font-medium text-slate-warm-800 truncate">
              {group.name}
            </p>
            {group.hasRunning && (
              <CircleCheck className="w-3.5 h-3.5 text-sage-500 shrink-0" strokeWidth={2} />
            )}
          </div>
        </td>
        <td className="px-4 py-3 text-[0.82rem] text-slate-warm-500">
          {group.subCategory}
        </td>
        {CATEGORY_ORDER.map((cat) => (
          <td key={cat} className="px-4 py-3 text-center">
            <StockBadge variant={group.variants.get(cat)} />
          </td>
        ))}
        <td className="px-3 py-3">
          <span className="text-[0.72rem] text-slate-warm-300">
            {group.variants.size} var{group.variants.size !== 1 && "s"}
          </span>
        </td>
      </tr>

      {isExpanded &&
        CATEGORY_ORDER.map((cat) => {
          const variant = group.variants.get(cat);
          if (!variant) return null;

          const status = stockStatus(variant.currentStock, variant.minStock, variant.maxStock);
          const pct = Number(variant.maxStock) > 0
            ? Math.min(100, Math.round((Number(variant.currentStock) / Number(variant.maxStock)) * 100))
            : 0;

          return (
            <tr
              key={variant.id}
              className="border-b border-slate-warm-50 bg-cream-50/50"
            >
              <td className="px-4 py-2.5 pl-14">
                <span className="text-[0.76rem] text-slate-warm-500 bg-cream-100 px-2 py-0.5 rounded-md">
                  {variant.category}
                </span>
              </td>
              <td className="px-4 py-2.5">
                <span className="text-[0.78rem] font-mono text-sage-600 bg-sage-50 px-2 py-0.5 rounded-md">
                  {variant.code}
                </span>
              </td>
              <td className="px-4 py-2.5" colSpan={3}>
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-1">
                    <ArrowDown className="w-3 h-3 text-slate-warm-300" strokeWidth={1.8} />
                    <span className="text-[0.78rem] text-slate-warm-500">{variant.minStock}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <ArrowUp className="w-3 h-3 text-slate-warm-300" strokeWidth={1.8} />
                    <span className="text-[0.78rem] text-slate-warm-500">{variant.maxStock}</span>
                  </div>
                  <div className="flex items-center gap-2 flex-1 max-w-[200px]">
                    <span className="text-[0.8rem] font-semibold text-slate-warm-800 w-8 text-right">
                      {variant.currentStock}
                    </span>
                    <div className="flex-1 h-1.5 rounded-full bg-slate-warm-100 overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${
                          status === "low" ? "bg-red-400" : status === "high" ? "bg-sky-400" : "bg-sage-400"
                        }`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                  <span className={`text-[0.7rem] font-medium px-2 py-0.5 rounded-full ${STOCK_STYLES[status]}`}>
                    {STOCK_LABEL[status]}
                  </span>
                </div>
              </td>
              <td className="px-3 py-2.5">
                <div className="flex items-center gap-0.5">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onEdit(variant);
                    }}
                    className="p-1.5 rounded-lg hover:bg-cream-100 transition-colors text-slate-warm-300 hover:text-slate-warm-600"
                  >
                    <Pencil className="w-3.5 h-3.5" strokeWidth={1.8} />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onDelete(variant.id);
                    }}
                    className="p-1.5 rounded-lg hover:bg-coral-400/10 transition-colors text-slate-warm-300 hover:text-coral-500"
                  >
                    <Trash2 className="w-3.5 h-3.5" strokeWidth={1.8} />
                  </button>
                </div>
              </td>
            </tr>
          );
        })}
    </>
  );
}
