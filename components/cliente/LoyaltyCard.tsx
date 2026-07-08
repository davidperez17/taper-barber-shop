"use client";

import { useState } from "react";
import type { CSSProperties } from "react";
import type { Tier } from "@/lib/loyalty";
import { TIER_SURFACE } from "@/lib/loyalty";
import { IconFlip, IconScissors } from "@/components/icons";
import { useCardTilt } from "./useCardTilt";
import { Isotipo } from "@/components/Isotipo";

const TIER_BADGE: Record<Tier, { bg: string; ink: string; border: string; star: boolean }> = {
  silver: { bg: "rgba(113,113,122,0.5)", ink: "#e4e4e7", border: "rgba(161,161,170,0.55)", star: false },
  gold: { bg: "rgba(120,53,15,0.55)", ink: "#fde68a", border: "rgba(252,211,77,0.6)", star: true },
  platinum: { bg: "rgba(30,27,75,0.6)", ink: "#bfdbfe", border: "rgba(96,165,250,0.6)", star: true },
  black: { bg: "rgba(0,0,0,0.5)", ink: "#f5c800", border: "rgba(245,200,0,0.45)", star: true },
};

interface Props {
  name: string;
  memberId: string;
  tier: Tier;
  tierLabel: string;
  cortesCiclo: number;
  objetivo: number;
  motiv: string;
  recompensaDisponible: boolean;
  /** SVG del QR ya renderizado en el servidor. */
  qrSvg: string;
}

