import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, buildUrl } from "@shared/routes";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

export function useFeedback() {
  return useQuery({
    queryKey: [api.feedback.list.path],
    queryFn: async () => {
      const res = await fetch(api.feedback.list.path, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch feedback");
      return res.json();
    },
  });
}

export function useCreateFeedback() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (data: { type: "kritik" | "saran"; content: string }) => {
      const res = await apiRequest("POST", api.feedback.create.path, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.feedback.list.path] });
      toast({ title: "Feedback Submitted", description: "Thank you for your feedback." });
    },
    onError: (error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });
}

export function useDeleteFeedback() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (id: number) => {
      const url = buildUrl(api.feedback.delete.path, { id });
      await apiRequest("DELETE", url);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.feedback.list.path] });
      toast({ title: "Feedback Deleted", description: "Feedback has been removed." });
    },
    onError: (error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });
}
