import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, buildUrl } from "@shared/routes";
import type { InsertSalesOrder } from "@shared/schema";

export function useSalesOrders() {
  return useQuery({
    queryKey: [api.salesOrders.list.path],
    queryFn: async () => {
      const res = await fetch(api.salesOrders.list.path, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch sales orders");
      return api.salesOrders.list.responses[200].parse(await res.json());
    },
  });
}

export function useUpdateSalesOrder() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: { id: number } & Partial<InsertSalesOrder>) => {
      const url = buildUrl(api.salesOrders.update.path, { id });
      const res = await fetch(url, {
        method: api.salesOrders.update.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to update sales order");
      return api.salesOrders.update.responses[200].parse(await res.json());
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.salesOrders.list.path] });
      queryClient.invalidateQueries({ queryKey: [api.dashboard.stats.path] });
    },
  });
}

export function useDeleteSalesOrder() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      const url = buildUrl(api.salesOrders.delete.path, { id });
      const res = await fetch(url, {
        method: api.salesOrders.delete.method,
        credentials: "include",
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message || "Failed to delete sales order");
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.salesOrders.list.path] });
      queryClient.invalidateQueries({ queryKey: [api.dashboard.stats.path] });
    },
  });
}
