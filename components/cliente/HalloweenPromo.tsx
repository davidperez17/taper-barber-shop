"use client";

import { useCallback, useEffect, useId, useState } from "react";
import { createPortal } from "react-dom";
import { useModalA11y } from "@/components/admin/useModalA11y";
import { HALLOWEEN_KEY, diaGT, faseHalloween, type FaseHalloween } from "@/lib/promo";

// Promo de Halloween 2026 (lib/promo.ts). Solo anuncio: borrar tras el 31-oct.

/** Murciélagos que cruzan el overlay: fila (top %), tamaño, duración, retardo, sentido. */
const BATS = [
  { top: 14, w: 46, dur: 7.5, delay: -1.5, rtl: false },
  { top: 24, w: 30, dur: 9, delay: -5, rtl: true },
  { top: 70, w: 38, dur: 8, delay: -3, rtl: false },
  { top: 82, w: 26, dur: 10, delay: -7.5, rtl: true },
];

/**
 * Splash del anuncio. Sale una vez al día (localStorage guarda el día GT en
 * que se vio) mientras dure la promo. Si ya hay otro overlay abierto
 * (recompensa, subida de tier) no se apila: lo deja para la próxima apertura.
 */
export function HalloweenPromo() {
  const [fase, setFase] = useState<FaseHalloween | null>(null);

  useEffect(() => {
    const f = faseHalloween();
    if (!f) return;
    const hoy = diaGT();
    try {
      if (localStorage.getItem(HALLOWEEN_KEY) === hoy) return;
    } catch {
      // Storage bloqueado: se muestra igual (peor caso, se repite).
    }
    // Después de las celebraciones de la tarjeta (abren a los 250 ms).
    const t = setTimeout(() => {
      if (document.querySelector('[aria-modal="true"]')) return;
      try {
        localStorage.setItem(HALLOWEEN_KEY, hoy);
      } catch {}
      setFase(f);
    }, 900);
    return () => clearTimeout(t);
  }, []);

  const close = useCallback(() => setFase(null), []);

  if (!fase) return null;
  return <HalloweenDialog fase={fase} onClose={close} />;
}

/** Banner en la tarjeta mientras dure la promo; al tocarlo reabre el splash. */
export function HalloweenBanner({ fase }: { fase: FaseHalloween }) {
  const [open, setOpen] = useState(false);
  const close = useCallback(() => setOpen(false), []);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="mt-6 flex w-full items-center gap-3.5 rounded-xl border p-3.5 text-left"
        style={{
          borderColor: "color-mix(in srgb, var(--halloween-orange) 35%, transparent)",
          background:
            "linear-gradient(120deg, color-mix(in srgb, var(--halloween-orange) 14%, var(--bg-elevated)) 0%, color-mix(in srgb, var(--halloween-purple) 14%, var(--bg-elevated)) 100%)",
        }}
      >
        <Pumpkin size={44} />
        <span className="min-w-0 flex-1">
          <span className="block text-[11px] font-semibold uppercase tracking-[0.12em]" style={{ color: "var(--halloween-orange)" }}>
            {fase === "hoy" ? "¡Hoy! · Halloween" : "Sáb 31 de octubre"}
          </span>
          <span className="mt-0.5 block font-display text-[17px] font-semibold leading-tight text-ink">
            Mascarilla de carbón <span className="text-accent">gratis</span>
          </span>
          <span className="mt-0.5 block text-xs text-muted">En todos los cortes</span>
        </span>
      </button>
      {open && <HalloweenDialog fase={fase} onClose={close} />}
    </>
  );
}

