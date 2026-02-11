import { useQuery } from "@tanstack/react-query";
import { api } from "@shared/routes";

export type Role = "admin" | "sku_manager" | "stock_counter";

export function useRole() {
  const { data, isLoading } = useQuery({
    queryKey: [api.roles.me.path],
    queryFn: async () => {
      const res = await fetch(api.roles.me.path, { credentials: "include" });
      if (!res.ok) return null;
      return res.json();
    },
  });

  return {
    role: (data?.role || "stock_counter") as Role,
    isLoading,
    isAdmin: data?.role === "admin",
    canManageSku: data?.role === "admin" || data?.role === "sku_manager",
    canCount: data?.role === "admin" || data?.role === "stock_counter",
  };
}
