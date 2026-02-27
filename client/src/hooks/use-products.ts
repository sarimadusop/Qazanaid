import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, buildUrl } from "@shared/routes";
import { type Product, type CategoryPriority } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

export type ExcelImportResult = {
  imported: number;
  skipped: number;
  errors: { row: number; message: string }[];
};

export function useProducts(locationType?: string) {
  const path = locationType
    ? `${api.products.list.path}?locationType=${encodeURIComponent(locationType)}`
    : api.products.list.path;

  return useQuery<Product[]>({
    queryKey: [api.products.list.path, locationType],
    queryFn: async () => {
      const res = await fetch(path, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch products");
      return res.json();
    },
  });
}

export function useProductsWithDetails() {
  return useQuery({
    queryKey: [api.products.withDetails.path],
    queryFn: async () => {
      const res = await fetch(api.products.withDetails.path, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch products with details");
      return res.json();
    },
  });
}

export function useProductPhotos(productId: number) {
  return useQuery({
    queryKey: [api.productPhotos.list.path, productId],
    queryFn: async () => {
      const url = buildUrl(api.productPhotos.list.path, { productId });
      const res = await fetch(url, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch product photos");
      return res.json();
    },
    enabled: !!productId,
  });
}

export function useUploadProductPhoto() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ productId, file }: { productId: number; file: File }) => {
      const formData = new FormData();
      formData.append("photo", file);
      const url = buildUrl(api.productPhotos.upload.path, { productId });
      const res = await fetch(url, {
        method: "POST",
        body: formData,
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to upload photo");
      return res.json();
    },
    onSuccess: (_, { productId }) => {
      queryClient.invalidateQueries({ queryKey: [api.productPhotos.list.path, productId] });
      queryClient.invalidateQueries({ queryKey: [api.products.list.path] });
      queryClient.invalidateQueries({ queryKey: [api.products.withDetails.path] });
      toast({ title: "Photo Uploaded", description: "Product photo has been saved." });
    },
    onError: (error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });
}

export function useDeleteProductPhoto() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ productId, photoId }: { productId: number; photoId: number }) => {
      const url = buildUrl(api.productPhotos.delete.path, { productId, photoId });
      const res = await fetch(url, { method: "DELETE", credentials: "include" });
      if (!res.ok) throw new Error("Failed to delete photo");
    },
    onSuccess: (_, { productId }) => {
      queryClient.invalidateQueries({ queryKey: [api.productPhotos.list.path, productId] });
      queryClient.invalidateQueries({ queryKey: [api.products.list.path] });
      queryClient.invalidateQueries({ queryKey: [api.products.withDetails.path] });
      toast({ title: "Photo Deleted", description: "Product photo has been removed." });
    },
    onError: (error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });
}

export function useProductUnits(productId: number) {
  return useQuery({
    queryKey: [api.productUnits.list.path, productId],
    queryFn: async () => {
      const url = buildUrl(api.productUnits.list.path, { productId });
      const res = await fetch(url, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch product units");
      return res.json();
    },
    enabled: !!productId,
  });
}

export function useCreateProductUnit() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ productId, ...data }: { productId: number; unitName: string; conversionToBase: number; baseUnit: string; sortOrder?: number }) => {
      const url = buildUrl(api.productUnits.create.path, { productId });
      const res = await apiRequest("POST", url, data);
      return res.json();
    },
    onSuccess: (_, { productId }) => {
      queryClient.invalidateQueries({ queryKey: [api.productUnits.list.path, productId] });
      queryClient.invalidateQueries({ queryKey: [api.products.withDetails.path] });
      toast({ title: "Unit Created", description: "Product unit has been added." });
    },
    onError: (error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });
}

export function useUpdateProductUnit() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ productId, unitId, ...data }: { productId: number; unitId: number; unitName?: string; conversionToBase?: number; baseUnit?: string; sortOrder?: number }) => {
      const url = buildUrl(api.productUnits.update.path, { productId, unitId });
      const res = await apiRequest("PUT", url, data);
      return res.json();
    },
    onSuccess: (_, { productId }) => {
      queryClient.invalidateQueries({ queryKey: [api.productUnits.list.path, productId] });
      queryClient.invalidateQueries({ queryKey: [api.products.withDetails.path] });
      toast({ title: "Unit Updated", description: "Product unit has been updated." });
    },
    onError: (error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });
}

export function useDeleteProductUnit() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ productId, unitId }: { productId: number; unitId: number }) => {
      const url = buildUrl(api.productUnits.delete.path, { productId, unitId });
      const res = await fetch(url, { method: "DELETE", credentials: "include" });
      if (!res.ok) throw new Error("Failed to delete unit");
    },
    onSuccess: (_, { productId }) => {
      queryClient.invalidateQueries({ queryKey: [api.productUnits.list.path, productId] });
      queryClient.invalidateQueries({ queryKey: [api.products.withDetails.path] });
      toast({ title: "Unit Deleted", description: "Product unit has been removed." });
    },
    onError: (error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });
}

