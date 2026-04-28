// heic2any is loaded lazily inside fileToBitmap to avoid SSR (window is not defined)

export type OutputFormat = "jpeg" | "png" | "webp";

export const FORMAT_META: Record<OutputFormat, { mime: string; ext: string; label: string }> = {
  jpeg: { mime: "image/jpeg", ext: "jpg", label: "JPG" },
  png: { mime: "image/png", ext: "png", label: "PNG" },
  webp: { mime: "image/webp", ext: "webp", label: "WEBP" },
};

export const ACCEPTED_INPUT =
  "image/*,.heic,.heif,.HEIC,.HEIF,.jpg,.jpeg,.png,.webp,.gif,.bmp,.tiff,.avif";

function extLooksHeic(file: File) {
  const n = file.name.toLowerCase();
  return (
    n.endsWith(".heic") ||
    n.endsWith(".heif") ||
    file.type === "image/heic" ||
    file.type === "image/heif"
  );
}

// Sniff the ISO-BMFF "ftyp" box to confirm a file is actually HEIC/HEIF.
// HEIC files start with: [4 bytes size][ftyp][brand]. Brand is one of
// heic, heix, hevc, hevx, mif1, msf1, heim, heis, hevm, hevs.
async function isReallyHeic(file: File): Promise<boolean> {
  try {
    const head = new Uint8Array(await file.slice(0, 32).arrayBuffer());
    if (head.length < 12) return false;
    const ascii = String.fromCharCode(...head);
    if (ascii.slice(4, 8) !== "ftyp") return false;
    const brand = ascii.slice(8, 12).toLowerCase();
    return ["heic", "heix", "hevc", "hevx", "mif1", "msf1", "heim", "heis", "hevm", "hevs"].includes(brand);
  } catch {
    return false;
  }
}

async function fileToBitmap(file: File): Promise<{ bitmap: ImageBitmap; width: number; height: number }> {
  let blob: Blob = file;
  const looksHeic = extLooksHeic(file);
  const reallyHeic = looksHeic ? await isReallyHeic(file) : false;

  if (reallyHeic) {
    try {
      const { default: heic2any } = await import("heic2any");
      // Re-wrap as a plain Blob with the correct MIME. Files extracted from
      // a .zip arrive with type "" or "application/octet-stream", which some
      // heic2any builds reject before they ever read the bytes.
      const buf = await file.arrayBuffer();
      const heicBlob = new Blob([buf], { type: "image/heic" });
      const out = await heic2any({ blob: heicBlob, toType: "image/png" });
      blob = Array.isArray(out) ? out[0] : out;
    } catch (err) {
      // heic2any rejects with a plain object { code, subcode } — not an Error.
      const e = err as { message?: string; code?: unknown; subcode?: unknown };
      const msg = e?.message || (e?.code !== undefined ? `libheif code ${String(e.code)}/${String(e.subcode)}` : String(err));
      if (/libheif|format not supported|ERR_LIBHEIF|parse HEIF|code/i.test(msg)) {
        throw new Error(
          "HEIC decoder couldn't parse this file (often HEVC 10-bit, HDR, or a Live Photo). Re-export from Photos as 'Most Compatible' (JPEG) or open on a Mac and export as HEIC 8-bit.",
        );
      }
      throw new Error(msg);
    }
  } else if (looksHeic) {
    // Misnamed file — try the browser's native decoder directly.
    try {
      const bitmap = await createImageBitmap(file);
      return { bitmap, width: bitmap.width, height: bitmap.height };
    } catch {
      throw new Error("File has a .heic extension but isn't valid HEIC data.");
    }
  }

  try {
    const bitmap = await createImageBitmap(blob);
    return { bitmap, width: bitmap.width, height: bitmap.height };
  } catch {
    throw new Error("Browser couldn't decode this image.");
  }
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
