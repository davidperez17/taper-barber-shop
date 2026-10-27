"use client";

import { useCallback, useEffect, useId, useState } from "react";
import { createPortal } from "react-dom";
import { useModalA11y } from "@/components/admin/useModalA11y";
import { RENOVACION_KEY, renovacionVigente } from "@/lib/promo";

// Anuncio "barbería renovada" (lib/promo.ts). Solo anuncio: borrar tras RENOVACION_HASTA.

/**
 * Splash del anuncio. Sale UNA vez por dispositivo. Abre después del de
 * Halloween: si ya hay otro overlay abierto no se apila y espera a la próxima
 * apertura (Halloween sale 1×día, así que a la segunda ya toca éste).
 */
export function RenovacionPromo() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!renovacionVigente()) return;
    try {
      if (localStorage.getItem(RENOVACION_KEY)) return;
    } catch {
      // Storage bloqueado: se muestra igual (peor caso, se repite).
    }
    const t = setTimeout(() => {
      if (document.querySelector('[aria-modal="true"]')) return;
      try {
        localStorage.setItem(RENOVACION_KEY, "visto");
      } catch {}
      setOpen(true);
    }, 1400);
    return () => clearTimeout(t);
  }, []);

  const close = useCallback(() => setOpen(false), []);

  if (!open) return null;
  return <RenovacionDialog onClose={close} />;
}

/** Banner en la tarjeta mientras siga vigente; al tocarlo reabre el splash. */
export function RenovacionBanner() {
  const [open, setOpen] = useState(false);
  const close = useCallback(() => setOpen(false), []);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="mt-6 flex w-full items-center gap-3.5 rounded-xl border p-3.5 text-left"
        style={{
          borderColor: "color-mix(in srgb, var(--accent) 30%, transparent)",
          background:
            "linear-gradient(120deg, color-mix(in srgb, var(--accent) 12%, var(--bg-elevated)) 0%, var(--bg-elevated) 70%)",
        }}
      >
        <span className="flex h-11 w-11 shrink-0 items-center justify-center">
          <BarberPole height={44} />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-[11px] font-semibold uppercase tracking-[0.12em] text-accent">
            Nueva cara · Mismo filo
          </span>
          <span className="mt-0.5 block font-display text-[17px] font-semibold leading-tight text-ink">
            Renovamos Taper
          </span>
          <span className="mt-0.5 block text-xs text-muted">Ven a conocerla y sal con corte fresco</span>
        </span>
      </button>
      {open && <RenovacionDialog onClose={close} />}
    </>
  );
}

function RenovacionDialog({ onClose }: { onClose: () => void }) {
  const ref = useModalA11y(onClose);

  return createPortal(
    <div
      ref={ref}
      role="dialog"
      aria-modal="true"
      aria-label="Renovamos la barbería"
      className="animate-fade-up fixed inset-0 z-[var(--z-modal)] flex flex-col items-center justify-center overflow-hidden px-8"
      style={{ background: "rgba(10,10,10,0.95)" }}
    >
      <div
        aria-hidden
        className="rn-glow pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(circle at 50% 36%, color-mix(in srgb, var(--accent) 22%, transparent) 0%, transparent 48%)",
        }}
      />

      <div className="relative flex flex-col items-center">
        <div style={{ animation: "taperPop 500ms var(--ease-spring) both" }}>
          <CorteDeListon width={280} />
        </div>

        <p className="mt-7 text-[12px] font-semibold uppercase tracking-[0.2em] text-accent">
          Nueva cara · Mismo filo
        </p>
        <h2 className="mt-2 text-center font-display text-[38px] font-extrabold uppercase leading-[0.95] text-ink">
          Renovamos
          <br />
          Taper
        </h2>
        <p className="mt-4 max-w-[300px] text-center text-[16px] leading-snug text-ink">
          Le dimos una nueva cara a la barbería. Pasa a conocerla… y ya que vienes,{" "}
          <strong className="font-semibold">sal con corte fresco</strong>.
        </p>
        <p className="mt-2 max-w-[280px] text-center text-[13px] text-subtle">
          El primer corte fue el del listón. El siguiente es el tuyo. Tu tarjeta y tus sellos siguen igual.
        </p>

        <button
          onClick={onClose}
          className="mt-8 min-h-[54px] w-full max-w-[300px] rounded-full bg-accent text-base font-semibold text-accent-ink"
        >
          ¡Ahí llego!
        </button>
      </div>
    </div>,
    document.body,
  );
}

/** Franjas diagonales del poste: rojo/blanco/azul, periodo 18 (sube en loop). */
const FRANJAS = Array.from({ length: 12 }, (_, i) => i * 18 - 36);

