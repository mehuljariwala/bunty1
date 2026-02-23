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
  Sprout,
  X,
  Activity,
} from "lucide-react";
import { useSidebar } from "./SidebarContext";
import type { LucideIcon } from "lucide-react";

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

function NavLink({ item, pathname, expanded }: { item: NavItem; pathname: string | null; expanded: boolean }) {
  const active = pathname === item.href || pathname?.startsWith(item.href + "/");
  const Icon = item.icon;

  return (
    <li>
      <Link
        href={item.href}
        title={!expanded ? item.label : undefined}
        className={`
          flex items-center gap-3 rounded-xl text-[0.85rem] font-medium
          transition-all duration-200 ease-out
          ${expanded ? "px-3 py-2" : "px-0 py-2 justify-center"}
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
        {expanded && (
          <>
            <span className="truncate">{item.label}</span>
            {active && <div className="ml-auto w-1.5 h-1.5 rounded-full bg-white shrink-0" />}
          </>
        )}
      </Link>
    </li>
  );
}

function NavSection({
  title,
  items,
  pathname,
  expanded,
}: {
  title: string;
  items: NavItem[];
  pathname: string | null;
  expanded: boolean;
}) {
  return (
    <div>
      {expanded ? (
        <p className="px-3 mb-1 text-[0.58rem] font-semibold uppercase tracking-widest text-indigo-300">
          {title}
        </p>
      ) : (
        <div className="mx-auto w-5 border-t border-indigo-400/30 mb-1.5" />
      )}
      <ul className="space-y-0.5">
        {items.map((item) => (
          <NavLink key={item.href} item={item} pathname={pathname} expanded={expanded} />
        ))}
      </ul>
    </div>
  );
}

export default function Sidebar() {
  const pathname = usePathname();
  const { isOpen, close, expanded, setExpanded } = useSidebar();

  return (
    <>
      {isOpen && (
        <div
          className="fixed inset-0 bg-crm-sidebar/20 backdrop-blur-sm z-40 lg:hidden"
          onClick={close}
        />
      )}
      <aside
        onMouseEnter={() => setExpanded(true)}
        onMouseLeave={() => setExpanded(false)}
        className={`
          fixed left-0 top-0 bottom-0 bg-crm-sidebar flex flex-col z-50
          transition-all duration-300 ease-in-out
          ${expanded ? "w-[240px]" : "w-[68px]"}
          lg:translate-x-0
          ${isOpen ? "translate-x-0 !w-[240px]" : "-translate-x-full lg:translate-x-0"}
        `}
      >
        <div className={`pt-5 pb-4 flex items-center ${expanded || isOpen ? "px-5 justify-between" : "px-0 justify-center"}`}>
          <Link href="/dashboard" className="flex items-center gap-2.5 group">
            <div className="w-8 h-8 rounded-xl bg-crm-accent flex items-center justify-center transition-transform group-hover:scale-105 shrink-0">
              <Sprout className="w-4.5 h-4.5 text-white" strokeWidth={2.2} />
            </div>
            {(expanded || isOpen) && (
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

        <nav className={`flex-1 mt-1 space-y-4 overflow-y-auto ${expanded || isOpen ? "px-3" : "px-2"}`}>
          <ul className="space-y-0.5">
            <NavLink
              item={{ label: "Dashboard", href: "/dashboard", icon: LayoutDashboard }}
              pathname={pathname === "/" ? "/dashboard" : pathname}
              expanded={expanded || isOpen}
            />
            <NavLink
              item={{ label: "Running Orders", href: "/running-orders", icon: ListOrdered }}
              pathname={pathname}
              expanded={expanded || isOpen}
            />
            <NavLink
              item={{ label: "Orders", href: "/orders", icon: Package }}
              pathname={pathname}
              expanded={expanded || isOpen}
            />
          </ul>

          <NavSection title="Masters" items={masterNav} pathname={pathname} expanded={expanded || isOpen} />
          <NavSection title="Inventory" items={inventoryNav} pathname={pathname} expanded={expanded || isOpen} />
          <NavSection title="Analytics" items={analyticsNav} pathname={pathname} expanded={expanded || isOpen} />
          <NavSection title="Admin" items={adminNav} pathname={pathname} expanded={expanded || isOpen} />
        </nav>
      </aside>
    </>
  );
}
