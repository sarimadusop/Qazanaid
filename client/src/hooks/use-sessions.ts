import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, buildUrl } from "@shared/routes";
import { type OpnameSession, type OpnameSessionWithRecords } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

export function useSessions(locationType?: string) {
  const path = locationType
    ? `${api.sessions.list.path}?locationType=${encodeURIComponent(locationType)}`
    : api.sessions.list.path;

  return useQuery<OpnameSession[]>({
    queryKey: [api.sessions.list.path, locationType],
    queryFn: async () => {
      const res = await fetch(path, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch sessions");
      return res.json();
    },
  });
}

export function useSession(id: number) {
  return useQuery<OpnameSessionWithRecords>({
    queryKey: [api.sessions.get.path, id],
    queryFn: async () => {
      const url = buildUrl(api.sessions.get.path, { id });
      const res = await fetch(url, { credentials: "include" });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || "Failed to fetch session details");
      }
      return res.json();
    },
    enabled: !!id,
  });
}

export function useCreateSession() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (data: { title: string; notes?: string | null; status?: string; locationType?: string; startedByName?: string; assignedTo?: string }) => {
      const res = await fetch(api.sessions.create.path, {
        method: api.sessions.create.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        credentials: "include",
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || "Failed to start session");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.sessions.list.path] });
      toast({ title: "Session Started", description: "New stock opname session initialized." });
    },
    onError: (error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });
}

export function useCompleteSession() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (id: number) => {
      const url = buildUrl(api.sessions.complete.path, { id });
      const res = await fetch(url, { method: api.sessions.complete.method, credentials: "include" });
      if (!res.ok) throw new Error("Failed to complete session");
      return res.json();
    },
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: [api.sessions.list.path] });
      queryClient.invalidateQueries({ queryKey: [api.sessions.get.path, id] });
      toast({ title: "Session Completed", description: "Stock counts have been finalized." });
    },
  });
}

export function useUpdateRecord() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ sessionId, productId, actualStock, notes, unitValues, countedBy, returnedQuantity, returnedNotes }: { sessionId: number; productId: number; actualStock: number; notes?: string; unitValues?: string; countedBy?: string; returnedQuantity?: number; returnedNotes?: string }) => {
      const url = buildUrl(api.records.update.path, { sessionId });
      const res = await fetch(url, {
        method: api.records.update.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId, actualStock, notes, unitValues, countedBy, returnedQuantity, returnedNotes }),
        credentials: "include",
      });

      if (!res.ok) throw new Error("Failed to update count");
      return res.json();
    },
    onSuccess: (_, { sessionId }) => {
      queryClient.invalidateQueries({ queryKey: [api.sessions.get.path, sessionId] });
    },
    onError: (error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });
}

export function useUploadOpnamePhoto() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ sessionId, productId, file }: { sessionId: number; productId: number; file: File }) => {
      const url = buildUrl(api.upload.opnamePhoto.path, { sessionId, productId });
      const formData = new FormData();
      formData.append("photo", file);
      const res = await fetch(url, {
        method: "POST",
        body: formData,
        credentials: "include",
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Upload failed");
      }
      return res.json();
    },
    onSuccess: (_, { sessionId }) => {
      queryClient.invalidateQueries({ queryKey: [api.sessions.get.path, sessionId] });
      toast({ title: "Foto Berhasil Diupload", description: "Foto opname sudah tersimpan." });
    },
    onError: (error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });
}

export function useUploadRecordPhoto() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ sessionId, productId, file }: { sessionId: number; productId: number; file: File }) => {
      const url = buildUrl(api.recordPhotos.upload.path, { sessionId, productId });
      const formData = new FormData();
      formData.append("photo", file);
      const res = await fetch(url, {
        method: "POST",
        body: formData,
        credentials: "include",
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Upload failed");
      }
      return res.json();
    },
    onSuccess: (_, { sessionId }) => {
      queryClient.invalidateQueries({ queryKey: [api.sessions.get.path, sessionId] });
      toast({ title: "Foto Berhasil Diupload", description: "Foto record sudah tersimpan." });
    },
    onError: (error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });
}

export function useDeleteRecordPhoto() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ sessionId, productId, photoId }: { sessionId: number; productId: number; photoId: number }) => {
      const url = buildUrl(api.recordPhotos.delete.path, { sessionId, productId, photoId });
      const res = await fetch(url, { method: "DELETE", credentials: "include" });
      if (!res.ok) throw new Error("Failed to delete photo");
    },
    onSuccess: (_, { sessionId }) => {
      queryClient.invalidateQueries({ queryKey: [api.sessions.get.path, sessionId] });
      toast({ title: "Foto Dihapus", description: "Foto record sudah dihapus." });
    },
    onError: (error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });
}
