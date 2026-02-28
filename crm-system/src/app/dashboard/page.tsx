"use client";

import { useEffect, useState, useMemo, useRef } from "react";
import Link from "next/link";
import {
  ListOrdered,
  BookUser,
  Palette,
  ArrowRight,

  TrendingUp,
  Calendar,
  Filter,
  X,
  ChevronDown,
  AlertTriangle,
  ShoppingBag,
  Users,
  CheckCircle2,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  ReferenceLine,
  AreaChart,
  Area,
} from "recharts";
import { subscribeOrders } from "@/lib/orders";
import { subscribeParties } from "@/lib/parties";
import { subscribeColors } from "@/lib/colors";
import { subscribeRoutes } from "@/lib/routes";
import type { Order, Color, Party, RouteDoc } from "@/lib/types";

const CHART_COLORS = ["#f5956b", "#5b5fc7", "#36b49f", "#e8b838", "#9b59b6", "#3498db"];
const FIXED_CATEGORY_COLORS: Record<string, string> = {
  "3 Tar": "#f5956b",
  "5 Tar": "#5b5fc7",
  "Yarn": "#36b49f",
};
const TOOLTIP_STYLE = {
  background: "#fff",
  border: "1px solid #c8cce8",
  borderRadius: "0.75rem",
  fontSize: "0.75rem",
  boxShadow: "0 4px 12px rgba(0,0,0,0.06)",
};
const MONTH_LABELS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function buildCategoryColorMap(categories: string[]): Record<string, string> {
  const palette = [...CHART_COLORS];
  const map: Record<string, string> = {};
  categories.forEach((cat, i) => {
    map[cat] = FIXED_CATEGORY_COLORS[cat] ?? palette[i % palette.length];
  });
  return map;
}

interface YearComparisonData {
  chartData: Record<string, unknown>[];
  years: string[];
  categories: string[];
  currentMonthKey: string;
}

function buildYearComparisonData(orders: Order[], dateFrom: string, dateTo: string): YearComparisonData {
  const now = new Date();
  const currentMonthKey = MONTH_LABELS[now.getMonth()];

  const fromDate = new Date(dateFrom + "T00:00:00");
  const toDate = new Date(dateTo + "T00:00:00");

  const visibleMonths: string[] = [];
  const d = new Date(fromDate.getFullYear(), fromDate.getMonth(), 1);
  while (d <= toDate) {
    const label = MONTH_LABELS[d.getMonth()];
    if (!visibleMonths.includes(label)) visibleMonths.push(label);
    d.setMonth(d.getMonth() + 1);
  }

  if (visibleMonths.length === 0) {
    visibleMonths.push(currentMonthKey);
  }

  const toYear = toDate.getFullYear();
  const fromYear = fromDate.getFullYear();
  const latestYear = Math.max(toYear, fromYear);
  const years = [String(latestYear - 1), String(latestYear)];

  const categorySet = new Set<string>();
  const dataMap = new Map<string, Map<string, number>>();

  for (const o of orders) {
    const year = o.orderDate.slice(0, 4);
    if (!years.includes(year)) continue;

    const monthIdx = parseInt(o.orderDate.slice(5, 7), 10) - 1;
    const monthKey = MONTH_LABELS[monthIdx];

    if (!visibleMonths.includes(monthKey)) continue;

    if (!dataMap.has(monthKey)) dataMap.set(monthKey, new Map());
    const monthMap = dataMap.get(monthKey)!;

    for (const item of o.items ?? []) {
      const cat = item.category || "Other";
      categorySet.add(cat);
      const key = `${cat}__${year}`;
      monthMap.set(key, (monthMap.get(key) ?? 0) + item.deliveredQty);
    }
  }

  const categories = [...categorySet].sort();

  const chartData: Record<string, unknown>[] = visibleMonths.map((m) => {
    const row: Record<string, unknown> = { month: m };
    const monthMap = dataMap.get(m);
    if (monthMap) {
      monthMap.forEach((val, key) => {
        if (val > 0) row[key] = val;
      });
    }
    return row;
  });

  return { chartData, years, categories, currentMonthKey };
}


function buildCategoryDistribution(orders: Order[]): { name: string; value: number }[] {
  const map = new Map<string, number>();
  for (const o of orders) {
    for (const item of o.items ?? []) {
      map.set(item.category, (map.get(item.category) ?? 0) + item.orderedQty);
    }
  }
  return [...map.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([name, value]) => ({ name, value }));
}

interface CategoryInsight {
  category: string;
  totalQty: number;
  totalDelivered: number;
  uniqueColors: number;
  uniqueParties: number;
  orderCount: number;
  fulfillmentPct: number;
  topColors: { name: string; qty: number; pct: number }[];
  topParties: { name: string; qty: number; pct: number }[];
  allColors: { name: string; qty: number }[];
  allParties: { name: string; qty: number }[];
  restockAlerts: { name: string; currentStock: number; maxStock: number; sold: number; stockPct: number }[];
}

