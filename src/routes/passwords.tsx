import { useCallback, useEffect, useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ThemeToggle } from "@/components/ThemeToggle";
import { usePageEnter, useScrollReveal } from "@/lib/animations";

export const Route = createFileRoute("/passwords")({
  head: () => ({
    meta: [
      { title: "Password Generator — Strong, Custom Passwords in your Browser" },
      {
        name: "description",
        content:
          "Generate cryptographically strong passwords. Tune length, character sets, exclusions, and bulk-generate. Nothing leaves your browser.",
      },
      { property: "og:title", content: "Password Generator — Strong & Custom" },
      {
        property: "og:description",
        content:
          "Roll bulletproof passwords with full control over length, symbols, ambiguity and bulk count. 100% local.",
      },
    ],
  }),
  component: PasswordsPage,
});

const LOWER = "abcdefghijklmnopqrstuvwxyz";
const UPPER = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
const DIGITS = "0123456789";
const SYMBOLS = "!@#$%^&*()-_=+[]{};:,.<>/?~";
const AMBIGUOUS = "Il1O0o";

interface Options {
  length: number;
  lower: boolean;
  upper: boolean;
  digits: boolean;
  symbols: boolean;
  excludeAmbiguous: boolean;
  noRepeats: boolean;
  custom: string; // extra characters to include
  exclude: string; // characters to remove
  count: number;
}

const DEFAULT_OPTS: Options = {
  length: 20,
  lower: true,
  upper: true,
  digits: true,
  symbols: true,
  excludeAmbiguous: false,
  noRepeats: false,
  custom: "",
  exclude: "",
  count: 5,
};

function buildAlphabet(opts: Options): string {
  let pool = "";
  if (opts.lower) pool += LOWER;
  if (opts.upper) pool += UPPER;
  if (opts.digits) pool += DIGITS;
  if (opts.symbols) pool += SYMBOLS;
  if (opts.custom) pool += opts.custom;
  // dedupe
  pool = Array.from(new Set(pool.split(""))).join("");
  if (opts.excludeAmbiguous) {
    pool = pool
      .split("")
      .filter((c) => !AMBIGUOUS.includes(c))
      .join("");
  }
  if (opts.exclude) {
    const ex = new Set(opts.exclude.split(""));
    pool = pool
      .split("")
      .filter((c) => !ex.has(c))
      .join("");
  }
  return pool;
}

function randomInt(max: number): number {
  // Cryptographically secure random index in [0, max).
  const buf = new Uint32Array(1);
  const limit = Math.floor(0xffffffff / max) * max;
  // Reject biased values for uniform distribution.
  while (true) {
    crypto.getRandomValues(buf);
    if (buf[0] < limit) return buf[0] % max;
  }
}

function generateOne(opts: Options): string {
  const alphabet = buildAlphabet(opts);
  if (alphabet.length === 0) return "";

  // Required sets — at least one char from each enabled category.
  const required: string[] = [];
  const pickFrom = (set: string) => {
    let filtered = set;
    if (opts.excludeAmbiguous) filtered = filtered.replace(/[Il1O0o]/g, "");
    if (opts.exclude) {
      const ex = new Set(opts.exclude.split(""));
      filtered = filtered
        .split("")
        .filter((c) => !ex.has(c))
        .join("");
    }
    if (opts.custom) {
      // custom chars don't need filtering since user provided them
    }
    if (filtered.length === 0) return null;
    return filtered[randomInt(filtered.length)];
  };

  if (opts.lower) {
    const c = pickFrom(LOWER);
    if (c) required.push(c);
  }
  if (opts.upper) {
    const c = pickFrom(UPPER);
    if (c) required.push(c);
  }
  if (opts.digits) {
    const c = pickFrom(DIGITS);
    if (c) required.push(c);
  }
  if (opts.symbols) {
    const c = pickFrom(SYMBOLS);
    if (c) required.push(c);
  }

  const len = Math.max(opts.length, required.length);
  const out: string[] = [...required];

  let attempts = 0;
  while (out.length < len) {
    const c = alphabet[randomInt(alphabet.length)];
    if (opts.noRepeats && out.includes(c)) {
      attempts++;
      if (attempts > 5000) break;
      continue;
    }
    out.push(c);
  }

  // Fisher-Yates shuffle so the required chars aren't always at the front.
  for (let i = out.length - 1; i > 0; i--) {
    const j = randomInt(i + 1);
    [out[i], out[j]] = [out[j], out[i]];
  }

  return out.join("");
}

