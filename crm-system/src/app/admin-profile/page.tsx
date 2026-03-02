"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Shield,
  Check,
  Loader2,
  ChevronDown,
  ChevronUp,
  LayoutDashboard,
  ListOrdered,
  Package,
  Image,
  BookUser,
  Palette,
  Route,
  IndianRupee,
  Warehouse,
  ClipboardList,
  BarChart3,
  Activity,
  ShieldCheck,
  UserCog,
} from "lucide-react";
import { subscribeSubAdmins, updateSubAdmin } from "@/lib/sub-admins";
import type { SubAdmin } from "@/lib/types";
import type { LucideIcon } from "lucide-react";

interface PageRoute {
  path: string;
  label: string;
  icon: LucideIcon;
  group: string;
}

const PAGE_ROUTES: PageRoute[] = [
  { path: "/dashboard", label: "Dashboard", icon: LayoutDashboard, group: "Main" },
  { path: "/running-orders", label: "Running Orders", icon: ListOrdered, group: "Main" },
  { path: "/orders", label: "Orders", icon: Package, group: "Main" },
  { path: "/photo-master", label: "Photo Master", icon: Image, group: "Main" },
  { path: "/party-master", label: "Party Master", icon: BookUser, group: "Masters" },
  { path: "/color-master", label: "Color Master", icon: Palette, group: "Masters" },
  { path: "/route-master", label: "Route Master", icon: Route, group: "Masters" },
  { path: "/rate-master", label: "Rate Master", icon: IndianRupee, group: "Masters" },
  { path: "/stock-inventory", label: "Stock Inventory", icon: Warehouse, group: "Inventory" },
  { path: "/inventory-report", label: "Inventory Report", icon: ClipboardList, group: "Inventory" },
  { path: "/reports", label: "Reports", icon: BarChart3, group: "Inventory" },
  { path: "/user-activity", label: "User Activity", icon: Activity, group: "Analytics" },
  { path: "/manage-sub-admin", label: "Manage Sub Admin", icon: ShieldCheck, group: "Admin" },
  { path: "/admin-profile", label: "Admin Profile", icon: UserCog, group: "Admin" },
];

const ALL_PATHS = PAGE_ROUTES.map((r) => r.path);

const GROUPS = ["Main", "Masters", "Inventory", "Analytics", "Admin"];

