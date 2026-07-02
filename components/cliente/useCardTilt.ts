"use client";

import { useCallback, useEffect, useRef } from "react";

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

/** DeviceOrientationEvent con el requestPermission de iOS 13+ (no está en los tipos DOM). */
type DOEWithPermission = typeof DeviceOrientationEvent & {
  requestPermission?: () => Promise<"granted" | "denied">;
};

/**
 * Tilt 3D + glare de la loyalty card siguiendo el giroscopio del móvil,
 * con fallback a mouse en desktop. Aplica los transforms de forma imperativa
 * (rAF + lerp) para no re-renderizar en cada frame.
 *
 * - iOS 13+ exige `requestPermission()` desde un gesto → llamar `requestGyro()` en el tap.
 * - Android/Chrome (https) engancha directo.
 * - `prefers-reduced-motion` desactiva todo.
 */
export function useCardTilt(maxTilt = 8) {
  const tiltRef = useRef<HTMLDivElement>(null);
  const glareRef = useRef<HTMLDivElement>(null);
  const flippedRef = useRef(false);

  const target = useRef({ rx: 0, ry: 0, gx: 50, gy: 28 });
  const cur = useRef({ rx: 0, ry: 0, gx: 50, gy: 28 });
  const base = useRef<{ beta: number; gamma: number } | null>(null);
  const rafId = useRef<number | null>(null);
  const orientBound = useRef(false);

  const onOrient = useCallback(
    (e: DeviceOrientationEvent) => {
      if (e.beta == null || e.gamma == null) return;
      // Baseline relativo: el tilt es delta contra la pose al activar (sirve en cualquier posición).
      if (!base.current) base.current = { beta: e.beta, gamma: e.gamma };
      const dB = clamp(e.beta - base.current.beta, -28, 28) / 28;
      const dG = clamp(e.gamma - base.current.gamma, -28, 28) / 28;
      target.current.ry = dG * maxTilt;
      target.current.rx = -dB * maxTilt;
      target.current.gx = 50 + dG * 46;
      target.current.gy = 28 + dB * 34;
    },
    [maxTilt],
  );

  const attachOrient = useCallback(() => {
    if (orientBound.current) return;
    window.addEventListener("deviceorientation", onOrient, true);
    orientBound.current = true;
  }, [onOrient]);

  /** Llamar desde un gesto del usuario (el primer tap de la card). */
  const requestGyro = useCallback(async () => {
    if (typeof window === "undefined") return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const DOE = window.DeviceOrientationEvent as DOEWithPermission | undefined;
    if (DOE && typeof DOE.requestPermission === "function") {
      try {
        if ((await DOE.requestPermission()) === "granted") attachOrient();
      } catch {
        /* permiso denegado → queda estático */
      }
    } else {
      attachOrient();
    }
  }, [attachOrient]);

  const setFlipped = useCallback((v: boolean) => {
    flippedRef.current = v;
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const card = tiltRef.current?.parentElement; // el <button>

    // Fallback desktop: el mouse inclina la card (solo si no hay giroscopio activo).
    const onPointerMove = (e: PointerEvent) => {
      if (orientBound.current || !card) return;
      const r = card.getBoundingClientRect();
      const px = (e.clientX - r.left) / r.width - 0.5;
      const py = (e.clientY - r.top) / r.height - 0.5;
      target.current.ry = px * 2 * maxTilt;
      target.current.rx = -py * 2 * maxTilt;
      target.current.gx = 50 + px * 92;
      target.current.gy = 28 + py * 60;
    };
    const resetTarget = () => {
      if (orientBound.current) return;
      target.current = { rx: 0, ry: 0, gx: 50, gy: 28 };
    };
    card?.addEventListener("pointermove", onPointerMove);
    card?.addEventListener("pointerleave", resetTarget);

    // Android/Chrome: sin permiso, engancha directo. iOS: espera requestGyro() en el tap.
    const DOE = window.DeviceOrientationEvent as DOEWithPermission | undefined;
    if (DOE && typeof DOE.requestPermission !== "function") attachOrient();

    const loop = () => {
      const c = cur.current;
      const t = target.current;
      const damp = flippedRef.current ? Math.min(1, 3 / maxTilt) : 1; // QR plano al voltear
      c.rx += (t.rx - c.rx) * 0.12;
      c.ry += (t.ry - c.ry) * 0.12;
      c.gx += (t.gx - c.gx) * 0.12;
      c.gy += (t.gy - c.gy) * 0.12;
      if (tiltRef.current) {
        tiltRef.current.style.transform = `rotateX(${(c.rx * damp).toFixed(2)}deg) rotateY(${(c.ry * damp).toFixed(2)}deg)`;
      }
      if (glareRef.current) {
        glareRef.current.style.setProperty("--gx", `${c.gx.toFixed(1)}%`);
        glareRef.current.style.setProperty("--gy", `${c.gy.toFixed(1)}%`);
      }
      rafId.current = requestAnimationFrame(loop);
    };
    rafId.current = requestAnimationFrame(loop);

    return () => {
      card?.removeEventListener("pointermove", onPointerMove);
      card?.removeEventListener("pointerleave", resetTarget);
      if (orientBound.current) {
        window.removeEventListener("deviceorientation", onOrient, true);
        orientBound.current = false;
      }
      if (rafId.current != null) cancelAnimationFrame(rafId.current);
    };
  }, [attachOrient, maxTilt, onOrient]);

  return { tiltRef, glareRef, requestGyro, setFlipped };
}
