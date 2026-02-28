"use client";

import { useState, useMemo, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Search, MapPin } from "lucide-react";
import { subscribeParties } from "@/lib/parties";
import { subscribeRoutes } from "@/lib/routes";
import { subscribeOrders } from "@/lib/orders";
import type { Party, RouteDoc, Order } from "@/lib/types";

export default function SelectPartyPage() {
  const router = useRouter();
  const [parties, setParties] = useState<Party[]>([]);
  const [routes, setRoutes] = useState<RouteDoc[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    let partiesLoaded = false;
    let routesLoaded = false;

    const unsubParties = subscribeParties((loaded) => {
      setParties(loaded);
      partiesLoaded = true;
      if (routesLoaded) setLoading(false);
    });

    const unsubRoutes = subscribeRoutes((loaded) => {
      setRoutes(loaded);
      routesLoaded = true;
      if (partiesLoaded) setLoading(false);
    });

    const unsubOrders = subscribeOrders(setOrders);

    return () => {
      unsubParties();
      unsubRoutes();
      unsubOrders();
    };
  }, []);

  const runningPartyNames = useMemo(() => {
    const names = new Set<string>();
    for (const o of orders) {
      if (o.type === "Running") names.add(o.partyName);
    }
    return names;
  }, [orders]);

  const filteredParties = useMemo(() => {
    if (!search.trim()) return parties;
    const q = search.toLowerCase();
    return parties.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.address.toLowerCase().includes(q) ||
        p.route.toLowerCase().includes(q)
    );
  }, [parties, search]);

  const routeGroups = useMemo(() => {
    const routeNames = routes.map((r) => r.name).sort();
    const map = new Map<string, Party[]>();
    for (const name of routeNames) map.set(name, []);

    for (const p of filteredParties) {
      if (p.status === "Disable") continue;
      const list = map.get(p.route);
      if (list) list.push(p);
      else map.set(p.route, [p]);
    }

    for (const [key, val] of map) {
      if (val.length === 0) map.delete(key);
    }

    return map;
  }, [filteredParties, routes]);

  function handleSelect(party: Party) {
    router.push(`/create-order?partyId=${party.id}`);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="flex flex-col items-center gap-3">
          <Loader2
            className="w-8 h-8 text-crm-primary animate-spin"
            strokeWidth={1.8}
          />
          <p className="text-[0.85rem] text-crm-text-muted">
            Loading parties...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col flex-1">
      <div className="flex flex-col flex-1">
        <div className="flex items-center justify-between border-b border-crm-border shrink-0 px-4 sm:px-6 py-3">
          <h1 className="text-[0.9rem] sm:text-[1rem] font-bold text-crm-primary uppercase tracking-wider">
            Party Name
          </h1>
          <div className="relative w-48 sm:w-64">
            <Search
              className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-crm-text-muted"
              strokeWidth={1.8}
            />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search party..."
              className="w-full h-8 pl-9 pr-3 rounded-lg bg-crm-bg/60 border border-crm-border text-[0.8rem] text-crm-text placeholder:text-crm-text-muted focus:outline-none focus:ring-2 focus:ring-crm-primary/30 focus:border-crm-primary transition-all"
            />
          </div>
        </div>

        <div className="px-3 sm:px-5 py-3 sm:py-4">
          {Array.from(routeGroups.entries()).map(([routeName, routeParties]) => (
            <div key={routeName} className="mb-5">
              <div className="flex items-center gap-1.5 mb-2">
                <MapPin
                  className="w-3.5 h-3.5 text-crm-primary"
                  strokeWidth={2}
                />
                <p className="text-[0.82rem] font-bold text-crm-text uppercase tracking-wide">
                  {routeName} :-
                </p>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2 sm:gap-2.5">
                {routeParties.map((party) => {
                  const hasRunning = runningPartyNames.has(party.name);
                  return (
                    <button
                      key={party.id}
                      onClick={() => handleSelect(party)}
                      className="group text-left bg-white hover:bg-crm-primary-muted border border-crm-border/60 hover:border-crm-primary/40 rounded-xl overflow-hidden transition-all hover:shadow-sm active:scale-[0.97]"
                    >
                      <div className="px-3 py-2.5">
                        <p className="text-[0.8rem] font-semibold text-crm-primary truncate leading-tight">
                          {party.name}
                        </p>
                        <p className="text-[0.68rem] text-crm-text-muted truncate mt-0.5 leading-snug">
                          {party.address}
                        </p>
                      </div>
                      {hasRunning && (
                        <div className="bg-amber-50 border-t border-amber-200 px-2 py-0.5">
                          <p className="text-[0.58rem] font-medium text-amber-600 truncate">
                            Running order exists
                          </p>
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}

          {routeGroups.size === 0 && (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <p className="text-[0.9rem] font-medium text-crm-text-muted">
                No parties found
              </p>
              {search && (
                <p className="text-[0.78rem] text-crm-text-muted mt-1">
                  Try a different search term
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
