import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, buildUrl } from "@shared/routes";
import type { InsertPotentialProduct } from "@shared/schema";

export function usePotentialProducts() {
  return useQuery({
    queryKey: [api.potentialProducts.list.path],
    queryFn: async () => {
      const res = await fetch(api.potentialProducts.list.path, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch potential products");
      return api.potentialProducts.list.responses[200].parse(await res.json());
    },
  });
}

export function useCreatePotentialProduct() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: InsertPotentialProduct) => {
      const res = await fetch(api.potentialProducts.create.path, {
        method: api.potentialProducts.create.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        credentials: "include",
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Failed to create potential product");
      }
      return api.potentialProducts.create.responses[201].parse(await res.json());
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.potentialProducts.list.path] });
    },
  });
}

export function useUpdatePotentialProduct() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: { id: number } & Partial<InsertPotentialProduct>) => {
      const url = buildUrl(api.potentialProducts.update.path, { id });
      const res = await fetch(url, {
        method: api.potentialProducts.update.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to update potential product");
      return api.potentialProducts.update.responses[200].parse(await res.json());
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.potentialProducts.list.path] });
    },
  });
}

export function useDeletePotentialProduct() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      const url = buildUrl(api.potentialProducts.delete.path, { id });
      const res = await fetch(url, { 
        method: api.potentialProducts.delete.method, 
        credentials: "include" 
      });
      if (!res.ok) throw new Error("Failed to delete potential product");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.potentialProducts.list.path] });
    },
  });
}

export function useBuyPotentialProduct() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...data }: { id: number; quantity: number; unitCost: string; shippingCost?: string; supplierOrderId?: string; purchaseDate: string }) => {
      const url = buildUrl(api.potentialProducts.buy.path, { id });
      const res = await fetch(url, {
        method: api.potentialProducts.buy.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to buy product");
      return api.potentialProducts.buy.responses[201].parse(await res.json());
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.potentialProducts.list.path] });
      queryClient.invalidateQueries({ queryKey: [api.inventory.list.path] });
      queryClient.invalidateQueries({ queryKey: [api.dashboard.stats.path] });
    },
  });
}
