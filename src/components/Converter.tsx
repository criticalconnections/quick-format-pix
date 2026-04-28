import { useCallback, useMemo, useRef, useState } from "react";
import JSZip from "jszip";
import { ThemeToggle } from "@/components/ThemeToggle";
import {
  ACCEPTED_INPUT,
  convertImage,
  FORMAT_META,
  formatBytes,
  type OutputFormat,
} from "@/lib/imageConvert";

type Status = "queued" | "converting" | "done" | "error";

interface Item {
  id: string;
  file: File;
  status: Status;
  progress: number; // 0-100
  attempts: number;
  source?: string; // origin zip name
  path?: string;   // original path inside source zip (e.g. "photos/2024/img.heic")
  outBlob?: Blob;
  outName?: string; // basename only (e.g. "img.jpg")
  outPath?: string; // full path for zip output (e.g. "photos/2024/img.jpg")
  outSize?: number;
  error?: string;
}

type ZipStage = "reading" | "scanning" | "extracting" | "done" | "error";
interface ZipJob {
  id: string;
  name: string;
  size: number;
  stage: ZipStage;
  progress: number; // 0-100
  total: number;   // image entries found
  extracted: number;
  skipped: number;
  currentEntry?: string;
  error?: string;
}

const MAX_AUTO_RETRIES = 2;
const STATUS_LABEL: Record<Status, string> = {
  queued: "Queued",
  converting: "Converting",
  done: "Done",
  error: "Failed",
};
const ZIP_STAGE_LABEL: Record<ZipStage, string> = {
  reading: "Reading archive",
  scanning: "Scanning entries",
  extracting: "Extracting images",
  done: "Extracted",
  error: "Failed",
};

const FORMATS: OutputFormat[] = ["jpeg", "png", "webp"];
const IMAGE_RE = /\.(heic|heif|jpe?g|png|webp|gif|bmp|tiff?|avif)$/i;
const isImageFile = (f: { name: string; type?: string }) =>
  /image|heic|heif/i.test(f.type || "") || IMAGE_RE.test(f.name);
const isZipFile = (f: File) =>
  /zip/i.test(f.type) || /\.zip$/i.test(f.name);

