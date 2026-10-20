"use client";

import { useCallback, useEffect, useState } from "react";
import { TIER_BENEFITS, TIER_LABEL, TIER_SURFACE, tierRank, type Tier } from "@/lib/loyalty";
import { useModalA11y } from "@/components/admin/useModalA11y";
import { Confetti, type ConfettiPiece } from "./Confetti";
import { trasReward } from "./RewardCelebration";

/** Prefijo de la clave por cliente (`taper_tier_seen:<clienteId>`). */
const KEY = "taper_tier_seen";

// localStorage puede lanzar (modo privado / almacenamiento bloqueado).
function leer(key: string): string | null {
  try { return localStorage.getItem(key); } catch { return null; }
}
function escribir(key: string, v: string) {
  try { localStorage.setItem(key, v); } catch { /* sin almacenamiento: no festeja */ }
}

const CONFETTI: ConfettiPiece[] = [
  { l: 12, col: "#f5c800", d: 0, dur: 1600, w: 8 },
  { l: 30, col: "#e5e7eb", d: 220, dur: 1900, w: 6 },
  { l: 52, col: "#ffffff", d: 120, dur: 1700, w: 7 },
  { l: 70, col: "#f5c800", d: 360, dur: 2000, w: 9 },
  { l: 86, col: "#c084fc", d: 80, dur: 1800, w: 6 },
  { l: 42, col: "#f5c800", d: 500, dur: 2100, w: 7 },
];

/**
 * Celebra cuando el cliente sube de tier. Compara el tier actual contra el
 * último visto (localStorage por cliente, persiste entre sesiones): solo
 * festeja subidas, nunca en la primera carga (fija baseline) ni en bajadas.
 * Una vez por subida.
 *
 * El tier es el MÁXIMO entre sucursales (`tiers`): con el de la sucursal
 * "primaria" (última visitada) visitar otra sucursal bajaba el tier en
 * silencio y al volver festejaba una subida falsa. Si hay celebración de
 * recompensa en curso, espera a que se cierre (no se enciman overlays).
 */
export function TierUpCelebration({ clienteId, tiers }: { clienteId: string; tiers: Tier[] }) {
  const [open, setOpen] = useState(false);
  const tier = tiers.reduce<Tier>((max, t) => (tierRank(t) > tierRank(max) ? t : max), "silver");

  useEffect(() => {
    const key = `${KEY}:${clienteId}`;
    // Clave global vieja (no ligada al cliente): se descarta.
    try { localStorage.removeItem(KEY); } catch { /* ignore */ }

    const previo = leer(key) as Tier | null;
    const esTier = previo !== null && tierRank(previo) >= 0;
    // Primera vez (o valor corrupto): fija baseline sin celebrar.
    if (!esTier) {
      escribir(key, tier);
      return;
    }
    if (tierRank(tier) > tierRank(previo)) {
      escribir(key, tier);
      let cancelarEspera = () => {};
      const t = setTimeout(() => {
        cancelarEspera = trasReward(() => setOpen(true));
      }, 250);
      return () => {
        clearTimeout(t);
        cancelarEspera();
      };
    }
    // Bajada o igual: sincroniza en silencio (nunca festeja retrocesos).
    if (tierRank(tier) < tierRank(previo)) escribir(key, tier);
  }, [tier, clienteId]);

  const close = useCallback(() => setOpen(false), []);

  if (!open) return null;
  return <TierUpDialog tier={tier} tierLabel={TIER_LABEL[tier]} onClose={close} />;
}

function TierUpDialog({ tier, tierLabel, onClose }: { tier: Tier; tierLabel: string; onClose: () => void }) {
  const ref = useModalA11y(onClose);
  const beneficios = TIER_BENEFITS[tier];

  return (
    <div
      ref={ref}
      role="dialog"
      aria-modal="true"
      aria-label={`Subiste a ${tierLabel}`}
      className="animate-fade-up fixed inset-0 z-[var(--z-modal)] flex flex-col items-center justify-center px-8"
      style={{ background: "rgba(8,7,5,0.92)" }}
    >
      <Confetti pieces={CONFETTI} />

      {/* Medallón con la superficie del nuevo tier */}
      <div
        className={`${TIER_SURFACE[tier]} mb-6 flex size-[104px] items-center justify-center rounded-full border border-white/15 shadow-[0_10px_30px_rgba(0,0,0,0.5)]`}
        style={{ animation: "taperPop 440ms var(--ease-spring) both" }}
      >
        <span className="font-display text-[26px] font-extrabold tracking-tight text-ink">{tierLabel[0]}</span>
      </div>

      <p className="text-center text-[13px] font-semibold uppercase tracking-[0.18em] text-accent">Nuevo nivel</p>
      <h2 className="mt-1.5 text-center font-display text-[32px] font-extrabold leading-tight text-ink">
        ¡Subiste a {tierLabel}!
      </h2>

      <ul className="mt-5 w-full max-w-[300px] space-y-2">
        {beneficios.map((b) => (
          <li key={b} className="flex items-start gap-2.5 text-[14px] text-muted">
            <span className="mt-[3px] text-accent" aria-hidden>✦</span>
            <span>{b}</span>
          </li>
        ))}
      </ul>

      <button
        onClick={onClose}
        className="mt-7 min-h-[54px] w-full max-w-[300px] rounded-full bg-accent text-base font-semibold text-accent-ink"
      >
        Genial
      </button>
    </div>
  );
}
