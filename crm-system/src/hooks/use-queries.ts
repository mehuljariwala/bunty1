import { useQuery, useQueryClient } from "@tanstack/react-query";
import { fetchParties } from "@/lib/parties";
import { fetchRoutes } from "@/lib/routes";
import { fetchOrders } from "@/lib/orders";
import { fetchColors } from "@/lib/colors";

export const queryKeys = {
  parties: ["parties"] as const,
  routes: ["routes"] as const,
  orders: ["orders"] as const,
  colors: ["colors"] as const,
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
