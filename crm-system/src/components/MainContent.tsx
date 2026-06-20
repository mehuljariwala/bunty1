"use client";

import { ReactNode } from "react";

export default function MainContent({ children }: { children: ReactNode }) {
  return (
    <div className="flex-1 flex flex-col min-w-0 mt-11 lg:mt-0 lg:ml-[68px]">
      {children}
    </div>
  );
}
