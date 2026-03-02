"use client";

import { useState, useRef, useEffect } from "react";
import { usePathname } from "next/navigation";
import { Search, Bell, Plus, Menu, Settings, HelpCircle, LogOut } from "lucide-react";
import { useSidebar } from "./SidebarContext";
import { useAuth } from "@/lib/auth-context";

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

function getUserInitials(user: { displayName?: string | null; email?: string | null } | null): string {
  if (!user) return "U";
  if (user.displayName) {
    return user.displayName
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  }
  if (user.email) {
    return user.email[0].toUpperCase();
  }
  return "U";
}

export default function TopBar() {
  const pathname = usePathname();
  const { toggle } = useSidebar();
  const { user, logout } = useAuth();
  const title = pageTitles[pathname ?? ""] ?? "Dashboard";

  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    }
    if (dropdownOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [dropdownOpen]);

  const initials = user ? getUserInitials(user) : "U";

  return (
    <header className="sticky top-0 z-20 bg-crm-card/80 backdrop-blur-xl border-b border-crm-border/60">
      <div className="flex items-center justify-between px-3 lg:px-6 h-11">
        <div className="flex items-center gap-2">
          <button
            onClick={toggle}
            className="lg:hidden p-1.5 rounded-lg hover:bg-crm-primary-muted transition-colors text-crm-text-muted hover:text-crm-text"
          >
            <Menu className="w-4 h-4" strokeWidth={1.8} />
          </button>
          <h1 className="text-sm lg:text-[0.95rem] font-semibold tracking-tight text-crm-text">
            {title}
          </h1>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            onClick={() => document.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', metaKey: true, bubbles: true }))}
            className="hidden md:flex items-center gap-1.5 w-40 lg:w-52 h-7 pl-2.5 pr-1.5 rounded-lg bg-crm-card border border-crm-border/70 text-xs text-crm-text-muted hover:border-crm-primary-light transition-all"
          >
            <Search className="w-3.5 h-3.5 shrink-0" strokeWidth={1.8} />
            <span className="flex-1 text-left">Search...</span>
            <kbd className="flex items-center gap-0.5 px-1 py-px rounded bg-crm-primary-muted border border-crm-border/60 text-[0.6rem] font-medium text-crm-text-muted">
              ⌘K
            </kbd>
          </button>

          <button
            onClick={() => document.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', metaKey: true, bubbles: true }))}
            className="md:hidden p-1.5 rounded-lg hover:bg-crm-primary-muted transition-colors text-crm-text-muted hover:text-crm-text"
          >
            <Search className="w-4 h-4" strokeWidth={1.8} />
          </button>

          <button className="relative p-1.5 rounded-lg hover:bg-crm-primary-muted transition-colors text-crm-text-muted hover:text-crm-text">
            <Bell className="w-4 h-4" strokeWidth={1.8} />
            <span className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-crm-accent ring-[1.5px] ring-white" />
          </button>

          <button className="hidden lg:flex items-center gap-1.5 h-7 px-3 rounded-lg bg-crm-primary text-white text-xs font-medium hover:bg-[#4845a2] active:bg-[#2d2b6b] transition-colors shadow-sm">
            <Plus className="w-3.5 h-3.5" strokeWidth={2.2} />
            New
          </button>

          <div ref={dropdownRef} className="relative ml-1">
            <button
              onClick={() => setDropdownOpen(!dropdownOpen)}
              className="w-7 h-7 rounded-full bg-crm-primary flex items-center justify-center text-white text-[0.65rem] font-semibold hover:bg-[#4845a2] transition-colors ring-2 ring-crm-border/40"
            >
              {initials}
            </button>

            {dropdownOpen && (
              <div className="absolute right-0 top-full mt-2 w-56 bg-crm-card rounded-xl border border-crm-border shadow-lg overflow-hidden animate-in fade-in slide-in-from-top-1 duration-150">
                <div className="px-4 py-3 border-b border-crm-border/60">
                  <p className="text-sm font-semibold text-crm-text truncate">
                    {user?.displayName || "User"}
                  </p>
                  <p className="text-xs text-crm-text-muted truncate">
                    {user?.email}
                  </p>
                </div>

                <div className="py-1.5">
                  <a
                    href="/settings"
                    className="flex items-center gap-2.5 px-4 py-2 text-sm text-crm-text hover:bg-crm-primary-muted transition-colors"
                  >
                    <Settings className="w-4 h-4 text-crm-text-muted" strokeWidth={1.8} />
                    Settings
                  </a>
                  <a
                    href="#"
                    className="flex items-center gap-2.5 px-4 py-2 text-sm text-crm-text hover:bg-crm-primary-muted transition-colors"
                  >
                    <HelpCircle className="w-4 h-4 text-crm-text-muted" strokeWidth={1.8} />
                    Help
                  </a>
                </div>

                <div className="border-t border-crm-border/60 py-1.5">
                  <button
                    onClick={logout}
                    className="flex items-center gap-2.5 px-4 py-2 w-full text-sm text-red-600 hover:bg-red-50 transition-colors"
                  >
                    <LogOut className="w-4 h-4" strokeWidth={1.8} />
                    Sign out
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
