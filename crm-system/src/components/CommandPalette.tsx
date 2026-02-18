"use client";

import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Search,
  LayoutDashboard,
  ListOrdered,
  Package,
  Plus,
  BookUser,
  Palette,
  Route,
  IndianRupee,
  Warehouse,
  ClipboardList,
  BarChart3,
  ShieldCheck,
  UserCog,
  Settings,
  ArrowUp,
  ArrowDown,
  CornerDownLeft,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { subscribeParties } from "@/lib/parties";
import { subscribeOrders } from "@/lib/orders";
import { subscribeColors } from "@/lib/colors";
import { subscribeRoutes } from "@/lib/routes";
import type { Party, Order, Color, RouteDoc } from "@/lib/types";

interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
  keywords: string[];
}

interface ResultItem {
  id: string;
  label: string;
  subtitle?: string;
  href: string;
  icon: LucideIcon;
  group: string;
  badge?: string;
}

const NAV_ITEMS: NavItem[] = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard, keywords: ["home", "overview"] },
  { label: "Running Orders", href: "/running-orders", icon: ListOrdered, keywords: ["active", "delivery"] },
  { label: "Orders", href: "/orders", icon: Package, keywords: ["all orders", "history"] },
  { label: "Create Order", href: "/create-order", icon: Plus, keywords: ["new order", "add"] },
  { label: "Party Master", href: "/party-master", icon: BookUser, keywords: ["customer", "clients"] },
  { label: "Color Master", href: "/color-master", icon: Palette, keywords: ["colors", "inventory"] },
  { label: "Route Master", href: "/route-master", icon: Route, keywords: ["routes", "delivery"] },
  { label: "Rate Master", href: "/rate-master", icon: IndianRupee, keywords: ["pricing", "rates"] },
  { label: "Stock Inventory", href: "/stock-inventory", icon: Warehouse, keywords: ["stock", "warehouse"] },
  { label: "Inventory Report", href: "/inventory-report", icon: ClipboardList, keywords: ["report"] },
  { label: "Reports", href: "/reports", icon: BarChart3, keywords: ["analytics", "charts"] },
  { label: "Manage Sub Admin", href: "/manage-sub-admin", icon: ShieldCheck, keywords: ["admin", "users"] },
  { label: "Admin Profile", href: "/admin-profile", icon: UserCog, keywords: ["profile", "account"] },
  { label: "Settings", href: "/settings", icon: Settings, keywords: ["preferences", "config"] },
];

const DATA_LIMIT = 5;
const NAV_FILTERED_LIMIT = 6;

