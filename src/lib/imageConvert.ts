// heic2any is loaded lazily inside fileToBitmap to avoid SSR (window is not defined)

export type OutputFormat = "jpeg" | "png" | "webp";

export class ConversionError extends Error {
  retryable: boolean;

  constructor(message: string, retryable = true) {
    super(message);
    this.name = "ConversionError";
    this.retryable = retryable;
  }
}

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

export function isNonRetryableConversionError(err: unknown) {
  return err instanceof ConversionError && !err.retryable;
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
    return [
      "heic",
      "heix",
      "hevc",
      "hevx",
      "mif1",
      "msf1",
      "heim",
      "heis",
      "hevm",
      "hevs",
    ].includes(brand);
  } catch {
    return false;
  }
}

// Sniff bytes → canonical MIME. Returns null if we don't recognize it.
function sniffMime(head: Uint8Array): string | null {
  if (head.length < 12) return null;
  const ascii = String.fromCharCode(...head);
  // ISO-BMFF: bytes 4..8 == "ftyp", brand at 8..12
  if (ascii.slice(4, 8) === "ftyp") {
    const brand = ascii.slice(8, 12).toLowerCase();
    if (["heic", "heix", "heim", "heis"].includes(brand)) return "image/heic";
    if (["hevc", "hevx", "hevm", "hevs"].includes(brand)) return "image/heic-sequence";
    if (["mif1", "msf1"].includes(brand)) return "image/heif";
    if (brand.startsWith("avif") || brand === "avis") return "image/avif";
    if (["mp41", "mp42", "isom", "iso2"].includes(brand)) return "video/mp4";
  }
  // PNG: 89 50 4E 47
  if (head[0] === 0x89 && head[1] === 0x50 && head[2] === 0x4e && head[3] === 0x47)
    return "image/png";
  // JPEG: FF D8 FF
  if (head[0] === 0xff && head[1] === 0xd8 && head[2] === 0xff) return "image/jpeg";
  // GIF
  if (ascii.slice(0, 4) === "GIF8") return "image/gif";
  // WEBP
  if (ascii.slice(0, 4) === "RIFF" && ascii.slice(8, 12) === "WEBP") return "image/webp";
  // BMP
  if (ascii.slice(0, 2) === "BM") return "image/bmp";
  // TIFF
  if (ascii.slice(0, 4) === "II\x2a\x00" || ascii.slice(0, 4) === "MM\x00\x2a")
    return "image/tiff";
  return null;
}

export interface ValidationResult {
  blob: Blob;
  detectedMime: string | null;
  originalMime: string;
  corrected: boolean;
  bytes: ArrayBuffer;
}

// Read the file once, sniff magic bytes, log + correct the MIME, and return
// a freshly-wrapped Blob with a consistent type. Use this for every file
// before handing it to a decoder — especially zip-extracted files which
// arrive with type "" or "application/octet-stream".
export async function validateAndNormalize(file: File): Promise<ValidationResult> {
  const bytes = await file.arrayBuffer();
  const head = new Uint8Array(bytes.slice(0, 32));
  const detected = sniffMime(head);
  const original = file.type || "(empty)";
  const target = detected ?? (file.type || "application/octet-stream");
  const corrected = detected !== null && detected !== file.type;

  if (corrected) {
    console.info(
      `[validate] ${file.name}: MIME corrected ${original} → ${detected} (sniffed from magic bytes)`,
    );
  } else if (!detected) {
    console.warn(
      `[validate] ${file.name}: could not sniff MIME from magic bytes; keeping ${original}`,
    );
  } else {
    console.debug(`[validate] ${file.name}: MIME confirmed ${detected}`);
  }

  return {
    blob: new Blob([bytes], { type: target }),
    detectedMime: detected,
    originalMime: original,
    corrected,
    bytes,
  };
}

async function fileToBitmap(
  file: File,
): Promise<{ bitmap: ImageBitmap; width: number; height: number }> {
  // Step 1: validate + normalize. Single source of truth for MIME and bytes.
  const v = await validateAndNormalize(file);
  const isHeicMime =
    v.detectedMime === "image/heic" ||
    v.detectedMime === "image/heif" ||
    v.detectedMime === "image/heic-sequence";
  const looksHeic = extLooksHeic(file);

  if (isHeicMime) {
    try {
      const { default: heic2any } = await import("heic2any");
      const out = await heic2any({ blob: v.blob, toType: "image/png" });
      const png = Array.isArray(out) ? out[0] : out;
      const bitmap = await createImageBitmap(png);
      return { bitmap, width: bitmap.width, height: bitmap.height };
    } catch (err) {
      const e = err as { message?: string; code?: unknown; subcode?: unknown };
      const msg =
        e?.message ||
        (e?.code !== undefined
          ? `libheif code ${String(e.code)}/${String(e.subcode)}`
          : String(err));
      console.error(`[heic2any] ${file.name}: ${msg}`, err);
      if (/libheif|format not supported|ERR_LIBHEIF|parse HEIF|code/i.test(msg)) {
        throw new ConversionError(
          "HEIC decoder couldn't parse this file. It is likely an unsupported HEIC variant such as HEVC 10-bit, HDR, ProRAW, or a Live Photo still. Export it from Photos as Most Compatible/JPEG, then convert again.",
          false,
        );
      }
      throw new ConversionError(msg);
    }
  }

  if (looksHeic && !isHeicMime) {
    console.warn(
      `[validate] ${file.name}: .heic extension but bytes look like ${v.detectedMime ?? "unknown"}; trying native decoder`,
    );
    try {
      const bitmap = await createImageBitmap(v.blob);
      return { bitmap, width: bitmap.width, height: bitmap.height };
    } catch {
      throw new ConversionError("File has a .heic extension but isn't valid HEIC data.", false);
    }
  }

  try {
    const bitmap = await createImageBitmap(v.blob);
    return { bitmap, width: bitmap.width, height: bitmap.height };
  } catch {
    throw new ConversionError("Browser couldn't decode this image.", false);
  }
}


export async function convertImage(
  file: File,
  format: OutputFormat,
  quality = 0.92,
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
      quality,
    );
  });
  const baseName = file.name.replace(/\.[^.]+$/, "");
  return { blob, name: `${baseName}.${meta.ext}` };
}

export interface FileDebugInfo {
  size: number;
  mime: string;
  firstBytesHex: string;
  firstBytesAscii: string;
  ftypBrand: string | null;
  extLooksHeic: boolean;
  isReallyHeic: boolean;
}

export async function gatherDebug(file: File): Promise<FileDebugInfo> {
  const head = new Uint8Array(await file.slice(0, 32).arrayBuffer());
  const hex = Array.from(head)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join(" ");
  const ascii = Array.from(head)
    .map((b) => (b >= 0x20 && b <= 0x7e ? String.fromCharCode(b) : "."))
    .join("");
  let brand: string | null = null;
  if (head.length >= 12) {
    const tag = String.fromCharCode(...head.slice(4, 8));
    if (tag === "ftyp") brand = String.fromCharCode(...head.slice(8, 12));
  }
  const looks = extLooksHeic(file);
  const real = looks ? await isReallyHeic(file) : false;
  return {
    size: file.size,
    mime: file.type || "(empty)",
    firstBytesHex: hex,
    firstBytesAscii: ascii,
    ftypBrand: brand,
    extLooksHeic: looks,
    isReallyHeic: real,
  };
}

export function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
}
