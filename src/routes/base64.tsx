import { useMemo, useRef, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ThemeToggle } from "@/components/ThemeToggle";
import { usePageEnter } from "@/lib/animations";

export const Route = createFileRoute("/base64")({
  head: () => ({
    meta: [
      { title: "Shell Company — Base64 Encoder & Decoder" },
      {
        name: "description",
        content:
          "Encode and decode text or files to/from base64. Drag a file in, get a data URL out. Browser-only.",
      },
      { property: "og:title", content: "Shell Company — Base64 Tool" },
      {
        property: "og:description",
        content: "Base64 encode/decode text and files in your browser.",
      },
    ],
  }),
  component: Base64Page,
});

type Mode = "encode" | "decode";

function Base64Page() {
  const heroRef = usePageEnter<HTMLDivElement>();
  const inputRef = useRef<HTMLInputElement>(null);
  const [mode, setMode] = useState<Mode>("encode");
  const [input, setInput] = useState("");
  const [copied, setCopied] = useState(false);

  const output = useMemo(() => {
    if (!input) return "";
    try {
      if (mode === "encode") {
        // UTF-8 safe encode
        const bytes = new TextEncoder().encode(input);
        let bin = "";
        bytes.forEach((b) => (bin += String.fromCharCode(b)));
        return btoa(bin);
      } else {
        const bin = atob(input.replace(/\s/g, ""));
        const bytes = Uint8Array.from(bin, (c) => c.charCodeAt(0));
        return new TextDecoder().decode(bytes);
      }
    } catch (e) {
      return `⚠ ${(e as Error).message}`;
    }
  }, [input, mode]);

  const handleFile = async (file: File) => {
    const buf = await file.arrayBuffer();
    let bin = "";
    new Uint8Array(buf).forEach((b) => (bin += String.fromCharCode(b)));
    const b64 = btoa(bin);
    const dataUrl = `data:${file.type || "application/octet-stream"};base64,${b64}`;
    setMode("encode");
    setInput(dataUrl);
  };

  const copy = async () => {
    await navigator.clipboard.writeText(output);
    setCopied(true);
    setTimeout(() => setCopied(false), 1200);
  };

  return (
    <main className="min-h-[100dvh]">
      <div
        ref={heroRef}
        className="mx-auto flex min-h-[100dvh] max-w-5xl flex-col px-4 py-4 sm:px-6 sm:py-6"
      >
        <header className="flex shrink-0 items-center justify-between">
          <Link
            to="/"
            className="brutal-card-sm bg-paper px-3 py-1.5 font-mono text-[10px] uppercase tracking-widest hover:bg-[var(--accent-lime)] sm:text-xs"
          >
            ← Toolshed
          </Link>
          <ThemeToggle />
        </header>

        <h1 className="mt-4 shrink-0 font-display text-3xl font-bold leading-[0.95] tracking-tight sm:mt-6 sm:text-5xl md:text-6xl">
          SHELL{" "}
          <span className="inline-block px-2" style={{ background: "var(--accent-lime)" }}>
            COMPANY.
          </span>
        </h1>
        <p className="mt-2 shrink-0 max-w-2xl font-mono text-xs sm:text-sm">
          Launder your data through base64. Encode, decode, file-to-data-URL.
        </p>

        <div className="mt-4 flex shrink-0 items-center gap-2 sm:mt-5">
          <div className="flex flex-1 gap-1">
            {(["encode", "decode"] as const).map((m) => (
              <button
                key={m}
                onClick={() => setMode(m)}
                className={`flex-1 border-2 border-[var(--ink)] py-2 font-mono text-[10px] uppercase tracking-widest sm:text-xs ${
                  mode === m ? "bg-[var(--ink)] text-[var(--paper)]" : "bg-paper text-ink"
                }`}
              >
                {m}
              </button>
            ))}
          </div>
          <button
            onClick={() => inputRef.current?.click()}
            className="brutal-card-sm bg-paper px-3 py-2 font-mono text-[10px] uppercase tracking-widest hover:bg-[var(--accent-lime)] sm:text-xs"
          >
            Load file
          </button>
          <input
            ref={inputRef}
            type="file"
            className="hidden"
            onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
          />
        </div>

        <div className="mt-3 grid flex-1 grid-cols-1 gap-3 lg:grid-cols-2">
          <div className="brutal-card-sm flex flex-col bg-paper p-3">
            <div className="mb-2 flex justify-between font-mono text-[10px] uppercase tracking-widest">
              <span>Input</span>
              <span className="text-ink/60">{input.length} chars</span>
            </div>
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={mode === "encode" ? "Plain text..." : "Base64 string..."}
              className="min-h-[200px] flex-1 resize-none border-2 border-[var(--ink)] bg-paper p-2 font-mono text-xs"
            />
          </div>
          <div className="brutal-card-sm flex flex-col bg-paper p-3">
            <div className="mb-2 flex justify-between font-mono text-[10px] uppercase tracking-widest">
              <span>Output</span>
              <button
                onClick={copy}
                disabled={!output}
                className="border border-[var(--ink)] bg-paper px-2 hover:bg-[var(--accent-lime)] disabled:opacity-40"
              >
                {copied ? "Copied!" : "Copy"}
              </button>
            </div>
            <textarea
              value={output}
              readOnly
              className="min-h-[200px] flex-1 resize-none border-2 border-[var(--ink)] bg-paper p-2 font-mono text-xs"
            />
          </div>
        </div>
      </div>
    </main>
  );
}
