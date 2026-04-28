import { useRef, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ThemeToggle } from "@/components/ThemeToggle";
import { usePageEnter } from "@/lib/animations";

export const Route = createFileRoute("/compress")({
  head: () => ({
    meta: [
      { title: "Getaway Driver — Shrink the Evidence (Image Compressor)" },
      {
        name: "description",
        content:
          "Bulk-compress JPG, PNG, and WEBP without uploading. Quality slider, max-dimension cap, side-by-side size comparison.",
      },
      { property: "og:title", content: "Getaway Driver — Image Compressor" },
      {
        property: "og:description",
        content: "Shrink images in your browser. No upload, no signup.",
      },
    ],
  }),
  component: CompressPage,
});

type Result = {
  id: string;
  name: string;
  origSize: number;
  outSize: number;
  outBlob: Blob;
  url: string;
};

const fmt = (n: number) =>
  n < 1024
    ? `${n} B`
    : n < 1024 * 1024
      ? `${(n / 1024).toFixed(1)} KB`
      : `${(n / 1024 / 1024).toFixed(2)} MB`;

async function compressOne(
  file: File,
  quality: number,
  maxDim: number,
  format: "jpeg" | "webp" | "auto",
): Promise<Result> {
  const bmp = await createImageBitmap(file);
  let { width, height } = bmp;
  if (maxDim > 0 && Math.max(width, height) > maxDim) {
    const scale = maxDim / Math.max(width, height);
    width = Math.round(width * scale);
    height = Math.round(height * scale);
  }
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d")!;
  ctx.drawImage(bmp, 0, 0, width, height);
  bmp.close();

  const mime =
    format === "auto"
      ? file.type === "image/png"
        ? "image/png"
        : "image/jpeg"
      : `image/${format}`;
  const blob: Blob = await new Promise((res, rej) =>
    canvas.toBlob((b) => (b ? res(b) : rej(new Error("encode failed"))), mime, quality),
  );

  const ext = mime.split("/")[1].replace("jpeg", "jpg");
  const baseName = file.name.replace(/\.[^.]+$/, "");
  const outName = `${baseName}-shrunk.${ext}`;

  return {
    id: crypto.randomUUID(),
    name: outName,
    origSize: file.size,
    outSize: blob.size,
    outBlob: blob,
    url: URL.createObjectURL(blob),
  };
}

