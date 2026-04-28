import { useRef, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
// @ts-expect-error - piexifjs ships without types
import piexif from "piexifjs";
import { ThemeToggle } from "@/components/ThemeToggle";
import { usePageEnter } from "@/lib/animations";

export const Route = createFileRoute("/strip")({
  head: () => ({
    meta: [
      { title: "The Alibi — Strip EXIF & Metadata From Photos" },
      {
        name: "description",
        content:
          "Remove GPS, camera, and timestamp metadata from JPG and PNG files. Your photo was never there. Browser-only.",
      },
      { property: "og:title", content: "The Alibi — Metadata Stripper" },
      {
        property: "og:description",
        content: "Strip EXIF/GPS data from your photos. No upload required.",
      },
    ],
  }),
  component: StripPage,
});

type Result = {
  id: string;
  name: string;
  origSize: number;
  outSize: number;
  url: string;
  exifBefore: Record<string, unknown>;
  hadGps: boolean;
};

const fmt = (n: number) =>
  n < 1024 ? `${n} B` : n < 1024 * 1024 ? `${(n / 1024).toFixed(1)} KB` : `${(n / 1024 / 1024).toFixed(2)} MB`;

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((res, rej) => {
    const r = new FileReader();
    r.onload = () => res(r.result as string);
    r.onerror = rej;
    r.readAsDataURL(file);
  });
}

async function stripJpeg(file: File): Promise<Result> {
  const dataUrl = await fileToDataUrl(file);
  let exifBefore: Record<string, unknown> = {};
  let hadGps = false;
  try {
    const dump = piexif.load(dataUrl);
    exifBefore = dump;
    hadGps = !!(dump.GPS && Object.keys(dump.GPS).length > 0);
  } catch {
    /* no exif */
  }
  const cleaned: string = piexif.remove(dataUrl);
  const blob = await (await fetch(cleaned)).blob();
  return {
    id: crypto.randomUUID(),
    name: file.name.replace(/\.[^.]+$/, "") + "-clean.jpg",
    origSize: file.size,
    outSize: blob.size,
    url: URL.createObjectURL(blob),
    exifBefore,
    hadGps,
  };
}

async function stripViaCanvas(file: File): Promise<Result> {
  // PNG / WEBP — re-encode through canvas to drop ancillary chunks/metadata
  const bmp = await createImageBitmap(file);
  const canvas = document.createElement("canvas");
  canvas.width = bmp.width;
  canvas.height = bmp.height;
  canvas.getContext("2d")!.drawImage(bmp, 0, 0);
  bmp.close();
  const blob: Blob = await new Promise((res, rej) =>
    canvas.toBlob(
      (b) => (b ? res(b) : rej(new Error("encode failed"))),
      file.type || "image/png",
    ),
  );
  return {
    id: crypto.randomUUID(),
    name: file.name.replace(/\.[^.]+$/, "") + "-clean." + (file.type.split("/")[1] || "png"),
    origSize: file.size,
    outSize: blob.size,
    url: URL.createObjectURL(blob),
    exifBefore: {},
    hadGps: false,
  };
}

function StripPage() {
  const heroRef = usePageEnter<HTMLDivElement>();
  const inputRef = useRef<HTMLInputElement>(null);
  const [results, setResults] = useState<Result[]>([]);
  const [busy, setBusy] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  const handleFiles = async (files: FileList | File[]) => {
    setBusy(true);
    const arr = Array.from(files).filter((f) => /^image\//.test(f.type));
    const next: Result[] = [];
    for (const f of arr) {
      try {
        const r = /jpeg|jpg/i.test(f.type) ? await stripJpeg(f) : await stripViaCanvas(f);
        next.push(r);
      } catch (err) {
        console.error(err);
      }
    }
    setResults((prev) => [...next, ...prev]);
    setBusy(false);
  };

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
          THE{" "}
          <span className="inline-block px-2" style={{ background: "var(--accent-lime)" }}>
            ALIBI.
          </span>
        </h1>
        <p className="mt-2 max-w-2xl font-mono text-xs sm:text-sm">
          Your photo was never there. Strips EXIF, GPS, camera info, and timestamps.
        </p>

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
          className="brutal-card mt-5 cursor-pointer p-6 text-center sm:mt-6 sm:p-10"
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
            {busy ? "ESTABLISHING ALIBI..." : dragOver ? "DROP IT" : "DROP PHOTOS TO LAUNDER"}
          </div>
          <div className="mt-1 font-mono text-[10px] uppercase tracking-widest text-ink/60 sm:text-xs">
            JPG strips EXIF surgically · PNG/WEBP re-encoded clean
          </div>
        </div>

        {results.length > 0 && (
          <ul className="mt-5 space-y-2">
            {results.map((r) => (
              <li key={r.id} className="brutal-card-sm bg-paper p-3">
                <div className="flex items-center gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-mono text-xs font-bold">{r.name}</div>
                    <div className="font-mono text-[10px] text-ink/70">
                      {fmt(r.origSize)} → {fmt(r.outSize)}{" "}
                      {r.hadGps && (
                        <span
                          className="ml-1 px-1"
                          style={{ background: "var(--accent-lime)" }}
                        >
                          GPS REMOVED
                        </span>
                      )}
                    </div>
                  </div>
                  <a
                    href={r.url}
                    download={r.name}
                    className="brutal-card-sm bg-paper px-3 py-1.5 font-mono text-[10px] uppercase tracking-widest hover:bg-[var(--accent-lime)]"
                  >
                    Save
                  </a>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </main>
  );
}
