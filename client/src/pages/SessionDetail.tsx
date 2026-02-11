import { useSession, useUpdateRecord, useCompleteSession } from "@/hooks/use-sessions";
import { useParams, useLocation } from "wouter";
import { ArrowLeft, Save, CheckCircle2, Download, Search, AlertCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { StatusBadge } from "@/components/StatusBadge";
import { useState, useMemo } from "react";
import { cn } from "@/lib/utils";
import * as XLSX from "xlsx";
import { useToast } from "@/hooks/use-toast";
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

export default function SessionDetail() {
  const { id } = useParams();
  const sessionId = parseInt(id!);
  const [, setLocation] = useLocation();
  const { data: session, isLoading } = useSession(sessionId);
  const completeSession = useCompleteSession();
  const [search, setSearch] = useState("");
  const { toast } = useToast();

  const isCompleted = session?.status === "completed";

  const records = useMemo(() => {
    if (!session?.records) return [];
    return session.records.filter(r => 
      r.product.name.toLowerCase().includes(search.toLowerCase()) || 
      r.product.sku.toLowerCase().includes(search.toLowerCase())
    );
  }, [session?.records, search]);

  const exportToExcel = () => {
    if (!session?.records) return;

    const data = session.records.map(r => ({
      SKU: r.product.sku,
      "Product Name": r.product.name,
      Category: r.product.category,
      "System Stock": r.systemStockSnapshot,
      "Actual Stock": r.actualStock ?? 0,
      "Difference": (r.actualStock ?? 0) - r.systemStockSnapshot,
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

  const handleComplete = () => {
    completeSession.mutate(sessionId, {
      onSuccess: () => {
        // Stay on page but state will update
      }
    });
  };

  if (isLoading) return <div className="p-12 flex justify-center"><Loader2 className="w-8 h-8 animate-spin text-primary"/></div>;
  if (!session) return <div className="p-12 text-center">Session not found</div>;

  return (
    <div className="space-y-6 animate-enter pb-12">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="icon" onClick={() => setLocation("/sessions")}>
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-display font-bold text-foreground">{session.title}</h1>
              <StatusBadge status={session.status} />
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              Started on {new Date(session.startedAt).toLocaleDateString()} • {records.length} items
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          <Button variant="outline" onClick={exportToExcel}>
            <Download className="w-4 h-4 mr-2" />
            Export Excel
          </Button>
          
          {!isCompleted && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button className="bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg shadow-emerald-200">
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
                  <AlertDialogAction onClick={handleComplete} className="bg-emerald-600 hover:bg-emerald-700">
                    Confirm & Complete
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </div>
      </div>

      {/* Search Bar */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input 
          placeholder="Search by SKU or Name..." 
          className="pl-9 bg-white"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* Table Card */}
      <div className="bg-white border border-border/50 rounded-2xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-muted/30 border-b border-border/50">
              <tr>
                <th className="px-6 py-4 font-medium text-muted-foreground w-[15%]">SKU</th>
                <th className="px-6 py-4 font-medium text-muted-foreground w-[25%]">Product</th>
                <th className="px-6 py-4 font-medium text-muted-foreground text-right w-[15%]">System Stock</th>
                <th className="px-6 py-4 font-medium text-muted-foreground w-[20%] text-center">Actual Count</th>
                <th className="px-6 py-4 font-medium text-muted-foreground text-right w-[15%]">Difference</th>
                <th className="px-6 py-4 font-medium text-muted-foreground w-[10%]">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {records.map((record) => (
                <RecordRow 
                  key={record.id} 
                  record={record} 
                  sessionId={sessionId}
                  readOnly={isCompleted}
                />
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// Separate component for row to manage local state and prevent full table re-renders on input
function RecordRow({ record, sessionId, readOnly }: { record: any; sessionId: number; readOnly: boolean }) {
  const updateRecord = useUpdateRecord();
  const [actual, setActual] = useState(record.actualStock?.toString() ?? "");
  const [isFocused, setIsFocused] = useState(false);

  // If actualStock is null, difference is irrelevant (or consider 0).
  // If actualStock is set, calculate difference from system snapshot.
  const diff = record.actualStock !== null 
    ? (record.actualStock - record.systemStockSnapshot) 
    : null;

  const handleBlur = () => {
    setIsFocused(false);
    const val = parseInt(actual);
    
    // Only update if value changed and is a valid number
    if (!isNaN(val) && val !== record.actualStock) {
      updateRecord.mutate({
        sessionId,
        productId: record.productId,
        actualStock: val
      });
    }
  };

  return (
    <tr className={cn("transition-colors", isFocused ? "bg-blue-50/50" : "hover:bg-muted/10")}>
      <td className="px-6 py-4 font-mono text-muted-foreground">{record.product.sku}</td>
      <td className="px-6 py-4 font-medium text-foreground">{record.product.name}</td>
      <td className="px-6 py-4 text-right text-muted-foreground">{record.systemStockSnapshot}</td>
      
      {/* Input Cell */}
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
            />
          </div>
        )}
      </td>

      {/* Difference Cell */}
      <td className="px-6 py-4 text-right">
        {diff !== null && (
          <span className={cn(
            "font-bold px-2 py-1 rounded-md text-xs",
            diff === 0 ? "text-muted-foreground bg-muted/50" :
            diff > 0 ? "text-emerald-600 bg-emerald-50" :
            "text-red-600 bg-red-50"
          )}>
            {diff > 0 ? `+${diff}` : diff}
          </span>
        )}
      </td>

      {/* Status Icon */}
      <td className="px-6 py-4">
        {diff !== null ? (
          diff === 0 ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-500 mx-auto" />
          ) : (
            <AlertCircle className="w-5 h-5 text-amber-500 mx-auto" />
          )
        ) : (
          <div className="w-2 h-2 rounded-full bg-muted-foreground/20 mx-auto" />
        )}
      </td>
    </tr>
  );
}
