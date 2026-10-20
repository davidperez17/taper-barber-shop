"use client";

import { useCallback, useEffect, useState } from "react";
import { IconCheck } from "@/components/icons";
import { useModalA11y } from "@/components/admin/useModalA11y";
import { Confetti, type ConfettiPiece } from "./Confetti";
import { CANJE_HORARIO } from "@/lib/horario";

const CONFETTI: ConfettiPiece[] = [
  { l: 12, col: "#f5c800", d: 0, dur: 1600, w: 8 },
  { l: 30, col: "#22c55e", d: 220, dur: 1900, w: 6 },
  { l: 52, col: "#ffffff", d: 120, dur: 1700, w: 7 },
  { l: 70, col: "#f5c800", d: 360, dur: 2000, w: 9 },
  { l: 86, col: "#3b82f6", d: 80, dur: 1800, w: 6 },
  { l: 42, col: "#f5c800", d: 500, dur: 2100, w: 7 },
];

// ── Cola de celebraciones ───────────────────────────────────────
// Si en la misma carga toca corte gratis y subida de nivel, TierUp espera a
// que este overlay se cierre (antes se encimaban dos modales).
const EVENTO_CIERRE = "taper:reward-cerrada";
let rewardActiva = false;

function liberarReward() {
  if (!rewardActiva) return;
  rewardActiva = false;
  window.dispatchEvent(new Event(EVENTO_CIERRE));
}

/** Corre `cb` ya, o cuando se cierre la celebración de recompensa si está en
 *  curso. Devuelve una función para cancelar la espera. */
export function trasReward(cb: () => void): () => void {
  if (!rewardActiva) {
    cb();
    return () => {};
  }
  window.addEventListener(EVENTO_CIERRE, cb, { once: true });
  return () => window.removeEventListener(EVENTO_CIERRE, cb);
}

/** Overlay de celebración al desbloquear corte gratis. Una vez por sesión. */
export function RewardCelebration({ nombre }: { nombre: string }) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const key = "taper_reward_seen";
    if (sessionStorage.getItem(key)) return;
    sessionStorage.setItem(key, "1");
    // Se marca activa ya (sincrónico en el effect) para que TierUp, que decide
    // tras su propio delay, la vea y se encole detrás.
    rewardActiva = true;
    // Tras el primer paint: la tarjeta entra primero y la celebración encima
    // (además evita el setState síncrono en el effect).
    const t = setTimeout(() => setOpen(true), 250);
    return () => {
      clearTimeout(t);
      liberarReward();
    };
  }, []);

  const close = useCallback(() => {
    setOpen(false);
    liberarReward();
  }, []);

  if (!open) return null;
  return <RewardDialog nombre={nombre} onClose={close} />;
}

function RewardDialog({ nombre, onClose }: { nombre: string; onClose: () => void }) {
  const ref = useModalA11y(onClose);

  return (
    <div
      ref={ref}
      role="dialog"
      aria-modal="true"
      aria-label="Recompensa desbloqueada"
      className="animate-fade-up fixed inset-0 z-[var(--z-modal)] flex flex-col items-center justify-center px-8"
      style={{ background: "rgba(8,7,5,0.9)" }}
    >
      <Confetti pieces={CONFETTI} />

      <div className="mb-6 flex size-[88px] items-center justify-center rounded-full bg-success-dim text-success" style={{ animation: "taperPop 400ms var(--ease-spring) both" }}>
        <IconCheck size={44} />
      </div>
      <h2 className="text-center font-display text-[32px] font-extrabold leading-tight text-ink">
        ¡Corte gratis<br />ganado!
      </h2>
      <p className="mt-3.5 max-w-[280px] text-center text-[15px] text-muted">
        {nombre.split(" ")[0]}, muéstrale tu QR al cajero en tu próxima visita y reclama tu corte sin costo.
      </p>
      <p className="mt-2 max-w-[280px] text-center text-[13px] text-subtle">
        Canjéalo {CANJE_HORARIO}.
      </p>
      <button
        onClick={onClose}
        className="mt-7 min-h-[54px] w-full max-w-[300px] rounded-full bg-accent text-base font-semibold text-accent-ink"
      >
        Ver mi QR
      </button>
    </div>
  );
}
