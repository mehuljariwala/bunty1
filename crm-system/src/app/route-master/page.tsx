"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import { Plus, Search, Filter, X, Pencil, Trash2, CircleCheck, CircleMinus, MapPin, Users, Loader2 } from "lucide-react";
import AddRouteModal, { type RouteFormData } from "@/components/AddRouteModal";
import { subscribeRoutes, addRoute, updateRoute, deleteRoute } from "@/lib/routes";
import { subscribeParties } from "@/lib/parties";
import type { RouteDoc, Party } from "@/lib/types";

type FilterState = {
  areas: string[];
  activeOnly: boolean;
};

const EMPTY_FILTERS: FilterState = { areas: [], activeOnly: false };

export default function RouteMasterPage(): React.JSX.Element {
  const [routes, setRoutes] = useState<RouteDoc[]>([]);
  const [parties, setParties] = useState<Party[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingRoute, setEditingRoute] = useState<RouteDoc | null>(null);
  const [search, setSearch] = useState("");
  const [filterOpen, setFilterOpen] = useState(false);
  const [filters, setFilters] = useState<FilterState>(EMPTY_FILTERS);
  const filterRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let routesLoaded = false;
    let partiesLoaded = false;
    const unsub1 = subscribeRoutes((updated) => {
      setRoutes(updated);
      routesLoaded = true;
      if (partiesLoaded) setLoading(false);
    });
    const unsub2 = subscribeParties((updated) => {
      setParties(updated);
      partiesLoaded = true;
      if (routesLoaded) setLoading(false);
    });
    return () => { unsub1(); unsub2(); };
  }, []);

  const partyCountByRoute = useMemo(() => {
    const map = new Map<string, number>();
    for (const p of parties) {
      const route = p.route.toUpperCase();
      map.set(route, (map.get(route) || 0) + 1);
    }
    return map;
  }, [parties]);

  const areas = useMemo(
    () => [...new Set(routes.map((r) => r.area).filter(Boolean))].sort(),
    [routes]
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

  const activeFilterCount = filters.areas.length + (filters.activeOnly ? 1 : 0);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return routes.filter((r) => {
      const matchesSearch =
        !q ||
        r.name.toLowerCase().includes(q) ||
        r.code.toLowerCase().includes(q) ||
        r.area.toLowerCase().includes(q) ||
        r.description.toLowerCase().includes(q);
      const matchesArea = filters.areas.length === 0 || filters.areas.includes(r.area);
      const matchesActive = !filters.activeOnly || r.active;
      return matchesSearch && matchesArea && matchesActive;
    });
  }, [routes, search, filters]);

  const totalParties = parties.length;
  const activeRoutes = routes.filter((r) => r.active).length;

  async function handleSubmit(data: RouteFormData): Promise<void> {
    if (editingRoute) {
      await updateRoute(editingRoute.id, {
        name: data.name,
        code: data.code,
        area: data.area,
        description: data.description,
        active: data.active,
      });
      setEditingRoute(null);
    } else {
      await addRoute({
        name: data.name,
        code: data.code,
        area: data.area,
        description: data.description,
        active: data.active,
        parties: 0,
        createdAt: new Date().toISOString(),
      });
    }
  }

  function handleEdit(route: RouteDoc) {
    setEditingRoute(route);
    setModalOpen(true);
  }

  function handleCloseModal() {
    setModalOpen(false);
    setEditingRoute(null);
  }

  async function handleDelete(id: string): Promise<void> {
    await deleteRoute(id);
  }

  function toggleArea(area: string) {
    setFilters((prev) => ({
      ...prev,
      areas: prev.areas.includes(area) ? prev.areas.filter((a) => a !== area) : [...prev.areas, area],
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
          <p className="text-[0.85rem] text-slate-400">Loading routes...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <SummaryCard label="Total Routes" value={routes.length} accent="blue" />
        <SummaryCard label="Active Routes" value={activeRoutes} accent="sky" />
        <SummaryCard label="Total Parties" value={totalParties} accent="orange" />
      </div>

      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:justify-between">
        <p className="text-[0.85rem] text-slate-400">
          {filtered.length} of {routes.length} routes
        </p>
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <div className="relative flex-1 sm:flex-initial">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" strokeWidth={1.8} />
            <input
              type="text"
              placeholder="Search name, code, area..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full sm:w-64 h-9 pl-9 pr-4 rounded-xl bg-white border border-slate-100 text-[0.85rem] text-slate-700 placeholder:text-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-300 transition-all"
            />
          </div>

          {areas.length > 0 && (
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
                    <p className="text-[0.68rem] font-semibold uppercase tracking-widest text-slate-400 mb-2">Area / Zone</p>
                    <div className="flex flex-wrap gap-1.5">
                      {areas.map((area) => (
                        <button
                          key={area}
                          onClick={() => toggleArea(area)}
                          className={`px-2.5 py-1 rounded-lg text-[0.78rem] font-medium transition-colors ${
                            filters.areas.includes(area)
                              ? "bg-blue-500 text-white"
                              : "bg-slate-50 text-slate-600 hover:bg-slate-100"
                          }`}
                        >
                          {area}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="border-t border-slate-100 px-4 py-3">
                    <label className="flex items-center gap-2.5 cursor-pointer">
                      <div className="relative">
                        <input
                          type="checkbox"
                          checked={filters.activeOnly}
                          onChange={(e) => setFilters((prev) => ({ ...prev, activeOnly: e.target.checked }))}
                          className="sr-only peer"
                        />
                        <div className="w-8 h-[18px] rounded-full bg-slate-200 peer-checked:bg-blue-500 transition-colors" />
                        <div className="absolute top-[1px] left-[1px] w-4 h-4 rounded-full bg-white shadow-sm peer-checked:translate-x-[14px] transition-transform" />
                      </div>
                      <span className="text-[0.8rem] font-medium text-slate-700">Active routes only</span>
                    </label>
                  </div>
                </div>
              )}
            </div>
          )}

          <button
            onClick={() => setModalOpen(true)}
            className="flex items-center gap-2 h-9 px-4 rounded-xl bg-blue-500 text-white text-[0.82rem] font-medium hover:bg-blue-600 transition-colors shadow-sm"
          >
            <Plus className="w-4 h-4" strokeWidth={2.2} />
            Add Route
          </button>
        </div>
      </div>

      {activeFilterCount > 0 && (
        <div className="flex items-center gap-2 flex-wrap">
          {filters.areas.map((area) => (
            <span key={area} className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-blue-50 border border-blue-100 text-[0.78rem] font-medium text-blue-700">
              {area}
              <button onClick={() => toggleArea(area)} className="hover:text-orange-500 transition-colors"><X className="w-3 h-3" strokeWidth={2} /></button>
            </span>
          ))}
          {filters.activeOnly && (
            <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-blue-50 border border-blue-100 text-[0.78rem] font-medium text-blue-700">
              Active only
              <button onClick={() => setFilters((p) => ({ ...p, activeOnly: false }))} className="hover:text-orange-500 transition-colors"><X className="w-3 h-3" strokeWidth={2} /></button>
            </span>
          )}
          <button onClick={clearFilters} className="text-[0.76rem] font-medium text-slate-400 hover:text-orange-500 transition-colors ml-1">Clear all</button>
        </div>
      )}

      <div className="bg-white rounded-2xl card-shadow overflow-x-auto">
        <table className="w-full table-fixed">
          <colgroup>
            <col style={{ width: "16%" }} />
            <col style={{ width: "10%" }} />
            <col style={{ width: "14%" }} />
            <col style={{ width: "28%" }} />
            <col style={{ width: "10%" }} />
            <col style={{ width: "10%" }} />
            <col style={{ width: "12%" }} />
          </colgroup>
          <thead>
            <tr className="border-b border-slate-100">
              <th className="text-left px-4 py-3 text-[0.7rem] font-semibold uppercase tracking-wider text-slate-400">Route Name</th>
              <th className="text-left px-4 py-3 text-[0.7rem] font-semibold uppercase tracking-wider text-slate-400">Code</th>
              <th className="text-left px-4 py-3 text-[0.7rem] font-semibold uppercase tracking-wider text-slate-400">Area / Zone</th>
              <th className="text-left px-4 py-3 text-[0.7rem] font-semibold uppercase tracking-wider text-slate-400">Description</th>
              <th className="text-center px-4 py-3 text-[0.7rem] font-semibold uppercase tracking-wider text-slate-400">Parties</th>
              <th className="text-center px-4 py-3 text-[0.7rem] font-semibold uppercase tracking-wider text-slate-400">Status</th>
              <th className="w-16"></th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((route) => (
              <tr key={route.id} className="border-b border-slate-50 hover:bg-slate-50 transition-colors">
                <td className="px-4 py-3">
                  <p className="text-[0.84rem] font-medium text-slate-800 truncate">
                    {route.name}
                  </p>
                </td>
                <td className="px-4 py-3">
                  {route.code ? (
                    <span className="text-[0.78rem] font-mono text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md">
                      {route.code}
                    </span>
                  ) : (
                    <span className="text-[0.72rem] text-slate-300">—</span>
                  )}
                </td>
                <td className="px-4 py-3">
                  {route.area ? (
                    <div className="flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-slate-300 shrink-0" strokeWidth={1.8} />
                      <span className="text-[0.82rem] text-slate-600 truncate">{route.area}</span>
                    </div>
                  ) : (
                    <span className="text-[0.72rem] text-slate-300">—</span>
                  )}
                </td>
                <td className="px-4 py-3">
                  {route.description ? (
                    <p className="text-[0.8rem] text-slate-400 truncate">{route.description}</p>
                  ) : (
                    <span className="text-[0.72rem] text-slate-300">—</span>
                  )}
                </td>
                <td className="px-4 py-3 text-center">
                  <div className="flex items-center justify-center gap-1.5">
                    <Users className="w-3.5 h-3.5 text-slate-300" strokeWidth={1.8} />
                    <span className="text-[0.82rem] font-semibold text-slate-700">{partyCountByRoute.get(route.name.toUpperCase()) || 0}</span>
                  </div>
                </td>
                <td className="px-4 py-3 text-center">
                  {route.active ? (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-50 text-blue-600 text-[0.7rem] font-medium">
                      <CircleCheck className="w-3 h-3" strokeWidth={2} />
                      Active
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-50 text-slate-400 text-[0.7rem] font-medium">
                      <CircleMinus className="w-3 h-3" strokeWidth={2} />
                      Inactive
                    </span>
                  )}
                </td>
                <td className="px-3 py-3">
                  <div className="flex items-center gap-0.5">
                    <button
                      onClick={() => handleEdit(route)}
                      className="p-1.5 rounded-lg hover:bg-slate-100 transition-colors text-slate-300 hover:text-slate-600"
                    >
                      <Pencil className="w-3.5 h-3.5" strokeWidth={1.8} />
                    </button>
                    <button
                      onClick={() => handleDelete(route.id)}
                      className="p-1.5 rounded-lg hover:bg-orange-400/10 transition-colors text-slate-300 hover:text-orange-500"
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
            <p className="text-[0.9rem] text-slate-400">No routes found</p>
            <p className="text-[0.78rem] text-slate-300 mt-1">
              {activeFilterCount > 0 ? "Try adjusting your filters" : search ? "Try a different search term" : "Add your first route to get started"}
            </p>
          </div>
        )}
      </div>

      <AddRouteModal
        open={modalOpen}
        onClose={handleCloseModal}
        onAdd={handleSubmit}
        editData={editingRoute ? {
          name: editingRoute.name,
          code: editingRoute.code,
          area: editingRoute.area,
          description: editingRoute.description,
          active: editingRoute.active,
        } : null}
      />
    </div>
  );
}

function SummaryCard({ label, value, accent }: { label: string; value: number; accent: "blue" | "sky" | "orange" }) {
  const styles = {
    blue: "bg-blue-50 text-blue-700 border-blue-100",
    sky: "bg-sky-50 text-sky-700 border-sky-100",
    orange: "bg-orange-50 text-orange-700 border-orange-100",
  };

  return (
    <div className={`rounded-2xl border px-5 py-4 ${styles[accent]}`}>
      <p className="text-[0.72rem] font-semibold uppercase tracking-widest opacity-60 mb-1">{label}</p>
      <p className="text-2xl font-bold">{value}</p>
    </div>
  );
}