export function useCategories() {
  return useQuery<string[]>({
    queryKey: [api.products.categories.path],
    queryFn: async () => {
      const res = await fetch(api.products.categories.path, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch categories");
      return res.json();
    },
  });
}

export function useCreateProduct() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (data: Partial<Omit<Product, "id" | "updatedAt" | "userId">>) => {
      const res = await fetch(api.products.create.path, {
        method: api.products.create.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        credentials: "include",
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Failed to create product");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.products.list.path] });
      queryClient.invalidateQueries({ queryKey: [api.products.categories.path] });
      queryClient.invalidateQueries({ queryKey: [api.products.withDetails.path] });
      toast({ title: "Product Created", description: "Successfully added new SKU to inventory." });
    },
    onError: (error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });
}

export function useUpdateProduct() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, ...updates }: { id: number } & Partial<Omit<Product, "id" | "updatedAt" | "userId">>) => {
      const url = buildUrl(api.products.update.path, { id });
      const res = await fetch(url, {
        method: api.products.update.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
        credentials: "include",
      });

      if (!res.ok) throw new Error("Failed to update product");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.products.list.path] });
      queryClient.invalidateQueries({ queryKey: [api.products.categories.path] });
      queryClient.invalidateQueries({ queryKey: [api.products.withDetails.path] });
      toast({ title: "Product Updated", description: "Inventory details have been saved." });
    },
    onError: (error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });
}

export function useDeleteProduct() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (id: number) => {
      const url = buildUrl(api.products.delete.path, { id });
      const res = await fetch(url, { method: api.products.delete.method, credentials: "include" });
      if (!res.ok) throw new Error("Failed to delete product");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.products.list.path] });
      queryClient.invalidateQueries({ queryKey: [api.products.categories.path] });
      queryClient.invalidateQueries({ queryKey: [api.products.withDetails.path] });
      toast({ title: "Product Deleted", description: "The SKU has been removed from the system." });
    },
  });
}

export function useBulkDeleteProducts() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (ids: number[]) => {
      const res = await fetch(api.products.bulkDelete.path, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids }),
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to delete products");
      return res.json() as Promise<{ deleted: number }>;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: [api.products.list.path] });
      queryClient.invalidateQueries({ queryKey: [api.products.categories.path] });
      queryClient.invalidateQueries({ queryKey: [api.products.withDetails.path] });
      toast({ title: "Produk Dihapus", description: `${data.deleted} produk berhasil dihapus.` });
    },
    onError: (error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });
}

export function useBulkResetStock() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (ids: number[]) => {
      const res = await fetch(api.products.bulkResetStock.path, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids }),
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to reset stock for products");
      return res.json() as Promise<{ reset: number }>;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: [api.products.list.path] });
      queryClient.invalidateQueries({ queryKey: [api.products.withDetails.path] });
      toast({ title: "Stok Berhasil Direset", description: `${data.reset} produk berhasil diubah stoknya menjadi 0.` });
    },
    onError: (error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });
}

export function useUploadPhoto() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ productId, file }: { productId: number; file: File }) => {
      const formData = new FormData();
      formData.append("photo", file);
      const url = buildUrl(api.upload.photo.path, { productId });
      const res = await fetch(url, {
        method: "POST",
        body: formData,
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to upload photo");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.products.list.path] });
      toast({ title: "Photo Uploaded", description: "Product photo has been saved." });
    },
    onError: (error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });
}

export function useImportExcel() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation<ExcelImportResult, Error, File>({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch(api.excel.import.path, {
        method: "POST",
        body: formData,
        credentials: "include",
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Gagal import Excel");
      }
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: [api.products.list.path] });
      queryClient.invalidateQueries({ queryKey: [api.products.categories.path] });
      if (data.imported > 0) {
        toast({
          title: "Import Berhasil",
          description: `${data.imported} produk berhasil diimport${data.skipped > 0 ? `, ${data.skipped} dilewati` : ""}.`,
        });
      }
    },
    onError: (error) => {
      toast({ title: "Import Gagal", description: error.message, variant: "destructive" });
    },
  });
}

export function useCategoryPriorities() {
  return useQuery<CategoryPriority[]>({
    queryKey: [api.categoryPriorities.list.path],
    queryFn: async () => {
      const res = await fetch(api.categoryPriorities.list.path, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch category priorities");
      return res.json();
    },
  });
}

export function useSetCategoryPriorities() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (priorities: { categoryName: string; sortOrder: number }[]) => {
      const res = await fetch(api.categoryPriorities.set.path, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ priorities }),
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to save category priorities");
      return res.json() as Promise<CategoryPriority[]>;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.categoryPriorities.list.path] });
      toast({ title: "Urutan Kategori Disimpan", description: "Prioritas kategori berhasil diperbarui." });
    },
    onError: (error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });
}