export function LoyaltyCard({
  name,
  memberId,
  tier,
  tierLabel,
  cortesCiclo,
  objetivo,
  motiv,
  recompensaDisponible,
  qrSvg,
}: Props) {
  const [flipped, setFlipped] = useState(false);
  const [flippedOnce, setFlippedOnce] = useState(false);
  const { tiltRef, glareRef, requestGyro, setFlipped: setTiltFlipped } = useCardTilt(8);
  const badge = TIER_BADGE[tier];
  const ink = recompensaDisponible ? "#ecfdf5" : "var(--tier-ink)";
  // Sellos en 1 fila hasta 7; a partir de 8 se reparten en 2 filas.
  const cols = objetivo <= 7 ? objetivo : Math.ceil(objetivo / 2);

  // Resalta número (bold) y "corte gratis". El dorado no contrasta sobre la
  // tarjeta Gold (naranja) → ahí usa crema; en el resto va el accent.
  const hlColor = recompensaDisponible ? "inherit" : tier === "gold" ? "#fff6dd" : "var(--accent)";
  // Riel conector (tira perforada): oro sobre tiers oscuros; blanco en Gold por contraste.
  const railFill = recompensaDisponible ? "var(--success)" : tier === "gold" ? "rgba(255,255,255,0.72)" : "var(--accent)";
  const renderMotiv = (text: string) =>
    text.split(/(\d+|corte gratis)/g).map((part, i) => {
      if (/^\d+$/.test(part)) return <b key={i} style={{ fontWeight: 700 }}>{part}</b>;
      if (part === "corte gratis") return <span key={i} style={{ fontWeight: 600, color: hlColor }}>{part}</span>;
      return <span key={i}>{part}</span>;
    });

  const surface = recompensaDisponible ? "" : TIER_SURFACE[tier];
  const cardBg: CSSProperties = recompensaDisponible
    ? { background: "var(--card-sheen), linear-gradient(150deg,#166534 0%,#0d3d22 100%)" }
    : {};
  const cardShadow = recompensaDisponible
    ? "0 10px 40px rgba(34,197,94,0.35),0 4px 18px rgba(0,0,0,0.5)"
    : "0 12px 42px var(--tier-glow),0 4px 18px rgba(0,0,0,0.5)";

  const faceBase: CSSProperties = {
    position: "absolute",
    inset: 0,
    borderRadius: 20,
    padding: 20,
    boxSizing: "border-box",
    display: "flex",
    flexDirection: "column",
    justifyContent: "space-between",
    border: "1px solid rgba(255,255,255,0.16)",
    WebkitBackfaceVisibility: "hidden",
    backfaceVisibility: "hidden",
  };

  const handleFlip = () => {
    const next = !flipped;
    setFlipped(next);
    setTiltFlipped(next);
    if (!flippedOnce) void requestGyro(); // iOS: activar giroscopio en el primer gesto
    setFlippedOnce(true);
  };

  return (
    <div>
      <button
        type="button"
        onClick={handleFlip}
        aria-pressed={flipped}
        aria-label={flipped ? "Ver progreso de lealtad" : "Ver código QR"}
        className="block w-full cursor-pointer border-0 bg-transparent p-0"
        style={{ perspective: "1400px", aspectRatio: "3 / 2" }}
      >
        {/* Wrapper de TILT (giroscopio/mouse): inclina toda la card en espacio de pantalla */}
        {/* tiltRef NO usa preserve-3d: WebKit (PWA iOS) rompe backface-visibility con
            preserve-3d anidados y muestra las dos caras a la vez. Da 'perspective' al
            flip (único contexto 3D) para que conserve profundidad; el tilt se ve con
            la perspective del <button>. */}
        <div
          ref={tiltRef}
          style={{ position: "relative", width: "100%", height: "100%", perspective: "1400px", willChange: "transform" }}
        >
        <div
          style={{
            position: "relative",
            width: "100%",
            height: "100%",
            transformStyle: "preserve-3d",
            transition: "transform 500ms var(--ease-spring)",
            transform: flipped ? "rotateY(180deg)" : "rotateY(0deg)",
          }}
        >
          {/* ── FRENTE ── */}
          <div
            className={surface}
            style={{
              ...faceBase,
              ...cardBg,
              boxShadow: cardShadow,
              animation: recompensaDisponible ? "taperPulseSuccess 1.6s ease-in-out infinite" : "none",
              color: ink,
            }}
          >
            {/* Glare holográfico: la luz se desplaza con --gx/--gy (giroscopio/mouse) */}
            <div
              ref={glareRef}
              aria-hidden
              style={{
                position: "absolute",
                inset: 0,
                borderRadius: "inherit",
                pointerEvents: "none",
                zIndex: 0,
                background: "radial-gradient(circle at var(--gx,50%) var(--gy,28%), rgba(255,255,255,0.16), transparent 45%)",
                mixBlendMode: "soft-light",
              }}
            />
            <div style={{ position: "relative", zIndex: 1, flex: 1, display: "flex", flexDirection: "column", justifyContent: "space-between", width: "100%" }}>
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2">
                <Isotipo style={{ width: 18, height: 9, color: ink, opacity: 0.9 }} />
                <span className="font-display" style={{ fontWeight: 700, fontSize: 13, letterSpacing: "0.16em", opacity: 0.85 }}>TAPER BARBER</span>
              </div>
              <span
                className="inline-flex items-center font-semibold uppercase"
                style={{ padding: "5px 11px", borderRadius: 9999, background: badge.bg, color: badge.ink, border: `1px solid ${badge.border}`, fontSize: 11, letterSpacing: "0.08em" }}
              >
                {badge.star && <span className="mr-1">★</span>}
                {tierLabel}
              </span>
            </div>

            {/* Sellos como héroe — riel conector estilo tarjeta perforada */}
            <div style={{ flex: 1, display: "grid", placeItems: "center", width: "100%" }}>
              <div style={{ position: "relative", width: "100%" }}>
                {/* Riel solo en el tramo ganado (oro conectando los sellos logrados); adelante no hay línea */}
                {objetivo <= 7 && cortesCiclo >= 2 && (
                  <span
                    aria-hidden
                    style={{ position: "absolute", top: "50%", transform: "translateY(-50%)", left: `${50 / cols}%`, width: `${((cortesCiclo - 1) / cols) * 100}%`, height: 3, borderRadius: 9999, background: railFill, opacity: 0.85, transition: "width 700ms ease-out" }}
                  />
                )}
                <div
                  role="progressbar"
                  aria-valuenow={cortesCiclo}
                  aria-valuemin={0}
                  aria-valuemax={objetivo}
                  aria-label={`${cortesCiclo} de ${objetivo} cortes`}
                  style={{ position: "relative", display: "grid", gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`, gap: 12, width: "100%" }}
                >
                  {Array.from({ length: objetivo }, (_, i) => {
                    const filled = i < cortesCiclo;
                    return (
                      <span
                        key={i}
                        aria-hidden
                        className={filled ? "stamp-pop" : undefined}
                        style={{
                          aspectRatio: "1",
                          width: "100%",
                          maxWidth: 48,
                          margin: "0 auto",
                          display: "grid",
                          placeItems: "center",
                          borderRadius: 9999,
                          ...(filled
                            ? recompensaDisponible
                              ? { background: "linear-gradient(160deg,#34d36b,#16a34a)", color: "#06250f", boxShadow: "inset 0 1px 0 rgba(255,255,255,0.45), 0 3px 10px rgba(34,197,94,0.5)" }
                              : { background: "linear-gradient(160deg,#ffffff,#e7e7ea)", color: "rgba(20,20,22,0.9)", boxShadow: "inset 0 1px 0 rgba(255,255,255,0.95), inset 0 0 0 1px rgba(0,0,0,0.05), 0 3px 9px rgba(0,0,0,0.32)" }
                            : { background: "rgba(255,255,255,0.04)", color: "rgba(255,255,255,0.30)", border: "1.5px dashed rgba(255,255,255,0.26)" }),
                          ...({ "--i": i } as CSSProperties),
                        }}
                      >
                        <IconScissors size={26} />
                      </span>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <p style={{ fontSize: 13, opacity: 0.9, margin: 0 }}>{renderMotiv(motiv)}</p>
              <span className="flex items-center gap-1" style={{ fontSize: 11, opacity: 0.6 }}>
                <IconFlip /> ver QR
              </span>
            </div>
            </div>
          </div>

          {/* ── REVERSO — QR sobre superficie oscura premium (cohesivo con el frente) ── */}
          <div
            style={{
              ...faceBase,
              background: "var(--card-sheen), linear-gradient(150deg,#26262b 0%,#141416 100%)",
              boxShadow: cardShadow,
              transform: "rotateY(180deg)",
              alignItems: "center",
              color: "#f0f0f2",
            }}
          >
            {/* Barra superior idéntica al frente (misma marca + tier) */}
            <div className="flex w-full items-start justify-between">
              <div className="flex items-center gap-2">
                <Isotipo style={{ width: 18, height: 9, color: "#f0f0f2", opacity: 0.9 }} />
                <span className="font-display" style={{ fontWeight: 700, fontSize: 13, letterSpacing: "0.16em", opacity: 0.85 }}>TAPER BARBER</span>
              </div>
              <span
                className="inline-flex items-center font-semibold uppercase"
                style={{ padding: "5px 11px", borderRadius: 9999, background: badge.bg, color: badge.ink, border: `1px solid ${badge.border}`, fontSize: 11, letterSpacing: "0.08em" }}
              >
                {badge.star && <span className="mr-1">★</span>}
                {tierLabel}
              </span>
            </div>

            {/* QR — héroe del reverso: escala con la ALTURA de la card (66%), sin cap de ancho.
                El aro dorado lo define sobre el fondo oscuro; padding chico porque el svg ya trae quiet zone. */}
            <div
              className="qr-tile"
              style={{ boxSizing: "border-box", background: "#fff", borderRadius: 14, padding: 8, height: "72%", aspectRatio: "1", boxShadow: "0 0 0 1.5px rgba(245,200,0,0.5),0 10px 26px rgba(0,0,0,0.5)" }}
              // QR generado en servidor (alto contraste, negro sobre blanco).
              dangerouslySetInnerHTML={{ __html: qrSvg }}
            />

            <div className="text-center">
              <p className="font-display" style={{ fontWeight: 700, fontSize: 18, lineHeight: 1, margin: 0 }}>{name}</p>
              <p style={{ fontSize: 11, color: "rgba(255,255,255,0.5)", letterSpacing: "0.04em", margin: "5px 0 0" }}>
                Miembro {tierLabel} · <span style={{ color: "var(--accent)" }}>{memberId}</span>
              </p>
            </div>
          </div>
        </div>
        </div>
      </button>

      {(flipped || !flippedOnce) && (
        <p className="mt-3.5 text-center" style={{ fontSize: 12, color: "var(--subtle)" }}>
          {flipped ? "Muéstrale el código al cajero · toca para volver" : "Toca la tarjeta para ver tu QR"}
        </p>
      )}
    </div>
  );
}
