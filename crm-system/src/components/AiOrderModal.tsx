"use client";

import { useState, useMemo, useRef, useEffect } from "react";
import {
  Sparkles,
  Loader2,
  AlertCircle,
  Zap,
  X,
  Package,
  Plus,
  Pencil,
} from "lucide-react";
import type { Color } from "@/lib/types";

interface ParsedItem {
  category: string;
  colorName: string;
  quantity: number;
  matched: boolean;
  matchedColor?: Color;
}

interface SelectedColor {
  colour: string;
  hex: string;
  category: string;
  subCategory: string;
  quantity: number;
  deliveredQty: number;
  currentStock: number;
}

interface AiOrderModalProps {
  open: boolean;
  onClose: () => void;
  colors: Color[];
  onApply: (items: SelectedColor[]) => void;
}

const PLACEHOLDER_TEXT = `5 TAR BULLET

RED       :  1
RAMA      :  1
N-BLUE    :  2
CHIKU     :  1
BLACK     :  2
MAHENDI   :  2
SKY       :  1

3 TAR BULLET

RED       :  2
WHITE     :  1
BLACK     :  2
MAHROON   :  1
B-CREAM   :  1
COFEE     :  2
PISTA     :  1
MAHENDI   :  1

Yarn

RED       :  1
BLACK     :  1`;

const CATEGORY_COLORS: Record<string, string> = {
  "3 Tar Bullet": "#f5956b",
  "5 Tar Bullet": "#5b5fc7",
  "Yarn": "#36b49f",
  "3 Tar Button": "#e8b838",
  "5 Tar Button": "#9b59b6",
  "6 Tar Button": "#3498db",
};

