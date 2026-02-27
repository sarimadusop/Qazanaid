import { useState, useRef, useCallback, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Camera, X, Upload, Loader2, RotateCcw, Image as ImageIcon } from "lucide-react";
import { compressImage } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

interface CapturedPhoto {
  id: string;
  blob: Blob;
  previewUrl: string;
}

interface BatchPhotoUploadProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpload: (files: File[]) => Promise<void>;
  title?: string;
}

export function BatchPhotoUpload({ open, onOpenChange, onUpload, title = "Ambil Foto" }: BatchPhotoUploadProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const mountedRef = useRef(true);
  const flashTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { toast } = useToast();

  const [photos, setPhotos] = useState<CapturedPhoto[]>([]);
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [facingMode, setFacingMode] = useState<"environment" | "user">("environment");
  const facingModeRef = useRef(facingMode);
  facingModeRef.current = facingMode;
  const [flashEffect, setFlashEffect] = useState(false);

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setCameraActive(false);
  }, []);

  const startCamera = useCallback(async (facing: "environment" | "user") => {
    setCameraError(null);
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setCameraError("Browser tidak mendukung kamera. Gunakan browser Chrome atau Safari terbaru.");
      setCameraActive(false);
      return;
    }
    try {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.stop());
      }
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: facing, width: { ideal: 1280 }, height: { ideal: 960 } },
        audio: false,
      });
      if (!mountedRef.current) {
        stream.getTracks().forEach(t => t.stop());
        return;
      }
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setCameraActive(true);
    } catch (err: any) {
      if (!mountedRef.current) return;
      if (err.name === "NotAllowedError") {
        setCameraError("Izin kamera ditolak. Buka pengaturan browser dan izinkan akses kamera.");
      } else if (err.name === "NotFoundError") {
        setCameraError("Kamera tidak ditemukan pada perangkat ini.");
      } else {
        setCameraError("Tidak dapat mengakses kamera. Pastikan izin kamera sudah diberikan.");
      }
      setCameraActive(false);
    }
  }, []);

  const capturePhoto = useCallback(() => {
    if (!videoRef.current || !canvasRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    if (facingMode === "user") {
      ctx.translate(canvas.width, 0);
      ctx.scale(-1, 1);
    }
    ctx.drawImage(video, 0, 0);

    setFlashEffect(true);
    if (flashTimerRef.current) clearTimeout(flashTimerRef.current);
    flashTimerRef.current = setTimeout(() => {
      if (mountedRef.current) setFlashEffect(false);
    }, 150);

    canvas.toBlob((blob) => {
      if (!blob || !mountedRef.current) return;
      const id = (typeof crypto !== 'undefined' && crypto.randomUUID) ? crypto.randomUUID() : Math.random().toString(36).substring(2) + Date.now().toString(36);
      const previewUrl = URL.createObjectURL(blob);
      setPhotos(prev => [...prev, { id, blob, previewUrl }]);
    }, "image/jpeg", 0.85);
  }, [facingMode]);

  const removePhoto = useCallback((id: string) => {
    setPhotos(prev => {
      const photo = prev.find(p => p.id === id);
      if (photo) URL.revokeObjectURL(photo.previewUrl);
      return prev.filter(p => p.id !== id);
    });
  }, []);

  const switchCamera = useCallback(() => {
    setFacingMode(prev => {
      const newFacing = prev === "environment" ? "user" : "environment";
      startCamera(newFacing);
      return newFacing;
    });
  }, [startCamera]);

  const handleGallerySelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    Array.from(files).forEach(file => {
      const id = (typeof crypto !== 'undefined' && crypto.randomUUID) ? crypto.randomUUID() : Math.random().toString(36).substring(2) + Date.now().toString(36);
      const previewUrl = URL.createObjectURL(file);
      setPhotos(prev => [...prev, { id, blob: file, previewUrl }]);
    });
    e.target.value = "";
  }, []);

  const handleUploadAll = useCallback(async () => {
    if (photos.length === 0) return;
    setIsUploading(true);
    try {
      const files: File[] = [];
      for (const photo of photos) {
        const file = new File([photo.blob], `photo_${Date.now()}_${Math.random().toString(36).slice(2)}.jpg`, {
          type: photo.blob.type || "image/jpeg",
          lastModified: Date.now(),
        });
        const compressed = await compressImage(file);
        files.push(compressed);
      }
      photos.forEach(p => URL.revokeObjectURL(p.previewUrl));
      setPhotos([]);
      stopCamera();
      onOpenChange(false);
      onUpload(files);
    } catch (err) {
      if (mountedRef.current) {
        toast({ title: "Gagal Memproses", description: "Terjadi kesalahan saat memproses foto.", variant: "destructive" });
      }
    } finally {
      if (mountedRef.current) setIsUploading(false);
    }
  }, [photos, onUpload, stopCamera, onOpenChange, toast]);

  useEffect(() => {
    if (open) {
      startCamera(facingModeRef.current);
    } else {
      stopCamera();
      setPhotos(prev => {
        prev.forEach(p => URL.revokeObjectURL(p.previewUrl));
        return [];
      });
      setCameraError(null);
      setIsUploading(false);
    }
  }, [open, startCamera, stopCamera]);

  useEffect(() => {
    return () => {
      stopCamera();
      if (flashTimerRef.current) clearTimeout(flashTimerRef.current);
    };
  }, [stopCamera]);

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) { stopCamera(); } onOpenChange(v); }}>
      <DialogContent className="sm:max-w-[500px] p-0 gap-0 overflow-hidden">
        <DialogHeader className="p-4 pb-2">
          <DialogTitle data-testid="text-batch-photo-title">{title}</DialogTitle>
        </DialogHeader>

        <div className="relative bg-black aspect-[4/3] w-full">
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className={`w-full h-full object-cover ${facingMode === "user" ? "scale-x-[-1]" : ""}`}
            data-testid="video-camera-preview"
          />
          <canvas ref={canvasRef} className="hidden" />

          {flashEffect && (
            <div className="absolute inset-0 bg-white z-10 animate-pulse" />
          )}

          {cameraError && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-muted/90 text-muted-foreground p-4 text-center gap-3">
              <Camera className="w-10 h-10 opacity-50" />
              <p className="text-sm">{cameraError}</p>
              <div className="flex gap-2 flex-wrap justify-center">
                <Button variant="outline" onClick={() => startCamera(facingMode)} data-testid="button-retry-camera">
                  <RotateCcw className="w-4 h-4 mr-2" />
                  Coba Lagi
                </Button>
                <Button variant="outline" onClick={() => fileInputRef.current?.click()} data-testid="button-gallery-fallback">
                  <ImageIcon className="w-4 h-4 mr-2" />
                  Pilih dari Galeri
                </Button>
              </div>
            </div>
          )}

          {!cameraActive && !cameraError && (
            <div className="absolute inset-0 flex items-center justify-center bg-muted/90">
              <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
            </div>
          )}

          {cameraActive && (
            <div className="absolute bottom-3 left-0 right-0 flex items-center justify-center gap-4">
              <Button
                variant="outline"
                size="icon"
                className="rounded-full bg-background/60 backdrop-blur-sm border-background/30"
                onClick={() => fileInputRef.current?.click()}
                data-testid="button-batch-gallery"
              >
                <ImageIcon className="w-5 h-5" />
              </Button>

              <button
                onClick={capturePhoto}
                className="w-14 h-14 rounded-full border-4 border-white bg-white/20 backdrop-blur-sm active:scale-90 transition-transform flex items-center justify-center"
                data-testid="button-capture-photo"
              >
                <div className="w-11 h-11 rounded-full bg-white" />
              </button>

              <Button
                variant="outline"
                size="icon"
                className="rounded-full bg-background/60 backdrop-blur-sm border-background/30"
                onClick={switchCamera}
                data-testid="button-switch-camera"
              >
                <RotateCcw className="w-5 h-5" />
              </Button>
            </div>
          )}

          {photos.length > 0 && (
            <div className="absolute top-3 right-3 bg-primary text-primary-foreground rounded-full w-7 h-7 flex items-center justify-center text-sm font-bold" data-testid="text-photo-count">
              {photos.length}
            </div>
          )}
        </div>

        {photos.length > 0 && (
          <div className="p-3 border-t border-border">
            <div className="flex gap-2 overflow-x-auto pb-1">
              {photos.map((photo, idx) => (
                <div key={photo.id} className="relative flex-shrink-0 w-16 h-16 group" data-testid={`preview-photo-${idx}`}>
                  <img
                    src={photo.previewUrl}
                    alt={`Foto ${idx + 1}`}
                    className="w-full h-full object-cover rounded-md border border-border/50"
                  />
                  <button
                    onClick={() => removePhoto(photo.id)}
                    className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-destructive text-white rounded-full flex items-center justify-center"
                    data-testid={`button-remove-preview-${idx}`}
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        <DialogFooter className="p-3 pt-0 gap-2 flex-row">
          <Button
            variant="outline"
            className="flex-1"
            onClick={() => { stopCamera(); onOpenChange(false); }}
            disabled={isUploading}
            data-testid="button-cancel-batch"
          >
            Batal
          </Button>
          <Button
            className="flex-1"
            onClick={handleUploadAll}
            disabled={photos.length === 0 || isUploading}
            data-testid="button-upload-all"
          >
            {isUploading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
                Mengupload...
              </>
            ) : (
              <>
                <Upload className="w-4 h-4 mr-2" />
                Upload {photos.length > 0 ? `(${photos.length})` : ""}
              </>
            )}
          </Button>
        </DialogFooter>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          multiple
          className="hidden"
          onChange={handleGallerySelect}
          data-testid="input-batch-gallery"
        />
      </DialogContent>
    </Dialog>
  );
}