function HalloweenDialog({ fase, onClose }: { fase: FaseHalloween; onClose: () => void }) {
  const ref = useModalA11y(onClose);
  const hoy = fase === "hoy";

  return createPortal(
    <div
      ref={ref}
      role="dialog"
      aria-modal="true"
      aria-label="Promoción de Halloween"
      className="animate-fade-up fixed inset-0 z-[var(--z-modal)] flex flex-col items-center justify-center overflow-hidden px-8"
      style={{ background: "rgba(8,6,10,0.94)" }}
    >
      {/* Resplandor que respira: naranja arriba (calabaza), morado abajo */}
      <div
        aria-hidden
        className="hw-glow pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(circle at 50% 34%, color-mix(in srgb, var(--halloween-orange) 30%, transparent) 0%, transparent 46%), radial-gradient(ellipse at 50% 105%, color-mix(in srgb, var(--halloween-purple) 38%, transparent) 0%, transparent 60%)",
        }}
      />

      {/* Murciélagos */}
      <div aria-hidden className="pointer-events-none absolute inset-0 motion-reduce:hidden">
        {BATS.map((b, i) => (
          <div key={i} className="absolute left-0 w-full" style={{ top: `${b.top}%`, transform: b.rtl ? "scaleX(-1)" : undefined }}>
            <div className="hw-bat w-fit" style={{ "--dur": `${b.dur}s`, "--delay": `${b.delay}s` } as React.CSSProperties}>
              <Bat width={b.w} />
            </div>
          </div>
        ))}
      </div>

      <div className="relative flex flex-col items-center">
        <div style={{ animation: "taperPop 500ms var(--ease-spring) both" }}>
          <div className="hw-float" style={{ filter: "drop-shadow(0 0 26px color-mix(in srgb, var(--halloween-orange) 45%, transparent))" }}>
            <Pumpkin size={150} mascarilla />
          </div>
        </div>

        <p
          className="mt-6 text-[12px] font-semibold uppercase tracking-[0.2em]"
          style={{ color: "var(--halloween-orange)" }}
        >
          Halloween en Taper
        </p>
        <h2 className="mt-2 text-center font-display text-[38px] font-extrabold uppercase leading-[0.95] text-ink">
          {hoy ? "¡Es hoy!" : <>Sábado 31<br />de octubre</>}
        </h2>
        <p className="mt-4 max-w-[290px] text-center text-[16px] leading-snug text-ink">
          Todos los cortes incluyen <strong className="font-semibold">aplicación de mascarilla de carbón</strong>{" "}
          <span className="font-display text-[19px] font-extrabold uppercase text-accent">gratis</span>
        </p>
        <p className="mt-2 max-w-[280px] text-center text-[13px] text-subtle">
          {hoy ? "Solo por hoy, 31 de octubre." : "Solo ese día. ¡Aparta tu corte!"}
        </p>

        <button
          onClick={onClose}
          className="mt-8 min-h-[54px] w-full max-w-[300px] rounded-full bg-accent text-base font-semibold text-accent-ink"
        >
          {hoy ? "¡Vamos!" : "¡Ahí estaré!"}
        </button>
      </div>
    </div>,
    document.body,
  );
}

function Bat({ width }: { width: number }) {
  return (
    <svg width={width} height={width / 2} viewBox="0 0 64 32" fill="#120d18">
      <path className="hw-wing" d="M30 14C24 4 12 2 2 8c6 2 7 6 6 10 4-3 8-2 10 2 3-4 7-4 12-2z" />
      <path className="hw-wing" d="M34 14c6-10 18-12 28-6-6 2-7 6-6 10-4-3-8-2-10 2-3-4-7-4-12-2z" />
      <path d="M29 12l1-4 2 3 2-3 1 4z" />
      <ellipse cx="32" cy="17" rx="4" ry="6" />
    </svg>
  );
}

// Rostro tallado (viewBox 200×210).
const CARA = [
  "M62 100 L82 74 L98 102 Q80 96 62 100 Z",
  "M102 102 L118 74 L138 100 Q120 96 102 102 Z",
  "M93 120 L100 108 L107 120 Q100 117 93 120 Z",
  "M54 128 Q100 176 146 128 Q140 136 134 134 L128 144 L120 134 Q110 140 106 138 L100 150 L94 138 Q90 140 80 134 L72 144 L66 134 Q60 136 54 128 Z",
];

/** Destellos de "piel limpia" al despegarse la mascarilla: x, y, escala. */
const DESTELLOS = [
  [52, 70, 1],
  [150, 82, 0.8],
  [58, 150, 0.7],
  [146, 148, 1],
];

function destello(x: number, y: number, s: number) {
  const a = 10 * s;
  const b = 2.6 * s;
  return `M${x} ${y - a} L${x + b} ${y - b} L${x + a} ${y} L${x + b} ${y + b} L${x} ${y + a} L${x - b} ${y + b} L${x - a} ${y} L${x - b} ${y - b} Z`;
}

/**
 * Calabaza tallada con vela (parpadeo). Con `mascarilla`, en loop de 6 s le
 * untan una mascarilla de carbón en la cara, se despega y queda brillando.
 */
