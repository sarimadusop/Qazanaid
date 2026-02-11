import { useSession, useUpdateRecord, useCompleteSession, useUploadOpnamePhoto } from "@/hooks/use-sessions";
import { useCategories } from "@/hooks/use-products";
import { useRole } from "@/hooks/use-role";
import { useParams, useLocation } from "wouter";
import { ArrowLeft, CheckCircle2, Download, Search, Loader2, Filter, Camera, Image, X, FileArchive } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { StatusBadge } from "@/components/StatusBadge";
import { useState, useMemo, useRef } from "react";
import { cn } from "@/lib/utils";
import * as XLSX from "xlsx";
import { useToast } from "@/hooks/use-toast";
import { buildUrl } from "@shared/routes";
import { api } from "@shared/routes";
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
  const { toast } = useToast();

  const isCompleted = session?.status === "completed";

  const records = useMemo(() => {
    if (!session?.records) return [];
    return session.records.filter(r => {
      const matchesSearch = r.product.name.toLowerCase().includes(search.toLowerCase()) ||
        r.product.sku.toLowerCase().includes(search.toLowerCase());
      const matchesCategory = categoryFilter === "all" || r.product.category === categoryFilter;
      return matchesSearch && matchesCategory;
    });
  }, [session?.records, search, categoryFilter]);

  const hasPhotos = useMemo(() => {
    return session?.records?.some(r => r.photoUrl) ?? false;
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

  const downloadPhotosZip = () => {
    const url = buildUrl(api.upload.downloadZip.path, { id: sessionId });
    window.open(url, "_blank");
  };

  const handleComplete = () => {
    completeSession.mutate(sessionId);
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
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              Started on {new Date(session.startedAt).toLocaleDateString()} | {records.length} items
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          {hasPhotos && (
            <Button variant="outline" onClick={downloadPhotosZip} data-testid="button-download-zip">
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
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {categories?.map(cat => (
              <SelectItem key={cat} value={cat}>{cat}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="bg-card border border-border/50 rounded-2xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-muted/30 border-b border-border/50">
              <tr>
                <th className="px-6 py-4 font-medium text-muted-foreground w-[15%]">SKU</th>
                <th className="px-6 py-4 font-medium text-muted-foreground w-[25%]">Product</th>
                <th className="px-6 py-4 font-medium text-muted-foreground w-[12%]">Category</th>
                <th className="px-6 py-4 font-medium text-muted-foreground w-[20%] text-center">Actual Count</th>
                <th className="px-6 py-4 font-medium text-muted-foreground w-[18%] text-center">Foto</th>
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
                  canUploadPhoto={true}
                />
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function RecordRow({ record, sessionId, readOnly, canUploadPhoto }: { record: any; sessionId: number; readOnly: boolean; canUploadPhoto: boolean }) {
  const updateRecord = useUpdateRecord();
  const uploadPhoto = useUploadOpnamePhoto();
  const [actual, setActual] = useState(record.actualStock?.toString() ?? "");
  const [isFocused, setIsFocused] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleBlur = () => {
    setIsFocused(false);
    const val = parseInt(actual);

    if (!isNaN(val) && val !== record.actualStock) {
      updateRecord.mutate({
        sessionId,
        productId: record.productId,
        actualStock: val
      });
    }
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    uploadPhoto.mutate({
      sessionId,
      productId: record.productId,
      file,
    });

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  return (
    <>
      <tr className={cn("transition-colors", isFocused ? "bg-blue-50/50" : "hover:bg-muted/10")} data-testid={`row-record-${record.id}`}>
        <td className="px-6 py-4 font-mono text-muted-foreground">{record.product.sku}</td>
        <td className="px-6 py-4 font-medium text-foreground">{record.product.name}</td>
        <td className="px-6 py-4 text-muted-foreground">{record.product.category || "-"}</td>
        <td className="px-6 py-3">
          {readOnly ? (
            <div className="text-center font-bold text-foreground py-2 px-3 bg-muted/20 rounded-lg">
              {record.actualStock ?? "-"}
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
          <div className="flex items-center justify-center gap-2">
            {record.photoUrl ? (
              <button
                onClick={() => setPreviewOpen(true)}
                className="relative group cursor-pointer"
                data-testid={`button-view-photo-${record.productId}`}
              >
                <img
                  src={record.photoUrl}
                  alt={`Foto ${record.product.name}`}
                  className="w-10 h-10 rounded-md object-cover border border-border/50"
                />
                <div className="absolute inset-0 bg-black/40 rounded-md opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <Image className="w-4 h-4 text-white" />
                </div>
              </button>
            ) : (
              <div className="w-10 h-10 rounded-md border border-dashed border-border/50 flex items-center justify-center text-muted-foreground/30">
                <Camera className="w-4 h-4" />
              </div>
            )}
            {canUploadPhoto && (
              <>
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  ref={fileInputRef}
                  onChange={handlePhotoUpload}
                  data-testid={`input-photo-${record.productId}`}
                />
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploadPhoto.isPending}
                  data-testid={`button-upload-photo-${record.productId}`}
                >
                  {uploadPhoto.isPending ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Camera className="w-4 h-4" />
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

      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Foto Opname - {record.product.name}</DialogTitle>
          </DialogHeader>
          {record.photoUrl && (
            <img
              src={record.photoUrl}
              alt={`Foto ${record.product.name}`}
              className="w-full rounded-lg object-contain max-h-[60vh]"
              data-testid={`img-preview-${record.productId}`}
            />
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
