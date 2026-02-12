import { useQuery } from "@tanstack/react-query";
import { api } from "@shared/routes";

export type Role = "admin" | "sku_manager" | "stock_counter" | "stock_counter_toko" | "stock_counter_gudang";

export function useRole() {
  const { data, isLoading } = useQuery({
    queryKey: [api.roles.me.path],
    queryFn: async () => {
      const res = await fetch(api.roles.me.path, { credentials: "include" });
      if (!res.ok) return null;
      return res.json();
    },
  });

  const role = (data?.role || "stock_counter") as Role;

  const isAdmin = role === "admin";
  const isSKUManager = role === "sku_manager";
  const canManageSku = isAdmin || isSKUManager;
  const canCountToko = isAdmin || role === "stock_counter" || role === "stock_counter_toko";
  const canCountGudang = isAdmin || role === "stock_counter" || role === "stock_counter_gudang";
  const canCount = isAdmin || role === "stock_counter" || role === "stock_counter_toko" || role === "stock_counter_gudang";

  const canCountLocation = (locationType: string) => {
    if (isAdmin || role === "stock_counter") return true;
    if (locationType === "toko" && role === "stock_counter_toko") return true;
    if (locationType === "gudang" && role === "stock_counter_gudang") return true;
    return false;
  };

  return {
    role,
    isLoading,
    isAdmin,
    isSKUManager,
    canManageSku,
    canCount,
    canCountToko,
    canCountGudang,
    canCountLocation,
  };
}
