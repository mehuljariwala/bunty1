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
      <p className="px-3 mb-1.5 text-[0.62rem] font-semibold uppercase tracking-widest text-slate-400">
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
                      ? "bg-blue-600 text-white"
                      : "text-slate-300 hover:bg-slate-700 hover:text-white"
                  }
                `}
              >
                <Icon
                  className={`w-[1.15rem] h-[1.15rem] ${active ? "text-white" : "text-slate-400"}`}
                  strokeWidth={active ? 2.2 : 1.8}
                />
                {label}
                {active && (
                  <div className="ml-auto w-1.5 h-1.5 rounded-full bg-white" />
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
          className="fixed inset-0 bg-slate-900/20 backdrop-blur-sm z-40 lg:hidden"
          onClick={close}
        />
      )}
      <aside className={`
        fixed left-0 top-0 bottom-0 w-[260px] bg-slate-800 flex flex-col z-50
        transition-transform duration-300 ease-in-out
        lg:translate-x-0
        ${isOpen ? "translate-x-0" : "-translate-x-full"}
      `}>
      <div className="px-7 pt-7 pb-5 flex items-center justify-between">
        <Link href="/dashboard" className="flex items-center gap-3 group">
          <div className="w-9 h-9 rounded-xl bg-blue-500 flex items-center justify-center transition-transform group-hover:scale-105">
            <Sprout className="w-5 h-5 text-white" strokeWidth={2.2} />
          </div>
          <span className="text-[1.2rem] font-semibold tracking-tight text-white">
            Bloom
          </span>
        </Link>
        <button
          onClick={close}
          className="lg:hidden p-2 rounded-lg hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
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
                  ? "bg-blue-600 text-white"
                  : "text-slate-300 hover:bg-slate-700 hover:text-white"
              }
            `}
          >
            <LayoutDashboard
              className={`w-[1.15rem] h-[1.15rem] ${dashActive ? "text-white" : "text-slate-400"}`}
              strokeWidth={dashActive ? 2.2 : 1.8}
            />
            Dashboard
            {dashActive && (
              <div className="ml-auto w-1.5 h-1.5 rounded-full bg-white" />
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
                      ? "bg-blue-600 text-white"
                      : "text-slate-300 hover:bg-slate-700 hover:text-white"
                  }
                `}
              >
                <ListOrdered
                  className={`w-[1.15rem] h-[1.15rem] ${roActive ? "text-white" : "text-slate-400"}`}
                  strokeWidth={roActive ? 2.2 : 1.8}
                />
                Running Orders
                {roActive && (
                  <div className="ml-auto w-1.5 h-1.5 rounded-full bg-white" />
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
                      ? "bg-blue-600 text-white"
                      : "text-slate-300 hover:bg-slate-700 hover:text-white"
                  }
                `}
              >
                <Package
                  className={`w-[1.15rem] h-[1.15rem] ${ordActive ? "text-white" : "text-slate-400"}`}
                  strokeWidth={ordActive ? 2.2 : 1.8}
                />
                Orders
                {ordActive && (
                  <div className="ml-auto w-1.5 h-1.5 rounded-full bg-white" />
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
        <div className="border-t border-slate-700 pt-3 space-y-0.5">
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
                      ? "bg-blue-600 text-white"
                      : "text-slate-300 hover:bg-slate-700 hover:text-white"
                  }
                `}
              >
                <Icon
                  className="w-[1.15rem] h-[1.15rem] text-slate-400"
                  strokeWidth={1.8}
                />
                {label}
              </Link>
            );
          })}
        </div>
      </div>

      <div className="px-4 pb-5">
        <div className="bg-slate-700 rounded-2xl p-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-blue-500 flex items-center justify-center text-white text-sm font-semibold">
              JD
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[0.82rem] font-semibold text-white truncate">
                Jane Doe
              </p>
              <p className="text-[0.72rem] text-slate-400 truncate">
                jane@bloom.io
              </p>
            </div>
            <button className="p-1.5 rounded-lg hover:bg-slate-600 transition-colors text-slate-400 hover:text-orange-400">
              <LogOut className="w-4 h-4" strokeWidth={1.8} />
            </button>
          </div>
        </div>
      </div>
    </aside>
    </>
  );
}
