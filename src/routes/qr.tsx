import { useEffect, useRef, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import QRCode from "qrcode";
import { ThemeToggle } from "@/components/ThemeToggle";
import { usePageEnter } from "@/lib/animations";

export const Route = createFileRoute("/qr")({
  head: () => ({
    meta: [
      { title: "The Fence — QR Code Generator (Move Anything Anywhere)" },
      {
        name: "description",
        content:
          "Generate QR codes for URLs, text, WiFi credentials, and more. Customize colors, error correction, and download as PNG or SVG.",
      },
      { property: "og:title", content: "The Fence — QR Generator" },
      {
        property: "og:description",
        content: "Move anything anywhere with a QR code. Browser-only.",
      },
    ],
  }),
  component: QrPage,
});

type Mode = "text" | "url" | "wifi";
type Ec = "L" | "M" | "Q" | "H";

function QrPage() {
  const heroRef = usePageEnter<HTMLDivElement>();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [mode, setMode] = useState<Mode>("url");
  const [text, setText] = useState("https://lovable.dev");
  const [ssid, setSsid] = useState("");
  const [pass, setPass] = useState("");
  const [enc, setEnc] = useState<"WPA" | "WEP" | "nopass">("WPA");
  const [ec, setEc] = useState<Ec>("M");
  const [fg, setFg] = useState("#0f0f0f");
  const [bg, setBg] = useState("#fafafa");
  const [size, setSize] = useState(512);
  const [svg, setSvg] = useState<string>("");

  const payload =
    mode === "wifi"
      ? `WIFI:T:${enc};S:${ssid};P:${pass};;`
      : text;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !payload) return;
    void QRCode.toCanvas(canvas, payload, {
      errorCorrectionLevel: ec,
      margin: 2,
      width: size,
      color: { dark: fg, light: bg },
    }).catch(() => {});
    void QRCode.toString(payload, {
      type: "svg",
      errorCorrectionLevel: ec,
      margin: 2,
      color: { dark: fg, light: bg },
    }).then(setSvg).catch(() => {});
  }, [payload, ec, fg, bg, size]);

  const downloadPng = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.toBlob((b) => {
      if (!b) return;
      const url = URL.createObjectURL(b);
      const a = document.createElement("a");
      a.href = url;
      a.download = `qr-${Date.now()}.png`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    });
  };

  const downloadSvg = () => {
    const blob = new Blob([svg], { type: "image/svg+xml" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `qr-${Date.now()}.svg`;
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
            FENCE.
          </span>
        </h1>
        <p className="mt-2 max-w-2xl font-mono text-xs sm:text-sm">
          Move anything anywhere. Generate a QR code for a URL, raw text, or WiFi creds.
        </p>

        <div className="mt-5 grid grid-cols-1 gap-4 lg:grid-cols-2 sm:mt-6">
          {/* Inputs */}
          <div className="space-y-3">
            <div className="brutal-card-sm bg-paper p-4">
              <div className="mb-2 font-mono text-[10px] uppercase tracking-widest sm:text-xs">
                01 / Payload
              </div>
              <div className="mb-3 flex gap-1">
                {(["url", "text", "wifi"] as const).map((m) => (
                  <button
                    key={m}
                    onClick={() => setMode(m)}
                    className={`flex-1 border-2 border-[var(--ink)] py-1.5 font-mono text-[10px] uppercase tracking-widest sm:text-xs ${
                      mode === m ? "bg-[var(--ink)] text-[var(--paper)]" : "bg-paper text-ink"
                    }`}
                  >
                    {m}
                  </button>
                ))}
              </div>
              {mode === "wifi" ? (
                <div className="space-y-2">
                  <input
                    placeholder="Network name (SSID)"
                    value={ssid}
                    onChange={(e) => setSsid(e.target.value)}
                    className="w-full border-2 border-[var(--ink)] bg-paper px-2 py-2 font-mono text-xs"
                  />
                  <input
                    placeholder="Password"
                    value={pass}
                    onChange={(e) => setPass(e.target.value)}
                    className="w-full border-2 border-[var(--ink)] bg-paper px-2 py-2 font-mono text-xs"
                  />
                  <div className="flex gap-1">
                    {(["WPA", "WEP", "nopass"] as const).map((e) => (
                      <button
                        key={e}
                        onClick={() => setEnc(e)}
                        className={`flex-1 border-2 border-[var(--ink)] py-1 font-mono text-[10px] uppercase ${
                          enc === e ? "bg-[var(--ink)] text-[var(--paper)]" : "bg-paper text-ink"
                        }`}
                      >
                        {e}
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <textarea
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  rows={4}
                  className="w-full resize-none border-2 border-[var(--ink)] bg-paper px-2 py-2 font-mono text-xs"
                />
              )}
            </div>

            <div className="brutal-card-sm bg-paper p-4">
              <div className="mb-2 font-mono text-[10px] uppercase tracking-widest sm:text-xs">
                02 / Style
              </div>
              <div className="grid grid-cols-2 gap-2">
                <label className="flex items-center justify-between gap-2 border-2 border-[var(--ink)] bg-paper px-2 py-1.5 font-mono text-[10px] uppercase">
                  Foreground
                  <input
                    type="color"
                    value={fg}
                    onChange={(e) => setFg(e.target.value)}
                    className="h-6 w-10 cursor-pointer border-0 bg-transparent"
                  />
                </label>
                <label className="flex items-center justify-between gap-2 border-2 border-[var(--ink)] bg-paper px-2 py-1.5 font-mono text-[10px] uppercase">
                  Background
                  <input
                    type="color"
                    value={bg}
                    onChange={(e) => setBg(e.target.value)}
                    className="h-6 w-10 cursor-pointer border-0 bg-transparent"
                  />
                </label>
              </div>
              <div className="mt-3 flex gap-1">
                {(["L", "M", "Q", "H"] as const).map((l) => (
                  <button
                    key={l}
                    onClick={() => setEc(l)}
                    title={`Error correction: ${l}`}
                    className={`flex-1 border-2 border-[var(--ink)] py-1 font-mono text-[10px] uppercase ${
                      ec === l ? "bg-[var(--ink)] text-[var(--paper)]" : "bg-paper text-ink"
                    }`}
                  >
                    EC: {l}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Preview */}
          <div className="brutal-card flex flex-col items-center justify-center bg-paper p-4">
            <canvas
              ref={canvasRef}
              className="h-auto w-full max-w-[320px] border-2 border-[var(--ink)]"
            />
            <div className="mt-3 flex w-full gap-2">
              <button
                onClick={downloadPng}
                className="brutal-card-sm flex-1 bg-paper py-2 font-mono text-[10px] uppercase tracking-widest hover:bg-[var(--accent-lime)] sm:text-xs"
              >
                Download PNG
              </button>
              <button
                onClick={downloadSvg}
                className="brutal-card-sm flex-1 bg-paper py-2 font-mono text-[10px] uppercase tracking-widest hover:bg-[var(--accent-lime)] sm:text-xs"
              >
                Download SVG
              </button>
            </div>
            <div className="mt-2 font-mono text-[10px] uppercase tracking-widest text-ink/60">
              <input
                type="range"
                min={256}
                max={1024}
                step={64}
                value={size}
                onChange={(e) => setSize(parseInt(e.target.value))}
                className="mr-2 align-middle accent-[var(--accent-lime)]"
              />
              {size}px export
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
