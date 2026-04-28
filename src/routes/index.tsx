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
  description: string;
  to: "/imgconvert" | "/colors" | "/passwords";
  cta: string;
  accent?: boolean;
};

const TOOLS: Tool[] = [
  {
    number: "01",
    name: "WITNESS PROTECTION",
    tagline: "for HEICs",
    description:
      "Apple's proprietary HEIC files get a brand-new identity. Bulk-convert to JPG, PNG, or WEBP without uploading a single byte.",
    to: "/imgconvert",
    cta: "Relocate my HEICs →",
    accent: true,
  },
  {
    number: "02",
    name: "COLOR HEIST",
    tagline: "from any image",
    description:
      "Drop a photo. Walk away with its dominant swatches plus complementary, analogous, triadic, and monochrome palettes.",
    to: "/colors",
    cta: "Steal some colors →",
  },
  {
    number: "03",
    name: "PASSWORD FACTORY",
    tagline: "industrial strength",
    description:
      "Crank out passwords with toggles for length, symbols, ambiguous characters, and bulk batches. The kind your bank wishes you used.",
    to: "/passwords",
    cta: "Make me unhackable →",
  },
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
          <p className="mt-2 max-w-2xl font-display text-xs leading-snug sm:mt-3 sm:text-base">
            Dumb-simple things your browser can do without phoning home.
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

        {/* Tool grid — flex-1 so it fills remaining vertical space */}
        <section
          ref={gridRef}
          className="mt-4 grid flex-1 grid-cols-1 gap-3 sm:mt-5 sm:gap-5 md:grid-cols-3"
        >
          {TOOLS.map((tool) => (
            <Link
              key={tool.to}
              to={tool.to}
              data-reveal-scroll
              className="brutal-card group flex flex-col p-4 transition-transform duration-150 hover:-translate-x-[3px] hover:-translate-y-[3px] sm:p-5"
              style={
                tool.accent ? { background: "var(--accent-lime)" } : undefined
              }
            >
              <div className="flex items-start justify-between">
                <span className="font-mono text-[10px] font-bold tracking-widest opacity-70 sm:text-xs">
                  №{tool.number}
                </span>
                <span className="font-mono text-[10px] uppercase tracking-widest opacity-60">
                  {tool.to}
                </span>
              </div>

              <h2 className="mt-3 font-display text-xl font-bold leading-tight sm:mt-4 sm:text-2xl">
                {tool.name}
              </h2>
              <div className="mt-0.5 font-mono text-[10px] uppercase tracking-widest opacity-70 sm:text-xs">
                {tool.tagline}
              </div>

              <p className="mt-2 flex-1 font-display text-xs leading-snug sm:mt-3 sm:text-sm">
                {tool.description}
              </p>

              <div className="mt-3 inline-flex items-center justify-between border-t-2 border-[var(--ink)] pt-2 font-mono text-[10px] font-bold uppercase tracking-widest sm:text-xs">
                <span>{tool.cta}</span>
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
