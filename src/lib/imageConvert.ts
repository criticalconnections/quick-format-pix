import heic2any from "heic2any";

export type OutputFormat = "jpeg" | "png" | "webp";

export const FORMAT_META: Record<OutputFormat, { mime: string; ext: string; label: string }> = {
  jpeg: { mime: "image/jpeg", ext: "jpg", label: "JPG" },
  png: { mime: "image/png", ext: "png", label: "PNG" },
  webp: { mime: "image/webp", ext: "webp", label: "WEBP" },
};

export const ACCEPTED_INPUT =
  "image/*,.heic,.heif,.HEIC,.HEIF,.jpg,.jpeg,.png,.webp,.gif,.bmp,.tiff,.avif";

function isHeic(file: File) {
  const n = file.name.toLowerCase();
  return (
    n.endsWith(".heic") ||
    n.endsWith(".heif") ||
    file.type === "image/heic" ||
    file.type === "image/heif"
  );
}

async function fileToBitmap(file: File): Promise<{ bitmap: ImageBitmap; width: number; height: number }> {
  let blob: Blob = file;
  if (isHeic(file)) {
    const out = await heic2any({ blob: file, toType: "image/png" });
    blob = Array.isArray(out) ? out[0] : out;
  }
  const bitmap = await createImageBitmap(blob);
  return { bitmap, width: bitmap.width, height: bitmap.height };
}

export async function convertImage(
  file: File,
  format: OutputFormat,
  quality = 0.92
): Promise<{ blob: Blob; name: string }> {
  const { bitmap, width, height } = await fileToBitmap(file);
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas not supported");
  // White background for jpeg (no transparency)
  if (format === "jpeg") {
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, width, height);
  }
  ctx.drawImage(bitmap, 0, 0);
  bitmap.close?.();

  const meta = FORMAT_META[format];
  const blob: Blob = await new Promise((resolve, reject) => {
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error("Conversion failed"))),
      meta.mime,
      quality
    );
  });
  const baseName = file.name.replace(/\.[^.]+$/, "");
  return { blob, name: `${baseName}.${meta.ext}` };
}

export function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
}
