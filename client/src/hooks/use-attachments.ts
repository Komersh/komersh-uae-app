import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, buildUrl } from "@shared/routes";

export function useAttachments() {
  return useQuery({
    queryKey: [api.attachments.list.path],
    queryFn: async () => {
      const res = await fetch(api.attachments.list.path, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch attachments");
      return api.attachments.list.responses[200].parse(await res.json());
    },
  });
}

export function useUploadAttachment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ file, folder }: { file: File; folder?: string }) => {
      const formData = new FormData();
      formData.append("file", file);
      if (folder) formData.append("folder", folder);
      
      const res = await fetch(api.attachments.upload.path, {
        method: api.attachments.upload.method,
        body: formData,
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to upload file");
      return api.attachments.upload.responses[201].parse(await res.json());
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.attachments.list.path] });
    },
  });
}

export function useDeleteAttachment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      const url = buildUrl(api.attachments.delete.path, { id });
      const res = await fetch(url, { 
        method: api.attachments.delete.method, 
        credentials: "include" 
      });
      if (!res.ok) throw new Error("Failed to delete attachment");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.attachments.list.path] });
    },
  });
}
