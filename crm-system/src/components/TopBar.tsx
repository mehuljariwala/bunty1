"use client";

import { usePathname } from "next/navigation";
import { Search, Bell, Plus, Menu } from "lucide-react";
import { useSidebar } from "./SidebarContext";

const pageTitles: Record<string, string> = {
  "/dashboard": "Dashboard",
  "/running-orders": "Running Orders",
  "/create-order": "Create Order",
  "/party-master": "Party Master",
  "/color-master": "Color Master",
  "/route-master": "Route Master",
  "/rate-master": "Rate Master",
  "/stock-inventory": "Stock Inventory",
  "/inventory-report": "Inventory Report",
  "/reports": "Reports",
  "/manage-sub-admin": "Manage Sub Admin",
  "/admin-profile": "Admin Profile",
  "/settings": "Settings",
};

export default function TopBar() {
  const pathname = usePathname();
  const { toggle } = useSidebar();
  const title = pageTitles[pathname ?? ""] ?? "Dashboard";

  return (
    <header className="sticky top-0 z-20 bg-cream-50/80 backdrop-blur-xl border-b border-slate-warm-100">
      <div className="flex items-center justify-between px-4 lg:px-8 h-16">
        <div className="flex items-center gap-3">
          <button
            onClick={toggle}
            className="lg:hidden p-2 rounded-xl hover:bg-white transition-colors text-slate-warm-500 hover:text-slate-warm-700"
          >
            <Menu className="w-5 h-5" strokeWidth={1.8} />
          </button>
          <h1 className="text-lg lg:text-xl font-semibold tracking-tight text-slate-warm-900">
            {title}
          </h1>
        </div>

        <div className="flex items-center gap-2 lg:gap-3">
          <div className="relative hidden md:block">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-warm-400" strokeWidth={1.8} />
            <input
              type="text"
              placeholder="Search anything..."
              className="w-48 lg:w-64 h-9 pl-9 pr-4 rounded-xl bg-white border border-slate-warm-100 text-[0.85rem] text-slate-warm-700 placeholder:text-slate-warm-300 focus:outline-none focus:ring-2 focus:ring-sage-200 focus:border-sage-300 transition-all"
            />
          </div>

          <button className="relative p-2 rounded-xl hover:bg-white transition-colors text-slate-warm-500 hover:text-slate-warm-700">
            <Bell className="w-[1.15rem] h-[1.15rem]" strokeWidth={1.8} />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-coral-400 ring-2 ring-cream-50" />
          </button>

          <button className="hidden lg:flex items-center gap-2 h-9 px-4 rounded-xl bg-sage-500 text-white text-[0.82rem] font-medium hover:bg-sage-600 active:bg-sage-700 transition-colors shadow-sm">
            <Plus className="w-4 h-4" strokeWidth={2.2} />
            New
          </button>
        </div>
      </div>
    </header>
  );
}