/** Poste de barbero con las franjas girando. x/y = esquina del cilindro (16×84). */
function Poste({ x, y, id }: { x: number; y: number; id: string }) {
  return (
    <g transform={`translate(${x} ${y})`}>
      <defs>
        <clipPath id={`pc${id}`}>
          <rect x="0" y="0" width="16" height="84" rx="3" />
        </clipPath>
        <linearGradient id={`pv${id}`} x1="0" x2="1">
          <stop offset="0" stopColor="#000" stopOpacity=".35" />
          <stop offset=".35" stopColor="#fff" stopOpacity=".28" />
          <stop offset=".6" stopColor="#000" stopOpacity="0" />
          <stop offset="1" stopColor="#000" stopOpacity=".45" />
        </linearGradient>
        <linearGradient id={`pm${id}`} x1="0" x2="1">
          <stop offset="0" stopColor="#6b6f76" />
          <stop offset=".4" stopColor="#e6e8eb" />
          <stop offset="1" stopColor="#55585e" />
        </linearGradient>
      </defs>
      {/* Remates metálicos */}
      <path d="M-3 0 Q8 -14 19 0 Z" fill={`url(#pm${id})`} />
      <circle cx="8" cy="-12" r="3.2" fill={`url(#pm${id})`} />
      <rect x="-3" y="-2" width="22" height="5" rx="1.5" fill={`url(#pm${id})`} />
      <rect x="-3" y="81" width="22" height="5" rx="1.5" fill={`url(#pm${id})`} />
      <rect x="1" y="86" width="14" height="22" fill={`url(#pm${id})`} />
      <rect x="-5" y="106" width="26" height="5" rx="2" fill={`url(#pm${id})`} />

      <g clipPath={`url(#pc${id})`}>
        <rect width="16" height="84" fill="#f6f6f6" />
        <g className="rn-stripes">
          {FRANJAS.map((o) => (
            <g key={o}>
              <path d={`M-4 ${o + 14} L20 ${o} L20 ${o + 5} L-4 ${o + 19} Z`} fill="#d7262f" />
              <path d={`M-4 ${o + 23} L20 ${o + 9} L20 ${o + 13} L-4 ${o + 27} Z`} fill="#1f3f99" />
            </g>
          ))}
        </g>
        <rect width="16" height="84" fill={`url(#pv${id})`} />
      </g>
    </g>
  );
}

/** Ícono del banner: poste suelto. */
function BarberPole({ height }: { height: number }) {
  const id = useId().replace(/[^a-zA-Z0-9_-]/g, "");
  return (
    <svg height={height} width={height * 0.36} viewBox="-6 -16 28 128" aria-hidden className="overflow-visible">
      <Poste x={0} y={0} id={id} />
    </svg>
  );
}

/** Destellos al cortar el listón: x, y, escala. */
const DESTELLOS = [
  [130, 56, 1],
  [108, 66, 0.7],
  [152, 64, 0.8],
  [118, 102, 0.6],
  [144, 100, 0.9],
];

function destello(x: number, y: number, s: number) {
  const a = 9 * s;
  const b = 2.4 * s;
  return `M${x} ${y - a} L${x + b} ${y - b} L${x + a} ${y} L${x + b} ${y + b} L${x} ${y + a} L${x - b} ${y + b} L${x - a} ${y} L${x - b} ${y - b} Z`;
}

/**
 * "Corte de listón" en loop de 5.5 s: entra la tijera, corta el listón rojo
 * que cuelga entre dos postes de barbero, las mitades caen y salen destellos.
 * Sin movimiento queda la tijera sobre el listón intacto.
 */
function CorteDeListon({ width }: { width: number }) {
  const id = useId().replace(/[^a-zA-Z0-9_-]/g, "");

  // Una hoja de la tijera con su mango (pieza rígida que gira en el perno 0,0).
  const pieza = (signo: 1 | -1) => (
    <>
      <path
        d={`M3 ${-2.6 * signo} L-46 ${-1.2 * signo} Q-49 0 -46 ${0.9 * signo} L3 ${2.2 * signo} Z`}
        fill={`url(#hj${id})`}
        stroke="#7d828a"
        strokeWidth=".6"
      />
      <path d={`M2 0 L15 ${8 * signo}`} stroke="var(--accent)" strokeWidth="5" strokeLinecap="round" />
      <circle cx="23" cy={12 * signo} r="7.5" fill="none" stroke="var(--accent)" strokeWidth="4" />
    </>
  );

  return (
    <svg width={width} height={width * (170 / 260)} viewBox="0 -14 260 170" aria-hidden className="rn-sv overflow-visible">
      <defs>
        <linearGradient id={`hj${id}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#f4f6f8" />
          <stop offset=".55" stopColor="#c3c8cf" />
          <stop offset="1" stopColor="#8d939b" />
        </linearGradient>
        <linearGradient id={`ls${id}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#ff5a5f" />
          <stop offset=".5" stopColor="#e11d2e" />
          <stop offset="1" stopColor="#9b1020" />
        </linearGradient>
      </defs>

      <Poste x={14} y={30} id={`a${id}`} />
      <Poste x={230} y={30} id={`b${id}`} />

      {/* Listón: dos mitades que cuelgan de cada poste */}
      <g className="rn-rl">
        <path d="M30 74 L130 76 L130 86 L30 84 Z" fill={`url(#ls${id})`} />
      </g>
      <g className="rn-rr">
        <path d="M130 76 L230 74 L230 84 L130 86 Z" fill={`url(#ls${id})`} />
      </g>

      {/* Tijera: entra desde la derecha y cierra justo en el centro */}
      <g className="rn-sc">
        <g transform="translate(160 81)">
          <g className="rn-ba">{pieza(1)}</g>
          <g className="rn-bb">{pieza(-1)}</g>
          <circle r="2.6" fill="#55585e" />
        </g>
      </g>

      <g fill="#fffbe6">
        {DESTELLOS.map(([x, y, s], i) => (
          <path key={i} className="rn-sparkle" style={{ "--i": i } as React.CSSProperties} d={destello(x, y, s)} />
        ))}
      </g>
    </svg>
  );
}
