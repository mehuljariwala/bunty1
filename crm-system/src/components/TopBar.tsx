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
    <header className="sticky top-0 z-20 bg-white/80 backdrop-blur-xl border-b border-slate-200">
      <div className="flex items-center justify-between px-4 lg:px-8 h-16">
        <div className="flex items-center gap-3">
          <button
            onClick={toggle}
            className="lg:hidden p-2 rounded-xl hover:bg-slate-50 transition-colors text-slate-500 hover:text-slate-700"
          >
            <Menu className="w-5 h-5" strokeWidth={1.8} />
          </button>
          <h1 className="text-lg lg:text-xl font-semibold tracking-tight text-slate-900">
            {title}
          </h1>
        </div>

        <div className="flex items-center gap-2 lg:gap-3">
          <button
            onClick={() => document.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', metaKey: true, bubbles: true }))}
            className="hidden md:flex items-center gap-2 w-48 lg:w-64 h-9 pl-3 pr-2 rounded-xl bg-white border border-slate-200 text-[0.85rem] text-slate-400 hover:border-slate-300 hover:text-slate-500 transition-all"
          >
            <Search className="w-4 h-4 shrink-0" strokeWidth={1.8} />
            <span className="flex-1 text-left">Search...</span>
            <kbd className="flex items-center gap-0.5 px-1.5 py-0.5 rounded-md bg-slate-100 border border-slate-200 text-[0.65rem] font-medium text-slate-400">
              ⌘K
            </kbd>
          </button>

          <button
            onClick={() => document.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', metaKey: true, bubbles: true }))}
            className="md:hidden p-2 rounded-xl hover:bg-slate-50 transition-colors text-slate-500 hover:text-slate-700"
          >
            <Search className="w-5 h-5" strokeWidth={1.8} />
          </button>

          <button className="relative p-2 rounded-xl hover:bg-slate-50 transition-colors text-slate-500 hover:text-slate-700">
            <Bell className="w-[1.15rem] h-[1.15rem]" strokeWidth={1.8} />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-orange-400 ring-2 ring-white" />
          </button>

          <button className="hidden lg:flex items-center gap-2 h-9 px-4 rounded-xl bg-blue-500 text-white text-[0.82rem] font-medium hover:bg-blue-600 active:bg-blue-700 transition-colors shadow-sm">
            <Plus className="w-4 h-4" strokeWidth={2.2} />
            New
          </button>
        </div>
      </div>
    </header>
  );
}