function buildCategoryInsights(orders: Order[], colors: Color[]): CategoryInsight[] {
  const catSet = new Set<string>();
  const partyMap = new Map<string, Map<string, number>>();
  const colorMap = new Map<string, Map<string, number>>();
  const deliveredMap = new Map<string, number>();
  const orderedMap = new Map<string, number>();
  const orderIdsByCat = new Map<string, Set<string>>();
  const colorSoldMap = new Map<string, Map<string, number>>();

  for (const o of orders) {
    for (const item of o.items ?? []) {
      const cat = item.category || "Other";
      catSet.add(cat);

      orderedMap.set(cat, (orderedMap.get(cat) ?? 0) + item.orderedQty);
      deliveredMap.set(cat, (deliveredMap.get(cat) ?? 0) + item.deliveredQty);

      if (!orderIdsByCat.has(cat)) orderIdsByCat.set(cat, new Set());
      orderIdsByCat.get(cat)!.add(o.id);

      if (!partyMap.has(cat)) partyMap.set(cat, new Map());
      const pm = partyMap.get(cat)!;
      pm.set(o.partyName, (pm.get(o.partyName) ?? 0) + item.orderedQty);

      if (!colorMap.has(cat)) colorMap.set(cat, new Map());
      const cm = colorMap.get(cat)!;
      cm.set(item.color, (cm.get(item.color) ?? 0) + item.orderedQty);

      if (!colorSoldMap.has(cat)) colorSoldMap.set(cat, new Map());
      const csm = colorSoldMap.get(cat)!;
      csm.set(item.color, (csm.get(item.color) ?? 0) + item.deliveredQty);
    }
  }

  const colorsByCat = new Map<string, Color[]>();
  for (const c of colors) {
    if (!colorsByCat.has(c.category)) colorsByCat.set(c.category, []);
    colorsByCat.get(c.category)!.push(c);
  }

  return [...catSet].sort().map((category) => {
    const totalQty = orderedMap.get(category) ?? 0;
    const totalDelivered = deliveredMap.get(category) ?? 0;
    const pm = partyMap.get(category) ?? new Map();
    const cm = colorMap.get(category) ?? new Map();
    const csm = colorSoldMap.get(category) ?? new Map();
    const catColors = colorsByCat.get(category) ?? [];

    const topColors = [...cm.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([name, qty]) => ({ name, qty, pct: totalQty > 0 ? Math.round((qty / totalQty) * 100) : 0 }));

    const topParties = [...pm.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([name, qty]) => ({ name, qty, pct: totalQty > 0 ? Math.round((qty / totalQty) * 100) : 0 }));

    const restockAlerts = catColors
      .filter((c) => c.maxStock > 0)
      .map((c) => ({
        name: c.name,
        currentStock: c.currentStock,
        maxStock: c.maxStock,
        sold: csm.get(c.name) ?? 0,
        stockPct: Math.round((c.currentStock / c.maxStock) * 100),
      }))
      .filter((c) => c.stockPct < 40 && c.sold > 0)
      .sort((a, b) => a.stockPct - b.stockPct)
      .slice(0, 5);

    return {
      category,
      totalQty,
      totalDelivered,
      uniqueColors: cm.size,
      uniqueParties: pm.size,
      orderCount: orderIdsByCat.get(category)?.size ?? 0,
      fulfillmentPct: totalQty > 0 ? Math.round((totalDelivered / totalQty) * 100) : 0,
      topColors,
      topParties,
      allColors: [...cm.entries()].sort((a, b) => b[1] - a[1]).map(([name, qty]) => ({ name, qty })),
      allParties: [...pm.entries()].sort((a, b) => b[1] - a[1]).map(([name, qty]) => ({ name, qty })),
      restockAlerts,
    };
  });
}

function buildStockLevelsByCategory(colors: Color[]): { category: string; avgPct: number; minPct: number }[] {
  const map = new Map<string, { totalCurrent: number; totalMax: number; totalMin: number; count: number }>();
  for (const c of colors) {
    if (c.maxStock <= 0) continue;
    const entry = map.get(c.category) ?? { totalCurrent: 0, totalMax: 0, totalMin: 0, count: 0 };
    entry.totalCurrent += c.currentStock;
    entry.totalMax += c.maxStock;
    entry.totalMin += c.minStock;
    entry.count += 1;
    map.set(c.category, entry);
  }
  return [...map.entries()].map(([category, val]) => ({
    category,
    avgPct: Math.round((val.totalCurrent / val.totalMax) * 100),
    minPct: Math.round((val.totalMin / val.totalMax) * 100),
  }));
}

function buildLowStockList(colors: Color[]): Color[] {
  return [...colors]
    .filter((c) => c.maxStock > 0)
    .sort((a, b) => a.currentStock / a.maxStock - b.currentStock / b.maxStock)
    .slice(0, 6);
}

function buildDayWiseData(orders: Order[], dateFrom: string, dateTo: string): { day: string; orders: number }[] {
  const from = new Date(dateFrom + "T00:00:00");
  const to = new Date(dateTo + "T00:00:00");
  const now = new Date();
  const end = to > now ? now : to;

  const countByDay = new Map<string, number>();
  const d = new Date(from);
  while (d <= end) {
    const key = d.toISOString().split("T")[0];
    countByDay.set(key, 0);
    d.setDate(d.getDate() + 1);
  }

  for (const o of orders) {
    if (o.orderDate >= dateFrom && o.orderDate <= dateTo && countByDay.has(o.orderDate)) {
      countByDay.set(o.orderDate, (countByDay.get(o.orderDate) ?? 0) + 1);
    }
  }

  return Array.from(countByDay.entries())
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([day, orders]) => ({ day, orders }));
}

type DatePreset = "1y" | "6m" | "3m" | "1m";

const DATE_PRESETS: { key: DatePreset; label: string; months: number }[] = [
  { key: "1y", label: "Past Year", months: 12 },
  { key: "6m", label: "Past 6 Months", months: 6 },
  { key: "3m", label: "Past 3 Months", months: 3 },
  { key: "1m", label: "Past Month", months: 1 },
];

function getDateFromMonthsAgo(months: number): string {
  const d = new Date();
  d.setMonth(d.getMonth() - months);
  return d.toISOString().split("T")[0];
}

function getDefaultDateFrom(): string {
  return getDateFromMonthsAgo(12);
}

function Shimmer({ className }: { className?: string }) {
  return (
    <div className={`bg-gradient-to-r from-gray-100 via-gray-200 to-gray-100 bg-[length:200%_100%] animate-[shimmer_1.5s_ease-in-out_infinite] rounded-lg ${className ?? ""}`} />
  );
}

function CardShimmer() {
  return (
    <div className="bg-white rounded-xl card-shadow px-3 py-2.5 flex items-center gap-3">
      <Shimmer className="w-8 h-8 rounded-lg shrink-0" />
      <div className="flex-1 space-y-1.5">
        <Shimmer className="h-5 w-16" />
        <Shimmer className="h-3 w-24" />
      </div>
    </div>
  );
}

function ChartShimmer({ height = "h-52" }: { height?: string }) {
  return (
    <div className="bg-white rounded-2xl card-shadow p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="space-y-1.5">
          <Shimmer className="h-4 w-40" />
          <Shimmer className="h-3 w-28" />
        </div>
        <Shimmer className="h-7 w-24 rounded-xl" />
      </div>
      <Shimmer className={`w-full ${height}`} />
    </div>
  );
}

