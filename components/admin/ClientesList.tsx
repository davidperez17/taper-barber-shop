"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { computeLoyalty, TIER_LABEL, TIER_DOT } from "@/lib/loyalty";
import { fmtDiaMes } from "@/lib/format";
import type { ClienteRow } from "@/lib/types";
import { IconSearch } from "@/components/icons";

type Orden = "nombre" | "visitas" | "reciente" | "inactivo";

export function ClientesList({ clientes }: { clientes: ClienteRow[] }) {
  const [q, setQ] = useState("");
  const [orden, setOrden] = useState<Orden>("nombre");

  const rows = useMemo(() => {
    const term = q.trim().toLowerCase();
    const digits = term.replace(/\D/g, "");
    let r = clientes.filter((c) => {
      if (!term) return true;
      return c.nombre.toLowerCase().includes(term) || (digits.length >= 3 && c.telefono.includes(digits));
    });
    r = [...r].sort((a, b) => {
      switch (orden) {
        case "visitas":
          return b.loyalty.visitas_12m - a.loyalty.visitas_12m;
        case "reciente":
          return (b.loyalty.ultima_visita ?? "").localeCompare(a.loyalty.ultima_visita ?? "");
        case "inactivo":
          return (a.loyalty.ultima_visita ?? "").localeCompare(b.loyalty.ultima_visita ?? "");
        default:
          return a.nombre.localeCompare(b.nombre);
      }
    });
    return r;
  }, [clientes, q, orden]);

  return (
    <div>
      {/* Controles */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="flex flex-1 items-center rounded-xl border border-line bg-elevated px-4 focus-within:border-accent">
          <span className="mr-3 text-subtle"><IconSearch size={20} /></span>
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar por nombre o teléfono…"
            aria-label="Buscar cliente"
            className="min-h-[48px] w-full bg-transparent text-base text-ink outline-none placeholder:text-muted"
          />
        </div>
        <label className="flex items-center gap-2 text-sm text-muted">
          <span className="hidden sm:inline">Orden</span>
          <select
            value={orden}
            onChange={(e) => setOrden(e.target.value as Orden)}
            className="min-h-[48px] rounded-xl border border-line bg-elevated px-3 text-sm text-ink outline-none focus:border-accent"
          >
            <option value="nombre">Nombre (A-Z)</option>
            <option value="visitas">Más visitas</option>
            <option value="reciente">Visita reciente</option>
            <option value="inactivo">Más inactivos</option>
          </select>
        </label>
      </div>

      <p className="mt-3 text-[13px] text-subtle">{rows.length} cliente{rows.length === 1 ? "" : "s"}</p>

      {/* Lista */}
      <div className="mt-3 flex flex-col gap-2">
        {rows.map((c) => {
          const loyalty = computeLoyalty(c.loyalty);
          return (
            <Link
              key={c.id}
              href={`/admin/clientes/${c.id}`}
              className="flex items-center gap-4 rounded-xl border border-line bg-elevated px-4 py-3 transition-colors hover:border-line-strong"
            >
              <div className="min-w-0 flex-1">
                <p className="flex items-center gap-2 font-semibold text-ink">
                  <span className="truncate">{c.nombre}</span>
                  <span className="inline-flex shrink-0 items-center gap-1 rounded-full border border-line px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-muted">
                    <span className="size-1.5 rounded-full" style={{ background: TIER_DOT[loyalty.tier] }} />
                    {TIER_LABEL[loyalty.tier]}
                  </span>
                </p>
                <p className="mt-0.5 text-[13px] text-muted">
                  #{String(c.numero).padStart(5, "0")} · {c.telefono}
                </p>
              </div>

              <div className="hidden flex-col items-end sm:flex">
                <p className="text-[13px] text-ink">{c.loyalty.visitas_12m} visitas</p>
                <p className="text-[12px] text-subtle">Últ. {fmtDiaMes(c.loyalty.ultima_visita)}</p>
              </div>
              <span className="text-subtle">→</span>
            </Link>
          );
        })}

        {rows.length === 0 && (
          <div className="rounded-xl border border-dashed border-line p-8 text-center text-sm text-muted">
            {clientes.length === 0 ? "Aún no hay clientes registrados." : "Sin resultados para tu búsqueda."}
          </div>
        )}
      </div>
    </div>
  );
}
