import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ThemeToggle } from "@/components/ThemeToggle";
import { usePageEnter, useScrollReveal } from "@/lib/animations";

export const Route = createFileRoute("/docs")({
  head: () => ({
    meta: [
      { title: "Safe House — Host TOOLSHED yourself" },
      {
        name: "description",
        content:
          "Run TOOLSHED on your own machine. Docker or bare metal, your call. No accounts, no telemetry, no rent.",
      },
      { property: "og:title", content: "Safe House — Self-host TOOLSHED" },
      {
        property: "og:description",
        content:
          "Spin up TOOLSHED on your own box in one command. Docker or self-hosted bun.",
      },
    ],
  }),
  component: DocsPage,
});

function CodeBlock({ code, label }: { code: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 1200);
  };
  return (
    <div className="brutal-card-sm bg-paper">
      <div className="flex items-center justify-between border-b-2 border-[var(--ink)] px-3 py-1.5 font-mono text-[10px] uppercase tracking-widest">
        <span className="opacity-70">{label ?? "// shell"}</span>
        <button
          onClick={copy}
          className="border-2 border-[var(--ink)] bg-paper px-2 py-0.5 hover:bg-[var(--accent-lime)]"
        >
          {copied ? "Copied!" : "Copy"}
        </button>
      </div>
      <pre className="overflow-x-auto p-3 font-mono text-[11px] leading-relaxed sm:text-xs">
        <code>{code}</code>
      </pre>
    </div>
  );
}

function Step({
  number,
  title,
  tagline,
  children,
  accent,
}: {
  number: string;
  title: string;
  tagline: string;
  children: React.ReactNode;
  accent?: boolean;
}) {
  return (
    <section
      data-reveal-scroll
      className="brutal-card flex flex-col p-4 sm:p-5"
      style={
        accent
          ? {
              background: "var(--accent-lime)",
              color: "var(--accent-lime-foreground)",
            }
          : undefined
      }
    >
      <div className="flex items-start justify-between">
        <span className="font-mono text-[10px] font-bold tracking-widest opacity-70">
          №{number}
        </span>
        <span className="font-mono text-[9px] uppercase tracking-widest opacity-60">
          {tagline}
        </span>
      </div>
      <h2 className="mt-3 font-display text-xl font-bold leading-[1.05] sm:text-2xl md:text-3xl">
        {title}
      </h2>
      <div className="mt-3 space-y-3 font-display text-xs leading-snug sm:text-sm">
        {children}
      </div>
    </section>
  );
}

