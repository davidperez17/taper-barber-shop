import { Fragment } from "react";
import Link from "next/link";
import type { HeatCell } from "@/lib/queries/reportes";

const DIAS = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
const PERIODOS = [
  { key: "semana", label: "Semana" },
  { key: "mes", label: "Mes" },
  { key: "anio", label: "Año" },
] as const;
export type PeriodoBP = (typeof PERIODOS)[number]["key"];

const FILLS = ["var(--bg-surface)", "rgba(245,200,0,0.28)", "rgba(245,200,0,0.5)", "rgba(245,200,0,0.78)", "var(--accent)"];

function horaLabel(h: number): string {
  const ampm = h < 12 ? "am" : "pm";
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12} ${ampm}`;
}

export function BusyPeriods({ cells, periodo, rango }: { cells: HeatCell[]; periodo: PeriodoBP; rango: string }) {
  const tieneData = cells.length > 0;
  const horas = tieneData
    ? Array.from({ length: Math.max(...cells.map((c) => c.hora)) - Math.min(...cells.map((c) => c.hora)) + 1 }, (_, i) => Math.min(...cells.map((c) => c.hora)) + i)
    : [];
  const max = Math.max(...cells.map((c) => c.n), 1);
  const mapa = new Map(cells.map((c) => [`${c.dow}-${c.hora}`, c]));

  // Hora pico: hora con más ventas sumando todos los días.
  const porHora = new Map<number, number>();
  for (const c of cells) porHora.set(c.hora, (porHora.get(c.hora) ?? 0) + c.n);
  let pico = -1, picoN = 0;
  for (const [h, n] of porHora) if (n > picoN) { picoN = n; pico = h; }

  const nivel = (n: number) => (n <= 0 ? 0 : Math.min(4, Math.ceil((n / max) * 4)));

  return (
    <div>
      {/* Cabecera: pico + selector de periodo */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-[13px] font-medium text-muted">Hora pico</p>
          <p className="font-display text-lg font-bold text-ink">
            {pico >= 0 ? `${horaLabel(pico)} – ${horaLabel(pico + 1)}` : "Sin datos"}
          </p>
        </div>
        <div role="tablist" aria-label="Periodo" className="inline-flex rounded-full border border-line bg-elevated p-1">
          {PERIODOS.map((p) => {
            const activo = periodo === p.key;
            return (
              <Link
                key={p.key}
                href={`/admin/reportes?rango=${rango}&bp=${p.key}`}
                role="tab"
                aria-selected={activo}
                className={`flex min-h-9 items-center rounded-full px-3.5 text-[13px] font-semibold transition-colors ${activo ? "bg-accent text-accent-ink" : "text-muted hover:text-ink"}`}
              >
                {p.label}
              </Link>
            );
          })}
        </div>
      </div>

      {!tieneData ? (
        <p className="rounded-xl border border-dashed border-line p-8 text-center text-sm text-muted">Sin ventas en este periodo.</p>
      ) : (
        <>
          <div className="overflow-x-auto pb-1">
            <div className="inline-grid gap-1" style={{ gridTemplateColumns: `40px repeat(${horas.length}, 34px)` }}>
              {DIAS.map((dia, dow) => (
                <Fragment key={dow}>
                  <div className="flex items-center text-[12px] text-muted">{dia}</div>
                  {horas.map((h) => {
                    const cell = mapa.get(`${dow}-${h}`);
                    const n = cell?.n ?? 0;
                    return (
                      <div
                        key={h}
                        title={`${dia} ${horaLabel(h)} · ${n} venta${n === 1 ? "" : "s"}`}
                        className="h-7 rounded-[5px]"
                        style={{ background: FILLS[nivel(n)] }}
                      />
                    );
                  })}
                </Fragment>
              ))}
              {/* fila de etiquetas de hora */}
              <div />
              {horas.map((h) => (
                <div key={h} className="pt-1 text-center text-[9px] tabular-nums text-subtle">{horaLabel(h)}</div>
              ))}
            </div>
          </div>

          {/* Leyenda */}
          <div className="mt-3 flex items-center justify-end gap-1.5 text-[11px] text-subtle">
            <span>menos</span>
            {FILLS.map((f, i) => <span key={i} className="size-3 rounded-[2px]" style={{ background: f }} />)}
            <span>más</span>
          </div>
        </>
      )}
    </div>
  );
}