export default function AdminProfilePage() {
  const [subAdmins, setSubAdmins] = useState<SubAdmin[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [expandedUser, setExpandedUser] = useState<string | null>(null);

  useEffect(() => {
    return subscribeSubAdmins((admins) => {
      setSubAdmins(admins);
      setLoading(false);
    });
  }, []);

  const togglePage = useCallback(async (admin: SubAdmin, pagePath: string) => {
    const current = admin.allowedPages ?? [...ALL_PATHS];
    const has = current.includes(pagePath);
    const updated = has ? current.filter((p) => p !== pagePath) : [...current, pagePath];

    setSaving(admin.id + pagePath);
    try {
      await updateSubAdmin(admin.id, { allowedPages: updated });
    } catch { /* reverts via subscription */ }
    setSaving(null);
  }, []);

  const toggleAll = useCallback(async (admin: SubAdmin, grantAll: boolean) => {
    setSaving(admin.id + "__all");
    try {
      await updateSubAdmin(admin.id, { allowedPages: grantAll ? [...ALL_PATHS] : [] });
    } catch { /* reverts via subscription */ }
    setSaving(null);
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 text-blue-500 animate-spin" strokeWidth={2} />
      </div>
    );
  }

  return (
    <div className="space-y-4" style={{ padding: "0 4px" }}>
      <div className="bg-white rounded-2xl card-shadow">
        <div className="px-6 pt-5 pb-4 border-b border-slate-100">
          <h3 className="text-[0.95rem] font-semibold text-slate-800 flex items-center gap-2">
            <Shield className="w-4.5 h-4.5 text-blue-500" strokeWidth={1.8} />
            Page Access Management
          </h3>
          <p className="text-[0.76rem] text-slate-400 mt-0.5">
            Control which pages each sub-admin can access
          </p>
        </div>

        <div className="divide-y divide-slate-100">
          {subAdmins.map((admin) => {
            const allowed = admin.allowedPages ?? [...ALL_PATHS];
            const allGranted = ALL_PATHS.every((p) => allowed.includes(p));
            const count = allowed.filter((p) => ALL_PATHS.includes(p)).length;
            const isExpanded = expandedUser === admin.id;

            return (
              <div key={admin.id}>
                <button
                  onClick={() => setExpandedUser(isExpanded ? null : admin.id)}
                  className="w-full flex items-center gap-3 px-6 py-3.5 hover:bg-slate-50/60 transition-colors text-left"
                >
                  <div className="w-9 h-9 rounded-xl bg-blue-100 flex items-center justify-center shrink-0">
                    <span className="text-[0.74rem] font-bold text-blue-600">
                      {admin.name.slice(0, 2).toUpperCase()}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[0.86rem] font-semibold text-slate-800 truncate">
                      {admin.name}
                    </p>
                    <p className="text-[0.72rem] text-slate-400">
                      {count} of {ALL_PATHS.length} pages
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {allGranted ? (
                      <span className="text-[0.68rem] font-semibold bg-blue-50 text-blue-600 px-2.5 py-0.5 rounded-full">
                        Full Access
                      </span>
                    ) : count === 0 ? (
                      <span className="text-[0.68rem] font-semibold bg-orange-50 text-orange-500 px-2.5 py-0.5 rounded-full">
                        No Access
                      </span>
                    ) : (
                      <span className="text-[0.68rem] font-semibold bg-slate-100 text-slate-500 px-2.5 py-0.5 rounded-full">
                        {count} Pages
                      </span>
                    )}
                    {isExpanded ? (
                      <ChevronUp className="w-4 h-4 text-slate-400" strokeWidth={2} />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-slate-400" strokeWidth={2} />
                    )}
                  </div>
                </button>

                {isExpanded && (
                  <div className="px-6 pb-5">
                    <div className="flex items-center justify-end mb-3">
                      <button
                        onClick={() => toggleAll(admin, !allGranted)}
                        disabled={saving === admin.id + "__all"}
                        className="text-[0.74rem] font-semibold text-blue-500 hover:text-blue-700 transition-colors disabled:opacity-50"
                      >
                        {saving === admin.id + "__all" ? "Saving..." : allGranted ? "Revoke All" : "Grant All"}
                      </button>
                    </div>

                    <div className="space-y-4 ml-1">
                      {GROUPS.map((group) => {
                        const groupRoutes = PAGE_ROUTES.filter((r) => r.group === group);
                        return (
                          <div key={group}>
                            <p className="text-[0.68rem] font-semibold uppercase tracking-wider text-slate-400 mb-1.5 ml-1">
                              {group}
                            </p>
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                              {groupRoutes.map((route) => {
                                const isAllowed = allowed.includes(route.path);
                                const isSaving = saving === admin.id + route.path;
                                const Icon = route.icon;

                                return (
                                  <button
                                    key={route.path}
                                    onClick={() => togglePage(admin, route.path)}
                                    disabled={isSaving}
                                    className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl border transition-all text-left ${
                                      isAllowed
                                        ? "border-blue-200 bg-blue-50/70"
                                        : "border-slate-200 bg-white hover:bg-slate-50"
                                    } ${isSaving ? "opacity-50" : ""}`}
                                  >
                                    <div
                                      className={`w-[18px] h-[18px] rounded-md flex items-center justify-center shrink-0 transition-colors ${
                                        isAllowed ? "bg-blue-500" : "bg-slate-200"
                                      }`}
                                    >
                                      {isAllowed && <Check className="w-3 h-3 text-white" strokeWidth={3} />}
                                    </div>
                                    <Icon
                                      className={`w-3.5 h-3.5 shrink-0 ${isAllowed ? "text-blue-500" : "text-slate-400"}`}
                                      strokeWidth={1.8}
                                    />
                                    <span className={`text-[0.78rem] font-medium truncate ${isAllowed ? "text-blue-700" : "text-slate-600"}`}>
                                      {route.label}
                                    </span>
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            );
          })}

          {subAdmins.length === 0 && (
            <div className="px-6 py-10 text-center">
              <p className="text-[0.84rem] text-slate-400">No sub-admins found</p>
              <p className="text-[0.72rem] text-slate-300 mt-1">Add sub-admins from Manage Sub Admin page</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