function DocsPage() {
  const heroRef = usePageEnter<HTMLDivElement>();
  const gridRef = useScrollReveal<HTMLDivElement>();

  return (
    <main className="min-h-[100dvh]">
      <div className="mx-auto flex min-h-[100dvh] max-w-5xl flex-col px-4 py-4 sm:px-6 sm:py-6">
        {/* Top bar */}
        <header className="flex shrink-0 items-center justify-between">
          <Link
            to="/"
            className="brutal-card-sm bg-paper px-3 py-1.5 font-mono text-[10px] uppercase tracking-widest hover:bg-[var(--accent-lime)] sm:text-xs"
          >
            ← Toolshed
          </Link>
          <ThemeToggle />
        </header>

        {/* Hero */}
        <section ref={heroRef} className="mt-4 shrink-0 sm:mt-6">
          <div className="font-mono text-[10px] uppercase tracking-[0.25em] text-[var(--ink)]/70 sm:text-xs">
            ※ Docs · Self-hosting · No rent
          </div>
          <h1 className="mt-2 font-display text-[2.25rem] font-bold leading-[0.95] tracking-tight sm:mt-3 sm:text-6xl md:text-7xl">
            SAFE{" "}
            <span
              className="inline-block px-2 sm:px-3"
              style={{ background: "var(--accent-lime)" }}
            >
              HOUSE.
            </span>
          </h1>
          <p className="mt-2 max-w-3xl font-display text-xs leading-snug sm:mt-3 sm:text-sm md:text-base">
            Pull TOOLSHED off the grid and onto your own box. One script,
            two flavors — Docker for the clean getaway, or bare-metal bun if
            you like to feel the pavement. Same tools. Same attitude. Now
            with your hostname on the door.
          </p>

          <div className="mt-3 flex flex-wrap gap-2 font-mono text-[10px] uppercase tracking-widest sm:text-xs">
            <span className="brutal-card-sm bg-paper px-2 py-1">
              ✓ 100% local
            </span>
            <span className="brutal-card-sm bg-paper px-2 py-1">
              ✓ Zero telemetry
            </span>
            <span
              className="brutal-card-sm px-2 py-1"
              style={{ background: "var(--accent-lime)" }}
            >
              ✓ One command
            </span>
            <span className="brutal-card-sm bg-paper px-2 py-1">
              ✓ Stop anytime
            </span>
          </div>
        </section>

        {/* Divider */}
        <div className="mt-5 flex shrink-0 items-center gap-3 sm:mt-7">
          <div className="h-[2px] flex-1 bg-[var(--ink)]" />
          <span className="font-mono text-[10px] uppercase tracking-[0.3em] sm:text-xs">
            // The Setup
          </span>
          <div className="h-[2px] flex-1 bg-[var(--ink)]" />
        </div>

        {/* Steps */}
        <section ref={gridRef} className="mt-4 grid flex-1 gap-3 sm:mt-5 sm:gap-4">
          <Step
            number="00"
            title="GRAB THE KEYS"
            tagline="clone the joint"
            accent
          >
            <p>
              First, you need the source. Clone it down, walk through the
              front door, and let the installer do the rest.
            </p>
            <CodeBlock
              label="// clone & enter"
              code={`git clone https://github.com/criticalconnections/quick-format-pix.git toolshed
cd toolshed`}
            />
          </Step>

          <Step
            number="01"
            title="DOCKER ROUTE"
            tagline="containerized, clean exit"
          >
            <p>
              The professional move. Builds an image, runs the container in
              the background on port <code className="font-mono">8665</code>,
              auto-restarts unless you say otherwise. No fingerprints on
              your host system.
            </p>
            <CodeBlock label="// docker getaway" code={`./install.sh docker`} />
            <p className="font-mono text-[11px] opacity-80 sm:text-xs">
              Then point a browser at{" "}
              <span className="bg-[var(--ink)] px-1.5 py-0.5 text-[var(--paper)]">
                http://localhost:8665
              </span>{" "}
              and you're in business.
            </p>
          </Step>

          <Step
            number="02"
            title="BARE METAL"
            tagline="self-hosted with bun"
            accent
          >
            <p>
              No containers, no middleman. The script checks for{" "}
              <code className="font-mono">bun</code>, offers to install it
              if it's missing, drops dependencies, and boots the dev server
              straight on your machine.
            </p>
            <CodeBlock
              label="// run on the host"
              code={`./install.sh self-hosted`}
            />
            <p className="font-mono text-[11px] opacity-80 sm:text-xs">
              Ctrl-C kills it. No daemons, no cron, no leftovers.
            </p>
          </Step>

          <Step
            number="03"
            title="PICK YOUR DOOR"
            tagline="custom port"
          >
            <p>
              Default port is <code className="font-mono">8665</code>. If
              that's already taken — or you just like a different number —
              set <code className="font-mono">TOOLSHED_PORT</code> before
              running.
            </p>
            <CodeBlock
              label="// custom port"
              code={`TOOLSHED_PORT=4040 ./install.sh docker`}
            />
            <p>
              Or run with no arguments to get an interactive picker that
              prompts for mode and port.
            </p>
            <CodeBlock label="// interactive" code={`./install.sh`} />
          </Step>

          <Step
            number="04"
            title="CLEAN GETAWAY"
            tagline="stop the container"
            accent
          >
            <p>
              When you're done, leave nothing behind. This stops and
              removes the container in one shot.
            </p>
            <CodeBlock label="// stop docker" code={`./install.sh stop`} />
            <p className="font-mono text-[11px] opacity-80 sm:text-xs">
              For self-hosted runs, just hit Ctrl-C in the terminal where
              it's running. That's the whole exit strategy.
            </p>
          </Step>

          <Step
            number="05"
            title="THE SMALL PRINT"
            tagline="receipts & caveats"
          >
            <ul className="list-none space-y-1.5 font-mono text-[11px] uppercase tracking-wider sm:text-xs">
              <li>
                ▸ Bundle is a Cloudflare Workers build —{" "}
                <code className="lowercase tracking-normal">bun run build</code>{" "}
                if you want to deploy to Workers.
              </li>
              <li>
                ▸ Self-hosted mode runs the Vite dev server (Workers
                runtime emulated). Fine for personal use.
              </li>
              <li>
                ▸ Everything still happens in the user's browser — the
                server only ships HTML, CSS, and JS.
              </li>
              <li>
                ▸ Need Docker? Get it at{" "}
                <a
                  className="underline underline-offset-2 hover:bg-[var(--accent-lime)]"
                  href="https://docs.docker.com/get-docker/"
                  target="_blank"
                  rel="noreferrer"
                >
                  docker.com
                </a>
                . Need bun? See{" "}
                <a
                  className="underline underline-offset-2 hover:bg-[var(--accent-lime)]"
                  href="https://bun.sh"
                  target="_blank"
                  rel="noreferrer"
                >
                  bun.sh
                </a>
                .
              </li>
            </ul>
          </Step>
        </section>

        {/* Footer */}
        <footer className="mt-5 flex shrink-0 items-center justify-between gap-3 border-t-2 border-[var(--ink)] pt-3 font-mono text-[10px] uppercase tracking-widest sm:mt-6 sm:pt-4 sm:text-xs">
          <span className="truncate">※ Built with spite & semicolons</span>
          <span className="shrink-0 text-[var(--ink)]/60">
            100% local · no tracking
          </span>
        </footer>
      </div>
    </main>
  );
}
