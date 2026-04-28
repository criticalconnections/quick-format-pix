import { createFileRoute, Link } from "@tanstack/react-router";
import { ThemeToggle } from "@/components/ThemeToggle";
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
    tagline: "convert HEICs",
    to: "/imgconvert",
    accent: true,
  },
  { number: "02", name: "COLOR HEIST", tagline: "steal palettes", to: "/colors" },
  { number: "03", name: "PASSWORD FACTORY", tagline: "industrial strength", to: "/passwords" },
  { number: "04", name: "GETAWAY DRIVER", tagline: "shrink the evidence", to: "/compress" },
  { number: "05", name: "THE FENCE", tagline: "QR codes — move anything", to: "/qr" },
  { number: "06", name: "THE ALIBI", tagline: "strip metadata", to: "/strip", accent: true },
  { number: "07", name: "SHELL COMPANY", tagline: "base64 launderer", to: "/base64" },
  { number: "08", name: "THE FORGER", tagline: "favicon generator", to: "/favicon" },
];

function Landing() {
  const heroRef = usePageEnter<HTMLDivElement>();
  const gridRef = useScrollReveal<HTMLDivElement>();

  return (
    <main className="min-h-[100dvh]">
      <div className="mx-auto flex min-h-[100dvh] max-w-6xl flex-col px-4 py-3 sm:px-6 sm:py-5">
        {/* Top bar */}
        <header className="flex shrink-0 items-center justify-between">
          <div className="flex items-center gap-2 sm:gap-3">
            <div
              className="brutal-card-sm flex h-8 w-8 items-center justify-center font-mono text-[10px] font-bold sm:h-10 sm:w-10 sm:text-sm"
              style={{ background: "var(--accent-lime)" }}
            >
              T/S
            </div>
            <span className="font-mono text-[10px] uppercase tracking-widest sm:text-sm">
              toolshed.local
            </span>
          </div>
          <ThemeToggle />
        </header>

        {/* Hero — compressed */}
        <section ref={heroRef} className="mt-4 shrink-0 sm:mt-6">
          <div className="font-mono text-[10px] uppercase tracking-[0.25em] text-[var(--ink)]/70 sm:text-xs">
            ※ Browser-only · Zero accounts · Free forever*
          </div>
          <h1 className="mt-2 font-display text-[2.25rem] font-bold leading-[0.95] tracking-tight sm:mt-3 sm:text-6xl md:text-7xl">
            TINY TOOLS.{" "}
            <span
              className="inline-block px-2 sm:px-3"
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
              className="brutal-card group flex flex-col justify-between p-3 transition-transform duration-150 hover:-translate-x-[3px] hover:-translate-y-[3px] sm:p-4"
              style={
                tool.accent ? { background: "var(--accent-lime)" } : undefined
              }
            >
              <div className="flex items-start justify-between">
                <span className="font-mono text-[10px] font-bold tracking-widest opacity-70">
                  №{tool.number}
                </span>
                <span className="font-mono text-[9px] uppercase tracking-widest opacity-50">
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

              <div className="mt-3 flex items-center justify-end border-t-2 border-[var(--ink)] pt-1.5 font-mono text-[10px] font-bold uppercase tracking-widest opacity-80 transition-opacity group-hover:opacity-100">
                Open →
              </div>
            </Link>
          ))}
        </section>

        {/* Footer pinned at fold bottom */}
        <footer className="mt-4 flex shrink-0 items-center justify-between gap-3 border-t-2 border-[var(--ink)] pt-3 font-mono text-[10px] uppercase tracking-widest sm:mt-5 sm:pt-4 sm:text-xs">
          <span className="truncate">※ Built with spite & semicolons</span>
          <span className="shrink-0 text-[var(--ink)]/60">
            100% local · no tracking
          </span>
        </footer>
      </div>
    </main>
  );
}
