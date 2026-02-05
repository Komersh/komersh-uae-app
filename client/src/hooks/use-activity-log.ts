import { useQuery } from "@tanstack/react-query";
import { api } from "@shared/routes";

export function useActivityLog() {
  return useQuery({
    queryKey: [api.activityLog.list.path],
    queryFn: async () => {
      const res = await fetch(api.activityLog.list.path, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch activity log");
      return api.activityLog.list.responses[200].parse(await res.json());
    },
  });
}
