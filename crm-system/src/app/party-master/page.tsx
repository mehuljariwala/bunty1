"use client";

import { Fragment, useState, useRef, useEffect, useMemo } from "react";
import { Plus, Search, Filter, ChevronDown, MapPin, Route, KeyRound, Eye, EyeOff, X, Loader2, Save, Check } from "lucide-react";
import AddPartyModal from "@/components/AddPartyModal";
import { subscribeParties, addParty, updateParty } from "@/lib/parties";
import { subscribeColors } from "@/lib/colors";
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

type RateStatus = "all" | "complete" | "partial" | "empty";

interface Filters {
  routes: string[];
  rateStatus: RateStatus;
}

const EMPTY_FILTERS: Filters = { routes: [], rateStatus: "all" };

export default function PartyMasterPage(): React.JSX.Element {
  const [parties, setParties] = useState<Party[]>([]);
  const [loading, setLoading] = useState(true);
  const [rateCategories, setRateCategories] = useState<string[]>([]);
  const [rateMaterials, setRateMaterials] = useState<string[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [showPassFor, setShowPassFor] = useState<string | null>(null);
  const [filterOpen, setFilterOpen] = useState(false);
  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS);
  const filterRef = useRef<HTMLDivElement>(null);
  const [editingRates, setEditingRates] = useState<Record<string, RateValues>>({});
  const [savingId, setSavingId] = useState<string | null>(null);
  const [savedId, setSavedId] = useState<string | null>(null);

  const totalRates = rateCategories.length * rateMaterials.length;

  useEffect(() => {
    const unsubscribe = subscribeParties((updatedParties) => {
      setParties(updatedParties);
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  useEffect(() => {
    const unsubscribe = subscribeColors((colors) => {
      setRateCategories([...new Set(colors.map((c) => c.category))].sort());
      setRateMaterials([...new Set(colors.map((c) => c.subCategory).filter(Boolean))].sort());
    });
    return unsubscribe;
  }, []);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (filterRef.current && !filterRef.current.contains(e.target as Node)) {
        setFilterOpen(false);
      }
    }
    if (filterOpen) document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [filterOpen]);

  const uniqueRoutes = useMemo(
    () => [...new Set(parties.map((p) => p.route))].sort(),
    [parties]
  );

  const activeFilterCount =
    filters.routes.length + (filters.rateStatus !== "all" ? 1 : 0);

  const filtered = parties.filter((p) => {
    const q = search.toLowerCase();
    const matchesSearch =
      !q ||
      p.name.toLowerCase().includes(q) ||
      p.address.toLowerCase().includes(q) ||
      p.route.toLowerCase().includes(q) ||
      p.userId.toLowerCase().includes(q);

    const matchesRoute =
      filters.routes.length === 0 || filters.routes.includes(p.route);

    let matchesRate = true;
    if (filters.rateStatus !== "all") {
      const count = getRateCount(p.rates, rateCategories, rateMaterials);
      if (filters.rateStatus === "complete") matchesRate = count === totalRates;
      else if (filters.rateStatus === "partial") matchesRate = count > 0 && count < totalRates;
      else if (filters.rateStatus === "empty") matchesRate = count === 0;
    }

    return matchesSearch && matchesRoute && matchesRate;
  });

  async function handleAdd(party: Omit<Party, "id">): Promise<void> {
    await addParty(party);
  }

  function toggleExpand(id: string) {
    setExpandedId((prev) => (prev === id ? null : id));
  }

  function toggleRoute(route: string) {
    setFilters((prev) => ({
      ...prev,
      routes: prev.routes.includes(route)
        ? prev.routes.filter((r) => r !== route)
        : [...prev.routes, route],
    }));
  }

  function clearFilters() {
    setFilters(EMPTY_FILTERS);
  }

  function getEditingRates(party: Party): RateValues {
    if (editingRates[party.id]) return editingRates[party.id];
    const copy: RateValues = {};
    for (const cat of rateCategories) {
      copy[cat] = {};
      for (const mat of rateMaterials) {
        copy[cat][mat] = party.rates[cat]?.[mat] ?? "";
      }
    }
    return copy;
  }

  function setRate(partyId: string, party: Party, cat: string, mat: string, value: string) {
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

  async function saveRates(party: Party) {
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

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 text-blue-500 animate-spin" strokeWidth={1.8} />
          <p className="text-[0.85rem] text-slate-400">Loading parties...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:justify-between">
        <p className="text-[0.85rem] text-slate-400">
          {filtered.length} of {parties.length} parties
        </p>
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <div className="relative flex-1 sm:flex-initial">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" strokeWidth={1.8} />
            <input
              type="text"
              placeholder="Search name, address, route, ID..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full sm:w-72 h-9 pl-9 pr-4 rounded-xl bg-white border border-slate-100 text-[0.85rem] text-slate-700 placeholder:text-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-300 transition-all"
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
                    <button
                      onClick={clearFilters}
                      className="text-[0.72rem] font-medium text-orange-500 hover:text-orange-600 transition-colors"
                    >
                      Clear all
                    </button>
                  )}
                </div>

                <div className="px-4 pb-3">
                  <p className="text-[0.68rem] font-semibold uppercase tracking-widest text-slate-400 mb-2">
                    Route
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {uniqueRoutes.map((route) => {
                      const active = filters.routes.includes(route);
                      return (
                        <button
                          key={route}
                          onClick={() => toggleRoute(route)}
                          className={`px-2.5 py-1 rounded-lg text-[0.78rem] font-medium transition-colors ${
                            active
                              ? "bg-blue-500 text-white"
                              : "bg-slate-50 text-slate-600 hover:bg-slate-100"
                          }`}
                        >
                          {route}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="border-t border-slate-100 px-4 py-3">
                  <p className="text-[0.68rem] font-semibold uppercase tracking-widest text-slate-400 mb-2">
                    Rate Status
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {([
                      { value: "all", label: "All" },
                      { value: "complete", label: "Complete" },
                      { value: "partial", label: "Partial" },
                      { value: "empty", label: "Empty" },
                    ] as const).map(({ value, label }) => {
                      const active = filters.rateStatus === value;
                      return (
                        <button
                          key={value}
                          onClick={() => setFilters((prev) => ({ ...prev, rateStatus: value }))}
                          className={`px-2.5 py-1 rounded-lg text-[0.78rem] font-medium transition-colors ${
                            active
                              ? "bg-blue-500 text-white"
                              : "bg-slate-50 text-slate-600 hover:bg-slate-100"
                          }`}
                        >
                          {label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}
          </div>

          <button
            onClick={() => setModalOpen(true)}
            className="flex items-center gap-2 h-9 px-4 rounded-xl bg-blue-500 text-white text-[0.82rem] font-medium hover:bg-blue-600 transition-colors shadow-sm"
          >
            <Plus className="w-4 h-4" strokeWidth={2.2} />
            Add Party
          </button>
        </div>
      </div>

      {activeFilterCount > 0 && (
        <div className="flex items-center gap-2 flex-wrap">
          {filters.routes.map((route) => (
            <span
              key={route}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-blue-50 border border-blue-100 text-[0.78rem] font-medium text-blue-700"
            >
              {route}
              <button
                onClick={() => toggleRoute(route)}
                className="hover:text-orange-500 transition-colors"
              >
                <X className="w-3 h-3" strokeWidth={2} />
              </button>
            </span>
          ))}
          {filters.rateStatus !== "all" && (
            <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-blue-50 border border-blue-100 text-[0.78rem] font-medium text-blue-700">
              Rates: {filters.rateStatus}
              <button
                onClick={() => setFilters((prev) => ({ ...prev, rateStatus: "all" }))}
                className="hover:text-orange-500 transition-colors"
              >
                <X className="w-3 h-3" strokeWidth={2} />
              </button>
            </span>
          )}
          <button
            onClick={clearFilters}
            className="text-[0.76rem] font-medium text-slate-400 hover:text-orange-500 transition-colors ml-1"
          >
            Clear all
          </button>
        </div>
      )}

      <div className="bg-white rounded-2xl card-shadow overflow-x-auto">
        <table className="w-full table-fixed">
          <colgroup>
            <col className="w-10" />
            <col style={{ width: "22%" }} />
            <col style={{ width: "12%" }} />
            <col style={{ width: "26%" }} />
            <col style={{ width: "12%" }} />
            <col style={{ width: "18%" }} />
            <col style={{ width: "10%" }} />
          </colgroup>
          <thead>
            <tr className="border-b border-slate-100">
              <th></th>
              <th className="text-left px-4 py-3 text-[0.7rem] font-semibold uppercase tracking-wider text-slate-400">Name</th>
              <th className="text-left px-4 py-3 text-[0.7rem] font-semibold uppercase tracking-wider text-slate-400">ID</th>
              <th className="text-left px-4 py-3 text-[0.7rem] font-semibold uppercase tracking-wider text-slate-400">Address</th>
              <th className="text-left px-4 py-3 text-[0.7rem] font-semibold uppercase tracking-wider text-slate-400">Route</th>
              <th className="text-left px-4 py-3 text-[0.7rem] font-semibold uppercase tracking-wider text-slate-400">Password</th>
              <th className="text-left px-4 py-3 text-[0.7rem] font-semibold uppercase tracking-wider text-slate-400">Rates</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((party) => {
              const isExpanded = expandedId === party.id;
              const rateCount = getRateCount(party.rates, rateCategories, rateMaterials);

              return (
                <Fragment key={party.id}>
                  <tr
                    onClick={() => toggleExpand(party.id)}
                    className={`border-b border-slate-50 cursor-pointer transition-colors ${
                      isExpanded ? "bg-blue-50/50" : "hover:bg-slate-50"
                    }`}
                  >
                    <td className="text-center py-3.5">
                      <ChevronDown
                        className={`w-4 h-4 text-slate-300 transition-transform duration-200 inline-block ${
                          isExpanded ? "rotate-180" : ""
                        }`}
                        strokeWidth={1.8}
                      />
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-[0.68rem] font-bold text-blue-700 shrink-0">
                          {party.name.split(" ").map((w) => w[0]).join("").slice(0, 2)}
                        </div>
                        <p className="text-[0.84rem] font-medium text-slate-800 truncate">
                          {party.name}
                        </p>
                      </div>
                    </td>
                    <td className="px-4 py-3.5">
                      <span className="text-[0.78rem] font-mono text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md">
                        {party.userId}
                      </span>
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-1.5">
                        <MapPin className="w-3.5 h-3.5 text-slate-300 shrink-0" strokeWidth={1.8} />
                        <span className="text-[0.82rem] text-slate-600 truncate">
                          {party.address}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-1.5">
                        <Route className="w-3.5 h-3.5 text-slate-300 shrink-0" strokeWidth={1.8} />
                        <span className="text-[0.82rem] text-slate-600">
                          {party.route}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-1.5">
                        <KeyRound className="w-3.5 h-3.5 text-slate-300 shrink-0" strokeWidth={1.8} />
                        <span className="text-[0.82rem] text-slate-500 font-mono">
                          {showPassFor === party.id ? party.password : "••••••"}
                        </span>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setShowPassFor((prev) => (prev === party.id ? null : party.id));
                          }}
                          className="p-0.5 rounded hover:bg-slate-100 text-slate-300 hover:text-slate-500 transition-colors"
                        >
                          {showPassFor === party.id ? (
                            <EyeOff className="w-3.5 h-3.5" strokeWidth={1.8} />
                          ) : (
                            <Eye className="w-3.5 h-3.5" strokeWidth={1.8} />
                          )}
                        </button>
                      </div>
                    </td>
                    <td className="px-4 py-3.5">
                      <span className={`text-[0.7rem] font-medium px-2 py-0.5 rounded-full ${
                        rateCount === totalRates
                          ? "bg-blue-50 text-blue-600"
                          : rateCount > 0
                            ? "bg-orange-400/10 text-orange-500"
                            : "bg-slate-100 text-slate-400"
                      }`}>
                        {rateCount}/{totalRates}
                      </span>
                    </td>
                  </tr>

                  {isExpanded && (() => {
                    const rates = getEditingRates(party);
                    const changed = hasRateChanges(party);
                    const isSaving = savingId === party.id;
                    const justSaved = savedId === party.id;
                    return (
                      <tr className="border-b border-slate-50">
                        <td></td>
                        <td colSpan={6} className="px-4 py-4">
                          <div className="bg-slate-50 rounded-xl border border-slate-100 overflow-hidden animate-[fadeIn_150ms_ease-out]">
                            <table className="w-full">
                              <thead>
                                <tr className="border-b border-slate-100">
                                  <th className="text-left px-4 py-2.5 text-[0.68rem] font-semibold uppercase tracking-wider text-slate-400 w-28">
                                    Material
                                  </th>
                                  {rateCategories.map((cat) => (
                                    <th key={cat} className="text-center px-4 py-2.5 text-[0.68rem] font-semibold uppercase tracking-wider text-slate-400">
                                      {cat}
                                    </th>
                                  ))}
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-100/60">
                                {rateMaterials.map((mat) => (
                                  <tr key={mat} className="hover:bg-slate-100/50 transition-colors">
                                    <td className="px-4 py-1.5 text-[0.8rem] font-medium text-slate-700">
                                      {mat}
                                    </td>
                                    {rateCategories.map((cat) => (
                                      <td key={cat} className="text-center px-3 py-1.5">
                                        <div className="relative inline-block">
                                          <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[0.72rem] text-slate-300 pointer-events-none">₹</span>
                                          <input
                                            type="number"
                                            step="0.01"
                                            min="0"
                                            placeholder="—"
                                            value={rates[cat]?.[mat] ?? ""}
                                            onClick={(e) => e.stopPropagation()}
                                            onChange={(e) => setRate(party.id, party, cat, mat, e.target.value)}
                                            className="w-24 h-8 pl-6 pr-2 rounded-lg bg-white border border-slate-100 text-[0.82rem] text-slate-800 text-center placeholder:text-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-300 transition-all [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                          />
                                        </div>
                                      </td>
                                    ))}
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                            <div className="flex items-center justify-end gap-2 px-4 py-3 border-t border-slate-100 bg-slate-50">
                              {justSaved && (
                                <span className="flex items-center gap-1.5 text-[0.78rem] font-medium text-blue-600">
                                  <Check className="w-3.5 h-3.5" strokeWidth={2.5} />
                                  Saved
                                </span>
                              )}
                              <button
                                onClick={(e) => { e.stopPropagation(); saveRates(party); }}
                                disabled={!changed || isSaving}
                                className="flex items-center gap-2 h-8 px-4 rounded-lg bg-blue-500 text-white text-[0.78rem] font-medium hover:bg-blue-600 transition-colors shadow-sm disabled:opacity-40 disabled:cursor-not-allowed"
                              >
                                {isSaving ? (
                                  <Loader2 className="w-3.5 h-3.5 animate-spin" strokeWidth={2} />
                                ) : (
                                  <Save className="w-3.5 h-3.5" strokeWidth={2} />
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
            <p className="text-[0.9rem] text-slate-400">No parties found</p>
            <p className="text-[0.78rem] text-slate-300 mt-1">
              {activeFilterCount > 0 ? "Try adjusting your filters" : "Try a different search term"}
            </p>
          </div>
        )}
      </div>

      <AddPartyModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onAdd={handleAdd}
      />
    </div>
  );
}
