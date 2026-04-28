import { useEffect, useRef, useState } from "react";

type Theme = "light" | "dark";

function getInitialTheme(): Theme {
  if (typeof window === "undefined") return "light";
  const stored = localStorage.getItem("theme") as Theme | null;
  if (stored === "light" || stored === "dark") return stored;
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function applyTheme(theme: Theme) {
  document.documentElement.classList.toggle("dark", theme === "dark");
}

export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>("light");
  const [mounted, setMounted] = useState(false);
  const btnRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    // Defer to after hydration completes to avoid mismatching <html>
    // className between SSR markup and client render.
    const id = window.requestAnimationFrame(() => {
      const t = getInitialTheme();
      setTheme(t);
      applyTheme(t);
      setMounted(true);
    });
    return () => window.cancelAnimationFrame(id);
  }, []);

  const toggle = async () => {
    const next: Theme = theme === "dark" ? "light" : "dark";
    localStorage.setItem("theme", next);

    const doc = document as Document & {
      startViewTransition?: (cb: () => void) => { ready: Promise<void>; finished: Promise<void> };
    };

    // Fallback if View Transitions API unavailable
    if (!doc.startViewTransition || !btnRef.current) {
      setTheme(next);
      applyTheme(next);
      return;
    }

    const rect = btnRef.current.getBoundingClientRect();
    const x = rect.left + rect.width / 2;
    const y = rect.top + rect.height / 2;
    const endRadius = Math.hypot(
      Math.max(x, window.innerWidth - x),
      Math.max(y, window.innerHeight - y)
    );

    // Mark direction so CSS can flip z-index of old/new layers
    const goingDark = next === "dark";
    document.documentElement.classList.toggle("theme-sweep-out", !goingDark);

    const transition = doc.startViewTransition(() => {
      setTheme(next);
      applyTheme(next);
    });

    try {
      await transition.ready;

      // When going dark: animate the NEW (dark) layer expanding in.
      // When going light: animate the OLD (dark) layer shrinking out,
      // revealing the new light layer beneath.
      const pseudo = goingDark
        ? "::view-transition-new(root)"
        : "::view-transition-old(root)";
      const keyframes = goingDark
        ? [
            { clipPath: `circle(0px at ${x}px ${y}px)` },
            { clipPath: `circle(${endRadius}px at ${x}px ${y}px)` },
          ]
        : [
            { clipPath: `circle(${endRadius}px at ${x}px ${y}px)` },
            { clipPath: `circle(0px at ${x}px ${y}px)` },
          ];

      document.documentElement.animate(keyframes, {
        duration: 650,
        easing: "cubic-bezier(0.83, 0, 0.17, 1)",
        pseudoElement: pseudo,
        fill: "both",
      });

      await transition.finished;
    } finally {
      document.documentElement.classList.remove("theme-sweep-out");
    }
  };

  return (
    <button
      ref={btnRef}
      onClick={toggle}
      aria-label="Toggle theme"
      className="h-10 w-10 flex items-center justify-center border-2 border-ink bg-paper hover:bg-[var(--accent-lime)] transition-colors brutal-card-sm"
    >
      {mounted ? (
        <span className="font-mono text-base font-bold leading-none">
          {theme === "dark" ? "☀" : "☾"}
        </span>
      ) : (
        <span className="font-mono text-base font-bold leading-none">·</span>
      )}
    </button>
  );
}
