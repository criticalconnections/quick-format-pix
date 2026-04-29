
import { useRef, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ThemeToggle } from "@/components/ThemeToggle";
import { BrokenScreen } from "@/components/BrokenScreen";
import { useKonamiBreak } from "@/hooks/useKonamiBreak";
import { usePageEnter, useScrollReveal } from "@/lib/animations";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "TOOLSHED — Tiny browser tools that don't waste your time" },
      {
        name: "description",
        content:
          "A collection of dumb-simple browser tools. Convert HEICs, steal colors from photos, and generate passwords. No accounts. No uploads. No nonsense.",
      },
      { property: "og:title", content: "TOOLSHED — Tiny browser tools" },
      {
        property: "og:description",
        content:
          "Convert HEICs, extract color palettes, and generate passwords — all in your browser.",
      },
    ],
  }),
  component: Landing,
});

type Tool = {
  number: string;
  name: string;
  tagline: string;
  description: string;
  cta: string;
  to:
    | "/imgconvert"
    | "/colors"
    | "/passwords"
    | "/compress"
    | "/qr"
    | "/strip"
    | "/base64"
    | "/favicon";
  accent?: boolean;
};

const TOOLS: Tool[] = [
  {
    number: "01",
    name: "WITNESS PROTECTION",
    tagline: "for HEICs",
    description:
      "Apple's proprietary HEIC files get a brand-new identity. Bulk-convert to JPG, PNG, or WEBP without uploading a single byte.",
    cta: "Relocate my HEICs →",
    to: "/imgconvert",
    accent: true,
  },
  {
    number: "02",
    name: "COLOR HEIST",
    tagline: "from any image",
    description:
      "Drop a photo. Walk away with its dominant swatches plus complementary, analogous, triadic, and monochrome palettes.",
    cta: "Steal some colors →",
    to: "/colors",
  },
  {
    number: "03",
    name: "PASSWORD FACTORY",
    tagline: "industrial strength",
    description:
      "Crank out passwords with toggles for length, symbols, ambiguous characters, and bulk batches. The kind your bank wishes you used.",
    cta: "Make me unhackable →",
    to: "/passwords",
    accent: true,
  },
  {
    number: "04",
    name: "GETAWAY DRIVER",
    tagline: "shrink the evidence",
    description:
      "Bulk image compressor that doesn't ask where you're going. Drop your files, pick how clean you want the cut, drive off with something a fraction of the original size. Quality stays suspiciously intact.",
    cta: "Shrink it down →",
    to: "/compress",
  },
  {
    number: "05",
    name: "THE FENCE",
    tagline: "move anything anywhere",
    description:
      "Need to pass off a URL, a WiFi password, or a contact card to someone across the room? The Fence turns it into a QR code nobody can trace back. Custom colors, error correction, PNG or SVG out the door.",
    cta: "Generate a QR →",
    to: "/qr",
  },
  {
    number: "06",
    name: "THE ALIBI",
    tagline: "your photo was never there",
    description:
      "Strip EXIF, GPS coordinates, camera fingerprints, and timestamps from your JPGs and PNGs. Plausible deniability, one drop at a time. The photo stays. The receipts don't.",
    cta: "Establish alibi →",
    to: "/strip",
    accent: true,
  },
  {
    number: "07",
    name: "SHELL COMPANY",
    tagline: "base64 launderer",
    description:
      "Encode or decode text and files through base64 with zero paper trail. Drop a file, get a clean data URL out the back door. Decode someone else's and pretend you didn't.",
    cta: "Launder data →",
    to: "/base64",
  },
  {
    number: "08",
    name: "THE FORGER",
    tagline: "favicon generator",
    description:
      "Forge a complete favicon set from any image — every size browsers ask for, plus a multi-resolution ICO, all packed in a zip. Your site will look like it's been around for years.",
    cta: "Forge favicons →",
    to: "/favicon",
    accent: true,
  },
];

