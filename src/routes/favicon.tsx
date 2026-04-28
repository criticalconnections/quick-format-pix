import { useRef, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import JSZip from "jszip";
import { ThemeToggle } from "@/components/ThemeToggle";
import { usePageEnter } from "@/lib/animations";

export const Route = createFileRoute("/favicon")({
  head: () => ({
    meta: [
      { title: "The Forger — Favicon Generator (Multi-Size PNG + ICO)" },
      {
        name: "description",
        content:
          "Forge a complete favicon set from any image. 16, 32, 48, 180, 192, 512px PNGs plus a multi-size ICO, packaged as a zip.",
      },
      { property: "og:title", content: "The Forger — Favicon Generator" },
      {
        property: "og:description",
        content: "Generate a full favicon set in your browser.",
      },
    ],
  }),
  component: FaviconPage,
});

const SIZES = [16, 32, 48, 180, 192, 512] as const;

async function renderSize(bmp: ImageBitmap, size: number, bg: string | null): Promise<Blob> {
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d")!;
  if (bg) {
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, size, size);
  }
  // contain
  const scale = Math.min(size / bmp.width, size / bmp.height);
  const w = bmp.width * scale;
  const h = bmp.height * scale;
  ctx.drawImage(bmp, (size - w) / 2, (size - h) / 2, w, h);
  return new Promise((res, rej) =>
    canvas.toBlob((b) => (b ? res(b) : rej(new Error("encode failed"))), "image/png"),
  );
}

// Build a multi-size .ico containing PNG images (modern Windows + browsers support this).
async function buildIco(pngs: { size: number; blob: Blob }[]): Promise<Blob> {
  const entries = await Promise.all(
    pngs.map(async (p) => ({ size: p.size, bytes: new Uint8Array(await p.blob.arrayBuffer()) })),
  );
  const headerSize = 6 + entries.length * 16;
  const totalSize = headerSize + entries.reduce((a, e) => a + e.bytes.length, 0);
  const buf = new ArrayBuffer(totalSize);
  const view = new DataView(buf);
  const u8 = new Uint8Array(buf);
  view.setUint16(0, 0, true); // reserved
  view.setUint16(2, 1, true); // type 1 = ICO
  view.setUint16(4, entries.length, true);
  let offset = headerSize;
  entries.forEach((e, i) => {
    const head = 6 + i * 16;
    view.setUint8(head, e.size === 256 ? 0 : e.size);
    view.setUint8(head + 1, e.size === 256 ? 0 : e.size);
    view.setUint8(head + 2, 0);
    view.setUint8(head + 3, 0);
    view.setUint16(head + 4, 1, true);
    view.setUint16(head + 6, 32, true);
    view.setUint32(head + 8, e.bytes.length, true);
    view.setUint32(head + 12, offset, true);
    u8.set(e.bytes, offset);
    offset += e.bytes.length;
  });
  return new Blob([buf], { type: "image/x-icon" });
}

type Preview = { size: number; url: string; blob: Blob };

function FaviconPage() {
  const heroRef = usePageEnter<HTMLDivElement>();
  const inputRef = useRef<HTMLInputElement>(null);
  const [previews, setPreviews] = useState<Preview[]>([]);
  const [bg, setBg] = useState<string>("#ffffff");
  const [useBg, setUseBg] = useState(false);
  const [busy, setBusy] = useState(false);
  const [name, setName] = useState("");

  const generate = async (file: File) => {
    setBusy(true);
    setName(file.name.replace(/\.[^.]+$/, ""));
    const bmp = await createImageBitmap(file);
    const out: Preview[] = [];
    for (const size of SIZES) {
      const blob = await renderSize(bmp, size, useBg ? bg : null);
      out.push({ size, blob, url: URL.createObjectURL(blob) });
    }
    bmp.close();
    setPreviews(out);
    setBusy(false);
  };

  const downloadZip = async () => {
    if (!previews.length) return;
    const zip = new JSZip();
    previews.forEach((p) => zip.file(`favicon-${p.size}x${p.size}.png`, p.blob));
    const ico = await buildIco(
      previews.filter((p) => p.size === 16 || p.size === 32 || p.size === 48),
    );
    zip.file("favicon.ico", ico);
    zip.file(
      "README.txt",
      `Forged by The Forger.

Drop these files into your site root and add to <head>:

<link rel="icon" href="/favicon.ico" sizes="any">
<link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png">
<link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png">
<link rel="apple-touch-icon" sizes="180x180" href="/favicon-180x180.png">
<link rel="manifest" href="/site.webmanifest">
`,
    );
    const blob = await zip.generateAsync({ type: "blob" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${name || "favicon"}-pack.zip`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
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
            FORGER.
          </span>
        </h1>
        <p className="mt-2 max-w-2xl font-mono text-xs sm:text-sm">
          Forge a complete favicon set from any image. PNGs at every size + a multi-res ICO.
        </p>

        <div className="mt-5 flex flex-wrap items-center gap-3 sm:mt-6">
          <button
            onClick={() => inputRef.current?.click()}
            className="brutal-card-sm bg-paper px-4 py-2 font-mono text-[10px] uppercase tracking-widest hover:bg-[var(--accent-lime)] sm:text-xs"
          >
            {busy ? "Forging..." : "Pick source image"}
          </button>
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => e.target.files?.[0] && generate(e.target.files[0])}
          />
          <label className="brutal-card-sm flex items-center gap-2 bg-paper px-3 py-2 font-mono text-[10px] uppercase tracking-widest sm:text-xs">
            <input type="checkbox" checked={useBg} onChange={(e) => setUseBg(e.target.checked)} />
            Solid background
            {useBg && (
              <input
                type="color"
                value={bg}
                onChange={(e) => setBg(e.target.value)}
                className="h-5 w-7 cursor-pointer border-0 bg-transparent"
              />
            )}
          </label>
          {previews.length > 0 && (
            <button
              onClick={downloadZip}
              className="brutal-card-sm bg-[var(--accent-lime)] px-4 py-2 font-mono text-[10px] uppercase tracking-widest sm:text-xs"
            >
              Download .zip pack →
            </button>
          )}
        </div>

        {previews.length > 0 && (
          <div className="mt-5 grid grid-cols-3 gap-3 sm:grid-cols-6">
            {previews.map((p) => (
              <div
                key={p.size}
                className="brutal-card-sm flex flex-col items-center gap-2 bg-paper p-3"
              >
                <div
                  className="flex aspect-square w-full items-center justify-center border-2 border-[var(--ink)]"
                  style={{ background: useBg ? bg : "transparent" }}
                >
                  <img src={p.url} alt={`${p.size}px`} className="max-h-full max-w-full" />
                </div>
                <div className="font-mono text-[10px] uppercase tracking-widest">
                  {p.size}×{p.size}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
