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
    <main className="min-h-screen">
      <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-10">
        {/* Top bar */}
        <header className="flex items-center justify-between">
          <div className="flex items-center gap-2 sm:gap-3">
            <div
              className="brutal-card-sm flex h-9 w-9 items-center justify-center font-mono text-xs font-bold sm:h-10 sm:w-10 sm:text-sm"
              style={{ background: "var(--accent-lime)" }}
            >
              T/S
            </div>
            <span className="font-mono text-xs uppercase tracking-widest sm:text-sm">
              toolshed.local
            </span>
          </div>
          <ThemeToggle />
        </header>

        {/* Hero */}
        <section ref={heroRef} className="mt-10 sm:mt-16">
          <div className="font-mono text-xs uppercase tracking-[0.25em] text-[var(--ink)]/70">
            ※ Est. right now · Browser-only · Zero accounts
          </div>
          <h1 className="mt-4 font-display text-5xl font-bold leading-[0.95] tracking-tight sm:text-7xl md:text-8xl">
            TINY TOOLS.
            <br />
            <span className="inline-block px-2 sm:px-3" style={{ background: "var(--accent-lime)" }}>
              BIG ATTITUDE.
            </span>
          </h1>
          <p className="mt-6 max-w-2xl font-display text-base leading-relaxed sm:text-lg">
            A toolshed of dumb-simple things your browser can do without phoning
            home. No uploads. No sign-ups. No 14-day free trials that quietly
            renew at $79/mo.
          </p>

          <div className="mt-8 flex flex-wrap items-center gap-3 font-mono text-xs uppercase tracking-widest">
            <span className="brutal-card-sm px-3 py-1.5">100% local</span>
            <span className="brutal-card-sm px-3 py-1.5">no tracking</span>
            <span className="brutal-card-sm px-3 py-1.5">free forever*</span>
            <span className="text-[var(--ink)]/50">*until we get bored</span>
          </div>
        </section>

        {/* Divider */}
        <div className="mt-14 flex items-center gap-4 sm:mt-20">
          <div className="h-[2px] flex-1 bg-[var(--ink)]" />
          <span className="font-mono text-xs uppercase tracking-[0.3em]">
            // The Tools
          </span>
          <div className="h-[2px] flex-1 bg-[var(--ink)]" />
        </div>

        {/* Tool grid */}
        <section
          ref={gridRef}
          className="mt-8 grid grid-cols-1 gap-6 sm:gap-7 md:grid-cols-3"
        >
          {TOOLS.map((tool) => (
            <article
              key={tool.to}
              data-reveal-scroll
              className="brutal-card group flex flex-col p-5 transition-transform duration-150 hover:-translate-x-[3px] hover:-translate-y-[3px] sm:p-6"
              style={
                tool.accent ? { background: "var(--accent-lime)" } : undefined
              }
            >
              <div className="flex items-start justify-between">
                <span className="font-mono text-xs font-bold tracking-widest opacity-70">
                  №{tool.number}
                </span>
                <span className="font-mono text-[10px] uppercase tracking-widest opacity-60">
                  /{tool.to.slice(1)}
                </span>
              </div>

              <h2 className="mt-5 font-display text-2xl font-bold leading-tight sm:text-3xl">
                {tool.name}
              </h2>
              <div className="mt-1 font-mono text-xs uppercase tracking-widest opacity-70">
                {tool.tagline}
              </div>

              <p className="mt-4 flex-1 font-display text-sm leading-relaxed sm:text-base">
                {tool.description}
              </p>

              <Link
                to={tool.to}
                className="brutal-card-sm mt-6 inline-flex items-center justify-between bg-[var(--paper)] px-4 py-3 font-mono text-xs font-bold uppercase tracking-widest transition-transform duration-150 hover:-translate-x-[2px] hover:-translate-y-[2px]"
              >
                <span>{tool.cta}</span>
              </Link>
            </article>
          ))}
        </section>

        {/* Manifesto */}
        <section className="mt-16 grid grid-cols-1 gap-6 sm:mt-24 md:grid-cols-3">
          <div className="md:col-span-1">
            <h3 className="font-display text-3xl font-bold leading-tight sm:text-4xl">
              Why does this exist?
            </h3>
          </div>
          <div className="space-y-4 font-display text-base leading-relaxed md:col-span-2">
            <p>
              Because every "free online converter" wants your email, your
              firstborn, and a Pro subscription before it'll touch your photo of
              a sandwich.
            </p>
            <p>
              These tools run entirely in your browser. Files never leave your
              machine. There is no "server." There is no "us." There is just
              JavaScript doing its job, quietly.
            </p>
          </div>
        </section>

        {/* Footer */}
        <footer className="mt-16 flex flex-col items-start justify-between gap-3 border-t-2 border-[var(--ink)] pt-6 font-mono text-xs uppercase tracking-widest sm:flex-row sm:items-center sm:mt-20">
          <span>※ Built with spite & semicolons</span>
          <div className="flex gap-4">
            <Link to="/imgconvert" className="underline-offset-4 hover:underline">
              heic
            </Link>
            <Link to="/colors" className="underline-offset-4 hover:underline">
              colors
            </Link>
            <Link to="/passwords" className="underline-offset-4 hover:underline">
              passwords
            </Link>
          </div>
        </footer>
      </div>
    </main>
  );
}
