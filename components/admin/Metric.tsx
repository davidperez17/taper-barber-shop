/** Tile KPI compartido (dashboard, reportes, reportes/clientes). */
export function Metric({ value, label, sub, accent, warn }: { value: string; label: string; sub?: string; accent?: boolean; warn?: boolean }) {
  return (
    <div className="rounded-xl border border-line bg-elevated p-4">
      <p className={`font-display text-[28px] font-extrabold leading-none tabular-nums ${accent ? "text-accent" : warn ? "text-warning" : "text-ink"}`}>{value}</p>
      <p className="mt-1.5 text-[13px] font-medium text-muted">{label}</p>
      {sub && <p className="mt-0.5 text-[11px] text-muted">{sub}</p>}
    </div>
  );
}