function entropyBits(opts: Options, length: number): number {
  const pool = buildAlphabet(opts).length;
  if (pool < 2) return 0;
  return Math.round(length * Math.log2(pool));
}

function strengthLabel(bits: number): { label: string; color: string; pct: number } {
  if (bits < 40) return { label: "WEAK", color: "oklch(0.65 0.22 25)", pct: 25 };
  if (bits < 60) return { label: "OKAY", color: "oklch(0.78 0.18 70)", pct: 50 };
  if (bits < 90) return { label: "STRONG", color: "oklch(0.82 0.2 145)", pct: 75 };
  return { label: "FORTRESS", color: "var(--accent-lime)", pct: 100 };
}

function PasswordsPage() {
  const [opts, setOpts] = useState<Options>(DEFAULT_OPTS);
  const [passwords, setPasswords] = useState<string[]>([]);
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);

  const update = useCallback(<K extends keyof Options>(key: K, value: Options[K]) => {
    setOpts((p) => ({ ...p, [key]: value }));
  }, []);

  const generate = useCallback(() => {
    const alphabet = buildAlphabet(opts);
    if (alphabet.length === 0) {
      setPasswords([]);
      return;
    }
    const list = Array.from({ length: opts.count }, () => generateOne(opts));
    setPasswords(list);
  }, [opts]);

  // Generate once on mount and whenever options change.
  useEffect(() => {
    generate();
  }, [generate]);

  const bits = useMemo(() => entropyBits(opts, opts.length), [opts]);
  const strength = strengthLabel(bits);
  const alphabetSize = useMemo(() => buildAlphabet(opts).length, [opts]);
  const noCharsets = !opts.lower && !opts.upper && !opts.digits && !opts.symbols && !opts.custom;

  const copy = (text: string, idx: number) => {
    void navigator.clipboard.writeText(text).then(() => {
      setCopiedIdx(idx);
      setTimeout(() => setCopiedIdx(null), 1200);
    });
  };

  const copyAll = () => {
    void navigator.clipboard.writeText(passwords.join("\n")).then(() => {
      setCopiedIdx(-1);
      setTimeout(() => setCopiedIdx(null), 1200);
    });
  };

  const pageRef = usePageEnter<HTMLElement>();
  const revealRoot = useScrollReveal<HTMLElement>("[data-reveal-scroll]", [passwords.length]);
  const setRefs = (node: HTMLElement | null) => {
    pageRef.current = node;
    revealRoot.current = node;
  };

  const [showAdvanced, setShowAdvanced] = useState(false);

  return (
    <main ref={setRefs} className="min-h-screen">
      <div className="mx-auto max-w-5xl px-3 sm:px-6 py-3 sm:py-6">
        {/* Above-the-fold viewport: header + basics */}
        <div className="min-h-[calc(100dvh-1.5rem)] sm:min-h-[calc(100dvh-3rem)] flex flex-col gap-3 sm:gap-4">
          {/* Header — compact */}
          <header data-reveal>
            <div className="flex items-center justify-between mb-2 sm:mb-3 gap-3">
              <Link
                to="/"
                className="font-mono text-[10px] sm:text-xs uppercase tracking-widest border-2 border-ink px-2.5 py-1 hover:bg-ink hover:text-paper"
              >
                ← Back
              </Link>
              <ThemeToggle />
            </div>
            <h1 className="font-display text-2xl sm:text-5xl md:text-6xl font-bold tracking-tighter leading-[0.95]">
              UNCRACKABLE{" "}
              <span className="bg-[var(--accent-lime)] px-1.5 sm:px-2 inline-block">
                PASSWORDS
              </span>{" "}
              ON DEMAND.
            </h1>
          </header>

          {/* Output */}
          <section data-reveal className="brutal-card p-3 sm:p-5">
            <div className="flex items-center justify-between mb-2.5 sm:mb-3 gap-2 flex-wrap">
              <div className="font-mono text-[10px] sm:text-xs uppercase tracking-widest">
                Output · {opts.count}
              </div>
              <div className="flex gap-1.5 sm:gap-2">
                <button
                  onClick={copyAll}
                  disabled={passwords.length === 0}
                  className="font-mono text-[10px] uppercase tracking-widest border-2 border-ink px-2.5 sm:px-3 py-1.5 hover:bg-[var(--accent-lime)] disabled:opacity-30"
                >
                  {copiedIdx === -1 ? "✓ All" : "Copy all"}
                </button>
                <button
                  onClick={generate}
                  className="font-display font-bold text-xs sm:text-sm uppercase border-2 border-ink px-3 sm:px-4 py-1.5 bg-ink text-paper hover:bg-[var(--accent-lime)] hover:text-ink"
                >
                  ↻ Re-roll
                </button>
              </div>
            </div>

            {noCharsets ? (
              <div
                className="brutal-card-sm p-3 font-mono text-xs"
                style={{ background: "color-mix(in oklch, var(--destructive) 18%, var(--paper))" }}
              >
                ! Pick at least one character set below.
              </div>
            ) : (
              <ul
                className="space-y-1.5 overflow-y-auto pr-1"
                style={{ maxHeight: "min(28dvh, 320px)" }}
              >
                {passwords.map((pw, i) => (
                  <li
                    key={i}
                    className="brutal-card-sm p-2 sm:p-2.5 flex items-center justify-between gap-2"
                  >
                    <code className="font-mono text-[11px] sm:text-sm break-all select-all">
                      {pw || "—"}
                    </code>
                    <button
                      onClick={() => copy(pw, i)}
                      className="font-mono text-[10px] uppercase tracking-widest border border-ink px-2 py-1 hover:bg-ink hover:text-paper shrink-0"
                    >
                      {copiedIdx === i ? "✓" : "Copy"}
                    </button>
                  </li>
                ))}
              </ul>
            )}

            {/* Strength meter */}
            <div className="mt-2.5 sm:mt-3 pt-2.5 sm:pt-3 border-t-2 border-ink">
              <div className="flex justify-between font-mono text-[10px] uppercase tracking-widest mb-1.5 sm:mb-2 gap-2">
                <span className="truncate">Strength · {strength.label}</span>
                <span className="shrink-0">
                  {bits} bits · pool {alphabetSize}
                </span>
              </div>
              <div className="h-2.5 sm:h-3 border-2 border-ink overflow-hidden bg-paper">
                <div
                  className="h-full transition-all duration-500 ease-out"
                  style={{ width: `${strength.pct}%`, background: strength.color }}
                />
              </div>
            </div>
          </section>

          {/* Basics: length + charsets */}
          <section data-reveal className="grid lg:grid-cols-2 gap-3 sm:gap-4 flex-1">
            {/* Length */}
            <div className="brutal-card-sm p-3 sm:p-5">
              <div className="font-mono text-[10px] sm:text-xs uppercase tracking-widest mb-2 sm:mb-3 flex justify-between">
                <span>01 / Length</span>
                <span>{opts.length}</span>
              </div>
              <input
                type="range"
                min={4}
                max={128}
                value={opts.length}
                onChange={(e) => update("length", parseInt(e.target.value))}
                className="w-full accent-[var(--accent-lime)]"
              />
              <div className="flex flex-wrap gap-1.5 sm:gap-2 mt-2 sm:mt-3">
                {[8, 12, 16, 20, 32, 64].map((n) => (
                  <button
                    key={n}
                    onClick={() => update("length", n)}
                    className={`font-mono text-[11px] sm:text-xs border-2 border-ink px-2 sm:px-2.5 py-1 ${
                      opts.length === n ? "bg-ink text-paper" : "hover:bg-[var(--accent-lime)]"
                    }`}
                  >
                    {n}
                  </button>
                ))}
              </div>
            </div>

            {/* Character sets */}
            <div className="brutal-card-sm p-3 sm:p-5">
              <div className="font-mono text-[10px] sm:text-xs uppercase tracking-widest mb-2 sm:mb-3">
                02 / Character sets
              </div>
              <div className="grid grid-cols-2 gap-1.5 sm:gap-2">
                <Toggle label="a-z" checked={opts.lower} onChange={(v) => update("lower", v)} />
                <Toggle label="A-Z" checked={opts.upper} onChange={(v) => update("upper", v)} />
                <Toggle label="0-9" checked={opts.digits} onChange={(v) => update("digits", v)} />
                <Toggle label="!@#$" checked={opts.symbols} onChange={(v) => update("symbols", v)} />
              </div>
            </div>
          </section>

          {/* Advanced toggle — anchored at bottom of fold */}
          <button
            onClick={() => setShowAdvanced((v) => !v)}
            className="brutal-card-sm py-2.5 sm:py-3 px-3 sm:px-4 font-display font-bold text-xs sm:text-sm uppercase tracking-tight flex items-center justify-between hover:bg-[var(--accent-lime)] transition-colors"
            data-reveal
            aria-expanded={showAdvanced}
          >
            <span>{showAdvanced ? "Hide" : "Show"} advanced settings</span>
            <span
              className="font-mono text-base transition-transform"
              style={{ transform: showAdvanced ? "rotate(180deg)" : "none" }}
            >
              ▾
            </span>
          </button>
        </div>

        {/* Advanced (collapsible) */}
        {showAdvanced && (
          <div className="mt-6 space-y-6 animate-fade-in">
            {/* Rules */}
            <section className="brutal-card-sm p-5 sm:p-6">
              <div className="font-mono text-xs uppercase tracking-widest mb-4">03 / Rules</div>
              <div className="space-y-3">
                <Toggle
                  label="Exclude ambiguous"
                  hint={`Remove look-alikes: ${AMBIGUOUS}`}
                  checked={opts.excludeAmbiguous}
                  onChange={(v) => update("excludeAmbiguous", v)}
                />
                <Toggle
                  label="No repeating characters"
                  hint="Each character appears at most once"
                  checked={opts.noRepeats}
                  onChange={(v) => update("noRepeats", v)}
                />
              </div>
              <div className="grid sm:grid-cols-2 gap-3 mt-4">
                <div>
                  <label className="font-mono text-[10px] uppercase tracking-widest block mb-1">
                    Extra characters to include
                  </label>
                  <input
                    type="text"
                    value={opts.custom}
                    onChange={(e) => update("custom", e.target.value)}
                    placeholder="e.g. €£¥"
                    className="w-full border-2 border-ink bg-paper px-3 py-2 font-mono text-sm focus:outline-none focus:bg-[var(--accent-lime)]"
                  />
                </div>
                <div>
                  <label className="font-mono text-[10px] uppercase tracking-widest block mb-1">
                    Characters to exclude
                  </label>
                  <input
                    type="text"
                    value={opts.exclude}
                    onChange={(e) => update("exclude", e.target.value)}
                    placeholder="e.g. <>&"
                    className="w-full border-2 border-ink bg-paper px-3 py-2 font-mono text-sm focus:outline-none focus:bg-[var(--accent-lime)]"
                  />
                </div>
              </div>
            </section>

            {/* Bulk count */}
            <section className="brutal-card-sm p-5 sm:p-6">
              <div className="font-mono text-xs uppercase tracking-widest mb-3 flex justify-between">
                <span>04 / Bulk count</span>
                <span>{opts.count}</span>
              </div>
              <input
                type="range"
                min={1}
                max={50}
                value={opts.count}
                onChange={(e) => update("count", parseInt(e.target.value))}
                className="w-full accent-[var(--accent-lime)]"
              />
              <div className="font-mono text-[10px] text-ink/50 mt-2">
                Generate up to 50 at once. Re-roll any time.
              </div>
            </section>

            {/* Footer */}
            <footer
              className="brutal-card-sm p-5"
              style={{ background: "var(--ink)", color: "var(--paper)" }}
            >
              <div className="font-mono text-xs uppercase tracking-widest mb-1">
                ⚙ How it works
              </div>
              <div className="font-mono text-xs leading-relaxed">
                Random bytes come from <code>window.crypto.getRandomValues</code> — the browser's
                cryptographically secure RNG — with rejection sampling for a uniform distribution.
                Nothing is sent over the network. Close the tab and the passwords are gone.
              </div>
            </footer>
          </div>
        )}
      </div>
    </main>
  );
}

function Toggle({
  label,
  hint,
  checked,
  onChange,
}: {
  label: string;
  hint?: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={`text-left border-2 border-ink p-3 transition-all flex items-start gap-3 ${
        checked ? "bg-[var(--accent-lime)]" : "bg-paper hover:bg-paper/70"
      }`}
    >
      <span
        className={`mt-0.5 h-5 w-5 shrink-0 border-2 border-ink flex items-center justify-center font-mono text-xs ${
          checked ? "bg-ink text-paper" : "bg-paper"
        }`}
      >
        {checked ? "✓" : ""}
      </span>
      <span className="min-w-0">
        <span className="font-display font-bold text-sm block">{label}</span>
        {hint && (
          <span className="font-mono text-[10px] text-ink/60 block truncate">{hint}</span>
        )}
      </span>
    </button>
  );
}