function EditableRow({
  item,
  allColors,
  onChangeColor,
  onChangeQty,
  onRemove,
}: {
  item: ParsedItem;
  allColors: Color[];
  onChangeColor: (c: Color) => void;
  onChangeQty: (v: number) => void;
  onRemove: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [qtyDraft, setQtyDraft] = useState(String(item.quantity));
  const [colorSearch, setColorSearch] = useState("");
  const qtyRef = useRef<HTMLInputElement>(null);
  const colorRef = useRef<HTMLInputElement>(null);
  const rowRef = useRef<HTMLDivElement>(null);

  const catColors = useMemo(
    () => allColors.filter((c) => c.category.toLowerCase() === item.category.toLowerCase()),
    [allColors, item.category],
  );
  const filtered = useMemo(
    () => colorSearch ? catColors.filter((c) => c.name.toLowerCase().includes(colorSearch.toLowerCase())) : catColors,
    [catColors, colorSearch],
  );

  useEffect(() => {
    if (editing) {
      setQtyDraft(String(item.quantity));
      setColorSearch("");
      setTimeout(() => colorRef.current?.focus(), 50);
    }
  }, [editing, item.quantity]);

  useEffect(() => {
    if (!editing) return;
    function handleClick(e: MouseEvent) {
      if (rowRef.current && !rowRef.current.contains(e.target as Node)) commitAndClose();
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  });

  function commitAndClose() {
    const n = parseInt(qtyDraft);
    if (!isNaN(n) && n > 0 && n !== item.quantity) onChangeQty(n);
    setEditing(false);
  }

  if (editing) {
    return (
      <div ref={rowRef} className="bg-crm-primary-muted/30 border border-crm-primary/20 rounded-lg mx-1 my-1 p-2 space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-[0.7rem] font-semibold text-crm-primary uppercase tracking-wider">Edit Color</span>
          <button onClick={commitAndClose} className="p-0.5 rounded hover:bg-white text-crm-text-muted hover:text-crm-text transition-colors">
            <X className="w-3.5 h-3.5" strokeWidth={2} />
          </button>
        </div>
        <input
          ref={colorRef}
          type="text"
          value={colorSearch}
          onChange={(e) => setColorSearch(e.target.value)}
          placeholder="Search color..."
          className="w-full h-7 px-2.5 rounded-lg border border-crm-border text-[0.74rem] text-crm-text focus:outline-none focus:ring-1 focus:ring-crm-primary/30 focus:border-crm-primary/50"
        />
        <div className="max-h-[100px] overflow-y-auto space-y-0.5">
          {filtered.map((c) => (
            <button
              key={c.id}
              onClick={() => { onChangeColor(c); setColorSearch(""); setEditing(false); }}
              className={`flex items-center gap-2 w-full px-2 py-1 rounded-md hover:bg-white text-left transition-colors ${c.name === item.colorName ? "bg-white ring-1 ring-crm-primary/30" : ""}`}
            >
              <div className="w-3.5 h-3.5 rounded-sm shrink-0 border border-black/10" style={{ backgroundColor: c.hex }} />
              <span className="text-[0.74rem] font-medium text-crm-text flex-1 truncate">{c.name}</span>
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[0.7rem] font-semibold text-crm-text-muted">Qty:</span>
          <input
            ref={qtyRef}
            type="number"
            min={1}
            value={qtyDraft}
            onChange={(e) => setQtyDraft(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") commitAndClose(); }}
            className="w-14 h-7 text-center text-[0.78rem] font-bold rounded-lg border border-crm-border focus:outline-none focus:ring-1 focus:ring-crm-primary/30"
          />
          <div className="flex-1" />
          <button onClick={onRemove} className="text-[0.7rem] font-medium text-red-400 hover:text-red-500 transition-colors">
            Remove
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`flex items-center gap-2 px-3 py-1.5 ${item.matched ? "bg-white" : "bg-orange-50/40"}`}>
      {item.matchedColor ? (
        <div className="w-3.5 h-3.5 rounded-sm shrink-0 border border-black/10" style={{ backgroundColor: item.matchedColor.hex }} />
      ) : (
        <AlertCircle className="w-3.5 h-3.5 text-orange-400 shrink-0" strokeWidth={2} />
      )}
      <span className={`flex-1 text-[0.78rem] font-medium truncate min-w-0 ${item.matched ? "text-crm-text" : "text-orange-600"}`}>
        {item.colorName}
      </span>
      <span className="text-[0.78rem] font-bold tabular-nums text-crm-text w-6 text-right">
        {item.quantity}
      </span>
      <button
        onClick={() => setEditing(true)}
        className="p-0.5 rounded text-crm-text-muted hover:text-crm-primary transition-colors shrink-0"
        title="Edit"
      >
        <Pencil className="w-3.5 h-3.5" strokeWidth={2} />
      </button>
    </div>
  );
}

function AddColorDropdown({ category, colors, onAdd }: { category: string; colors: Color[]; onAdd: (c: Color, qty: number) => void }) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const catColors = useMemo(
    () => colors.filter((c) => c.category.toLowerCase() === category.toLowerCase()),
    [colors, category],
  );

  const filtered = useMemo(
    () => search ? catColors.filter((c) => c.name.toLowerCase().includes(search.toLowerCase())) : catColors,
    [catColors, search],
  );

  useEffect(() => {
    if (open) { setSearch(""); setTimeout(() => inputRef.current?.focus(), 50); }
  }, [open]);

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-1 px-2 py-1.5 text-[0.68rem] font-medium text-crm-primary hover:bg-crm-primary-muted rounded-md transition-colors w-full justify-center"
      >
        <Plus className="w-3 h-3" strokeWidth={2.5} />
        Add color
      </button>
    );
  }

  return (
    <div className="border-t border-crm-border/30 bg-crm-bg/30 p-2 space-y-1.5">
      <input
        ref={inputRef}
        type="text"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Search color..."
        className="w-full h-7 px-2.5 rounded-lg border border-crm-border text-[0.74rem] text-crm-text focus:outline-none focus:ring-1 focus:ring-crm-primary/30 focus:border-crm-primary/50"
      />
      <div className="max-h-[120px] overflow-y-auto space-y-0.5">
        {filtered.length === 0 && (
          <p className="text-[0.68rem] text-crm-text-muted text-center py-2">No colors found</p>
        )}
        {filtered.map((c) => (
          <button
            key={c.id}
            onClick={() => { onAdd(c, 1); setOpen(false); }}
            className="flex items-center gap-2 w-full px-2 py-1.5 rounded-md hover:bg-white text-left transition-colors"
          >
            <div className="w-3.5 h-3.5 rounded-sm shrink-0 border border-black/10" style={{ backgroundColor: c.hex }} />
            <span className="text-[0.74rem] font-medium text-crm-text flex-1">{c.name}</span>
          </button>
        ))}
      </div>
      <button
        onClick={() => setOpen(false)}
        className="w-full text-[0.66rem] text-crm-text-muted hover:text-crm-text py-1 transition-colors"
      >
        Cancel
      </button>
    </div>
  );
}

export default function AiOrderModal({ open, onClose, colors, onApply }: AiOrderModalProps) {
  const [orderText, setOrderText] = useState("");
  const [parsing, setParsing] = useState(false);
  const [parsed, setParsed] = useState<ParsedItem[] | null>(null);
  const [error, setError] = useState("");

  const colorsByCategory = useMemo(() => {
    const map: Record<string, string[]> = {};
    for (const c of colors) {
      if (!map[c.category]) map[c.category] = [];
      if (!map[c.category].includes(c.name)) map[c.category].push(c.name);
    }
    return map;
  }, [colors]);

  function normalize(s: string): string {
    return s.toLowerCase().replace(/[-_\s]+/g, "").trim();
  }

  function matchColorToDb(name: string, category: string): Color | undefined {
    const normName = normalize(name);
    const catLower = category.toLowerCase();

    const exactCat = colors.find(
      (c) => c.category.toLowerCase() === catLower && normalize(c.name) === normName,
    );
    if (exactCat) return exactCat;

    const exactAny = colors.find((c) => normalize(c.name) === normName);
    if (exactAny) return exactAny;

    return undefined;
  }

  function updateItemQty(category: string, colorName: string, qty: number) {
    if (!parsed) return;
    setParsed(parsed.map((item) =>
      item.category === category && item.colorName === colorName
        ? { ...item, quantity: qty }
        : item,
    ));
  }

  function updateItemColor(category: string, oldColorName: string, newColor: Color) {
    if (!parsed) return;
    setParsed(parsed.map((item) =>
      item.category === category && item.colorName === oldColorName
        ? { ...item, colorName: newColor.name, matched: true, matchedColor: newColor }
        : item,
    ));
  }

  function removeItem(category: string, colorName: string) {
    if (!parsed) return;
    setParsed(parsed.filter((item) => !(item.category === category && item.colorName === colorName)));
  }

  function addItem(category: string, color: Color, qty: number) {
    if (!parsed) return;
    const existing = parsed.find((item) => item.category === category && item.colorName === color.name);
    if (existing) {
      updateItemQty(category, color.name, existing.quantity + qty);
      return;
    }
    setParsed([
      ...parsed,
      { category, colorName: color.name, quantity: qty, matched: true, matchedColor: color },
    ]);
  }

  async function handleParse() {
    if (!orderText.trim()) return;
    setParsing(true);
    setError("");
    setParsed(null);

    try {
      const res = await fetch("/api/parse-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderText: orderText.trim(),
          colorsByCategory,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to parse");
      }

      const data = await res.json() as { items: { category: string; colorName: string; quantity: number }[] };

      const raw: ParsedItem[] = data.items.map((item) => {
        const dbColor = matchColorToDb(item.colorName, item.category);
        return {
          category: item.category,
          colorName: dbColor ? dbColor.name : item.colorName,
          quantity: item.quantity,
          matched: !!dbColor,
          matchedColor: dbColor,
        };
      });

      const seen = new Map<string, ParsedItem>();
      for (const item of raw) {
        const key = `${item.category}::${item.colorName}`;
        const existing = seen.get(key);
        if (existing) {
          existing.quantity += item.quantity;
        } else {
          seen.set(key, { ...item });
        }
      }

      setParsed(Array.from(seen.values()));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setParsing(false);
    }
  }

  function handleApply() {
    if (!parsed) return;

    const items: SelectedColor[] = parsed
      .filter((item) => item.matchedColor)
      .map((item) => ({
        colour: item.matchedColor!.name,
        hex: item.matchedColor!.hex,
        category: item.matchedColor!.category,
        subCategory: item.matchedColor!.subCategory,
        quantity: item.quantity,
        deliveredQty: item.quantity,
        currentStock: item.matchedColor!.currentStock,
      }));

    onApply(items);
    handleClose();
  }

  function handleClose() {
    setOrderText("");
    setParsed(null);
    setError("");
    onClose();
  }

  const matchedCount = parsed?.filter((i) => i.matched).length ?? 0;
  const unmatchedCount = parsed ? parsed.length - matchedCount : 0;
  const totalQty = parsed?.reduce((s, i) => s + i.quantity, 0) ?? 0;

  const groupedByCategory = useMemo(() => {
    if (!parsed) return new Map<string, ParsedItem[]>();
    const map = new Map<string, ParsedItem[]>();
    for (const item of parsed) {
      const list = map.get(item.category) ?? [];
      list.push(item);
      map.set(item.category, list);
    }
    return map;
  }, [parsed]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={handleClose} />

      <div className="relative w-full max-w-4xl max-h-[90vh] mx-4 bg-white rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-[fadeIn_150ms_ease-out]">
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-crm-border shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-crm-primary to-crm-sidebar flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-white" strokeWidth={2} />
            </div>
            <div>
              <h2 className="text-[0.95rem] font-bold text-crm-text">AI Order</h2>
              <p className="text-[0.68rem] text-crm-text-muted">Paste order text and let AI fill the order</p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="p-1.5 rounded-lg hover:bg-crm-bg text-crm-text-muted hover:text-crm-text transition-colors"
          >
            <X className="w-5 h-5" strokeWidth={1.8} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="space-y-3">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-[0.76rem] font-bold text-crm-text">
                    Order Text
                  </label>
                  <span className="text-[0.64rem] text-crm-text-muted">
                    Paste your order below
                  </span>
                </div>
                <textarea
                  value={orderText}
                  onChange={(e) => { setOrderText(e.target.value); setParsed(null); setError(""); }}
                  placeholder={PLACEHOLDER_TEXT}
                  rows={14}
                  className="w-full px-3.5 py-3 rounded-xl bg-crm-bg/30 border border-crm-border text-[0.82rem] text-crm-text font-mono leading-relaxed placeholder:text-crm-border focus:outline-none focus:ring-2 focus:ring-crm-primary/20 focus:border-crm-primary/50 focus:bg-white transition-all resize-none"
                />

                <button
                  onClick={handleParse}
                  disabled={!orderText.trim() || parsing}
                  className="mt-3 w-full h-11 rounded-xl bg-gradient-to-r from-crm-primary to-crm-sidebar text-white font-semibold text-[0.84rem] hover:opacity-90 active:opacity-80 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {parsing ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Parsing with AI...
                    </>
                  ) : (
                    <>
                      <Zap className="w-4 h-4" strokeWidth={2} />
                      Parse Order
                    </>
                  )}
                </button>

                {error && (
                  <div className="mt-3 flex items-start gap-2 px-3 py-2.5 rounded-lg bg-red-50 border border-red-200">
                    <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" strokeWidth={2} />
                    <p className="text-[0.76rem] text-red-600">{error}</p>
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-3">
              {!parsed ? (
                <div className="bg-crm-bg/30 rounded-xl p-8 flex flex-col items-center justify-center min-h-[300px] text-center border border-crm-border/50">
                  <div className="w-14 h-14 rounded-2xl bg-crm-bg flex items-center justify-center mb-3">
                    <Sparkles className="w-6 h-6 text-crm-border" strokeWidth={1.5} />
                  </div>
                  <p className="text-[0.84rem] font-semibold text-crm-text-muted">Results will appear here</p>
                  <p className="text-[0.7rem] text-crm-border mt-1 max-w-[240px]">
                    Paste your order text and click &quot;Parse Order&quot;
                  </p>
                </div>
              ) : (
                <>
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-[0.84rem] font-bold text-crm-text">Parsed Results</h3>
                      <div className="flex items-center gap-2">
                        <span className="text-[0.66rem] font-bold px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-600">
                          {matchedCount} matched
                        </span>
                        {unmatchedCount > 0 && (
                          <span className="text-[0.66rem] font-bold px-2 py-0.5 rounded-md bg-orange-50 text-orange-500">
                            {unmatchedCount} unmatched
                          </span>
                        )}
                        <span className="text-[0.66rem] font-bold px-2 py-0.5 rounded-md bg-crm-primary-muted text-crm-primary">
                          {totalQty} qty
                        </span>
                      </div>
                    </div>

                    <div className="space-y-3 max-h-[340px] overflow-y-auto">
                      {Array.from(groupedByCategory.entries()).map(([cat, items]) => {
                        const headerBg = CATEGORY_COLORS[cat] ?? "#5b5fc7";
                        const catQty = items.reduce((s, i) => s + i.quantity, 0);
                        return (
                          <div key={cat} className="rounded-lg overflow-hidden border border-crm-border/50">
                            <div
                              className="flex items-center justify-between px-3 py-2 text-white"
                              style={{ backgroundColor: headerBg }}
                            >
                              <span className="text-[0.76rem] font-bold">{cat}</span>
                              <span className="text-[0.66rem] font-semibold opacity-80">
                                {items.length} colors &middot; {catQty} qty
                              </span>
                            </div>
                            <div className="divide-y divide-crm-border/30">
                              {items.map((item, i) => (
                                <EditableRow
                                  key={`${item.colorName}-${i}`}
                                  item={item}
                                  allColors={colors}
                                  onChangeColor={(c) => updateItemColor(item.category, item.colorName, c)}
                                  onChangeQty={(v) => updateItemQty(item.category, item.colorName, v)}
                                  onRemove={() => removeItem(item.category, item.colorName)}
                                />
                              ))}
                            </div>
                            <AddColorDropdown
                              category={cat}
                              colors={colors}
                              onAdd={(c, qty) => addItem(cat, c, qty)}
                            />
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <button
                    onClick={handleApply}
                    disabled={matchedCount === 0}
                    className="w-full h-11 rounded-xl bg-crm-sidebar text-white font-bold text-[0.84rem] hover:bg-crm-sidebar-active transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    <Package className="w-4 h-4" strokeWidth={2} />
                    Apply to Order ({matchedCount} colors, {totalQty} qty)
                  </button>

                  {unmatchedCount > 0 && (
                    <p className="text-[0.68rem] text-crm-text-muted text-center">
                      {unmatchedCount} unmatched color{unmatchedCount > 1 ? "s" : ""} will be skipped
                    </p>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
