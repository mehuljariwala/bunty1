"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  Sparkles,
  ChevronDown,
  Loader2,
  AlertCircle,
  Check,
  Package,
  Search,
  Zap,
} from "lucide-react";
import { subscribeParties } from "@/lib/parties";
import { subscribeColors } from "@/lib/colors";
import type { Party, Color } from "@/lib/types";

const PLACEHOLDER_TEXT = `5 TAR

RED       :  1
RAMA      :  1
N-BLUE    :  2
CHIKU     :  1
BLACK     :  2
MAHENDI   :  2
SKY       :  1

3 TAR

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

interface ParsedItem {
  category: string;
  colorName: string;
  quantity: number;
  matched: boolean;
  matchedColor?: Color;
}

export default function AiOrderPage() {
  const router = useRouter();
  const [parties, setParties] = useState<Party[]>([]);
  const [colors, setColors] = useState<Color[]>([]);
  const [loading, setLoading] = useState(true);

  const [orderText, setOrderText] = useState("");
  const [selectedParty, setSelectedParty] = useState<Party | null>(null);
  const [partySearch, setPartySearch] = useState("");
  const [partyOpen, setPartyOpen] = useState(false);
  const partyRef = useRef<HTMLDivElement>(null);

  const [parsing, setParsing] = useState(false);
  const [parsed, setParsed] = useState<ParsedItem[] | null>(null);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let loaded = 0;
    const done = (): void => {
      loaded++;
      if (loaded >= 2) setLoading(false);
    };
    const u1 = subscribeParties((d) => { setParties(d); done(); });
    const u2 = subscribeColors((d) => { setColors(d); done(); });
    return () => { u1(); u2(); };
  }, []);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (partyRef.current && !partyRef.current.contains(e.target as Node)) {
        setPartyOpen(false);
      }
    }
    if (partyOpen) document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [partyOpen]);

  const filteredParties = useMemo(() => {
    const q = partySearch.toLowerCase();
    const enabled = parties.filter((p) => p.status === "Enable");
    if (!q) return enabled;
    return enabled.filter((p) => p.name.toLowerCase().includes(q));
  }, [parties, partySearch]);

  const colorNames = useMemo(() => colors.map((c) => c.name), [colors]);

  function matchColorToDb(name: string, category: string): Color | undefined {
    const lower = name.toLowerCase().trim();
    const exact = colors.find(
      (c) => c.name.toLowerCase() === lower && c.category.toLowerCase() === category.toLowerCase(),
    );
    if (exact) return exact;

    const catMatch = colors.find(
      (c) =>
        c.category.toLowerCase() === category.toLowerCase() &&
        (c.name.toLowerCase().includes(lower) || lower.includes(c.name.toLowerCase())),
    );
    if (catMatch) return catMatch;

    return colors.find((c) => c.name.toLowerCase() === lower);
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
          colorNames: [...new Set(colorNames)],
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to parse");
      }

      const data = await res.json() as { items: { category: string; colorName: string; quantity: number }[] };

      const items: ParsedItem[] = data.items.map((item) => {
        const dbColor = matchColorToDb(item.colorName, item.category);
        return {
          category: item.category,
          colorName: dbColor ? dbColor.name : item.colorName,
          quantity: item.quantity,
          matched: !!dbColor,
          matchedColor: dbColor,
        };
      });

      setParsed(items);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setParsing(false);
    }
  }

  function handleCreateOrder() {
    if (!parsed || !selectedParty) return;
    setSubmitting(true);

    const prefill = parsed
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

    sessionStorage.setItem("ai-order-prefill", JSON.stringify(prefill));
    router.push(`/create-order?partyId=${selectedParty.id}`);
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

  const CATEGORY_COLORS: Record<string, string> = {
    "3 Tar": "#5b5fc7",
    "5 Tar": "#f5956b",
    "Yarn": "#36b49f",
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="w-8 h-8 text-crm-primary animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-4">
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-crm-primary to-crm-sidebar flex items-center justify-center">
          <Sparkles className="w-4.5 h-4.5 text-white" strokeWidth={2} />
        </div>
        <div>
          <h2 className="text-[1.1rem] font-bold tracking-tight text-crm-text">AI Order Creator</h2>
          <p className="text-[0.72rem] text-crm-text-muted">Paste order text and let AI fill the order for you</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="space-y-3">
          <div className="bg-white rounded-xl card-shadow p-4">
            <label className="block text-[0.76rem] font-bold text-crm-text mb-2">
              Select Party
            </label>
            <div className="relative" ref={partyRef}>
              <button
                onClick={() => { setPartyOpen((v) => !v); setPartySearch(""); }}
                className={`flex items-center gap-2 w-full h-10 px-3.5 rounded-xl border text-[0.84rem] font-medium transition-colors ${
                  selectedParty
                    ? "bg-crm-primary-muted border-crm-primary/30 text-crm-primary"
                    : "bg-crm-bg/50 border-crm-border text-crm-text-muted"
                }`}
              >
                <Package className="w-4 h-4 shrink-0" strokeWidth={1.8} />
                <span className="flex-1 text-left truncate">
                  {selectedParty?.name ?? "Choose a party..."}
                </span>
                <ChevronDown className={`w-4 h-4 shrink-0 transition-transform ${partyOpen ? "rotate-180" : ""}`} strokeWidth={1.8} />
              </button>

              {partyOpen && (
                <div className="absolute left-0 top-full mt-1 w-full bg-white rounded-xl border border-crm-border shadow-lg z-50 animate-[fadeIn_100ms_ease-out]">
                  <div className="p-2 border-b border-crm-border/50">
                    <div className="relative">
                      <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-crm-text-muted" />
                      <input
                        type="text"
                        placeholder="Search party..."
                        value={partySearch}
                        onChange={(e) => setPartySearch(e.target.value)}
                        autoFocus
                        className="w-full h-8 pl-8 pr-2.5 rounded-lg bg-crm-bg border border-crm-border text-[0.78rem] text-crm-text placeholder:text-crm-text-muted focus:outline-none focus:ring-1 focus:ring-crm-primary/30"
                      />
                    </div>
                  </div>
                  <div className="max-h-48 overflow-y-auto py-1">
                    {filteredParties.map((p) => (
                      <button
                        key={p.id}
                        onClick={() => { setSelectedParty(p); setPartyOpen(false); }}
                        className={`w-full text-left px-3 py-2 text-[0.78rem] transition-colors truncate ${
                          selectedParty?.id === p.id
                            ? "bg-crm-primary-muted/50 text-crm-primary font-semibold"
                            : "text-crm-text hover:bg-crm-bg"
                        }`}
                      >
                        {p.name}
                        <span className="text-[0.66rem] text-crm-text-muted ml-2">{p.route}</span>
                      </button>
                    ))}
                    {filteredParties.length === 0 && (
                      <p className="px-3 py-3 text-[0.75rem] text-crm-text-muted text-center">No parties found</p>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="bg-white rounded-xl card-shadow p-4">
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
              rows={16}
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
            <div className="bg-white rounded-xl card-shadow p-8 flex flex-col items-center justify-center min-h-[400px] text-center">
              <div className="w-16 h-16 rounded-2xl bg-crm-bg flex items-center justify-center mb-4">
                <Sparkles className="w-7 h-7 text-crm-border" strokeWidth={1.5} />
              </div>
              <p className="text-[0.88rem] font-semibold text-crm-text-muted">Parsed results will appear here</p>
              <p className="text-[0.72rem] text-crm-border mt-1 max-w-[260px]">
                Paste your order text on the left and click &quot;Parse Order&quot; to see the matched colors
              </p>
            </div>
          ) : (
            <>
              <div className="bg-white rounded-xl card-shadow p-4">
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

                <div className="space-y-3 max-h-[420px] overflow-y-auto">
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
                            <div
                              key={`${item.colorName}-${i}`}
                              className={`flex items-center gap-2.5 px-3 py-2 ${
                                item.matched ? "bg-white" : "bg-orange-50/40"
                              }`}
                            >
                              {item.matchedColor && (
                                <div
                                  className="w-4 h-4 rounded-sm shrink-0 border border-black/10"
                                  style={{ backgroundColor: item.matchedColor.hex }}
                                />
                              )}
                              {!item.matchedColor && (
                                <AlertCircle className="w-4 h-4 text-orange-400 shrink-0" strokeWidth={2} />
                              )}
                              <span className={`flex-1 text-[0.78rem] font-medium ${item.matched ? "text-crm-text" : "text-orange-600"}`}>
                                {item.colorName}
                              </span>
                              {item.matched && (
                                <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0" strokeWidth={2.5} />
                              )}
                              <span className="text-[0.78rem] font-bold tabular-nums text-crm-text w-6 text-right">
                                {item.quantity}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <button
                onClick={handleCreateOrder}
                disabled={!selectedParty || matchedCount === 0 || submitting}
                className="w-full h-12 rounded-xl bg-crm-sidebar text-white font-bold text-[0.88rem] hover:bg-crm-sidebar-active transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2 card-shadow"
              >
                {submitting ? (
                  <Loader2 className="w-4.5 h-4.5 animate-spin" />
                ) : (
                  <>
                    <Package className="w-4.5 h-4.5" strokeWidth={2} />
                    Create Order ({matchedCount} colors, {totalQty} qty)
                  </>
                )}
              </button>

              {!selectedParty && parsed && (
                <p className="text-[0.72rem] text-orange-500 font-medium text-center">
                  Please select a party above to continue
                </p>
              )}

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
  );
}
