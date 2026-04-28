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
  outBlob?: Blob;
  outName?: string;
  outSize?: number;
  error?: string;
}

const MAX_AUTO_RETRIES = 2;
const STATUS_LABEL: Record<Status, string> = {
  queued: "Queued",
  converting: "Converting",
  done: "Done",
  error: "Failed",
};

const FORMATS: OutputFormat[] = ["jpeg", "png", "webp"];

export function Converter() {
  const [items, setItems] = useState<Item[]>([]);
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

  const addFiles = useCallback((files: FileList | File[]) => {
    const arr = Array.from(files).filter((f) =>
      /image|heic|heif/i.test(f.type) || /\.(heic|heif|jpe?g|png|webp|gif|bmp|tiff|avif)$/i.test(f.name)
    );
    setItems((prev) => [
      ...prev,
      ...arr.map((file) => ({
        id: `${file.name}-${file.size}-${Math.random().toString(36).slice(2, 7)}`,
        file,
        status: "queued" as Status,
        progress: 0,
        attempts: 0,
      })),
    ]);
  }, []);

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files?.length) addFiles(e.dataTransfer.files);
  };

  const convertAll = async () => {
    setBusy(true);
    const q = quality / 100;
    for (const item of items) {
      if (item.status === "done") continue;
      setItems((prev) =>
        prev.map((p) => (p.id === item.id ? { ...p, status: "converting" } : p))
      );
      try {
        const { blob, name } = await convertImage(item.file, format, q);
        setItems((prev) =>
          prev.map((p) =>
            p.id === item.id
              ? { ...p, status: "done", outBlob: blob, outName: name, outSize: blob.size }
              : p
          )
        );
      } catch (err) {
        setItems((prev) =>
          prev.map((p) =>
            p.id === item.id
              ? { ...p, status: "error", error: (err as Error).message }
              : p
          )
        );
      }
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
  const clearAll = () => setItems([]);

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
          accept={ACCEPTED_INPUT}
          className="hidden"
          onChange={(e) => e.target.files && addFiles(e.target.files)}
        />
        <div className="font-display text-3xl font-bold mb-2">
          {dragOver ? "DROP IT" : "DRAG FILES HERE"}
        </div>
        <div className="font-mono text-xs uppercase tracking-widest text-ink/60">
          or click to browse · multiple files supported
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

      {/* Action bar */}
      {items.length > 0 && (
        <div className="mt-8 flex flex-wrap gap-3 items-center justify-between">
          <div className="font-mono text-xs uppercase tracking-widest">
            {stats.total} file{stats.total !== 1 ? "s" : ""} · {formatBytes(stats.totalIn)}
            {stats.done > 0 && ` → ${formatBytes(stats.totalOut)}`}
          </div>
          <div className="flex gap-2">
            <button
              onClick={clearAll}
              disabled={busy}
              className="px-4 py-2 font-mono text-xs uppercase tracking-widest border-2 border-ink hover:bg-ink hover:text-paper disabled:opacity-40"
            >
              Clear
            </button>
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
      )}

      {/* File list */}
      {items.length > 0 && (
        <ul className="mt-6 space-y-2">
          {items.map((item) => (
            <li
              key={item.id}
              className="brutal-card-sm p-4 flex items-center gap-4"
            >
              <div
                className={`h-10 w-10 flex items-center justify-center font-mono text-xs font-bold border-2 border-ink ${
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
                <div className="font-mono text-sm truncate">{item.file.name}</div>
                <div className="font-mono text-xs text-ink/50">
                  {formatBytes(item.file.size)}
                  {item.outSize && ` → ${formatBytes(item.outSize)}`}
                  {item.error && ` · ${item.error}`}
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
              <button
                onClick={() => removeItem(item.id)}
                disabled={busy}
                className="px-3 py-1 font-mono text-xs border-2 border-ink hover:bg-destructive hover:text-destructive-foreground disabled:opacity-40"
              >
                ✕
              </button>
            </li>
          ))}
        </ul>
      )}

      {/* Footer note */}
      <footer className="mt-16 brutal-card-sm p-5 bg-ink text-paper">
        <div className="font-mono text-xs uppercase tracking-widest mb-1">
          ⚠ Note on HEIC output
        </div>
        <div className="font-mono text-xs leading-relaxed text-paper">
          Browsers can DECODE HEIC but cannot ENCODE it (Apple licensing). Convert HEIC → JPG/PNG/WEBP freely. For PNG/JPG → HEIC, you'd need a native app.
        </div>
      </footer>
    </div>
  );
}
