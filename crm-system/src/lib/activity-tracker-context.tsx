"use client";

import { createContext, useContext, type ReactNode } from "react";
import { useActivityTracker } from "@/hooks/use-activity-tracker";

type TrackerValue = ReturnType<typeof useActivityTracker>;

const ActivityTrackerContext = createContext<TrackerValue | null>(null);

export function ActivityTrackerProvider({ children }: { children: ReactNode }): React.ReactElement {
  const tracker = useActivityTracker();
  return (
    <ActivityTrackerContext.Provider value={tracker}>
      {children}
    </ActivityTrackerContext.Provider>
  );
}

export function useTracker(): TrackerValue {
  const ctx = useContext(ActivityTrackerContext);
  if (!ctx) throw new Error("useTracker must be used within ActivityTrackerProvider");
  return ctx;
}
