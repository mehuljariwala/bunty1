"use client";

import { type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { useAuth } from "@/lib/auth-context";
import Sidebar from "@/components/Sidebar";
import MainContent from "@/components/MainContent";
import CommandPalette from "@/components/CommandPalette";
import { ActivityTrackerProvider } from "@/lib/activity-tracker-context";
import { Sprout } from "lucide-react";

export default function AuthGate({ children }: { children: ReactNode }): React.ReactElement {
  const { user, loading } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const isLoginPage = pathname === "/login";

  useEffect(() => {
    if (loading) return;
    if (!user && !isLoginPage) {
      router.replace("/login");
    }
    if (user && isLoginPage) {
      router.replace("/running-orders");
    }
  }, [user, loading, isLoginPage, router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-crm-bg">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-crm-primary flex items-center justify-center animate-pulse">
            <Sprout className="w-5 h-5 text-white" strokeWidth={2.2} />
          </div>
          <p className="text-sm text-crm-text-muted">Loading...</p>
        </div>
      </div>
    );
  }

  if (isLoginPage) {
    return <>{children}</>;
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-crm-bg">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-crm-primary flex items-center justify-center animate-pulse">
            <Sprout className="w-5 h-5 text-white" strokeWidth={2.2} />
          </div>
          <p className="text-sm text-crm-text-muted">Redirecting...</p>
        </div>
      </div>
    );
  }

  return (
    <ActivityTrackerProvider>
      <div className="flex min-h-screen">
        <Sidebar />
        <MainContent>
          <main className="flex-1 flex flex-col px-2 sm:px-3 lg:px-4 py-2 sm:py-3">{children}</main>
        </MainContent>
      </div>
      <CommandPalette />
    </ActivityTrackerProvider>
  );
}
