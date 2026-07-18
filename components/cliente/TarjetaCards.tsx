"use client";

import { useState } from "react";
import type { Tier } from "@/lib/loyalty";
import { LoyaltyCard } from "./LoyaltyCard";
import { Isotipo } from "@/components/Isotipo";

/** Datos ya interpretados de la tarjeta de una sucursal. */
export interface TarjetaVM {
  sucursalId: string;
  sucursalNombre: string;
  tier: Tier;
  tierLabel: string;
  cortesCiclo: number;
  objetivo: number;
  motiv: string;
  recompensaDisponible: boolean;
}

/**
 * La lealtad es POR SUCURSAL: cada sucursal tiene su propia tarjeta (sellos y
 * tier independientes). El QR (identidad del cliente) es el mismo en todas, así
 * que se genera una vez y solo cambian los datos de progreso al elegir sucursal.
 */
export function TarjetaCards({
  cards,
  defaultSucursalId,
  name,
  memberId,
  qrSvg,
}: {
  cards: TarjetaVM[];
  defaultSucursalId: string;
  name: string;
  memberId: string;
  qrSvg: string;
}) {
  const inicial = Math.max(0, cards.findIndex((c) => c.sucursalId === defaultSucursalId));
  const [sel, setSel] = useState(inicial);
  const card = cards[sel] ?? cards[0];

  // Sin tarjeta de lealtad todavía (cliente nuevo, aún sin visitas): el QR
  // —su identidad— YA existe. Mostrarlo con voz de marca en vez de dejar el
  // héroe en blanco; el cajero lo escanea en la primera visita.
  if (!card) {
    return (
      <div>
        <div
          className="relative flex flex-col items-center justify-between overflow-hidden rounded-[20px] border border-white/15 p-5 text-center"
          style={{
            aspectRatio: "3 / 2",
            background: "var(--card-sheen), linear-gradient(150deg,#26262b 0%,#141416 100%)",
            boxShadow: "0 12px 42px rgba(0,0,0,0.5)",
            color: "#f0f0f2",
          }}
        >
          <div className="flex w-full items-center gap-2">
            <Isotipo style={{ width: 9, height: 17, color: "#f0f0f2", opacity: 0.9 }} />
            <span className="font-display text-[13px] font-bold uppercase tracking-[0.1em] opacity-85">
              Taper Barber Shop
            </span>
          </div>
          <div
            className="qr-tile"
            style={{ boxSizing: "border-box", background: "#fff", borderRadius: 14, padding: 8, height: "60%", aspectRatio: "1", boxShadow: "0 0 0 1.5px rgba(245,200,0,0.5),0 10px 26px rgba(0,0,0,0.5)" }}
            dangerouslySetInnerHTML={{ __html: qrSvg }}
          />
          <div>
            <p className="font-display text-lg font-bold leading-tight">Tu Club arranca hoy</p>
            <p className="mt-1 text-[13px] opacity-85">
              Muéstrale este código al cajero en tu próxima visita y suma tu primer sello.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      {cards.length > 1 && (
        <div role="tablist" aria-label="Sucursal" className="mb-3.5 flex gap-1.5 rounded-full border border-line bg-elevated p-1">
          {cards.map((c, i) => {
            const active = i === sel;
            return (
              <button
                key={c.sucursalId}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setSel(i)}
                className={[
                  "relative flex min-h-9 flex-1 items-center justify-center gap-1.5 rounded-full px-3 text-[13px] font-semibold transition-colors",
                  active ? "bg-accent text-accent-ink" : "text-subtle hover:text-muted",
                ].join(" ")}
              >
                <span className="truncate">{c.sucursalNombre}</span>
                {c.recompensaDisponible && (
                  <span
                    aria-label="corte gratis disponible"
                    className={`size-1.5 shrink-0 rounded-full ${active ? "bg-accent-ink" : "bg-success"}`}
                  />
                )}
              </button>
            );
          })}
        </div>
      )}

      <LoyaltyCard
        name={name}
        memberId={memberId}
        tier={card.tier}
        tierLabel={card.tierLabel}
        cortesCiclo={card.cortesCiclo}
        objetivo={card.objetivo}
        motiv={card.motiv}
        recompensaDisponible={card.recompensaDisponible}
        qrSvg={qrSvg}
      />
    </div>
  );
}
