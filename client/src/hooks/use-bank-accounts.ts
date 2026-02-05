import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, buildUrl } from "@shared/routes";
import type { InsertBankAccount } from "@shared/schema";

export function useBankAccounts() {
  return useQuery({
    queryKey: [api.bankAccounts.list.path],
    queryFn: async () => {
      const res = await fetch(api.bankAccounts.list.path, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch bank accounts");
      return api.bankAccounts.list.responses[200].parse(await res.json());
    },
  });
}

export function useCreateBankAccount() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: InsertBankAccount) => {
      const res = await fetch(api.bankAccounts.create.path, {
        method: api.bankAccounts.create.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to create bank account");
      return api.bankAccounts.create.responses[201].parse(await res.json());
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.bankAccounts.list.path] });
    },
  });
}

export function useUpdateBankAccount() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: { id: number } & Partial<InsertBankAccount>) => {
      const url = buildUrl(api.bankAccounts.update.path, { id });
      const res = await fetch(url, {
        method: api.bankAccounts.update.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to update bank account");
      return api.bankAccounts.update.responses[200].parse(await res.json());
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.bankAccounts.list.path] });
    },
  });
}

export function useAdjustBankBalance() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, amount, type, description }: { id: number; amount: string; type: 'add' | 'subtract'; description?: string }) => {
      const url = buildUrl(api.bankAccounts.adjustBalance.path, { id });
      const res = await fetch(url, {
        method: api.bankAccounts.adjustBalance.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount, type, description }),
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to adjust balance");
      return api.bankAccounts.adjustBalance.responses[200].parse(await res.json());
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.bankAccounts.list.path] });
      queryClient.invalidateQueries({ queryKey: [api.dashboard.stats.path] });
    },
  });
}
