import { useEffect, useRef } from "react";

interface BrokenScreenProps {
  onReset: () => void;
}

/**
 * Full-screen "cracked glass" overlay. Procedurally draws a fracture pattern
 * onto a canvas and overlays a dismiss prompt. Esc / click / any key resets.
 */
export function BrokenScreen({ onReset }: BrokenScreenProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const draw = () => {
      const dpr = window.devicePixelRatio || 1;
      const w = window.innerWidth;
      const h = window.innerHeight;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      canvas.style.width = w + "px";
      canvas.style.height = h + "px";
      const ctx = canvas.getContext("2d")!;
      ctx.scale(dpr, dpr);
      ctx.clearRect(0, 0, w, h);

      // Impact point — random near center
      const cx = w / 2 + (Math.random() - 0.5) * w * 0.2;
      const cy = h / 2 + (Math.random() - 0.5) * h * 0.2;

      // White flash highlight at impact
      const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, 200);
      grad.addColorStop(0, "rgba(255,255,255,0.9)");
      grad.addColorStop(0.4, "rgba(255,255,255,0.2)");
      grad.addColorStop(1, "rgba(255,255,255,0)");
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, w, h);

      ctx.lineCap = "round";
      ctx.lineJoin = "round";

      // Primary radial cracks
      const radials = 14;
      const tips: { x: number; y: number; angle: number }[] = [];
      for (let i = 0; i < radials; i++) {
        const angle = (i / radials) * Math.PI * 2 + (Math.random() - 0.5) * 0.3;
        let x = cx;
        let y = cy;
        let len = 0;
        const maxLen = Math.max(w, h) * (0.6 + Math.random() * 0.5);
        ctx.beginPath();
        ctx.moveTo(x, y);
        let curAngle = angle;
        while (len < maxLen) {
          const seg = 18 + Math.random() * 35;
          curAngle += (Math.random() - 0.5) * 0.4;
          x += Math.cos(curAngle) * seg;
          y += Math.sin(curAngle) * seg;
          len += seg;
          ctx.lineTo(x, y);
        }
        ctx.strokeStyle = `rgba(20,20,25,${0.7 + Math.random() * 0.3})`;
        ctx.lineWidth = 0.6 + Math.random() * 1.8;
        ctx.stroke();
        tips.push({ x, y, angle: curAngle });

        // Bright highlight along crack
        ctx.strokeStyle = "rgba(255,255,255,0.35)";
        ctx.lineWidth = 0.4;
        ctx.stroke();
      }

      // Concentric polygonal rings connecting nearby cracks
      const rings = 5;
      for (let r = 1; r <= rings; r++) {
        const ringR = (Math.max(w, h) * r) / (rings * 2.2);
        ctx.beginPath();
        for (let i = 0; i < radials; i++) {
          const angle = (i / radials) * Math.PI * 2;
          const jitter = ringR * (0.85 + Math.random() * 0.3);
          const x = cx + Math.cos(angle) * jitter;
          const y = cy + Math.sin(angle) * jitter;
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.closePath();
        ctx.strokeStyle = `rgba(20,20,25,${0.5 - r * 0.06})`;
        ctx.lineWidth = 0.4 + Math.random() * 0.8;
        ctx.stroke();
      }

      // Tiny stray hairline cracks
      for (let i = 0; i < 60; i++) {
        const sx = Math.random() * w;
        const sy = Math.random() * h;
        ctx.beginPath();
        ctx.moveTo(sx, sy);
        ctx.lineTo(
          sx + (Math.random() - 0.5) * 80,
          sy + (Math.random() - 0.5) * 80,
        );
        ctx.strokeStyle = `rgba(20,20,25,${0.2 + Math.random() * 0.4})`;
        ctx.lineWidth = 0.3;
        ctx.stroke();
      }
    };

    draw();
    window.addEventListener("resize", draw);
    return () => window.removeEventListener("resize", draw);
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      e.preventDefault();
      onReset();
    };
    window.addEventListener("keydown", onKey, { once: true });
    return () => window.removeEventListener("keydown", onKey);
  }, [onReset]);

  return (
    <>
      {/* Shake everything except the overlay */}
      <style>{`
        @keyframes ts-shake {
          0% { transform: translate(0,0); }
          15% { transform: translate(-8px, 6px) rotate(-0.4deg); }
          30% { transform: translate(7px, -5px) rotate(0.3deg); }
          45% { transform: translate(-5px, -7px) rotate(-0.2deg); }
          60% { transform: translate(6px, 4px) rotate(0.2deg); }
          75% { transform: translate(-3px, 3px); }
          100% { transform: translate(0,0); }
        }
        body > #app, body > div:first-of-type, main {
          animation: ts-shake 0.55s cubic-bezier(.36,.07,.19,.97) both;
        }
      `}</style>

      <div
        onClick={onReset}
        className="fixed inset-0 z-[9999] cursor-pointer select-none"
        role="alertdialog"
        aria-label="Screen broken — press any key to repair"
      >
        <canvas
          ref={canvasRef}
          className="absolute inset-0 h-full w-full"
        />
        <div className="pointer-events-none absolute inset-0 flex items-end justify-center p-6 sm:p-10">
          <div
            className="brutal-card flex items-center gap-3 px-4 py-3 font-mono text-xs uppercase tracking-widest sm:text-sm"
            style={{ background: "var(--paper)", color: "var(--ink)" }}
          >
            <span
              className="brutal-card-sm px-2 py-0.5 text-[10px]"
              style={{ background: "var(--accent-lime)" }}
            >
              ⚠ ERR_SCREEN_BROKEN
            </span>
            <span>Press any key to repair</span>
          </div>
        </div>
      </div>
    </>
  );
}
