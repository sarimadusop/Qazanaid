import { createContext, useContext, useState, useCallback, useRef, useEffect } from "react";
import { Loader2, CheckCircle2, X, Upload, AlertTriangle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface UploadJob {
  id: string;
  label: string;
  total: number;
  status: "pending" | "uploading" | "done" | "error";
  progress: number;
}

type SingleFileUploadFn = (file: File) => Promise<void>;

interface BackgroundUploadContextType {
  addUploadJob: (label: string, files: File[], uploadFn: SingleFileUploadFn) => void;
  activeCount: number;
}

const BackgroundUploadContext = createContext<BackgroundUploadContextType>({
  addUploadJob: () => {},
  activeCount: 0,
});

export function useBackgroundUpload() {
  return useContext(BackgroundUploadContext);
}

interface QueueItem {
  job: UploadJob;
  files: File[];
  uploadFn: SingleFileUploadFn;
}

export function BackgroundUploadProvider({ children }: { children: React.ReactNode }) {
  const [jobs, setJobs] = useState<UploadJob[]>([]);
  const [minimized, setMinimized] = useState(false);
  const processingRef = useRef(false);
  const queueRef = useRef<QueueItem[]>([]);
  const cleanupTimersRef = useRef<Set<ReturnType<typeof setTimeout>>>(new Set());
  const { toast } = useToast();

  useEffect(() => {
    return () => {
      cleanupTimersRef.current.forEach(t => clearTimeout(t));
    };
  }, []);

  const processQueue = useCallback(async () => {
    if (processingRef.current) return;
    processingRef.current = true;

    while (queueRef.current.length > 0) {
      const item = queueRef.current[0];
      const { job, files, uploadFn } = item;

      setJobs(prev => prev.map(j => j.id === job.id ? { ...j, status: "uploading" } : j));

      try {
        for (let i = 0; i < files.length; i++) {
          await uploadFn(files[i]);
          setJobs(prev => prev.map(j => j.id === job.id ? { ...j, progress: i + 1 } : j));
        }
        setJobs(prev => prev.map(j => j.id === job.id ? { ...j, status: "done" } : j));
      } catch (err) {
        setJobs(prev => prev.map(j => j.id === job.id ? { ...j, status: "error" } : j));
        toast({ title: "Upload Gagal", description: `Gagal mengupload foto untuk ${job.label}`, variant: "destructive" });
      }

      queueRef.current = queueRef.current.slice(1);
    }

    processingRef.current = false;

    const timer = setTimeout(() => {
      setJobs(prev => prev.filter(j => j.status !== "done"));
    }, 3000);
    cleanupTimersRef.current.add(timer);
  }, [toast]);

  const addUploadJob = useCallback((label: string, files: File[], uploadFn: SingleFileUploadFn) => {
    const job: UploadJob = {
      id: crypto.randomUUID(),
      label,
      total: files.length,
      status: "pending",
      progress: 0,
    };
    setJobs(prev => [...prev, job]);
    setMinimized(false);
    queueRef.current.push({ job, files, uploadFn });
    processQueue();
  }, [processQueue]);

  const activeCount = jobs.filter(j => j.status === "uploading" || j.status === "pending").length;

  const dismissJob = useCallback((id: string) => {
    setJobs(prev => prev.filter(j => j.id !== id));
  }, []);

  return (
    <BackgroundUploadContext.Provider value={{ addUploadJob, activeCount }}>
      {children}
      {jobs.length > 0 && (
        <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-[320px]" data-testid="upload-progress-container">
          {minimized ? (
            <button
              onClick={() => setMinimized(false)}
              className="flex items-center gap-2 bg-primary text-primary-foreground px-3 py-2 rounded-full shadow-lg text-sm font-medium"
              data-testid="button-expand-uploads"
            >
              <Upload className="w-4 h-4" />
              {activeCount > 0 ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Mengupload ({activeCount})</span>
                </>
              ) : (
                <span>Upload selesai</span>
              )}
            </button>
          ) : (
            <div className="bg-card border border-border rounded-lg shadow-lg overflow-hidden">
              <div className="flex items-center justify-between gap-2 px-3 py-2 border-b border-border bg-muted/30">
                <span className="text-sm font-medium text-foreground flex items-center gap-2">
                  <Upload className="w-4 h-4" />
                  Upload Foto
                </span>
                <div className="flex items-center gap-1">
                  <button onClick={() => setMinimized(true)} className="text-muted-foreground p-0.5" data-testid="button-minimize-uploads">
                    <div className="w-3 h-0.5 bg-current rounded" />
                  </button>
                  {activeCount === 0 && (
                    <button onClick={() => setJobs([])} className="text-muted-foreground p-0.5" data-testid="button-close-uploads">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
              <div className="max-h-[200px] overflow-y-auto">
                {jobs.map(job => (
                  <div key={job.id} className="flex items-center gap-2 px-3 py-2 border-b border-border/50 last:border-0" data-testid={`upload-job-${job.id}`}>
                    {job.status === "uploading" && <Loader2 className="w-4 h-4 animate-spin text-primary flex-shrink-0" />}
                    {job.status === "pending" && <Upload className="w-4 h-4 text-muted-foreground flex-shrink-0" />}
                    {job.status === "done" && <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />}
                    {job.status === "error" && <AlertTriangle className="w-4 h-4 text-destructive flex-shrink-0" />}
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-foreground truncate">{job.label}</p>
                      <p className="text-[10px] text-muted-foreground">
                        {job.status === "uploading" && `${job.progress}/${job.total} foto`}
                        {job.status === "pending" && `${job.total} foto menunggu`}
                        {job.status === "done" && "Selesai"}
                        {job.status === "error" && "Gagal"}
                      </p>
                    </div>
                    {(job.status === "done" || job.status === "error") && (
                      <button onClick={() => dismissJob(job.id)} className="text-muted-foreground flex-shrink-0" data-testid={`button-dismiss-job-${job.id}`}>
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </BackgroundUploadContext.Provider>
  );
}
