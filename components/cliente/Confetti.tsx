"use client";

/** Una partícula de confetti: posición, color, retardo, duración y ancho (px). */
export interface ConfettiPiece {
  l: number;
  col: string;
  d: number;
  dur: number;
  w: number;
}

/**
 * Lluvia de confetti para overlays de celebración (recompensa, subida de tier).
 * Decorativa: aria-hidden y oculta con `prefers-reduced-motion`. La caída usa
 * el keyframe `taperConfetti` de globals.css.
 */
export function Confetti({ pieces }: { pieces: ConfettiPiece[] }) {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden motion-reduce:hidden">
      {pieces.map((b, i) => (
        <span
          key={i}
          className="absolute top-0 rounded-[1px]"
          style={{
            left: `${b.l}%`,
            width: b.w,
            height: b.w * 1.6,
            background: b.col,
            animation: `taperConfetti ${b.dur}ms ease-in ${b.d}ms infinite`,
          }}
        />
      ))}
    </div>
  );
}
