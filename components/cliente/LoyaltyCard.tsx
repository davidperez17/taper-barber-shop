"use client";

import { useState } from "react";
import type { CSSProperties } from "react";
import type { Tier } from "@/lib/loyalty";
import { TIER_SURFACE } from "@/lib/loyalty";
import { IconFlip } from "@/components/icons";

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
  beneficio: string | null;
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
  beneficio,
  qrSvg,
}: Props) {
  const [flipped, setFlipped] = useState(false);
  const [flippedOnce, setFlippedOnce] = useState(false);
  const badge = TIER_BADGE[tier];
  const pct = Math.round((cortesCiclo / objetivo) * 100);
  const ink = recompensaDisponible ? "#ecfdf5" : "var(--tier-ink)";

  const surface = recompensaDisponible ? "" : TIER_SURFACE[tier];
  const cardBg: CSSProperties = recompensaDisponible
    ? { background: "linear-gradient(150deg,#166534 0%,#0d3d22 100%)" }
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
    setFlipped((f) => !f);
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
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2">
                <span style={{ width: 8, height: 8, borderRadius: 2, background: ink, transform: "rotate(45deg)", opacity: 0.9 }} />
                <span className="font-display" style={{ fontWeight: 700, fontSize: 13, letterSpacing: "0.28em", opacity: 0.85 }}>TAPER</span>
              </div>
              <span
                className="inline-flex items-center font-semibold uppercase"
                style={{ padding: "5px 11px", borderRadius: 9999, background: badge.bg, color: badge.ink, border: `1px solid ${badge.border}`, fontSize: 11, letterSpacing: "0.08em" }}
              >
                {badge.star && <span className="mr-1">★</span>}
                {tierLabel}
              </span>
            </div>

            <h2 className="font-display" style={{ fontWeight: 800, fontSize: 34, lineHeight: 1, letterSpacing: "-0.01em", margin: 0 }}>
              {name}
            </h2>

            <div>
              <div className="mb-2 flex items-end justify-between">
                <div>
                  <p style={{ fontSize: 10, letterSpacing: "0.1em", textTransform: "uppercase", opacity: 0.7, margin: "0 0 3px" }}>Cortes</p>
                  <p style={{ fontWeight: 600, fontSize: 28, lineHeight: 1, letterSpacing: "0.03em", margin: 0 }}>
                    {cortesCiclo}
                    <span style={{ opacity: 0.55 }}>/{objetivo}</span>
                  </p>
                </div>
                <div className="text-right">
                  <p style={{ fontSize: 10, letterSpacing: "0.1em", textTransform: "uppercase", opacity: 0.7, margin: "0 0 4px" }}>
                    {recompensaDisponible ? "¡Gratis listo!" : "Beneficio"}
                  </p>
                  <span
                    className="inline-block font-semibold"
                    style={{ padding: "4px 10px", borderRadius: 9999, background: recompensaDisponible ? "var(--success)" : "rgba(0,0,0,0.22)", color: recompensaDisponible ? "#06250f" : ink, fontSize: 12 }}
                  >
                    {recompensaDisponible ? "Reclamar" : (beneficio ?? "Lealtad")}
                  </span>
                </div>
              </div>

              <div
                role="progressbar"
                aria-valuenow={cortesCiclo}
                aria-valuemin={0}
                aria-valuemax={objetivo}
                aria-label={`${cortesCiclo} de ${objetivo} cortes`}
                style={{ height: 8, borderRadius: 9999, background: "rgba(0,0,0,0.22)", overflow: "hidden" }}
              >
                <div
                  style={{
                    height: "100%",
                    width: "100%",
                    transformOrigin: "left",
                    transform: `scaleX(${pct / 100})`,
                    background: recompensaDisponible ? "var(--success)" : "rgba(255,255,255,0.92)",
                    transition: "transform 700ms ease-out",
                    boxShadow: recompensaDisponible ? "0 0 12px rgba(34,197,94,0.7)" : "none",
                  }}
                />
              </div>

              <div className="mt-2.5 flex items-center justify-between">
                <p style={{ fontSize: 12, opacity: 0.8, margin: 0 }}>{motiv}</p>
                <span className="flex items-center gap-1" style={{ fontSize: 11, opacity: 0.6 }}>
                  <IconFlip /> ver QR
                </span>
              </div>
            </div>
          </div>

          {/* ── REVERSO (QR amarillo) ── */}
          <div
            style={{
              ...faceBase,
              background: "var(--accent)",
              boxShadow: "0 12px 42px rgba(245,200,0,0.4),0 4px 18px rgba(0,0,0,0.5)",
              transform: "rotateY(180deg)",
              alignItems: "center",
              color: "var(--accent-ink)",
            }}
          >
            <span className="font-display" style={{ fontWeight: 700, fontSize: 13, letterSpacing: "0.28em" }}>TAPER</span>
            <div
              style={{ background: "#fff", borderRadius: 14, padding: 11, boxShadow: "0 6px 18px rgba(0,0,0,0.25)", width: 168, height: 168 }}
              // QR generado en servidor (alto contraste, negro/blanco).
              dangerouslySetInnerHTML={{ __html: qrSvg }}
            />
            <div className="text-center">
              <p className="font-display" style={{ fontWeight: 700, fontSize: 19, lineHeight: 1, margin: 0 }}>{name}</p>
              <p style={{ fontSize: 12, color: "rgba(15,15,15,0.6)", margin: "4px 0 0" }}>Miembro {tierLabel} · {memberId}</p>
              <p style={{ fontSize: 11, color: "rgba(15,15,15,0.5)", margin: "6px 0 0", letterSpacing: "0.04em" }}>Muéstraselo al cajero</p>
            </div>
          </div>
        </div>
      </button>

      {(flipped || !flippedOnce) && (
        <p className="mt-3.5 text-center" style={{ fontSize: 12, color: "var(--subtle)" }}>
          {flipped ? "Toca para regresar" : "Toca la tarjeta para ver tu QR"}
        </p>
      )}
    </div>
  );
}
