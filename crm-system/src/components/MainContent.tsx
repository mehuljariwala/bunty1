"use client";

import { ReactNode } from "react";
import { useSidebar } from "./SidebarContext";

export default function MainContent({ children }: { children: ReactNode }) {
  const { expanded } = useSidebar();

  return (
    <div
      className={`flex-1 flex flex-col transition-[margin] duration-300 ease-in-out ${
        expanded ? "lg:ml-[240px]" : "lg:ml-[68px]"
      }`}
    >
      {children}
    </div>
  );
}
