import { fmtQ } from "@/lib/format";
import type { TopRow } from "@/lib/queries/reportes";

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
