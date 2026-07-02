import { fmtQ } from "@/lib/format";
import type { DiaRow, TopRow } from "@/lib/queries/reportes";

/** Tendencia de ventas: barras verticales por día (CSS, sin libs). */
export function TendenciaChart({ data }: { data: DiaRow[] }) {
  if (data.length === 0) {
    return <p className="rounded-xl border border-dashed border-line p-8 text-center text-sm text-muted">Sin ventas en el rango.</p>;
  }
  const max = Math.max(...data.map((d) => d.total), 1);
  const paso = Math.ceil(data.length / 8); // densidad de labels

  return (
    <div className="flex h-44 items-end gap-1.5 overflow-x-auto pb-1" role="img" aria-label="Ventas por día">
      {data.map((d, i) => (
        <div key={d.dia} className="flex h-full min-w-[16px] flex-1 flex-col items-center justify-end gap-1.5" title={`${d.dia}: ${fmtQ(d.total)} · ${d.num} ventas`}>
          <div
            className="w-full rounded-t bg-accent transition-[height]"
            style={{ height: `${Math.max(3, (d.total / max) * 100)}%` }}
          />
          <span className="text-[11px] tabular-nums text-subtle">{i % paso === 0 ? d.dia.slice(8, 10) : ""}</span>
        </div>
      ))}
    </div>
  );
}

/** Top horizontal: nombre + barra proporcional + valor. */
export function TopBars({ rows, label }: { rows: TopRow[]; label?: string }) {
  if (rows.length === 0) return <p className="text-sm text-muted">Sin datos en el rango.</p>;
  const max = Math.max(...rows.map((r) => r.n), 1);
  return (
    <div role="list" aria-label={label} className="flex flex-col gap-2.5">
      {rows.map((r) => (
        <div role="listitem" key={r.nombre}>
          <div className="mb-1 flex items-baseline justify-between gap-3 text-sm">
            <span className="truncate text-ink">{r.nombre}</span>
            <span className="shrink-0 tabular-nums text-muted">{r.n} · {fmtQ(r.monto)}</span>
          </div>
          <div aria-hidden className="h-2 overflow-hidden rounded-full bg-line">
            <div className="h-full rounded-full bg-accent" style={{ width: `${(r.n / max) * 100}%` }} />
          </div>
        </div>
      ))}
    </div>
  );
}
