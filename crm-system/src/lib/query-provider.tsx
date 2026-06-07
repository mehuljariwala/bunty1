"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { fetchPartiesLite } from "@/lib/parties";
import { fetchColors } from "@/lib/colors";
import { fetchRoutes } from "@/lib/routes";

export default function QueryProvider({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            refetchOnWindowFocus: false,
            retry: 1,
          },
        },
      }),
  );

  // Prefetch commonly used data on app load so pages load instantly
  useEffect(() => {
    queryClient.prefetchQuery({ queryKey: ["parties", "lite"], queryFn: fetchPartiesLite, staleTime: 30 * 60 * 1000 });
    queryClient.prefetchQuery({ queryKey: ["colors"], queryFn: fetchColors, staleTime: 5 * 60 * 1000 });
    queryClient.prefetchQuery({ queryKey: ["routes"], queryFn: fetchRoutes, staleTime: 60 * 60 * 1000 });
  }, [queryClient]);

  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}