function Landing() {
  const heroRef = usePageEnter<HTMLDivElement>();
  const gridRef = useScrollReveal<HTMLDivElement>();
  const { broken, reset } = useKonamiBreak();
  const [mobileBreak, setMobileBreak] = useState(0); // 0 = off, >0 = intensity
  const tapState = useRef<{ count: number; last: number }>({ count: 0, last: 0 });

  const handleAttitudeTap = () => {
    // Only trigger triple-tap break on touch / small viewports
    if (typeof window !== "undefined" && window.innerWidth >= 768 && !window.matchMedia("(pointer: coarse)").matches) {
      return;
    }
    const now = Date.now();
    if (now - tapState.current.last > 600) {
      tapState.current.count = 0;
    }
    tapState.current.last = now;
    tapState.current.count += 1;
    if (tapState.current.count >= 3) {
      tapState.current.count = 0;
      setMobileBreak((n) => Math.min(n + 1, 8));
    }
  };

  const isBroken = broken || mobileBreak > 0;
  const intensity = mobileBreak > 0 ? 1 + (mobileBreak - 1) * 0.8 : 1;
  const handleReset = () => {
    reset();
    setMobileBreak(0);
  };

  return (
    <main className="min-h-[100dvh]">
      <div className="mx-auto flex min-h-[100dvh] max-w-6xl flex-col px-4 py-3 sm:px-6 sm:py-5">
        {/* Top bar */}
        <header className="flex shrink-0 items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-2 sm:gap-3">
            <div
              className="brutal-card-sm flex h-8 w-8 shrink-0 items-center justify-center font-mono text-[10px] font-bold sm:h-10 sm:w-10 sm:text-sm"
              style={{ background: "var(--accent-lime)" }}
            >
              T/S
            </div>
            <span className="truncate font-mono text-[10px] uppercase tracking-widest sm:text-sm">
              toolshed.local
            </span>
          </div>
          <div className="flex items-center gap-2 sm:gap-3">
            <Link
              to="/docs"
              className="brutal-card-sm bg-paper px-2 py-1.5 font-mono text-[10px] uppercase tracking-widest hover:bg-[var(--accent-lime)] sm:px-3 sm:text-xs"
            >
              Docs
            </Link>
            <ThemeToggle />
          </div>
        </header>

        {/* Hero — compressed */}
        <section ref={heroRef} className="mt-4 shrink-0 sm:mt-6">
          <div className="font-mono text-[10px] uppercase tracking-[0.25em] text-[var(--ink)]/70 sm:text-xs">
            ※ Browser-only · Zero accounts · Free forever*
          </div>
          <h1 className="mt-2 font-display text-[2.25rem] font-bold leading-[0.95] tracking-tight sm:mt-3 sm:text-6xl md:text-7xl">
            TINY TOOLS.{" "}
            <span
              onTouchStart={handleAttitudeTap}
              className="inline-block px-2 select-none sm:px-3"
              style={{ background: "var(--accent-lime)" }}
            >
              BIG ATTITUDE.
            </span>
          </h1>
          <p className="mt-2 max-w-3xl font-display text-xs leading-snug sm:mt-3 sm:text-sm md:text-base">
            Because every "free online converter" wants your email, your
            firstborn, and a Pro subscription before it'll touch your photo of a
            sandwich. These run entirely in your browser. No uploads. No
            sign-ups. No 14-day trials that quietly renew at $79/mo.
          </p>
        </section>

        {/* Divider */}
        <div className="mt-4 flex shrink-0 items-center gap-3 sm:mt-6">
          <div className="h-[2px] flex-1 bg-[var(--ink)]" />
          <span className="font-mono text-[10px] uppercase tracking-[0.3em] sm:text-xs">
            // The Tools
          </span>
          <div className="h-[2px] flex-1 bg-[var(--ink)]" />
        </div>

        {/* Tool grid — 2 cols mobile, 4 cols desktop, fills remaining height */}
        <section
          ref={gridRef}
          className="mt-4 grid flex-1 grid-cols-2 gap-2 sm:mt-5 sm:gap-3 md:grid-cols-4"
        >
          {TOOLS.map((tool) => (
            <Link
              key={tool.to}
              to={tool.to}
              data-reveal-scroll
              className="brutal-card group flex flex-col p-3 transition-transform duration-150 hover:-translate-x-[3px] hover:-translate-y-[3px] sm:p-4"
              style={
                tool.accent
                  ? {
                      background: "var(--accent-lime)",
                      color: "var(--accent-lime-foreground)",
                    }
                  : undefined
              }
            >
              <div className="flex items-start justify-between">
                <span className="font-mono text-[10px] font-bold tracking-widest opacity-70">
                  №{tool.number}
                </span>
                <span className="font-mono text-[9px] uppercase tracking-widest opacity-60">
                  {tool.to}
                </span>
              </div>

              <div className="mt-3 sm:mt-4">
                <h2 className="font-display text-base font-bold leading-[1.05] sm:text-lg md:text-xl">
                  {tool.name}
                </h2>
                <div className="mt-1 font-mono text-[10px] uppercase tracking-widest opacity-70">
                  {tool.tagline}
                </div>
              </div>

              <p className="mt-2 hidden flex-1 font-display text-[11px] leading-snug opacity-90 sm:mt-3 sm:block sm:text-xs">
                {tool.description}
              </p>

              <div
                className="mt-3 inline-flex items-center justify-between border-t-2 pt-1.5 font-mono text-[10px] font-bold uppercase tracking-widest"
                style={{
                  borderColor: tool.accent
                    ? "var(--accent-lime-foreground)"
                    : "var(--ink)",
                }}
              >
                <span className="truncate">{tool.cta}</span>
              </div>
            </Link>
          ))}
        </section>

        {/* Footer pinned at fold bottom */}
        <footer className="mt-4 flex shrink-0 items-center justify-between gap-3 border-t-2 border-[var(--ink)] pt-3 font-mono text-[10px] uppercase tracking-widest sm:mt-5 sm:pt-4 sm:text-xs">
          <span className="truncate">※ Built with spite & semicolons</span>
          <div className="flex shrink-0 items-center gap-3 text-[var(--ink)]/60">
            <Link
              to="/docs"
              className="hover:text-[var(--ink)] hover:underline underline-offset-2"
            >
              Self-host →
            </Link>
            <span aria-hidden>·</span>
            <span>100% local · no tracking</span>
          </div>
        </footer>
      </div>
      {isBroken && <BrokenScreen key={mobileBreak} onReset={handleReset} intensity={intensity} />}
    </main>
  );
}
