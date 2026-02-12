import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, buildUrl } from "@shared/routes";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

export function useMotivation() {
  return useQuery({
    queryKey: [api.motivation.list.path],
    queryFn: async () => {
      const res = await fetch(api.motivation.list.path, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch motivation");
      return res.json();
    },
  });
}

export function useCreateMotivation() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (data: { message: string }) => {
      const res = await apiRequest("POST", api.motivation.create.path, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.motivation.list.path] });
      toast({ title: "Motivation Created", description: "New motivation message has been added." });
    },
    onError: (error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });
}

export function useUpdateMotivation() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, ...data }: { id: number; message?: string; active?: number }) => {
      const url = buildUrl(api.motivation.update.path, { id });
      const res = await apiRequest("PUT", url, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.motivation.list.path] });
      toast({ title: "Motivation Updated", description: "Motivation message has been updated." });
    },
    onError: (error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });
}

export function useDeleteMotivation() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (id: number) => {
      const url = buildUrl(api.motivation.delete.path, { id });
      await apiRequest("DELETE", url);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.motivation.list.path] });
      toast({ title: "Motivation Deleted", description: "Motivation message has been removed." });
    },
    onError: (error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });
}
