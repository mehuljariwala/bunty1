"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  BarChart3,
  BookUser,
  Palette,
  Route,
  IndianRupee,
  Warehouse,
  ClipboardList,
  ShieldCheck,
  UserCog,
  ListOrdered,
  Package,
  Image,
  Sprout,
  X,
  Activity,
  LogOut,
  Menu,
} from "lucide-react";
import { useSidebar } from "./SidebarContext";
import { useAuth } from "@/lib/auth-context";
import type { LucideIcon } from "lucide-react";

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
  "/orders": "Orders",
  "/photo-master": "Photo Master",
  "/user-activity": "User Activity",
};

interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
}

const masterNav: NavItem[] = [
  { label: "Party Master", href: "/party-master", icon: BookUser },
  { label: "Color Master", href: "/color-master", icon: Palette },
  { label: "Route Master", href: "/route-master", icon: Route },
  { label: "Rate Master", href: "/rate-master", icon: IndianRupee },
];

const inventoryNav: NavItem[] = [
  { label: "Stock Inventory", href: "/stock-inventory", icon: Warehouse },
  { label: "Inventory Report", href: "/inventory-report", icon: ClipboardList },
  { label: "Reports", href: "/reports", icon: BarChart3 },
];

const analyticsNav: NavItem[] = [
  { label: "User Activity", href: "/user-activity", icon: Activity },
];

const adminNav: NavItem[] = [
  { label: "Manage Sub Admin", href: "/manage-sub-admin", icon: ShieldCheck },
  { label: "Admin Profile", href: "/admin-profile", icon: UserCog },
];

function NavLink({ item, pathname, mobile }: { item: NavItem; pathname: string | null; mobile: boolean }) {
  const active = pathname === item.href || pathname?.startsWith(item.href + "/");
  const Icon = item.icon;

  return (
    <li>
      <Link
        href={item.href}
        className={`
          group/link relative flex items-center gap-3 rounded-xl text-[0.85rem] font-medium
          transition-all duration-200 ease-out
          ${mobile ? "px-3 py-2" : "px-0 py-2 justify-center"}
          ${
            active
              ? "bg-crm-sidebar-active text-white"
              : "text-indigo-200 hover:bg-crm-sidebar-hover hover:text-white"
          }
        `}
      >
        <Icon
          className={`w-[1.15rem] h-[1.15rem] shrink-0 ${active ? "text-white" : "text-indigo-300"}`}
          strokeWidth={active ? 2.2 : 1.8}
        />
        {mobile ? (
          <>
            <span className="truncate">{item.label}</span>
            {active && <div className="ml-auto w-1.5 h-1.5 rounded-full bg-white shrink-0" />}
          </>
        ) : (
          <span className="pointer-events-none fixed left-[76px] px-2.5 py-1 rounded-lg bg-crm-sidebar text-white text-[0.78rem] font-medium whitespace-nowrap opacity-0 scale-95 group-hover/link:opacity-100 group-hover/link:scale-100 transition-all duration-150 shadow-lg z-[60]">
            {item.label}
          </span>
        )}
      </Link>
    </li>
  );
}

function NavSection({
  title,
  items,
  pathname,
  mobile,
}: {
  title: string;
  items: NavItem[];
  pathname: string | null;
  mobile: boolean;
}) {
  return (
    <div>
      {mobile ? (
        <p className="px-3 mb-1 text-[0.58rem] font-semibold uppercase tracking-widest text-indigo-300">
          {title}
        </p>
      ) : (
        <div className="mx-auto w-5 border-t border-indigo-400/30 mb-1.5" />
      )}
      <ul className="space-y-0.5">
        {items.map((item) => (
          <NavLink key={item.href} item={item} pathname={pathname} mobile={mobile} />
        ))}
      </ul>
    </div>
  );
}

function getUserInitials(user: { displayName?: string | null; email?: string | null }): string {
  if (user.displayName) {
    return user.displayName
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  }
  if (user.email) return user.email[0].toUpperCase();
  return "U";
}

