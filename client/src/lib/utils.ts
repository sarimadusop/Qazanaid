import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

async function getStampText(): Promise<string> {
  const time = new Date().toLocaleString("id-ID", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });

  if (!navigator.geolocation) return time;

  try {
    const pos = await new Promise<GeolocationPosition>((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(resolve, reject, {
        timeout: 3000,
        enableHighAccuracy: false,
      });
    });
    return `${time} | Loc: ${pos.coords.latitude.toFixed(4)}, ${pos.coords.longitude.toFixed(4)}`;
  } catch {
    return time;
  }
}

export function compressImage(file: File, maxWidth = 1000, quality = 0.6): Promise<File> {
  return new Promise((resolve, reject) => {
    // Check if it's an image or potential Apple HEIC format
    const isImage = file.type.startsWith("image/") ||
      file.name.toLowerCase().endsWith(".heic") ||
      file.name.toLowerCase().endsWith(".heif");

    if (!isImage) {
      resolve(file);
      return;
    }

    const img = new window.Image();
    const url = URL.createObjectURL(file);

    img.onload = async () => {
      URL.revokeObjectURL(url);

      let width = img.width;
      let height = img.height;

      // Handle cases where image load might return invalid dimensions
      if (width === 0 || height === 0) {
        resolve(file);
        return;
      }

      if (width > maxWidth) {
        const ratio = maxWidth / width;
        width = maxWidth;
        height = Math.round(height * ratio);
      }

      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext("2d");
      if (!ctx) {
        resolve(file);
        return;
      }

      ctx.drawImage(img, 0, 0, width, height);

      // Add Photostamp
      try {
        const stamp = await getStampText();
        const fontSize = Math.max(Math.floor(width / 35), 14);
        ctx.font = `bold ${fontSize}px sans-serif`;

        const padding = 10;
        const textMetrics = ctx.measureText(stamp);
        const rectWidth = textMetrics.width + padding * 2;
        const rectHeight = fontSize + padding;

        // Bottom-right position
        const x = width - rectWidth - 10;
        const y = height - rectHeight - 10;

        // Semi-transparent background
        ctx.fillStyle = "rgba(0, 0, 0, 0.4)";
        if (ctx.roundRect) {
          ctx.roundRect(x, y, rectWidth, rectHeight, 8);
          ctx.fill();
        } else {
          ctx.fillRect(x, y, rectWidth, rectHeight);
        }

        // White text
        ctx.fillStyle = "white";
        ctx.textBaseline = "middle";
        ctx.fillText(stamp, x + padding, y + rectHeight / 2 + 1);
      } catch (stampErr) {
        console.warn("Failed to apply photostamp, uploading without it", stampErr);
      }

      canvas.toBlob(
        (blob) => {
          if (!blob) {
            resolve(file);
            return;
          }

          const compressed = new File([blob], file.name.replace(/\.[^.]+$/, ".jpg"), {
            type: "image/jpeg",
            lastModified: Date.now(),
          });
          resolve(compressed);
        },
        "image/jpeg",
        quality
      );
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      // Fallback: send the original file if compression fails (e.g. unsupported format)
      console.warn("Image load failed for compression, using original file", file.name);
      resolve(file);
    };

    img.src = url;
  });
}

