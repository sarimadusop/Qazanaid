import { useState, useRef, useEffect, useCallback } from "react";
import {
  useProducts,
  useCreateProduct,
  useUpdateProduct,
  useDeleteProduct,
  useBulkDeleteProducts,
  useCategories,
  useImportExcel,
  useProductPhotos,
  useUploadProductPhoto,
  useDeleteProductPhoto,
  useProductUnits,
  useCreateProductUnit,
  useUpdateProductUnit,
  useDeleteProductUnit,
  useCategoryPriorities,
  useSetCategoryPriorities,
  useBulkResetStock,
  type ExcelImportResult,
} from "@/hooks/use-products";
import { BatchPhotoUpload } from "@/components/BatchPhotoUpload";
import { useBackgroundUpload } from "@/components/BackgroundUpload";
import { useRole } from "@/hooks/use-role";
import { api } from "@shared/routes";
import type { Product, ProductPhoto, ProductUnit } from "@shared/schema";
import { insertProductSchema } from "@shared/schema";
import {
  Plus, Search, Trash2, Box, Loader2, Upload, ImageIcon, Filter,
  Download, FileSpreadsheet, CheckCircle2, AlertTriangle, XCircle,
  Pencil, Save, X, Camera, Package, Layers, Store, Warehouse,
  ArrowUp, ArrowDown, ListOrdered, GripVertical, RotateCcw,
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader,
  AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";
import { cn } from "@/lib/utils";

function getDefaultProductTab(role: string): string {
  if (role === "stock_counter_toko") return "toko";
  if (role === "stock_counter_gudang") return "gudang";
  return "semua";
}

export default function Products() {
  const { canManageSku, isAdmin, canCountToko, canCountGudang, role } = useRole();
  const searchParams = new URLSearchParams(window.location.search);
  const forcedType = searchParams.get("type");

  const defaultTab = forcedType || getDefaultProductTab(role);
  const [locationType, setLocationType] = useState<string>(defaultTab);

  // Sync state if URL changes (for navigation)
  useEffect(() => {
    if (forcedType && forcedType !== locationType) {
      setLocationType(forcedType);
      // Invalidate products to refresh data for the new type
      queryClient.invalidateQueries({ queryKey: [api.products.list.path] });
    }
  }, [forcedType]);

  const queryLocationType = locationType === "semua" ? undefined : (locationType as any);
  const { data: products, isLoading: isInitialLoading } = useProducts(queryLocationType);
  const [deferredLoading, setDeferredLoading] = useState(true);

  useEffect(() => {
    if (!isInitialLoading) {
      // Small timeout to ensure the layout renders first before the heavy table
      const timer = setTimeout(() => setDeferredLoading(false), 50);
      return () => clearTimeout(timer);
    } else {
      setDeferredLoading(true);
    }
  }, [isInitialLoading]);

  const { data: categories } = useCategories();
  const { data: categoryPriorities } = useCategoryPriorities();
  const showAllTabs = role === "admin" || role === "sku_manager" || role === "stock_counter";
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [importResult, setImportResult] = useState<ExcelImportResult | null>(null);
  const [isImportResultOpen, setIsImportResultOpen] = useState(false);
  const [photosProductId, setPhotosProductId] = useState<number | null>(null);
  const [unitsProductId, setUnitsProductId] = useState<number | null>(null);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);
  const [categoryPriorityOpen, setCategoryPriorityOpen] = useState(false);

  const [gudangImportLoading, setGudangImportLoading] = useState(false);
  const importExcel = useImportExcel();
  const bulkDelete = useBulkDeleteProducts();
  const bulkResetStock = useBulkResetStock();
  const [bulkResetOpen, setBulkResetOpen] = useState(false);
  const excelInputRef = useRef<HTMLInputElement>(null);
  const gudangImportRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleExcelUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      importExcel.mutate(file, {
        onSuccess: (result) => {
          setImportResult(result);
          setIsImportResultOpen(true);
        },
      });
      e.target.value = "";
    }
  };

  const handleGudangImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";
    setGudangImportLoading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch(api.excel.gudangImport.path, {
        method: "POST",
        body: formData,
        credentials: "include",
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Gagal import");
      }
      const result = await res.json();
      setImportResult(result);
      setIsImportResultOpen(true);
      queryClient.invalidateQueries({ queryKey: [api.products.list.path] });
      queryClient.invalidateQueries({ queryKey: [api.products.categories.path] });
      queryClient.invalidateQueries({ queryKey: [api.products.withDetails.path] });
    } catch (err: any) {
      toast({ title: "Import Gagal", description: err.message, variant: "destructive" });
    } finally {
      setGudangImportLoading(false);
    }
  };

  const filteredProducts = products?.filter((p) => {
    const matchesSearch =
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.sku.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = categoryFilter === "all" || p.category === categoryFilter;
    return matchesSearch && matchesCategory;
  })?.sort((a, b) => {
    if (!categoryPriorities || categoryPriorities.length === 0) return 0;
    const priorityMap = new Map(categoryPriorities.map(p => [p.categoryName, p.sortOrder]));
    const aPriority = priorityMap.get(a.category || "") ?? 999;
    const bPriority = priorityMap.get(b.category || "") ?? 999;
    if (aPriority !== bPriority) return aPriority - bPriority;
    return 0;
  });

  return (
    <div className="space-y-6 animate-enter">
      <div className={cn(
        "flex flex-col gap-6 p-6 rounded-3xl border transition-all duration-500",
        locationType === "toko" ? "bg-blue-50/50 border-blue-100 shadow-blue-900/5 shadow-xl" :
          locationType === "gudang" ? "bg-amber-50/50 border-amber-100 shadow-amber-900/5 shadow-xl" :
            "bg-white border-border shadow-sm"
      )}>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className={cn(
              "p-3 rounded-2xl transition-all duration-500",
              locationType === "toko" ? "bg-blue-600 text-white shadow-lg shadow-blue-200" :
                locationType === "gudang" ? "bg-amber-600 text-white shadow-lg shadow-amber-200" :
                  "bg-primary text-white shadow-lg shadow-primary/20"
            )}>
              {locationType === "toko" ? <Store className="w-8 h-8" /> :
                locationType === "gudang" ? <Warehouse className="w-8 h-8" /> :
                  <Package className="w-8 h-8" />}
            </div>
            <div>
              <h1 className="text-3xl font-display font-bold text-foreground flex items-center gap-2">
                {locationType === "toko" ? "SKU Toko" :
                  locationType === "gudang" ? "SKU Gudang" :
                    "Semua Produk"}
                <Badge variant="outline" className={cn(
                  "ml-2 text-[10px] uppercase tracking-widest px-2 py-0 border-none font-bold",
                  locationType === "toko" ? "bg-blue-100 text-blue-700" :
                    locationType === "gudang" ? "bg-amber-100 text-amber-700" :
                      "bg-slate-100 text-slate-700"
                )}>
                  {locationType === "semua" ? "Admin View" : "Mode Aktif"}
                </Badge>
              </h1>
              <p className="text-muted-foreground mt-1 text-sm font-medium">
                {locationType === "toko" ? "Kelola stok unit pajangan dan ketersediaan di toko." :
                  locationType === "gudang" ? "Kelola stok massal dan unit penyimpanan di gudang." :
                    "Melihat seluruh inventaris di semua lokasi."}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {canManageSku && (
              <>
                {selectedIds.length > 0 && (
                  <>
                    <AlertDialog open={bulkResetOpen} onOpenChange={setBulkResetOpen}>
                      <AlertDialogTrigger asChild>
                        <Button variant="outline" className="border-orange-200 bg-orange-50 text-orange-700 hover:bg-orange-100 rounded-xl" data-testid="button-bulk-reset">
                          <RotateCcw className="w-4 h-4 mr-2" />
                          Reset {selectedIds.length} Stok
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Reset {selectedIds.length} Stok Produk?</AlertDialogTitle>
                          <AlertDialogDescription>
                            Tindakan ini akan merubah stok saat ini menjadi 0 (nol) untuk semua produk yang dipilih. Tindakan ini tidak dapat dibatalkan.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel data-testid="button-cancel-bulk-reset">Batal</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => {
                              bulkResetStock.mutate(selectedIds, {
                                onSuccess: () => {
                                  setSelectedIds([]);
                                  setBulkResetOpen(false);
                                },
                              });
                            }}
                            className="bg-orange-600 text-white hover:bg-orange-700 rounded-xl"
                            data-testid="button-confirm-bulk-reset"
                          >
                            {bulkResetStock.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                            Reset Stok
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>

                    <AlertDialog open={bulkDeleteOpen} onOpenChange={setBulkDeleteOpen}>
                      <AlertDialogTrigger asChild>
                        <Button variant="destructive" className="rounded-xl shadow-lg shadow-red-100" data-testid="button-bulk-delete">
                          <Trash2 className="w-4 h-4 mr-2" />
                          Hapus {selectedIds.length}
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Hapus {selectedIds.length} Produk?</AlertDialogTitle>
                          <AlertDialogDescription>
                            Tindakan ini tidak dapat dibatalkan. Semua data produk yang dipilih akan dihapus permanen.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel data-testid="button-cancel-bulk-delete">Batal</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => {
                              bulkDelete.mutate(selectedIds, {
                                onSuccess: () => {
                                  setSelectedIds([]);
                                  setBulkDeleteOpen(false);
                                },
                              });
                            }}
                            className="bg-destructive text-destructive-foreground rounded-xl"
                            data-testid="button-confirm-bulk-delete"
                          >
                            {bulkDelete.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                            Hapus
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </>
                )}

                {locationType === "gudang" ? (
                  <>
                    <Button
                      variant="outline"
                      className="border-amber-200 bg-white hover:bg-amber-50 text-amber-700 rounded-xl shadow-sm"
                      onClick={async () => {
                        try {
                          const res = await fetch(api.excel.gudangTemplate.path, {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({}),
                            credentials: "include",
                          });
                          if (!res.ok) throw new Error("Gagal download template");
                          const blob = await res.blob();
                          const url = URL.createObjectURL(blob);
                          const a = document.createElement("a");
                          a.href = url;
                          a.download = "template_gudang.xlsx";
                          a.click();
                          URL.revokeObjectURL(url);
                        } catch (err: any) {
                          toast({ title: "Error", description: err.message, variant: "destructive" });
                        }
                      }}
                      data-testid="button-gudang-template"
                    >
                      <Download className="w-4 h-4 mr-2" />
                      Template
                    </Button>
                    <Button
                      variant="outline"
                      className="border-amber-200 bg-white hover:bg-amber-50 text-amber-700 rounded-xl shadow-sm"
                      onClick={() => gudangImportRef.current?.click()}
                      disabled={gudangImportLoading}
                      data-testid="button-gudang-import"
                    >
                      {gudangImportLoading ? (
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      ) : (
                        <FileSpreadsheet className="w-4 h-4 mr-2" />
                      )}
                      Import
                    </Button>
                    <Button
                      variant="outline"
                      className="border-amber-200 bg-white hover:bg-amber-50 text-amber-700 rounded-xl shadow-sm"
                      onClick={async () => {
                        try {
                          const res = await fetch(api.excel.gudangExport.path, {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({}),
                            credentials: "include",
                          });
                          if (!res.ok) throw new Error("Gagal export gudang");
                          const blob = await res.blob();
                          const url = URL.createObjectURL(blob);
                          const a = document.createElement("a");
                          a.href = url;
                          a.download = "export_gudang.xlsx";
                          a.click();
                          URL.revokeObjectURL(url);
                        } catch (err: any) {
                          toast({ title: "Error", description: err.message, variant: "destructive" });
                        }
                      }}
                      data-testid="button-gudang-export"
                    >
                      <Download className="w-4 h-4 mr-2" />
                      Export
                    </Button>
                    <input
                      ref={gudangImportRef}
                      type="file"
                      accept=".xlsx,.xls"
                      className="hidden"
                      onChange={handleGudangImport}
                      data-testid="input-gudang-import-file"
                    />
                  </>
                ) : (
                  <>
                    <Button
                      variant="outline"
                      className="rounded-xl shadow-sm bg-white"
                      onClick={() => window.open(api.excel.template.path, "_blank")}
                      data-testid="button-download-template"
                    >
                      <Download className="w-4 h-4 mr-2" />
                      Template
                    </Button>
                    <Button
                      variant="outline"
                      className="rounded-xl shadow-sm bg-white"
                      onClick={() => excelInputRef.current?.click()}
                      disabled={importExcel.isPending}
                      data-testid="button-import-excel"
                    >
                      {importExcel.isPending ? (
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      ) : (
                        <FileSpreadsheet className="w-4 h-4 mr-2" />
                      )}
                      Import
                    </Button>
                    <Button
                      variant="outline"
                      className="rounded-xl shadow-sm bg-white"
                      onClick={() => window.open(api.excel.export.path, "_blank")}
                      data-testid="button-export-excel"
                    >
                      <Download className="w-4 h-4 mr-2" />
                      Export
                    </Button>
                    <input
                      ref={excelInputRef}
                      type="file"
                      accept=".xlsx,.xls"
                      className="hidden"
                      onChange={handleExcelUpload}
                      data-testid="input-excel-file"
                    />
                  </>
                )}
                <CreateProductDialog open={isCreateOpen} onOpenChange={setIsCreateOpen} />
              </>
            )}
          </div>
        </div>

        <div className="flex flex-col lg:flex-row lg:items-center gap-4 border-t border-border/10 pt-6">
          <div className="bg-white/50 p-1 rounded-2xl border border-border/50 shadow-inner flex items-center min-w-[300px]">
            <button
              onClick={() => setLocationType("toko")}
              className={cn(
                "flex-1 flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold transition-all duration-300",
                locationType === "toko"
                  ? "bg-blue-600 text-white shadow-lg shadow-blue-200 scale-[1.02]"
                  : "text-muted-foreground hover:bg-blue-50/50"
              )}
              data-testid="button-mode-toko"
            >
              <Store className="w-4 h-4 font-bold" />
              Mode Toko
            </button>
            <button
              onClick={() => setLocationType("gudang")}
              className={cn(
                "flex-1 flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold transition-all duration-300",
                locationType === "gudang"
                  ? "bg-amber-600 text-white shadow-lg shadow-amber-200 scale-[1.02]"
                  : "text-muted-foreground hover:bg-amber-50/50"
              )}
              data-testid="button-mode-gudang"
            >
              <Warehouse className="w-4 h-4 font-bold" />
              Mode Gudang
            </button>
            {showAllTabs && (
              <button
                onClick={() => setLocationType("semua")}
                className={cn(
                  "flex-1 flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold transition-all duration-300",
                  locationType === "semua"
                    ? "bg-slate-800 text-white shadow-lg shadow-slate-200 scale-[1.02]"
                    : "text-muted-foreground hover:bg-slate-50"
                )}
                data-testid="button-mode-semua"
              >
                <Package className="w-4 h-4 font-bold" />
                Semua
              </button>
            )}
          </div>

          <div className="flex items-center gap-3 flex-wrap flex-1">
            <div className="relative flex-1 min-w-[200px] max-w-xs group">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground transition-colors group-focus-within:text-primary" />
              <Input
                placeholder="Cari SKU atau Nama..."
                className="pl-9 bg-white border-border/50 rounded-xl focus:ring-4 focus:ring-primary/10 transition-all shadow-sm"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                data-testid="input-search-products"
              />
            </div>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-44 bg-white border-border/50 rounded-xl shadow-sm" data-testid="select-category-filter">
                <Filter className="w-4 h-4 mr-2 text-muted-foreground" />
                <SelectValue placeholder="Semua Kategori" />
              </SelectTrigger>
              <SelectContent className="bg-white border border-border shadow-xl rounded-xl">
                <SelectItem value="all">Semua Kategori</SelectItem>
                {categories?.map((cat: string) => (
                  <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button variant="outline" size="sm" onClick={() => setCategoryPriorityOpen(true)} className="rounded-xl bg-white border-border/50 hover:bg-slate-50 shadow-sm" data-testid="button-category-priority">
              <ListOrdered className="w-4 h-4 mr-2" />
              Urutan
            </Button>
          </div>
        </div>
      </div>

      <ImportResultDialog
        result={importResult}
        open={isImportResultOpen}
        onOpenChange={setIsImportResultOpen}
      />

      <PhotoGalleryDialog
        productId={photosProductId}
        open={photosProductId !== null}
        onOpenChange={(open) => { if (!open) setPhotosProductId(null); }}
        canManage={canManageSku}
      />

      <UnitManagementDialog
        productId={unitsProductId}
        open={unitsProductId !== null}
        onOpenChange={(open) => { if (!open) setUnitsProductId(null); }}
      />

      <CategoryPriorityDialog
        open={categoryPriorityOpen}
        onOpenChange={setCategoryPriorityOpen}
        categories={categories ?? []}
      />



      <div className="bg-card border border-border rounded-md overflow-hidden min-h-[400px]">
        {isInitialLoading || deferredLoading ? (
          <div className="p-0">
            <div className="bg-muted/30 border-b border-border/50 p-4">
              <div className="flex gap-4">
                <Skeleton className="h-4 w-10" />
                <Skeleton className="h-4 w-12" />
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-40" />
              </div>
            </div>
            {[...Array(8)].map((_, i) => (
              <div key={i} className="p-4 border-b border-border/50 flex items-center gap-4">
                <Skeleton className="h-10 w-10 rounded-md" />
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-4 flex-1" />
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-16" />
                <Skeleton className="h-8 w-8 rounded-full" />
              </div>
            ))}
          </div>
        ) : filteredProducts?.length === 0 ? (
          <div className="p-16 text-center">
            <Box className="w-16 h-16 mx-auto text-muted-foreground/30 mb-4" />
            <h3 className="text-lg font-semibold text-foreground">Tidak Ada Produk</h3>
            <p className="text-muted-foreground mt-1">Coba ubah pencarian atau tambah produk baru.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="bg-muted/30 border-b border-border/50">
                  {canManageSku && (
                    <th className="px-4 py-3 w-10">
                      <input
                        type="checkbox"
                        checked={filteredProducts ? filteredProducts.length > 0 && selectedIds.length === filteredProducts.length : false}
                        onChange={() => {
                          if (!filteredProducts) return;
                          if (selectedIds.length === filteredProducts.length) {
                            setSelectedIds([]);
                          } else {
                            setSelectedIds(filteredProducts.map(p => p.id));
                          }
                        }}
                        className="rounded"
                        data-testid="checkbox-select-all"
                      />
                    </th>
                  )}
                  <th className="px-4 py-3 font-medium text-muted-foreground">Foto</th>
                  <th className="px-4 py-3 font-medium text-muted-foreground">SKU</th>
                  <th className="px-4 py-3 font-medium text-muted-foreground">Nama Produk</th>
                  <th className="px-4 py-3 font-medium text-muted-foreground">Kategori</th>
                  <th className="px-4 py-3 font-medium text-muted-foreground">Lokasi</th>
                  <th className="px-4 py-3 font-medium text-muted-foreground text-right">Stok</th>
                  {canManageSku && (
                    <th className="px-4 py-3 font-medium text-muted-foreground text-right">Aksi</th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {filteredProducts?.map((product) =>
                  editingId === product.id ? (
                    <EditProductRow
                      key={product.id}
                      product={product}
                      onCancel={() => setEditingId(null)}
                      onSaved={() => setEditingId(null)}
                    />
                  ) : (
                    <ProductRow
                      key={product.id}
                      product={product}
                      canManageSku={canManageSku}
                      selected={selectedIds.includes(product.id)}
                      onToggleSelect={() => {
                        setSelectedIds(prev =>
                          prev.includes(product.id) ? prev.filter(id => id !== product.id) : [...prev, product.id]
                        );
                      }}
                      onEdit={() => setEditingId(product.id)}
                      onPhotos={() => setPhotosProductId(product.id)}
                      onUnits={() => setUnitsProductId(product.id)}
                    />
                  )
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function ProductRow({
  product,
  canManageSku,
  selected,
  onToggleSelect,
  onEdit,
  onPhotos,
  onUnits,
}: {
  product: Product;
  canManageSku: boolean;
  selected: boolean;
  onToggleSelect: () => void;
  onEdit: () => void;
  onPhotos: () => void;
  onUnits: () => void;
}) {
  const { data: photos } = useProductPhotos(product.id);
  const { data: units } = useProductUnits(product.id);
  const photoCount = photos?.length ?? 0;
  const firstPhoto = photos?.[0];
  const hasUnits = units && units.length > 0;

  return (
    <tr className="hover:bg-muted/20 transition-colors group" data-testid={`row-product-${product.id}`}>
      {canManageSku && (
        <td className="px-4 py-3">
          <input
            type="checkbox"
            checked={selected}
            onChange={onToggleSelect}
            className="rounded"
            data-testid={`checkbox-product-${product.id}`}
          />
        </td>
      )}
      <td className="px-4 py-3">
        <button
          onClick={onPhotos}
          className="relative w-10 h-10 rounded-md overflow-hidden border border-border/50 flex items-center justify-center bg-muted/30"
          data-testid={`button-photos-${product.id}`}
        >
          {firstPhoto ? (
            <img
              src={firstPhoto.url}
              alt=""
              className="w-10 h-10 object-cover"
              onError={(e) => {
                e.currentTarget.style.display = "none";
              }}
            />
          ) : product.photoUrl ? (
            <img
              src={product.photoUrl}
              alt=""
              className="w-10 h-10 object-cover"
              onError={(e) => {
                e.currentTarget.style.display = "none";
              }}
            />
          ) : (
            <ImageIcon className="w-4 h-4 text-muted-foreground/40" />
          )}
          {photoCount > 0 && (
            <Badge className="absolute -top-1.5 -right-1.5 no-default-hover-elevate no-default-active-elevate" variant="secondary">
              {photoCount}
            </Badge>
          )}
        </button>
      </td>
      <td className="px-4 py-3 font-mono font-medium text-foreground">
        <div className="flex flex-col gap-1">
          <span>{product.locationType === "gudang" && product.productCode ? product.productCode : product.sku}</span>
        </div>
      </td>
      <td className="px-4 py-3">
        <div className="flex flex-col gap-1">
          <span className="font-medium text-foreground">{product.name}</span>
          {product.locationType === "gudang" && product.subCategory && (
            <span className="text-xs text-muted-foreground">
              {product.subCategory}
            </span>
          )}
          {hasUnits && (
            <span className="text-xs text-muted-foreground">
              {formatUnitDisplay(units)}
            </span>
          )}
        </div>
      </td>
      <td className="px-4 py-3 text-muted-foreground">{product.category || "-"}</td>
      <td className="px-4 py-3">
        <Badge variant={product.locationType === "gudang" ? "outline" : "secondary"} data-testid={`badge-location-${product.id}`}>
          {product.locationType === "gudang" ? (
            <><Warehouse className="w-3 h-3 mr-1" />Gudang</>
          ) : (
            <><Store className="w-3 h-3 mr-1" />Toko</>
          )}
        </Badge>
      </td>
      <td className="px-4 py-3 text-right">
        <span className={product.currentStock < 10 ? "text-orange-600 font-bold" : "text-foreground"}>
          {product.currentStock}
        </span>
      </td>
      {canManageSku && (
        <td className="px-4 py-3 text-right">
          <div className="flex items-center justify-end gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="text-muted-foreground"
              onClick={onUnits}
              data-testid={`button-units-${product.id}`}
            >
              <Layers className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="text-muted-foreground"
              onClick={onPhotos}
              data-testid={`button-manage-photos-${product.id}`}
            >
              <Camera className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="text-muted-foreground"
              onClick={onEdit}
              data-testid={`button-edit-product-${product.id}`}
            >
              <Pencil className="w-4 h-4" />
            </Button>
            <DeleteProductButton id={product.id} name={product.name} />
          </div>
        </td>
      )}
    </tr>
  );
}

function formatUnitDisplay(units: ProductUnit[]): string {
  if (!units || units.length === 0) return "";
  const sorted = [...units].sort((a, b) => a.sortOrder - b.sortOrder);
  return sorted.map(u => u.unitName).join(", ");
}

function EditProductRow({ product, onCancel, onSaved }: { product: Product; onCancel: () => void; onSaved: () => void }) {
  const [name, setName] = useState(product.name);
  const [currentStock, setCurrentStock] = useState(product.currentStock);
  const updateProduct = useUpdateProduct();

  const handleSave = () => {
    updateProduct.mutate(
      { id: product.id, name, currentStock },
      { onSuccess: onSaved }
    );
  };

  return (
    <tr className="bg-primary/5" data-testid={`row-edit-product-${product.id}`}>
      <td className="px-4 py-3"></td>
      <td className="px-4 py-3">
        <div className="w-10 h-10 rounded-md bg-muted/50 flex items-center justify-center">
          <ImageIcon className="w-4 h-4 text-muted-foreground/40" />
        </div>
      </td>
      <td className="px-4 py-3 font-mono font-medium text-foreground">{product.sku}</td>
      <td className="px-4 py-3">
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          data-testid={`input-edit-name-${product.id}`}
        />
      </td>
      <td className="px-4 py-3 text-muted-foreground">{product.category || "-"}</td>
      <td className="px-4 py-3">
        <Badge variant={product.locationType === "gudang" ? "outline" : "secondary"}>
          {product.locationType === "gudang" ? "Gudang" : "Toko"}
        </Badge>
      </td>
      <td className="px-4 py-3 text-right">
        <Input
          type="number"
          value={currentStock}
          onChange={(e) => setCurrentStock(parseInt(e.target.value) || 0)}
          className="w-24 ml-auto text-right"
          data-testid={`input-edit-stock-${product.id}`}
        />
      </td>
      <td className="px-4 py-3 text-right">
        <div className="flex items-center justify-end gap-1">
          <Button
            variant="ghost"
            size="icon"
            onClick={handleSave}
            disabled={updateProduct.isPending}
            data-testid={`button-save-edit-${product.id}`}
          >
            {updateProduct.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4 text-green-600" />}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={onCancel}
            data-testid={`button-cancel-edit-${product.id}`}
          >
            <X className="w-4 h-4 text-muted-foreground" />
          </Button>
        </div>
      </td>
    </tr>
  );
}

const createFormSchema = insertProductSchema.omit({ userId: true, photoUrl: true });

function CreateProductDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const createProduct = useCreateProduct();
  const uploadPhoto = useUploadProductPhoto();
  const { toast } = useToast();
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const photoInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const form = useForm<z.infer<typeof createFormSchema>>({
    resolver: zodResolver(createFormSchema),
    defaultValues: {
      sku: "",
      name: "",
      category: "",
      description: "",
      currentStock: 0,
      locationType: "toko",
      subCategory: "",
      productCode: "",
    },
  });

  const locationTypeValue = form.watch("locationType");

  const handleSelectPhotos = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    const newFiles = Array.from(files);
    setSelectedFiles((prev) => [...prev, ...newFiles]);
    newFiles.forEach((file) => {
      const reader = new FileReader();
      reader.onload = (ev) => {
        setPreviews((prev) => [...prev, ev.target?.result as string]);
      };
      reader.readAsDataURL(file);
    });
    e.target.value = "";
  };

  const removeFile = (index: number) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
    setPreviews((prev) => prev.filter((_, i) => i !== index));
  };

  const resetForm = () => {
    form.reset();
    setSelectedFiles([]);
    setPreviews([]);
    setIsUploading(false);
  };

  const onSubmit = async (data: z.infer<typeof createFormSchema>) => {
    setIsUploading(true);
    createProduct.mutate(data, {
      onSuccess: async (newProduct: Product) => {
        if (selectedFiles.length > 0) {
          const { compressImage } = await import("@/lib/utils");
          let failCount = 0;
          for (const file of selectedFiles) {
            try {
              const compressed = await compressImage(file);
              await uploadPhoto.mutateAsync({ productId: newProduct.id, file: compressed });
            } catch {
              failCount++;
            }
          }
          if (failCount > 0) {
            toast({ title: "Peringatan", description: `${failCount} foto gagal diupload. Anda bisa upload ulang dari galeri produk.`, variant: "destructive" });
          }
        }
        setIsUploading(false);
        onOpenChange(false);
        resetForm();
      },
      onError: () => {
        setIsUploading(false);
      },
    });
  };

  const isBusy = createProduct.isPending || isUploading;

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) resetForm(); onOpenChange(v); }}>
      <DialogTrigger asChild>
        <Button data-testid="button-add-product">
          <Plus className="w-4 h-4 mr-2" />
          Tambah Produk
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Tambah Produk Baru</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="sku"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>SKU</FormLabel>
                    <FormControl>
                      <Input placeholder="Cth: ITEM-001" {...field} data-testid="input-sku" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="category"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Kategori</FormLabel>
                    <FormControl>
                      <Input placeholder="Elektronik" {...field} value={field.value || ""} data-testid="input-category" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {locationTypeValue === "gudang" && (
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="productCode"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Kode Produk</FormLabel>
                      <FormControl>
                        <Input placeholder="Cth: ABC123" {...field} value={field.value || ""} data-testid="input-product-code" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="subCategory"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Sub Kategori</FormLabel>
                      <FormControl>
                        <Input placeholder="Cth: Snack" {...field} value={field.value || ""} data-testid="input-sub-category" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            )}

            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nama Produk</FormLabel>
                  <FormControl>
                    <Input placeholder="Headphone Wireless" {...field} data-testid="input-product-name" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="currentStock"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Stok Awal</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        {...field}
                        onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                        data-testid="input-initial-stock"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="locationType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Lokasi</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value || "toko"}>
                      <FormControl>
                        <SelectTrigger data-testid="select-location-type">
                          <SelectValue placeholder="Pilih Lokasi" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent className="bg-card border border-border">
                        <SelectItem value="toko">Toko</SelectItem>
                        <SelectItem value="gudang">Gudang</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Deskripsi (Opsional)</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Detail tentang produk..." {...field} value={field.value || ""} data-testid="input-description" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div>
              <FormLabel>Foto Produk (Opsional)</FormLabel>
              <div className="mt-2 space-y-3">
                {previews.length > 0 && (
                  <div className="grid grid-cols-4 gap-2">
                    {previews.map((src, i) => (
                      <div key={i} className="relative aspect-square rounded-md overflow-hidden border border-border/50 bg-muted/30 group/preview">
                        <img src={src} alt="" className="w-full h-full object-cover" />
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="absolute top-0.5 right-0.5 invisible group-hover/preview:visible"
                          onClick={() => removeFile(i)}
                          data-testid={`button-remove-preview-${i}`}
                        >
                          <X className="w-3 h-3 text-destructive" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    className="flex-1"
                    onClick={() => cameraInputRef.current?.click()}
                    disabled={isBusy}
                    data-testid="button-camera-create"
                  >
                    <Camera className="w-4 h-4 mr-2" />
                    Kamera
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    className="flex-1"
                    onClick={() => photoInputRef.current?.click()}
                    disabled={isBusy}
                    data-testid="button-gallery-create"
                  >
                    <ImageIcon className="w-4 h-4 mr-2" />
                    Galeri
                  </Button>
                </div>
                {selectedFiles.length > 0 && (
                  <p className="text-xs text-muted-foreground text-center">{selectedFiles.length} foto dipilih</p>
                )}
                <input
                  ref={photoInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  className="hidden"
                  onChange={handleSelectPhotos}
                  data-testid="input-select-photos"
                />
                <input
                  ref={cameraInputRef}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  className="hidden"
                  onChange={handleSelectPhotos}
                  data-testid="input-camera-create"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <Button type="button" variant="outline" onClick={() => { resetForm(); onOpenChange(false); }}>Batal</Button>
              <Button type="submit" disabled={isBusy} data-testid="button-submit-product">
                {isBusy && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                {isUploading ? "Mengupload foto..." : "Buat Produk"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

function PhotoGalleryDialog({
  productId,
  open,
  onOpenChange,
  canManage,
}: {
  productId: number | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  canManage: boolean;
}) {
  const { data: photos, isLoading } = useProductPhotos(productId ?? 0);
  const uploadPhoto = useUploadProductPhoto();
  const deletePhoto = useDeleteProductPhoto();
  const [viewingPhoto, setViewingPhoto] = useState<string | null>(null);
  const [batchOpen, setBatchOpen] = useState(false);
  const { addUploadJob } = useBackgroundUpload();

  const handleBatchUpload = useCallback(async (files: File[]) => {
    if (!productId) return;
    const pid = productId;
    addUploadJob("Foto Produk", files, (file) => {
      return new Promise<void>((resolve, reject) => {
        uploadPhoto.mutate({ productId: pid, file }, { onSuccess: () => resolve(), onError: (err) => reject(err) });
      });
    });
  }, [productId, uploadPhoto, addUploadJob]);

  return (
    <>
      <Dialog open={open && !viewingPhoto && !batchOpen} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Foto Produk</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            {isLoading ? (
              <div className="flex justify-center p-8">
                <Loader2 className="w-6 h-6 animate-spin text-primary" />
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-3">
                {photos?.map((photo: ProductPhoto) => (
                  <div key={photo.id} className="relative group/photo aspect-square rounded-md overflow-hidden border border-border/50 bg-muted/30">
                    <img
                      src={photo.url}
                      alt=""
                      className="w-full h-full object-cover cursor-pointer"
                      onClick={() => setViewingPhoto(photo.url)}
                      onError={(e) => {
                        e.currentTarget.style.display = "none";
                        const parent = e.currentTarget.parentElement;
                        if (parent) {
                          const placeholder = parent.querySelector(".photo-placeholder");
                          if (placeholder) (placeholder as HTMLElement).style.display = "flex";
                        }
                      }}
                      data-testid={`img-photo-${photo.id}`}
                    />
                    <div className="photo-placeholder hidden w-full h-full items-center justify-center absolute inset-0">
                      <ImageIcon className="w-8 h-8 text-muted-foreground/40" />
                    </div>
                    {canManage && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="absolute top-1 right-1 bg-background/80 opacity-0 group-hover/photo:opacity-100 transition-opacity"
                        onClick={() => productId && deletePhoto.mutate({ productId, photoId: photo.id })}
                        data-testid={`button-delete-photo-${photo.id}`}
                      >
                        <Trash2 className="w-3.5 h-3.5 text-destructive" />
                      </Button>
                    )}
                  </div>
                ))}
                {canManage && (
                  <div
                    className="aspect-square rounded-md border border-dashed border-border flex flex-col items-center justify-center gap-2 cursor-pointer hover:bg-muted/30 transition-colors"
                    onClick={() => setBatchOpen(true)}
                    data-testid="button-open-batch-camera"
                  >
                    <Camera className="w-6 h-6 text-muted-foreground" />
                    <span className="text-[10px] text-muted-foreground text-center leading-tight">Ambil / Pilih Foto</span>
                  </div>
                )}
              </div>
            )}
            {(!photos || photos.length === 0) && !isLoading && (
              <p className="text-sm text-muted-foreground text-center py-4">Belum ada foto untuk produk ini.</p>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <BatchPhotoUpload
        open={batchOpen}
        onOpenChange={setBatchOpen}
        onUpload={handleBatchUpload}
        title="Foto Produk"
      />

      <Dialog open={!!viewingPhoto} onOpenChange={() => setViewingPhoto(null)}>
        <DialogContent className="sm:max-w-[800px] p-2">
          {viewingPhoto && (
            <img
              src={viewingPhoto}
              alt=""
              className="w-full h-auto max-h-[80vh] object-contain rounded-md"
              onError={(e) => {
                e.currentTarget.style.display = "none";
              }}
              data-testid="img-photo-fullsize"
            />
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

function UnitManagementDialog({
  productId,
  open,
  onOpenChange,
}: {
  productId: number | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { data: units, isLoading } = useProductUnits(productId ?? 0);
  const createUnit = useCreateProductUnit();
  const updateUnit = useUpdateProductUnit();
  const deleteUnit = useDeleteProductUnit();
  const [newUnitName, setNewUnitName] = useState("");
  const [editingUnitId, setEditingUnitId] = useState<number | null>(null);
  const [editUnitName, setEditUnitName] = useState("");

  const handleAddUnit = () => {
    if (!productId || !newUnitName.trim()) return;
    const sortOrder = units ? units.length : 0;
    createUnit.mutate(
      {
        productId,
        unitName: newUnitName.trim(),
        conversionToBase: 1,
        baseUnit: newUnitName.trim(),
        sortOrder,
      },
      {
        onSuccess: () => {
          setNewUnitName("");
        },
      }
    );
  };

  const handleUpdateUnit = (unitId: number) => {
    if (!productId) return;
    updateUnit.mutate(
      {
        productId,
        unitId,
        unitName: editUnitName.trim() || undefined,
        baseUnit: editUnitName.trim() || undefined,
      },
      {
        onSuccess: () => setEditingUnitId(null),
      }
    );
  };

  const startEditing = (unit: ProductUnit) => {
    setEditingUnitId(unit.id);
    setEditUnitName(unit.unitName);
  };

  const sortedUnits = units ? [...units].sort((a: ProductUnit, b: ProductUnit) => a.sortOrder - b.sortOrder) : [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Kelola Unit</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-2">
          {isLoading ? (
            <div className="flex justify-center p-6">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
            </div>
          ) : (
            <>
              {sortedUnits.length > 0 && (
                <div className="text-sm text-muted-foreground bg-muted/30 p-3 rounded-md" data-testid="text-unit-display">
                  {formatUnitDisplay(sortedUnits)}
                </div>
              )}

              <div className="space-y-2">
                {sortedUnits.map((unit: ProductUnit) => (
                  <div key={unit.id} className="flex items-center gap-2 p-2 rounded-md border border-border/50">
                    {editingUnitId === unit.id ? (
                      <>
                        <Input
                          value={editUnitName}
                          onChange={(e) => setEditUnitName(e.target.value)}
                          className="flex-1"
                          placeholder="Nama satuan"
                          data-testid={`input-edit-unit-name-${unit.id}`}
                        />
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleUpdateUnit(unit.id)}
                          disabled={updateUnit.isPending}
                          data-testid={`button-save-unit-${unit.id}`}
                        >
                          <Save className="w-4 h-4 text-green-600" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setEditingUnitId(null)}
                          data-testid={`button-cancel-unit-${unit.id}`}
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </>
                    ) : (
                      <>
                        <div className="flex-1">
                          <span className="font-medium">{unit.unitName}</span>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => startEditing(unit)}
                          data-testid={`button-edit-unit-${unit.id}`}
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => productId && deleteUnit.mutate({ productId, unitId: unit.id })}
                          data-testid={`button-delete-unit-${unit.id}`}
                        >
                          <Trash2 className="w-3.5 h-3.5 text-destructive" />
                        </Button>
                      </>
                    )}
                  </div>
                ))}
              </div>

              <div className="flex items-end gap-2 pt-2 border-t border-border/50 flex-wrap">
                <div className="flex-1 min-w-[100px]">
                  <label className="text-xs text-muted-foreground mb-1 block">Nama Satuan</label>
                  <Input
                    value={newUnitName}
                    onChange={(e) => setNewUnitName(e.target.value)}
                    placeholder="Cth: Dus, Pack, Pcs, Kg"
                    data-testid="input-new-unit-name"
                  />
                </div>
                <Button
                  onClick={handleAddUnit}
                  disabled={createUnit.isPending || !newUnitName.trim()}
                  data-testid="button-add-unit"
                >
                  {createUnit.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4 mr-1" />}
                  Tambah
                </Button>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function ImportResultDialog({ result, open, onOpenChange }: { result: ExcelImportResult | null; open: boolean; onOpenChange: (open: boolean) => void }) {
  if (!result) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Hasil Import Excel</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-2">
          <div className="grid grid-cols-2 gap-3">
            <div className="flex items-center gap-3 p-3 rounded-md bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-900">
              <CheckCircle2 className="w-5 h-5 text-green-600 dark:text-green-400 shrink-0" />
              <div>
                <div className="text-sm text-muted-foreground">Berhasil</div>
                <div className="text-lg font-bold text-green-700 dark:text-green-400" data-testid="text-import-success-count">{result.imported}</div>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 rounded-md bg-orange-50 dark:bg-orange-950/30 border border-orange-200 dark:border-orange-900">
              <AlertTriangle className="w-5 h-5 text-orange-600 dark:text-orange-400 shrink-0" />
              <div>
                <div className="text-sm text-muted-foreground">Dilewati</div>
                <div className="text-lg font-bold text-orange-700 dark:text-orange-400" data-testid="text-import-skipped-count">{result.skipped}</div>
              </div>
            </div>
          </div>

          {result.errors.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-sm font-medium text-muted-foreground">Detail Error:</h4>
              <div className="max-h-48 overflow-y-auto space-y-1">
                {result.errors.map((err, i) => (
                  <div key={i} className="flex items-start gap-2 text-sm p-2 rounded-md bg-muted/50" data-testid={`text-import-error-${i}`}>
                    <XCircle className="w-4 h-4 text-destructive shrink-0 mt-0.5" />
                    <span>
                      <strong>Baris {err.row}:</strong> {err.message}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex justify-end">
            <Button onClick={() => onOpenChange(false)} data-testid="button-close-import-result">Tutup</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function CategoryPriorityDialog({ open, onOpenChange, categories }: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  categories: string[];
}) {
  const { data: priorities, isLoading } = useCategoryPriorities();
  const setCategoryPriorities = useSetCategoryPriorities();
  const [orderedCategories, setOrderedCategories] = useState<string[]>([]);

  useEffect(() => {
    if (!open || categories.length === 0) return;
    if (priorities && priorities.length > 0) {
      const priorityMap = new Map(priorities.map(p => [p.categoryName, p.sortOrder]));
      const sorted = [...categories].sort((a, b) => {
        const aPriority = priorityMap.get(a) ?? 999;
        const bPriority = priorityMap.get(b) ?? 999;
        return aPriority - bPriority;
      });
      setOrderedCategories(sorted);
    } else if (!isLoading) {
      setOrderedCategories([...categories]);
    }
  }, [open, categories, priorities, isLoading]);

  const moveUp = (index: number) => {
    if (index === 0) return;
    const newOrder = [...orderedCategories];
    [newOrder[index - 1], newOrder[index]] = [newOrder[index], newOrder[index - 1]];
    setOrderedCategories(newOrder);
  };

  const moveDown = (index: number) => {
    if (index === orderedCategories.length - 1) return;
    const newOrder = [...orderedCategories];
    [newOrder[index], newOrder[index + 1]] = [newOrder[index + 1], newOrder[index]];
    setOrderedCategories(newOrder);
  };

  const handleSave = () => {
    const priorityData = orderedCategories.map((cat, i) => ({
      categoryName: cat,
      sortOrder: i,
    }));
    setCategoryPriorities.mutate(priorityData, {
      onSuccess: () => onOpenChange(false),
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Urutan Prioritas Kategori</DialogTitle>
        </DialogHeader>
        <div className="space-y-2 py-2">
          <p className="text-sm text-muted-foreground">Atur urutan prioritas kategori. Kategori di atas akan ditampilkan lebih dulu.</p>
          {isLoading ? (
            <div className="flex justify-center py-4">
              <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
            </div>
          ) : orderedCategories.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">Tidak ada kategori</p>
          ) : (
            <div className="space-y-1 max-h-80 overflow-y-auto">
              {orderedCategories.map((cat, index) => (
                <div
                  key={cat}
                  className="flex items-center gap-2 p-2 rounded-md border border-border/50"
                  data-testid={`category-priority-${index}`}
                >
                  <GripVertical className="w-4 h-4 text-muted-foreground/50 shrink-0" />
                  <span className="text-sm font-medium flex-1">{cat}</span>
                  <Badge variant="secondary" className="no-default-hover-elevate no-default-active-elevate text-xs">
                    #{index + 1}
                  </Badge>
                  <Button variant="ghost" size="icon" onClick={() => moveUp(index)} disabled={index === 0} data-testid={`button-move-up-${index}`}>
                    <ArrowUp className="w-3 h-3" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => moveDown(index)} disabled={index === orderedCategories.length - 1} data-testid={`button-move-down-${index}`}>
                    <ArrowDown className="w-3 h-3" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} data-testid="button-cancel-category-priority">
            Batal
          </Button>
          <Button onClick={handleSave} disabled={setCategoryPriorities.isPending} data-testid="button-save-category-priority">
            {setCategoryPriorities.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
            Simpan Urutan
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function DeleteProductButton({ id, name }: { id: number; name: string }) {
  const deleteProduct = useDeleteProduct();

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant="ghost" size="icon" className="text-muted-foreground" data-testid={`button-delete-product-${id}`}>
          <Trash2 className="w-4 h-4" />
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Hapus Produk?</AlertDialogTitle>
          <AlertDialogDescription>
            Apakah Anda yakin ingin menghapus <strong>{name}</strong>? Tindakan ini tidak dapat dibatalkan.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Batal</AlertDialogCancel>
          <AlertDialogAction
            className="bg-destructive"
            onClick={() => deleteProduct.mutate(id)}
            data-testid="button-confirm-delete"
          >
            Hapus
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
