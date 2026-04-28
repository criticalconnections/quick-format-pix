import { useCallback, useRef, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ThemeToggle } from "@/components/ThemeToggle";
import { usePageEnter, useScrollReveal } from "@/lib/animations";
import {
  bestForeground,
  buildPalettes,
  extractSwatches,
  type BrandPalette,
  type PaletteScheme,
  type Swatch,
} from "@/lib/colorExtract";

export const Route = createFileRoute("/colors")({
  head: () => ({
    meta: [
      { title: "Color Extractor — Swatches & Brand Palettes from any Image" },
      {
        name: "description",
        content:
          "Drop a photo, get its dominant color swatches plus complementary, analogous, triadic and monochrome brand palettes. Runs entirely in your browser.",
      },
      { property: "og:title", content: "Color Extractor — Swatches & Brand Palettes" },
      {
        property: "og:description",
        content:
          "Extract dominant colors from any photo and generate matching brand palettes. No upload, no signup.",
      },
    ],
  }),
  component: ColorsPage,
});

const SCHEME_ORDER: PaletteScheme[] = [
  "complementary",
  "analogous",
  "triadic",
  "split-complementary",
  "monochrome",
];

function ColorsPage() {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [imageName, setImageName] = useState<string>("");
  const [swatches, setSwatches] = useState<Swatch[]>([]);
  const [palettes, setPalettes] = useState<BrandPalette[]>([]);
  const [activeSeedHex, setActiveSeedHex] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [k, setK] = useState(6);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback(
    async (file: File, count = k) => {
      setError(null);
      setBusy(true);
      setSwatches([]);
      setPalettes([]);
      try {
        if (imageUrl) URL.revokeObjectURL(imageUrl);
        const url = URL.createObjectURL(file);
        setImageUrl(url);
        setImageName(file.name);
        const result = await extractSwatches(file, count);
        setSwatches(result);
        if (result[0]) {
          setActiveSeedHex(result[0].hex);
          setPalettes(buildPalettes(result[0]));
        }
      } catch (e) {
        setError((e as Error).message || "Could not process image");
      } finally {
        setBusy(false);
      }
    },
    [imageUrl, k],
  );

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files?.[0];
    if (f) void handleFile(f);
  };

  const onSwatchClick = (s: Swatch) => {
    setActiveSeedHex(s.hex);
    setPalettes(buildPalettes(s));
  };

  const onChangeK = (next: number) => {
    setK(next);
    // re-extract from the same file if loaded
    if (inputRef.current?.files?.[0]) {
      void handleFile(inputRef.current.files[0], next);
    }
  };

  const pageRef = usePageEnter<HTMLElement>();
  const revealRoot = useScrollReveal<HTMLDivElement>("[data-reveal-scroll]", [
    swatches.length,
    palettes.length,
    activeSeedHex,
  ]);

  return (
    <main ref={pageRef} className="min-h-screen">
      <div ref={revealRoot} className="mx-auto max-w-6xl px-4 sm:px-6 py-6 sm:py-12">
        {/* Header */}
        <header className="mb-8 sm:mb-10" data-reveal>
          <div className="flex items-center justify-between mb-4 gap-3">
            <Link
              to="/"
              className="font-mono text-[10px] sm:text-xs uppercase tracking-widest border-2 border-ink px-2.5 py-1 hover:bg-ink hover:text-paper"
            >
              ← Back
            </Link>
            <ThemeToggle />
          </div>
          <h1 className="font-display text-5xl sm:text-6xl md:text-7xl font-bold tracking-tighter leading-[0.9]">
            STEAL
            <br />
            <span className="bg-[var(--accent-lime)] px-3 -ml-1 inline-block">COLORS</span>
            <br />
            FROM PHOTOS.
          </h1>
          <p className="mt-5 sm:mt-6 font-mono text-sm max-w-md text-ink/70">
            Drop an image. Get dominant swatches plus five brand palettes built around the colors
            you actually liked. Pixels never leave your browser.
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
          className={`brutal-card cursor-pointer p-6 sm:p-10 text-center transition-all ${
            dragOver ? "translate-x-[-3px] translate-y-[-3px]" : ""
          }`}
          style={{ background: dragOver ? "var(--accent-lime)" : "var(--paper)" }}
        >
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void handleFile(f);
            }}
          />
          <div className="font-display text-2xl sm:text-3xl font-bold mb-2">
            {dragOver ? "DROP IT" : busy ? "READING PIXELS…" : imageUrl ? "REPLACE IMAGE" : "DROP A PHOTO"}
          </div>
          <div className="font-mono text-[10px] sm:text-xs uppercase tracking-widest text-ink/60">
            JPG · PNG · WEBP · GIF
          </div>
        </div>

        {error && (
          <div
            className="brutal-card-sm p-4 mt-6 font-mono text-xs"
            style={{ background: "color-mix(in oklch, var(--destructive) 18%, var(--paper))" }}
          >
            ! {error}
          </div>
        )}

        {/* Image preview + swatch count */}
        {imageUrl && (
          <div className="grid md:grid-cols-[1fr_auto] gap-4 mt-8 items-start">
            <div className="brutal-card-sm p-2">
              <img
                src={imageUrl}
                alt={imageName}
                className="w-full h-auto max-h-[420px] object-contain border-2 border-ink"
              />
              <div className="font-mono text-[10px] uppercase tracking-widest text-ink/60 px-1 pt-2 pb-1 truncate">
                {imageName}
              </div>
            </div>
            <div className="brutal-card-sm p-5 md:w-64">
              <div className="font-mono text-xs uppercase tracking-widest mb-3 flex justify-between">
                <span>Swatches</span>
                <span>{k}</span>
              </div>
              <input
                type="range"
                min={3}
                max={10}
                value={k}
                onChange={(e) => onChangeK(parseInt(e.target.value))}
                disabled={busy}
                className="w-full accent-[var(--accent-lime)] disabled:opacity-30"
              />
              <div className="font-mono text-[10px] text-ink/50 mt-2 leading-relaxed">
                More swatches = finer detail. Fewer = stronger themes.
              </div>
            </div>
          </div>
        )}

        {/* Swatches */}
        {swatches.length > 0 && (
          <section className="mt-10">
            <div className="flex items-baseline justify-between mb-4">
              <h2 className="font-display text-2xl sm:text-3xl font-bold tracking-tight">
                01 / Dominant swatches
              </h2>
              <div className="font-mono text-[10px] uppercase tracking-widest text-ink/60">
                Tap to use as seed
              </div>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              {swatches.map((s) => (
                <SwatchCard
                  key={s.hex}
                  swatch={s}
                  active={s.hex === activeSeedHex}
                  onClick={() => onSwatchClick(s)}
                />
              ))}
            </div>
          </section>
        )}

        {/* Palettes */}
        {palettes.length > 0 && (
          <section className="mt-12">
            <div className="flex items-baseline justify-between mb-4 flex-wrap gap-2">
              <h2 className="font-display text-2xl sm:text-3xl font-bold tracking-tight">
                02 / Brand palettes
              </h2>
              <div className="font-mono text-[10px] uppercase tracking-widest text-ink/60">
                Seed: {activeSeedHex}
              </div>
            </div>
            <div className="space-y-6">
              {SCHEME_ORDER.map((scheme) => {
                const p = palettes.find((x) => x.scheme === scheme);
                if (!p) return null;
                return <PaletteCard key={scheme} palette={p} />;
              })}
            </div>
          </section>
        )}

        {/* Footer */}
        <footer
          className="mt-16 brutal-card-sm p-5"
          style={{ background: "var(--ink)", color: "var(--paper)" }}
        >
          <div className="font-mono text-xs uppercase tracking-widest mb-1">
            ⚙ How it works
          </div>
          <div className="font-mono text-xs leading-relaxed">
            We downsample your image and run k-means clustering in the OKLab perceptual color space
            so swatches match what you'd actually call "the colors of this photo". Brand palettes
            are derived from the seed swatch using classic color-theory relationships.
          </div>
        </footer>
      </div>
    </main>
  );
}

