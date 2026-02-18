"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import {
  Package,
  ListOrdered,
  BookUser,
  TrendingUp,
  TrendingDown,
  ArrowRight,
  Loader2,
  Clock,
  MapPin,
  Truck,
  Palette,
  Activity,
  Route,
} from "lucide-react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
} from "recharts";
import { subscribeOrders } from "@/lib/orders";
import { subscribeParties } from "@/lib/parties";
import { subscribeColors } from "@/lib/colors";
import { subscribeRoutes } from "@/lib/routes";
import type { Order, Color, RouteDoc } from "@/lib/types";

function hasPendingItems(order: Order): boolean {
  return (order.items ?? []).some((i) => i.deliveredQty < i.orderedQty);
}

function formatShortDate(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}

export default function DashboardPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [parties, setParties] = useState<{ id: string }[]>([]);
  const [colors, setColors] = useState<Color[]>([]);
  const [routes, setRoutes] = useState<RouteDoc[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let loaded = 0;
    const done = () => { loaded++; if (loaded >= 4) setLoading(false); };

    const u1 = subscribeOrders((d) => { setOrders(d); done(); });
    const u2 = subscribeParties((d) => { setParties(d); done(); });
    const u3 = subscribeColors((d) => { setColors(d); done(); });
    const u4 = subscribeRoutes((d) => { setRoutes(d); done(); });

    return () => { u1(); u2(); u3(); u4(); };
  }, []);

  const stats = useMemo(() => {
    const totalOrders = orders.length;
    const running = orders.filter((o) => o.type === "Running").length;
    const complete = orders.filter((o) => o.type === "Complete").length;
    const pending = orders.filter((o) => hasPendingItems(o)).length;

    const today = new Date().toISOString().split("T")[0];
    const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString().split("T")[0];
    const twoWeeksAgo = new Date(Date.now() - 14 * 86400000).toISOString().split("T")[0];
    const thisWeekOrders = orders.filter((o) => o.orderDate >= weekAgo && o.orderDate <= today).length;
    const lastWeekOrders = orders.filter((o) => o.orderDate >= twoWeeksAgo && o.orderDate < weekAgo).length;

    const lowStockColors = colors.filter((c) => c.currentStock <= c.minStock && c.minStock > 0);

    const routeBreakdown = new Map<string, number>();
    for (const o of orders) {
      if (o.type === "Running") {
        routeBreakdown.set(o.route, (routeBreakdown.get(o.route) || 0) + 1);
      }
    }

    const recentOrders = [...orders]
      .sort((a, b) => b.orderDate.localeCompare(a.orderDate) || b.csvId - a.csvId)
      .slice(0, 6);

    const topParties = new Map<string, number>();
    for (const o of orders) {
      topParties.set(o.partyName, (topParties.get(o.partyName) || 0) + 1);
    }
    const topPartiesList = [...topParties.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);

    // --- Chart data ---

    const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000);
    const trendMap = new Map<string, number>();
    for (let i = 0; i < 30; i++) {
      const d = new Date(thirtyDaysAgo.getTime() + i * 86400000);
      trendMap.set(d.toISOString().split("T")[0], 0);
    }
    for (const o of orders) {
      if (trendMap.has(o.orderDate)) {
        trendMap.set(o.orderDate, (trendMap.get(o.orderDate) || 0) + 1);
      }
    }
    const ordersTrend = [...trendMap.entries()].map(([date, count]) => ({
      date,
      label: formatShortDate(date),
      count,
    }));

    const statusData = [
      { name: "Running", value: running, color: "#8faa6b" },
      { name: "Complete", value: complete, color: "#8b8680" },
      { name: "Pending", value: pending, color: "#f59e0b" },
    ];

    const routeChartData = [...routeBreakdown.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([route, count]) => ({ route, count }));

    const maxRouteCount = Math.max(...routeBreakdown.values(), 0);
    const heavyRoute = running > 0
      ? [...routeBreakdown.entries()].find(([, c]) => c / running > 0.4)
      : undefined;

    return {
      totalOrders,
      running,
      complete,
      pending,
      thisWeekOrders,
      lastWeekOrders,
      totalParties: parties.length,
      totalColors: colors.length,
      totalRoutes: routes.filter((r) => r.active).length,
      lowStockColors,
      routeBreakdown,
      recentOrders,
      topPartiesList,
      ordersTrend,
      statusData,
      routeChartData,
      maxRouteCount,
      heavyRoute,
    };
  }, [orders, parties, colors, routes]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
      </div>
    );
  }

  const weekDiff = stats.thisWeekOrders - stats.lastWeekOrders;
  const weekUp = weekDiff >= 0;

  return (
    <div className="space-y-6">

      <div>
        <h2 className="text-[1.35rem] font-bold tracking-tight text-slate-900">Dashboard</h2>
        <p className="text-[0.82rem] text-slate-400 mt-0.5">Overview of your business</p>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3.5">
        {[
          { label: "Total Orders", value: stats.totalOrders, icon: Package, accent: "bg-blue-50 text-blue-500", href: "/orders" },
          { label: "Running", value: stats.running, icon: ListOrdered, accent: "bg-blue-50 text-blue-500", href: "/running-orders" },
          { label: "Pending", value: stats.pending, icon: Clock, accent: "bg-amber-50 text-amber-500", href: "/running-orders" },
          { label: "Parties", value: stats.totalParties, icon: BookUser, accent: "bg-purple-50 text-purple-500", href: "/party-master" },
        ].map((s) => (
          <Link key={s.label} href={s.href} className="bg-white rounded-xl sm:rounded-2xl p-3 sm:p-4.5 card-shadow hover:card-shadow-hover transition-shadow group">
            <div className="flex items-center justify-between mb-2 sm:mb-3">
              <div className={`w-8 h-8 sm:w-9 sm:h-9 rounded-lg sm:rounded-xl flex items-center justify-center ${s.accent}`}>
                <s.icon className="w-4 h-4 sm:w-4.5 sm:h-4.5" strokeWidth={1.8} />
              </div>
              <ArrowRight className="w-3.5 h-3.5 text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity hidden sm:block" />
            </div>
            <p className="text-[1.2rem] sm:text-[1.6rem] font-bold tracking-tight text-slate-900 leading-none tabular-nums">{s.value.toLocaleString()}</p>
            <p className="text-[0.68rem] sm:text-[0.75rem] text-slate-400 font-medium mt-0.5 sm:mt-1">{s.label}</p>
          </Link>
        ))}
      </div>

      {/* Secondary Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3.5">
        {[
          { label: "This Week", value: stats.thisWeekOrders, sub: "orders" },
          { label: "Complete", value: stats.complete, sub: "orders" },
          { label: "Colors", value: stats.totalColors, sub: "in master" },
          { label: "Routes", value: stats.totalRoutes, sub: "active" },
        ].map((s) => (
          <div key={s.label} className="bg-white rounded-lg sm:rounded-xl px-3 py-2.5 sm:px-4 sm:py-3.5 card-shadow">
            <p className="text-[1rem] sm:text-[1.2rem] font-bold text-slate-800 tabular-nums">{s.value.toLocaleString()}</p>
            <p className="text-[0.65rem] sm:text-[0.72rem] text-slate-400 mt-0.5">{s.label} <span className="text-slate-300 hidden sm:inline">&middot; {s.sub}</span></p>
          </div>
        ))}
      </div>

      {/* Orders Trend — Area Chart */}
      <div className="bg-white rounded-xl sm:rounded-2xl card-shadow p-4 sm:p-5">
        <h3 className="text-[0.82rem] sm:text-[0.88rem] font-bold text-slate-800 mb-4">Orders Trend — Last 30 Days</h3>
        <div className="h-52 sm:h-64">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={stats.ordersTrend} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="areaFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#8faa6b" stopOpacity={0.3} />
                  <stop offset="100%" stopColor="#8faa6b" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <XAxis
                dataKey="label"
                tick={{ fontSize: 10, fill: "#8b8680" }}
                axisLine={false}
                tickLine={false}
                interval="preserveStartEnd"
              />
              <YAxis
                tick={{ fontSize: 10, fill: "#8b8680" }}
                axisLine={false}
                tickLine={false}
                allowDecimals={false}
              />
              <Tooltip
                contentStyle={{
                  background: "#fff",
                  border: "1px solid #e8e4df",
                  borderRadius: "0.75rem",
                  fontSize: "0.75rem",
                  boxShadow: "0 4px 12px rgba(0,0,0,0.06)",
                }}
                labelStyle={{ fontWeight: 700, color: "#3d3832" }}
              />
              <Area
                type="monotone"
                dataKey="count"
                stroke="#8faa6b"
                strokeWidth={2}
                fill="url(#areaFill)"
                name="Orders"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Donut + Bar Chart Row */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-3 sm:gap-5">

        {/* Order Status — Donut */}
        <div className="lg:col-span-2 bg-white rounded-xl sm:rounded-2xl card-shadow p-4 sm:p-5">
          <h3 className="text-[0.82rem] sm:text-[0.88rem] font-bold text-slate-800 mb-3">Order Status</h3>
          <div className="h-52 sm:h-60 relative">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={stats.statusData}
                  cx="50%"
                  cy="50%"
                  innerRadius="58%"
                  outerRadius="82%"
                  paddingAngle={3}
                  dataKey="value"
                  stroke="none"
                >
                  {stats.statusData.map((entry) => (
                    <Cell key={entry.name} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    background: "#fff",
                    border: "1px solid #e8e4df",
                    borderRadius: "0.75rem",
                    fontSize: "0.75rem",
                    boxShadow: "0 4px 12px rgba(0,0,0,0.06)",
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <span className="text-[1.5rem] sm:text-[1.8rem] font-bold text-slate-900 tabular-nums leading-none">
                {stats.totalOrders.toLocaleString()}
              </span>
              <span className="text-[0.65rem] text-slate-400 mt-0.5">Total</span>
            </div>
          </div>
          <div className="flex items-center justify-center gap-4 mt-2">
            {stats.statusData.map((s) => (
              <div key={s.name} className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: s.color }} />
                <span className="text-[0.68rem] text-slate-500 font-medium">
                  {s.name} <span className="font-bold text-slate-700 tabular-nums">{s.value}</span>
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Orders by Route — Horizontal Bar */}
        <div className="lg:col-span-3 bg-white rounded-xl sm:rounded-2xl card-shadow p-4 sm:p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-[0.82rem] sm:text-[0.88rem] font-bold text-slate-800">Orders by Route</h3>
            <MapPin className="w-3.5 h-3.5 text-slate-300" />
          </div>
          <div className="h-52 sm:h-60">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={stats.routeChartData}
                layout="vertical"
                margin={{ top: 0, right: 12, left: 0, bottom: 0 }}
              >
                <XAxis
                  type="number"
                  tick={{ fontSize: 10, fill: "#8b8680" }}
                  axisLine={false}
                  tickLine={false}
                  allowDecimals={false}
                />
                <YAxis
                  type="category"
                  dataKey="route"
                  tick={{ fontSize: 11, fill: "#5c5650" }}
                  axisLine={false}
                  tickLine={false}
                  width={80}
                />
                <Tooltip
                  contentStyle={{
                    background: "#fff",
                    border: "1px solid #e8e4df",
                    borderRadius: "0.75rem",
                    fontSize: "0.75rem",
                    boxShadow: "0 4px 12px rgba(0,0,0,0.06)",
                  }}
                />
                <Bar
                  dataKey="count"
                  fill="#8faa6b"
                  radius={[0, 6, 6, 0]}
                  name="Orders"
                  barSize={18}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Smart Alerts */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3.5">

        {/* Pending Deliveries */}
        <div className="bg-white rounded-xl sm:rounded-2xl card-shadow p-3.5 sm:p-4.5 border-l-[3px] border-amber-400">
          <div className="flex items-center gap-2.5 mb-2">
            <div className="w-8 h-8 rounded-lg bg-amber-50 flex items-center justify-center">
              <Truck className="w-4 h-4 text-amber-500" strokeWidth={1.8} />
            </div>
            <div>
              <p className="text-[0.78rem] font-bold text-slate-800">Pending Deliveries</p>
              <p className="text-[0.62rem] text-slate-400">Items not fully delivered</p>
            </div>
          </div>
          <p className="text-[1.4rem] font-bold text-amber-600 tabular-nums leading-none">{stats.pending}</p>
          <p className="text-[0.62rem] text-slate-400 mt-1">orders with remaining qty</p>
        </div>

        {/* Low Stock Colors */}
        <div className="bg-white rounded-xl sm:rounded-2xl card-shadow p-3.5 sm:p-4.5 border-l-[3px] border-red-400">
          <div className="flex items-center gap-2.5 mb-2">
            <div className="w-8 h-8 rounded-lg bg-red-50 flex items-center justify-center">
              <Palette className="w-4 h-4 text-red-500" strokeWidth={1.8} />
            </div>
            <div>
              <p className="text-[0.78rem] font-bold text-slate-800">Low Stock Colors</p>
              <p className="text-[0.62rem] text-slate-400">Below minimum level</p>
            </div>
          </div>
          <p className="text-[1.4rem] font-bold text-red-500 tabular-nums leading-none">{stats.lowStockColors.length}</p>
          {stats.lowStockColors.length > 0 && (
            <p className="text-[0.62rem] text-slate-400 mt-1 truncate">
              {stats.lowStockColors.slice(0, 3).map((c) => c.name).join(", ")}
              {stats.lowStockColors.length > 3 && ` +${stats.lowStockColors.length - 3} more`}
            </p>
          )}
          {stats.lowStockColors.length === 0 && (
            <p className="text-[0.62rem] text-blue-500 mt-1">All colors stocked</p>
          )}
        </div>

        {/* This Week Activity */}
        <div className="bg-white rounded-xl sm:rounded-2xl card-shadow p-3.5 sm:p-4.5 border-l-[3px] border-blue-400">
          <div className="flex items-center gap-2.5 mb-2">
            <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center">
              <Activity className="w-4 h-4 text-blue-500" strokeWidth={1.8} />
            </div>
            <div>
              <p className="text-[0.78rem] font-bold text-slate-800">This Week</p>
              <p className="text-[0.62rem] text-slate-400">vs last week</p>
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <p className="text-[1.4rem] font-bold text-blue-600 tabular-nums leading-none">{stats.thisWeekOrders}</p>
            <div className={`flex items-center gap-0.5 ${weekUp ? "text-blue-500" : "text-red-400"}`}>
              {weekUp ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
              <span className="text-[0.68rem] font-bold tabular-nums">{weekUp ? "+" : ""}{weekDiff}</span>
            </div>
          </div>
          <p className="text-[0.62rem] text-slate-400 mt-1">new orders this week</p>
        </div>

        {/* Route Load */}
        <div className="bg-white rounded-xl sm:rounded-2xl card-shadow p-3.5 sm:p-4.5 border-l-[3px] border-blue-400">
          <div className="flex items-center gap-2.5 mb-2">
            <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center">
              <Route className="w-4 h-4 text-blue-500" strokeWidth={1.8} />
            </div>
            <div>
              <p className="text-[0.78rem] font-bold text-slate-800">Route Load</p>
              <p className="text-[0.62rem] text-slate-400">Concentration check</p>
            </div>
          </div>
          {stats.heavyRoute ? (
            <>
              <p className="text-[1.4rem] font-bold text-blue-500 tabular-nums leading-none">
                {Math.round((stats.heavyRoute[1] / stats.running) * 100)}%
              </p>
              <p className="text-[0.62rem] text-blue-500 font-medium mt-1 truncate">
                {stats.heavyRoute[0]} has {stats.heavyRoute[1]} of {stats.running} running
              </p>
            </>
          ) : (
            <>
              <p className="text-[1.4rem] font-bold text-slate-400 tabular-nums leading-none">OK</p>
              <p className="text-[0.62rem] text-blue-500 mt-1">Load evenly distributed</p>
            </>
          )}
        </div>
      </div>

      {/* Recent Orders + Top Parties */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-3 sm:gap-5">

        <div className="lg:col-span-3 bg-white rounded-xl sm:rounded-2xl card-shadow overflow-hidden">
          <div className="flex items-center justify-between px-4 sm:px-5 pt-3 sm:pt-4 pb-2 sm:pb-3">
            <h3 className="text-[0.82rem] sm:text-[0.88rem] font-bold text-slate-800">Recent Orders</h3>
            <Link href="/orders" className="text-[0.7rem] sm:text-[0.72rem] font-medium text-blue-500 hover:text-blue-600 flex items-center gap-1">
              View all <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          <div className="divide-y divide-slate-50">
            {stats.recentOrders.map((o) => (
              <div key={o.id} className="flex items-center gap-2.5 sm:gap-3 px-4 sm:px-5 py-2.5 sm:py-3 hover:bg-slate-50/50 transition-colors">
                <div className={`w-2 h-2 rounded-full shrink-0 ${o.type === "Running" ? "bg-blue-400" : "bg-slate-300"}`} />
                <div className="flex-1 min-w-0">
                  <p className="text-[0.78rem] sm:text-[0.82rem] font-semibold text-slate-800 truncate">{o.partyName}</p>
                  <p className="text-[0.65rem] sm:text-[0.7rem] text-slate-400 truncate">{o.partyAddress}</p>
                </div>
                <div className="text-right shrink-0">
                  <span className={`text-[0.6rem] sm:text-[0.65rem] font-bold px-1.5 sm:px-2 py-0.5 rounded-full ${
                    o.type === "Running" ? "bg-blue-50 text-blue-600" : "bg-slate-100 text-slate-500"
                  }`}>
                    {o.type}
                  </span>
                  <p className="text-[0.6rem] sm:text-[0.65rem] text-slate-300 mt-1 tabular-nums">{o.orderDate}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="lg:col-span-2 bg-white rounded-xl sm:rounded-2xl card-shadow overflow-hidden">
          <div className="flex items-center justify-between px-4 sm:px-5 pt-3 sm:pt-4 pb-2 sm:pb-3">
            <h3 className="text-[0.82rem] sm:text-[0.88rem] font-bold text-slate-800">Top Parties</h3>
            <TrendingUp className="w-3.5 h-3.5 text-slate-300" />
          </div>
          <div className="px-4 sm:px-5 pb-3 sm:pb-4 space-y-2">
            {stats.topPartiesList.map(([name, count], i) => (
              <div key={name} className="flex items-center gap-3">
                <span className="text-[0.65rem] font-bold text-slate-300 w-4 tabular-nums">{i + 1}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-[0.75rem] sm:text-[0.78rem] font-medium text-slate-700 truncate">{name}</p>
                </div>
                <span className="text-[0.7rem] sm:text-[0.72rem] font-bold text-slate-500 tabular-nums">{count}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