function Pumpkin({ size, mascarilla = false }: { size: number; mascarilla?: boolean }) {
  // useId trae caracteres que rompen url(#…): se limpian.
  const id = useId().replace(/[^a-zA-Z0-9_-]/g, "");
  const cara = (props: React.SVGProps<SVGGElement>, fill: string) => (
    <g {...props}>
      {CARA.map((d) => (
        <path key={d} d={d} fill={fill} />
      ))}
    </g>
  );

  return (
    <svg width={size} height={size * 1.05} viewBox="0 0 200 210" aria-hidden className="hw-pk shrink-0 overflow-visible">
      <defs>
        <radialGradient id={`lo${id}`} cx="38%" cy="28%" r="80%">
          <stop offset="0" stopColor="#ffb26b" />
          <stop offset=".42" stopColor="var(--halloween-orange)" />
          <stop offset="1" stopColor="#a83c08" />
        </radialGradient>
        <radialGradient id={`dk${id}`} cx="40%" cy="30%" r="85%">
          <stop offset="0" stopColor="#ef8a3c" />
          <stop offset=".5" stopColor="#cf560f" />
          <stop offset="1" stopColor="#7a2a05" />
        </radialGradient>
        <radialGradient id={`fl${id}`} gradientUnits="userSpaceOnUse" cx="100" cy="122" r="58">
          <stop offset="0" stopColor="#fffbe6" />
          <stop offset=".35" stopColor="#ffe066" />
          <stop offset=".7" stopColor="#ffab1f" />
          <stop offset="1" stopColor="#f06a0c" />
        </radialGradient>
        <linearGradient id={`st${id}`} x1="0" x2="1">
          <stop offset="0" stopColor="#34481c" />
          <stop offset="1" stopColor="#6f8f3b" />
        </linearGradient>
        <radialGradient id={`vo${id}`} cx="50%" cy="45%" r="60%">
          <stop offset=".55" stopColor="#000" stopOpacity="0" />
          <stop offset="1" stopColor="#2a0a00" stopOpacity=".45" />
        </radialGradient>
        <filter id={`bl${id}`} x="-60%" y="-60%" width="220%" height="220%">
          <feGaussianBlur stdDeviation="8" />
        </filter>
        {mascarilla && (
          <clipPath id={`cw${id}`}>
            <rect className="hw-wipe" x="36" y="62" width="128" height="100" />
          </clipPath>
        )}
      </defs>

      {/* Tallo, hoja y zarcillo */}
      <path d="M94 64 C91 50 95 37 107 28 L115 35 C106 43 104 52 106 64 Z" fill={`url(#st${id})`} />
      <path d="M108 46 C118 34 138 33 148 42 C136 52 120 54 108 46 Z" fill="#567d2e" />
      <path d="M104 40 C92 24 70 28 74 42 C77 52 90 48 86 40" stroke="#6f8f3b" strokeWidth="3" strokeLinecap="round" fill="none" />

      {/* Cuerpo: gajos traseros, delanteros, costillas, volumen y brillo */}
      <ellipse cx="58" cy="124" rx="44" ry="60" fill={`url(#dk${id})`} />
      <ellipse cx="142" cy="124" rx="44" ry="60" fill={`url(#dk${id})`} />
      <ellipse cx="78" cy="124" rx="40" ry="64" fill={`url(#lo${id})`} />
      <ellipse cx="122" cy="124" rx="40" ry="64" fill={`url(#lo${id})`} />
      <ellipse cx="100" cy="124" rx="35" ry="66" fill={`url(#lo${id})`} />
      <path d="M76 64 Q62 124 76 186 M124 64 Q138 124 124 186 M100 60 Q96 124 100 190" stroke="#8a3008" strokeOpacity=".35" strokeWidth="2" fill="none" />
      <ellipse cx="100" cy="124" rx="86" ry="66" fill={`url(#vo${id})`} />
      <ellipse cx="80" cy="86" rx="7" ry="17" fill="#fff" opacity=".2" transform="rotate(-18 80 86)" />

      {/* Cara: bisel, resplandor que se derrama y llama */}
      {cara({ stroke: "#4a1804", strokeWidth: 5, strokeLinejoin: "round" }, "#4a1804")}
      {cara({ className: mascarilla ? "hw-shine" : undefined, filter: `url(#bl${id})`, opacity: 0.85 }, "#ffb21a")}
      {cara({ className: "hw-flicker" }, `url(#fl${id})`)}

      {mascarilla && (
        <>
          <g className="hw-mask">
            <g className="hw-peel">
              <g clipPath={`url(#cw${id})`}>
                <path d="M44 106 C40 80 68 68 100 70 C134 68 162 80 156 108 C160 136 140 158 100 158 C60 158 40 136 44 106 Z" fill="#141417" />
                <g fill="#26262b">
                  <circle cx="68" cy="92" r="2.2" />
                  <circle cx="90" cy="84" r="1.6" />
                  <circle cx="128" cy="90" r="2.4" />
                  <circle cx="142" cy="116" r="1.8" />
                  <circle cx="74" cy="138" r="2" />
                  <circle cx="112" cy="146" r="1.6" />
                  <circle cx="56" cy="118" r="1.4" />
                  <circle cx="104" cy="98" r="1.8" />
                </g>
                <ellipse cx="80" cy="88" rx="22" ry="7" fill="#fff" opacity=".07" transform="rotate(-12 80 88)" />
              </g>
            </g>
          </g>
          <g fill="#fffbe6">
            {DESTELLOS.map(([x, y, s], i) => (
              <path key={i} className="hw-sparkle" style={{ "--i": i } as React.CSSProperties} d={destello(x, y, s)} />
            ))}
          </g>
        </>
      )}
    </svg>
  );
}