function SwatchCard({
  swatch,
  active,
  onClick,
}: {
  swatch: Swatch;
  active: boolean;
  onClick: () => void;
}) {
  const fg = bestForeground(swatch.hex);
  const [copied, setCopied] = useState(false);
  const copy = (e: React.MouseEvent) => {
    e.stopPropagation();
    void navigator.clipboard.writeText(swatch.hex).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    });
  };
  return (
    <button
      onClick={onClick}
      className={`text-left brutal-card-sm overflow-hidden transition-all ${
        active ? "translate-x-[-3px] translate-y-[-3px]" : ""
      }`}
      style={{ boxShadow: active ? "6px 6px 0 0 var(--ink)" : undefined }}
    >
      <div
        className="h-24 sm:h-28 flex items-end justify-between p-2"
        style={{ background: swatch.hex, color: fg }}
      >
        <span className="font-mono text-[10px] uppercase tracking-widest opacity-80">
          {Math.round(swatch.population * 100)}%
        </span>
        {active && (
          <span className="font-mono text-[10px] uppercase tracking-widest border border-current px-1">
            Seed
          </span>
        )}
      </div>
      <div className="p-2.5 border-t-2 border-ink">
        <div className="font-display font-bold text-sm leading-tight truncate">{swatch.name}</div>
        <div className="flex items-center justify-between gap-1 mt-1">
          <code className="font-mono text-[11px] text-ink/70">{swatch.hex}</code>
          <span
            onClick={copy}
            role="button"
            tabIndex={0}
            className="font-mono text-[10px] uppercase border border-ink px-1.5 py-0.5 hover:bg-ink hover:text-paper cursor-pointer"
          >
            {copied ? "✓" : "Copy"}
          </span>
        </div>
      </div>
    </button>
  );
}