export function Converter() {
  const [items, setItems] = useState<Item[]>([]);
  const [zipJobs, setZipJobs] = useState<ZipJob[]>([]);
  const [format, setFormat] = useState<OutputFormat>("jpeg");
  const [quality, setQuality] = useState(92);
  const [dragOver, setDragOver] = useState(false);
  const [busy, setBusy] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const stats = useMemo(() => {
    const done = items.filter((i) => i.status === "done").length;
    const failed = items.filter((i) => i.status === "error").length;
    const totalIn = items.reduce((a, b) => a + b.file.size, 0);
    const totalOut = items.reduce((a, b) => a + (b.outSize || 0), 0);
    const overall =
      items.length === 0
        ? 0
        : Math.round(items.reduce((a, b) => a + b.progress, 0) / items.length);
    return { done, failed, total: items.length, totalIn, totalOut, overall };
  }, [items]);

  const pushItems = (
    entries: { file: File; path?: string }[],
    source?: string,
  ) => {
    setItems((prev) => [
      ...prev,
      ...entries.map(({ file, path }) => ({
        id: `${file.name}-${file.size}-${Math.random().toString(36).slice(2, 7)}`,
        file,
        status: "queued" as Status,
        progress: 0,
        attempts: 0,
        source,
        path,
      })),
    ]);
  };

  const updateZip = (id: string, patch: Partial<ZipJob>) =>
    setZipJobs((prev) => prev.map((z) => (z.id === id ? { ...z, ...patch } : z)));

  const processZip = async (file: File) => {
    const id = `zip-${file.name}-${file.size}-${Math.random().toString(36).slice(2, 7)}`;
    setZipJobs((prev) => [
      ...prev,
      {
        id,
        name: file.name,
        size: file.size,
        stage: "reading",
        progress: 0,
        total: 0,
        extracted: 0,
        skipped: 0,
      },
    ]);

    try {
      // 1. Read archive bytes
      updateZip(id, { stage: "reading", progress: 5 });
      const buf = await file.arrayBuffer();
      updateZip(id, { progress: 15 });

      // 2. Parse central directory
      updateZip(id, { stage: "scanning", progress: 25 });
      const zip = await JSZip.loadAsync(buf);

      // 3. Filter image entries
      const entries = Object.values(zip.files).filter(
        (e) => !e.dir && isImageFile({ name: e.name }),
      );
      const skipped = Object.values(zip.files).filter(
        (e) => !e.dir && !isImageFile({ name: e.name }),
      ).length;
      updateZip(id, {
        stage: "extracting",
        progress: 30,
        total: entries.length,
        skipped,
      });

      if (entries.length === 0) {
        updateZip(id, {
          stage: "done",
          progress: 100,
          error: "No images found in archive",
        });
        return;
      }

      // 4. Extract entries one by one with live progress
      const extracted: { file: File; path: string }[] = [];
      for (let i = 0; i < entries.length; i++) {
        const entry = entries[i];
        const shortName = entry.name.split("/").pop() || entry.name;
        updateZip(id, { currentEntry: shortName });

        const blob = await entry.async("blob");
        const f = new File([blob], shortName, {
          type: blob.type || "application/octet-stream",
        });
        extracted.push({ file: f, path: entry.name });

        const pct = 30 + Math.round(((i + 1) / entries.length) * 65);
        updateZip(id, { extracted: i + 1, progress: pct });
        // Yield so UI repaints between entries
        await new Promise((r) => setTimeout(r, 0));
      }

      // 5. Push to convert queue
      pushItems(extracted, file.name);
      updateZip(id, {
        stage: "done",
        progress: 100,
        currentEntry: undefined,
      });
    } catch (err) {
      updateZip(id, {
        stage: "error",
        error: (err as Error).message || "Failed to read archive",
      });
    }
  };

  const addFiles = useCallback((files: FileList | File[]) => {
    const arr = Array.from(files);
    const zips = arr.filter(isZipFile);
    const images = arr.filter((f) => !isZipFile(f) && isImageFile(f));
    if (images.length) pushItems(images);
    zips.forEach((z) => {
      void processZip(z);
    });
  }, []);

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files?.length) addFiles(e.dataTransfer.files);
  };

  const updateItem = (id: string, patch: Partial<Item>) =>
    setItems((prev) => prev.map((p) => (p.id === id ? { ...p, ...patch } : p)));

  // Convert one item with auto-retry. Animates a pseudo-progress bar
  // since canvas conversion is synchronous (no real progress events).
  const processItem = async (id: string) => {
    const q = quality / 100;
    const current = items.find((i) => i.id === id);
    if (!current) return;

    let attempt = 0;
    let lastError: Error | null = null;

    while (attempt <= MAX_AUTO_RETRIES) {
      attempt++;
      updateItem(id, {
        status: "converting",
        progress: 5,
        attempts: attempt,
        error: undefined,
      });

      // Simulated progress ticker (canvas conversions are sync; this gives
      // visual feedback for large files which still take time to decode).
      let pct = 5;
      const ticker = window.setInterval(() => {
        pct = Math.min(pct + Math.random() * 12, 90);
        setItems((prev) =>
          prev.map((p) =>
            p.id === id && p.status === "converting" ? { ...p, progress: pct } : p
          )
        );
      }, 150);

      try {
        const file = items.find((i) => i.id === id)?.file ?? current.file;
        const { blob, name } = await convertImage(file, format, q);
        clearInterval(ticker);
        updateItem(id, {
          status: "done",
          progress: 100,
          outBlob: blob,
          outName: name,
          outSize: blob.size,
          error: undefined,
        });
        return;
      } catch (err) {
        clearInterval(ticker);
        lastError = err as Error;
        if (attempt <= MAX_AUTO_RETRIES) {
          updateItem(id, {
            status: "queued",
            progress: 0,
            error: `Retry ${attempt}/${MAX_AUTO_RETRIES}: ${lastError.message}`,
          });
          // brief backoff
          await new Promise((r) => setTimeout(r, 400 * attempt));
        }
      }
    }

    updateItem(id, {
      status: "error",
      progress: 0,
      error: lastError?.message ?? "Conversion failed",
    });
  };

  const convertAll = async () => {
    setBusy(true);
    const queue = items.filter((i) => i.status !== "done").map((i) => i.id);
    for (const id of queue) {
      await processItem(id);
    }
    setBusy(false);
  };

  const retryItem = async (id: string) => {
    setBusy(true);
    await processItem(id);
    setBusy(false);
  };

  const retryFailed = async () => {
    setBusy(true);
    const failedIds = items.filter((i) => i.status === "error").map((i) => i.id);
    for (const id of failedIds) {
      await processItem(id);
    }
    setBusy(false);
  };


  const downloadOne = (item: Item) => {
    if (!item.outBlob || !item.outName) return;
    const url = URL.createObjectURL(item.outBlob);
    const a = document.createElement("a");
    a.href = url;
    a.download = item.outName;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  const downloadZip = async () => {
    const zip = new JSZip();
    items.forEach((i) => {
      if (i.outBlob && i.outName) zip.file(i.outName, i.outBlob);
    });
    const blob = await zip.generateAsync({ type: "blob" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `converted-${FORMAT_META[format].ext}-${Date.now()}.zip`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  const removeItem = (id: string) =>
    setItems((prev) => prev.filter((p) => p.id !== id));
  const clearAll = () => {
    setItems([]);
    setZipJobs([]);
  };
  const dismissZip = (id: string) =>
    setZipJobs((prev) => prev.filter((z) => z.id !== id));

  return (
    <div className="mx-auto max-w-5xl px-6 py-12">
      {/* Header */}
      <header className="mb-10">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="h-3 w-3 bg-[var(--accent-lime)] border-2 border-ink" />
            <span className="font-mono text-xs tracking-widest uppercase">
              v1.0 / Browser-native / No upload
            </span>
          </div>
          <ThemeToggle />
        </div>
        <h1 className="font-display text-6xl md:text-7xl font-bold tracking-tighter leading-[0.9]">
          BULK
          <br />
          <span className="bg-[var(--accent-lime)] px-3 -ml-1 inline-block">CONVERT</span>
          <br />
          IMAGES.
        </h1>
        <p className="mt-6 font-mono text-sm max-w-md text-ink/70">
          Drop HEIC, JPG, PNG, WEBP, GIF, BMP. Pick a target format. Done — everything stays in your browser.
        </p>
      </header>

      {/* Dropzone */}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={onDrop}
        onClick={() => inputRef.current?.click()}
        className={`brutal-card cursor-pointer p-10 text-center transition-all ${
          dragOver ? "translate-x-[-3px] translate-y-[-3px]" : ""
        }`}
        style={{
          background: dragOver ? "var(--accent-lime)" : "var(--paper)",
        }}
      >
        <input
          ref={inputRef}
          type="file"
          multiple
          accept={`${ACCEPTED_INPUT},.zip,application/zip,application/x-zip-compressed`}
          className="hidden"
          onChange={(e) => e.target.files && addFiles(e.target.files)}
        />
        <div className="font-display text-3xl font-bold mb-2">
          {dragOver ? "DROP IT" : "DRAG FILES OR .ZIP HERE"}
        </div>
        <div className="font-mono text-xs uppercase tracking-widest text-ink/60">
          or click to browse · images + zip archives supported
        </div>
      </div>

      {/* Controls */}
      <div className="grid md:grid-cols-2 gap-6 mt-8">
        <div className="brutal-card-sm p-6">
          <div className="font-mono text-xs uppercase tracking-widest mb-3">
            01 / Output format
          </div>
          <div className="flex gap-2">
            {FORMATS.map((f) => (
              <button
                key={f}
                onClick={() => setFormat(f)}
                className={`flex-1 py-3 font-display font-bold border-2 border-ink transition-all ${
                  format === f
                    ? "bg-ink text-paper"
                    : "bg-paper hover:bg-[var(--accent-lime)]"
                }`}
              >
                {FORMAT_META[f].label}
              </button>
            ))}
          </div>
        </div>

        <div className="brutal-card-sm p-6">
          <div className="font-mono text-xs uppercase tracking-widest mb-3 flex justify-between">
            <span>02 / Quality</span>
            <span>{quality}%</span>
          </div>
          <input
            type="range"
            min={10}
            max={100}
            value={quality}
            onChange={(e) => setQuality(parseInt(e.target.value))}
            disabled={format === "png"}
            className="w-full accent-[var(--accent-lime)] disabled:opacity-30"
          />
          <div className="font-mono text-xs text-ink/50 mt-2">
            {format === "png" ? "PNG is lossless" : "Lower = smaller files"}
          </div>
        </div>
      </div>

      {/* Action bar + overall progress */}
      {items.length > 0 && (
        <div className="mt-8 space-y-4">
          <div className="flex flex-wrap gap-3 items-center justify-between">
            <div className="font-mono text-xs uppercase tracking-widest">
              {stats.done}/{stats.total} done
              {stats.failed > 0 && ` · ${stats.failed} failed`}
              {" · "}
              {formatBytes(stats.totalIn)}
              {stats.totalOut > 0 && ` → ${formatBytes(stats.totalOut)}`}
            </div>
            <div className="flex gap-2 flex-wrap">
              <button
                onClick={clearAll}
                disabled={busy}
                className="px-4 py-2 font-mono text-xs uppercase tracking-widest border-2 border-ink hover:bg-ink hover:text-paper disabled:opacity-40"
              >
                Clear
              </button>
              {stats.failed > 0 && (
                <button
                  onClick={retryFailed}
                  disabled={busy}
                  className="px-4 py-2 font-mono text-xs uppercase tracking-widest border-2 border-ink bg-paper hover:bg-destructive hover:text-destructive-foreground disabled:opacity-40"
                >
                  ↻ Retry failed ({stats.failed})
                </button>
              )}
              {stats.done > 1 && (
                <button
                  onClick={downloadZip}
                  className="px-4 py-2 font-mono text-xs uppercase tracking-widest border-2 border-ink bg-paper hover:bg-[var(--accent-lime)]"
                >
                  ↓ ZIP all
                </button>
              )}
              <button
                onClick={convertAll}
                disabled={busy || items.every((i) => i.status === "done")}
                className="px-6 py-2 font-display font-bold border-2 border-ink bg-[var(--accent-lime)] hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-[var(--shadow-brutal-sm)] transition-all disabled:opacity-40 disabled:hover:transform-none disabled:hover:shadow-none"
              >
                {busy ? "CONVERTING…" : `CONVERT → ${FORMAT_META[format].label}`}
              </button>
            </div>
          </div>

          {/* Overall progress bar */}
          <div>
            <div className="flex justify-between font-mono text-xs uppercase tracking-widest mb-1">
              <span>Overall progress</span>
              <span>{stats.overall}%</span>
            </div>
            <div className="h-3 border-2 border-ink bg-paper overflow-hidden">
              <div
                className="h-full bg-[var(--accent-lime)] transition-[width] duration-200 ease-out"
                style={{ width: `${stats.overall}%` }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Zip jobs panel */}
      {zipJobs.length > 0 && (
        <div className="mt-8">
          <div className="font-mono text-xs uppercase tracking-widest mb-3 flex items-center gap-2">
            <span className="inline-block h-2 w-2 bg-[var(--accent-lime)] border border-ink" />
            Archives ({zipJobs.length})
          </div>
          <ul className="space-y-2">
            {zipJobs.map((z) => (
              <li
                key={z.id}
                className="brutal-card-sm p-4"
                style={{
                  background:
                    z.stage === "done"
                      ? "color-mix(in oklch, var(--accent-lime) 25%, var(--paper))"
                      : z.stage === "error"
                      ? "color-mix(in oklch, var(--destructive) 18%, var(--paper))"
                      : "var(--paper)",
                }}
              >
                <div className="flex items-center gap-4">
                  <div
                    className={`h-10 w-10 shrink-0 flex items-center justify-center font-mono text-xs font-bold border-2 border-ink ${
                      z.stage === "done"
                        ? "bg-[var(--accent-lime)]"
                        : z.stage === "error"
                        ? "bg-destructive text-destructive-foreground"
                        : "bg-ink text-paper animate-pulse"
                    }`}
                  >
                    {z.stage === "done" ? "✓" : z.stage === "error" ? "!" : "ZIP"}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline justify-between gap-3">
                      <div className="font-mono text-sm truncate font-bold">
                        {z.name}
                      </div>
                      <div className="font-mono text-[10px] uppercase tracking-widest shrink-0 text-ink/60">
                        {ZIP_STAGE_LABEL[z.stage]}
                      </div>
                    </div>
                    <div className="font-mono text-xs text-ink/60 mt-0.5 truncate">
                      {formatBytes(z.size)}
                      {z.total > 0 &&
                        ` · ${z.extracted}/${z.total} images`}
                      {z.skipped > 0 && ` · ${z.skipped} skipped`}
                      {z.currentEntry && ` · ${z.currentEntry}`}
                      {z.error && ` · ${z.error}`}
                    </div>
                  </div>
                  {(z.stage === "done" || z.stage === "error") && (
                    <button
                      onClick={() => dismissZip(z.id)}
                      className="px-3 py-1 font-mono text-xs border-2 border-ink hover:bg-ink hover:text-paper"
                    >
                      ✕
                    </button>
                  )}
                </div>
                <div className="mt-3 h-1.5 border border-ink bg-paper overflow-hidden">
                  <div
                    className={`h-full transition-[width] duration-150 ease-out ${
                      z.stage === "error" ? "bg-destructive" : "bg-[var(--accent-lime)]"
                    }`}
                    style={{ width: `${z.progress}%` }}
                  />
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* File list */}
      {items.length > 0 && (
        <ul className="mt-6 space-y-2">
          {items.map((item) => (
            <li key={item.id} className="brutal-card-sm p-4">
              <div className="flex items-center gap-4">
                <div
                  className={`h-10 w-10 shrink-0 flex items-center justify-center font-mono text-xs font-bold border-2 border-ink ${
                    item.status === "done"
                      ? "bg-[var(--accent-lime)]"
                      : item.status === "error"
                      ? "bg-destructive text-destructive-foreground"
                      : item.status === "converting"
                      ? "bg-ink text-paper animate-pulse"
                      : "bg-paper"
                  }`}
                >
                  {item.status === "done"
                    ? "✓"
                    : item.status === "error"
                    ? "!"
                    : item.status === "converting"
                    ? "…"
                    : "·"}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline justify-between gap-3">
                    <div className="font-mono text-sm truncate">{item.file.name}</div>
                    <div className="font-mono text-[10px] uppercase tracking-widest shrink-0 text-ink/60">
                      {STATUS_LABEL[item.status]}
                      {item.attempts > 1 && ` · try ${item.attempts}`}
                    </div>
                  </div>
                  <div className="font-mono text-xs text-ink/50 mt-0.5 truncate">
                    {formatBytes(item.file.size)}
                    {item.outSize ? ` → ${formatBytes(item.outSize)}` : ""}
                    {item.source ? ` · from ${item.source}` : ""}
                    {item.error ? ` · ${item.error}` : ""}
                  </div>
                </div>
                {item.status === "done" && (
                  <button
                    onClick={() => downloadOne(item)}
                    className="px-3 py-1 font-mono text-xs uppercase tracking-widest border-2 border-ink hover:bg-[var(--accent-lime)]"
                  >
                    ↓
                  </button>
                )}
                {item.status === "error" && (
                  <button
                    onClick={() => retryItem(item.id)}
                    disabled={busy}
                    className="px-3 py-1 font-mono text-xs uppercase tracking-widest border-2 border-ink hover:bg-[var(--accent-lime)] disabled:opacity-40"
                  >
                    ↻ Retry
                  </button>
                )}
                <button
                  onClick={() => removeItem(item.id)}
                  disabled={busy}
                  className="px-3 py-1 font-mono text-xs border-2 border-ink hover:bg-destructive hover:text-destructive-foreground disabled:opacity-40"
                >
                  ✕
                </button>
              </div>

              {/* Per-file progress bar */}
              {(item.status === "converting" ||
                (item.status === "done" && item.progress < 100) ||
                (item.status === "queued" && item.progress > 0)) && (
                <div className="mt-3 h-1.5 border border-ink bg-paper overflow-hidden">
                  <div
                    className="h-full bg-[var(--accent-lime)] transition-[width] duration-150 ease-out"
                    style={{ width: `${item.progress}%` }}
                  />
                </div>
              )}
            </li>
          ))}
        </ul>
      )}

      {/* Footer note */}
      <footer
        className="mt-16 brutal-card-sm p-5"
        style={{ background: "var(--ink)", color: "var(--paper)" }}
      >
        <div className="font-mono text-xs uppercase tracking-widest mb-1">
          ⚠ Note on HEIC output
        </div>
        <div className="font-mono text-xs leading-relaxed">
          Browsers can DECODE HEIC but cannot ENCODE it (Apple licensing). Convert HEIC → JPG/PNG/WEBP freely. For PNG/JPG → HEIC, you'd need a native app.
        </div>
      </footer>
    </div>
  );
}
