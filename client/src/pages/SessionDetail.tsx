import { useSession, useUpdateRecord, useCompleteSession, useUploadOpnamePhoto, useUploadRecordPhoto, useDeleteRecordPhoto } from "@/hooks/use-sessions";
import { useCategories, useCategoryPriorities, useSetCategoryPriorities } from "@/hooks/use-products";
import { useRole } from "@/hooks/use-role";
import { useParams, useLocation } from "wouter";
import { ArrowLeft, CheckCircle2, Download, Search, Loader2, Filter, Camera, Image, X, FileArchive, Trash2, Plus, Printer, MapPin, User, CalendarDays, CheckSquare, ListOrdered, ArrowUp, ArrowDown, GripVertical } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { StatusBadge } from "@/components/StatusBadge";
import { useState, useMemo, useRef, useCallback, useEffect } from "react";
import { cn, compressImage } from "@/lib/utils";
import * as XLSX from "xlsx";
import { useToast } from "@/hooks/use-toast";
import { buildUrl } from "@shared/routes";
import { api } from "@shared/routes";
import type { OpnameRecordWithProduct, ProductUnit } from "@shared/schema";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

export default function SessionDetail() {
  const { id } = useParams();
  const sessionId = parseInt(id!);
  const [, setLocation] = useLocation();
  const { data: session, isLoading } = useSession(sessionId);
  const { data: categories } = useCategories();
  const { canCount } = useRole();
  const completeSession = useCompleteSession();
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [completionDialogOpen, setCompletionDialogOpen] = useState(false);
  const [downloadDialogOpen, setDownloadDialogOpen] = useState(false);
  const [categoryPriorityOpen, setCategoryPriorityOpen] = useState(false);
  const { toast } = useToast();
  const { data: categoryPriorities } = useCategoryPriorities();

  const isCompleted = session?.status === "completed";

  const records = useMemo(() => {
    if (!session?.records) return [];
    let filtered = session.records.filter(r => {
      const matchesSearch = r.product.name.toLowerCase().includes(search.toLowerCase()) ||
        r.product.sku.toLowerCase().includes(search.toLowerCase());
      const matchesCategory = categoryFilter === "all" || r.product.category === categoryFilter;
      return matchesSearch && matchesCategory;
    });
    if (categoryPriorities && categoryPriorities.length > 0) {
      const priorityMap = new Map(categoryPriorities.map((p: any) => [p.categoryName, p.sortOrder]));
      filtered = [...filtered].sort((a, b) => {
        const aPriority = priorityMap.get(a.product.category) ?? 999;
        const bPriority = priorityMap.get(b.product.category) ?? 999;
        return aPriority - bPriority;
      });
    }
    return filtered;
  }, [session?.records, search, categoryFilter, categoryPriorities]);

  const hasPhotos = useMemo(() => {
    return session?.records?.some(r => r.photoUrl || (r.photos && r.photos.length > 0)) ?? false;
  }, [session?.records]);

  const stats = useMemo(() => {
    if (!session?.records) return { total: 0, counted: 0, progress: 0 };
    const total = session.records.length;
    const counted = session.records.filter(r => r.actualStock !== null).length;
    const progress = total > 0 ? Math.round((counted / total) * 100) : 0;
    return { total, counted, progress };
  }, [session?.records]);

  const exportToExcel = () => {
    if (!session?.records) return;

    const data = session.records.map(r => ({
      SKU: r.product.sku,
      "Product Name": r.product.name,
      Category: r.product.category,
      "Actual Stock": r.actualStock ?? 0,
      "Notes": r.notes
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Opname Data");
    XLSX.writeFile(wb, `${session.title.replace(/\s+/g, '_')}_Report.xlsx`);

    toast({
      title: "Export Successful",
      description: "The Excel file has been downloaded.",
    });
  };

  const downloadPhotosZip = async (options?: { productIds?: number[]; date?: string }) => {
    try {
      const url = buildUrl(api.upload.downloadZip.path, { id: sessionId });
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(options || {}),
        credentials: "include",
      });
      if (!res.ok) {
        const err = await res.json();
        toast({ title: "Error", description: err.message || "Gagal download ZIP", variant: "destructive" });
        return;
      }
      const blob = await res.blob();
      const downloadUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = downloadUrl;
      a.download = `${session?.title?.replace(/\s+/g, "_") || "photos"}_Photos.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(downloadUrl);
      toast({ title: "Download Berhasil", description: "File ZIP telah didownload." });
    } catch {
      toast({ title: "Error", description: "Gagal download ZIP", variant: "destructive" });
    }
  };

  const handleComplete = () => {
    completeSession.mutate(sessionId, {
      onSuccess: () => {
        setCompletionDialogOpen(true);
      }
    });
  };

  const printSummary = () => {
    window.print();
  };

  if (isLoading) return <div className="p-12 flex justify-center"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
  if (!session) return <div className="p-12 text-center">Session not found</div>;

  return (
    <div className="space-y-6 animate-enter pb-12">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="icon" onClick={() => setLocation("/sessions")} data-testid="button-back">
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div>
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-2xl font-display font-bold text-foreground" data-testid="text-session-title">{session.title}</h1>
              <StatusBadge status={session.status} />
              {session.locationType && (
                <Badge variant="outline" data-testid="badge-location-type">
                  <MapPin className="w-3 h-3 mr-1" />
                  {session.locationType === "gudang" ? "Gudang" : "Toko"}
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-3 flex-wrap mt-1">
              <p className="text-sm text-muted-foreground">
                Started on {new Date(session.startedAt).toLocaleDateString()} | {records.length} items
              </p>
              {session.assignedTo && (
                <span className="text-sm text-muted-foreground flex items-center gap-1" data-testid="text-assigned-staff">
                  <User className="w-3 h-3" />
                  {session.assignedTo}
                </span>
              )}
            </div>
            <div className="flex items-center gap-3 mt-2">
              <Progress value={stats.progress} className="w-40 h-2" data-testid="progress-session" />
              <span className="text-xs text-muted-foreground" data-testid="text-progress">{stats.counted}/{stats.total} dihitung ({stats.progress}%)</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          {hasPhotos && (
            <Button variant="outline" onClick={() => setDownloadDialogOpen(true)} data-testid="button-download-zip">
              <FileArchive className="w-4 h-4 mr-2" />
              Download Foto ZIP
            </Button>
          )}

          <Button variant="outline" onClick={exportToExcel} data-testid="button-export">
            <Download className="w-4 h-4 mr-2" />
            Export Excel
          </Button>

          {!isCompleted && canCount && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button className="bg-emerald-600 text-white" data-testid="button-finalize">
                  <CheckCircle2 className="w-4 h-4 mr-2" />
                  Finalize Session
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Finalize Stock Opname?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will mark the session as completed. Ensure all counts are entered correctly.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <div className="py-3 space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Total Produk</span>
                    <span className="font-medium">{stats.total}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Sudah Dihitung</span>
                    <span className="font-medium">{stats.counted}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Belum Dihitung</span>
                    <span className="font-medium text-amber-600">{stats.total - stats.counted}</span>
                  </div>
                </div>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={handleComplete} className="bg-emerald-600" data-testid="button-confirm-finalize">
                    Confirm & Complete
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center">
        <div className="relative max-w-md flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search by SKU or Name..."
            className="pl-9 bg-white"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            data-testid="input-search-records"
          />
        </div>
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-40 bg-white" data-testid="select-session-category-filter">
            <Filter className="w-4 h-4 mr-2 text-muted-foreground" />
            <SelectValue placeholder="All Categories" />
          </SelectTrigger>
          <SelectContent className="bg-card border border-border">
            <SelectItem value="all">All Categories</SelectItem>
            {categories?.map(cat => (
              <SelectItem key={cat} value={cat}>{cat}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button variant="outline" size="sm" onClick={() => setCategoryPriorityOpen(true)} data-testid="button-session-category-priority">
          <ListOrdered className="w-4 h-4 mr-2" />
          Urutan Kategori
        </Button>
      </div>

      <SessionCategoryPriorityDialog
        open={categoryPriorityOpen}
        onOpenChange={setCategoryPriorityOpen}
        categories={categories ?? []}
      />

      <div className="bg-card border border-border/50 rounded-2xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-muted/30 border-b border-border/50">
              <tr>
                <th className="px-6 py-4 font-medium text-muted-foreground w-[15%]">SKU</th>
                <th className="px-6 py-4 font-medium text-muted-foreground w-[20%]">Product</th>
                <th className="px-6 py-4 font-medium text-muted-foreground w-[10%]">Category</th>
                <th className="px-6 py-4 font-medium text-muted-foreground w-[22%] text-center">Actual Count</th>
                <th className="px-6 py-4 font-medium text-muted-foreground w-[23%] text-center">Foto</th>
                <th className="px-6 py-4 font-medium text-muted-foreground w-[10%]">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {records.map((record) => (
                <RecordRow
                  key={record.id}
                  record={record}
                  sessionId={sessionId}
                  readOnly={isCompleted || !canCount}
                  isGudang={session.locationType === "gudang"}
                />
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <Dialog open={completionDialogOpen} onOpenChange={setCompletionDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Session Selesai</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="flex items-center gap-3">
              <CheckCircle2 className="w-8 h-8 text-emerald-500" />
              <div>
                <p className="font-medium text-foreground">Stock opname telah selesai</p>
                <p className="text-sm text-muted-foreground">{session.title}</p>
              </div>
            </div>

            <div className="space-y-2 text-sm border-t pt-3">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Total Produk</span>
                <span className="font-medium" data-testid="text-summary-total">{stats.total}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Sudah Dihitung</span>
                <span className="font-medium" data-testid="text-summary-counted">{stats.counted}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Belum Dihitung</span>
                <span className="font-medium text-amber-600" data-testid="text-summary-uncounted">{stats.total - stats.counted}</span>
              </div>
            </div>

            <div className="flex flex-col gap-2 pt-2">
              {hasPhotos && (
                <Button variant="outline" onClick={() => { setCompletionDialogOpen(false); setDownloadDialogOpen(true); }} className="w-full" data-testid="button-completion-download-zip">
                  <FileArchive className="w-4 h-4 mr-2" />
                  Download Foto ZIP
                </Button>
              )}
              <Button variant="outline" onClick={exportToExcel} className="w-full" data-testid="button-completion-export">
                <Download className="w-4 h-4 mr-2" />
                Export Excel
              </Button>
              <Button variant="outline" onClick={printSummary} className="w-full" data-testid="button-completion-print">
                <Printer className="w-4 h-4 mr-2" />
                Print Summary
              </Button>
            </div>
          </div>
          <DialogFooter>
            <Button onClick={() => setCompletionDialogOpen(false)} data-testid="button-completion-close">
              Tutup
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <DownloadDialog
        open={downloadDialogOpen}
        onOpenChange={setDownloadDialogOpen}
        records={session?.records ?? []}
        onDownload={downloadPhotosZip}
      />
    </div>
  );
}

function DownloadDialog({ open, onOpenChange, records, onDownload }: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  records: OpnameRecordWithProduct[];
  onDownload: (options?: { productIds?: number[]; date?: string }) => Promise<void>;
}) {
  const [mode, setMode] = useState<"all" | "products" | "date">("all");
  const [selectedProducts, setSelectedProducts] = useState<number[]>([]);
  const [selectedDate, setSelectedDate] = useState("");
  const [isDownloading, setIsDownloading] = useState(false);

  const productsWithPhotos = useMemo(() => {
    return records
      .filter(r => (r.photos && r.photos.length > 0) || r.photoUrl)
      .map(r => ({ id: r.productId, name: r.product.name, sku: r.product.sku }))
      .filter((v, i, a) => a.findIndex(t => t.id === v.id) === i);
  }, [records]);

  const photoDates = useMemo(() => {
    const dates = new Set<string>();
    for (const r of records) {
      if (r.photos) {
        for (const p of r.photos) {
          dates.add(new Date(p.createdAt).toISOString().split("T")[0]);
        }
      }
    }
    return Array.from(dates).sort().reverse();
  }, [records]);

  const toggleProduct = (id: number) => {
    setSelectedProducts(prev =>
      prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id]
    );
  };

  const selectAllProducts = () => {
    if (selectedProducts.length === productsWithPhotos.length) {
      setSelectedProducts([]);
    } else {
      setSelectedProducts(productsWithPhotos.map(p => p.id));
    }
  };

  const handleDownload = async () => {
    setIsDownloading(true);
    try {
      if (mode === "products" && selectedProducts.length > 0) {
        await onDownload({ productIds: selectedProducts });
      } else if (mode === "date" && selectedDate) {
        await onDownload({ date: selectedDate });
      } else {
        await onDownload();
      }
      onOpenChange(false);
    } finally {
      setIsDownloading(false);
    }
  };

  const canDownload = mode === "all" || (mode === "products" && selectedProducts.length > 0) || (mode === "date" && selectedDate);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Download Foto ZIP</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Pilih mode download:</label>
            <Select value={mode} onValueChange={(v) => setMode(v as "all" | "products" | "date")}>
              <SelectTrigger data-testid="select-download-mode">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-card border border-border">
                <SelectItem value="all" data-testid="option-download-all">Semua Foto</SelectItem>
                <SelectItem value="products" data-testid="option-download-products">Pilih Produk</SelectItem>
                <SelectItem value="date" data-testid="option-download-date">Pilih Tanggal</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {mode === "products" && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-foreground">Pilih produk:</label>
                <Button variant="ghost" size="sm" onClick={selectAllProducts} data-testid="button-select-all-products">
                  <CheckSquare className="w-3 h-3 mr-1" />
                  {selectedProducts.length === productsWithPhotos.length ? "Batal Semua" : "Pilih Semua"}
                </Button>
              </div>
              <div className="max-h-60 overflow-y-auto space-y-1 border rounded-md p-2">
                {productsWithPhotos.map(p => (
                  <label
                    key={p.id}
                    className="flex items-center gap-2 p-2 rounded-md cursor-pointer hover-elevate"
                    data-testid={`checkbox-product-${p.id}`}
                  >
                    <input
                      type="checkbox"
                      checked={selectedProducts.includes(p.id)}
                      onChange={() => toggleProduct(p.id)}
                      className="rounded"
                    />
                    <span className="text-sm">{p.name}</span>
                    <span className="text-xs text-muted-foreground ml-auto">{p.sku}</span>
                  </label>
                ))}
                {productsWithPhotos.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-4">Tidak ada produk dengan foto</p>
                )}
              </div>
              {selectedProducts.length > 0 && (
                <p className="text-xs text-muted-foreground">{selectedProducts.length} produk dipilih</p>
              )}
            </div>
          )}

          {mode === "date" && (
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Pilih tanggal:</label>
              {photoDates.length > 0 ? (
                <div className="space-y-1 border rounded-md p-2">
                  {photoDates.map(d => (
                    <label
                      key={d}
                      className="flex items-center gap-2 p-2 rounded-md cursor-pointer hover-elevate"
                      data-testid={`radio-date-${d}`}
                    >
                      <input
                        type="radio"
                        name="download-date"
                        checked={selectedDate === d}
                        onChange={() => setSelectedDate(d)}
                      />
                      <CalendarDays className="w-3 h-3 text-muted-foreground" />
                      <span className="text-sm">{new Date(d).toLocaleDateString("id-ID", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}</span>
                    </label>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-4">Tidak ada tanggal foto tersedia</p>
              )}
            </div>
          )}
        </div>
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} data-testid="button-cancel-download">
            Batal
          </Button>
          <Button onClick={handleDownload} disabled={!canDownload || isDownloading} data-testid="button-confirm-download">
            {isDownloading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <FileArchive className="w-4 h-4 mr-2" />}
            Download
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function RecordRow({ record, sessionId, readOnly, isGudang }: { record: OpnameRecordWithProduct; sessionId: number; readOnly: boolean; isGudang: boolean }) {
  const updateRecord = useUpdateRecord();
  const uploadPhoto = useUploadRecordPhoto();
  const deletePhoto = useDeleteRecordPhoto();
  const uploadLegacyPhoto = useUploadOpnamePhoto();
  const [actual, setActual] = useState(record.actualStock?.toString() ?? "");
  const [isFocused, setIsFocused] = useState(false);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const productUnits = record.product.units ?? [];
  const hasUnits = isGudang && productUnits.length > 0;

  const parseExistingUnitValues = useCallback((): Record<string, number> => {
    if (!record.unitValues) return {};
    try {
      return JSON.parse(record.unitValues);
    } catch {
      return {};
    }
  }, [record.unitValues]);

  const [unitInputs, setUnitInputs] = useState<Record<string, string>>(() => {
    const existing = parseExistingUnitValues();
    const result: Record<string, string> = {};
    productUnits.forEach(u => {
      result[u.unitName] = existing[u.unitName]?.toString() ?? "";
    });
    return result;
  });

  useEffect(() => {
    if (hasUnits) {
      const existing = parseExistingUnitValues();
      const result: Record<string, string> = {};
      productUnits.forEach(u => {
        result[u.unitName] = existing[u.unitName]?.toString() ?? "";
      });
      setUnitInputs(result);
    }
  }, [record.unitValues, hasUnits]);

  const computedTotal = useMemo(() => {
    if (!hasUnits) return 0;
    let total = 0;
    productUnits.forEach(u => {
      const val = parseFloat(unitInputs[u.unitName] || "0");
      if (!isNaN(val)) {
        total += val * u.conversionToBase;
      }
    });
    return Math.round(total);
  }, [unitInputs, productUnits, hasUnits]);

  const baseUnitName = useMemo(() => {
    if (productUnits.length > 0) return productUnits[0].baseUnit;
    return "pcs";
  }, [productUnits]);

  const allPhotos = record.photos ?? [];

  const handleBlur = () => {
    setIsFocused(false);
    if (hasUnits) return;
    const val = parseInt(actual);
    if (!isNaN(val) && val !== record.actualStock) {
      updateRecord.mutate({
        sessionId,
        productId: record.productId,
        actualStock: val
      });
    }
  };

  const handleUnitBlur = () => {
    setIsFocused(false);
    const unitValues: Record<string, number> = {};
    let anyFilled = false;
    productUnits.forEach(u => {
      const val = parseFloat(unitInputs[u.unitName] || "0");
      if (!isNaN(val) && val > 0) {
        unitValues[u.unitName] = val;
        anyFilled = true;
      }
    });

    if (anyFilled) {
      updateRecord.mutate({
        sessionId,
        productId: record.productId,
        actualStock: computedTotal,
        unitValues: JSON.stringify(unitValues),
      });
    }
  };

  const [isUploading, setIsUploading] = useState(false);

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsUploading(true);
    const fileArray = Array.from(files);

    try {
      for (const file of fileArray) {
        let fileToUpload: File = file;
        try {
          fileToUpload = await compressImage(file);
        } catch {}
        await new Promise<void>((resolve) => {
          uploadPhoto.mutate(
            { sessionId, productId: record.productId, file: fileToUpload },
            { onSuccess: () => resolve(), onError: () => resolve() }
          );
        });
      }
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleDeletePhoto = (photoId: number) => {
    deletePhoto.mutate({
      sessionId,
      productId: record.productId,
      photoId,
    });
  };

  const openLightbox = (index: number) => {
    setLightboxIndex(index);
    setLightboxOpen(true);
  };

  const formatNumber = (n: number) => n.toLocaleString("id-ID");

  return (
    <>
      <tr className={cn("transition-colors", isFocused ? "bg-blue-50/50" : "hover:bg-muted/10")} data-testid={`row-record-${record.id}`}>
        <td className="px-6 py-4 font-mono text-muted-foreground">{record.product.sku}</td>
        <td className="px-6 py-4 font-medium text-foreground">{record.product.name}</td>
        <td className="px-6 py-4 text-muted-foreground">{record.product.category || "-"}</td>
        <td className="px-6 py-3">
          {readOnly ? (
            <div className="text-center">
              <div className="font-bold text-foreground py-2 px-3 bg-muted/20 rounded-lg">
                {record.actualStock !== null ? formatNumber(record.actualStock) : "-"}
              </div>
              {hasUnits && record.unitValues && (
                <div className="mt-1 text-xs text-muted-foreground">
                  {Object.entries(parseExistingUnitValues()).map(([name, val]) => (
                    <span key={name} className="mr-2">{val} {name}</span>
                  ))}
                </div>
              )}
            </div>
          ) : hasUnits ? (
            <div className="space-y-1">
              <div className="flex flex-col gap-1">
                {productUnits.map(u => (
                  <div key={u.id} className="flex items-center gap-2">
                    <Input
                      type="number"
                      className="w-20 text-center text-sm"
                      placeholder="0"
                      value={unitInputs[u.unitName] || ""}
                      onChange={(e) => setUnitInputs(prev => ({ ...prev, [u.unitName]: e.target.value }))}
                      onFocus={() => setIsFocused(true)}
                      onBlur={handleUnitBlur}
                      disabled={updateRecord.isPending}
                      data-testid={`input-unit-${record.productId}-${u.unitName}`}
                    />
                    <span className="text-xs text-muted-foreground whitespace-nowrap">{u.unitName}</span>
                  </div>
                ))}
              </div>
              <div className="text-xs text-muted-foreground text-center" data-testid={`text-total-${record.productId}`}>
                Total: {formatNumber(computedTotal)} {baseUnitName}
              </div>
            </div>
          ) : (
            <div className="flex justify-center">
              <Input
                type="number"
                className={cn(
                  "w-24 text-center font-bold transition-all",
                  actual !== "" && "border-primary/50 bg-primary/5 text-primary"
                )}
                placeholder="-"
                value={actual}
                onChange={(e) => setActual(e.target.value)}
                onFocus={() => setIsFocused(true)}
                onBlur={handleBlur}
                disabled={updateRecord.isPending}
                data-testid={`input-count-${record.productId}`}
              />
            </div>
          )}
        </td>
        <td className="px-6 py-3">
          <div className="flex items-center justify-center gap-1 flex-wrap">
            {allPhotos.length > 0 ? (
              allPhotos.map((photo, idx) => (
                <div key={photo.id} className="relative group">
                  <button
                    onClick={() => openLightbox(idx)}
                    className="cursor-pointer"
                    data-testid={`button-view-photo-${record.productId}-${photo.id}`}
                  >
                    <img
                      src={photo.url}
                      alt={`Foto ${record.product.name} ${idx + 1}`}
                      className="w-9 h-9 rounded-md object-cover border border-border/50"
                    />
                    <div className="absolute inset-0 bg-black/40 rounded-md opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <Image className="w-3 h-3 text-white" />
                    </div>
                  </button>
                  {!readOnly && (
                    <button
                      onClick={() => handleDeletePhoto(photo.id)}
                      className="absolute -top-1 -right-1 w-4 h-4 bg-destructive text-white rounded-full flex items-center justify-center invisible group-hover:visible"
                      data-testid={`button-delete-photo-${record.productId}-${photo.id}`}
                    >
                      <X className="w-2.5 h-2.5" />
                    </button>
                  )}
                </div>
              ))
            ) : record.photoUrl ? (
              <button
                onClick={() => { setLightboxIndex(0); setLightboxOpen(true); }}
                className="relative group cursor-pointer"
                data-testid={`button-view-photo-${record.productId}`}
              >
                <img
                  src={record.photoUrl}
                  alt={`Foto ${record.product.name}`}
                  className="w-9 h-9 rounded-md object-cover border border-border/50"
                />
                <div className="absolute inset-0 bg-black/40 rounded-md opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <Image className="w-3 h-3 text-white" />
                </div>
              </button>
            ) : (
              <div className="w-9 h-9 rounded-md border border-dashed border-border/50 flex items-center justify-center text-muted-foreground/30">
                <Camera className="w-4 h-4" />
              </div>
            )}
            {!readOnly && (
              <>
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  className="hidden"
                  ref={fileInputRef}
                  onChange={handlePhotoUpload}
                  data-testid={`input-photo-${record.productId}`}
                />
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploading}
                  data-testid={`button-upload-photo-${record.productId}`}
                >
                  {isUploading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Plus className="w-4 h-4" />
                  )}
                </Button>
              </>
            )}
          </div>
        </td>
        <td className="px-6 py-4">
          {record.actualStock !== null ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-500 mx-auto" />
          ) : (
            <div className="w-2 h-2 rounded-full bg-muted-foreground/20 mx-auto" />
          )}
        </td>
      </tr>

      <Dialog open={lightboxOpen} onOpenChange={setLightboxOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Foto Opname - {record.product.name}</DialogTitle>
          </DialogHeader>
          {allPhotos.length > 0 ? (
            <div className="space-y-3">
              <img
                src={allPhotos[lightboxIndex]?.url}
                alt={`Foto ${record.product.name}`}
                className="w-full rounded-lg object-contain max-h-[60vh]"
                data-testid={`img-preview-${record.productId}`}
              />
              {allPhotos.length > 1 && (
                <div className="flex items-center justify-center gap-2 flex-wrap">
                  {allPhotos.map((photo, idx) => (
                    <button
                      key={photo.id}
                      onClick={() => setLightboxIndex(idx)}
                      className={cn(
                        "w-12 h-12 rounded-md object-cover border-2 overflow-hidden cursor-pointer",
                        idx === lightboxIndex ? "border-primary" : "border-border/50"
                      )}
                      data-testid={`button-lightbox-thumb-${photo.id}`}
                    >
                      <img src={photo.url} alt="" className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
              )}
            </div>
          ) : record.photoUrl ? (
            <img
              src={record.photoUrl}
              alt={`Foto ${record.product.name}`}
              className="w-full rounded-lg object-contain max-h-[60vh]"
              data-testid={`img-preview-${record.productId}`}
            />
          ) : null}
        </DialogContent>
      </Dialog>
    </>
  );
}

function SessionCategoryPriorityDialog({ open, onOpenChange, categories }: {
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
      const priorityMap = new Map(priorities.map((p: any) => [p.categoryName, p.sortOrder]));
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
          <p className="text-sm text-muted-foreground">Atur urutan prioritas kategori. Kategori di atas akan ditampilkan lebih dulu saat stock opname.</p>
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
                  data-testid={`session-category-priority-${index}`}
                >
                  <GripVertical className="w-4 h-4 text-muted-foreground/50 shrink-0" />
                  <span className="text-sm font-medium flex-1">{cat}</span>
                  <Badge variant="secondary" className="no-default-hover-elevate no-default-active-elevate text-xs">
                    #{index + 1}
                  </Badge>
                  <Button variant="ghost" size="icon" onClick={() => moveUp(index)} disabled={index === 0} data-testid={`button-session-move-up-${index}`}>
                    <ArrowUp className="w-3 h-3" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => moveDown(index)} disabled={index === orderedCategories.length - 1} data-testid={`button-session-move-down-${index}`}>
                    <ArrowDown className="w-3 h-3" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Batal</Button>
          <Button onClick={handleSave} disabled={setCategoryPriorities.isPending}>
            {setCategoryPriorities.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Simpan Urutan
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