function ListShimmer({ rows = 5 }: { rows?: number }) {
  return (
    <div className="bg-white rounded-2xl card-shadow overflow-hidden">
      <div className="flex items-center justify-between px-5 pt-4 pb-3">
        <Shimmer className="h-4 w-32" />
        <Shimmer className="h-3 w-16" />
      </div>
      <div className="px-5 pb-4 space-y-3">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="flex items-center gap-3">
            <Shimmer className="w-2 h-2 rounded-full shrink-0" />
            <div className="flex-1 space-y-1">
              <Shimmer className="h-3.5 w-3/4" />
              <Shimmer className="h-2.5 w-1/2" />
            </div>
            <Shimmer className="h-5 w-16 rounded-full" />
          </div>
        ))}
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const [allOrders, setAllOrders] = useState<Order[]>([]);
  const [parties, setParties] = useState<Party[]>([]);
  const [colors, setColors] = useState<Color[]>([]);
  const [_routes, setRoutes] = useState<RouteDoc[]>([]);
  const [ordersLoaded, setOrdersLoaded] = useState(false);
  const [partiesLoaded, setPartiesLoaded] = useState(false);
  const [colorsLoaded, setColorsLoaded] = useState(false);
  const [dateFrom, setDateFrom] = useState(getDefaultDateFrom);
  const [dateTo, setDateTo] = useState(() => new Date().toISOString().split("T")[0]);
  const [activePreset, setActivePreset] = useState<DatePreset | null>("1y");
  const [activeCatTab, setActiveCatTab] = useState<string>("");
  const [sellView, setSellView] = useState<"party" | "color">("party");
  const [selectedParty, setSelectedParty] = useState<string>("");
  const [partyDropdownOpen, setPartyDropdownOpen] = useState(false);
  const [partySearch, setPartySearch] = useState("");
  const partyDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const u1 = subscribeOrders((d) => { setAllOrders(d); setOrdersLoaded(true); });
    const u2 = subscribeParties((d) => { setParties(d); setPartiesLoaded(true); });
    const u3 = subscribeColors((d) => { setColors(d); setColorsLoaded(true); });
    const u4 = subscribeRoutes((d) => { setRoutes(d); });
    return () => { u1(); u2(); u3(); u4(); };
  }, []);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (partyDropdownRef.current && !partyDropdownRef.current.contains(e.target as Node)) {
        setPartyDropdownOpen(false);
      }
    }
    if (partyDropdownOpen) document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [partyDropdownOpen]);

  const partyNames = useMemo(
    () => [...new Set(allOrders.map((o) => o.partyName))].sort(),
    [allOrders]
  );

  const filteredPartyList = useMemo(() => {
    const q = partySearch.toLowerCase();
    if (!q) return partyNames;
    return partyNames.filter((p) => p.toLowerCase().includes(q));
  }, [partyNames, partySearch]);

  const orders = useMemo(() => {
    return allOrders.filter((o) => {
      if (dateFrom && o.orderDate < dateFrom) return false;
      if (dateTo && o.orderDate > dateTo) return false;
      if (selectedParty && o.partyName !== selectedParty) return false;
      return true;
    });
  }, [allOrders, dateFrom, dateTo, selectedParty]);

  function applyPreset(preset: DatePreset) {
    const p = DATE_PRESETS.find((d) => d.key === preset)!;
    setDateFrom(getDateFromMonthsAgo(p.months));
    setDateTo(new Date().toISOString().split("T")[0]);
    setActivePreset(preset);
  }

  function handleDateFromChange(val: string) {
    setDateFrom(val);
    setActivePreset(null);
  }

  function handleDateToChange(val: string) {
    setDateTo(val);
    setActivePreset(null);
  }

  const hasActiveFilters = selectedParty !== "" || activePreset !== "1y";

  function clearFilters() {
    applyPreset("1y");
    setSelectedParty("");
  }

  const runningCount = useMemo(() => orders.filter((o) => o.type === "Running").length, [orders]);
  const stockAlertCount = useMemo(
    () => colors.filter((c) => c.minStock > 0 && c.currentStock <= c.minStock).length,
    [colors]
  );

  const completedOrders = useMemo(() => orders.filter((o) => o.type === "Complete"), [orders]);

  const totalDeliveredQtyAll = useMemo(
    () => completedOrders.reduce((s, o) => s + (o.items ?? []).reduce((si, it) => si + it.deliveredQty, 0), 0),
    [completedOrders]
  );

  const pendingQty = useMemo(() => {
    let pending = 0;
    for (const o of orders.filter((o) => o.type === "Running")) {
      for (const it of o.items ?? []) {
        pending += Math.max(0, it.orderedQty - it.deliveredQty);
      }
    }
    return pending;
  }, [orders]);

  const completedAllDates = useMemo(
    () => allOrders.filter((o) => {
      if (o.type !== "Complete") return false;
      if (selectedParty && o.partyName !== selectedParty) return false;
      return true;
    }),
    [allOrders, selectedParty]
  );

  const lowStockList = useMemo(() => buildLowStockList(colors), [colors]);

  const stockSummary = useMemo(() => {
    const tracked = colors.filter((c) => c.maxStock > 0);
    const totalColors = tracked.length;
    const critical = tracked.filter((c) => c.currentStock <= c.minStock);
    const healthy = tracked.filter((c) => {
      const pct = c.currentStock / c.maxStock;
      return pct > 0.5;
    });
    const overstock = tracked.filter((c) => c.currentStock > c.maxStock);
    const totalCurrent = tracked.reduce((s, c) => s + c.currentStock, 0);
    const totalMax = tracked.reduce((s, c) => s + c.maxStock, 0);
    const overallPct = totalMax > 0 ? Math.round((totalCurrent / totalMax) * 100) : 0;
    const totalValue = tracked.reduce((s, c) => s + c.currentStock, 0);

    const byCat = new Map<string, { current: number; max: number; critical: number; total: number }>();
    for (const c of tracked) {
      const e = byCat.get(c.category) ?? { current: 0, max: 0, critical: 0, total: 0 };
      e.current += c.currentStock;
      e.max += c.maxStock;
      e.total += 1;
      if (c.currentStock <= c.minStock) e.critical += 1;
      byCat.set(c.category, e);
    }
    const categoryBreakdown = [...byCat.entries()]
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([cat, v]) => ({
        category: cat,
        pct: v.max > 0 ? Math.round((v.current / v.max) * 100) : 0,
        critical: v.critical,
        total: v.total,
      }));

    return { totalColors, critical: critical.length, healthy: healthy.length, overstock: overstock.length, overallPct, totalValue, categoryBreakdown };
  }, [colors]);
  const yearComparison = useMemo(() => buildYearComparisonData(completedAllDates, dateFrom, dateTo), [completedAllDates, dateFrom, dateTo]);
  const categoryData = useMemo(() => buildCategoryDistribution(completedOrders), [completedOrders]);
  const totalOrderedQty = useMemo(() => categoryData.reduce((s, d) => s + d.value, 0), [categoryData]);

  const categoryColorMap = useMemo(
    () => buildCategoryColorMap(categoryData.map((d) => d.name)),
    [categoryData]
  );
  const categoryInsights = useMemo(() => buildCategoryInsights(completedOrders, colors), [completedOrders, colors]);
  const stockLevelData = useMemo(() => buildStockLevelsByCategory(colors), [colors]);

  const recentOrders = useMemo(
    () =>
      [...orders]
        .sort((a, b) => b.orderDate.localeCompare(a.orderDate) || b.csvId - a.csvId)
        .slice(0, 6),
    [orders]
  );

  const dayWiseData = useMemo(() => buildDayWiseData(orders, dateFrom, dateTo), [orders, dateFrom, dateTo]);

  const topParties = useMemo(() => {
    const map = new Map<string, number>();
    for (const o of orders) {
      map.set(o.partyName, (map.get(o.partyName) ?? 0) + 1);
    }
    return [...map.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5);
  }, [orders]);

  return (
    <div className="space-y-5">

      <div className="bg-white rounded-2xl card-shadow px-4 py-2.5 flex flex-wrap items-center gap-x-3 gap-y-2">
        <div className="flex items-center gap-3 shrink-0">
          <h2 className="text-[1.1rem] font-bold tracking-tight text-crm-text">Dashboard</h2>
          <div className="w-px h-5 bg-crm-border" />
          <Filter className="w-3.5 h-3.5 text-crm-text-muted" strokeWidth={1.8} />
        </div>

        <div className="flex flex-wrap items-center gap-3 flex-1">
          <div className="flex items-center gap-1.5">
            {DATE_PRESETS.map((p) => (
              <button
                key={p.key}
                onClick={() => applyPreset(p.key)}
                className={`h-7 px-2.5 rounded-full text-[0.7rem] font-medium border transition-all ${
                  activePreset === p.key
                    ? "bg-crm-primary text-white border-crm-primary shadow-sm"
                    : "bg-crm-bg border-crm-border text-crm-text-muted hover:text-crm-text hover:border-crm-primary/30"
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <Calendar className="w-3.5 h-3.5 text-crm-text-muted shrink-0" strokeWidth={1.8} />
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => handleDateFromChange(e.target.value)}
              className="h-8 px-2.5 rounded-lg bg-crm-bg border border-crm-border text-[0.78rem] text-crm-text focus:outline-none focus:ring-2 focus:ring-crm-primary/30 focus:border-crm-primary/50 transition-all"
            />
            <span className="text-[0.72rem] text-crm-text-muted">to</span>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => handleDateToChange(e.target.value)}
              className="h-8 px-2.5 rounded-lg bg-crm-bg border border-crm-border text-[0.78rem] text-crm-text focus:outline-none focus:ring-2 focus:ring-crm-primary/30 focus:border-crm-primary/50 transition-all"
            />
          </div>

          <div className="relative" ref={partyDropdownRef}>
            <button
              onClick={() => { setPartyDropdownOpen((v) => !v); setPartySearch(""); }}
              className={`flex items-center gap-2 h-8 px-3 rounded-lg border text-[0.78rem] font-medium transition-colors min-w-[160px] ${
                selectedParty
                  ? "bg-crm-primary-muted border-crm-primary/30 text-crm-primary"
                  : "bg-crm-bg border-crm-border text-crm-text-muted hover:text-crm-text"
              }`}
            >
              <BookUser className="w-3.5 h-3.5 shrink-0" strokeWidth={1.8} />
              <span className="flex-1 text-left truncate">
                {selectedParty || "All Parties"}
              </span>
              <ChevronDown className={`w-3.5 h-3.5 shrink-0 transition-transform ${partyDropdownOpen ? "rotate-180" : ""}`} strokeWidth={1.8} />
            </button>

            {partyDropdownOpen && (
              <div className="absolute left-0 top-full mt-1.5 w-64 bg-white rounded-xl border border-crm-border shadow-lg z-50 animate-[fadeIn_100ms_ease-out]">
                <div className="p-2 border-b border-crm-border/50">
                  <input
                    type="text"
                    placeholder="Search party..."
                    value={partySearch}
                    onChange={(e) => setPartySearch(e.target.value)}
                    autoFocus
                    className="w-full h-7 px-2.5 rounded-lg bg-crm-bg border border-crm-border text-[0.78rem] text-crm-text placeholder:text-crm-text-muted focus:outline-none focus:ring-1 focus:ring-crm-primary/30"
                  />
                </div>
                <div className="max-h-52 overflow-y-auto py-1">
                  <button
                    onClick={() => { setSelectedParty(""); setPartyDropdownOpen(false); }}
                    className={`w-full text-left px-3 py-1.5 text-[0.78rem] transition-colors ${
                      !selectedParty ? "bg-crm-primary-muted/50 text-crm-primary font-semibold" : "text-crm-text hover:bg-crm-bg"
                    }`}
                  >
                    All Parties
                  </button>
                  {filteredPartyList.map((name) => (
                    <button
                      key={name}
                      onClick={() => { setSelectedParty(name); setPartyDropdownOpen(false); }}
                      className={`w-full text-left px-3 py-1.5 text-[0.78rem] transition-colors truncate ${
                        selectedParty === name ? "bg-crm-primary-muted/50 text-crm-primary font-semibold" : "text-crm-text hover:bg-crm-bg"
                      }`}
                    >
                      {name}
                    </button>
                  ))}
                  {filteredPartyList.length === 0 && (
                    <p className="px-3 py-2 text-[0.75rem] text-crm-text-muted">No parties found</p>
                  )}
                </div>
              </div>
            )}
          </div>

          {hasActiveFilters && (
            <button
              onClick={clearFilters}
              className="flex items-center gap-1.5 h-8 px-3 rounded-lg text-[0.75rem] font-medium text-orange-500 hover:bg-orange-50 transition-colors"
            >
              <X className="w-3.5 h-3.5" strokeWidth={2} />
              Clear
            </button>
          )}
        </div>
      </div>

      {!(ordersLoaded && partiesLoaded && colorsLoaded) ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {Array.from({ length: 4 }).map((_, i) => <CardShimmer key={i} />)}
        </div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            {
              label: "Total Delivered",
              sub: `${completedOrders.length} completed orders`,
              value: totalDeliveredQtyAll.toLocaleString(),
              icon: CheckCircle2,
              accent: "bg-emerald-50 text-emerald-600",
              href: "/orders",
            },
            {
              label: "Running Orders",
              sub: `${pendingQty.toLocaleString()} qty pending`,
              value: runningCount,
              icon: ListOrdered,
              accent: "bg-crm-primary-muted text-crm-primary",
              href: "/running-orders",
            },
            {
              label: "Active Parties",
              sub: `${new Set(completedOrders.map((o) => o.partyName)).size} ordered`,
              value: parties.length,
              icon: Users,
              accent: "bg-[#ede8f8] text-[#7c5fc7]",
              href: "/party-master",
            },
            {
              label: "Stock Alerts",
              sub: `of ${colors.filter((c) => c.maxStock > 0).length} tracked colors`,
              value: stockAlertCount,
              icon: AlertTriangle,
              accent: stockAlertCount > 0 ? "bg-red-50 text-red-500" : "bg-emerald-50 text-emerald-500",
              href: "/color-master",
            },
          ].map((card) => (
            <Link
              key={card.label}
              href={card.href}
              className="bg-white rounded-xl card-shadow px-3 py-2.5 hover:shadow-md transition-shadow group flex items-center gap-3"
            >
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${card.accent}`}>
                <card.icon className="w-4 h-4" strokeWidth={1.8} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-baseline gap-2">
                  <p className="text-[1.25rem] font-bold tracking-tight text-crm-text leading-none tabular-nums">
                    {card.value.toLocaleString()}
                  </p>
                  <p className="text-[0.72rem] text-crm-text-muted font-medium truncate">{card.label}</p>
                </div>
                <p className="text-[0.62rem] text-crm-border mt-0.5">{card.sub}</p>
              </div>
            </Link>
          ))}
        </div>
      )}

      {!ordersLoaded ? (
        <ChartShimmer />
      ) : (() => {
        const fromLabel = new Date(dateFrom + "T00:00:00").toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
        const toLabel = new Date(dateTo + "T00:00:00").toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
        return (
          <div className="bg-white rounded-2xl card-shadow p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-[0.88rem] font-bold text-crm-text">
                  Orders — Day Wise
                </h3>
                <p className="text-[0.72rem] text-crm-text-muted mt-0.5">
                  {fromLabel} — {toLabel}
                </p>
              </div>
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-crm-primary-muted">
                <TrendingUp className="w-3.5 h-3.5 text-crm-primary" strokeWidth={2} />
                <span className="text-[0.72rem] font-semibold text-crm-primary">
                  {dayWiseData.reduce((s, d) => s + d.orders, 0)} orders
                </span>
              </div>
            </div>
            <div className="h-52">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={dayWiseData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="dayWiseGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#5b5fc7" stopOpacity={0.22} />
                      <stop offset="95%" stopColor="#5b5fc7" stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <XAxis
                    dataKey="day"
                    tick={{ fontSize: 10, fill: "#9ca3b0" }}
                    axisLine={false}
                    tickLine={false}
                    interval={Math.max(0, Math.ceil(dayWiseData.length / 12) - 1)}
                    tickFormatter={(v: string) => {
                      const d = new Date(v + "T00:00:00");
                      return `${d.getDate()} ${MONTH_LABELS[d.getMonth()]}`;
                    }}
                  />
                  <YAxis
                    tick={{ fontSize: 11, fill: "#9ca3b0" }}
                    axisLine={false}
                    tickLine={false}
                    allowDecimals={false}
                  />
                  <Tooltip
                    contentStyle={TOOLTIP_STYLE}
                    formatter={(value: number | undefined) => [value ?? 0, "Orders"]}
                    labelFormatter={(label: unknown) => {
                      const d = new Date(String(label) + "T00:00:00");
                      return `${d.getDate()} ${MONTH_LABELS[d.getMonth()]} ${d.getFullYear()}`;
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="orders"
                    stroke="#5b5fc7"
                    strokeWidth={2.5}
                    fill="url(#dayWiseGradient)"
                    dot={false}
                    activeDot={{ r: 5, fill: "#5b5fc7", strokeWidth: 0 }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        );
      })()}

      {!ordersLoaded ? (
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
          <div className="lg:col-span-2"><ChartShimmer height="h-64" /></div>
          <div className="lg:col-span-3"><ChartShimmer height="h-80" /></div>
        </div>
      ) : (
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        <div className="lg:col-span-2 bg-white rounded-2xl card-shadow p-5">
          <h3 className="text-[0.88rem] font-bold text-crm-text mb-3">Category Distribution</h3>
          <div className="h-52 relative">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={categoryData}
                  cx="50%"
                  cy="50%"
                  innerRadius="52%"
                  outerRadius="78%"
                  paddingAngle={3}
                  dataKey="value"
                  stroke="none"
                >
                  {categoryData.map((d) => (
                    <Cell key={d.name} fill={categoryColorMap[d.name] ?? "#999"} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={TOOLTIP_STYLE}
                  labelStyle={{ fontWeight: 700, color: "#2d2b55" }}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <span className="text-[1.6rem] font-bold text-crm-text tabular-nums leading-none">
                {totalOrderedQty.toLocaleString()}
              </span>
              <span className="text-[0.65rem] text-crm-text-muted mt-0.5">Total Qty</span>
            </div>
          </div>
          <div className="mt-3 space-y-1.5">
            {categoryData.map((d) => (
              <div key={d.name} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div
                    className="w-2.5 h-2.5 rounded-full shrink-0"
                    style={{ backgroundColor: categoryColorMap[d.name] ?? "#999" }}
                  />
                  <span className="text-[0.72rem] text-crm-text-muted truncate max-w-[120px]">{d.name}</span>
                </div>
                <span className="text-[0.72rem] font-bold text-crm-text tabular-nums">{d.value.toLocaleString()}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="lg:col-span-3 bg-white rounded-2xl card-shadow p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-[0.88rem] font-bold text-crm-text">Sell Report — Year Comparison</h3>
            <div className="flex items-center gap-3 flex-wrap">
              {yearComparison.years.map((yr, i) => {
                const isLatest = i === yearComparison.years.length - 1;
                return (
                  <span key={yr} className={`text-[0.68rem] font-bold px-2 py-0.5 rounded-md ${isLatest ? "bg-crm-primary-muted text-crm-primary" : "bg-crm-bg text-crm-text-muted"}`}>
                    {yr}
                  </span>
                );
              })}
            </div>
          </div>
          <div className="flex items-center gap-4 mb-3 flex-wrap">
            {yearComparison.categories.map((cat) => (
              <div key={cat} className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: categoryColorMap[cat] ?? "#999" }} />
                <span className="text-[0.68rem] text-crm-text-muted font-medium">{cat}</span>
              </div>
            ))}
          </div>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={yearComparison.chartData}
                margin={{ top: 8, right: 8, left: -12, bottom: 8 }}
                barCategoryGap="18%"
                barGap={2}
              >
                <defs>
                  {yearComparison.years.flatMap((yr, yi) =>
                    yearComparison.categories.map((cat) => {
                      const baseColor = categoryColorMap[cat] ?? "#999";
                      const isLatest = yi === yearComparison.years.length - 1;
                      return (
                        <pattern
                          key={`stripe-${cat}__${yr}`}
                          id={`stripe-${cat}__${yr}`}
                          width="5"
                          height="5"
                          patternUnits="userSpaceOnUse"
                          patternTransform="rotate(45)"
                        >
                          <rect width="5" height="5" fill={baseColor} opacity={isLatest ? 1 : 0.4} />
                          <rect width="2.5" height="5" fill="rgba(255,255,255,0.35)" />
                        </pattern>
                      );
                    })
                  )}
                </defs>
                <XAxis
                  dataKey="month"
                  axisLine={false}
                  tickLine={false}
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  tick={(tickProps: any) => {
                    const x = Number(tickProps.x);
                    const y = Number(tickProps.y);
                    const payload = tickProps.payload as { value: string };
                    const m = payload.value;
                    const [prevYr, currYr] = yearComparison.years;
                    const shortPrev = prevYr.slice(2);
                    const shortCurr = currYr.slice(2);
                    return (
                      <g transform={`translate(${x},${y})`}>
                        <text
                          textAnchor="middle"
                          dy={12}
                          fontSize={11}
                          fontWeight={600}
                          fill="#2d2b55"
                        >
                          {m}
                        </text>
                        <text
                          textAnchor="middle"
                          dy={24}
                          fontSize={9}
                          fill="#6e6b99"
                        >
                          {`${shortPrev} / ${shortCurr}`}
                        </text>
                      </g>
                    );
                  }}
                  height={40}
                />
                <YAxis
                  tick={{ fontSize: 10, fill: "#6e6b99" }}
                  axisLine={false}
                  tickLine={false}
                  allowDecimals={false}
                />
                <Tooltip
                  contentStyle={TOOLTIP_STYLE}
                  labelStyle={{ fontWeight: 700, color: "#2d2b55" }}
                />
                {yearComparison.years.map((yr) =>
                  yearComparison.categories.map((cat, catIdx) => {
                    const baseColor = categoryColorMap[cat] ?? "#999";
                    const isTopSegment = catIdx === yearComparison.categories.length - 1;
                    return (
                      <Bar
                        key={`${cat}__${yr}`}
                        dataKey={`${cat}__${yr}`}
                        name={`${cat} (${yr})`}
                        stackId={yr}
                        fill={baseColor}
                        radius={isTopSegment ? [4, 4, 0, 0] : [0, 0, 0, 0]}
                        label={{
                          // eslint-disable-next-line @typescript-eslint/no-explicit-any
                          content: (props: any) => {
                            const { x, y, width, height, index } = props;
                            const w = Number(width) || 0;
                            const h = Number(height) || 0;
                            if (w < 10) return null;

                            const row = yearComparison.chartData[Number(index)];
                            const segmentQty = Number(row?.[`${cat}__${yr}`] ?? 0);
                            if (segmentQty <= 0) return null;

                            const fitsInside = h >= 16;
                            const fontSize = w < 28 ? 7 : 9;
                            return (
                              <text
                                key={`seg-${cat}-${yr}-${index}`}
                                x={Number(x) + w / 2}
                                y={fitsInside ? Number(y) + h / 2 : Number(y) - 4}
                                fill={fitsInside ? "#fff" : baseColor}
                                fontSize={fontSize}
                                fontWeight={700}
                                textAnchor="middle"
                                dominantBaseline={fitsInside ? "central" : "auto"}
                              >
                                {segmentQty}
                              </text>
                            );
                          },
                        }}
                      />
                    );
                  })
                )}
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
      )}

      {!(ordersLoaded && colorsLoaded) ? (
        <ChartShimmer height="h-72" />
      ) : (() => {
        const active = categoryInsights.find((r) => r.category === activeCatTab) ?? categoryInsights[0];
        if (!active) return null;
        const catColor = categoryColorMap[active.category] ?? "#5b5fc7";
        const maxColorQty = active.topColors[0]?.qty ?? 1;
        const maxPartyQty = active.topParties[0]?.qty ?? 1;
        return (
          <div className="bg-white rounded-2xl card-shadow p-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
              <h3 className="text-[0.88rem] font-bold text-crm-text">Category Insights</h3>
              <div className="flex items-center gap-1 bg-crm-bg rounded-xl p-1">
                {categoryInsights.map((r) => (
                  <button
                    key={r.category}
                    onClick={() => setActiveCatTab(r.category)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[0.72rem] font-semibold transition-all ${
                      (activeCatTab === "" ? categoryInsights[0]?.category : activeCatTab) === r.category
                        ? "bg-white text-crm-primary card-shadow"
                        : "text-crm-text-muted hover:text-crm-text"
                    }`}
                  >
                    <span className="w-2 h-2 rounded-sm" style={{ background: categoryColorMap[r.category] ?? "#999" }} />
                    {r.category}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
              {[
                { label: "Total Ordered", value: active.totalQty.toLocaleString(), icon: ShoppingBag, color: catColor },
                { label: "Fulfillment", value: `${active.fulfillmentPct}%`, icon: CheckCircle2, color: active.fulfillmentPct >= 80 ? "#36b49f" : active.fulfillmentPct >= 50 ? "#e8b838" : "#ef4444" },
                { label: "Colors Sold", value: String(active.uniqueColors), icon: Palette, color: "#9b59b6" },
                { label: "Active Parties", value: String(active.uniqueParties), icon: Users, color: "#3498db" },
              ].map((s) => (
                <div key={s.label} className="bg-crm-bg/60 rounded-xl px-3.5 py-3">
                  <div className="flex items-center gap-2 mb-1.5">
                    <s.icon className="w-3.5 h-3.5" style={{ color: s.color }} strokeWidth={2} />
                    <span className="text-[0.68rem] text-crm-text-muted font-medium">{s.label}</span>
                  </div>
                  <p className="text-[1.1rem] font-bold text-crm-text tabular-nums">{s.value}</p>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
              <div>
                <div className="flex items-center gap-1.5 mb-3">
                  <Palette className="w-3.5 h-3.5 text-crm-text-muted" strokeWidth={1.8} />
                  <h4 className="text-[0.78rem] font-bold text-crm-text">Top Colors</h4>
                </div>
                <div className="space-y-2.5">
                  {active.topColors.map((c, i) => (
                    <div key={c.name}>
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2">
                          <span className="text-[0.65rem] font-bold text-crm-border w-3 tabular-nums">{i + 1}</span>
                          <span className="text-[0.75rem] font-medium text-crm-text truncate max-w-28">{c.name}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-[0.72rem] font-bold text-crm-text tabular-nums">{c.qty.toLocaleString()}</span>
                          <span className="text-[0.62rem] text-crm-text-muted tabular-nums">({c.pct}%)</span>
                        </div>
                      </div>
                      <div className="h-1.5 bg-crm-bg rounded-full overflow-hidden">
                        <div className="h-full rounded-full transition-all" style={{ width: `${Math.round((c.qty / maxColorQty) * 100)}%`, backgroundColor: catColor }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <div className="flex items-center gap-1.5 mb-3">
                  <BookUser className="w-3.5 h-3.5 text-crm-text-muted" strokeWidth={1.8} />
                  <h4 className="text-[0.78rem] font-bold text-crm-text">Top Parties</h4>
                </div>
                <div className="space-y-2.5">
                  {active.topParties.map((p, i) => (
                    <div key={p.name}>
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2">
                          <span className="text-[0.65rem] font-bold text-crm-border w-3 tabular-nums">{i + 1}</span>
                          <span className="text-[0.75rem] font-medium text-crm-text truncate max-w-28">{p.name}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-[0.72rem] font-bold text-crm-text tabular-nums">{p.qty.toLocaleString()}</span>
                          <span className="text-[0.62rem] text-crm-text-muted tabular-nums">({p.pct}%)</span>
                        </div>
                      </div>
                      <div className="h-1.5 bg-crm-bg rounded-full overflow-hidden">
                        <div className="h-full rounded-full transition-all" style={{ width: `${Math.round((p.qty / maxPartyQty) * 100)}%`, backgroundColor: catColor, opacity: 0.7 }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <div className="flex items-center gap-1.5 mb-3">
                  <AlertTriangle className="w-3.5 h-3.5 text-orange-500" strokeWidth={1.8} />
                  <h4 className="text-[0.78rem] font-bold text-crm-text">Restock Needed</h4>
                </div>
                {active.restockAlerts.length === 0 ? (
                  <div className="flex items-center gap-2 py-4 px-3 bg-emerald-50/60 rounded-xl">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500" strokeWidth={2} />
                    <span className="text-[0.75rem] text-emerald-700 font-medium">All stocked up</span>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {active.restockAlerts.map((c) => (
                      <div key={c.name} className="flex items-center gap-2 px-2.5 py-2 bg-orange-50/60 rounded-lg">
                        <div className="flex-1 min-w-0">
                          <p className="text-[0.75rem] font-medium text-crm-text truncate">{c.name}</p>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-[0.65rem] text-crm-text-muted">Stock: <span className="font-bold text-orange-600">{c.currentStock}/{c.maxStock}</span></span>
                            <span className="text-[0.65rem] text-crm-text-muted">Sold: <span className="font-bold text-crm-text">{c.sold.toLocaleString()}</span></span>
                          </div>
                        </div>
                        <span className={`text-[0.65rem] font-bold px-1.5 py-0.5 rounded-md ${c.stockPct <= 15 ? "bg-red-100 text-red-600" : "bg-orange-100 text-orange-600"}`}>
                          {c.stockPct}%
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      })()}

      {!(ordersLoaded && colorsLoaded) ? (
        <ChartShimmer height="h-80" />
      ) : (() => {
        const active = categoryInsights.find((r) => r.category === activeCatTab) ?? categoryInsights[0];
        if (!active) return null;
        const catColor = categoryColorMap[active.category] ?? "#5b5fc7";
        const chartData = sellView === "party" ? active.allParties : active.allColors;
        const chartH = Math.max(280, chartData.length * 32);
        return (
          <div className="bg-white rounded-2xl card-shadow p-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
              <h3 className="text-[0.88rem] font-bold text-crm-text">
                {active.category} — {sellView === "party" ? "Party" : "Color"} Wise Sell Report
              </h3>
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1 bg-crm-bg rounded-xl p-1">
                  {categoryInsights.map((r) => (
                    <button
                      key={r.category}
                      onClick={() => setActiveCatTab(r.category)}
                      className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-[0.72rem] font-semibold transition-all ${
                        (activeCatTab === "" ? categoryInsights[0]?.category : activeCatTab) === r.category
                          ? "bg-white text-crm-primary card-shadow"
                          : "text-crm-text-muted hover:text-crm-text"
                      }`}
                    >
                      <span className="w-2 h-2 rounded-sm" style={{ background: categoryColorMap[r.category] ?? "#999" }} />
                      {r.category}
                    </button>
                  ))}
                </div>
                <div className="w-px h-5 bg-crm-border" />
                <div className="flex items-center gap-1 bg-crm-bg rounded-xl p-1">
                  {(["party", "color"] as const).map((v) => (
                    <button
                      key={v}
                      onClick={() => setSellView(v)}
                      className={`px-3 py-1 rounded-lg text-[0.72rem] font-semibold transition-all ${
                        sellView === v
                          ? "bg-white text-crm-primary card-shadow"
                          : "text-crm-text-muted hover:text-crm-text"
                      }`}
                    >
                      {v === "party" ? "Party" : "Color"}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <div className="overflow-y-auto max-h-96">
              <div style={{ height: chartH }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} layout="vertical" margin={{ top: 0, right: 40, left: 0, bottom: 0 }} barSize={16}>
                    <XAxis type="number" tick={{ fontSize: 10, fill: "#6e6b99" }} axisLine={false} tickLine={false} allowDecimals={false} />
                    <YAxis type="category" dataKey="name" tick={{ fontSize: 10, fill: "#2d2b55" }} axisLine={false} tickLine={false} width={100} tickFormatter={(v: string) => (v.length > 14 ? v.slice(0, 13) + "…" : v)} />
                    <Tooltip contentStyle={TOOLTIP_STYLE} labelStyle={{ fontWeight: 700, color: "#2d2b55" }} />
                    <Bar dataKey="qty" name="Qty" fill={catColor} radius={[0, 6, 6, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        );
      })()}

      {!colorsLoaded ? (
        <ChartShimmer height="h-48" />
      ) : (
      <div className="bg-white rounded-2xl card-shadow px-4 py-3">
        <div className="flex items-center justify-between mb-2.5">
          <h3 className="text-[0.84rem] font-bold text-crm-text">Stock Health</h3>
          <Link href="/color-master" className="text-[0.68rem] font-medium text-crm-primary flex items-center gap-1 hover:underline">
            Manage <ArrowRight className="w-3 h-3" />
          </Link>
        </div>

        <div className="grid grid-cols-4 gap-2 mb-3">
          <div className="bg-crm-bg/60 rounded-lg px-2.5 py-2 text-center">
            <p className="text-[1rem] font-bold text-crm-text tabular-nums leading-none">{stockSummary.overallPct}%</p>
            <p className="text-[0.62rem] text-crm-text-muted font-medium mt-0.5">Overall</p>
          </div>
          <div className="bg-emerald-50/60 rounded-lg px-2.5 py-2 text-center">
            <p className="text-[1rem] font-bold text-emerald-600 tabular-nums leading-none">{stockSummary.healthy}</p>
            <p className="text-[0.62rem] text-crm-text-muted font-medium mt-0.5">Healthy</p>
          </div>
          <div className="bg-red-50/60 rounded-lg px-2.5 py-2 text-center">
            <p className="text-[1rem] font-bold text-red-500 tabular-nums leading-none">{stockSummary.critical}</p>
            <p className="text-[0.62rem] text-crm-text-muted font-medium mt-0.5">Critical</p>
          </div>
          <div className="bg-amber-50/60 rounded-lg px-2.5 py-2 text-center">
            <p className="text-[1rem] font-bold text-amber-600 tabular-nums leading-none">{stockSummary.overstock}</p>
            <p className="text-[0.62rem] text-crm-text-muted font-medium mt-0.5">Overstock</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div>
            <h4 className="text-[0.74rem] font-bold text-crm-text mb-2">Category Stock Levels</h4>
            <div className="space-y-2">
              {stockSummary.categoryBreakdown.map((cat) => {
                const catColor = categoryColorMap[cat.category] ?? "#999";
                return (
                  <div key={cat.category}>
                    <div className="flex items-center justify-between mb-0.5">
                      <div className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-sm" style={{ background: catColor }} />
                        <span className="text-[0.72rem] font-medium text-crm-text">{cat.category}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        {cat.critical > 0 && (
                          <span className="text-[0.6rem] font-bold px-1 py-0.5 rounded bg-red-50 text-red-500">
                            {cat.critical} critical
                          </span>
                        )}
                        <span className="text-[0.68rem] font-bold tabular-nums" style={{ color: cat.pct <= 30 ? "#ef4444" : cat.pct <= 60 ? "#e8b838" : "#36b49f" }}>
                          {cat.pct}%
                        </span>
                      </div>
                    </div>
                    <div className="h-1.5 bg-crm-bg rounded-full overflow-hidden">
                      <div className="h-full rounded-full transition-all" style={{ width: `${Math.min(cat.pct, 100)}%`, backgroundColor: catColor }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div>
            <div className="flex items-center gap-1.5 mb-2">
              <AlertTriangle className="w-3 h-3 text-red-500" strokeWidth={1.8} />
              <h4 className="text-[0.74rem] font-bold text-crm-text">Critical Stock</h4>
            </div>
            {lowStockList.length === 0 ? (
              <div className="flex items-center gap-2 py-3 px-2.5 bg-emerald-50/60 rounded-lg">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" strokeWidth={2} />
                <span className="text-[0.72rem] text-emerald-700 font-medium">All colors well stocked</span>
              </div>
            ) : (
              <div className="space-y-1.5">
                {lowStockList.map((c) => {
                  const pct = c.maxStock > 0 ? Math.round((c.currentStock / c.maxStock) * 100) : 0;
                  return (
                    <div key={c.id} className="flex items-center gap-2 px-2 py-1.5 rounded-lg bg-red-50/40">
                      <div className="w-2.5 h-2.5 rounded-full shrink-0 border border-black/10" style={{ backgroundColor: c.hex || "#ccc" }} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <span className="text-[0.72rem] font-medium text-crm-text truncate">{c.name}</span>
                          <span className="text-[0.64rem] text-crm-text-muted tabular-nums shrink-0 ml-2">{c.currentStock}/{c.maxStock}</span>
                        </div>
                        <div className="h-1 bg-white rounded-full overflow-hidden mt-0.5">
                          <div className="h-full rounded-full" style={{ width: `${Math.min(pct, 100)}%`, backgroundColor: pct <= 15 ? "#ef4444" : "#f5956b" }} />
                        </div>
                      </div>
                      <span className={`text-[0.6rem] font-bold px-1 py-0.5 rounded-md shrink-0 ${pct <= 15 ? "bg-red-100 text-red-600" : "bg-orange-100 text-orange-600"}`}>
                        {pct}%
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
      )}

      {!colorsLoaded ? (
        <ChartShimmer height="h-64" />
      ) : (
      <div className="bg-white rounded-2xl card-shadow p-5">
        <h3 className="text-[0.88rem] font-bold text-crm-text mb-4">Stock Levels by Category</h3>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={stockLevelData} margin={{ top: 4, right: 4, left: -16, bottom: 0 }} barSize={28}>
              <XAxis
                dataKey="category"
                tick={{ fontSize: 10, fill: "#6e6b99" }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v: string) => (v.length > 10 ? v.slice(0, 9) + "…" : v)}
              />
              <YAxis
                tick={{ fontSize: 10, fill: "#6e6b99" }}
                axisLine={false}
                tickLine={false}
                unit="%"
                domain={[0, 100]}
              />
              <Tooltip
                contentStyle={TOOLTIP_STYLE}
                labelStyle={{ fontWeight: 700, color: "#2d2b55" }}
                formatter={(val: number | undefined) => [`${val ?? 0}%`]}
              />
              <ReferenceLine y={30} stroke="#ef4444" strokeDasharray="4 3" strokeWidth={1.5} />
              <Bar dataKey="avgPct" name="Stock %" radius={[6, 6, 0, 0]}>
                {stockLevelData.map((d) => (
                  <Cell key={d.category} fill={categoryColorMap[d.category] ?? "#999"} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
      )}

      {!ordersLoaded ? (
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
          <div className="lg:col-span-3"><ListShimmer rows={6} /></div>
          <div className="lg:col-span-2"><ListShimmer rows={5} /></div>
        </div>
      ) : (
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">

        <div className="lg:col-span-3 bg-white rounded-2xl card-shadow overflow-hidden">
          <div className="flex items-center justify-between px-5 pt-4 pb-3">
            <h3 className="text-[0.88rem] font-bold text-crm-text">Recent Orders</h3>
            <Link
              href="/orders"
              className="text-[0.72rem] font-medium text-crm-primary flex items-center gap-1 hover:underline"
            >
              View all <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          <div className="divide-y divide-crm-border/30">
            {recentOrders.map((o) => (
              <div
                key={o.id}
                className="flex items-center gap-3 px-5 py-3 hover:bg-crm-primary-muted/30 transition-colors"
              >
                <div
                  className={`w-2 h-2 rounded-full shrink-0 ${
                    o.type === "Running" ? "bg-crm-primary" : "bg-crm-border"
                  }`}
                />
                <div className="flex-1 min-w-0">
                  <p className="text-[0.82rem] font-semibold text-crm-text truncate">{o.partyName}</p>
                  <p className="text-[0.7rem] text-crm-text-muted truncate">{o.partyAddress}</p>
                </div>
                <div className="text-right shrink-0">
                  <span
                    className={`text-[0.65rem] font-bold px-2 py-0.5 rounded-full ${
                      o.type === "Running"
                        ? "bg-crm-primary-muted text-crm-primary"
                        : "bg-crm-bg text-crm-text-muted"
                    }`}
                  >
                    {o.type}
                  </span>
                  <p className="text-[0.65rem] text-crm-border mt-1 tabular-nums">{o.orderDate}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="lg:col-span-2 bg-white rounded-2xl card-shadow overflow-hidden">
          <div className="flex items-center justify-between px-5 pt-4 pb-3">
            <h3 className="text-[0.88rem] font-bold text-crm-text">Top Parties</h3>
            <TrendingUp className="w-3.5 h-3.5 text-crm-border" />
          </div>
          <div className="px-5 pb-4 space-y-3">
            {topParties.map(([name, count], i) => (
              <div key={name} className="flex items-center gap-3">
                <span className="text-[0.65rem] font-bold text-crm-border w-4 tabular-nums">{i + 1}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-[0.78rem] font-medium text-crm-text truncate">{name}</p>
                </div>
                <span className="text-[0.72rem] font-bold text-crm-text-muted tabular-nums">{count}</span>
              </div>
            ))}
          </div>
        </div>

      </div>
      )}
    </div>
  );
}
