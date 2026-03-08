"use client";

import { Fragment, useState, useMemo, useCallback } from "react";
import {
  Search,
  ChevronDown,
  Loader2,
  Check,
  IndianRupee,
  CheckSquare,
  Square,
  Minus,
  X,
  Save,
} from "lucide-react";
import { updateParty } from "@/lib/parties";
import { usePartiesQuery, useColorsQuery, useInvalidate } from "@/hooks/use-queries";
import type { Party, RateValues } from "@/lib/types";

function getRateCount(rates: Party["rates"], categories: string[], materials: string[]): number {
  let count = 0;
  for (const cat of categories) {
    for (const mat of materials) {
      if (rates[cat]?.[mat]) count++;
    }
  }
  return count;
}

function buildEmptyRateCard(categories: string[], materials: string[]): RateValues {
  const rates: RateValues = {};
  for (const cat of categories) {
    rates[cat] = {};
    for (const mat of materials) {
      rates[cat][mat] = "";
    }
  }
  return rates;
}

function getRateCardCount(rates: RateValues, categories: string[], materials: string[]): number {
  let count = 0;
  for (const cat of categories) {
    for (const mat of materials) {
      if (rates[cat]?.[mat]) count++;
    }
  }
  return count;
}

function RateGrid({
  rates,
  categories,
  materials,
  onChange,
}: {
  rates: RateValues;
  categories: string[];
  materials: string[];
  onChange: (cat: string, mat: string, value: string) => void;
}): React.JSX.Element {
  return (
    <>
      {/* Mobile: stacked layout */}
      <div className="md:hidden bg-crm-bg/30 rounded-xl border border-crm-border p-3 space-y-3">
        {materials.map((mat) => (
          <div key={mat}>
            <p className="text-[0.72rem] font-semibold text-crm-text-muted uppercase tracking-wider mb-1.5">{mat}</p>
            <div className="grid grid-cols-3 gap-2">
              {categories.map((cat) => (
                <div key={cat}>
                  <label className="block text-[0.62rem] text-crm-text-muted mb-0.5">{cat}</label>
                  <div className="relative">
                    <span className="absolute left-2 top-1/2 -translate-y-1/2 text-[0.72rem] text-crm-border pointer-events-none">₹</span>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="--"
                      value={rates[cat]?.[mat] ?? ""}
                      onClick={(e) => e.stopPropagation()}
                      onChange={(e) => onChange(cat, mat, e.target.value)}
                      className="w-full h-8 pl-5 pr-1.5 rounded-lg bg-crm-card border border-crm-border text-[0.78rem] text-crm-text text-center placeholder:text-crm-text-muted/50 focus:outline-none focus:ring-2 focus:ring-crm-primary/20 focus:border-crm-primary transition-all [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Desktop: table layout */}
      <div className="hidden md:block bg-crm-bg/30 rounded-xl border border-crm-border overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-crm-border">
              <th className="text-left px-4 py-2.5 text-[0.68rem] font-semibold uppercase tracking-wider text-crm-text-muted w-32">
                Material
              </th>
              {categories.map((cat) => (
                <th
                  key={cat}
                  className="text-center px-4 py-2.5 text-[0.68rem] font-semibold uppercase tracking-wider text-crm-text-muted"
                >
                  {cat}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-crm-border/40">
            {materials.map((mat) => (
              <tr key={mat} className="hover:bg-crm-primary-muted/30 transition-colors">
                <td className="px-4 py-2 text-[0.82rem] font-medium text-crm-text">
                  {mat}
                </td>
                {categories.map((cat) => (
                  <td key={cat} className="text-center px-3 py-2">
                    <div className="relative inline-block">
                      <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[0.72rem] text-crm-border pointer-events-none">
                        ₹
                      </span>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        placeholder="--"
                        value={rates[cat]?.[mat] ?? ""}
                        onClick={(e) => e.stopPropagation()}
                        onChange={(e) => onChange(cat, mat, e.target.value)}
                        className="w-24 h-8 pl-6 pr-2 rounded-lg bg-crm-card border border-crm-border text-[0.82rem] text-crm-text text-center placeholder:text-crm-text-muted/50 focus:outline-none focus:ring-2 focus:ring-crm-primary/20 focus:border-crm-primary transition-all [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                      />
                    </div>
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

function ApplyRateModal({
  selectedParties,
  categories,
  materials,
  onClose,
  onApplied,
}: {
  selectedParties: Party[];
  categories: string[];
  materials: string[];
  onClose: () => void;
  onApplied: () => void;
}): React.JSX.Element {
  const [modalRates, setModalRates] = useState<RateValues>(() => buildEmptyRateCard(categories, materials));
  const [applying, setApplying] = useState(false);
  const [result, setResult] = useState<{ success: number; total: number } | null>(null);

  const filled = getRateCardCount(modalRates, categories, materials);

  function setModalRate(cat: string, mat: string, value: string) {
    setModalRates((prev) => ({
      ...prev,
      [cat]: { ...prev[cat], [mat]: value },
    }));
  }

  async function handleApply(): Promise<void> {
    setApplying(true);
    setResult(null);

    const results = await Promise.all(
      selectedParties.map(async (party) => {
        const merged: RateValues = {};
        for (const cat of categories) {
          merged[cat] = {};
          for (const mat of materials) {
            merged[cat][mat] = modalRates[cat]?.[mat] || party.rates[cat]?.[mat] || "";
          }
        }
        try {
          await updateParty(party.id, { rates: merged });
          return true;
        } catch {
          return false;
        }
      })
    );

    const success = results.filter(Boolean).length;
    setResult({ success, total: selectedParties.length });
    setApplying(false);

    if (success === selectedParties.length) {
      setTimeout(() => {
        onApplied();
        onClose();
      }, 1200);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-crm-sidebar/30 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-crm-card rounded-2xl card-shadow w-full max-w-xl mx-3 sm:mx-4 animate-[fadeIn_150ms_ease-out] max-h-[92vh] flex flex-col">
        <div className="flex items-center justify-between px-4 sm:px-6 pt-4 sm:pt-5 pb-3 sm:pb-4 shrink-0">
          <div>
            <h3 className="text-[1.1rem] font-bold text-crm-text">
              Apply Custom Rates
            </h3>
            <p className="text-[0.78rem] text-crm-text-muted mt-0.5">
              Set rates for {selectedParties.length} selected{" "}
              {selectedParties.length === 1 ? "party" : "parties"}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-crm-primary-muted text-crm-text-muted hover:text-crm-text transition-colors"
          >
            <X className="w-4.5 h-4.5" strokeWidth={1.8} />
          </button>
        </div>

        <div className="px-4 sm:px-6 pb-2 space-y-4 overflow-y-auto">
          <div className="rounded-xl border border-crm-border p-4">
            <p className="text-crm-primary text-[0.68rem] font-bold uppercase tracking-widest mb-3">
              Selected Parties
            </p>
            <div className="flex flex-wrap gap-1.5">
              {selectedParties.map((p) => (
                <span
                  key={p.id}
                  className="px-2.5 py-1 rounded-lg bg-crm-primary-muted border border-crm-border text-[0.72rem] font-medium text-crm-primary"
                >
                  {p.name}
                </span>
              ))}
            </div>
          </div>

          <div className="rounded-xl border border-crm-border p-4">
            <p className="text-crm-primary text-[0.68rem] font-bold uppercase tracking-widest mb-3">
              Rate Card
            </p>
            <RateGrid rates={modalRates} categories={categories} materials={materials} onChange={setModalRate} />
          </div>
        </div>

        <div className="px-4 sm:px-6 py-4 sm:py-5 shrink-0">
          {result && (
            <p className="flex items-center justify-center gap-1.5 text-[0.78rem] font-medium text-crm-primary mb-3 animate-[fadeIn_150ms_ease-out]">
              <Check className="w-3.5 h-3.5" strokeWidth={2.5} />
              Applied to {result.success}/{result.total} parties
            </p>
          )}
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={onClose}
              className="h-11 rounded-xl border border-crm-border text-[0.82rem] font-semibold text-crm-text-muted hover:bg-crm-primary-muted transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleApply}
              disabled={filled === 0 || applying}
              className="flex items-center justify-center gap-2 h-11 rounded-xl bg-crm-primary text-white text-[0.82rem] font-semibold hover:bg-[#4845a2] transition-colors shadow-sm disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {applying ? (
                <Loader2 className="w-4 h-4 animate-spin" strokeWidth={2} />
              ) : (
                <IndianRupee className="w-4 h-4" strokeWidth={2} />
              )}
              {applying ? "Applying..." : "Apply Rates"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function RateMasterPage(): React.JSX.Element {
  const { data: parties = [], isLoading: loading } = usePartiesQuery();
  const { data: colors = [], isLoading: colorsLoading } = useColorsQuery();
  const invalidate = useInvalidate();

  const rateCategories = useMemo(() => [...new Set(colors.map((c) => c.category))].sort(), [colors]);
  const rateMaterials = useMemo(() => [...new Set(colors.map((c) => c.subCategory).filter(Boolean))].sort(), [colors]);

  const [search, setSearch] = useState("");
  const [activeRoute, setActiveRoute] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [rateCard, setRateCard] = useState<RateValues>({});
  const [editingRates, setEditingRates] = useState<Record<string, RateValues>>({});
  const [commonApplying, setCommonApplying] = useState(false);
  const [commonResult, setCommonResult] = useState<{ success: number; total: number } | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [savedId, setSavedId] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  useEffect(() => {
    if (rateCategories.length > 0 && rateMaterials.length > 0 && Object.keys(rateCard).length === 0) {
      setRateCard(buildEmptyRateCard(rateCategories, rateMaterials));
    }
  }, [rateCategories, rateMaterials, rateCard]);

  const uniqueRoutes = useMemo(
    () => [...new Set(parties.map((p) => p.route).filter(Boolean))].sort(),
    [parties]
  );

  const filtered = useMemo(() => {
    return parties.filter((p) => {
      const q = search.toLowerCase();
      const matchesSearch =
        !q ||
        p.name.toLowerCase().includes(q) ||
        p.route.toLowerCase().includes(q);
      const matchesRoute = !activeRoute || p.route === activeRoute;
      return matchesSearch && matchesRoute;
    });
  }, [parties, search, activeRoute]);

  const allSelected = filtered.length > 0 && filtered.every((p) => selectedIds.has(p.id));
  const someSelected = filtered.some((p) => selectedIds.has(p.id));

  const selectedParties = useMemo(
    () => parties.filter((p) => selectedIds.has(p.id)),
    [parties, selectedIds]
  );

  function toggleSelectAll() {
    if (allSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filtered.map((p) => p.id)));
    }
  }

  function toggleSelect(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function setRateCardValue(cat: string, mat: string, value: string) {
    setRateCard((prev) => ({
      ...prev,
      [cat]: { ...prev[cat], [mat]: value },
    }));
  }

  const getEditingRates = useCallback((party: Party): RateValues => {
    if (editingRates[party.id]) return editingRates[party.id];
    const copy: RateValues = {};
    for (const cat of rateCategories) {
      copy[cat] = {};
      for (const mat of rateMaterials) {
        copy[cat][mat] = party.rates[cat]?.[mat] ?? "";
      }
    }
    return copy;
  }, [editingRates, rateCategories, rateMaterials]);

  function setPartyRate(partyId: string, party: Party, cat: string, mat: string, value: string) {
    setEditingRates((prev) => {
      const current = prev[partyId] ?? getEditingRates(party);
      return {
        ...prev,
        [partyId]: {
          ...current,
          [cat]: { ...current[cat], [mat]: value },
        },
      };
    });
  }

  function hasRateChanges(party: Party): boolean {
    const editing = editingRates[party.id];
    if (!editing) return false;
    for (const cat of rateCategories) {
      for (const mat of rateMaterials) {
        if ((editing[cat]?.[mat] ?? "") !== (party.rates[cat]?.[mat] ?? "")) return true;
      }
    }
    return false;
  }

  async function savePartyRates(party: Party): Promise<void> {
    const rates = editingRates[party.id];
    if (!rates) return;
    setSavingId(party.id);
    try {
      await updateParty(party.id, { rates });
      setEditingRates((prev) => {
        const next = { ...prev };
        delete next[party.id];
        return next;
      });
      setSavedId(party.id);
      setTimeout(() => setSavedId(null), 1500);
    } finally {
      setSavingId(null);
    }
  }

  async function applyCommonToAll(): Promise<void> {
    setCommonApplying(true);
    setCommonResult(null);

    const results = await Promise.all(
      parties.map(async (party) => {
        const merged: RateValues = {};
        for (const cat of rateCategories) {
          merged[cat] = {};
          for (const mat of rateMaterials) {
            merged[cat][mat] = rateCard[cat]?.[mat] || party.rates[cat]?.[mat] || "";
          }
        }
        try {
          await updateParty(party.id, { rates: merged });
          return true;
        } catch {
          return false;
        }
      })
    );

    const success = results.filter(Boolean).length;
    setCommonResult({ success, total: parties.length });
    setTimeout(() => setCommonResult(null), 3000);
    setCommonApplying(false);
  }

  const totalRates = rateCategories.length * rateMaterials.length;
  const rateCardFilled = getRateCardCount(rateCard, rateCategories, rateMaterials);

  if (loading || colorsLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 text-blue-500 animate-spin" strokeWidth={1.8} />
          <p className="text-[0.85rem] text-slate-400">Loading rate data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Common Rate Card — applies to ALL parties */}
      <div className="bg-crm-card rounded-2xl card-shadow border border-crm-border">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 px-4 sm:px-6 pt-4 sm:pt-5 pb-3 sm:pb-4">
          <div>
            <h2 className="text-[0.9rem] sm:text-[0.95rem] font-semibold text-crm-text">Common Rate Card</h2>
            <p className="text-[0.74rem] sm:text-[0.78rem] text-crm-text-muted mt-0.5">
              Set rates and apply across all {parties.length} parties
            </p>
          </div>
          {rateCardFilled > 0 && (
            <span className="text-[0.72rem] font-medium px-2.5 py-1 rounded-full bg-blue-50 text-blue-600 self-start sm:self-auto">
              {rateCardFilled}/{totalRates} filled
            </span>
          )}
        </div>
        <div className="px-4 sm:px-6 pb-0">
          <RateGrid rates={rateCard} categories={rateCategories} materials={rateMaterials} onChange={setRateCardValue} />
        </div>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-end gap-2 sm:gap-3 px-4 sm:px-6 py-3 sm:py-4">
          {commonResult && (
            <span className="flex items-center justify-center gap-1.5 text-[0.78rem] font-medium text-blue-600 animate-[fadeIn_150ms_ease-out]">
              <Check className="w-3.5 h-3.5" strokeWidth={2.5} />
              Applied to {commonResult.success}/{commonResult.total} parties
            </span>
          )}
          <button
            onClick={applyCommonToAll}
            disabled={rateCardFilled === 0 || commonApplying}
            className="flex items-center justify-center gap-2 h-9 px-5 rounded-xl bg-blue-500 text-white text-[0.82rem] font-medium hover:bg-blue-600 transition-colors shadow-sm disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {commonApplying ? (
              <Loader2 className="w-4 h-4 animate-spin" strokeWidth={2} />
            ) : (
              <Save className="w-4 h-4" strokeWidth={2} />
            )}
            {commonApplying ? "Applying..." : `Apply to All ${parties.length}`}
          </button>
        </div>
      </div>

      {/* Party List — select specific parties, apply custom rates via modal */}
      <div className="bg-crm-card rounded-2xl card-shadow border border-crm-border">
        <div className="px-4 sm:px-6 pt-4 sm:pt-5 pb-3 sm:pb-4 space-y-3 sm:space-y-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:justify-between">
            <div className="flex items-center gap-3 w-full sm:w-auto">
              <button
                onClick={toggleSelectAll}
                className="flex items-center gap-2 text-[0.82rem] font-medium text-crm-text hover:text-crm-text transition-colors shrink-0"
              >
                {allSelected ? (
                  <CheckSquare className="w-4.5 h-4.5 text-blue-500" strokeWidth={1.8} />
                ) : someSelected ? (
                  <Minus className="w-4.5 h-4.5 text-blue-400" strokeWidth={1.8} />
                ) : (
                  <Square className="w-4.5 h-4.5 text-slate-300" strokeWidth={1.8} />
                )}
                <span className="hidden sm:inline">{selectedIds.size > 0 ? `${selectedIds.size} selected` : "Select All"}</span>
                <span className="sm:hidden">{selectedIds.size > 0 ? selectedIds.size : "All"}</span>
              </button>

              <div className="relative flex-1 sm:flex-initial">
                <Search
                  className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400"
                  strokeWidth={1.8}
                />
                <input
                  type="text"
                  placeholder="Search parties..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full sm:w-72 h-9 pl-9 pr-4 rounded-xl bg-white border border-slate-100 text-[0.85rem] text-slate-700 placeholder:text-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-300 transition-all"
                />
              </div>
            </div>

            <button
              onClick={() => setModalOpen(true)}
              disabled={selectedIds.size === 0}
              className="flex items-center justify-center gap-2 h-9 px-4 sm:px-5 rounded-xl bg-blue-500 text-white text-[0.82rem] font-medium hover:bg-blue-600 transition-colors shadow-sm disabled:opacity-40 disabled:cursor-not-allowed w-full sm:w-auto"
            >
              <IndianRupee className="w-4 h-4" strokeWidth={2} />
              Apply Rate
            </button>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
            <button
              onClick={() => setActiveRoute(null)}
              className={`px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-lg text-[0.72rem] sm:text-[0.78rem] font-medium transition-colors ${
                activeRoute === null
                  ? "bg-blue-500 text-white"
                  : "bg-slate-50 text-slate-600 hover:bg-slate-100"
              }`}
            >
              All
            </button>
            {uniqueRoutes.map((route) => (
              <button
                key={route}
                onClick={() => setActiveRoute(activeRoute === route ? null : route)}
                className={`px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-lg text-[0.72rem] sm:text-[0.78rem] font-medium transition-colors ${
                  activeRoute === route
                    ? "bg-blue-500 text-white"
                    : "bg-slate-50 text-slate-600 hover:bg-slate-100"
                }`}
              >
                {route}
              </button>
            ))}
          </div>
        </div>

        {/* Mobile card layout */}
        <div className="md:hidden px-4 pb-4 space-y-2">
          {filtered.map((party) => {
            const isExpanded = expandedId === party.id;
            const isSelected = selectedIds.has(party.id);
            const rateCount = getRateCount(party.rates, rateCategories, rateMaterials);

            return (
              <div key={party.id} className={`rounded-xl border overflow-hidden ${isSelected ? "border-blue-300 bg-blue-50/30" : "border-crm-border"}`}>
                <div className="flex items-center gap-2.5 px-3 py-2.5">
                  <button
                    onClick={() => toggleSelect(party.id)}
                    className="p-0.5 shrink-0"
                  >
                    {isSelected ? (
                      <CheckSquare className="w-4 h-4 text-blue-500" strokeWidth={1.8} />
                    ) : (
                      <Square className="w-4 h-4 text-slate-300" strokeWidth={1.8} />
                    )}
                  </button>
                  <button
                    onClick={() => setExpandedId(isExpanded ? null : party.id)}
                    className="flex-1 flex items-center gap-2.5 min-w-0 text-left"
                  >
                    <div className="w-7 h-7 rounded-full bg-crm-primary-muted flex items-center justify-center text-[0.6rem] font-bold text-crm-primary shrink-0">
                      {party.name.split(" ").map((w) => w[0]).join("").slice(0, 2)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[0.8rem] font-medium text-crm-text truncate">{party.name}</p>
                      <span className="text-[0.68rem] text-crm-text-muted">{party.route}</span>
                    </div>
                  </button>
                  <span className={`text-[0.65rem] font-medium px-1.5 py-0.5 rounded-full shrink-0 ${
                    rateCount === totalRates
                      ? "bg-crm-primary-muted text-crm-primary"
                      : rateCount > 0
                        ? "bg-orange-400/10 text-orange-500"
                        : "bg-crm-bg text-crm-text-muted"
                  }`}>
                    {rateCount}/{totalRates}
                  </span>
                  <button onClick={() => setExpandedId(isExpanded ? null : party.id)} className="shrink-0">
                    <ChevronDown
                      className={`w-4 h-4 text-crm-border transition-transform duration-200 ${isExpanded ? "rotate-180" : ""}`}
                      strokeWidth={1.8}
                    />
                  </button>
                </div>

                {isExpanded && (() => {
                  const rates = getEditingRates(party);
                  const changed = hasRateChanges(party);
                  const isSaving = savingId === party.id;
                  const justSaved = savedId === party.id;
                  return (
                    <div className="border-t border-crm-border px-3 py-3 animate-[fadeIn_150ms_ease-out]">
                      <RateGrid
                        rates={rates}
                        categories={rateCategories}
                        materials={rateMaterials}
                        onChange={(cat, mat, value) => setPartyRate(party.id, party, cat, mat, value)}
                      />
                      <div className="flex items-center justify-end gap-2 mt-3">
                        {justSaved && (
                          <span className="flex items-center gap-1.5 text-[0.78rem] font-medium text-blue-600">
                            <Check className="w-3.5 h-3.5" strokeWidth={2.5} />
                            Saved
                          </span>
                        )}
                        <button
                          onClick={() => savePartyRates(party)}
                          disabled={!changed || isSaving}
                          className="flex items-center gap-2 h-8 px-4 rounded-lg bg-blue-500 text-white text-[0.78rem] font-medium hover:bg-blue-600 transition-colors shadow-sm disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                          {isSaving ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" strokeWidth={2} />
                          ) : (
                            <Check className="w-3.5 h-3.5" strokeWidth={2} />
                          )}
                          {isSaving ? "Saving..." : "Save Rates"}
                        </button>
                      </div>
                    </div>
                  );
                })()}
              </div>
            );
          })}

          {filtered.length === 0 && (
            <div className="py-12 text-center">
              <p className="text-[0.9rem] text-crm-text-muted">No parties found</p>
              <p className="text-[0.78rem] text-crm-border mt-1">Try a different search or route filter</p>
            </div>
          )}
        </div>

        {/* Desktop table layout */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b-2 border-crm-border">
                <th className="w-12"></th>
                <th className="text-left px-5 py-3.5 text-[0.8rem] font-bold text-crm-text">
                  Party Name
                </th>
                <th className="text-left px-5 py-3.5 text-[0.8rem] font-bold text-crm-text w-36">
                  Route
                </th>
                <th className="text-left px-5 py-3.5 text-[0.8rem] font-bold text-crm-text w-32">
                  Rate Status
                </th>
                <th className="w-10"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((party, i) => {
                const isExpanded = expandedId === party.id;
                const isSelected = selectedIds.has(party.id);
                const rateCount = getRateCount(party.rates, rateCategories, rateMaterials);

                return (
                  <Fragment key={party.id}>
                    <tr
                      className={`border-b border-crm-border/40 cursor-pointer transition-colors hover:bg-crm-primary-muted/20 ${
                        isExpanded ? "bg-crm-primary-muted/20" : i % 2 === 1 ? "bg-crm-bg/30" : "bg-crm-card"
                      }`}
                    >
                      <td className="text-center py-3.5">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleSelect(party.id);
                          }}
                          className="p-0.5"
                        >
                          {isSelected ? (
                            <CheckSquare className="w-4 h-4 text-blue-500" strokeWidth={1.8} />
                          ) : (
                            <Square className="w-4 h-4 text-slate-300" strokeWidth={1.8} />
                          )}
                        </button>
                      </td>
                      <td
                        className="px-5 py-3"
                        onClick={() => setExpandedId(isExpanded ? null : party.id)}
                      >
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-full bg-crm-primary-muted flex items-center justify-center text-[0.68rem] font-bold text-crm-primary shrink-0">
                            {party.name
                              .split(" ")
                              .map((w) => w[0])
                              .join("")
                              .slice(0, 2)}
                          </div>
                          <p className="text-[0.84rem] font-medium text-crm-text truncate">
                            {party.name}
                          </p>
                        </div>
                      </td>
                      <td
                        className="px-5 py-3"
                        onClick={() => setExpandedId(isExpanded ? null : party.id)}
                      >
                        <span className="text-[0.84rem] text-crm-text">{party.route}</span>
                      </td>
                      <td
                        className="px-5 py-3"
                        onClick={() => setExpandedId(isExpanded ? null : party.id)}
                      >
                        <span
                          className={`text-[0.7rem] font-medium px-2 py-0.5 rounded-full ${
                            rateCount === totalRates
                              ? "bg-crm-primary-muted text-crm-primary"
                              : rateCount > 0
                                ? "bg-orange-400/10 text-orange-500"
                                : "bg-crm-bg text-crm-text-muted"
                          }`}
                        >
                          {rateCount}/{totalRates}
                        </span>
                      </td>
                      <td
                        className="text-center py-3 pr-2"
                        onClick={() => setExpandedId(isExpanded ? null : party.id)}
                      >
                        <ChevronDown
                          className={`w-4 h-4 text-crm-border transition-transform duration-200 inline-block ${
                            isExpanded ? "rotate-180" : ""
                          }`}
                          strokeWidth={1.8}
                        />
                      </td>
                    </tr>

                    {isExpanded &&
                      (() => {
                        const rates = getEditingRates(party);
                        const changed = hasRateChanges(party);
                        const isSaving = savingId === party.id;
                        const justSaved = savedId === party.id;
                        return (
                          <tr className="border-b border-crm-border/40">
                            <td></td>
                            <td colSpan={4} className="px-5 py-4">
                              <div className="animate-[fadeIn_150ms_ease-out]">
                                <RateGrid
                                  rates={rates}
                                  categories={rateCategories}
                                  materials={rateMaterials}
                                  onChange={(cat, mat, value) =>
                                    setPartyRate(party.id, party, cat, mat, value)
                                  }
                                />
                                <div className="flex items-center justify-end gap-2 mt-3">
                                  {justSaved && (
                                    <span className="flex items-center gap-1.5 text-[0.78rem] font-medium text-blue-600">
                                      <Check className="w-3.5 h-3.5" strokeWidth={2.5} />
                                      Saved
                                    </span>
                                  )}
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      savePartyRates(party);
                                    }}
                                    disabled={!changed || isSaving}
                                    className="flex items-center gap-2 h-8 px-4 rounded-lg bg-blue-500 text-white text-[0.78rem] font-medium hover:bg-blue-600 transition-colors shadow-sm disabled:opacity-40 disabled:cursor-not-allowed"
                                  >
                                    {isSaving ? (
                                      <Loader2
                                        className="w-3.5 h-3.5 animate-spin"
                                        strokeWidth={2}
                                      />
                                    ) : (
                                      <Check className="w-3.5 h-3.5" strokeWidth={2} />
                                    )}
                                    {isSaving ? "Saving..." : "Save Rates"}
                                  </button>
                                </div>
                              </div>
                            </td>
                          </tr>
                        );
                      })()}
                  </Fragment>
                );
              })}
            </tbody>
          </table>

          {filtered.length === 0 && (
            <div className="py-12 text-center">
              <p className="text-[0.9rem] text-crm-text-muted">No parties found</p>
              <p className="text-[0.78rem] text-crm-border mt-1">
                Try a different search or route filter
              </p>
            </div>
          )}
        </div>
      </div>

      {modalOpen && selectedParties.length > 0 && (
        <ApplyRateModal
          selectedParties={selectedParties}
          categories={rateCategories}
          materials={rateMaterials}
          onClose={() => setModalOpen(false)}
          onApplied={() => setSelectedIds(new Set())}
        />
      )}
    </div>
  );
}