export default function CommandPalette(): React.ReactNode {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const [parties, setParties] = useState<Party[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [colors, setColors] = useState<Color[]>([]);
  const [routes, setRoutes] = useState<RouteDoc[]>([]);
  const dataLoadedRef = useRef(false);

  const loadFirestoreData = useCallback(() => {
    if (dataLoadedRef.current) return;
    dataLoadedRef.current = true;

    const unsubs: (() => void)[] = [];
    unsubs.push(subscribeParties(setParties));
    unsubs.push(subscribeOrders(setOrders));
    unsubs.push(subscribeColors(setColors));
    unsubs.push(subscribeRoutes(setRoutes));

    return () => unsubs.forEach((u) => u());
  }, []);

  useEffect(() => {
    if (open) {
      const cleanup = loadFirestoreData();
      return cleanup;
    }
  }, [open, loadFirestoreData]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 0);
    } else {
      setQuery("");
      setSelectedIndex(0);
    }
  }, [open]);

  const lowerQuery = query.toLowerCase().trim();

  const filteredNav = useMemo((): ResultItem[] => {
    if (!lowerQuery) {
      return NAV_ITEMS.map((item) => ({
        id: `nav-${item.href}`,
        label: item.label,
        href: item.href,
        icon: item.icon,
        group: "Navigation",
        badge: "Page",
      }));
    }
    return NAV_ITEMS.filter((item) => {
      const haystack = [item.label, ...item.keywords].join(" ").toLowerCase();
      return haystack.includes(lowerQuery);
    })
      .slice(0, NAV_FILTERED_LIMIT)
      .map((item) => ({
        id: `nav-${item.href}`,
        label: item.label,
        href: item.href,
        icon: item.icon,
        group: "Navigation",
        badge: "Page",
      }));
  }, [lowerQuery]);

  const filteredParties = useMemo((): ResultItem[] => {
    if (lowerQuery.length < 2) return [];
    return parties
      .filter((p) =>
        [p.name, p.address, p.route].some((f) => f.toLowerCase().includes(lowerQuery))
      )
      .slice(0, DATA_LIMIT)
      .map((p) => ({
        id: `party-${p.id}`,
        label: p.name,
        subtitle: p.address,
        href: "/party-master",
        icon: BookUser,
        group: "Parties",
        badge: "Party",
      }));
  }, [lowerQuery, parties]);

  const filteredOrders = useMemo((): ResultItem[] => {
    if (lowerQuery.length < 2) return [];
    return orders
      .filter((o) =>
        [o.partyName, o.partyAddress].some((f) => f.toLowerCase().includes(lowerQuery))
      )
      .slice(0, DATA_LIMIT)
      .map((o) => ({
        id: `order-${o.id}`,
        label: `#${o.csvId} - ${o.partyName}`,
        subtitle: o.partyAddress,
        href: "/running-orders",
        icon: Package,
        group: "Orders",
        badge: o.type,
      }));
  }, [lowerQuery, orders]);

  const filteredColors = useMemo((): ResultItem[] => {
    if (lowerQuery.length < 2) return [];
    return colors
      .filter((c) =>
        [c.name, c.category].some((f) => f.toLowerCase().includes(lowerQuery))
      )
      .slice(0, DATA_LIMIT)
      .map((c) => ({
        id: `color-${c.id}`,
        label: c.name,
        subtitle: c.category,
        href: "/color-master",
        icon: Palette,
        group: "Colors",
        badge: "Color",
      }));
  }, [lowerQuery, colors]);

  const filteredRoutes = useMemo((): ResultItem[] => {
    if (lowerQuery.length < 2) return [];
    return routes
      .filter((r) =>
        [r.name, r.area].some((f) => f.toLowerCase().includes(lowerQuery))
      )
      .slice(0, DATA_LIMIT)
      .map((r) => ({
        id: `route-${r.id}`,
        label: r.name,
        subtitle: r.area,
        href: "/route-master",
        icon: Route,
        group: "Routes",
        badge: "Route",
      }));
  }, [lowerQuery, routes]);

  const allResults = useMemo(
    () => [...filteredNav, ...filteredParties, ...filteredOrders, ...filteredColors, ...filteredRoutes],
    [filteredNav, filteredParties, filteredOrders, filteredColors, filteredRoutes]
  );

  const groups = useMemo(() => {
    const map = new Map<string, ResultItem[]>();
    for (const item of allResults) {
      const list = map.get(item.group) ?? [];
      list.push(item);
      map.set(item.group, list);
    }
    return Array.from(map.entries());
  }, [allResults]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  const scrollToSelected = useCallback((index: number) => {
    const container = listRef.current;
    if (!container) return;
    const items = container.querySelectorAll("[data-result-item]");
    const target = items[index] as HTMLElement | undefined;
    if (target) {
      target.scrollIntoView({ block: "nearest" });
    }
  }, []);

  const handleSelect = useCallback(
    (item: ResultItem) => {
      router.push(item.href);
      setOpen(false);
    },
    [router]
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        const next = selectedIndex < allResults.length - 1 ? selectedIndex + 1 : 0;
        setSelectedIndex(next);
        scrollToSelected(next);
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        const prev = selectedIndex > 0 ? selectedIndex - 1 : allResults.length - 1;
        setSelectedIndex(prev);
        scrollToSelected(prev);
      } else if (e.key === "Enter" && allResults[selectedIndex]) {
        e.preventDefault();
        handleSelect(allResults[selectedIndex]);
      } else if (e.key === "Escape") {
        e.preventDefault();
        setOpen(false);
      } else if (e.key === "Tab") {
        e.preventDefault();
        if (groups.length === 0) return;
        let currentGroupIdx = 0;
        let countBefore = 0;
        for (let i = 0; i < groups.length; i++) {
          if (countBefore + groups[i][1].length > selectedIndex) {
            currentGroupIdx = i;
            break;
          }
          countBefore += groups[i][1].length;
        }
        const nextGroupIdx = (currentGroupIdx + 1) % groups.length;
        let nextIndex = 0;
        for (let i = 0; i < nextGroupIdx; i++) {
          nextIndex += groups[i][1].length;
        }
        setSelectedIndex(nextIndex);
        scrollToSelected(nextIndex);
      }
    },
    [selectedIndex, allResults, groups, handleSelect, scrollToSelected]
  );

  if (!open) return null;

  let flatIndex = 0;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-start justify-center pt-[12vh]"
      onClick={() => setOpen(false)}
      style={{ animation: "cmdp-fade-in 150ms ease-out" }}
    >
      <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" />

      <div
        className="relative w-full max-w-xl bg-white rounded-2xl shadow-2xl border border-slate-200/60 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={handleKeyDown}
        style={{ animation: "cmdp-scale-in 150ms ease-out" }}
      >
        <div className="flex items-center gap-3 px-4 border-b border-slate-100">
          <Search className="w-4.5 h-4.5 text-slate-400 shrink-0" strokeWidth={1.8} />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search pages, parties, orders, colors..."
            className="flex-1 h-12 bg-transparent text-[0.92rem] text-slate-900 placeholder:text-slate-400 outline-none"
          />
          <kbd className="hidden sm:inline-flex items-center gap-1 px-2 py-1 rounded-md bg-slate-100 text-[0.68rem] font-medium text-slate-400 border border-slate-200">
            Esc
          </kbd>
        </div>

        <div ref={listRef} className="max-h-[360px] overflow-y-auto overscroll-contain py-2">
          {allResults.length === 0 ? (
            <div className="px-4 py-10 text-center">
              <p className="text-sm text-slate-400">No results found</p>
              <p className="text-xs text-slate-300 mt-1">Try a different search term</p>
            </div>
          ) : (
            groups.map(([groupName, items]) => (
              <div key={groupName} className="mb-1">
                <p className="px-4 py-1.5 text-[0.68rem] font-semibold uppercase tracking-wider text-slate-400">
                  {groupName}
                </p>
                {items.map((item) => {
                  const idx = flatIndex++;
                  const isSelected = idx === selectedIndex;
                  const Icon = item.icon;
                  return (
                    <button
                      key={item.id}
                      data-result-item
                      onClick={() => handleSelect(item)}
                      onMouseEnter={() => setSelectedIndex(idx)}
                      className={`
                        w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors duration-75
                        ${isSelected ? "bg-blue-50" : "hover:bg-slate-50"}
                      `}
                    >
                      <div
                        className={`
                          w-8 h-8 rounded-lg flex items-center justify-center shrink-0
                          ${isSelected ? "bg-blue-100 text-blue-600" : "bg-slate-100 text-slate-500"}
                          transition-colors duration-75
                        `}
                      >
                        <Icon className="w-4 h-4" strokeWidth={1.8} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p
                          className={`
                            text-[0.85rem] font-medium truncate
                            ${isSelected ? "text-blue-700" : "text-slate-700"}
                            transition-colors duration-75
                          `}
                        >
                          {item.label}
                        </p>
                        {item.subtitle && (
                          <p className="text-[0.75rem] text-slate-400 truncate">{item.subtitle}</p>
                        )}
                      </div>
                      {item.badge && (
                        <span
                          className={`
                            shrink-0 text-[0.65rem] font-medium px-2 py-0.5 rounded-md
                            ${isSelected
                              ? "bg-blue-100 text-blue-600"
                              : "bg-slate-100 text-slate-400"
                            }
                            transition-colors duration-75
                          `}
                        >
                          {item.badge}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            ))
          )}
        </div>

        <div className="flex items-center gap-4 px-4 py-2.5 border-t border-slate-100 bg-slate-50/50">
          <span className="flex items-center gap-1.5 text-[0.68rem] text-slate-400">
            <ArrowUp className="w-3 h-3" strokeWidth={2} />
            <ArrowDown className="w-3 h-3" strokeWidth={2} />
            <span>Navigate</span>
          </span>
          <span className="flex items-center gap-1.5 text-[0.68rem] text-slate-400">
            <CornerDownLeft className="w-3 h-3" strokeWidth={2} />
            <span>Open</span>
          </span>
          <span className="flex items-center gap-1.5 text-[0.68rem] text-slate-400">
            <kbd className="px-1 py-0.5 rounded bg-slate-200/60 text-[0.62rem] font-medium">esc</kbd>
            <span>Close</span>
          </span>
          <span className="flex items-center gap-1.5 text-[0.68rem] text-slate-400">
            <kbd className="px-1 py-0.5 rounded bg-slate-200/60 text-[0.62rem] font-medium">tab</kbd>
            <span>Next group</span>
          </span>
        </div>
      </div>

      <style jsx global>{`
        @keyframes cmdp-fade-in {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes cmdp-scale-in {
          from {
            opacity: 0;
            transform: scale(0.96) translateY(-8px);
          }
          to {
            opacity: 1;
            transform: scale(1) translateY(0);
          }
        }
      `}</style>
    </div>
  );
}
