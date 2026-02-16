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
  Settings,
  Sprout,
  LogOut,
  HelpCircle,
  X,
} from "lucide-react";
import { useSidebar } from "./SidebarContext";

const masterNav = [
  { label: "Party Master", href: "/party-master", icon: BookUser },
  { label: "Color Master", href: "/color-master", icon: Palette },
  { label: "Route Master", href: "/route-master", icon: Route },
  { label: "Rate Master", href: "/rate-master", icon: IndianRupee },
];

const inventoryNav = [
  { label: "Stock Inventory", href: "/stock-inventory", icon: Warehouse },
  { label: "Inventory Report", href: "/inventory-report", icon: ClipboardList },
  { label: "Reports", href: "/reports", icon: BarChart3 },
];

const adminNav = [
  { label: "Manage Sub Admin", href: "/manage-sub-admin", icon: ShieldCheck },
  { label: "Admin Profile", href: "/admin-profile", icon: UserCog },
];

const bottomNav = [
  { label: "Settings", href: "/settings", icon: Settings },
  { label: "Help", href: "#", icon: HelpCircle },
];

function NavSection({ title, items, pathname }: { title: string; items: typeof masterNav; pathname: string | null }) {
  return (
    <div>
      <p className="px-3 mb-1.5 text-[0.62rem] font-semibold uppercase tracking-widest text-slate-warm-300">
        {title}
      </p>
      <ul className="space-y-0.5">
        {items.map(({ label, href, icon: Icon }) => {
          const active = pathname === href || pathname?.startsWith(href + "/");
          return (
            <li key={href}>
              <Link
                href={href}
                className={`
                  flex items-center gap-3 px-3 py-2.5 rounded-xl text-[0.9rem] font-medium
                  transition-all duration-200 ease-out
                  ${
                    active
                      ? "bg-sage-50 text-sage-700 shadow-[inset_0_0_0_1px_var(--color-sage-100)]"
                      : "text-slate-warm-500 hover:bg-cream-100 hover:text-slate-warm-700"
                  }
                `}
              >
                <Icon
                  className={`w-[1.15rem] h-[1.15rem] ${active ? "text-sage-500" : "text-slate-warm-400"}`}
                  strokeWidth={active ? 2.2 : 1.8}
                />
                {label}
                {active && (
                  <div className="ml-auto w-1.5 h-1.5 rounded-full bg-sage-400" />
                )}
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export default function Sidebar() {
  const pathname = usePathname();
  const { isOpen, close } = useSidebar();

  const dashActive = pathname === "/dashboard" || pathname === "/";

  return (
    <>
      {isOpen && (
        <div
          className="fixed inset-0 bg-slate-warm-900/20 backdrop-blur-sm z-40 lg:hidden"
          onClick={close}
        />
      )}
      <aside className={`
        fixed left-0 top-0 bottom-0 w-[260px] bg-white sidebar-shadow flex flex-col z-50
        transition-transform duration-300 ease-in-out
        lg:translate-x-0
        ${isOpen ? "translate-x-0" : "-translate-x-full"}
      `}>
      <div className="px-7 pt-7 pb-5 flex items-center justify-between">
        <Link href="/dashboard" className="flex items-center gap-3 group">
          <div className="w-9 h-9 rounded-xl bg-sage-500 flex items-center justify-center transition-transform group-hover:scale-105">
            <Sprout className="w-5 h-5 text-white" strokeWidth={2.2} />
          </div>
          <span className="text-[1.2rem] font-semibold tracking-tight text-slate-warm-900">
            Bloom
          </span>
        </Link>
        <button
          onClick={close}
          className="lg:hidden p-2 rounded-lg hover:bg-cream-100 text-slate-warm-400 hover:text-slate-warm-700 transition-colors"
        >
          <X className="w-5 h-5" strokeWidth={1.8} />
        </button>
      </div>

      <nav className="flex-1 px-4 mt-1 space-y-5 overflow-y-auto">
        <div>
          <Link
            href="/dashboard"
            className={`
              flex items-center gap-3 px-3 py-2.5 rounded-xl text-[0.9rem] font-medium
              transition-all duration-200 ease-out
              ${
                dashActive
                  ? "bg-sage-50 text-sage-700 shadow-[inset_0_0_0_1px_var(--color-sage-100)]"
                  : "text-slate-warm-500 hover:bg-cream-100 hover:text-slate-warm-700"
              }
            `}
          >
            <LayoutDashboard
              className={`w-[1.15rem] h-[1.15rem] ${dashActive ? "text-sage-500" : "text-slate-warm-400"}`}
              strokeWidth={dashActive ? 2.2 : 1.8}
            />
            Dashboard
            {dashActive && (
              <div className="ml-auto w-1.5 h-1.5 rounded-full bg-sage-400" />
            )}
          </Link>

          {(() => {
            const roActive = pathname === "/running-orders";
            return (
              <Link
                href="/running-orders"
                className={`
                  flex items-center gap-3 px-3 py-2.5 rounded-xl text-[0.9rem] font-medium
                  transition-all duration-200 ease-out
                  ${
                    roActive
                      ? "bg-sage-50 text-sage-700 shadow-[inset_0_0_0_1px_var(--color-sage-100)]"
                      : "text-slate-warm-500 hover:bg-cream-100 hover:text-slate-warm-700"
                  }
                `}
              >
                <ListOrdered
                  className={`w-[1.15rem] h-[1.15rem] ${roActive ? "text-sage-500" : "text-slate-warm-400"}`}
                  strokeWidth={roActive ? 2.2 : 1.8}
                />
                Running Orders
                {roActive && (
                  <div className="ml-auto w-1.5 h-1.5 rounded-full bg-sage-400" />
                )}
              </Link>
            );
          })()}

          {(() => {
            const ordActive = pathname === "/orders";
            return (
              <Link
                href="/orders"
                className={`
                  flex items-center gap-3 px-3 py-2.5 rounded-xl text-[0.9rem] font-medium
                  transition-all duration-200 ease-out
                  ${
                    ordActive
                      ? "bg-sage-50 text-sage-700 shadow-[inset_0_0_0_1px_var(--color-sage-100)]"
                      : "text-slate-warm-500 hover:bg-cream-100 hover:text-slate-warm-700"
                  }
                `}
              >
                <Package
                  className={`w-[1.15rem] h-[1.15rem] ${ordActive ? "text-sage-500" : "text-slate-warm-400"}`}
                  strokeWidth={ordActive ? 2.2 : 1.8}
                />
                Orders
                {ordActive && (
                  <div className="ml-auto w-1.5 h-1.5 rounded-full bg-sage-400" />
                )}
              </Link>
            );
          })()}
        </div>

        <NavSection title="Masters" items={masterNav} pathname={pathname} />
        <NavSection title="Inventory" items={inventoryNav} pathname={pathname} />
        <NavSection title="Admin" items={adminNav} pathname={pathname} />
      </nav>

      <div className="px-4 pb-3">
        <div className="border-t border-slate-warm-100 pt-3 space-y-0.5">
          {bottomNav.map(({ label, href, icon: Icon }) => {
            const active = pathname === href;
            return (
              <Link
                key={label}
                href={href}
                className={`
                  flex items-center gap-3 px-3 py-2.5 rounded-xl text-[0.9rem] font-medium
                  transition-all duration-200
                  ${
                    active
                      ? "bg-sage-50 text-sage-700"
                      : "text-slate-warm-500 hover:bg-cream-100 hover:text-slate-warm-700"
                  }
                `}
              >
                <Icon
                  className="w-[1.15rem] h-[1.15rem] text-slate-warm-400"
                  strokeWidth={1.8}
                />
                {label}
              </Link>
            );
          })}
        </div>
      </div>

      <div className="px-4 pb-5">
        <div className="bg-cream-100 rounded-2xl p-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-sage-200 flex items-center justify-center text-sage-700 text-sm font-semibold">
              JD
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[0.82rem] font-semibold text-slate-warm-800 truncate">
                Jane Doe
              </p>
              <p className="text-[0.72rem] text-slate-warm-400 truncate">
                jane@bloom.io
              </p>
            </div>
            <button className="p-1.5 rounded-lg hover:bg-cream-200 transition-colors text-slate-warm-400 hover:text-coral-500">
              <LogOut className="w-4 h-4" strokeWidth={1.8} />
            </button>
          </div>
        </div>
      </div>
    </aside>
    </>
  );
}
