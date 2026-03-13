"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Calendar,
  Users,
  Clock,
  BarChart3,
  Palette,
  Warehouse,
  ChevronDown,
  ChevronRight,
  Loader2,
  Activity,
} from "lucide-react";
import { fetchActivityLogs, type ActivityLog } from "@/lib/activity-logger";

function todayDateStr(): string {
  return new Date().toISOString().slice(0, 10);
}

function formatDurationMs(ms: number): string {
  if (ms < 1000) return "0m";
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

function formatTimestamp(ts: { toDate: () => Date }): string {
  const d = ts.toDate();
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  const ss = String(d.getSeconds()).padStart(2, "0");
  return `${hh}:${mm}:${ss}`;
}

interface BadgeConfig {
  label: string;
  bg: string;
  text: string;
}

const BADGE_MAP: Record<ActivityLog["type"], BadgeConfig> = {
  page_visit: { label: "Page Visit", bg: "bg-blue-100", text: "text-blue-700" },
  session_start: { label: "Session", bg: "bg-emerald-100", text: "text-emerald-700" },
  stock_update: { label: "Stock Update", bg: "bg-amber-100", text: "text-amber-700" },
  color_added: { label: "Color Added", bg: "bg-emerald-100", text: "text-emerald-700" },
  color_edited: { label: "Color Edited", bg: "bg-purple-100", text: "text-purple-700" },
  color_deleted: { label: "Color Deleted", bg: "bg-red-100", text: "text-red-700" },
};

const DOT_MAP: Record<ActivityLog["type"], string> = {
  page_visit: "bg-blue-400",
  session_start: "bg-emerald-400",
  stock_update: "bg-amber-400",
  color_added: "bg-emerald-500",
  color_edited: "bg-purple-400",
  color_deleted: "bg-red-400",
};

interface StockChange {
  colorName: string;
  category?: string;
  previousStock: number;
  newStock: number;
}

function getStockChanges(log: ActivityLog): StockChange[] | null {
  const d = log.details;
  if (!d) return null;
  if (Array.isArray(d.changes) && d.changes.length > 0) {
    return d.changes as StockChange[];
  }
  if (typeof d.colorName === "string") {
    return [{
      colorName: d.colorName as string,
      category: d.category as string | undefined,
      previousStock: (d.prevStock ?? d.previousStock ?? 0) as number,
      newStock: (d.newStock ?? 0) as number,
    }];
  }
  return null;
}

function getActivityDetail(log: ActivityLog): string {
  switch (log.type) {
    case "page_visit":
      return log.pageName ?? log.page ?? "";
    case "stock_update": {
      const changes = getStockChanges(log);
      if (changes && changes.length > 0) {
        const total = log.details?.totalUpdated ?? changes.length;
        return `${total} color${Number(total) !== 1 ? "s" : ""} updated`;
      }
      return "Stock updated";
    }
    case "color_added":
    case "color_edited":
    case "color_deleted": {
      const d = log.details;
      if (d && typeof d.colorName === "string") return d.colorName;
      return "";
    }
    case "session_start":
      return "Session started";
    default:
      return "";
  }
}

interface UserBreakdown {
  userId: string;
  userName: string;
  userEmail: string;
  sessions: number;
  pages: number;
  stockUpdates: number;
  colorChanges: number;
  totalMs: number;
  logs: ActivityLog[];
}

function buildBreakdowns(logs: ActivityLog[]): UserBreakdown[] {
  const map = new Map<string, UserBreakdown>();

  for (const log of logs) {
    let row = map.get(log.userId);
    if (!row) {
      row = {
        userId: log.userId,
        userName: log.userName,
        userEmail: log.userEmail,
        sessions: 0,
        pages: 0,
        stockUpdates: 0,
        colorChanges: 0,
        totalMs: 0,
        logs: [],
      };
      map.set(log.userId, row);
    }
    row.logs.push(log);
    if (log.type === "session_start") row.sessions++;
    if (log.type === "page_visit") row.pages++;
    if (log.type === "stock_update") row.stockUpdates++;
    if (
      log.type === "color_added" ||
      log.type === "color_edited" ||
      log.type === "color_deleted"
    )
      row.colorChanges++;
    if (log.durationMs) row.totalMs += log.durationMs;
  }

  return Array.from(map.values()).sort((a, b) =>
    a.userName.localeCompare(b.userName)
  );
}

interface SummaryCardProps {
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
  label: string;
  value: string;
  accent: string;
  iconBg: string;
}

function SummaryCard({ icon: Icon, label, value, accent, iconBg }: SummaryCardProps) {
  return (
    <div className="bg-crm-card rounded-2xl card-shadow border border-crm-border p-4 sm:p-5 flex items-center gap-4">
      <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-xl ${iconBg} flex items-center justify-center shrink-0`}>
        <Icon className={`w-5 h-5 sm:w-6 sm:h-6 ${accent}`} strokeWidth={1.8} />
      </div>
      <div className="min-w-0">
        <p className={`text-[1.3rem] sm:text-[1.5rem] font-bold leading-none tabular-nums ${accent}`}>
          {value}
        </p>
        <p className="text-[0.75rem] sm:text-[0.8rem] text-crm-text-muted mt-0.5 truncate">{label}</p>
      </div>
    </div>
  );
}

interface TimelineBadgeProps {
  type: ActivityLog["type"];
}

function TimelineBadge({ type }: TimelineBadgeProps) {
  const cfg = BADGE_MAP[type];
  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[0.68rem] font-semibold ${cfg.bg} ${cfg.text} whitespace-nowrap`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${DOT_MAP[type]}`} />
      {cfg.label}
    </span>
  );
}

interface UserTimelineProps {
  logs: ActivityLog[];
}

function StockChangeDetail({ changes }: { changes: StockChange[] }) {
  // Group changes by category
  const grouped = useMemo(() => {
    const map = new Map<string, StockChange[]>();
    for (const c of changes) {
      const cat = c.category || "Other";
      if (!map.has(cat)) map.set(cat, []);
      map.get(cat)!.push(c);
    }
    return map;
  }, [changes]);

  return (
    <div className="mt-1.5 ml-[76px] mr-2 mb-1 bg-white rounded-xl border border-crm-border/60 overflow-hidden">
      {Array.from(grouped.entries()).map(([cat, items]) => (
        <div key={cat}>
          <div className="px-3 py-1.5 bg-crm-bg/60 border-b border-crm-border/40">
            <span className="text-[0.7rem] font-bold text-crm-text-muted uppercase tracking-wide">{cat}</span>
          </div>
          <div className="divide-y divide-crm-border/30">
            {items.map((item, i) => {
              const diff = item.newStock - item.previousStock;
              const isPositive = diff > 0;
              return (
                <div key={i} className="flex items-center gap-2 px-3 py-1.5">
                  <span className="text-[0.75rem] font-medium text-crm-text flex-1 min-w-0 truncate">
                    {item.colorName}
                  </span>
                  <span className="text-[0.7rem] text-crm-text-muted tabular-nums">
                    {item.previousStock}
                  </span>
                  <span className="text-[0.65rem] text-crm-text-muted">→</span>
                  <span className="text-[0.7rem] font-semibold text-crm-text tabular-nums">
                    {item.newStock}
                  </span>
                  <span className={`text-[0.65rem] font-bold tabular-nums px-1.5 py-0.5 rounded ${isPositive ? "bg-emerald-50 text-emerald-600" : "bg-red-50 text-red-600"}`}>
                    {isPositive ? "+" : ""}{diff}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

function UserTimeline({ logs }: UserTimelineProps) {
  const sorted = useMemo(
    () =>
      [...logs].sort((a, b) => {
        const ta = a.timestamp?.toDate?.()?.getTime() ?? 0;
        const tb = b.timestamp?.toDate?.()?.getTime() ?? 0;
        return ta - tb;
      }),
    [logs]
  );

  const [expandedStockLogs, setExpandedStockLogs] = useState<Set<string>>(new Set());

  function toggleStockLog(logId: string) {
    setExpandedStockLogs((prev) => {
      const next = new Set(prev);
      if (next.has(logId)) next.delete(logId);
      else next.add(logId);
      return next;
    });
  }

  return (
    <div className="px-3 sm:px-6 py-3 bg-crm-bg/40 border-t border-crm-border/40">
      <div className="space-y-1.5 max-h-80 overflow-y-auto pr-1">
        {sorted.map((log) => {
          const detail = getActivityDetail(log);
          const timeStr =
            typeof log.timestamp?.toDate === "function"
              ? formatTimestamp(log.timestamp as { toDate: () => Date })
              : "--:--:--";
          const stockChanges = log.type === "stock_update" ? getStockChanges(log) : null;
          const isStockExpanded = expandedStockLogs.has(log.id);

          return (
            <div key={log.id}>
              <div
                className={`flex items-start gap-3 py-1.5 px-2 rounded-xl hover:bg-crm-card/70 transition-colors ${stockChanges ? "cursor-pointer" : ""}`}
                onClick={stockChanges ? () => toggleStockLog(log.id) : undefined}
              >
                <span className="text-[0.68rem] font-mono text-crm-text-muted tabular-nums w-16 shrink-0 pt-0.5">
                  {timeStr}
                </span>
                <TimelineBadge type={log.type} />
                {detail && (
                  <span className="text-[0.75rem] text-crm-text flex-1 min-w-0 truncate pt-0.5">
                    {detail}
                  </span>
                )}
                {stockChanges && (
                  <span className="shrink-0 pt-0.5">
                    {isStockExpanded ? (
                      <ChevronDown className="w-3.5 h-3.5 text-crm-text-muted" strokeWidth={2} />
                    ) : (
                      <ChevronRight className="w-3.5 h-3.5 text-crm-text-muted" strokeWidth={2} />
                    )}
                  </span>
                )}
                {log.durationMs !== undefined && log.durationMs > 0 && log.type === "page_visit" && (
                  <span className="text-[0.68rem] text-crm-text-muted tabular-nums shrink-0 pt-0.5">
                    {formatDurationMs(log.durationMs)}
                  </span>
                )}
              </div>
              {isStockExpanded && stockChanges && (
                <StockChangeDetail changes={stockChanges} />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function UserActivityPage(): React.JSX.Element {
  const [date, setDate] = useState(todayDateStr);
  const [userFilter, setUserFilter] = useState("all");
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [expandedUsers, setExpandedUsers] = useState<Set<string>>(new Set());

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setExpandedUsers(new Set());

    fetchActivityLogs(date)
      .then((data) => {
        if (!cancelled) setLogs(data);
      })
      .catch(() => {
        if (!cancelled) setLogs([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [date]);

  const uniqueUsers = useMemo(() => {
    const seen = new Map<string, string>();
    for (const log of logs) {
      if (!seen.has(log.userId)) seen.set(log.userId, log.userName);
    }
    return Array.from(seen.entries()).sort((a, b) => a[1].localeCompare(b[1]));
  }, [logs]);

  const filteredLogs = useMemo(
    () =>
      userFilter === "all" ? logs : logs.filter((l) => l.userId === userFilter),
    [logs, userFilter]
  );

  const breakdowns = useMemo(() => buildBreakdowns(filteredLogs), [filteredLogs]);

  const totalTimeMs = useMemo(
    () => filteredLogs.reduce((sum, l) => sum + (l.durationMs ?? 0), 0),
    [filteredLogs]
  );

  const pagesVisited = useMemo(
    () => filteredLogs.filter((l) => l.type === "page_visit").length,
    [filteredLogs]
  );

  const stockUpdates = useMemo(
    () => filteredLogs.filter((l) => l.type === "stock_update").length,
    [filteredLogs]
  );

  const colorActions = useMemo(
    () =>
      filteredLogs.filter((l) =>
        l.type === "color_added" || l.type === "color_edited" || l.type === "color_deleted"
      ).length,
    [filteredLogs]
  );

  function toggleUser(userId: string) {
    setExpandedUsers((prev) => {
      const next = new Set(prev);
      if (next.has(userId)) next.delete(userId);
      else next.add(userId);
      return next;
    });
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
        <div className="flex items-center gap-2">
          <Activity className="w-5 h-5 text-crm-primary shrink-0" strokeWidth={1.8} />
          <h1 className="text-[1rem] sm:text-[1.1rem] font-bold text-crm-text">
            User Activity Report
          </h1>
        </div>

        <div className="flex items-center gap-2.5 sm:ml-auto flex-wrap">
          <div className="relative flex items-center gap-2 bg-crm-card border border-crm-border rounded-xl px-3 py-2 card-shadow">
            <Calendar className="w-4 h-4 text-crm-text-muted shrink-0" strokeWidth={1.8} />
            <input
              type="date"
              value={date}
              onChange={(e) => {
                setUserFilter("all");
                setDate(e.target.value);
              }}
              className="text-[0.82rem] text-crm-text bg-transparent outline-none cursor-pointer"
            />
          </div>

          <div className="relative flex items-center gap-2 bg-crm-card border border-crm-border rounded-xl px-3 py-2 card-shadow min-w-[160px]">
            <Users className="w-4 h-4 text-crm-text-muted shrink-0" strokeWidth={1.8} />
            <select
              value={userFilter}
              onChange={(e) => setUserFilter(e.target.value)}
              className="text-[0.82rem] text-crm-text bg-transparent outline-none cursor-pointer flex-1 appearance-none"
            >
              <option value="all">All Users</option>
              {uniqueUsers.map(([uid, name]) => (
                <option key={uid} value={uid}>
                  {name}
                </option>
              ))}
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-crm-text-muted shrink-0 pointer-events-none" strokeWidth={2} />
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-24">
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="w-8 h-8 text-crm-primary animate-spin" strokeWidth={1.8} />
            <p className="text-[0.85rem] text-crm-text-muted">Loading activity data...</p>
          </div>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            <SummaryCard
              icon={Clock}
              label="Total Time"
              value={formatDurationMs(totalTimeMs)}
              accent="text-crm-primary"
              iconBg="bg-crm-primary-muted"
            />
            <SummaryCard
              icon={BarChart3}
              label="Pages Visited"
              value={String(pagesVisited)}
              accent="text-blue-600"
              iconBg="bg-blue-50"
            />
            <SummaryCard
              icon={Warehouse}
              label="Stock Updates"
              value={String(stockUpdates)}
              accent="text-amber-600"
              iconBg="bg-amber-50"
            />
            <SummaryCard
              icon={Palette}
              label="Color Actions"
              value={String(colorActions)}
              accent="text-emerald-600"
              iconBg="bg-emerald-50"
            />
          </div>

          {filteredLogs.length === 0 ? (
            <div className="bg-crm-card rounded-2xl card-shadow border border-crm-border py-20 flex flex-col items-center gap-3">
              <Activity className="w-10 h-10 text-crm-border" strokeWidth={1.2} />
              <p className="text-[0.92rem] font-medium text-crm-text-muted">No activity found</p>
              <p className="text-[0.78rem] text-crm-border">
                No logs recorded for {date}
              </p>
            </div>
          ) : (
            <>
              <div className="hidden sm:block bg-crm-card rounded-2xl card-shadow border border-crm-border overflow-hidden">
                <div className="px-5 py-3.5 border-b border-crm-border/50 bg-crm-bg/20">
                  <p className="text-[0.82rem] font-semibold text-crm-text">User Breakdown</p>
                </div>

                <table className="w-full">
                  <thead>
                    <tr className="border-b border-crm-border/60">
                      <th className="text-left px-5 py-3 text-[0.75rem] font-bold text-crm-text-muted uppercase tracking-wide w-8" />
                      <th className="text-left px-5 py-3 text-[0.75rem] font-bold text-crm-text-muted uppercase tracking-wide">
                        User
                      </th>
                      <th className="text-center px-3 py-3 text-[0.75rem] font-bold text-crm-text-muted uppercase tracking-wide">
                        Sessions
                      </th>
                      <th className="text-center px-3 py-3 text-[0.75rem] font-bold text-crm-text-muted uppercase tracking-wide">
                        Pages
                      </th>
                      <th className="text-center px-3 py-3 text-[0.75rem] font-bold text-crm-text-muted uppercase tracking-wide">
                        Stock Updates
                      </th>
                      <th className="text-center px-3 py-3 text-[0.75rem] font-bold text-crm-text-muted uppercase tracking-wide">
                        Color Changes
                      </th>
                      <th className="text-right px-5 py-3 text-[0.75rem] font-bold text-crm-text-muted uppercase tracking-wide">
                        Total Time
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {breakdowns.map((row) => {
                      const isExpanded = expandedUsers.has(row.userId);
                      return (
                        <>
                          <tr
                            key={row.userId}
                            onClick={() => toggleUser(row.userId)}
                            className="border-b border-crm-border/40 hover:bg-crm-primary-muted/20 cursor-pointer transition-colors group"
                          >
                            <td className="pl-5 pr-2 py-3.5">
                              <div className="w-6 h-6 flex items-center justify-center rounded-lg bg-crm-bg group-hover:bg-crm-primary-muted transition-colors">
                                {isExpanded ? (
                                  <ChevronDown className="w-3.5 h-3.5 text-crm-primary" strokeWidth={2.5} />
                                ) : (
                                  <ChevronRight className="w-3.5 h-3.5 text-crm-text-muted" strokeWidth={2.5} />
                                )}
                              </div>
                            </td>
                            <td className="px-5 py-3.5">
                              <p className="text-[0.84rem] font-semibold text-crm-text">{row.userName}</p>
                              <p className="text-[0.72rem] text-crm-text-muted">{row.userEmail}</p>
                            </td>
                            <td className="px-3 py-3.5 text-center">
                              <span className="text-[0.84rem] font-semibold text-crm-text tabular-nums">
                                {row.sessions}
                              </span>
                            </td>
                            <td className="px-3 py-3.5 text-center">
                              <span className="inline-flex items-center justify-center px-2 py-0.5 rounded-lg bg-blue-50 text-blue-600 text-[0.78rem] font-semibold tabular-nums">
                                {row.pages}
                              </span>
                            </td>
                            <td className="px-3 py-3.5 text-center">
                              <span className="inline-flex items-center justify-center px-2 py-0.5 rounded-lg bg-amber-50 text-amber-600 text-[0.78rem] font-semibold tabular-nums">
                                {row.stockUpdates}
                              </span>
                            </td>
                            <td className="px-3 py-3.5 text-center">
                              <span className="inline-flex items-center justify-center px-2 py-0.5 rounded-lg bg-emerald-50 text-emerald-600 text-[0.78rem] font-semibold tabular-nums">
                                {row.colorChanges}
                              </span>
                            </td>
                            <td className="px-5 py-3.5 text-right">
                              <span className="text-[0.84rem] font-semibold text-crm-text tabular-nums">
                                {formatDurationMs(row.totalMs)}
                              </span>
                            </td>
                          </tr>
                          {isExpanded && (
                            <tr key={`${row.userId}-timeline`}>
                              <td colSpan={7} className="p-0">
                                <UserTimeline logs={row.logs} />
                              </td>
                            </tr>
                          )}
                        </>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <div className="sm:hidden space-y-3">
                {breakdowns.map((row) => {
                  const isExpanded = expandedUsers.has(row.userId);
                  return (
                    <div
                      key={row.userId}
                      className="bg-crm-card rounded-2xl card-shadow border border-crm-border overflow-hidden"
                    >
                      <button
                        onClick={() => toggleUser(row.userId)}
                        className="w-full text-left px-4 py-3.5 flex items-center gap-3"
                      >
                        <div className="w-8 h-8 rounded-xl bg-crm-primary-muted flex items-center justify-center shrink-0">
                          <span className="text-[0.7rem] font-bold text-crm-primary">
                            {row.userName.slice(0, 2).toUpperCase()}
                          </span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-[0.84rem] font-semibold text-crm-text truncate">
                            {row.userName}
                          </p>
                          <p className="text-[0.7rem] text-crm-text-muted truncate">
                            {row.userEmail}
                          </p>
                        </div>
                        {isExpanded ? (
                          <ChevronDown className="w-4 h-4 text-crm-primary shrink-0" strokeWidth={2.5} />
                        ) : (
                          <ChevronRight className="w-4 h-4 text-crm-text-muted shrink-0" strokeWidth={2.5} />
                        )}
                      </button>

                      <div className="grid grid-cols-4 divide-x divide-crm-border/50 border-t border-crm-border/50">
                        <div className="px-2 py-2.5 text-center">
                          <p className="text-[0.72rem] text-crm-text-muted">Sessions</p>
                          <p className="text-[0.9rem] font-bold text-crm-text tabular-nums">
                            {row.sessions}
                          </p>
                        </div>
                        <div className="px-2 py-2.5 text-center">
                          <p className="text-[0.72rem] text-crm-text-muted">Pages</p>
                          <p className="text-[0.9rem] font-bold text-blue-600 tabular-nums">
                            {row.pages}
                          </p>
                        </div>
                        <div className="px-2 py-2.5 text-center">
                          <p className="text-[0.72rem] text-crm-text-muted">Stock</p>
                          <p className="text-[0.9rem] font-bold text-amber-600 tabular-nums">
                            {row.stockUpdates}
                          </p>
                        </div>
                        <div className="px-2 py-2.5 text-center">
                          <p className="text-[0.72rem] text-crm-text-muted">Colors</p>
                          <p className="text-[0.9rem] font-bold text-emerald-600 tabular-nums">
                            {row.colorChanges}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center justify-between px-4 py-2.5 border-t border-crm-border/50 bg-crm-bg/30">
                        <span className="text-[0.72rem] text-crm-text-muted">Total Time</span>
                        <span className="text-[0.82rem] font-bold text-crm-primary tabular-nums">
                          {formatDurationMs(row.totalMs)}
                        </span>
                      </div>

                      {isExpanded && <UserTimeline logs={row.logs} />}
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}
