"use client";

import { useEffect, useRef, useCallback } from "react";
import { usePathname } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import {
  logActivity,
  logPageVisit,
  updatePageDuration,
} from "@/lib/activity-logger";

const PAGE_NAMES: Record<string, string> = {
  "/dashboard": "Dashboard",
  "/running-orders": "Running Orders",
  "/orders": "Orders",
  "/party-master": "Party Master",
  "/color-master": "Color Master",
  "/route-master": "Route Master",
  "/rate-master": "Rate Master",
  "/stock-inventory": "Stock Inventory",
  "/inventory-report": "Inventory Report",
  "/reports": "Reports",
  "/manage-sub-admin": "Manage Sub Admin",
  "/admin-profile": "Admin Profile",
  "/user-activity": "User Activity",
};

function getPageName(path: string): string {
  return PAGE_NAMES[path] || path.replace(/^\//, "").replace(/-/g, " ") || "Home";
}

export function useActivityTracker() {
  const { user } = useAuth();
  const pathname = usePathname();
  const currentDocId = useRef<string | null>(null);
  const pageStartTime = useRef<number>(Date.now());
  const sessionLogged = useRef(false);
  const prevPathname = useRef<string | null>(null);

  const userId = user?.uid ?? "";
  const userName = user?.displayName || user?.email?.split("@")[0] || "Unknown";
  const userEmail = user?.email ?? "";

  const flushDuration = useCallback(async () => {
    if (!currentDocId.current) return;
    const elapsed = Date.now() - pageStartTime.current;
    if (elapsed > 500) {
      try {
        await updatePageDuration(currentDocId.current, elapsed);
      } catch {
        // silent
      }
    }
    currentDocId.current = null;
  }, []);

  useEffect(() => {
    if (!userId || sessionLogged.current) return;
    sessionLogged.current = true;
    logActivity({
      userId,
      userName,
      userEmail,
      type: "session_start",
    }).catch(() => {});
  }, [userId, userName, userEmail]);

  useEffect(() => {
    if (!userId || !pathname || pathname === "/login") return;
    if (pathname === prevPathname.current) return;
    prevPathname.current = pathname;

    flushDuration().then(() => {
      pageStartTime.current = Date.now();
      logPageVisit(userId, userName, userEmail, pathname, getPageName(pathname))
        .then((id) => {
          currentDocId.current = id;
        })
        .catch(() => {});
    });
  }, [pathname, userId, userName, userEmail, flushDuration]);

  useEffect(() => {
    function handleVisibilityChange() {
      if (document.visibilityState === "hidden") {
        flushDuration();
      }
    }

    function handleBeforeUnload() {
      if (!currentDocId.current) return;
      const elapsed = Date.now() - pageStartTime.current;
      if (elapsed > 500) {
        const payload = JSON.stringify({
          durationMs: elapsed,
        });
        navigator.sendBeacon?.(
          `/api/activity-duration?docId=${currentDocId.current}`,
          payload
        );
      }
    }

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("beforeunload", handleBeforeUnload);
      flushDuration();
    };
  }, [flushDuration]);

  const trackStockUpdate = useCallback(
    (details: Record<string, unknown>) => {
      if (!userId) return;
      logActivity({
        userId,
        userName,
        userEmail,
        type: "stock_update",
        details,
      }).catch(() => {});
    },
    [userId, userName, userEmail]
  );

  const trackColorAdded = useCallback(
    (details: Record<string, unknown>) => {
      if (!userId) return;
      logActivity({
        userId,
        userName,
        userEmail,
        type: "color_added",
        details,
      }).catch(() => {});
    },
    [userId, userName, userEmail]
  );

  const trackColorEdited = useCallback(
    (details: Record<string, unknown>) => {
      if (!userId) return;
      logActivity({
        userId,
        userName,
        userEmail,
        type: "color_edited",
        details,
      }).catch(() => {});
    },
    [userId, userName, userEmail]
  );

  const trackColorDeleted = useCallback(
    (details: Record<string, unknown>) => {
      if (!userId) return;
      logActivity({
        userId,
        userName,
        userEmail,
        type: "color_deleted",
        details,
      }).catch(() => {});
    },
    [userId, userName, userEmail]
  );

  return {
    trackStockUpdate,
    trackColorAdded,
    trackColorEdited,
    trackColorDeleted,
  };
}
