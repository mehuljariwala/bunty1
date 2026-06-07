import { useQuery, useQueryClient } from "@tanstack/react-query";
import { fetchParties, fetchPartiesLite } from "@/lib/parties";
import { fetchRoutes } from "@/lib/routes";
import { fetchOrders, fetchOrdersByType, fetchRunningPartyNames, fetchOrdersPaginated } from "@/lib/orders";
import { fetchColors } from "@/lib/colors";

export const queryKeys = {
  parties: ["parties"] as const,
  partiesLite: ["parties", "lite"] as const,
  routes: ["routes"] as const,
  orders: ["orders"] as const,
  colors: ["colors"] as const,
  runningOrders: ["orders", "running"] as const,
  runningPartyNames: ["orders", "runningPartyNames"] as const,
};

export function usePartiesQuery() {
  return useQuery({
    queryKey: queryKeys.parties,
    queryFn: fetchParties,
    staleTime: 5 * 60 * 1000,
  });
}

export function useRoutesQuery() {
  return useQuery({
    queryKey: queryKeys.routes,
    queryFn: fetchRoutes,
    staleTime: 5 * 60 * 1000,
  });
}

export function useOrdersQuery() {
  return useQuery({
    queryKey: queryKeys.orders,
    queryFn: fetchOrders,
    staleTime: 30 * 1000,
  });
}

export function useColorsQuery() {
  return useQuery({
    queryKey: queryKeys.colors,
    queryFn: fetchColors,
    staleTime: 2 * 60 * 1000,
  });
}

export function useRunningOrdersQuery() {
  return useQuery({
    queryKey: queryKeys.runningOrders,
    queryFn: () => fetchOrdersByType("Running"),
    staleTime: 30 * 1000,
  });
}

export function useRunningPartyNamesQuery() {
  return useQuery({
    queryKey: queryKeys.runningPartyNames,
    queryFn: fetchRunningPartyNames,
    staleTime: 30 * 1000,
  });
}

export function useOrdersPaginatedQuery(opts: {
  page: number;
  pageSize: number;
  type?: "Running" | "Complete";
  route?: string;
  search?: string;
}) {
  return useQuery({
    queryKey: ["orders", "paginated", opts],
    queryFn: () => fetchOrdersPaginated(opts),
    staleTime: 30 * 1000,
  });
}

/** Lightweight parties query for create-order page (no rates JSONB, only enabled parties) */
export function usePartiesLiteQuery() {
  return useQuery({
    queryKey: queryKeys.partiesLite,
    queryFn: fetchPartiesLite,
    staleTime: 5 * 60 * 1000,
  });
}

/** Prefetch parties + colors so create-order page loads instantly */
export function usePrefetchCreateOrder() {
  const qc = useQueryClient();
  return () => {
    qc.prefetchQuery({ queryKey: queryKeys.partiesLite, queryFn: fetchPartiesLite, staleTime: 5 * 60 * 1000 });
    qc.prefetchQuery({ queryKey: queryKeys.colors, queryFn: fetchColors, staleTime: 2 * 60 * 1000 });
  };
}

export function useInvalidate() {
  const qc = useQueryClient();
  return {
    parties: () => qc.invalidateQueries({ queryKey: queryKeys.parties }),
    routes: () => qc.invalidateQueries({ queryKey: queryKeys.routes }),
    orders: () => qc.invalidateQueries({ queryKey: queryKeys.orders }),
    colors: () => qc.invalidateQueries({ queryKey: queryKeys.colors }),
    all: () => qc.invalidateQueries(),
  };
}