export default function Sidebar() {
  const pathname = usePathname();
  const { isOpen, open, close } = useSidebar();
  const { user, logout } = useAuth();
  const initials = user ? getUserInitials(user) : "U";

  return (
    <>
      {isOpen && (
        <div
          className="fixed inset-0 bg-crm-sidebar/20 backdrop-blur-sm z-40 lg:hidden"
          onClick={close}
        />
      )}

      {/* Mobile top bar */}
      <div className="fixed top-0 left-0 right-0 z-40 lg:hidden bg-crm-card/80 backdrop-blur-xl border-b border-crm-border/60">
        <div className="flex items-center justify-between px-3 h-11">
          <div className="flex items-center gap-2">
            <button
              onClick={open}
              className="p-1.5 rounded-lg hover:bg-crm-primary-muted transition-colors text-crm-text-muted hover:text-crm-text"
            >
              <Menu className="w-4.5 h-4.5" strokeWidth={1.8} />
            </button>
            <h1 className="text-sm font-semibold tracking-tight text-crm-text">
              {pageTitles[pathname ?? ""] ?? "Dashboard"}
            </h1>
          </div>
          <button
            onClick={open}
            className="w-7 h-7 rounded-full bg-crm-primary flex items-center justify-center text-white text-[0.65rem] font-semibold ring-2 ring-crm-border/40"
          >
            {initials}
          </button>
        </div>
      </div>

      <aside
        className={`
          fixed left-0 top-0 bottom-0 bg-crm-sidebar flex flex-col z-50
          transition-all duration-300 ease-in-out
          w-[68px]
          lg:translate-x-0
          ${isOpen ? "translate-x-0 !w-[240px]" : "-translate-x-full lg:translate-x-0"}
        `}
      >
        <div className={`pt-5 pb-4 flex items-center ${isOpen ? "px-5 justify-between" : "px-0 justify-center"}`}>
          <Link href="/dashboard" className="flex items-center gap-2.5 group">
            <div className="w-8 h-8 rounded-xl bg-crm-accent flex items-center justify-center transition-transform group-hover:scale-105 shrink-0">
              <Sprout className="w-4.5 h-4.5 text-white" strokeWidth={2.2} />
            </div>
            {isOpen && (
              <span className="text-[1.1rem] font-semibold tracking-tight text-white">
                Bloom
              </span>
            )}
          </Link>
          {isOpen && (
            <button
              onClick={close}
              className="lg:hidden p-2 rounded-lg hover:bg-crm-sidebar-hover text-indigo-300 hover:text-white transition-colors"
            >
              <X className="w-5 h-5" strokeWidth={1.8} />
            </button>
          )}
        </div>

        <nav className={`flex-1 mt-1 space-y-4 overflow-y-auto ${isOpen ? "px-3" : "px-2"}`}>
          <ul className="space-y-0.5">
            <NavLink
              item={{ label: "Dashboard", href: "/dashboard", icon: LayoutDashboard }}
              pathname={pathname === "/" ? "/dashboard" : pathname}
              mobile={isOpen}
            />
            <NavLink
              item={{ label: "Running Orders", href: "/running-orders", icon: ListOrdered }}
              pathname={pathname}
              mobile={isOpen}
            />
            <NavLink
              item={{ label: "Orders", href: "/orders", icon: Package }}
              pathname={pathname}
              mobile={isOpen}
            />
            <NavLink
              item={{ label: "Photo Master", href: "/photo-master", icon: Image }}
              pathname={pathname}
              mobile={isOpen}
            />
          </ul>

          <NavSection title="Masters" items={masterNav} pathname={pathname} mobile={isOpen} />
          <NavSection title="Inventory" items={inventoryNav} pathname={pathname} mobile={isOpen} />
          <NavSection title="Analytics" items={analyticsNav} pathname={pathname} mobile={isOpen} />
          <NavSection title="Admin" items={adminNav} pathname={pathname} mobile={isOpen} />
        </nav>

        <div className={`border-t border-indigo-400/20 ${isOpen ? "px-3 py-3" : "px-2 py-3"}`}>
          {isOpen ? (
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full bg-crm-sidebar-active flex items-center justify-center text-white text-[0.65rem] font-semibold shrink-0">
                {initials}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[0.8rem] font-medium text-white truncate">
                  {user?.displayName || "User"}
                </p>
                <p className="text-[0.65rem] text-indigo-300 truncate">
                  {user?.email}
                </p>
              </div>
              <button
                onClick={logout}
                title="Sign out"
                className="p-1.5 rounded-lg hover:bg-crm-sidebar-hover text-indigo-300 hover:text-red-400 transition-colors shrink-0"
              >
                <LogOut className="w-4 h-4" strokeWidth={1.8} />
              </button>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2">
              <div className="group/user relative">
                <div
                  className="w-8 h-8 rounded-full bg-crm-sidebar-active flex items-center justify-center text-white text-[0.65rem] font-semibold"
                >
                  {initials}
                </div>
                <span className="pointer-events-none fixed left-[76px] px-2.5 py-1 rounded-lg bg-crm-sidebar text-white text-[0.78rem] font-medium whitespace-nowrap opacity-0 scale-95 group-hover/user:opacity-100 group-hover/user:scale-100 transition-all duration-150 shadow-lg z-[60]">
                  {user?.displayName || user?.email || "User"}
                </span>
              </div>
              <div className="group/logout relative">
                <button
                  onClick={logout}
                  className="p-1.5 rounded-lg hover:bg-crm-sidebar-hover text-indigo-300 hover:text-red-400 transition-colors"
                >
                  <LogOut className="w-3.5 h-3.5" strokeWidth={1.8} />
                </button>
                <span className="pointer-events-none fixed left-[76px] px-2.5 py-1 rounded-lg bg-crm-sidebar text-white text-[0.78rem] font-medium whitespace-nowrap opacity-0 scale-95 group-hover/logout:opacity-100 group-hover/logout:scale-100 transition-all duration-150 shadow-lg z-[60]">
                  Sign out
                </span>
              </div>
            </div>
          )}
        </div>
      </aside>
    </>
  );
}