function CompressPage() {
  const heroRef = usePageEnter<HTMLDivElement>();
  const inputRef = useRef<HTMLInputElement>(null);
  const [quality, setQuality] = useState(75);
  const [maxDim, setMaxDim] = useState(0);
  const [format, setFormat] = useState<"jpeg" | "webp" | "auto">("auto");
  const [results, setResults] = useState<Result[]>([]);
  const [busy, setBusy] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  const handleFiles = async (files: FileList | File[]) => {
    setBusy(true);
    const arr = Array.from(files).filter((f) => /^image\//.test(f.type));
    const next: Result[] = [];
    for (const f of arr) {
      try {
        next.push(await compressOne(f, quality / 100, maxDim, format));
      } catch (err) {
        console.error(err);
      }
    }
    setResults((prev) => [...next, ...prev]);
    setBusy(false);
  };

  const totalOrig = results.reduce((a, b) => a + b.origSize, 0);
  const totalOut = results.reduce((a, b) => a + b.outSize, 0);
  const savings = totalOrig ? Math.round((1 - totalOut / totalOrig) * 100) : 0;

  return (
    <main className="min-h-[100dvh]">
      <div ref={heroRef} className="mx-auto max-w-5xl px-4 py-4 sm:px-6 sm:py-6">
        <header className="flex items-center justify-between">
          <Link
            to="/"
            className="brutal-card-sm bg-paper px-3 py-1.5 font-mono text-[10px] uppercase tracking-widest hover:bg-[var(--accent-lime)] sm:text-xs"
          >
            ← Toolshed
          </Link>
          <ThemeToggle />
        </header>

        <h1 className="mt-4 font-display text-3xl font-bold leading-[0.95] tracking-tight sm:mt-6 sm:text-5xl md:text-6xl">
          GETAWAY{" "}
          <span className="inline-block px-2" style={{ background: "var(--accent-lime)" }}>
            DRIVER.
          </span>
        </h1>
        <p className="mt-2 max-w-2xl font-mono text-xs sm:text-sm">
          Shrink the evidence. Bulk-compress images without leaving the scene (your browser).
        </p>

        {/* Controls */}
        <div className="mt-5 grid grid-cols-1 gap-3 sm:mt-6 sm:grid-cols-3">
          <div className="brutal-card-sm bg-paper p-4">
            <div className="mb-2 flex justify-between font-mono text-[10px] uppercase tracking-widest sm:text-xs">
              <span>01 / Quality</span>
              <span>{quality}%</span>
            </div>
            <input
              type="range"
              min={10}
              max={100}
              value={quality}
              onChange={(e) => setQuality(parseInt(e.target.value))}
              className="w-full accent-[var(--accent-lime)]"
            />
          </div>
          <div className="brutal-card-sm bg-paper p-4">
            <div className="mb-2 font-mono text-[10px] uppercase tracking-widest sm:text-xs">
              02 / Max dimension
            </div>
            <select
              value={maxDim}
              onChange={(e) => setMaxDim(parseInt(e.target.value))}
              className="w-full border-2 border-[var(--ink)] bg-paper px-2 py-1.5 font-mono text-xs"
            >
              <option value={0}>Original size</option>
              <option value={2560}>2560px</option>
              <option value={1920}>1920px</option>
              <option value={1280}>1280px</option>
              <option value={800}>800px</option>
            </select>
          </div>
          <div className="brutal-card-sm bg-paper p-4">
            <div className="mb-2 font-mono text-[10px] uppercase tracking-widest sm:text-xs">
              03 / Output
            </div>
            <div className="flex gap-1">
              {(["auto", "jpeg", "webp"] as const).map((f) => (
                <button
                  key={f}
                  onClick={() => setFormat(f)}
                  className={`flex-1 border-2 border-[var(--ink)] py-1.5 font-mono text-[10px] uppercase tracking-widest sm:text-xs ${
                    format === f ? "bg-[var(--ink)] text-[var(--paper)]" : "bg-paper text-ink"
                  }`}
                >
                  {f}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Dropzone */}
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragOver(false);
            if (e.dataTransfer.files?.length) void handleFiles(e.dataTransfer.files);
          }}
          onClick={() => inputRef.current?.click()}
          className="brutal-card mt-4 cursor-pointer p-6 text-center sm:mt-5 sm:p-8"
          style={{ background: dragOver ? "var(--accent-lime)" : "var(--paper)" }}
        >
          <input
            ref={inputRef}
            type="file"
            multiple
            accept="image/*"
            className="hidden"
            onChange={(e) => e.target.files && handleFiles(e.target.files)}
          />
          <div className="font-display text-xl font-bold sm:text-2xl">
            {busy ? "SHRINKING..." : dragOver ? "DROP IT" : "DROP IMAGES TO COMPRESS"}
          </div>
          <div className="mt-1 font-mono text-[10px] uppercase tracking-widest text-ink/60 sm:text-xs">
            JPG · PNG · WEBP · re-encoded with your settings
          </div>
        </div>

        {/* Results */}
        {results.length > 0 && (
          <>
            <div className="mt-5 flex items-center justify-between border-t-2 border-[var(--ink)] pt-3 font-mono text-[10px] uppercase tracking-widest sm:text-xs">
              <span>
                {results.length} file{results.length === 1 ? "" : "s"} · saved{" "}
                <span style={{ background: "var(--accent-lime)" }} className="px-1">
                  {savings}%
                </span>{" "}
                ({fmt(totalOrig)} → {fmt(totalOut)})
              </span>
              <button
                onClick={() => {
                  results.forEach((r) => URL.revokeObjectURL(r.url));
                  setResults([]);
                }}
                className="border-2 border-[var(--ink)] bg-paper px-2 py-1 hover:bg-destructive hover:text-destructive-foreground"
              >
                Clear
              </button>
            </div>
            <ul className="mt-3 space-y-2">
              {results.map((r) => {
                const pct = Math.round((1 - r.outSize / r.origSize) * 100);
                return (
                  <li
                    key={r.id}
                    className="brutal-card-sm bg-paper flex items-center gap-3 p-3"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="truncate font-mono text-xs font-bold">{r.name}</div>
                      <div className="font-mono text-[10px] text-ink/70">
                        {fmt(r.origSize)} → {fmt(r.outSize)}{" "}
                        <span
                          className={pct > 0 ? "text-[var(--ink)]" : "text-destructive"}
                          style={pct > 0 ? { background: "var(--accent-lime)" } : undefined}
                        >
                          {pct > 0 ? `−${pct}%` : `+${-pct}%`}
                        </span>
                      </div>
                    </div>
                    <a
                      href={r.url}
                      download={r.name}
                      className="brutal-card-sm bg-paper px-3 py-1.5 font-mono text-[10px] uppercase tracking-widest hover:bg-[var(--accent-lime)]"
                    >
                      Save
                    </a>
                  </li>
                );
              })}
            </ul>
          </>
        )}
      </div>
    </main>
  );
}
