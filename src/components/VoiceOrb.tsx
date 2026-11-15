import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";

export type OrbState = "idle" | "listen" | "think" | "speak";

type Rgb = readonly [number, number, number];

// Cores do app (styles.css: --sky, --lilac, --mint, --peach) em versões um pouco mais saturadas.
const SKY: Rgb = [103, 202, 255];
const LILAC: Rgb = [190, 157, 247];
const MINT: Rgb = [111, 228, 191];
const PEACH: Rgb = [255, 190, 150];
const DEEP: Rgb = [64, 135, 222];

const rgba = (c: Rgb, a: number) => `rgba(${c[0]}, ${c[1]}, ${c[2]}, ${a})`;
const POINTS = 72;

/** Amplitude alvo do "respirar" do orbe em cada estado (0 = círculo perfeito). */
export function targetAmplitude(state: OrbState, level: number, t: number): number {
  switch (state) {
    case "listen":
      return 0.05 + Math.min(1, level) * 0.5;
    case "think":
      return 0.09 + 0.04 * Math.sin(t * 3.2);
    case "speak":
      // A fala sintetizada do navegador não expõe o áudio: simulamos um ritmo de voz.
      return 0.16 + 0.12 * Math.abs(Math.sin(t * 5.3) * Math.sin(t * 2.1 + 1));
    default:
      return 0.035 + 0.025 * Math.sin(t * 1.3);
  }
}

type Props = {
  state: OrbState;
  /** Volume atual do microfone (0..1). Chamado a cada frame. */
  getLevel?: () => number;
  size?: number;
  className?: string;
};

export function VoiceOrb({ state, getLevel, size = 176, className }: Props) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const stateRef = useRef(state);
  const levelRef = useRef(getLevel);
  stateRef.current = state;
  levelRef.current = getLevel;

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(size * dpr);
    canvas.height = Math.round(size * dpr);
    ctx.scale(dpr, dpr);

    const reduceMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
    const center = size / 2;
    const baseRadius = size * 0.3;
    let amp = 0.04;
    let smoothLevel = 0;
    let raf = 0;
    const startedAt = performance.now();

    const blobPath = (t: number, phase: number, scale: number, a: number) => {
      ctx.beginPath();
      for (let i = 0; i <= POINTS; i++) {
        const theta = (i / POINTS) * Math.PI * 2;
        const wobble =
          0.5 * Math.sin(3 * theta + t * 1.3 + phase) +
          0.3 * Math.sin(5 * theta - t * 1.9 + phase * 2) +
          0.2 * Math.sin(2 * theta + t * 0.9 - phase);
        const r = baseRadius * scale * (1 + a * wobble * 1.6);
        const x = center + Math.cos(theta) * r;
        const y = center + Math.sin(theta) * r;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.closePath();
    };

    const draw = (now: number) => {
      const t = (now - startedAt) / 1000;
      const current = stateRef.current;
      const raw = levelRef.current?.() ?? 0;
      smoothLevel += (raw - smoothLevel) * 0.35;
      amp += (targetAmplitude(current, smoothLevel, t) - amp) * 0.18;

      ctx.clearRect(0, 0, size, size);

      // Brilho externo suave (aumenta com o volume).
      const glow = ctx.createRadialGradient(
        center,
        center,
        baseRadius * 0.6,
        center,
        center,
        size / 2,
      );
      glow.addColorStop(0, rgba(SKY, 0.3 + amp * 0.6));
      glow.addColorStop(1, rgba(SKY, 0));
      ctx.fillStyle = glow;
      ctx.fillRect(0, 0, size, size);

      // "Pensando": as cores giram em volta do centro.
      const spin = current === "think" ? t * 1.4 : t * 0.35;
      const layers: { color: Rgb; phase: number; scale: number; alpha: number }[] = [
        { color: SKY, phase: 0, scale: 1.04, alpha: 0.95 },
        { color: LILAC, phase: 2.1, scale: 0.92, alpha: 0.7 },
        { color: MINT, phase: 4.2, scale: 0.84, alpha: 0.7 },
        { color: PEACH, phase: 1.3, scale: 0.6, alpha: 0.45 },
      ];
      layers.forEach((layer, i) => {
        const orbit = baseRadius * 0.22 * (i % 2 === 0 ? 1 : -1);
        const ox = Math.cos(spin + layer.phase) * orbit;
        const oy = Math.sin(spin * 0.8 + layer.phase) * orbit;
        blobPath(t, layer.phase, layer.scale, amp);
        const fill = ctx.createRadialGradient(
          center + ox,
          center + oy,
          baseRadius * 0.1,
          center,
          center,
          baseRadius * layer.scale * (1 + amp * 2),
        );
        fill.addColorStop(0, rgba(layer.color, layer.alpha));
        fill.addColorStop(1, rgba(i === 0 ? DEEP : layer.color, layer.alpha * 0.55));
        ctx.fillStyle = fill;
        ctx.fill();
      });

      // Reflexo de vidro e contorno.
      const gloss = ctx.createRadialGradient(
        center - baseRadius * 0.35,
        center - baseRadius * 0.45,
        0,
        center - baseRadius * 0.35,
        center - baseRadius * 0.45,
        baseRadius * 0.9,
      );
      gloss.addColorStop(0, "rgba(255,255,255,0.55)");
      gloss.addColorStop(1, "rgba(255,255,255,0)");
      blobPath(t, 0, 1.04, amp);
      ctx.fillStyle = gloss;
      ctx.fill();
      ctx.lineWidth = 1.5;
      ctx.strokeStyle = "rgba(255,255,255,0.65)";
      ctx.stroke();

      if (!reduceMotion) raf = requestAnimationFrame(draw);
    };

    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, [size]);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className={cn("pointer-events-none select-none", className)}
      style={{ width: size, height: size }}
    />
  );
}