function PaletteCard({ palette }: { palette: BrandPalette }) {
  const slots = [
    { key: "primary", label: "Primary", hex: palette.primary },
    { key: "secondary", label: "Secondary", hex: palette.secondary },
    { key: "accent", label: "Accent", hex: palette.accent },
    { key: "neutralDark", label: "Ink", hex: palette.neutralDark },
    { key: "neutralLight", label: "Paper", hex: palette.neutralLight },
  ];
  const css = `:root {
  --primary: ${palette.primary};
  --secondary: ${palette.secondary};
  --accent: ${palette.accent};
  --ink: ${palette.neutralDark};
  --paper: ${palette.neutralLight};
}`;
  const [copied, setCopied] = useState(false);
  const copyCss = () => {
    void navigator.clipboard.writeText(css).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    });
  };

  return (
    <div className="brutal-card-sm overflow-hidden">
      {/* Header */}
      <div className="p-4 sm:p-5 border-b-2 border-ink flex items-start justify-between gap-3 flex-wrap">
        <div>
          <div className="font-display text-xl sm:text-2xl font-bold uppercase tracking-tight">
            {palette.scheme.replace("-", " ")}
          </div>
          <div className="font-mono text-xs text-ink/60 mt-1 max-w-md">{palette.description}</div>
        </div>
        <button
          onClick={copyCss}
          className="font-mono text-[10px] uppercase tracking-widest border-2 border-ink px-3 py-1.5 hover:bg-[var(--accent-lime)]"
        >
          {copied ? "✓ Copied" : "Copy CSS"}
        </button>
      </div>

      {/* Swatch row */}
      <div className="grid grid-cols-2 sm:grid-cols-5">
        {slots.map((slot, i) => {
          const fg = bestForeground(slot.hex);
          return (
            <div
              key={slot.key}
              className={`p-4 sm:p-5 min-h-[110px] flex flex-col justify-between ${
                i < slots.length - 1 ? "sm:border-r-2 border-ink" : ""
              } ${i % 2 === 0 ? "border-r-2 sm:border-r-2" : ""} ${
                i < 2 ? "border-b-2 sm:border-b-0" : ""
              }`}
              style={{ background: slot.hex, color: fg }}
            >
              <div className="font-mono text-[10px] uppercase tracking-widest opacity-80">
                {slot.label}
              </div>
              <div>
                <code className="font-mono text-sm font-bold">{slot.hex}</code>
              </div>
            </div>
          );
        })}
      </div>

      {/* Brand preview */}
      <BrandPreview palette={palette} />
    </div>
  );
}

function BrandPreview({ palette }: { palette: BrandPalette }) {
  const onPrimary = bestForeground(palette.primary);
  const onAccent = bestForeground(palette.accent);
  const onPaper = bestForeground(palette.neutralLight);

  return (
    <div className="border-t-2 border-ink p-4 sm:p-6" style={{ background: palette.neutralLight, color: onPaper }}>
      {/* Mock landing */}
      <div
        className="p-5 sm:p-6 border-2"
        style={{ borderColor: palette.neutralDark, background: palette.neutralLight }}
      >
        <div
          className="font-mono text-[10px] uppercase tracking-widest mb-3"
          style={{ color: palette.primary }}
        >
          ▮ Brand preview
        </div>
        <div
          className="font-display text-2xl sm:text-3xl font-bold leading-tight tracking-tight"
          style={{ color: palette.neutralDark }}
        >
          Headline goes here.{" "}
          <span style={{ background: palette.accent, color: onAccent, padding: "0 6px" }}>
            Punchline.
          </span>
        </div>
        <p
          className="font-mono text-xs mt-3 max-w-md"
          style={{ color: palette.neutralDark, opacity: 0.75 }}
        >
          Body copy reads against the paper neutral. Accents call out the moments that matter.
        </p>
        <div className="flex flex-wrap gap-2 mt-4">
          <span
            className="font-display font-bold text-sm px-4 py-2 border-2"
            style={{
              background: palette.primary,
              color: onPrimary,
              borderColor: palette.neutralDark,
            }}
          >
            Primary CTA
          </span>
          <span
            className="font-display font-bold text-sm px-4 py-2 border-2"
            style={{
              background: palette.neutralLight,
              color: palette.neutralDark,
              borderColor: palette.neutralDark,
            }}
          >
            Secondary
          </span>
          <span
            className="font-mono text-xs uppercase tracking-widest px-3 py-2 border-2"
            style={{
              background: palette.secondary,
              color: bestForeground(palette.secondary),
              borderColor: palette.neutralDark,
            }}
          >
            Tag
          </span>
        </div>
      </div>
    </div>
  );
}

