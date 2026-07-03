"use client";

import { useState } from "react";
import type { Tier } from "@/lib/loyalty";
import { LoyaltyCard } from "./LoyaltyCard";

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
  if (!card) return null;

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
